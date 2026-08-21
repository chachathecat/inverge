import { createHash } from "node:crypto";
import {
  deriveMigrationDependencyClosure,
  loadLiveMigrationSql,
  tokenizePostgresSql,
  validateMigrationDependencyClosure,
} from "./wcv-c3r-a0-migration-dependency-closure.mjs";

export const MIGRATION_LEDGER_STATUS_V2 = Object.freeze([
  "LEDGER_APPLIED",
  "LEDGER_ABSENT",
]);

export const MIGRATION_SCHEMA_STATUS_V2 = Object.freeze([
  "SCHEMA_MATCH_VERIFIED",
  "SCHEMA_PRESENT_UNVERIFIED",
  "SCHEMA_PARTIAL",
  "SCHEMA_ABSENT",
  "SCHEMA_UNASSESSED",
]);

export const MIGRATION_SOURCE_TREATMENT_V2 = Object.freeze([
  "PRESERVE",
  "REPAIR_IN_PLACE_FOR_FRESH_HISTORY",
  "REPLACE_WITH_COMPATIBILITY_STUB",
  "SUPERSEDE_BY_FORWARD_RECONCILIATION",
  "RETIRE_FROM_ACTIVE_CHAIN_WITH_EXACT_ALIAS_RECEIPT",
]);

export const MIGRATION_FILENAME_TREATMENT_V2 = Object.freeze([
  "PRESERVE_VERSION",
  "RENAME_LEDGER_ABSENT_TO_UNIQUE_14_DIGIT_VERSION",
  "PRESERVE_APPLIED_VERSION_WITH_COMPATIBILITY_BEHAVIOR",
  "HISTORICAL_ALIAS_PLUS_CANONICAL_VERSION",
]);

export const REMOTE_CONTINUITY_TREATMENT_V2 = Object.freeze([
  "NO_REMOTE_ACTION_REQUIRED",
  "EXACT_SCHEMA_EQUIVALENCE_REQUIRED",
  "FUTURE_HISTORY_REPAIR_OWNER_GATE",
  "FUTURE_FORWARD_RECONCILIATION_OWNER_GATE",
  "REMOTE_DEPLOY_BLOCKED",
]);

const APPEND_RECEIPT_REQUIRED_FIELDS = Object.freeze([
  "receiptId",
  "receiptType",
  "a2AuthorityId",
  "purposeExactly",
  "version",
  "filename",
  "sqlDigest",
  "dependencyPredecessors",
  "candidateHeadSha",
  "candidateTreeSha",
  "candidateHeadTreeBinding",
  "migrationInventoryDigest",
  "migrationInventoryCount",
  "dependencyClosureDigest",
  "migrationSensitivePathClosure",
  "migrationSensitivePathClosureDigest",
  "schemaRpcRlsObjectInventory",
  "schemaRpcRlsObjectInventoryDigest",
  "migrationFinalSecurityState",
  "isolatedReplayReceipts",
  "exactHeadCentralEvidence",
  "centralEvidenceArtifactSha256",
  "exactHeadDedicatedRuntimeEvidence",
  "dedicatedRuntimeEvidenceArtifactSha256",
  "remoteApplicationAuthorized",
  "migrationHistoryRepairAuthorized",
]);

const REQUIRED_CONCEPT_RPC_BOUNDARY = Object.freeze({
  functionIdentifier: "public.transition_personal_concept_node_v1",
  argumentTypesExactly: Object.freeze([
    "text",
    "text",
    "text",
    "text",
    "text",
    "text",
    "text",
    "text",
    "integer",
    "timestamptz",
  ]),
  executePrivilegesExactly: Object.freeze([
    Object.freeze({ operation: "GRANT", grantee: "authenticated" }),
    Object.freeze({ operation: "REVOKE", grantee: "anon" }),
    Object.freeze({ operation: "REVOKE", grantee: "public" }),
    Object.freeze({ operation: "REVOKE", grantee: "service_role" }),
  ]),
});

const PERSONAL_LEARNING_FORBIDDEN_KEYS_EXACTLY = Object.freeze([
  "raw",
  "ocr",
  "answer",
  "problem",
  "question",
  "copyright",
  "official",
  "model",
  "source",
  "score",
  "instructor",
  "grader",
  "pass",
  "fail",
  "text",
  "content",
  "body",
  "payload",
]);

const PERSONAL_LEARNING_ALLOWED_REPAIR_DELTAS = Object.freeze([
  Object.freeze({
    kind: "FILENAME_VERSION_REPAIR",
    from: "20260608_create_personal_learning_states.sql",
    to: "20260608090000_create_personal_learning_states.sql",
  }),
  Object.freeze({
    kind: "RECURSIVE_IMPLEMENTATION_REPAIR",
    from: "POSTGRES_42P19_MULTIPLE_RECURSIVE_TERMS",
    to: "ONE_POSTGRESQL_VALID_RECURSIVE_TERM",
    observableFunctionContractUnchanged: true,
  }),
  Object.freeze({
    kind: "FORCE_RLS_SECURITY_HARDENING",
    objectIdentity: "public.personal_learning_states",
    from: false,
    to: true,
  }),
  Object.freeze({
    kind: "FUNCTION_EXECUTE_SECURITY_HARDENING",
    objectIdentity: "public.personal_learning_state_metadata_has_forbidden_key(jsonb)",
    revokeExactly: Object.freeze(["public", "anon", "service_role"]),
    grantExactly: Object.freeze(["authenticated"]),
  }),
]);

const FINAL_SECURITY_OPERATION_BINDINGS = Object.freeze([
  "canonicalMigrationOrder",
  "filename",
  "version",
  "statementOrdinal",
  "sourceSpan",
  "objectIdentity",
  "operationKind",
  "beforeState",
  "afterState",
]);

export const A0_HISTORICAL_RECEIPT_V1 = Object.freeze({
  pullRequest: 785,
  reviewedHead: "f7f959368525f8a5895026f1361f6e13fd6226e0",
  reviewedTree: "543f8dfb5fdd026c1361e1a502376945912e6c5c",
  squashMergeSha: "3a7047cf4c7fc68247137bafbca2434abdadbc7f",
  resultingMainSha: "3a7047cf4c7fc68247137bafbca2434abdadbc7f",
  resultingMainTree: "543f8dfb5fdd026c1361e1a502376945912e6c5c",
});

export const A1_HISTORICAL_PROGRAM_RECEIPT_V1 = Object.freeze({
  pullRequest: 786,
  baseSha: "3a7047cf4c7fc68247137bafbca2434abdadbc7f",
  reviewedHead: "ff9dfbebea182d647daa84a349fcc50610f0ed1b",
  reviewedTree: "3c48da6fe991d8c02e3991e0a571b3b12139932c",
  squashMergeSha: "54afffcc539981ded65591f1f027171343bfce40",
  resultingMainSha: "54afffcc539981ded65591f1f027171343bfce40",
  resultingMainTree: "3c48da6fe991d8c02e3991e0a571b3b12139932c",
});

export const EXACT_REMOTE_LEDGER_RECORDS_V1 = Object.freeze([
  ["20260422", "inverge_service_core"],
  ["20260423", "inverge_service_role_grants"],
  ["20260424", "review_os_alpha"],
  ["20260426", "review_os_study_logs"],
  ["20260427", "study_logs_taxonomy_candidates"],
  ["20260429", "learning_signal_events"],
  ["20260430", "exam_archive"],
  ["20260605", "create_personal_concept_nodes"],
  ["20260622", "mobile_pwa_web_push_reminder"],
  ["20260623", "personal_concept_graph_atomic_transition"],
  ["202606232130", "personal_concept_graph_rpc_only_write_boundary"],
  ["20260730025332", "s236p_lean_owner_private"],
  ["20260730060233", "s236p_owner_private_lifecycle_hardening"],
  ["20260730065744", "s236p_owner_private_authenticated_download_info"],
  ["20260730151052", "s236p_owner_private_expiry_read_gate"],
].map(([version, name]) => Object.freeze({ version, name })));

export const EXACT_LEDGER_ABSENT_FILES_V1 = Object.freeze([
  "20260608_create_personal_learning_states.sql",
  "20260615_legal_grounding.sql",
  "20260615_legal_article_chunk_identity.sql",
  "20260615_legal_retrieval.sql",
  "20260615_legal_grounding_guard.sql",
  "20260616_legal_grounding_guard_service_role_grant.sql",
  "20260721060237_s233a_answer_review_persistence.sql",
  "20260817090000_c2r_c_p_structured_practice_proof.sql",
  "20260817113000_c2r_c_t_structural_theory_proof.sql",
  "20260817170000_c2r_c_l_exact_law_applicability.sql",
]);

const EXACT_A0_ARTIFACTS = Object.freeze({
  decision: Object.freeze({
    ref: "docs/decisions/2026-08-21-owner-wcv-c3r-a0-migration-dependency-authority.md",
    gitBlob: "8996f6c61f6cf0c5f7c908e97437a2f24bc65f8f",
    sha256: "f3be7b829539fa51c9037a58f05ed5a7c3fccbfcae28b3bb7b716330865b2ba6",
  }),
  manifest: Object.freeze({
    ref: "config/dabangil-wcv-c3r-a0-migration-dependency-authority-v1.json",
    gitBlob: "49916703d0a144647d6abce8cc98971042a35e1c",
    sha256: "e6e6d741d47732137860c0efc5c0dddc6b75e54fbd0ed6f2b1bcbe88e9f9d8e9",
  }),
  analyzer: Object.freeze({
    ref: "scripts/automation/wcv-c3r-a0-migration-dependency-closure.mjs",
    gitBlob: "23ba3b9f2af452b250cea0cbbbc5f135e8643b2d",
    sha256: "85751e62c300465b205f5e6d19357261af892a0072e06de2c4322258290fa6ec",
  }),
  focusedTest: Object.freeze({
    ref: "tests/wcv-c3r-a0-migration-dependency-authority.test.mjs",
    gitBlob: "04c5e3254ac03712a0fde27ef068329299305c40",
    sha256: "fa7e388a0f785b41661ac4fff342de7afe9dc05e03dee0e7afb0d3548bc6daaa",
  }),
});

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

const SQL_IDENTIFIER_COMPONENT = String.raw`(?:"(?:[^"]|"")*"|[a-z_][a-z0-9_$]*)`;
const SQL_QUALIFIED_IDENTIFIER = String.raw`${SQL_IDENTIFIER_COMPONENT}(?:\s*\.\s*${SQL_IDENTIFIER_COMPONENT})?`;
const NON_EXECUTABLE_SQL_TOKEN_TYPES = new Set([
  "ORDINARY_STRING",
  "ESCAPE_STRING",
  "DOLLAR_QUOTED_BODY",
  "LINE_COMMENT",
  "BLOCK_COMMENT",
]);

function normalizeSqlFragment(value) {
  return value?.trim().replace(/\s+/gu, " ") ?? null;
}

