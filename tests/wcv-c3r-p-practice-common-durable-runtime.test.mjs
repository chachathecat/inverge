import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

import {
  C3R_P_APPEND_PATH,
  createPracticeRuntimeArtifact,
  validatePracticeRuntimeArtifact,
} from "../scripts/automation/wcv-c3r-p-practice-common-runtime.mjs";

const root = path.resolve(import.meta.dirname, "..");
const contract = JSON.parse(fs.readFileSync(path.join(root,
  "config/dabangil-wcv-c3r-p-practice-common-durable-runtime-v1.json"), "utf8"));
const sql = fs.readFileSync(path.join(root, C3R_P_APPEND_PATH), "utf8");
const runtimeSource = fs.readFileSync(path.join(root,
  "scripts/automation/wcv-c3r-p-practice-common-runtime.mjs"), "utf8");
const serviceSource = fs.readFileSync(path.join(root, "lib/review-os/c3r-p-service.ts"), "utf8");
const engineSource = fs.readFileSync(path.join(root, "lib/review-os/c3r-p-engine.ts"), "utf8");
const routeSource = fs.readFileSync(path.join(root, "app/api/review-os/c3r-p/route.ts"), "utf8");
const componentSource = fs.readFileSync(path.join(root,
  "components/review-os/c3r-p-practice-loop.tsx"), "utf8");
const browserSource = fs.readFileSync(path.join(root,
  "tests/e2e/wcv-c3r-p-practice-common-runtime.spec.ts"), "utf8");

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function diskInventory() {
  return fs.readdirSync(path.join(root, "supabase/migrations"))
    .filter((name) => /^\d{8,14}_[a-z0-9_]+\.sql$/.test(name)).sort()
    .map((name) => ({
      path: `supabase/migrations/${name}`,
      sha256: sha256(Buffer.from(fs.readFileSync(
        path.join(root, "supabase/migrations", name), "utf8",
      ).replace(/\r\n/g, "\n"), "utf8")),
    }));
}

function sampleArtifact() {
  const inventory = diskInventory();
  const append = inventory.find((entry) => entry.path === C3R_P_APPEND_PATH);
  return createPracticeRuntimeArtifact({
    candidateHead: process.env.PR_HEAD_SHA?.toLowerCase() ?? "a".repeat(40),
    candidateTree: "b".repeat(40),
    migrationInventory: inventory,
    appendIdentity: { path: C3R_P_APPEND_PATH, gitBlob: "c".repeat(40), sha256: append.sha256 },
    resetReplayCycles: [1, 2].map((cycle) => ({
      cycle,
      receiptId: `receipt-${cycle}`,
      databaseIdentity: `database-${cycle}`,
      containerIdentity: `container-${cycle}`,
      volumeIdentity: `volume-${cycle}`,
      migrationCount: 26,
      serverVersionNum: 150008,
      browserToPostgres: true,
      restartRestore: true,
      exportDelete: true,
      oracleEvidenceSha256: String(cycle).repeat(64),
      cleanup: "complete",
    })),
    oracle: { status: "verified", serverVersionNum: 150008, cycleEvidenceCount: 2 },
    security: {
      rls: "enabled_and_forced",
      anonymous: "denied",
      authenticatedDirectMutation: "denied",
      crossUser: "denied_both_directions",
      serviceOnlyMutation: "verified",
      subjectIdentity: "PRACTICE_ONLY",
    },
  }, root);
}

