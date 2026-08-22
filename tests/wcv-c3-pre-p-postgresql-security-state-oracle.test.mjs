import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { after, test } from "node:test";

import {
  NATIVE_GATE_PATH,
  NATIVE_PRODUCER_PATH,
  ORACLE_ALLOWED_CHANGED_PATHS,
  ORACLE_ASSERTION_IDS,
  ORACLE_IMAGE,
  ORACLE_IMAGE_DIGEST,
  ORACLE_MANIFEST_PATH,
  ORACLE_MISMATCH_CLASSIFICATION,
  ORACLE_PLATFORM,
  ORACLE_PRODUCER_VERSION,
  ORACLE_QA_PATH,
  ORACLE_RUNTIME_REQUIRED_PATHS,
  ORACLE_SCHEMA_VERSION,
  ORACLE_SERVER_VERSION_NUM,
  ORACLE_SNAPSHOT_COLLECTIONS,
  ORACLE_SNAPSHOT_SQL,
  ORACLE_SOURCE_PATH,
  ORACLE_TEST_PATH,
  ORACLE_TMPFS_DESTINATION,
  ORACLE_TMPFS_OPTIONS,
  assertOracleContainerIsolation,
  assertOracleImageInspection,
  assertOracleServerVersion,
  assertClosedOracleChangeSet,
  assertSupportedDynamicFixture,
  canonicalJson,
  oracleArtifactDigestMap,
  oracleBootstrapSql,
  oracleEvidenceSha256,
  oracleFixtureSteps,
  oracleManifestContract,
  semanticDeltaReceipt,
  sha256,
  snapshotReceiptSetSha256,
  validateMembershipInput,
  validateOracleManifestBytes,
  validatePostgresSecurityOracleEvidence,
} from "../scripts/automation/wcv-c3-pre-p-postgresql-security-state-oracle.mjs";
import {
  POSTGRES_SECURITY_ORACLE_RUNTIME_PATHS,
  runtimeRequiredPathRecords,
} from "../scripts/automation/runtime-risk-contract.mjs";

const ROOT = process.cwd();
const FIXTURE_REPO = fs.mkdtempSync(path.join(os.tmpdir(), "postgres-security-oracle-test-"));
const HEAD_SOURCE_PATHS = [
  ORACLE_MANIFEST_PATH,
  ORACLE_QA_PATH,
  ORACLE_SOURCE_PATH,
  ORACLE_TEST_PATH,
  NATIVE_PRODUCER_PATH,
  NATIVE_GATE_PATH,
];
for (const filePath of HEAD_SOURCE_PATHS) {
  const target = path.join(FIXTURE_REPO, filePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(ROOT, filePath), target);
}
execFileSync("git", ["init", "--quiet"], { cwd: FIXTURE_REPO });
execFileSync("git", ["config", "user.name", "Oracle Test"], { cwd: FIXTURE_REPO });
execFileSync("git", ["config", "user.email", "oracle@example.invalid"], { cwd: FIXTURE_REPO });
execFileSync("git", ["add", "."], { cwd: FIXTURE_REPO });
execFileSync("git", ["commit", "--quiet", "-m", "oracle test head"], { cwd: FIXTURE_REPO });
const HEAD_SHA = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: FIXTURE_REPO,
  encoding: "utf8",
}).trim();
const HEAD_TREE = execFileSync("git", ["rev-parse", "HEAD^{tree}"], {
  cwd: FIXTURE_REPO,
  encoding: "utf8",
}).trim();
const RUN_ID = "99150008";
const RUN_ATTEMPT = 2;

after(() => fs.rmSync(FIXTURE_REPO, { force: true, recursive: true }));

function digestMap(seed) {
  return Object.fromEntries(ORACLE_SNAPSHOT_COLLECTIONS.map((collection) => [
    collection,
    sha256(Buffer.from(`${seed}:${collection}`, "utf8")),
  ]));
}

function rootDigest(collections) {
  return sha256(Buffer.from(canonicalJson(collections), "utf8"));
}