function splitIdentifierComponents(identifier) {
  const components = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < identifier.length; index += 1) {
    const character = identifier[index];
    if (character === '"') {
      current += character;
      if (quoted && identifier[index + 1] === '"') {
        current += identifier[index + 1];
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "." && !quoted) {
      components.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  components.push(current.trim());
  return components;
}

function canonicalSqlIdentifier(identifier, defaultSchema = null) {
  const components = splitIdentifierComponents(identifier).map((component) => {
    if (component.startsWith('"') && component.endsWith('"')) {
      return component.slice(1, -1).replace(/""/gu, '"');
    }
    return component.toLowerCase();
  });
  if (components.length === 1 && defaultSchema) components.unshift(defaultSchema);
  return components.join(".");
}

function maskNonExecutableSql(sql) {
  const masked = [...sql];
  for (const token of tokenizePostgresSql(sql)) {
    if (!NON_EXECUTABLE_SQL_TOKEN_TYPES.has(token.type)) continue;
    for (let index = token.start; index < token.end; index += 1) {
      if (masked[index] !== "\n" && masked[index] !== "\r") masked[index] = " ";
    }
  }
  return masked.join("");
}

function splitTopLevelStatements(sql) {
  const masked = maskNonExecutableSql(sql);
  const statements = [];
  let start = 0;
  let ordinal = 0;
  for (let index = 0; index <= masked.length; index += 1) {
    if (index !== masked.length && masked[index] !== ";") continue;
    const maskedSlice = masked.slice(start, index);
    if (maskedSlice.trim()) {
      const leading = maskedSlice.search(/\S/u);
      const sourceStart = start + leading;
      const sourceEnd = index + (index < masked.length ? 1 : 0);
      ordinal += 1;
      statements.push({
        ordinal,
        sourceStart,
        sourceEnd,
        masked: masked.slice(sourceStart, sourceEnd),
        source: sql.slice(sourceStart, sourceEnd),
      });
    }
    start = index + 1;
  }
  return statements;
}

function findMatchingParenthesis(masked, openIndex) {
  let depth = 0;
  for (let index = openIndex; index < masked.length; index += 1) {
    if (masked[index] === "(") depth += 1;
    if (masked[index] === ")") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function splitTopLevelComma(value) {
  const masked = maskNonExecutableSql(value);
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index <= masked.length; index += 1) {
    const character = masked[index];
    if (character === "(") depth += 1;
    if (character === ")") depth -= 1;
    if ((character === "," && depth === 0) || index === masked.length) {
      parts.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  return parts.filter(Boolean);
}

function normalizeFunctionArgumentTypes(argumentsSql) {
  return splitTopLevelComma(argumentsSql).map((argument) => {
    let normalized = normalizeSqlFragment(argument)
      .replace(/\s+(?:default\s+|=)[\s\S]*$/iu, "")
      .replace(/^(?:in|out|inout|variadic)\s+/iu, "");
    const pieces = normalized.split(/\s+/u);
    if (pieces.length > 1 && /^(?:"(?:[^"]|"")*"|[a-z_][a-z0-9_$]*)$/iu.test(pieces[0]) && !["double", "timestamp", "time", "character", "bit"].includes(pieces[0].toLowerCase())) {
      normalized = pieces.slice(1).join(" ");
    }
    return normalizeSqlType(normalized)
      .replace(/^timestamp with time zone$/u, "timestamptz")
      .replace(/^timestamp without time zone$/u, "timestamp")
      .replace(/^character varying$/u, "varchar");
  });
}

function extractParenthesizedClause(source, keywordPattern) {
  const masked = maskNonExecutableSql(source);
  const match = new RegExp(`${keywordPattern}\\s*\\(`, "iu").exec(masked);
  if (!match) return null;
  const openIndex = masked.indexOf("(", match.index);
  const closeIndex = findMatchingParenthesis(masked, openIndex);
  if (closeIndex < 0) return "__UNBALANCED__";
  return normalizeSqlFragment(source.slice(openIndex + 1, closeIndex));
}

function parseCreateFunctionStatement(statement) {
  const match = new RegExp(`^\\s*create\\s+(?:or\\s+replace\\s+)?function\\s+(${SQL_QUALIFIED_IDENTIFIER})\\s*\\(([^)]*)\\)`, "iu").exec(statement.masked);
  if (!match) return null;
  const bodyToken = tokenizePostgresSql(statement.source).find((token) => token.type === "DOLLAR_QUOTED_BODY");
  const returns = /\breturns\s+([^\s;]+(?:\s+with\s+time\s+zone)?)/iu.exec(statement.masked)?.[1] ?? null;
  const language = /\blanguage\s+(?:"([^"]+)"|([a-z_][a-z0-9_$]*))/iu.exec(statement.masked);
  const volatility = /\b(immutable|stable|volatile)\b/iu.exec(statement.masked)?.[1]?.toLowerCase() ?? "volatile";
  return {
    identity: canonicalSqlIdentifier(match[1], "public"),
    argumentTypes: normalizeFunctionArgumentTypes(match[2]),
    returns: normalizeSqlType(returns ?? ""),
    language: (language?.[1] ?? language?.[2] ?? "").toLowerCase(),
    volatility,
    body: bodyToken?.body ?? "",
  };
}

function deriveForbiddenKeyBehavior(body) {
  const normalized = body.replace(/\r\n?/gu, "\n");
  const masked = maskNonExecutableSql(normalized);
  const recursiveMatch = /\bwith\s+recursive\s+walk\s*\([^)]*\)\s+as\s*\(/iu.exec(masked);
  const recursiveOpen = recursiveMatch ? masked.indexOf("(", recursiveMatch.index + recursiveMatch[0].lastIndexOf("(")) : -1;
  const recursiveClose = recursiveOpen >= 0 ? findMatchingParenthesis(masked, recursiveOpen) : -1;
  const recursiveImplementation = recursiveClose > recursiveOpen
    ? normalizeSqlFragment(normalized.slice(recursiveOpen + 1, recursiveClose))
    : null;
  const observableEnvelope = recursiveClose > recursiveOpen
    ? normalizeSqlFragment(`${normalized.slice(0, recursiveOpen + 1)}<RECURSIVE_WALK_IMPLEMENTATION>${normalized.slice(recursiveClose)}`)
    : null;
  const regexMatch = /\bkey\s*~\*\s*'\(([^']+)\)'/iu.exec(normalized);
  const forbiddenKeyFamily = regexMatch?.[1].split("|") ?? [];
  const allWalkReferences = normalized.match(/\bfrom\s+walk\b/giu)?.length ?? 0;
  const recursiveTermCount = Math.max(allWalkReferences - 1, 0);
  const objectTraversal = /\bjsonb_each\s*\(/iu.test(normalized) && /jsonb_typeof\s*\(\s*walk\.child\s*\)\s*=\s*'object'/iu.test(normalized);
  const arrayTraversal = /\bjsonb_array_elements\s*\(/iu.test(normalized) && /jsonb_typeof\s*\(\s*walk\.child\s*\)\s*=\s*'array'/iu.test(normalized);
  const rootTraversal = /select\s+null::text\s+as\s+key\s*,\s*value\s+as\s+child/iu.test(normalized);
  const objectKeysCarried = /select\s+(?:entries|expanded)\.key/iu.test(normalized);
  const arrayKeyIsNull = /select\s+null::text\s+as\s+key\s*,\s*(?:elements|expanded)\.(?:value|child)/iu.test(normalized) || /select\s+null::text\s+as\s+key\s*,\s*elements\.value\s+as\s+child/iu.test(normalized);
  const keyPredicateOnly = /where\s+key\s+is\s+not\s+null\s+and\s+key\s*~\*/iu.test(normalized) && !/\bchild\s*~\*/iu.test(normalized);
  return {
    traversalStartsAtSuppliedJsonbRoot: rootTraversal,
    nestedObjectValuesTraversed: objectTraversal,
    nestedArrayElementsTraversed: arrayTraversal,
    mixedObjectArrayNestingTraversed: objectTraversal && arrayTraversal && /walk\.child/iu.test(normalized),
    objectKeysNotScalarValuesTested: objectKeysCarried && keyPredicateOnly,
    arrayElementsCarryNoInventedKey: arrayKeyIsNull,
    arbitraryFiniteNestingRepresentable: recursiveTermCount > 0 && objectTraversal && arrayTraversal,
    forbiddenKeyMatchCaseInsensitive: Boolean(regexMatch),
    forbiddenKeyFamily,
    terminalShapesBounded: /else\s+'\{\}'::jsonb/iu.test(normalized) && /else\s+'\[\]'::jsonb/iu.test(normalized),
    recursiveTermCount,
    postgresValidSingleRecursiveTerm: recursiveTermCount === 1,
    recursiveImplementationSha256: recursiveImplementation ? sha256(recursiveImplementation) : null,
    observableEnvelopeSha256: observableEnvelope ? sha256(observableEnvelope) : null,
  };
}

function parseTableDefinition(statement) {
  const match = new RegExp(`^\\s*create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?(${SQL_QUALIFIED_IDENTIFIER})\\s*\\(`, "iu").exec(statement.masked);
  if (!match) return null;
  const openIndex = statement.masked.indexOf("(", match.index + match[0].lastIndexOf("("));
  const closeIndex = findMatchingParenthesis(statement.masked, openIndex);
  if (closeIndex < 0) return { identity: canonicalSqlIdentifier(match[1], "public"), parseError: "UNBALANCED_TABLE" };
  const segments = splitTopLevelComma(statement.source.slice(openIndex + 1, closeIndex));
  const columns = [];
  const constraints = [];
  for (const segment of segments) {
    const namedCheck = new RegExp(`^constraint\\s+(${SQL_IDENTIFIER_COMPONENT})\\s+check\\s*\\(([\\s\\S]*)\\)$`, "iu").exec(segment);
    if (namedCheck) {
      constraints.push({
        kind: "CHECK",
        name: canonicalSqlIdentifier(namedCheck[1]),
        expression: normalizeSqlFragment(namedCheck[2]),
      });
      continue;
    }
    const tableUnique = /^unique\s*\(([^)]*)\)$/iu.exec(segment);
    if (tableUnique) {
      constraints.push({ kind: "UNIQUE", name: null, columns: splitTopLevelComma(tableUnique[1]).map((entry) => canonicalSqlIdentifier(entry)) });
      continue;
    }
    const columnMatch = new RegExp(`^(${SQL_IDENTIFIER_COMPONENT})\\s+([\\s\\S]+)$`, "iu").exec(segment);
    if (!columnMatch) {
      constraints.push({ kind: "UNSUPPORTED", source: normalizeSqlFragment(segment) });
      continue;
    }
    const name = canonicalSqlIdentifier(columnMatch[1]);
    const remainder = columnMatch[2];
    const type = /^([\s\S]*?)(?=\s+(?:not\s+null|null|primary\s+key|unique|default|references|check)\b|$)/iu.exec(remainder)?.[1] ?? "";
    const defaultValue = /\bdefault\s+([\s\S]*?)(?=\s+(?:not\s+null|null|primary\s+key|unique|references|check)\b|$)/iu.exec(remainder)?.[1] ?? null;
    const reference = new RegExp(`\\breferences\\s+(${SQL_QUALIFIED_IDENTIFIER})\\s*\\(([^)]*)\\)(?:\\s+on\\s+delete\\s+(cascade|restrict|set\\s+null|no\\s+action))?`, "iu").exec(remainder);
    const primaryKey = /\bprimary\s+key\b/iu.test(remainder);
    columns.push({
      ordinal: columns.length + 1,
      name,
      type: normalizeSqlType(type),
      nullable: !primaryKey && !/\bnot\s+null\b/iu.test(remainder),
      default: normalizeSqlFragment(defaultValue),
    });
    if (primaryKey) constraints.push({ kind: "PRIMARY_KEY", name: null, columns: [name] });
    if (/\bunique\b/iu.test(remainder)) constraints.push({ kind: "UNIQUE", name: null, columns: [name] });
    if (reference) {
      constraints.push({
        kind: "FOREIGN_KEY",
        name: null,
        columns: [name],
        referencesTable: canonicalSqlIdentifier(reference[1], "public"),
        referencesColumns: splitTopLevelComma(reference[2]).map((entry) => canonicalSqlIdentifier(entry)),
        onDelete: (reference[3] ?? "NO ACTION").toUpperCase().replace(/\s+/gu, "_"),
      });
    }
  }
  return { identity: canonicalSqlIdentifier(match[1], "public"), columns, constraints };
}

function parsePolicyStatement(statement) {
  const create = new RegExp(`^\\s*create\\s+policy\\s+(${SQL_IDENTIFIER_COMPONENT})\\s+on\\s+(${SQL_QUALIFIED_IDENTIFIER})`, "iu").exec(statement.masked);
  if (!create) return null;
  const command = /\bfor\s+(select|insert|update|delete|all)\b/iu.exec(statement.masked)?.[1]?.toUpperCase() ?? "ALL";
  const rolesSource = /\bto\s+([\s\S]*?)(?=\busing\s*\(|\bwith\s+check\s*\(|;|$)/iu.exec(statement.masked)?.[1] ?? "public";
  return {
    table: canonicalSqlIdentifier(create[2], "public"),
    name: canonicalSqlIdentifier(create[1]),
    command,
    roles: splitTopLevelComma(rolesSource).map((entry) => canonicalSqlIdentifier(entry)).sort(),
    using: extractParenthesizedClause(statement.source, "using"),
    withCheck: extractParenthesizedClause(statement.source, "with\\s+check"),
  };
}

function derivePersonalLearningPolicyAndPrivilegeState(statements, targetTable) {
  const policies = new Map();
  const privileges = new Map();
  let rlsEnabled = false;
  let rlsForced = false;
  for (const statement of statements) {
    const rls = new RegExp(`^\\s*alter\\s+table\\s+(?:if\\s+exists\\s+)?(?:only\\s+)?(${SQL_QUALIFIED_IDENTIFIER})\\s+(enable|disable|force|no\\s+force)\\s+row\\s+level\\s+security`, "iu").exec(statement.masked);
    if (rls && canonicalSqlIdentifier(rls[1], "public") === targetTable) {
      const operation = rls[2].toUpperCase().replace(/\s+/gu, "_");
      if (operation === "ENABLE") rlsEnabled = true;
      if (operation === "DISABLE") rlsEnabled = false;
      if (operation === "FORCE") rlsForced = true;
      if (operation === "NO_FORCE") rlsForced = false;
    }
    const drop = new RegExp(`^\\s*drop\\s+policy\\s+(?:if\\s+exists\\s+)?(${SQL_IDENTIFIER_COMPONENT})\\s+on\\s+(${SQL_QUALIFIED_IDENTIFIER})`, "iu").exec(statement.masked);
    if (drop && canonicalSqlIdentifier(drop[2], "public") === targetTable) policies.delete(canonicalSqlIdentifier(drop[1]));
    const policy = parsePolicyStatement(statement);
    if (policy?.table === targetTable) policies.set(policy.name, policy);
    const privilege = new RegExp(`^\\s*(grant|revoke)\\s+([a-z,\\s]+?)\\s+on\\s+table\\s+(${SQL_QUALIFIED_IDENTIFIER})\\s+(to|from)\\s+([^;]+)`, "iu").exec(statement.masked);
    if (privilege && canonicalSqlIdentifier(privilege[3], "public") === targetTable) {
      const operation = privilege[1].toUpperCase();
      const granted = privilege[2].split(",").map((entry) => entry.trim().toUpperCase()).filter(Boolean);
      const grantees = privilege[5].split(",").map((entry) => canonicalSqlIdentifier(entry.trim())).filter(Boolean);
      for (const grantee of grantees) {
        const current = privileges.get(grantee) ?? new Set();
        for (const item of granted) {
          if (operation === "GRANT") current.add(item);
          else if (item === "ALL" || item === "ALL PRIVILEGES") current.clear();
          else current.delete(item);
        }
        privileges.set(grantee, current);
      }
    }
  }
  return {
    rlsEnabled,
    rlsForced,
    policies: [...policies.values()].sort((left, right) => left.name.localeCompare(right.name)),
    tablePrivileges: [...privileges.entries()].map(([grantee, values]) => ({ grantee, privileges: [...values].sort() })).filter((entry) => entry.privileges.length > 0).sort((left, right) => left.grantee.localeCompare(right.grantee)),
  };
}

export function derivePersonalLearningMigrationSemanticInventory(sql) {
  const statements = splitTopLevelStatements(sql.replace(/\r\n?/gu, "\n"));
  const extensions = [];
  const functions = [];
  const tables = [];
  const indexes = [];
  for (const statement of statements) {
    const extension = new RegExp(`^\\s*create\\s+extension\\s+(?:if\\s+not\\s+exists\\s+)?(${SQL_IDENTIFIER_COMPONENT})`, "iu").exec(statement.masked);
    if (extension) extensions.push(canonicalSqlIdentifier(extension[1]));
    const routine = parseCreateFunctionStatement(statement);
    if (routine) {
      functions.push({
        identity: routine.identity,
        argumentTypes: routine.argumentTypes,
        returns: routine.returns,
        language: routine.language,
        volatility: routine.volatility,
        observableBehavior: deriveForbiddenKeyBehavior(routine.body),
      });
    }
    const table = parseTableDefinition(statement);
    if (table) tables.push(table);
    const index = new RegExp(`^\\s*create\\s+(unique\\s+)?index\\s+(?:if\\s+not\\s+exists\\s+)?(${SQL_IDENTIFIER_COMPONENT})\\s+on\\s+(${SQL_QUALIFIED_IDENTIFIER})\\s*\\(([^)]*)\\)`, "iu").exec(statement.masked);
    if (index) {
      indexes.push({
        name: canonicalSqlIdentifier(index[2]),
        table: canonicalSqlIdentifier(index[3], "public"),
        unique: Boolean(index[1]),
        expressions: splitTopLevelComma(index[4]).map(normalizeSqlFragment),
      });
    }
  }
  const targetTable = "public.personal_learning_states";
  const security = derivePersonalLearningPolicyAndPrivilegeState(statements, targetTable);
  return {
    inventoryType: "PersonalLearningMigrationSemanticInventoryV1",
    extensions: [...extensions].sort(),
    functions: functions.sort((left, right) => left.identity.localeCompare(right.identity)),
    tables: tables.sort((left, right) => left.identity.localeCompare(right.identity)),
    indexes: indexes.sort((left, right) => left.name.localeCompare(right.name)),
    policies: security.policies,
    tablePrivileges: security.tablePrivileges,
    rlsState: { table: targetTable, enabled: security.rlsEnabled, forced: security.rlsForced },
  };
}

export function personalLearningMetadataHasForbiddenKeyReference(value) {
  const forbidden = new RegExp(`^(?:${PERSONAL_LEARNING_FORBIDDEN_KEYS_EXACTLY.join("|")})$`, "iu");
  const pending = [value];
  while (pending.length > 0) {
    const current = pending.pop();
    if (Array.isArray(current)) {
      pending.push(...current);
    } else if (current && typeof current === "object") {
      for (const [key, child] of Object.entries(current)) {
        if (forbidden.test(key)) return true;
        pending.push(child);
      }
    }
  }
  return false;
}

function personalLearningEquivalentProjection(inventory) {
  const projected = structuredClone(inventory);
  for (const routine of projected.functions) {
    delete routine.observableBehavior.recursiveTermCount;
    delete routine.observableBehavior.postgresValidSingleRecursiveTerm;
    delete routine.observableBehavior.recursiveImplementationSha256;
  }
  projected.rlsState.forced = false;
  return projected;
}

function semanticComparisonDigestFields(comparison) {
  const fields = { ...comparison };
  delete fields.receiptDigest;
  return fields;
}

export function derivePersonalLearningSemanticComparison(authority, repairedSql) {
  const repairedInventory = derivePersonalLearningMigrationSemanticInventory(repairedSql);
  const baselineInventory = authority.baselineInventory;
  const baselineFunction = baselineInventory.functions.find((entry) => entry.identity === "public.personal_learning_state_metadata_has_forbidden_key");
  const repairedFunction = repairedInventory.functions.find((entry) => entry.identity === "public.personal_learning_state_metadata_has_forbidden_key");
  const baselineProjectionDigest = sha256(canonicalJson(personalLearningEquivalentProjection(baselineInventory)));
  const repairedProjectionDigest = sha256(canonicalJson(personalLearningEquivalentProjection(repairedInventory)));
  const comparison = {
    receiptType: "PersonalLearningMigrationSemanticComparisonReceiptV1",
    baselineInventoryDigest: sha256(canonicalJson(baselineInventory)),
    repairedInventoryDigest: sha256(canonicalJson(repairedInventory)),
    baselineEquivalentProjectionDigest: baselineProjectionDigest,
    repairedEquivalentProjectionDigest: repairedProjectionDigest,
    equivalentBidirectionally: baselineProjectionDigest === repairedProjectionDigest,
    baselineRecursiveTermCount: baselineFunction?.observableBehavior.recursiveTermCount ?? null,
    repairedRecursiveTermCount: repairedFunction?.observableBehavior.recursiveTermCount ?? null,
    repairedPostgresValidSingleRecursiveTerm: repairedFunction?.observableBehavior.postgresValidSingleRecursiveTerm ?? false,
    baselineRecursiveImplementationSha256: baselineFunction?.observableBehavior.recursiveImplementationSha256 ?? null,
    repairedRecursiveImplementationSha256: repairedFunction?.observableBehavior.recursiveImplementationSha256 ?? null,
    repairedRecursiveImplementationAuthorized: repairedFunction?.observableBehavior.recursiveImplementationSha256 === authority.requiredRepairedRecursiveImplementationSha256,
    securityHardeningSeparatedFromBaselineEquivalence: baselineInventory.rlsState.forced === false && repairedInventory.rlsState.forced === true,
    allowedDeltasExactly: authority.allowedRepairDeltasExactly,
  };
  comparison.receiptDigest = sha256(canonicalJson(semanticComparisonDigestFields(comparison)));
  return comparison;
}

export function deriveA0BaselineInventory(a0Manifest) {
  return a0Manifest.records.map((record) => ({
    currentFilename: record.currentFilename,
    currentVersionToken: record.currentVersionToken,
    sqlSha256: record.sqlSha256,
    exactDependencyPredecessors: record.exactDependencyPredecessors,
    freshHistoryOrder: record.freshHistoryOrder,
  }));
}

export function deriveA0BaselineInventoryDigest(a0Manifest) {
  return sha256(canonicalJson(deriveA0BaselineInventory(a0Manifest)));
}

function assertClosedEnum(errors, label, actual, expected) {
  if (!same(actual, expected)) errors.push(label);
}

export function validateA2AuthorityContract(contract, a0Manifest) {
  const errors = [];
  if (contract.contractId !== "dabangil.wcv.c3r.a2.migration-history-reconciliation") {
    errors.push("CONTRACT_ID");
  }
  if (contract.contractVersion !== "1.0.0") errors.push("CONTRACT_VERSION");
  for (const [field, value] of Object.entries(A0_HISTORICAL_RECEIPT_V1)) {
    if (contract.a0HistoricalReceiptV1?.[field] !== value) errors.push(`A0_${field}`);
  }
  for (const [field, value] of Object.entries(A1_HISTORICAL_PROGRAM_RECEIPT_V1)) {
    if (contract.a1HistoricalProgramReceiptV1?.[field] !== value) errors.push(`A1_${field}`);
  }
  if (!same(contract.a0HistoricalReceiptV1?.immutableArtifacts, EXACT_A0_ARTIFACTS)) {
    errors.push("A0_IMMUTABLE_ARTIFACTS");
  }
  if (!same(contract.a1HistoricalProgramReceiptV1?.strictStageOrder, ["C3R-P", "C3R-T", "C3R-L"])) {
    errors.push("A1_STAGE_ORDER");
  }
  if (!same(contract.a1HistoricalProgramReceiptV1?.actionableCounts, { p0: 0, p1: 0, p2: 0 })) {
    errors.push("A1_ACTIONABLE");
  }
  if (contract.a1HistoricalProgramReceiptV1?.unresolvedActionableThreads !== 0) {
    errors.push("A1_THREADS");
  }
  assertClosedEnum(errors, "LEDGER_ENUM", contract.closedEnums?.migrationLedgerStatusV2, MIGRATION_LEDGER_STATUS_V2);
  assertClosedEnum(errors, "SCHEMA_ENUM", contract.closedEnums?.migrationSchemaStatusV2, MIGRATION_SCHEMA_STATUS_V2);
  assertClosedEnum(errors, "SOURCE_ENUM", contract.closedEnums?.migrationSourceTreatmentV2, MIGRATION_SOURCE_TREATMENT_V2);
  assertClosedEnum(errors, "FILENAME_ENUM", contract.closedEnums?.migrationFilenameTreatmentV2, MIGRATION_FILENAME_TREATMENT_V2);
  assertClosedEnum(errors, "CONTINUITY_ENUM", contract.closedEnums?.remoteContinuityTreatmentV2, REMOTE_CONTINUITY_TREATMENT_V2);

  const ledger = contract.remoteMigrationLedgerReceiptV1 ?? {};
  if (ledger.receiptType !== "RemoteMigrationLedgerReceiptV1") errors.push("LEDGER_RECEIPT_TYPE");
  if (ledger.provenance !== "LIVE_READ_ONLY") errors.push("LEDGER_PROVENANCE");
  if (ledger.logicalProjectName !== "inverge-beta") errors.push("LEDGER_PROJECT");
  if (ledger.environmentClass !== "NON_PRODUCTION_BETA") errors.push("LEDGER_ENVIRONMENT");
  if (ledger.projectHealthObserved !== "ACTIVE_HEALTHY") errors.push("LEDGER_PROJECT_HEALTH");
  if (ledger.nonSecretProjectFingerprintScheme !== "SHA256_UTF8_SUPABASE_PROJECT_REF_V1") errors.push("LEDGER_PROJECT_FINGERPRINT_SCHEME");
  if (ledger.nonSecretProjectFingerprint !== "5a58c1e637d9cacb4bc8a71c377a57c4c7863ef9e87a6dfc3597bc83e56770d4") {
    errors.push("LEDGER_PROJECT_FINGERPRINT");
  }
  if (ledger.observedAtUtc !== "2026-08-21T07:17:37.805066Z" || ledger.observedAtKst !== "2026-08-21T16:17:37.805066+09:00") {
    errors.push("LEDGER_OBSERVATION_TIME");
  }
  if (!same(ledger.toolQueryProvenance, [
    "mcp__codex_apps__supabase_list_projects",
    "mcp__codex_apps__supabase_get_project",
    "mcp__codex_apps__supabase_list_migrations",
    "mcp__codex_apps__supabase_execute_sql:SELECT_ONLY:supabase_migrations.schema_migrations:jsonb_agg_order_by_version_name",
  ])) errors.push("LEDGER_TOOL_QUERY_PROVENANCE");
  if (!same(ledger.orderedRecords, EXACT_REMOTE_LEDGER_RECORDS_V1)) errors.push("LEDGER_RECORDS");
  if (ledger.exactCount !== 15) errors.push("LEDGER_COUNT");
  if (ledger.receiptDigestMethod !== "SHA256_POSTGRES_JSONB_TEXT_JSONB_AGG_BUILD_OBJECT_ORDER_BY_VERSION_NAME") errors.push("LEDGER_RECEIPT_DIGEST_METHOD");
  if (ledger.receiptDigest !== "45bcc29f8a21eb53e153e6d106250883ae843daa1057869390fd92cabc2a35c4") {
    errors.push("LEDGER_RECEIPT_DIGEST");
  }
  if (ledger.remoteMutationCount !== 0) errors.push("LEDGER_REMOTE_MUTATION");
  if (ledger.learnerPrivateBodyCount !== 0) errors.push("LEDGER_PRIVATE_BODY");
  if (ledger.rawCredentialStored !== false) errors.push("LEDGER_CREDENTIAL");

  const schema = contract.remoteSchemaMetadataReceiptV1 ?? {};
  if (schema.receiptType !== "RemoteSchemaMetadataReceiptV1") errors.push("SCHEMA_RECEIPT_TYPE");
  if (schema.provenance !== "LIVE_READ_ONLY") errors.push("SCHEMA_PROVENANCE");
  if (!same(schema.observationWindowUtc, {
    relations: "2026-08-21T07:18:07.719574Z",
    functions: "2026-08-21T07:18:26.733723Z",
    extensions: "2026-08-21T07:18:36.763633Z",
  })) errors.push("SCHEMA_OBSERVATION_WINDOW");
  if (!same(schema.toolQueryProvenance, [
    "mcp__codex_apps__supabase_list_extensions",
    "mcp__codex_apps__supabase_execute_sql:SELECT_ONLY:pg_catalog+information_schema:49_target_relations",
    "mcp__codex_apps__supabase_execute_sql:SELECT_ONLY:pg_catalog:14_target_functions",
  ])) errors.push("SCHEMA_TOOL_QUERY_PROVENANCE");
  if (schema.receiptDigest !== "cbe27ce7e921f310e6ec7d0f243060cc919e2bfd8bc8299cacac43d88f15aabd") {
    errors.push("SCHEMA_RECEIPT_DIGEST");
  }
  if (schema.remoteMutationCount !== 0) errors.push("SCHEMA_REMOTE_MUTATION");
  if (schema.learnerPrivateBodyCount !== 0) errors.push("SCHEMA_PRIVATE_BODY");
  if (schema.secretCount !== 0) errors.push("SCHEMA_SECRET");
  if (schema.objectPresenceEstablishesMigrationEquivalence !== false) {
    errors.push("SCHEMA_EQUIVALENCE_PROMOTION");
  }
  const relationPresence = schema.relationPresenceExactly ?? [];
  const functionPresence = schema.functionPresenceExactly ?? [];
  if (relationPresence.length !== 49 || new Set(relationPresence.map((entry) => entry.objectIdentifier)).size !== 49 || relationPresence.filter((entry) => entry.presenceState === "PRESENT").length !== 39 || relationPresence.filter((entry) => entry.presenceState === "ABSENT").length !== 10 || relationPresence.some((entry) => entry.objectKind !== "relation")) {
    errors.push("SCHEMA_RELATION_PRESENCE_RECEIPT");
  }
  if (functionPresence.length !== 14 || new Set(functionPresence.map((entry) => entry.objectIdentifier)).size !== 14 || functionPresence.filter((entry) => entry.presenceState === "PRESENT").length !== 6 || functionPresence.filter((entry) => entry.presenceState === "ABSENT").length !== 8 || functionPresence.some((entry) => entry.objectKind !== "function")) {
    errors.push("SCHEMA_FUNCTION_PRESENCE_RECEIPT");
  }
  if (sha256(canonicalJson(relationPresence)) !== schema.relationSummary?.presenceProjectionSha256 || schema.relationSummary?.presenceProjectionSha256 !== "3bfdbf802d875c0d919cd364c7d7041bba6ff265a09eed1b517f4816723962cb") errors.push("SCHEMA_RELATION_PROJECTION_DIGEST");
  if (sha256(canonicalJson(functionPresence)) !== schema.functionSummary?.presenceProjectionSha256 || schema.functionSummary?.presenceProjectionSha256 !== "36d799965a4c8f48ff1f89bd2a3fe794a1cf6ea2c7d34488f2406f3c3e9d726b") errors.push("SCHEMA_FUNCTION_PROJECTION_DIGEST");
  if (schema.relationSummary?.orderedMetadataSha256 !== "4cc6bf679d983c68990fd2012b71b337dc39b82f1a2565157cd9a15a3dd69234" || schema.functionSummary?.orderedMetadataSha256 !== "37eae9e3aa0119f523cef5ad755d801b531136afb79e004a0e3f9ea6eaff9a29") errors.push("SCHEMA_ORDERED_METADATA_DIGEST");
  if (sha256(canonicalJson(schema.selectedMaterialObservations)) !== schema.selectedMaterialObservationsSha256 || schema.selectedMaterialObservationsSha256 !== "17f79a7519bae955eb10241e85983d75894d0fa9b0b6a787917a63e496d2f7ab") errors.push("SCHEMA_SELECTED_MATERIAL_DIGEST");
  if (!same(schema.extensions, [
    { name: "pgcrypto", schema: "extensions", installedVersion: "1.3" },
    { name: "vector", schema: "public", installedVersion: "0.8.0" },
  ]) || schema.extensionRowsSha256 !== "4e4fbcb0d5b1dbeb52aacdde0c000355377903161ef38ad7d26cdaabfa53b0e6") errors.push("SCHEMA_EXTENSIONS");
  if (schema.receiptDigestPreimage !== "RemoteSchemaMetadataReceiptV1|relations:4cc6bf679d983c68990fd2012b71b337dc39b82f1a2565157cd9a15a3dd69234|functions:37eae9e3aa0119f523cef5ad755d801b531136afb79e004a0e3f9ea6eaff9a29|extensions:4e4fbcb0d5b1dbeb52aacdde0c000355377903161ef38ad7d26cdaabfa53b0e6") errors.push("SCHEMA_RECEIPT_DIGEST_PREIMAGE");

  if (!same(contract.cleanReplanRemoteReceiptRefreshV1, {
    receiptType: "C3RA2CleanReplanRemoteReceiptRefreshV1",
    provenance: "LIVE_READ_ONLY",
    logicalProjectName: "inverge-beta",
    nonSecretProjectFingerprint: "5a58c1e637d9cacb4bc8a71c377a57c4c7863ef9e87a6dfc3597bc83e56770d4",
    ledgerObservedAtUtc: "2026-08-21T10:01:53.058414Z",
    presenceObservedAtUtc: "2026-08-21T10:04:57.620234Z",
    materialObservedAtUtc: "2026-08-21T10:05:28.582667Z",
    ledgerCount: 15,
    ledgerDigest: "45bcc29f8a21eb53e153e6d106250883ae843daa1057869390fd92cabc2a35c4",
    relationTargeted: 49,
    relationPresent: 39,
    relationAbsent: 10,
    relationMismatchesExactly: [],
    functionTargeted: 14,
    functionPresent: 6,
    functionAbsent: 8,
    functionMismatchesExactly: [],
    materialTablesObserved: 8,
    materialTableMismatchesExactly: [],
    transitionRpcDefinitionMd5: "0aa7d76598c8167a4293a6ac097b2bfb",
    transitionRpcAclMd5: "5fc13192159b7c60c3a808895ae2c2c8",
    extensionRowsSha256: "4e4fbcb0d5b1dbeb52aacdde0c000355377903161ef38ad7d26cdaabfa53b0e6",
    compositeSchemaReceiptDigest: "cbe27ce7e921f310e6ec7d0f243060cc919e2bfd8bc8299cacac43d88f15aabd",
    matchesFrozenPr790ContentReceipt: true,
    remoteMutationCount: 0,
    learnerPrivateBodyCount: 0,
    secretCount: 0,
  })) errors.push("CLEAN_REPLAN_REMOTE_RECEIPT_REFRESH");

  const semanticAuthority = contract.personalLearningMigrationSemanticInventoryV1 ?? {};
  if (semanticAuthority.authorityType !== "PersonalLearningMigrationSemanticInventoryV1") errors.push("PERSONAL_SEMANTIC_AUTHORITY_TYPE");
  if (semanticAuthority.baselineFilename !== "20260608_create_personal_learning_states.sql" || semanticAuthority.repairedFilenameExactly !== "20260608090000_create_personal_learning_states.sql") errors.push("PERSONAL_SEMANTIC_FILENAMES");
  if (semanticAuthority.baselineSqlSha256 !== "13f290748149a6d1ede1b3894ca9bce3d3f79e198015918e5a4159b6c1c2b968") errors.push("PERSONAL_SEMANTIC_BASELINE_SQL_DIGEST");
  if (semanticAuthority.inventoryDigestAlgorithm !== "SHA256_UTF8_CANONICAL_JSON_V1") errors.push("PERSONAL_SEMANTIC_DIGEST_ALGORITHM");
  if (sha256(canonicalJson(semanticAuthority.baselineInventory)) !== semanticAuthority.baselineInventoryDigest) errors.push("PERSONAL_SEMANTIC_BASELINE_INVENTORY_DIGEST");
  if (semanticAuthority.baselineInventoryDigest !== "3a044b510b0644dec6511baf019f9ff3b8d6008b957147ca4cf3ec890e660ba4") errors.push("PERSONAL_SEMANTIC_BASELINE_INVENTORY_FIXED_DIGEST");
  if (semanticAuthority.baselineRecursiveImplementationSha256 !== "76bd0bbc2622976ff61a6b6b31737eadd81f9619c5262c8ad7d473a2a10ad1a0") errors.push("PERSONAL_SEMANTIC_BASELINE_RECURSIVE_DIGEST");
  if (semanticAuthority.requiredRepairedRecursiveImplementationSha256 !== "99241af0e7ef0969d94a1de6c5df012765969b429bc7e2572046630c7aec48f9") errors.push("PERSONAL_SEMANTIC_REPAIRED_RECURSIVE_DIGEST");
  if (!same(semanticAuthority.allowedRepairDeltasExactly, PERSONAL_LEARNING_ALLOWED_REPAIR_DELTAS)) errors.push("PERSONAL_SEMANTIC_ALLOWED_DELTAS");
  if (!same(semanticAuthority.forbiddenKeyFamilyExactly, PERSONAL_LEARNING_FORBIDDEN_KEYS_EXACTLY)) errors.push("PERSONAL_SEMANTIC_FORBIDDEN_KEYS");
  for (const field of ["bidirectionalComparisonRequired", "receiptDigestRebindingCannotHideMismatch", "securityHardeningSeparatedFromBaselineEquivalence"]) {
    if (semanticAuthority[field] !== true) errors.push(`PERSONAL_SEMANTIC_${field}`);
  }

  if (deriveA0BaselineInventoryDigest(a0Manifest) !== contract.a0HistoricalReceiptV1?.baselineInventoryDigest) {
    errors.push("A0_BASELINE_INVENTORY_DIGEST");
  }
  if (contract.a0HistoricalReceiptV1?.baselineInventoryDigestAlgorithm !== "SHA256_UTF8_CANONICAL_JSON_V1") {
    errors.push("A0_BASELINE_INVENTORY_DIGEST_ALGORITHM");
  }
  if (contract.a0HistoricalReceiptV1?.baselineInventoryDigestPreimageDomain !== "A0 manifest records in declared order projected to currentFilename,currentVersionToken,sqlSha256,exactDependencyPredecessors,freshHistoryOrder; arrays preserve order; object keys sort lexicographically; JSON is minified") {
    errors.push("A0_BASELINE_INVENTORY_DIGEST_PREIMAGE_DOMAIN");
  }
  const baselineByFilename = new Map(a0Manifest.records.map((record) => [record.currentFilename, record]));
  const records = contract.migrationRecordReconciliationsV2 ?? [];
  if (records.length !== 25) errors.push("RECONCILIATION_COUNT");
  const seen = new Set();
  for (const record of records) {
    const baseline = baselineByFilename.get(record.currentFilename);
    if (!baseline || seen.has(record.currentFilename)) {
      errors.push(`RECORD_IDENTITY_${record.currentFilename}`);
      continue;
    }
    seen.add(record.currentFilename);
    if (record.currentVersionToken !== baseline.currentVersionToken) errors.push(`VERSION_${record.currentFilename}`);
    if (record.currentSqlDigest !== baseline.sqlSha256) errors.push(`DIGEST_${record.currentFilename}`);
    if (record.a0BaselineBinding !== `A0:${baseline.currentFilename}:${baseline.sqlSha256}`) errors.push(`A0_BINDING_${record.currentFilename}`);
    if (!MIGRATION_LEDGER_STATUS_V2.includes(record.ledgerStatus)) errors.push(`LEDGER_STATUS_${record.currentFilename}`);
    if (!MIGRATION_SCHEMA_STATUS_V2.includes(record.schemaStatus)) errors.push(`SCHEMA_STATUS_${record.currentFilename}`);
    if (!MIGRATION_SOURCE_TREATMENT_V2.includes(record.sourceTreatment)) errors.push(`SOURCE_TREATMENT_${record.currentFilename}`);
    if (!MIGRATION_FILENAME_TREATMENT_V2.includes(record.filenameTreatment)) errors.push(`FILENAME_TREATMENT_${record.currentFilename}`);
    if (!REMOTE_CONTINUITY_TREATMENT_V2.includes(record.remoteContinuityTreatment)) errors.push(`CONTINUITY_${record.currentFilename}`);
    for (const field of ["syntax", "dependencyOrder"]) {
      if (!["PASS", "FAIL", "UNVERIFIED"].includes(record.freshHistoryStatus?.[field])) errors.push(`FRESH_${field}_${record.currentFilename}`);
    }
    for (const field of ["exactFailureCode", "exactFailureClass", "exactRepairRequirement"]) {
      if (!(field in (record.freshHistoryStatus ?? {}))) errors.push(`FRESH_${field}_${record.currentFilename}`);
    }
    if (!Number.isInteger(record.exactProposedFreshHistoryOrder)) errors.push(`ORDER_${record.currentFilename}`);
    if (!Array.isArray(record.evidenceRefs) || record.evidenceRefs.length === 0) errors.push(`EVIDENCE_${record.currentFilename}`);
    if (record.currentAuthorityStatus !== "A0_BASELINE_BOUND_A2_RECONCILIATION_PLAN") errors.push(`AUTHORITY_${record.currentFilename}`);
  }
  if (seen.size !== 25) errors.push("RECONCILIATION_COVERAGE");

  const appliedVersions = new Set(EXACT_REMOTE_LEDGER_RECORDS_V1.map((record) => record.version));
  for (const record of records) {
    const expected = appliedVersions.has(record.currentVersionToken) ? "LEDGER_APPLIED" : "LEDGER_ABSENT";
    if (record.ledgerStatus !== expected) errors.push(`LEDGER_CLASSIFICATION_${record.currentFilename}`);
  }
  const absent = records.filter((record) => record.ledgerStatus === "LEDGER_ABSENT").map((record) => record.currentFilename);
  if (!same(absent, EXACT_LEDGER_ABSENT_FILES_V1)) errors.push("LEDGER_ABSENT_SET");
  if (records.filter((record) => record.schemaStatus === "SCHEMA_PRESENT_UNVERIFIED").length !== 20 || records.filter((record) => record.schemaStatus === "SCHEMA_ABSENT").length !== 5 || records.some((record) => ["SCHEMA_MATCH_VERIFIED", "SCHEMA_PARTIAL", "SCHEMA_UNASSESSED"].includes(record.schemaStatus))) {
    errors.push("SCHEMA_CLASSIFICATION_DISTRIBUTION");
  }

  const learning = records.find((record) => record.currentFilename === "20260608_create_personal_learning_states.sql");
  if (!learning || learning.schemaStatus !== "SCHEMA_ABSENT" || learning.freshHistoryStatus.syntax !== "FAIL" || learning.freshHistoryStatus.exactFailureCode !== "42P19" || learning.sourceTreatment !== "REPAIR_IN_PLACE_FOR_FRESH_HISTORY" || learning.filenameTreatment !== "RENAME_LEDGER_ABSENT_TO_UNIQUE_14_DIGIT_VERSION" || learning.proposedCanonicalFilename !== "20260608090000_create_personal_learning_states.sql" || learning.remoteContinuityTreatment !== "FUTURE_FORWARD_RECONCILIATION_OWNER_GATE") {
    errors.push("PERSONAL_LEARNING_STATES_DISPOSITION");
  }

  const legalFiles = contract.exactReconciliationDecisions?.legalFamily?.currentFilesExactly;
  const legalOrder = contract.exactReconciliationDecisions?.legalFamily?.canonicalOrderExactly;
  if (!same(legalFiles, EXACT_LEDGER_ABSENT_FILES_V1.slice(1, 6))) errors.push("LEGAL_FILES");
  if (!same(legalOrder, [
    "20260615090000_legal_grounding.sql",
    "20260615100000_legal_article_chunk_identity.sql",
    "20260615110000_legal_retrieval.sql",
    "20260615120000_legal_grounding_guard.sql",
    "20260616100000_legal_grounding_guard_service_role_grant.sql",
  ])) errors.push("LEGAL_CANONICAL_ORDER");
  for (const filename of legalFiles ?? []) {
    const record = records.find((entry) => entry.currentFilename === filename);
    if (!record || record.ledgerStatus !== "LEDGER_ABSENT" || record.schemaStatus !== "SCHEMA_PRESENT_UNVERIFIED" || record.remoteContinuityTreatment !== "EXACT_SCHEMA_EQUIVALENCE_REQUIRED") errors.push(`LEGAL_DISPOSITION_${filename}`);
  }

  const atomic = records.find((record) => record.currentFilename === "20260623_personal_concept_graph_atomic_transition.sql");
  const boundary = records.find((record) => record.currentFilename === "202606232130_personal_concept_graph_rpc_only_write_boundary.sql");
  if (!atomic || !boundary || atomic.ledgerStatus !== "LEDGER_APPLIED" || boundary.ledgerStatus !== "LEDGER_APPLIED" || atomic.filenameTreatment !== "PRESERVE_VERSION" || boundary.filenameTreatment !== "PRESERVE_APPLIED_VERSION_WITH_COMPATIBILITY_BEHAVIOR" || boundary.sourceTreatment !== "REPLACE_WITH_COMPATIBILITY_STUB" || atomic.freshHistoryStatus.dependencyOrder !== "FAIL" || boundary.freshHistoryStatus.dependencyOrder !== "FAIL") {
    errors.push("CONCEPT_GRAPH_DISPOSITION");
  }
  if (contract.exactReconciliationDecisions?.conceptGraph?.forwardBoundaryAppendRequired !== true) errors.push("CONCEPT_FORWARD_BOUNDARY");

  const appendAuthority = contract.c3rpAppendReceiptV1 ?? {};
  const pathClosure = appendAuthority.requiredMigrationSensitivePathClosureExactly ?? [];
  if (pathClosure.length !== 14 || new Set(pathClosure).size !== 14 || pathClosure.filter((entry) => entry.includes("<C3R_P_APPEND_FILENAME>")).length !== 1 || pathClosure.some((entry) => !entry.startsWith("supabase/migrations/"))) {
    errors.push("APPEND_REQUIRED_PATH_CLOSURE");
  }
  if (!same(appendAuthority.requiredFieldsExactly, APPEND_RECEIPT_REQUIRED_FIELDS)) {
    errors.push("APPEND_REQUIRED_FIELDS");
  }
  if (appendAuthority.newlyProducedTablesRequireEnabledAndForcedRls !== true) {
    errors.push("APPEND_FORCED_RLS_AUTHORITY");
  }
  if (!same(appendAuthority.requiredConceptRpcBoundary, REQUIRED_CONCEPT_RPC_BOUNDARY)) {
    errors.push("APPEND_CONCEPT_RPC_BOUNDARY_AUTHORITY");
  }
  const finalSecurityAuthority = appendAuthority.migrationFinalSecurityStateV1 ?? {};
  if (finalSecurityAuthority.authorityType !== "MigrationFinalSecurityStateV1") errors.push("FINAL_SECURITY_AUTHORITY_TYPE");
  if (!same(finalSecurityAuthority.operationBindingsExactly, FINAL_SECURITY_OPERATION_BINDINGS)) errors.push("FINAL_SECURITY_OPERATION_BINDINGS");
  if (!same(finalSecurityAuthority.rlsOperationsExactly, ["ENABLE", "DISABLE", "FORCE", "NO_FORCE"])) errors.push("FINAL_SECURITY_RLS_OPERATIONS");
  if (!same(finalSecurityAuthority.policyOperationsExactly, ["CREATE_POLICY", "ALTER_POLICY", "DROP_POLICY"])) errors.push("FINAL_SECURITY_POLICY_OPERATIONS");
  if (!same(finalSecurityAuthority.privilegeOperationsExactly, ["GRANT", "REVOKE"])) errors.push("FINAL_SECURITY_PRIVILEGE_OPERATIONS");
  if (!same(finalSecurityAuthority.nonExecutableEvidenceClassesExactly, ["LINE_COMMENT", "BLOCK_COMMENT", "ORDINARY_STRING", "ESCAPE_STRING", "DOLLAR_QUOTED_BODY"])) errors.push("FINAL_SECURITY_LEXICAL_BOUNDARY");
  if (!same(finalSecurityAuthority.forbiddenFinalGranteesExactly, ["public", "anon"]) || !same(finalSecurityAuthority.safeFinalGranteesExactly, ["authenticated"])) errors.push("FINAL_SECURITY_GRANTEE_BOUNDARY");
  for (const field of [
    "orderedFinalStateRequired",
    "unsupportedDynamicSecurityDdlFailsClosed",
    "mutableMigrationDynamicSecurityDdlFailsClosedWithoutResolvedTarget",
    "immutableA0DynamicSecurityDdlMayBeIgnoredOnlyWithExactSourceAndNoProtectedIdentifier",
    "roleOrUserScopedDefaultPrivilegesFailClosed",
    "policyRolesDerivedFromExecutableMaskedSql",
    "allTableFunctionRoutineSchemaPrivilegesFailClosed",
    "quotedIdentifierCaseSensitive",
    "everyProtectedTableRlsEnabledAndForced",
    "finalPolicySetDeclaredByAppendReceipt",
  ]) {
    if (finalSecurityAuthority[field] !== true) errors.push(`FINAL_SECURITY_${field}`);
  }
  for (const field of [
    "checkpointDependencyClosureMustUseA0Analyzer",
    "replayReceiptMustBindExactHeadTreeInventoryClosureAndResultDigests",
  ]) {
    if (appendAuthority[field] !== true) errors.push(`APPEND_${field}`);
  }
  for (const field of [
    "emptyMigrationSensitivePathClosureAllowed",
    "emptySchemaRpcRlsObjectInventoryAllowed",
  ]) {
    if (appendAuthority[field] !== false) errors.push(`APPEND_${field}`);
  }
  if (appendAuthority.isolatedReplayReceiptType !== "SupabaseIsolatedMigrationReplayReceiptV1" || !same(appendAuthority.isolatedReplayRequiredFieldsExactly, [...REPLAY_RECEIPT_DIGEST_FIELDS, "receiptDigest"])) {
    errors.push("APPEND_REPLAY_RECEIPT_SCHEMA");
  }

  if (!same(contract.serialProgram?.strictStageOrder, ["C3R-P", "C3R-T", "C3R-L"])) errors.push("SERIAL_ORDER");
  if (!same(contract.serialProgram?.c3rPRequiresValidatedReceipts, ["C3R-A0", "C3R-A1", "C3R-A2"])) errors.push("P_RECEIPTS");
  if (contract.serialProgram?.c3rPState !== "dependency_ready_unstarted_after_validated_a2_receipt") errors.push("P_STATE");
  if (contract.serialProgram?.c3rTState !== "blocked_on_validated_c3r_p_receipt") errors.push("T_STATE");
  if (contract.serialProgram?.c3rLState !== "blocked_on_validated_c3r_p_and_c3r_t_receipts") errors.push("L_STATE");
  if (contract.serialProgram?.wcvC3State !== "incomplete") errors.push("WCV_C3_STATE");

  for (const field of ["migrationFileMutationPerformed", "remoteMigrationHistoryRepairAuthorized", "remoteDbPushAuthorized", "linkedResetAuthorized", "remoteSqlMutationAuthorized", "runtimeImplementationAuthorized", "productionAuthorized", "paymentAuthorized", "providerAuthorized", "learnerActivationAuthorized"]) {
    if (contract.activationBoundary?.[field] !== false) errors.push(`ACTIVATION_${field}`);
  }
  if (contract.activationBoundary?.remoteMutationCount !== 0) errors.push("REMOTE_MUTATION_COUNT");
  if (contract.activationBoundary?.successorRuntimeStarted !== 0) errors.push("SUCCESSOR_STARTED");
  return errors;
}

function digestSql(sql) {
  return sha256(sql.replace(/\r\n?/gu, "\n"));
}

function filenameVersion(filename) {
  return filename.match(/^(\d+)_/u)?.[1] ?? null;
}

export function deriveMigrationInventoryDigest(sqlByFilename) {
  return sha256(canonicalJson([...sqlByFilename]
    .map(([filename, sql]) => ({ filename, sqlSha256: digestSql(sql) }))
    .sort((left, right) => left.filename.localeCompare(right.filename))));
}

function normalizeSimpleIdentifier(identifier) {
  return canonicalSqlIdentifier(identifier);
}

function normalizeSqlType(type) {
  return type.trim().replace(/\s+/gu, " ").toLowerCase()
    .replace(/^timestamp with time zone$/u, "timestamptz")
    .replace(/^timestamp without time zone$/u, "timestamp")
    .replace(/^character varying$/u, "varchar");
}

const TABLE_PRIVILEGE_UNIVERSE = Object.freeze([
  "DELETE",
  "INSERT",
  "REFERENCES",
  "SELECT",
  "TRIGGER",
  "TRUNCATE",
  "UPDATE",
]);

function functionSecurityKey(identifier, argumentTypes) {
  return `${canonicalSqlIdentifier(identifier, "public")}(${argumentTypes.map(normalizeSqlType).join(",")})`;
}

function privilegeProjection(privileges) {
  return [...privileges.entries()]
    .map(([grantee, values]) => ({ grantee, privileges: [...values].sort() }))
    .filter((entry) => entry.privileges.length > 0)
    .sort((left, right) => left.grantee.localeCompare(right.grantee));
}

function clonePrivilegeMap(privileges) {
  return new Map([...privileges.entries()].map(([grantee, values]) => [grantee, new Set(values)]));
}

function tableSecurityProjection(state) {
  return {
    identifier: state.identifier,
    exists: state.exists,
    rlsEnabled: state.rlsEnabled,
    rlsForced: state.rlsForced,
    policies: [...state.policies.values()].sort((left, right) => left.name.localeCompare(right.name)),
    privileges: privilegeProjection(state.privileges),
  };
}

function functionSecurityProjection(state) {
  return {
    identifier: state.identifier,
    argumentTypes: state.argumentTypes,
    exists: state.exists,
    privileges: privilegeProjection(state.privileges),
  };
}

function parseSecurityPolicyMutation(statement) {
  const created = parsePolicyStatement(statement);
  if (created) return { operation: "CREATE_POLICY", policy: created };
  const dropped = new RegExp(`^\\s*drop\\s+policy\\s+(?:if\\s+exists\\s+)?(${SQL_IDENTIFIER_COMPONENT})\\s+on\\s+(${SQL_QUALIFIED_IDENTIFIER})`, "iu").exec(statement.masked);
  if (dropped) {
    return {
      operation: "DROP_POLICY",
      table: canonicalSqlIdentifier(dropped[2], "public"),
      name: canonicalSqlIdentifier(dropped[1]),
    };
  }
  const altered = new RegExp(`^\\s*alter\\s+policy\\s+(${SQL_IDENTIFIER_COMPONENT})\\s+on\\s+(${SQL_QUALIFIED_IDENTIFIER})`, "iu").exec(statement.masked);
  if (!altered) return null;
  const rolesSource = /\bto\s+([\s\S]*?)(?=\busing\s*\(|\bwith\s+check\s*\(|;|$)/iu.exec(statement.masked)?.[1] ?? null;
  return {
    operation: "ALTER_POLICY",
    table: canonicalSqlIdentifier(altered[2], "public"),
    name: canonicalSqlIdentifier(altered[1]),
    roles: rolesSource === null ? null : splitTopLevelComma(rolesSource).map((entry) => canonicalSqlIdentifier(entry)).sort(),
    using: extractParenthesizedClause(statement.source, "using"),
    withCheck: extractParenthesizedClause(statement.source, "with\\s+check"),
  };
}

function deriveProtectedObjectsFromCheckpoint(projectedRecords, derived, sqlByFilename, appendDerived, contract) {
  const learningFilename = projectedRecords.find((record) => record.currentFilename.endsWith("_create_personal_learning_states.sql"))?.currentFilename;
  const protectedFilenames = new Set([learningFilename, appendDerived?.currentFilename].filter(Boolean));
  const protectedTables = [...new Set(derived
    .filter((entry) => protectedFilenames.has(entry.currentFilename))
    .flatMap((entry) => entry.producedObjects)
    .filter((entry) => entry.kind === "table")
    .map((entry) => canonicalSqlIdentifier(entry.identifier, "public")))]
    .sort();
  const protectedFunctions = [];
  for (const filename of protectedFilenames) {
    for (const statement of splitTopLevelStatements(sqlByFilename.get(filename) ?? "")) {
      const routine = parseCreateFunctionStatement(statement);
      if (!routine) continue;
      protectedFunctions.push({ identifier: routine.identity, argumentTypes: routine.argumentTypes });
    }
  }
  protectedFunctions.push({
    identifier: contract.c3rpAppendReceiptV1.requiredConceptRpcBoundary.functionIdentifier,
    argumentTypes: contract.c3rpAppendReceiptV1.requiredConceptRpcBoundary.argumentTypesExactly,
  });
  return {
    tables: protectedTables,
    functions: [...new Map(protectedFunctions.map((entry) => [functionSecurityKey(entry.identifier, entry.argumentTypes), entry])).values()]
      .sort((left, right) => functionSecurityKey(left.identifier, left.argumentTypes).localeCompare(functionSecurityKey(right.identifier, right.argumentTypes))),
    mutableSecurityMigrationFilenames: [
      learningFilename,
      "202606232130_personal_concept_graph_rpc_only_write_boundary.sql",
      appendDerived?.currentFilename,
    ].filter(Boolean).sort(),
  };
}

export function deriveMigrationFinalSecurityState(sequence, protectedObjects) {
  const protectedTableSet = new Set(protectedObjects.tables.map((entry) => canonicalSqlIdentifier(entry, "public")));
  const protectedFunctionMap = new Map(protectedObjects.functions.map((entry) => [
    functionSecurityKey(entry.identifier, entry.argumentTypes),
    { identifier: canonicalSqlIdentifier(entry.identifier, "public"), argumentTypes: entry.argumentTypes.map(normalizeSqlType) },
  ]));
  const tables = new Map([...protectedTableSet].map((identifier) => [identifier, {
    identifier,
    exists: false,
    rlsEnabled: false,
    rlsForced: false,
    policies: new Map(),
    privileges: new Map(),
  }]));
  const functions = new Map([...protectedFunctionMap].map(([key, identity]) => [key, {
    ...identity,
    exists: false,
    privileges: new Map(),
  }]));
  const operationTrace = [];
  const diagnostics = [];
  const defaultTablePrivileges = new Map();
  const mutableSecurityMigrationFilenames = new Set(
    protectedObjects.mutableSecurityMigrationFilenames ?? sequence.map((migration) => migration.filename),
  );

  const recordOperation = (migration, statement, objectIdentity, operationKind, beforeState, afterState) => {
    operationTrace.push({
      canonicalMigrationOrder: migration.canonicalMigrationOrder,
      filename: migration.filename,
      version: filenameVersion(migration.filename),
      statementOrdinal: statement.ordinal,
      sourceSpan: { start: statement.sourceStart, end: statement.sourceEnd },
      objectIdentity,
      operationKind,
      beforeState,
      afterState,
    });
  };

  const addUnsupported = (migration, statement, code, objectIdentity = null) => {
    diagnostics.push({
      code,
      canonicalMigrationOrder: migration.canonicalMigrationOrder,
      filename: migration.filename,
      statementOrdinal: statement.ordinal,
      sourceSpan: { start: statement.sourceStart, end: statement.sourceEnd },
      objectIdentity,
    });
  };

  for (const migration of [...sequence].sort((left, right) => left.canonicalMigrationOrder - right.canonicalMigrationOrder)) {
    for (const statement of splitTopLevelStatements(migration.sql)) {
      let protectedSecurityOperationRecognized = false;
      const lowerSource = statement.source.toLowerCase();
      const protectedIdentities = [...protectedTableSet, ...[...protectedFunctionMap.values()].map((entry) => entry.identifier)];
      const mentionsProtectedObject = protectedIdentities.some((identity) => lowerSource.includes(identity.toLowerCase()));
      const mentionsProtectedUnqualifiedIdentifier = protectedIdentities.some((identity) =>
        lowerSource.includes(identity.split(".").at(-1).toLowerCase()));
      const dynamicSecurityDdl = /^\s*(?:do|execute)\b/iu.test(statement.masked) &&
        /\b(?:row\s+level\s+security|policy|grant|revoke|alter\s+default\s+privileges)\b/iu.test(statement.source);
      if (dynamicSecurityDdl && (
        mutableSecurityMigrationFilenames.has(migration.filename) ||
        mentionsProtectedObject ||
        mentionsProtectedUnqualifiedIdentifier ||
        /\balter\s+default\s+privileges\b/iu.test(statement.source)
      )) {
        addUnsupported(migration, statement, "UNSUPPORTED_DYNAMIC_SECURITY_DDL");
        continue;
      }
      if (/^\s*alter\s+default\s+privileges\s+for\s+(?:role|user)\b/iu.test(statement.masked)) {
        addUnsupported(migration, statement, "UNSUPPORTED_ROLE_SCOPED_DEFAULT_PRIVILEGES", "DEFAULT_TABLE_PRIVILEGES:public");
        continue;
      }
      if (/^\s*(?:grant|revoke)\b[\s\S]*\bon\s+all\s+(?:tables|functions|routines)\b/iu.test(statement.masked) || /^\s*alter\s+default\s+privileges\b[\s\S]*\bon\s+functions\b/iu.test(statement.masked)) {
        addUnsupported(migration, statement, "UNSUPPORTED_BROAD_SECURITY_PRIVILEGE_DDL");
        continue;
      }

      const defaultTablePrivilege = new RegExp(`^\\s*alter\\s+default\\s+privileges(?:\\s+in\\s+schema\\s+(${SQL_IDENTIFIER_COMPONENT}))?\\s+(grant|revoke)\\s+([a-z,\\s]+?)\\s+on\\s+tables\\s+(to|from)\\s+([^;]+)`, "iu").exec(statement.masked);
      if (defaultTablePrivilege && (!defaultTablePrivilege[1] || canonicalSqlIdentifier(defaultTablePrivilege[1]) === "public")) {
        const operation = defaultTablePrivilege[2].toUpperCase();
        const direction = defaultTablePrivilege[4].toUpperCase();
        const requested = defaultTablePrivilege[3].split(",").map((entry) => entry.trim().toUpperCase()).filter(Boolean);
        const privilegeNames = requested.some((entry) => entry === "ALL" || entry === "ALL PRIVILEGES") ? TABLE_PRIVILEGE_UNIVERSE : requested;
        const grantees = defaultTablePrivilege[5].split(",").map((entry) => canonicalSqlIdentifier(entry.trim())).filter(Boolean);
        const before = privilegeProjection(defaultTablePrivileges);
        if ((operation === "GRANT" && direction !== "TO") || (operation === "REVOKE" && direction !== "FROM")) {
          addUnsupported(migration, statement, "UNSUPPORTED_DEFAULT_TABLE_PRIVILEGE_DIRECTION", "DEFAULT_TABLE_PRIVILEGES:public");
        } else {
          for (const grantee of grantees) {
            const current = defaultTablePrivileges.get(grantee) ?? new Set();
            for (const privilege of privilegeNames) {
              if (operation === "GRANT") current.add(privilege);
              else current.delete(privilege);
            }
            defaultTablePrivileges.set(grantee, current);
          }
          recordOperation(migration, statement, "DEFAULT_TABLE_PRIVILEGES:public", `${operation}_DEFAULT_TABLE_PRIVILEGES`, before, privilegeProjection(defaultTablePrivileges));
        }
      }

      const createTable = new RegExp(`^\\s*create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?(${SQL_QUALIFIED_IDENTIFIER})`, "iu").exec(statement.masked);
      if (createTable) {
        const identifier = canonicalSqlIdentifier(createTable[1], "public");
        const state = tables.get(identifier);
        if (state) {
          const before = tableSecurityProjection(state);
          if (!state.exists) state.privileges = clonePrivilegeMap(defaultTablePrivileges);
          state.exists = true;
          recordOperation(migration, statement, identifier, "CREATE_TABLE", before, tableSecurityProjection(state));
        }
      }

      const dropTable = new RegExp(`^\\s*drop\\s+table\\s+(?:if\\s+exists\\s+)?(${SQL_QUALIFIED_IDENTIFIER})`, "iu").exec(statement.masked);
      if (dropTable) {
        const identifier = canonicalSqlIdentifier(dropTable[1], "public");
        const state = tables.get(identifier);
        if (state) {
          const before = tableSecurityProjection(state);
          state.exists = false;
          state.rlsEnabled = false;
          state.rlsForced = false;
          state.policies.clear();
          state.privileges.clear();
          recordOperation(migration, statement, identifier, "DROP_TABLE", before, tableSecurityProjection(state));
        }
      }

      const routine = parseCreateFunctionStatement(statement);
      if (routine) {
        const key = functionSecurityKey(routine.identity, routine.argumentTypes);
        const state = functions.get(key);
        if (state) {
          const before = functionSecurityProjection(state);
          if (!state.exists) state.privileges.set("public", new Set(["EXECUTE"]));
          state.exists = true;
          recordOperation(migration, statement, key, "CREATE_OR_REPLACE_FUNCTION", before, functionSecurityProjection(state));
        }
      }

      const dropFunction = new RegExp(`^\\s*drop\\s+function\\s+(?:if\\s+exists\\s+)?(${SQL_QUALIFIED_IDENTIFIER})\\s*\\(([^)]*)\\)`, "iu").exec(statement.masked);
      if (dropFunction) {
        const key = functionSecurityKey(dropFunction[1], normalizeFunctionArgumentTypes(dropFunction[2]));
        const state = functions.get(key);
        if (state) {
          const before = functionSecurityProjection(state);
          state.exists = false;
          state.privileges.clear();
          recordOperation(migration, statement, key, "DROP_FUNCTION", before, functionSecurityProjection(state));
        }
      }

      const rls = new RegExp(`^\\s*alter\\s+table\\s+(?:if\\s+exists\\s+)?(?:only\\s+)?(${SQL_QUALIFIED_IDENTIFIER})\\s+(enable|disable|force|no\\s+force)\\s+row\\s+level\\s+security`, "iu").exec(statement.masked);
      if (rls) {
        const identifier = canonicalSqlIdentifier(rls[1], "public");
        const state = tables.get(identifier);
        if (state) {
          protectedSecurityOperationRecognized = true;
          const operation = rls[2].toUpperCase().replace(/\s+/gu, "_");
          const before = { rlsEnabled: state.rlsEnabled, rlsForced: state.rlsForced };
          if (operation === "ENABLE") state.rlsEnabled = true;
          if (operation === "DISABLE") state.rlsEnabled = false;
          if (operation === "FORCE") state.rlsForced = true;
          if (operation === "NO_FORCE") state.rlsForced = false;
          recordOperation(migration, statement, identifier, `${operation}_ROW_LEVEL_SECURITY`, before, { rlsEnabled: state.rlsEnabled, rlsForced: state.rlsForced });
        }
      }

      const policyMutation = parseSecurityPolicyMutation(statement);
      if (policyMutation && protectedTableSet.has(policyMutation.table ?? policyMutation.policy?.table)) {
        protectedSecurityOperationRecognized = true;
        const table = policyMutation.table ?? policyMutation.policy.table;
        const state = tables.get(table);
        const name = policyMutation.name ?? policyMutation.policy.name;
        const before = state.policies.get(name) ?? null;
        if (policyMutation.operation === "CREATE_POLICY") {
          state.policies.set(name, policyMutation.policy);
        } else if (policyMutation.operation === "DROP_POLICY") {
          state.policies.delete(name);
        } else if (policyMutation.operation === "ALTER_POLICY") {
          if (!before) {
            addUnsupported(migration, statement, "ALTER_MISSING_POLICY", `${table}:${name}`);
          } else {
            state.policies.set(name, {
              ...before,
              roles: policyMutation.roles ?? before.roles,
              using: policyMutation.using ?? before.using,
              withCheck: policyMutation.withCheck ?? before.withCheck,
            });
          }
        }
        recordOperation(migration, statement, `${table}:${name}`, policyMutation.operation, before, state.policies.get(name) ?? null);
      }

      const tablePrivilege = new RegExp(`^\\s*(grant|revoke)\\s+([a-z,\\s]+?)\\s+on\\s+table\\s+(${SQL_QUALIFIED_IDENTIFIER})\\s+(to|from)\\s+([^;]+)`, "iu").exec(statement.masked);
      if (tablePrivilege) {
        const identifier = canonicalSqlIdentifier(tablePrivilege[3], "public");
        const state = tables.get(identifier);
        if (state) {
          protectedSecurityOperationRecognized = true;
          const operation = tablePrivilege[1].toUpperCase();
          const direction = tablePrivilege[4].toUpperCase();
          if ((operation === "GRANT" && direction !== "TO") || (operation === "REVOKE" && direction !== "FROM")) {
            addUnsupported(migration, statement, "UNSUPPORTED_TABLE_PRIVILEGE_DIRECTION", identifier);
          } else {
            const requested = tablePrivilege[2].split(",").map((entry) => entry.trim().toUpperCase()).filter(Boolean);
            const privilegeNames = requested.some((entry) => entry === "ALL" || entry === "ALL PRIVILEGES") ? TABLE_PRIVILEGE_UNIVERSE : requested;
            const grantees = tablePrivilege[5].split(",").map((entry) => canonicalSqlIdentifier(entry.trim())).filter(Boolean);
            const before = privilegeProjection(state.privileges);
            for (const grantee of grantees) {
              const current = state.privileges.get(grantee) ?? new Set();
              for (const privilege of privilegeNames) {
                if (operation === "GRANT") current.add(privilege);
                else current.delete(privilege);
              }
              state.privileges.set(grantee, current);
            }
            recordOperation(migration, statement, identifier, `${operation}_TABLE_PRIVILEGES`, before, privilegeProjection(state.privileges));
          }
        }
      }

      const functionPrivilege = new RegExp(`^\\s*(grant|revoke)\\s+(execute|all(?:\\s+privileges)?)\\s+on\\s+function\\s+(${SQL_QUALIFIED_IDENTIFIER})\\s*\\(([^)]*)\\)\\s+(to|from)\\s+([^;]+)`, "iu").exec(statement.masked);
      if (functionPrivilege) {
        const key = functionSecurityKey(functionPrivilege[3], normalizeFunctionArgumentTypes(functionPrivilege[4]));
        const state = functions.get(key);
        if (state) {
          protectedSecurityOperationRecognized = true;
          const operation = functionPrivilege[1].toUpperCase();
          const direction = functionPrivilege[5].toUpperCase();
          if ((operation === "GRANT" && direction !== "TO") || (operation === "REVOKE" && direction !== "FROM")) {
            addUnsupported(migration, statement, "UNSUPPORTED_FUNCTION_PRIVILEGE_DIRECTION", key);
          } else {
            const grantees = functionPrivilege[6].split(",").map((entry) => canonicalSqlIdentifier(entry.trim())).filter(Boolean);
            const before = privilegeProjection(state.privileges);
            for (const grantee of grantees) {
              const current = state.privileges.get(grantee) ?? new Set();
              if (operation === "GRANT") current.add("EXECUTE");
              else current.delete("EXECUTE");
              state.privileges.set(grantee, current);
            }
            recordOperation(migration, statement, key, `${operation}_FUNCTION_EXECUTE`, before, privilegeProjection(state.privileges));
          }
        }
      }

      if (!protectedSecurityOperationRecognized && mentionsProtectedObject && /^\s*(?:alter\s+table|create\s+policy|alter\s+policy|drop\s+policy|grant|revoke)\b/iu.test(statement.masked) && /\b(?:row\s+level\s+security|policy|grant|revoke)\b/iu.test(statement.masked)) {
        addUnsupported(migration, statement, "UNSUPPORTED_PROTECTED_SECURITY_DDL");
      }
    }
  }

  const finalTables = [...tables.values()].map(tableSecurityProjection).sort((left, right) => left.identifier.localeCompare(right.identifier));
  const finalFunctions = [...functions.values()].map(functionSecurityProjection).sort((left, right) => functionSecurityKey(left.identifier, left.argumentTypes).localeCompare(functionSecurityKey(right.identifier, right.argumentTypes)));
  const finalProjection = { finalTables, finalFunctions };
  return {
    receiptType: "MigrationFinalSecurityStateV1",
    operationTrace,
    operationTraceDigest: sha256(canonicalJson(operationTrace)),
    finalTables,
    finalFunctions,
    finalStateDigest: sha256(canonicalJson(finalProjection)),
    diagnostics,
  };
}

export function validateMigrationFinalSecurityState(finalState) {
  const errors = [];
  if (finalState.receiptType !== "MigrationFinalSecurityStateV1") errors.push("FINAL_SECURITY_RECEIPT_TYPE");
  if (finalState.operationTraceDigest !== sha256(canonicalJson(finalState.operationTrace))) errors.push("FINAL_SECURITY_TRACE_DIGEST");
  if (finalState.finalStateDigest !== sha256(canonicalJson({ finalTables: finalState.finalTables, finalFunctions: finalState.finalFunctions }))) errors.push("FINAL_SECURITY_STATE_DIGEST");
  if (finalState.diagnostics.length > 0) errors.push("FINAL_SECURITY_UNSUPPORTED_DIAGNOSTIC");
  for (const table of finalState.finalTables) {
    if (!table.exists) errors.push(`FINAL_SECURITY_TABLE_MISSING_${table.identifier}`);
    if (!table.rlsEnabled || !table.rlsForced) errors.push(`FINAL_SECURITY_RLS_${table.identifier}`);
    if (table.policies.length === 0) errors.push(`FINAL_SECURITY_POLICY_EMPTY_${table.identifier}`);
    if (table.policies.some((policy) => policy.roles.length === 0 || policy.roles.some((role) => role !== "authenticated"))) errors.push(`FINAL_SECURITY_POLICY_ROLE_${table.identifier}`);
    if (table.privileges.some((entry) => entry.grantee !== "authenticated")) errors.push(`FINAL_SECURITY_TABLE_GRANTEE_${table.identifier}`);
  }
  for (const routine of finalState.finalFunctions) {
    const key = functionSecurityKey(routine.identifier, routine.argumentTypes);
    if (!routine.exists) errors.push(`FINAL_SECURITY_FUNCTION_MISSING_${key}`);
    if (!same(routine.privileges, [{ grantee: "authenticated", privileges: ["EXECUTE"] }])) errors.push(`FINAL_SECURITY_FUNCTION_PRIVILEGE_${key}`);
  }
  return errors;
}

function deriveSqlBoundaryInventory(derivedAppend, appendSql) {
  const nonExecutableTokenTypes = new Set([
    "ORDINARY_STRING",
    "ESCAPE_STRING",
    "DOLLAR_QUOTED_BODY",
    "LINE_COMMENT",
    "BLOCK_COMMENT",
  ]);
  const executableSql = [...appendSql];
  for (const token of tokenizePostgresSql(appendSql)) {
    if (!nonExecutableTokenTypes.has(token.type)) continue;
    for (let index = token.start; index < token.end; index += 1) {
      if (executableSql[index] !== "\n" && executableSql[index] !== "\r") executableSql[index] = " ";
    }
  }
  const executableBoundarySql = executableSql.join("");
  const inventory = [];
  for (const [role, objects] of [
    ["PRODUCES", derivedAppend.producedObjects],
    ["MODIFIES", derivedAppend.modifiedObjects],
    ["DROPS", derivedAppend.droppedObjects],
  ]) {
    for (const object of objects) inventory.push({ role, ...object });
  }
  for (const match of executableBoundarySql.matchAll(/\balter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?((?:"[^"]+"|[a-z_][a-z0-9_$]*)(?:\.(?:"[^"]+"|[a-z_][a-z0-9_$]*))?)\s+enable\s+row\s+level\s+security\b/giu)) {
    inventory.push({ role: "RLS_ENABLED", kind: "table", identifier: normalizeSimpleIdentifier(match[1]) });
  }
  for (const match of executableBoundarySql.matchAll(/\balter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?((?:"[^"]+"|[a-z_][a-z0-9_$]*)(?:\.(?:"[^"]+"|[a-z_][a-z0-9_$]*))?)\s+force\s+row\s+level\s+security\b/giu)) {
    inventory.push({ role: "RLS_FORCED", kind: "table", identifier: normalizeSimpleIdentifier(match[1]) });
  }
  for (const match of executableBoundarySql.matchAll(/\b(grant|revoke)\s+execute\s+on\s+function\s+((?:"[^"]+"|[a-z_][a-z0-9_$]*)(?:\.(?:"[^"]+"|[a-z_][a-z0-9_$]*))?)\s*\(([^)]*)\)\s+(to|from)\s+([^;]+);/giu)) {
    const operation = match[1].toUpperCase();
    const direction = match[4].toUpperCase();
    if ((operation === "GRANT" && direction !== "TO") || (operation === "REVOKE" && direction !== "FROM")) continue;
    const argumentTypes = match[3].split(",").map(normalizeSqlType).filter(Boolean);
    for (const grantee of match[5].split(",").map((entry) => normalizeSimpleIdentifier(entry.trim())).filter(Boolean)) {
      inventory.push({
        role: "RPC_EXECUTE_PRIVILEGE",
        kind: "function",
        identifier: normalizeSimpleIdentifier(match[2]),
        argumentTypes,
        operation,
        grantee,
      });
    }
  }
  return [...new Map(inventory
    .map((entry) => [canonicalJson(entry), entry])).values()]
    .sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right)));
}

