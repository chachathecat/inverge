import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  EXACT_LEDGER_ABSENT_FILES_V1,
  EXACT_REMOTE_LEDGER_RECORDS_V1,
  deriveA0BaselineInventoryDigest,
  deriveCheckpointClosureEvidence,
  deriveMigrationInventoryDigest,
  deriveReplayReceiptDigest,
  loadCurrentInventory,
  sha256,
  validateA2AuthorityContract,
  validateMigrationInventoryAuthorityV2,
} from "../scripts/automation/wcv-c3r-a2-migration-history-reconciliation.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contract = JSON.parse(await readFile(
  path.join(repositoryRoot, "config/dabangil-wcv-c3r-a2-migration-history-reconciliation-v1.json"),
  "utf8",
));
const a0Contract = JSON.parse(await readFile(
  path.join(repositoryRoot, "config/dabangil-wcv-c3r-a0-migration-dependency-authority-v1.json"),
  "utf8",
));
const a0Manifest = a0Contract.migrationHistoryCompatibilityManifestV1;
const prContractValidatorPath = path.join(repositoryRoot, "scripts/automation/validate-pr-contract.mjs");

function clone(value) {
  return structuredClone(value);
}

function gitBlob(bytes) {
  return createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
}

function fileSha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function completePrBody(referenceLines) {
  return `## Goal

C3R-A2 source-only append-aware migration history authority.

${referenceLines}

## Non-goals

No runtime, migration-file or remote mutation.

## Risk classification

- Risk: [high]

## Data boundary

Bodyless migration and schema metadata only.

## Schema / API / environment changes

None.

## Tests and evidence

Focused, affected and full source validation.

## Runtime evidence

Not applicable to this source-only authority.

## Rollout and rollback

Revert the source-only squash; no database rollback is authorized.

## Remaining risks

Every remote continuity path remains Owner-gated.

## Merge recommendation

- [ ] Auto-merge candidate
- [x] Human approval required
- [ ] Blocked
`;
}

async function runPrContract(body, pullRequestOverrides = {}) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "inverge-a2-contract-"));
  const eventPath = path.join(directory, "event.json");
  await writeFile(eventPath, JSON.stringify({
    repository: { full_name: "chachathecat/inverge" },
    pull_request: {
      body,
      title: "[WCV-C3R-A2] Install append-aware migration history reconciliation authority",
      base: { ref: "main", sha: "54afffcc539981ded65591f1f027171343bfce40" },
      head: {
        ref: "codex/wcv-c3r-a2-migration-history-reconciliation",
        repo: { full_name: "chachathecat/inverge" },
      },
      ...pullRequestOverrides,
    },
  }), "utf8");
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

