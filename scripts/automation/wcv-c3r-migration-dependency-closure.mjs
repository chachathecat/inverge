import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export class MigrationDependencyClosureError extends Error {
  constructor(code, detail) {
    super(`${code}: ${detail}`);
    this.name = "MigrationDependencyClosureError";
    this.code = code;
  }
}

const IDENTIFIER_SOURCE = String.raw`(?:"(?:[^"]|"")*"|[A-Za-z_][A-Za-z0-9_$]*)`;

export const EXTENSION_REGISTRY_V1 = Object.freeze([
  Object.freeze({
    canonicalName: "pgcrypto",
    prohibitedAliases: Object.freeze([]),
    useDetectors: Object.freeze([
      Object.freeze({
        kind: "function",
        identifier: "gen_random_uuid",
        schema: null,
        pattern: String.raw`(?<![A-Za-z0-9_.$"])gen_random_uuid\s*\(`,
      }),
      Object.freeze({
        kind: "function",
        identifier: "digest",
        schema: null,
        pattern: String.raw`\bdigest\s*\(`,
        requireUnqualified: true,
      }),
      Object.freeze({
        kind: "function",
        identifier: "extensions.digest",
        schema: "extensions",
        pattern: String.raw`\bextensions\s*\.\s*digest\s*\(`,
      }),
    ]),
  }),
  Object.freeze({
    canonicalName: "vector",
    prohibitedAliases: Object.freeze(["pgvector"]),
    useDetectors: Object.freeze([
      Object.freeze({
        kind: "type",
        identifier: "vector",
        schema: null,
        pattern: String.raw`(?<![A-Za-z0-9_.$"])vector\s*\(\s*\d+\s*\)`,
      }),
    ]),
  }),
]);

export const EXTERNAL_FUNCTION_REGISTRY_V1 = Object.freeze([
  Object.freeze({ schema: "auth", name: "uid", manifestRequired: true }),
  Object.freeze({
    schema: "storage",
    name: "allow_any_operation",
    manifestRequired: true,
  }),
  Object.freeze({
    schema: "storage",
    name: "allow_only_operation",
    manifestRequired: true,
  }),
  ...[
    "current_setting",
    "hashtextextended",
    "jsonb_set",
    "pg_advisory_xact_lock",
    "set_config",
    "to_jsonb",
  ].map((name) =>
    Object.freeze({
      schema: "pg_catalog",
      name,
      manifestRequired: false,
    }),
  ),
]);

export const CLOSED_QUALIFIED_DATABASE_SCHEMAS_V1 = Object.freeze([
  "auth",
  "extensions",
  "pg_catalog",
  "public",
  "storage",
]);

export const EXACT_PREDECESSOR_OVERRIDES_V1 = Object.freeze([
  Object.freeze({
    currentFilename:
      "20260730065744_s236p_owner_private_authenticated_download_info.sql",
    policyIdentity: "storage.objects::s236p owner private select",
  }),
  Object.freeze({
    currentFilename: "20260730151052_s236p_owner_private_expiry_read_gate.sql",
    policyIdentity: "storage.objects::s236p owner private select",
  }),
]);

function sha256(value) {
  const canonicalUtf8Lf = value.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
  return createHash("sha256").update(canonicalUtf8Lf, "utf8").digest("hex");
}

function maskRange(output, source, start, end) {
  for (let index = start; index < end; index += 1) {
    output[index] = source[index] === "\n" || source[index] === "\r" ? source[index] : " ";
  }
}

function dollarQuoteDelimiterAt(sql, index) {
  if (sql[index] !== "$") return null;
  const match = sql.slice(index).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);
  return match?.[0] ?? null;
}

