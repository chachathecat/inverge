import { createHash } from "node:crypto";

export const POSTGRES_SECURITY_SEMANTICS_PROFILE_V1 = Object.freeze({
  profileId: "postgresql_15_8_execution_principal_role_closure_v1",
  profileVersion: "1.0.0",
  postgresMajor: 15,
  minimumServerVersionNum: 150008,
  maximumServerVersionNumExclusive: 160000,
  repositoryValidationImage: "postgres:15.8-bookworm",
  sourceDocumentationVersion: "PostgreSQL 15 documentation; major-15 semantics; retrieved 2026-08-22",
  sourceDocumentationUrls: Object.freeze([
    "https://www.postgresql.org/docs/15/sql-grant.html",
    "https://www.postgresql.org/docs/15/sql-revoke.html",
    "https://www.postgresql.org/docs/15/role-membership.html",
    "https://www.postgresql.org/docs/15/role-attributes.html",
    "https://www.postgresql.org/docs/15/sql-set-role.html",
    "https://www.postgresql.org/docs/15/sql-alterdefaultprivileges.html",
    "https://www.postgresql.org/docs/15/ddl-rowsecurity.html",
  ]),
  supportedMembershipSyntax: Object.freeze([
    "GRANT role_name [, ...] TO role_name [, ...]",
    "GRANT role_name [, ...] TO role_name [, ...] WITH ADMIN OPTION",
    "REVOKE role_name [, ...] FROM role_name [, ...]",
    "REVOKE ADMIN OPTION FOR role_name [, ...] FROM role_name [, ...]",
    "GRANTED BY role_name",
  ]),
  omittedMembershipOptions: Object.freeze({
    adminOption: false,
    inheritOption: true,
    setOption: true,
    inheritTraversalGate: "MEMBER_ROLE_INHERIT_ATTRIBUTE",
  }),
  perMembershipInheritAndSetOptionsSupported: false,
  supportedPrincipalTransitions: Object.freeze([
    "SET ROLE identifier",
    "SET SESSION ROLE identifier",
    "SET ROLE NONE",
    "RESET ROLE",
  ]),
  supportedDefaultPrivilegeObjectClasses: Object.freeze([
    "TABLES",
    "SEQUENCES",
    "FUNCTIONS_ROUTINES",
    "TYPES",
    "SCHEMAS",
  ]),
  unsupportedSecuritySensitiveForms: Object.freeze([
    "SET LOCAL ROLE",
    "SET SESSION AUTHORIZATION",
    "RESET SESSION AUTHORIZATION",
    "STRING_OR_DYNAMIC_ROLE_TARGET",
    "CREATE_ROLE",
    "ALTER_ROLE",
    "DROP_ROLE",
    "PER_MEMBERSHIP_INHERIT_OR_SET_OPTIONS",
    "DYNAMIC_ROLE_MEMBERSHIP",
    "LARGE_OBJECT_DEFAULT_PRIVILEGES",
  ]),
  unknownOrMismatchedServerVersion: "FAIL_CLOSED",
});

export const PROTECTED_APPLICATION_PRINCIPALS_V1 = Object.freeze([
  "anon",
  "authenticated",
  "service_role",
]);

export const FORBIDDEN_APPLICATION_ROLE_TRANSITIONS_V1 = Object.freeze([
  Object.freeze({ from: "anon", to: "authenticated" }),
  Object.freeze({ from: "anon", to: "service_role" }),
  Object.freeze({ from: "authenticated", to: "service_role" }),
]);

const IDENTIFIER_SOURCE = '(?:"(?:[^"]|"")*"|[A-Za-z_][A-Za-z0-9_$]*)';
const QUALIFIED_IDENTIFIER_SOURCE =
  IDENTIFIER_SOURCE + "(?:\\s*\\.\\s*" + IDENTIFIER_SOURCE + ")?";
const TABLE_PRIVILEGES = Object.freeze([
  "SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER",
]);
const SEQUENCE_PRIVILEGES = Object.freeze(["USAGE", "SELECT", "UPDATE"]);
const FUNCTION_PRIVILEGES = Object.freeze(["EXECUTE"]);
const TYPE_PRIVILEGES = Object.freeze(["USAGE"]);
const SCHEMA_PRIVILEGES = Object.freeze(["USAGE", "CREATE"]);

export function canonicalJson(value) {
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort().map(function (key) {
      return JSON.stringify(key) + ":" + canonicalJson(value[key]);
    }).join(",") + "}";
  }
  return JSON.stringify(value);
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function same(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function normalizeNewlines(value) {
  return String(value || "").replace(/\r\n?/gu, "\n");
}

function lineColumn(source, offset) {
  const prefix = source.slice(0, offset);
  const lines = prefix.split("\n");
  return { line: lines.length, column: lines[lines.length - 1].length + 1 };
}

function sourceSpan(source, start, end) {
  const from = lineColumn(source, start);
  const to = lineColumn(source, end);
  return {
    start,
    end,
    startLine: from.line,
    startColumn: from.column,
    endLine: to.line,
    endColumn: to.column,
  };
}

export function maskNonExecutableSqlV1(input) {
  const source = normalizeNewlines(input);
  const masked = Array.from(source);
  let index = 0;
  let state = "NORMAL";
  let dollarTag = null;
  let blockDepth = 0;

  function blank(position) {
    if (source[position] !== "\n") masked[position] = " ";
  }

  while (index < source.length) {
    const current = source[index];
    const next = source[index + 1];

    if (state === "NORMAL") {
      if (current === "-" && next === "-") {
        blank(index);
        blank(index + 1);
        index += 2;
        state = "LINE_COMMENT";
        continue;
      }
      if (current === "/" && next === "*") {
        blank(index);
        blank(index + 1);
        index += 2;
        blockDepth = 1;
        state = "BLOCK_COMMENT";
        continue;
      }
      if (current === "'") {
        blank(index);
        index += 1;
        state = "STRING";
        continue;
      }
      if (current === "$") {
        const match = /^(?:\$[A-Za-z_][A-Za-z0-9_]*\$|\$\$)/u.exec(source.slice(index));
        if (match) {
          dollarTag = match[0];
          for (let cursor = index; cursor < index + dollarTag.length; cursor += 1) blank(cursor);
          index += dollarTag.length;
          state = "DOLLAR";
          continue;
        }
      }
      if (current === '"') {
        index += 1;
        state = "QUOTED_IDENTIFIER";
        continue;
      }
      index += 1;
      continue;
    }

    if (state === "LINE_COMMENT") {
      blank(index);
      if (current === "\n") state = "NORMAL";
      index += 1;
      continue;
    }

    if (state === "BLOCK_COMMENT") {
      if (current === "/" && next === "*") {
        blank(index);
        blank(index + 1);
        blockDepth += 1;
        index += 2;
        continue;
      }
      if (current === "*" && next === "/") {
        blank(index);
        blank(index + 1);
        blockDepth -= 1;
        index += 2;
        if (blockDepth === 0) state = "NORMAL";
        continue;
      }
      blank(index);
      index += 1;
      continue;
    }

    if (state === "STRING") {
      blank(index);
      if (current === "'" && next === "'") {
        blank(index + 1);
        index += 2;
        continue;
      }
      if (current === "'") state = "NORMAL";
      index += 1;
      continue;
    }

    if (state === "DOLLAR") {
      if (source.startsWith(dollarTag, index)) {
        for (let cursor = index; cursor < index + dollarTag.length; cursor += 1) blank(cursor);
        index += dollarTag.length;
        state = "NORMAL";
        dollarTag = null;
        continue;
      }
      blank(index);
      index += 1;
      continue;
    }

    if (state === "QUOTED_IDENTIFIER") {
      if (current === '"' && next === '"') {
        index += 2;
        continue;
      }
      if (current === '"') state = "NORMAL";
      index += 1;
    }
  }

  return { source, masked: masked.join("") };
}

export function splitTopLevelStatementsV1(input) {
  const projection = maskNonExecutableSqlV1(input);
  const statements = [];
  let start = 0;
  let ordinal = 0;

  for (let index = 0; index <= projection.masked.length; index += 1) {
    if (index !== projection.masked.length && projection.masked[index] !== ";") continue;
    const slice = projection.masked.slice(start, index);
    if (slice.trim()) {
      const leading = slice.search(/\S/u);
      const sourceStart = start + Math.max(0, leading);
      const sourceEnd = index < projection.masked.length ? index + 1 : index;
      ordinal += 1;
      statements.push({
        ordinal,
        sourceStart,
        sourceEnd,
        sourceSpan: sourceSpan(projection.source, sourceStart, sourceEnd),
        source: projection.source.slice(sourceStart, sourceEnd),
        masked: projection.masked.slice(sourceStart, sourceEnd),
      });
    }
    start = index + 1;
  }

  return statements;
}

function splitTopLevelComma(value) {
  const projection = maskNonExecutableSqlV1(value);
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index <= projection.masked.length; index += 1) {
    const character = projection.masked[index];
    if (character === "(") depth += 1;
    if (character === ")") depth -= 1;
    if ((character === "," && depth === 0) || index === projection.masked.length) {
      const raw = projection.source.slice(start, index).trim();
      if (raw) parts.push(raw);
      start = index + 1;
    }
  }
  return parts;
}