async function checkpointFixture() {
  const sql = await loadCurrentInventory(repositoryRoot);
  const repairs = [];
  for (const filename of contract.c3rpAppendReceiptV1.requiredRepairPlanFilesExactly) {
    const plan = contract.migrationRecordReconciliationsV2.find((record) => record.currentFilename === filename);
    const originalSql = sql.get(filename);
    let nextSql = originalSql;
    const evidence = {};
    if (filename === "20260608_create_personal_learning_states.sql") {
      nextSql = originalSql.replace(/\r\n?/gu, "\n").replace(
        /  with recursive walk\(key, child\) as \(\n[\s\S]*?\n  \)\n  (?=select exists)/u,
        `  with recursive walk(key, child) as (
    select null::text as key, value as child
    union all
    select expanded.key, expanded.child
    from walk
    cross join lateral (
      select entries.key, entries.value as child
      from jsonb_each(
        case when jsonb_typeof(walk.child) = 'object' then walk.child else '{}'::jsonb end
      ) as entries(key, value)
      union all
      select null::text as key, elements.value as child
      from jsonb_array_elements(
        case when jsonb_typeof(walk.child) = 'array' then walk.child else '[]'::jsonb end
      ) as elements(value)
    ) as expanded(key, child)
  )
  `,
      );
      evidence.resolvedFailureCode = "42P19";
      evidence.recursiveTermCount = 1;
    }
    if (filename === "202606232130_personal_concept_graph_rpc_only_write_boundary.sql") {
      nextSql = `-- Compatibility-safe early boundary fixture.
revoke insert, update on table public.personal_concept_nodes from authenticated;
grant select, delete on table public.personal_concept_nodes to authenticated;
drop policy if exists "personal_concept_nodes_insert_own" on public.personal_concept_nodes;
drop policy if exists "personal_concept_nodes_update_own" on public.personal_concept_nodes;
`;
      evidence.compatibilitySafeBeforeProducer = true;
      evidence.unsafeGrantBeforeProducer = false;
    }
    sql.delete(filename);
    sql.set(plan.proposedCanonicalFilename, nextSql);
    repairs.push({
      receiptId: `repair:${filename}`,
      receiptType: "MigrationRepairReceiptV2",
      a2AuthorityId: contract.contractId,
      fromFilename: filename,
      toFilename: plan.proposedCanonicalFilename,
      fromSqlDigest: plan.currentSqlDigest,
      toSqlDigest: sha256(nextSql.replace(/\r\n?/gu, "\n")),
      sourceTreatment: plan.sourceTreatment,
      filenameTreatment: plan.filenameTreatment,
      exactFreshHistoryOrder: plan.exactProposedFreshHistoryOrder,
      implementationEvidence: evidence,
      exactHeadEvidence: true,
      remoteMutationAuthorized: false,
    });
  }
  const appendSql = `-- Sole C3R-P durable-learning and boundary-finalization fixture.
create table if not exists public.c3r_p_learning_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  metadata jsonb not null default '{}'::jsonb
);
alter table public.c3r_p_learning_documents enable row level security;
alter table public.c3r_p_learning_documents force row level security;
create policy "c3r_p_learning_documents_select_own"
  on public.c3r_p_learning_documents for select to authenticated
  using (auth.uid() is not null and user_id = auth.uid());
create or replace function public.c3r_p_append_learning_document_v1(p_document_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp
as $$ begin perform 1; end $$;
revoke execute on function public.c3r_p_append_learning_document_v1(uuid) from public, anon;
grant execute on function public.c3r_p_append_learning_document_v1(uuid) to authenticated;
revoke execute on function public.transition_personal_concept_node_v1(
  text, text, text, text, text, text, text, text, integer, timestamptz
) from public, anon;
grant execute on function public.transition_personal_concept_node_v1(
  text, text, text, text, text, text, text, text, integer, timestamptz
) to authenticated;
`;
  const append = {
    receiptId: "c3r-p-append:test",
    receiptType: "C3RPAppendReceiptV1",
    a2AuthorityId: contract.contractId,
    purposeExactly: contract.c3rpAppendReceiptV1.requiredPurposeExactly,
    version: "20260821170000",
    filename: "20260821170000_c3r_p_durable_learning_and_boundary.sql",
    sqlDigest: sha256(appendSql),
    dependencyPredecessors: contract.c3rpAppendReceiptV1.requiredDependencyPredecessorsExactly,
    candidateHeadSha: "1".repeat(40),
    candidateTreeSha: "2".repeat(40),
    exactHeadCentralEvidence: true,
    centralEvidenceArtifactSha256: sha256("central-evidence"),
    exactHeadDedicatedRuntimeEvidence: true,
    dedicatedRuntimeEvidenceArtifactSha256: sha256("dedicated-runtime-evidence"),
    remoteApplicationAuthorized: false,
    migrationHistoryRepairAuthorized: false,
  };
  append.candidateHeadTreeBinding = sha256(`${append.candidateHeadSha}:${append.candidateTreeSha}`);
  sql.set(append.filename, appendSql);
  append.migrationInventoryDigest = deriveMigrationInventoryDigest(sql);
  append.migrationInventoryCount = sql.size;
  append.migrationSensitivePathClosure = contract.c3rpAppendReceiptV1.requiredMigrationSensitivePathClosureExactly
    .map((entry) => entry.replace("<C3R_P_APPEND_FILENAME>", append.filename));
  append.migrationSensitivePathClosureDigest = sha256(JSON.stringify(append.migrationSensitivePathClosure));
  const closure = deriveCheckpointClosureEvidence(contract, a0Manifest, sql, repairs, append);
  append.dependencyClosureDigest = closure.dependencyClosureDigest;
  append.schemaRpcRlsObjectInventory = closure.schemaRpcRlsObjectInventory;
  append.schemaRpcRlsObjectInventoryDigest = closure.schemaRpcRlsObjectInventoryDigest;
  append.isolatedReplayReceipts = [1, 2].map((cycle) => {
    const receipt = {
      receiptId: `replay-${cycle}`,
      receiptType: "SupabaseIsolatedMigrationReplayReceiptV1",
      cycle,
      engine: "EXACT_ISOLATED_SUPABASE_RESET_REPLAY",
      candidateHeadSha: append.candidateHeadSha,
      candidateTreeSha: append.candidateTreeSha,
      migrationInventoryDigest: append.migrationInventoryDigest,
      dependencyClosureDigest: append.dependencyClosureDigest,
      executedMigrationCount: sql.size,
      executionOutputDigest: sha256(`execution-output-${cycle}`),
      schemaStateDigest: sha256(`schema-state-${cycle}`),
      isolatedEnvironmentFingerprint: sha256(`isolated-environment-${cycle}`),
      startedAtUtc: `2026-08-21T0${cycle}:00:00.000Z`,
      finishedAtUtc: `2026-08-21T0${cycle}:05:00.000Z`,
      freshDatabase: true,
      linkedRemote: false,
      success: true,
      remoteMutationCount: 0,
      learnerPrivateBodyCount: 0,
    };
    receipt.receiptDigest = deriveReplayReceiptDigest(receipt);
    return receipt;
  });
  return { sql, repairs, append };
}

function rebindAppendFixture(fixture) {
  const appendSql = fixture.sql.get(fixture.append.filename);
  fixture.append.sqlDigest = sha256(appendSql);
  fixture.append.migrationInventoryDigest = deriveMigrationInventoryDigest(fixture.sql);
  fixture.append.migrationInventoryCount = fixture.sql.size;
  const closure = deriveCheckpointClosureEvidence(
    contract,
    a0Manifest,
    fixture.sql,
    fixture.repairs,
    fixture.append,
  );
  fixture.append.dependencyClosureDigest = closure.dependencyClosureDigest;
  fixture.append.schemaRpcRlsObjectInventory = closure.schemaRpcRlsObjectInventory;
  fixture.append.schemaRpcRlsObjectInventoryDigest = closure.schemaRpcRlsObjectInventoryDigest;
  for (const replay of fixture.append.isolatedReplayReceipts) {
    replay.migrationInventoryDigest = fixture.append.migrationInventoryDigest;
    replay.dependencyClosureDigest = fixture.append.dependencyClosureDigest;
    replay.executedMigrationCount = fixture.sql.size;
    replay.receiptDigest = deriveReplayReceiptDigest(replay);
  }
}

