#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync, spawnSync } from "node:child_process";

export const ORACLE_SCHEMA_VERSION =
  "inverge.wcv_c3_pre_p.postgresql_security_state_oracle.v1";
export const ORACLE_PRODUCER_VERSION =
  "wcv-c3-pre-p.postgresql-15.8-security-state-oracle.v1";
export const ORACLE_IMAGE_DIGEST =
  "eb3747f5d0a92195ca486d2f15d9a4ee5e9461b0332fe87fbc59069490a5c659";
export const ORACLE_IMAGE = `postgres@sha256:${ORACLE_IMAGE_DIGEST}`;
export const ORACLE_PLATFORM = "linux/amd64";
export const ORACLE_SERVER_VERSION_NUM = 150008;
export const ORACLE_TMPFS_DESTINATION = "/var/lib/postgresql/data";
export const ORACLE_TMPFS_OPTIONS = "rw,noexec,nosuid,nodev,size=536870912";
export const ORACLE_MISMATCH_CLASSIFICATION =
  "ORACLE_IMAGE_OR_VERSION_MISMATCH";
export const ORACLE_MANIFEST_PATH =
  "config/dabangil-wcv-c3-pre-p-postgresql-security-state-oracle-v1.json";
export const ORACLE_QA_PATH =
  "docs/qa/wcv-c3-pre-p-postgresql-security-state-oracle-validation.md";
export const ORACLE_SOURCE_PATH =
  "scripts/automation/wcv-c3-pre-p-postgresql-security-state-oracle.mjs";
export const ORACLE_TEST_PATH =
  "tests/wcv-c3-pre-p-postgresql-security-state-oracle.test.mjs";
export const NATIVE_PRODUCER_PATH =
  "scripts/automation/produce-runtime-evidence.mjs";
export const NATIVE_GATE_PATH = "scripts/automation/runtime-gate.mjs";

export const ORACLE_ALLOWED_CHANGED_PATHS = Object.freeze([
  ORACLE_MANIFEST_PATH,
  ORACLE_QA_PATH,
  ORACLE_SOURCE_PATH,
  ORACLE_TEST_PATH,
  NATIVE_PRODUCER_PATH,
  NATIVE_GATE_PATH,
  "scripts/automation/runtime-risk-contract.mjs",
  "tests/agent-factory-runtime-gate.test.mjs",
  "tests/wcv-c2r-runtime-preflight.test.mjs",
  "scripts/run-node-tests.mjs",
  "scripts/automation/validate-pr-contract.mjs",
].sort());

export const ORACLE_RUNTIME_REQUIRED_PATHS = Object.freeze([
  ORACLE_MANIFEST_PATH,
  ORACLE_QA_PATH,
  ORACLE_SOURCE_PATH,
  ORACLE_TEST_PATH,
].sort());

export const ORACLE_SNAPSHOT_COLLECTIONS = Object.freeze([
  "roles",
  "memberships",
  "defaultAcls",
  "namespaces",
  "relations",
  "routines",
  "types",
  "policies",
]);

export const ORACLE_ASSERTION_IDS = Object.freeze([
  "postgresql_15_membership_shape",
  "membership_mutation_authority",
  "principal_transitions",
  "creator_scoped_default_acl",
  "exact_catalog_identities",
  "object_lifecycle",
  "privilege_and_rls_state",
  "terminal_donor_regressions_reproduced",
  "negative_execution_atomicity",
  "dynamic_sql_closed_fixture_only",
  "metadata_only_closed_receipt",
  "cleanup_complete",
]);

export const ORACLE_ARTIFACT_DIGEST_KEYS = Object.freeze([
  "canonicalPostSnapshots",
  "canonicalPreSnapshots",
  "dockerImage",
  "fixtureSet",
  "focusedOracleTestSource",
  "nativeProducerSource",
  "nativeRuntimeGateSource",
  "oracleEvidence",
  "oracleManifest",
  "oracleProducerSource",
  "pullRequestHeadIdentity",
  "qaValidationSource",
  "runtimeInvocation",
  "serverVersionNum",
  "zeroNetworkDeclaration",
  "zeroRemoteMutationDeclaration",
].sort());

const MEMBERSHIP_INPUT_KEYS = Object.freeze([
  "adminOption",
  "grantedRole",
  "grantorRole",
  "memberRole",
]);
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const SHA_PATTERN = /^[0-9a-f]{40}$/u;
const ROLE_PATTERN = /^[A-Za-z_][A-Za-z0-9_]{0,62}$/u;
const SQLSTATE_PATTERN = /^[0-9A-Z]{5}$/u;

const BOOTSTRAP_SQL = `CREATE ROLE oracle_super LOGIN SUPERUSER;
CREATE ROLE oracle_creator LOGIN CREATEROLE;
CREATE ROLE oracle_admin LOGIN;
CREATE ROLE oracle_plain LOGIN;
CREATE ROLE oracle_direct LOGIN INHERIT;
CREATE ROLE oracle_noinherit LOGIN NOINHERIT;
CREATE ROLE oracle_mid NOLOGIN;
CREATE ROLE oracle_top NOLOGIN;
CREATE ROLE oracle_priv NOLOGIN;
CREATE ROLE oracle_owner_a LOGIN;
CREATE ROLE oracle_owner_b LOGIN;
CREATE ROLE oracle_bypass LOGIN BYPASSRLS;
CREATE ROLE oracle_policy_role NOLOGIN;
CREATE ROLE oracle_grantor NOLOGIN;
CREATE ROLE oracle_rls_public LOGIN;
CREATE ROLE oracle_rls_direct LOGIN;
CREATE ROLE oracle_rls_inherited LOGIN;
CREATE ROLE oracle_rls_owner LOGIN;
CREATE ROLE oracle_lifecycle_owner LOGIN;
CREATE ROLE oracle_lifecycle_new_owner LOGIN;
CREATE ROLE oracle_dynamic_owner LOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE anon LOGIN INHERIT;
CREATE SCHEMA oracle_security AUTHORIZATION oracle_super;
CREATE SCHEMA oracle_defaults_a AUTHORIZATION oracle_owner_a;
CREATE SCHEMA oracle_defaults_b AUTHORIZATION oracle_owner_b;
CREATE SCHEMA "Oracle Exact" AUTHORIZATION oracle_owner_a;
CREATE SCHEMA oracle_lifecycle AUTHORIZATION oracle_lifecycle_owner;
CREATE SCHEMA oracle_rls AUTHORIZATION oracle_rls_owner;
CREATE SCHEMA oracle_dynamic AUTHORIZATION oracle_dynamic_owner;
GRANT USAGE ON SCHEMA oracle_security TO PUBLIC;
GRANT USAGE ON SCHEMA oracle_defaults_a, oracle_defaults_b, "Oracle Exact", oracle_lifecycle, oracle_rls, oracle_dynamic TO PUBLIC;
GRANT CREATE ON SCHEMA oracle_lifecycle TO oracle_lifecycle_new_owner;
CREATE TABLE oracle_security.secret(value integer NOT NULL);
INSERT INTO oracle_security.secret VALUES (1);
GRANT SELECT ON oracle_security.secret TO oracle_priv;
CREATE TABLE oracle_security.auth_inherited(value integer NOT NULL);
INSERT INTO oracle_security.auth_inherited VALUES (1);
GRANT SELECT ON oracle_security.auth_inherited TO authenticated;
`;

function fixture({
  dynamicSecurity = false,
  expectation = "success",
  id,
  principal = "postgres",
  sql,
  sqlstates = [],
  stdout = null,
}) {
  if (!id || !sql.endsWith("\n")) throw new Error("oracle fixture definitions must have an ID and newline-terminated SQL bytes.");
  if (dynamicSecurity) assertSupportedDynamicFixture(id);
  return Object.freeze({
    dynamicSecurity,
    expectation,
    id,
    principal,
    sql,
    sqlstates: Object.freeze([...sqlstates]),
    stdout: stdout === null ? null : Object.freeze([...stdout]),
  });
}