function decodeIdentifier(raw) {
  const value = String(raw || "").trim();
  if (/^"(?:[^"]|"")*"$/u.test(value)) {
    const decoded = value.slice(1, -1).replace(/""/gu, '"');
    return { decodedIdentifierValue: decoded, quoted: true, canonicalIdentity: decoded };
  }
  if (/^[A-Za-z_][A-Za-z0-9_$]*$/u.test(value)) {
    const decoded = value.toLowerCase();
    return { decodedIdentifierValue: decoded, quoted: false, canonicalIdentity: decoded };
  }
  return null;
}

function splitQualifiedIdentifier(raw) {
  const value = String(raw || "").trim();
  const components = [];
  let start = 0;
  let quoted = false;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === '"') {
      if (quoted && value[index + 1] === '"') {
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "." && !quoted) {
      components.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  components.push(value.slice(start).trim());
  return components;
}

function canonicalObjectIdentity(raw, defaultSchema) {
  const value = String(raw || "").trim().replace(/;$/u, "").trim();
  const functionOpen = value.indexOf("(");
  const identityPart = functionOpen >= 0 ? value.slice(0, functionOpen).trim() : value;
  const suffix = functionOpen >= 0
    ? value.slice(functionOpen).replace(/\s+/gu, " ").replace(/\s*,\s*/gu, ",").toLowerCase()
    : "";
  const components = splitQualifiedIdentifier(identityPart).map(decodeIdentifier);
  if (components.some(function (entry) { return !entry; })) return null;
  if (components.length === 1 && defaultSchema) {
    components.unshift({ canonicalIdentity: defaultSchema });
  }
  return components.map(function (entry) { return entry.canonicalIdentity; }).join(".") + suffix;
}

function roleIdentityEvidence(raw, statement, relativeStart) {
  const identity = decodeIdentifier(raw);
  if (!identity) return null;
  const start = statement.sourceStart + relativeStart;
  return {
    roleIdentityV1: "RoleIdentityV1",
    decodedIdentifierValue: identity.decodedIdentifierValue,
    quoted: identity.quoted,
    exactCanonicalIdentity: identity.canonicalIdentity,
    sourceSpan: sourceSpan(statement.programSource, start, start + raw.length),
    statementOrdinal: statement.ordinal,
  };
}

function addRoleEvidence(context, raw, statement, searchFrom) {
  const offset = statement.source.indexOf(raw, searchFrom || 0);
  const evidence = roleIdentityEvidence(raw, statement, Math.max(0, offset));
  if (evidence) context.roleIdentities.push(evidence);
  return evidence;
}

function roleStateFromInput(input, ordinal) {
  const identity = decodeIdentifier(input.role);
  if (!identity) return null;
  return {
    roleStateV1: "RoleStateV1",
    roleIdentity: identity.canonicalIdentity,
    login: Boolean(input.login),
    superuser: Boolean(input.superuser),
    inherit: input.inherit !== false,
    bypassRls: Boolean(input.bypassRls),
    createRole: Boolean(input.createRole),
    dropped: false,
    active: true,
    provenance: input.provenance || "INITIAL_ROLE_CONTRACT",
    statementOrdinal: ordinal,
  };
}

function membershipKey(grantedRole, memberRole) {
  return grantedRole + "->" + memberRole;
}

function activeMembershipEdges(events) {
  const current = new Map();
  for (const event of events) {
    const key = membershipKey(event.grantedRole, event.memberRole);
    if (event.grantRevokeState === "GRANTED") current.set(key, event);
    if (event.grantRevokeState === "REVOKED") current.delete(key);
    if (event.grantRevokeState === "ADMIN_REVOKED" && current.has(key)) {
      current.set(key, Object.assign({}, current.get(key), {
        adminOption: false,
        statementOrdinal: event.statementOrdinal,
        exactSourceSpan: event.exactSourceSpan,
        provenance: event.provenance,
      }));
    }
  }
  return Array.from(current.values()).sort(function (left, right) {
    return membershipKey(left.grantedRole, left.memberRole)
      .localeCompare(membershipKey(right.grantedRole, right.memberRole));
  });
}

function adjacencyForMember(edges) {
  const adjacency = new Map();
  for (const edge of edges) {
    if (!edge.active) continue;
    if (!adjacency.has(edge.memberRole)) adjacency.set(edge.memberRole, []);
    adjacency.get(edge.memberRole).push(edge);
  }
  for (const value of adjacency.values()) {
    value.sort(function (left, right) {
      return left.grantedRole.localeCompare(right.grantedRole);
    });
  }
  return adjacency;
}

function reachabilityPaths(startRole, roleStates, edges, mode) {
  const adjacency = adjacencyForMember(edges);
  const paths = new Map([[startRole, [startRole]]]);
  const queue = [startRole];

  while (queue.length) {
    const current = queue.shift();
    const state = roleStates.get(current);
    if (mode === "INHERIT" && state && state.inherit === false) continue;
    for (const edge of adjacency.get(current) || []) {
      if (mode === "INHERIT" && !edge.inheritOption) continue;
      if (mode === "SET" && !edge.setOption) continue;
      if (paths.has(edge.grantedRole)) continue;
      paths.set(edge.grantedRole, paths.get(current).concat(edge.grantedRole));
      queue.push(edge.grantedRole);
    }
  }

  return paths;
}

export function computeRoleReachabilityV1(principal, roleStateEntries, edgeEntries) {
  const states = new Map(roleStateEntries.map(function (entry) {
    return [entry.roleIdentity || entry.role, entry];
  }));
  const edges = edgeEntries.filter(function (edge) {
    return edge.active !== false && edge.grantRevokeState !== "REVOKED";
  });
  const inherited = reachabilityPaths(principal, states, edges, "INHERIT");
  const set = reachabilityPaths(principal, states, edges, "SET");
  const administrable = edges
    .filter(function (edge) { return edge.adminOption && set.has(edge.memberRole); })
    .map(function (edge) { return edge.grantedRole; })
    .sort();

  function project(paths) {
    return Array.from(paths.entries()).map(function (entry) {
      return { role: entry[0], path: entry[1] };
    }).sort(function (left, right) { return left.role.localeCompare(right.role); });
  }

  return {
    principal,
    inheritedPrivilegeReachability: project(inherited),
    setRoleReachability: project(set),
    administrationReachability: administrable,
  };
}

function detectCycle(edges) {
  const adjacency = adjacencyForMember(edges);
  const visiting = new Set();
  const visited = new Set();

  function visit(role) {
    if (visiting.has(role)) return true;
    if (visited.has(role)) return false;
    visiting.add(role);
    for (const edge of adjacency.get(role) || []) {
      if (visit(edge.grantedRole)) return true;
    }
    visiting.delete(role);
    visited.add(role);
    return false;
  }

  for (const role of adjacency.keys()) {
    if (visit(role)) return true;
  }
  return false;
}

function aclProjection(acl) {
  return Array.from(acl.entries()).map(function (entry) {
    return { grantee: entry[0], privileges: Array.from(entry[1]).sort() };
  }).filter(function (entry) {
    return entry.privileges.length > 0;
  }).sort(function (left, right) { return left.grantee.localeCompare(right.grantee); });
}

function cloneAcl(acl) {
  return new Map(Array.from(acl.entries()).map(function (entry) {
    return [entry[0], new Set(entry[1])];
  }));
}

function privilegeUniverse(objectClass) {
  if (objectClass === "TABLES") return TABLE_PRIVILEGES;
  if (objectClass === "SEQUENCES") return SEQUENCE_PRIVILEGES;
  if (objectClass === "FUNCTIONS_ROUTINES") return FUNCTION_PRIVILEGES;
  if (objectClass === "TYPES") return TYPE_PRIVILEGES;
  if (objectClass === "SCHEMAS") return SCHEMA_PRIVILEGES;
  return [];
}

function builtinGlobalAcl(objectClass) {
  const acl = new Map();
  if (objectClass === "FUNCTIONS_ROUTINES") acl.set("public", new Set(["EXECUTE"]));
  if (objectClass === "TYPES") acl.set("public", new Set(["USAGE"]));
  return acl;
}

function defaultPrivilegeKey(creator, scopeKind, schema, objectClass) {
  return [creator, scopeKind, schema || "*", objectClass].join("|");
}

function ensureGlobalDefaults(context, creator, objectClass) {
  const key = defaultPrivilegeKey(creator, "GLOBAL", null, objectClass);
  if (!context.defaultPrivileges.has(key)) {
    context.defaultPrivileges.set(key, {
      creatorRole: creator,
      scopeKind: "GLOBAL",
      schemaIdentity: null,
      objectClass,
      acl: builtinGlobalAcl(objectClass),
      lastStatementOrdinal: 0,
      provenance: [],
    });
  }
  return context.defaultPrivileges.get(key);
}

function ensureSchemaDefaults(context, creator, schema, objectClass) {
  const key = defaultPrivilegeKey(creator, "SCHEMA", schema, objectClass);
  if (!context.defaultPrivileges.has(key)) {
    context.defaultPrivileges.set(key, {
      creatorRole: creator,
      scopeKind: "SCHEMA",
      schemaIdentity: schema,
      objectClass,
      acl: new Map(),
      lastStatementOrdinal: 0,
      provenance: [],
    });
  }
  return context.defaultPrivileges.get(key);
}

function expandPrivileges(raw, objectClass) {
  const normalized = raw.replace(/\bPRIVILEGES\b/giu, "").trim();
  if (/^ALL$/iu.test(normalized)) return Array.from(privilegeUniverse(objectClass));
  return splitTopLevelComma(normalized).map(function (value) {
    return value.trim().toUpperCase().replace(/\s+/gu, "_");
  });
}

function applyAclMutation(acl, operation, grantees, privileges) {
  for (const grantee of grantees) {
    if (!acl.has(grantee)) acl.set(grantee, new Set());
    const set = acl.get(grantee);
    for (const privilege of privileges) {
      if (operation === "GRANT") set.add(privilege);
      else set.delete(privilege);
    }
  }
}

function objectClassFromKind(kind) {
  if (kind === "table") return "TABLES";
  if (kind === "sequence") return "SEQUENCES";
  if (kind === "function" || kind === "procedure" || kind === "routine") return "FUNCTIONS_ROUTINES";
  if (kind === "type") return "TYPES";
  if (kind === "schema") return "SCHEMAS";
  return null;
}

function objectKindFromKeyword(keyword) {
  const value = String(keyword || "TABLE").toLowerCase();
  if (value === "routine") return "function";
  return value;
}

function normalizedOperationKinds(statement) {
  const source = statement.masked;
  const kinds = [];
  if (/^\s*ALTER\s+DEFAULT\s+PRIVILEGES\b/iu.test(source)) kinds.push("ALTER_DEFAULT_PRIVILEGES");
  if (/^\s*GRANT\b/iu.test(source)) {
    kinds.push(/\bON\b/iu.test(source) ? "OBJECT_PRIVILEGE_GRANT" : "ROLE_MEMBERSHIP_GRANT");
  }
  if (/^\s*REVOKE\b/iu.test(source)) {
    kinds.push(/\bON\b/iu.test(source) ? "OBJECT_PRIVILEGE_REVOKE" : "ROLE_MEMBERSHIP_REVOKE");
  }
  if (/^\s*CREATE\s+POLICY\b/iu.test(source)) kinds.push("POLICY_CREATE");
  if (/^\s*ALTER\s+POLICY\b/iu.test(source)) kinds.push("POLICY_ALTER");
  if (/^\s*DROP\s+POLICY\b/iu.test(source)) kinds.push("POLICY_DROP");
  if (/\bENABLE\s+ROW\s+LEVEL\s+SECURITY\b/iu.test(source)) kinds.push("RLS_ENABLE");
  if (/\bDISABLE\s+ROW\s+LEVEL\s+SECURITY\b/iu.test(source)) kinds.push("RLS_DISABLE");
  if (/\bFORCE\s+ROW\s+LEVEL\s+SECURITY\b/iu.test(source) && !/\bNO\s+FORCE\b/iu.test(source)) kinds.push("RLS_FORCE");
  if (/\bNO\s+FORCE\s+ROW\s+LEVEL\s+SECURITY\b/iu.test(source)) kinds.push("RLS_NO_FORCE");
  if (/\bSECURITY\s+DEFINER\b/iu.test(source)) kinds.push("FUNCTION_SECURITY_DEFINER");
  if (/\bSECURITY\s+INVOKER\b/iu.test(source)) kinds.push("FUNCTION_SECURITY_INVOKER");
  if (/\bOWNER\s+TO\b/iu.test(source)) kinds.push("OWNER_CHANGE");
  if (/^\s*SET\s+(?:SESSION\s+|LOCAL\s+)?ROLE\b/iu.test(source)) kinds.push("SET_ROLE");
  if (/^\s*RESET\s+ROLE\b/iu.test(source)) kinds.push("RESET_ROLE");
  if (/\bSESSION\s+AUTHORIZATION\b/iu.test(source)) kinds.push("SESSION_AUTHORIZATION");
  if (/^\s*(?:CREATE|ALTER|DROP)\s+(?:ROLE|USER)\b/iu.test(source)) kinds.push("ROLE_DDL");
  return kinds.sort();
}

export function deriveRoleSensitiveSqlInventoryV1(sqlByFilename, orderedFilenames) {
  const records = [];
  orderedFilenames.forEach(function (filename, migrationIndex) {
    const sql = sqlByFilename[filename];
    if (typeof sql !== "string") {
      throw new Error("missing SQL for " + filename);
    }
    for (const statement of splitTopLevelStatementsV1(sql)) {
      const operationKinds = normalizedOperationKinds(statement);
      if (operationKinds.length === 0) continue;
      records.push({
        filename,
        migrationOrdinal: migrationIndex + 1,
        statementOrdinal: statement.ordinal,
        sourceSpan: statement.sourceSpan,
        operationKinds,
        normalizedStatementSha256: sha256(statement.masked.trim().replace(/\s+/gu, " ")),
      });
    }
  });
  return {
    inventoryVersion: "PostgresRoleSensitiveSqlInventoryV1",
    migrationCount: orderedFilenames.length,
    roleSensitiveStatementCount: records.length,
    records,
    digest: sha256(canonicalJson(records)),
  };
}

function addDiagnostic(context, code, statement, detail) {
  context.diagnostics.push({
    code,
    severity: "ERROR",
    statementOrdinal: statement ? statement.ordinal : 0,
    sourceSpan: statement ? statement.sourceSpan : null,
    detail: detail || null,
  });
}

function parseRoleList(context, raw, statement) {
  const results = [];
  let cursor = 0;
  for (const entry of splitTopLevelComma(raw)) {
    const cleaned = entry.replace(/^GROUP\s+/iu, "").trim();
    const evidence = addRoleEvidence(context, cleaned, statement, cursor);
    if (!evidence) {
      addDiagnostic(context, "UNSUPPORTED_OR_DYNAMIC_ROLE_IDENTITY", statement, cleaned);
    } else {
      results.push(evidence.exactCanonicalIdentity);
    }
    cursor = Math.max(cursor, statement.source.indexOf(entry, cursor) + entry.length);
  }
  return results;
}

function knownRole(context, role, statement) {
  if (role === "public") return true;
  if (context.roleStates.has(role)) return true;
  addDiagnostic(context, "UNKNOWN_ROLE_IDENTITY", statement, role);
  return false;
}

function parseMembershipMutation(context, statement) {
  const masked = statement.masked.replace(/;\s*$/u, "").trim();
  if (!/^(?:GRANT|REVOKE)\b/iu.test(masked) || /\bON\b/iu.test(masked)) return false;

  if (/\bWITH\s+(?:INHERIT|SET)\b/iu.test(masked)) {
    addDiagnostic(context, "UNSUPPORTED_MEMBERSHIP_OPTION_FOR_POSTGRES_15", statement, null);
    return true;
  }

  const grant = /^GRANT\s+([\s\S]+?)\s+TO\s+([\s\S]+?)(?:\s+WITH\s+ADMIN\s+OPTION)?(?:\s+GRANTED\s+BY\s+(.+))?$/iu.exec(masked);
  const revoke = /^REVOKE\s+(ADMIN\s+OPTION\s+FOR\s+)?([\s\S]+?)\s+FROM\s+([\s\S]+?)(?:\s+GRANTED\s+BY\s+(.+?))?(?:\s+(?:CASCADE|RESTRICT))?$/iu.exec(masked);
  if (!grant && !revoke) {
    addDiagnostic(context, "UNSUPPORTED_ROLE_MEMBERSHIP_MUTATION", statement, masked);
    return true;
  }

  const grantedRaw = grant ? grant[1] : revoke[2];
  const membersRaw = grant ? grant[2] : revoke[3];
  const grantorRaw = grant ? grant[3] : revoke[4];
  const grantedRoles = parseRoleList(context, grantedRaw, statement);
  const memberRoles = parseRoleList(context, membersRaw, statement);
  const grantors = grantorRaw ? parseRoleList(context, grantorRaw, statement) : [context.currentUser];
  const grantor = grantors[0] || context.currentUser;
  const isAdminOnlyRevoke = Boolean(revoke && revoke[1]);

  for (const role of grantedRoles.concat(memberRoles).concat([grantor])) {
    knownRole(context, role, statement);
  }
  if (grantedRoles.includes("public") || memberRoles.includes("public")) {
    addDiagnostic(context, "PUBLIC_ROLE_MEMBERSHIP_FORBIDDEN", statement, null);
    return true;
  }

  for (const grantedRole of grantedRoles) {
    for (const memberRole of memberRoles) {
      const event = {
        roleMembershipEdgeV1: "RoleMembershipEdgeV1",
        grantedRole,
        memberRole,
        grantorRole: grantor,
        adminOption: Boolean(grant && /\bWITH\s+ADMIN\s+OPTION\b/iu.test(masked)),
        inheritOption: true,
        setOption: true,
        grantRevokeState: grant ? "GRANTED" : isAdminOnlyRevoke ? "ADMIN_REVOKED" : "REVOKED",
        active: Boolean(grant),
        statementOrdinal: statement.ordinal,
        exactSourceSpan: statement.sourceSpan,
        versionSemanticsProfile: POSTGRES_SECURITY_SEMANTICS_PROFILE_V1.profileId,
        provenance: "EXECUTABLE_SQL",
      };
      context.membershipEvents.push(event);
    }
  }

  if (grant && detectCycle(activeMembershipEdges(context.membershipEvents).map(function (edge) {
    return Object.assign({}, edge, { active: true });
  }))) {
    addDiagnostic(context, "ROLE_MEMBERSHIP_CYCLE", statement, null);
  }
  return true;
}

function parseSetRole(context, statement) {
  const masked = statement.masked.replace(/;\s*$/u, "").trim();
  if (/^SET\s+LOCAL\s+ROLE\b/iu.test(masked)) {
    addDiagnostic(context, "UNSUPPORTED_SET_LOCAL_ROLE", statement, null);
    return true;
  }
  if (/^(?:SET|RESET)\s+SESSION\s+AUTHORIZATION\b/iu.test(masked)) {
    addDiagnostic(context, "UNSUPPORTED_SESSION_AUTHORIZATION", statement, null);
    return true;
  }
  if (/^RESET\s+ROLE$/iu.test(masked)) {
    const before = context.currentUser;
    context.currentUser = context.initialMigrationExecutor;
    context.sessionTransitions.push({
      sessionPrincipalStateV1: "SessionPrincipalStateV1",
      sessionUser: context.sessionUser,
      initialMigrationExecutor: context.initialMigrationExecutor,
      currentUserBefore: before,
      currentUserAfter: context.currentUser,
      transactionSessionRoleScope: "SESSION",
      exactSetRoleTarget: null,
      restorationForm: "RESET_ROLE",
      statementOrdinal: statement.ordinal,
      exactSourceSpan: statement.sourceSpan,
    });
    return true;
  }

  const match = /^SET\s+(SESSION\s+)?ROLE\s+(.+)$/iu.exec(masked);
  if (!match) {
    if (/^SET\s+(?:SESSION\s+)?ROLE\b/iu.test(masked) || /^SET\s+(?:SESSION\s+)?ROLE\s*$/iu.test(masked)) {
      addDiagnostic(context, "UNSUPPORTED_STRING_OR_DYNAMIC_ROLE_TARGET", statement, null);
      return true;
    }
    return false;
  }

  const rawTarget = match[2].trim();
  const before = context.currentUser;
  if (/^NONE$/iu.test(rawTarget)) {
    context.currentUser = context.sessionUser;
    context.sessionTransitions.push({
      sessionPrincipalStateV1: "SessionPrincipalStateV1",
      sessionUser: context.sessionUser,
      initialMigrationExecutor: context.initialMigrationExecutor,
      currentUserBefore: before,
      currentUserAfter: context.currentUser,
      transactionSessionRoleScope: "SESSION",
      exactSetRoleTarget: null,
      restorationForm: "SET_ROLE_NONE",
      statementOrdinal: statement.ordinal,
      exactSourceSpan: statement.sourceSpan,
    });
    return true;
  }

  const targetEvidence = addRoleEvidence(context, rawTarget, statement, 0);
  if (!targetEvidence) {
    addDiagnostic(context, "UNSUPPORTED_STRING_OR_DYNAMIC_ROLE_TARGET", statement, rawTarget);
    return true;
  }
  const target = targetEvidence.exactCanonicalIdentity;
  if (!knownRole(context, target, statement)) return true;
  const executorState = context.roleStates.get(context.sessionUser);
  const edges = activeMembershipEdges(context.membershipEvents).map(function (edge) {
    return Object.assign({}, edge, { active: true });
  });
  const reachability = computeRoleReachabilityV1(
    context.sessionUser,
    Array.from(context.roleStates.values()),
    edges,
  );
  const allowed = executorState && executorState.superuser
    ? true
    : reachability.setRoleReachability.some(function (entry) { return entry.role === target; });
  if (!allowed) {
    addDiagnostic(context, "SET_ROLE_TARGET_NOT_REACHABLE", statement, target);
    context.sessionTransitions.push({
      sessionPrincipalStateV1: "SessionPrincipalStateV1",
      sessionUser: context.sessionUser,
      initialMigrationExecutor: context.initialMigrationExecutor,
      currentUserBefore: before,
      currentUserAfter: before,
      transactionSessionRoleScope: "SESSION",
      exactSetRoleTarget: target,
      restorationForm: null,
      rejected: true,
      statementOrdinal: statement.ordinal,
      exactSourceSpan: statement.sourceSpan,
    });
    return true;
  }
  context.currentUser = target;
  context.sessionTransitions.push({
    sessionPrincipalStateV1: "SessionPrincipalStateV1",
    sessionUser: context.sessionUser,
    initialMigrationExecutor: context.initialMigrationExecutor,
    currentUserBefore: before,
    currentUserAfter: target,
    transactionSessionRoleScope: "SESSION",
    exactSetRoleTarget: target,
    restorationForm: null,
    statementOrdinal: statement.ordinal,
    exactSourceSpan: statement.sourceSpan,
  });
  return true;
}

function parseDefaultPrivileges(context, statement) {
  let rest = statement.masked.replace(/;\s*$/u, "").trim();
  if (!/^ALTER\s+DEFAULT\s+PRIVILEGES\b/iu.test(rest)) return false;
  rest = rest.replace(/^ALTER\s+DEFAULT\s+PRIVILEGES\b/iu, "").trim();

  let creatorsRaw = null;
  let schemasRaw = null;
  const forMatch = /^FOR\s+(?:ROLE|USER)\s+([\s\S]+?)(?=\s+IN\s+SCHEMA\b|\s+(?:GRANT|REVOKE)\b)/iu.exec(rest);
  if (forMatch) {
    creatorsRaw = forMatch[1].trim();
    rest = rest.slice(forMatch[0].length).trim();
  }
  const schemaMatch = /^IN\s+SCHEMA\s+([\s\S]+?)(?=\s+(?:GRANT|REVOKE)\b)/iu.exec(rest);
  if (schemaMatch) {
    schemasRaw = schemaMatch[1].trim();
    rest = rest.slice(schemaMatch[0].length).trim();
  }

  const operation = /^(GRANT|REVOKE)\b/iu.exec(rest)?.[1]?.toUpperCase();
  if (!operation) {
    addDiagnostic(context, "UNSUPPORTED_ALTER_DEFAULT_PRIVILEGES", statement, rest);
    return true;
  }
  if (/\bWITH\s+GRANT\s+OPTION\b/iu.test(rest) || /^REVOKE\s+GRANT\s+OPTION\s+FOR\b/iu.test(rest)) {
    addDiagnostic(context, "UNSUPPORTED_DEFAULT_PRIVILEGE_GRANT_OPTION", statement, null);
    return true;
  }

  const mutation = operation === "GRANT"
    ? /^GRANT\s+([\s\S]+?)\s+ON\s+(TABLES|SEQUENCES|FUNCTIONS|ROUTINES|TYPES|SCHEMAS)\s+TO\s+([\s\S]+)$/iu.exec(rest)
    : /^REVOKE\s+([\s\S]+?)\s+ON\s+(TABLES|SEQUENCES|FUNCTIONS|ROUTINES|TYPES|SCHEMAS)\s+FROM\s+([\s\S]+?)(?:\s+(?:CASCADE|RESTRICT))?$/iu.exec(rest);
  if (!mutation) {
    addDiagnostic(context, "UNSUPPORTED_ALTER_DEFAULT_PRIVILEGES", statement, rest);
    return true;
  }

  const objectClass = /^(?:FUNCTIONS|ROUTINES)$/iu.test(mutation[2])
    ? "FUNCTIONS_ROUTINES"
    : mutation[2].toUpperCase();
  const creators = creatorsRaw
    ? parseRoleList(context, creatorsRaw, statement)
    : [context.currentUser];
  const schemas = schemasRaw
    ? splitTopLevelComma(schemasRaw).map(function (entry) {
      return canonicalObjectIdentity(entry, null);
    })
    : [null];
  const grantees = parseRoleList(context, mutation[3], statement);
  const privileges = expandPrivileges(mutation[1], objectClass);

  if (objectClass === "SCHEMAS" && schemasRaw) {
    addDiagnostic(context, "SCHEMA_DEFAULT_PRIVILEGES_CANNOT_BE_SCHEMA_SCOPED", statement, null);
  }
  for (const creator of creators) {
    knownRole(context, creator, statement);
    if (creator !== context.currentUser) {
      const currentState = context.roleStates.get(context.currentUser);
      const reachable = computeRoleReachabilityV1(
        context.currentUser,
        Array.from(context.roleStates.values()),
        activeMembershipEdges(context.membershipEvents).map(function (edge) {
          return Object.assign({}, edge, { active: true });
        }),
      ).setRoleReachability.some(function (entry) { return entry.role === creator; });
      if (!currentState?.superuser && !reachable) {
        addDiagnostic(context, "ALTER_DEFAULT_PRIVILEGES_CREATOR_NOT_AUTHORIZED", statement, creator);
      }
    }
  }
  for (const grantee of grantees) knownRole(context, grantee, statement);
  for (const privilege of privileges) {
    if (!privilegeUniverse(objectClass).includes(privilege)) {
      addDiagnostic(context, "UNSUPPORTED_DEFAULT_PRIVILEGE", statement, privilege);
    }
  }

  for (const creator of creators) {
    for (const schema of schemas) {
      const state = schema
        ? ensureSchemaDefaults(context, creator, schema, objectClass)
        : ensureGlobalDefaults(context, creator, objectClass);
      const before = aclProjection(state.acl);
      applyAclMutation(state.acl, operation, grantees, privileges);
      state.lastStatementOrdinal = statement.ordinal;
      state.provenance.push({
        statementOrdinal: statement.ordinal,
        sourceSpan: statement.sourceSpan,
        operation,
        grantees: grantees.slice().sort(),
        privileges: privileges.slice().sort(),
      });
      context.defaultPrivilegeTransitions.push({
        creatorScopedDefaultPrivilegeStateV1: "CreatorScopedDefaultPrivilegeStateV1",
        creatorRole: creator,
        scopeKind: schema ? "SCHEMA" : "GLOBAL",
        exactSchemaIdentity: schema,
        objectClass,
        operation,
        grantees: grantees.slice().sort(),
        exactPrivilegeSet: privileges.slice().sort(),
        beforeState: before,
        afterState: aclProjection(state.acl),
        statementOrdinal: statement.ordinal,
        exactSourceSpan: statement.sourceSpan,
      });
    }
  }
  return true;
}

function applicableCreationAcl(context, creator, schema, objectClass) {
  const global = ensureGlobalDefaults(context, creator, objectClass);
  const result = cloneAcl(global.acl);
  const schemaState = context.defaultPrivileges.get(
    defaultPrivilegeKey(creator, "SCHEMA", schema, objectClass),
  );
  if (schemaState) {
    for (const entry of schemaState.acl.entries()) {
      if (!result.has(entry[0])) result.set(entry[0], new Set());
      for (const privilege of entry[1]) result.get(entry[0]).add(privilege);
    }
  }
  result.set(creator, new Set(privilegeUniverse(objectClass)));
  return {
    acl: result,
    globalDefaults: aclProjection(global.acl),
    schemaDefaults: schemaState ? aclProjection(schemaState.acl) : [],
  };
}

function protectedObjectDefinition(context, kind, identity) {
  return context.protectedObjects.get(kind + "|" + identity) || null;
}

function parseCreateObject(context, statement) {
  const masked = statement.masked.replace(/;\s*$/u, "").trim();
  let match = new RegExp(
    "^CREATE\\s+(TABLE|SEQUENCE|TYPE|SCHEMA)\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?(" +
      QUALIFIED_IDENTIFIER_SOURCE + ")",
    "iu",
  ).exec(masked);
  let kind;
  let rawIdentity;
  let securityMode = null;

  if (match) {
    kind = objectKindFromKeyword(match[1]);
    rawIdentity = match[2];
  } else {
    match = new RegExp(
      "^CREATE\\s+(?:OR\\s+REPLACE\\s+)?(FUNCTION|PROCEDURE)\\s+(" +
        QUALIFIED_IDENTIFIER_SOURCE + "\\s*\\([^)]*\\))",
      "iu",
    ).exec(masked);
    if (!match) return false;
    kind = objectKindFromKeyword(match[1]);
    rawIdentity = match[2];
    if (/^CREATE\s+OR\s+REPLACE\b/iu.test(masked)) {
      const candidateIdentity = canonicalObjectIdentity(rawIdentity, context.defaultSchema);
      if (protectedObjectDefinition(context, kind, candidateIdentity)) {
        addDiagnostic(context, "UNSUPPORTED_CREATE_OR_REPLACE_PROTECTED_ROUTINE", statement, candidateIdentity);
      }
    }
    securityMode = /\bSECURITY\s+DEFINER\b/iu.test(masked)
      ? "DEFINER"
      : /\bSECURITY\s+INVOKER\b/iu.test(masked) ? "INVOKER" : "INVOKER";
  }

  const identity = canonicalObjectIdentity(rawIdentity, kind === "schema" ? null : context.defaultSchema);
  if (!identity) {
    addDiagnostic(context, "UNSUPPORTED_DYNAMIC_OBJECT_IDENTITY", statement, rawIdentity);
    return true;
  }
  const definition = protectedObjectDefinition(context, kind, identity);
  if (!definition) return true;
  if (!knownRole(context, context.currentUser, statement)) return true;

  const schema = kind === "schema"
    ? identity
    : identity.includes(".") ? identity.split(".")[0] : context.defaultSchema;
  const objectClass = objectClassFromKind(kind);
  const defaults = applicableCreationAcl(context, context.currentUser, schema, objectClass);
  const state = {
    kind,
    identity,
    schema,
    creatorRole: context.currentUser,
    ownerRole: context.currentUser,
    privileges: defaults.acl,
    rlsEnabled: false,
    forceRls: false,
    policies: new Map(),
    securityMode,
    creationStatementOrdinal: statement.ordinal,
    creationSourceSpan: statement.sourceSpan,
  };
  context.objects.set(kind + "|" + identity, state);
  context.objectCreationEvidence.push({
    objectCreationPrincipalEvidenceV1: "ObjectCreationPrincipalEvidenceV1",
    exactObjectIdentity: identity,
    objectKind: kind,
    statementOrdinal: statement.ordinal,
    exactSourceSpan: statement.sourceSpan,
    currentCreatorRole: context.currentUser,
    resultingOwnerRole: context.currentUser,
    schemaIdentity: schema,
    applicableGlobalDefaultsForCreator: defaults.globalDefaults,
    applicableSchemaDefaultsForCreator: defaults.schemaDefaults,
    directPrivileges: aclProjection(defaults.acl),
    resultingInitialPrivilegeState: aclProjection(defaults.acl),
    unsupportedOrDynamic: false,
  });
  return true;
}

function parseRlsMutation(context, statement) {
  const match = new RegExp(
    "^\\s*ALTER\\s+TABLE\\s+(?:IF\\s+EXISTS\\s+)?(?:ONLY\\s+)?(" +
      QUALIFIED_IDENTIFIER_SOURCE +
      ")\\s+(ENABLE|DISABLE|FORCE|NO\\s+FORCE)\\s+ROW\\s+LEVEL\\s+SECURITY",
    "iu",
  ).exec(statement.masked);
  if (!match) return false;
  const identity = canonicalObjectIdentity(match[1], context.defaultSchema);
  const state = context.objects.get("table|" + identity);
  if (!state) return true;
  const operation = match[2].toUpperCase().replace(/\s+/gu, "_");
  if (operation === "ENABLE") state.rlsEnabled = true;
  if (operation === "DISABLE") state.rlsEnabled = false;
  if (operation === "FORCE") state.forceRls = true;
  if (operation === "NO_FORCE") state.forceRls = false;
  context.securityTransitions.push({
    operationKind: "RLS_" + operation,
    objectIdentity: identity,
    statementOrdinal: statement.ordinal,
    exactSourceSpan: statement.sourceSpan,
    afterState: { rlsEnabled: state.rlsEnabled, forceRls: state.forceRls },
  });
  return true;
}

function parseOwnerMutation(context, statement) {
  const match = new RegExp(
    "^\\s*ALTER\\s+(TABLE|SEQUENCE|TYPE|SCHEMA|FUNCTION|PROCEDURE|ROUTINE)\\s+(" +
      QUALIFIED_IDENTIFIER_SOURCE + "(?:\\s*\\([^)]*\\))?)\\s+OWNER\\s+TO\\s+(" +
      IDENTIFIER_SOURCE + ")",
    "iu",
  ).exec(statement.masked);
  if (!match) return false;
  const kind = objectKindFromKeyword(match[1]);
  const identity = canonicalObjectIdentity(match[2], kind === "schema" ? null : context.defaultSchema);
  const state = context.objects.get(kind + "|" + identity) ||
    (kind === "function" ? context.objects.get("procedure|" + identity) : null);
  if (!state) return true;
  const ownerEvidence = addRoleEvidence(context, match[3], statement, 0);
  if (!ownerEvidence) {
    addDiagnostic(context, "UNSUPPORTED_DYNAMIC_OWNER_ROLE", statement, match[3]);
    return true;
  }
  knownRole(context, ownerEvidence.exactCanonicalIdentity, statement);
  state.ownerRole = ownerEvidence.exactCanonicalIdentity;
  context.securityTransitions.push({
    operationKind: "OWNER_CHANGE",
    objectIdentity: identity,
    statementOrdinal: statement.ordinal,
    exactSourceSpan: statement.sourceSpan,
    afterState: { ownerRole: state.ownerRole },
  });
  return true;
}

function parseObjectPrivilegeMutation(context, statement) {
  const masked = statement.masked.replace(/;\s*$/u, "").trim();
  if (!/^(?:GRANT|REVOKE)\b/iu.test(masked) || !/\bON\b/iu.test(masked)) return false;
  if (/\bON\s+ALL\b/iu.test(masked)) {
    addDiagnostic(context, "UNSUPPORTED_BROAD_OBJECT_PRIVILEGE_MUTATION", statement, masked);
    return true;
  }
  if (/\([^)]*\)\s+ON\b/iu.test(masked)) {
    addDiagnostic(context, "UNSUPPORTED_COLUMN_PRIVILEGE_MUTATION", statement, masked);
    return true;
  }

  const match = /^(GRANT|REVOKE)\s+([\s\S]+?)\s+ON\s+(?:(TABLE|SEQUENCE|FUNCTION|PROCEDURE|ROUTINE|SCHEMA|TYPE)\s+)?([\s\S]+?)\s+(TO|FROM)\s+([\s\S]+?)(?:\s+(?:CASCADE|RESTRICT))?$/iu.exec(masked);
  if (!match) {
    addDiagnostic(context, "UNSUPPORTED_OBJECT_PRIVILEGE_MUTATION", statement, masked);
    return true;
  }
  if (/\bWITH\s+GRANT\s+OPTION\b/iu.test(masked) || /^REVOKE\s+GRANT\s+OPTION\s+FOR\b/iu.test(masked)) {
    addDiagnostic(context, "UNSUPPORTED_OBJECT_GRANT_OPTION", statement, null);
    return true;
  }

  const operation = match[1].toUpperCase();
  const kind = objectKindFromKeyword(match[3] || "TABLE");
  const objectClass = objectClassFromKind(kind);
  const objects = splitTopLevelComma(match[4]).map(function (entry) {
    return canonicalObjectIdentity(entry, kind === "schema" ? null : context.defaultSchema);
  });
  const grantees = parseRoleList(context, match[6], statement);
  const privileges = expandPrivileges(match[2], objectClass);
  for (const grantee of grantees) knownRole(context, grantee, statement);
  for (const privilege of privileges) {
    if (!privilegeUniverse(objectClass).includes(privilege)) {
      addDiagnostic(context, "UNSUPPORTED_OBJECT_PRIVILEGE", statement, privilege);
    }
  }

  for (const identity of objects) {
    const state = context.objects.get(kind + "|" + identity) ||
      (kind === "function" ? context.objects.get("procedure|" + identity) : null);
    if (!state) continue;
    const before = aclProjection(state.privileges);
    applyAclMutation(state.privileges, operation, grantees, privileges);
    context.securityTransitions.push({
      operationKind: "OBJECT_PRIVILEGE_" + operation,
      objectIdentity: identity,
      statementOrdinal: statement.ordinal,
      exactSourceSpan: statement.sourceSpan,
      beforeState: before,
      afterState: aclProjection(state.privileges),
    });
  }
  return true;
}