function expectedConceptRpcBoundaryInventory(contract) {
  const boundary = contract.c3rpAppendReceiptV1.requiredConceptRpcBoundary;
  return boundary.executePrivilegesExactly.map(({ operation, grantee }) => ({
    role: "RPC_EXECUTE_PRIVILEGE",
    kind: "function",
    identifier: boundary.functionIdentifier,
    argumentTypes: boundary.argumentTypesExactly,
    operation,
    grantee,
  })).sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right)));
}

function expectedMigrationSensitivePathClosure(contract, appendFilename) {
  return contract.c3rpAppendReceiptV1.requiredMigrationSensitivePathClosureExactly
    .map((entry) => entry.replace("<C3R_P_APPEND_FILENAME>", appendFilename));
}

export function deriveCheckpointClosureEvidence(contract, a0Manifest, sqlByFilename, repairReceipts, appendReceipt) {
  const repairsByFrom = new Map(repairReceipts.map((receipt) => [receipt.fromFilename, receipt]));
  const projectedRecords = contract.migrationRecordReconciliationsV2
    .map((plan) => ({
      currentFilename: repairsByFrom.get(plan.currentFilename)?.toFilename ?? plan.currentFilename,
      freshHistoryOrder: plan.exactProposedFreshHistoryOrder,
      presentOnLiveMain: true,
    }));
  if (appendReceipt) {
    projectedRecords.push({
      currentFilename: appendReceipt.filename,
      freshHistoryOrder: projectedRecords.length + 1,
      presentOnLiveMain: true,
    });
  }
  const derived = deriveMigrationDependencyClosure(projectedRecords, sqlByFilename, {
    environmentRequiredExtensions: a0Manifest.migrationDependencyClosureV1.environmentRequiredExtensions,
    externalDatabaseObjects: a0Manifest.externalDatabaseObjects,
    closedQualifiedDatabaseSchemas: a0Manifest.migrationDependencyClosureV1.closedQualifiedDatabaseSchemas,
    exactPredecessorOverrides: a0Manifest.migrationDependencyClosureV1.exactPredecessorOverrides,
  });
  const appendDerived = appendReceipt
    ? derived.find((entry) => entry.currentFilename === appendReceipt.filename)
    : null;
  if (appendReceipt && !appendDerived) throw new Error("APPEND_NOT_IN_DERIVED_CLOSURE");
  const schemaRpcRlsObjectInventory = appendReceipt
    ? deriveSqlBoundaryInventory(appendDerived, sqlByFilename.get(appendReceipt.filename))
    : [];
  const protectedObjects = appendReceipt
    ? deriveProtectedObjectsFromCheckpoint(projectedRecords, derived, sqlByFilename, appendDerived, contract)
    : { tables: [], functions: [] };
  const migrationFinalSecurityState = appendReceipt
    ? deriveMigrationFinalSecurityState(projectedRecords.map((record) => ({
      canonicalMigrationOrder: record.freshHistoryOrder,
      filename: record.currentFilename,
      sql: sqlByFilename.get(record.currentFilename) ?? "",
    })), protectedObjects)
    : null;
  return {
    dependencyClosureDigest: sha256(canonicalJson(derived)),
    derivedMigrationCount: derived.length,
    schemaRpcRlsObjectInventory,
    schemaRpcRlsObjectInventoryDigest: sha256(canonicalJson(schemaRpcRlsObjectInventory)),
    protectedObjects,
    migrationFinalSecurityState,
  };
}