const ORACLE_FIXTURES = Object.freeze([
  fixture({
    id: "membership_superuser_direct_grant",
    sql: "GRANT oracle_top TO oracle_direct;\n",
  }),
  fixture({
    id: "membership_direct_set_role",
    principal: "oracle_direct",
    sql: "SELECT session_user, current_user;\nSET ROLE oracle_top;\nSELECT session_user, current_user;\nSET ROLE NONE;\nSELECT session_user, current_user;\n",
    stdout: [
      "oracle_direct|oracle_direct",
      "oracle_direct|oracle_top",
      "oracle_direct|oracle_direct",
    ],
  }),
  fixture({
    id: "membership_multihop_grant",
    sql: "GRANT oracle_top TO oracle_mid;\nGRANT oracle_mid TO oracle_plain;\n",
  }),
  fixture({
    id: "membership_multihop_set_session_role",
    principal: "oracle_plain",
    sql: "SELECT session_user, current_user;\nSET SESSION ROLE oracle_top;\nSELECT session_user, current_user;\nRESET ROLE;\nSELECT session_user, current_user;\n",
    stdout: [
      "oracle_plain|oracle_plain",
      "oracle_plain|oracle_top",
      "oracle_plain|oracle_plain",
    ],
  }),
  fixture({
    id: "membership_inherit_and_noinherit_edges",
    sql: "GRANT oracle_priv TO oracle_direct;\nGRANT oracle_priv TO oracle_noinherit;\n",
  }),
  fixture({
    id: "membership_inherit_privilege_probe",
    principal: "oracle_direct",
    sql: "SELECT count(*) FROM oracle_security.secret;\n",
    stdout: ["1"],
  }),
  fixture({
    id: "membership_noinherit_privilege_rejection",
    principal: "oracle_noinherit",
    expectation: "rejection",
    sql: "SELECT count(*) FROM oracle_security.secret;\n",
    sqlstates: ["42501"],
  }),
  fixture({
    id: "membership_noinherit_set_role_probe",
    principal: "oracle_noinherit",
    sql: "SELECT session_user, current_user;\nSET ROLE oracle_priv;\nSELECT session_user, current_user;\nSELECT count(*) FROM oracle_security.secret;\nRESET ROLE;\nSELECT session_user, current_user;\n",
    stdout: [
      "oracle_noinherit|oracle_noinherit",
      "oracle_noinherit|oracle_priv",
      "1",
      "oracle_noinherit|oracle_noinherit",
    ],
  }),
  fixture({
    id: "membership_circular_grant_rejection",
    expectation: "rejection",
    sql: "GRANT oracle_plain TO oracle_top;\n",
    sqlstates: ["0LP01"],
  }),
  fixture({
    id: "membership_superuser_grant_revoke",
    sql: "GRANT oracle_grantor TO oracle_admin;\nREVOKE oracle_grantor FROM oracle_admin;\n",
  }),
  fixture({
    id: "membership_createrole_grant_revoke",
    principal: "oracle_creator",
    sql: "GRANT oracle_grantor TO oracle_admin;\nREVOKE oracle_grantor FROM oracle_admin;\n",
  }),
  fixture({
    id: "membership_admin_option_grant",
    sql: "GRANT oracle_grantor TO oracle_admin WITH ADMIN OPTION;\n",
  }),
  fixture({
    id: "membership_admin_option_delegation",
    principal: "oracle_admin",
    sql: "GRANT oracle_grantor TO oracle_plain;\n",
  }),
  fixture({
    id: "membership_duplicate_plain_grant_preserves_admin",
    sql: "GRANT oracle_grantor TO oracle_admin;\nSELECT admin_option FROM pg_catalog.pg_auth_members WHERE roleid = 'oracle_grantor'::regrole AND member = 'oracle_admin'::regrole;\n",
    stdout: ["t"],
  }),
  fixture({
    id: "membership_revoke_admin_option_only",
    sql: "REVOKE ADMIN OPTION FOR oracle_grantor FROM oracle_admin;\nSELECT admin_option FROM pg_catalog.pg_auth_members WHERE roleid = 'oracle_grantor'::regrole AND member = 'oracle_admin'::regrole;\n",
    stdout: ["f"],
  }),
  fixture({
    id: "membership_unauthorized_grant_rejection",
    principal: "oracle_admin",
    expectation: "rejection",
    sql: "GRANT oracle_grantor TO oracle_direct;\n",
    sqlstates: ["42501"],
  }),
  fixture({
    id: "membership_prepare_unauthorized_revoke",
    sql: "GRANT oracle_grantor TO oracle_direct;\n",
  }),
  fixture({
    id: "membership_unauthorized_revoke_rejection",
    principal: "oracle_plain",
    expectation: "rejection",
    sql: "REVOKE oracle_grantor FROM oracle_direct;\n",
    sqlstates: ["42501"],
  }),
  fixture({
    id: "membership_granted_by_existing",
    sql: "REVOKE oracle_grantor FROM oracle_admin;\nGRANT oracle_grantor TO oracle_admin GRANTED BY oracle_plain;\nSELECT pg_catalog.pg_get_userbyid(grantor) FROM pg_catalog.pg_auth_members WHERE roleid = 'oracle_grantor'::regrole AND member = 'oracle_admin'::regrole;\n",
    stdout: ["oracle_plain"],
  }),
  fixture({
    id: "membership_revoke_granted_by_existing_is_ignored",
    sql: "REVOKE oracle_grantor FROM oracle_admin GRANTED BY oracle_creator;\nSELECT count(*) FROM pg_catalog.pg_auth_members WHERE roleid = 'oracle_grantor'::regrole AND member = 'oracle_admin'::regrole;\n",
    stdout: ["0"],
  }),
  fixture({
    id: "membership_granted_by_nonexistent_rejection",
    expectation: "rejection",
    sql: "GRANT oracle_grantor TO oracle_admin GRANTED BY oracle_missing;\n",
    sqlstates: ["42704"],
  }),
  fixture({
    id: "membership_revoke_granted_by_nonexistent_rejection",
    expectation: "rejection",
    sql: "REVOKE oracle_grantor FROM oracle_direct GRANTED BY oracle_missing;\n",
    sqlstates: ["42704"],
  }),
  fixture({
    id: "historical_791_membership_grant",
    sql: "GRANT authenticated TO anon;\n",
  }),
  fixture({
    id: "historical_791_membership_inherit_and_set_probe",
    principal: "anon",
    sql: "SELECT count(*) FROM oracle_security.auth_inherited;\nSET ROLE authenticated;\nSELECT session_user, current_user;\nSELECT count(*) FROM oracle_security.auth_inherited;\nRESET ROLE;\nSELECT session_user, current_user;\n",
    stdout: [
      "1",
      "anon|authenticated",
      "1",
      "anon|anon",
    ],
  }),
  fixture({
    id: "defaults_creator_b_global_and_schema",
    principal: "oracle_owner_b",
    sql: "ALTER DEFAULT PRIVILEGES GRANT SELECT ON TABLES TO oracle_plain;\nALTER DEFAULT PRIVILEGES IN SCHEMA oracle_defaults_b GRANT INSERT ON TABLES TO oracle_direct;\n",
  }),
  fixture({
    id: "defaults_prepare_set_role_membership",
    sql: "GRANT oracle_owner_b TO oracle_owner_a;\n",
  }),
  fixture({
    id: "historical_791_creator_scoped_defaults",
    principal: "oracle_owner_a",
    sql: "SELECT session_user, current_user;\nCREATE TABLE oracle_defaults_a.before_set(id integer);\nSET ROLE oracle_owner_b;\nSELECT session_user, current_user;\nCREATE TABLE oracle_defaults_b.during_set(id integer);\nRESET ROLE;\nSELECT session_user, current_user;\nCREATE TABLE oracle_defaults_a.after_reset(id integer);\n",
    stdout: [
      "oracle_owner_a|oracle_owner_a",
      "oracle_owner_a|oracle_owner_b",
      "oracle_owner_a|oracle_owner_a",
    ],
  }),
  fixture({
    id: "defaults_exact_owner_acl_probe",
    sql: `SELECT c.relname,
       pg_catalog.pg_get_userbyid(c.relowner),
       EXISTS (SELECT 1 FROM pg_catalog.aclexplode(c.relacl) a WHERE a.grantee = 'oracle_plain'::regrole AND a.privilege_type = 'SELECT'),
       EXISTS (SELECT 1 FROM pg_catalog.aclexplode(c.relacl) a WHERE a.grantee = 'oracle_direct'::regrole AND a.privilege_type = 'INSERT')
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('oracle_defaults_a', 'oracle_defaults_b')
  AND c.relname IN ('before_set', 'during_set', 'after_reset')
ORDER BY c.relname COLLATE "C";
`,
    stdout: [
      "after_reset|oracle_owner_a|f|f",
      "before_set|oracle_owner_a|f|f",
      "during_set|oracle_owner_b|t|t",
    ],
  }),
  fixture({
    id: "identity_folded_and_quoted_create",
    principal: "oracle_owner_a",
    sql: "CREATE TABLE \"Oracle Exact\".foo(id integer);\nCREATE TABLE \"Oracle Exact\".\"Foo\"(id integer);\n",
  }),
  fixture({
    id: "identity_quoted_foo_duplicate_rejection",
    principal: "oracle_owner_a",
    expectation: "rejection",
    sql: "CREATE TABLE \"Oracle Exact\".\"foo\"(id integer);\n",
    sqlstates: ["42P07"],
  }),
  fixture({
    id: "identity_case_distinct_types_and_routines",
    principal: "oracle_owner_a",
    sql: `CREATE TYPE "Oracle Exact"."CaseType" AS ENUM ('upper');
CREATE TYPE "Oracle Exact"."casetype" AS ENUM ('lower');
CREATE FUNCTION "Oracle Exact".identity_arg("Oracle Exact"."CaseType") RETURNS text LANGUAGE sql IMMUTABLE AS 'SELECT ''upper''::text';
CREATE FUNCTION "Oracle Exact".identity_arg("Oracle Exact"."casetype") RETURNS text LANGUAGE sql IMMUTABLE AS 'SELECT ''lower''::text';
`,
  }),
  fixture({
    id: "identity_exact_routine_arguments_probe",
    sql: `SET search_path = pg_catalog;
SELECT pg_get_function_identity_arguments(p.oid)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'Oracle Exact' AND p.proname = 'identity_arg'
ORDER BY pg_get_function_identity_arguments(p.oid) COLLATE "C";
`,
    stdout: [
      "\"Oracle Exact\".\"CaseType\"",
      "\"Oracle Exact\".casetype",
    ],
  }),
  fixture({
    id: "lifecycle_create_dropped_schema",
    sql: "CREATE SCHEMA oracle_dropped AUTHORIZATION oracle_lifecycle_owner;\n",
  }),
  fixture({
    id: "lifecycle_create_dropped_objects",
    principal: "oracle_lifecycle_owner",
    sql: `CREATE TABLE oracle_dropped.gone_table(id integer);
CREATE SEQUENCE oracle_dropped.gone_sequence;
CREATE TYPE oracle_dropped.gone_type AS ENUM ('gone');
CREATE FUNCTION oracle_dropped.gone_routine() RETURNS integer LANGUAGE sql IMMUTABLE AS 'SELECT 1';
CREATE POLICY "Gone Policy" ON oracle_dropped.gone_table TO oracle_plain USING (id = 1);
`,
  }),
  fixture({
    id: "lifecycle_drop_objects_and_schema",
    principal: "oracle_lifecycle_owner",
    sql: `DROP POLICY "Gone Policy" ON oracle_dropped.gone_table;
DROP FUNCTION oracle_dropped.gone_routine();
DROP TYPE oracle_dropped.gone_type;
DROP SEQUENCE oracle_dropped.gone_sequence;
DROP TABLE oracle_dropped.gone_table;
DROP SCHEMA oracle_dropped;
`,
  }),
  fixture({
    id: "lifecycle_initial_defaults_and_create",
    principal: "oracle_lifecycle_owner",
    sql: "ALTER DEFAULT PRIVILEGES IN SCHEMA oracle_lifecycle GRANT SELECT ON TABLES TO oracle_plain;\nCREATE TABLE oracle_lifecycle.recycled(id integer);\n",
  }),
  fixture({
    id: "lifecycle_alter_owner",
    principal: "postgres",
    sql: "ALTER TABLE oracle_lifecycle.recycled OWNER TO oracle_lifecycle_new_owner;\n",
  }),
  fixture({
    id: "lifecycle_drop_after_owner_change",
    principal: "oracle_lifecycle_new_owner",
    sql: "DROP TABLE oracle_lifecycle.recycled;\nALTER DEFAULT PRIVILEGES IN SCHEMA oracle_lifecycle GRANT INSERT ON TABLES TO oracle_direct;\n",
  }),
  fixture({
    id: "lifecycle_recreate_new_owner",
    principal: "oracle_lifecycle_new_owner",
    sql: "CREATE TABLE oracle_lifecycle.recycled(id integer);\n",
  }),
  fixture({
    id: "lifecycle_recreated_owner_acl_probe",
    sql: `SELECT pg_catalog.pg_get_userbyid(c.relowner),
       EXISTS (SELECT 1 FROM pg_catalog.aclexplode(c.relacl) a WHERE a.grantee = 'oracle_plain'::regrole AND a.privilege_type = 'SELECT'),
       EXISTS (SELECT 1 FROM pg_catalog.aclexplode(c.relacl) a WHERE a.grantee = 'oracle_direct'::regrole AND a.privilege_type = 'INSERT')
FROM pg_catalog.pg_class c
WHERE c.oid = 'oracle_lifecycle.recycled'::regclass;
`,
    stdout: ["oracle_lifecycle_new_owner|f|t"],
  }),
  fixture({
    id: "privilege_rls_setup",
    principal: "oracle_rls_owner",
    sql: `CREATE TABLE oracle_rls.priv_direct(value integer);
CREATE TABLE oracle_rls.priv_inherited(value integer);
CREATE TABLE oracle_rls.priv_public(value integer);
INSERT INTO oracle_rls.priv_direct VALUES (1);
INSERT INTO oracle_rls.priv_inherited VALUES (1);
INSERT INTO oracle_rls.priv_public VALUES (1);
GRANT SELECT ON oracle_rls.priv_direct TO oracle_rls_direct;
GRANT SELECT ON oracle_rls.priv_inherited TO oracle_priv;
GRANT SELECT ON oracle_rls.priv_public TO PUBLIC;
CREATE TABLE oracle_rls.secure(id integer, owner_name text);
INSERT INTO oracle_rls.secure VALUES (1, 'oracle_rls_direct'), (2, 'hidden');
GRANT SELECT ON oracle_rls.secure TO oracle_rls_direct, oracle_rls_inherited, oracle_bypass;
GRANT SELECT ON oracle_rls.secure TO PUBLIC;
ALTER TABLE oracle_rls.secure ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Quoted Policy" ON oracle_rls.secure TO oracle_policy_role USING (owner_name = current_user);
CREATE POLICY public_visible ON oracle_rls.secure TO PUBLIC USING (id = 1);
CREATE POLICY transient_policy ON oracle_rls.secure TO oracle_rls_direct USING (id > 0);
CREATE POLICY insert_check ON oracle_rls.secure AS RESTRICTIVE FOR INSERT TO oracle_rls_direct WITH CHECK (id > 0);
`,
  }),
  fixture({
    id: "privilege_inherited_memberships",
    sql: "GRANT oracle_priv TO oracle_rls_inherited;\nGRANT oracle_policy_role TO oracle_rls_direct;\nGRANT oracle_policy_role TO oracle_rls_inherited;\n",
  }),
  fixture({
    id: "privilege_direct_probe",
    principal: "oracle_rls_direct",
    sql: "SELECT count(*) FROM oracle_rls.priv_direct;\n",
    stdout: ["1"],
  }),
  fixture({
    id: "privilege_inherited_probe",
    principal: "oracle_rls_inherited",
    sql: "SELECT count(*) FROM oracle_rls.priv_inherited;\n",
    stdout: ["1"],
  }),
  fixture({
    id: "privilege_public_probe",
    principal: "oracle_rls_public",
    sql: "SELECT count(*) FROM oracle_rls.priv_public;\n",
    stdout: ["1"],
  }),
  fixture({
    id: "privilege_direct_denial",
    principal: "oracle_plain",
    expectation: "rejection",
    sql: "SELECT count(*) FROM oracle_rls.priv_direct;\n",
    sqlstates: ["42501"],
  }),
  fixture({
    id: "rls_direct_policy_probe",
    principal: "oracle_rls_direct",
    sql: "SELECT count(*) FROM oracle_rls.secure;\n",
    stdout: ["2"],
  }),
  fixture({
    id: "rls_alter_policy",
    principal: "oracle_rls_owner",
    sql: "ALTER POLICY transient_policy ON oracle_rls.secure TO oracle_rls_inherited USING (id = 2);\n",
  }),
  fixture({
    id: "rls_drop_transient_policy",
    principal: "oracle_rls_owner",
    sql: "DROP POLICY transient_policy ON oracle_rls.secure;\n",
  }),
  fixture({
    id: "rls_owner_bypass_before_force",
    principal: "oracle_rls_owner",
    sql: "SELECT count(*) FROM oracle_rls.secure;\n",
    stdout: ["2"],
  }),
  fixture({
    id: "rls_force",
    principal: "oracle_rls_owner",
    sql: "ALTER TABLE oracle_rls.secure FORCE ROW LEVEL SECURITY;\n",
  }),
  fixture({
    id: "rls_owner_subject_to_force",
    principal: "oracle_rls_owner",
    sql: "SELECT count(*) FROM oracle_rls.secure;\n",
    stdout: ["1"],
  }),
  fixture({
    id: "rls_superuser_bypass_force",
    sql: "SELECT count(*) FROM oracle_rls.secure;\n",
    stdout: ["2"],
  }),
  fixture({
    id: "rls_bypassrls_bypass_force",
    principal: "oracle_bypass",
    sql: "SELECT count(*) FROM oracle_rls.secure;\n",
    stdout: ["2"],
  }),
  fixture({
    id: "rls_no_force",
    principal: "oracle_rls_owner",
    sql: "ALTER TABLE oracle_rls.secure NO FORCE ROW LEVEL SECURITY;\n",
  }),
  fixture({
    id: "rls_disable",
    principal: "oracle_rls_owner",
    sql: "ALTER TABLE oracle_rls.secure DISABLE ROW LEVEL SECURITY;\n",
  }),
  fixture({
    id: "rls_disabled_probe",
    principal: "oracle_rls_direct",
    sql: "SELECT count(*) FROM oracle_rls.secure;\n",
    stdout: ["2"],
  }),
  fixture({
    id: "rls_final_enable_force",
    principal: "oracle_rls_owner",
    sql: "ALTER TABLE oracle_rls.secure ENABLE ROW LEVEL SECURITY;\nALTER TABLE oracle_rls.secure FORCE ROW LEVEL SECURITY;\n",
  }),
  fixture({
    dynamicSecurity: true,
    id: "dynamic_explicit_policy",
    principal: "oracle_dynamic_owner",
    sql: `CREATE TABLE oracle_dynamic.secure(id integer);
ALTER TABLE oracle_dynamic.secure ENABLE ROW LEVEL SECURITY;
DO $oracle$
BEGIN
  EXECUTE 'CREATE POLICY "Dynamic Policy" ON oracle_dynamic.secure TO oracle_plain USING (id = 1)';
END;
$oracle$;
`,
  }),
  fixture({
    id: "dynamic_explicit_policy_catalog_probe",
    sql: "SELECT count(*) FROM pg_catalog.pg_policy p JOIN pg_catalog.pg_class c ON c.oid = p.polrelid JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'oracle_dynamic' AND c.relname = 'secure' AND p.polname = 'Dynamic Policy';\n",
    stdout: ["1"],
  }),
  fixture({
    id: "final_absence_and_state_probe",
    sql: `SELECT concat_ws('|',
  (to_regnamespace('oracle_dropped') IS NULL)::text,
  (to_regclass('oracle_dropped.gone_table') IS NULL)::text,
  (to_regclass('oracle_dropped.gone_sequence') IS NULL)::text,
  (to_regtype('oracle_dropped.gone_type') IS NULL)::text,
  (to_regprocedure('oracle_dropped.gone_routine()') IS NULL)::text,
  (SELECT (count(*) = 0)::text FROM pg_catalog.pg_policy p JOIN pg_catalog.pg_class c ON c.oid = p.polrelid JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'oracle_dropped'),
  (SELECT c.relrowsecurity::text FROM pg_catalog.pg_class c WHERE c.oid = 'oracle_rls.secure'::regclass),
  (SELECT c.relforcerowsecurity::text FROM pg_catalog.pg_class c WHERE c.oid = 'oracle_rls.secure'::regclass),
  (SELECT (count(*) = 0)::text FROM pg_catalog.pg_policy p WHERE p.polrelid = 'oracle_rls.secure'::regclass AND p.polname = 'transient_policy')
);
`,
    stdout: ["true|true|true|true|true|true|true|true|true"],
  }),
]);

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function validateMembershipInput(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("membership input must be an object.");
  }
  const keys = Object.keys(value).sort();
  if (
    keys.length !== MEMBERSHIP_INPUT_KEYS.length ||
    keys.some((key, index) => key !== MEMBERSHIP_INPUT_KEYS[index])
  ) {
    throw new Error("membership input contains missing or unknown fields.");
  }
  for (const key of ["grantedRole", "memberRole", "grantorRole"]) {
    if (typeof value[key] !== "string" || !ROLE_PATTERN.test(value[key])) {
      throw new Error(`membership input ${key} is invalid.`);
    }
  }
  if (typeof value.adminOption !== "boolean") {
    throw new Error("membership input adminOption is invalid.");
  }
  return Object.freeze({ ...value });
}