test("A2 contract validates as the current append-aware source authority", () => {
  assert.deepEqual(validateA2AuthorityContract(contract, a0Manifest), []);
});

test("original PR #785 receipt remains exact historical truth", () => {
  assert.equal(contract.a0HistoricalReceiptV1.pullRequest, 785);
  assert.equal(contract.a0HistoricalReceiptV1.reviewedHead, "f7f959368525f8a5895026f1361f6e13fd6226e0");
  assert.deepEqual(contract.a0HistoricalReceiptV1.actionableCounts, { p0: 0, p1: 0, p2: 0 });
  assert.equal(contract.a0HistoricalReceiptV1.unresolvedActionableThreads, 0);
});

test("original A0 decision manifest analyzer and focused test blobs remain exact", async () => {
  for (const binding of Object.values(contract.a0HistoricalReceiptV1.immutableArtifacts)) {
    const bytes = await readFile(path.join(repositoryRoot, binding.ref));
    assert.equal(gitBlob(bytes), binding.gitBlob, binding.ref);
    assert.equal(fileSha256(bytes), binding.sha256, binding.ref);
  }
});

test("original 25-file A0 inventory remains an immutable baseline", () => {
  assert.equal(contract.a0HistoricalReceiptV1.baselineInventoryFilesExactly.length, 25);
  assert.equal(contract.a0HistoricalReceiptV1.baselineInventoryDigestAlgorithm, "SHA256_UTF8_CANONICAL_JSON_V1");
  assert.match(contract.a0HistoricalReceiptV1.baselineInventoryDigestPreimageDomain, /exactDependencyPredecessors,freshHistoryOrder/);
  assert.equal(deriveA0BaselineInventoryDigest(a0Manifest), contract.a0HistoricalReceiptV1.baselineInventoryDigest);
});

test("PR #786 and A1 artifacts remain an immutable serial-program receipt", async () => {
  assert.equal(contract.a1HistoricalProgramReceiptV1.pullRequest, 786);
  assert.equal(contract.a1HistoricalProgramReceiptV1.reviewedHead, "ff9dfbebea182d647daa84a349fcc50610f0ed1b");
  assert.deepEqual(contract.a1HistoricalProgramReceiptV1.strictStageOrder, ["C3R-P", "C3R-T", "C3R-L"]);
  for (const binding of Object.values(contract.a1HistoricalProgramReceiptV1.immutableArtifacts)) {
    const bytes = await readFile(path.join(repositoryRoot, binding.ref));
    assert.equal(gitBlob(bytes), binding.gitBlob, binding.ref);
    assert.equal(fileSha256(bytes), binding.sha256, binding.ref);
  }
});

test("A2 and not A0 is current append-aware migration authority", () => {
  assert.equal(contract.authority.narrowlySupersedesA0LiveCurrentExact25Forever, true);
  assert.equal(contract.a0HistoricalReceiptV1.soleLiveCurrentInventoryAuthorityAfterA2, false);
  assert.equal(contract.migrationInventoryAuthorityV2.authorityType, "MigrationInventoryAuthorityV2");
});

test("exact remote ledger contains 15 ordered records", () => {
  assert.deepEqual(contract.remoteMigrationLedgerReceiptV1.orderedRecords, EXACT_REMOTE_LEDGER_RECORDS_V1);
  assert.equal(contract.remoteMigrationLedgerReceiptV1.exactCount, 15);
  assert.equal(contract.remoteMigrationLedgerReceiptV1.receiptDigest, "45bcc29f8a21eb53e153e6d106250883ae843daa1057869390fd92cabc2a35c4");
});

test("exact ledger-absent set contains the ten listed files", () => {
  assert.deepEqual(
    contract.migrationRecordReconciliationsV2.filter((record) => record.ledgerStatus === "LEDGER_ABSENT").map((record) => record.currentFilename),
    EXACT_LEDGER_ABSENT_FILES_V1,
  );
});

test("schema presence cannot create a ledger-applied status", () => {
  const candidate = clone(contract);
  candidate.migrationRecordReconciliationsV2.find((record) => record.currentFilename === "20260615_legal_grounding.sql").ledgerStatus = "LEDGER_APPLIED";
  assert.ok(validateA2AuthorityContract(candidate, a0Manifest).some((error) => error.startsWith("LEDGER_CLASSIFICATION_")));
});

test("ledger absence cannot create a schema-absent status", () => {
  const candidate = clone(contract);
  candidate.migrationRecordReconciliationsV2.find((record) => record.currentFilename === "20260615_legal_grounding.sql").schemaStatus = "SCHEMA_ABSENT";
  assert.ok(validateA2AuthorityContract(candidate, a0Manifest).includes("SCHEMA_CLASSIFICATION_DISTRIBUTION"));
});

test("legal object presence does not establish exact migration equivalence", () => {
  assert.equal(contract.remoteSchemaMetadataReceiptV1.objectPresenceEstablishesMigrationEquivalence, false);
  assert.equal(contract.migrationRecordReconciliationsV2.filter((record) => record.currentFilename.includes("legal_")).every((record) => record.schemaStatus === "SCHEMA_PRESENT_UNVERIFIED"), true);
  assert.equal(contract.migrationRecordReconciliationsV2.some((record) => record.schemaStatus === "SCHEMA_MATCH_VERIFIED"), false);
});