function syntheticDeltaMetadata(before, after) {
  const emptyDelta = { added: [], changed: [], removed: [] };
  const collectionCounts = {};
  const collectionDigests = {};
  for (const collection of ORACLE_SNAPSHOT_COLLECTIONS) {
    const changed = before[collection] !== after[collection];
    const delta = changed
      ? {
          added: [],
          changed: [{
            afterSha256: after[collection],
            beforeSha256: before[collection],
            identity: JSON.stringify({ synthetic: collection }),
          }],
          removed: [],
        }
      : emptyDelta;
    collectionCounts[collection] = {
      added: delta.added.length,
      changed: delta.changed.length,
      removed: delta.removed.length,
    };
    collectionDigests[collection] = sha256(Buffer.from(canonicalJson(delta), "utf8"));
  }
  return {
    collectionCounts,
    collectionDigests,
    sha256: sha256(Buffer.from(canonicalJson({ collectionCounts, collectionDigests }), "utf8")),
  };
}

function requiredRisk() {
  return {
    version: 1,
    risk: "high",
    reasons: [],
    runtimeEvidenceRequired: true,
    runtimeReasons: ORACLE_RUNTIME_REQUIRED_PATHS.map((filePath) => ({
      path: filePath,
      pattern: filePath,
    })),
    changedFiles: [...ORACLE_ALLOWED_CHANGED_PATHS],
    changedFilesTruncated: false,
  };
}

function headBytes() {
  return Object.fromEntries(HEAD_SOURCE_PATHS.map((filePath) => [
    filePath,
    execFileSync("git", ["show", `${HEAD_SHA}:${filePath}`], {
      cwd: FIXTURE_REPO,
      encoding: null,
    }),
  ]));
}

