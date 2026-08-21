import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  FORBIDDEN_APPLICATION_ROLE_TRANSITIONS_V1,
  POSTGRES_SECURITY_SEMANTICS_PROFILE_V1,
  canonicalJson,
  computeRoleReachabilityV1,
  deriveExecutionPrincipalRoleClosureV1,
  deriveRoleSensitiveSqlInventoryV1,
  sha256,
  validateC3rA2eMergedMainReceiptV1,
  validateExecutionPrincipalRoleClosureReceiptV1,
} from "../scripts/automation/wcv-c3r-a2e-execution-principal-role-closure.mjs";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const manifestPath = path.join(
  repositoryRoot,
  "config",
  "dabangil-wcv-c3r-a2e-execution-principal-role-closure-v1.json",
);
const prContractValidatorPath = path.join(
  repositoryRoot,
  "scripts",
  "automation",
  "validate-pr-contract.mjs",
);
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

const BASE_ROLES = [
  { role: "migration_executor", login: true, superuser: true, inherit: true, bypassRls: true, createRole: true },
  { role: "anon", login: true, superuser: false, inherit: true, bypassRls: false, createRole: false },
  { role: "authenticated", login: false, superuser: false, inherit: true, bypassRls: false, createRole: false },
  { role: "service_role", login: true, superuser: false, inherit: true, bypassRls: true, createRole: false },
  { role: "other_creator", login: false, superuser: false, inherit: true, bypassRls: false, createRole: false },
  { role: "noinherit_bridge", login: false, superuser: false, inherit: false, bypassRls: false, createRole: false },
  { role: "owner_role", login: false, superuser: false, inherit: true, bypassRls: false, createRole: false },
  { role: "super_role", login: false, superuser: true, inherit: true, bypassRls: false, createRole: false },
  { role: "bypass_role", login: false, superuser: false, inherit: true, bypassRls: true, createRole: false },
];

function derive(sql, overrides = {}) {
  return deriveExecutionPrincipalRoleClosureV1({
    sql,
    serverVersionNum: 150008,
    initialMigrationExecutor: "migration_executor",
    defaultSchema: "public",
    initialRoleStates: BASE_ROLES,
    initialMembershipEdges: [],
    protectedPrincipals: ["anon", "authenticated", "service_role"],
    protectedObjects: [],
    forbiddenApplicationRoleTransitions:
      FORBIDDEN_APPLICATION_ROLE_TRANSITIONS_V1,
    ...overrides,
  });
}

function codes(receipt) {
  return [
    ...receipt.diagnostics.map((entry) => entry.code),
    ...receipt.validationErrors.map((entry) => entry.code),
  ];
}

function objectClosure(receipt, identity, principal) {
  const object = receipt.effectiveFinalSecurityState.find(
    (entry) => entry.exactObjectIdentity === identity,
  );
  assert.ok(object, "missing object closure for " + identity);
  const closure = object.principalClosures.find(
    (entry) => entry.principal === principal,
  );
  assert.ok(closure, "missing principal closure for " + principal);
  return closure;
}

function rebindDigest(receipt) {
  const candidate = structuredClone(receipt);
  delete candidate.receiptDigest;
  receipt.receiptDigest = sha256(canonicalJson(candidate));
  return receipt;
}

function expectedDerivedReceiptBinding(receipt) {
  return {
    receiptDigest: receipt.receiptDigest,
    analysisInputDigest: receipt.analysisInputDigest,
    programSha256: receipt.programSha256,
  };
}

async function gitBlobSha(relativePath) {
  const content = await readFile(path.join(repositoryRoot, relativePath));
  return createHash("sha1")
    .update("blob " + content.length + "\0")
    .update(content)
    .digest("hex");
}

function completePrBody() {
  return [
    "## Goal",
    "",
    "Install the source-only C3R-A2E execution-principal authority.",
    "",
    "Refs #781",
    "Refs #706",
    "Refs #707",
    "Refs #708",
    "Refs #714",
    "Governed issues remain open.",
    "",
    "## Non-goals",
    "",
    "No migration, runtime, database, remote, or successor mutation.",
    "",
    "## Risk classification",
    "",
    "- Risk: [high]",
    "",
    "## Data boundary",
    "",
    "Repository metadata and synthetic SQL only.",
    "",
    "## Schema / API / environment changes",
    "",
    "None.",
    "",
    "## Tests and evidence",
    "",
    "Repository-native exact-head checks.",
    "",
    "## Runtime evidence",
    "",
    "Source-only authority; no runtime activation.",
    "",
    "## Rollout and rollback",
    "",
    "Draft-only under CONNECTOR_RULESET_UNOBSERVABLE.",
    "",
    "## Remaining risks",
    "",
    "Ready and merge require separately authorized ruleset evidence.",
    "",
    "## Merge recommendation",
    "",
    "- [ ] Auto-merge candidate",
    "- [ ] Human approval required",
    "- [x] Blocked",
    "",
  ].join("\n");
}