export function maskSqlNonExecutableText(sql, { maskDollarQuotedBodies = true } = {}) {
  const output = [...sql];
  let index = 0;

  while (index < sql.length) {
    if (sql.startsWith("--", index)) {
      const end = sql.indexOf("\n", index + 2);
      const boundary = end === -1 ? sql.length : end;
      maskRange(output, sql, index, boundary);
      index = boundary;
      continue;
    }

    if (sql.startsWith("/*", index)) {
      const start = index;
      let depth = 1;
      index += 2;
      while (index < sql.length && depth > 0) {
        if (sql.startsWith("/*", index)) {
          depth += 1;
          index += 2;
        } else if (sql.startsWith("*/", index)) {
          depth -= 1;
          index += 2;
        } else {
          index += 1;
        }
      }
      if (depth !== 0) {
        throw new MigrationDependencyClosureError(
          "UNTERMINATED_BLOCK_COMMENT",
          `offset ${start}`,
        );
      }
      maskRange(output, sql, start, index);
      continue;
    }

    if (sql[index] === '"') {
      const start = index;
      index += 1;
      let closed = false;
      while (index < sql.length) {
        if (sql[index] === '"' && sql[index + 1] === '"') {
          index += 2;
        } else if (sql[index] === '"') {
          index += 1;
          closed = true;
          break;
        } else {
          index += 1;
        }
      }
      if (!closed) {
        throw new MigrationDependencyClosureError(
          "UNTERMINATED_QUOTED_IDENTIFIER",
          `offset ${start}`,
        );
      }
      continue;
    }

    if (sql[index] === "'") {
      const start = index;
      const escapeString =
        /[eE]/u.test(sql[index - 1] ?? "") &&
        !/[A-Za-z0-9_$]/u.test(sql[index - 2] ?? "");
      index += 1;
      let closed = false;
      while (index < sql.length) {
        if (sql[index] === "'" && sql[index + 1] === "'") {
          index += 2;
        } else if (sql[index] === "'") {
          index += 1;
          closed = true;
          break;
        } else if (
          escapeString &&
          sql[index] === "\\" &&
          sql[index + 1] !== undefined
        ) {
          index += 2;
        } else {
          index += 1;
        }
      }
      if (!closed) {
        throw new MigrationDependencyClosureError(
          "UNTERMINATED_STRING_LITERAL",
          `offset ${start}`,
        );
      }
      maskRange(output, sql, start, index);
      continue;
    }

    const delimiter = dollarQuoteDelimiterAt(sql, index);
    if (delimiter) {
      const start = index;
      const bodyStart = index + delimiter.length;
      const bodyEnd = sql.indexOf(delimiter, bodyStart);
      if (bodyEnd === -1) {
        throw new MigrationDependencyClosureError(
          "UNTERMINATED_DOLLAR_QUOTE",
          `offset ${start}`,
        );
      }
      index = bodyEnd + delimiter.length;
      if (maskDollarQuotedBodies) {
        maskRange(output, sql, start, index);
      } else {
        maskRange(output, sql, start, bodyStart);
        const maskedBody = maskSqlNonExecutableText(sql.slice(bodyStart, bodyEnd), {
          maskDollarQuotedBodies: true,
        });
        for (let bodyIndex = 0; bodyIndex < maskedBody.length; bodyIndex += 1) {
          output[bodyStart + bodyIndex] = maskedBody[bodyIndex];
        }
        maskRange(output, sql, bodyEnd, index);
      }
      continue;
    }

    index += 1;
  }

  return output.join("");
}

function normalizeIdentifier(identifier) {
  if (identifier.startsWith('"')) {
    return identifier.slice(1, -1).replaceAll('""', '"');
  }
  return identifier.toLowerCase();
}

function extensionRegistryEntry(name) {
  const normalized = name.toLowerCase();
  for (const extension of EXTENSION_REGISTRY_V1) {
    if (extension.prohibitedAliases.includes(normalized)) {
      throw new MigrationDependencyClosureError(
        "PROHIBITED_EXTENSION_ALIAS",
        `${name}; use ${extension.canonicalName}`,
      );
    }
    if (extension.canonicalName === name) return extension;
  }
  throw new MigrationDependencyClosureError("UNREGISTERED_EXTENSION", name);
}

export function extractCreateExtensions(sql) {
  const executable = maskSqlNonExecutableText(sql, { maskDollarQuotedBodies: true });
  const startPattern = /\bcreate\s+extension\b/giu;
  const declarations = [];

  for (const match of executable.matchAll(startPattern)) {
    const start = match.index;
    const terminator = executable.indexOf(";", start);
    if (terminator === -1) {
      throw new MigrationDependencyClosureError(
        "UNTERMINATED_CREATE_EXTENSION",
        `offset ${start}`,
      );
    }
    const end = terminator + 1;
    const normalizedStatement = executable.slice(start, end);
    const parser = new RegExp(
      String.raw`^create\s+extension\s+(if\s+not\s+exists\s+)?(${IDENTIFIER_SOURCE})(?:\s+(?:with\s+)?schema\s+(${IDENTIFIER_SOURCE}))?\s*;$`,
      "iu",
    );
    const parsed = normalizedStatement.match(parser);
    if (!parsed) {
      throw new MigrationDependencyClosureError(
        "UNRECOGNIZED_CREATE_EXTENSION",
        sql.slice(start, end).trim(),
      );
    }

    const name = normalizeIdentifier(parsed[2]);
    extensionRegistryEntry(name);
    const schema = parsed[3] === undefined ? null : normalizeIdentifier(parsed[3]);
    const exactStatement = sql.slice(start, end).trim();
    declarations.push({
      name,
      schema,
      schemaSource: schema === null ? "SQL_UNSPECIFIED" : "SQL_EXPLICIT",
      ifNotExists: parsed[1] !== undefined,
      statementOrdinal: declarations.length + 1,
      statementSha256: sha256(exactStatement),
    });
  }

  return declarations;
}

