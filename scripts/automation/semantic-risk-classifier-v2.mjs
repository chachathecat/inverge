#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import ts from "typescript";

export const CLASSIFIER_ID = "SEMANTIC_RISK_CLASSIFIER_V2";
export const CLASSIFIER_VERSION = "2.0.0";
export const MACHINE_LIMITS = Object.freeze({
  maximumChangedActiveSourceFiles: 256,
  maximumSourceBytesPerFile: 1_048_576,
  maximumSemanticFactsPerFile: 10_000,
  maximumModuleSpecifierCharacters: 512,
  maximumGitCommandMilliseconds: 30_000,
  maximumGitOutputBytes: 4_194_304,
});

const ACTIVE_SOURCE_PATTERN = /\.(?:[cm]?[jt]s|[jt]sx|mts|cts)$/iu;
const FULL_SHA_PATTERN = /^[0-9a-f]{40}$/iu;
const NODE_NETWORK_ROOTS = Object.freeze(["http", "https", "http2", "net", "tls", "dns", "dgram"]);
const PACKAGE_NETWORK_ROOTS = Object.freeze(["undici", "axios", "got", "stripe"]);
const SCOPED_NETWORK_PREFIXES = Object.freeze(["@supabase/", "@stripe/"]);
const UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });
const AST_PRINTER = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isRootOrSubpath(value, root) {
  return value === root || value.startsWith(`${root}/`);
}

export function isGovernedNetworkModuleSpecifier(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > MACHINE_LIMITS.maximumModuleSpecifierCharacters) {
    return false;
  }
  if (NODE_NETWORK_ROOTS.some((root) => isRootOrSubpath(value, root) || isRootOrSubpath(value, `node:${root}`))) {
    return true;
  }
  if (PACKAGE_NETWORK_ROOTS.some((root) => isRootOrSubpath(value, root))) return true;
  return SCOPED_NETWORK_PREFIXES.some((prefix) => value.startsWith(prefix) && value.length > prefix.length);
}

function scriptKindForPath(filePath) {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (lower.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (lower.endsWith(".ts") || lower.endsWith(".mts") || lower.endsWith(".cts")) return ts.ScriptKind.TS;
  return ts.ScriptKind.JS;
}

function staticModuleSpecifier(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    if (node.text.length > MACHINE_LIMITS.maximumModuleSpecifierCharacters) return { kind: "unsafe" };
    return { kind: "static", value: node.text };
  }
  return { kind: "unsafe" };
}

function canonicalFact(category, form, target) {
  return { category, form, target };
}

function factKey(fact) {
  return JSON.stringify([fact.category, fact.form, fact.target]);
}

function directCallFact(node) {
  const expression = node.expression;
  const identifierNames = new Set(["fetch", "WebSocket", "EventSource", "createClient", "postgres"]);
  if (ts.isIdentifier(expression) && identifierNames.has(expression.text)) {
    return canonicalFact("direct_network_call", "global_call", expression.text);
  }

  if (!ts.isPropertyAccessExpression(expression)) return null;
  const owner = expression.expression;
  const member = expression.name.text;
  if (ts.isIdentifier(owner) && owner.text === "navigator" && member === "sendBeacon") {
    return canonicalFact("direct_network_call", "global_property_call", "navigator.sendBeacon");
  }
  if (ts.isIdentifier(owner) && ["http", "https"].includes(owner.text) && ["get", "request"].includes(member)) {
    return canonicalFact("direct_network_call", "node_transport_call", `${owner.text}.${member}`);
  }
  if (ts.isIdentifier(owner) && ["globalThis", "window", "self"].includes(owner.text) &&
      ["fetch", "WebSocket", "EventSource"].includes(member)) {
    return canonicalFact("direct_network_call", "explicit_global_call", `${owner.text}.${member}`);
  }
  return null;
}

function directConstructionFact(node) {
  const expression = node.expression;
  if (ts.isIdentifier(expression) && ["WebSocket", "EventSource"].includes(expression.text)) {
    return canonicalFact("direct_network_call", "global_construct", expression.text);
  }
  if (ts.isPropertyAccessExpression(expression) && ts.isIdentifier(expression.expression) &&
      ["globalThis", "window", "self"].includes(expression.expression.text) &&
      ["WebSocket", "EventSource"].includes(expression.name.text)) {
    return canonicalFact(
      "direct_network_call",
      "explicit_global_construct",
      `${expression.expression.text}.${expression.name.text}`,
    );
  }
  return null;
}