async function runPrContract(body, pullRequestOverrides = {}) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "inverge-a2e-contract-"));
  const eventPath = path.join(directory, "event.json");
  const pullRequest = {
    body,
    title: "[WCV-C3R-A2E] Install PostgreSQL execution-principal and role-closure authority",
    base: {
      ref: "main",
      sha: "54afffcc539981ded65591f1f027171343bfce40",
    },
    head: {
      ref: "codex/wcv-c3r-a2e-execution-principal-role-closure",
      repo: { full_name: "chachathecat/inverge" },
    },
    ...pullRequestOverrides,
  };
  await writeFile(
    eventPath,
    JSON.stringify({
      repository: { full_name: "chachathecat/inverge" },
      pull_request: pullRequest,
    }),
    "utf8",
  );
  try {
    return spawnSync(process.execPath, [prContractValidatorPath], {
      cwd: repositoryRoot,
      encoding: "utf8",
      env: { ...process.env, GITHUB_EVENT_PATH: eventPath },
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("PostgreSQL semantics profile is exactly the repository PostgreSQL 15.8 contract", () => {
  assert.equal(
    POSTGRES_SECURITY_SEMANTICS_PROFILE_V1.profileId,
    "postgresql_15_8_execution_principal_role_closure_v1",
  );
  assert.equal(POSTGRES_SECURITY_SEMANTICS_PROFILE_V1.postgresMajor, 15);
  assert.equal(POSTGRES_SECURITY_SEMANTICS_PROFILE_V1.minimumServerVersionNum, 150008);
  assert.equal(POSTGRES_SECURITY_SEMANTICS_PROFILE_V1.maximumServerVersionNumExclusive, 160000);
  assert.equal(
    POSTGRES_SECURITY_SEMANTICS_PROFILE_V1.repositoryValidationImage,
    "postgres:15.8-bookworm",
  );
  assert.equal(
    POSTGRES_SECURITY_SEMANTICS_PROFILE_V1.perMembershipInheritAndSetOptionsSupported,
    false,
  );
  assert.equal(
    manifest.postgresSecuritySemanticsProfileV1.defaultPrivilegeForms
      .largeObjectsSupportedInPostgres15,
    false,
  );
});

test("unknown or mismatched server semantics fail closed", () => {
  for (const serverVersionNum of [null, 140012, 160000]) {
    const receipt = derive("", { serverVersionNum });
    assert.equal(receipt.accepted, false);
    assert.ok(codes(receipt).includes("UNKNOWN_OR_MISMATCHED_SERVER_VERSION"));
  }
});

test("PostgreSQL 16 per-membership INHERIT and SET options fail closed on PostgreSQL 15", () => {
  for (const sql of [
    "GRANT authenticated TO anon WITH INHERIT FALSE;",
    "GRANT authenticated TO anon WITH SET FALSE;",
  ]) {
    const receipt = derive(sql);
    assert.equal(receipt.accepted, false);
    assert.ok(codes(receipt).includes("UNSUPPORTED_MEMBERSHIP_OPTION_FOR_POSTGRES_15"));
  }
});

test("large-object default ACL syntax fails closed under the PostgreSQL 15 profile", () => {
  const receipt = derive(
    "ALTER DEFAULT PRIVILEGES GRANT SELECT ON LARGE OBJECTS TO anon;",
  );
  assert.equal(receipt.accepted, false);
  assert.ok(codes(receipt).includes("UNSUPPORTED_ALTER_DEFAULT_PRIVILEGES"));
});

test("protected-principal and forbidden-transition inputs cannot narrow the live application boundary", () => {
  const receipt = derive("GRANT authenticated TO anon;", {
    protectedPrincipals: [],
    forbiddenApplicationRoleTransitions: [],
  });
  assert.equal(receipt.accepted, false);
  assert.ok(codes(receipt).includes("PROTECTED_APPLICATION_PRINCIPAL_MISSING"));
  assert.ok(codes(receipt).includes("FORBIDDEN_APPLICATION_ROLE_REACHABILITY"));
  assert.deepEqual(
    receipt.effectiveForbiddenApplicationRoleTransitions,
    FORBIDDEN_APPLICATION_ROLE_TRANSITIONS_V1,
  );
});

test("terminal P1 3829907873: GRANT authenticated TO anon is rejected as unsafe", () => {
  const receipt = derive("GRANT authenticated TO anon;");
  assert.equal(receipt.accepted, false);
  assert.deepEqual(receipt.finalRoleMembershipEdges.map((edge) => ({
    grantedRole: edge.grantedRole,
    memberRole: edge.memberRole,
    inheritOption: edge.inheritOption,
    setOption: edge.setOption,
  })), [{
    grantedRole: "authenticated",
    memberRole: "anon",
    inheritOption: true,
    setOption: true,
  }]);
  assert.ok(codes(receipt).includes("FORBIDDEN_APPLICATION_ROLE_REACHABILITY"));
});

test("INHERIT and SET ROLE reachability are independent graph projections", () => {
  const states = [
    { roleIdentity: "anon", inherit: true },
    { roleIdentity: "authenticated", inherit: true },
    { roleIdentity: "service_role", inherit: true },
  ];
  const inheritOnly = computeRoleReachabilityV1("anon", states, [{
    grantedRole: "authenticated",
    memberRole: "anon",
    inheritOption: true,
    setOption: false,
    active: true,
  }]);
  assert.ok(inheritOnly.inheritedPrivilegeReachability.some((entry) => entry.role === "authenticated"));
  assert.ok(!inheritOnly.setRoleReachability.some((entry) => entry.role === "authenticated"));

  const setOnly = computeRoleReachabilityV1("anon", states, [{
    grantedRole: "authenticated",
    memberRole: "anon",
    inheritOption: false,
    setOption: true,
    active: true,
  }]);
  assert.ok(!setOnly.inheritedPrivilegeReachability.some((entry) => entry.role === "authenticated"));
  assert.ok(setOnly.setRoleReachability.some((entry) => entry.role === "authenticated"));
});

test("a non-inheriting but SET-capable edge remains an unsafe assumable-role path", () => {
  const receipt = derive("", {
    initialMembershipEdges: [{
      grantedRole: "authenticated",
      memberRole: "anon",
      inheritOption: false,
      setOption: true,
    }],
  });
  const error = receipt.validationErrors.find(
    (entry) => entry.code === "FORBIDDEN_APPLICATION_ROLE_REACHABILITY",
  );
  assert.equal(receipt.accepted, false);
  assert.deepEqual(error, {
    code: "FORBIDDEN_APPLICATION_ROLE_REACHABILITY",
    from: "anon",
    to: "authenticated",
    viaInheritance: false,
    viaSetRole: true,
  });
});

test("an edge with neither INHERIT nor SET capability fabricates no privilege", () => {
  const receipt = derive([
    "CREATE TABLE public.safe_table(id int);",
    "REVOKE ALL ON TABLE public.safe_table FROM PUBLIC;",
    "GRANT SELECT ON TABLE public.safe_table TO authenticated;",
  ].join("\n"), {
    initialMembershipEdges: [{
      grantedRole: "authenticated",
      memberRole: "anon",
      inheritOption: false,
      setOption: false,
    }],
    protectedObjects: [{
      kind: "table",
      identity: "public.safe_table",
      expectation: {
        effectivePrivilegesExactly: {
          anon: [],
          authenticated: ["SELECT"],
        },
        deniedPrincipals: ["anon"],
      },
    }],
  });
  assert.equal(receipt.accepted, true);
  assert.deepEqual(
    objectClosure(receipt, "public.safe_table", "anon").finalEffectivePrivileges,
    [],
  );
  assert.deepEqual(
    objectClosure(receipt, "public.safe_table", "anon").finalAbilityToAssumeAnotherPrincipal,
    [],
  );
});

test("two-hop and three-hop chains stop exactly at a NOINHERIT bridge while SET remains transitive", () => {
  const states = [
    { roleIdentity: "anon", inherit: true },
    { roleIdentity: "authenticated", inherit: true },
    { roleIdentity: "noinherit_bridge", inherit: false },
    { roleIdentity: "service_role", inherit: true },
  ];
  const edges = [
    { grantedRole: "authenticated", memberRole: "anon", inheritOption: true, setOption: true, active: true },
    { grantedRole: "noinherit_bridge", memberRole: "authenticated", inheritOption: true, setOption: true, active: true },
    { grantedRole: "service_role", memberRole: "noinherit_bridge", inheritOption: true, setOption: true, active: true },
  ];
  const reachability = computeRoleReachabilityV1("anon", states, edges);
  assert.deepEqual(
    reachability.inheritedPrivilegeReachability.map((entry) => entry.role),
    ["anon", "authenticated", "noinherit_bridge"],
  );
  assert.deepEqual(
    reachability.setRoleReachability.map((entry) => entry.role),
    ["anon", "authenticated", "noinherit_bridge", "service_role"],
  );
  assert.deepEqual(
    reachability.setRoleReachability.find((entry) => entry.role === "service_role").path,
    ["anon", "authenticated", "noinherit_bridge", "service_role"],
  );
});

test("a later REVOKE removes the exact membership edge", () => {
  const receipt = derive([
    "GRANT authenticated TO anon;",
    "REVOKE authenticated FROM anon;",
  ].join("\n"));
  assert.equal(receipt.accepted, true);
  assert.equal(receipt.roleMembershipStatementHistory.length, 2);
  assert.deepEqual(receipt.finalRoleMembershipEdges, []);
});

test("PostgreSQL 15 WITH ADMIN OPTION and ADMIN OPTION revoke stay distinct", () => {
  const receipt = derive([
    "GRANT other_creator TO migration_executor WITH ADMIN OPTION GRANTED BY migration_executor;",
    "REVOKE ADMIN OPTION FOR other_creator FROM migration_executor;",
  ].join("\n"));
  assert.equal(receipt.accepted, true);
  assert.equal(receipt.roleMembershipStatementHistory[0].adminOption, true);
  assert.equal(receipt.roleMembershipStatementHistory[1].grantRevokeState, "ADMIN_REVOKED");
  assert.equal(receipt.finalRoleMembershipEdges.length, 1);
  assert.equal(receipt.finalRoleMembershipEdges[0].adminOption, false);
  assert.equal(receipt.finalRoleMembershipEdges[0].statementOrdinal, 2);
  assert.equal(
    receipt.finalRoleMembershipEdges[0].exactSourceSpan.start,
    receipt.roleMembershipStatementHistory[1].exactSourceSpan.start,
  );
});

test("a duplicate plain GRANT preserves an existing PostgreSQL 15 ADMIN OPTION", () => {
  const preserved = derive([
    "GRANT other_creator TO migration_executor WITH ADMIN OPTION;",
    "GRANT other_creator TO migration_executor;",
  ].join("\n"));
  assert.equal(preserved.accepted, true);
  assert.equal(preserved.roleMembershipStatementHistory.length, 2);
  assert.equal(preserved.finalRoleMembershipEdges[0].adminOption, true);
  assert.equal(
    preserved.finalRoleMembershipEdges[0].adminOptionPreservedFromStatementOrdinal,
    1,
  );

  const revoked = derive([
    "GRANT other_creator TO migration_executor WITH ADMIN OPTION;",
    "GRANT other_creator TO migration_executor;",
    "REVOKE ADMIN OPTION FOR other_creator FROM migration_executor;",
  ].join("\n"));
  assert.equal(revoked.accepted, true);
  assert.equal(revoked.finalRoleMembershipEdges[0].adminOption, false);
});

test("role membership text in comments and strings creates no edge", () => {
  const receipt = derive([
    "-- GRANT authenticated TO anon;",
    "SELECT 'GRANT authenticated TO anon';",
    "/* GRANT service_role TO anon; */",
  ].join("\n"));
  assert.equal(receipt.accepted, true);
  assert.deepEqual(receipt.finalRoleMembershipEdges, []);
});

test("dynamic role-membership mutation fails closed", () => {
  const receipt = derive(
    "DO $$ BEGIN EXECUTE 'GRANT authenticated TO anon'; END $$;",
  );
  assert.equal(receipt.accepted, false);
  assert.ok(codes(receipt).includes("UNSUPPORTED_DYNAMIC_SECURITY_PRINCIPAL_MUTATION"));
});

test("unknown and PUBLIC role-membership targets fail closed", () => {
  const unknown = derive("GRANT unknown_role TO anon;");
  assert.equal(unknown.accepted, false);
  assert.ok(codes(unknown).includes("UNKNOWN_ROLE_IDENTITY"));

  const publicMembership = derive("GRANT authenticated TO PUBLIC;");
  assert.equal(publicMembership.accepted, false);
  assert.ok(codes(publicMembership).includes("PUBLIC_ROLE_MEMBERSHIP_FORBIDDEN"));
});

test("unknown initial grantors and initial membership cycles fail closed", () => {
  const unknownGrantor = derive("", {
    initialMembershipEdges: [{
      grantedRole: "other_creator",
      memberRole: "authenticated",
      grantorRole: "ghost",
    }],
  });
  assert.equal(unknownGrantor.accepted, false);
  assert.ok(codes(unknownGrantor).includes("INVALID_INITIAL_MEMBERSHIP_EDGE"));

  const cycle = derive("", {
    initialMembershipEdges: [
      { grantedRole: "other_creator", memberRole: "authenticated" },
      { grantedRole: "authenticated", memberRole: "other_creator" },
    ],
  });
  assert.equal(cycle.accepted, false);
  assert.ok(codes(cycle).includes("INITIAL_ROLE_MEMBERSHIP_CYCLE"));
});

test("overlength PostgreSQL identifiers fail closed instead of creating false identities", () => {
  const receipt = derive("GRANT " + "a".repeat(64) + " TO anon;");
  assert.equal(receipt.accepted, false);
  assert.ok(codes(receipt).includes("UNSUPPORTED_OR_DYNAMIC_ROLE_IDENTITY"));
});

test("quoted case-different role identities stay distinct", () => {
  const receipt = derive('GRANT "Authenticated" TO anon;', {
    initialRoleStates: [
      ...BASE_ROLES,
      { role: '"Authenticated"', login: false, inherit: true },
    ],
  });
  assert.equal(receipt.accepted, true);
  assert.equal(receipt.finalRoleMembershipEdges[0].grantedRole, "Authenticated");
  assert.notEqual(receipt.finalRoleMembershipEdges[0].grantedRole, "authenticated");
  const evidence = receipt.roleIdentityEvidence.find(
    (entry) => entry.exactCanonicalIdentity === "Authenticated",
  );
  assert.equal(evidence.quoted, true);
  assert.equal(evidence.decodedIdentifierValue, "Authenticated");
});

test("executable CREATE, ALTER, and DROP ROLE forms fail closed", () => {
  for (const sql of [
    "CREATE ROLE surprise;",
    "ALTER ROLE anon SUPERUSER;",
    "DROP ROLE authenticated;",
  ]) {
    const receipt = derive(sql);
    assert.equal(receipt.accepted, false);
    assert.ok(codes(receipt).includes("UNSUPPORTED_EXECUTABLE_ROLE_DDL"));
  }
});

test("CREATE SCHEMA AUTHORIZATION fails closed before creator or owner evidence is emitted", () => {
  const named = derive("CREATE SCHEMA private AUTHORIZATION authenticated;", {
    protectedObjects: [{ kind: "schema", identity: "private", expectation: {} }],
  });
  assert.equal(named.accepted, false);
  assert.ok(codes(named).includes("UNSUPPORTED_CREATE_SCHEMA_AUTHORIZATION"));
  assert.deepEqual(named.objectCreationPrincipalEvidence, []);

  const nameOmitted = derive("CREATE SCHEMA AUTHORIZATION authenticated;");
  assert.equal(nameOmitted.accepted, false);
  assert.ok(codes(nameOmitted).includes("UNSUPPORTED_CREATE_SCHEMA_AUTHORIZATION"));

  const quotedName = derive('CREATE SCHEMA "authorization";', {
    protectedObjects: [{ kind: "schema", identity: '"authorization"', expectation: {} }],
  });
  assert.equal(quotedName.accepted, true);
  assert.equal(quotedName.objectCreationPrincipalEvidence[0].resultingOwnerRole, "migration_executor");
});

test("ALTER DEFAULT PRIVILEGES FOR ROLE changes only that creator namespace", () => {
  const receipt = derive([
    "ALTER DEFAULT PRIVILEGES FOR ROLE other_creator REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;",
    "CREATE FUNCTION public.executor_fn() RETURNS int LANGUAGE sql AS $$ SELECT 1 $$;",
  ].join("\n"), {
    protectedObjects: [{ kind: "function", identity: "public.executor_fn()", expectation: {} }],
  });
  assert.equal(receipt.accepted, true);
  const other = receipt.finalCreatorScopedDefaultPrivileges.find(
    (entry) => entry.creatorRole === "other_creator" &&
      entry.scopeKind === "GLOBAL" &&
      entry.objectClass === "FUNCTIONS_ROUTINES",
  );
  assert.deepEqual(other.granteePrivilegeState, []);
  const executorEvidence = receipt.objectCreationPrincipalEvidence[0];
  assert.equal(executorEvidence.currentCreatorRole, "migration_executor");
  assert.ok(executorEvidence.resultingInitialPrivilegeState.some(
    (entry) => entry.grantee === "public" && entry.privileges.includes("EXECUTE"),
  ));
});

test("terminal P1 3829907886: SET ROLE selects the current creator default namespace", () => {
  const receipt = derive([
    "SET ROLE other_creator;",
    "ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;",
    "CREATE FUNCTION public.before_reset() RETURNS int LANGUAGE sql AS $$ SELECT 1 $$;",
    "RESET ROLE;",
    "CREATE FUNCTION public.after_reset() RETURNS int LANGUAGE sql AS $$ SELECT 1 $$;",
  ].join("\n"), {
    protectedObjects: [
      { kind: "function", identity: "public.before_reset()", expectation: {} },
      { kind: "function", identity: "public.after_reset()", expectation: {} },
    ],
  });
  assert.equal(receipt.accepted, true);
  const before = receipt.objectCreationPrincipalEvidence.find(
    (entry) => entry.exactObjectIdentity === "public.before_reset()",
  );
  const after = receipt.objectCreationPrincipalEvidence.find(
    (entry) => entry.exactObjectIdentity === "public.after_reset()",
  );
  assert.equal(before.currentCreatorRole, "other_creator");
  assert.equal(after.currentCreatorRole, "migration_executor");
  assert.ok(!before.resultingInitialPrivilegeState.some((entry) => entry.grantee === "public"));
  assert.ok(after.resultingInitialPrivilegeState.some((entry) => entry.grantee === "public"));
});

test("RESET ROLE and SET ROLE NONE restore the known session principal", () => {
  const receipt = derive([
    "SET SESSION ROLE other_creator;",
    "RESET ROLE;",
    "SET ROLE other_creator;",
    "SET ROLE NONE;",
  ].join("\n"));
  assert.equal(receipt.accepted, true);
  assert.deepEqual(
    receipt.sessionPrincipalTransitions.map((entry) => [
      entry.currentUserBefore,
      entry.currentUserAfter,
      entry.restorationForm,
    ]),
    [
      ["migration_executor", "other_creator", null],
      ["other_creator", "migration_executor", "RESET_ROLE"],
      ["migration_executor", "other_creator", null],
      ["other_creator", "migration_executor", "SET_ROLE_NONE"],
    ],
  );
  assert.equal(receipt.finalSessionPrincipalState.currentUser, "migration_executor");
});

test("an unreachable SET ROLE target is rejected without guessing a new current principal", () => {
  const nonSuperRoles = BASE_ROLES.map((role) =>
    role.role === "migration_executor" ? { ...role, superuser: false } : role,
  );
  const receipt = derive("SET ROLE other_creator;", {
    initialRoleStates: nonSuperRoles,
  });
  assert.equal(receipt.accepted, false);
  assert.ok(codes(receipt).includes("SET_ROLE_TARGET_NOT_REACHABLE"));
  assert.equal(receipt.sessionPrincipalTransitions[0].rejected, true);
  assert.equal(
    receipt.sessionPrincipalTransitions[0].currentUserAfter,
    "migration_executor",
  );
  assert.equal(receipt.finalSessionPrincipalState.currentUser, "migration_executor");
});

test("default privileges of membership roles are not inherited at object creation", () => {
  const receipt = derive([
    "ALTER DEFAULT PRIVILEGES FOR ROLE other_creator REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;",
    "GRANT other_creator TO migration_executor;",
    "CREATE FUNCTION public.member_default_probe() RETURNS int LANGUAGE sql AS $$ SELECT 1 $$;",
  ].join("\n"), {
    protectedObjects: [{
      kind: "function",
      identity: "public.member_default_probe()",
      expectation: {},
    }],
  });
  assert.equal(receipt.accepted, true);
  const evidence = receipt.objectCreationPrincipalEvidence[0];
  assert.equal(evidence.currentCreatorRole, "migration_executor");
  assert.ok(evidence.resultingInitialPrivilegeState.some(
    (entry) => entry.grantee === "public" && entry.privileges.includes("EXECUTE"),
  ));
});

test("global and schema defaults remain separate and schema REVOKE cannot erase global GRANT", () => {
  const receipt = derive([
    "ALTER DEFAULT PRIVILEGES GRANT SELECT ON TABLES TO anon;",
    "ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE SELECT ON TABLES FROM anon;",
    "CREATE TABLE public.default_acl_probe(id int);",
  ].join("\n"), {
    protectedObjects: [{
      kind: "table",
      identity: "public.default_acl_probe",
      expectation: {
        effectivePrivilegesExactly: { anon: ["SELECT"] },
      },
    }],
  });
  assert.equal(receipt.accepted, true);
  const defaults = receipt.finalCreatorScopedDefaultPrivileges.filter(
    (entry) => entry.creatorRole === "migration_executor" &&
      entry.objectClass === "TABLES",
  );
  assert.deepEqual(defaults.map((entry) => entry.scopeKind), ["GLOBAL", "SCHEMA"]);
  assert.deepEqual(
    objectClosure(receipt, "public.default_acl_probe", "anon").finalEffectivePrivileges,
    ["SELECT"],
  );
});

test("dynamic schema default namespaces fail closed and never collapse into global defaults", () => {
  const receipt = derive([
    "ALTER DEFAULT PRIVILEGES GRANT SELECT ON TABLES TO anon;",
    "ALTER DEFAULT PRIVILEGES IN SCHEMA current_schema() REVOKE SELECT ON TABLES FROM anon;",
    "CREATE TABLE public.dynamic_schema_probe(id int);",
  ].join("\n"), {
    protectedObjects: [{
      kind: "table",
      identity: "public.dynamic_schema_probe",
      expectation: { effectivePrivilegesExactly: { anon: ["SELECT"] } },
    }],
  });
  assert.equal(receipt.accepted, false);
  assert.ok(codes(receipt).includes("UNSUPPORTED_OR_DYNAMIC_SCHEMA_IDENTITY"));
  assert.deepEqual(
    objectClosure(receipt, "public.dynamic_schema_probe", "anon").finalEffectivePrivileges,
    ["SELECT"],
  );
});

test("policy TO authenticated applies through role-membership closure", () => {
  const receipt = derive([
    "CREATE TABLE public.policy_probe(id int);",
    "REVOKE ALL ON TABLE public.policy_probe FROM PUBLIC;",
    "GRANT SELECT ON TABLE public.policy_probe TO authenticated;",
    "ALTER TABLE public.policy_probe ENABLE ROW LEVEL SECURITY;",
    "ALTER TABLE public.policy_probe FORCE ROW LEVEL SECURITY;",
    "CREATE POLICY auth_only ON public.policy_probe FOR SELECT TO authenticated USING (true);",
    "GRANT authenticated TO anon;",
  ].join("\n"), {
    protectedObjects: [{
      kind: "table",
      identity: "public.policy_probe",
      expectation: { deniedPrincipals: ["anon"] },
    }],
  });
  const anon = objectClosure(receipt, "public.policy_probe", "anon");
  assert.equal(receipt.accepted, false);
  assert.deepEqual(anon.finalEffectivePrivileges, ["SELECT"]);
  assert.deepEqual(anon.applicablePolicyRoleMembership.map((entry) => entry.name), ["auth_only"]);
  assert.deepEqual(anon.finalAbilityToAssumeAnotherPrincipal, ["authenticated"]);
});

test("ALTER POLICY rejects an unknown role before installing policy applicability", () => {
  const receipt = derive([
    "CREATE TABLE public.policy_alter_probe(id int);",
    "CREATE POLICY policy_alter ON public.policy_alter_probe TO authenticated USING (true);",
    "ALTER POLICY policy_alter ON public.policy_alter_probe TO ghost;",
  ].join("\n"), {
    protectedObjects: [{
      kind: "table",
      identity: "public.policy_alter_probe",
      expectation: {},
    }],
  });
  assert.equal(receipt.accepted, false);
  assert.ok(codes(receipt).includes("UNKNOWN_ROLE_IDENTITY"));
});

test("anon cannot inherit or assume authenticated-only table and function access", () => {
  const receipt = derive([
    "ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;",
    "CREATE TABLE public.auth_table(id int);",
    "CREATE FUNCTION public.auth_fn() RETURNS int LANGUAGE sql AS $$ SELECT 1 $$;",
    "GRANT SELECT ON TABLE public.auth_table TO authenticated;",
    "GRANT EXECUTE ON FUNCTION public.auth_fn() TO authenticated;",
    "GRANT authenticated TO anon;",
  ].join("\n"), {
    protectedObjects: [
      { kind: "table", identity: "public.auth_table", expectation: { deniedPrincipals: ["anon"] } },
      { kind: "function", identity: "public.auth_fn()", expectation: { deniedPrincipals: ["anon"] } },
    ],
  });
  assert.equal(receipt.accepted, false);
  assert.deepEqual(objectClosure(receipt, "public.auth_table", "anon").finalEffectivePrivileges, ["SELECT"]);
  assert.deepEqual(objectClosure(receipt, "public.auth_fn()", "anon").finalEffectivePrivileges, ["EXECUTE"]);
});

test("membership paths to owner, superuser, and BYPASSRLS roles fail the final gate", () => {
  const receipt = derive([
    "CREATE TABLE public.bypass_probe(id int);",
    "ALTER TABLE public.bypass_probe ENABLE ROW LEVEL SECURITY;",
    "ALTER TABLE public.bypass_probe FORCE ROW LEVEL SECURITY;",
    "ALTER TABLE public.bypass_probe OWNER TO owner_role;",
    "GRANT owner_role TO anon;",
    "GRANT super_role TO anon;",
    "GRANT bypass_role TO anon;",
  ].join("\n"), {
    protectedObjects: [{
      kind: "table",
      identity: "public.bypass_probe",
      expectation: {
        rlsEnabled: true,
        forceRls: true,
        ownerRole: "owner_role",
      },
    }],
  });
  const anon = objectClosure(receipt, "public.bypass_probe", "anon");
  assert.equal(receipt.accepted, false);
  assert.equal(anon.ownerCapabilities, true);
  assert.equal(anon.ownerPathViaMembershipOrSetRole, true);
  assert.equal(anon.superuserStateReachable, true);
  assert.equal(anon.superuserPathViaSetRole, true);
  assert.equal(anon.bypassRlsStateReachable, true);
  assert.equal(anon.bypassRlsPathViaSetRole, true);
  assert.equal(anon.rlsBypass, true);
  assert.ok(codes(receipt).includes("APPLICATION_PRINCIPAL_OWNER_PATH"));
  assert.ok(codes(receipt).includes("APPLICATION_PRINCIPAL_SUPERUSER_OR_BYPASSRLS_PATH"));
});

test("FORCE RLS removes owner-only RLS bypass but never legitimizes the owner transition", () => {
  const sqlPrefix = [
    "CREATE TABLE public.owner_probe(id int);",
    "ALTER TABLE public.owner_probe ENABLE ROW LEVEL SECURITY;",
    "ALTER TABLE public.owner_probe OWNER TO owner_role;",
    "GRANT owner_role TO anon;",
  ];
  const withoutForce = derive(sqlPrefix.join("\n"), {
    protectedObjects: [{ kind: "table", identity: "public.owner_probe", expectation: {} }],
  });
  const withForce = derive([
    ...sqlPrefix.slice(0, 2),
    "ALTER TABLE public.owner_probe FORCE ROW LEVEL SECURITY;",
    ...sqlPrefix.slice(2),
  ].join("\n"), {
    protectedObjects: [{
      kind: "table",
      identity: "public.owner_probe",
      expectation: { rlsEnabled: true, forceRls: true, ownerRole: "owner_role" },
    }],
  });
  assert.equal(objectClosure(withoutForce, "public.owner_probe", "anon").rlsBypass, true);
  assert.equal(objectClosure(withForce, "public.owner_probe", "anon").ownerCapabilities, true);
  assert.equal(objectClosure(withForce, "public.owner_probe", "anon").rlsBypass, false);
  assert.equal(withoutForce.accepted, false);
  assert.equal(withForce.accepted, false);
  assert.ok(codes(withForce).includes("APPLICATION_PRINCIPAL_OWNER_PATH"));
});

test("owner changes replace implicit owner privileges and superuser closure remains exact", () => {
  const receipt = derive([
    "SET ROLE other_creator;",
    "CREATE TABLE public.owner_change_probe(id int);",
    "RESET ROLE;",
    "ALTER TABLE public.owner_change_probe OWNER TO owner_role;",
  ].join("\n"), {
    protectedPrincipals: [
      "anon", "authenticated", "service_role", "other_creator", "owner_role",
    ],
    protectedObjects: [{
      kind: "table",
      identity: "public.owner_change_probe",
      expectation: { ownerRole: "owner_role" },
    }],
  });
  assert.equal(receipt.accepted, true);
  assert.deepEqual(
    objectClosure(receipt, "public.owner_change_probe", "other_creator").finalEffectivePrivileges,
    [],
  );
  assert.deepEqual(
    objectClosure(receipt, "public.owner_change_probe", "owner_role").finalEffectivePrivileges,
    ["DELETE", "INSERT", "REFERENCES", "SELECT", "TRIGGER", "TRUNCATE", "UPDATE"],
  );
  assert.equal(
    objectClosure(receipt, "public.owner_change_probe", "anon").rlsBypass,
    true,
  );
});

test("SET LOCAL ROLE and session-authorization semantics fail closed", () => {
  const local = derive("SET LOCAL ROLE other_creator;");
  assert.equal(local.accepted, false);
  assert.ok(codes(local).includes("UNSUPPORTED_SET_LOCAL_ROLE"));

  for (const sql of [
    "SET SESSION AUTHORIZATION other_creator;",
    "RESET SESSION AUTHORIZATION;",
  ]) {
    const receipt = derive(sql);
    assert.equal(receipt.accepted, false);
    assert.ok(codes(receipt).includes("UNSUPPORTED_SESSION_AUTHORIZATION"));
  }
});

test("every membership identity and principal transition carries exact statement/span evidence", () => {
  const receipt = derive([
    "GRANT other_creator TO migration_executor;",
    "SET ROLE other_creator;",
    "RESET ROLE;",
  ].join("\n"));
  assert.equal(receipt.accepted, true);
  assert.ok(receipt.roleIdentityEvidence.length >= 3);
  for (const evidence of receipt.roleIdentityEvidence) {
    assert.ok(evidence.statementOrdinal > 0);
    assert.ok(evidence.sourceSpan.end > evidence.sourceSpan.start);
    assert.ok(evidence.sourceSpan.startLine > 0);
  }
  for (const transition of receipt.sessionPrincipalTransitions) {
    assert.ok(transition.statementOrdinal > 0);
    assert.ok(transition.exactSourceSpan.end > transition.exactSourceSpan.start);
  }
  for (const event of receipt.roleMembershipStatementHistory) {
    assert.ok(event.statementOrdinal > 0);
    assert.ok(event.exactSourceSpan.end > event.exactSourceSpan.start);
  }
});

test("role evidence spans point to executable identities rather than matching comment text", () => {
  const sql = "GRANT /* authenticated */ authenticated TO anon;";
  const receipt = derive(sql);
  const evidence = receipt.roleIdentityEvidence.find(
    (entry) => entry.exactCanonicalIdentity === "authenticated",
  );
  assert.ok(evidence);
  assert.equal(evidence.sourceSpan.start, sql.lastIndexOf("authenticated"));
  assert.equal(
    sql.slice(evidence.sourceSpan.start, evidence.sourceSpan.end),
    "authenticated",
  );
});

test("receipt digest rebinding cannot hide role-graph mismatch", () => {
  const original = derive("");
  assert.equal(original.accepted, true);
  assert.equal(
    validateExecutionPrincipalRoleClosureReceiptV1(
      original,
      expectedDerivedReceiptBinding(original),
    ).valid,
    true,
  );

  const tampered = structuredClone(original);
  tampered.finalRoleMembershipEdges.push({
    grantedRole: "authenticated",
    memberRole: "anon",
    active: true,
    grantRevokeState: "GRANTED",
  });
  rebindDigest(tampered);
  const result = validateExecutionPrincipalRoleClosureReceiptV1(
    tampered,
    expectedDerivedReceiptBinding(original),
  );
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("ROLE_GRAPH_REPLAY_MISMATCH"));
  assert.ok(result.errors.includes("EXPECTED_RECEIPT_DIGEST_MISMATCH"));
});

test("receipt digest rebinding cannot hide current-principal mismatch", () => {
  const original = derive([
    "SET ROLE other_creator;",
    "RESET ROLE;",
  ].join("\n"));
  assert.equal(original.accepted, true);
  const tampered = structuredClone(original);
  tampered.finalSessionPrincipalState.currentUser = "other_creator";
  rebindDigest(tampered);
  const result = validateExecutionPrincipalRoleClosureReceiptV1(
    tampered,
    expectedDerivedReceiptBinding(original),
  );
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("CURRENT_PRINCIPAL_REPLAY_MISMATCH"));
  assert.ok(result.errors.includes("EXPECTED_RECEIPT_DIGEST_MISMATCH"));
});

test("independent expected digest binding covers creator, policy, default-ACL, and closure fields", () => {
  const original = derive("CREATE TABLE public.receipt_probe(id int);", {
    protectedObjects: [{
      kind: "table",
      identity: "public.receipt_probe",
      expectation: {},
    }],
  });
  assert.equal(original.accepted, true);
  assert.equal(
    validateExecutionPrincipalRoleClosureReceiptV1(original).valid,
    false,
  );
  const tampered = structuredClone(original);
  tampered.objectCreationPrincipalEvidence[0].resultingOwnerRole = "anon";
  tampered.effectiveFinalSecurityState[0].ownerRole = "anon";
  rebindDigest(tampered);
  const result = validateExecutionPrincipalRoleClosureReceiptV1(
    tampered,
    expectedDerivedReceiptBinding(original),
  );
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("EXPECTED_RECEIPT_DIGEST_MISMATCH"));
});