export function oracleFixtureSteps() {
  return ORACLE_FIXTURES.map((step, index) => {
    if (step.dynamicSecurity) assertSupportedDynamicFixture(step.id);
    const expectedStdout = step.stdout === null ? "" : `${step.stdout.join("\n")}\n`;
    return Object.freeze({
      ...step,
      expectedStdoutSha256: sha256(Buffer.from(expectedStdout, "utf8")),
      inputSha256: sha256(Buffer.from(step.sql, "utf8")),
      ordinal: index + 1,
    });
  });
}

export function oracleFixtureSetSha256() {
  return sha256(canonicalJson(oracleFixtureSteps().map((step) => ({
    expectation: step.expectation,
    dynamicSecurity: step.dynamicSecurity,
    expectedStdoutSha256: step.expectedStdoutSha256,
    id: step.id,
    inputSha256: step.inputSha256,
    ordinal: step.ordinal,
    principal: step.principal,
    sqlstates: step.sqlstates,
  }))));
}

export function oracleManifestContract() {
  return {
    schemaVersion: "dabangil.wcv_c3_pre_p.postgresql_security_state_oracle_manifest.v1",
    status: "support_tooling_only",
    authorityBoundary: {
      canonicalStage: null,
      consumesStageSelector: false,
      installsStage: false,
      soleNextC3rStage: "C3R-P",
      c3rP: "authorized_unstarted_after_validated_c3r_a1_merge_receipt",
      c3rT: "blocked_pending_validated_c3r_p_merge_receipt",
      c3rL: "blocked_pending_validated_c3r_p_and_c3r_t_merge_receipts",
      c3rRuntimeAutomaticStartAllowed: false,
      c3rSuccessorRuntimeStarted: false,
      wcvC3Complete: false,
    },
    deliveryControl: {
      repository: "chachathecat/inverge",
      baseRef: "main",
      baseSha: "54afffcc539981ded65591f1f027171343bfce40",
      baseTree: "3c48da6fe991d8c02e3991e0a571b3b12139932c",
      headRef: "codex/wcv-c3-pre-p-postgresql-security-state-oracle",
      headRepository: "chachathecat/inverge",
      pullRequestTitle: "[WCV-C3 PRE-P] Add PostgreSQL 15.8 security-state oracle tooling",
      draftRequired: true,
      referenceOnlyIssueLinks: {
        mode: "REFERENCE_ONLY",
        requiredReferenceLinesExactly: [
          "Refs #706",
          "Refs #707",
          "Refs #708",
          "Refs #714",
          "Refs #781",
        ],
        requiredDispositionLine:
          "All referenced issues remain open; this support-tooling Draft closes none.",
        closingKeywordsAllowed: false,
        fullGithubClosingKeywordFamilyBlocked: true,
        exceptionAppliesOnlyWhenExactLinesPresent: true,
      },
    },
    runtime: {
      image: ORACLE_IMAGE,
      imageDigest: ORACLE_IMAGE_DIGEST,
      platform: ORACLE_PLATFORM,
      networkMode: "none",
      hostAuthMethod: "trust",
      serverVersionNum: ORACLE_SERVER_VERSION_NUM,
      containerNameTemplate: "inverge-runtime-{githubRunId}-{githubRunAttempt}",
      databaseStorage: "disposable_tmpfs",
      tmpfsDestination: ORACLE_TMPFS_DESTINATION,
      tmpfsMountCount: 1,
      tmpfsOptions: ORACLE_TMPFS_OPTIONS,
      bindOrVolumeMountCount: 0,
      repositoryCredentialsMounted: false,
      cloudCredentialsMounted: false,
      learnerOrPrivateDataMounted: false,
      remoteDatabaseMutationAllowed: false,
      supabaseContactAllowed: false,
      productionMutationAllowed: false,
    },
    membershipInputContract: {
      exactFields: ["grantedRole", "memberRole", "grantorRole", "adminOption"],
      unknownFieldsRejectedBeforeExecution: true,
      inheritanceSource: "member_role_attribute",
      setRoleReachabilitySource: "actual_postgresql_session",
    },
    sourceIdentity: {
      securityAuthority: [
        "fixture_id_or_repository_path",
        "exact_utf8_byte_sha256",
        "ordered_execution_step",
        "pre_catalog_snapshot_digest",
        "post_catalog_snapshot_digest",
      ],
      parserLocationIsAuthority: false,
      postgresqlExecutionAndCatalogStateAreAuthority: true,
    },
    dynamicSql: {
      mode: "closed_fixture_only",
      supportedFixtureIds: ["dynamic_explicit_policy"],
      arbitraryOpaqueBodies: "unsupported",
    },
    snapshotCollections: [...ORACLE_SNAPSHOT_COLLECTIONS],
    artifactDigestKeys: [...ORACLE_ARTIFACT_DIGEST_KEYS],
    fixtureSetSha256: oracleFixtureSetSha256(),
  };
}