test("personal_learning_states is ledger-absent and schema-absent", () => {
  const record = contract.migrationRecordReconciliationsV2.find((entry) => entry.currentFilename === "20260608_create_personal_learning_states.sql");
  assert.equal(record.ledgerStatus, "LEDGER_ABSENT");
  assert.equal(record.schemaStatus, "SCHEMA_ABSENT");
});

test("20260608 remains blocked on the exact 42P19 repair", () => {
  const record = contract.migrationRecordReconciliationsV2.find((entry) => entry.currentFilename === "20260608_create_personal_learning_states.sql");
  assert.equal(record.proposedCanonicalFilename, "20260608090000_create_personal_learning_states.sql");
  assert.deepEqual(record.freshHistoryStatus, {
    syntax: "FAIL",
    dependencyOrder: "UNVERIFIED",
    exactFailureCode: "42P19",
    exactFailureClass: "INVALID_RECURSION_MULTIPLE_RECURSIVE_TERMS",
    exactRepairRequirement: "REPLACE_WITH_ONE_POSTGRESQL_VALID_RECURSIVE_STRUCTURE_PRESERVING_RESULT_AND_RLS_BOUNDARY_THEN_PROVE_TWO_EXACT_ISOLATED_SUPABASE_REPLAYS",
  });
});

test("the four 20260615 duplicates require unique canonical versions", () => {
  const legal = contract.exactReconciliationDecisions.legalFamily.canonicalOrderExactly;
  assert.equal(new Set(legal.map((filename) => filename.slice(0, 14))).size, 5);
  assert.equal(legal.every((filename) => /^\d{14}_/u.test(filename)), true);
});

test("legal canonical order is producer identity retrieval guard grant", () => {
  assert.deepEqual(contract.exactReconciliationDecisions.legalFamily.canonicalOrderExactly, [
    "20260615090000_legal_grounding.sql",
    "20260615100000_legal_article_chunk_identity.sql",
    "20260615110000_legal_retrieval.sql",
    "20260615120000_legal_grounding_guard.sql",
    "20260616100000_legal_grounding_guard_service_role_grant.sql",
  ]);
});

test("applied concept-graph versions cannot be silently renamed", () => {
  const [atomic, boundary] = ["20260623_personal_concept_graph_atomic_transition.sql", "202606232130_personal_concept_graph_rpc_only_write_boundary.sql"].map((filename) => contract.migrationRecordReconciliationsV2.find((record) => record.currentFilename === filename));
  assert.equal(atomic.proposedCanonicalFilename, atomic.currentFilename);
  assert.equal(boundary.proposedCanonicalFilename, boundary.currentFilename);
  assert.deepEqual(contract.exactReconciliationDecisions.conceptGraph.appliedVersionsPreservedExactly, ["20260623", "202606232130"]);
});

test("fresh replay requires compatibility boundary then producer then finalization", () => {
  const boundary = contract.migrationRecordReconciliationsV2.find((record) => record.currentFilename.startsWith("202606232130_"));
  const atomic = contract.migrationRecordReconciliationsV2.find((record) => record.currentFilename.startsWith("20260623_"));
  assert.ok(boundary.exactProposedFreshHistoryOrder < atomic.exactProposedFreshHistoryOrder);
  assert.equal(contract.exactReconciliationDecisions.conceptGraph.forwardBoundaryAppendRequired, true);
});

test("compatibility step and durable forward boundary share the sole append", () => {
  assert.equal(contract.exactReconciliationDecisions.conceptGraph.forwardBoundaryAndDurableLearningMustShareSoleC3rPAppend, true);
  assert.deepEqual(contract.c3rpAppendReceiptV1.requiredPurposeExactly, ["CONCEPT_GRAPH_RPC_BOUNDARY_FORWARD_REASSERTION", "C3R_P_DURABLE_LEARNING_SCHEMA_RPC_RLS"]);
  assert.equal(contract.c3rpAppendReceiptV1.exactlyOneNewMigrationAllowed, true);
});

test("an unregistered extra migration fails", async () => {
  const sql = await loadCurrentInventory(repositoryRoot);
  sql.set("20260821999999_extra.sql", "select 1;\n");
  assert.ok(validateMigrationInventoryAuthorityV2(contract, a0Manifest, sql).some((error) => error.startsWith("LIVE_UNREGISTERED_")));
});

test("an unauthorized missing migration fails", async () => {
  const sql = await loadCurrentInventory(repositoryRoot);
  sql.delete(a0Manifest.records[0].currentFilename);
  assert.ok(validateMigrationInventoryAuthorityV2(contract, a0Manifest, sql).some((error) => error.startsWith("LIVE_MISSING_")));
});

test("an unauthorized rename fails", async () => {
  const sql = await loadCurrentInventory(repositoryRoot);
  const source = a0Manifest.records[0].currentFilename;
  sql.set(`99999999999999_${source}`, sql.get(source));
  sql.delete(source);
  const errors = validateMigrationInventoryAuthorityV2(contract, a0Manifest, sql);
  assert.ok(errors.some((error) => error.startsWith("LIVE_MISSING_")));
  assert.ok(errors.some((error) => error.startsWith("LIVE_UNREGISTERED_")));
});