test("PR 790 and PR 791 candidate evidence cannot substitute for a merged-main A2E receipt", () => {
  const baseReceipt = {
    authorityStage: "C3R-A2E",
    pullRequest: 791,
    baseSha: manifest.liveBaseline.mainSha,
    baseTree: manifest.liveBaseline.mainTree,
    expectedHead: manifest.terminalDonors.c3rA2CleanReplan.finalHead,
    reviewedHead: manifest.terminalDonors.c3rA2CleanReplan.finalHead,
    reviewedTree: manifest.terminalDonors.c3rA2CleanReplan.finalTree,
    squashMergeSha: null,
    resultingMainSha: null,
    resultingMainTree: null,
    exactHeadChecksPassed: false,
    formalReviewId: 4992901306,
    formalReviewHead: manifest.terminalDonors.c3rA2CleanReplan.finalHead,
    actionableCounts: { p0: 0, p1: 2, p2: 0 },
    unresolvedActionableThreads: 2,
    artifactDigests: {},
    remoteMutationCount: 0,
    merged: false,
  };
  for (const pullRequest of [790, 791]) {
    const result = validateC3rA2eMergedMainReceiptV1({
      ...baseReceipt,
      pullRequest,
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.includes("TERMINAL_DONOR_PR_CANNOT_SUBSTITUTE"));
    assert.ok(result.errors.includes("MERGED_MAIN_RECEIPT_REQUIRED"));
  }
});

test("merged-main receipt pins every PR, head, tree, merge, and review identity", () => {
  const valid = {
    authorityStage: "C3R-A2E",
    pullRequest: 792,
    baseSha: manifest.liveBaseline.mainSha,
    baseTree: manifest.liveBaseline.mainTree,
    expectedHead: "a".repeat(40),
    reviewedHead: "a".repeat(40),
    reviewedTree: "b".repeat(40),
    squashMergeSha: "c".repeat(40),
    resultingMainSha: "c".repeat(40),
    resultingMainTree: "b".repeat(40),
    exactHeadChecksPassed: true,
    formalReviewId: 4995458963,
    formalReviewHead: "a".repeat(40),
    actionableCounts: { p0: 0, p1: 0, p2: 0 },
    unresolvedActionableThreads: 0,
    artifactDigests: { analyzer: "d".repeat(64) },
    remoteMutationCount: 0,
    merged: true,
  };
  const expected = structuredClone(valid);
  assert.equal(validateC3rA2eMergedMainReceiptV1(valid, expected).valid, true);
  assert.ok(
    validateC3rA2eMergedMainReceiptV1(
      { ...valid, pullRequest: 793 },
      expected,
    ).errors.includes("EXPECTED_PULL_REQUEST_MISMATCH"),
  );
  const wrongTree = {
    ...valid,
    reviewedTree: "e".repeat(40),
  };
  const wrongTreeResult = validateC3rA2eMergedMainReceiptV1(wrongTree, expected);
  assert.ok(wrongTreeResult.errors.includes("EXPECTED_REVIEWED_TREE_MISMATCH"));
  assert.ok(wrongTreeResult.errors.includes("REVIEWED_AND_RESULTING_TREE_MISMATCH"));
  assert.ok(
    validateC3rA2eMergedMainReceiptV1(
      { ...valid, formalReviewId: valid.formalReviewId + 1 },
      expected,
    ).errors.includes("EXPECTED_FORMAL_REVIEW_ID_MISMATCH"),
  );
  const wrongReviewHead = {
    ...valid,
    formalReviewHead: "f".repeat(40),
  };
  const wrongReviewHeadResult = validateC3rA2eMergedMainReceiptV1(
    wrongReviewHead,
    expected,
  );
  assert.ok(
    wrongReviewHeadResult.errors.includes(
      "EXPECTED_HEAD_OR_FORMAL_REVIEW_BINDING_MISMATCH",
    ),
  );
  assert.ok(
    wrongReviewHeadResult.errors.includes("EXPECTED_FORMAL_REVIEW_HEAD_MISMATCH"),
  );
  assert.ok(
    validateC3rA2eMergedMainReceiptV1(valid).errors.includes(
      "EXPECTED_MERGED_MAIN_RECEIPT_BINDING_REQUIRED",
    ),
  );
});

test("all 25 live migrations have deterministic statement-ordered role-sensitive inventory", async () => {
  const migrationsDirectory = path.join(repositoryRoot, "supabase", "migrations");
  const filenames = (await readdir(migrationsDirectory))
    .filter((filename) => filename.endsWith(".sql"))
    .sort();
  const sqlByFilename = {};
  const orderedPaths = [];
  for (const filename of filenames) {
    const relative = "supabase/migrations/" + filename;
    orderedPaths.push(relative);
    sqlByFilename[relative] = await readFile(
      path.join(migrationsDirectory, filename),
      "utf8",
    );
  }
  const inventory = deriveRoleSensitiveSqlInventoryV1(
    sqlByFilename,
    orderedPaths,
  );
  assert.equal(inventory.migrationCount, 25);
  assert.equal(inventory.roleSensitiveStatementCount, 301);
  assert.equal(
    inventory.digest,
    "a57860d45dc7650fb7bcd4ac2a1da4a55ec097a54fb085bad54752393404f7af",
  );
  assert.deepEqual(
    inventory.records.flatMap((record) => record.operationKinds)
      .reduce((counts, kind) => {
        counts[kind] = (counts[kind] || 0) + 1;
        return counts;
      }, {}),
    manifest.liveBaseline.roleSensitiveSqlInventoryV1.operationKindCounts,
  );
  for (const record of inventory.records) {
    assert.ok(record.statementOrdinal > 0);
    assert.ok(record.sourceSpan.end > record.sourceSpan.start);
    assert.match(record.normalizedStatementSha256, /^[a-f0-9]{64}$/u);
  }
});

test("deterministic role-graph and creator/default-ACL replay is byte exact", () => {
  const sql = [
    "GRANT other_creator TO migration_executor;",
    "SET ROLE other_creator;",
    "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;",
    "CREATE TABLE public.replay_probe(id int);",
    "RESET ROLE;",
  ].join("\n");
  const options = {
    protectedObjects: [{ kind: "table", identity: "public.replay_probe", expectation: {} }],
  };
  const first = derive(sql, options);
  const second = derive(sql, options);
  assert.deepEqual(first, second);
  assert.equal(first.receiptDigest, second.receiptDigest);
  assert.deepEqual(first.finalRoleMembershipEdges, second.finalRoleMembershipEdges);
  assert.deepEqual(
    first.creatorScopedDefaultPrivilegeTransitions,
    second.creatorScopedDefaultPrivilegeTransitions,
  );
  assert.deepEqual(first.objectCreationPrincipalEvidence, second.objectCreationPrincipalEvidence);
});

test("A0 and A1 immutable authority blobs plus package and lock remain exact", async () => {
  const exact = {
    "package.json": "33a8d29b52ac225c6e957c71fce1f28f2eaba16d",
    "package-lock.json": "70f85fb69c39aa73cf572082c4d38eb426c0b398",
    "docs/decisions/2026-08-21-owner-wcv-c3r-a0-migration-dependency-authority.md": "8996f6c61f6cf0c5f7c908e97437a2f24bc65f8f",
    "config/dabangil-wcv-c3r-a0-migration-dependency-authority-v1.json": "49916703d0a144647d6abce8cc98971042a35e1c",
    "scripts/automation/wcv-c3r-a0-migration-dependency-closure.mjs": "23ba3b9f2af452b250cea0cbbbc5f135e8643b2d",
    "tests/wcv-c3r-a0-migration-dependency-authority.test.mjs": "04c5e3254ac03712a0fde27ef068329299305c40",
    "docs/decisions/2026-08-21-owner-wcv-c3r-a1-serial-program-authority.md": "21fc829df76c51dfa8a891f927fd79267e195e8f",
    "config/dabangil-wcv-c3r-a1-serial-program-authority-v1.json": "4b8efb14ef58e7940c457c925f972f995066c677",
    "tests/wcv-c3r-a1-serial-program-authority.test.mjs": "45db6d4def9f2530dedad28966bf6dd40fdacdcf",
  };
  for (const [relativePath, expectedSha] of Object.entries(exact)) {
    assert.equal(await gitBlobSha(relativePath), expectedSha, relativePath);
  }
  assert.deepEqual(manifest.immutableBlobProof, {
    packageJson: exact["package.json"],
    packageLockJson: exact["package-lock.json"],
    a0Decision: exact["docs/decisions/2026-08-21-owner-wcv-c3r-a0-migration-dependency-authority.md"],
    a0Manifest: exact["config/dabangil-wcv-c3r-a0-migration-dependency-authority-v1.json"],
    a0Analyzer: exact["scripts/automation/wcv-c3r-a0-migration-dependency-closure.mjs"],
    a0Test: exact["tests/wcv-c3r-a0-migration-dependency-authority.test.mjs"],
    a1Decision: exact["docs/decisions/2026-08-21-owner-wcv-c3r-a1-serial-program-authority.md"],
    a1Manifest: exact["config/dabangil-wcv-c3r-a1-serial-program-authority-v1.json"],
    a1Test: exact["tests/wcv-c3r-a1-serial-program-authority.test.mjs"],
  });
});

test("owned paths are exact A2E-only reasons and forbidden paths stay outside scope", () => {
  assert.equal(manifest.ownedPathsExactly.length, 12);
  assert.deepEqual(
    Object.keys(manifest.changedPathReasonsExactly),
    manifest.ownedPathsExactly,
  );
  for (const [relativePath, reason] of Object.entries(
    manifest.changedPathReasonsExactly,
  )) {
    assert.match(reason, /A2E|execution-principal|role-closure|creator|authority|Owner decision|hostile|reference-only/i);
    assert.ok(!manifest.forbiddenExactPaths.includes(relativePath));
    assert.ok(!manifest.forbiddenPathPrefixes.some((prefix) => relativePath.startsWith(prefix)));
  }
  assert.ok(!manifest.ownedPathsExactly.includes("package.json"));
  assert.ok(!manifest.ownedPathsExactly.includes("package-lock.json"));
  assert.ok(!manifest.ownedPathsExactly.some((entry) => entry.startsWith("supabase/migrations/")));
  assert.ok(!manifest.ownedPathsExactly.some((entry) => entry.startsWith(".github/workflows/")));
});

test("authority mirrors keep C3R-A2 and C3R-P unstarted with every external count zero", async () => {
  assert.deepEqual(manifest.executionStates, {
    c3rA0: "INSTALLED_IMMUTABLE_HISTORICAL_BASELINE",
    c3rA1: "INSTALLED_IMMUTABLE_SERIAL_PROGRAM_AUTHORITY",
    c3rA2e: "UNINSTALLED_UNTIL_VALIDATED_MERGED_MAIN_RECEIPT",
    c3rA2: "DEPENDENCY_BLOCKED_UNSTARTED_PENDING_VALIDATED_A2E_RECEIPT",
    c3rP: "BLOCKED_UNSTARTED_PENDING_VALIDATED_A2_RECEIPT",
    c3rT: "BLOCKED",
    c3rL: "BLOCKED",
    wcvC3: "INCOMPLETE",
    secondA2CleanReplanStarted: false,
    successorRuntimeStarted: false,
  });
  for (const value of Object.values(manifest.nonMutationBoundary)) {
    assert.equal(value, 0);
  }
  for (const state of Object.values(manifest.governedIssues)) {
    assert.equal(state, "OPEN");
  }

  const mirrors = [
    "AGENTS.md",
    "roadmap/active-program.yml",
    "config/dabangil-unified-program-contract.json",
    "docs/dabangil-unified-program-contract.md",
    "docs/inverge-master-roadmap.md",
  ];
  for (const relativePath of mirrors) {
    const source = await readFile(path.join(repositoryRoot, relativePath), "utf8");
    assert.match(source, /C3R-A2E/u, relativePath);
    assert.match(source, /UNINSTALLED_UNTIL_VALIDATED_MERGED_MAIN_RECEIPT/u, relativePath);
    assert.match(source, /C3R-P/u, relativePath);
    assert.match(source, /BLOCKED_UNSTARTED_PENDING_VALIDATED_A2_RECEIPT/u, relativePath);
  }
  const activeProgram = await readFile(
    path.join(repositoryRoot, "roadmap/active-program.yml"),
    "utf8",
  );
  assert.match(activeProgram, /^  c3rA2eAuthority:/mu);
  assert.match(activeProgram, /^  c3rPEffectiveState: BLOCKED_UNSTARTED_PENDING_VALIDATED_A2_RECEIPT$/mu);
  assert.doesNotMatch(activeProgram, /^c3r_a2e_/mu);
});

test("delivery fallback is Draft-only and never claims live ruleset revalidation", () => {
  assert.equal(
    manifest.deliveryControl.connectorRulesetClassification,
    "CONNECTOR_RULESET_UNOBSERVABLE",
  );
  assert.equal(manifest.deliveryControl.mainProtectedObserved, true);
  assert.equal(manifest.deliveryControl.draftOnlyUnderCurrentConnectorFallback, true);
  assert.equal(manifest.deliveryControl.readyAuthorized, false);
  assert.equal(manifest.deliveryControl.mergeAuthorized, false);
  assert.equal(manifest.deliveryControl.autoMerge, false);
  assert.deepEqual(manifest.deliveryControl.exactHeadRequiredChecks, [
    "PR Contract",
    "Risk Gate",
    "Runtime Gate",
    "Fast CI",
    "Full CI",
    "Learner Loop Health",
    "Vercel",
  ]);
});

test("A2E PR contract accepts only the exact reference-only Draft scope", async () => {
  const valid = await runPrContract(completePrBody());
  assert.equal(valid.status, 0, valid.stderr);

  const closing = await runPrContract(
    completePrBody().replace("Refs #781", "Closes #781"),
  );
  assert.notEqual(closing.status, 0);

  const wrongBase = await runPrContract(completePrBody(), {
    base: { ref: "main", sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
  });
  assert.notEqual(wrongBase.status, 0);

  const missingReference = await runPrContract(
    completePrBody().replace("Refs #714\n", ""),
  );
  assert.notEqual(missingReference.status, 0);
});

test("A2E remains a receipt dependency and cannot start the remaining A2 or C3R-P work", () => {
  assert.equal(manifest.authority.remainingA2CleanReplanConsumed, false);
  assert.equal(manifest.authority.successorStarted, false);
  assert.equal(
    manifest.receiptContract.terminalDonorPrsCannotSubstitute.includes(790),
    true,
  );
  assert.equal(
    manifest.receiptContract.terminalDonorPrsCannotSubstitute.includes(791),
    true,
  );
  assert.equal(manifest.executionStates.secondA2CleanReplanStarted, false);
  assert.equal(manifest.executionStates.successorRuntimeStarted, false);
});