function unsafeSpecifierIdentity(argument, sourceFile) {
  if (!argument) return "missing_first_argument";
  const printed = AST_PRINTER.printNode(ts.EmitHint.Expression, argument, sourceFile);
  const digest = createHash("sha256").update(printed, "utf8").digest("hex");
  return `${ts.SyntaxKind[argument.kind]}:sha256:${digest}`;
}

function moduleLoadFact(form, argument, sourceFile) {
  if (!argument) return canonicalFact("unsafe_module_load", form, "unresolved_first_argument");
  const resolved = staticModuleSpecifier(argument);
  if (resolved.kind !== "static") {
    return canonicalFact("unsafe_module_load", form, unsafeSpecifierIdentity(argument, sourceFile));
  }
  if (!isGovernedNetworkModuleSpecifier(resolved.value)) return null;
  return canonicalFact("network_module_load", form, resolved.value);
}

function parseFailure(filePath, code) {
  return { path: filePath, code };
}

function extractSemanticFactsUnchecked(filePath, sourceText) {
  if (!ACTIVE_SOURCE_PATTERN.test(filePath)) {
    return { complete: true, facts: [], failures: [] };
  }
  if (Buffer.byteLength(sourceText, "utf8") > MACHINE_LIMITS.maximumSourceBytesPerFile) {
    return { complete: false, facts: [], failures: [parseFailure(filePath, "SOURCE_SIZE_LIMIT_EXCEEDED")] };
  }

  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    scriptKindForPath(filePath),
  );
  if ((sourceFile.parseDiagnostics ?? []).length > 0) {
    return { complete: false, facts: [], failures: [parseFailure(filePath, "BLOCKING_PARSE_DIAGNOSTIC")] };
  }

  const facts = [];
  let limitExceeded = false;
  const addFact = (fact) => {
    if (fact === null || limitExceeded) return;
    if (facts.length >= MACHINE_LIMITS.maximumSemanticFactsPerFile) {
      limitExceeded = true;
      return;
    }
    facts.push(fact);
  };

  const visit = (node) => {
    if (limitExceeded) return;

    if (ts.isImportDeclaration(node)) {
      addFact(moduleLoadFact(
        node.importClause ? "static_import" : "side_effect_import",
        node.moduleSpecifier,
        sourceFile,
      ));
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      addFact(moduleLoadFact("static_export_from", node.moduleSpecifier, sourceFile));
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      addFact(moduleLoadFact("typescript_import_equals", node.moduleReference.expression, sourceFile));
    } else if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        addFact(moduleLoadFact("dynamic_import", node.arguments[0], sourceFile));
      } else if (ts.isIdentifier(node.expression) && node.expression.text === "require") {
        addFact(moduleLoadFact("global_require", node.arguments[0], sourceFile));
      } else if (ts.isPropertyAccessExpression(node.expression) &&
          ts.isIdentifier(node.expression.expression) &&
          node.expression.expression.text === "module" &&
          node.expression.name.text === "require") {
        addFact(moduleLoadFact("module_require", node.arguments[0], sourceFile));
      } else {
        addFact(directCallFact(node));
      }
    } else if (ts.isNewExpression(node)) {
      addFact(directConstructionFact(node));
    }

    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  if (limitExceeded) {
    return { complete: false, facts: [], failures: [parseFailure(filePath, "SEMANTIC_FACT_LIMIT_EXCEEDED")] };
  }
  facts.sort((left, right) => compareText(factKey(left), factKey(right)));
  return { complete: true, facts, failures: [] };
}

export function extractSemanticFacts(filePath, sourceText) {
  try {
    return extractSemanticFactsUnchecked(filePath, sourceText);
  } catch {
    return { complete: false, facts: [], failures: [parseFailure(filePath, "AST_ANALYSIS_FAILED")] };
  }
}

function countFacts(facts) {
  const counts = new Map();
  const factsByKey = new Map();
  for (const fact of facts) {
    const key = factKey(fact);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    factsByKey.set(key, fact);
  }
  return { counts, factsByKey };
}

export function compareSemanticFactMultisets(baseFacts, headFacts) {
  const base = countFacts(baseFacts);
  const head = countFacts(headFacts);
  const introduced = [];
  for (const key of [...head.counts.keys()].sort()) {
    const delta = (head.counts.get(key) ?? 0) - (base.counts.get(key) ?? 0);
    if (delta > 0) introduced.push({ fact: head.factsByKey.get(key), count: delta });
  }
  return introduced;
}

function integrationBoundary(hasSemanticHigh) {
  return hasSemanticHigh
    ? {
        riskFloor: "HIGH",
        lowerProfilesCannotOverride: true,
        automaticMergeEligible: false,
        ownerApprovalRequired: true,
      }
    : {
        riskFloor: null,
        lowerProfilesCannotOverride: true,
        automaticMergeEligible: null,
        ownerApprovalRequired: null,
      };
}