test("an unauthorized SQL-content change fails", async () => {
  const sql = await loadCurrentInventory(repositoryRoot);
  const source = a0Manifest.records[0].currentFilename;
  sql.set(source, `${sql.get(source)}\n-- mutation\n`);
  assert.ok(validateMigrationInventoryAuthorityV2(contract, a0Manifest, sql).includes(`LIVE_DIGEST_${source}`));
});

test("a duplicate append version fails", async () => {
  const fixture = await checkpointFixture();
  fixture.sql.delete(fixture.append.filename);
  fixture.append.version = "20260817170000";
  fixture.append.filename = "20260817170000_duplicate.sql";
  const appendSql = "select 1;\n";
  fixture.append.sqlDigest = sha256(appendSql);
  fixture.sql.set(fixture.append.filename, appendSql);
  assert.notDeepEqual(validateMigrationInventoryAuthorityV2(contract, a0Manifest, fixture.sql, { repairReceipts: fixture.repairs, appendReceipts: [fixture.append] }), []);
});

test("an append without C3RPAppendReceiptV1 fails", async () => {
  const sql = await loadCurrentInventory(repositoryRoot);
  sql.set("20260821170000_unregistered.sql", "select 1;\n");
  assert.notDeepEqual(validateMigrationInventoryAuthorityV2(contract, a0Manifest, sql), []);
});

test("a receipt with the wrong SQL digest fails", async () => {
  const fixture = await checkpointFixture();
  fixture.append.sqlDigest = "0".repeat(64);
  assert.notDeepEqual(validateMigrationInventoryAuthorityV2(contract, a0Manifest, fixture.sql, { repairReceipts: fixture.repairs, appendReceipts: [fixture.append] }), []);
});

test("a receipt missing one predecessor fails", async () => {
  const fixture = await checkpointFixture();
  fixture.append.dependencyPredecessors = fixture.append.dependencyPredecessors.slice(1);
  assert.ok(validateMigrationInventoryAuthorityV2(contract, a0Manifest, fixture.sql, { repairReceipts: fixture.repairs, appendReceipts: [fixture.append] }).some((error) => error.startsWith("APPEND_RECEIPT_")));
});

test("one replay cycle cannot satisfy the two-cycle gate", async () => {
  const fixture = await checkpointFixture();
  fixture.append.isolatedReplayReceipts.pop();
  assert.notDeepEqual(validateMigrationInventoryAuthorityV2(contract, a0Manifest, fixture.sql, { repairReceipts: fixture.repairs, appendReceipts: [fixture.append] }), []);
});

test("diagnostic embedded PostgreSQL cannot satisfy exact Supabase replay", async () => {
  const fixture = await checkpointFixture();
  fixture.append.isolatedReplayReceipts[0].engine = "EMBEDDED_POSTGRES_DIAGNOSTIC";
  assert.notDeepEqual(validateMigrationInventoryAuthorityV2(contract, a0Manifest, fixture.sql, { repairReceipts: fixture.repairs, appendReceipts: [fixture.append] }), []);
});

test("replay receipts cannot be copied from another head even with a recomputed receipt digest", async () => {
  const fixture = await checkpointFixture();
  const replay = fixture.append.isolatedReplayReceipts[0];
  replay.candidateHeadSha = "3".repeat(40);
  replay.receiptDigest = deriveReplayReceiptDigest(replay);
  assert.ok(validateMigrationInventoryAuthorityV2(contract, a0Manifest, fixture.sql, { repairReceipts: fixture.repairs, appendReceipts: [fixture.append] }).includes("APPEND_REPLAY_RECEIPTS"));
});

test("empty migration path closure and schema RPC RLS inventory fail", async () => {
  const pathFixture = await checkpointFixture();
  pathFixture.append.migrationSensitivePathClosure = [];
  pathFixture.append.migrationSensitivePathClosureDigest = sha256("[]");
  assert.ok(validateMigrationInventoryAuthorityV2(contract, a0Manifest, pathFixture.sql, { repairReceipts: pathFixture.repairs, appendReceipts: [pathFixture.append] }).some((error) => error.startsWith("APPEND_RECEIPT_")));

  const schemaFixture = await checkpointFixture();
  schemaFixture.append.schemaRpcRlsObjectInventory = [];
  schemaFixture.append.schemaRpcRlsObjectInventoryDigest = sha256("[]");
  assert.ok(validateMigrationInventoryAuthorityV2(contract, a0Manifest, schemaFixture.sql, { repairReceipts: schemaFixture.repairs, appendReceipts: [schemaFixture.append] }).some((error) => error.startsWith("APPEND_RECEIPT_")));
});

test("append authority lists purposeExactly as a required receipt field", () => {
  assert.ok(contract.c3rpAppendReceiptV1.requiredFieldsExactly.includes("purposeExactly"));
  const mutated = structuredClone(contract);
  mutated.c3rpAppendReceiptV1.requiredFieldsExactly = mutated.c3rpAppendReceiptV1.requiredFieldsExactly
    .filter((field) => field !== "purposeExactly");
  assert.ok(validateA2AuthorityContract(mutated, a0Manifest).includes("APPEND_REQUIRED_FIELDS"));
});