function countMatches(sql, pattern) {
  return [...sql.matchAll(new RegExp(pattern, "giu"))].length;
}

function countDetectorMatches(sql, detector) {
  const matches = [...sql.matchAll(new RegExp(detector.pattern, "giu"))];
  if (!detector.requireUnqualified) return matches.length;
  return matches.filter((match) => {
    const prefix = sql.slice(0, match.index).trimEnd();
    return !prefix.endsWith(".");
  }).length;
}

export function deriveRequiredExtensionUses(sql) {
  const dependencySql = maskSqlNonExecutableText(sql, {
    maskDollarQuotedBodies: false,
  });
  const uses = [];

  for (const extension of EXTENSION_REGISTRY_V1) {
    const grouped = new Map();
    for (const detector of extension.useDetectors) {
      const occurrences = countDetectorMatches(dependencySql, detector);
      if (occurrences === 0) continue;
      const key = detector.schema ?? "<unqualified>";
      const current = grouped.get(key) ?? {
        name: extension.canonicalName,
        schema: detector.schema,
        evidence: [],
      };
      current.evidence.push({
        kind: detector.kind,
        identifier: detector.identifier,
        occurrences,
      });
      grouped.set(key, current);
    }
    uses.push(...grouped.values());
  }

  return uses;
}

export function deriveExternalFunctionDependencies(sql) {
  const dependencySql = maskSqlNonExecutableText(sql, {
    maskDollarQuotedBodies: false,
  });
  const dependencies = [];

  for (const entry of EXTERNAL_FUNCTION_REGISTRY_V1) {
    const pattern = String.raw`\b${entry.schema}\s*\.\s*${entry.name}\s*\(`;
    const occurrences = countMatches(dependencySql, pattern);
    if (occurrences > 0) {
      dependencies.push({
        identifier: `${entry.schema}.${entry.name}`,
        registry: entry.schema === "pg_catalog" ? "POSTGRES_BUILTIN" : "MANIFEST_OBJECT",
        manifestRequired: entry.manifestRequired,
        occurrences,
      });
    }
  }

  const schemaCallPattern = new RegExp(
    String.raw`\b(${IDENTIFIER_SOURCE})\s*\.\s*(${IDENTIFIER_SOURCE})\s*\(`,
    "giu",
  );
  for (const match of dependencySql.matchAll(schemaCallPattern)) {
    const schema = normalizeIdentifier(match[1]);
    const name = normalizeIdentifier(match[2]);
    if (schema === "public") continue;
    if (schema === "extensions" && name === "digest") continue;
    if (
      EXTERNAL_FUNCTION_REGISTRY_V1.some(
        (entry) => entry.schema === schema && entry.name === name,
      )
    ) {
      continue;
    }
    if (
      (schema === "auth" && name === "users") ||
      (schema === "storage" && ["buckets", "objects"].includes(name))
    ) {
      continue;
    }
    throw new MigrationDependencyClosureError(
      "UNREGISTERED_EXTERNAL_FUNCTION",
      `${schema}.${name}`,
    );
  }

  return dependencies;
}

function objectFromMatch(kind, identifier, index) {
  const parts = identifier.split(".").map(normalizeIdentifier);
  if (parts.length !== 2) {
    throw new MigrationDependencyClosureError(
      "UNQUALIFIED_PRODUCED_OBJECT",
      identifier,
    );
  }
  return { index, kind, identifier: parts.join(".") };
}

