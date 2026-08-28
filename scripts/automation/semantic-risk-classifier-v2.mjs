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
  maximumBindingIdentityNodesPerFile: 20_000,
  maximumBindingIdentityDepth: 32,
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

class BoundedAnalysisError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

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

function digestIdentity(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function createBoundSourceFile(filePath, sourceText) {
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    scriptKindForPath(filePath),
  );
  if ((sourceFile.parseDiagnostics ?? []).length > 0) return { sourceFile, checker: null };

  const compilerOptions = {
    allowJs: true,
    checkJs: false,
    jsx: ts.JsxEmit.Preserve,
    module: ts.ModuleKind.ESNext,
    noLib: true,
    noResolve: true,
    target: ts.ScriptTarget.Latest,
  };
  const host = {
    fileExists: (candidate) => candidate === filePath,
    getCanonicalFileName: (candidate) => candidate,
    getCurrentDirectory: () => "",
    getDefaultLibFileName: () => "lib.d.ts",
    getDirectories: () => [],
    getNewLine: () => "\n",
    getSourceFile: (candidate) => candidate === filePath ? sourceFile : undefined,
    readFile: (candidate) => candidate === filePath ? sourceText : undefined,
    useCaseSensitiveFileNames: () => true,
    writeFile: () => {},
  };
  const program = ts.createProgram([filePath], compilerOptions, host);
  return { sourceFile: program.getSourceFile(filePath) ?? sourceFile, checker: program.getTypeChecker() };
}

function declarationModuleSpecifier(declaration) {
  let current = declaration;
  while (current) {
    if (ts.isImportDeclaration(current) && current.moduleSpecifier) return staticModuleSpecifier(current.moduleSpecifier);
    if (ts.isImportEqualsDeclaration(current) && ts.isExternalModuleReference(current.moduleReference)) {
      return staticModuleSpecifier(current.moduleReference.expression);
    }
    current = current.parent;
  }
  return null;
}