test("ordinary RLS enable without FORCE ROW LEVEL SECURITY fails", async () => {
  const fixture = await checkpointFixture();
  const appendSql = fixture.sql.get(fixture.append.filename)
    .replace("alter table public.c3r_p_learning_documents force row level security;\n", "");
  fixture.sql.set(fixture.append.filename, appendSql);
  rebindAppendFixture(fixture);
  assert.ok(validateMigrationInventoryAuthorityV2(contract, a0Manifest, fixture.sql, { repairReceipts: fixture.repairs, appendReceipts: [fixture.append] }).includes("APPEND_FORCED_RLS_BOUNDARY"));
});

test("concept RPC boundary requires the exact function signature and safe grantees", async () => {
  const fixture = await checkpointFixture();
  const appendSql = fixture.sql.get(fixture.append.filename).replace(
    /(grant\s+execute\s+on\s+function\s+public\.transition_personal_concept_node_v1\([\s\S]*?\)\s+to\s+)authenticated;/u,
    "$1public;",
  );
  fixture.sql.set(fixture.append.filename, appendSql);
  rebindAppendFixture(fixture);
  assert.ok(validateMigrationInventoryAuthorityV2(contract, a0Manifest, fixture.sql, { repairReceipts: fixture.repairs, appendReceipts: [fixture.append] }).includes("APPEND_EXACT_CONCEPT_RPC_BOUNDARY"));
});

test("commented boundary SQL cannot satisfy forced RLS or exact RPC evidence", async () => {
  const fixture = await checkpointFixture();
  const appendSql = fixture.sql.get(fixture.append.filename)
    .replace("alter table public.c3r_p_learning_documents force row level security;", "-- alter table public.c3r_p_learning_documents force row level security;")
    .replace(
      /(grant\s+execute\s+on\s+function\s+public\.transition_personal_concept_node_v1\([\s\S]*?\)\s+to\s+)authenticated;/u,
      "$1public;\n/* grant execute on function public.transition_personal_concept_node_v1(text, text, text, text, text, text, text, text, integer, timestamptz) to authenticated; */",
    );
  fixture.sql.set(fixture.append.filename, appendSql);
  rebindAppendFixture(fixture);
  const errors = validateMigrationInventoryAuthorityV2(contract, a0Manifest, fixture.sql, { repairReceipts: fixture.repairs, appendReceipts: [fixture.append] });
  assert.ok(errors.includes("APPEND_FORCED_RLS_BOUNDARY"));
  assert.ok(errors.includes("APPEND_EXACT_CONCEPT_RPC_BOUNDARY"));
});

test("comment-only checkpoint changes cannot bypass A0 consumer-before-producer closure", async () => {
  const fixture = await checkpointFixture();
  const boundary = "202606232130_personal_concept_graph_rpc_only_write_boundary.sql";
  const current = await loadCurrentInventory(repositoryRoot);
  const unsafeSql = `${current.get(boundary)}\n-- forged compatibility claim only\n`;
  fixture.sql.set(boundary, unsafeSql);
  const repair = fixture.repairs.find((entry) => entry.fromFilename === boundary);
  repair.toSqlDigest = sha256(unsafeSql.replace(/\r\n?/gu, "\n"));
  fixture.append.migrationInventoryDigest = deriveMigrationInventoryDigest(fixture.sql);
  for (const replay of fixture.append.isolatedReplayReceipts) {
    replay.migrationInventoryDigest = fixture.append.migrationInventoryDigest;
    replay.receiptDigest = deriveReplayReceiptDigest(replay);
  }
  const errors = validateMigrationInventoryAuthorityV2(contract, a0Manifest, fixture.sql, { repairReceipts: fixture.repairs, appendReceipts: [fixture.append] });
  assert.ok(errors.some((error) => error.startsWith("CHECKPOINT_DEPENDENCY_CLOSURE_")), errors.join(","));
});

test("remote migration repair remains unauthorized", () => {
  assert.equal(contract.activationBoundary.remoteMigrationHistoryRepairAuthorized, false);
  assert.equal(contract.c3rpAppendReceiptV1.automaticHistoryRepairAuthority, false);
});

test("remote db push remains unauthorized", () => {
  assert.equal(contract.activationBoundary.remoteDbPushAuthorized, false);
});

test("linked reset remains unauthorized", () => {
  assert.equal(contract.activationBoundary.linkedResetAuthorized, false);
});

test("remote SQL mutation remains unauthorized", () => {
  assert.equal(contract.activationBoundary.remoteSqlMutationAuthorized, false);
  assert.equal(contract.remoteMigrationLedgerReceiptV1.remoteMutationCount, 0);
  assert.equal(contract.remoteSchemaMetadataReceiptV1.remoteMutationCount, 0);
});

test("issue state cannot substitute for A2 merge receipt", () => {
  assert.equal(contract.serialProgram.issueStateMaySubstituteForA2Receipt, false);
});

test("an unmerged A2 PR cannot satisfy C3R-P", () => {
  assert.equal(contract.serialProgram.unmergedA2PrMaySubstituteForA2Receipt, false);
  assert.match(contract.authority.repositoryAuthorityEffectiveOn, /EXPECTED_HEAD_PINNED_SQUASH_MERGE/u);
});

test("C3R-P remains dependency-ready and unstarted", () => {
  assert.deepEqual(contract.serialProgram.c3rPRequiresValidatedReceipts, ["C3R-A0", "C3R-A1", "C3R-A2"]);
  assert.equal(contract.serialProgram.c3rPState, "dependency_ready_unstarted_after_validated_a2_receipt");
  assert.equal(contract.activationBoundary.successorRuntimeStarted, 0);
});

