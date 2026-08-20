import test from "node:test";
import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import {
  createRoadmapRunnerPlanFromYamlAt,
} from "../lib/agent-factory/roadmap-runner.ts";
import { readTextFile } from "./platform-text.mjs";

const DECISION =
  "docs/decisions/2026-08-20-owner-wcv-c3-structural-recovery.md";
const CONTRACT = "config/dabangil-wcv-c3-structural-recovery-v1.json";
const VALIDATION = "docs/qa/wcv-c3-structural-recovery-validation.md";
const FOCUSED_TEST = "tests/wcv-c3-structural-recovery-authority.test.mjs";

async function text(path) {
  return readTextFile(path);
}

async function json(path) {
  return JSON.parse(await text(path));
}

function scalar(value) {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const body = trimmed.slice(1, -1).trim();
    return body ? body.split(",").map((entry) => scalar(entry)) : [];
  }
  return trimmed.replace(/^['"]|['"]$/g, "");
}

function parseRoadmap(source) {
  const program = {};
  const items = [];
  let section = null;
  let current = null;

  for (const line of source.split(/\r?\n/)) {
    const top = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (top) {
      section = top[1];
      current = null;
      continue;
    }
    if (section === "program") {
      const field = line.match(/^\s{2}([A-Za-z][\w-]*):\s*(.*)$/);
      if (field) program[field[1]] = scalar(field[2]);
      continue;
    }
    if (section !== "items") continue;
    const start = line.match(/^\s{2}-\s+id:\s*(.*)$/);
    if (start) {
      current = { id: scalar(start[1]) };
      items.push(current);
      continue;
    }
    const field = line.match(/^\s{4}([A-Za-z][\w-]*):\s*(.*)$/);
    if (field && current) current[field[1]] = scalar(field[2]);
  }

  return { program, byId: new Map(items.map((item) => [item.id, item])) };
}

test("selects exactly one current WCV-C3 replacement stage without starting it", async () => {
  const [recovery, unified, roadmapSource] = await Promise.all([
    json(CONTRACT),
    json("config/dabangil-unified-program-contract.json"),
    text("roadmap/active-program.yml"),
  ]);
  const roadmap = parseRoadmap(roadmapSource);
  const current = recovery.replacementStages.filter(
    (stage) => stage.state === "authorized_unstarted",
  );

  assert.deepEqual(current.map(({ id, subject }) => ({ id, subject })), [
    { id: "C3R-P", subject: "PRACTICE" },
  ]);
  assert.equal(recovery.authorityGraph.currentReplacementStageId, "C3R-P");
  assert.equal(recovery.authorityGraph.currentRecoveryTrackerIssue, 781);
  assert.equal(recovery.authorityGraph.currentReplacementStageIssue, 706);
  assert.equal(recovery.authorityGraph.successorRuntimeStarted, false);
  assert.equal(roadmap.program.soleNextImplementationItem, "WCV-C3");
  assert.equal(roadmap.program.soleNextImplementationCampaign, "C3");
  assert.equal(roadmap.program.soleNextImplementationTrackerIssue, 781);
  assert.equal(roadmap.program.soleNextReplacementStage, "C3R-P");
  assert.equal(roadmap.program.soleNextReplacementStageIssue, 706);
  assert.equal(unified.wcvCampaignOverlay.soleNextImplementationTrackerIssue, 781);
  assert.equal(unified.wcvCampaignOverlay.soleNextReplacementStage, "C3R-P");
  assert.equal(unified.roadmapContract.soleNextReplacementStageId, "C3R-P");
  assert.equal(roadmap.byId.get("WCV-C3").started, false);
});

test("installs only the serial C3R-P then C3R-T then C3R-L chain", async () => {
  const recovery = await json(CONTRACT);
  const stages = recovery.replacementStages;

  assert.deepEqual(stages.map((stage) => stage.order), [1, 2, 3]);
  assert.deepEqual(stages.map((stage) => stage.id), ["C3R-P", "C3R-T", "C3R-L"]);
  assert.deepEqual(stages.map((stage) => stage.dependencies), [
    [],
    ["C3R-P"],
    ["C3R-P", "C3R-T"],
  ]);
  assert.equal(stages[0].startRequiresStructuralAuthorityMergeAndValidatedReceipt, true);
  for (const stage of stages) {
    assert.equal(stage.issueStateMaySatisfyDependency, false, stage.id);
  }
});

test("allows only C3R-L to complete WCV-C3 and close the terminal issues", async () => {
  const recovery = await json(CONTRACT);
  const [practice, theory, law] = recovery.replacementStages;

  for (const stage of [practice, theory]) {
    assert.equal(stage.issueClosureAllowed, false, stage.id);
    assert.equal(stage.terminalWcvC3CompletionAllowed, false, stage.id);
  }
  assert.equal(law.issueClosureAllowed, true);
  assert.equal(law.terminalWcvC3CompletionAllowed, true);
  assert.deepEqual(law.terminalClosureIssues, [706, 707, 708, 781]);
  assert.equal(law.completesIssue714Allocation, "C3");
  assert.equal(law.issue714ClosureAllowed, false);
  assert.deepEqual(law.issue714AllocationsPreservedAfterCompletion, ["C4", "C6"]);
});

test("retains PR 770 and PR 780 as exact terminal read-only donors", async () => {
  const recovery = await json(CONTRACT);
  const donors = new Map(recovery.terminalDonors.map((donor) => [donor.pr, donor]));

  assert.deepEqual([...donors.keys()], [770, 780]);
  assert.deepEqual(
    [donors.get(770).head, donors.get(770).tree, donors.get(770).base],
    [
      "41fbc60cbebf5463ead483462e5bd92b797c82c4",
      "e7d035d5735e600bf970054666da0b57f05f1abb",
      "ffdd3dcc2398dd27b991eee0be34f832da0a65b5",
    ],
  );
  assert.deepEqual(
    [donors.get(780).head, donors.get(780).tree, donors.get(780).base],
    [
      "a28c1983a5264f21ed35ab48a465cd9198a46e5b",
      "e589b0e55f93d70df4ef5c0d335d74e4242f91ce",
      "ffdd3dcc2398dd27b991eee0be34f832da0a65b5",
    ],
  );
  assert.equal(donors.get(780).sourceCorrectionsUsed, 2);
  assert.equal(donors.get(780).formalReviewsUsed, 0);
  assert.equal(donors.get(780).centralRuntimeRun, 32358691451);
  assert.equal(donors.get(780).dedicatedRuntimeRun, 32358691469);
  assert.equal(donors.get(780).centralRuntimeArtifactCount, 0);
  assert.equal(donors.get(780).dedicatedRuntimeArtifactCount, 0);
  for (const donor of donors.values()) {
    assert.equal(donor.state, "closed_draft_unmerged");
    assert.equal(donor.readOnly, true);
    assert.equal(donor.merged, false);
    assert.equal(donor.evidencePromoted, false);
  }
  for (const value of Object.values(recovery.donorPolicy)) {
    assert.equal(typeof value, "boolean");
  }
  assert.equal(recovery.donorPolicy.reopenAllowed, false);
  assert.equal(recovery.donorPolicy.branchMutationAllowed, false);
  assert.equal(recovery.donorPolicy.cherryPickAllowed, false);
});

test("records current migration defects and a unique ordered canonical proposal", async () => {
  const recovery = await json(CONTRACT);
  const manifest = recovery.migrationHistoryCompatibilityManifestV1;
  const currentFiles = (await readdir("supabase/migrations"))
    .filter((name) => name.endsWith(".sql"))
    .sort();
  const currentTokens = currentFiles.map((name) => name.split("_")[0]);
  const canonical = manifest.records.map(
    (record) => record.canonicalProposedVersionToken,
  );
  const liveRecords = manifest.records.filter((record) => record.presentOnLiveMain);

  assert.equal(currentFiles.length, 25);
  assert.deepEqual(currentFiles, manifest.liveMainLexicalInventory);
  assert.equal(currentTokens.filter((token) => token === "20260615").length, 4);
  assert.deepEqual(
    [...new Set(currentTokens.map((token) => token.length))].sort((a, b) => a - b),
    [8, 12, 14],
  );
  assert.equal(liveRecords.length, 25);
  assert.equal(manifest.records.length, 26);
  assert.equal(new Set(canonical).size, canonical.length);
  assert.equal(canonical.every((token) => /^\d{14}$/.test(token)), true);
  assert.deepEqual(canonical, [...canonical].sort());
  assert.deepEqual(
    manifest.records.map((record) => record.freshHistoryOrder),
    Array.from({ length: 26 }, (_, index) => index + 1),
  );
  assert.equal(manifest.canonicalProposalIsMutationAuthority, false);
});

test("requires every migration consumer to follow its exact producers", async () => {
  const recovery = await json(CONTRACT);
  const manifest = recovery.migrationHistoryCompatibilityManifestV1;
  const records = manifest.records;
  const byName = new Map(records.map((record) => [record.currentFilename, record]));
  const externalObjects = new Set(["auth.users", "storage.objects", "storage.buckets"]);
  const availableObjects = new Map();
  const exactObjectName = /^(auth|public|storage)\.[a-z0-9_]+$/;

  assert.deepEqual(manifest.closedDatabaseObjectKinds, ["table", "function", "type"]);
  assert.deepEqual(manifest.repositoryProducedTypeIdentifiers, []);

  for (const record of records) {
    for (const predecessor of record.exactDependencyPredecessors) {
      assert.ok(byName.has(predecessor), `${record.currentFilename}:${predecessor}`);
      assert.ok(
        byName.get(predecessor).freshHistoryOrder < record.freshHistoryOrder,
        `${predecessor} must precede ${record.currentFilename}`,
      );
    }

    for (const field of ["consumes", "produces", "modifies", "drops"]) {
      if (record[field] === undefined) continue;
      assert.ok(Array.isArray(record[field]), `${record.currentFilename}:${field}`);
      for (const object of record[field]) {
        assert.deepEqual(Object.keys(object).sort(), ["identifier", "kind"]);
        assert.ok(
          manifest.closedDatabaseObjectKinds.includes(object.kind),
          `${record.currentFilename}:${field}:${object.kind}`,
        );
        assert.match(object.identifier, exactObjectName);
      }
    }

    for (const object of record.consumes) {
      if (externalObjects.has(object.identifier)) continue;
      const producer = availableObjects.get(object.identifier);
      assert.ok(producer, `${record.currentFilename} consumes unresolved ${object.identifier}`);
      assert.ok(
        producer.freshHistoryOrder < record.freshHistoryOrder,
        `${producer.currentFilename} must produce ${object.identifier} before ${record.currentFilename}`,
      );
    }

    for (const object of record.drops ?? []) {
      availableObjects.delete(object.identifier);
    }
    for (const object of record.produces) {
      availableObjects.set(object.identifier, record);
    }
  }
  assert.deepEqual(
    byName.get("20260615_legal_article_chunk_identity.sql").exactDependencyPredecessors,
    ["20260615_legal_grounding.sql"],
  );
  assert.ok(
    byName
      .get("202606232130_personal_concept_graph_rpc_only_write_boundary.sql")
      .exactDependencyPredecessors.includes(
        "20260623_personal_concept_graph_atomic_transition.sql",
      ),
  );

  const identifiers = (objects) => objects.map((object) => object.identifier).sort();
  const coreObjects = identifiers(
    byName.get("20260422_inverge_service_core.sql").produces,
  );
  assert.deepEqual(
    identifiers(byName.get("20260423_inverge_service_role_grants.sql").consumes),
    coreObjects,
  );
  assert.deepEqual(
    identifiers(byName.get("20260424_review_os_alpha.sql").consumes),
    ["auth.users", "public.profiles"],
  );
  assert.deepEqual(
    identifiers(byName.get("20260424_review_os_alpha.sql").modifies),
    ["public.profiles"],
  );
  assert.deepEqual(
    identifiers(
      byName.get("20260623_personal_concept_graph_atomic_transition.sql").consumes,
    ),
    ["auth.users", "public.personal_concept_nodes"],
  );
  assert.deepEqual(
    identifiers(
      byName.get("20260730025332_s236p_lean_owner_private.sql").produces,
    ),
    [
      "public.s236p_authorize_signed_url_v1",
      "public.s236p_expired_object_paths_v1",
      "public.s236p_guard_object_update_v1",
      "public.s236p_owner_private_events",
      "public.s236p_owner_private_objects",
      "public.s236p_set_event_lifecycle_v1",
      "public.s236p_set_object_lifecycle_v1",
    ],
  );
  assert.deepEqual(
    identifiers(
      byName.get("20260730025332_s236p_lean_owner_private.sql").consumes,
    ),
    ["auth.users", "storage.buckets", "storage.objects"],
  );
  assert.deepEqual(
    identifiers(
      byName.get("20260817113000_c2r_c_t_structural_theory_proof.sql").consumes,
    ),
    [
      "public.wcv_c2_apply_trusted_repair_transition_v1",
      "public.wcv_c2_trusted_repair_command_receipts",
      "public.wcv_c2_trusted_repair_exposure_events",
      "public.wcv_c2_trusted_repair_private_artifacts",
      "public.wcv_c2_trusted_repair_scarcity_events",
      "public.wcv_c2_trusted_repair_sessions",
    ],
  );
  assert.deepEqual(
    identifiers(
      byName.get("20260817170000_c2r_c_l_exact_law_applicability.sql").produces,
    ),
    ["public.wcv_c2_validate_exact_law_proof_v1"],
  );
  assert.deepEqual(
    identifiers(
      byName.get("20260817190000_wcv_c3_durable_learning_daily_command.sql")
        .produces,
    ),
    [
      "public.wcv_c3_apply_transition_v1",
      "public.wcv_c3_command_receipts",
      "public.wcv_c3_create_gap_closure_case_v1",
      "public.wcv_c3_delete_owned_case_v1",
      "public.wcv_c3_deletion_receipts",
      "public.wcv_c3_evidence_events",
      "public.wcv_c3_gap_closure_cases",
      "public.wcv_c3_load_gap_closure_case_v1",
      "public.wcv_c3_private_attempt_artifacts",
    ],
  );
  assert.deepEqual(
    identifiers(
      byName.get("20260817190000_wcv_c3_durable_learning_daily_command.sql")
        .consumes,
    ),
    ["auth.users", "public.wcv_c2_trusted_repair_sessions"],
  );
});

test("blocks silent rename or repair for unknown and applied remote history", async () => {
  const recovery = await json(CONTRACT);
  const manifest = recovery.migrationHistoryCompatibilityManifestV1;
  const guarded = manifest.records.filter((record) =>
    ["UNKNOWN", "KNOWN_APPLIED"].includes(record.remoteApplicationStatus),
  );

  assert.equal(manifest.knownUnappliedRecordCount, 0);
  assert.ok(guarded.length > 0);
  for (const record of guarded) {
    assert.equal(record.filenameMutationEligibleInThisWork, false, record.currentFilename);
    assert.equal(record.ownerGateRequired, true, record.currentFilename);
    assert.match(record.remoteHistoryRepairRequirement, /OWNER_GATE/);
  }
  assert.equal(manifest.hardRules.unknownRemoteStatusAllowsSilentRename, false);
  assert.equal(manifest.hardRules.unknownRemoteStatusAllowsRemoteRepair, false);
  assert.equal(
    manifest.hardRules.knownAppliedVersionAllowsRewriteWithoutOwnerGate,
    false,
  );
  assert.equal(manifest.hardRules.migrationRepairAuthorizedByThisWork, false);
  assert.equal(manifest.hardRules.dbPushAuthorizedByThisWork, false);
  assert.equal(manifest.hardRules.linkedResetAuthorizedByThisWork, false);
  assert.equal(manifest.hardRules.remoteSqlAuthorizedByThisWork, false);
  assert.equal(manifest.hardRules.remoteSchemaMutationAuthorizedByThisWork, false);
});

test("makes closed runtime-adapter path coverage and two reset cycles mandatory", async () => {
  const recovery = await json(CONTRACT);
  const adapter = recovery.runtimeEvidenceAdapterAuthority;
  const rules = recovery.migrationHistoryCompatibilityManifestV1.hardRules;

  assert.equal(adapter.adapterInstalledByStage, "C3R-P");
  assert.equal(adapter.adapterStateInThisSourceWork, "required_not_installed");
  assert.equal(adapter.closedPathSetRequired, true);
  assert.equal(adapter.stageOwnedProtectedPathsMustBeEnumeratedWithoutGlobAtStageStart, true);
  assert.equal(rules.freshIsolatedResetReplayCyclesRequiredPerRuntimeStage, 2);
  assert.equal(rules.freshHistoryResetMustApplyEveryStageOwnedMigrationInOrder, true);
  assert.equal(rules.embeddedPostgresCompilationEstablishesSupabaseResetGate, false);
  assert.deepEqual(adapter.failClosedOn, [
    "UNREGISTERED_MIGRATION_SENSITIVE_PATH",
    "INCOMPLETE_PATH_CLOSURE",
    "MISSING_FRESH_RESET_REPLAY_CYCLE_1",
    "MISSING_FRESH_RESET_REPLAY_CYCLE_2",
    "ABSENT_METADATA_ONLY_ARTIFACT",
    "EXACT_HEAD_MISMATCH",
    "REMOTE_SUPABASE_USE",
    "CLEANUP_FAILURE",
  ]);
});

test("keeps one writer, V13 supremacy and every activation boundary closed", async () => {
  const [recovery, unified, roadmapSource, agents] = await Promise.all([
    json(CONTRACT),
    json("config/dabangil-unified-program-contract.json"),
    text("roadmap/active-program.yml"),
    text("AGENTS.md"),
  ]);
  const roadmap = parseRoadmap(roadmapSource);
  const plan = createRoadmapRunnerPlanFromYamlAt(
    roadmapSource,
    new Date("2026-08-20T12:00:00.000Z"),
  );

  assert.equal(recovery.authorityGraph.activeMasterPlanId, "V13");
  assert.match(agents, /V13 remains the sole active master plan/);
  assert.equal(recovery.deliveryControl.oneMergeProducingWriter, true);
  assert.equal(roadmap.program.globalMergeProducingWriterLimit, 1);
  assert.equal(unified.roadmapContract.globalMergeProducingWriterLimit, 1);
  assert.equal(plan.globalMergeProducingWriterLimit, 1);
  assert.equal(plan.activeWriterCount, 0);
  assert.deepEqual(plan.selectedItemIds, ["WCV-C3"]);
  for (const [key, value] of Object.entries(recovery.activationBoundary)) {
    assert.equal(value, false, key);
  }
});

test("mirrors tracker 781 and C3R-P without changing the terminal C2 graph", async () => {
  const [unified, agents, contract, roadmap, master, active, launchJson, launchDoc] =
    await Promise.all([
      json("config/dabangil-unified-program-contract.json"),
      text("AGENTS.md"),
      text("docs/dabangil-unified-program-contract.md"),
      text("roadmap/active-program.yml"),
      text("docs/inverge-master-roadmap.md"),
      text("docs/strategy/ACTIVE-MASTER-PLAN.md"),
      json("config/dabangil-unified-product-multisurface-launch-v1.json"),
      text("docs/strategy/dabangil-unified-product-multisurface-launch-v1-2026-08-14.md"),
    ]);
  const mirrors = [agents, contract, roadmap, master, active, launchDoc];

  assert.equal(
    unified.wcvCampaignOverlay.c2StructuralRecovery.authorityGraph
      .currentReplacementStageId,
    null,
  );
  assert.equal(unified.wcvCampaignOverlay.c3StructuralRecovery.trackerIssue, 781);
  assert.equal(
    unified.wcvCampaignOverlay.c3StructuralRecovery.currentReplacementStage,
    "C3R-P",
  );
  assert.equal(launchJson.preservedCurrentAuthority.wcvC3RecoveryTrackerIssue, 781);
  assert.equal(
    launchJson.preservedCurrentAuthority.wcvC3CurrentReplacementStage,
    "C3R-P",
  );
  for (const source of mirrors) {
    assert.match(source, /#781|781/, "tracker mirror");
    assert.match(source, /C3R-P/, "stage mirror");
  }
});

test("registers the focused test once and keeps the source-only owned path boundary", async () => {
  const [runner, decision, validation] = await Promise.all([
    text("scripts/run-node-tests.mjs"),
    text(DECISION),
    text(VALIDATION),
  ]);
  const registrations =
    runner.match(/tests\/wcv-c3-structural-recovery-authority\.test\.mjs/g) ?? [];
  const ownedSection =
    decision.match(/## 11\. Exact owned-path manifest([\s\S]*?)No path outside/)?.[1] ?? "";
  const ownedPaths = [...ownedSection.matchAll(/`([^`]+)`/g)].map(
    (match) => match[1],
  );

  assert.equal(registrations.length, 1);
  assert.equal(FOCUSED_TEST.endsWith(".test.mjs"), true);
  assert.equal(new Set(ownedPaths).size, ownedPaths.length);
  assert.ok(ownedPaths.includes(DECISION));
  assert.ok(ownedPaths.includes(CONTRACT));
  assert.ok(ownedPaths.includes(VALIDATION));
  assert.ok(ownedPaths.includes(FOCUSED_TEST));
  for (const path of ownedPaths) {
    assert.doesNotMatch(path, /^(?:app|components|lib\/review-os|supabase|\.github\/workflows)\//);
    assert.doesNotMatch(path, /(?:^|\/)(?:package\.json|[^/]*lock[^/]*)$/);
  }
  assert.match(validation, /source authority installed by Tracker #781/);
});

test("keeps all new authority artifacts newline terminated", async () => {
  for (const path of [DECISION, CONTRACT, VALIDATION, FOCUSED_TEST]) {
    assert.equal((await text(path)).endsWith("\n"), true, path);
  }
});