const REPLAY_RECEIPT_DIGEST_FIELDS = Object.freeze([
  "receiptId",
  "receiptType",
  "cycle",
  "engine",
  "candidateHeadSha",
  "candidateTreeSha",
  "migrationInventoryDigest",
  "dependencyClosureDigest",
  "executedMigrationCount",
  "executionOutputDigest",
  "schemaStateDigest",
  "isolatedEnvironmentFingerprint",
  "startedAtUtc",
  "finishedAtUtc",
  "freshDatabase",
  "linkedRemote",
  "success",
  "remoteMutationCount",
  "learnerPrivateBodyCount",
]);

export function deriveReplayReceiptDigest(receipt) {
  return sha256(canonicalJson(Object.fromEntries(
    REPLAY_RECEIPT_DIGEST_FIELDS.map((field) => [field, receipt[field]]),
  )));
}

function validateReplayReceipts(receipts, binding) {
  if (!Array.isArray(receipts) || receipts.length !== 2 ||
    new Set(receipts.map((receipt) => receipt.receiptId)).size !== 2 ||
    !same(receipts.map((receipt) => receipt.cycle), [1, 2])) return false;
  return receipts.every((receipt) => {
    const started = Date.parse(receipt.startedAtUtc);
    const finished = Date.parse(receipt.finishedAtUtc);
    return receipt.receiptType === "SupabaseIsolatedMigrationReplayReceiptV1" &&
      receipt.engine === "EXACT_ISOLATED_SUPABASE_RESET_REPLAY" &&
      receipt.candidateHeadSha === binding.candidateHeadSha &&
      receipt.candidateTreeSha === binding.candidateTreeSha &&
      receipt.migrationInventoryDigest === binding.migrationInventoryDigest &&
      receipt.dependencyClosureDigest === binding.dependencyClosureDigest &&
      receipt.executedMigrationCount === binding.executedMigrationCount &&
      /^[0-9a-f]{64}$/u.test(receipt.executionOutputDigest ?? "") &&
      /^[0-9a-f]{64}$/u.test(receipt.schemaStateDigest ?? "") &&
      /^[0-9a-f]{64}$/u.test(receipt.isolatedEnvironmentFingerprint ?? "") &&
      Number.isFinite(started) && Number.isFinite(finished) && finished >= started &&
      receipt.freshDatabase === true && receipt.linkedRemote === false &&
      receipt.success === true && receipt.remoteMutationCount === 0 &&
      receipt.learnerPrivateBodyCount === 0 &&
      receipt.receiptDigest === deriveReplayReceiptDigest(receipt);
  });
}