test("C3R-P applies the exact seven operations and one 26th append", () => {
  const inventory = diskInventory();
  const binding = contract.migrationAuthorityBinding;
  assert.equal(inventory.length, 26);
  assert.deepEqual(Object.keys(binding).sort(), [
    "appendPath", "authorityContractSha256", "authorityDecisionSha256", "candidateSqlSha256",
    "effectiveInventorySha256", "operationBindings", "remoteMutationCount",
    "validatedAuthorityResultingMainSha", "validatedAuthorityResultingMainTree",
  ].sort());
  assert.equal(binding.operationBindings.length, 7);
  assert.equal(binding.appendPath, C3R_P_APPEND_PATH);
  assert.equal(binding.candidateSqlSha256,
    sha256(Buffer.from(sql.replace(/\r\n/g, "\n"), "utf8")));
  assert.equal(binding.effectiveInventorySha256,
    sha256(Buffer.from(canonicalJson(inventory), "utf8")));
  assert.ok(inventory.some((entry) => entry.path === C3R_P_APPEND_PATH && entry.sha256.length === 64));
  for (const [index, operation] of binding.operationBindings.entries()) {
    assert.deepEqual(Object.keys(operation).sort(), [
      "futureCanonicalUtf8LfSha256", "futureGitBlob", "futureRawSha256", "operationId",
    ].sort());
    const paths = contract.pathManifest.operationPaths[index];
    assert.equal(paths.operationId, operation.operationId);
    const bytes = fs.readFileSync(path.join(root, paths.futurePath));
    assert.equal(sha256(bytes), operation.futureRawSha256, operation.operationId);
    const blob = execFileSync("git", ["hash-object", "--stdin"], { cwd: root, input: bytes, encoding: "utf8" }).trim();
    assert.equal(blob, operation.futureGitBlob, operation.operationId);
    if (paths.currentPath !== paths.futurePath) {
      assert.equal(fs.existsSync(path.join(root, paths.currentPath)), false);
    }
  }
});

test("C3R-P preserves the immutable C3R-A0 authority artifacts byte-identically", () => {
  const a1 = JSON.parse(fs.readFileSync(path.join(root,
    "config/dabangil-wcv-c3r-a1-serial-program-authority-v1.json"), "utf8"));
  const bindings = a1.c3rA0ValidatedReceiptV1.immutableUpstreamBindings;
  const artifacts = [
    ["docs/decisions/2026-08-21-owner-wcv-c3r-a0-migration-dependency-authority.md", bindings.authorityDecision],
    ["config/dabangil-wcv-c3r-a0-migration-dependency-authority-v1.json", bindings.authorityManifest],
    ["scripts/automation/wcv-c3r-a0-migration-dependency-closure.mjs", bindings.analyzer],
    [bindings.focusedTest.ref, bindings.focusedTest],
  ];
  for (const [file, identity] of artifacts) {
    const bytes = fs.readFileSync(path.join(root, file));
    assert.equal(sha256(bytes), identity.sha256, file);
    assert.equal(execFileSync("git", ["hash-object", "--stdin"],
      { cwd: root, input: bytes, encoding: "utf8" }).trim(), identity.gitBlob, file);
  }
});