function createSemanticContext(sourceFile, checker) {
  const state = { identityNodes: 0, resolvingSymbols: new Set() };
  const writesBySymbol = new Map();
  const collectWrites = (node) => {
    if (ts.isBinaryExpression(node) &&
        node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
        node.operatorToken.kind <= ts.SyntaxKind.LastAssignment &&
        ts.isIdentifier(node.left)) {
      const symbol = checker.getSymbolAtLocation(node.left);
      if (symbol) {
        if (!writesBySymbol.has(symbol)) writesBySymbol.set(symbol, []);
        writesBySymbol.get(symbol).push(node.right);
      }
    }
    ts.forEachChild(node, collectWrites);
  };
  collectWrites(sourceFile);

  const consumeIdentityNode = (depth) => {
    state.identityNodes += 1;
    if (state.identityNodes > MACHINE_LIMITS.maximumBindingIdentityNodesPerFile ||
        depth > MACHINE_LIMITS.maximumBindingIdentityDepth) {
      throw new BoundedAnalysisError("BINDING_IDENTITY_LIMIT_EXCEEDED");
    }
  };

  const printedIdentity = (node) => AST_PRINTER.printNode(ts.EmitHint.Unspecified, node, sourceFile);

  const expressionIdentity = (node, depth = 0) => {
    if (!node) return "missing";
    consumeIdentityNode(depth);
    if (ts.isIdentifier(node)) {
      const symbol = checker.getSymbolAtLocation(node);
      if (!symbol) return `global:${node.text}`;
      return symbolIdentity(symbol, node.text, depth + 1);
    }
    const children = [];
    ts.forEachChild(node, (child) => {
      children.push(expressionIdentity(child, depth + 1));
    });
    return `${ts.SyntaxKind[node.kind]}:${printedIdentity(node)}:[${children.join(",")}]`;
  };

  const declarationIdentity = (declaration, fallbackName, depth) => {
    consumeIdentityNode(depth);
    const moduleSpecifier = declarationModuleSpecifier(declaration);
    if (moduleSpecifier?.kind === "static") {
      return `import:${moduleSpecifier.value}:${ts.SyntaxKind[declaration.kind]}:${fallbackName}`;
    }
    if (ts.isVariableDeclaration(declaration) || ts.isParameter(declaration) || ts.isPropertyDeclaration(declaration)) {
      return `${ts.SyntaxKind[declaration.kind]}:${fallbackName}:${expressionIdentity(declaration.initializer, depth + 1)}`;
    }
    if (ts.isBindingElement(declaration)) {
      const variableDeclaration = declaration.parent?.parent;
      const bindingName = declaration.propertyName ?? declaration.name;
      const binding = printedIdentity(bindingName);
      if (variableDeclaration && ts.isVariableDeclaration(variableDeclaration)) {
        return `binding:${binding}:${expressionIdentity(variableDeclaration.initializer, depth + 1)}`;
      }
      return `binding:${binding}:unresolved`;
    }
    return `${ts.SyntaxKind[declaration.kind]}:${fallbackName}`;
  };

  const symbolIdentity = (symbol, fallbackName, depth = 0) => {
    consumeIdentityNode(depth);
    if (state.resolvingSymbols.has(symbol)) return `cycle:${fallbackName}`;
    state.resolvingSymbols.add(symbol);
    try {
      const declarations = [...(symbol.declarations ?? [])];
      const declarationIdentities = declarations
        .map((declaration) => declarationIdentity(declaration, fallbackName, depth + 1))
        .sort(compareText);
      const writeIdentities = (writesBySymbol.get(symbol) ?? [])
        .map((write) => expressionIdentity(write, depth + 1))
        .sort(compareText);
      if (declarationIdentities.length === 0 && writeIdentities.length === 0) {
        return `symbol:${fallbackName}:unresolved`;
      }
      return `${declarationIdentities.join("|")}|writes:${writeIdentities.join("|")}`;
    } finally {
      state.resolvingSymbols.delete(symbol);
    }
  };

  const callArgumentsIdentity = (argumentsList) => {
    const identity = [...argumentsList].map((argument) => expressionIdentity(argument)).join("|");
    return `sha256:${digestIdentity(identity)}`;
  };

  const networkOriginFromExpression = (expression, seenSymbols = new Set(), depth = 0) => {
    consumeIdentityNode(depth);
    if (ts.isParenthesizedExpression(expression) || ts.isAsExpression(expression) ||
        ts.isTypeAssertionExpression(expression) || ts.isNonNullExpression(expression) ||
        ts.isSatisfiesExpression(expression)) {
      return networkOriginFromExpression(expression.expression, seenSymbols, depth + 1);
    }
    if (ts.isCallExpression(expression)) {
      const requireSymbol = ts.isIdentifier(expression.expression)
        ? checker.getSymbolAtLocation(expression.expression)
        : null;
      const isGlobalRequire = ts.isIdentifier(expression.expression) && expression.expression.text === "require" &&
        (requireSymbol === undefined || (requireSymbol?.declarations ?? []).length === 0);
      const moduleSymbol = ts.isPropertyAccessExpression(expression.expression) &&
        ts.isIdentifier(expression.expression.expression)
        ? checker.getSymbolAtLocation(expression.expression.expression)
        : null;
      const isModuleRequire = ts.isPropertyAccessExpression(expression.expression) &&
        ts.isIdentifier(expression.expression.expression) && expression.expression.expression.text === "module" &&
        (moduleSymbol === undefined || (moduleSymbol?.declarations ?? []).length === 0) &&
        expression.expression.name.text === "require";
      if (isGlobalRequire || isModuleRequire) {
        const specifier = staticModuleSpecifier(expression.arguments[0]);
        if (specifier.kind === "static" && isGovernedNetworkModuleSpecifier(specifier.value)) {
          return { module: specifier.value, member: null };
        }
      }
      return null;
    }
    if (ts.isPropertyAccessExpression(expression)) {
      const parent = networkOriginFromExpression(expression.expression, seenSymbols, depth + 1);
      return parent ? { module: parent.module, member: [parent.member, expression.name.text].filter(Boolean).join(".") } : null;
    }
    if (!ts.isIdentifier(expression)) return null;
    const symbol = checker.getSymbolAtLocation(expression);
    if (!symbol || seenSymbols.has(symbol)) return null;
    seenSymbols.add(symbol);
    try {
      for (const declaration of symbol.declarations ?? []) {
        const moduleSpecifier = declarationModuleSpecifier(declaration);
        if (moduleSpecifier?.kind === "static" && isGovernedNetworkModuleSpecifier(moduleSpecifier.value)) {
          let member = null;
          if (ts.isImportSpecifier(declaration)) member = (declaration.propertyName ?? declaration.name).text;
          return { module: moduleSpecifier.value, member };
        }
        if (ts.isVariableDeclaration(declaration) && declaration.initializer) {
          const origin = networkOriginFromExpression(declaration.initializer, seenSymbols, depth + 1);
          if (origin) return origin;
        }
        if (ts.isBindingElement(declaration)) {
          const variableDeclaration = declaration.parent?.parent;
          if (variableDeclaration && ts.isVariableDeclaration(variableDeclaration) && variableDeclaration.initializer) {
            const origin = networkOriginFromExpression(variableDeclaration.initializer, seenSymbols, depth + 1);
            if (origin) {
              const member = printedIdentity(declaration.propertyName ?? declaration.name);
              return { module: origin.module, member: [origin.member, member].filter(Boolean).join(".") };
            }
          }
        }
      }
      for (const write of writesBySymbol.get(symbol) ?? []) {
        const origin = networkOriginFromExpression(write, seenSymbols, depth + 1);
        if (origin) return origin;
      }
      return null;
    } finally {
      seenSymbols.delete(symbol);
    }
  };

  return { callArgumentsIdentity, checker, expressionIdentity, networkOriginFromExpression };
}