test("C3R-T and C3R-L remain blocked", () => {
  assert.equal(contract.serialProgram.c3rTState, "blocked_on_validated_c3r_p_receipt");
  assert.equal(contract.serialProgram.c3rLState, "blocked_on_validated_c3r_p_and_c3r_t_receipts");
});

test("WCV-C3 remains incomplete", () => {
  assert.equal(contract.serialProgram.wcvC3State, "incomplete");
});

test("Production payment provider and learner activation remain zero", () => {
  for (const field of ["productionAuthorized", "paymentAuthorized", "providerAuthorized", "learnerActivationAuthorized", "runtimeImplementationAuthorized"]) {
    assert.equal(contract.activationBoundary[field], false, field);
  }
});

test("raw learner rows answer OCR private notes and secrets are absent", () => {
  assert.equal(contract.remoteMigrationLedgerReceiptV1.learnerPrivateBodyCount, 0);
  assert.equal(contract.remoteSchemaMetadataReceiptV1.learnerPrivateBodyCount, 0);
  assert.equal(contract.remoteSchemaMetadataReceiptV1.secretCount, 0);
  assert.doesNotMatch(JSON.stringify(contract.remoteSchemaMetadataReceiptV1), /raw answer|ocr text|private note|service_role|password/iu);
});

test("A0 historical test is explicitly registered but not default-executed", async () => {
  const runner = await readFile(path.join(repositoryRoot, "scripts/run-node-tests.mjs"), "utf8");
  assert.equal(runner.match(/tests\/wcv-c3r-a0-migration-dependency-authority\.test\.mjs/gu)?.length, 1);
  assert.match(runner, /const HISTORICAL_ONLY_TESTS/u);
  assert.equal(contract.a0HistoricalTestTransition.activeDefaultExecution, false);
  assert.equal(contract.a0HistoricalTestTransition.silentlySkipped, false);
});