function reportFor({ baseSha = null, headSha = null, files, failures }) {
  const introducedFacts = files.flatMap((file) =>
    file.introducedFacts.map((entry) => ({ path: file.path, ...entry })),
  ).sort((left, right) => compareText(
    `${left.path}\0${factKey(left.fact)}`,
    `${right.path}\0${factKey(right.fact)}`,
  ));
  const orderedFailures = [...failures].sort((left, right) => compareText(
    `${left.path ?? ""}\0${left.code}`,
    `${right.path ?? ""}\0${right.code}`,
  ));
  const signals = new Set();
  if (introducedFacts.length > 0) signals.add("remote_or_production_or_payment");
  if (orderedFailures.length > 0) signals.add("uninspectable_change");
  const semanticHighSignals = [...signals].sort();
  return {
    classifierId: CLASSIFIER_ID,
    classifierVersion: CLASSIFIER_VERSION,
    baseSha,
    headSha,
    analysisComplete: orderedFailures.length === 0,
    analyzedFiles: files.map((file) => file.path).sort(),
    introducedFacts,
    failures: orderedFailures,
    semanticHighSignals,
    integrationBoundary: integrationBoundary(semanticHighSignals.length > 0),
  };
}

export function classifySourcePair({ filePath, baseSource, headSource }) {
  const base = extractSemanticFacts(filePath, baseSource);
  const head = extractSemanticFacts(filePath, headSource);
  const failures = [
    ...base.failures.map((failure) => ({ ...failure, side: "base" })),
    ...head.failures.map((failure) => ({ ...failure, side: "head" })),
  ];
  const introducedFacts = failures.length === 0
    ? compareSemanticFactMultisets(base.facts, head.facts)
    : [];
  return reportFor({
    files: [{ path: filePath, introducedFacts }],
    failures,
  });
}

function safeRepositoryPath(filePath) {
  if (typeof filePath !== "string" || filePath.length === 0 || filePath.includes("\\")) return false;
  if (path.posix.isAbsolute(filePath)) return false;
  return !filePath.split("/").some((segment) => segment === "" || segment === "." || segment === "..");
}