export function deriveProducedDatabaseObjects(sql) {
  const executable = maskSqlNonExecutableText(sql, { maskDollarQuotedBodies: true });
  const qualifiedIdentifier = String.raw`${IDENTIFIER_SOURCE}\s*\.\s*${IDENTIFIER_SOURCE}`;
  const patterns = [
    ["table", new RegExp(String.raw`\bcreate\s+table\s+(?:if\s+not\s+exists\s+)?(${qualifiedIdentifier})`, "giu")],
    ["view", new RegExp(String.raw`\bcreate\s+(?:or\s+replace\s+)?(?:materialized\s+)?view\s+(${qualifiedIdentifier})`, "giu")],
    ["sequence", new RegExp(String.raw`\bcreate\s+sequence\s+(?:if\s+not\s+exists\s+)?(${qualifiedIdentifier})`, "giu")],
    ["type", new RegExp(String.raw`\bcreate\s+type\s+(${qualifiedIdentifier})`, "giu")],
    ["function", new RegExp(String.raw`\bcreate\s+(?:or\s+replace\s+)?function\s+(${qualifiedIdentifier})`, "giu")],
  ];
  const found = [];

  for (const [kind, pattern] of patterns) {
    for (const match of executable.matchAll(pattern)) {
      found.push(objectFromMatch(kind, match[1].replaceAll(/\s+/gu, ""), match.index));
    }
  }

  return found
    .sort((left, right) => left.index - right.index)
    .map(({ kind, identifier }) => ({ kind, identifier }))
    .filter(
      (object, index, all) =>
        all.findIndex(
          (candidate) =>
            candidate.kind === object.kind && candidate.identifier === object.identifier,
        ) === index,
    );
}

function canonicalObjects(objects) {
  return [...objects]
    .map(({ kind, identifier }) => ({ kind, identifier }))
    .filter(
      (object, index, all) =>
        all.findIndex(
          (candidate) =>
            candidate.kind === object.kind && candidate.identifier === object.identifier,
        ) === index,
    )
    .sort((left, right) =>
      `${left.kind}:${left.identifier}`.localeCompare(`${right.kind}:${right.identifier}`),
    );
}

function exactEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function evidenceSqlForObject(sql, identifier) {
  const dependencySql = maskSqlNonExecutableText(sql, {
    maskDollarQuotedBodies: false,
  });
  const [schema, name, ...rest] = identifier.split(".");
  if (!schema || !name || rest.length > 0) {
    throw new MigrationDependencyClosureError(
      "INVALID_DATABASE_OBJECT_IDENTIFIER",
      identifier,
    );
  }
  const escapePattern = (value) => value.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(
    String.raw`(?<![A-Za-z0-9_$"])${escapePattern(schema)}\s*\.\s*${escapePattern(name)}(?![A-Za-z0-9_$"])`,
    "iu",
  ).test(dependencySql);
}

export function deriveDatabaseObjectReferences(sql, availableObjects) {
  return canonicalObjects(
    availableObjects.filter((object) => evidenceSqlForObject(sql, object.identifier)),
  );
}

function deriveQualifiedIndexOperationIdentifiers(sql) {
  const executable = maskSqlNonExecutableText(sql, {
    maskDollarQuotedBodies: true,
  });
  const qualifiedIdentifier = String.raw`${IDENTIFIER_SOURCE}\s*\.\s*${IDENTIFIER_SOURCE}`;
  const patterns = [
    new RegExp(
      String.raw`\bcreate\s+(?:unique\s+)?index\s+(?:concurrently\s+)?(?:if\s+not\s+exists\s+)?(${qualifiedIdentifier})`,
      "giu",
    ),
    new RegExp(
      String.raw`\bdrop\s+index\s+(?:concurrently\s+)?(?:if\s+exists\s+)?(${qualifiedIdentifier})`,
      "giu",
    ),
  ];
  return new Set(
    patterns.flatMap((pattern) =>
      [...executable.matchAll(pattern)].map((match) =>
        match[1]
          .split(".")
          .map((part) => normalizeIdentifier(part.trim()))
          .join("."),
      ),
    ),
  );
}

export function deriveQualifiedDatabaseIdentifiers(
  sql,
  closedQualifiedDatabaseSchemas,
) {
  const dependencySql = maskSqlNonExecutableText(sql, {
    maskDollarQuotedBodies: false,
  });
  const closedSchemas = new Set(closedQualifiedDatabaseSchemas);
  const qualifiedPattern = new RegExp(
    String.raw`\b(${IDENTIFIER_SOURCE})\s*\.\s*(${IDENTIFIER_SOURCE})`,
    "giu",
  );
  const identifiers = [];
  for (const match of dependencySql.matchAll(qualifiedPattern)) {
    const schema = normalizeIdentifier(match[1]);
    if (!closedSchemas.has(schema)) continue;
    identifiers.push(`${schema}.${normalizeIdentifier(match[2])}`);
  }
  return [...new Set(identifiers)].sort();
}