function directFactTarget(target, node, context) {
  return `${target}|arguments:${context.callArgumentsIdentity(node.arguments ?? [])}`;
}

function isUnshadowedIdentifier(identifier, context) {
  if (!ts.isIdentifier(identifier)) return false;
  const symbol = context.checker.getSymbolAtLocation(identifier);
  return symbol === undefined || (symbol.declarations ?? []).length === 0;
}

function directCallFact(node, context) {
  const expression = node.expression;
  const identifierNames = new Set(["fetch", "WebSocket", "EventSource", "createClient", "postgres"]);
  if (ts.isIdentifier(expression) && identifierNames.has(expression.text) && isUnshadowedIdentifier(expression, context)) {
    return canonicalFact("direct_network_call", "global_call", directFactTarget(expression.text, node, context));
  }

  if (ts.isIdentifier(expression)) {
    const origin = context.networkOriginFromExpression(expression);
    if (origin) {
      const target = `${origin.module}${origin.member ? `#${origin.member}` : ""}`;
      return canonicalFact("direct_network_call", "bound_network_call", directFactTarget(target, node, context));
    }
  }
  if (!ts.isPropertyAccessExpression(expression)) return null;
  const owner = expression.expression;
  const member = expression.name.text;
  if (ts.isIdentifier(owner) && owner.text === "navigator" && member === "sendBeacon" &&
      isUnshadowedIdentifier(owner, context)) {
    return canonicalFact("direct_network_call", "global_property_call", directFactTarget("navigator.sendBeacon", node, context));
  }
  if (ts.isIdentifier(owner) && ["http", "https"].includes(owner.text) && ["get", "request"].includes(member) &&
      isUnshadowedIdentifier(owner, context)) {
    return canonicalFact("direct_network_call", "node_transport_call", directFactTarget(`${owner.text}.${member}`, node, context));
  }
  if (ts.isIdentifier(owner) && ["globalThis", "window", "self"].includes(owner.text) &&
      ["fetch", "WebSocket", "EventSource"].includes(member) && isUnshadowedIdentifier(owner, context)) {
    return canonicalFact("direct_network_call", "explicit_global_call", directFactTarget(`${owner.text}.${member}`, node, context));
  }
  const origin = context.networkOriginFromExpression(owner);
  if (origin) {
    const target = `${origin.module}${origin.member ? `#${origin.member}` : ""}.${member}`;
    return canonicalFact("direct_network_call", "bound_network_property_call", directFactTarget(target, node, context));
  }
  return null;
}