export function validateMigrationInventoryAuthorityV2(contract, a0Manifest, sqlByFilename, receiptBundle = {}) {
  const errors = validateA2AuthorityContract(contract, a0Manifest);
  const repairs = receiptBundle.repairReceipts ?? [];
  const appends = receiptBundle.appendReceipts ?? [];
  if (appends.length > 1) errors.push("APPEND_COUNT_EXCEEDS_ONE");
  if (appends.length > 0 && !same(
    repairs.map((receipt) => receipt.fromFilename),
    contract.c3rpAppendReceiptV1.requiredRepairPlanFilesExactly,
  )) {
    errors.push("APPEND_BEFORE_EXACT_REPAIR_CHECKPOINT");
  }
  const expected = new Map(a0Manifest.records.map((record) => [record.currentFilename, record.sqlSha256]));
  const plans = new Map(contract.migrationRecordReconciliationsV2.map((record) => [record.currentFilename, record]));
  const repairIds = new Set();
  for (const receipt of repairs) {
    const plan = plans.get(receipt.fromFilename);
    if (!plan || repairIds.has(receipt.receiptId)) {
      errors.push("REPAIR_RECEIPT_IDENTITY");
      continue;
    }
    repairIds.add(receipt.receiptId);
    const preservesSource = plan.sourceTreatment === "PRESERVE";
    const personalSemanticComparison = receipt.fromFilename === "20260608_create_personal_learning_states.sql"
      ? derivePersonalLearningSemanticComparison(
        contract.personalLearningMigrationSemanticInventoryV1,
        sqlByFilename.get(receipt.toFilename) ?? "",
      )
      : null;
    const exactSpecialEvidence = receipt.fromFilename === "20260608_create_personal_learning_states.sql"
      ? receipt.implementationEvidence?.resolvedFailureCode === "42P19" &&
        same(receipt.implementationEvidence?.personalLearningSemanticComparison, personalSemanticComparison) &&
        personalSemanticComparison.equivalentBidirectionally === true &&
        personalSemanticComparison.baselineRecursiveTermCount === 2 &&
        personalSemanticComparison.repairedRecursiveTermCount === 1 &&
        personalSemanticComparison.repairedPostgresValidSingleRecursiveTerm === true &&
        personalSemanticComparison.repairedRecursiveImplementationAuthorized === true &&
        personalSemanticComparison.securityHardeningSeparatedFromBaselineEquivalence === true
      : receipt.fromFilename === "202606232130_personal_concept_graph_rpc_only_write_boundary.sql"
        ? receipt.implementationEvidence?.compatibilitySafeBeforeProducer === true && receipt.implementationEvidence?.unsafeGrantBeforeProducer === false
        : true;
    if (receipt.receiptType !== "MigrationRepairReceiptV2" || receipt.a2AuthorityId !== contract.contractId || receipt.fromSqlDigest !== expected.get(receipt.fromFilename) || receipt.sourceTreatment !== plan.sourceTreatment || receipt.filenameTreatment !== plan.filenameTreatment || receipt.toFilename !== plan.proposedCanonicalFilename || receipt.exactFreshHistoryOrder !== plan.exactProposedFreshHistoryOrder || receipt.remoteMutationAuthorized !== false || receipt.exactHeadEvidence !== true || !exactSpecialEvidence || (preservesSource && receipt.toSqlDigest !== receipt.fromSqlDigest) || (!preservesSource && receipt.toSqlDigest === receipt.fromSqlDigest)) {
      errors.push(`REPAIR_RECEIPT_${receipt.fromFilename}`);
      continue;
    }
    expected.delete(receipt.fromFilename);
    expected.set(receipt.toFilename, receipt.toSqlDigest);
  }
  const appendIds = new Set();
  const actualInventoryDigest = deriveMigrationInventoryDigest(sqlByFilename);
  for (const receipt of appends) {
    if (appendIds.has(receipt.receiptId)) {
      errors.push("APPEND_DUPLICATE_RECEIPT");
      continue;
    }
    appendIds.add(receipt.receiptId);
    const version = filenameVersion(receipt.filename);
    const priorVersions = [...expected.keys()].map(filenameVersion).filter(Boolean);
    const maxPrior = priorVersions.sort().at(-1);
    const expectedPathClosure = expectedMigrationSensitivePathClosure(contract, receipt.filename);
    if (receipt.receiptType !== "C3RPAppendReceiptV1" || receipt.a2AuthorityId !== contract.contractId || !same(receipt.purposeExactly, contract.c3rpAppendReceiptV1.requiredPurposeExactly) || !/^\d{14}_[a-z0-9_]+\.sql$/u.test(receipt.filename ?? "") || receipt.version !== version || version <= maxPrior || receipt.remoteApplicationAuthorized !== false || receipt.migrationHistoryRepairAuthorized !== false || !same(receipt.dependencyPredecessors, contract.c3rpAppendReceiptV1.requiredDependencyPredecessorsExactly) || !/^[0-9a-f]{40}$/u.test(receipt.candidateHeadSha ?? "") || !/^[0-9a-f]{40}$/u.test(receipt.candidateTreeSha ?? "") || receipt.candidateHeadTreeBinding !== sha256(`${receipt.candidateHeadSha}:${receipt.candidateTreeSha}`) || receipt.migrationInventoryDigest !== actualInventoryDigest || receipt.migrationInventoryCount !== sqlByFilename.size || !same(receipt.migrationSensitivePathClosure, expectedPathClosure) || expectedPathClosure.length === 0 || receipt.migrationSensitivePathClosureDigest !== sha256(canonicalJson(expectedPathClosure)) || !Array.isArray(receipt.schemaRpcRlsObjectInventory) || receipt.schemaRpcRlsObjectInventory.length === 0 || receipt.schemaRpcRlsObjectInventoryDigest !== sha256(canonicalJson(receipt.schemaRpcRlsObjectInventory)) || !Array.isArray(receipt.isolatedReplayReceipts) || receipt.isolatedReplayReceipts.length !== 2 || receipt.exactHeadCentralEvidence !== true || !/^[0-9a-f]{64}$/u.test(receipt.centralEvidenceArtifactSha256 ?? "") || receipt.exactHeadDedicatedRuntimeEvidence !== true || !/^[0-9a-f]{64}$/u.test(receipt.dedicatedRuntimeEvidenceArtifactSha256 ?? "")) {
      errors.push(`APPEND_RECEIPT_${receipt.receiptId ?? "UNKNOWN"}`);
      continue;
    }
    if (expected.has(receipt.filename) || [...expected.keys()].some((filename) => filenameVersion(filename) === version)) {
      errors.push(`APPEND_VERSION_${version}`);
      continue;
    }
    expected.set(receipt.filename, receipt.sqlDigest);
  }
  if (sqlByFilename.size !== expected.size) errors.push("LIVE_INVENTORY_COUNT");
  for (const [filename, expectedDigest] of expected) {
    const sql = sqlByFilename.get(filename);
    if (typeof sql !== "string") {
      errors.push(`LIVE_MISSING_${filename}`);
    } else if (digestSql(sql) !== expectedDigest) {
      errors.push(`LIVE_DIGEST_${filename}`);
    }
  }
  for (const filename of sqlByFilename.keys()) {
    if (!expected.has(filename)) errors.push(`LIVE_UNREGISTERED_${filename}`);
  }
  if (repairs.length === 0 && appends.length === 0 && errors.length === 0) {
    try {
      validateMigrationDependencyClosure(a0Manifest, sqlByFilename);
    } catch (error) {
      errors.push(`A0_HISTORICAL_REPLAY_${error.code ?? "FAILED"}`);
    }
  }
  if ((repairs.length > 0 || appends.length > 0) && errors.length === 0) {
    try {
      const append = appends[0] ?? null;
      const closureEvidence = deriveCheckpointClosureEvidence(
        contract,
        a0Manifest,
        sqlByFilename,
        repairs,
        append,
      );
      if (closureEvidence.derivedMigrationCount !== sqlByFilename.size) {
        errors.push("CHECKPOINT_DERIVED_MIGRATION_COUNT");
      }
      if (append) {
        const boundaryInventory = closureEvidence.schemaRpcRlsObjectInventory;
        if (!same(append.schemaRpcRlsObjectInventory, boundaryInventory) || append.schemaRpcRlsObjectInventoryDigest !== closureEvidence.schemaRpcRlsObjectInventoryDigest) {
          errors.push("APPEND_SCHEMA_RPC_RLS_INVENTORY");
        }
        if (!same(append.migrationFinalSecurityState, closureEvidence.migrationFinalSecurityState)) {
          errors.push("APPEND_FINAL_SECURITY_STATE_RECEIPT");
        }
        for (const error of validateMigrationFinalSecurityState(closureEvidence.migrationFinalSecurityState)) {
          errors.push(error);
        }
        const producedTables = boundaryInventory
          .filter((entry) => entry.role === "PRODUCES" && entry.kind === "table")
          .map((entry) => entry.identifier);
        const rlsEnabled = new Set(boundaryInventory
          .filter((entry) => entry.role === "RLS_ENABLED" && entry.kind === "table")
          .map((entry) => entry.identifier));
        const rlsForced = new Set(boundaryInventory
          .filter((entry) => entry.role === "RLS_FORCED" && entry.kind === "table")
          .map((entry) => entry.identifier));
        if (producedTables.length === 0 || producedTables.some((identifier) => !rlsEnabled.has(identifier) || !rlsForced.has(identifier))) {
          errors.push("APPEND_FORCED_RLS_BOUNDARY");
        }
        const expectedRpcBoundary = expectedConceptRpcBoundaryInventory(contract);
        const actualRpcBoundary = boundaryInventory.filter((entry) =>
          entry.role === "RPC_EXECUTE_PRIVILEGE" &&
          entry.identifier === contract.c3rpAppendReceiptV1.requiredConceptRpcBoundary.functionIdentifier,
        );
        if (!same(actualRpcBoundary, expectedRpcBoundary)) {
          errors.push("APPEND_EXACT_CONCEPT_RPC_BOUNDARY");
        }
        if (append.dependencyClosureDigest !== closureEvidence.dependencyClosureDigest) {
          errors.push("APPEND_DEPENDENCY_CLOSURE_DIGEST");
        }
        if (!validateReplayReceipts(append.isolatedReplayReceipts, {
          candidateHeadSha: append.candidateHeadSha,
          candidateTreeSha: append.candidateTreeSha,
          migrationInventoryDigest: actualInventoryDigest,
          dependencyClosureDigest: closureEvidence.dependencyClosureDigest,
          executedMigrationCount: sqlByFilename.size,
        })) {
          errors.push("APPEND_REPLAY_RECEIPTS");
        }
      }
      const learningReceipt = repairs.find((receipt) => receipt.fromFilename === "20260608_create_personal_learning_states.sql");
      if (learningReceipt) {
        const repairedSql = sqlByFilename.get(learningReceipt.toFilename) ?? "";
        const comparison = derivePersonalLearningSemanticComparison(contract.personalLearningMigrationSemanticInventoryV1, repairedSql);
        if (!same(learningReceipt.implementationEvidence?.personalLearningSemanticComparison, comparison)) errors.push("CHECKPOINT_PERSONAL_SEMANTIC_RECEIPT");
        if (!comparison.equivalentBidirectionally || comparison.repairedRecursiveTermCount !== 1 || !comparison.repairedPostgresValidSingleRecursiveTerm) errors.push("CHECKPOINT_42P19_RECURSIVE_STRUCTURE");
      }
    } catch (error) {
      errors.push(`CHECKPOINT_DEPENDENCY_CLOSURE_${error.code ?? error.message ?? "FAILED"}`);
    }
  }
  return errors;
}

export async function loadCurrentInventory(repositoryRoot) {
  return loadLiveMigrationSql(`${repositoryRoot}/supabase/migrations`);
}
