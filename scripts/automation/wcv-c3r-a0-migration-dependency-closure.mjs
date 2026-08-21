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

export const POSTGRES_SQL_TOKEN_KINDS_V1 = Object.freeze([
  "UNQUOTED_IDENTIFIER",
  "QUOTED_IDENTIFIER",
  "DOT",
  "OPEN_PUNCTUATION",
  "CLOSE_PUNCTUATION",
  "PUNCTUATION",
  "NUMBER",
  "OPERATOR",
  "ORDINARY_STRING",
  "ESCAPE_STRING",
  "DOLLAR_QUOTED_BODY",
  "LINE_COMMENT",
  "BLOCK_COMMENT",
]);

export const SQL_IDENTIFIER_OCCURRENCE_ROLES_V1 = Object.freeze([
  "index_target",
  "relation_reference",
  "function_call",
  "function_definition",
  "type_reference",
  "extension_name",
  "schema_reference",
  "column_reference",
  "other_closed_role",
]);

export const SQL_IDENTIFIER_OCCURRENCE_OBJECT_KINDS_V1 = Object.freeze([
  "index",
  "relation",
  "function",
  "type",
  "extension",
  "schema",
  "column",
  "unknown",
]);

export const EXTENSION_REGISTRY_V1 = Object.freeze([
  Object.freeze({
    canonicalName: "pgcrypto",
    prohibitedAliases: Object.freeze([]),
    useDetectors: Object.freeze([
      Object.freeze({
        kind: "function",
        identifier: "gen_random_uuid",
        components: Object.freeze(["gen_random_uuid"]),
        schema: null,
        requireUnqualified: true,
      }),
      Object.freeze({
        kind: "function",
        identifier: "digest",
        components: Object.freeze(["digest"]),
        schema: null,
        requireUnqualified: true,
      }),
      Object.freeze({
        kind: "function",
        identifier: "extensions.digest",
        components: Object.freeze(["extensions", "digest"]),
        schema: "extensions",
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
        components: Object.freeze(["vector"]),
        schema: null,
        requireUnqualified: true,
      }),
      Object.freeze({
        kind: "type",
        identifier: "extensions.vector",
        components: Object.freeze(["extensions", "vector"]),
        schema: "extensions",
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

export const EXTERNAL_DATABASE_OBJECT_REGISTRY_V1 = Object.freeze([
  Object.freeze({ kind: "table", identifier: "auth.users" }),
  Object.freeze({ kind: "function", identifier: "auth.uid" }),
  Object.freeze({ kind: "table", identifier: "storage.objects" }),
  Object.freeze({ kind: "table", identifier: "storage.buckets" }),
  Object.freeze({
    kind: "function",
    identifier: "storage.allow_any_operation",
  }),
  Object.freeze({
    kind: "function",
    identifier: "storage.allow_only_operation",
  }),
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

const EXECUTABLE_DOLLAR_BODY_LANGUAGES_V1 = Object.freeze(["sql", "plpgsql"]);

const CLOSED_DEPENDENCY_CLASSES_V1 = Object.freeze([
  "relation",
  "view",
  "sequence",
  "type",
  "function",
  "external_schema_function",
  "extension",
  "extension_schema",
  "producer_consumer_order",
]);

const CLOSED_PARSER_CONTRACT_V1 = Object.freeze({
  lexerVersion: "PostgresIdentifierLexerV1",
  sqlInputCanonicalization:
    "UTF8_DECODE_THEN_CRLF_OR_CR_TO_LF_BEFORE_ANY_DERIVATION",
  tokenClasses: POSTGRES_SQL_TOKEN_KINDS_V1,
  unquotedIdentifierNormalization: "POSTGRES_ASCII_LOWERCASE_FOLD",
  quotedIdentifierNormalization:
    "REMOVE_DELIMITERS_DECODE_DOUBLED_QUOTES_PRESERVE_EXACT_CASE",
  qualifiedComponentsNormalizedIndependently: true,
  qualifiedIdentifierSerialization:
    "POSTGRES_COMPONENT_QUOTING_PRESERVES_DOT_PAYLOADS",
  identifierOccurrenceModelVersion: "SqlIdentifierOccurrenceV1",
  identifierOccurrenceRoles: SQL_IDENTIFIER_OCCURRENCE_ROLES_V1,
  identifierOccurrenceObjectKinds: SQL_IDENTIFIER_OCCURRENCE_OBJECT_KINDS_V1,
  identifierOccurrenceIdentityFields: Object.freeze([
    "statementOrdinal",
    "tokenStart",
    "tokenEnd",
    "role",
    "objectKind",
    "normalizedComponents",
  ]),
  indexTargetExclusionIdentity:
    "STATEMENT_SPAN_ROLE_OBJECT_KIND_AND_COMPONENTS",
  semanticNameOnlyIndexExclusionAllowed: false,
  quotedIdentifierPayloadNeverRescanned: true,
  unsupportedIdentifierDiagnostic: "UNSUPPORTED_IDENTIFIER_FORM",
  unicodeEscapedIdentifiersSupported: false,
  unsupportedIdentifierFormsFailClosed: true,
  recognizesCreateExtensionForms: Object.freeze([
    "CREATE EXTENSION name",
    "CREATE EXTENSION IF NOT EXISTS name",
    "CREATE EXTENSION name SCHEMA schema",
    "CREATE EXTENSION name WITH SCHEMA schema",
  ]),
  mixedKeywordCasingAccepted: true,
  quotedIdentifiersAccepted: true,
  multipleStatementsAccepted: true,
  commentsIgnored: true,
  ordinaryStringLiteralsIgnored: true,
  dollarQuotedBodiesIgnoredForCreateExtension: true,
  scalarDollarQuotedBodiesIgnoredForDependencies: true,
  grammarEstablishedDoFunctionProcedureBodiesScannedForDependencies: true,
  executableDollarBodyLanguages: EXECUTABLE_DOLLAR_BODY_LANGUAGES_V1,
  routineLanguageClauseScope: "TOP_LEVEL_CREATE_ROUTINE_OPTION",
  routineLanguageNameForms: Object.freeze(["IDENTIFIER", "ORDINARY_STRING"]),
  escapeStringRoutineLanguagePolicy: "FAIL_UNSUPPORTED",
  nonSqlDollarBodyPolicy: "IGNORE_AS_NON_EXECUTABLE",
  extensionUseMustFollowCurrentMigrationDeclaration: true,
  databaseObjectKindClassificationRequired: true,
  statementAwareTypePositions: Object.freeze([
    "ROUTINE_PARAMETER",
    "ROUTINE_OPERATION_SIGNATURE",
    "ROUTINE_RETURN",
    "ROUTINE_TRANSFORM_TYPE",
    "RETURNS_TABLE_COLUMN",
    "TABLE_COLUMN",
    "ALTER_ADD_COLUMN",
    "ALTER_COLUMN_TYPE",
    "COMPOSITE_TYPE_ATTRIBUTE",
    "DOMAIN_BASE_TYPE",
    "CREATE_CAST_SOURCE_AND_TARGET",
    "CAST_OBJECT_OPERATION_SOURCE_AND_TARGET",
    "EXPRESSION_CAST_TARGET",
    "POSTGRES_CAST_OPERATOR",
    "PLPGSQL_DECLARATION",
    "PREPARE_PARAMETER",
    "AGGREGATE_STATE_TYPE",
    "AGGREGATE_INPUT_TYPE",
    "AGGREGATE_ORDERED_SET_INPUT_TYPE",
    "AGGREGATE_OPERATION_INPUT_TYPE",
    "RANGE_SUBTYPE",
    "OPERATOR_ARGUMENT_TYPE",
    "OPERATOR_OPERATION_ARGUMENT_TYPE",
    "OPERATOR_CLASS_FOR_TYPE",
    "OPERATOR_CLASS_STORAGE_TYPE",
    "OPERATOR_CLASS_SIGNATURE_TYPE",
    "OPERATOR_FAMILY_SIGNATURE_TYPE",
    "TRANSFORM_TARGET_TYPE",
    "ALTER_EXTENSION_MEMBER_TRANSFORM_TYPE",
    "ALTER_EXTENSION_MEMBER_CAST_SOURCE_AND_TARGET",
    "ALTER_EXTENSION_MEMBER_AGGREGATE_INPUT_TYPE",
    "ALTER_EXTENSION_MEMBER_OPERATOR_ARGUMENT_TYPE",
    "TYPE_OBJECT_OPERATION",
    "TYPE_OBJECT_ELEMENT",
    "TYPED_TABLE_OF_TYPE",
    "FOREIGN_TABLE_COLUMN",
  ]),
  utilityRelationTargetGrammars: Object.freeze([
    "COPY",
    "VACUUM",
    "ANALYZE",
    "CLUSTER",
    "TRUNCATE",
    "GRANT",
    "REVOKE",
    "FROM_ONLY",
    "INHERITS",
    "TRIGGER_ON",
    "RULE_TO",
    "MERGE_INTO",
    "MERGE_USING",
    "DELETE_USING",
  ]),
  createSideDependencyGrammars: Object.freeze([
    "TABLE_LIKE_RELATION",
    "PARTITION_OF_RELATION",
    "RANGE_SUBTYPE",
    "OPERATOR_IMPLEMENTATION_FUNCTION",
    "ROUTINE_SUPPORT_FUNCTION",
  ]),
  producedObjectForms: Object.freeze([
    "TABLE_WITH_TEMPORARY_MODIFIERS",
    "FOREIGN_TABLE",
    "VIEW_WITH_TEMPORARY_MODIFIERS",
    "RECURSIVE_VIEW",
    "SEQUENCE",
    "TYPE",
    "DOMAIN_AS_TYPE",
    "FUNCTION",
    "PROCEDURE_AS_FUNCTION",
  ]),
  multiTargetDropRequiresCompleteEnumeration: true,
  renameIdentityTransitionMode: "OLD_DROP_NEW_PRODUCER",
  renameReplacementComponentsValidatedIndependently: true,
  routineIdentityMode: "SCHEMA_NAME_PLUS_EXACT_INPUT_SIGNATURE_NO_OVERLOADS",
  routineSignatureOperationGrammars: Object.freeze([
    "CREATE",
    "CREATE_OR_REPLACE",
    "ALTER",
    "DROP",
    "GRANT",
    "REVOKE",
    "RENAME",
    "GENERIC_ROUTINE",
  ]),
  statementOrderedObjectTransitions: true,
  storedRoutineBodyDdlTransitionPolicy: "REFERENCE_ONLY_NOT_MIGRATION_TRANSITION",
  storedRoutineBodyReferenceValidationPoint: "END_OF_MIGRATION_FINAL_STATE",
  executedDoDdlTransitionPolicy: "SOURCE_ORDERED_MIGRATION_TRANSITION",
  conditionalDoCreateDropRenamePolicy: "FAIL_CLOSED",
  conditionalDoModifyPolicy: "REFERENCE_ONLY_NOT_PUBLISHED",
  terminatingDoTransitionPolicy: "FAIL_CLOSED",
  doTransitionControlAnalysis: "STATEMENT_POSITION_AND_PLPGSQL_GRAMMAR_AWARE",
  exceptionDoTransitionControlAnalysis: "BEGIN_EXCEPTION_END_BLOCK_RANGE",
  plpgsqlStatementLabelsRecognizedAsControlPrefixes: true,
  nestedDoTransitionControlInheritance: true,
  nestedExecutableDollarBodyDiscovery: "RECURSIVE_GRAMMAR_ESTABLISHED_ONLY",
  nestedExecutableBodyTransitionOwnership: "INHERIT_STORED_ROUTINE_REFERENCE_ONLY",
  foreignTableOperationKind: "TABLE",
  recursiveViewSelfReferenceKind: "RELATION_CONTEXT_ONLY",
  castSeparatorAnalysis: "EXACTLY_ONE_TOP_LEVEL_AS",
  routineReturnTypeGrammarScope: "CREATE_ROUTINE_POST_SIGNATURE_OPTION",
  typedTableOfTypeGrammarScope: "IMMEDIATELY_AFTER_TABLE_TARGET",
  alterExtensionMemberOperationScope: "IMMEDIATELY_AFTER_EXACT_EXTENSION_NAME",
  operatorMissingOperandSentinel: "NONE",
  nonReportableUnsupportedObjectTargets: Object.freeze([
    "AGGREGATE",
    "OPERATOR_CLASS",
    "OPERATOR_FAMILY",
  ]),
  extensionLifecycleOperationPolicy: "DROP_AND_SET_SCHEMA_FAIL_UNSUPPORTED",
  internalProducedFunctionsExcludedFromExternalRegistry: true,
  sameMigrationCreateDropPolicy: "FAIL_CLOSED",
  manifestOperationClassesDerivedSeparately: Object.freeze([
    "consumes",
    "modifies",
    "drops",
  ]),
  ambiguousTypePositionFailsClosed: true,
  unrecognizedOrAmbiguousDeclarationFailsClosed: true,
});

const CLOSED_EXTENSION_MANIFEST_REGISTRY_V1 = Object.freeze([
  Object.freeze({
    canonicalName: "pgcrypto",
    prohibitedAliases: Object.freeze([]),
    sqlUseEvidence: Object.freeze([
      "gen_random_uuid",
      "digest",
      "extensions.digest",
    ]),
  }),
  Object.freeze({
    canonicalName: "vector",
    prohibitedAliases: Object.freeze(["pgvector"]),
    sqlUseEvidence: Object.freeze(["vector(type)"]),
  }),
]);

const CLOSED_EXTERNAL_FUNCTION_MANIFEST_REGISTRY_V1 = Object.freeze([
  Object.freeze({
    identifier: "auth.uid",
    dependencyMode: "PER_MIGRATION_MANIFEST",
  }),
  Object.freeze({
    identifier: "storage.allow_any_operation",
    dependencyMode: "PER_MIGRATION_MANIFEST",
  }),
  Object.freeze({
    identifier: "storage.allow_only_operation",
    dependencyMode: "PER_MIGRATION_MANIFEST",
  }),
  Object.freeze({
    identifierPrefix: "pg_catalog.",
    dependencyMode: "CLOSED_POSTGRES_BUILTIN_REGISTRY",
    identifiers: Object.freeze([
      "pg_catalog.current_setting",
      "pg_catalog.hashtextextended",
      "pg_catalog.jsonb_set",
      "pg_catalog.pg_advisory_xact_lock",
      "pg_catalog.set_config",
      "pg_catalog.to_jsonb",
    ]),
  }),
]);

const CLOSED_EXACT_COMPARISON_RULES_V1 = Object.freeze({
  sqlDerivedCreatedExtensionsEqualManifest: true,
  sqlDerivedRequiredExtensionUsesEqualManifest: true,
  sqlDerivedExactDependencyPredecessorsEqualManifest: true,
  loadedLiveSqlFilenamesEqualManifestLiveRecords: true,
  missingManifestEntryFails: true,
  extraManifestEntryFails: true,
  wrongExtensionSchemaFails: true,
  wrongProducerFails: true,
  consumerBeforeProducerFails: true,
  externalFunctionsComparedBothDirections: true,
  manifestExternalDatabaseObjectsEqualCodeOwnedRegistry: true,
  producedObjectsComparedBySqlClassAndIdentity: true,
  referencedDatabaseObjectsComparedBothDirections: true,
  modifiedDatabaseObjectsComparedBothDirections: true,
  droppedDatabaseObjectsComparedBothDirections: true,
  renamedDatabaseObjectsRequireOldDropAndNewProducer: true,
  routineInputSignaturesComparedBeforeLineage: true,
  routineCompoundAndBuiltinAliasTypesCanonicalized: true,
  unqualifiedCustomRoutineTypesFailClosed: true,
  routineOverloadsFailClosed: true,
  everyClassifiedReferenceIsStatementOrdered: true,
  currentProducerSelfReferencesAreNonReportable: true,
  storedRoutineBodyDdlIsReferenceOnly: true,
  executedDoDdlIsSourceOrdered: true,
  conditionalDoObjectTransitionsFailClosedOrRemainUnpublished: true,
  storedRoutineBodyReferencesUseFinalMigrationState: true,
  nestedExecutableDollarBodiesAreDiscoveredRecursively: true,
  internalProducedFunctionsAreNotExternalDependencies: true,
  createSideDependenciesAreTyped: true,
  sameMigrationCreateDropFailsClosed: true,
  wrongDatabaseObjectKindFails: true,
  unregisteredQualifiedDatabaseObjectsFail: true,
  quotedQualifiedDatabaseIdentifiersAccepted: true,
  exactIdentifierOccurrencesEqualManifest: true,
  indexTargetExclusionsAreExactOccurrenceOnly: true,
  semanticNameOnlyIndexExclusionRejected: true,
  declaredEdgesRequireSqlOrClosedRegistryEvidence: true,
  unknownDependencyClassMarksManifestIncomplete: true,
  incompleteManifestBlocksSourceAuthorityAcceptance: true,
});

const EXECUTABLE_TOKEN_TYPES = new Set([
  "UNQUOTED_IDENTIFIER",
  "QUOTED_IDENTIFIER",
  "DOT",
  "OPEN_PUNCTUATION",
  "CLOSE_PUNCTUATION",
  "PUNCTUATION",
  "NUMBER",
  "OPERATOR",
]);

function canonicalUtf8Lf(value) {
  return value.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
}

function sha256(value) {
  return createHash("sha256")
    .update(canonicalUtf8Lf(value), "utf8")
    .digest("hex");
}

function isAsciiLetter(character) {
  const code = character?.charCodeAt(0) ?? -1;
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

function isAsciiDigit(character) {
  const code = character?.charCodeAt(0) ?? -1;
  return code >= 48 && code <= 57;
}

function isUnquotedIdentifierStart(character) {
  return character === "_" || isAsciiLetter(character);
}

function isUnquotedIdentifierContinue(character) {
  return (
    character === "_" ||
    character === "$" ||
    isAsciiLetter(character) ||
    isAsciiDigit(character)
  );
}

function foldAsciiIdentifier(value) {
  let folded = "";
  for (const character of value) {
    const code = character.charCodeAt(0);
    folded +=
      code >= 65 && code <= 90 ? String.fromCharCode(code + 32) : character;
  }
  return folded;
}

function containsUppercaseAscii(value) {
  return [...value].some((character) => {
    const code = character.charCodeAt(0);
    return code >= 65 && code <= 90;
  });
}

function dollarQuoteDelimiterAt(sql, index) {
  if (sql[index] !== "$") return null;
  if (sql[index + 1] === "$") return "$$";
  if (!isUnquotedIdentifierStart(sql[index + 1])) return null;
  let cursor = index + 2;
  while (
    isUnquotedIdentifierStart(sql[cursor]) ||
    isAsciiDigit(sql[cursor])
  ) {
    cursor += 1;
  }
  return sql[cursor] === "$" ? sql.slice(index, cursor + 1) : null;
}

function readSingleQuotedToken(sql, quoteIndex, escapeBackslash) {
  let cursor = quoteIndex + 1;
  while (cursor < sql.length) {
    if (sql[cursor] === "'" && sql[cursor + 1] === "'") {
      cursor += 2;
      continue;
    }
    if (sql[cursor] === "'") return cursor + 1;
    if (escapeBackslash && sql[cursor] === "\\" && sql[cursor + 1] !== undefined) {
      cursor += 2;
      continue;
    }
    cursor += 1;
  }
  throw new MigrationDependencyClosureError(
    "UNTERMINATED_STRING_LITERAL",
    `offset ${quoteIndex}`,
  );
}

function readQuotedIdentifierToken(sql, start) {
  let cursor = start + 1;
  let value = "";
  while (cursor < sql.length) {
    if (sql[cursor] === '"' && sql[cursor + 1] === '"') {
      value += '"';
      cursor += 2;
      continue;
    }
    if (sql[cursor] === '"') {
      return { end: cursor + 1, value };
    }
    if (sql[cursor] === "\0") {
      throw new MigrationDependencyClosureError(
        "UNSUPPORTED_IDENTIFIER_FORM",
        `NUL_IN_QUOTED_IDENTIFIER:offset ${start}`,
      );
    }
    value += sql[cursor];
    cursor += 1;
  }
  throw new MigrationDependencyClosureError(
    "UNTERMINATED_QUOTED_IDENTIFIER",
    `offset ${start}`,
  );
}

function tokenizePostgresSqlAt(sql, baseOffset = 0) {
  const tokens = [];
  let index = 0;

  const push = (token) => {
    tokens.push({
      ...token,
      start: baseOffset + token.start,
      end: baseOffset + token.end,
      raw: sql.slice(token.start, token.end),
    });
  };

  while (index < sql.length) {
    const character = sql[index];

    if (/\s/u.test(character)) {
      index += 1;
      continue;
    }

    if (sql.startsWith("--", index)) {
      const end = sql.indexOf("\n", index + 2);
      const boundary = end === -1 ? sql.length : end;
      push({ type: "LINE_COMMENT", start: index, end: boundary });
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
      push({ type: "BLOCK_COMMENT", start, end: index });
      continue;
    }

    const unicodeIdentifierPrefix =
      (character === "U" || character === "u") &&
      sql[index + 1] === "&" &&
      sql[index + 2] === '"' &&
      !isUnquotedIdentifierContinue(sql[index - 1]);
    if (unicodeIdentifierPrefix) {
      throw new MigrationDependencyClosureError(
        "UNSUPPORTED_IDENTIFIER_FORM",
        `UNICODE_ESCAPED_IDENTIFIER:offset ${index}`,
      );
    }

    const unicodeStringPrefix =
      (character === "U" || character === "u") &&
      sql[index + 1] === "&" &&
      sql[index + 2] === "'" &&
      !isUnquotedIdentifierContinue(sql[index - 1]);
    if (unicodeStringPrefix) {
      const end = readSingleQuotedToken(sql, index + 2, true);
      push({ type: "ESCAPE_STRING", start: index, end });
      index = end;
      continue;
    }

    const prefixedString =
      "eEbBxXnN".includes(character) &&
      sql[index + 1] === "'" &&
      !isUnquotedIdentifierContinue(sql[index - 1]);
    if (prefixedString) {
      const escapeBackslash = character === "e" || character === "E";
      const end = readSingleQuotedToken(sql, index + 1, escapeBackslash);
      push({
        type: escapeBackslash ? "ESCAPE_STRING" : "ORDINARY_STRING",
        start: index,
        end,
      });
      index = end;
      continue;
    }

    if (character === "'") {
      const end = readSingleQuotedToken(sql, index, false);
      push({ type: "ORDINARY_STRING", start: index, end });
      index = end;
      continue;
    }

    if (character === '"') {
      const quoted = readQuotedIdentifierToken(sql, index);
      push({
        type: "QUOTED_IDENTIFIER",
        start: index,
        end: quoted.end,
        value: quoted.value,
        quoted: true,
      });
      index = quoted.end;
      continue;
    }

    const dollarDelimiter = dollarQuoteDelimiterAt(sql, index);
    if (dollarDelimiter) {
      const bodyStart = index + dollarDelimiter.length;
      const bodyEnd = sql.indexOf(dollarDelimiter, bodyStart);
      if (bodyEnd === -1) {
        throw new MigrationDependencyClosureError(
          "UNTERMINATED_DOLLAR_QUOTE",
          `offset ${index}`,
        );
      }
      const end = bodyEnd + dollarDelimiter.length;
      push({
        type: "DOLLAR_QUOTED_BODY",
        start: index,
        end,
        delimiter: dollarDelimiter,
        body: sql.slice(bodyStart, bodyEnd),
        bodyStart: baseOffset + bodyStart,
        bodyEnd: baseOffset + bodyEnd,
      });
      index = end;
      continue;
    }

    if (isUnquotedIdentifierStart(character)) {
      const start = index;
      index += 1;
      while (isUnquotedIdentifierContinue(sql[index])) index += 1;
      const raw = sql.slice(start, index);
      push({
        type: "UNQUOTED_IDENTIFIER",
        start,
        end: index,
        value: foldAsciiIdentifier(raw),
        quoted: false,
      });
      continue;
    }

    if (isAsciiDigit(character)) {
      const start = index;
      index += 1;
      while (isAsciiDigit(sql[index])) index += 1;
      if (sql[index] === "." && isAsciiDigit(sql[index + 1])) {
        index += 1;
        while (isAsciiDigit(sql[index])) index += 1;
      }
      push({ type: "NUMBER", start, end: index, value: sql.slice(start, index) });
      continue;
    }

    if (character.charCodeAt(0) > 127) {
      throw new MigrationDependencyClosureError(
        "UNSUPPORTED_IDENTIFIER_FORM",
        `NON_ASCII_UNQUOTED_IDENTIFIER:offset ${index}`,
      );
    }

    if (character === ".") {
      push({ type: "DOT", start: index, end: index + 1, value: "." });
      index += 1;
      continue;
    }

    if ("([{".includes(character)) {
      push({
        type: "OPEN_PUNCTUATION",
        start: index,
        end: index + 1,
        value: character,
      });
      index += 1;
      continue;
    }

    if (")]}".includes(character)) {
      push({
        type: "CLOSE_PUNCTUATION",
        start: index,
        end: index + 1,
        value: character,
      });
      index += 1;
      continue;
    }

    if (",;".includes(character)) {
      push({
        type: "PUNCTUATION",
        start: index,
        end: index + 1,
        value: character,
      });
      index += 1;
      continue;
    }

    const threeCharacterOperator = sql.slice(index, index + 3);
    const twoCharacterOperator = sql.slice(index, index + 2);
    const operator =
      ["->>", "#>>"].includes(threeCharacterOperator)
        ? threeCharacterOperator
        : [
            "::",
            "->",
            "#>",
            ":=",
            "<=",
            ">=",
            "<>",
            "!=",
            "||",
            "&&",
            "@>",
            "<@",
          ].includes(twoCharacterOperator)
        ? twoCharacterOperator
        : character;
    push({
      type: "OPERATOR",
      start: index,
      end: index + operator.length,
      value: operator,
    });
    index += operator.length;
  }

  return tokens;
}

export function tokenizePostgresSql(sql) {
  return tokenizePostgresSqlAt(sql);
}

function isIdentifierToken(token) {
  return (
    token?.type === "UNQUOTED_IDENTIFIER" ||
    token?.type === "QUOTED_IDENTIFIER"
  );
}

function isKeyword(token, keyword) {
  return token?.type === "UNQUOTED_IDENTIFIER" && token.value === keyword;
}

function isPunctuation(token, value) {
  return (
    (token?.type === "OPEN_PUNCTUATION" ||
      token?.type === "CLOSE_PUNCTUATION" ||
      token?.type === "PUNCTUATION") &&
    token.value === value
  );
}

function executableTokens(tokens) {
  return tokens.filter((token) => EXECUTABLE_TOKEN_TYPES.has(token.type));
}

function statementTokensBefore(tokens, index) {
  let start = index - 1;
  while (start >= 0 && !isPunctuation(tokens[start], ";")) start -= 1;
  return tokens.slice(start + 1, index);
}

function statementTokensAround(tokens, index) {
  let start = index - 1;
  while (start >= 0 && !isPunctuation(tokens[start], ";")) start -= 1;
  let end = index + 1;
  while (end < tokens.length && !isPunctuation(tokens[end], ";")) end += 1;
  return {
    tokens: tokens.slice(start + 1, end),
    bodyIndex: index - start - 1,
  };
}

function matchingCloseIndex(tokens, openIndex) {
  const open = tokens[openIndex];
  const closeByOpen = { "(": ")", "[": "]", "{": "}" };
  const close = closeByOpen[open?.value];
  if (!close || !isPunctuation(open, open.value)) return -1;
  let depth = 0;
  for (let index = openIndex; index < tokens.length; index += 1) {
    if (isPunctuation(tokens[index], open.value)) depth += 1;
    if (isPunctuation(tokens[index], close)) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function parenthesisDepths(tokens) {
  const depths = [];
  let depth = 0;
  for (let index = 0; index < tokens.length; index += 1) {
    depths.push(depth);
    if (isPunctuation(tokens[index], "(")) depth += 1;
    if (isPunctuation(tokens[index], ")")) depth -= 1;
    if (depth < 0) {
      throw new MigrationDependencyClosureError(
        "UNBALANCED_SQL_PUNCTUATION",
        tokens[index].raw,
      );
    }
  }
  if (depth !== 0) {
    throw new MigrationDependencyClosureError(
      "UNBALANCED_SQL_PUNCTUATION",
      "parentheses",
    );
  }
  return depths;
}

function declaredDollarBodyLanguage(statement) {
  const depths = parenthesisDepths(statement);
  const languageIndexes = [];
  for (let index = 0; index < statement.length - 1; index += 1) {
    if (
      depths[index] === 0 &&
      isKeyword(statement[index], "language") &&
      !isKeyword(statement[index - 1], "returns") &&
      !isKeyword(statement[index - 1], "setof") &&
      !isKeyword(statement[index - 1], "type") &&
      !isKeyword(statement[index - 1], "support") &&
      !isKeyword(statement[index - 1], "set") &&
      statement[index - 1]?.type !== "DOT" &&
      statement[index + 1]?.type !== "DOT" &&
      (isIdentifierToken(statement[index + 1]) ||
        statement[index + 1]?.type === "ORDINARY_STRING" ||
        statement[index + 1]?.type === "ESCAPE_STRING")
    ) {
      languageIndexes.push(index);
    }
  }
  if (languageIndexes.length > 1) {
    throw new MigrationDependencyClosureError(
      "AMBIGUOUS_EXECUTABLE_DOLLAR_BODY_LANGUAGE",
      "multiple LANGUAGE clauses",
    );
  }
  if (languageIndexes.length === 0) return null;
  const language = statement[languageIndexes[0] + 1];
  if (isIdentifierToken(language)) return language.value;
  if (language?.type === "ORDINARY_STRING") {
    const raw = language.raw;
    if (!raw.startsWith("'") || !raw.endsWith("'")) {
      throw new MigrationDependencyClosureError(
        "AMBIGUOUS_EXECUTABLE_DOLLAR_BODY_LANGUAGE",
        raw,
      );
    }
    return raw.slice(1, -1).replaceAll("''", "'");
  }
  if (language?.type === "ESCAPE_STRING") {
    throw new MigrationDependencyClosureError(
      "UNSUPPORTED_ROUTINE_LANGUAGE_LITERAL",
      language.raw,
    );
  }
  throw new MigrationDependencyClosureError(
    "AMBIGUOUS_EXECUTABLE_DOLLAR_BODY_LANGUAGE",
    language?.raw ?? "missing language identifier",
  );
}

function executableDollarBodyMetadata(tokens, index) {
  const { tokens: statement, bodyIndex } = statementTokensAround(tokens, index);
  const beforeBody = statement.slice(0, bodyIndex);
  let doIndex = -1;
  for (let candidate = bodyIndex - 1; candidate >= 0; candidate -= 1) {
    if (!isKeyword(statement[candidate], "do")) continue;
    const between = statement.slice(candidate + 1, bodyIndex);
    if (
      between.length === 0 ||
      (between.length === 2 &&
        isKeyword(between[0], "language") &&
        (isIdentifierToken(between[1]) ||
          between[1]?.type === "ORDINARY_STRING" ||
          between[1]?.type === "ESCAPE_STRING"))
    ) {
      doIndex = candidate;
      break;
    }
  }
  if (doIndex !== -1) {
    const doStatement = statement.slice(doIndex);
    const language = declaredDollarBodyLanguage(doStatement);
    const effectiveLanguage = language ?? "plpgsql";
    return EXECUTABLE_DOLLAR_BODY_LANGUAGES_V1.includes(effectiveLanguage)
      ? {
          kind: "DO_BODY",
          language: effectiveLanguage,
          anchorStart: statement[doIndex].start,
        }
      : null;
  }
  const hasFunctionOrProcedure =
    statement.some((token) => isKeyword(token, "create")) &&
    statement.some(
      (token) => isKeyword(token, "function") || isKeyword(token, "procedure"),
    );
  if (!hasFunctionOrProcedure || !isKeyword(beforeBody.at(-1), "as")) {
    return null;
  }
  const language = declaredDollarBodyLanguage(statement);
  if (language === null) {
    throw new MigrationDependencyClosureError(
      "AMBIGUOUS_EXECUTABLE_DOLLAR_BODY_LANGUAGE",
      `offset ${tokens[index].start}`,
    );
  }
  return EXECUTABLE_DOLLAR_BODY_LANGUAGES_V1.includes(language)
    ? { kind: "STORED_ROUTINE_BODY", language }
    : null;
}

function tagExecutableScope(tokens, kind, language = null) {
  Object.defineProperties(tokens, {
    postgresScopeKind: { value: kind },
    postgresScopeLanguage: { value: language },
  });
  return tokens;
}

function proceduralStatementLead(tokens, index) {
  if (index === 0 || isPunctuation(tokens[index - 1], ";")) return true;
  if (
    ["begin", "then", "else", "loop"].some((keyword) =>
      isKeyword(tokens[index - 1], keyword),
    )
  ) {
    return true;
  }
  const labelStart = index - 5;
  return (
    labelStart >= 0 &&
    tokens[labelStart]?.type === "OPERATOR" &&
    tokens[labelStart].value === "<" &&
    tokens[labelStart + 1]?.type === "OPERATOR" &&
    tokens[labelStart + 1].value === "<" &&
    isIdentifierToken(tokens[labelStart + 2]) &&
    tokens[labelStart + 3]?.type === "OPERATOR" &&
    tokens[labelStart + 3].value === ">" &&
    tokens[labelStart + 4]?.type === "OPERATOR" &&
    tokens[labelStart + 4].value === ">" &&
    (labelStart === 0 ||
      isPunctuation(tokens[labelStart - 1], ";") ||
      ["begin", "then", "else", "loop"].some((keyword) =>
        isKeyword(tokens[labelStart - 1], keyword),
      ))
  );
}

function exceptionProtectedBlockRanges(tokens) {
  const blockStack = [];
  const protectedRanges = [];
  for (let index = 0; index < tokens.length; index += 1) {
    if (
      isKeyword(tokens[index], "begin") &&
      proceduralStatementLead(tokens, index)
    ) {
      blockStack.push({ beginIndex: index, exceptionIndex: -1 });
      continue;
    }
    if (
      isKeyword(tokens[index], "exception") &&
      proceduralStatementLead(tokens, index) &&
      isKeyword(tokens[index + 1], "when")
    ) {
      if (blockStack.length > 0) {
        blockStack.at(-1).exceptionIndex = index;
      }
      continue;
    }
    if (
      isKeyword(tokens[index], "end") &&
      proceduralStatementLead(tokens, index) &&
      !["if", "case", "loop"].some((keyword) =>
        isKeyword(tokens[index + 1], keyword),
      )
    ) {
      const block = blockStack.pop();
      if (block && block.exceptionIndex !== -1) {
        protectedRanges.push({ start: block.beginIndex, end: index });
      }
    }
  }
  return protectedRanges;
}

function mergeDoTransitionPolicies(...policies) {
  return {
    conditional: policies.some((policy) => policy?.conditional === true),
    terminating: policies.some((policy) => policy?.terminating === true),
  };
}

function doTransitionPolicyAt(scopeTokens, targetToken) {
  const targetIndex = scopeTokens.findIndex(
    (token) => token.start === targetToken.start && token.end === targetToken.end,
  );
  if (targetIndex === -1) {
    throw new MigrationDependencyClosureError(
      "UNRECOGNIZED_DO_TRANSITION_POSITION",
      `offset ${targetToken.start}`,
    );
  }

  const controlStack = [];
  let terminatingControlBeforeTarget = false;
  for (let index = 0; index < targetIndex; index += 1) {
    if (
      isKeyword(scopeTokens[index], "end") &&
      ["if", "case", "loop"].some((keyword) =>
        isKeyword(scopeTokens[index + 1], keyword),
      )
    ) {
      const closingKind = scopeTokens[index + 1].value;
      const expectedKind = closingKind === "loop" ? "loop" : closingKind;
      for (let stackIndex = controlStack.length - 1; stackIndex >= 0; stackIndex -= 1) {
        if (controlStack[stackIndex] === expectedKind) {
          controlStack.splice(stackIndex, 1);
          break;
        }
      }
      index += 1;
      continue;
    }

    if (!proceduralStatementLead(scopeTokens, index)) continue;
    if (isKeyword(scopeTokens[index], "if")) {
      controlStack.push("if");
      continue;
    }
    if (isKeyword(scopeTokens[index], "case")) {
      controlStack.push("case");
      continue;
    }
    if (
      ["while", "for", "foreach", "loop"].some((keyword) =>
        isKeyword(scopeTokens[index], keyword),
      )
    ) {
      controlStack.push("loop");
      continue;
    }
    if (
      isKeyword(scopeTokens[index], "return") ||
      isKeyword(scopeTokens[index], "exit")
    ) {
      terminatingControlBeforeTarget = true;
    }
  }

  return {
    conditional:
      controlStack.length > 0 ||
      exceptionProtectedBlockRanges(scopeTokens).some(
        (range) => targetIndex > range.start && targetIndex < range.end,
      ),
    terminating: terminatingControlBeforeTarget,
  };
}

function doTransitionPolicy(scope, targetToken) {
  return scope.kind === "DO_BODY"
    ? mergeDoTransitionPolicies(
        scope.inheritedTransitionPolicy,
        doTransitionPolicyAt(scope.scopeTokens, targetToken),
      )
    : { conditional: false, terminating: false };
}

function appendExecutableDollarBodyScopes(
  structuralTokens,
  scopes,
  ancestorExecutionKind = "OUTER",
  ancestorTransitionPolicy = { conditional: false, terminating: false },
) {
  const parentExecutableTokens = executableTokens(structuralTokens);
  for (let index = 0; index < structuralTokens.length; index += 1) {
    const token = structuralTokens[index];
    if (token.type !== "DOLLAR_QUOTED_BODY") continue;
    const metadata = executableDollarBodyMetadata(structuralTokens, index);
    if (!metadata) continue;
    const kind =
      ancestorExecutionKind === "STORED_ROUTINE_BODY" ||
      metadata.kind === "STORED_ROUTINE_BODY"
        ? "STORED_ROUTINE_BODY"
        : metadata.kind;
    let inheritedTransitionPolicy = { conditional: false, terminating: false };
    if (kind === "DO_BODY" && ancestorExecutionKind === "DO_BODY") {
      const anchorToken = parentExecutableTokens.find(
        (candidate) => candidate.start === metadata.anchorStart,
      );
      if (!anchorToken) {
        throw new MigrationDependencyClosureError(
          "UNRECOGNIZED_DO_TRANSITION_POSITION",
          `nested DO offset ${metadata.anchorStart}`,
        );
      }
      inheritedTransitionPolicy = mergeDoTransitionPolicies(
        ancestorTransitionPolicy,
        doTransitionPolicyAt(parentExecutableTokens, anchorToken),
      );
    }
    const bodyTokens = tokenizePostgresSqlAt(token.body, token.bodyStart);
    const executableBodyTokens = executableTokens(bodyTokens);
    scopes.push({
      ...metadata,
      kind,
      inheritedTransitionPolicy,
      tokens: tagExecutableScope(
        executableBodyTokens,
        kind,
        metadata.language,
      ),
    });
    const structuralBodyTokens = bodyTokens.filter(
      (candidate) =>
        EXECUTABLE_TOKEN_TYPES.has(candidate.type) ||
        candidate.type === "ORDINARY_STRING" ||
        candidate.type === "ESCAPE_STRING" ||
        candidate.type === "DOLLAR_QUOTED_BODY",
    );
    appendExecutableDollarBodyScopes(
      structuralBodyTokens,
      scopes,
      kind,
      inheritedTransitionPolicy,
    );
  }
}

function executableTokenScopeRecords(sql, { includeExecutableDollarBodies }) {
  const outerTokens = tokenizePostgresSqlAt(sql);
  const structuralOuter = outerTokens.filter(
    (token) =>
      EXECUTABLE_TOKEN_TYPES.has(token.type) ||
      token.type === "ORDINARY_STRING" ||
      token.type === "ESCAPE_STRING" ||
      token.type === "DOLLAR_QUOTED_BODY",
  );
  const scopes = [
    {
      kind: "OUTER",
      language: null,
      tokens: tagExecutableScope(executableTokens(outerTokens), "OUTER"),
    },
  ];

  if (!includeExecutableDollarBodies) return scopes;
  appendExecutableDollarBodyScopes(structuralOuter, scopes);
  return scopes;
}

function executableTokenScopes(sql, options) {
  return executableTokenScopeRecords(sql, options).map((scope) => scope.tokens);
}

function executableStatementScopeRecords(sql) {
  const statements = [];
  for (const scope of executableTokenScopeRecords(sql, {
    includeExecutableDollarBodies: true,
  })) {
    let start = 0;
    while (start < scope.tokens.length) {
      while (isPunctuation(scope.tokens[start], ";")) start += 1;
      if (start >= scope.tokens.length) break;
      let end = start;
      while (end < scope.tokens.length && !isPunctuation(scope.tokens[end], ";")) {
        end += 1;
      }
      const tokens = tagExecutableScope(
        scope.tokens.slice(start, end),
        scope.kind,
        scope.language,
      );
      if (tokens.length > 0) {
        statements.push({ ...scope, scopeTokens: scope.tokens, tokens });
      }
      start = end + 1;
    }
  }
  return statements
    .sort((left, right) => {
      const offset = left.tokens[0].start - right.tokens[0].start;
      if (offset !== 0) return offset;
      return left.kind === "OUTER" ? -1 : right.kind === "OUTER" ? 1 : 0;
    })
    .map((statement, index) => ({
      ...statement,
      statementOrdinal: index + 1,
    }));
}

function qualifiedIdentifierAt(tokens, index) {
  if (
    !isIdentifierToken(tokens[index]) ||
    tokens[index + 1]?.type !== "DOT" ||
    !isIdentifierToken(tokens[index + 2])
  ) {
    return null;
  }
  return {
    schema: tokens[index],
    name: tokens[index + 2],
    start: tokens[index].start,
    end: tokens[index + 2].end,
    index,
    nextIndex: index + 3,
  };
}

function manifestIdentifierComponents(identifier) {
  if (identifier.includes('"')) {
    const tokens = tokenizePostgresSql(identifier);
    const reference = qualifiedIdentifierAt(tokens, 0);
    if (reference && reference.nextIndex === tokens.length) {
      return [reference.schema, reference.name];
    }
    throw new MigrationDependencyClosureError(
      "INVALID_DATABASE_OBJECT_IDENTIFIER",
      identifier,
    );
  }
  const parts = identifier.split(".");
  if (parts.length !== 2 || parts.some((part) => part.length === 0)) {
    throw new MigrationDependencyClosureError(
      "INVALID_DATABASE_OBJECT_IDENTIFIER",
      identifier,
    );
  }
  return parts.map((value) => {
    const quoted =
      containsUppercaseAscii(value) ||
      !isUnquotedIdentifierStart(value[0]) ||
      [...value.slice(1)].some(
        (character) => !isUnquotedIdentifierContinue(character),
      );
    return {
      type: quoted ? "QUOTED_IDENTIFIER" : "UNQUOTED_IDENTIFIER",
      value,
      quoted,
      raw: value,
    };
  });
}

function qualifiedMatchesManifestIdentifier(reference, identifier) {
  const [schema, name] = manifestIdentifierComponents(identifier);
  return (
    reference.schema.value === schema.value &&
    reference.name.value === name.value
  );
}

function qualifiedSemanticKey(reference) {
  return JSON.stringify([reference.schema.value, reference.name.value]);
}

function displayIdentifierComponent(component) {
  return component.quoted
    ? `"${component.value.replaceAll('"', '""')}"`
    : component.value;
}

function displayQualifiedIdentifier(reference) {
  return `${displayIdentifierComponent(reference.schema)}.${displayIdentifierComponent(reference.name)}`;
}

function canonicalManifestIdentifierComponent(component) {
  const canBeUnquoted =
    !containsUppercaseAscii(component.value) &&
    isUnquotedIdentifierStart(component.value[0]) &&
    [...component.value.slice(1)].every(isUnquotedIdentifierContinue);
  return canBeUnquoted
    ? component.value
    : `"${component.value.replaceAll('"', '""')}"`;
}

function manifestIdentifierFromComponents(schema, name) {
  return `${canonicalManifestIdentifierComponent(schema)}.${canonicalManifestIdentifierComponent(name)}`;
}

function manifestIdentifierFromQualified(reference) {
  return manifestIdentifierFromComponents(reference.schema, reference.name);
}

function canonicalManifestIdentifier(identifier) {
  const [schema, name] = manifestIdentifierComponents(identifier);
  return manifestIdentifierFromComponents(schema, name);
}

function qualifiedOccurrences(sql, { includeExecutableDollarBodies = true } = {}) {
  const occurrences = [];
  for (const tokens of executableTokenScopes(sql, {
    includeExecutableDollarBodies,
  })) {
    for (let index = 0; index < tokens.length - 2; index += 1) {
      const reference = qualifiedIdentifierAt(tokens, index);
      if (!reference) continue;
      occurrences.push({
        ...reference,
        tokens,
        previous: tokens[index - 1] ?? null,
        next: tokens[index + 3] ?? null,
      });
      index += 2;
    }
  }
  return occurrences;
}

function extensionRegistryEntry(name) {
  for (const extension of EXTENSION_REGISTRY_V1) {
    if (extension.prohibitedAliases.includes(name)) {
      throw new MigrationDependencyClosureError(
        "PROHIBITED_EXTENSION_ALIAS",
        `${name}; use ${extension.canonicalName}`,
      );
    }
    if (extension.canonicalName === name) return extension;
  }
  throw new MigrationDependencyClosureError("UNREGISTERED_EXTENSION", name);
}

function extractCreateExtensionOccurrences(sql) {
  const tokens = executableTokenScopes(sql, {
    includeExecutableDollarBodies: false,
  })[0];
  const occurrences = [];

  for (let index = 0; index < tokens.length - 1; index += 1) {
    if (!isKeyword(tokens[index], "create") || !isKeyword(tokens[index + 1], "extension")) {
      continue;
    }
    const startToken = tokens[index];
    let terminatorIndex = index + 2;
    while (
      terminatorIndex < tokens.length &&
      !isPunctuation(tokens[terminatorIndex], ";")
    ) {
      terminatorIndex += 1;
    }
    if (terminatorIndex === tokens.length) {
      throw new MigrationDependencyClosureError(
        "UNTERMINATED_CREATE_EXTENSION",
        `offset ${startToken.start}`,
      );
    }

    let cursor = index + 2;
    let ifNotExists = false;
    if (
      isKeyword(tokens[cursor], "if") &&
      isKeyword(tokens[cursor + 1], "not") &&
      isKeyword(tokens[cursor + 2], "exists")
    ) {
      ifNotExists = true;
      cursor += 3;
    }

    const nameToken = tokens[cursor];
    if (!isIdentifierToken(nameToken)) {
      throw new MigrationDependencyClosureError(
        "UNRECOGNIZED_CREATE_EXTENSION",
        sql.slice(startToken.start, tokens[terminatorIndex].end).trim(),
      );
    }
    cursor += 1;
    extensionRegistryEntry(nameToken.value);

    let schemaToken = null;
    if (cursor < terminatorIndex) {
      if (isKeyword(tokens[cursor], "with")) cursor += 1;
      if (!isKeyword(tokens[cursor], "schema")) {
        throw new MigrationDependencyClosureError(
          "UNRECOGNIZED_CREATE_EXTENSION",
          sql.slice(startToken.start, tokens[terminatorIndex].end).trim(),
        );
      }
      cursor += 1;
      if (!isIdentifierToken(tokens[cursor])) {
        throw new MigrationDependencyClosureError(
          "UNRECOGNIZED_CREATE_EXTENSION",
          sql.slice(startToken.start, tokens[terminatorIndex].end).trim(),
        );
      }
      schemaToken = tokens[cursor];
      cursor += 1;
    }

    if (cursor !== terminatorIndex) {
      throw new MigrationDependencyClosureError(
        "UNRECOGNIZED_CREATE_EXTENSION",
        sql.slice(startToken.start, tokens[terminatorIndex].end).trim(),
      );
    }

    const exactStatement = sql
      .slice(startToken.start, tokens[terminatorIndex].end)
      .trim();
    occurrences.push({
      declaration: {
        name: nameToken.value,
        schema: schemaToken?.value ?? null,
        schemaSource: schemaToken ? "SQL_EXPLICIT" : "SQL_UNSPECIFIED",
        ifNotExists,
        statementOrdinal: occurrences.length + 1,
        statementSha256: sha256(exactStatement),
      },
      startOffset: startToken.start,
      nameToken,
      schemaToken,
    });
    index = terminatorIndex;
  }

  return occurrences;
}

function assertSupportedExtensionLifecycle(sql) {
  for (const scope of executableTokenScopeRecords(sql, {
    includeExecutableDollarBodies: true,
  })) {
    if (scope.kind === "STORED_ROUTINE_BODY") continue;
    const tokens = scope.tokens;
    for (let index = 0; index < tokens.length; index += 1) {
      if (
        isKeyword(tokens[index], "drop") &&
        isKeyword(tokens[index + 1], "extension")
      ) {
        throw new MigrationDependencyClosureError(
          "UNSUPPORTED_EXTENSION_LIFECYCLE_OPERATION",
          "DROP EXTENSION",
        );
      }
      if (
        !isKeyword(tokens[index], "alter") ||
        !isKeyword(tokens[index + 1], "extension") ||
        !isIdentifierToken(tokens[index + 2])
      ) {
        continue;
      }
      if (
        isKeyword(tokens[index + 3], "set") &&
        isKeyword(tokens[index + 4], "schema")
      ) {
        throw new MigrationDependencyClosureError(
          "UNSUPPORTED_EXTENSION_LIFECYCLE_OPERATION",
          "ALTER EXTENSION SET SCHEMA",
        );
      }
    }
  }
}

export function extractCreateExtensions(sql) {
  return extractCreateExtensionOccurrences(sql).map(
    (occurrence) => occurrence.declaration,
  );
}

function isFunctionUse(tokens, nameIndex) {
  return isPunctuation(tokens[nameIndex + 1], "(");
}

function hasKeywordPair(tokens, first, second) {
  return tokens.some(
    (token, index) => isKeyword(token, first) && isKeyword(tokens[index + 1], second),
  );
}

function statementRange(tokens, index) {
  let start = index;
  while (start > 0 && !isPunctuation(tokens[start - 1], ";")) start -= 1;
  let end = index;
  while (end < tokens.length && !isPunctuation(tokens[end], ";")) end += 1;
  return { start, end };
}

function qualifiedUnitEnd(tokens, start) {
  return qualifiedIdentifierAt(tokens, start)?.nextIndex ??
    (isIdentifierToken(tokens[start]) ? start + 1 : start);
}

function splitParenthesizedSegments(tokens, openIndex, closeIndex) {
  return splitTopLevelSegments(tokens, openIndex + 1, closeIndex);
}

function splitTopLevelSegments(tokens, startIndex, endIndex) {
  const segments = [];
  let start = startIndex;
  let depth = 0;
  for (let index = startIndex; index < endIndex; index += 1) {
    if (isPunctuation(tokens[index], "(")) depth += 1;
    if (isPunctuation(tokens[index], ")")) depth -= 1;
    if (depth === 0 && isPunctuation(tokens[index], ",")) {
      segments.push({ start, end: index });
      start = index + 1;
    }
  }
  segments.push({ start, end: endIndex });
  return segments;
}

const ROUTINE_BUILTIN_TYPE_ALIASES_V1 = new Map([
  ["bigint", "pg_catalog.int8"],
  ["bit", "pg_catalog.bit"],
  ["bool", "pg_catalog.bool"],
  ["boolean", "pg_catalog.bool"],
  ["bpchar", "pg_catalog.bpchar"],
  ["bytea", "pg_catalog.bytea"],
  ["char", "pg_catalog.bpchar"],
  ["character", "pg_catalog.bpchar"],
  ["date", "pg_catalog.date"],
  ["decimal", "pg_catalog.numeric"],
  ["float4", "pg_catalog.float4"],
  ["float8", "pg_catalog.float8"],
  ["float", "pg_catalog.float8"],
  ["int", "pg_catalog.int4"],
  ["int2", "pg_catalog.int2"],
  ["int4", "pg_catalog.int4"],
  ["int8", "pg_catalog.int8"],
  ["integer", "pg_catalog.int4"],
  ["interval", "pg_catalog.interval"],
  ["json", "pg_catalog.json"],
  ["jsonb", "pg_catalog.jsonb"],
  ["numeric", "pg_catalog.numeric"],
  ["oid", "pg_catalog.oid"],
  ["real", "pg_catalog.float4"],
  ["record", "pg_catalog.record"],
  ["regclass", "pg_catalog.regclass"],
  ["smallint", "pg_catalog.int2"],
  ["text", "pg_catalog.text"],
  ["time", "pg_catalog.time"],
  ["timetz", "pg_catalog.timetz"],
  ["timestamp", "pg_catalog.timestamp"],
  ["timestamptz", "pg_catalog.timestamptz"],
  ["trigger", "pg_catalog.trigger"],
  ["uuid", "pg_catalog.uuid"],
  ["varbit", "pg_catalog.varbit"],
  ["varchar", "pg_catalog.varchar"],
  ["void", "pg_catalog.void"],
]);

const ROUTINE_PG_CATALOG_TYPE_NAMES_V1 = new Map(
  [...new Set([...ROUTINE_BUILTIN_TYPE_ALIASES_V1.values(), "pg_catalog.char"])]
    .map((identifier) => [identifier.slice("pg_catalog.".length), identifier]),
);

const ROUTINE_COMPOUND_BUILTIN_TYPES_V1 = Object.freeze([
  Object.freeze({ words: Object.freeze(["timestamp", "with", "time", "zone"]), canonical: "pg_catalog.timestamptz" }),
  Object.freeze({ words: Object.freeze(["timestamp", "without", "time", "zone"]), canonical: "pg_catalog.timestamp" }),
  Object.freeze({ words: Object.freeze(["time", "with", "time", "zone"]), canonical: "pg_catalog.timetz" }),
  Object.freeze({ words: Object.freeze(["time", "without", "time", "zone"]), canonical: "pg_catalog.time" }),
  Object.freeze({ words: Object.freeze(["double", "precision"]), canonical: "pg_catalog.float8" }),
  Object.freeze({ words: Object.freeze(["character", "varying"]), canonical: "pg_catalog.varchar" }),
  Object.freeze({ words: Object.freeze(["bit", "varying"]), canonical: "pg_catalog.varbit" }),
]);

function canonicalRoutineTypeAt(tokens, start, end) {
  if (start >= end || !isIdentifierToken(tokens[start])) return null;
  let cursor = start;
  let canonical = null;
  let compoundBuiltin = false;
  let builtinKeyword = null;

  const qualified = qualifiedIdentifierAt(tokens, cursor);
  if (qualified && qualified.nextIndex <= end) {
    if (
      qualified.schema.value === "pg_catalog" &&
      ROUTINE_PG_CATALOG_TYPE_NAMES_V1.has(qualified.name.value)
    ) {
      canonical = ROUTINE_PG_CATALOG_TYPE_NAMES_V1.get(qualified.name.value);
      builtinKeyword = qualified.name.value;
    } else {
      canonical = `qualified:${qualifiedSemanticKey(qualified)}`;
    }
    cursor = qualified.nextIndex;
  } else {
    const compound = ROUTINE_COMPOUND_BUILTIN_TYPES_V1.find(
      (candidate) =>
        candidate.words.length <= end - cursor &&
        candidate.words.every((word, offset) =>
          isKeyword(tokens[cursor + offset], word),
        ),
    );
    if (compound) {
      canonical = compound.canonical;
      compoundBuiltin = true;
      cursor += compound.words.length;
    } else if (tokens[cursor].type === "UNQUOTED_IDENTIFIER") {
      builtinKeyword = tokens[cursor].value;
      canonical = ROUTINE_BUILTIN_TYPE_ALIASES_V1.get(builtinKeyword) ??
        (builtinKeyword === "vector" ? "extension.vector" : null);
      if (canonical === null) {
        if (cursor + 1 < end) return null;
        throw new MigrationDependencyClosureError(
          "UNQUALIFIED_CUSTOM_ROUTINE_TYPE_UNSUPPORTED",
          tokens[cursor].raw,
        );
      }
      cursor += 1;
    } else {
      canonical = ROUTINE_PG_CATALOG_TYPE_NAMES_V1.get(tokens[cursor].value) ?? null;
      if (canonical === null) {
        if (cursor + 1 < end) return null;
        throw new MigrationDependencyClosureError(
          "UNQUALIFIED_CUSTOM_ROUTINE_TYPE_UNSUPPORTED",
          tokens[cursor].raw,
        );
      }
      builtinKeyword = tokens[cursor].value;
      cursor += 1;
    }
  }

  let typmodValues = null;
  if (isPunctuation(tokens[cursor], "(")) {
    const closeIndex = matchingCloseIndex(tokens, cursor);
    if (closeIndex === -1 || closeIndex >= end) return null;
    for (let index = cursor + 1; index < closeIndex; index += 1) {
      if (tokens[index].type !== "NUMBER" && !isPunctuation(tokens[index], ",")) {
        return null;
      }
    }
    typmodValues = tokens
      .slice(cursor + 1, closeIndex)
      .filter((token) => token.type === "NUMBER")
      .map((token) => Number(token.value));
    cursor = closeIndex + 1;
  }

  if (builtinKeyword === "float" && typmodValues !== null) {
    if (typmodValues.length !== 1 || typmodValues[0] < 1 || typmodValues[0] > 53) {
      throw new MigrationDependencyClosureError(
        "UNSUPPORTED_ROUTINE_TYPE_SYNTAX",
        tokens.slice(start, end).map((token) => token.raw).join(" "),
      );
    }
    canonical = typmodValues[0] <= 24 ? "pg_catalog.float4" : "pg_catalog.float8";
  }

  if (
    ["time", "timestamp"].includes(builtinKeyword) &&
    (isKeyword(tokens[cursor], "with") || isKeyword(tokens[cursor], "without")) &&
    isKeyword(tokens[cursor + 1], "time") &&
    isKeyword(tokens[cursor + 2], "zone")
  ) {
    canonical = isKeyword(tokens[cursor], "with")
      ? builtinKeyword === "time"
        ? "pg_catalog.timetz"
        : "pg_catalog.timestamptz"
      : builtinKeyword === "time"
        ? "pg_catalog.time"
        : "pg_catalog.timestamp";
    cursor += 3;
  }

  if (builtinKeyword === "interval") {
    const intervalFields = ["year", "month", "day", "hour", "minute", "second"];
    const firstField = intervalFields.find((field) =>
      isKeyword(tokens[cursor], field),
    );
    if (firstField) {
      cursor += 1;
      let lastField = firstField;
      if (isKeyword(tokens[cursor], "to")) {
        cursor += 1;
        const secondField = intervalFields.find((field) =>
          isKeyword(tokens[cursor], field),
        );
        const supportedRange = new Set([
          "year:month",
          "day:hour",
          "day:minute",
          "day:second",
          "hour:minute",
          "hour:second",
          "minute:second",
        ]);
        if (!secondField || !supportedRange.has(`${firstField}:${secondField}`)) {
          return null;
        }
        lastField = secondField;
        cursor += 1;
      }
      if (isPunctuation(tokens[cursor], "(")) {
        const closeIndex = matchingCloseIndex(tokens, cursor);
        if (
          closeIndex === -1 ||
          closeIndex >= end ||
          closeIndex !== cursor + 2 ||
          tokens[cursor + 1]?.type !== "NUMBER" ||
          lastField !== "second"
        ) {
          return null;
        }
        cursor = closeIndex + 1;
      }
    }
  }

  let arrayDimensions = 0;
  while (isPunctuation(tokens[cursor], "[")) {
    if (
      !isPunctuation(tokens[cursor + 1], "]") &&
      !(tokens[cursor + 1]?.type === "NUMBER" && isPunctuation(tokens[cursor + 2], "]"))
    ) {
      return null;
    }
    cursor += tokens[cursor + 1]?.type === "NUMBER" ? 3 : 2;
    arrayDimensions += 1;
  }
  if (cursor !== end) return null;
  return {
    canonical: `${canonical}${arrayDimensions > 0 ? "[]" : ""}`,
    compoundBuiltin,
  };
}

function routineInputTypeSegment(tokens, start, end) {
  let cursor = start;
  let mode = "in";
  if (
    ["in", "out", "inout", "variadic"].some((keyword) =>
      isKeyword(tokens[cursor], keyword),
    )
  ) {
    mode = tokens[cursor].value;
    cursor += 1;
  }

  let typeEnd = end;
  let depth = 0;
  for (let index = cursor; index < end; index += 1) {
    if (isPunctuation(tokens[index], "(")) depth += 1;
    if (isPunctuation(tokens[index], ")")) depth -= 1;
    if (
      depth === 0 &&
      (isKeyword(tokens[index], "default") ||
        (tokens[index]?.type === "OPERATOR" && tokens[index].value === "="))
    ) {
      typeEnd = index;
      break;
    }
  }

  const unnamed = canonicalRoutineTypeAt(tokens, cursor, typeEnd);
  const named = !unnamed?.compoundBuiltin && isIdentifierToken(tokens[cursor])
    ? canonicalRoutineTypeAt(tokens, cursor + 1, typeEnd)
    : null;
  if (unnamed && named && !unnamed.compoundBuiltin) {
    throw new MigrationDependencyClosureError(
      "AMBIGUOUS_ROUTINE_SIGNATURE",
      tokens.slice(cursor, typeEnd).map((token) => token.raw).join(" "),
    );
  }
  const selected = unnamed?.compoundBuiltin ? unnamed : unnamed ?? named;
  const typeStart = unnamed?.compoundBuiltin || (unnamed && !named)
    ? cursor
    : cursor + 1;
  if (!selected || typeStart >= typeEnd) {
    throw new MigrationDependencyClosureError(
      "UNRECOGNIZED_ROUTINE_SIGNATURE",
      tokens.slice(start, end).map((token) => token.raw).join(" "),
    );
  }
  return { mode, typeStart, canonical: selected.canonical };
}

function declarationTypeStart(tokens, start, end, { allowUnnamed }) {
  if (allowUnnamed) {
    return routineInputTypeSegment(tokens, start, end).typeStart;
  }
  let cursor = start;
  while (
    ["in", "out", "inout", "variadic"].some((keyword) =>
      isKeyword(tokens[cursor], keyword),
    )
  ) {
    cursor += 1;
  }
  if (cursor >= end || !isIdentifierToken(tokens[cursor])) return -1;
  const firstUnitEnd = qualifiedUnitEnd(tokens, cursor);
  if (firstUnitEnd === cursor) return -1;
  return isIdentifierToken(tokens[firstUnitEnd]) ? firstUnitEnd : -1;
}

function typeMatchesDeclarationSegment(
  tokens,
  typeStart,
  segment,
  options,
) {
  return declarationTypeStart(tokens, segment.start, segment.end, options) === typeStart;
}

function createKindIndex(tokens, start, end, kinds) {
  let cursor = start;
  if (!isKeyword(tokens[cursor], "create")) return -1;
  cursor += 1;
  if (isKeyword(tokens[cursor], "or") && isKeyword(tokens[cursor + 1], "replace")) {
    cursor += 2;
  }
  while (
    ["global", "local", "temp", "temporary", "unlogged"].some((keyword) =>
      isKeyword(tokens[cursor], keyword),
    )
  ) {
    cursor += 1;
  }
  return cursor < end && kinds.some((kind) => isKeyword(tokens[cursor], kind))
    ? cursor
    : -1;
}

function createTableKindIndex(tokens, start, end) {
  const direct = createKindIndex(tokens, start, end, ["table"]);
  if (direct !== -1) return direct;
  const foreign = createKindIndex(tokens, start, end, ["foreign"]);
  return foreign !== -1 && isKeyword(tokens[foreign + 1], "table")
    ? foreign + 1
    : -1;
}

function declarationListContainsType(
  tokens,
  typeStart,
  openIndex,
  closeIndex,
  options,
) {
  return splitParenthesizedSegments(tokens, openIndex, closeIndex).some(
    (segment) =>
      typeMatchesDeclarationSegment(tokens, typeStart, segment, options),
  );
}

function routineSignatureAt(tokens, openIndex) {
  const closeIndex = matchingCloseIndex(tokens, openIndex);
  if (closeIndex === -1) {
    throw new MigrationDependencyClosureError(
      "UNBALANCED_SQL_PUNCTUATION",
      tokens[openIndex]?.raw ?? "routine signature",
    );
  }

  const inputTypes = [];
  for (const segment of splitParenthesizedSegments(
    tokens,
    openIndex,
    closeIndex,
  )) {
    if (segment.start === segment.end) continue;
    const parsed = routineInputTypeSegment(tokens, segment.start, segment.end);
    if (parsed.mode === "out") continue;
    inputTypes.push(parsed.canonical);
  }
  return {
    canonical: `(${inputTypes.join(",")})`,
    closeIndex,
  };
}

const ROUTINE_RETURN_OPTION_KEYWORDS_V1 = Object.freeze([
  "language",
  "transform",
  "window",
  "immutable",
  "stable",
  "volatile",
  "leakproof",
  "called",
  "strict",
  "security",
  "parallel",
  "cost",
  "rows",
  "support",
  "set",
  "as",
]);

function validateRoutineReturnTypes(tokens, signatureCloseIndex) {
  let returnsIndex = -1;
  let depth = 0;
  for (let index = signatureCloseIndex + 1; index < tokens.length; index += 1) {
    if (isPunctuation(tokens[index], "(")) depth += 1;
    if (isPunctuation(tokens[index], ")")) depth -= 1;
    if (depth === 0 && isKeyword(tokens[index], "returns")) {
      returnsIndex = index;
      break;
    }
  }
  if (returnsIndex === -1) return;

  let cursor = returnsIndex + 1;
  if (isKeyword(tokens[cursor], "table")) {
    const openIndex = cursor + 1;
    const closeIndex = isPunctuation(tokens[openIndex], "(")
      ? matchingCloseIndex(tokens, openIndex)
      : -1;
    if (closeIndex === -1) {
      throw new MigrationDependencyClosureError(
        "UNRECOGNIZED_ROUTINE_RETURN_TYPE",
        "RETURNS TABLE",
      );
    }
    for (const segment of splitParenthesizedSegments(tokens, openIndex, closeIndex)) {
      if (segment.start === segment.end) continue;
      routineInputTypeSegment(tokens, segment.start, segment.end);
    }
    return;
  }
  if (isKeyword(tokens[cursor], "setof")) cursor += 1;
  let end = cursor;
  depth = 0;
  while (end < tokens.length) {
    if (isPunctuation(tokens[end], "(")) depth += 1;
    if (isPunctuation(tokens[end], ")")) depth -= 1;
    if (
      depth === 0 &&
      end > cursor &&
      ROUTINE_RETURN_OPTION_KEYWORDS_V1.some((keyword) =>
        isKeyword(tokens[end], keyword),
      )
    ) {
      break;
    }
    end += 1;
  }
  if (!canonicalRoutineTypeAt(tokens, cursor, end)) {
    throw new MigrationDependencyClosureError(
      "UNRECOGNIZED_ROUTINE_RETURN_TYPE",
      tokens.slice(cursor, end).map((token) => token.raw).join(" "),
    );
  }
}

function routineSignatureContainsType(
  tokens,
  typeStart,
  statementStart,
  statementEnd,
) {
  for (let index = statementStart; index < statementEnd; index += 1) {
    if (
      !isKeyword(tokens[index], "function") &&
      !isKeyword(tokens[index], "procedure") &&
      !isKeyword(tokens[index], "routine")
    ) {
      continue;
    }
    const reference = qualifiedIdentifierAt(tokens, index + 1);
    if (!reference || !isPunctuation(tokens[reference.nextIndex], "(")) {
      continue;
    }
    const openIndex = reference.nextIndex;
    const closeIndex = matchingCloseIndex(tokens, openIndex);
    if (
      closeIndex !== -1 &&
      typeStart > openIndex &&
      typeStart < closeIndex &&
      declarationListContainsType(
        tokens,
        typeStart,
        openIndex,
        closeIndex,
        { allowUnnamed: true },
      )
    ) {
      return true;
    }
    index = closeIndex === -1 ? index : closeIndex;
  }
  return false;
}

function aggregateSignatureSegments(tokens, openIndex, closeIndex) {
  let orderIndex = -1;
  let depth = 0;
  for (let index = openIndex + 1; index < closeIndex; index += 1) {
    if (isPunctuation(tokens[index], "(")) depth += 1;
    if (isPunctuation(tokens[index], ")")) depth -= 1;
    if (
      depth === 0 &&
      isKeyword(tokens[index], "order") &&
      isKeyword(tokens[index + 1], "by")
    ) {
      orderIndex = index;
      break;
    }
  }
  if (orderIndex === -1) {
    return splitParenthesizedSegments(tokens, openIndex, closeIndex);
  }
  return [
    ...splitTopLevelSegments(tokens, openIndex + 1, orderIndex),
    ...splitTopLevelSegments(tokens, orderIndex + 2, closeIndex),
  ].filter((segment) => segment.start < segment.end);
}

function aggregateSignatureContainsType(tokens, typeStart, openIndex, closeIndex) {
  return aggregateSignatureSegments(tokens, openIndex, closeIndex).some(
    (segment) =>
      typeStart >= segment.start &&
      typeStart < segment.end &&
      typeMatchesDeclarationSegment(tokens, typeStart, segment, {
        allowUnnamed: true,
      }),
  );
}

function operatorIdentitySignatureContainsType(
  tokens,
  typeStart,
  openIndex,
  closeIndex,
) {
  const segments = splitParenthesizedSegments(tokens, openIndex, closeIndex);
  if (segments.length !== 2) return false;
  const segment = segments.find(
    (candidate) => typeStart >= candidate.start && typeStart < candidate.end,
  );
  if (!segment) return false;
  if (
    segment.end === segment.start + 1 &&
    isKeyword(tokens[segment.start], "none")
  ) {
    return false;
  }
  return typeMatchesDeclarationSegment(tokens, typeStart, segment, {
    allowUnnamed: true,
  });
}

function operatorSignatureContainsType(
  tokens,
  typeStart,
  statementStart,
  statementEnd,
  commandKindIndex,
) {
  for (let openIndex = statementStart; openIndex < statementEnd; openIndex += 1) {
    if (
      !isPunctuation(tokens[openIndex], "(") ||
      parenthesisDepthAt(tokens, statementStart, openIndex) !== 0
    ) {
      continue;
    }
    const closeIndex = matchingCloseIndex(tokens, openIndex);
    if (closeIndex === -1 || typeStart <= openIndex || typeStart >= closeIndex) {
      continue;
    }
    let clauseKindIndex = -1;
    for (let index = commandKindIndex + 1; index < openIndex; index += 1) {
      if (
        parenthesisDepthAt(tokens, statementStart, index) === 0 &&
        (isKeyword(tokens[index], "operator") ||
          isKeyword(tokens[index], "function"))
      ) {
        clauseKindIndex = index;
      }
    }
    if (
      clauseKindIndex !== -1 &&
      declarationListContainsType(
        tokens,
        typeStart,
        openIndex,
        closeIndex,
        { allowUnnamed: true },
      )
    ) {
      return true;
    }
  }
  return false;
}

function transformTargetTypeStart(tokens, statementStart, statementEnd) {
  let cursor = statementStart;
  if (isKeyword(tokens[cursor], "create")) {
    cursor += 1;
    if (isKeyword(tokens[cursor], "or") && isKeyword(tokens[cursor + 1], "replace")) {
      cursor += 2;
    }
    if (!isKeyword(tokens[cursor], "transform")) return -1;
    cursor += 1;
  } else if (isKeyword(tokens[cursor], "drop")) {
    cursor += 1;
    if (!isKeyword(tokens[cursor], "transform")) return -1;
    cursor += 1;
    if (isKeyword(tokens[cursor], "if") && isKeyword(tokens[cursor + 1], "exists")) {
      cursor += 2;
    }
  } else {
    return -1;
  }
  if (!isKeyword(tokens[cursor], "for")) return -1;
  cursor += 1;
  return cursor < statementEnd && isIdentifierToken(tokens[cursor]) ? cursor : -1;
}

function castTypePositionContainsType(
  tokens,
  typeStart,
  openIndex,
  closeIndex,
  { includeSource },
) {
  let depth = 0;
  const asIndexes = [];
  for (let index = openIndex + 1; index < closeIndex; index += 1) {
    if (isPunctuation(tokens[index], "(")) {
      depth += 1;
      continue;
    }
    if (isPunctuation(tokens[index], ")")) {
      depth -= 1;
      continue;
    }
    if (depth === 0 && isKeyword(tokens[index], "as")) asIndexes.push(index);
  }
  if (asIndexes.length !== 1) return false;
  return (
    typeStart === asIndexes[0] + 1 ||
    (includeSource && typeStart === openIndex + 1)
  );
}

function routineTransformContainsType(
  tokens,
  typeStart,
  statementStart,
  statementEnd,
) {
  const routineKindIndex = createKindIndex(
    tokens,
    statementStart,
    statementEnd,
    ["function", "procedure"],
  );
  if (
    routineKindIndex === -1 ||
    !isKeyword(tokens[typeStart - 1], "type") ||
    !isKeyword(tokens[typeStart - 2], "for")
  ) {
    return false;
  }
  return tokens.some(
    (token, index) =>
      index > routineKindIndex &&
      index < typeStart - 2 &&
      isKeyword(token, "transform") &&
      parenthesisDepthAt(tokens, statementStart, index) === 0,
  );
}

function routineReturnContainsType(
  tokens,
  typeStart,
  statementStart,
  statementEnd,
) {
  const routineKindIndex = createKindIndex(
    tokens,
    statementStart,
    statementEnd,
    ["function", "procedure"],
  );
  if (routineKindIndex === -1) return false;
  const targetEnd = qualifiedUnitEnd(tokens, routineKindIndex + 1);
  if (!isPunctuation(tokens[targetEnd], "(")) return false;
  const signatureCloseIndex = matchingCloseIndex(tokens, targetEnd);
  if (signatureCloseIndex === -1) return false;
  const returnsIndex = topLevelKeywordIndex(
    tokens,
    signatureCloseIndex + 1,
    statementEnd,
    "returns",
  );
  if (returnsIndex === -1) return false;
  let cursor = returnsIndex + 1;
  if (isKeyword(tokens[cursor], "table")) {
    const openIndex = cursor + 1;
    const closeIndex = isPunctuation(tokens[openIndex], "(")
      ? matchingCloseIndex(tokens, openIndex)
      : -1;
    return (
      closeIndex !== -1 &&
      typeStart > openIndex &&
      typeStart < closeIndex &&
      declarationListContainsType(tokens, typeStart, openIndex, closeIndex, {
        allowUnnamed: false,
      })
    );
  }
  if (isKeyword(tokens[cursor], "setof")) cursor += 1;
  return typeStart === cursor;
}

function typedTableOfContainsType(
  tokens,
  typeStart,
  statementStart,
  statementEnd,
) {
  const createTableIndex = createTableKindIndex(
    tokens,
    statementStart,
    statementEnd,
  );
  if (createTableIndex !== -1) {
    let cursor = createTableIndex + 1;
    if (
      isKeyword(tokens[cursor], "if") &&
      isKeyword(tokens[cursor + 1], "not") &&
      isKeyword(tokens[cursor + 2], "exists")
    ) {
      cursor += 3;
    }
    cursor = qualifiedUnitEnd(tokens, cursor);
    return isKeyword(tokens[cursor], "of") && typeStart === cursor + 1;
  }

  let cursor = statementStart;
  if (!isKeyword(tokens[cursor], "alter")) return false;
  cursor += 1;
  if (isKeyword(tokens[cursor], "foreign")) cursor += 1;
  if (!isKeyword(tokens[cursor], "table")) return false;
  cursor += 1;
  if (isKeyword(tokens[cursor], "if") && isKeyword(tokens[cursor + 1], "exists")) {
    cursor += 2;
  }
  if (isKeyword(tokens[cursor], "only")) cursor += 1;
  cursor = qualifiedUnitEnd(tokens, cursor);
  if (tokens[cursor]?.type === "OPERATOR" && tokens[cursor].value === "*") cursor += 1;
  return isKeyword(tokens[cursor], "of") && typeStart === cursor + 1;
}

function ordinaryObjectSignatureTargetStart(
  tokens,
  statementStart,
  statementEnd,
  kind,
  { includeCreate },
) {
  if (includeCreate) {
    const kindIndex = createKindIndex(
      tokens,
      statementStart,
      statementEnd,
      [kind],
    );
    if (kindIndex !== -1) return kindIndex + 1;
  }
  let cursor = statementStart;
  if (isKeyword(tokens[cursor], "alter") || isKeyword(tokens[cursor], "drop")) {
    cursor += 1;
    if (!isKeyword(tokens[cursor], kind)) return -1;
    cursor += 1;
    if (isKeyword(tokens[cursor], "if") && isKeyword(tokens[cursor + 1], "exists")) {
      cursor += 2;
    }
    return cursor;
  }
  if (
    isKeyword(tokens[cursor], "comment") &&
    isKeyword(tokens[cursor + 1], "on") &&
    isKeyword(tokens[cursor + 2], kind)
  ) {
    return cursor + 3;
  }
  return -1;
}

function ordinaryObjectSignatureContainsType(
  tokens,
  typeStart,
  statementStart,
  statementEnd,
  kind,
) {
  let cursor = ordinaryObjectSignatureTargetStart(
    tokens,
    statementStart,
    statementEnd,
    kind,
    { includeCreate: kind === "aggregate" },
  );
  if (cursor === -1) return false;
  while (cursor < statementEnd) {
    let openIndex = qualifiedUnitEnd(tokens, cursor);
    if (kind === "operator") {
      openIndex = cursor;
      while (
        openIndex < statementEnd &&
        !isPunctuation(tokens[openIndex], "(")
      ) {
        openIndex += 1;
      }
    }
    if (openIndex === cursor || !isPunctuation(tokens[openIndex], "(")) return false;
    const closeIndex = matchingCloseIndex(tokens, openIndex);
    if (closeIndex === -1) return false;
    if (typeStart > openIndex && typeStart < closeIndex) {
      return kind === "aggregate"
        ? aggregateSignatureContainsType(tokens, typeStart, openIndex, closeIndex)
        : operatorIdentitySignatureContainsType(
            tokens,
            typeStart,
            openIndex,
            closeIndex,
          );
    }
    cursor = closeIndex + 1;
    if (!isPunctuation(tokens[cursor], ",")) return false;
    cursor += 1;
  }
  return false;
}

function castObjectOperationContainsType(
  tokens,
  typeStart,
  statementStart,
  statementEnd,
) {
  let castIndex = createKindIndex(
    tokens,
    statementStart,
    statementEnd,
    ["cast"],
  );
  if (
    castIndex === -1 &&
    isKeyword(tokens[statementStart], "drop") &&
    isKeyword(tokens[statementStart + 1], "cast")
  ) {
    castIndex = statementStart + 1;
  }
  if (
    castIndex === -1 &&
    isKeyword(tokens[statementStart], "comment") &&
    isKeyword(tokens[statementStart + 1], "on") &&
    isKeyword(tokens[statementStart + 2], "cast")
  ) {
    castIndex = statementStart + 2;
  }
  if (castIndex === -1) return false;
  let openIndex = castIndex + 1;
  if (isKeyword(tokens[openIndex], "if") && isKeyword(tokens[openIndex + 1], "exists")) {
    openIndex += 2;
  }
  if (!isPunctuation(tokens[openIndex], "(")) return false;
  const closeIndex = matchingCloseIndex(tokens, openIndex);
  return (
    closeIndex !== -1 &&
    typeStart > openIndex &&
    typeStart < closeIndex &&
    castTypePositionContainsType(tokens, typeStart, openIndex, closeIndex, {
      includeSource: true,
    })
  );
}

function alterExtensionMemberContainsType(
  tokens,
  typeStart,
  statementStart,
  statementEnd,
) {
  if (
    !isKeyword(tokens[statementStart], "alter") ||
    !isKeyword(tokens[statementStart + 1], "extension")
  ) {
    return false;
  }
  const extensionNameIndex = statementStart + 2;
  if (!isIdentifierToken(tokens[extensionNameIndex])) return false;
  const operationIndex = extensionNameIndex + 1;
  if (
    !isKeyword(tokens[operationIndex], "add") &&
    !isKeyword(tokens[operationIndex], "drop")
  ) {
    return false;
  }
  const memberKindIndex = operationIndex + 1;

  if (isKeyword(tokens[memberKindIndex], "transform")) {
    return (
      isKeyword(tokens[memberKindIndex + 1], "for") &&
      typeStart === memberKindIndex + 2
    );
  }

  if (isKeyword(tokens[memberKindIndex], "cast")) {
    const openIndex = memberKindIndex + 1;
    const closeIndex = isPunctuation(tokens[openIndex], "(")
      ? matchingCloseIndex(tokens, openIndex)
      : -1;
    return (
      closeIndex !== -1 &&
      castTypePositionContainsType(
        tokens,
        typeStart,
        openIndex,
        closeIndex,
        { includeSource: true },
      )
    );
  }

  if (isKeyword(tokens[memberKindIndex], "aggregate")) {
    const openIndex = qualifiedUnitEnd(tokens, memberKindIndex + 1);
    const closeIndex = isPunctuation(tokens[openIndex], "(")
      ? matchingCloseIndex(tokens, openIndex)
      : -1;
    return (
      closeIndex !== -1 &&
      typeStart > openIndex &&
      typeStart < closeIndex &&
      aggregateSignatureContainsType(tokens, typeStart, openIndex, closeIndex)
    );
  }

  if (isKeyword(tokens[memberKindIndex], "operator")) {
    let openIndex = memberKindIndex + 1;
    while (
      openIndex < statementEnd &&
      !isPunctuation(tokens[openIndex], "(")
    ) {
      openIndex += 1;
    }
    const closeIndex =
      openIndex < statementEnd ? matchingCloseIndex(tokens, openIndex) : -1;
    return (
      closeIndex !== -1 &&
      typeStart > openIndex &&
      typeStart < closeIndex &&
      operatorIdentitySignatureContainsType(
        tokens,
        typeStart,
        openIndex,
        closeIndex,
      )
    );
  }

  return false;
}

function isTypeUse(tokens, startIndex, nameIndex) {
  const previous = tokens[startIndex - 1];
  const { start: statementStart, end: statementEnd } = statementRange(
    tokens,
    startIndex,
  );
  const statement = tokens.slice(statementStart, statementEnd);
  const command = tokens[statementStart];
  if (hasKeywordPair(statement, "create", "extension")) return false;
  if (previous?.type === "OPERATOR" && previous.value === "::") return true;
  if (
    routineReturnContainsType(
      tokens,
      startIndex,
      statementStart,
      statementEnd,
    )
  ) {
    return true;
  }
  if (transformTargetTypeStart(tokens, statementStart, statementEnd) === startIndex) {
    return true;
  }
  if (
    routineTransformContainsType(
      tokens,
      startIndex,
      statementStart,
      statementEnd,
    ) ||
    alterExtensionMemberContainsType(
      tokens,
      startIndex,
      statementStart,
      statementEnd,
    )
  ) {
    return true;
  }
  if (
    isKeyword(previous, "type") &&
    (isKeyword(command, "alter") ||
      isKeyword(command, "drop") ||
      ((isKeyword(command, "grant") || isKeyword(command, "revoke")) &&
        statement.some((token) => isKeyword(token, "on"))) ||
      (isKeyword(command, "comment") &&
        statement.some((token) => isKeyword(token, "on"))))
  ) {
    return true;
  }
  if (typedTableOfContainsType(tokens, startIndex, statementStart, statementEnd)) {
    return true;
  }
  if (
    previous?.type === "OPERATOR" &&
    previous.value === "=" &&
    isKeyword(tokens[startIndex - 2], "subtype") &&
    createKindIndex(tokens, statementStart, statementEnd, ["type"]) !== -1 &&
    statement.some((token) => isKeyword(token, "range"))
  ) {
    return true;
  }
  if (
    previous?.type === "OPERATOR" &&
    previous.value === "=" &&
    isKeyword(tokens[startIndex - 2], "element") &&
    createKindIndex(tokens, statementStart, statementEnd, ["type"]) !== -1
  ) {
    return true;
  }
  if (
    previous?.type === "OPERATOR" &&
    previous.value === "=" &&
    ["stype", "mstype", "basetype"].some((keyword) =>
      isKeyword(tokens[startIndex - 2], keyword),
    ) &&
    createKindIndex(tokens, statementStart, statementEnd, ["aggregate"]) !== -1
  ) {
    return true;
  }
  if (
    previous?.type === "OPERATOR" &&
    previous.value === "=" &&
    ["leftarg", "rightarg"].some((keyword) =>
      isKeyword(tokens[startIndex - 2], keyword),
    ) &&
    createKindIndex(tokens, statementStart, statementEnd, ["operator"]) !== -1
  ) {
    return true;
  }

  if (isKeyword(tokens[statementStart], "prepare")) {
    let openIndex = statementStart + 2;
    if (isPunctuation(tokens[openIndex], "(")) {
      const closeIndex = matchingCloseIndex(tokens, openIndex);
      if (
        closeIndex !== -1 &&
        startIndex > openIndex &&
        startIndex < closeIndex &&
        declarationListContainsType(
          tokens,
          startIndex,
          openIndex,
          closeIndex,
          { allowUnnamed: true },
        )
      ) {
        return true;
      }
    }
  }

  const aggregateKindIndex = createKindIndex(
    tokens,
    statementStart,
    statementEnd,
    ["aggregate"],
  );
  if (aggregateKindIndex !== -1) {
    const openIndex = qualifiedUnitEnd(tokens, aggregateKindIndex + 1);
    const closeIndex = isPunctuation(tokens[openIndex], "(")
      ? matchingCloseIndex(tokens, openIndex)
      : -1;
    if (
      closeIndex !== -1 &&
      startIndex > openIndex &&
      startIndex < closeIndex &&
      aggregateSignatureContainsType(tokens, startIndex, openIndex, closeIndex)
    ) {
      return true;
    }
  }

  if (
    ordinaryObjectSignatureContainsType(
      tokens,
      startIndex,
      statementStart,
      statementEnd,
      "aggregate",
    ) ||
    ordinaryObjectSignatureContainsType(
      tokens,
      startIndex,
      statementStart,
      statementEnd,
      "operator",
    ) ||
    castObjectOperationContainsType(
      tokens,
      startIndex,
      statementStart,
      statementEnd,
    )
  ) {
    return true;
  }

  const operatorKindIndex = createKindIndex(
    tokens,
    statementStart,
    statementEnd,
    ["operator"],
  );
  const isOperatorClass =
    operatorKindIndex !== -1 && isKeyword(tokens[operatorKindIndex + 1], "class");
  if (isOperatorClass) {
    if (
      (isKeyword(previous, "type") && isKeyword(tokens[startIndex - 2], "for")) ||
      isKeyword(previous, "storage")
    ) {
      return true;
    }
    if (
      operatorSignatureContainsType(
        tokens,
        startIndex,
        statementStart,
        statementEnd,
        operatorKindIndex,
      )
    ) {
      return true;
    }
  }

  const isAlterOperatorFamily =
    isKeyword(command, "alter") &&
    isKeyword(tokens[statementStart + 1], "operator") &&
    isKeyword(tokens[statementStart + 2], "family");
  if (isAlterOperatorFamily) {
    if (
      operatorSignatureContainsType(
        tokens,
        startIndex,
        statementStart,
        statementEnd,
        statementStart + 2,
      )
    ) {
      return true;
    }
  }

  for (let index = statementStart; index < statementEnd; index += 1) {
    if (!isKeyword(tokens[index], "cast") || !isPunctuation(tokens[index + 1], "(")) {
      continue;
    }
    const openIndex = index + 1;
    const closeIndex = matchingCloseIndex(tokens, openIndex);
    const createCast =
      createKindIndex(tokens, statementStart, statementEnd, ["cast"]) !== -1;
    if (
      closeIndex !== -1 &&
      startIndex > openIndex &&
      startIndex < closeIndex &&
      castTypePositionContainsType(
        tokens,
        startIndex,
        openIndex,
        closeIndex,
        { includeSource: createCast },
      )
    ) {
      return true;
    }
  }

  if (
    routineSignatureContainsType(
      tokens,
      startIndex,
      statementStart,
      statementEnd,
    )
  ) {
    return true;
  }

  const routineKindIndex = createKindIndex(
    tokens,
    statementStart,
    statementEnd,
    ["function", "procedure"],
  );
  if (routineKindIndex !== -1) {
    let cursor = routineKindIndex + 1;
    cursor = qualifiedUnitEnd(tokens, cursor);
    const openIndex = cursor;
    const closeIndex = isPunctuation(tokens[openIndex], "(")
      ? matchingCloseIndex(tokens, openIndex)
      : -1;
    if (
      closeIndex !== -1 &&
      startIndex > openIndex &&
      startIndex < closeIndex &&
      declarationListContainsType(
        tokens,
        startIndex,
        openIndex,
        closeIndex,
        { allowUnnamed: true },
      )
    ) {
      return true;
    }
  }

  const tableKindIndex = createTableKindIndex(
    tokens,
    statementStart,
    statementEnd,
  );
  if (tableKindIndex !== -1) {
    let cursor = tableKindIndex + 1;
    if (
      isKeyword(tokens[cursor], "if") &&
      isKeyword(tokens[cursor + 1], "not") &&
      isKeyword(tokens[cursor + 2], "exists")
    ) {
      cursor += 3;
    }
    cursor = qualifiedUnitEnd(tokens, cursor);
    if (isPunctuation(tokens[cursor], "(")) {
      const closeIndex = matchingCloseIndex(tokens, cursor);
      const constraintKeywords = [
        "constraint",
        "primary",
        "unique",
        "check",
        "foreign",
        "exclude",
        "like",
      ];
      if (
        splitParenthesizedSegments(tokens, cursor, closeIndex).some(
          (segment) =>
            !constraintKeywords.some((keyword) =>
              isKeyword(tokens[segment.start], keyword),
            ) &&
            typeMatchesDeclarationSegment(
              tokens,
              startIndex,
              segment,
              { allowUnnamed: false },
            ),
        )
      ) {
        return true;
      }
    }
  }

  const typeKindIndex = createKindIndex(
    tokens,
    statementStart,
    statementEnd,
    ["type"],
  );
  if (typeKindIndex !== -1) {
    const asIndex = tokens.findIndex(
      (token, index) =>
        index > typeKindIndex && index < statementEnd && isKeyword(token, "as"),
    );
    if (asIndex !== -1 && isPunctuation(tokens[asIndex + 1], "(")) {
      const closeIndex = matchingCloseIndex(tokens, asIndex + 1);
      if (
        declarationListContainsType(
          tokens,
          startIndex,
          asIndex + 1,
          closeIndex,
          { allowUnnamed: false },
        )
      ) {
        return true;
      }
    }
  }

  const domainKindIndex = createKindIndex(
    tokens,
    statementStart,
    statementEnd,
    ["domain"],
  );
  if (
    domainKindIndex !== -1 &&
    isKeyword(previous, "as") &&
    startIndex > domainKindIndex
  ) {
    return true;
  }

  for (let index = statementStart; index < startIndex; index += 1) {
    if (!isKeyword(tokens[index], "add")) continue;
    let cursor = index + 1;
    if (
      isKeyword(tokens[cursor], "column") ||
      isKeyword(tokens[cursor], "attribute")
    ) {
      cursor += 1;
    }
    if (
      isKeyword(tokens[cursor], "if") &&
      isKeyword(tokens[cursor + 1], "not") &&
      isKeyword(tokens[cursor + 2], "exists")
    ) {
      cursor += 3;
    }
    let end = cursor;
    while (end < statementEnd && !isPunctuation(tokens[end], ",")) end += 1;
    if (
      typeMatchesDeclarationSegment(
        tokens,
        startIndex,
        { start: cursor, end },
        { allowUnnamed: false },
      )
    ) {
      return true;
    }
  }

  if (
    isKeyword(previous, "type") &&
    statement.some((token) => isKeyword(token, "alter")) &&
    statement.some((token) => isKeyword(token, "table")) &&
    statement.some((token) => isKeyword(token, "column"))
  ) {
    return true;
  }

  const first = tokens[statementStart];
  let plpgsqlStart = statementStart;
  if (isKeyword(tokens[plpgsqlStart], "declare")) plpgsqlStart += 1;
  if (isIdentifierToken(tokens[plpgsqlStart])) plpgsqlStart += 1;
  if (isKeyword(tokens[plpgsqlStart], "constant")) plpgsqlStart += 1;
  const plpgsqlDeclaration =
    tokens.postgresScopeLanguage === "plpgsql" &&
    startIndex === plpgsqlStart &&
    statementEnd - statementStart <= 12 &&
    isIdentifierToken(first) &&
    [
      "select", "with", "insert", "update", "delete", "merge", "values",
      "perform", "return", "raise", "execute", "call", "if", "elsif",
      "while", "for", "foreach", "case", "when", "loop", "begin", "end",
      "then", "else", "or", "and", "not", "create", "alter",
      "drop", "grant", "revoke", "copy", "vacuum", "analyze", "cluster",
      "truncate", "comment", "refresh", "lock",
    ].every((keyword) => !isKeyword(first, keyword));
  if (plpgsqlDeclaration) return true;

  const next = tokens[nameIndex + 1];
  if (isPunctuation(next, "[")) {
    throw new MigrationDependencyClosureError(
      "AMBIGUOUS_EXTENSION_TYPE_POSITION",
      tokens[nameIndex].raw,
    );
  }
  return false;
}

function detectorOccurrenceAt(tokens, index, detector) {
  if (detector.components.length === 1) {
    const token = tokens[index];
    if (!isIdentifierToken(token) || token.value !== detector.components[0]) {
      return null;
    }
    if (detector.requireUnqualified && tokens[index - 1]?.type === "DOT") {
      return null;
    }
    const matches =
      detector.kind === "function"
        ? isFunctionUse(tokens, index)
        : isTypeUse(tokens, index, index);
    return matches ? { startOffset: token.start, endIndex: index } : null;
  }

  const reference = qualifiedIdentifierAt(tokens, index);
  if (
    !reference ||
    reference.schema.value !== detector.components[0] ||
    reference.name.value !== detector.components[1]
  ) {
    return null;
  }
  const matches =
    detector.kind === "function"
      ? isFunctionUse(tokens, reference.nextIndex - 1)
      : isTypeUse(tokens, reference.index, reference.nextIndex - 1);
  return matches
    ? { startOffset: reference.start, endIndex: reference.nextIndex - 1 }
    : null;
}

function deriveRequiredExtensionUseGroups(sql) {
  const scopes = executableTokenScopes(sql, {
    includeExecutableDollarBodies: true,
  });
  const groups = [];

  for (const extension of EXTENSION_REGISTRY_V1) {
    const bySchema = new Map();
    for (const detector of extension.useDetectors) {
      const offsets = [];
      for (const tokens of scopes) {
        for (let index = 0; index < tokens.length; index += 1) {
          const occurrence = detectorOccurrenceAt(tokens, index, detector);
          if (!occurrence) continue;
          offsets.push(occurrence.startOffset);
          index = occurrence.endIndex;
        }
      }
      if (offsets.length === 0) continue;
      const key = detector.schema ?? "<unqualified>";
      const current = bySchema.get(key) ?? {
        name: extension.canonicalName,
        schema: detector.schema,
        evidence: [],
        firstUseOffset: Number.POSITIVE_INFINITY,
      };
      current.evidence.push({
        kind: detector.kind,
        identifier: detector.identifier,
        occurrences: offsets.length,
      });
      current.firstUseOffset = Math.min(current.firstUseOffset, ...offsets);
      bySchema.set(key, current);
    }
    groups.push(...bySchema.values());
  }

  return groups;
}

export function deriveRequiredExtensionUses(sql) {
  return deriveRequiredExtensionUseGroups(sql).map(
    ({ name, schema, evidence }) => ({ name, schema, evidence }),
  );
}

function parenthesisDepthAt(tokens, start, target) {
  let depth = 0;
  for (let index = start; index < target; index += 1) {
    if (isPunctuation(tokens[index], "(")) depth += 1;
    if (isPunctuation(tokens[index], ")")) depth -= 1;
  }
  return depth;
}

function parenthesisAncestorIndexes(tokens, start, target) {
  const ancestors = [];
  for (let index = start; index < target; index += 1) {
    if (isPunctuation(tokens[index], "(")) ancestors.push(index);
    if (isPunctuation(tokens[index], ")")) ancestors.pop();
  }
  return ancestors;
}

function isExpressionFromSeparator(tokens, targetIndex) {
  if (!isKeyword(tokens[targetIndex - 1], "from")) return false;
  let nestedCloseCount = 0;
  for (let index = targetIndex - 2; index >= 0; index -= 1) {
    if (isPunctuation(tokens[index], ")")) {
      nestedCloseCount += 1;
      continue;
    }
    if (!isPunctuation(tokens[index], "(")) continue;
    if (nestedCloseCount > 0) {
      nestedCloseCount -= 1;
      continue;
    }
    return ["extract", "substring", "trim", "overlay"].some((keyword) =>
      isKeyword(tokens[index - 1], keyword),
    );
  }
  return false;
}

function topLevelKeywordIndex(tokens, start, end, keyword) {
  let depth = 0;
  for (let index = start; index < end; index += 1) {
    if (isPunctuation(tokens[index], "(")) depth += 1;
    if (isPunctuation(tokens[index], ")")) depth -= 1;
    if (depth === 0 && isKeyword(tokens[index], keyword)) return index;
  }
  return -1;
}

function topLevelUsingRelationTargetIndexes(tokens, usingIndex, end) {
  const stop = ["where", "returning", "when", "on"]
    .map((keyword) => topLevelKeywordIndex(tokens, usingIndex + 1, end, keyword))
    .filter((index) => index !== -1)
    .sort((left, right) => left - right)[0] ?? end;
  const targets = new Set();
  let cursor = usingIndex + 1;
  while (cursor < stop) {
    if (isKeyword(tokens[cursor], "only")) cursor += 1;
    const reference = qualifiedIdentifierAt(tokens, cursor);
    if (!reference || isPunctuation(tokens[reference.nextIndex], "(")) break;
    targets.add(reference.index);
    cursor = reference.nextIndex;
    if (tokens[cursor]?.type === "OPERATOR" && tokens[cursor].value === "*") {
      cursor += 1;
    }
    if (isKeyword(tokens[cursor], "as") && isIdentifierToken(tokens[cursor + 1])) {
      cursor += 2;
    } else if (
      isIdentifierToken(tokens[cursor]) &&
      !["join", "where", "returning", "when", "on"].some((keyword) =>
        isKeyword(tokens[cursor], keyword),
      )
    ) {
      cursor += 1;
    }
    if (!isPunctuation(tokens[cursor], ",")) break;
    cursor += 1;
  }
  return targets;
}

function isCreateTableLikeElementOccurrence(occurrence, start, end) {
  const tableKindIndex = createTableKindIndex(occurrence.tokens, start, end);
  if (tableKindIndex === -1) return false;
  let cursor = tableKindIndex + 1;
  if (
    isKeyword(occurrence.tokens[cursor], "if") &&
    isKeyword(occurrence.tokens[cursor + 1], "not") &&
    isKeyword(occurrence.tokens[cursor + 2], "exists")
  ) {
    cursor += 3;
  }
  cursor = qualifiedUnitEnd(occurrence.tokens, cursor);
  if (!isPunctuation(occurrence.tokens[cursor], "(")) return false;
  const closeIndex = matchingCloseIndex(occurrence.tokens, cursor);
  if (
    closeIndex === -1 ||
    occurrence.index <= cursor ||
    occurrence.index >= closeIndex
  ) {
    return false;
  }
  return splitParenthesizedSegments(occurrence.tokens, cursor, closeIndex).some(
    (segment) =>
      isKeyword(occurrence.tokens[segment.start], "like") &&
      occurrence.index === segment.start + 1,
  );
}

function qualifiedStatementObjectKinds(occurrence) {
  const { tokens, index } = occurrence;
  const { start, end } = statementRange(tokens, index);
  const command = tokens[start];
  const depth = parenthesisDepthAt(tokens, start, index);

  if (isCreateTableLikeElementOccurrence(occurrence, start, end)) {
    return ["table", "view"];
  }
  if (
    isKeyword(occurrence.previous, "of") &&
    isKeyword(tokens[index - 2], "partition") &&
    createKindIndex(tokens, start, end, ["table"]) !== -1
  ) {
    return ["table", "view"];
  }
  if (
    isKeyword(occurrence.previous, "support") &&
    createKindIndex(tokens, start, end, ["function", "procedure"]) !== -1
  ) {
    return ["function"];
  }
  if (
    occurrence.previous?.type === "OPERATOR" &&
    occurrence.previous.value === "=" &&
    ["procedure", "function"].some((keyword) =>
      isKeyword(tokens[index - 2], keyword),
    ) &&
    createKindIndex(tokens, start, end, ["operator"]) !== -1
  ) {
    return ["function"];
  }

  if (
    ["vacuum", "analyze"].some((keyword) => isKeyword(command, keyword)) &&
    depth === 0
  ) {
    return ["table", "view"];
  }
  if (isKeyword(command, "cluster") && depth === 0) {
    const usingIndex = topLevelKeywordIndex(tokens, start + 1, end, "using");
    if (usingIndex === -1 || index < usingIndex) return ["table", "view"];
  }
  if (isKeyword(command, "truncate") && depth === 0) {
    const cascadeIndex = topLevelKeywordIndex(tokens, start + 1, end, "cascade");
    const restrictIndex = topLevelKeywordIndex(tokens, start + 1, end, "restrict");
    const stop = [cascadeIndex, restrictIndex]
      .filter((candidate) => candidate !== -1)
      .sort((left, right) => left - right)[0] ?? end;
    if (index < stop) return ["table", "view"];
  }
  if (isKeyword(command, "copy") && depth === 0) {
    const fromIndex = topLevelKeywordIndex(tokens, start + 1, end, "from");
    const toIndex = topLevelKeywordIndex(tokens, start + 1, end, "to");
    const stop = [fromIndex, toIndex]
      .filter((candidate) => candidate !== -1)
      .sort((left, right) => left - right)[0] ?? end;
    if (index < stop) return ["table", "view"];
  }
  if (isKeyword(command, "merge") && depth === 0) {
    const intoIndex = topLevelKeywordIndex(tokens, start + 1, end, "into");
    let targetIndex = intoIndex + 1;
    if (isKeyword(tokens[targetIndex], "only")) targetIndex += 1;
    const target = qualifiedIdentifierAt(tokens, targetIndex);
    if (target && index === target.index) return ["table", "view"];
    const usingIndex = topLevelKeywordIndex(tokens, start + 1, end, "using");
    if (
      usingIndex !== -1 &&
      topLevelUsingRelationTargetIndexes(tokens, usingIndex, end).has(index)
    ) {
      return ["table", "view"];
    }
  }
  if (isKeyword(command, "delete") && depth === 0) {
    const usingIndex = topLevelKeywordIndex(tokens, start + 1, end, "using");
    if (
      usingIndex !== -1 &&
      topLevelUsingRelationTargetIndexes(tokens, usingIndex, end).has(index)
    ) {
      return ["table", "view"];
    }
  }

  if (
    (isKeyword(command, "grant") || isKeyword(command, "revoke")) &&
    depth === 0
  ) {
    const onIndex = topLevelKeywordIndex(tokens, start + 1, end, "on");
    const stopKeyword = isKeyword(command, "grant") ? "to" : "from";
    const stopIndex = topLevelKeywordIndex(
      tokens,
      onIndex === -1 ? start + 1 : onIndex + 1,
      end,
      stopKeyword,
    );
    if (onIndex !== -1 && index > onIndex && (stopIndex === -1 || index < stopIndex)) {
      const classToken = tokens[onIndex + 1];
      if (
        isKeyword(classToken, "function") ||
        isKeyword(classToken, "procedure") ||
        isKeyword(classToken, "routine")
      ) {
        return ["function"];
      }
      if (isKeyword(classToken, "sequence")) return ["sequence"];
      if (isKeyword(classToken, "type") || isKeyword(classToken, "domain")) {
        return ["type"];
      }
      if (isKeyword(classToken, "view")) return ["view"];
      return ["table", "view"];
    }
  }

  const createIndex = topLevelKeywordIndex(tokens, start, end, "create");
  const triggerIndex = topLevelKeywordIndex(tokens, start, end, "trigger");
  if (createIndex !== -1 && triggerIndex !== -1 && depth === 0) {
    const onIndex = topLevelKeywordIndex(tokens, triggerIndex + 1, end, "on");
    const executeIndex = topLevelKeywordIndex(tokens, triggerIndex + 1, end, "execute");
    if (
      onIndex !== -1 &&
      index > onIndex &&
      (executeIndex === -1 || index < executeIndex)
    ) {
      return ["table", "view"];
    }
  }
  const ruleIndex = topLevelKeywordIndex(tokens, start, end, "rule");
  if (createIndex !== -1 && ruleIndex !== -1 && depth === 0) {
    const toIndex = topLevelKeywordIndex(tokens, ruleIndex + 1, end, "to");
    let targetIndex = toIndex + 1;
    if (isKeyword(tokens[targetIndex], "only")) targetIndex += 1;
    const target = qualifiedIdentifierAt(tokens, targetIndex);
    if (target && index === target.index) return ["table", "view"];
  }
  const policyIndex = topLevelKeywordIndex(tokens, start, end, "policy");
  if (
    policyIndex !== -1 &&
    policyIndex < index &&
    ["create", "alter", "drop"].some((keyword) =>
      isKeyword(tokens[policyIndex - 1], keyword),
    ) &&
    depth === 0
  ) {
    const onIndex = topLevelKeywordIndex(tokens, policyIndex + 1, end, "on");
    let targetIndex = onIndex + 1;
    if (isKeyword(tokens[targetIndex], "only")) targetIndex += 1;
    const target = qualifiedIdentifierAt(tokens, targetIndex);
    if (target && index === target.index) return ["table", "view"];
  }
  let indexKindIndex = -1;
  if (isKeyword(command, "create")) {
    let cursor = start + 1;
    if (isKeyword(tokens[cursor], "unique")) cursor += 1;
    if (isKeyword(tokens[cursor], "index")) indexKindIndex = cursor;
  }
  if (indexKindIndex !== -1 && depth === 0) {
    const onIndex = topLevelKeywordIndex(tokens, indexKindIndex + 1, end, "on");
    let targetIndex = onIndex + 1;
    if (isKeyword(tokens[targetIndex], "only")) targetIndex += 1;
    const target = qualifiedIdentifierAt(tokens, targetIndex);
    if (target && index === target.index) return ["table", "view"];
  }

  const inheritsIndex = topLevelKeywordIndex(tokens, start, end, "inherits");
  if (inheritsIndex !== -1 && isPunctuation(tokens[inheritsIndex + 1], "(")) {
    const closeIndex = matchingCloseIndex(tokens, inheritsIndex + 1);
    if (index > inheritsIndex + 1 && index < closeIndex) return ["table", "view"];
  }

  if (isKeyword(occurrence.previous, "only")) {
    const beforeOnly = tokens[index - 2];
    if (
      ["from", "update", "table", "truncate", "into"].some((keyword) =>
        isKeyword(beforeOnly, keyword),
      )
    ) {
      return ["table", "view"];
    }
  }
  if (
    isPunctuation(occurrence.previous, "(") &&
    isKeyword(tokens[index - 2], "only")
  ) {
    return ["table", "view"];
  }
  if (
    ["references", "table", "into"].some((keyword) =>
      isKeyword(occurrence.previous, keyword),
    )
  ) {
    return ["table", "view"];
  }
  if (
    isKeyword(occurrence.previous, "exists") &&
    createKindIndex(tokens, start, end, ["table"]) !== -1
  ) {
    return ["table", "view"];
  }
  if (
    ["from", "join", "update"].some((keyword) =>
      isKeyword(occurrence.previous, keyword),
    ) &&
    !(
      isKeyword(occurrence.previous, "from") &&
      isKeyword(tokens[index - 2], "distinct")
    ) &&
    !isExpressionFromSeparator(tokens, index) &&
    !isPunctuation(occurrence.next, "(")
  ) {
    return ["table", "view"];
  }
  return null;
}

function isParenthesizedRelationContext(occurrence) {
  return (qualifiedStatementObjectKinds(occurrence) ?? []).some((kind) =>
    ["table", "view"].includes(kind),
  );
}

export function deriveExternalFunctionDependencies(sql, internalFunctions = []) {
  const internalFunctionIdentifiers = new Set(
    internalFunctions.map(canonicalManifestIdentifier),
  );
  const counts = new Map();
  for (const occurrence of qualifiedOccurrences(sql)) {
    if (
      !isPunctuation(occurrence.next, "(") ||
      isParenthesizedRelationContext(occurrence)
    ) {
      continue;
    }
    const occurrenceIdentifier = manifestIdentifierFromQualified(occurrence);
    if (internalFunctionIdentifiers.has(occurrenceIdentifier)) continue;
    const entry = EXTERNAL_FUNCTION_REGISTRY_V1.find(
      (candidate) =>
        occurrence.schema.value === candidate.schema &&
        occurrence.name.value === candidate.name,
    );
    if (entry) {
      const identifier = `${entry.schema}.${entry.name}`;
      counts.set(identifier, (counts.get(identifier) ?? 0) + 1);
      continue;
    }
    const extensionFunction = EXTENSION_REGISTRY_V1.some((extension) =>
      extension.useDetectors.some(
        (detector) =>
          detector.kind === "function" &&
          detector.components.length === 2 &&
          occurrence.schema.value === detector.components[0] &&
          occurrence.name.value === detector.components[1],
      ),
    );
    if (extensionFunction || occurrence.schema.value === "public") continue;
    throw new MigrationDependencyClosureError(
      "UNREGISTERED_EXTERNAL_FUNCTION",
      displayQualifiedIdentifier(occurrence),
    );
  }

  return EXTERNAL_FUNCTION_REGISTRY_V1.filter((entry) =>
    counts.has(`${entry.schema}.${entry.name}`),
  ).map((entry) => {
    const identifier = `${entry.schema}.${entry.name}`;
    return {
      identifier,
      registry:
        entry.schema === "pg_catalog" ? "POSTGRES_BUILTIN" : "MANIFEST_OBJECT",
      manifestRequired: entry.manifestRequired,
      occurrences: counts.get(identifier),
    };
  });
}

function producedObjectAt(tokens, index) {
  if (!isKeyword(tokens[index], "create")) return null;
  let cursor = index + 1;
  let orReplace = false;
  if (isKeyword(tokens[cursor], "or") && isKeyword(tokens[cursor + 1], "replace")) {
    orReplace = true;
    cursor += 2;
  }
  while (
    ["global", "local", "temp", "temporary", "unlogged"].some((keyword) =>
      isKeyword(tokens[cursor], keyword),
    )
  ) {
    cursor += 1;
  }

  let kind = null;
  if (isKeyword(tokens[cursor], "foreign") && isKeyword(tokens[cursor + 1], "table")) {
    kind = "table";
    cursor += 2;
    if (
      isKeyword(tokens[cursor], "if") &&
      isKeyword(tokens[cursor + 1], "not") &&
      isKeyword(tokens[cursor + 2], "exists")
    ) {
      cursor += 3;
    }
  } else if (isKeyword(tokens[cursor], "table")) {
    kind = "table";
    cursor += 1;
    if (
      isKeyword(tokens[cursor], "if") &&
      isKeyword(tokens[cursor + 1], "not") &&
      isKeyword(tokens[cursor + 2], "exists")
    ) {
      cursor += 3;
    }
  } else if (isKeyword(tokens[cursor], "materialized") && isKeyword(tokens[cursor + 1], "view")) {
    kind = "view";
    cursor += 2;
  } else if (isKeyword(tokens[cursor], "recursive") && isKeyword(tokens[cursor + 1], "view")) {
    kind = "view";
    cursor += 2;
  } else if (isKeyword(tokens[cursor], "view")) {
    kind = "view";
    cursor += 1;
  } else if (isKeyword(tokens[cursor], "sequence")) {
    kind = "sequence";
    cursor += 1;
    if (
      isKeyword(tokens[cursor], "if") &&
      isKeyword(tokens[cursor + 1], "not") &&
      isKeyword(tokens[cursor + 2], "exists")
    ) {
      cursor += 3;
    }
  } else if (
    isKeyword(tokens[cursor], "type") ||
    isKeyword(tokens[cursor], "domain")
  ) {
    kind = "type";
    cursor += 1;
  } else if (
    isKeyword(tokens[cursor], "function") ||
    isKeyword(tokens[cursor], "procedure")
  ) {
    kind = "function";
    cursor += 1;
  } else {
    return null;
  }

  const reference = qualifiedIdentifierAt(tokens, cursor);
  if (!reference) {
    throw new MigrationDependencyClosureError(
      "UNQUALIFIED_PRODUCED_OBJECT",
      tokens[cursor]?.raw ?? `offset ${tokens[index].start}`,
    );
  }
  let routineSignature = null;
  let endIndex = reference.nextIndex - 1;
  if (kind === "function") {
    if (!isPunctuation(tokens[reference.nextIndex], "(")) {
      throw new MigrationDependencyClosureError(
        "UNRECOGNIZED_ROUTINE_SIGNATURE",
        displayQualifiedIdentifier(reference),
      );
    }
    const parsedSignature = routineSignatureAt(tokens, reference.nextIndex);
    routineSignature = parsedSignature.canonical;
    endIndex = parsedSignature.closeIndex;
    validateRoutineReturnTypes(tokens, parsedSignature.closeIndex);
  }
  return {
    kind,
    identifier: manifestIdentifierFromQualified(reference),
    routineSignature,
    orReplace,
    targetIndex: reference.index,
    endIndex,
  };
}

function deriveProducedDatabaseObjectDeclarations(sql) {
  const found = [];
  for (const scope of executableStatementScopeRecords(sql)) {
    if (scope.kind === "STORED_ROUTINE_BODY") continue;
    for (let index = 0; index < scope.tokens.length; index += 1) {
      const object = producedObjectAt(scope.tokens, index);
      if (!object) continue;
      const transitionPolicy = doTransitionPolicy(scope, scope.tokens[index]);
      if (transitionPolicy.terminating || transitionPolicy.conditional) {
        throw new MigrationDependencyClosureError(
          "UNSUPPORTED_CONDITIONAL_DO_OBJECT_TRANSITION",
          `${transitionPolicy.terminating ? "terminating" : "conditional"}:create:${object.kind}:${object.identifier}`,
        );
      }
      found.push(object);
      index = object.endIndex;
    }
  }
  return found;
}

export function deriveProducedDatabaseObjects(sql) {
  return deriveProducedDatabaseObjectDeclarations(sql)
    .map(({ kind, identifier }) => ({ kind, identifier }))
    .filter(
      (object, index, all) =>
        all.findIndex(
          (candidate) =>
            candidate.kind === object.kind &&
            candidate.identifier === object.identifier,
        ) === index,
    );
}

function canonicalObjects(objects) {
  return [...objects]
    .map(({ kind, identifier }) => ({
      kind,
      identifier: canonicalManifestIdentifier(identifier),
    }))
    .filter(
      (object, index, all) =>
        all.findIndex(
          (candidate) =>
            candidate.kind === object.kind &&
            candidate.identifier === object.identifier,
        ) === index,
    )
    .sort((left, right) =>
      `${left.kind}:${left.identifier}`.localeCompare(
        `${right.kind}:${right.identifier}`,
      ),
    );
}

function exactEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function statementHasKeyword(tokens, keyword) {
  return tokens.some((token) => isKeyword(token, keyword));
}

function classifyQualifiedOccurrence(occurrence) {
  const statementKinds = qualifiedStatementObjectKinds(occurrence);
  if (statementKinds) return statementKinds;
  if (
    occurrence.next?.type === "OPERATOR" &&
    occurrence.next.value === "%" &&
    isKeyword(occurrence.tokens[occurrence.nextIndex + 1], "rowtype")
  ) {
    return ["table", "view"];
  }
  if (
    isTypeUse(
      occurrence.tokens,
      occurrence.index,
      occurrence.nextIndex - 1,
    )
  ) {
    return ["type"];
  }
  if (isPunctuation(occurrence.next, "(")) return ["function"];
  const statement = statementTokensBefore(
    occurrence.tokens,
    occurrence.index,
  );
  const previous = occurrence.previous;
  const precedingKeywordKind = [
    ["function", ["function"]],
    ["procedure", ["function"]],
    ["routine", ["function"]],
    ["type", ["type"]],
    ["domain", ["type"]],
    ["sequence", ["sequence"]],
    ["view", ["view"]],
    ["table", ["table", "view"]],
  ].find(([keyword]) => isKeyword(previous, keyword));
  if (precedingKeywordKind) return precedingKeywordKind[1];

  if (isKeyword(previous, "only")) {
    const beforeOnly = occurrence.tokens[occurrence.index - 2];
    if (isKeyword(beforeOnly, "table")) return ["table", "view"];
  }

  if (
    [
      "from",
      "join",
      "update",
      "into",
      "references",
      "truncate",
      "copy",
      "vacuum",
      "analyze",
      "cluster",
    ].some((keyword) => isKeyword(previous, keyword))
  ) {
    if (
      isKeyword(previous, "from") &&
      isKeyword(occurrence.tokens[occurrence.index - 2], "distinct")
    ) {
      return null;
    }
    if (
      isKeyword(previous, "from") &&
      isExpressionFromSeparator(occurrence.tokens, occurrence.index)
    ) {
      return null;
    }
    return ["table", "view"];
  }

  const hasObjectOperation = [
    "alter",
    "drop",
    "grant",
    "revoke",
    "comment",
    "refresh",
    "lock",
  ].some((keyword) => statementHasKeyword(statement, keyword));
  if (hasObjectOperation) {
    if (
      statementHasKeyword(statement, "function") ||
      statementHasKeyword(statement, "procedure") ||
      statementHasKeyword(statement, "routine")
    ) {
      return ["function"];
    }
    if (
      statementHasKeyword(statement, "type") ||
      statementHasKeyword(statement, "domain")
    ) {
      return ["type"];
    }
    if (statementHasKeyword(statement, "sequence")) return ["sequence"];
    if (statementHasKeyword(statement, "view")) return ["view"];
    if (statementHasKeyword(statement, "table")) return ["table", "view"];
  }

  return null;
}

function isQualifiedColumnThroughRelationAlias(occurrence) {
  if (isPunctuation(occurrence.next, "(")) return false;
  if (qualifiedStatementObjectKinds(occurrence)) return false;
  if (
    isTypeUse(
      occurrence.tokens,
      occurrence.index,
      occurrence.nextIndex - 1,
    )
  ) {
    return false;
  }
  const { tokens, index } = occurrence;
  const { start, end } = statementRange(tokens, index);
  const relationAliasBoundaryKeywords = new Set([
    "where",
    "group",
    "having",
    "order",
    "limit",
    "offset",
    "fetch",
    "window",
    "returning",
    "union",
    "intersect",
    "except",
    "cross",
    "inner",
    "left",
    "right",
    "full",
    "natural",
    "join",
    "on",
    "using",
    "tablesample",
    "for",
    "with",
  ]);
  const isRelationAliasBoundaryToken = (token) =>
    [...relationAliasBoundaryKeywords].some((keyword) =>
      isKeyword(token, keyword),
    );
  const rawScopeHasDmlCommandBefore = (cursor) => {
    const ancestors = parenthesisAncestorIndexes(tokens, start, cursor);
    for (let scan = cursor - 1; scan >= start; scan -= 1) {
      const scanAncestors = parenthesisAncestorIndexes(tokens, start, scan);
      if (
        scanAncestors.length !== ancestors.length ||
        !scanAncestors.every(
          (ancestor, ancestorIndex) => ancestors[ancestorIndex] === ancestor,
        )
      ) {
        continue;
      }
      if (["delete", "merge"].some((keyword) => isKeyword(tokens[scan], keyword))) {
        return true;
      }
      if (
        ["select", "insert", "update", "create", "alter", "drop", "policy"].some(
          (keyword) => isKeyword(tokens[scan], keyword),
        )
      ) {
        return false;
      }
    }
    return false;
  };
  const joinedTableStructureCache = new Map();
  const isJoinedTableStructureOpen = (openIndex) => {
    if (joinedTableStructureCache.has(openIndex)) {
      return joinedTableStructureCache.get(openIndex);
    }
    joinedTableStructureCache.set(openIndex, false);
    if (!isPunctuation(tokens[openIndex], "(")) return false;
    const closeIndex = matchingCloseIndex(tokens, openIndex);
    if (closeIndex === -1) return false;

    if (isPunctuation(tokens[openIndex + 1], "(")) {
      const nestedOpenIndex = openIndex + 1;
      const nestedCloseIndex = matchingCloseIndex(tokens, nestedOpenIndex);
      let remainderIndex = nestedCloseIndex + 1;
      if (isKeyword(tokens[remainderIndex], "as")) remainderIndex += 1;
      if (
        isIdentifierToken(tokens[remainderIndex]) &&
        !isRelationAliasBoundaryToken(tokens[remainderIndex])
      ) {
        remainderIndex += 1;
      }
      if (
        nestedCloseIndex !== -1 &&
        remainderIndex === closeIndex &&
        isJoinedTableStructureOpen(nestedOpenIndex)
      ) {
        joinedTableStructureCache.set(openIndex, true);
        return true;
      }
    }

    let firstIndex = openIndex + 1;
    while (isPunctuation(tokens[firstIndex], "(")) firstIndex += 1;
    const firstConstituentIsQuery = [
      "select",
      "with",
      "values",
      "table",
      "insert",
      "update",
      "delete",
      "merge",
    ].some((keyword) => isKeyword(tokens[firstIndex], keyword));
    let hasJoin = false;
    let hasTopLevelJoin = false;
    let depth = 0;
    for (let scan = openIndex + 1; scan < closeIndex; scan += 1) {
      if (isPunctuation(tokens[scan], "(")) {
        depth += 1;
        continue;
      }
      if (isPunctuation(tokens[scan], ")")) {
        depth -= 1;
        continue;
      }
      if (isKeyword(tokens[scan], "join")) {
        hasJoin = true;
        if (depth === 0) hasTopLevelJoin = true;
      }
    }
    const isJoinedTable =
      hasTopLevelJoin || (hasJoin && !firstConstituentIsQuery);
    joinedTableStructureCache.set(openIndex, isJoinedTable);
    return isJoinedTable;
  };
  const transparentJoinedTableOpenCache = new Map();
  const isTransparentJoinedTableOpen = (openIndex) => {
    if (transparentJoinedTableOpenCache.has(openIndex)) {
      return transparentJoinedTableOpenCache.get(openIndex);
    }
    transparentJoinedTableOpenCache.set(openIndex, false);
    if (!isPunctuation(tokens[openIndex], "(")) return false;
    const closeIndex = matchingCloseIndex(tokens, openIndex);
    if (closeIndex === -1) return false;
    let contextIndex = openIndex - 1;
    while (isPunctuation(tokens[contextIndex], "(")) contextIndex -= 1;
    const relationContext =
      ["from", "join", "lateral"].some((keyword) =>
        isKeyword(tokens[contextIndex], keyword),
      ) ||
      isPunctuation(tokens[contextIndex], ",") ||
      (isKeyword(tokens[contextIndex], "using") &&
        rawScopeHasDmlCommandBefore(contextIndex));
    if (!relationContext) return false;
    if (!isJoinedTableStructureOpen(openIndex)) return false;
    let aliasIndex = closeIndex + 1;
    if (isKeyword(tokens[aliasIndex], "as")) aliasIndex += 1;
    if (
      isIdentifierToken(tokens[aliasIndex]) &&
      !isRelationAliasBoundaryToken(tokens[aliasIndex])
    ) {
      return false;
    }
    transparentJoinedTableOpenCache.set(openIndex, true);
    return true;
  };
  const relationAliasAncestorIndexes = (rangeStart, rangeEnd) =>
    parenthesisAncestorIndexes(tokens, rangeStart, rangeEnd).filter(
      (openIndex) => !isTransparentJoinedTableOpen(openIndex),
    );
  const occurrenceAncestors = relationAliasAncestorIndexes(start, index);
  const cursorAncestors = [];
  const relationListScopes = new Set();
  const exactRelationTargetIndexes = new Set();
  let matchingAliasFound = false;
  const scopeKey = (ancestors) => ancestors.join(":");
  const isOccurrenceScopeOrAncestor = (ancestors) =>
    ancestors.length <= occurrenceAncestors.length &&
    ancestors.every(
      (ancestor, ancestorIndex) =>
        occurrenceAncestors[ancestorIndex] === ancestor,
    );
  const isSeparatedBySetOperation = (targetCursor, targetAncestors) => {
    const lower = Math.min(targetCursor, index);
    const upper = Math.max(targetCursor, index);
    const ancestors = relationAliasAncestorIndexes(start, lower);
    for (let scan = lower; scan < upper; scan += 1) {
      if (isPunctuation(tokens[scan], "(")) {
        if (!isTransparentJoinedTableOpen(scan)) ancestors.push(scan);
        continue;
      }
      if (isPunctuation(tokens[scan], ")")) {
        if (
          ancestors.length > 0 &&
          matchingCloseIndex(tokens, ancestors.at(-1)) === scan
        ) {
          ancestors.pop();
        }
        continue;
      }
      if (
        ancestors.length === targetAncestors.length &&
        ancestors.every(
          (ancestor, ancestorIndex) =>
            targetAncestors[ancestorIndex] === ancestor,
        ) &&
        ["union", "intersect", "except"].some((keyword) =>
          isKeyword(tokens[scan], keyword),
        )
      ) {
        return true;
      }
    }
    return false;
  };
  const aliasAtRelationTarget = (targetStart) => {
    let targetIndex = targetStart;
    if (isKeyword(tokens[targetIndex], "lateral")) targetIndex += 1;
    const parenthesizedOnly = isKeyword(tokens[targetIndex], "only");
    if (parenthesizedOnly) targetIndex += 1;
    let aliasIndex = -1;
    let qualifiedTargetIndex = -1;
    let implicitRelationAlias = null;
    if (
      isKeyword(tokens[targetIndex], "rows") &&
      isKeyword(tokens[targetIndex + 1], "from") &&
      isPunctuation(tokens[targetIndex + 2], "(")
    ) {
      const closeIndex = matchingCloseIndex(tokens, targetIndex + 2);
      if (closeIndex === -1) return null;
      const firstFunctionIndex = targetIndex + 3;
      const firstQualifiedFunction = qualifiedIdentifierAt(
        tokens,
        firstFunctionIndex,
      );
      if (
        firstQualifiedFunction &&
        isPunctuation(tokens[firstQualifiedFunction.nextIndex], "(")
      ) {
        implicitRelationAlias = firstQualifiedFunction.name;
      } else if (
        isIdentifierToken(tokens[firstFunctionIndex]) &&
        isPunctuation(tokens[firstFunctionIndex + 1], "(")
      ) {
        implicitRelationAlias = tokens[firstFunctionIndex];
      }
      aliasIndex = closeIndex + 1;
    } else if (isPunctuation(tokens[targetIndex], "(")) {
      const closeIndex = matchingCloseIndex(tokens, targetIndex);
      if (closeIndex === -1) return null;
      if (parenthesizedOnly) {
        const innerTarget = qualifiedIdentifierAt(tokens, targetIndex + 1);
        if (!innerTarget || innerTarget.nextIndex !== closeIndex) return null;
        qualifiedTargetIndex = innerTarget.index;
        implicitRelationAlias = innerTarget.name;
      }
      aliasIndex = closeIndex + 1;
      if (
        parenthesizedOnly &&
        tokens[aliasIndex]?.type === "OPERATOR" &&
        tokens[aliasIndex].value === "*"
      ) {
        aliasIndex += 1;
      }
    } else {
      const target = qualifiedIdentifierAt(tokens, targetIndex);
      const unqualifiedTarget =
        !target && isIdentifierToken(tokens[targetIndex]);
      if (!target && !unqualifiedTarget) return null;
      const callOpenIndex = target?.nextIndex ?? targetIndex + 1;
      if (isPunctuation(tokens[callOpenIndex], "(")) {
        const closeIndex = matchingCloseIndex(tokens, callOpenIndex);
        if (closeIndex === -1) return null;
        implicitRelationAlias = target?.name ?? tokens[targetIndex];
        aliasIndex = closeIndex + 1;
      } else {
        qualifiedTargetIndex = target?.index ?? -1;
        implicitRelationAlias = target?.name ?? tokens[targetIndex];
        aliasIndex = target?.nextIndex ?? targetIndex + 1;
        if (
          tokens[aliasIndex]?.type === "OPERATOR" &&
          tokens[aliasIndex].value === "*"
        ) {
          aliasIndex += 1;
        }
      }
    }
    if (
      isKeyword(tokens[aliasIndex], "with") &&
      isKeyword(tokens[aliasIndex + 1], "ordinality")
    ) {
      aliasIndex += 2;
    }
    if (isKeyword(tokens[aliasIndex], "as")) aliasIndex += 1;
    const alias = tokens[aliasIndex];
    if (!isIdentifierToken(alias)) {
      return implicitRelationAlias || qualifiedTargetIndex !== -1
        ? { alias: implicitRelationAlias, qualifiedTargetIndex }
        : null;
    }
    if (isRelationAliasBoundaryToken(alias)) {
      return implicitRelationAlias || qualifiedTargetIndex !== -1
        ? { alias: implicitRelationAlias, qualifiedTargetIndex }
        : null;
    }
    return { alias, qualifiedTargetIndex };
  };
  const isJoinUsingClause = (usingIndex, ancestors) => {
    for (let scan = usingIndex - 1; scan >= start; scan -= 1) {
      const scanAncestors = relationAliasAncestorIndexes(start, scan);
      if (
        scanAncestors.length !== ancestors.length ||
        !scanAncestors.every(
          (ancestor, ancestorIndex) => ancestors[ancestorIndex] === ancestor,
        )
      ) {
        continue;
      }
      if (isKeyword(tokens[scan], "join")) return true;
      if (
        isPunctuation(tokens[scan], ",") ||
        [
          "from",
          "where",
          "on",
          "having",
          "group",
          "order",
          "limit",
          "offset",
          "fetch",
          "window",
          "returning",
          "union",
          "intersect",
          "except",
        ].some((keyword) => isKeyword(tokens[scan], keyword))
      ) {
        return false;
      }
    }
    return false;
  };
  const scopeHasDmlCommandBefore = (cursor, ancestors) => {
    for (let scan = cursor - 1; scan >= start; scan -= 1) {
      const scanAncestors = relationAliasAncestorIndexes(start, scan);
      if (
        scanAncestors.length !== ancestors.length ||
        !scanAncestors.every(
          (ancestor, ancestorIndex) => ancestors[ancestorIndex] === ancestor,
        )
      ) {
        continue;
      }
      if (["delete", "merge"].some((keyword) => isKeyword(tokens[scan], keyword))) {
        return true;
      }
      if (
        [
          "select",
          "insert",
          "update",
          "create",
          "alter",
          "drop",
          "policy",
        ].some((keyword) => isKeyword(tokens[scan], keyword))
      ) {
        return false;
      }
    }
    return false;
  };
  for (let cursor = start; cursor < end; cursor += 1) {
    if (isPunctuation(tokens[cursor], "(")) {
      cursorAncestors.push(cursor);
      if (isTransparentJoinedTableOpen(cursor)) {
        const transparentAncestors = cursorAncestors.filter(
          (openIndex) => !isTransparentJoinedTableOpen(openIndex),
        );
        const binding = aliasAtRelationTarget(cursor + 1);
        if (binding && binding.qualifiedTargetIndex !== -1) {
          exactRelationTargetIndexes.add(binding.qualifiedTargetIndex);
        }
        if (
          binding?.alias?.value === occurrence.schema.value &&
          !isSeparatedBySetOperation(cursor, transparentAncestors)
        ) {
          matchingAliasFound = true;
        }
      }
      continue;
    }
    if (isPunctuation(tokens[cursor], ")")) {
      cursorAncestors.pop();
      continue;
    }
    const visibleCursorAncestors = cursorAncestors.filter(
      (openIndex) => !isTransparentJoinedTableOpen(openIndex),
    );
    if (!isOccurrenceScopeOrAncestor(visibleCursorAncestors)) continue;
    const currentScopeKey = scopeKey(visibleCursorAncestors);
    if (
      [
        "where",
        "group",
        "having",
        "order",
        "limit",
        "offset",
        "fetch",
        "window",
        "returning",
        "union",
        "intersect",
        "except",
      ].some((keyword) => isKeyword(tokens[cursor], keyword))
    ) {
      relationListScopes.delete(currentScopeKey);
      continue;
    }
    const joinUsingClause =
      isKeyword(tokens[cursor], "using") &&
      isPunctuation(tokens[cursor + 1], "(") &&
      isJoinUsingClause(cursor, visibleCursorAncestors);
    if (joinUsingClause) {
      const closeIndex = matchingCloseIndex(tokens, cursor + 1);
      if (closeIndex !== -1) {
        let aliasIndex = closeIndex + 1;
        if (isKeyword(tokens[aliasIndex], "as")) aliasIndex += 1;
        if (
          isIdentifierToken(tokens[aliasIndex]) &&
          tokens[aliasIndex].value === occurrence.schema.value &&
          !isSeparatedBySetOperation(cursor, visibleCursorAncestors)
        ) {
          matchingAliasFound = true;
        }
      }
      continue;
    }
    let targetIndex = -1;
    if (isKeyword(tokens[cursor], "from")) {
      if (isExpressionFromSeparator(tokens, cursor + 1)) continue;
      relationListScopes.add(currentScopeKey);
      targetIndex = cursor + 1;
    } else if (
      ["join", "update", "into"].some((keyword) =>
        isKeyword(tokens[cursor], keyword),
      )
    ) {
      targetIndex = cursor + 1;
    } else if (
      isKeyword(tokens[cursor], "using") &&
      (!isPunctuation(tokens[cursor + 1], "(") ||
        scopeHasDmlCommandBefore(cursor, visibleCursorAncestors))
    ) {
      targetIndex = cursor + 1;
    } else if (
      isPunctuation(tokens[cursor], ",") &&
      relationListScopes.has(currentScopeKey)
    ) {
      targetIndex = cursor + 1;
    }
    if (targetIndex === -1) continue;
    const binding = aliasAtRelationTarget(targetIndex);
    if (binding && binding.qualifiedTargetIndex !== -1) {
      exactRelationTargetIndexes.add(binding.qualifiedTargetIndex);
    }
    if (
      binding?.alias?.value === occurrence.schema.value &&
      !isSeparatedBySetOperation(cursor, visibleCursorAncestors)
    ) {
      matchingAliasFound = true;
    }
  }
  if (exactRelationTargetIndexes.has(index)) return false;
  return matchingAliasFound;
}

function isNonReportableQualifiedOccurrence(occurrence) {
  return (
    (isKeyword(occurrence.previous, "from") &&
      isExpressionFromSeparator(occurrence.tokens, occurrence.index)) ||
    isQualifiedColumnThroughRelationAlias(occurrence)
  );
}

function matchingTypedObjects(occurrence, availableObjects) {
  if (isNonReportableQualifiedOccurrence(occurrence)) return [];
  const identityMatches = availableObjects.filter((object) =>
    qualifiedMatchesManifestIdentifier(occurrence, object.identifier),
  );
  const compatibleKinds = classifyQualifiedOccurrence(occurrence);
  if (!compatibleKinds) {
    if (identityMatches.length > 1) {
      throw new MigrationDependencyClosureError(
        "AMBIGUOUS_DATABASE_OBJECT_KIND",
        displayQualifiedIdentifier(occurrence),
      );
    }
    return identityMatches;
  }
  const compatible = identityMatches.filter((object) =>
    compatibleKinds.includes(object.kind),
  );
  if (compatible.length > 1) {
    throw new MigrationDependencyClosureError(
      "AMBIGUOUS_DATABASE_OBJECT_KIND",
      displayQualifiedIdentifier(occurrence),
    );
  }
  if (compatible.length === 0 && identityMatches.length > 0) {
    throw new MigrationDependencyClosureError(
      "WRONG_DATABASE_OBJECT_KIND",
      `${displayQualifiedIdentifier(occurrence)}:${compatibleKinds.join("|")}`,
    );
  }
  return compatible;
}

export function deriveDatabaseObjectReferences(sql, availableObjects) {
  const occurrences = qualifiedOccurrences(sql);
  const available = canonicalObjects(availableObjects);
  return canonicalObjects(
    occurrences.flatMap((occurrence) =>
      matchingTypedObjects(occurrence, available),
    ),
  );
}

function schemaObjectOperationsAt(tokens, index) {
  const operation = ["alter", "drop"].find((keyword) =>
    isKeyword(tokens[index], keyword),
  );
  if (!operation) return null;

  let cursor = index + 1;
  let kind = null;
  if (
    isKeyword(tokens[cursor], "foreign") &&
    isKeyword(tokens[cursor + 1], "table")
  ) {
    kind = "table";
    cursor += 2;
  } else if (
    isKeyword(tokens[cursor], "materialized") &&
    isKeyword(tokens[cursor + 1], "view")
  ) {
    kind = "view";
    cursor += 2;
  } else {
    const kindEntry = [
      ["table", "table"],
      ["view", "view"],
      ["sequence", "sequence"],
      ["type", "type"],
      ["domain", "type"],
      ["function", "function"],
      ["procedure", "function"],
      ["routine", "function"],
    ].find(([keyword]) => isKeyword(tokens[cursor], keyword));
    if (!kindEntry) return null;
    kind = kindEntry[1];
    cursor += 1;
  }

  if (isKeyword(tokens[cursor], "only")) cursor += 1;
  if (
    isKeyword(tokens[cursor], "if") &&
    isKeyword(tokens[cursor + 1], "exists")
  ) {
    cursor += 2;
  }
  const operations = [];
  while (cursor < tokens.length && !isPunctuation(tokens[cursor], ";")) {
    if (isKeyword(tokens[cursor], "only")) cursor += 1;
    const reference = qualifiedIdentifierAt(tokens, cursor);
    if (!reference) {
      throw new MigrationDependencyClosureError(
        "UNQUALIFIED_SCHEMA_OBJECT_OPERATION",
        `${operation}:${kind}:${tokens[cursor]?.raw ?? `offset ${tokens[index].start}`}`,
      );
    }
    const object = {
      kind,
      identifier: manifestIdentifierFromQualified(reference),
    };
    cursor = reference.nextIndex;
    let routineSignature = null;
    if (kind === "function") {
      if (!isPunctuation(tokens[cursor], "(")) {
        throw new MigrationDependencyClosureError(
          "UNRECOGNIZED_ROUTINE_SIGNATURE",
          object.identifier,
        );
      }
      const parsedSignature = routineSignatureAt(tokens, cursor);
      routineSignature = parsedSignature.canonical;
      cursor = parsedSignature.closeIndex + 1;
    } else if (isPunctuation(tokens[cursor], "(")) {
      const closeIndex = matchingCloseIndex(tokens, cursor);
      if (closeIndex === -1) {
        throw new MigrationDependencyClosureError(
          "UNBALANCED_SQL_PUNCTUATION",
          object.identifier,
        );
      }
      cursor = closeIndex + 1;
    }

    if (operation === "alter") {
      let replacement = null;
      if (isKeyword(tokens[cursor], "rename") && isKeyword(tokens[cursor + 1], "to")) {
        const newName = tokens[cursor + 2];
        if (!isIdentifierToken(newName)) {
          throw new MigrationDependencyClosureError(
            "UNRECOGNIZED_SCHEMA_OBJECT_RENAME",
            object.identifier,
          );
        }
        const [schema] = manifestIdentifierComponents(object.identifier);
        replacement = {
          kind,
          identifier: manifestIdentifierFromComponents(schema, newName),
        };
        cursor += 3;
      } else if (isKeyword(tokens[cursor], "set") && isKeyword(tokens[cursor + 1], "schema")) {
        const newSchema = tokens[cursor + 2];
        if (!isIdentifierToken(newSchema)) {
          throw new MigrationDependencyClosureError(
            "UNRECOGNIZED_SCHEMA_OBJECT_RENAME",
            object.identifier,
          );
        }
        const [, name] = manifestIdentifierComponents(object.identifier);
        replacement = {
          kind,
          identifier: manifestIdentifierFromComponents(newSchema, name),
        };
        cursor += 3;
      }
      operations.push({
        action: replacement ? "rename" : "modify",
        object,
        replacement,
        routineSignature,
      });
      return { operations, endIndex: Math.max(cursor - 1, index) };
    }

    operations.push({
      action: "drop",
      object,
      replacement: null,
      routineSignature,
    });
    if (!isPunctuation(tokens[cursor], ",")) break;
    cursor += 1;
  }
  return { operations, endIndex: Math.max(cursor - 1, index) };
}

function routinePermissionTargetsAt(tokens, index) {
  if (!isKeyword(tokens[index], "grant") && !isKeyword(tokens[index], "revoke")) {
    return null;
  }
  const { end } = statementRange(tokens, index);
  const onIndex = topLevelKeywordIndex(tokens, index + 1, end, "on");
  if (onIndex === -1) return null;
  const classToken = tokens[onIndex + 1];
  if (
    !isKeyword(classToken, "function") &&
    !isKeyword(classToken, "procedure") &&
    !isKeyword(classToken, "routine")
  ) {
    return null;
  }
  const stopKeyword = isKeyword(tokens[index], "grant") ? "to" : "from";
  const stopIndex = topLevelKeywordIndex(tokens, onIndex + 2, end, stopKeyword);
  if (stopIndex === -1) {
    throw new MigrationDependencyClosureError(
      "UNRECOGNIZED_ROUTINE_PERMISSION_TARGET",
      stopKeyword,
    );
  }

  const targets = [];
  let cursor = onIndex + 2;
  while (cursor < stopIndex) {
    const reference = qualifiedIdentifierAt(tokens, cursor);
    if (!reference || !isPunctuation(tokens[reference.nextIndex], "(")) {
      throw new MigrationDependencyClosureError(
        "UNRECOGNIZED_ROUTINE_PERMISSION_TARGET",
        tokens[cursor]?.raw ?? `offset ${tokens[index].start}`,
      );
    }
    const parsedSignature = routineSignatureAt(tokens, reference.nextIndex);
    targets.push({
      kind: "function",
      identifier: manifestIdentifierFromQualified(reference),
      routineSignature: parsedSignature.canonical,
    });
    cursor = parsedSignature.closeIndex + 1;
    if (!isPunctuation(tokens[cursor], ",")) break;
    cursor += 1;
  }
  if (cursor !== stopIndex) {
    throw new MigrationDependencyClosureError(
      "UNRECOGNIZED_ROUTINE_PERMISSION_TARGET",
      tokens[cursor]?.raw ?? "routine target list",
    );
  }
  return { targets, endIndex: end - 1 };
}

function assertRoutineSignatureMatches(
  target,
  availableRoutineSignatures,
  currentProducedState,
  droppedState,
) {
  const objectKey = `${target.kind}:${target.identifier}`;
  const current = currentProducedState.get(objectKey);
  const hasAvailable =
    !droppedState.has(objectKey) &&
    availableRoutineSignatures.has(target.identifier);
  if (!current && !hasAvailable) {
    throw new MigrationDependencyClosureError(
      "UNREGISTERED_SCHEMA_OBJECT_OPERATION",
      `routine:${target.identifier}${target.routineSignature}`,
    );
  }
  const expected = current?.routineSignature ??
    availableRoutineSignatures.get(target.identifier);
  if (expected === null || expected === undefined) {
    throw new MigrationDependencyClosureError(
      "UNSUPPORTED_ROUTINE_SIGNATURE_REGISTRY",
      target.identifier,
    );
  }
  if (expected !== target.routineSignature) {
    throw new MigrationDependencyClosureError(
      "UNSUPPORTED_OVERLOADED_ROUTINE_IDENTITY",
      `${target.identifier}:${target.routineSignature}`,
    );
  }
}

function deriveDatabaseObjectOperations(
  sql,
  availableObjects,
  producedObjectDeclarations,
  availableRoutineSignatures,
) {
  const modified = [];
  const dropped = [];
  const renamedProduced = [];
  const renamedProducedDeclarations = [];
  const available = canonicalObjects(availableObjects);
  const produced = canonicalObjects(producedObjectDeclarations);
  const currentProducedState = new Map();
  const droppedState = new Set();

  for (const scope of executableStatementScopeRecords(sql)) {
    if (scope.kind === "STORED_ROUTINE_BODY") continue;
    const tokens = scope.tokens;
    for (let index = 0; index < tokens.length; index += 1) {
      const currentDeclaration = producedObjectAt(tokens, index);
      if (currentDeclaration) {
        const key = `${currentDeclaration.kind}:${currentDeclaration.identifier}`;
        if (currentDeclaration.kind === "function") {
          const previousCurrent = currentProducedState.get(key);
          const previousAvailable = droppedState.has(key)
            ? undefined
            : availableRoutineSignatures.get(currentDeclaration.identifier);
          const priorSignature = previousCurrent?.routineSignature ?? previousAvailable;
          if (
            priorSignature !== undefined &&
            priorSignature !== null &&
            priorSignature !== currentDeclaration.routineSignature
          ) {
            throw new MigrationDependencyClosureError(
              "UNSUPPORTED_OVERLOADED_ROUTINE_IDENTITY",
              currentDeclaration.identifier,
            );
          }
        }
        currentProducedState.set(key, currentDeclaration);
      }

      const permissionTargets = routinePermissionTargetsAt(tokens, index);
      if (permissionTargets) {
        for (const target of permissionTargets.targets) {
          assertRoutineSignatureMatches(
            target,
            availableRoutineSignatures,
            currentProducedState,
            droppedState,
          );
        }
        index = permissionTargets.endIndex;
        continue;
      }

      const parsed = schemaObjectOperationsAt(tokens, index);
      if (!parsed) continue;
      const transitionPolicy = doTransitionPolicy(scope, tokens[index]);
      for (const operation of parsed.operations) {
        if (transitionPolicy.terminating) {
          throw new MigrationDependencyClosureError(
            "UNSUPPORTED_CONDITIONAL_DO_OBJECT_TRANSITION",
            `terminating:${operation.action}:${operation.object.kind}:${operation.object.identifier}`,
          );
        }
        if (transitionPolicy.conditional) {
          if (["drop", "rename"].includes(operation.action)) {
            throw new MigrationDependencyClosureError(
              "UNSUPPORTED_CONDITIONAL_DO_OBJECT_TRANSITION",
              `${operation.action}:${operation.object.kind}:${operation.object.identifier}`,
            );
          }
          if (operation.action === "modify") continue;
        }
        const operationKey = `${operation.object.kind}:${operation.object.identifier}`;
        const exactAvailable = available.filter(
          (object) =>
            !droppedState.has(operationKey) &&
            object.kind === operation.object.kind &&
            object.identifier === operation.object.identifier,
        );
        const currentProduction = currentProducedState.get(operationKey);
        const identityWithWrongKind = [...available, ...currentProducedState.values()].some(
          (object) =>
            !droppedState.has(`${object.kind}:${object.identifier}`) &&
            object.identifier === operation.object.identifier &&
            object.kind !== operation.object.kind,
        );
        if (exactAvailable.length > 1) {
          throw new MigrationDependencyClosureError(
            "AMBIGUOUS_DATABASE_OBJECT_KIND",
            operation.object.identifier,
          );
        }
        if (exactAvailable.length === 0 && identityWithWrongKind) {
          throw new MigrationDependencyClosureError(
            "WRONG_DATABASE_OBJECT_KIND",
            `${operation.object.identifier}:${operation.object.kind}`,
          );
        }
        if (exactAvailable.length === 0 && !currentProduction) {
          throw new MigrationDependencyClosureError(
            "UNREGISTERED_SCHEMA_OBJECT_OPERATION",
            `${operation.action}:${operation.object.kind}:${operation.object.identifier}`,
          );
        }
        if (operation.object.kind === "function") {
          assertRoutineSignatureMatches(
            {
              ...operation.object,
              routineSignature: operation.routineSignature,
            },
            availableRoutineSignatures,
            currentProducedState,
            droppedState,
          );
        }
        if (operation.action === "modify" && exactAvailable.length === 1) {
          modified.push(operation.object);
        }
        if (operation.action === "drop" && currentProduction) {
          throw new MigrationDependencyClosureError(
            "CURRENT_MIGRATION_CREATE_DROP_UNSUPPORTED",
            operation.object.identifier,
          );
        }
        if (operation.action === "drop" && exactAvailable.length === 1) {
          dropped.push(operation.object);
          droppedState.add(operationKey);
        }
        if (operation.action === "rename") {
          if (currentProduction || exactAvailable.length !== 1 || !operation.replacement) {
            throw new MigrationDependencyClosureError(
              "UNSUPPORTED_CURRENT_MIGRATION_RENAME",
              operation.object.identifier,
            );
          }
          if (
            [...available, ...produced, ...renamedProduced].some(
              (object) =>
                object.kind === operation.replacement.kind &&
                object.identifier === operation.replacement.identifier,
            )
          ) {
            throw new MigrationDependencyClosureError(
              "DUPLICATE_RENAMED_DATABASE_OBJECT",
              operation.replacement.identifier,
            );
          }
          dropped.push(operation.object);
          droppedState.add(operationKey);
          renamedProduced.push(operation.replacement);
          const renamedDeclaration = {
            ...operation.replacement,
            routineSignature: operation.routineSignature,
          };
          renamedProducedDeclarations.push(renamedDeclaration);
          currentProducedState.set(
            `${operation.replacement.kind}:${operation.replacement.identifier}`,
            renamedDeclaration,
          );
        }
      }
      index = parsed.endIndex;
    }
  }

  return {
    modifiedObjects: canonicalObjects(modified),
    droppedObjects: canonicalObjects(dropped),
    renamedProducedObjects: canonicalObjects(renamedProduced),
    renamedProducedDeclarations,
  };
}

function identifierReferenceAt(tokens, index) {
  const qualified = qualifiedIdentifierAt(tokens, index);
  if (qualified) return qualified;
  if (!isIdentifierToken(tokens[index])) return null;
  return {
    schema: null,
    name: tokens[index],
    start: tokens[index].start,
    end: tokens[index].end,
    index,
    nextIndex: index + 1,
  };
}

function normalizedOccurrenceComponents(reference) {
  return [reference.schema, reference.name]
    .filter(Boolean)
    .map((component) => ({
      value: component.value,
      quoted: component.type === "QUOTED_IDENTIFIER",
    }));
}

function sqlIdentifierOccurrence(
  statementOrdinal,
  reference,
  role,
  objectKind,
) {
  if (!SQL_IDENTIFIER_OCCURRENCE_ROLES_V1.includes(role)) {
    throw new MigrationDependencyClosureError(
      "UNSUPPORTED_IDENTIFIER_OCCURRENCE_ROLE",
      role,
    );
  }
  if (!SQL_IDENTIFIER_OCCURRENCE_OBJECT_KINDS_V1.includes(objectKind)) {
    throw new MigrationDependencyClosureError(
      "UNSUPPORTED_IDENTIFIER_OCCURRENCE_OBJECT_KIND",
      objectKind,
    );
  }
  return {
    statementOrdinal,
    tokenStart: reference.start,
    tokenEnd: reference.end,
    role,
    objectKind,
    normalizedComponents: normalizedOccurrenceComponents(reference),
  };
}

function sqlIdentifierOccurrenceIdentity(occurrence) {
  return JSON.stringify([
    occurrence.statementOrdinal,
    occurrence.tokenStart,
    occurrence.tokenEnd,
    occurrence.role,
    occurrence.objectKind,
    occurrence.normalizedComponents,
  ]);
}

function indexTargetReferencesForStatement(tokens) {
  const references = [];
  let cursor = 0;

  if (isKeyword(tokens[cursor], "create")) {
    cursor += 1;
    if (isKeyword(tokens[cursor], "unique")) cursor += 1;
    if (!isKeyword(tokens[cursor], "index")) return references;
    cursor += 1;
    if (isKeyword(tokens[cursor], "concurrently")) cursor += 1;
    if (
      isKeyword(tokens[cursor], "if") &&
      isKeyword(tokens[cursor + 1], "not") &&
      isKeyword(tokens[cursor + 2], "exists")
    ) {
      cursor += 3;
    }
    const reference = identifierReferenceAt(tokens, cursor);
    if (reference) references.push(reference);
    return references;
  }

  if (isKeyword(tokens[cursor], "drop") && isKeyword(tokens[cursor + 1], "index")) {
    cursor += 2;
    if (isKeyword(tokens[cursor], "concurrently")) cursor += 1;
    if (isKeyword(tokens[cursor], "if") && isKeyword(tokens[cursor + 1], "exists")) {
      cursor += 2;
    }
    while (cursor < tokens.length) {
      const reference = identifierReferenceAt(tokens, cursor);
      if (!reference) break;
      references.push(reference);
      cursor = reference.nextIndex;
      if (!isPunctuation(tokens[cursor], ",")) break;
      cursor += 1;
    }
    return references;
  }

  if (isKeyword(tokens[cursor], "alter") && isKeyword(tokens[cursor + 1], "index")) {
    cursor += 2;
    if (isKeyword(tokens[cursor], "if") && isKeyword(tokens[cursor + 1], "exists")) {
      cursor += 2;
    }
    const reference = identifierReferenceAt(tokens, cursor);
    if (reference) references.push(reference);
    return references;
  }

  if (
    isKeyword(tokens[cursor], "comment") &&
    isKeyword(tokens[cursor + 1], "on") &&
    isKeyword(tokens[cursor + 2], "index")
  ) {
    const reference = identifierReferenceAt(tokens, cursor + 3);
    if (reference) references.push(reference);
    return references;
  }

  if (isKeyword(tokens[cursor], "reindex")) {
    cursor += 1;
    if (isPunctuation(tokens[cursor], "(")) {
      const closeIndex = matchingCloseIndex(tokens, cursor);
      if (closeIndex === -1) {
        throw new MigrationDependencyClosureError(
          "UNSUPPORTED_INDEX_TARGET_SYNTAX",
          `offset ${tokens[cursor].start}`,
        );
      }
      cursor = closeIndex + 1;
    }
    if (!isKeyword(tokens[cursor], "index")) return references;
    cursor += 1;
    if (isKeyword(tokens[cursor], "concurrently")) cursor += 1;
    const reference = identifierReferenceAt(tokens, cursor);
    if (reference) references.push(reference);
  }

  return references;
}

export function deriveIndexTargetOccurrences(sql) {
  return executableStatementScopeRecords(sql)
    .flatMap((statement) =>
      indexTargetReferencesForStatement(statement.tokens).map((reference) =>
        sqlIdentifierOccurrence(
          statement.statementOrdinal,
          reference,
          "index_target",
          "index",
        ),
      ),
    )
    .sort(
      (left, right) =>
        left.tokenStart - right.tokenStart ||
        left.statementOrdinal - right.statementOrdinal,
    );
}

function addQualifiedSignatureTargetIndexes(
  targetIndexes,
  tokens,
  targetStart,
  statementEnd,
) {
  let cursor = targetStart;
  while (cursor >= 0 && cursor < statementEnd) {
    const reference = qualifiedIdentifierAt(tokens, cursor);
    const targetEnd = qualifiedUnitEnd(tokens, cursor);
    if (targetEnd === cursor || !isPunctuation(tokens[targetEnd], "(")) return;
    if (reference) targetIndexes.add(reference.index);
    const closeIndex = matchingCloseIndex(tokens, targetEnd);
    if (closeIndex === -1) return;
    cursor = closeIndex + 1;
    if (!isPunctuation(tokens[cursor], ",")) return;
    cursor += 1;
  }
}

function nonReportableObjectTargetIndexes(tokens) {
  const targetIndexes = new Set();
  const statementStart = 0;
  const statementEnd = tokens.length;
  const aggregateStart = ordinaryObjectSignatureTargetStart(
    tokens,
    statementStart,
    statementEnd,
    "aggregate",
    { includeCreate: true },
  );
  if (aggregateStart !== -1) {
    addQualifiedSignatureTargetIndexes(
      targetIndexes,
      tokens,
      aggregateStart,
      statementEnd,
    );
  }

  if (
    isKeyword(tokens[statementStart], "alter") &&
    isKeyword(tokens[statementStart + 1], "extension") &&
    isIdentifierToken(tokens[statementStart + 2]) &&
    (isKeyword(tokens[statementStart + 3], "add") ||
      isKeyword(tokens[statementStart + 3], "drop")) &&
    isKeyword(tokens[statementStart + 4], "aggregate")
  ) {
    addQualifiedSignatureTargetIndexes(
      targetIndexes,
      tokens,
      statementStart + 5,
      statementEnd,
    );
  }

  if (
    isKeyword(tokens[statementStart], "alter") &&
    isKeyword(tokens[statementStart + 1], "extension") &&
    isIdentifierToken(tokens[statementStart + 2]) &&
    (isKeyword(tokens[statementStart + 3], "add") ||
      isKeyword(tokens[statementStart + 3], "drop")) &&
    isKeyword(tokens[statementStart + 4], "operator") &&
    (isKeyword(tokens[statementStart + 5], "class") ||
      isKeyword(tokens[statementStart + 5], "family"))
  ) {
    const memberTarget = qualifiedIdentifierAt(tokens, statementStart + 6);
    if (memberTarget) targetIndexes.add(memberTarget.index);
  }

  let cursor = statementStart;
  if (isKeyword(tokens[cursor], "create")) {
    const operatorIndex = createKindIndex(
      tokens,
      statementStart,
      statementEnd,
      ["operator"],
    );
    if (
      operatorIndex !== -1 &&
      (isKeyword(tokens[operatorIndex + 1], "class") ||
        isKeyword(tokens[operatorIndex + 1], "family"))
    ) {
      cursor = operatorIndex + 2;
    } else {
      cursor = -1;
    }
  } else if (isKeyword(tokens[cursor], "alter") || isKeyword(tokens[cursor], "drop")) {
    cursor += 1;
    if (
      !isKeyword(tokens[cursor], "operator") ||
      (!isKeyword(tokens[cursor + 1], "class") &&
        !isKeyword(tokens[cursor + 1], "family"))
    ) {
      cursor = -1;
    } else {
      cursor += 2;
    }
  } else if (
    isKeyword(tokens[cursor], "comment") &&
    isKeyword(tokens[cursor + 1], "on") &&
    isKeyword(tokens[cursor + 2], "operator") &&
    (isKeyword(tokens[cursor + 3], "class") ||
      isKeyword(tokens[cursor + 3], "family"))
  ) {
    cursor += 4;
  } else {
    cursor = -1;
  }
  if (
    cursor !== -1 &&
    isKeyword(tokens[cursor], "if") &&
    isKeyword(tokens[cursor + 1], "exists")
  ) {
    cursor += 2;
  }
  const operatorFamilyTarget =
    cursor === -1 ? null : qualifiedIdentifierAt(tokens, cursor);
  if (operatorFamilyTarget) targetIndexes.add(operatorFamilyTarget.index);
  return targetIndexes;
}

function closedQualifiedStaticRegistry() {
  const registry = [];
  for (const entry of EXTERNAL_FUNCTION_REGISTRY_V1) {
    registry.push({
      kind: "function",
      identifier: `${entry.schema}.${entry.name}`,
    });
  }
  for (const extension of EXTENSION_REGISTRY_V1) {
    for (const detector of extension.useDetectors) {
      if (detector.components.length === 2) {
        registry.push({ kind: detector.kind, identifier: detector.identifier });
      }
    }
  }
  for (const identifier of new Set(ROUTINE_BUILTIN_TYPE_ALIASES_V1.values())) {
    registry.push({ kind: "type", identifier });
  }
  for (const identifier of ROUTINE_PG_CATALOG_TYPE_NAMES_V1.values()) {
    registry.push({ kind: "type", identifier });
  }
  for (const entry of ROUTINE_COMPOUND_BUILTIN_TYPES_V1) {
    registry.push({ kind: "type", identifier: entry.canonical });
  }
  return canonicalObjects(registry);
}

function occurrenceAt(tokens, index, statementOrdinal = null) {
  const reference = qualifiedIdentifierAt(tokens, index);
  return reference
    ? {
        ...reference,
        statementOrdinal,
        tokens,
        previous: tokens[index - 1] ?? null,
        next: tokens[reference.nextIndex] ?? null,
      }
    : null;
}

function classifiedOccurrenceRole(occurrence, producerDeclaration) {
  if (producerDeclaration) {
    return producerDeclaration.kind === "function"
      ? ["function_definition", "function"]
      : producerDeclaration.kind === "type"
        ? ["other_closed_role", "type"]
        : ["other_closed_role", "relation"];
  }
  if (isQualifiedColumnThroughRelationAlias(occurrence)) {
    return ["column_reference", "column"];
  }
  const kinds = classifyQualifiedOccurrence(occurrence) ?? [];
  if (kinds.includes("function")) return ["function_call", "function"];
  if (kinds.includes("type")) return ["type_reference", "type"];
  if (kinds.some((kind) => ["table", "view", "sequence"].includes(kind))) {
    return ["relation_reference", "relation"];
  }
  if (isNonReportableQualifiedOccurrence(occurrence)) {
    return ["column_reference", "column"];
  }
  return ["column_reference", "column"];
}

export function deriveSqlIdentifierOccurrences(sql) {
  const statements = executableStatementScopeRecords(sql);
  const indexOccurrences = deriveIndexTargetOccurrences(sql);
  const indexOccurrenceIdentities = new Set(
    indexOccurrences.map(sqlIdentifierOccurrenceIdentity),
  );
  const occurrences = [...indexOccurrences];

  for (const extension of extractCreateExtensionOccurrences(sql)) {
    const statement = statements.find(
      (candidate) =>
        candidate.tokens[0]?.start <= extension.nameToken.start &&
        candidate.tokens.at(-1)?.end >= extension.nameToken.end,
    );
    if (!statement) {
      throw new MigrationDependencyClosureError(
        "UNBOUND_EXTENSION_IDENTIFIER_OCCURRENCE",
        extension.declaration.name,
      );
    }
    occurrences.push(
      sqlIdentifierOccurrence(
        statement.statementOrdinal,
        identifierReferenceAt([extension.nameToken], 0),
        "extension_name",
        "extension",
      ),
    );
    if (extension.schemaToken) {
      occurrences.push(
        sqlIdentifierOccurrence(
          statement.statementOrdinal,
          identifierReferenceAt([extension.schemaToken], 0),
          "schema_reference",
          "schema",
        ),
      );
    }
  }

  for (const statement of statements) {
    const producerDeclarations = new Map();
    for (let index = 0; index < statement.tokens.length; index += 1) {
      const declaration = producedObjectAt(statement.tokens, index);
      if (declaration) {
        producerDeclarations.set(declaration.targetIndex, declaration);
      }
    }
    for (let index = 0; index < statement.tokens.length; index += 1) {
      const occurrence = occurrenceAt(
        statement.tokens,
        index,
        statement.statementOrdinal,
      );
      if (!occurrence) continue;
      const indexCandidate = sqlIdentifierOccurrence(
        statement.statementOrdinal,
        occurrence,
        "index_target",
        "index",
      );
      if (!indexOccurrenceIdentities.has(sqlIdentifierOccurrenceIdentity(indexCandidate))) {
        const [role, objectKind] = classifiedOccurrenceRole(
          occurrence,
          producerDeclarations.get(index),
        );
        occurrences.push(
          sqlIdentifierOccurrence(
            statement.statementOrdinal,
            occurrence,
            role,
            objectKind,
          ),
        );
      }
      index = occurrence.nextIndex - 1;
    }
  }

  return occurrences.sort(
    (left, right) =>
      left.tokenStart - right.tokenStart ||
      left.tokenEnd - right.tokenEnd ||
      left.role.localeCompare(right.role),
  );
}

function identifierOccurrenceEvidence(occurrences) {
  return {
    modelVersion: "SqlIdentifierOccurrenceV1",
    occurrenceCount: occurrences.length,
    canonicalSha256: sha256(JSON.stringify(occurrences)),
    exclusionOccurrences: occurrences.filter(
      (occurrence) => occurrence.role === "index_target",
    ),
  };
}

function validateOrderedOccurrence(
  occurrence,
  state,
  reportableKeys,
  staticRegistry,
  closedSchemas,
  references,
) {
  if (isNonReportableQualifiedOccurrence(occurrence)) return;
  const dynamic = [...state.values()];
  const dynamicMatches = matchingTypedObjects(occurrence, dynamic);
  if (dynamicMatches.length > 0) {
    for (const object of dynamicMatches) {
      if (reportableKeys.has(`${object.kind}:${object.identifier}`)) {
        references.push(object);
      }
    }
    return;
  }
  if (matchingTypedObjects(occurrence, staticRegistry).length > 0) return;
  const classifiedKinds = classifyQualifiedOccurrence(occurrence);
  const mustClassify =
    classifiedKinds !== null ||
    closedSchemas.has(occurrence.schema.value) ||
    occurrence.schema.quoted;
  if (mustClassify) {
    throw new MigrationDependencyClosureError(
      "UNREGISTERED_QUALIFIED_DATABASE_OBJECT",
      `${displayQualifiedIdentifier(occurrence)}:${classifiedKinds?.join("|") ?? "closed-schema"}`,
    );
  }
}

function isCurrentProducerSelfReference(occurrence, declarations) {
  if (isKeyword(occurrence.previous, "references")) {
    const identifier = manifestIdentifierFromQualified(occurrence);
    return declarations.some(
      (declaration) =>
        declaration.kind === "table" && declaration.identifier === identifier,
    );
  }
  const { start, end } = statementRange(occurrence.tokens, occurrence.index);
  let cursor = start;
  if (!isKeyword(occurrence.tokens[cursor], "create")) return false;
  cursor += 1;
  if (
    isKeyword(occurrence.tokens[cursor], "or") &&
    isKeyword(occurrence.tokens[cursor + 1], "replace")
  ) {
    cursor += 2;
  }
  while (
    ["global", "local", "temp", "temporary"].some((keyword) =>
      isKeyword(occurrence.tokens[cursor], keyword),
    )
  ) {
    cursor += 1;
  }
  if (
    cursor >= end ||
    !isKeyword(occurrence.tokens[cursor], "recursive") ||
    !isKeyword(occurrence.tokens[cursor + 1], "view")
  ) {
    return false;
  }
  const identifier = manifestIdentifierFromQualified(occurrence);
  const occurrenceKinds = qualifiedStatementObjectKinds(occurrence);
  if (
    !occurrenceKinds?.some((kind) => ["table", "view"].includes(kind))
  ) {
    return false;
  }
  return declarations.some(
    (declaration) =>
      declaration.kind === "view" && declaration.identifier === identifier,
  );
}

function deriveStatementOrderedDatabaseObjectReferences(
  sql,
  availableObjects,
  closedQualifiedDatabaseSchemas,
) {
  const staticRegistry = closedQualifiedStaticRegistry();
  const closedSchemas = new Set(closedQualifiedDatabaseSchemas);
  const indexTargetOccurrenceIdentities = new Set(
    deriveIndexTargetOccurrences(sql).map(sqlIdentifierOccurrenceIdentity),
  );
  const state = new Map(
    canonicalObjects(availableObjects).map((object) => [
      `${object.kind}:${object.identifier}`,
      object,
    ]),
  );
  const reportableKeys = new Set(state.keys());
  const references = [];
  const storedBodyOccurrences = [];
  for (const scope of executableStatementScopeRecords(sql)) {
    const tokens = scope.tokens;
    const stateBefore = new Map(state);
    const reportableBefore = new Set(reportableKeys);
    const declarations = [];
    const producerTargets = new Set();
    const nonReportableTargets = nonReportableObjectTargetIndexes(tokens);
    const operations = [];
    for (let index = 0; index < tokens.length; index += 1) {
      const declaration = producedObjectAt(tokens, index);
      if (declaration) {
        producerTargets.add(declaration.targetIndex);
        if (scope.kind !== "STORED_ROUTINE_BODY") {
          declarations.push(declaration);
        }
      }
      if (scope.kind !== "STORED_ROUTINE_BODY") {
        const parsed = schemaObjectOperationsAt(tokens, index);
        if (parsed) {
          const transitionPolicy = doTransitionPolicy(scope, tokens[index]);
          for (const operation of parsed.operations) {
            if (transitionPolicy.terminating) {
              throw new MigrationDependencyClosureError(
                "UNSUPPORTED_CONDITIONAL_DO_OBJECT_TRANSITION",
                `terminating:${operation.action}:${operation.object.kind}:${operation.object.identifier}`,
              );
            }
            if (
              transitionPolicy.conditional &&
              ["drop", "rename"].includes(operation.action)
            ) {
              throw new MigrationDependencyClosureError(
                "UNSUPPORTED_CONDITIONAL_DO_OBJECT_TRANSITION",
                `${operation.action}:${operation.object.kind}:${operation.object.identifier}`,
              );
            }
            if (!(transitionPolicy.conditional && operation.action === "modify")) {
              operations.push(operation);
            }
          }
          index = parsed.endIndex;
        }
      }
    }

    const validationState = new Map(stateBefore);
    for (let index = 0; index < tokens.length; index += 1) {
      const occurrence = occurrenceAt(tokens, index, scope.statementOrdinal);
      if (!occurrence) continue;
      const indexTargetCandidate = sqlIdentifierOccurrence(
        scope.statementOrdinal,
        occurrence,
        "index_target",
        "index",
      );
      if (
        !producerTargets.has(index) &&
        !nonReportableTargets.has(index) &&
        !indexTargetOccurrenceIdentities.has(
          sqlIdentifierOccurrenceIdentity(indexTargetCandidate),
        ) &&
        !isCurrentProducerSelfReference(occurrence, declarations)
      ) {
        if (scope.kind === "STORED_ROUTINE_BODY") {
          storedBodyOccurrences.push(occurrence);
        } else {
          validateOrderedOccurrence(
            occurrence,
            validationState,
            reportableBefore,
            staticRegistry,
            closedSchemas,
            references,
          );
        }
      }
      index = occurrence.nextIndex - 1;
    }

    for (const operation of operations) {
      const key = `${operation.object.kind}:${operation.object.identifier}`;
      if (operation.action === "drop" || operation.action === "rename") {
        state.delete(key);
        reportableKeys.delete(key);
      }
      if (operation.action === "rename" && operation.replacement) {
        const replacementKey = `${operation.replacement.kind}:${operation.replacement.identifier}`;
        state.set(replacementKey, operation.replacement);
        reportableKeys.delete(replacementKey);
      }
    }
    for (const declaration of declarations) {
      const object = { kind: declaration.kind, identifier: declaration.identifier };
      const key = `${object.kind}:${object.identifier}`;
      if (declaration.orReplace && state.has(key) && reportableKeys.has(key)) {
        references.push(state.get(key));
      }
      state.set(key, object);
      if (!declaration.orReplace) reportableKeys.delete(key);
    }
  }
  for (const occurrence of storedBodyOccurrences) {
    validateOrderedOccurrence(
      occurrence,
      state,
      reportableKeys,
      staticRegistry,
      closedSchemas,
      references,
    );
  }
  return canonicalObjects(references);
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
        `${extension.name}:${extension.schema ?? 'unspecified'}`,
      );
    }
    const key = `${extension.name}:${extension.schema ?? ''}`;
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

export function derivePolicyOperationIdentities(sql) {
  const tokens = executableTokenScopes(sql, {
    includeExecutableDollarBodies: false,
  })[0];
  const identities = [];

  for (let index = 0; index < tokens.length; index += 1) {
    if (
      !["create", "alter", "drop"].some((keyword) =>
        isKeyword(tokens[index], keyword),
      ) ||
      !isKeyword(tokens[index + 1], "policy")
    ) {
      continue;
    }
    let cursor = index + 2;
    if (isKeyword(tokens[cursor], "if") && isKeyword(tokens[cursor + 1], "exists")) {
      cursor += 2;
    }
    const policy = tokens[cursor];
    if (!isIdentifierToken(policy) || !isKeyword(tokens[cursor + 1], "on")) {
      continue;
    }
    const table = qualifiedIdentifierAt(tokens, cursor + 2);
    if (!table) continue;
    identities.push(
      `${manifestIdentifierFromQualified(table)}::${policy.value}`,
    );
  }
  return [...new Set(identities)];
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
  const canonicalSqlByFilename = new Map(
    [...sqlByFilename].map(([filename, sql]) => [
      filename,
      typeof sql === "string" ? canonicalUtf8Lf(sql) : sql,
    ]),
  );
  const priorProducers = new Map();
  const environmentExtensions = indexEnvironmentExtensions(
    environmentRequiredExtensions,
  );
  const canonicalExternalObjects = canonicalObjects(externalDatabaseObjects);
  const availableObjects = new Map(
    canonicalExternalObjects.map((object) => [
      `${object.kind}:${object.identifier}`,
      object,
    ]),
  );
  const availableRoutineSignatures = new Map(
    canonicalExternalObjects
      .filter((object) => object.kind === "function")
      .map((object) => [object.identifier, null]),
  );
  const objectOrigins = new Map(
    canonicalExternalObjects.map((object) => [
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
    canonicalSqlByFilename,
  );
  const latestPolicyProducers = new Map();
  const results = [];

  for (const record of [...records].sort(
    (left, right) => left.freshHistoryOrder - right.freshHistoryOrder,
  )) {
    if (!record.presentOnLiveMain) continue;
    const sql = canonicalSqlByFilename.get(record.currentFilename);
    if (typeof sql !== "string") {
      throw new MigrationDependencyClosureError(
        "MISSING_MIGRATION_SQL",
        record.currentFilename,
      );
    }

    assertSupportedExtensionLifecycle(sql);
    const createdExtensionOccurrences = extractCreateExtensionOccurrences(sql);
    const createdExtensions = createdExtensionOccurrences.map(
      (occurrence) => occurrence.declaration,
    );
    const requiredExtensionGroups = deriveRequiredExtensionUseGroups(sql);
    const requiredExtensions = requiredExtensionGroups.map((requirement) => {
      const currentOccurrence = [...createdExtensionOccurrences]
        .reverse()
        .find(
          (candidate) =>
            candidate.startOffset < requirement.firstUseOffset &&
            candidate.declaration.name === requirement.name &&
            (requirement.schema === null ||
              candidate.declaration.schema === requirement.schema),
        );
      const prior = [...(priorProducers.get(requirement.name) ?? [])]
        .reverse()
        .find(
          (candidate) =>
            requirement.schema === null ||
            candidate.schema === requirement.schema,
        );
      const producer = currentOccurrence
        ? {
            ...currentOccurrence.declaration,
            currentFilename: record.currentFilename,
            freshHistoryOrder: record.freshHistoryOrder,
          }
        : prior;
      const environment =
        environmentExtensions.get(
          `${requirement.name}:${requirement.schema ?? ''}`,
        ) ??
        (requirement.schema === null
          ? [...environmentExtensions.values()].find(
              (candidate) => candidate.name === requirement.name,
            )
          : undefined);

      if (!producer && !environment) {
        const laterDeclaration = createdExtensionOccurrences.some(
          (candidate) =>
            candidate.declaration.name === requirement.name &&
            (requirement.schema === null ||
              candidate.declaration.schema === requirement.schema),
        );
        throw new MigrationDependencyClosureError(
          laterDeclaration
            ? "EXTENSION_USE_BEFORE_CREATE"
            : "UNRESOLVED_EXTENSION_USE",
          `${record.currentFilename}:${requirement.name}:${requirement.schema ?? 'unqualified'}`,
        );
      }

      const publicRequirement = {
        name: requirement.name,
        schema: requirement.schema,
        evidence: requirement.evidence,
      };
      return {
        ...publicRequirement,
        satisfaction: !producer
          ? "ENVIRONMENT"
          : producer.currentFilename === record.currentFilename
          ? "CURRENT_MIGRATION_CREATE"
          : "PREDECESSOR_MIGRATION",
        producerMigration: producer?.currentFilename ?? null,
        producerFreshHistoryOrder: producer?.freshHistoryOrder ?? null,
      };
    });

    const declaredProducedObjectDeclarations =
      deriveProducedDatabaseObjectDeclarations(sql);
    const declaredProducedObjects = canonicalObjects(
      declaredProducedObjectDeclarations,
    );
    const databaseObjectOperations = deriveDatabaseObjectOperations(
      sql,
      [...availableObjects.values()],
      declaredProducedObjectDeclarations,
      availableRoutineSignatures,
    );
    const producedObjects = canonicalObjects([
      ...declaredProducedObjects,
      ...databaseObjectOperations.renamedProducedObjects,
    ]);
    const internalFunctionIdentifiers = [
      ...availableObjects.values(),
      ...declaredProducedObjectDeclarations,
      ...databaseObjectOperations.renamedProducedDeclarations,
    ]
      .filter(
        (object) =>
          object.kind === "function" &&
          !EXTERNAL_FUNCTION_REGISTRY_V1.some(
            (entry) => object.identifier === `${entry.schema}.${entry.name}`,
          ),
      )
      .map((object) => object.identifier);
    const externalFunctions = deriveExternalFunctionDependencies(
      sql,
      internalFunctionIdentifiers,
    );
    const referencedDatabaseObjects = deriveStatementOrderedDatabaseObjectReferences(
      sql,
      [...availableObjects.values()],
      closedQualifiedDatabaseSchemas,
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
          ...(objectOrigins.get(
            `${object.kind}:${object.identifier}`,
          ) ?? []),
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
    const identifierOccurrences = deriveSqlIdentifierOccurrences(sql);
    results.push({
      currentFilename: record.currentFilename,
      sqlSha256: sha256(sql),
      identifierOccurrences,
      identifierOccurrenceEvidence:
        identifierOccurrenceEvidence(identifierOccurrences),
      createdExtensions,
      requiredExtensions,
      extensionDependencyPredecessors: [
        ...new Set(
          requiredExtensions
            .filter(
              (entry) => entry.satisfaction === "PREDECESSOR_MIGRATION",
            )
            .map((entry) => entry.producerMigration),
        ),
      ],
      externalFunctions,
      producedObjects,
      referencedDatabaseObjects,
      modifiedObjects: databaseObjectOperations.modifiedObjects,
      droppedObjects: databaseObjectOperations.droppedObjects,
      exactDependencyPredecessors,
    });

    for (const occurrence of createdExtensionOccurrences) {
      const extension = occurrence.declaration;
      const list = priorProducers.get(extension.name) ?? [];
      list.push({
        ...extension,
        currentFilename: record.currentFilename,
        freshHistoryOrder: record.freshHistoryOrder,
      });
      priorProducers.set(extension.name, list);
    }
    for (const object of databaseObjectOperations.droppedObjects) {
      const key = `${object.kind}:${object.identifier}`;
      availableObjects.delete(key);
      objectOrigins.delete(key);
      if (object.kind === "function") {
        availableRoutineSignatures.delete(object.identifier);
      }
    }
    for (const object of producedObjects) {
      const key = `${object.kind}:${object.identifier}`;
      availableObjects.set(key, object);
      objectOrigins.set(key, new Set([record.currentFilename]));
    }
    for (const declaration of [
      ...declaredProducedObjectDeclarations,
      ...databaseObjectOperations.renamedProducedDeclarations,
    ]) {
      if (declaration.kind === "function") {
        availableRoutineSignatures.set(
          declaration.identifier,
          declaration.routineSignature,
        );
      }
    }
    for (const object of databaseObjectOperations.modifiedObjects) {
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

function validateMigrationAuthorityEnvelope(manifest, sqlByFilename) {
  if (!Array.isArray(manifest.records) || manifest.records.length === 0) {
    throw new MigrationDependencyClosureError(
      "INVALID_MIGRATION_MANIFEST_RECORDS",
      "records",
    );
  }
  if (
    manifest.donorOnlyMigrationCount !== 0 ||
    manifest.records.some(
      (record) => record.donorOnly || record.presentOnLiveMain !== true,
    )
  ) {
    throw new MigrationDependencyClosureError(
      "DONOR_OR_NON_LIVE_MIGRATION_RECORD_FORBIDDEN",
      "C3R-A0",
    );
  }

  const filenames = manifest.records.map((record) => record.currentFilename);
  if (new Set(filenames).size !== filenames.length) {
    throw new MigrationDependencyClosureError(
      "DUPLICATE_MIGRATION_MANIFEST_RECORD",
      "currentFilename",
    );
  }
  if (
    manifest.liveMainMigrationCount !== filenames.length ||
    !exactEqual([...manifest.liveMainLexicalInventory].sort(), [...filenames].sort()) ||
    !exactEqual([...sqlByFilename.keys()].sort(), [...filenames].sort())
  ) {
    throw new MigrationDependencyClosureError(
      "MIGRATION_SQL_MANIFEST_FILENAME_SET_MISMATCH",
      JSON.stringify({ filenames, loaded: [...sqlByFilename.keys()] }),
    );
  }

  const canonicalVersions = new Set();
  const freshHistoryOrders = new Set();
  const currentVersionCounts = new Map();
  const currentVersionWidthCounts = {};
  let knownUnappliedRecordCount = 0;
  for (const [recordIndex, record] of manifest.records.entries()) {
    const currentToken = record.currentFilename.split("_", 1)[0];
    if (record.currentVersionToken !== currentToken) {
      throw new MigrationDependencyClosureError(
        "CURRENT_MIGRATION_VERSION_TOKEN_MISMATCH",
        record.currentFilename,
      );
    }
    currentVersionCounts.set(
      currentToken,
      (currentVersionCounts.get(currentToken) ?? 0) + 1,
    );
    currentVersionWidthCounts[currentToken.length] =
      (currentVersionWidthCounts[currentToken.length] ?? 0) + 1;
    if (!/^\d{14}$/u.test(record.canonicalProposedVersionToken)) {
      throw new MigrationDependencyClosureError(
        "INVALID_CANONICAL_MIGRATION_VERSION",
        record.currentFilename,
      );
    }
    if (canonicalVersions.has(record.canonicalProposedVersionToken)) {
      throw new MigrationDependencyClosureError(
        "DUPLICATE_CANONICAL_MIGRATION_VERSION",
        record.canonicalProposedVersionToken,
      );
    }
    canonicalVersions.add(record.canonicalProposedVersionToken);
    if (
      !Number.isInteger(record.freshHistoryOrder) ||
      record.freshHistoryOrder < 1 ||
      freshHistoryOrders.has(record.freshHistoryOrder)
    ) {
      throw new MigrationDependencyClosureError(
        "INVALID_FRESH_HISTORY_ORDER",
        record.currentFilename,
      );
    }
    freshHistoryOrders.add(record.freshHistoryOrder);
    if (record.freshHistoryOrder !== recordIndex + 1) {
      throw new MigrationDependencyClosureError(
        "MANIFEST_RECORD_ORDER_MISMATCH",
        record.currentFilename,
      );
    }

    if (
      !manifest.remoteApplicationStatusEnum.includes(
        record.remoteApplicationStatus,
      )
    ) {
      throw new MigrationDependencyClosureError(
        "INVALID_REMOTE_APPLICATION_STATUS",
        record.currentFilename,
      );
    }
    if (
      ["UNKNOWN", "KNOWN_APPLIED"].includes(record.remoteApplicationStatus) &&
      (record.filenameMutationEligibleInThisWork !== false ||
        record.ownerGateRequired !== true ||
        record.remoteHistoryRepairRequirement === "NONE")
    ) {
      throw new MigrationDependencyClosureError(
        "REMOTE_HISTORY_MUTATION_REQUIRES_OWNER_GATE",
        record.currentFilename,
      );
    }
    if (record.remoteApplicationStatus === "KNOWN_UNAPPLIED") {
      knownUnappliedRecordCount += 1;
    }
    if (
      !Array.isArray(record.consumes) ||
      !Array.isArray(record.produces) ||
      !Array.isArray(record.modifies) ||
      !Array.isArray(record.drops)
    ) {
      throw new MigrationDependencyClosureError(
        "INCOMPLETE_MIGRATION_OBJECT_OPERATION_RECORD",
        record.currentFilename,
      );
    }
    const evidence = record.identifierOccurrenceEvidence;
    if (
      evidence?.modelVersion !== "SqlIdentifierOccurrenceV1" ||
      !Number.isInteger(evidence.occurrenceCount) ||
      evidence.occurrenceCount < 0 ||
      !/^[0-9a-f]{64}$/u.test(evidence.canonicalSha256 ?? "") ||
      !Array.isArray(evidence.exclusionOccurrences)
    ) {
      throw new MigrationDependencyClosureError(
        "INVALID_IDENTIFIER_OCCURRENCE_EVIDENCE",
        record.currentFilename,
      );
    }
    const exclusionIdentities = new Set();
    for (const occurrence of evidence.exclusionOccurrences) {
      if (
        occurrence.role !== "index_target" ||
        occurrence.objectKind !== "index" ||
        !Number.isInteger(occurrence.statementOrdinal) ||
        occurrence.statementOrdinal < 1 ||
        !Number.isInteger(occurrence.tokenStart) ||
        !Number.isInteger(occurrence.tokenEnd) ||
        occurrence.tokenEnd <= occurrence.tokenStart ||
        !Array.isArray(occurrence.normalizedComponents) ||
        occurrence.normalizedComponents.length < 1
      ) {
        throw new MigrationDependencyClosureError(
          "INVALID_INDEX_EXCLUSION_OCCURRENCE",
          record.currentFilename,
        );
      }
      const identity = sqlIdentifierOccurrenceIdentity(occurrence);
      if (exclusionIdentities.has(identity)) {
        throw new MigrationDependencyClosureError(
          "DUPLICATE_INDEX_EXCLUSION_OCCURRENCE",
          record.currentFilename,
        );
      }
      exclusionIdentities.add(identity);
    }
  }

  const duplicateCurrentVersions = [...currentVersionCounts]
    .filter(([, count]) => count > 1)
    .map(([version]) => version)
    .sort();
  if (
    !exactEqual(manifest.currentVersionWidthCounts, currentVersionWidthCounts) ||
    !exactEqual(manifest.currentDuplicateVersionTokens, duplicateCurrentVersions) ||
    manifest.knownUnappliedRecordCount !== knownUnappliedRecordCount ||
    manifest.freshCurrentRemoteLedgerReadPerformed !== false ||
    manifest.freshCurrentRemoteLedgerReadAuthorized !== false
  ) {
    throw new MigrationDependencyClosureError(
      "MIGRATION_HISTORY_CLASSIFICATION_MISMATCH",
      JSON.stringify({
        currentVersionWidthCounts,
        duplicateCurrentVersions,
        knownUnappliedRecordCount,
      }),
    );
  }

  if (
    [...freshHistoryOrders].sort((left, right) => left - right).some(
      (order, index) => order !== index + 1,
    )
  ) {
    throw new MigrationDependencyClosureError(
      "NON_CONTIGUOUS_FRESH_HISTORY_ORDER",
      JSON.stringify([...freshHistoryOrders]),
    );
  }
  const hardRules = manifest.hardRules;
  if (
    manifest.canonicalProposalIsMutationAuthority !== false ||
    hardRules?.unknownRemoteStatusAllowsSilentRename !== false ||
    hardRules?.unknownRemoteStatusAllowsRemoteRepair !== false ||
    hardRules?.knownAppliedVersionAllowsRewriteWithoutOwnerGate !== false ||
    hardRules?.migrationRepairAuthorizedByThisWork !== false ||
    hardRules?.dbPushAuthorizedByThisWork !== false ||
    hardRules?.linkedResetAuthorizedByThisWork !== false ||
    hardRules?.remoteSqlAuthorizedByThisWork !== false ||
    hardRules?.remoteSchemaMutationAuthorizedByThisWork !== false
  ) {
    throw new MigrationDependencyClosureError(
      "REMOTE_MIGRATION_MUTATION_AUTHORITY_FORBIDDEN",
      "C3R-A0",
    );
  }
}

export function validateMigrationDependencyClosure(manifest, sqlByFilename) {
  validateMigrationAuthorityEnvelope(manifest, sqlByFilename);
  const closure = manifest.migrationDependencyClosureV1;
  const closedBindings = [
    ["closedDependencyClasses", CLOSED_DEPENDENCY_CLASSES_V1],
    ["parserContract", CLOSED_PARSER_CONTRACT_V1],
    ["extensionRegistry", CLOSED_EXTENSION_MANIFEST_REGISTRY_V1],
    [
      "externalFunctionRegistry",
      CLOSED_EXTERNAL_FUNCTION_MANIFEST_REGISTRY_V1,
    ],
    [
      "externalDatabaseObjectRegistry",
      EXTERNAL_DATABASE_OBJECT_REGISTRY_V1,
    ],
    ["exactComparisonRules", CLOSED_EXACT_COMPARISON_RULES_V1],
  ];
  for (const [field, expected] of closedBindings) {
    if (!exactEqual(closure?.[field], expected)) {
      throw new MigrationDependencyClosureError(
        "INVALID_CLOSED_ANALYZER_CONTRACT",
        field,
      );
    }
  }
  if (
    !exactEqual(
      manifest.externalDatabaseObjects,
      EXTERNAL_DATABASE_OBJECT_REGISTRY_V1,
    )
  ) {
    throw new MigrationDependencyClosureError(
      "INVALID_EXTERNAL_DATABASE_OBJECT_REGISTRY",
      JSON.stringify(manifest.externalDatabaseObjects),
    );
  }
  if (
    !exactEqual(
      closure.closedQualifiedDatabaseSchemas,
      CLOSED_QUALIFIED_DATABASE_SCHEMAS_V1,
    )
  ) {
    throw new MigrationDependencyClosureError(
      "INVALID_CLOSED_QUALIFIED_DATABASE_SCHEMA_REGISTRY",
      JSON.stringify(
        closure.closedQualifiedDatabaseSchemas,
      ),
    );
  }
  if (
    !exactEqual(
      closure.exactPredecessorOverrides,
      EXACT_PREDECESSOR_OVERRIDES_V1,
    )
  ) {
    throw new MigrationDependencyClosureError(
      "INVALID_EXACT_PREDECESSOR_OVERRIDE_REGISTRY",
      JSON.stringify(
        closure.exactPredecessorOverrides,
      ),
    );
  }

  const liveRecords = manifest.records.filter(
    (record) => record.presentOnLiveMain,
  );
  const manifestLiveFilenames = liveRecords
    .map((record) => record.currentFilename)
    .sort();
  const loadedLiveFilenames = [...sqlByFilename.keys()].sort();
  if (!exactEqual(manifestLiveFilenames, loadedLiveFilenames)) {
    throw new MigrationDependencyClosureError(
      "MIGRATION_SQL_MANIFEST_FILENAME_SET_MISMATCH",
      JSON.stringify({ manifestLiveFilenames, loadedLiveFilenames }),
    );
  }
  const derived = deriveMigrationDependencyClosure(liveRecords, sqlByFilename, {
    environmentRequiredExtensions:
      closure.environmentRequiredExtensions,
    externalDatabaseObjects: manifest.externalDatabaseObjects,
    closedQualifiedDatabaseSchemas:
      closure.closedQualifiedDatabaseSchemas,
    exactPredecessorOverrides:
      closure.exactPredecessorOverrides,
  });
  const derivedCreateExtensionStatementCount = derived.reduce(
    (total, entry) => total + entry.createdExtensions.length,
    0,
  );
  const derivedCreateExtensionMigrationCount = derived.filter(
    (entry) => entry.createdExtensions.length > 0,
  ).length;
  const derivedCanonicalExtensionNames = [
    ...new Set(
      derived.flatMap((entry) =>
        entry.createdExtensions.map((extension) => extension.name),
      ),
    ),
  ].sort();
  if (
    closure.liveMainExecutableCreateExtensionStatementCount !==
      derivedCreateExtensionStatementCount ||
    closure.liveMainCreateExtensionMigrationCount !==
      derivedCreateExtensionMigrationCount ||
    !exactEqual(
      closure.canonicalExtensionNames,
      derivedCanonicalExtensionNames,
    )
  ) {
    throw new MigrationDependencyClosureError(
      "LIVE_EXTENSION_INVENTORY_MISMATCH",
      JSON.stringify({
        derivedCreateExtensionStatementCount,
        derivedCreateExtensionMigrationCount,
        derivedCanonicalExtensionNames,
      }),
    );
  }
  const byFilename = new Map(
    derived.map((entry) => [entry.currentFilename, entry]),
  );
  const externalRegistry = new Set(
    manifest.externalDatabaseObjects.map(
      (object) => `${object.kind}:${object.identifier}`,
    ),
  );

  for (const record of liveRecords) {
    const actual = byFilename.get(record.currentFilename);
    const comparisons = [
      ["sqlSha256", record.sqlSha256, actual.sqlSha256],
      [
        "identifierOccurrenceEvidence",
        record.identifierOccurrenceEvidence,
        actual.identifierOccurrenceEvidence,
      ],
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
      .filter(
        (object) =>
          object.kind === "function" &&
          /^(?:auth|storage)\./u.test(object.identifier),
      )
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

    const declaredDatabaseObjectReferences = canonicalObjects(record.consumes);
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

    if (
      !exactEqual(
        canonicalObjects(record.modifies ?? []),
        actual.modifiedObjects,
      )
    ) {
      throw new MigrationDependencyClosureError(
        "MODIFIED_OBJECT_SQL_MISMATCH",
        record.currentFilename,
      );
    }
    if (
      !exactEqual(
        canonicalObjects(record.drops ?? []),
        actual.droppedObjects,
      )
    ) {
      throw new MigrationDependencyClosureError(
        "DROPPED_OBJECT_SQL_MISMATCH",
        record.currentFilename,
      );
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
      availableObjects.set(
        `${object.kind}:${object.identifier}`,
        record,
      );
    }
  }

  return {
    manifestVersion: closure.manifestVersion,
    liveMigrationCount: derived.length,
    executableCreateExtensionStatementCount:
      derivedCreateExtensionStatementCount,
    createdExtensionNames: derivedCanonicalExtensionNames,
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
  const repositoryRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
  );
  const contractPath = path.join(
    repositoryRoot,
    "config",
    "dabangil-wcv-c3r-a0-migration-dependency-authority-v1.json",
  );
  const manifest = JSON.parse(await readFile(contractPath, "utf8"))
    .migrationHistoryCompatibilityManifestV1;
  const sqlByFilename = await loadLiveMigrationSql(
    path.join(repositoryRoot, "supabase", "migrations"),
  );
  process.stdout.write(
    `${JSON.stringify(validateMigrationDependencyClosure(manifest, sqlByFilename))}\n`,
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error}\n`);
    process.exitCode = 1;
  });
}