function directConstructionFact(node, context) {
  const expression = node.expression;
  if (ts.isIdentifier(expression) && ["WebSocket", "EventSource"].includes(expression.text) &&
      isUnshadowedIdentifier(expression, context)) {
    return canonicalFact("direct_network_call", "global_construct", directFactTarget(expression.text, node, context));
  }
  if (ts.isPropertyAccessExpression(expression) && ts.isIdentifier(expression.expression) &&
      ["globalThis", "window", "self"].includes(expression.expression.text) &&
      ["WebSocket", "EventSource"].includes(expression.name.text) &&
      isUnshadowedIdentifier(expression.expression, context)) {
    return canonicalFact(
      "direct_network_call",
      "explicit_global_construct",
      directFactTarget(`${expression.expression.text}.${expression.name.text}`, node, context),
    );
  }
  const origin = context.networkOriginFromExpression(expression);
  if (origin) {
    const target = `${origin.module}${origin.member ? `#${origin.member}` : ""}`;
    return canonicalFact("direct_network_call", "bound_network_construct", directFactTarget(target, node, context));
  }
  return null;
}

function unsafeSpecifierIdentity(argument, context) {
  if (!argument) return "missing_first_argument";
  const identity = context.expressionIdentity(argument);
  const digest = digestIdentity(identity);
  return `${ts.SyntaxKind[argument.kind]}:sha256:${digest}`;
}

function moduleLoadFact(form, argument, context) {
  if (!argument) return canonicalFact("unsafe_module_load", form, "unresolved_first_argument");
  const resolved = staticModuleSpecifier(argument);
  if (resolved.kind !== "static") {
    return canonicalFact("unsafe_module_load", form, unsafeSpecifierIdentity(argument, context));
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

  const { sourceFile, checker } = createBoundSourceFile(filePath, sourceText);
  if ((sourceFile.parseDiagnostics ?? []).length > 0) {
    return { complete: false, facts: [], failures: [parseFailure(filePath, "BLOCKING_PARSE_DIAGNOSTIC")] };
  }
  if (!checker) {
    return { complete: false, facts: [], failures: [parseFailure(filePath, "AST_BINDING_FAILED")] };
  }
  const context = createSemanticContext(sourceFile, checker);

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
        context,
      ));
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      addFact(moduleLoadFact("static_export_from", node.moduleSpecifier, context));
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      addFact(moduleLoadFact("typescript_import_equals", node.moduleReference.expression, context));
    } else if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        addFact(moduleLoadFact("dynamic_import", node.arguments[0], context));
      } else if (ts.isIdentifier(node.expression) && node.expression.text === "require" &&
          isUnshadowedIdentifier(node.expression, context)) {
        addFact(moduleLoadFact("global_require", node.arguments[0], context));
      } else if (ts.isPropertyAccessExpression(node.expression) &&
          ts.isIdentifier(node.expression.expression) &&
          node.expression.expression.text === "module" &&
          node.expression.name.text === "require" &&
          isUnshadowedIdentifier(node.expression.expression, context)) {
        addFact(moduleLoadFact("module_require", node.arguments[0], context));
      } else {
        addFact(directCallFact(node, context));
      }
    } else if (ts.isNewExpression(node)) {
      addFact(directConstructionFact(node, context));
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
  } catch (error) {
    const code = error instanceof BoundedAnalysisError ? error.code : "AST_ANALYSIS_FAILED";
    return { complete: false, facts: [], failures: [parseFailure(filePath, code)] };
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

function compareRepositorySemanticFactMultisets(files) {
  const baseFacts = files.flatMap((file) => file.baseFacts);
  const headFacts = files.flatMap((file) => file.headFacts);
  const introduced = compareSemanticFactMultisets(baseFacts, headFacts);
  const headPathsByKey = new Map();
  for (const file of files) {
    for (const fact of file.headFacts) {
      const key = factKey(fact);
      if (!headPathsByKey.has(key)) headPathsByKey.set(key, []);
      headPathsByKey.get(key).push(file.path);
    }
  }
  for (const paths of headPathsByKey.values()) paths.sort(compareText);

  const introducedByPath = new Map(files.map((file) => [file.path, []]));
  for (const entry of introduced) {
    const paths = headPathsByKey.get(factKey(entry.fact)) ?? [];
    const path = paths[0];
    if (path) introducedByPath.get(path).push(entry);
  }
  return files.map((file) => ({ path: file.path, introducedFacts: introducedByPath.get(file.path) ?? [] }));
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

  const analyzed = [];
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
    analyzed.push({
      path: comparisonPath,
      baseFacts: base.facts,
      headFacts: head.facts,
    });
  }

  const files = failures.length === 0
    ? compareRepositorySemanticFactMultisets(analyzed)
    : analyzed.map((file) => ({ path: file.path, introducedFacts: [] }));
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