export function validateOracleManifestBytes(bytes) {
  let manifest;
  try {
    manifest = JSON.parse(Buffer.from(bytes).toString("utf8"));
  } catch {
    throw new Error("PostgreSQL oracle manifest is invalid JSON.");
  }
  if (canonicalJson(manifest) !== canonicalJson(oracleManifestContract())) {
    throw new Error("PostgreSQL oracle manifest does not match the closed runtime contract.");
  }
  return manifest;
}

export function oracleBootstrapSql() {
  return BOOTSTRAP_SQL;
}

export function isOracleRiskCandidate(riskResult) {
  return Array.isArray(riskResult?.changedFiles) &&
    riskResult.changedFiles.some((file) => ORACLE_RUNTIME_REQUIRED_PATHS.includes(file));
}

export function assertClosedOracleChangeSet(riskResult) {
  if (riskResult?.changedFilesTruncated !== false || !Array.isArray(riskResult?.changedFiles)) {
    throw new Error("oracle risk classification cannot bind the complete changed-file set.");
  }
  const changed = [...new Set(riskResult.changedFiles)].sort();
  if (
    changed.length !== riskResult.changedFiles.length ||
    changed.length !== ORACLE_ALLOWED_CHANGED_PATHS.length ||
    changed.some((file, index) => file !== ORACLE_ALLOWED_CHANGED_PATHS[index])
  ) {
    throw new Error("no closed PostgreSQL security-state oracle adapter supports this change set.");
  }
  const reasons = Array.isArray(riskResult.runtimeReasons)
    ? riskResult.runtimeReasons.map((reason) => {
      assertExactKeys(reason, ["path", "pattern"], "oracle runtime reason");
      if (reason.path !== reason.pattern) {
        throw new Error("oracle runtime reason pattern does not match its exact path.");
      }
      return reason.path;
    }).sort()
    : [];
  if (
    riskResult.runtimeEvidenceRequired !== true ||
    reasons.length !== ORACLE_RUNTIME_REQUIRED_PATHS.length ||
    reasons.some((file, index) => file !== ORACLE_RUNTIME_REQUIRED_PATHS[index])
  ) {
    throw new Error("oracle runtime-required paths do not match the closed contract.");
  }
  return true;
}

export function assertSupportedDynamicFixture(fixtureId) {
  if (fixtureId !== "dynamic_explicit_policy") {
    throw new Error("opaque dynamic security SQL is unsupported outside the closed oracle fixture.");
  }
  return true;
}

export const ORACLE_SNAPSHOT_SQL = `SET search_path = pg_catalog;
WITH
roles_value AS (
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'rolname', r.rolname,
    'rolsuper', r.rolsuper,
    'rolinherit', r.rolinherit,
    'rolcreaterole', r.rolcreaterole,
    'rolbypassrls', r.rolbypassrls,
    'rolcanlogin', r.rolcanlogin
  ) ORDER BY r.rolname COLLATE "C"), '[]'::jsonb) AS value
  FROM pg_roles r
),
memberships_value AS (
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'grantedRole', granted_role.rolname,
    'memberRole', member_role.rolname,
    'grantorRole', grantor_role.rolname,
    'adminOption', m.admin_option
  ) ORDER BY granted_role.rolname COLLATE "C", member_role.rolname COLLATE "C", grantor_role.rolname COLLATE "C"), '[]'::jsonb) AS value
  FROM pg_auth_members m
  JOIN pg_roles granted_role ON granted_role.oid = m.roleid
  JOIN pg_roles member_role ON member_role.oid = m.member
  JOIN pg_roles grantor_role ON grantor_role.oid = m.grantor
),
default_acls_value AS (
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'creatorRole', pg_get_userbyid(d.defaclrole),
    'scope', CASE WHEN d.defaclnamespace = 0 THEN 'global' ELSE 'schema' END,
    'schema', CASE WHEN d.defaclnamespace = 0 THEN NULL ELSE n.nspname END,
    'objectClass', CASE d.defaclobjtype
      WHEN 'r' THEN 'relation'
      WHEN 'S' THEN 'sequence'
      WHEN 'f' THEN 'routine'
      WHEN 'T' THEN 'type'
      WHEN 'n' THEN 'schema'
      ELSE d.defaclobjtype::text
    END,
    'acl', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'grantor', pg_get_userbyid(a.grantor),
        'grantee', CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
        'privilege', a.privilege_type,
        'grantable', a.is_grantable
      ) ORDER BY pg_get_userbyid(a.grantor) COLLATE "C",
                 (CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END) COLLATE "C",
                 a.privilege_type COLLATE "C", a.is_grantable)
      FROM aclexplode(d.defaclacl) a
    ), '[]'::jsonb)
  ) ORDER BY pg_get_userbyid(d.defaclrole) COLLATE "C",
             (CASE WHEN d.defaclnamespace = 0 THEN 'global' ELSE 'schema' END) COLLATE "C",
             COALESCE(n.nspname, '') COLLATE "C", d.defaclobjtype), '[]'::jsonb) AS value
  FROM pg_default_acl d
  LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
),
namespaces_value AS (
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'schema', n.nspname,
    'owner', pg_get_userbyid(n.nspowner),
    'acl', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'grantor', pg_get_userbyid(a.grantor),
        'grantee', CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
        'privilege', a.privilege_type,
        'grantable', a.is_grantable
      ) ORDER BY pg_get_userbyid(a.grantor) COLLATE "C",
                 (CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END) COLLATE "C",
                 a.privilege_type COLLATE "C", a.is_grantable)
      FROM aclexplode(COALESCE(n.nspacl, acldefault('n', n.nspowner))) a
    ), '[]'::jsonb)
  ) ORDER BY n.nspname COLLATE "C"), '[]'::jsonb) AS value
  FROM pg_namespace n
  WHERE n.nspname <> 'information_schema'
    AND n.nspname !~ '^pg_'
),
relations_value AS (
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'schema', n.nspname,
    'object', c.relname,
    'identity', format('%I.%I', n.nspname, c.relname),
    'relkind', c.relkind::text,
    'owner', pg_get_userbyid(c.relowner),
    'rowSecurity', c.relrowsecurity,
    'forceRowSecurity', c.relforcerowsecurity,
    'acl', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'grantor', pg_get_userbyid(a.grantor),
        'grantee', CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
        'privilege', a.privilege_type,
        'grantable', a.is_grantable
      ) ORDER BY pg_get_userbyid(a.grantor) COLLATE "C",
                 (CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END) COLLATE "C",
                 a.privilege_type COLLATE "C", a.is_grantable)
      FROM aclexplode(COALESCE(c.relacl, acldefault(CASE WHEN c.relkind = 'S' THEN 's'::"char" ELSE 'r'::"char" END, c.relowner))) a
    ), '[]'::jsonb)
  ) ORDER BY n.nspname COLLATE "C", c.relname COLLATE "C", c.relkind), '[]'::jsonb) AS value
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname <> 'information_schema'
    AND n.nspname !~ '^pg_'
    AND c.relkind IN ('r', 'p', 'v', 'm', 'f', 'S', 'c')
),
routines_value AS (
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'schema', n.nspname,
    'routine', p.proname,
    'prokind', p.prokind::text,
    'identityArguments', pg_get_function_identity_arguments(p.oid),
    'owner', pg_get_userbyid(p.proowner),
    'language', l.lanname,
    'acl', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'grantor', pg_get_userbyid(a.grantor),
        'grantee', CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
        'privilege', a.privilege_type,
        'grantable', a.is_grantable
      ) ORDER BY pg_get_userbyid(a.grantor) COLLATE "C",
                 (CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END) COLLATE "C",
                 a.privilege_type COLLATE "C", a.is_grantable)
      FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
    ), '[]'::jsonb)
  ) ORDER BY n.nspname COLLATE "C", p.proname COLLATE "C", pg_get_function_identity_arguments(p.oid) COLLATE "C", p.prokind), '[]'::jsonb) AS value
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  JOIN pg_language l ON l.oid = p.prolang
  WHERE n.nspname <> 'information_schema'
    AND n.nspname !~ '^pg_'
),
types_value AS (
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'schema', n.nspname,
    'type', t.typname,
    'identity', format('%I.%I', n.nspname, t.typname),
    'kind', t.typtype::text,
    'owner', pg_get_userbyid(t.typowner),
    'acl', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'grantor', pg_get_userbyid(a.grantor),
        'grantee', CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
        'privilege', a.privilege_type,
        'grantable', a.is_grantable
      ) ORDER BY pg_get_userbyid(a.grantor) COLLATE "C",
                 (CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END) COLLATE "C",
                 a.privilege_type COLLATE "C", a.is_grantable)
      FROM aclexplode(COALESCE(t.typacl, acldefault('T', t.typowner))) a
    ), '[]'::jsonb)
  ) ORDER BY n.nspname COLLATE "C", t.typname COLLATE "C", t.typtype), '[]'::jsonb) AS value
  FROM pg_type t
  JOIN pg_namespace n ON n.oid = t.typnamespace
  LEFT JOIN pg_class composite_relation ON composite_relation.oid = t.typrelid
  WHERE n.nspname <> 'information_schema'
    AND n.nspname !~ '^pg_'
    AND t.typtype IN ('e', 'c', 'd', 'r', 'm')
    AND t.typelem = 0
    AND (t.typrelid = 0 OR composite_relation.relkind = 'c')
),
policies_value AS (
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'schema', n.nspname,
    'table', c.relname,
    'policy', p.polname,
    'permissive', p.polpermissive,
    'command', p.polcmd::text,
    'roles', COALESCE((
      SELECT jsonb_agg(CASE WHEN role_id = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(role_id) END
                       ORDER BY (CASE WHEN role_id = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(role_id) END) COLLATE "C")
      FROM unnest(p.polroles) AS policy_role(role_id)
    ), '[]'::jsonb),
    'using', pg_get_expr(p.polqual, p.polrelid, false),
    'withCheck', pg_get_expr(p.polwithcheck, p.polrelid, false)
  ) ORDER BY n.nspname COLLATE "C", c.relname COLLATE "C", p.polname COLLATE "C"), '[]'::jsonb) AS value
  FROM pg_policy p
  JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname <> 'information_schema'
    AND n.nspname !~ '^pg_'
)
SELECT jsonb_build_object(
  'roles', roles_value.value,
  'memberships', memberships_value.value,
  'defaultAcls', default_acls_value.value,
  'namespaces', namespaces_value.value,
  'relations', relations_value.value,
  'routines', routines_value.value,
  'types', types_value.value,
  'policies', policies_value.value
)::text
FROM roles_value, memberships_value, default_acls_value, namespaces_value,
     relations_value, routines_value, types_value, policies_value;
`;

function assertPlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

function assertExactKeys(value, keys, label) {
  assertPlainObject(value, label);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    throw new Error(`${label} contains missing or unknown keys.`);
  }
}

function requireString(value, label, pattern = null) {
  if (typeof value !== "string" || value.length === 0 || (pattern && !pattern.test(value))) {
    throw new Error(`${label} is invalid.`);
  }
  return value;
}

function requireInteger(value, label, minimum = 0) {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new Error(`${label} is invalid.`);
  }
  return value;
}

function normalizeOutput(stdout) {
  const lines = stdout.replaceAll("\r\n", "\n").split("\n");
  if (lines.at(-1) === "") lines.pop();
  return lines;
}

function collectionDigests(snapshot) {
  assertExactKeys(snapshot, ORACLE_SNAPSHOT_COLLECTIONS, "canonical catalog snapshot");
  return Object.fromEntries(ORACLE_SNAPSHOT_COLLECTIONS.map((collection) => {
    if (!Array.isArray(snapshot[collection])) {
      throw new Error(`canonical catalog snapshot ${collection} must be an array.`);
    }
    return [collection, sha256(Buffer.from(canonicalJson(snapshot[collection]), "utf8"))];
  }));
}

function snapshotReceipt(snapshot) {
  const digests = collectionDigests(snapshot);
  return {
    collectionDigests: digests,
    sha256: sha256(Buffer.from(canonicalJson(digests), "utf8")),
  };
}

const SEMANTIC_IDENTITY_FIELDS = Object.freeze({
  roles: ["rolname"],
  memberships: ["grantedRole", "memberRole", "grantorRole"],
  defaultAcls: ["creatorRole", "scope", "schema", "objectClass"],
  namespaces: ["schema"],
  relations: ["schema", "object", "relkind"],
  routines: ["schema", "routine", "prokind", "identityArguments"],
  types: ["schema", "type"],
  policies: ["schema", "table", "policy"],
});

const DELTA_COUNT_KEYS = Object.freeze(["added", "changed", "removed"]);
const EMPTY_SEMANTIC_DELTA_SHA256 = sha256(Buffer.from(canonicalJson({
  added: [],
  changed: [],
  removed: [],
}), "utf8"));

function semanticIdentity(collection, row) {
  assertPlainObject(row, `canonical ${collection} row`);
  const fields = SEMANTIC_IDENTITY_FIELDS[collection];
  const identity = Object.fromEntries(fields.map((field) => {
    if (!Object.hasOwn(row, field)) {
      throw new Error(`canonical ${collection} row is missing identity field ${field}.`);
    }
    return [field, row[field]];
  }));
  return canonicalJson(identity);
}

function rowsBySemanticIdentity(collection, rows) {
  if (!Array.isArray(rows)) throw new Error(`canonical ${collection} snapshot must be an array.`);
  const indexed = new Map();
  for (const row of rows) {
    const identity = semanticIdentity(collection, row);
    if (indexed.has(identity)) {
      throw new Error(`canonical ${collection} snapshot contains a duplicate textual identity.`);
    }
    indexed.set(identity, canonicalJson(row));
  }
  return indexed;
}

function collectionSemanticDelta(collection, beforeRows, afterRows) {
  const before = rowsBySemanticIdentity(collection, beforeRows);
  const after = rowsBySemanticIdentity(collection, afterRows);
  const identities = [...new Set([...before.keys(), ...after.keys()])].sort();
  const delta = { added: [], changed: [], removed: [] };
  for (const identity of identities) {
    const beforeRow = before.get(identity);
    const afterRow = after.get(identity);
    if (beforeRow === undefined) {
      delta.added.push({ identity, rowSha256: sha256(Buffer.from(afterRow, "utf8")) });
    } else if (afterRow === undefined) {
      delta.removed.push({ identity, rowSha256: sha256(Buffer.from(beforeRow, "utf8")) });
    } else if (beforeRow !== afterRow) {
      delta.changed.push({
        afterSha256: sha256(Buffer.from(afterRow, "utf8")),
        beforeSha256: sha256(Buffer.from(beforeRow, "utf8")),
        identity,
      });
    }
  }
  return delta;
}

export function semanticDeltaReceipt(beforeSnapshot, afterSnapshot) {
  assertExactKeys(beforeSnapshot, ORACLE_SNAPSHOT_COLLECTIONS, "canonical pre snapshot");
  assertExactKeys(afterSnapshot, ORACLE_SNAPSHOT_COLLECTIONS, "canonical post snapshot");
  const collectionCounts = {};
  const collectionDigests = {};
  for (const collection of ORACLE_SNAPSHOT_COLLECTIONS) {
    const delta = collectionSemanticDelta(
      collection,
      beforeSnapshot[collection],
      afterSnapshot[collection],
    );
    collectionCounts[collection] = Object.fromEntries(
      DELTA_COUNT_KEYS.map((kind) => [kind, delta[kind].length]),
    );
    collectionDigests[collection] = sha256(
      Buffer.from(canonicalJson(delta), "utf8"),
    );
  }
  return {
    collectionCounts,
    collectionDigests,
    sha256: sha256(Buffer.from(canonicalJson({ collectionCounts, collectionDigests }), "utf8")),
  };
}

function deltaRootSha256(collectionCounts, collectionDigests) {
  return sha256(Buffer.from(canonicalJson({ collectionCounts, collectionDigests }), "utf8"));
}

function docker(args, options = {}) {
  return spawnSync("docker", args, {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    stdio: options.input === undefined
      ? ["ignore", "pipe", "pipe"]
      : ["pipe", "pipe", "pipe"],
    ...options,
  });
}

export function cleanupOracleContainer(containerName) {
  docker(["rm", "--force", containerName]);
  const remaining = docker([
    "ps",
    "--all",
    "--quiet",
    "--filter",
    `name=^/${containerName}$`,
  ]);
  return remaining.status === 0 && remaining.stdout.trim() === "";
}

function mismatch() {
  throw new Error(ORACLE_MISMATCH_CLASSIFICATION);
}

export function assertOracleImageInspection({ architecture, os, repoDigests }) {
  if (
    !Array.isArray(repoDigests) ||
    !repoDigests.some((identity) => identity.endsWith(`@sha256:${ORACLE_IMAGE_DIGEST}`)) ||
    os !== "linux" ||
    architecture !== "amd64"
  ) {
    mismatch();
  }
  return true;
}

export function assertOracleServerVersion(lines) {
  if (
    !Array.isArray(lines) ||
    lines.length !== 1 ||
    lines[0] !== String(ORACLE_SERVER_VERSION_NUM)
  ) {
    mismatch();
  }
  return true;
}

function pullAndVerifyImage() {
  const pulled = docker([
    "pull",
    "--platform",
    ORACLE_PLATFORM,
    ORACLE_IMAGE,
  ]);
  if (pulled.status !== 0) mismatch();
  const inspected = docker([
    "image",
    "inspect",
    "--format",
    "{{json .RepoDigests}}\t{{.Os}}\t{{.Architecture}}",
    ORACLE_IMAGE,
  ]);
  if (inspected.status !== 0) mismatch();
  const [repoDigestsJson, os, architecture] = inspected.stdout.trim().split("\t");
  let repoDigests;
  try {
    repoDigests = JSON.parse(repoDigestsJson);
  } catch {
    mismatch();
  }
  assertOracleImageInspection({ architecture, os, repoDigests });
}

export function assertOracleContainerIsolation(detail) {
  const environments = Array.isArray(detail?.Config?.Env) ? detail.Config.Env : [];
  const environmentNames = environments.map((entry) => entry.split("=", 1)[0]);
  const credentialPattern = /(?:TOKEN|PASSWORD|SECRET|CREDENTIAL|SUPABASE|GITHUB|VERCEL)/iu;
  const portBindings = detail?.HostConfig?.PortBindings;
  const publishedPortCount = portBindings && typeof portBindings === "object"
    ? Object.values(portBindings).filter((value) => Array.isArray(value) && value.length > 0).length
    : 0;
  if (detail?.Config?.Image !== ORACLE_IMAGE) mismatch();
  const mounts = Array.isArray(detail?.Mounts) ? detail.Mounts : [];
  const bindOrVolumeMounts = mounts.filter(
    (mount) => mount?.Type === "bind" || mount?.Type === "volume",
  );
  const unexpectedMounts = mounts.filter(
    (mount) => !["bind", "volume", "tmpfs"].includes(mount?.Type),
  );
  const tmpfsMountRecords = mounts.filter((mount) => mount?.Type === "tmpfs");
  const tmpfs = detail?.HostConfig?.Tmpfs;
  const tmpfsEntries = tmpfs && typeof tmpfs === "object"
    ? Object.entries(tmpfs)
    : [];
  const tmpfsOptions = tmpfsEntries[0]?.[1];
  const expectedTmpfsOptions = [...ORACLE_TMPFS_OPTIONS.split(",")].sort();
  const observedTmpfsOptions = typeof tmpfsOptions === "string"
    ? tmpfsOptions.split(",").sort()
    : [];
  if (
    detail?.HostConfig?.NetworkMode !== "none" ||
    tmpfsEntries.length !== 1 ||
    tmpfsEntries[0]?.[0] !== ORACLE_TMPFS_DESTINATION ||
    canonicalJson(observedTmpfsOptions) !== canonicalJson(expectedTmpfsOptions) ||
    tmpfsMountRecords.length > 1 ||
    (tmpfsMountRecords.length === 1 && (
      tmpfsMountRecords[0]?.Destination !== ORACLE_TMPFS_DESTINATION ||
      tmpfsMountRecords[0]?.RW !== true
    )) ||
    bindOrVolumeMounts.length !== 0 ||
    unexpectedMounts.length !== 0 ||
    publishedPortCount !== 0 ||
    !environments.includes("POSTGRES_HOST_AUTH_METHOD=trust") ||
    environmentNames.some((name) => credentialPattern.test(name))
  ) {
    throw new Error("PostgreSQL oracle container isolation is invalid.");
  }
  return {
    bindOrVolumeMountCount: bindOrVolumeMounts.length,
    mountCount: 1,
    networkMode: detail.HostConfig.NetworkMode,
    passedEnvironmentNames: ["POSTGRES_HOST_AUTH_METHOD"],
    publishedPortCount,
    tmpfsDestination: ORACLE_TMPFS_DESTINATION,
    tmpfsMountCount: tmpfsEntries.length,
    tmpfsOptions: ORACLE_TMPFS_OPTIONS,
  };
}

function startOracleContainer(containerName) {
  if (!cleanupOracleContainer(containerName)) {
    throw new Error("PostgreSQL oracle preflight cleanup is incomplete.");
  }
  pullAndVerifyImage();
  const started = docker([
    "run",
    "--detach",
    "--rm",
    "--name",
    containerName,
    "--platform",
    ORACLE_PLATFORM,
    "--network",
    "none",
    "--tmpfs",
    `${ORACLE_TMPFS_DESTINATION}:${ORACLE_TMPFS_OPTIONS}`,
    "--env",
    "POSTGRES_HOST_AUTH_METHOD=trust",
    ORACLE_IMAGE,
  ]);
  if (started.status !== 0) mismatch();

  for (let attempt = 0; attempt < 90; attempt += 1) {
    const ready = docker([
      "exec",
      containerName,
      "pg_isready",
      "--host",
      "127.0.0.1",
      "--username",
      "postgres",
      "--dbname",
      "postgres",
    ]);
    if (ready.status === 0) break;
    if (attempt === 89) throw new Error("PostgreSQL oracle did not become ready.");
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
  }

  const inspected = docker(["inspect", containerName]);
  if (inspected.status !== 0) throw new Error("PostgreSQL oracle isolation could not be inspected.");
  let detail;
  try {
    [detail] = JSON.parse(inspected.stdout);
  } catch {
    throw new Error("PostgreSQL oracle isolation inspection is invalid.");
  }
  return assertOracleContainerIsolation(detail);
}