test("sole append closes subject, ownership, RLS, RPC, CAS and durable outcome boundaries", () => {
  assert.match(sql, /create type public\.c3r_p_subject as enum \('PRACTICE'\)/);
  assert.doesNotMatch(sql, /c3r_p_subject as enum \([^)]*(?:THEORY|LAW)/);
  for (const table of [
    "learning_records", "attempts", "learning_gaps", "failure_notes", "assistance_events",
    "ledger_entries", "plans", "plan_blocks", "command_receipts",
  ]) {
    assert.match(sql, new RegExp(`create table if not exists public\\.c3r_p_${table}`));
  }
  for (const marker of [
    "enable row level security", "force row level security",
    "revoke all on table", "grant select on table", "to service_role",
    "C3R_P_SERVICE_ROLE_REQUIRED", "C3R_P_IDEMPOTENCY_CONFLICT", "C3R_P_CAS_CONFLICT",
    "ASSISTED_SUCCESS", "D1_COMPLETE", "D7_COMPLETE", "RECURRENCE", "REOPENED",
    "c3r_p_restore_record_v1", "c3r_p_export_learner_data_v1", "c3r_p_delete_learner_data_v1",
  ]) assert.ok(sql.includes(marker), marker);
  assert.match(sql, /v_core_count > 3 or v_minutes > p_available_minutes/);
  assert.match(sql, /v_core_count > 3 or v_minutes > v_plan\.available_minutes/);
  assert.match(sql, /pg_constraint[\s\S]*c3r_p_learning_records_primary_gap_fk/);
  assert.match(sql, /drop policy if exists %I on public\.%I/);
  assert.match(sql, /p_action <> 'complete_d7_transfer'[\s\S]*C3R_P_ATTEMPT_ITEM_MISMATCH/);
  assert.match(sql, /c3r_p_attempts_record_binding_fk foreign key \(\s*user_id, record_id, source_id, problem_id, revision_id, artifact_id/);
  assert.match(sql, /'planId', p\.id[\s\S]*'blocks'[\s\S]*'dayComplete'/);
});

test("dedicated cycles start isolated Supabase first and transactionally apply all 26 migrations", () => {
  assert.match(runtimeSource, /c3r-p-migrations/);
  assert.match(runtimeSource, /\[storage\]\\nenabled = true/);
  const excludedServices = runtimeSource.slice(
    runtimeSource.indexOf("const EXCLUDED_SUPABASE_SERVICES"),
    runtimeSource.indexOf("];", runtimeSource.indexOf("const EXCLUDED_SUPABASE_SERVICES")) + 2,
  );
  assert.doesNotMatch(excludedServices, /storage-api/);
  assert.doesNotMatch(runtimeSource, /function installExternalMigrationSubstrate\(container\)/);
  assert.doesNotMatch(runtimeSource, /alter table storage\.objects enable row level security/);
  assert.match(runtimeSource, /function assertExternalMigrationSubstrate\(container\)/);
  assert.match(runtimeSource, /storage\.allow_only_operation\(text\)/);
  assert.match(runtimeSource, /storage\.allow_any_operation\(text\[\]\)/);
  assert.match(runtimeSource, /select relrowsecurity::text from pg_class/);
  assert.match(runtimeSource, /function applyExactMigrationHistory\(cycleRoot, container\)/);
  assert.match(runtimeSource, /names\.length !== 26/);
  assert.match(runtimeSource, /psql\(container, `begin;\\n\$\{sql\}\\ncommit;\\n`/);
  assert.match(runtimeSource, /notify pgrst, 'reload schema'/);
  assert.match(runtimeSource, /150008\|9\|PRACTICE\|f\|f\|t/);
  assert.match(runtimeSource, /150008\|9\|1\|1\|f\|f\|f\|t\|t\|postgres/);
  assert.match(runtimeSource, /append recovery reapplication/);
  assert.ok(
    runtimeSource.indexOf("assertExternalMigrationSubstrate(databaseContainer)") <
      runtimeSource.indexOf("applyExactMigrationHistory(cycleRoot, databaseContainer)"),
    "external Supabase substrate must be verified before exact-history replay",
  );
});

test("verified attempts bind to learner-entered structured values and server-rendered bodies", () => {
  assert.match(componentSource, /practiceClaim\(structuredCalculation\)/);
  assert.match(componentSource, /data-testid="c3r-p-gross-income"/);
  assert.match(componentSource, /data-testid="c3r-p-operating-expense"/);
  assert.match(componentSource, /data-testid="c3r-p-result"/);
  assert.doesNotMatch(componentSource, /function practiceClaim\(resultValue = 100_000_000\)/);
  assert.match(serviceSource, /attemptBody: proof\.canonicalSentence/g);
  assert.doesNotMatch(routeSource, /"attemptBody", "claim", "evidenceStep"/);
  assert.doesNotMatch(routeSource, /c3rPRequiredText\(row\.surfaceId/);
  assert.match(serviceSource, /surfaceId: input\.action === "complete_d7_transfer"[\s\S]*TRANSFER_SURFACE_ID[\s\S]*PRIMARY_SURFACE_ID/);
  assert.match(browserSource, /fillStructuredCalculation/);
});

test("plans and destructive-result UI are restored from successful server state", () => {
  assert.match(sql, /available_minutes between 30 and 720/);
  assert.match(sql, /C3R_P_FROZEN_CONFIGURATION_MISMATCH/);
  assert.match(serviceSource, /const FROZEN_CONFIGURATION = Object\.freeze/);
  assert.match(serviceSource, /configurationDigest: FROZEN_CONFIGURATION_DIGEST/g);
  assert.match(engineSource, /input\.availableMinutes < 30[\s\S]*input\.availableMinutes > 720/);
  assert.match(serviceSource, /const latestPlan = dashboard\.plans\.find/);
  assert.match(serviceSource, /\["REJECTED", "STALE"\]\.includes\(latestPlan\.state\)/);
  assert.match(serviceSource, /await repository\.decidePlan[\s\S]*return view\(null, asOf\)/);
  assert.match(componentSource, /const data = await request\(\{ action: "delete" \}\);\s*if \(!data\.ok\) return;/);
  assert.match(browserSource, /계획 상태: EDITED/);
  assert.match(browserSource, /temporarily_unavailable[\s\S]*c3r-p-ledger/);
});

test("PRACTICE_RUNTIME verifier reproduces every required binding", () => {
  const artifact = sampleArtifact();
  const verified = validatePracticeRuntimeArtifact(artifact, root);
  assert.deepEqual(Object.keys(verified), contract.practiceRuntimeArtifact.independentVerifierMustReproduce);
  assert.equal(verified.artifactRef, contract.practiceRuntimeArtifact.artifactRef);
  assert.deepEqual(verified.practiceEvidenceRefs, contract.practiceRuntimeArtifact.practiceEvidenceRefs);
  assert.equal(verified.perItemRuntimeEvidenceRefs.length,
    contract.practiceRuntimeArtifact.practiceEvidenceRefs.length);
});

test("PRACTICE_RUNTIME verifier rejects arbitrary, missing, unrelated and self-attested references", () => {
  const mutations = [
    (artifact) => { artifact.practiceEvidenceRefs[0] = "unrelated"; },
    (artifact) => { artifact.browserToPostgresEvidenceRef += "-self-attested"; },
    (artifact) => { artifact.perItemRuntimeEvidenceRefs[2].runtimeEvidenceRef = "nonexistent"; },
    (artifact) => { artifact.perItemRuntimeEvidenceRefs.pop(); },
    (artifact) => { artifact.candidateTree = "0".repeat(40); artifact.practiceEvidenceDigest = "0".repeat(64); },
    (artifact) => { artifact.resetReplayCycles[1].databaseIdentity = artifact.resetReplayCycles[0].databaseIdentity; },
  ];
  for (const mutate of mutations) {
    const artifact = clone(sampleArtifact());
    mutate(artifact);
    assert.throws(() => validatePracticeRuntimeArtifact(artifact, root));
  }
});

test("frozen path manifest is unique, package identity is unchanged, and candidate diff closes exactly", () => {
  const manifest = contract.pathManifest.changedPathsExactly;
  assert.equal(manifest.length, 37);
  assert.equal(new Set(manifest).size, manifest.length);
  for (const file of manifest) assert.equal(fs.existsSync(path.join(root, file)), true, file);
  assert.equal(execFileSync("git", ["hash-object", "package.json"], { cwd: root, encoding: "utf8" }).trim(),
    contract.packageIdentity.packageJsonGitBlob);
  assert.equal(execFileSync("git", ["hash-object", "package-lock.json"], { cwd: root, encoding: "utf8" }).trim(),
    contract.packageIdentity.packageLockJsonGitBlob);
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  const baseAvailable = spawnSync(
    "git", ["cat-file", "-e", `${contract.authority.baseSha}^{commit}`], { cwd: root },
  ).status === 0;
  if (head !== contract.authority.baseSha && baseAvailable) {
    const changed = execFileSync("git", ["diff", "--name-only", `${contract.authority.baseSha}...HEAD`],
      { cwd: root, encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean).sort();
    assert.deepEqual(changed, [...manifest].sort());
  } else if (head !== contract.authority.baseSha) {
    assert.equal(process.env.CI, "true", "the pinned base must exist outside a shallow CI checkout");
  }
});