function parsePolicyMutation(context, statement) {
  const masked = statement.masked.replace(/;\s*$/u, "").trim();
  let match = new RegExp(
    "^CREATE\\s+POLICY\\s+(" + IDENTIFIER_SOURCE + ")\\s+ON\\s+(" +
      QUALIFIED_IDENTIFIER_SOURCE + ")",
    "iu",
  ).exec(masked);
  if (match) {
    const table = canonicalObjectIdentity(match[2], context.defaultSchema);
    const state = context.objects.get("table|" + table);
    if (!state) return true;
    const name = decodeIdentifier(match[1]).canonicalIdentity;
    const command = /\bFOR\s+(ALL|SELECT|INSERT|UPDATE|DELETE)\b/iu.exec(masked)?.[1]?.toUpperCase() || "ALL";
    const roleMatch = /\bTO\s+([\s\S]*?)(?=\s+USING\s*\(|\s+WITH\s+CHECK\s*\(|$)/iu.exec(masked);
    const roles = roleMatch ? parseRoleList(context, roleMatch[1], statement) : ["public"];
    roles.forEach(function (role) { knownRole(context, role, statement); });
    state.policies.set(name, { name, command, roles: roles.slice().sort() });
    context.securityTransitions.push({
      operationKind: "POLICY_CREATE",
      objectIdentity: table,
      statementOrdinal: statement.ordinal,
      exactSourceSpan: statement.sourceSpan,
      afterState: { name, command, roles: roles.slice().sort() },
    });
    return true;
  }

  match = new RegExp(
    "^DROP\\s+POLICY\\s+(?:IF\\s+EXISTS\\s+)?(" + IDENTIFIER_SOURCE +
      ")\\s+ON\\s+(" + QUALIFIED_IDENTIFIER_SOURCE + ")",
    "iu",
  ).exec(masked);
  if (match) {
    const table = canonicalObjectIdentity(match[2], context.defaultSchema);
    const state = context.objects.get("table|" + table);
    if (state) state.policies.delete(decodeIdentifier(match[1]).canonicalIdentity);
    return true;
  }

  match = new RegExp(
    "^ALTER\\s+POLICY\\s+(" + IDENTIFIER_SOURCE + ")\\s+ON\\s+(" +
      QUALIFIED_IDENTIFIER_SOURCE + ")",
    "iu",
  ).exec(masked);
  if (match) {
    const table = canonicalObjectIdentity(match[2], context.defaultSchema);
    const state = context.objects.get("table|" + table);
    if (!state) return true;
    const name = decodeIdentifier(match[1]).canonicalIdentity;
    if (!state.policies.has(name)) {
      addDiagnostic(context, "ALTER_UNKNOWN_POLICY", statement, name);
      return true;
    }
    const roleMatch = /\bTO\s+([\s\S]*?)(?=\s+USING\s*\(|\s+WITH\s+CHECK\s*\(|$)/iu.exec(masked);
    if (roleMatch) {
      const roles = parseRoleList(context, roleMatch[1], statement);
      state.policies.get(name).roles = roles.slice().sort();
    }
    return true;
  }

  return false;
}

function securitySensitiveDynamic(statement) {
  if (!/^\s*(?:DO|EXECUTE|PREPARE|CALL)\b/iu.test(statement.masked)) return false;
  return /\b(?:GRANT|REVOKE|SET\s+ROLE|ALTER\s+DEFAULT\s+PRIVILEGES|CREATE\s+ROLE|ALTER\s+ROLE|DROP\s+ROLE|OWNER\s+TO)\b/iu.test(statement.source);
}

function isSecuritySensitive(statement) {
  return normalizedOperationKinds(statement).length > 0 ||
    /^\s*(?:GRANT|REVOKE|ALTER\s+DEFAULT\s+PRIVILEGES|SET\s+|RESET\s+ROLE|CREATE\s+POLICY|ALTER\s+POLICY|DROP\s+POLICY|ALTER\s+TABLE)\b/iu.test(statement.masked);
}

function effectivePrivilegeClosure(context, state, principal) {
  const edges = activeMembershipEdges(context.membershipEvents).map(function (edge) {
    return Object.assign({}, edge, { active: true });
  });
  const reachability = computeRoleReachabilityV1(
    principal,
    Array.from(context.roleStates.values()),
    edges,
  );
  const abilityRoles = new Set();
  for (const entry of reachability.inheritedPrivilegeReachability) abilityRoles.add(entry.role);
  for (const assumed of reachability.setRoleReachability) {
    const assumedReachability = computeRoleReachabilityV1(
      assumed.role,
      Array.from(context.roleStates.values()),
      edges,
    );
    for (const entry of assumedReachability.inheritedPrivilegeReachability) abilityRoles.add(entry.role);
    abilityRoles.add(assumed.role);
  }

  const privileges = new Set(state.privileges.get("public") || []);
  for (const role of abilityRoles) {
    for (const privilege of state.privileges.get(role) || []) privileges.add(privilege);
  }
  const policyApplicability = Array.from(state.policies.values()).filter(function (policy) {
    return policy.roles.includes("public") || policy.roles.some(function (role) {
      return abilityRoles.has(role);
    });
  }).map(function (policy) {
    return { name: policy.name, command: policy.command, roles: policy.roles.slice() };
  }).sort(function (left, right) { return left.name.localeCompare(right.name); });

  const setRoles = reachability.setRoleReachability.map(function (entry) { return entry.role; });
  const ownerPath = setRoles.includes(state.ownerRole);
  const superuserPath = setRoles.some(function (role) {
    return context.roleStates.get(role)?.superuser;
  });
  const bypassRlsPath = setRoles.some(function (role) {
    return context.roleStates.get(role)?.bypassRls;
  });
  const rlsBypass = superuserPath || bypassRlsPath || (ownerPath && !state.forceRls);

  return {
    principal,
    directObjectPrivileges: Array.from(state.privileges.get(principal) || []).sort(),
    publicPrivileges: Array.from(state.privileges.get("public") || []).sort(),
    inheritedPrivilegeRoles: reachability.inheritedPrivilegeReachability,
    setRoleReachability: reachability.setRoleReachability,
    ownerCapabilities: ownerPath,
    superuserStateReachable: superuserPath,
    bypassRlsStateReachable: bypassRlsPath,
    applicablePolicyRoleMembership: policyApplicability,
    finalEffectivePrivileges: Array.from(privileges).sort(),
    finalAbilityToAssumeAnotherPrincipal: setRoles.filter(function (role) {
      return role !== principal;
    }).sort(),
    rlsBypass,
  };
}

function validateObjectExpectation(context, state, definition, closure) {
  const expectation = definition.expectation || {};
  if (Object.prototype.hasOwnProperty.call(expectation, "rlsEnabled") &&
      state.rlsEnabled !== expectation.rlsEnabled) {
    context.validationErrors.push({
      code: "RLS_ENABLED_MISMATCH",
      objectIdentity: state.identity,
      expected: expectation.rlsEnabled,
      actual: state.rlsEnabled,
    });
  }
  if (Object.prototype.hasOwnProperty.call(expectation, "forceRls") &&
      state.forceRls !== expectation.forceRls) {
    context.validationErrors.push({
      code: "FORCE_RLS_MISMATCH",
      objectIdentity: state.identity,
      expected: expectation.forceRls,
      actual: state.forceRls,
    });
  }
  if (expectation.ownerRole && state.ownerRole !== expectation.ownerRole) {
    context.validationErrors.push({
      code: "OWNER_ROLE_MISMATCH",
      objectIdentity: state.identity,
      expected: expectation.ownerRole,
      actual: state.ownerRole,
    });
  }

  const exactMatrix = expectation.effectivePrivilegesExactly || {};
  for (const [principal, privileges] of Object.entries(exactMatrix)) {
    const actual = closure.find(function (entry) { return entry.principal === principal; })
      ?.finalEffectivePrivileges || [];
    const expected = privileges.slice().sort();
    if (!same(actual, expected)) {
      context.validationErrors.push({
        code: "EFFECTIVE_PRIVILEGE_CLOSURE_MISMATCH",
        objectIdentity: state.identity,
        principal,
        expected,
        actual,
      });
    }
  }

  for (const principal of expectation.deniedPrincipals || []) {
    const result = closure.find(function (entry) { return entry.principal === principal; });
    if (!result) continue;
    if (result.finalEffectivePrivileges.length > 0) {
      context.validationErrors.push({
        code: "DENIED_PRINCIPAL_HAS_EFFECTIVE_PRIVILEGE",
        objectIdentity: state.identity,
        principal,
        privileges: result.finalEffectivePrivileges,
      });
    }
    if (result.applicablePolicyRoleMembership.length > 0) {
      context.validationErrors.push({
        code: "DENIED_PRINCIPAL_MATCHES_POLICY_ROLE_CLOSURE",
        objectIdentity: state.identity,
        principal,
        policies: result.applicablePolicyRoleMembership,
      });
    }
    if (result.finalAbilityToAssumeAnotherPrincipal.length > 0) {
      context.validationErrors.push({
        code: "DENIED_PRINCIPAL_CAN_ASSUME_ANOTHER_ROLE",
        objectIdentity: state.identity,
        principal,
        roles: result.finalAbilityToAssumeAnotherPrincipal,
      });
    }
  }

  for (const result of closure) {
    if (expectation.forbidOwnerPathForApplicationPrincipals && result.ownerCapabilities) {
      context.validationErrors.push({
        code: "APPLICATION_PRINCIPAL_OWNER_PATH",
        objectIdentity: state.identity,
        principal: result.principal,
      });
    }
    if (expectation.forbidSuperuserOrBypassRlsPath &&
        (result.superuserStateReachable || result.bypassRlsStateReachable)) {
      context.validationErrors.push({
        code: "APPLICATION_PRINCIPAL_SUPERUSER_OR_BYPASSRLS_PATH",
        objectIdentity: state.identity,
        principal: result.principal,
      });
    }
  }
}

function projectDefaultPrivileges(context) {
  return Array.from(context.defaultPrivileges.values()).map(function (state) {
    return {
      creatorScopedDefaultPrivilegeStateV1: "CreatorScopedDefaultPrivilegeStateV1",
      creatorRole: state.creatorRole,
      scopeKind: state.scopeKind,
      exactSchemaIdentity: state.schemaIdentity,
      objectClass: state.objectClass,
      granteePrivilegeState: aclProjection(state.acl),
      statementOrder: state.lastStatementOrdinal,
      provenance: state.provenance,
    };
  }).sort(function (left, right) {
    return defaultPrivilegeKey(
      left.creatorRole,
      left.scopeKind,
      left.exactSchemaIdentity,
      left.objectClass,
    ).localeCompare(defaultPrivilegeKey(
      right.creatorRole,
      right.scopeKind,
      right.exactSchemaIdentity,
      right.objectClass,
    ));
  });
}

function projectObjects(context) {
  return Array.from(context.objects.values()).map(function (state) {
    const definition = protectedObjectDefinition(context, state.kind, state.identity);
    const closure = context.protectedPrincipals.map(function (principal) {
      return effectivePrivilegeClosure(context, state, principal);
    });
    validateObjectExpectation(context, state, definition, closure);
    return {
      effectivePrincipalPrivilegeClosureV1: "EffectivePrincipalPrivilegeClosureV1",
      kind: state.kind,
      exactObjectIdentity: state.identity,
      schemaIdentity: state.schema,
      creatorRole: state.creatorRole,
      ownerRole: state.ownerRole,
      rlsEnabled: state.rlsEnabled,
      forceRls: state.forceRls,
      securityMode: state.securityMode,
      finalDirectPrivilegeState: aclProjection(state.privileges),
      finalPolicies: Array.from(state.policies.values()).sort(function (left, right) {
        return left.name.localeCompare(right.name);
      }),
      principalClosures: closure,
    };
  }).sort(function (left, right) {
    return (left.kind + "|" + left.exactObjectIdentity)
      .localeCompare(right.kind + "|" + right.exactObjectIdentity);
  });
}

export function deriveExecutionPrincipalRoleClosureV1(input) {
  const programSource = normalizeNewlines(input.sql);
  const roleStates = new Map();
  const diagnostics = [];
  const serverVersionNum = input.serverVersionNum;
  if (!Number.isInteger(serverVersionNum) ||
      serverVersionNum < POSTGRES_SECURITY_SEMANTICS_PROFILE_V1.minimumServerVersionNum ||
      serverVersionNum >= POSTGRES_SECURITY_SEMANTICS_PROFILE_V1.maximumServerVersionNumExclusive) {
    diagnostics.push({
      code: "UNKNOWN_OR_MISMATCHED_SERVER_VERSION",
      severity: "ERROR",
      statementOrdinal: 0,
      sourceSpan: null,
      detail: serverVersionNum ?? null,
    });
  }

  for (const entry of input.initialRoleStates || []) {
    const state = roleStateFromInput(entry, 0);
    if (!state || roleStates.has(state.roleIdentity)) {
      diagnostics.push({
        code: state ? "DUPLICATE_INITIAL_ROLE" : "INVALID_INITIAL_ROLE",
        severity: "ERROR",
        statementOrdinal: 0,
        sourceSpan: null,
        detail: entry.role,
      });
    } else {
      roleStates.set(state.roleIdentity, state);
    }
  }

  const initialExecutorIdentity = decodeIdentifier(input.initialMigrationExecutor);
  const initialMigrationExecutor = initialExecutorIdentity?.canonicalIdentity;
  if (!initialMigrationExecutor || !roleStates.has(initialMigrationExecutor)) {
    diagnostics.push({
      code: "UNKNOWN_INITIAL_MIGRATION_EXECUTOR",
      severity: "ERROR",
      statementOrdinal: 0,
      sourceSpan: null,
      detail: input.initialMigrationExecutor,
    });
  }

  const protectedObjects = new Map();
  for (const definition of input.protectedObjects || []) {
    const kind = objectKindFromKeyword(definition.kind);
    const identity = canonicalObjectIdentity(
      definition.identity,
      kind === "schema" ? null : (input.defaultSchema || "public"),
    );
    if (!identity) {
      diagnostics.push({
        code: "INVALID_PROTECTED_OBJECT_IDENTITY",
        severity: "ERROR",
        statementOrdinal: 0,
        sourceSpan: null,
        detail: definition.identity,
      });
      continue;
    }
    protectedObjects.set(kind + "|" + identity, Object.assign({}, clone(definition), {
      kind,
      identity,
    }));
  }

  const protectedPrincipals = (input.protectedPrincipals || PROTECTED_APPLICATION_PRINCIPALS_V1)
    .map(function (role) { return decodeIdentifier(role)?.canonicalIdentity; })
    .filter(Boolean);

  const context = {
    programSource,
    defaultSchema: input.defaultSchema || "public",
    roleStates,
    protectedObjects,
    protectedPrincipals,
    initialMigrationExecutor,
    sessionUser: initialMigrationExecutor,
    currentUser: initialMigrationExecutor,
    roleIdentities: [],
    membershipEvents: [],
    sessionTransitions: [],
    defaultPrivileges: new Map(),
    defaultPrivilegeTransitions: [],
    objectCreationEvidence: [],
    objects: new Map(),
    securityTransitions: [],
    diagnostics,
    validationErrors: [],
  };

  for (const edge of input.initialMembershipEdges || []) {
    const granted = decodeIdentifier(edge.grantedRole)?.canonicalIdentity;
    const member = decodeIdentifier(edge.memberRole)?.canonicalIdentity;
    if (!granted || !member || !roleStates.has(granted) || !roleStates.has(member)) {
      diagnostics.push({
        code: "INVALID_INITIAL_MEMBERSHIP_EDGE",
        severity: "ERROR",
        statementOrdinal: 0,
        sourceSpan: null,
        detail: clone(edge),
      });
      continue;
    }
    context.membershipEvents.push({
      roleMembershipEdgeV1: "RoleMembershipEdgeV1",
      grantedRole: granted,
      memberRole: member,
      grantorRole: decodeIdentifier(edge.grantorRole || initialMigrationExecutor)?.canonicalIdentity,
      adminOption: Boolean(edge.adminOption),
      inheritOption: edge.inheritOption !== false,
      setOption: edge.setOption !== false,
      grantRevokeState: edge.active === false ? "REVOKED" : "GRANTED",
      active: edge.active !== false,
      statementOrdinal: 0,
      exactSourceSpan: null,
      versionSemanticsProfile: POSTGRES_SECURITY_SEMANTICS_PROFILE_V1.profileId,
      provenance: "INITIAL_MEMBERSHIP_CONTRACT",
    });
  }

  for (const baseStatement of splitTopLevelStatementsV1(programSource)) {
    const statement = Object.assign({}, baseStatement, { programSource });
    let handled = false;

    if (securitySensitiveDynamic(statement)) {
      addDiagnostic(context, "UNSUPPORTED_DYNAMIC_SECURITY_PRINCIPAL_MUTATION", statement, null);
      handled = true;
    }
    if (/^\s*(?:CREATE|ALTER|DROP)\s+(?:ROLE|USER)\b/iu.test(statement.masked)) {
      addDiagnostic(context, "UNSUPPORTED_EXECUTABLE_ROLE_DDL", statement, null);
      handled = true;
    }
    if (parseSetRole(context, statement)) handled = true;
    if (parseMembershipMutation(context, statement)) handled = true;
    if (parseDefaultPrivileges(context, statement)) handled = true;
    if (parseCreateObject(context, statement)) handled = true;
    if (parseRlsMutation(context, statement)) handled = true;
    if (parseOwnerMutation(context, statement)) handled = true;
    if (parseObjectPrivilegeMutation(context, statement)) handled = true;
    if (parsePolicyMutation(context, statement)) handled = true;

    if (!handled && isSecuritySensitive(statement)) {
      addDiagnostic(context, "UNSUPPORTED_SECURITY_SENSITIVE_STATEMENT", statement, statement.masked.trim());
    }
  }

  for (const definition of protectedObjects.values()) {
    if (!context.objects.has(definition.kind + "|" + definition.identity)) {
      context.validationErrors.push({
        code: "PROTECTED_OBJECT_CREATION_EVIDENCE_MISSING",
        objectIdentity: definition.identity,
        kind: definition.kind,
      });
    }
  }

  const finalEdges = activeMembershipEdges(context.membershipEvents).map(function (edge) {
    return Object.assign({}, edge, { active: true });
  });
  for (const rule of input.forbiddenApplicationRoleTransitions ||
      FORBIDDEN_APPLICATION_ROLE_TRANSITIONS_V1) {
    const from = decodeIdentifier(rule.from)?.canonicalIdentity;
    const to = decodeIdentifier(rule.to)?.canonicalIdentity;
    if (!from || !to || !roleStates.has(from) || !roleStates.has(to)) {
      context.validationErrors.push({
        code: "INVALID_FORBIDDEN_APPLICATION_ROLE_TRANSITION",
        rule: clone(rule),
      });
      continue;
    }
    const reachability = computeRoleReachabilityV1(
      from,
      Array.from(roleStates.values()),
      finalEdges,
    );
    const viaInheritance = reachability.inheritedPrivilegeReachability
      .some(function (entry) { return entry.role === to; });
    const viaSetRole = reachability.setRoleReachability
      .some(function (entry) { return entry.role === to; });
    if (viaInheritance || viaSetRole) {
      context.validationErrors.push({
        code: "FORBIDDEN_APPLICATION_ROLE_REACHABILITY",
        from,
        to,
        viaInheritance,
        viaSetRole,
      });
    }
  }
  const finalObjects = projectObjects(context);
  const analysisInputBinding = {
    sql: programSource,
    serverVersionNum,
    initialMigrationExecutor: input.initialMigrationExecutor,
    defaultSchema: input.defaultSchema || "public",
    initialRoleStates: clone(input.initialRoleStates || []),
    initialMembershipEdges: clone(input.initialMembershipEdges || []),
    protectedPrincipals: clone(input.protectedPrincipals || PROTECTED_APPLICATION_PRINCIPALS_V1),
    forbiddenApplicationRoleTransitions: clone(
      input.forbiddenApplicationRoleTransitions || FORBIDDEN_APPLICATION_ROLE_TRANSITIONS_V1,
    ),
    protectedObjects: clone(input.protectedObjects || []),
  };
  const receipt = {
    receiptType: "C3RA2EExecutionPrincipalRoleClosureReceiptV1",
    analysisInputDigest: sha256(canonicalJson(analysisInputBinding)),
    programSha256: sha256(programSource),
    semanticsProfile: POSTGRES_SECURITY_SEMANTICS_PROFILE_V1,
    serverVersionNum,
    roleIdentityEvidence: context.roleIdentities,
    finalRoleStates: Array.from(roleStates.values()).sort(function (left, right) {
      return left.roleIdentity.localeCompare(right.roleIdentity);
    }),
    roleMembershipStatementHistory: context.membershipEvents,
    finalRoleMembershipEdges: finalEdges,
    sessionPrincipalTransitions: context.sessionTransitions,
    finalSessionPrincipalState: {
      sessionPrincipalStateV1: "SessionPrincipalStateV1",
      sessionUser: context.sessionUser,
      currentUser: context.currentUser,
      initialMigrationExecutor: context.initialMigrationExecutor,
      statementOrdinal: splitTopLevelStatementsV1(programSource).length,
    },
    creatorScopedDefaultPrivilegeTransitions: context.defaultPrivilegeTransitions,
    finalCreatorScopedDefaultPrivileges: projectDefaultPrivileges(context),
    objectCreationPrincipalEvidence: context.objectCreationEvidence,
    securityTransitions: context.securityTransitions,
    effectiveFinalSecurityState: finalObjects,
    diagnostics: context.diagnostics,
    validationErrors: context.validationErrors,
    accepted: context.diagnostics.length === 0 && context.validationErrors.length === 0,
  };
  receipt.receiptDigest = sha256(canonicalJson(receipt));
  return receipt;
}

export function validateExecutionPrincipalRoleClosureReceiptV1(receipt, expected) {
  const candidate = clone(receipt);
  const claimed = candidate.receiptDigest;
  delete candidate.receiptDigest;
  const errors = [];
  const derived = sha256(canonicalJson(candidate));
  if (claimed !== derived) errors.push("RECEIPT_DIGEST_MISMATCH");
  if (candidate.receiptType !== "C3RA2EExecutionPrincipalRoleClosureReceiptV1") {
    errors.push("RECEIPT_TYPE_MISMATCH");
  }
  if (candidate.semanticsProfile?.profileId !== POSTGRES_SECURITY_SEMANTICS_PROFILE_V1.profileId) {
    errors.push("SEMANTICS_PROFILE_MISMATCH");
  }
  if (!candidate.analysisInputDigest || !candidate.programSha256) {
    errors.push("ANALYSIS_INPUT_BINDING_MISSING");
  }
  if (!Array.isArray(candidate.finalRoleMembershipEdges) ||
      !Array.isArray(candidate.roleMembershipStatementHistory) ||
      !Array.isArray(candidate.sessionPrincipalTransitions) ||
      !Array.isArray(candidate.objectCreationPrincipalEvidence) ||
      !Array.isArray(candidate.effectiveFinalSecurityState)) {
    errors.push("RECEIPT_CLOSURE_FIELDS_MISSING");
  } else {
    const replayedEdges = activeMembershipEdges(candidate.roleMembershipStatementHistory)
      .map(function (edge) { return Object.assign({}, edge, { active: true }); });
    if (!same(replayedEdges, candidate.finalRoleMembershipEdges)) {
      errors.push("ROLE_GRAPH_REPLAY_MISMATCH");
    }

    let replayedCurrent = candidate.finalSessionPrincipalState?.initialMigrationExecutor;
    for (const transition of candidate.sessionPrincipalTransitions) {
      if (transition.currentUserBefore !== replayedCurrent) {
        errors.push("CURRENT_PRINCIPAL_TRANSITION_CHAIN_MISMATCH");
        break;
      }
      replayedCurrent = transition.currentUserAfter;
    }
    if (replayedCurrent !== candidate.finalSessionPrincipalState?.currentUser) {
      errors.push("CURRENT_PRINCIPAL_REPLAY_MISMATCH");
    }
  }
  if (expected) {
    if (expected.receiptDigest && expected.receiptDigest !== claimed) {
      errors.push("EXPECTED_RECEIPT_DIGEST_MISMATCH");
    }
    if (expected.analysisInputDigest &&
        expected.analysisInputDigest !== candidate.analysisInputDigest) {
      errors.push("EXPECTED_ANALYSIS_INPUT_DIGEST_MISMATCH");
    }
    if (expected.programSha256 && expected.programSha256 !== candidate.programSha256) {
      errors.push("EXPECTED_PROGRAM_DIGEST_MISMATCH");
    }
  }
  if (candidate.diagnostics?.length || candidate.validationErrors?.length || candidate.accepted !== true) {
    errors.push("RECEIPT_NOT_ACCEPTED");
  }
  return { valid: errors.length === 0, errors, derivedDigest: derived };
}

export function validateC3rA2eMergedMainReceiptV1(receipt, expected) {
  const errors = [];
  const required = [
    "authorityStage", "pullRequest", "baseSha", "expectedHead", "reviewedHead", "reviewedTree",
    "squashMergeSha", "resultingMainSha", "resultingMainTree", "exactHeadChecksPassed",
    "formalReviewId", "actionableCounts", "unresolvedActionableThreads",
    "artifactDigests", "remoteMutationCount",
  ];
  for (const field of required) {
    if (!Object.prototype.hasOwnProperty.call(receipt || {}, field)) {
      errors.push("MISSING_" + field.toUpperCase());
    }
  }
  if (receipt?.authorityStage !== "C3R-A2E") errors.push("WRONG_AUTHORITY_STAGE");
  if (receipt?.pullRequest === 790 || receipt?.pullRequest === 791) {
    errors.push("TERMINAL_DONOR_PR_CANNOT_SUBSTITUTE");
  }
  if (receipt?.merged !== true) errors.push("MERGED_MAIN_RECEIPT_REQUIRED");
  if (receipt?.exactHeadChecksPassed !== true) errors.push("EXACT_HEAD_CHECKS_REQUIRED");
  if (!same(receipt?.actionableCounts, { p0: 0, p1: 0, p2: 0 })) {
    errors.push("ACTIONABLE_COUNTS_NOT_ZERO");
  }
  if (receipt?.unresolvedActionableThreads !== 0) errors.push("UNRESOLVED_ACTIONABLE_THREADS");
  if (receipt?.remoteMutationCount !== 0) errors.push("REMOTE_MUTATION_NOT_ZERO");
  if (receipt?.reviewedHead !== receipt?.expectedHead || receipt?.squashMergeSha !== receipt?.resultingMainSha) {
    errors.push("EXPECTED_HEAD_OR_SQUASH_BINDING_MISMATCH");
  }
  if (expected) {
    if (receipt?.baseSha !== expected.baseSha) errors.push("BASE_SHA_MISMATCH");
    if (!same(receipt?.artifactDigests, expected.artifactDigests)) {
      errors.push("ARTIFACT_DIGEST_MISMATCH");
    }
  }
  return { valid: errors.length === 0, errors };
}