function assertRegisteredQualifiedDatabaseIdentifiers(
  sql,
  registeredObjects,
  closedQualifiedDatabaseSchemas,
) {
  const registeredIdentifiers = new Set(
    registeredObjects.map((object) => object.identifier),
  );
  for (const entry of EXTERNAL_FUNCTION_REGISTRY_V1) {
    registeredIdentifiers.add(`${entry.schema}.${entry.name}`);
  }
  for (const extension of EXTENSION_REGISTRY_V1) {
    for (const detector of extension.useDetectors) {
      if (detector.schema) registeredIdentifiers.add(detector.identifier);
    }
  }
  const indexStatementTargets = deriveQualifiedIndexOperationIdentifiers(sql);
  for (const identifier of deriveQualifiedDatabaseIdentifiers(
    sql,
    closedQualifiedDatabaseSchemas,
  )) {
    if (
      !registeredIdentifiers.has(identifier) &&
      !indexStatementTargets.has(identifier)
    ) {
      throw new MigrationDependencyClosureError(
        "UNREGISTERED_QUALIFIED_DATABASE_OBJECT",
        identifier,
      );
    }
  }
}

function indexEnvironmentExtensions(environmentRequiredExtensions) {
  const indexed = new Map();
  const registeredNames = new Set(
    EXTENSION_REGISTRY_V1.map((extension) => extension.canonicalName),
  );

  for (const extension of environmentRequiredExtensions) {
    const keys = Object.keys(extension).sort();
    if (!exactEqual(keys, ["name", "schema"])) {
      throw new MigrationDependencyClosureError(
        "INVALID_ENVIRONMENT_EXTENSION",
        JSON.stringify(extension),
      );
    }
    if (
      !registeredNames.has(extension.name) ||
      !(extension.schema === null || typeof extension.schema === "string")
    ) {
      throw new MigrationDependencyClosureError(
        "UNREGISTERED_ENVIRONMENT_EXTENSION",
        `${extension.name}:${extension.schema ?? "unspecified"}`,
      );
    }
    const key = `${extension.name}:${extension.schema ?? ""}`;
    if (indexed.has(key)) {
      throw new MigrationDependencyClosureError(
        "DUPLICATE_ENVIRONMENT_EXTENSION",
        key,
      );
    }
    indexed.set(key, extension);
  }

  return indexed;
}

function indexExactPredecessorOverrides(
  exactPredecessorOverrides,
  records,
  sqlByFilename,
) {
  const indexed = new Map();
  const byFilename = new Map(
    records.map((record) => [record.currentFilename, record]),
  );

  for (const override of exactPredecessorOverrides) {
    const keys = Object.keys(override).sort();
    if (
      !exactEqual(keys, ["currentFilename", "policyIdentity"]) ||
      indexed.has(override.currentFilename)
    ) {
      throw new MigrationDependencyClosureError(
        "INVALID_EXACT_PREDECESSOR_OVERRIDE",
        override.currentFilename,
      );
    }
    const target = byFilename.get(override.currentFilename);
    const sql = sqlByFilename.get(override.currentFilename);
    if (!target || typeof sql !== "string") {
      throw new MigrationDependencyClosureError(
        "INVALID_EXACT_PREDECESSOR_OVERRIDE_TARGET",
        override.currentFilename,
      );
    }
    const policyOperations = derivePolicyOperationIdentities(sql);
    if (!policyOperations.includes(override.policyIdentity)) {
      throw new MigrationDependencyClosureError(
        "EXACT_PREDECESSOR_OVERRIDE_WITHOUT_SQL_EVIDENCE",
        override.currentFilename,
      );
    }
    indexed.set(override.currentFilename, override);
  }

  return indexed;
}

export function derivePolicyOperationIdentities(sql) {
  const executable = maskSqlNonExecutableText(sql, {
    maskDollarQuotedBodies: true,
  });
  const qualifiedIdentifier = String.raw`${IDENTIFIER_SOURCE}\s*\.\s*${IDENTIFIER_SOURCE}`;
  const pattern = new RegExp(
    String.raw`\b(?:create|alter|drop)\s+policy\s+(?:if\s+exists\s+)?(${IDENTIFIER_SOURCE})\s+on\s+(${qualifiedIdentifier})`,
    "giu",
  );
  return [
    ...new Set(
      [...executable.matchAll(pattern)].map((match) => {
        const policyName = normalizeIdentifier(match[1]);
        const tableIdentifier = match[2]
          .split(".")
          .map((part) => normalizeIdentifier(part.trim()))
          .join(".");
        return `${tableIdentifier}::${policyName}`;
      }),
    ),
  ];
}