function git(repoRoot, args, options = {}) {
  return execFileSync("git", ["-C", repoRoot, ...args], {
    encoding: Object.hasOwn(options, "encoding") ? options.encoding : "utf8",
    maxBuffer: options.maxBuffer ?? MACHINE_LIMITS.maximumGitOutputBytes,
    timeout: MACHINE_LIMITS.maximumGitCommandMilliseconds,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function parseChangedPaths(output) {
  const fields = output.split("\0");
  if (fields.at(-1) === "") fields.pop();
  const records = [];
  for (let index = 0; index < fields.length;) {
    const status = fields[index++];
    if (/^[RC]\d+$/u.test(status)) {
      const basePath = fields[index++];
      const headPath = fields[index++];
      if (!basePath || !headPath) throw new Error("incomplete rename/copy record");
      records.push({ status: status[0], basePath, headPath });
    } else {
      const filePath = fields[index++];
      if (!/^[AMD]$/u.test(status) || !filePath) throw new Error("unsupported changed-path record");
      records.push({ status, basePath: filePath, headPath: filePath });
    }
  }
  return records;
}

function loadBlob(repoRoot, sha, filePath) {
  const objectName = `${sha}:${filePath}`;
  const sizeText = git(repoRoot, ["cat-file", "-s", objectName]).trim();
  if (!/^\d+$/u.test(sizeText)) throw new Error("blob size is not numeric");
  const size = Number(sizeText);
  if (!Number.isSafeInteger(size) || size > MACHINE_LIMITS.maximumSourceBytesPerFile) {
    return { complete: false, failure: parseFailure(filePath, "SOURCE_SIZE_LIMIT_EXCEEDED") };
  }
  const bytes = git(repoRoot, ["cat-file", "blob", objectName], {
    encoding: null,
    maxBuffer: MACHINE_LIMITS.maximumSourceBytesPerFile + 1,
  });
  try {
    return { complete: true, source: UTF8_DECODER.decode(bytes) };
  } catch {
    return { complete: false, failure: parseFailure(filePath, "SOURCE_UTF8_DECODE_FAILED") };
  }
}

function incompleteRepositoryReport(baseSha, headSha, code) {
  return reportFor({
    baseSha,
    headSha,
    files: [],
    failures: [{ path: null, code }],
  });
}

export function classifyRepositoryDiff({ repoRoot = process.cwd(), baseSha, headSha }) {
  if (!FULL_SHA_PATTERN.test(baseSha ?? "") || !FULL_SHA_PATTERN.test(headSha ?? "")) {
    return incompleteRepositoryReport(baseSha ?? null, headSha ?? null, "INVALID_EXACT_COMMIT_IDENTITY");
  }

  let changedRecords;
  try {
    git(repoRoot, ["cat-file", "-e", `${baseSha}^{commit}`]);
    git(repoRoot, ["cat-file", "-e", `${headSha}^{commit}`]);
    changedRecords = parseChangedPaths(git(repoRoot, [
      "diff", "--name-status", "-z", "--find-renames", `-l${MACHINE_LIMITS.maximumChangedActiveSourceFiles}`,
      baseSha, headSha, "--",
    ]));
  } catch {
    return incompleteRepositoryReport(baseSha, headSha, "BASE_HEAD_COMPARISON_INCOMPLETE");
  }

  const activeRecords = changedRecords.filter((record) =>
    ACTIVE_SOURCE_PATTERN.test(record.basePath) || ACTIVE_SOURCE_PATTERN.test(record.headPath),
  );
  if (activeRecords.length > MACHINE_LIMITS.maximumChangedActiveSourceFiles) {
    return incompleteRepositoryReport(baseSha, headSha, "CHANGED_ACTIVE_SOURCE_FILE_LIMIT_EXCEEDED");
  }

  const files = [];
  const failures = [];
  for (const record of activeRecords.sort((left, right) => compareText(left.headPath, right.headPath))) {
    if (!safeRepositoryPath(record.basePath) || !safeRepositoryPath(record.headPath)) {
      failures.push(parseFailure(record.headPath, "UNSAFE_REPOSITORY_PATH"));
      continue;
    }
    const baseAnalysisPath = ACTIVE_SOURCE_PATTERN.test(record.basePath) ? record.basePath : record.headPath;
    const headAnalysisPath = ACTIVE_SOURCE_PATTERN.test(record.headPath) ? record.headPath : record.basePath;
    const comparisonPath = ACTIVE_SOURCE_PATTERN.test(record.headPath) ? record.headPath : record.basePath;
    let baseSource = "";
    let headSource = "";
    try {
      if (record.status !== "A" && ACTIVE_SOURCE_PATTERN.test(record.basePath)) {
        const baseBlob = loadBlob(repoRoot, baseSha, record.basePath);
        if (!baseBlob.complete) {
          failures.push({ ...baseBlob.failure, side: "base" });
          continue;
        }
        baseSource = baseBlob.source;
      }
      if (record.status !== "D" && ACTIVE_SOURCE_PATTERN.test(record.headPath)) {
        const headBlob = loadBlob(repoRoot, headSha, record.headPath);
        if (!headBlob.complete) {
          failures.push({ ...headBlob.failure, side: "head" });
          continue;
        }
        headSource = headBlob.source;
      }
    } catch {
      failures.push({ path: comparisonPath, code: "EXACT_BLOB_LOAD_FAILED" });
      continue;
    }

    const base = extractSemanticFacts(baseAnalysisPath, baseSource);
    const head = extractSemanticFacts(headAnalysisPath, headSource);
    if (!base.complete || !head.complete) {
      failures.push(
        ...base.failures.map((failure) => ({ ...failure, side: "base" })),
        ...head.failures.map((failure) => ({ ...failure, side: "head" })),
      );
      continue;
    }
    files.push({
      path: comparisonPath,
      introducedFacts: compareSemanticFactMultisets(base.facts, head.facts),
    });
  }

  return reportFor({ baseSha, headSha, files, failures });
}

function readEventBoundary() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !fs.existsSync(eventPath)) return {};
  const event = JSON.parse(fs.readFileSync(eventPath, "utf8"));
  return {
    baseSha: event?.pull_request?.base?.sha ?? null,
    headSha: event?.pull_request?.head?.sha ?? null,
  };
}

function parseArguments(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--base" || argument === "--head" || argument === "--repo-root") {
      const value = argv[index + 1];
      if (!value) throw new Error(`${argument} requires a value`);
      parsed[argument.slice(2).replace("-", "_")] = value;
      index += 1;
    } else {
      throw new Error(`unsupported argument: ${argument}`);
    }
  }
  return parsed;
}

function main() {
  const args = parseArguments(process.argv.slice(2));
  const event = readEventBoundary();
  const report = classifyRepositoryDiff({
    repoRoot: path.resolve(args.repo_root ?? process.cwd()),
    baseSha: args.base ?? process.env.SEMANTIC_RISK_BASE_SHA ?? event.baseSha,
    headSha: args.head ?? process.env.SEMANTIC_RISK_HEAD_SHA ?? event.headSha,
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