function oraclePsql(containerName, principal, sql) {
  return docker([
    "exec",
    "--interactive",
    containerName,
    "psql",
    "--host",
    "127.0.0.1",
    "--no-psqlrc",
    "--quiet",
    "--tuples-only",
    "--no-align",
    "--set",
    "ON_ERROR_STOP=1",
    "--set",
    "VERBOSITY=verbose",
    "--username",
    principal,
    "--dbname",
    "postgres",
  ], { input: sql });
}

function requirePsqlSuccess(result, label) {
  if (result.status !== 0) throw new Error(`${label} failed.`);
  return normalizeOutput(result.stdout);
}

function takeSnapshot(containerName) {
  const lines = requirePsqlSuccess(
    oraclePsql(containerName, "postgres", ORACLE_SNAPSHOT_SQL),
    "canonical PostgreSQL catalog snapshot",
  );
  if (lines.length !== 1) throw new Error("canonical PostgreSQL catalog snapshot returned an invalid shape.");
  let snapshot;
  try {
    snapshot = JSON.parse(lines[0]);
  } catch {
    throw new Error("canonical PostgreSQL catalog snapshot is invalid JSON.");
  }
  return { body: snapshot, receipt: snapshotReceipt(snapshot) };
}

function verifyMembershipPreExecutionContract() {
  validateMembershipInput({
    adminOption: false,
    grantedRole: "oracle_top",
    grantorRole: "postgres",
    memberRole: "oracle_direct",
  });
  const rejections = [];
  for (const field of ["inheritOption", "setOption"]) {
    let rejected = false;
    try {
      validateMembershipInput({
        adminOption: false,
        grantedRole: "oracle_top",
        grantorRole: "postgres",
        memberRole: "oracle_direct",
        [field]: true,
      });
    } catch {
      rejected = true;
    }
    if (!rejected) throw new Error(`membership input ${field} was not rejected before execution.`);
    rejections.push({
      beforeDatabase: true,
      databaseExecutionCount: 0,
      field,
      status: "rejected_unknown_field",
    });
  }
  return rejections;
}

function executeOracleFixtures(containerName) {
  const receipts = [];
  let initialSnapshot = null;
  let finalSnapshot = null;
  for (const step of oracleFixtureSteps()) {
    const before = takeSnapshot(containerName);
    if (initialSnapshot === null) initialSnapshot = before;
    const result = oraclePsql(containerName, step.principal, step.sql);
    const after = takeSnapshot(containerName);
    finalSnapshot = after;
    const delta = semanticDeltaReceipt(before.body, after.body);
    let actual;
    let sqlstate = null;
    let stdoutSha256 = null;
    if (step.expectation === "rejection") {
      const match = /ERROR:\s+([0-9A-Z]{5}):/u.exec(result.stderr);
      sqlstate = match?.[1] ?? null;
      if (
        result.status !== 3 ||
        !sqlstate ||
        !step.sqlstates.includes(sqlstate) ||
        before.receipt.sha256 !== after.receipt.sha256 ||
        ORACLE_SNAPSHOT_COLLECTIONS.some(
          (collection) => before.receipt.collectionDigests[collection] !== after.receipt.collectionDigests[collection],
        )
      ) {
        throw new Error(`oracle rejection fixture failed atomicity: ${step.id}`);
      }
      actual = "rejection";
    } else {
      const output = requirePsqlSuccess(result, `oracle fixture ${step.id}`);
      const expectedOutput = step.stdout ?? [];
      if (canonicalJson(output) !== canonicalJson(expectedOutput)) {
        throw new Error(`oracle fixture ${step.id} returned an unexpected PostgreSQL result.`);
      }
      const normalizedBytes = Buffer.from(
        output.length === 0 ? "" : `${output.join("\n")}\n`,
        "utf8",
      );
      stdoutSha256 = sha256(normalizedBytes);
      if (stdoutSha256 !== step.expectedStdoutSha256) {
        throw new Error(`oracle fixture ${step.id} output digest does not match its closed expectation.`);
      }
      actual = "success";
    }
    receipts.push({
      actual,
      deltaCollectionCounts: delta.collectionCounts,
      deltaCollectionDigests: delta.collectionDigests,
      deltaSha256: delta.sha256,
      expected: step.expectation,
      id: step.id,
      inputSha256: step.inputSha256,
      ordinal: step.ordinal,
      postCollectionDigests: after.receipt.collectionDigests,
      postSnapshotSha256: after.receipt.sha256,
      preCollectionDigests: before.receipt.collectionDigests,
      preSnapshotSha256: before.receipt.sha256,
      principal: step.principal,
      psqlStatus: result.status,
      sqlstate,
      stdoutSha256,
    });
  }
  return { finalSnapshot, initialSnapshot, receipts };
}

function aggregateSemanticDeltaSha256(receipts) {
  return sha256(Buffer.from(canonicalJson(receipts.map((receipt) => ({
    deltaCollectionCounts: receipt.deltaCollectionCounts,
    deltaCollectionDigests: receipt.deltaCollectionDigests,
    deltaSha256: receipt.deltaSha256,
    id: receipt.id,
    ordinal: receipt.ordinal,
    postCollectionDigests: receipt.postCollectionDigests,
    preCollectionDigests: receipt.preCollectionDigests,
  }))), "utf8"));
}