test("all 37 A0 invariants have an exact A2 historical coverage map", async () => {
  const source = await readFile(path.join(repositoryRoot, contract.a0HistoricalTestTransition.immutableTestRef), "utf8");
  const names = [...source.matchAll(/^test\("([^"]+)"/gmu)].map((match) => match[1]);
  assert.equal(names.length, 37);
  assert.deepEqual(contract.a0HistoricalTestTransition.coveredHistoricalTestNamesExactly, names);
  assert.equal(contract.a0HistoricalTestTransition.coveredInvariantFamiliesExactly.includes("DEPENDENCY"), true);
  assert.equal(contract.a0HistoricalTestTransition.coveredInvariantFamiliesExactly.includes("OCCURRENCE"), true);
});

test("A0 dependency identifier extension and external-function closure replays on the frozen baseline", async () => {
  const sql = await loadCurrentInventory(repositoryRoot);
  assert.deepEqual(validateMigrationInventoryAuthorityV2(contract, a0Manifest, sql), []);
});

test("C3R-P cannot append a second migration", async () => {
  const fixture = await checkpointFixture();
  const second = clone(fixture.append);
  second.receiptId = "c3r-p-append:second";
  second.version = "20260821180000";
  second.filename = "20260821180000_second.sql";
  const secondSql = "select 2;\n";
  second.sqlDigest = sha256(secondSql);
  fixture.sql.set(second.filename, secondSql);
  assert.ok(validateMigrationInventoryAuthorityV2(contract, a0Manifest, fixture.sql, { repairReceipts: fixture.repairs, appendReceipts: [fixture.append, second] }).includes("APPEND_COUNT_EXCEEDS_ONE"));
});

test("one exact repair checkpoint and sole append receipt validate", async () => {
  const fixture = await checkpointFixture();
  assert.deepEqual(validateMigrationInventoryAuthorityV2(contract, a0Manifest, fixture.sql, { repairReceipts: fixture.repairs, appendReceipts: [fixture.append] }), []);
});

test("A2 exact PR accepts five references while preserving issues open and P unstarted", async () => {
  const links = [...contract.deliveryControl.referenceOnlyIssueLinks.requiredReferenceLinesExactly, contract.deliveryControl.referenceOnlyIssueLinks.requiredDispositionLine].join("\n");
  const result = await runPrContract(completePrBody(links));
  assert.equal(result.status, 0, result.stderr);
});

test("A2 reference-only exception rejects closure omission extras and fork replay", async () => {
  const exact = [...contract.deliveryControl.referenceOnlyIssueLinks.requiredReferenceLinesExactly, contract.deliveryControl.referenceOnlyIssueLinks.requiredDispositionLine];
  const cases = [
    { lines: [...exact, "Closes #781"] },
    { lines: exact.filter((line) => line !== "Refs #708") },
    { lines: [...exact, "Refs #999"] },
    { lines: exact, overrides: { title: "Unrelated authority" } },
    { lines: exact, overrides: { head: { ref: "codex/wcv-c3r-a2-migration-history-reconciliation", repo: { full_name: "attacker/inverge" } } } },
  ];
  for (const candidate of cases) {
    const result = await runPrContract(completePrBody(candidate.lines.join("\n")), candidate.overrides);
    assert.notEqual(result.status, 0, JSON.stringify(candidate));
  }
});

test("all current authority mirrors expose A2 and dependency-ready unstarted C3R-P", async () => {
  const [agents, roadmap, unifiedMarkdown, masterRoadmap, unified] = await Promise.all([
    readFile(path.join(repositoryRoot, "AGENTS.md"), "utf8"),
    readFile(path.join(repositoryRoot, "roadmap/active-program.yml"), "utf8"),
    readFile(path.join(repositoryRoot, "docs/dabangil-unified-program-contract.md"), "utf8"),
    readFile(path.join(repositoryRoot, "docs/inverge-master-roadmap.md"), "utf8"),
    readFile(path.join(repositoryRoot, "config/dabangil-unified-program-contract.json"), "utf8").then(JSON.parse),
  ]);
  const decision = "docs/decisions/2026-08-21-owner-wcv-c3r-a2-migration-history-reconciliation.md";
  for (const text of [agents, roadmap, unifiedMarkdown, masterRoadmap]) {
    assert.match(text, /C3R-A2/u);
    assert.match(text, /C3R-P/u);
  }
  assert.ok(agents.indexOf(decision) < agents.indexOf("docs/decisions/2026-08-21-owner-wcv-c3r-a1-serial-program-authority.md"));
  assert.match(roadmap, /c3rPStartRequiresValidatedStageReceipts: \[C3R-A0, C3R-A1, C3R-A2\]/u);
  assert.equal(unified.c3MigrationHistoryReconciliationDecision.currentMigrationInventoryAuthority, "C3R-A2");
  assert.deepEqual(unified.wcvCampaignOverlay.c3SerialProgram.stageReceiptDependencies["C3R-P"], ["C3R-A0", "C3R-A1", "C3R-A2"]);
  assert.equal(unified.roadmapContract.soleNextC3rStageState, "dependency_ready_unstarted_after_validated_c3r_a2_merge_receipt");
  assert.equal(unified.launchConvergenceAmendment.soleNextC3rStageState, "dependency_ready_unstarted_after_validated_c3r_a2_merge_receipt");
});

test("A2 owns exactly the twelve source-authority paths and no forbidden path", () => {
  assert.equal(contract.ownedPaths.length, 12);
  assert.equal(new Set(contract.ownedPaths).size, 12);
  for (const owned of contract.ownedPaths) {
    assert.equal(contract.forbiddenExactPaths.includes(owned), false, owned);
    assert.equal(contract.forbiddenPathPrefixes.some((prefix) => owned.startsWith(prefix)), false, owned);
  }
});

test("package and lockfile remain exact and mutation stays unauthorized", async () => {
  assert.equal(gitBlob(await readFile(path.join(repositoryRoot, "package.json"))), contract.packageIdentity.packageJsonGitBlob);
  assert.equal(gitBlob(await readFile(path.join(repositoryRoot, "package-lock.json"))), contract.packageIdentity.packageLockJsonGitBlob);
  assert.equal(contract.packageIdentity.packageMutationAuthorized, false);
});

test("receipt validation is deterministic under exact replay", () => {
  assert.deepEqual(validateA2AuthorityContract(clone(contract), clone(a0Manifest)), []);
  assert.deepEqual(validateA2AuthorityContract(clone(contract), clone(a0Manifest)), []);
});

test("hostile ledger schema filename digest order and activation mutations fail closed", () => {
  const mutations = [
    (candidate) => { candidate.remoteMigrationLedgerReceiptV1.exactCount = 14; },
    (candidate) => { candidate.remoteMigrationLedgerReceiptV1.orderedRecords.reverse(); },
    (candidate) => { candidate.remoteMigrationLedgerReceiptV1.observedAtUtc = "2026-08-20T07:17:37.805066Z"; },
    (candidate) => { candidate.remoteMigrationLedgerReceiptV1.toolQueryProvenance.pop(); },
    (candidate) => { candidate.remoteSchemaMetadataReceiptV1.objectPresenceEstablishesMigrationEquivalence = true; },
    (candidate) => { candidate.remoteSchemaMetadataReceiptV1.observationWindowUtc.relations = "2026-08-20T07:18:07.719574Z"; },
    (candidate) => { candidate.remoteSchemaMetadataReceiptV1.relationPresenceExactly[0].objectIdentifier = "public.forged"; },
    (candidate) => { candidate.remoteSchemaMetadataReceiptV1.functionPresenceExactly[0].presenceState = "ABSENT"; },
    (candidate) => { candidate.remoteSchemaMetadataReceiptV1.selectedMaterialObservations[0].presenceState = "PRESENT"; },
    (candidate) => { candidate.migrationRecordReconciliationsV2[0].currentFilename = "renamed.sql"; },
    (candidate) => { candidate.migrationRecordReconciliationsV2[8].proposedCanonicalFilename = "20260608090001_create_personal_learning_states.sql"; },
    (candidate) => { candidate.migrationRecordReconciliationsV2[0].currentSqlDigest = "0".repeat(64); },
    (candidate) => { candidate.exactReconciliationDecisions.legalFamily.canonicalOrderExactly.reverse(); },
    (candidate) => { candidate.activationBoundary.productionAuthorized = true; },
    (candidate) => { candidate.activationBoundary.remoteSqlMutationAuthorized = true; },
  ];
  for (const mutate of mutations) {
    const candidate = clone(contract);
    mutate(candidate);
    assert.notDeepEqual(validateA2AuthorityContract(candidate, a0Manifest), [], mutate.toString());
  }
});