export function deriveMigrationDependencyClosure(
  records,
  sqlByFilename,
  {
    environmentRequiredExtensions = [],
    externalDatabaseObjects = [],
    closedQualifiedDatabaseSchemas = CLOSED_QUALIFIED_DATABASE_SCHEMAS_V1,
    exactPredecessorOverrides = [],
  } = {},
) {
  const priorProducers = new Map();
  const environmentExtensions = indexEnvironmentExtensions(
    environmentRequiredExtensions,
  );
  const availableObjects = new Map(
    externalDatabaseObjects.map((object) => [
      `${object.kind}:${object.identifier}`,
      object,
    ]),
  );
  const objectOrigins = new Map(
    externalDatabaseObjects.map((object) => [
      `${object.kind}:${object.identifier}`,
      new Set(),
    ]),
  );
  const recordOrder = new Map(
    records.map((record) => [record.currentFilename, record.freshHistoryOrder]),
  );
  const predecessorOverrides = indexExactPredecessorOverrides(
    exactPredecessorOverrides,
    records,
    sqlByFilename,
  );
  const latestPolicyProducers = new Map();
  const results = [];

  for (const record of [...records].sort((left, right) => left.freshHistoryOrder - right.freshHistoryOrder)) {
    if (!record.presentOnLiveMain) continue;
    const sql = sqlByFilename.get(record.currentFilename);
    if (typeof sql !== "string") {
      throw new MigrationDependencyClosureError(
        "MISSING_MIGRATION_SQL",
        record.currentFilename,
      );
    }

    const createdExtensions = extractCreateExtensions(sql);
    const rawRequiredExtensions = deriveRequiredExtensionUses(sql);
    const requiredExtensions = rawRequiredExtensions.map((requirement) => {
      const current = [...createdExtensions]
        .reverse()
        .find(
          (candidate) =>
            candidate.name === requirement.name &&
            (requirement.schema === null || candidate.schema === requirement.schema),
        );
      const prior = [...(priorProducers.get(requirement.name) ?? [])]
        .reverse()
        .find(
          (candidate) =>
            requirement.schema === null || candidate.schema === requirement.schema,
        );
      const producer = current
        ? { ...current, currentFilename: record.currentFilename, freshHistoryOrder: record.freshHistoryOrder }
        : prior;
      const environment =
        environmentExtensions.get(`${requirement.name}:${requirement.schema ?? ""}`) ??
        (requirement.schema === null
          ? [...environmentExtensions.values()].find(
              (candidate) => candidate.name === requirement.name,
            )
          : undefined);
      if (!producer && !environment) {
        throw new MigrationDependencyClosureError(
          "UNRESOLVED_EXTENSION_USE",
          `${record.currentFilename}:${requirement.name}:${requirement.schema ?? "unqualified"}`,
        );
      }
      return {
        ...requirement,
        satisfaction:
          !producer
            ? "ENVIRONMENT"
            : producer.currentFilename === record.currentFilename
            ? "CURRENT_MIGRATION_CREATE"
            : "PREDECESSOR_MIGRATION",
        producerMigration: producer?.currentFilename ?? null,
        producerFreshHistoryOrder: producer?.freshHistoryOrder ?? null,
      };
    });

    const externalFunctions = deriveExternalFunctionDependencies(sql);
    const producedObjects = deriveProducedDatabaseObjects(sql);
    assertRegisteredQualifiedDatabaseIdentifiers(
      sql,
      [...availableObjects.values(), ...producedObjects],
      closedQualifiedDatabaseSchemas,
    );
    const referencedDatabaseObjects = deriveDatabaseObjectReferences(
      sql,
      [...availableObjects.values()],
    );
    const derivedPredecessorSet = new Set();
    for (const object of referencedDatabaseObjects) {
      for (const origin of
        objectOrigins.get(`${object.kind}:${object.identifier}`) ?? []) {
        derivedPredecessorSet.add(origin);
      }
    }
    const policyOperations = derivePolicyOperationIdentities(sql);
    const override = predecessorOverrides.get(record.currentFilename);
    if (override) {
      const previousPolicyProducer = latestPolicyProducers.get(
        override.policyIdentity,
      );
      if (!previousPolicyProducer) {
        throw new MigrationDependencyClosureError(
          "EXACT_PREDECESSOR_OVERRIDE_WITHOUT_PRIOR_POLICY_SQL",
          override.currentFilename,
        );
      }
      derivedPredecessorSet.clear();
      for (const object of referencedDatabaseObjects) {
        const origins = [
          ...(objectOrigins.get(`${object.kind}:${object.identifier}`) ?? []),
        ];
        const latestOrigin = origins.sort(
          (left, right) => recordOrder.get(right) - recordOrder.get(left),
        )[0];
        if (latestOrigin) derivedPredecessorSet.add(latestOrigin);
      }
      derivedPredecessorSet.add(previousPolicyProducer);
    }
    const exactDependencyPredecessors = [...derivedPredecessorSet].sort(
      (left, right) => recordOrder.get(left) - recordOrder.get(right),
    );
    results.push({
      currentFilename: record.currentFilename,
      sqlSha256: sha256(sql),
      createdExtensions,
      requiredExtensions,
      extensionDependencyPredecessors: [
        ...new Set(
          requiredExtensions
            .filter((entry) => entry.satisfaction === "PREDECESSOR_MIGRATION")
            .map((entry) => entry.producerMigration),
        ),
      ],
      externalFunctions,
      producedObjects,
      referencedDatabaseObjects,
      exactDependencyPredecessors,
    });

    for (const extension of createdExtensions) {
      const list = priorProducers.get(extension.name) ?? [];
      list.push({
        ...extension,
        currentFilename: record.currentFilename,
        freshHistoryOrder: record.freshHistoryOrder,
      });
      priorProducers.set(extension.name, list);
    }
    for (const object of record.drops ?? []) {
      const key = `${object.kind}:${object.identifier}`;
      availableObjects.delete(key);
      objectOrigins.delete(key);
    }
    for (const object of producedObjects) {
      const key = `${object.kind}:${object.identifier}`;
      availableObjects.set(key, object);
      objectOrigins.set(key, new Set([record.currentFilename]));
    }
    for (const object of record.modifies ?? []) {
      const key = `${object.kind}:${object.identifier}`;
      const origins = objectOrigins.get(key) ?? new Set();
      origins.add(record.currentFilename);
      objectOrigins.set(key, origins);
    }
    for (const policyIdentity of policyOperations) {
      latestPolicyProducers.set(policyIdentity, record.currentFilename);
    }
  }

  return results;
}