function headFile(repoRoot, headSha, filePath) {
  try {
    return execFileSync("git", ["show", `${headSha}:${filePath}`], {
      cwd: repoRoot,
      encoding: null,
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    throw new Error(`required oracle pull-request file is missing: ${filePath}`);
  }
}

function headTree(repoRoot, headSha) {
  try {
    return execFileSync("git", ["rev-parse", `${headSha}^{tree}`], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim().toLowerCase();
  } catch {
    throw new Error("oracle pull-request head tree could not be resolved.");
  }
}

function readManifest(bytes) {
  return validateOracleManifestBytes(bytes);
}

function assertExecutedSourceMatchesHead(repoRoot, headSha, filePath) {
  const exactHeadBytes = headFile(repoRoot, headSha, filePath);
  const executedBytes = fs.readFileSync(path.resolve(repoRoot, filePath));
  if (!exactHeadBytes.equals(executedBytes)) {
    throw new Error(`executed oracle source does not match pull-request head bytes: ${filePath}`);
  }
  return exactHeadBytes;
}

function oracleEvidencePayload(evidence) {
  return {
    assertions: evidence.assertions,
    cleanup: evidence.cleanup,
    dataBoundary: evidence.dataBoundary,
    declarations: evidence.declarations,
    fixtureReceipts: evidence.fixtureReceipts,
    githubRunAttempt: evidence.githubRunAttempt,
    githubRunId: evidence.githubRunId,
    membershipInputRejections: evidence.membershipInputRejections,
    oracle: evidence.oracle,
    producerVersion: evidence.producerVersion,
    pullRequestHeadSha: evidence.pullRequestHeadSha,
    pullRequestHeadTree: evidence.pullRequestHeadTree,
    riskFileSha256: evidence.riskFileSha256,
    schemaVersion: evidence.schemaVersion,
    semanticDeltaSha256: evidence.semanticDeltaSha256,
    snapshots: evidence.snapshots,
    sourceLevelOnly: evidence.sourceLevelOnly,
    status: evidence.status,
  };
}

export function snapshotReceiptSetSha256(receipts, side) {
  if (!Array.isArray(receipts) || !["pre", "post"].includes(side)) {
    throw new Error("oracle snapshot receipt set input is invalid.");
  }
  const field = side === "pre" ? "preSnapshotSha256" : "postSnapshotSha256";
  return sha256(Buffer.from(canonicalJson(receipts.map((receipt) => ({
    id: receipt.id,
    ordinal: receipt.ordinal,
    sha256: receipt[field],
  }))), "utf8"));
}

function expectedArtifactDigests({ evidence, headBytes }) {
  return Object.fromEntries(Object.entries({
    canonicalPostSnapshots: snapshotReceiptSetSha256(evidence.fixtureReceipts, "post"),
    canonicalPreSnapshots: snapshotReceiptSetSha256(evidence.fixtureReceipts, "pre"),
    dockerImage: ORACLE_IMAGE_DIGEST,
    fixtureSet: oracleFixtureSetSha256(),
    focusedOracleTestSource: sha256(headBytes[ORACLE_TEST_PATH]),
    nativeProducerSource: sha256(headBytes[NATIVE_PRODUCER_PATH]),
    nativeRuntimeGateSource: sha256(headBytes[NATIVE_GATE_PATH]),
    oracleEvidence: evidence.evidenceSha256,
    oracleManifest: sha256(headBytes[ORACLE_MANIFEST_PATH]),
    oracleProducerSource: sha256(headBytes[ORACLE_SOURCE_PATH]),
    pullRequestHeadIdentity: sha256(Buffer.from(canonicalJson({
      sha: evidence.pullRequestHeadSha,
      tree: evidence.pullRequestHeadTree,
    }), "utf8")),
    qaValidationSource: sha256(headBytes[ORACLE_QA_PATH]),
    runtimeInvocation: sha256(Buffer.from(canonicalJson({
      attempt: evidence.githubRunAttempt,
      runId: evidence.githubRunId,
    }), "utf8")),
    serverVersionNum: sha256(Buffer.from(String(ORACLE_SERVER_VERSION_NUM), "utf8")),
    zeroNetworkDeclaration: sha256(Buffer.from(canonicalJson({
      bindOrVolumeMountCount: evidence.oracle.bindOrVolumeMountCount,
      mountCount: evidence.oracle.mountCount,
      networkMode: evidence.oracle.networkMode,
      passedEnvironmentNames: evidence.oracle.passedEnvironmentNames,
      publishedPortCount: evidence.oracle.publishedPortCount,
      tmpfsDestination: evidence.oracle.tmpfsDestination,
      tmpfsMountCount: evidence.oracle.tmpfsMountCount,
      tmpfsOptions: evidence.oracle.tmpfsOptions,
    }), "utf8")),
    zeroRemoteMutationDeclaration: sha256(Buffer.from(canonicalJson(evidence.declarations), "utf8")),
  }).sort(([left], [right]) => left.localeCompare(right)));
}

export function oracleEvidenceSha256(evidence) {
  return sha256(Buffer.from(canonicalJson(oracleEvidencePayload(evidence)), "utf8"));
}

export function oracleArtifactDigestMap(evidence, headBytes) {
  return expectedArtifactDigests({ evidence, headBytes });
}

function writeMetadataEvidence(evidencePath, evidence) {
  const resolved = path.resolve(evidencePath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const temporary = `${resolved}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(evidence, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  fs.renameSync(temporary, resolved);
}

function installSignalCleanup(containerName) {
  const handlers = new Map();
  for (const [signal, exitCode] of [["SIGINT", 130], ["SIGTERM", 143]]) {
    const handler = () => {
      cleanupOracleContainer(containerName);
      process.exit(exitCode);
    };
    handlers.set(signal, handler);
    process.once(signal, handler);
  }
  return () => {
    for (const [signal, handler] of handlers) process.removeListener(signal, handler);
  };
}

function readExactHeadSources(repoRoot, headSha) {
  return Object.fromEntries([
    ORACLE_MANIFEST_PATH,
    ORACLE_QA_PATH,
    ORACLE_SOURCE_PATH,
    ORACLE_TEST_PATH,
    NATIVE_PRODUCER_PATH,
    NATIVE_GATE_PATH,
  ].map((filePath) => [filePath, headFile(repoRoot, headSha, filePath)]));
}

export function producePostgresSecurityOracleEvidence({
  context,
  evidencePath,
  repoRoot = process.cwd(),
  riskBytes,
  riskResult,
}) {
  assertClosedOracleChangeSet(riskResult);
  if (!evidencePath) throw new Error("RUNTIME_EVIDENCE_PATH is not set.");
  const membershipInputRejections = verifyMembershipPreExecutionContract();
  const exactHeadBytes = readExactHeadSources(repoRoot, context.headSha);
  assertExecutedSourceMatchesHead(repoRoot, context.headSha, ORACLE_SOURCE_PATH);
  assertExecutedSourceMatchesHead(repoRoot, context.headSha, NATIVE_PRODUCER_PATH);
  readManifest(exactHeadBytes[ORACLE_MANIFEST_PATH]);
  const pullRequestHeadTree = headTree(repoRoot, context.headSha);
  const removeSignalCleanup = installSignalCleanup(context.containerName);
  let cleanupComplete = false;
  let execution;
  let isolation;
  try {
    isolation = startOracleContainer(context.containerName);

    // This is intentionally the first SQL sent after readiness. Bootstrap and
    // every fixture are forbidden until the exact server value is observed.
    const versionLines = requirePsqlSuccess(
      oraclePsql(context.containerName, "postgres", "SHOW server_version_num;\n"),
      "PostgreSQL oracle version query",
    );
    assertOracleServerVersion(versionLines);

    requirePsqlSuccess(
      oraclePsql(context.containerName, "postgres", BOOTSTRAP_SQL),
      "PostgreSQL oracle bootstrap",
    );
    execution = executeOracleFixtures(context.containerName);
  } finally {
    cleanupComplete = cleanupOracleContainer(context.containerName);
    removeSignalCleanup();
  }
  if (!cleanupComplete) throw new Error("PostgreSQL oracle cleanup is incomplete.");
  if (!execution?.initialSnapshot || !execution?.finalSnapshot) {
    throw new Error("PostgreSQL oracle fixture execution is incomplete.");
  }

  const semanticDeltaSha256 = aggregateSemanticDeltaSha256(execution.receipts);
  const declarations = {
    arbitraryDynamicSecuritySql: "unsupported",
    containerCredentialEnvironmentCount: 0,
    learnerPrivateMountCount: 0,
    productionMutationCount: 0,
    remoteDatabaseMutationCount: 0,
    repositoryCredentialMountCount: 0,
    supabaseContactCount: 0,
    zeroNetwork: true,
  };
  const evidence = {
    schemaVersion: ORACLE_SCHEMA_VERSION,
    producerVersion: ORACLE_PRODUCER_VERSION,
    status: "verified",
    sourceLevelOnly: false,
    pullRequestHeadSha: context.headSha,
    pullRequestHeadTree,
    githubRunId: context.runId,
    githubRunAttempt: context.runAttempt,
    riskFileSha256: sha256(riskBytes),
    oracle: {
      bindOrVolumeMountCount: isolation.bindOrVolumeMountCount,
      bootstrapPrincipal: "postgres",
      bootstrapSha256: sha256(Buffer.from(BOOTSTRAP_SQL, "utf8")),
      hostAuthMethod: "trust",
      image: ORACLE_IMAGE,
      imageDigest: ORACLE_IMAGE_DIGEST,
      mountCount: isolation.mountCount,
      networkMode: isolation.networkMode,
      passedEnvironmentNames: isolation.passedEnvironmentNames,
      platform: ORACLE_PLATFORM,
      publishedPortCount: isolation.publishedPortCount,
      serverVersionNum: ORACLE_SERVER_VERSION_NUM,
      tmpfsDestination: isolation.tmpfsDestination,
      tmpfsMountCount: isolation.tmpfsMountCount,
      tmpfsOptions: isolation.tmpfsOptions,
    },
    membershipInputRejections,
    fixtureReceipts: execution.receipts,
    snapshots: {
      finalCollectionDigests: execution.finalSnapshot.receipt.collectionDigests,
      finalSha256: execution.finalSnapshot.receipt.sha256,
      initialCollectionDigests: execution.initialSnapshot.receipt.collectionDigests,
      initialSha256: execution.initialSnapshot.receipt.sha256,
    },
    semanticDeltaSha256,
    assertions: ORACLE_ASSERTION_IDS.map((id) => ({ id, passed: true })),
    cleanup: {
      containerAbsent: true,
      status: "complete",
    },
    declarations,
    dataBoundary: {
      containsCatalogBodies: false,
      containsContainerIdentifiers: false,
      containsErrorText: false,
      containsSecrets: false,
      containsSql: false,
      containsTimestamps: false,
      metadataOnly: true,
      remoteMutationCount: 0,
    },
  };
  evidence.evidenceSha256 = oracleEvidenceSha256(evidence);
  evidence.artifactDigests = oracleArtifactDigestMap(evidence, exactHeadBytes);
  writeMetadataEvidence(evidencePath, evidence);
  console.log(JSON.stringify({
    cleanup: "complete",
    fixtureCount: execution.receipts.length,
    serverVersionNum: ORACLE_SERVER_VERSION_NUM,
    status: "verified",
  }));
  return evidence;
}

const EVIDENCE_KEYS = Object.freeze([
  "artifactDigests",
  "assertions",
  "cleanup",
  "dataBoundary",
  "declarations",
  "evidenceSha256",
  "fixtureReceipts",
  "githubRunAttempt",
  "githubRunId",
  "membershipInputRejections",
  "oracle",
  "producerVersion",
  "pullRequestHeadSha",
  "pullRequestHeadTree",
  "riskFileSha256",
  "schemaVersion",
  "semanticDeltaSha256",
  "snapshots",
  "sourceLevelOnly",
  "status",
]);
const ORACLE_KEYS = Object.freeze([
  "bindOrVolumeMountCount",
  "bootstrapPrincipal",
  "bootstrapSha256",
  "hostAuthMethod",
  "image",
  "imageDigest",
  "mountCount",
  "networkMode",
  "passedEnvironmentNames",
  "platform",
  "publishedPortCount",
  "serverVersionNum",
  "tmpfsDestination",
  "tmpfsMountCount",
  "tmpfsOptions",
]);
const MEMBERSHIP_REJECTION_KEYS = Object.freeze([
  "beforeDatabase",
  "databaseExecutionCount",
  "field",
  "status",
]);
const FIXTURE_RECEIPT_KEYS = Object.freeze([
  "actual",
  "deltaCollectionCounts",
  "deltaCollectionDigests",
  "deltaSha256",
  "expected",
  "id",
  "inputSha256",
  "ordinal",
  "postCollectionDigests",
  "postSnapshotSha256",
  "preCollectionDigests",
  "preSnapshotSha256",
  "principal",
  "psqlStatus",
  "sqlstate",
  "stdoutSha256",
]);
const SNAPSHOT_KEYS = Object.freeze([
  "finalCollectionDigests",
  "finalSha256",
  "initialCollectionDigests",
  "initialSha256",
]);
const ASSERTION_KEYS = Object.freeze(["id", "passed"]);
const CLEANUP_KEYS = Object.freeze(["containerAbsent", "status"]);
const DECLARATION_KEYS = Object.freeze([
  "arbitraryDynamicSecuritySql",
  "containerCredentialEnvironmentCount",
  "learnerPrivateMountCount",
  "productionMutationCount",
  "remoteDatabaseMutationCount",
  "repositoryCredentialMountCount",
  "supabaseContactCount",
  "zeroNetwork",
]);
const DATA_BOUNDARY_KEYS = Object.freeze([
  "containsCatalogBodies",
  "containsContainerIdentifiers",
  "containsErrorText",
  "containsSecrets",
  "containsSql",
  "containsTimestamps",
  "metadataOnly",
  "remoteMutationCount",
]);

function validateDigestMap(value, label) {
  assertExactKeys(value, ORACLE_SNAPSHOT_COLLECTIONS, label);
  for (const collection of ORACLE_SNAPSHOT_COLLECTIONS) {
    requireString(value[collection], `${label} ${collection}`, SHA256_PATTERN);
  }
  const expectedRoot = sha256(Buffer.from(canonicalJson(value), "utf8"));
  return expectedRoot;
}

function validateSemanticDeltaMetadata(receipt, label) {
  assertExactKeys(receipt.deltaCollectionCounts, ORACLE_SNAPSHOT_COLLECTIONS, `${label} delta counts`);
  assertExactKeys(receipt.deltaCollectionDigests, ORACLE_SNAPSHOT_COLLECTIONS, `${label} delta digests`);
  for (const collection of ORACLE_SNAPSHOT_COLLECTIONS) {
    const counts = receipt.deltaCollectionCounts[collection];
    assertExactKeys(counts, DELTA_COUNT_KEYS, `${label} ${collection} delta counts`);
    for (const kind of DELTA_COUNT_KEYS) {
      requireInteger(counts[kind], `${label} ${collection} ${kind} count`);
    }
    requireString(
      receipt.deltaCollectionDigests[collection],
      `${label} ${collection} delta digest`,
      SHA256_PATTERN,
    );
  }
  return deltaRootSha256(
    receipt.deltaCollectionCounts,
    receipt.deltaCollectionDigests,
  );
}

export function validatePostgresSecurityOracleEvidence(evidence, {
  expectedHeadSha = process.env.PR_HEAD_SHA,
  expectedRunAttempt = Number(process.env.GITHUB_RUN_ATTEMPT),
  expectedRunId = process.env.GITHUB_RUN_ID,
  repoRoot = process.cwd(),
  riskBytes,
  riskResult,
} = {}) {
  assertClosedOracleChangeSet(riskResult);
  assertExactKeys(evidence, EVIDENCE_KEYS, "PostgreSQL oracle evidence");
  if (evidence.schemaVersion !== ORACLE_SCHEMA_VERSION) {
    throw new Error(`PostgreSQL oracle evidence schema must be ${ORACLE_SCHEMA_VERSION}.`);
  }
  if (
    evidence.producerVersion !== ORACLE_PRODUCER_VERSION ||
    evidence.status !== "verified" ||
    evidence.sourceLevelOnly !== false
  ) {
    throw new Error("PostgreSQL oracle evidence status or producer is invalid.");
  }
  const headShaValue = requireString(expectedHeadSha, "PR_HEAD_SHA", SHA_PATTERN).toLowerCase();
  if (requireString(evidence.pullRequestHeadSha, "oracle pull-request head SHA", SHA_PATTERN).toLowerCase() !== headShaValue) {
    throw new Error("PostgreSQL oracle evidence pull-request head SHA does not match.");
  }
  const resolvedTree = headTree(repoRoot, headShaValue);
  if (
    requireString(evidence.pullRequestHeadTree, "oracle pull-request head tree", SHA_PATTERN).toLowerCase() !== resolvedTree
  ) {
    throw new Error("PostgreSQL oracle evidence pull-request head tree does not match.");
  }
  if (
    requireString(evidence.githubRunId, "oracle GitHub run ID", /^\d+$/u) !==
      requireString(expectedRunId, "GITHUB_RUN_ID", /^\d+$/u) ||
    requireInteger(evidence.githubRunAttempt, "oracle GitHub run attempt", 1) !==
      requireInteger(expectedRunAttempt, "GITHUB_RUN_ATTEMPT", 1)
  ) {
    throw new Error("PostgreSQL oracle evidence runtime invocation does not match.");
  }
  if (
    requireString(evidence.riskFileSha256, "oracle risk digest", SHA256_PATTERN) !==
      sha256(riskBytes)
  ) {
    throw new Error("PostgreSQL oracle evidence risk-file digest does not match.");
  }

  const exactHeadBytes = readExactHeadSources(repoRoot, headShaValue);
  assertExecutedSourceMatchesHead(repoRoot, headShaValue, ORACLE_SOURCE_PATH);
  assertExecutedSourceMatchesHead(repoRoot, headShaValue, NATIVE_GATE_PATH);
  readManifest(exactHeadBytes[ORACLE_MANIFEST_PATH]);

  assertExactKeys(evidence.oracle, ORACLE_KEYS, "PostgreSQL oracle environment");
  if (
    evidence.oracle.bootstrapPrincipal !== "postgres" ||
    evidence.oracle.bootstrapSha256 !== sha256(Buffer.from(BOOTSTRAP_SQL, "utf8")) ||
    evidence.oracle.hostAuthMethod !== "trust" ||
    evidence.oracle.image !== ORACLE_IMAGE ||
    evidence.oracle.imageDigest !== ORACLE_IMAGE_DIGEST ||
    evidence.oracle.bindOrVolumeMountCount !== 0 ||
    evidence.oracle.mountCount !== 1 ||
    evidence.oracle.networkMode !== "none" ||
    canonicalJson(evidence.oracle.passedEnvironmentNames) !== canonicalJson(["POSTGRES_HOST_AUTH_METHOD"]) ||
    evidence.oracle.platform !== ORACLE_PLATFORM ||
    evidence.oracle.publishedPortCount !== 0 ||
    evidence.oracle.serverVersionNum !== ORACLE_SERVER_VERSION_NUM ||
    evidence.oracle.tmpfsDestination !== ORACLE_TMPFS_DESTINATION ||
    evidence.oracle.tmpfsMountCount !== 1 ||
    evidence.oracle.tmpfsOptions !== ORACLE_TMPFS_OPTIONS
  ) {
    throw new Error("PostgreSQL oracle isolated environment does not match the closed contract.");
  }

  if (!Array.isArray(evidence.membershipInputRejections) || evidence.membershipInputRejections.length !== 2) {
    throw new Error("PostgreSQL oracle membership input rejections are incomplete.");
  }
  evidence.membershipInputRejections.forEach((rejection, index) => {
    assertExactKeys(rejection, MEMBERSHIP_REJECTION_KEYS, `membership input rejection ${index}`);
    const expectedField = ["inheritOption", "setOption"][index];
    if (
      rejection.beforeDatabase !== true ||
      rejection.databaseExecutionCount !== 0 ||
      rejection.field !== expectedField ||
      rejection.status !== "rejected_unknown_field"
    ) {
      throw new Error("PostgreSQL oracle membership input rejection is invalid.");
    }
  });

  const steps = oracleFixtureSteps();
  if (!Array.isArray(evidence.fixtureReceipts) || evidence.fixtureReceipts.length !== steps.length) {
    throw new Error("PostgreSQL oracle fixture receipt set is incomplete.");
  }
  evidence.fixtureReceipts.forEach((receipt, index) => {
    const step = steps[index];
    assertExactKeys(receipt, FIXTURE_RECEIPT_KEYS, `oracle fixture receipt ${index}`);
    if (
      receipt.id !== step.id ||
      receipt.ordinal !== step.ordinal ||
      receipt.principal !== step.principal ||
      receipt.inputSha256 !== step.inputSha256 ||
      receipt.expected !== step.expectation ||
      receipt.actual !== step.expectation
    ) {
      throw new Error("PostgreSQL oracle fixture source identity or result does not match.");
    }
    const preRoot = validateDigestMap(receipt.preCollectionDigests, `oracle fixture ${step.id} pre digests`);
    const postRoot = validateDigestMap(receipt.postCollectionDigests, `oracle fixture ${step.id} post digests`);
    const deltaRoot = validateSemanticDeltaMetadata(receipt, `oracle fixture ${step.id}`);
    const deltaMatchesSnapshots = ORACLE_SNAPSHOT_COLLECTIONS.every((collection) => {
      const counts = receipt.deltaCollectionCounts[collection];
      const total = DELTA_COUNT_KEYS.reduce((sum, kind) => sum + counts[kind], 0);
      const snapshotChanged =
        receipt.preCollectionDigests[collection] !== receipt.postCollectionDigests[collection];
      const digestIsEmpty =
        receipt.deltaCollectionDigests[collection] === EMPTY_SEMANTIC_DELTA_SHA256;
      return snapshotChanged === (total > 0) && digestIsEmpty === (total === 0);
    });
    if (
      receipt.preSnapshotSha256 !== preRoot ||
      receipt.postSnapshotSha256 !== postRoot ||
      receipt.deltaSha256 !== deltaRoot ||
      !deltaMatchesSnapshots
    ) {
      throw new Error("PostgreSQL oracle fixture snapshot or delta digest is invalid.");
    }
    if (step.expectation === "rejection") {
      if (
        !step.sqlstates.includes(requireString(receipt.sqlstate, `oracle fixture ${step.id} SQLSTATE`, SQLSTATE_PATTERN)) ||
        receipt.psqlStatus !== 3 ||
        receipt.preSnapshotSha256 !== receipt.postSnapshotSha256 ||
        canonicalJson(receipt.preCollectionDigests) !== canonicalJson(receipt.postCollectionDigests) ||
        ORACLE_SNAPSHOT_COLLECTIONS.some((collection) =>
          DELTA_COUNT_KEYS.some((kind) => receipt.deltaCollectionCounts[collection][kind] !== 0) ||
          receipt.deltaCollectionDigests[collection] !== EMPTY_SEMANTIC_DELTA_SHA256) ||
        receipt.stdoutSha256 !== null
      ) {
        throw new Error("PostgreSQL oracle rejected command was not proven atomic.");
      }
    } else if (
      receipt.sqlstate !== null ||
      receipt.psqlStatus !== 0 ||
      receipt.stdoutSha256 !== step.expectedStdoutSha256
    ) {
      throw new Error("PostgreSQL oracle successful fixture receipt is invalid.");
    }
    if (index > 0) {
      const previous = evidence.fixtureReceipts[index - 1];
      if (
        previous.postSnapshotSha256 !== receipt.preSnapshotSha256 ||
        canonicalJson(previous.postCollectionDigests) !== canonicalJson(receipt.preCollectionDigests)
      ) {
        throw new Error("PostgreSQL oracle fixture snapshot chain is discontinuous.");
      }
    }
  });

  assertExactKeys(evidence.snapshots, SNAPSHOT_KEYS, "PostgreSQL oracle aggregate snapshots");
  const initialRoot = validateDigestMap(
    evidence.snapshots.initialCollectionDigests,
    "oracle initial snapshot digests",
  );
  const finalRoot = validateDigestMap(
    evidence.snapshots.finalCollectionDigests,
    "oracle final snapshot digests",
  );
  if (
    evidence.snapshots.initialSha256 !== initialRoot ||
    evidence.snapshots.finalSha256 !== finalRoot ||
    evidence.snapshots.initialSha256 !== evidence.fixtureReceipts[0].preSnapshotSha256 ||
    evidence.snapshots.finalSha256 !== evidence.fixtureReceipts.at(-1).postSnapshotSha256
  ) {
    throw new Error("PostgreSQL oracle aggregate snapshot roots do not match fixture receipts.");
  }
  if (
    requireString(evidence.semanticDeltaSha256, "oracle semantic delta digest", SHA256_PATTERN) !==
      aggregateSemanticDeltaSha256(evidence.fixtureReceipts)
  ) {
    throw new Error("PostgreSQL oracle semantic delta digest does not match.");
  }

  if (!Array.isArray(evidence.assertions) || evidence.assertions.length !== ORACLE_ASSERTION_IDS.length) {
    throw new Error("PostgreSQL oracle assertion set is incomplete.");
  }
  evidence.assertions.forEach((assertion, index) => {
    assertExactKeys(assertion, ASSERTION_KEYS, `oracle assertion ${index}`);
    if (assertion.id !== ORACLE_ASSERTION_IDS[index] || assertion.passed !== true) {
      throw new Error("PostgreSQL oracle assertion set is missing, duplicated, reordered, or failed.");
    }
  });

  assertExactKeys(evidence.cleanup, CLEANUP_KEYS, "PostgreSQL oracle cleanup");
  if (evidence.cleanup.containerAbsent !== true || evidence.cleanup.status !== "complete") {
    throw new Error("PostgreSQL oracle cleanup is incomplete.");
  }
  assertExactKeys(evidence.declarations, DECLARATION_KEYS, "PostgreSQL oracle declarations");
  if (
    evidence.declarations.arbitraryDynamicSecuritySql !== "unsupported" ||
    evidence.declarations.zeroNetwork !== true ||
    DECLARATION_KEYS.filter((key) => !["arbitraryDynamicSecuritySql", "zeroNetwork"].includes(key))
      .some((key) => evidence.declarations[key] !== 0)
  ) {
    throw new Error("PostgreSQL oracle zero-network or zero-remote-mutation declaration is invalid.");
  }
  assertExactKeys(evidence.dataBoundary, DATA_BOUNDARY_KEYS, "PostgreSQL oracle data boundary");
  if (
    evidence.dataBoundary.metadataOnly !== true ||
    evidence.dataBoundary.remoteMutationCount !== 0 ||
    DATA_BOUNDARY_KEYS.filter((key) => key.startsWith("contains"))
      .some((key) => evidence.dataBoundary[key] !== false)
  ) {
    throw new Error("PostgreSQL oracle artifact is not metadata-only.");
  }

  if (
    requireString(evidence.evidenceSha256, "PostgreSQL oracle evidence digest", SHA256_PATTERN) !==
      oracleEvidenceSha256(evidence)
  ) {
    throw new Error("PostgreSQL oracle evidence digest does not match.");
  }
  assertExactKeys(evidence.artifactDigests, ORACLE_ARTIFACT_DIGEST_KEYS, "PostgreSQL oracle artifact digest map");
  const expectedDigests = oracleArtifactDigestMap(evidence, exactHeadBytes);
  for (const key of ORACLE_ARTIFACT_DIGEST_KEYS) {
    if (
      !SHA256_PATTERN.test(evidence.artifactDigests[key] ?? "") ||
      evidence.artifactDigests[key] !== expectedDigests[key]
    ) {
      throw new Error(`PostgreSQL oracle artifact digest does not match: ${key}`);
    }
  }
  return true;
}