function aggregateDeltaDigest(receipts) {
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

function validEvidence(riskBytes) {
  let current = digestMap("snapshot-0");
  const fixtureReceipts = oracleFixtureSteps().map((step, index) => {
    const before = current;
    const after = step.expectation === "rejection"
      ? before
      : digestMap(`snapshot-${index + 1}`);
    current = after;
    const delta = syntheticDeltaMetadata(before, after);
    return {
      actual: step.expectation,
      deltaCollectionCounts: delta.collectionCounts,
      deltaCollectionDigests: delta.collectionDigests,
      deltaSha256: delta.sha256,
      expected: step.expectation,
      id: step.id,
      inputSha256: step.inputSha256,
      ordinal: step.ordinal,
      postCollectionDigests: after,
      postSnapshotSha256: rootDigest(after),
      preCollectionDigests: before,
      preSnapshotSha256: rootDigest(before),
      principal: step.principal,
      psqlStatus: step.expectation === "rejection" ? 3 : 0,
      sqlstate: step.expectation === "rejection" ? step.sqlstates[0] : null,
      stdoutSha256: step.expectation === "success"
        ? step.expectedStdoutSha256
        : null,
    };
  });
  const evidence = {
    schemaVersion: ORACLE_SCHEMA_VERSION,
    producerVersion: ORACLE_PRODUCER_VERSION,
    status: "verified",
    sourceLevelOnly: false,
    pullRequestHeadSha: HEAD_SHA,
    pullRequestHeadTree: HEAD_TREE,
    githubRunId: RUN_ID,
    githubRunAttempt: RUN_ATTEMPT,
    riskFileSha256: sha256(riskBytes),
    oracle: {
      bindOrVolumeMountCount: 0,
      bootstrapPrincipal: "postgres",
      bootstrapSha256: sha256(Buffer.from(oracleBootstrapSql(), "utf8")),
      hostAuthMethod: "trust",
      image: ORACLE_IMAGE,
      imageDigest: ORACLE_IMAGE_DIGEST,
      mountCount: 1,
      networkMode: "none",
      passedEnvironmentNames: ["POSTGRES_HOST_AUTH_METHOD"],
      platform: ORACLE_PLATFORM,
      publishedPortCount: 0,
      serverVersionNum: ORACLE_SERVER_VERSION_NUM,
      tmpfsDestination: ORACLE_TMPFS_DESTINATION,
      tmpfsMountCount: 1,
      tmpfsOptions: ORACLE_TMPFS_OPTIONS,
    },
    membershipInputRejections: ["inheritOption", "setOption"].map((field) => ({
      beforeDatabase: true,
      databaseExecutionCount: 0,
      field,
      status: "rejected_unknown_field",
    })),
    fixtureReceipts,
    snapshots: {
      finalCollectionDigests: fixtureReceipts.at(-1).postCollectionDigests,
      finalSha256: fixtureReceipts.at(-1).postSnapshotSha256,
      initialCollectionDigests: fixtureReceipts[0].preCollectionDigests,
      initialSha256: fixtureReceipts[0].preSnapshotSha256,
    },
    semanticDeltaSha256: aggregateDeltaDigest(fixtureReceipts),
    assertions: ORACLE_ASSERTION_IDS.map((id) => ({ id, passed: true })),
    cleanup: { containerAbsent: true, status: "complete" },
    declarations: {
      arbitraryDynamicSecuritySql: "unsupported",
      containerCredentialEnvironmentCount: 0,
      learnerPrivateMountCount: 0,
      productionMutationCount: 0,
      remoteDatabaseMutationCount: 0,
      repositoryCredentialMountCount: 0,
      supabaseContactCount: 0,
      zeroNetwork: true,
    },
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
  evidence.artifactDigests = oracleArtifactDigestMap(evidence, headBytes());
  return evidence;
}

function validate(evidence, riskResult, riskBytes) {
  return validatePostgresSecurityOracleEvidence(evidence, {
    expectedHeadSha: HEAD_SHA,
    expectedRunAttempt: RUN_ATTEMPT,
    expectedRunId: RUN_ID,
    repoRoot: FIXTURE_REPO,
    riskBytes,
    riskResult,
  });
}

function resealEvidence(evidence) {
  evidence.semanticDeltaSha256 = aggregateDeltaDigest(evidence.fixtureReceipts);
  evidence.evidenceSha256 = oracleEvidenceSha256(evidence);
  evidence.artifactDigests = oracleArtifactDigestMap(evidence, headBytes());
  return evidence;
}

test("oracle manifest freezes support-only authority, image, version, and fixture digest", () => {
  const manifestBytes = fs.readFileSync(path.join(ROOT, ORACLE_MANIFEST_PATH));
  const manifest = validateOracleManifestBytes(manifestBytes);
  assert.deepEqual(manifest, oracleManifestContract());

  const mutants = [
    (value) => { value.status = "canonical_stage"; },
    (value) => { value.authorityBoundary.c3rP = "blocked"; },
    (value) => { value.deliveryControl.referenceOnlyIssueLinks.requiredReferenceLinesExactly.pop(); },
    (value) => { value.runtime.remoteDatabaseMutationAllowed = true; },
    (value) => { value.membershipInputContract.exactFields.push("inheritOption"); },
    (value) => { value.sourceIdentity.parserLocationIsAuthority = true; },
    (value) => { value.dynamicSql.supportedFixtureIds.push("opaque_body"); },
    (value) => { value.unknown = true; },
  ];
  for (const mutate of mutants) {
    const mutant = structuredClone(manifest);
    mutate(mutant);
    assert.throws(
      () => validateOracleManifestBytes(Buffer.from(JSON.stringify(mutant), "utf8")),
      /closed runtime contract/u,
    );
  }
});

test("oracle risk classification is exact, complete, and closed to eleven paths", () => {
  assert.deepEqual(POSTGRES_SECURITY_ORACLE_RUNTIME_PATHS, ORACLE_RUNTIME_REQUIRED_PATHS);
  const risk = requiredRisk();
  assert.equal(assertClosedOracleChangeSet(risk), true);
  assert.deepEqual(
    runtimeRequiredPathRecords(risk.changedFiles)
      .filter(({ path: filePath }) => ORACLE_RUNTIME_REQUIRED_PATHS.includes(filePath))
      .map(({ path: filePath }) => filePath)
      .sort(),
    ORACLE_RUNTIME_REQUIRED_PATHS,
  );
  assert.throws(
    () => assertClosedOracleChangeSet({ ...risk, changedFiles: [...risk.changedFiles, "README.md"] }),
    /no closed PostgreSQL security-state oracle adapter/u,
  );
  assert.throws(
    () => assertClosedOracleChangeSet({ ...risk, changedFilesTruncated: true }),
    /cannot bind the complete changed-file set/u,
  );
  const missingTruncation = { ...risk };
  delete missingTruncation.changedFilesTruncated;
  assert.throws(
    () => assertClosedOracleChangeSet(missingTruncation),
    /cannot bind the complete changed-file set/u,
  );
  assert.throws(
    () => assertClosedOracleChangeSet({
      ...risk,
      changedFiles: [...risk.changedFiles, risk.changedFiles[0]],
    }),
    /no closed PostgreSQL security-state oracle adapter/u,
  );
  assert.throws(
    () => assertClosedOracleChangeSet({ ...risk, runtimeEvidenceRequired: false }),
    /runtime-required paths/u,
  );
  assert.throws(
    () => assertClosedOracleChangeSet({
      ...risk,
      runtimeReasons: risk.runtimeReasons.map((reason, index) => index === 0
        ? { ...reason, pattern: "**" }
        : reason),
    }),
    /pattern does not match/u,
  );
  assert.throws(
    () => assertClosedOracleChangeSet({
      ...risk,
      runtimeReasons: risk.runtimeReasons.map((reason, index) => index === 0
        ? { ...reason, unknown: true }
        : reason),
    }),
    /missing or unknown keys/u,
  );
  assert.throws(
    () => assertClosedOracleChangeSet({
      ...risk,
      runtimeReasons: [risk.runtimeReasons[0], ...risk.runtimeReasons.slice(0, -1)],
    }),
    /runtime-required paths/u,
  );
});

test("PostgreSQL 15 membership input accepts exactly four fields before execution", () => {
  assert.deepEqual(validateMembershipInput({
    adminOption: false,
    grantedRole: "oracle_top",
    grantorRole: "postgres",
    memberRole: "oracle_direct",
  }), {
    adminOption: false,
    grantedRole: "oracle_top",
    grantorRole: "postgres",
    memberRole: "oracle_direct",
  });
  for (const field of ["inheritOption", "setOption", "unknown"]) {
    assert.throws(() => validateMembershipInput({
      adminOption: false,
      grantedRole: "oracle_top",
      grantorRole: "postgres",
      memberRole: "oracle_direct",
      [field]: true,
    }), /missing or unknown fields/u);
  }
});

test("closed fixture set covers membership, defaults, identities, lifecycle, RLS, donor regressions, and dynamic SQL", () => {
  const steps = oracleFixtureSteps();
  const ids = new Set(steps.map(({ id }) => id));
  assert.equal(steps.length, 61);
  for (const id of [
    "membership_direct_set_role",
    "membership_multihop_set_session_role",
    "membership_circular_grant_rejection",
    "membership_createrole_grant_revoke",
    "membership_unauthorized_revoke_rejection",
    "membership_duplicate_plain_grant_preserves_admin",
    "membership_revoke_admin_option_only",
    "membership_granted_by_nonexistent_rejection",
    "historical_791_membership_inherit_and_set_probe",
    "historical_791_creator_scoped_defaults",
    "identity_quoted_foo_duplicate_rejection",
    "identity_case_distinct_types_and_routines",
    "lifecycle_drop_objects_and_schema",
    "lifecycle_recreate_new_owner",
    "rls_owner_subject_to_force",
    "rls_superuser_bypass_force",
    "rls_bypassrls_bypass_force",
    "rls_alter_policy",
    "rls_drop_transient_policy",
    "dynamic_explicit_policy",
    "final_absence_and_state_probe",
  ]) assert.equal(ids.has(id), true, id);
  assert.equal(
    new Set(steps.map(({ id, inputSha256, ordinal, principal }) =>
      `${ordinal}:${id}:${principal}:${inputSha256}`)).size,
    steps.length,
  );
  assert.equal(steps.every(({ sql }) => sql.endsWith("\n")), true);
  assert.equal(steps.find(({ id }) => id === "dynamic_explicit_policy").dynamicSecurity, true);
  assert.match(
    steps.find(({ id }) => id === "dynamic_explicit_policy").sql,
    /END;\n\$oracle\$;/u,
  );
  assert.match(
    steps.find(({ id }) => id === "privilege_rls_setup").sql,
    /AS RESTRICTIVE FOR INSERT[\s\S]*WITH CHECK/u,
  );
  assert.equal(assertSupportedDynamicFixture("dynamic_explicit_policy"), true);
  assert.throws(() => assertSupportedDynamicFixture("opaque_body"), /unsupported/u);
});

test("canonical snapshot uses textual identities, null-ACL expansion, fixed rendering, and all eight catalogs", () => {
  for (const marker of [
    "pg_roles",
    "pg_auth_members",
    "pg_default_acl",
    "pg_namespace",
    "pg_class",
    "pg_proc",
    "pg_type",
    "pg_policy",
    "aclexplode(COALESCE",
    "acldefault('n'",
    "THEN 's'::\"char\"",
    "acldefault('f'",
    "acldefault('T'",
    "pg_get_function_identity_arguments",
    "pg_get_expr(p.polqual, p.polrelid, false)",
    "pg_get_expr(p.polwithcheck, p.polrelid, false)",
    "SET search_path = pg_catalog",
    "THEN 'PUBLIC'",
    "COLLATE \"C\"",
  ]) assert.match(ORACLE_SNAPSHOT_SQL, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
  assert.doesNotMatch(ORACLE_SNAPSHOT_SQL, /backend_pid|clock_timestamp|current_timestamp/u);
});

test("semantic delta is row-level, keyed by textual identities, and body-free", () => {
  const before = Object.fromEntries(ORACLE_SNAPSHOT_COLLECTIONS.map((name) => [name, []]));
  before.roles = [{
    rolbypassrls: false,
    rolcanlogin: true,
    rolcreaterole: false,
    rolinherit: true,
    rolname: "oracle_plain",
    rolsuper: false,
  }];
  const after = structuredClone(before);
  after.roles[0].rolinherit = false;
  after.policies = [{
    command: "a",
    permissive: false,
    policy: "insert_check",
    roles: ["oracle_plain"],
    schema: "oracle_rls",
    table: "secure",
    using: null,
    withCheck: "(id > 0)",
  }];
  const delta = semanticDeltaReceipt(before, after);
  assert.equal(delta.collectionCounts.roles.changed, 1);
  assert.equal(delta.collectionCounts.policies.added, 1);
  assert.equal(delta.collectionCounts.memberships.changed, 0);
  assert.match(delta.sha256, /^[0-9a-f]{64}$/u);
  assert.doesNotMatch(JSON.stringify(delta), /oracle_plain|insert_check|oracle_rls/u);
});

test("closed metadata receipt validates and all artifact-map corruptions fail closed", () => {
  const risk = requiredRisk();
  const riskBytes = Buffer.from(JSON.stringify(risk), "utf8");
  const evidence = validEvidence(riskBytes);
  assert.equal(validate(evidence, risk, riskBytes), true);

  const mutants = [
    (value) => { delete value.artifactDigests.oracleManifest; },
    (value) => { value.artifactDigests.oracleManifest = null; },
    (value) => { value.artifactDigests.oracleManifest = ""; },
    (value) => { value.artifactDigests.unknown = "a".repeat(64); },
    (value) => { value.artifactDigests = {}; },
    (value) => { value.artifactDigests.oracleManifest = "a".repeat(64); },
  ];
  for (const mutate of mutants) {
    const mutant = structuredClone(evidence);
    mutate(mutant);
    assert.throws(() => validate(mutant, risk, riskBytes), /artifact digest/u);
  }
});

test("negative receipts require bounded SQLSTATE and exact pre/post semantic equality", () => {
  const risk = requiredRisk();
  const riskBytes = Buffer.from(JSON.stringify(risk), "utf8");
  const evidence = validEvidence(riskBytes);
  const negativeIndex = evidence.fixtureReceipts.findIndex(({ expected }) => expected === "rejection");
  const sqlstateMutant = structuredClone(evidence);
  sqlstateMutant.fixtureReceipts[negativeIndex].sqlstate = "XX000";
  resealEvidence(sqlstateMutant);
  assert.throws(() => validate(sqlstateMutant, risk, riskBytes), /SQLSTATE|atomic/u);

  const stateMutant = structuredClone(evidence);
  const negative = stateMutant.fixtureReceipts[negativeIndex];
  negative.postCollectionDigests = {
    ...negative.postCollectionDigests,
    roles: "b".repeat(64),
  };
  negative.postSnapshotSha256 = rootDigest(negative.postCollectionDigests);
  negative.deltaCollectionCounts.roles = { added: 0, changed: 1, removed: 0 };
  negative.deltaCollectionDigests.roles = sha256(Buffer.from("changed-negative-role", "utf8"));
  negative.deltaSha256 = sha256(Buffer.from(canonicalJson({
    collectionCounts: negative.deltaCollectionCounts,
    collectionDigests: negative.deltaCollectionDigests,
  }), "utf8"));
  const next = stateMutant.fixtureReceipts[negativeIndex + 1];
  next.preCollectionDigests = structuredClone(negative.postCollectionDigests);
  next.preSnapshotSha256 = negative.postSnapshotSha256;
  resealEvidence(stateMutant);
  assert.throws(() => validate(stateMutant, risk, riskBytes), /atomic/u);
});

test("success and rejection psql status plus success stdout are exact closed expectations", () => {
  const risk = requiredRisk();
  const riskBytes = Buffer.from(JSON.stringify(risk), "utf8");
  const evidence = validEvidence(riskBytes);
  const successIndex = evidence.fixtureReceipts.findIndex(({ expected }) => expected === "success");
  const rejectionIndex = evidence.fixtureReceipts.findIndex(({ expected }) => expected === "rejection");

  const stdoutMutant = structuredClone(evidence);
  stdoutMutant.fixtureReceipts[successIndex].stdoutSha256 = "a".repeat(64);
  resealEvidence(stdoutMutant);
  assert.throws(() => validate(stdoutMutant, risk, riskBytes), /successful fixture receipt/u);

  const successStatusMutant = structuredClone(evidence);
  successStatusMutant.fixtureReceipts[successIndex].psqlStatus = 3;
  resealEvidence(successStatusMutant);
  assert.throws(() => validate(successStatusMutant, risk, riskBytes), /successful fixture receipt/u);

  const rejectionStatusMutant = structuredClone(evidence);
  rejectionStatusMutant.fixtureReceipts[rejectionIndex].psqlStatus = 0;
  resealEvidence(rejectionStatusMutant);
  assert.throws(() => validate(rejectionStatusMutant, risk, riskBytes), /atomic/u);
});

test("success delta metadata must agree bidirectionally with changed snapshot roots", () => {
  const risk = requiredRisk();
  const riskBytes = Buffer.from(JSON.stringify(risk), "utf8");
  const evidence = validEvidence(riskBytes);
  const emptyDeltaDigest = sha256(Buffer.from(canonicalJson({
    added: [],
    changed: [],
    removed: [],
  }), "utf8"));

  const falseEmpty = structuredClone(evidence);
  const firstSuccess = falseEmpty.fixtureReceipts.find(({ expected }) => expected === "success");
  firstSuccess.deltaCollectionCounts.roles = { added: 0, changed: 0, removed: 0 };
  firstSuccess.deltaCollectionDigests.roles = emptyDeltaDigest;
  firstSuccess.deltaSha256 = sha256(Buffer.from(canonicalJson({
    collectionCounts: firstSuccess.deltaCollectionCounts,
    collectionDigests: firstSuccess.deltaCollectionDigests,
  }), "utf8"));
  resealEvidence(falseEmpty);
  assert.throws(() => validate(falseEmpty, risk, riskBytes), /snapshot or delta/u);

  const falseNonempty = structuredClone(evidence);
  const finalReceipt = falseNonempty.fixtureReceipts.at(-1);
  finalReceipt.postCollectionDigests = structuredClone(finalReceipt.preCollectionDigests);
  finalReceipt.postSnapshotSha256 = finalReceipt.preSnapshotSha256;
  falseNonempty.snapshots.finalCollectionDigests = structuredClone(
    finalReceipt.postCollectionDigests,
  );
  falseNonempty.snapshots.finalSha256 = finalReceipt.postSnapshotSha256;
  resealEvidence(falseNonempty);
  assert.throws(() => validate(falseNonempty, risk, riskBytes), /snapshot or delta/u);
});

test("artifact snapshot roots aggregate every ordered fixture pre/post root", () => {
  const risk = requiredRisk();
  const riskBytes = Buffer.from(JSON.stringify(risk), "utf8");
  const evidence = validEvidence(riskBytes);
  const beforePre = snapshotReceiptSetSha256(evidence.fixtureReceipts, "pre");
  const beforePost = snapshotReceiptSetSha256(evidence.fixtureReceipts, "post");
  const mutant = structuredClone(evidence);
  mutant.fixtureReceipts[10].preSnapshotSha256 = "c".repeat(64);
  mutant.fixtureReceipts[10].postSnapshotSha256 = "d".repeat(64);
  assert.notEqual(snapshotReceiptSetSha256(mutant.fixtureReceipts, "pre"), beforePre);
  assert.notEqual(snapshotReceiptSetSha256(mutant.fixtureReceipts, "post"), beforePost);
});

test("validator rejects executed oracle bytes that differ from the exact PR head", () => {
  const risk = requiredRisk();
  const riskBytes = Buffer.from(JSON.stringify(risk), "utf8");
  const evidence = validEvidence(riskBytes);
  const sourcePath = path.join(FIXTURE_REPO, ORACLE_SOURCE_PATH);
  const sourceBytes = fs.readFileSync(sourcePath);
  try {
    fs.appendFileSync(sourcePath, "\n// worktree mismatch\n", "utf8");
    assert.throws(
      () => validate(evidence, risk, riskBytes),
      /does not match pull-request head bytes/u,
    );
  } finally {
    fs.writeFileSync(sourcePath, sourceBytes);
  }
});

function prBody() {
  return `## Goal
Add support-only PostgreSQL security-state oracle tooling.

Refs #706
Refs #707
Refs #708
Refs #714
Refs #781
All referenced issues remain open; this support-tooling Draft closes none.

## Non-goals
No runtime stage or remote mutation.

## Risk classification
- Risk: [high]

## Data boundary
Metadata only.

## Schema / API / environment changes
Disposable PostgreSQL only.

## Tests and evidence
Focused and full validation.

## Runtime evidence
Native Runtime Gate required.

## Rollout and rollback
Draft only; revert the commit.

## Remaining risks
Runtime proof is required.

## Merge recommendation
- [ ] Auto-merge candidate
- [x] Human approval required
- [ ] Blocked
`;
}

function prEvent(body = prBody(), draft = true) {
  return {
    repository: { full_name: "chachathecat/inverge" },
    pull_request: {
      base: { ref: "main", sha: "54afffcc539981ded65591f1f027171343bfce40" },
      body,
      draft,
      head: {
        ref: "codex/wcv-c3-pre-p-postgresql-security-state-oracle",
        repo: { full_name: "chachathecat/inverge" },
      },
      title: "[WCV-C3 PRE-P] Add PostgreSQL 15.8 security-state oracle tooling",
    },
  };
}

function runPrContract(event, cwd = ROOT) {
  const eventPath = path.join(os.tmpdir(), `oracle-pr-event-${crypto.randomUUID()}.json`);
  fs.writeFileSync(eventPath, JSON.stringify(event), "utf8");
  try {
    return spawnSync(process.execPath, ["scripts/automation/validate-pr-contract.mjs"], {
      cwd,
      encoding: "utf8",
      env: { ...process.env, GITHUB_EVENT_PATH: eventPath },
    });
  } finally {
    fs.rmSync(eventPath, { force: true });
  }
}

test("PR contract exception is exact-Draft and reference-only without weakening generic validation", () => {
  const passing = runPrContract(prEvent());
  assert.equal(passing.status, 0, passing.stderr);
  assert.match(passing.stdout, /pass/u);

  const notDraft = runPrContract(prEvent(`${prBody()}\nCloses #781\n`, false));
  assert.notEqual(notDraft.status, 0);
  assert.match(notDraft.stderr, /reference-only/u);

  const closing = runPrContract(prEvent(`${prBody()}\nCloses #781\n`));
  assert.notEqual(closing.status, 0);
  assert.match(closing.stderr, /reference-only/u);

  const missingReference = runPrContract(prEvent(prBody().replace("Refs #708\n", "")));
  assert.notEqual(missingReference.status, 0);
  assert.match(missingReference.stderr, /reference-only/u);
});

test("PR reference-only authority is independently pinned against manifest mutation", () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "oracle-pr-contract-test-"));
  const validatorPath = path.join(fixtureRoot, "scripts/automation/validate-pr-contract.mjs");
  const manifestPath = path.join(fixtureRoot, ORACLE_MANIFEST_PATH);
  fs.mkdirSync(path.dirname(validatorPath), { recursive: true });
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.copyFileSync(path.join(ROOT, "scripts/automation/validate-pr-contract.mjs"), validatorPath);
  const mutant = oracleManifestContract();
  mutant.deliveryControl.referenceOnlyIssueLinks.requiredReferenceLinesExactly.pop();
  fs.writeFileSync(manifestPath, JSON.stringify(mutant), "utf8");
  try {
    const result = runPrContract(prEvent(), fixtureRoot);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /reference-only/u);
  } finally {
    fs.rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("workflow-facing mismatch classification remains exact", () => {
  assert.equal(ORACLE_MISMATCH_CLASSIFICATION, "ORACLE_IMAGE_OR_VERSION_MISMATCH");
  assert.equal(assertOracleImageInspection({
    architecture: "amd64",
    os: "linux",
    repoDigests: [`postgres@sha256:${ORACLE_IMAGE_DIGEST}`],
  }), true);
  assert.equal(assertOracleServerVersion([String(ORACLE_SERVER_VERSION_NUM)]), true);
  for (const inspection of [
    { architecture: "arm64", os: "linux", repoDigests: [`postgres@sha256:${ORACLE_IMAGE_DIGEST}`] },
    { architecture: "amd64", os: "windows", repoDigests: [`postgres@sha256:${ORACLE_IMAGE_DIGEST}`] },
    { architecture: "amd64", os: "linux", repoDigests: ["postgres@sha256:bad"] },
  ]) {
    assert.throws(
      () => assertOracleImageInspection(inspection),
      new RegExp(ORACLE_MISMATCH_CLASSIFICATION, "u"),
    );
  }
  for (const lines of [[], ["150009"], ["150008", "150008"]]) {
    assert.throws(
      () => assertOracleServerVersion(lines),
      new RegExp(ORACLE_MISMATCH_CLASSIFICATION, "u"),
    );
  }
});

test("Docker inspect receipt closes tmpfs, network, port, image, mount, and environment state", () => {
  const detail = {
    Config: {
      Env: ["POSTGRES_HOST_AUTH_METHOD=trust", "PG_MAJOR=15"],
      Image: ORACLE_IMAGE,
    },
    HostConfig: {
      NetworkMode: "none",
      PortBindings: {},
      Tmpfs: {
        [ORACLE_TMPFS_DESTINATION]: ORACLE_TMPFS_OPTIONS,
      },
    },
    Mounts: [],
  };
  assert.deepEqual(assertOracleContainerIsolation(detail), {
    bindOrVolumeMountCount: 0,
    mountCount: 1,
    networkMode: "none",
    passedEnvironmentNames: ["POSTGRES_HOST_AUTH_METHOD"],
    publishedPortCount: 0,
    tmpfsDestination: ORACLE_TMPFS_DESTINATION,
    tmpfsMountCount: 1,
    tmpfsOptions: ORACLE_TMPFS_OPTIONS,
  });

  const imageMutant = structuredClone(detail);
  imageMutant.Config.Image = "postgres:15";
  assert.throws(
    () => assertOracleContainerIsolation(imageMutant),
    new RegExp(ORACLE_MISMATCH_CLASSIFICATION, "u"),
  );
  for (const mutate of [
    (value) => { value.HostConfig.NetworkMode = "bridge"; },
    (value) => { value.HostConfig.PortBindings = { "5432/tcp": [{ HostPort: "5432" }] }; },
    (value) => { value.HostConfig.Tmpfs[ORACLE_TMPFS_DESTINATION] = "rw"; },
    (value) => { value.Mounts.push({ Type: "bind" }); },
    (value) => { value.Config.Env.push("GITHUB_TOKEN=forbidden"); },
  ]) {
    const mutant = structuredClone(detail);
    mutate(mutant);
    assert.throws(() => assertOracleContainerIsolation(mutant), /isolation is invalid/u);
  }
});