export function validateMigrationDependencyClosure(manifest, sqlByFilename) {
  if (
    !exactEqual(
      manifest.migrationDependencyClosureV1.closedQualifiedDatabaseSchemas,
      CLOSED_QUALIFIED_DATABASE_SCHEMAS_V1,
    )
  ) {
    throw new MigrationDependencyClosureError(
      "INVALID_CLOSED_QUALIFIED_DATABASE_SCHEMA_REGISTRY",
      JSON.stringify(
        manifest.migrationDependencyClosureV1.closedQualifiedDatabaseSchemas,
      ),
    );
  }
  if (
    !exactEqual(
      manifest.migrationDependencyClosureV1.exactPredecessorOverrides,
      EXACT_PREDECESSOR_OVERRIDES_V1,
    )
  ) {
    throw new MigrationDependencyClosureError(
      "INVALID_EXACT_PREDECESSOR_OVERRIDE_REGISTRY",
      JSON.stringify(manifest.migrationDependencyClosureV1.exactPredecessorOverrides),
    );
  }
  const liveRecords = manifest.records.filter((record) => record.presentOnLiveMain);
  const derived = deriveMigrationDependencyClosure(liveRecords, sqlByFilename, {
    environmentRequiredExtensions:
      manifest.migrationDependencyClosureV1.environmentRequiredExtensions,
    externalDatabaseObjects: manifest.externalDatabaseObjects,
    closedQualifiedDatabaseSchemas:
      manifest.migrationDependencyClosureV1.closedQualifiedDatabaseSchemas,
    exactPredecessorOverrides:
      manifest.migrationDependencyClosureV1.exactPredecessorOverrides,
  });
  const byFilename = new Map(derived.map((entry) => [entry.currentFilename, entry]));
  const externalRegistry = new Set(
    manifest.externalDatabaseObjects.map((object) => `${object.kind}:${object.identifier}`),
  );

  for (const record of liveRecords) {
    const actual = byFilename.get(record.currentFilename);
    const comparisons = [
      ["sqlSha256", record.sqlSha256, actual.sqlSha256],
      ["createdExtensions", record.createdExtensions, actual.createdExtensions],
      ["requiredExtensions", record.requiredExtensions, actual.requiredExtensions],
      [
        "extensionDependencyPredecessors",
        record.extensionDependencyPredecessors,
        actual.extensionDependencyPredecessors,
      ],
      [
        "exactDependencyPredecessors",
        record.exactDependencyPredecessors,
        actual.exactDependencyPredecessors,
      ],
    ];
    for (const [field, declared, sqlDerived] of comparisons) {
      if (!exactEqual(declared, sqlDerived)) {
        throw new MigrationDependencyClosureError(
          "MANIFEST_SQL_MISMATCH",
          `${record.currentFilename}:${field}`,
        );
      }
    }

    if (
      !exactEqual(
        canonicalObjects(record.produces),
        canonicalObjects(actual.producedObjects),
      )
    ) {
      throw new MigrationDependencyClosureError(
        "PRODUCED_OBJECT_SQL_MISMATCH",
        record.currentFilename,
      );
    }

    const declaredExternalFunctions = record.consumes
      .filter((object) => object.kind === "function" && /^(?:auth|storage)\./u.test(object.identifier))
      .map((object) => object.identifier)
      .sort();
    const sqlExternalFunctions = actual.externalFunctions
      .filter((entry) => entry.manifestRequired)
      .map((entry) => entry.identifier)
      .sort();
    if (!exactEqual(declaredExternalFunctions, sqlExternalFunctions)) {
      throw new MigrationDependencyClosureError(
        "EXTERNAL_FUNCTION_SQL_MISMATCH",
        record.currentFilename,
      );
    }

    const declaredDatabaseObjectReferences = canonicalObjects([
      ...record.consumes,
      ...(record.modifies ?? []),
      ...(record.drops ?? []),
    ]);
    if (
      !exactEqual(
        declaredDatabaseObjectReferences,
        actual.referencedDatabaseObjects,
      )
    ) {
      throw new MigrationDependencyClosureError(
        "DATABASE_OBJECT_SQL_MISMATCH",
        record.currentFilename,
      );
    }

    for (const field of ["consumes", "produces", "modifies", "drops"]) {
      for (const object of record[field] ?? []) {
        const registryKey = `${object.kind}:${object.identifier}`;
        if (
          !evidenceSqlForObject(sqlByFilename.get(record.currentFilename), object.identifier) &&
          !externalRegistry.has(registryKey)
        ) {
          throw new MigrationDependencyClosureError(
            "DECLARED_OBJECT_WITHOUT_EVIDENCE",
            `${record.currentFilename}:${field}:${object.identifier}`,
          );
        }
      }
    }
  }

  const availableObjects = new Map();
  for (const record of [...manifest.records].sort(
    (left, right) => left.freshHistoryOrder - right.freshHistoryOrder,
  )) {
    for (const object of record.consumes) {
      const key = `${object.kind}:${object.identifier}`;
      if (externalRegistry.has(key)) continue;
      const producer = availableObjects.get(key);
      if (!producer) {
        throw new MigrationDependencyClosureError(
          "UNRESOLVED_DATABASE_OBJECT",
          `${record.currentFilename}:${key}`,
        );
      }
      if (producer.freshHistoryOrder >= record.freshHistoryOrder) {
        throw new MigrationDependencyClosureError(
          "DATABASE_OBJECT_ORDER_INVERSION",
          `${producer.currentFilename}:${record.currentFilename}:${key}`,
        );
      }
    }
    for (const object of record.drops ?? []) {
      availableObjects.delete(`${object.kind}:${object.identifier}`);
    }
    for (const object of record.produces) {
      availableObjects.set(`${object.kind}:${object.identifier}`, record);
    }
  }

  return {
    manifestVersion: manifest.migrationDependencyClosureV1.manifestVersion,
    liveMigrationCount: derived.length,
    executableCreateExtensionStatementCount: derived.reduce(
      (total, entry) => total + entry.createdExtensions.length,
      0,
    ),
    createdExtensionNames: [
      ...new Set(derived.flatMap((entry) => entry.createdExtensions.map((item) => item.name))),
    ].sort(),
    sqlDerivedExternalFunctionCount: derived.reduce(
      (total, entry) => total + entry.externalFunctions.length,
      0,
    ),
  };
}

export async function loadLiveMigrationSql(migrationsRoot) {
  const filenames = (await readdir(migrationsRoot))
    .filter((name) => name.endsWith(".sql"))
    .sort();
  return new Map(
    await Promise.all(
      filenames.map(async (filename) => [
        filename,
        await readFile(path.join(migrationsRoot, filename), "utf8"),
      ]),
    ),
  );
}

async function main() {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  const contractPath = path.join(
    repositoryRoot,
    "config",
    "dabangil-wcv-c3-structural-recovery-v1.json",
  );
  const manifest = JSON.parse(await readFile(contractPath, "utf8"))
    .migrationHistoryCompatibilityManifestV1;
  const sqlByFilename = await loadLiveMigrationSql(
    path.join(repositoryRoot, "supabase", "migrations"),
  );
  process.stdout.write(`${JSON.stringify(validateMigrationDependencyClosure(manifest, sqlByFilename))}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error}\n`);
    process.exitCode = 1;
  });
}
