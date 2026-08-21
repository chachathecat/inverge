import test from "node:test";
import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import {
  createRoadmapRunnerPlanFromYamlAt,
} from "../lib/agent-factory/roadmap-runner.ts";
import {
  MigrationDependencyClosureError,
  deriveDatabaseObjectReferences,
  deriveExternalFunctionDependencies,
  deriveMigrationDependencyClosure,
  deriveProducedDatabaseObjects,
  deriveRequiredExtensionUses,
  extractCreateExtensions,
  loadLiveMigrationSql,
  tokenizePostgresSql,
  validateMigrationDependencyClosure,
} from "../scripts/automation/wcv-c3r-migration-dependency-closure.mjs";
import { readTextFile } from "./platform-text.mjs";

const DECISION =
  "docs/decisions/2026-08-20-owner-wcv-c3-structural-recovery.md";
const CONTRACT = "config/dabangil-wcv-c3-structural-recovery-v1.json";
const VALIDATION = "docs/qa/wcv-c3-structural-recovery-validation.md";
const FOCUSED_TEST = "tests/wcv-c3-structural-recovery-authority.test.mjs";
const DEPENDENCY_ANALYZER =
  "scripts/automation/wcv-c3r-migration-dependency-closure.mjs";

async function text(path) {
  return readTextFile(path);
}

async function json(path) {
  return JSON.parse(await text(path));
}

async function dependencyClosureFixture() {
  const recovery = await json(CONTRACT);
  return {
    manifest: structuredClone(recovery.migrationHistoryCompatibilityManifestV1),
    sqlByFilename: await loadLiveMigrationSql("supabase/migrations"),
  };
}

function assertClosureFailure(callback, code) {
  assert.throws(callback, (error) => {
    assert.ok(error instanceof MigrationDependencyClosureError);
    assert.equal(error.code, code);
    return true;
  });
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

test("retains PR 770, PR 780, PR 782 and PR 783 as exact terminal read-only donors", async () => {
  const recovery = await json(CONTRACT);
  const donors = new Map(recovery.terminalDonors.map((donor) => [donor.pr, donor]));

  assert.deepEqual([...donors.keys()], [770, 780, 782, 783]);
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
  assert.deepEqual(
    [donors.get(782).head, donors.get(782).tree, donors.get(782).base],
    [
      "e3609843850ba1f2ce64c291d9b4daae964d2f65",
      "20e0f9235b71c3427ee184bf7e02f22f46633ef6",
      "ffdd3dcc2398dd27b991eee0be34f832da0a65b5",
    ],
  );
  assert.equal(donors.get(782).sourceCorrectionsUsed, 2);
  assert.equal(donors.get(782).formalReviewsUsed, 2);
  assert.equal(donors.get(782).finalReviewRestId, 4982731766);
  assert.equal(donors.get(782).finalReviewGraphqlId, "PRR_kwDOSMHn8M8AAAABKP5z9g");
  assert.deepEqual(donors.get(782).finalActionableP0P1P2, [0, 0, 1]);
  assert.equal(donors.get(782).currentActionableReviewComment, 3821578964);
  assert.deepEqual(
    [donors.get(783).head, donors.get(783).tree, donors.get(783).base],
    [
      "7298b147d5f61e9d2eaa915b6b9c05354124add5",
      "e47605343bfdad7d44737756f56e9f555d089e94",
      "ffdd3dcc2398dd27b991eee0be34f832da0a65b5",
    ],
  );
  assert.equal(donors.get(783).sourceCorrectionsUsed, 2);
  assert.equal(donors.get(783).formalReviewsUsed, 3);
  assert.equal(donors.get(783).finalReviewRestId, 4984950563);
  assert.equal(donors.get(783).finalReviewGraphqlId, "PRR_kwDOSMHn8M8AAAABKSBPIw");
  assert.deepEqual(donors.get(783).finalActionableP0P1P2, [0, 0, 1]);
  assert.equal(donors.get(783).currentActionableReviewThread, "PRRT_kwDOSMHn8M6a4MON");
  assert.equal(donors.get(783).currentActionableReviewComment, 3823315579);
  assert.equal(donors.get(783).cleanReplanOrdinalForDependencyClosureRoot, 1);
  for (const donor of donors.values()) {
    assert.match(donor.state, /^closed_(?:draft_)?unmerged$/);
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

test("records this source candidate as terminal dependency-closure clean replan 2 of 2", async () => {
  const [recovery, roadmapSource] = await Promise.all([
    json(CONTRACT),
    text("roadmap/active-program.yml"),
  ]);
  const roadmap = parseRoadmap(roadmapSource);
  const item = roadmap.byId.get("WCV-C3");

  assert.equal(recovery.decision.dependencyClosureRootCleanReplanOrdinal, 2);
  assert.equal(recovery.decision.dependencyClosureRootCleanReplanMaximum, 2);
  assert.equal(recovery.decision.dependencyClosureRootTerminalCleanReplan, true);
  assert.equal(recovery.decision.thirdFullSizedCleanReplanAllowed, false);
  assert.deepEqual(recovery.decision.terminalFailureStructuralReductionSequence, [
    "C3R-A0",
    "C3R-A1",
  ]);
  assert.equal(item.dependencyClosureRootCleanReplanOrdinal, 2);
  assert.equal(item.dependencyClosureRootCleanReplanMaximum, 2);
  assert.equal(item.thirdFullSizedCleanReplanAllowed, false);
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
  const externalObjects = new Set(
    manifest.externalDatabaseObjects.map((object) => object.identifier),
  );
  const availableObjects = new Map();
  const exactObjectName = /^(auth|public|storage)\.[a-z0-9_]+$/;

  assert.deepEqual(manifest.closedDatabaseObjectKinds, [
    "table",
    "view",
    "sequence",
    "function",
    "type",
  ]);
  assert.deepEqual(manifest.repositoryProducedViewIdentifiers, []);
  assert.deepEqual(manifest.repositoryProducedSequenceIdentifiers, []);
  assert.deepEqual(manifest.repositoryProducedTypeIdentifiers, []);
  assert.deepEqual(
    manifest.externalDatabaseObjects,
    [
      { kind: "table", identifier: "auth.users" },
      { kind: "function", identifier: "auth.uid" },
      { kind: "table", identifier: "storage.objects" },
      { kind: "table", identifier: "storage.buckets" },
      { kind: "function", identifier: "storage.allow_any_operation" },
      { kind: "function", identifier: "storage.allow_only_operation" },
    ],
  );

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
    ["auth.uid", "auth.users", "public.profiles"],
  );
  assert.deepEqual(
    identifiers(byName.get("20260424_review_os_alpha.sql").modifies),
    ["public.profiles"],
  );
  assert.deepEqual(
    identifiers(
      byName.get("20260623_personal_concept_graph_atomic_transition.sql").consumes,
    ),
    ["auth.uid", "auth.users", "public.personal_concept_nodes"],
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
    ["auth.uid", "auth.users", "storage.buckets", "storage.objects"],
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

test("matches every live-main external function call to the closed manifest", async () => {
  const recovery = await json(CONTRACT);
  const manifest = recovery.migrationHistoryCompatibilityManifestV1;
  const externalTables = new Set(["auth.users", "storage.objects", "storage.buckets"]);
  const externalFunctionPattern = /\b(?:auth|storage)\.[a-z0-9_]+\s*\(/g;

  for (const record of manifest.records.filter((entry) => entry.presentOnLiveMain)) {
    const sql = await text(`supabase/migrations/${record.currentFilename}`);
    const expected = [
      ...new Set(
        [...sql.matchAll(externalFunctionPattern)]
          .map((match) => match[0].replace(/\s*\($/, ""))
          .filter((identifier) => !externalTables.has(identifier)),
      ),
    ].sort();
    const declared = record.consumes
      .filter(
        (object) =>
          object.kind === "function" &&
          /^(?:auth|storage)\./.test(object.identifier),
      )
      .map((object) => object.identifier)
      .sort();

    assert.deepEqual(declared, expected, record.currentFilename);
  }
});

test("derives and exactly validates the closed live-main migration dependency inventory", async () => {
  const { manifest, sqlByFilename } = await dependencyClosureFixture();
  const summary = validateMigrationDependencyClosure(manifest, sqlByFilename);
  const byName = new Map(manifest.records.map((record) => [record.currentFilename, record]));
  const legal = byName.get("20260615_legal_grounding.sql");
  const concept = byName.get(
    "20260623_personal_concept_graph_atomic_transition.sql",
  );
  const legalIdentity = byName.get(
    "20260615_legal_article_chunk_identity.sql",
  );

  assert.deepEqual(summary, {
    manifestVersion: "MigrationDependencyClosureV1",
    liveMigrationCount: 25,
    executableCreateExtensionStatementCount: 6,
    createdExtensionNames: ["pgcrypto", "vector"],
    sqlDerivedExternalFunctionCount: 28,
  });
  assert.deepEqual(
    legal.createdExtensions.map(({ name, schema }) => ({ name, schema })),
    [
      { name: "pgcrypto", schema: null },
      { name: "vector", schema: null },
    ],
  );
  assert.deepEqual(
    concept.createdExtensions.map(({ name, schema }) => ({ name, schema })),
    [{ name: "pgcrypto", schema: "extensions" }],
  );
  assert.deepEqual(
    legal.requiredExtensions.map(({ name, producerMigration }) => ({
      name,
      producerMigration,
    })),
    [
      { name: "pgcrypto", producerMigration: legal.currentFilename },
      { name: "vector", producerMigration: legal.currentFilename },
    ],
  );
  assert.equal(
    concept.requiredExtensions.every(
      (entry) => entry.producerMigration === concept.currentFilename,
    ),
    true,
  );
  assert.deepEqual(legalIdentity.requiredExtensions, [
    {
      name: "pgcrypto",
      schema: null,
      evidence: [{ kind: "function", identifier: "digest", occurrences: 1 }],
      satisfaction: "PREDECESSOR_MIGRATION",
      producerMigration: legal.currentFilename,
      producerFreshHistoryOrder: legal.freshHistoryOrder,
    },
  ]);
  assert.deepEqual(legalIdentity.extensionDependencyPredecessors, [
    legal.currentFilename,
  ]);
  for (const record of manifest.records.filter((entry) => entry.presentOnLiveMain)) {
    assert.match(record.sqlSha256, /^[a-f0-9]{64}$/);
    assert.ok(Array.isArray(record.createdExtensions));
    assert.ok(Array.isArray(record.requiredExtensions));
    assert.ok(Array.isArray(record.extensionDependencyPredecessors));
  }
});

test("detects unqualified digest without double-counting extensions.digest", () => {
  assert.deepEqual(
    deriveRequiredExtensionUses(`
      select digest('plain', 'sha256');
      select extensions.digest('qualified', 'sha256');
      select 'digest(';
      -- digest('commented', 'sha256');
    `),
    [
      {
        name: "pgcrypto",
        schema: null,
        evidence: [{ kind: "function", identifier: "digest", occurrences: 1 }],
      },
      {
        name: "pgcrypto",
        schema: "extensions",
        evidence: [
          {
            kind: "function",
            identifier: "extensions.digest",
            occurrences: 1,
          },
        ],
      },
    ],
  );
  assert.deepEqual(
    deriveRequiredExtensionUses(`
      select "digest"('plain', 'sha256');
      select "extensions"."digest"('qualified', 'sha256');
    `),
    [
      {
        name: "pgcrypto",
        schema: null,
        evidence: [{ kind: "function", identifier: "digest", occurrences: 1 }],
      },
      {
        name: "pgcrypto",
        schema: "extensions",
        evidence: [
          {
            kind: "function",
            identifier: "extensions.digest",
            occurrences: 1,
          },
        ],
      },
    ],
  );
});

test("fails closed on an unregistered qualified database reference", () => {
  const record = {
    currentFilename: "20260101000000_unknown_reference.sql",
    presentOnLiveMain: true,
    freshHistoryOrder: 1,
    drops: [],
    modifies: [],
  };

  for (const sql of [
    "select * from public.unregistered_dependency;",
    'select * from "public"."unregistered_dependency";',
  ]) {
    assertClosureFailure(
      () =>
        deriveMigrationDependencyClosure(
          [record],
          new Map([[record.currentFilename, sql]]),
        ),
      "UNREGISTERED_QUALIFIED_DATABASE_OBJECT",
    );
  }
  assert.deepEqual(
    deriveMigrationDependencyClosure(
      [record],
      new Map([
        [
          record.currentFilename,
          "select 'public.unregistered_dependency'; -- public.also_ignored\n",
        ],
      ]),
    )[0].referencedDatabaseObjects,
    [],
  );
});

test("derives known quoted object and external-function dependencies", () => {
  const records = [
    {
      currentFilename: "20260101000000_quoted_producer.sql",
      presentOnLiveMain: true,
      freshHistoryOrder: 1,
      drops: [],
      modifies: [],
    },
    {
      currentFilename: "20260101000001_quoted_consumer.sql",
      presentOnLiveMain: true,
      freshHistoryOrder: 2,
      drops: [],
      modifies: [],
    },
  ];
  const [, consumer] = deriveMigrationDependencyClosure(
    records,
    new Map([
      [records[0].currentFilename, "create table public.known_dependency (id uuid);"],
      [
        records[1].currentFilename,
        'select "auth"."uid"(), * from "public"."known_dependency";',
      ],
    ]),
    {
      externalDatabaseObjects: [
        { kind: "function", identifier: "auth.uid" },
      ],
    },
  );

  assert.deepEqual(consumer.referencedDatabaseObjects, [
    { kind: "function", identifier: "auth.uid" },
    { kind: "table", identifier: "public.known_dependency" },
  ]);
  assert.deepEqual(consumer.exactDependencyPredecessors, [
    records[0].currentFilename,
  ]);
  assert.equal(consumer.externalFunctions[0].identifier, "auth.uid");
});

test("tokenizes PostgreSQL identifiers atomically with exact quoted identity", () => {
  const tokens = tokenizePostgresSql(`
    SELECT Public.Profiles, "public"."profiles", "weird""schema"."item";
    SELECT 'public.fake', E'auth.uid()', $$storage.objects$$;
    -- public.comment_only
    /* public.block_only */
  `);
  const identifiers = tokens
    .filter((token) => token.type.endsWith("IDENTIFIER"))
    .map(({ type, value, quoted }) => ({ type, value, quoted }));

  assert.deepEqual(identifiers.slice(0, 9), [
    { type: "UNQUOTED_IDENTIFIER", value: "select", quoted: false },
    { type: "UNQUOTED_IDENTIFIER", value: "public", quoted: false },
    { type: "UNQUOTED_IDENTIFIER", value: "profiles", quoted: false },
    { type: "QUOTED_IDENTIFIER", value: "public", quoted: true },
    { type: "QUOTED_IDENTIFIER", value: "profiles", quoted: true },
    { type: "QUOTED_IDENTIFIER", value: 'weird"schema', quoted: true },
    { type: "QUOTED_IDENTIFIER", value: "item", quoted: true },
    { type: "UNQUOTED_IDENTIFIER", value: "select", quoted: false },
  ]);
  assert.ok(tokens.some((token) => token.type === "DOT"));
  assert.ok(tokens.some((token) => token.type === "ORDINARY_STRING"));
  assert.ok(tokens.some((token) => token.type === "ESCAPE_STRING"));
  assert.ok(tokens.some((token) => token.type === "DOLLAR_QUOTED_BODY"));
  assert.ok(tokens.some((token) => token.type === "LINE_COMMENT"));
  assert.ok(tokens.some((token) => token.type === "BLOCK_COMMENT"));
});

test("folds only unquoted qualified-name components and preserves quoted case", () => {
  const profiles = [{ kind: "table", identifier: "public.profiles" }];
  for (const sql of [
    "select * from public.profiles;",
    "select * from PUBLIC.PROFILES;",
    "select * from Public.Profiles;",
    'select * from "public"."profiles";',
    'select * from "public".profiles;',
    'select * from public."profiles";',
  ]) {
    assert.deepEqual(deriveDatabaseObjectReferences(sql, profiles), profiles, sql);
  }

  const record = {
    currentFilename: "20260101000000_identifier_case.sql",
    presentOnLiveMain: true,
    freshHistoryOrder: 1,
    drops: [],
    modifies: [],
  };
  for (const sql of [
    'select * from "Public"."profiles";',
    'select * from "public"."Profiles";',
    'select * from "PUBLIC".profiles;',
    'select * from public."Profiles";',
  ]) {
    assertClosureFailure(
      () =>
        deriveMigrationDependencyClosure(
          [record],
          new Map([[record.currentFilename, sql]]),
          { externalDatabaseObjects: profiles },
        ),
      "UNREGISTERED_QUALIFIED_DATABASE_OBJECT",
    );
  }
});

test("preserves dots inside canonical quoted identifier components", () => {
  const dottedSchema = {
    kind: "table",
    identifier: '"tenant.v1".items',
  };
  const dottedName = {
    kind: "table",
    identifier: 'tenant."v1.items"',
  };
  const escapedQuote = {
    kind: "table",
    identifier: '"tenant""v1".items',
  };
  const available = [dottedSchema, dottedName, escapedQuote];

  assert.deepEqual(
    deriveProducedDatabaseObjects(`
      create table "tenant.v1"."items" (id integer);
      create table "tenant"."v1.items" (id integer);
      create table "tenant""v1"."items" (id integer);
    `),
    available,
  );
  for (const [sql, expected] of [
    ['select * from "tenant.v1"."items";', dottedSchema],
    ['select * from "tenant"."v1.items";', dottedName],
    ['select * from "tenant""v1"."items";', escapedQuote],
  ]) {
    assert.deepEqual(
      deriveDatabaseObjectReferences(sql, available),
      [expected],
      sql,
    );
  }
  assert.deepEqual(
    deriveDatabaseObjectReferences('select * from "tenant.v1"."items";', [
      { kind: "table", identifier: '"tenant.v1"."items"' },
    ]),
    [dottedSchema],
  );
  assert.deepEqual(
    deriveDatabaseObjectReferences('select * from "tenant.v1"."items";', [
      dottedSchema,
      { kind: "table", identifier: '"tenant.v1"."items"' },
    ]),
    [dottedSchema],
  );
  assert.deepEqual(
    deriveExternalFunctionDependencies(
      'select "tenant.v1"."step"();',
      ['"tenant.v1"."step"'],
    ),
    [],
  );

  const producer = "20260101000000_dotted_identifier_producer.sql";
  const consumer = "20260101000001_dotted_identifier_consumer.sql";
  const [, derivedConsumer] = deriveMigrationDependencyClosure(
    [
      { currentFilename: producer, presentOnLiveMain: true, freshHistoryOrder: 1 },
      { currentFilename: consumer, presentOnLiveMain: true, freshHistoryOrder: 2 },
    ],
    new Map([
      [
        producer,
        `create table "tenant.v1"."items" (id integer);
         create table "tenant"."v1.items" (id integer);`,
      ],
      [
        consumer,
        `select * from "tenant.v1"."items";
         select * from "tenant"."v1.items";`,
      ],
    ]),
  );
  assert.deepEqual(derivedConsumer.referencedDatabaseObjects, [
    dottedSchema,
    dottedName,
  ]);
  assert.deepEqual(derivedConsumer.exactDependencyPredecessors, [producer]);
});

test("keeps escaped quoted identity and fails closed on unsupported identifiers", () => {
  const escaped = tokenizePostgresSql('select * from "weird""schema"."item";')
    .filter((token) => token.type === "QUOTED_IDENTIFIER")
    .map((token) => token.value);
  assert.deepEqual(escaped, ['weird"schema', "item"]);
  assertClosureFailure(
    () => tokenizePostgresSql('select * from U&"public"."profiles";'),
    "UNSUPPORTED_IDENTIFIER_FORM",
  );
  assertClosureFailure(
    () => tokenizePostgresSql("select * from public.테이블;"),
    "UNSUPPORTED_IDENTIFIER_FORM",
  );

  const dollarName = tokenizePostgresSql("select public.foo$bar;")
    .filter((token) => token.type.endsWith("IDENTIFIER"))
    .map((token) => token.value);
  assert.deepEqual(dollarName, ["select", "public", "foo$bar"]);
});

test("never rescans quoted identifier payloads as executable SQL", () => {
  const sql = `
    select "x create extension pgcrypto;";
    select "x create table public.fake (id bigint);";
    select "x public.unregistered_dependency auth.uid()";
  `;
  assert.deepEqual(extractCreateExtensions(sql), []);
  assert.deepEqual(deriveProducedDatabaseObjects(sql), []);
  assert.deepEqual(deriveRequiredExtensionUses(sql), []);
  assert.deepEqual(deriveExternalFunctionDependencies(sql), []);
});

test("scans only grammar-established executable dollar bodies", () => {
  const scalar = `select $$digest('scalar', 'sha256'); auth.uid(); public.fake$$;`;
  assert.deepEqual(deriveRequiredExtensionUses(scalar), []);
  assert.deepEqual(deriveExternalFunctionDependencies(scalar), []);

  const executable = `
    do $body$
    begin
      perform digest('executable', 'sha256');
      perform auth.uid();
      perform $nested$auth.uid(); digest('nested', 'sha256');$nested$;
    end
    $body$;
  `;
  assert.deepEqual(deriveRequiredExtensionUses(executable), [
    {
      name: "pgcrypto",
      schema: null,
      evidence: [{ kind: "function", identifier: "digest", occurrences: 1 }],
    },
  ]);
  assert.deepEqual(deriveExternalFunctionDependencies(executable), [
    {
      identifier: "auth.uid",
      registry: "MANIFEST_OBJECT",
      manifestRequired: true,
      occurrences: 1,
    },
  ]);

  const functionBody = `
    create function public.f() returns void as $fn$
    begin
      perform auth.uid();
    end
    $fn$ language plpgsql;
  `;
  assert.equal(deriveExternalFunctionDependencies(functionBody)[0].occurrences, 1);

  const sqlFunctionBody = `
    create function public.sql_f() returns uuid as $fn$
      select auth.uid()
    $fn$ language sql;
  `;
  assert.equal(deriveExternalFunctionDependencies(sqlFunctionBody)[0].occurrences, 1);

  const nonSqlBodies = `
    do language c $body$auth.uid(); digest('ignored', 'sha256');$body$;
    create function public.c_f() returns void as $fn$
      auth.uid(); digest('ignored', 'sha256');
    $fn$ language c;
  `;
  assert.deepEqual(deriveRequiredExtensionUses(nonSqlBodies), []);
  assert.deepEqual(deriveExternalFunctionDependencies(nonSqlBodies), []);

  assertClosureFailure(
    () =>
      deriveExternalFunctionDependencies(`
        create function public.ambiguous_f() returns void as $fn$
          auth.uid();
        $fn$;
      `),
    "AMBIGUOUS_EXECUTABLE_DOLLAR_BODY_LANGUAGE",
  );

  for (const routine of [
    `create function public.parameter_named_language(language text)
       returns void as $fn$ select auth.uid() $fn$ language sql;`,
    `create function public.language() returns language
       as $fn$ select auth.uid() $fn$ language sql;`,
    `create function public.language_before_body(language text) returns void
       language sql as $fn$ select auth.uid() $fn$;`,
    `create function public.qualified_language_return() returns public.language
       transform for type public.language language sql
       as $fn$ select auth.uid() $fn$;`,
    `create function public.qualified_language_set_return() returns setof public.language
       as $fn$ select auth.uid() $fn$ language sql;`,
  ]) {
    assert.equal(deriveExternalFunctionDependencies(routine)[0].occurrences, 1);
  }
});

test("parses exact routine LANGUAGE options including legacy string names", () => {
  for (const routine of [
    `create function public.string_language_after() returns uuid
       language 'sql' as $fn$ select auth.uid() $fn$;`,
    `create function public.string_language_before() returns uuid
       as $fn$ select auth.uid() $fn$ language 'sql';`,
    `create function public.transform_language_name() returns text
       transform for type language language sql
       as $fn$ select auth.uid()::text $fn$;`,
    `create function public.support_language_name() returns uuid
       support language language sql
       as $fn$ select auth.uid() $fn$;`,
    `create function public.set_language_name() returns uuid
       language sql set language to 'korean'
       as $fn$ select auth.uid() $fn$;`,
  ]) {
    assert.equal(deriveExternalFunctionDependencies(routine)[0].occurrences, 1);
  }
  assert.deepEqual(
    deriveExternalFunctionDependencies(
      `do language 'c' $body$ select auth.uid(); $body$;`,
    ),
    [],
  );
  assertClosureFailure(
    () =>
      deriveExternalFunctionDependencies(
        `do language E'sql' $body$ select auth.uid(); $body$;`,
      ),
    "UNSUPPORTED_ROUTINE_LANGUAGE_LITERAL",
  );
});

test("requires extension creation before use and covers vector type forms", () => {
  const record = {
    currentFilename: "20260101000000_extension_order.sql",
    presentOnLiveMain: true,
    freshHistoryOrder: 1,
    drops: [],
    modifies: [],
  };
  assertClosureFailure(
    () =>
      deriveMigrationDependencyClosure(
        [record],
        new Map([
          [
            record.currentFilename,
            "select digest('before', 'sha256'); create extension pgcrypto;",
          ],
        ]),
      ),
    "EXTENSION_USE_BEFORE_CREATE",
  );
  const [ordered] = deriveMigrationDependencyClosure(
    [record],
    new Map([
      [
        record.currentFilename,
        "create extension pgcrypto; select digest('after', 'sha256');",
      ],
    ]),
  );
  assert.equal(ordered.requiredExtensions[0].satisfaction, "CURRENT_MIGRATION_CREATE");

  for (const migrations of [
    [
      "create extension vector;",
      "drop extension vector;",
      "create table public.embedding (value vector);",
    ],
    [
      "create extension vector; drop extension vector; create table public.embedding (value vector);",
    ],
    [
      "create extension vector schema extensions; alter extension vector set schema moved; create table public.embedding (value extensions.vector);",
    ],
  ]) {
    const records = migrations.map((_, index) => ({
      currentFilename: `${index + 1}.sql`,
      presentOnLiveMain: true,
      freshHistoryOrder: index + 1,
    }));
    assertClosureFailure(
      () =>
        deriveMigrationDependencyClosure(
          records,
          new Map(migrations.map((migrationSql, index) => [`${index + 1}.sql`, migrationSql])),
        ),
      "UNSUPPORTED_EXTENSION_LIFECYCLE_OPERATION",
    );
  }

  assert.deepEqual(
    deriveRequiredExtensionUses(`
      create table public.embedding (
        a vector,
        b vector[],
        c vector(3)
      );
      select null::vector;
      select null::extensions.vector(4);
      select "Vector"(5), "Digest"('x', 'sha256');
    `),
    [
      {
        name: "vector",
        schema: null,
        evidence: [{ kind: "type", identifier: "vector", occurrences: 4 }],
      },
      {
        name: "vector",
        schema: "extensions",
        evidence: [
          { kind: "type", identifier: "extensions.vector", occurrences: 1 },
        ],
      },
    ],
  );
});

test("recognizes vector only in statement-aware PostgreSQL type positions", () => {
  assert.deepEqual(
    deriveRequiredExtensionUses(`
      create table public.embedding_contexts (
        bare_value vector not null,
        qualified_value extensions.vector default null
      );
      create function public.vector_rows() returns setof vector as $sql$
        select null::vector
      $sql$ language sql;
      select 1 as vector;
    `),
    [
      {
        name: "vector",
        schema: null,
        evidence: [{ kind: "type", identifier: "vector", occurrences: 3 }],
      },
      {
        name: "vector",
        schema: "extensions",
        evidence: [
          { kind: "type", identifier: "extensions.vector", occurrences: 1 },
        ],
      },
    ],
  );
  assert.deepEqual(deriveRequiredExtensionUses("select 1 as vector;"), []);
  assertClosureFailure(
    () => deriveRequiredExtensionUses("select vector[1];"),
    "AMBIGUOUS_EXTENSION_TYPE_POSITION",
  );
  assert.deepEqual(
    deriveRequiredExtensionUses(`
      create function public.unnamed_vector(vector) returns void
        language sql as $fn$ select null $fn$;
      create function public.unnamed_qualified_vector(extensions.vector)
        returns void language sql as $fn$ select null $fn$;
      create cast (vector as text) with inout;
      create cast (text as vector) with inout;
      select cast(vector as text), cast(value as vector);
    `),
    [
      {
        name: "vector",
        schema: null,
        evidence: [{ kind: "type", identifier: "vector", occurrences: 4 }],
      },
      {
        name: "vector",
        schema: "extensions",
        evidence: [
          { kind: "type", identifier: "extensions.vector", occurrences: 1 },
        ],
      },
    ],
  );
  assert.deepEqual(
    deriveRequiredExtensionUses(`
      create table public.vector_named_column (
        vector integer,
        other integer default vector
      );
    `),
    [],
  );
  assert.deepEqual(
    deriveRequiredExtensionUses(
      "select cast((select 1 as vector) as integer);",
    ),
    [],
  );
  assert.deepEqual(
    deriveRequiredExtensionUses(
      "select cast(cast(value as vector) as text);",
    ),
    [
      {
        name: "vector",
        schema: null,
        evidence: [{ kind: "type", identifier: "vector", occurrences: 1 }],
      },
    ],
  );
  assert.deepEqual(
    deriveRequiredExtensionUses("select returns vector from public.t;"),
    [],
  );
  assert.deepEqual(
    deriveRequiredExtensionUses(
      "create table public.x as select of vector from public.t;",
    ),
    [],
  );

  assert.deepEqual(
    deriveRequiredExtensionUses(`
      alter table public.embedding alter column value type vector;
      alter table public.embedding alter column value set data type extensions.vector;
      do language plpgsql $body$
      declare first_value vector;
              second_value constant extensions.vector;
      begin
        select cast(first_value as integer), cast(second_value as vector);
      end
      $body$;
      drop function public.vector_consumer(vector);
      grant execute on function public.qualified_vector_consumer(extensions.vector)
        to authenticated;
    `),
    [
      {
        name: "vector",
        schema: null,
        evidence: [{ kind: "type", identifier: "vector", occurrences: 4 }],
      },
      {
        name: "vector",
        schema: "extensions",
        evidence: [
          { kind: "type", identifier: "extensions.vector", occurrences: 3 },
        ],
      },
    ],
  );

  const oneBareVectorUse = [
    {
      name: "vector",
      schema: null,
      evidence: [{ kind: "type", identifier: "vector", occurrences: 1 }],
    },
  ];
  for (const extensionName of ["add", "drop", '"add"', '"drop"']) {
    for (const operation of ["add", "drop"]) {
      for (const member of [
        "transform for vector language plpython3u",
        "cast (vector as text)",
        "aggregate public.vector_member_agg(vector)",
        "operator public.## (none, vector)",
        "operator public.## (vector, none)",
      ]) {
        assert.deepEqual(
          deriveRequiredExtensionUses(
            `alter extension ${extensionName} ${operation} ${member};`,
          ),
          oneBareVectorUse,
          `${extensionName}:${operation}:${member}`,
        );
      }
    }
  }
});

test("covers CAST, aggregate and operator operation identity types", () => {
  const oneBareVectorUse = [
    {
      name: "vector",
      schema: null,
      evidence: [{ kind: "type", identifier: "vector", occurrences: 1 }],
    },
  ];
  for (const sql of [
    "drop cast (vector as text);",
    "comment on cast (text as vector) is 'vector cast';",
    "drop aggregate public.vector_agg(vector);",
    "alter aggregate public.vector_agg(vector) owner to postgres;",
    "comment on aggregate public.vector_agg(vector) is 'vector aggregate';",
    "drop operator public.## (vector, integer);",
    "alter operator public.## (integer, vector) owner to postgres;",
    "comment on operator public.## (none, vector) is 'unary vector operator';",
    "drop operator public.## (vector, none), public.@@ (none, integer);",
  ]) {
    assert.deepEqual(deriveRequiredExtensionUses(sql), oneBareVectorUse, sql);
  }
});

test("covers vector in PREPARE, aggregate, operator and transform type grammar", () => {
  assert.deepEqual(
    deriveRequiredExtensionUses(`
      prepare vector_query (vector, extensions.vector) as select 1;
      create aggregate public.vector_agg(bigint) (
        sfunc = public.vector_step,
        stype = vector
      );
      create operator public.## (
        leftarg = vector,
        rightarg = extensions.vector,
        procedure = public.vector_operator
      );
      create transform for vector language sql (
        from sql with function public.vector_to_text(text)
      );
      drop transform if exists for extensions.vector language sql;
    `),
    [
      {
        name: "vector",
        schema: null,
        evidence: [{ kind: "type", identifier: "vector", occurrences: 4 }],
      },
      {
        name: "vector",
        schema: "extensions",
        evidence: [
          { kind: "type", identifier: "extensions.vector", occurrences: 3 },
        ],
      },
    ],
  );

  assert.deepEqual(
    deriveRequiredExtensionUses(`
      create function public.transformed() returns integer
        transform for type vector
        language plpython3u as $body$ return 1 $body$;
      alter extension x add transform for vector language plpython3u;
      alter extension x drop transform for extensions.vector language plpython3u;
      alter extension x add cast (vector as text);
      alter extension x add cast (text as extensions.vector);
      alter extension x add aggregate public.vector_member_agg(vector);
      alter extension x add operator public.## (vector, integer);
    `),
    [
      {
        name: "vector",
        schema: null,
        evidence: [{ kind: "type", identifier: "vector", occurrences: 5 }],
      },
      {
        name: "vector",
        schema: "extensions",
        evidence: [
          { kind: "type", identifier: "extensions.vector", occurrences: 2 },
        ],
      },
    ],
  );
});

test("covers aggregate input, range and operator-class vector types without name false positives", () => {
  assert.deepEqual(
    deriveRequiredExtensionUses(`
      create aggregate public.vector_input_agg(vector, extensions.vector(3)) (
        sfunc = public.vector_step,
        stype = integer
      );
      create aggregate public.ordered_vector_agg(integer order by vector) (
        sfunc = public.vector_step,
        stype = integer
      );
      create type public.vector_range as range (subtype = vector);
      create operator class public.vector_ops for type vector using btree as
        operator 1 < (vector, vector),
        function 1 public.vector_compare(vector, vector),
        storage extensions.vector;
    `),
    [
      {
        name: "vector",
        schema: null,
        evidence: [{ kind: "type", identifier: "vector", occurrences: 8 }],
      },
      {
        name: "vector",
        schema: "extensions",
        evidence: [
          { kind: "type", identifier: "extensions.vector", occurrences: 2 },
        ],
      },
    ],
  );
  for (const sql of [
    "prepare vector as select 1;",
    "deallocate vector;",
    "close vector;",
    "listen vector;",
    "notify vector;",
    "unlisten vector;",
  ]) {
    assert.deepEqual(deriveRequiredExtensionUses(sql), [], sql);
  }
  assert.deepEqual(
    deriveDatabaseObjectReferences("select public.f(1);", [
      { kind: "function", identifier: "public.f" },
    ]),
    [{ kind: "function", identifier: "public.f" }],
  );
  assert.deepEqual(
    deriveRequiredExtensionUses(`
      alter type vector rename attribute x to y;
      grant usage on type vector to authenticated;
      comment on type extensions.vector is 'extension type';
      create table public.vector_row of extensions.vector;
    `),
    [
      {
        name: "vector",
        schema: null,
        evidence: [{ kind: "type", identifier: "vector", occurrences: 2 }],
      },
      {
        name: "vector",
        schema: "extensions",
        evidence: [
          { kind: "type", identifier: "extensions.vector", occurrences: 2 },
        ],
      },
    ],
  );
});

test("covers vector in type objects, foreign tables and altered operator families", () => {
  assert.deepEqual(
    deriveRequiredExtensionUses(`
      alter type public.composite_value add attribute embedding vector(3);
      create type public.base_value (
        input = public.base_input,
        output = public.base_output,
        element = extensions.vector(4)
      );
      create foreign table public.foreign_embeddings (
        embedding vector
      ) server local_server;
      alter operator family public.vector_family using btree add
        operator 1 < (extensions.vector(5), vector);
      alter operator family public.vector_family using btree add
        function 1 (integer, integer) public.vector_compare(vector, vector);
      create operator class public.vector_support_ops for type integer using btree as
        function 1 (integer, integer) public.vector_compare(vector, extensions.vector);
    `),
    [
      {
        name: "vector",
        schema: null,
        evidence: [{ kind: "type", identifier: "vector", occurrences: 6 }],
      },
      {
        name: "vector",
        schema: "extensions",
        evidence: [
          { kind: "type", identifier: "extensions.vector", occurrences: 3 },
        ],
      },
    ],
  );
  assert.deepEqual(
    deriveProducedDatabaseObjects(`
      create foreign table public.foreign_embeddings (id bigint) server local_server;
      create recursive view public.recursive_values(value) as
        select 1 union all select value + 1 from public.recursive_values where value < 3;
    `),
    [
      { kind: "table", identifier: "public.foreign_embeddings" },
      { kind: "view", identifier: "public.recursive_values" },
    ],
  );

  const filename = "20260101000000_non_reportable_targets.sql";
  for (const sql of [
    `create extension vector;
     create aggregate public.vector_agg(vector) (
       sfunc = public.vector_step,
       stype = integer
     );`,
    `create extension vector;
     alter extension vector add aggregate public.vector_agg(vector);`,
    `create extension vector;
     create operator class public.vector_ops for type vector using btree as
       storage vector;`,
    `create extension vector;
     alter operator family public.vector_family using btree add
       operator 1 < (vector, vector);`,
  ]) {
    const [derived] = deriveMigrationDependencyClosure(
      [{ currentFilename: filename, presentOnLiveMain: true, freshHistoryOrder: 1 }],
      new Map([[filename, sql]]),
      {
        externalDatabaseObjects: [
          { kind: "function", identifier: "public.vector_step" },
        ],
      },
    );
    assert.equal(derived.requiredExtensions[0].name, "vector", sql);
  }

  for (const sql of [
    `create extension vector;
     alter extension vector add operator class public.vector_ops using btree;`,
    `create extension vector;
     alter extension vector drop operator class public.vector_ops using btree;`,
    `create extension vector;
     alter extension vector add operator family public.vector_family using btree;`,
    `create extension vector;
     alter extension vector drop operator family public.vector_family using btree;`,
  ]) {
    const [derived] = deriveMigrationDependencyClosure(
      [{ currentFilename: filename, presentOnLiveMain: true, freshHistoryOrder: 1 }],
      new Map([[filename, sql]]),
    );
    assert.equal(derived.createdExtensions[0].name, "vector", sql);
    assert.deepEqual(derived.referencedDatabaseObjects, [], sql);
  }
});

test("classifies qualified calls as functions before relation identity", () => {
  assertClosureFailure(
    () => deriveExternalFunctionDependencies("select auth.users();"),
    "UNREGISTERED_EXTERNAL_FUNCTION",
  );
  assert.deepEqual(
    deriveExternalFunctionDependencies("select * from auth.users;"),
    [],
  );
  assert.deepEqual(
    deriveDatabaseObjectReferences(
      "select * from auth.users; select null::public.known_type; alter sequence public.known_sequence restart;",
      [
        { kind: "table", identifier: "auth.users" },
        { kind: "type", identifier: "public.known_type" },
        { kind: "sequence", identifier: "public.known_sequence" },
      ],
    ),
    [
      { kind: "sequence", identifier: "public.known_sequence" },
      { kind: "table", identifier: "auth.users" },
      { kind: "type", identifier: "public.known_type" },
    ],
  );
});

test("matches qualified database objects by both exact identity and SQL kind", () => {
  const relationOnly = [{ kind: "table", identifier: "public.foo" }];
  assertClosureFailure(
    () => deriveDatabaseObjectReferences("select public.foo();", relationOnly),
    "WRONG_DATABASE_OBJECT_KIND",
  );
  assertClosureFailure(
    () => deriveDatabaseObjectReferences("select null::public.foo;", relationOnly),
    "WRONG_DATABASE_OBJECT_KIND",
  );

  const overloadedIdentity = [
    { kind: "table", identifier: "public.foo" },
    { kind: "function", identifier: "public.foo" },
  ];
  assert.deepEqual(
    deriveDatabaseObjectReferences("select public.foo();", overloadedIdentity),
    [{ kind: "function", identifier: "public.foo" }],
  );
  assertClosureFailure(
    () => deriveDatabaseObjectReferences("select public.foo;", overloadedIdentity),
    "AMBIGUOUS_DATABASE_OBJECT_KIND",
  );

  assert.deepEqual(
    deriveExternalFunctionDependencies("select * from auth.uid();"),
    [
      {
        identifier: "auth.uid",
        registry: "MANIFEST_OBJECT",
        manifestRequired: true,
        occurrences: 1,
      },
    ],
  );
  assert.deepEqual(
    deriveExternalFunctionDependencies(
      "create table public.child (owner_id uuid references auth.users(id));",
    ),
    [],
  );
});

test("fails closed on unknown qualified schemas in database-object contexts", () => {
  const record = {
    currentFilename: "20260101000000_unknown_schema.sql",
    presentOnLiveMain: true,
    freshHistoryOrder: 1,
    drops: [],
    modifies: [],
  };
  for (const sql of [
    "select * from other.foo;",
    'select * from "other"."foo";',
    'select * from public."foo.bar";',
  ]) {
    assertClosureFailure(
      () =>
        deriveMigrationDependencyClosure(
          [record],
          new Map([[record.currentFilename, sql]]),
        ),
      "UNREGISTERED_QUALIFIED_DATABASE_OBJECT",
    );
  }
});

test("fails closed on unknown qualified objects across closed DDL and utility contexts", () => {
  const record = {
    currentFilename: "20260101000000_unknown_ddl_context.sql",
    presentOnLiveMain: true,
    freshHistoryOrder: 1,
    drops: [],
    modifies: [],
  };
  for (const sql of [
    "grant select on table other.foo to reader_role;",
    "create trigger trg before insert on other.foo for each row execute function public.trigger_f();",
    "revoke select on other.foo from reader_role;",
    "create rule insert_guard as on insert to other.foo do nothing;",
    "copy other.foo to stdout;",
    "vacuum other.foo;",
    "analyze other.foo;",
    "cluster other.foo;",
    "vacuum (analyze) other.foo;",
    "analyze (verbose) other.foo;",
    "select * from only other.foo;",
    "create table public.child (id bigint) inherits (other.parent);",
    "merge into only other.foo as target using public.source as source on false when not matched then insert default values;",
  ]) {
    assertClosureFailure(
      () =>
        deriveMigrationDependencyClosure(
          [record],
          new Map([[record.currentFilename, sql]]),
        ),
      "UNREGISTERED_QUALIFIED_DATABASE_OBJECT",
    );
  }

  for (const sql of [
    "grant select on public.known_table, other.foo to reader_role;",
    "vacuum public.known_table, other.foo;",
  ]) {
    assertClosureFailure(
      () =>
        deriveMigrationDependencyClosure(
          [record],
          new Map([[record.currentFilename, sql]]),
          {
            externalDatabaseObjects: [
              { kind: "table", identifier: "public.known_table" },
            ],
          },
        ),
      "UNREGISTERED_QUALIFIED_DATABASE_OBJECT",
    );
  }
});

test("limits rule targets and routine argument types to their exact grammar positions", () => {
  assert.deepEqual(
    deriveExternalFunctionDependencies(`
      create rule use_uid as on insert to public.known_table
        do select auth.uid();
    `),
    [
      {
        identifier: "auth.uid",
        registry: "MANIFEST_OBJECT",
        manifestRequired: true,
        occurrences: 1,
      },
    ],
  );
  assert.deepEqual(
    deriveDatabaseObjectReferences(
      "grant execute on function public.f(public.vector) to authenticated;",
      [
        { kind: "function", identifier: "public.f" },
        { kind: "type", identifier: "public.vector" },
      ],
    ),
    [
      { kind: "function", identifier: "public.f" },
      { kind: "type", identifier: "public.vector" },
    ],
  );
  assert.deepEqual(
    deriveDatabaseObjectReferences(
      `create rule copy_rows as on insert to public.a do also
         select a.id from public.b b join public.a a on b.id = a.id;`,
      [
        { kind: "table", identifier: "public.a" },
        { kind: "table", identifier: "public.b" },
      ],
    ),
    [
      { kind: "table", identifier: "public.a" },
      { kind: "table", identifier: "public.b" },
    ],
  );
  for (const sql of [
    "select d.id, b.id from ((select id from public.a) as d join public.b as b on true);",
    "select d.id, b.id from (((select id from public.a) as d join public.b as b on true));",
    "select d.id, b.id from ((values (1)) as d(id) join public.b as b on true);",
    "select d.id, b.id from (((values (1)) as d(id) join public.b as b on true));",
    `delete from public.target t
       using ((select id from public.a) as d join public.b as b on true)
       where d.id = b.id;`,
    `delete from public.target t
       using (((select id from public.a) as d join public.b as b on true))
       where d.id = b.id;`,
  ]) {
    assert.deepEqual(
      deriveDatabaseObjectReferences(sql, [
        { kind: "table", identifier: "public.a" },
        { kind: "table", identifier: "public.b" },
        { kind: "table", identifier: "public.target" },
        { kind: "table", identifier: "d.id" },
        { kind: "table", identifier: "b.id" },
      ]),
      [
        ...(sql.includes("public.a")
          ? [{ kind: "table", identifier: "public.a" }]
          : []),
        { kind: "table", identifier: "public.b" },
        ...(sql.includes("public.target")
          ? [{ kind: "table", identifier: "public.target" }]
          : []),
      ],
      sql,
    );
  }
  assert.deepEqual(
    deriveDatabaseObjectReferences(
      "select q.id from ((public.a join public.b on true) as q);",
      [
        { kind: "table", identifier: "public.a" },
        { kind: "table", identifier: "public.b" },
        { kind: "table", identifier: "q.id" },
      ],
    ),
    [
      { kind: "table", identifier: "public.a" },
      { kind: "table", identifier: "public.b" },
    ],
  );
  assert.deepEqual(
    deriveDatabaseObjectReferences(
      `create policy visible_rows on public.a using (
         exists(select 1 from public.b b join public.a a on b.id = a.id)
       );`,
      [
        { kind: "table", identifier: "public.a" },
        { kind: "table", identifier: "public.b" },
      ],
    ),
    [
      { kind: "table", identifier: "public.a" },
      { kind: "table", identifier: "public.b" },
    ],
  );
  assert.deepEqual(
    deriveDatabaseObjectReferences(
      `create index visible_rows_idx on public.a(id) where
         exists(select 1 from public.b b join public.a a on b.id = a.id);`,
      [
        { kind: "table", identifier: "public.a" },
        { kind: "table", identifier: "public.b" },
      ],
    ),
    [
      { kind: "table", identifier: "public.a" },
      { kind: "table", identifier: "public.b" },
    ],
  );
});

test("keeps expression FROM separators out of relation classification", () => {
  const expressionSql = `select extract(epoch from t.ts),
              substring(t.value from t.offset for 1),
              trim(both 'x' from t.value),
              overlay(t.value placing 'y' from t.offset for 1)
         from public.t t;`;
  assert.deepEqual(
    deriveDatabaseObjectReferences(
      expressionSql,
      [{ kind: "table", identifier: "public.t" }],
    ),
    [{ kind: "table", identifier: "public.t" }],
  );
  assert.deepEqual(
    deriveDatabaseObjectReferences(
      `select extract(epoch from (select max(ts) from public.t));`,
      [{ kind: "table", identifier: "public.t" }],
    ),
    [{ kind: "table", identifier: "public.t" }],
  );

  const producerFilename = "20260101000000_expression_source.sql";
  const consumerFilename = "20260101000001_expression_from.sql";
  const [, consumer] = deriveMigrationDependencyClosure(
    [
      {
        currentFilename: producerFilename,
        presentOnLiveMain: true,
        freshHistoryOrder: 1,
      },
      {
        currentFilename: consumerFilename,
        presentOnLiveMain: true,
        freshHistoryOrder: 2,
      },
    ],
    new Map([
      [producerFilename, "create table public.t(ts timestamp, value text, offset integer);"],
      [consumerFilename, expressionSql],
    ]),
  );
  assert.deepEqual(consumer.referencedDatabaseObjects, [
    { kind: "table", identifier: "public.t" },
  ]);
  assert.deepEqual(consumer.exactDependencyPredecessors, [producerFilename]);

  assert.deepEqual(
    deriveDatabaseObjectReferences(
      "select extract(epoch from public.ts) from public.source as public;",
      [
        { kind: "table", identifier: "public.source" },
        { kind: "table", identifier: "public.ts" },
      ],
    ),
    [{ kind: "table", identifier: "public.source" }],
  );
  const collisionFilename = "20260101000002_expression_alias_collision.sql";
  const sourceFilename = "20260101000003_expression_alias_source.sql";
  const queryFilename = "20260101000004_expression_alias_query.sql";
  const [, , aliasConsumer] = deriveMigrationDependencyClosure(
    [
      {
        currentFilename: collisionFilename,
        presentOnLiveMain: true,
        freshHistoryOrder: 1,
      },
      {
        currentFilename: sourceFilename,
        presentOnLiveMain: true,
        freshHistoryOrder: 2,
      },
      {
        currentFilename: queryFilename,
        presentOnLiveMain: true,
        freshHistoryOrder: 3,
      },
    ],
    new Map([
      [collisionFilename, "create table public.ts(id integer);"],
      [sourceFilename, "create table public.source(ts timestamp);"],
      [
        queryFilename,
        "select extract(epoch from public.ts) from public.source as public;",
      ],
    ]),
  );
  assert.deepEqual(aliasConsumer.referencedDatabaseObjects, [
    { kind: "table", identifier: "public.source" },
  ]);
  assert.deepEqual(aliasConsumer.exactDependencyPredecessors, [sourceFilename]);

  const operandCollisionSql = `select
      substring(public.value from public.offset for 1),
      trim(both public.pad from public.value),
      overlay(public.value placing public.replacement from public.offset for 1)
    from public.source as public;`;
  const operandObjects = [
    { kind: "table", identifier: "public.offset" },
    { kind: "table", identifier: "public.pad" },
    { kind: "table", identifier: "public.replacement" },
    { kind: "table", identifier: "public.source" },
    { kind: "table", identifier: "public.value" },
  ];
  assert.deepEqual(
    deriveDatabaseObjectReferences(operandCollisionSql, operandObjects),
    [{ kind: "table", identifier: "public.source" }],
  );
  const operandCollisionFilename =
    "20260101000005_expression_operand_collisions.sql";
  const operandSourceFilename = "20260101000006_expression_operand_source.sql";
  const operandQueryFilename = "20260101000007_expression_operand_query.sql";
  const [, , operandConsumer] = deriveMigrationDependencyClosure(
    [
      {
        currentFilename: operandCollisionFilename,
        presentOnLiveMain: true,
        freshHistoryOrder: 1,
      },
      {
        currentFilename: operandSourceFilename,
        presentOnLiveMain: true,
        freshHistoryOrder: 2,
      },
      {
        currentFilename: operandQueryFilename,
        presentOnLiveMain: true,
        freshHistoryOrder: 3,
      },
    ],
    new Map([
      [
        operandCollisionFilename,
        `create table public.value(id integer);
         create table public.offset(id integer);
         create table public.pad(id integer);
         create table public.replacement(id integer);`,
      ],
      [
        operandSourceFilename,
        `create table public.source(
           value text, offset integer, pad text, replacement text
         );`,
      ],
      [operandQueryFilename, operandCollisionSql],
    ]),
  );
  assert.deepEqual(operandConsumer.referencedDatabaseObjects, [
    { kind: "table", identifier: "public.source" },
  ]);
  assert.deepEqual(operandConsumer.exactDependencyPredecessors, [
    operandSourceFilename,
  ]);

  assert.deepEqual(
    deriveDatabaseObjectReferences(
      "select public.value from public.source s, public.other as public;",
      [
        { kind: "table", identifier: "public.other" },
        { kind: "table", identifier: "public.source" },
        { kind: "table", identifier: "public.value" },
      ],
    ),
    [
      { kind: "table", identifier: "public.other" },
      { kind: "table", identifier: "public.source" },
    ],
  );
  assert.deepEqual(
    deriveDatabaseObjectReferences(
      "select public.value from (select 1 as value) as public;",
      [{ kind: "table", identifier: "public.value" }],
    ),
    [],
  );
  assert.deepEqual(
    deriveDatabaseObjectReferences(
      `select * from public.ts
       union all
       select public.ts from public.source as public;`,
      [
        { kind: "table", identifier: "public.source" },
        { kind: "table", identifier: "public.ts" },
      ],
    ),
    [
      { kind: "table", identifier: "public.source" },
      { kind: "table", identifier: "public.ts" },
    ],
  );
  assert.deepEqual(
    deriveDatabaseObjectReferences(
      `select 1 from public.source as public
       where exists(select 1 from public.value);`,
      [
        { kind: "table", identifier: "public.source" },
        { kind: "table", identifier: "public.value" },
      ],
    ),
    [
      { kind: "table", identifier: "public.source" },
      { kind: "table", identifier: "public.value" },
    ],
  );

  const unionTableFilename = "20260101000008_union_real_target.sql";
  const unionSourceFilename = "20260101000009_union_alias_source.sql";
  const unionQueryFilename = "20260101000010_union_alias_query.sql";
  const [, , unionConsumer] = deriveMigrationDependencyClosure(
    [unionTableFilename, unionSourceFilename, unionQueryFilename].map(
      (currentFilename, index) => ({
        currentFilename,
        presentOnLiveMain: true,
        freshHistoryOrder: index + 1,
      }),
    ),
    new Map([
      [unionTableFilename, "create table public.ts(id integer);"],
      [unionSourceFilename, "create table public.source(ts timestamp);"],
      [
        unionQueryFilename,
        `select * from public.ts
         union all
         select public.ts from public.source as public;`,
      ],
    ]),
  );
  assert.deepEqual(unionConsumer.referencedDatabaseObjects, [
    { kind: "table", identifier: "public.source" },
    { kind: "table", identifier: "public.ts" },
  ]);
  assert.deepEqual(unionConsumer.exactDependencyPredecessors, [
    unionTableFilename,
    unionSourceFilename,
  ]);

  const nestedTableFilename = "20260101000011_nested_real_target.sql";
  const nestedSourceFilename = "20260101000012_nested_alias_source.sql";
  const nestedQueryFilename = "20260101000013_nested_alias_query.sql";
  const [, , nestedConsumer] = deriveMigrationDependencyClosure(
    [nestedTableFilename, nestedSourceFilename, nestedQueryFilename].map(
      (currentFilename, index) => ({
        currentFilename,
        presentOnLiveMain: true,
        freshHistoryOrder: index + 1,
      }),
    ),
    new Map([
      [nestedTableFilename, "create table public.value(id integer);"],
      [nestedSourceFilename, "create table public.source(id integer);"],
      [
        nestedQueryFilename,
        `select 1 from public.source as public
         where exists(select 1 from public.value);`,
      ],
    ]),
  );
  assert.deepEqual(nestedConsumer.referencedDatabaseObjects, [
    { kind: "table", identifier: "public.source" },
    { kind: "table", identifier: "public.value" },
  ]);
  assert.deepEqual(nestedConsumer.exactDependencyPredecessors, [
    nestedTableFilename,
    nestedSourceFilename,
  ]);

  const commaCollisionFilename = "20260101000014_comma_alias_collision.sql";
  const commaSourceFilename = "20260101000015_comma_alias_sources.sql";
  const commaQueryFilename = "20260101000016_comma_alias_query.sql";
  const [, , commaConsumer] = deriveMigrationDependencyClosure(
    [commaCollisionFilename, commaSourceFilename, commaQueryFilename].map(
      (currentFilename, index) => ({
        currentFilename,
        presentOnLiveMain: true,
        freshHistoryOrder: index + 1,
      }),
    ),
    new Map([
      [commaCollisionFilename, "create table public.value(id integer);"],
      [
        commaSourceFilename,
        `create table public.source(id integer);
         create table public.other(value integer);`,
      ],
      [
        commaQueryFilename,
        "select public.value from public.source s, public.other as public;",
      ],
    ]),
  );
  assert.deepEqual(commaConsumer.referencedDatabaseObjects, [
    { kind: "table", identifier: "public.other" },
    { kind: "table", identifier: "public.source" },
  ]);
  assert.deepEqual(commaConsumer.exactDependencyPredecessors, [
    commaSourceFilename,
  ]);

  const derivedCollisionFilename =
    "20260101000017_derived_alias_collision.sql";
  const derivedQueryFilename = "20260101000018_derived_alias_query.sql";
  const [, derivedConsumer] = deriveMigrationDependencyClosure(
    [derivedCollisionFilename, derivedQueryFilename].map(
      (currentFilename, index) => ({
        currentFilename,
        presentOnLiveMain: true,
        freshHistoryOrder: index + 1,
      }),
    ),
    new Map([
      [derivedCollisionFilename, "create table public.value(id integer);"],
      [
        derivedQueryFilename,
        "select public.value from (select 1 as value) as public;",
      ],
    ]),
  );
  assert.deepEqual(derivedConsumer.referencedDatabaseObjects, []);
  assert.deepEqual(derivedConsumer.exactDependencyPredecessors, []);

  const commaTargetSql =
    "select public.ts from public.source as public, public.ts;";
  assert.deepEqual(
    deriveDatabaseObjectReferences(commaTargetSql, [
      { kind: "table", identifier: "public.source" },
      { kind: "table", identifier: "public.ts" },
    ]),
    [
      { kind: "table", identifier: "public.source" },
      { kind: "table", identifier: "public.ts" },
    ],
  );
  const commaTargetTableFilename = "20260101000019_comma_real_target.sql";
  const commaTargetSourceFilename = "20260101000020_comma_target_source.sql";
  const commaTargetQueryFilename = "20260101000021_comma_target_query.sql";
  const [, , commaTargetConsumer] = deriveMigrationDependencyClosure(
    [
      commaTargetTableFilename,
      commaTargetSourceFilename,
      commaTargetQueryFilename,
    ].map((currentFilename, index) => ({
      currentFilename,
      presentOnLiveMain: true,
      freshHistoryOrder: index + 1,
    })),
    new Map([
      [commaTargetTableFilename, "create table public.ts(id integer);"],
      [commaTargetSourceFilename, "create table public.source(ts timestamp);"],
      [commaTargetQueryFilename, commaTargetSql],
    ]),
  );
  assert.deepEqual(commaTargetConsumer.referencedDatabaseObjects, [
    { kind: "table", identifier: "public.source" },
    { kind: "table", identifier: "public.ts" },
  ]);
  assert.deepEqual(commaTargetConsumer.exactDependencyPredecessors, [
    commaTargetTableFilename,
    commaTargetSourceFilename,
  ]);

  for (const sql of [
    "select public.value from app.rows() as public;",
    "select public.value from lateral app.rows() as public;",
    "select public.value from app.rows() with ordinality as public;",
    "select public.value from lateral app.rows() with ordinality public;",
  ]) {
    assert.deepEqual(
      deriveDatabaseObjectReferences(sql, [
        { kind: "function", identifier: "app.rows" },
        { kind: "table", identifier: "public.value" },
      ]),
      [{ kind: "function", identifier: "app.rows" }],
      sql,
    );
  }
  for (const sql of [
    "select public.value from generate_series(1, 2) as public(value);",
    "select public.value from lateral generate_series(1, 2) public(value);",
    "select public.value from generate_series(1, 2) with ordinality as public(value, n);",
    "select public.value from lateral generate_series(1, 2) with ordinality public(value, n);",
  ]) {
    assert.deepEqual(
      deriveDatabaseObjectReferences(sql, [
        { kind: "table", identifier: "public.value" },
      ]),
      [],
      sql,
    );
  }
  for (const sql of [
    "select rows.value from app.rows();",
    "select rows.value from lateral app.rows() with ordinality;",
  ]) {
    assert.deepEqual(
      deriveDatabaseObjectReferences(sql, [
        { kind: "function", identifier: "app.rows" },
        { kind: "table", identifier: "rows.value" },
      ]),
      [{ kind: "function", identifier: "app.rows" }],
      sql,
    );
  }
  for (const sql of [
    "select generate_series.generate_series from generate_series(1, 2);",
    "select generate_series.generate_series from lateral generate_series(1, 2) with ordinality;",
  ]) {
    assert.deepEqual(
      deriveDatabaseObjectReferences(sql, [
        { kind: "table", identifier: "generate_series.generate_series" },
      ]),
      [],
      sql,
    );
  }
  for (const sql of [
    "select source.value from public.source;",
    "select source.value from only public.source;",
    "select source.value from only (public.source);",
    "select source.value from only (public.source) *;",
    "select source.value from public.source tablesample system (100);",
    "create view public.v as select source.value from public.source with local check option;",
    "create view public.v as select source.value from public.source with cascaded check option;",
    "create materialized view public.mv as select source.value from public.source with data;",
    "create materialized view public.mv as select source.value from public.source with no data;",
  ]) {
    assert.deepEqual(
      deriveDatabaseObjectReferences(sql, [
        { kind: "table", identifier: "public.source" },
        { kind: "table", identifier: "source.value" },
      ]),
      [{ kind: "table", identifier: "public.source" }],
      sql,
    );
  }
  for (const [joinPrefix, joinCondition] of [
    ["cross join", ""],
    ["inner join", " on true"],
    ["left join", " on true"],
    ["left outer join", " on true"],
    ["right join", " on true"],
    ["full join", " on true"],
    ["natural join", ""],
  ]) {
    const sql = `select rows.value from app.rows() with ordinality ${joinPrefix} public.source s${joinCondition};`;
    assert.deepEqual(
      deriveDatabaseObjectReferences(sql, [
        { kind: "function", identifier: "app.rows" },
        { kind: "table", identifier: "public.source" },
        { kind: "table", identifier: "rows.value" },
      ]),
      [
        { kind: "function", identifier: "app.rows" },
        { kind: "table", identifier: "public.source" },
      ],
      sql,
    );
  }
  for (const sql of [
    "select j.id from public.a join public.b using (id) as j;",
    'select "J".id from public.a join public.b using (id) as "J";',
  ]) {
    assert.deepEqual(
      deriveDatabaseObjectReferences(sql, [
        { kind: "table", identifier: "public.a" },
        { kind: "table", identifier: "public.b" },
        { kind: "table", identifier: "j.id" },
        { kind: "table", identifier: "J.id" },
      ]),
      [
        { kind: "table", identifier: "public.a" },
        { kind: "table", identifier: "public.b" },
      ],
      sql,
    );
  }
  for (const sql of [
    "select a.id from (public.a as a join public.b as b on true);",
    "select j.id from (public.a join public.b using (id) as j);",
    "select a.id from ((public.a as a join public.b as b on true) join public.c as c on true);",
  ]) {
    assert.deepEqual(
      deriveDatabaseObjectReferences(sql, [
        { kind: "table", identifier: "public.a" },
        { kind: "table", identifier: "public.b" },
        { kind: "table", identifier: "public.c" },
        { kind: "table", identifier: "a.id" },
        { kind: "table", identifier: "j.id" },
      ]),
      [
        { kind: "table", identifier: "public.a" },
        { kind: "table", identifier: "public.b" },
        ...(sql.includes("public.c")
          ? [{ kind: "table", identifier: "public.c" }]
          : []),
      ],
      sql,
    );
  }
  assert.deepEqual(
    deriveDatabaseObjectReferences(
      "select q.id from (public.a join public.b on true) as q;",
      [
        { kind: "table", identifier: "public.a" },
        { kind: "table", identifier: "public.b" },
        { kind: "table", identifier: "q.id" },
      ],
    ),
    [
      { kind: "table", identifier: "public.a" },
      { kind: "table", identifier: "public.b" },
    ],
  );
  for (const sql of [
    "with public(value) as (values (1)) select public.value from public;",
    "with x as (select value from public.source) select x.value from x;",
    "with recursive x(value) as (values (1) union all select x.value + 1 from x where x.value < 2) select x.value from x;",
    "select x.value from unqualified_source as x;",
    'with "X"(value) as (values (1)) select "X".value from "X";',
  ]) {
    assert.deepEqual(
      deriveDatabaseObjectReferences(sql, [
        { kind: "table", identifier: "public.source" },
        { kind: "table", identifier: "public.value" },
        { kind: "table", identifier: "x.value" },
        { kind: "table", identifier: "X.value" },
      ]),
      sql.includes("public.source")
        ? [{ kind: "table", identifier: "public.source" }]
        : [],
      sql,
    );
  }
  for (const sql of [
    `delete from public.target t
       using (select 1 as value) as public
       where public.value = 1;`,
    `merge into public.target t
       using (values (1)) as public(value)
       on false
       when not matched then insert (id) values (public.value);`,
  ]) {
    assert.deepEqual(
      deriveDatabaseObjectReferences(sql, [
        { kind: "table", identifier: "public.target" },
        { kind: "table", identifier: "public.value" },
      ]),
      [{ kind: "table", identifier: "public.target" }],
      sql,
    );
  }
  for (const sql of [
    `delete from public.target t
       using (public.a a join public.b b using (id) as j)
       where j.id = 1;`,
    `merge into public.target t
       using (public.a a join public.b b using (id) as j)
       on j.id = t.id
       when not matched then insert (id) values (j.id);`,
  ]) {
    assert.deepEqual(
      deriveDatabaseObjectReferences(sql, [
        { kind: "table", identifier: "public.a" },
        { kind: "table", identifier: "public.b" },
        { kind: "table", identifier: "public.target" },
        { kind: "table", identifier: "j.id" },
      ]),
      [
        { kind: "table", identifier: "public.a" },
        { kind: "table", identifier: "public.b" },
        { kind: "table", identifier: "public.target" },
      ],
      sql,
    );
  }
  const tableFunctionCollisionFilename =
    "20260101000022_table_function_alias_collision.sql";
  const tableFunctionSourceFilename =
    "20260101000023_table_function_alias_source.sql";
  const tableFunctionQueryFilename =
    "20260101000024_table_function_alias_query.sql";
  for (const sql of [
    "select public.value from app.rows() as public;",
    "select public.value from lateral app.rows() as public;",
    "select public.value from app.rows() with ordinality as public;",
    "select public.value from lateral app.rows() with ordinality public;",
  ]) {
    const [, , tableFunctionConsumer] = deriveMigrationDependencyClosure(
      [
        tableFunctionCollisionFilename,
        tableFunctionSourceFilename,
        tableFunctionQueryFilename,
      ].map((currentFilename, index) => ({
        currentFilename,
        presentOnLiveMain: true,
        freshHistoryOrder: index + 1,
      })),
      new Map([
        [
          tableFunctionCollisionFilename,
          "create table public.value(id integer);",
        ],
        [
          tableFunctionSourceFilename,
          `create function app.rows() returns table(value integer)
             language sql as $$ select 1 $$;`,
        ],
        [tableFunctionQueryFilename, sql],
      ]),
    );
    assert.deepEqual(
      tableFunctionConsumer.referencedDatabaseObjects,
      [{ kind: "function", identifier: "app.rows" }],
      sql,
    );
    assert.deepEqual(
      tableFunctionConsumer.exactDependencyPredecessors,
      [tableFunctionSourceFilename],
      sql,
    );
  }
  const rowsFromSql = `select public.value
    from rows from (app.rows(), app.more_rows())
    with ordinality as public;`;
  assert.deepEqual(
    deriveDatabaseObjectReferences(rowsFromSql, [
      { kind: "function", identifier: "app.more_rows" },
      { kind: "function", identifier: "app.rows" },
      { kind: "table", identifier: "public.value" },
    ]),
    [
      { kind: "function", identifier: "app.more_rows" },
      { kind: "function", identifier: "app.rows" },
    ],
  );
  const rowsFromSourceFilename = "20260101000025_rows_from_alias_source.sql";
  const rowsFromQueryFilename = "20260101000026_rows_from_alias_query.sql";
  const [, rowsFromConsumer] = deriveMigrationDependencyClosure(
    [rowsFromSourceFilename, rowsFromQueryFilename].map(
      (currentFilename, index) => ({
        currentFilename,
        presentOnLiveMain: true,
        freshHistoryOrder: index + 1,
      }),
    ),
    new Map([
      [
        rowsFromSourceFilename,
        `create function app.rows() returns table(value integer)
           language sql as $$ select 1 $$;
         create function app.more_rows() returns table(value integer)
           language sql as $$ select 2 $$;`,
      ],
      [rowsFromQueryFilename, rowsFromSql],
    ]),
  );
  assert.deepEqual(rowsFromConsumer.referencedDatabaseObjects, [
    { kind: "function", identifier: "app.more_rows" },
    { kind: "function", identifier: "app.rows" },
  ]);
  assert.deepEqual(rowsFromConsumer.exactDependencyPredecessors, [
    rowsFromSourceFilename,
  ]);
  for (const sql of [
    "select rows.value from rows from (app.rows(), app.more_rows());",
    "select rows.value from lateral rows from (app.rows(), app.more_rows()) with ordinality;",
  ]) {
    assert.deepEqual(
      deriveDatabaseObjectReferences(sql, [
        { kind: "function", identifier: "app.more_rows" },
        { kind: "function", identifier: "app.rows" },
        { kind: "table", identifier: "rows.value" },
      ]),
      [
        { kind: "function", identifier: "app.more_rows" },
        { kind: "function", identifier: "app.rows" },
      ],
      sql,
    );
  }

  const unqualifiedFunctionCollisionFilename =
    "20260101000027_unqualified_function_alias_collision.sql";
  const unqualifiedFunctionQueryFilename =
    "20260101000028_unqualified_function_alias_query.sql";
  const [, unqualifiedFunctionConsumer] = deriveMigrationDependencyClosure(
    [unqualifiedFunctionCollisionFilename, unqualifiedFunctionQueryFilename].map(
      (currentFilename, index) => ({
        currentFilename,
        presentOnLiveMain: true,
        freshHistoryOrder: index + 1,
      }),
    ),
    new Map([
      [
        unqualifiedFunctionCollisionFilename,
        "create table public.value(id integer);",
      ],
      [
        unqualifiedFunctionQueryFilename,
        "select public.value from generate_series(1, 2) with ordinality as public(value, n);",
      ],
    ]),
  );
  assert.deepEqual(
    unqualifiedFunctionConsumer.referencedDatabaseObjects,
    [],
  );
  assert.deepEqual(unqualifiedFunctionConsumer.exactDependencyPredecessors, []);

  const implicitAliasCollisionFilename =
    "20260101000029_implicit_function_alias_collision.sql";
  const implicitAliasSourceFilename =
    "20260101000030_implicit_function_alias_source.sql";
  const implicitAliasQueryFilename =
    "20260101000031_implicit_function_alias_query.sql";
  for (const sql of [
    "select rows.value from app.rows();",
    "select rows.value from lateral app.rows() with ordinality;",
  ]) {
    const [, , implicitAliasConsumer] = deriveMigrationDependencyClosure(
      [
        implicitAliasCollisionFilename,
        implicitAliasSourceFilename,
        implicitAliasQueryFilename,
      ].map((currentFilename, index) => ({
        currentFilename,
        presentOnLiveMain: true,
        freshHistoryOrder: index + 1,
      })),
      new Map([
        [
          implicitAliasCollisionFilename,
          "create table rows.value(id integer);",
        ],
        [
          implicitAliasSourceFilename,
          `create function app.rows() returns table(value integer)
             language sql as $$ select 1 $$;`,
        ],
        [implicitAliasQueryFilename, sql],
      ]),
    );
    assert.deepEqual(
      implicitAliasConsumer.referencedDatabaseObjects,
      [{ kind: "function", identifier: "app.rows" }],
      sql,
    );
    assert.deepEqual(
      implicitAliasConsumer.exactDependencyPredecessors,
      [implicitAliasSourceFilename],
      sql,
    );
  }

  const implicitTableAliasCollisionFilename =
    "20260101000032_implicit_table_alias_collision.sql";
  const implicitTableAliasSourceFilename =
    "20260101000033_implicit_table_alias_source.sql";
  const implicitTableAliasQueryFilename =
    "20260101000034_implicit_table_alias_query.sql";
  const [, , implicitTableAliasConsumer] = deriveMigrationDependencyClosure(
    [
      implicitTableAliasCollisionFilename,
      implicitTableAliasSourceFilename,
      implicitTableAliasQueryFilename,
    ].map((currentFilename, index) => ({
      currentFilename,
      presentOnLiveMain: true,
      freshHistoryOrder: index + 1,
    })),
    new Map([
      [
        implicitTableAliasCollisionFilename,
        "create table source.value(id integer);",
      ],
      [
        implicitTableAliasSourceFilename,
        "create table public.source(value integer);",
      ],
      [
        implicitTableAliasQueryFilename,
        "select source.value from public.source;",
      ],
    ]),
  );
  assert.deepEqual(implicitTableAliasConsumer.referencedDatabaseObjects, [
    { kind: "table", identifier: "public.source" },
  ]);
  assert.deepEqual(implicitTableAliasConsumer.exactDependencyPredecessors, [
    implicitTableAliasSourceFilename,
  ]);

  for (const sql of [
    "select source.value from only (public.source);",
    "create view public.v as select source.value from public.source with local check option;",
    "create materialized view public.mv as select source.value from public.source with no data;",
  ]) {
    const [, , boundaryAliasConsumer] = deriveMigrationDependencyClosure(
      [
        implicitTableAliasCollisionFilename,
        implicitTableAliasSourceFilename,
        implicitTableAliasQueryFilename,
      ].map((currentFilename, index) => ({
        currentFilename,
        presentOnLiveMain: true,
        freshHistoryOrder: index + 1,
      })),
      new Map([
        [
          implicitTableAliasCollisionFilename,
          "create table source.value(id integer);",
        ],
        [
          implicitTableAliasSourceFilename,
          "create table public.source(value integer);",
        ],
        [implicitTableAliasQueryFilename, sql],
      ]),
    );
    assert.deepEqual(
      boundaryAliasConsumer.referencedDatabaseObjects,
      [{ kind: "table", identifier: "public.source" }],
      sql,
    );
    assert.deepEqual(
      boundaryAliasConsumer.exactDependencyPredecessors,
      [implicitTableAliasSourceFilename],
      sql,
    );
  }

  const joinAliasCollisionFilename =
    "20260101000035_join_using_alias_collision.sql";
  const joinAliasSourceFilename = "20260101000036_join_using_alias_source.sql";
  const joinAliasQueryFilename = "20260101000037_join_using_alias_query.sql";
  const [, , joinAliasConsumer] = deriveMigrationDependencyClosure(
    [
      joinAliasCollisionFilename,
      joinAliasSourceFilename,
      joinAliasQueryFilename,
    ].map((currentFilename, index) => ({
      currentFilename,
      presentOnLiveMain: true,
      freshHistoryOrder: index + 1,
    })),
    new Map([
      [joinAliasCollisionFilename, "create table j.id(id integer);"],
      [
        joinAliasSourceFilename,
        `create table public.a(id integer);
         create table public.b(id integer);`,
      ],
      [
        joinAliasQueryFilename,
        "select j.id from public.a join public.b using (id) as j;",
      ],
    ]),
  );
  assert.deepEqual(joinAliasConsumer.referencedDatabaseObjects, [
    { kind: "table", identifier: "public.a" },
    { kind: "table", identifier: "public.b" },
  ]);
  assert.deepEqual(joinAliasConsumer.exactDependencyPredecessors, [
    joinAliasSourceFilename,
  ]);

  const joinedGroupCollisionFilename =
    "20260101000041_joined_group_alias_collision.sql";
  const joinedGroupSourceFilename =
    "20260101000042_joined_group_alias_source.sql";
  const joinedGroupQueryFilename =
    "20260101000043_joined_group_alias_query.sql";
  const [, , joinedGroupConsumer] = deriveMigrationDependencyClosure(
    [
      joinedGroupCollisionFilename,
      joinedGroupSourceFilename,
      joinedGroupQueryFilename,
    ].map((currentFilename, index) => ({
      currentFilename,
      presentOnLiveMain: true,
      freshHistoryOrder: index + 1,
    })),
    new Map([
      [joinedGroupCollisionFilename, "create table a.id(id integer);"],
      [
        joinedGroupSourceFilename,
        `create table public.a(id integer);
         create table public.b(id integer);`,
      ],
      [
        joinedGroupQueryFilename,
        "select a.id from (public.a as a join public.b as b on true);",
      ],
    ]),
  );
  assert.deepEqual(joinedGroupConsumer.referencedDatabaseObjects, [
    { kind: "table", identifier: "public.a" },
    { kind: "table", identifier: "public.b" },
  ]);
  assert.deepEqual(joinedGroupConsumer.exactDependencyPredecessors, [
    joinedGroupSourceFilename,
  ]);

  const mixedGroupCollisionFilename =
    "20260101000044_mixed_join_group_collision.sql";
  const mixedGroupSourceFilename = "20260101000045_mixed_join_group_source.sql";
  const mixedGroupQueryFilename = "20260101000046_mixed_join_group_query.sql";
  const [, , mixedGroupConsumer] = deriveMigrationDependencyClosure(
    [
      mixedGroupCollisionFilename,
      mixedGroupSourceFilename,
      mixedGroupQueryFilename,
    ].map((currentFilename, index) => ({
      currentFilename,
      presentOnLiveMain: true,
      freshHistoryOrder: index + 1,
    })),
    new Map([
      [
        mixedGroupCollisionFilename,
        "create table d.id(id integer); create table b.id(id integer);",
      ],
      [
        mixedGroupSourceFilename,
        `create table public.a(id integer);
         create table public.b(id integer);`,
      ],
      [
        mixedGroupQueryFilename,
        "select d.id, b.id from (((select id from public.a) as d join public.b as b on true));",
      ],
    ]),
  );
  assert.deepEqual(mixedGroupConsumer.referencedDatabaseObjects, [
    { kind: "table", identifier: "public.a" },
    { kind: "table", identifier: "public.b" },
  ]);
  assert.deepEqual(mixedGroupConsumer.exactDependencyPredecessors, [
    mixedGroupSourceFilename,
  ]);

  for (const sql of [
    `delete from public.target t
       using (public.a a join public.b b using (id) as j)
       where j.id = 1;`,
    `merge into public.target t
       using (public.a a join public.b b using (id) as j)
       on j.id = t.id
       when not matched then insert (id) values (j.id);`,
  ]) {
    const [, , dmlJoinedGroupConsumer] = deriveMigrationDependencyClosure(
      [
        joinAliasCollisionFilename,
        joinAliasSourceFilename,
        joinAliasQueryFilename,
      ].map((currentFilename, index) => ({
        currentFilename,
        presentOnLiveMain: true,
        freshHistoryOrder: index + 1,
      })),
      new Map([
        [joinAliasCollisionFilename, "create table j.id(id integer);"],
        [
          joinAliasSourceFilename,
          `create table public.target(id integer);
           create table public.a(id integer);
           create table public.b(id integer);`,
        ],
        [joinAliasQueryFilename, sql],
      ]),
    );
    assert.deepEqual(
      dmlJoinedGroupConsumer.referencedDatabaseObjects,
      [
        { kind: "table", identifier: "public.a" },
        { kind: "table", identifier: "public.b" },
        { kind: "table", identifier: "public.target" },
      ],
      sql,
    );
    assert.deepEqual(
      dmlJoinedGroupConsumer.exactDependencyPredecessors,
      [joinAliasSourceFilename],
      sql,
    );
  }

  const localSourceCollisionFilename =
    "20260101000038_local_source_alias_collision.sql";
  const localSourceTargetFilename =
    "20260101000039_local_source_alias_target.sql";
  const localSourceQueryFilename =
    "20260101000040_local_source_alias_query.sql";
  for (const sql of [
    "with public(value) as (values (1)) select public.value from public;",
    `delete from public.target t
       using (select 1 as value) as public
       where public.value = 1;`,
    `merge into public.target t
       using (values (1)) as public(value)
       on false
       when not matched then insert (id) values (public.value);`,
  ]) {
    const [, , localSourceConsumer] = deriveMigrationDependencyClosure(
      [
        localSourceCollisionFilename,
        localSourceTargetFilename,
        localSourceQueryFilename,
      ].map((currentFilename, index) => ({
        currentFilename,
        presentOnLiveMain: true,
        freshHistoryOrder: index + 1,
      })),
      new Map([
        [localSourceCollisionFilename, "create table public.value(id integer);"],
        [localSourceTargetFilename, "create table public.target(id integer);"],
        [localSourceQueryFilename, sql],
      ]),
    );
    const expectsTarget = sql.includes("public.target");
    assert.deepEqual(
      localSourceConsumer.referencedDatabaseObjects,
      expectsTarget
        ? [{ kind: "table", identifier: "public.target" }]
        : [],
      sql,
    );
    assert.deepEqual(
      localSourceConsumer.exactDependencyPredecessors,
      expectsTarget ? [localSourceTargetFilename] : [],
      sql,
    );
  }
});

test("keeps utility relation column lists and options out of function and type matching", () => {
  const available = [{ kind: "table", identifier: "public.known_table" }];
  for (const sql of [
    "copy public.known_table(id) to stdout;",
    "vacuum public.known_table(id);",
    "analyze public.known_table(id);",
    "cluster verbose public.known_table;",
    "truncate only public.known_table;",
  ]) {
    assert.deepEqual(deriveDatabaseObjectReferences(sql, available), available);
    assert.deepEqual(deriveExternalFunctionDependencies(sql), []);
  }
});

test("classifies MERGE and DELETE USING sources as exact relations", () => {
  const relations = [
    { kind: "table", identifier: "other.source" },
    { kind: "table", identifier: "public.target" },
  ];
  for (const sql of [
    "merge into public.target using other.source on false when not matched then insert default values;",
    "delete from public.target using other.source where false;",
  ]) {
    assert.deepEqual(deriveDatabaseObjectReferences(sql, relations), relations);
    assertClosureFailure(
      () =>
        deriveDatabaseObjectReferences(sql, [
          { kind: "table", identifier: "public.target" },
          { kind: "function", identifier: "other.source" },
        ]),
      "WRONG_DATABASE_OBJECT_KIND",
    );
    assertClosureFailure(
      () =>
        deriveMigrationDependencyClosure(
          [
            {
              currentFilename: "20260101000000_using_source.sql",
              presentOnLiveMain: true,
              freshHistoryOrder: 1,
            },
          ],
          new Map([["20260101000000_using_source.sql", sql]]),
          {
            externalDatabaseObjects: [
              { kind: "table", identifier: "public.target" },
            ],
          },
        ),
      "UNREGISTERED_QUALIFIED_DATABASE_OBJECT",
    );
  }
});

test("derives consumes, modifies and drops separately from migration SQL", () => {
  const filenames = [
    "20260101000000_create_widget.sql",
    "20260101000001_read_widget.sql",
    "20260101000002_alter_widget.sql",
    "20260101000003_read_altered_widget.sql",
    "20260101000004_drop_widget.sql",
  ];
  const records = filenames.map((currentFilename, index) => ({
    currentFilename,
    presentOnLiveMain: true,
    freshHistoryOrder: index + 1,
    drops: [],
    modifies: [],
  }));
  const derived = deriveMigrationDependencyClosure(
    records,
    new Map([
      [filenames[0], "create table public.widget (id bigint);"],
      [filenames[1], "select id from public.widget;"],
      [filenames[2], "alter table public.widget add column label text;"],
      [filenames[3], "select label from public.widget;"],
      [filenames[4], "drop table public.widget;"],
    ]),
  );

  assert.deepEqual(derived[1].modifiedObjects, []);
  assert.deepEqual(derived[1].droppedObjects, []);
  assert.deepEqual(derived[2].referencedDatabaseObjects, [
    { kind: "table", identifier: "public.widget" },
  ]);
  assert.deepEqual(derived[2].modifiedObjects, [
    { kind: "table", identifier: "public.widget" },
  ]);
  assert.deepEqual(derived[3].exactDependencyPredecessors, [
    filenames[0],
    filenames[2],
  ]);
  assert.deepEqual(derived[4].droppedObjects, [
    { kind: "table", identifier: "public.widget" },
  ]);
});

test("derives every multi-target drop and transitions rename provenance", () => {
  const create = "20260101000000_create_relations.sql";
  const drop = "20260101000001_drop_relations.sql";
  const dropped = deriveMigrationDependencyClosure(
    [
      { currentFilename: create, presentOnLiveMain: true, freshHistoryOrder: 1 },
      { currentFilename: drop, presentOnLiveMain: true, freshHistoryOrder: 2 },
    ],
    new Map([
      [create, "create table public.a (id bigint); create table public.b (id bigint);"],
      [drop, "drop table public.a, public.b;"],
    ]),
  );
  assert.deepEqual(dropped[1].droppedObjects, [
    { kind: "table", identifier: "public.a" },
    { kind: "table", identifier: "public.b" },
  ]);

  const rename = "20260101000001_rename_relation.sql";
  const read = "20260101000002_read_renamed_relation.sql";
  const renamed = deriveMigrationDependencyClosure(
    [
      { currentFilename: create, presentOnLiveMain: true, freshHistoryOrder: 1 },
      { currentFilename: rename, presentOnLiveMain: true, freshHistoryOrder: 2 },
      { currentFilename: read, presentOnLiveMain: true, freshHistoryOrder: 3 },
    ],
    new Map([
      [create, "create table public.old_name (id bigint);"],
      [rename, "alter table public.old_name rename to new_name;"],
      [read, "select id from public.new_name;"],
    ]),
  );
  assert.deepEqual(renamed[1].droppedObjects, [
    { kind: "table", identifier: "public.old_name" },
  ]);
  assert.deepEqual(renamed[1].producedObjects, [
    { kind: "table", identifier: "public.new_name" },
  ]);
  assert.deepEqual(renamed[2].exactDependencyPredecessors, [rename]);

  assertClosureFailure(
    () =>
      deriveMigrationDependencyClosure(
        [
          { currentFilename: create, presentOnLiveMain: true, freshHistoryOrder: 1 },
          { currentFilename: rename, presentOnLiveMain: true, freshHistoryOrder: 2 },
          { currentFilename: read, presentOnLiveMain: true, freshHistoryOrder: 3 },
        ],
        new Map([
          [create, "create table public.old_name (id bigint);"],
          [rename, "alter table public.old_name rename to new_name;"],
          [read, "select id from public.old_name;"],
        ]),
      ),
    "UNREGISTERED_QUALIFIED_DATABASE_OBJECT",
  );
});

test("orders ALTER and multi-target DROP FOREIGN TABLE as table transitions", () => {
  const filenames = [
    "20260101000000_create_foreign_tables.sql",
    "20260101000001_alter_foreign_table.sql",
    "20260101000002_drop_foreign_tables.sql",
    "20260101000003_read_dropped_foreign_table.sql",
  ];
  const records = filenames.map((currentFilename, index) => ({
    currentFilename,
    presentOnLiveMain: true,
    freshHistoryOrder: index + 1,
  }));
  const sqlByFilename = new Map([
    [
      filenames[0],
      `create foreign table public.ft_a (id integer) server local_server;
       create foreign table public.ft_b (id integer) server local_server;`,
    ],
    [filenames[1], "alter foreign table public.ft_a add column label text;"],
    [filenames[2], "drop foreign table public.ft_a, public.ft_b;"],
    [filenames[3], "select * from public.ft_a;"],
  ]);
  const throughDrop = deriveMigrationDependencyClosure(
    records.slice(0, 3),
    new Map([...sqlByFilename].slice(0, 3)),
  );
  assert.deepEqual(throughDrop[1].modifiedObjects, [
    { kind: "table", identifier: "public.ft_a" },
  ]);
  assert.deepEqual(throughDrop[2].droppedObjects, [
    { kind: "table", identifier: "public.ft_a" },
    { kind: "table", identifier: "public.ft_b" },
  ]);
  assertClosureFailure(
    () => deriveMigrationDependencyClosure(records, sqlByFilename),
    "UNREGISTERED_QUALIFIED_DATABASE_OBJECT",
  );
});

test("fails closed on transient create-drop and preserves quoted rename components", () => {
  const singleRecord = (currentFilename) => ({
    currentFilename,
    presentOnLiveMain: true,
    freshHistoryOrder: 1,
  });
  const createDrop = "20260101000000_create_drop.sql";
  assertClosureFailure(
    () =>
      deriveMigrationDependencyClosure(
        [singleRecord(createDrop)],
        new Map([
          [createDrop, "create table public.x (id bigint); drop table public.x;"],
        ]),
      ),
    "CURRENT_MIGRATION_CREATE_DROP_UNSUPPORTED",
  );

  for (const scenario of [
    {
      stem: "quoted_rename",
      sourceSql: "create table public.old_name (id bigint);",
      transitionSql:
        'alter table public.old_name rename to "new.name";',
      oldIdentifier: "public.old_name",
      newIdentifier: 'public."new.name"',
      consumerSql: 'select * from public."new.name";',
    },
    {
      stem: "quoted_schema",
      sourceSql: "create table public.old_name (id bigint);",
      transitionSql:
        'alter table public.old_name set schema "new.schema";',
      oldIdentifier: "public.old_name",
      newIdentifier: '"new.schema".old_name',
      consumerSql: 'select * from "new.schema".old_name;',
    },
  ]) {
    const source = `20260101000000_${scenario.stem}_source.sql`;
    const transition = `20260101000001_${scenario.stem}_transition.sql`;
    const consumer = `20260101000002_${scenario.stem}_consumer.sql`;
    const [, derivedTransition, derivedConsumer] =
      deriveMigrationDependencyClosure(
        [
          { currentFilename: source, presentOnLiveMain: true, freshHistoryOrder: 1 },
          {
            currentFilename: transition,
            presentOnLiveMain: true,
            freshHistoryOrder: 2,
          },
          {
            currentFilename: consumer,
            presentOnLiveMain: true,
            freshHistoryOrder: 3,
          },
        ],
        new Map([
          [source, scenario.sourceSql],
          [transition, scenario.transitionSql],
          [consumer, scenario.consumerSql],
        ]),
      );
    assert.deepEqual(derivedTransition.droppedObjects, [
      { kind: "table", identifier: scenario.oldIdentifier },
    ]);
    assert.deepEqual(derivedTransition.producedObjects, [
      { kind: "table", identifier: scenario.newIdentifier },
    ]);
    assert.deepEqual(derivedConsumer.referencedDatabaseObjects, [
      { kind: "table", identifier: scenario.newIdentifier },
    ]);
    assert.deepEqual(derivedConsumer.exactDependencyPredecessors, [transition]);
  }
});

test("orders every ordinary reference across same-migration object transitions", () => {
  const create = "20260101000000_create_ordered_relation.sql";
  const transition = "20260101000001_transition_ordered_relation.sql";
  const records = [
    { currentFilename: create, presentOnLiveMain: true, freshHistoryOrder: 1 },
    { currentFilename: transition, presentOnLiveMain: true, freshHistoryOrder: 2 },
  ];
  const closure = (sql) =>
    deriveMigrationDependencyClosure(
      records,
      new Map([
        [create, "create table public.t (id bigint);"],
        [transition, sql],
      ]),
    );

  assertClosureFailure(
    () => closure("drop table public.t; select * from public.t;"),
    "UNREGISTERED_QUALIFIED_DATABASE_OBJECT",
  );
  assert.deepEqual(
    closure("select * from public.t; drop table public.t;")[1]
      .referencedDatabaseObjects,
    [{ kind: "table", identifier: "public.t" }],
  );
  assertClosureFailure(
    () =>
      deriveMigrationDependencyClosure(
        [{ currentFilename: create, presentOnLiveMain: true, freshHistoryOrder: 1 }],
        new Map([
          [
            create,
            "create view public.v as select * from public.t; create table public.t (id bigint);",
          ],
        ]),
      ),
    "UNREGISTERED_QUALIFIED_DATABASE_OBJECT",
  );
  const renamed = closure(
    "alter table public.t rename to renamed_t; select * from public.renamed_t; alter table public.renamed_t add column label text;",
  );
  assert.deepEqual(renamed[1].producedObjects, [
    { kind: "table", identifier: "public.renamed_t" },
  ]);
});

test("admits only exact current-producer self references", () => {
  const tableFile = "20260101000000_self_table.sql";
  const [table] = deriveMigrationDependencyClosure(
    [{ currentFilename: tableFile, presentOnLiveMain: true, freshHistoryOrder: 1 }],
    new Map([
      [
        tableFile,
        `create table public.self_table (
           id bigint primary key,
           parent_id bigint references public.self_table(id)
         );`,
      ],
    ]),
  );
  assert.deepEqual(table.referencedDatabaseObjects, []);

  const functionFile = "20260101000000_recursive_function.sql";
  const [routine] = deriveMigrationDependencyClosure(
    [
      {
        currentFilename: functionFile,
        presentOnLiveMain: true,
        freshHistoryOrder: 1,
      },
    ],
    new Map([
      [
        functionFile,
        `create function public.recursive_f(value integer) returns integer
           language sql as $fn$
             select case when value = 0 then 0 else public.recursive_f(value - 1) end
           $fn$;`,
      ],
    ]),
  );
  assert.deepEqual(routine.referencedDatabaseObjects, []);

  for (const sql of [
    "create view public.self_view as select * from public.self_view;",
    "create table public.self_copy as select * from public.self_copy;",
  ]) {
    assertClosureFailure(
      () =>
        deriveMigrationDependencyClosure(
          [{ currentFilename: tableFile, presentOnLiveMain: true, freshHistoryOrder: 1 }],
          new Map([[tableFile, sql]]),
        ),
      "UNREGISTERED_QUALIFIED_DATABASE_OBJECT",
    );
  }

  const recursiveViewFile = "20260101000000_recursive_view.sql";
  const [recursiveView] = deriveMigrationDependencyClosure(
    [
      {
        currentFilename: recursiveViewFile,
        presentOnLiveMain: true,
        freshHistoryOrder: 1,
      },
    ],
    new Map([
      [
        recursiveViewFile,
        `create recursive view public.self_view(value) as
           select 1 union all
           select value + 1 from public.self_view where value < 3;`,
      ],
    ]),
  );
  assert.deepEqual(recursiveView.producedObjects, [
    { kind: "view", identifier: "public.self_view" },
  ]);
  assert.deepEqual(recursiveView.referencedDatabaseObjects, []);

  const priorFunction = "20260101000000_recursive_view_name_function.sql";
  const sameNameView = "20260101000001_recursive_view_calls_function.sql";
  const sameName = deriveMigrationDependencyClosure(
    [
      { currentFilename: priorFunction, presentOnLiveMain: true, freshHistoryOrder: 1 },
      { currentFilename: sameNameView, presentOnLiveMain: true, freshHistoryOrder: 2 },
    ],
    new Map([
      [
        priorFunction,
        `create function public.v() returns integer
           language sql as $fn$ select 1 $fn$;`,
      ],
      [
        sameNameView,
        `create recursive view public.v(value) as
           select public.v() union all
           select value + 1 from public.v where value < 3;`,
      ],
    ]),
  );
  assert.deepEqual(sameName[1].referencedDatabaseObjects, [
    { kind: "function", identifier: "public.v" },
  ]);
  assert.deepEqual(sameName[1].exactDependencyPredecessors, [priorFunction]);
});

test("keeps stored-routine DDL declarative and orders executed DO DDL", () => {
  const create = "20260101000000_body_target.sql";
  const body = "20260101000001_stored_body.sql";
  const stored = deriveMigrationDependencyClosure(
    [
      { currentFilename: create, presentOnLiveMain: true, freshHistoryOrder: 1 },
      { currentFilename: body, presentOnLiveMain: true, freshHistoryOrder: 2 },
    ],
    new Map([
      [create, "create table public.body_target (id bigint);"],
      [
        body,
        `create function public.future_ddl() returns void language plpgsql as $fn$
         begin
           alter table public.body_target add column future_label text;
           drop table public.body_target;
         end
         $fn$;`,
      ],
    ]),
  );
  assert.deepEqual(stored[1].referencedDatabaseObjects, [
    { kind: "table", identifier: "public.body_target" },
  ]);
  assert.deepEqual(stored[1].modifiedObjects, []);
  assert.deepEqual(stored[1].droppedObjects, []);

  for (const [ddl, expected] of [
    ["drop table public.body_target;", { droppedObjects: [{ kind: "table", identifier: "public.body_target" }] }],
    ["alter table public.body_target add column label text;", { modifiedObjects: [{ kind: "table", identifier: "public.body_target" }] }],
    ["create table public.created_in_do (id bigint);", { producedObjects: [{ kind: "table", identifier: "public.created_in_do" }] }],
  ]) {
    const result = deriveMigrationDependencyClosure(
      [
        { currentFilename: create, presentOnLiveMain: true, freshHistoryOrder: 1 },
        { currentFilename: body, presentOnLiveMain: true, freshHistoryOrder: 2 },
      ],
      new Map([
        [create, "create table public.body_target (id bigint);"],
        [body, `do $body$ begin ${ddl} end $body$;`],
      ]),
    );
    for (const [key, value] of Object.entries(expected)) {
      assert.deepEqual(result[1][key], value);
    }
  }

  const createThenUse = deriveMigrationDependencyClosure(
    [{ currentFilename: body, presentOnLiveMain: true, freshHistoryOrder: 1 }],
    new Map([[
      body,
      `do $body$ begin create table public.created_in_do (id bigint); end $body$;
       select * from public.created_in_do;`,
    ]]),
  );
  assert.deepEqual(createThenUse[0].producedObjects, [
    { kind: "table", identifier: "public.created_in_do" },
  ]);
  assert.deepEqual(createThenUse[0].referencedDatabaseObjects, []);

  assertClosureFailure(
    () =>
      deriveMigrationDependencyClosure(
        [
          { currentFilename: create, presentOnLiveMain: true, freshHistoryOrder: 1 },
          { currentFilename: body, presentOnLiveMain: true, freshHistoryOrder: 2 },
        ],
        new Map([
          [create, "create table public.body_target (id bigint);"],
          [
            body,
            `do $body$ begin drop table public.body_target; end $body$;
             select * from public.body_target;`,
          ],
        ]),
      ),
    "UNREGISTERED_QUALIFIED_DATABASE_OBJECT",
  );
});

test("validates stored routine references against final migration state", () => {
  const filename = "20260101000000_stored_body_final_state.sql";
  const record = {
    currentFilename: filename,
    presentOnLiveMain: true,
    freshHistoryOrder: 1,
  };
  const [derived] = deriveMigrationDependencyClosure(
    [record],
    new Map([
      [
        filename,
        `create function public.read_later_table() returns bigint
           language sql as $fn$ select count(*) from public.later_table $fn$;
         create table public.later_table (id bigint);`,
      ],
    ]),
  );
  assert.deepEqual(derived.referencedDatabaseObjects, []);
});

test("discovers nested executable routine bodies recursively", () => {
  const sql = `
    do $outer$
    begin
      create function public.inner_dependency() returns void
        language sql as $inner$
          select auth.uid(), null::vector
        $inner$;
    end
    $outer$;
  `;
  assert.deepEqual(deriveProducedDatabaseObjects(sql), [
    { kind: "function", identifier: "public.inner_dependency" },
  ]);
  assert.deepEqual(deriveRequiredExtensionUses(sql), [
    {
      name: "vector",
      schema: null,
      evidence: [{ kind: "type", identifier: "vector", occurrences: 1 }],
    },
  ]);
  assert.deepEqual(deriveExternalFunctionDependencies(sql), [
    {
      identifier: "auth.uid",
      registry: "MANIFEST_OBJECT",
      manifestRequired: true,
      occurrences: 1,
    },
  ]);

  const nestedDo = `
    do $outer$
    begin
      do $inner$
      begin
        perform auth.uid();
        perform null::vector;
        create table public.created_in_nested_do (id integer);
      end
      $inner$;
    end
    $outer$;
  `;
  assert.deepEqual(deriveProducedDatabaseObjects(nestedDo), [
    { kind: "table", identifier: "public.created_in_nested_do" },
  ]);
  assert.deepEqual(deriveRequiredExtensionUses(nestedDo), [
    {
      name: "vector",
      schema: null,
      evidence: [{ kind: "type", identifier: "vector", occurrences: 1 }],
    },
  ]);
  assert.equal(deriveExternalFunctionDependencies(nestedDo)[0].identifier, "auth.uid");

  const nestedDoInStoredRoutine = `
    create function public.deferred_outer() returns void
      language plpgsql as $outer$
      begin
        do $inner$
        begin
          perform auth.uid();
          perform null::vector;
          create table public.deferred_nested_table (id integer);
        end
        $inner$;
      end
      $outer$;
  `;
  assert.deepEqual(deriveProducedDatabaseObjects(nestedDoInStoredRoutine), [
    { kind: "function", identifier: "public.deferred_outer" },
  ]);
  assert.equal(
    deriveExternalFunctionDependencies(nestedDoInStoredRoutine)[0].identifier,
    "auth.uid",
  );
  assert.equal(
    deriveRequiredExtensionUses(nestedDoInStoredRoutine)[0].evidence[0].occurrences,
    1,
  );
});

test("fails closed on conditional DO create, drop and rename transitions", () => {
  const create = "20260101000000_conditional_do_target.sql";
  const transition = "20260101000001_conditional_do_transition.sql";
  const records = [
    { currentFilename: create, presentOnLiveMain: true, freshHistoryOrder: 1 },
    { currentFilename: transition, presentOnLiveMain: true, freshHistoryOrder: 2 },
  ];
  const assertConditionalFailure = (sql) =>
    assertClosureFailure(
      () =>
        deriveMigrationDependencyClosure(
          records,
          new Map([
            [create, "create table public.conditional_target (id bigint);"],
            [transition, sql],
          ]),
        ),
      "UNSUPPORTED_CONDITIONAL_DO_OBJECT_TRANSITION",
    );

  for (const sql of [
    `do $body$ begin if false then drop table public.conditional_target; end if; end $body$;`,
    `do $body$ begin if false then create table public.unreachable (id bigint); end if; end $body$;`,
    `do $body$ begin while false loop drop table public.conditional_target; end loop; end $body$;`,
    `do $body$ begin drop table public.conditional_target; exception when others then null; end $body$;`,
    `do $body$ begin if false then alter table public.conditional_target rename to unreachable; end if; end $body$;`,
    `do $body$ begin <<never>> while false loop create table public.labeled_while (id integer); end loop never; end $body$;`,
    `do $body$ begin <<never>> for i in 1..0 loop drop table public.conditional_target; end loop never; end $body$;`,
    `do $body$ begin <<protected>> begin create table public.labeled_exception (id integer); exception when others then null; end protected; end $body$;`,
  ]) {
    assertConditionalFailure(sql);
  }

  const conditionalModify = deriveMigrationDependencyClosure(
    records,
    new Map([
      [create, "create table public.conditional_target (id bigint);"],
      [
        transition,
        `do $body$ begin
           if false then
             alter table public.conditional_target add column unreachable text;
           end if;
         end $body$;`,
      ],
    ]),
  );
  assert.deepEqual(conditionalModify[1].modifiedObjects, []);
  assert.deepEqual(conditionalModify[1].referencedDatabaseObjects, [
    { kind: "table", identifier: "public.conditional_target" },
  ]);

  for (const [sql, identifier] of [
    [
      `do $body$ begin
         create table public.before_later_if (id integer);
         if false then null; end if;
       end $body$;`,
      "public.before_later_if",
    ],
    [
      `do $body$ begin
         if false then null; end if;
         create table public.after_completed_if (id integer);
       end $body$;`,
      "public.after_completed_if",
    ],
    [
      `do $body$ begin
         create table public.case_expression_default (
           id integer default case when true then 1 else 0 end
         );
       end $body$;`,
      "public.case_expression_default",
    ],
    [
      `do $body$ begin
         create table public.before_independent_exception (id integer);
         begin
           perform 1;
         exception when others then
           null;
         end;
       end $body$;`,
      "public.before_independent_exception",
    ],
    [
      `do $body$ begin
         begin
           perform 1;
         exception when others then
           null;
         end;
         create table public.after_completed_exception (id integer);
       end $body$;`,
      "public.after_completed_exception",
    ],
    [
      `do $body$ begin
         create table public.before_labeled_exception (id integer);
         <<protected>> begin
           perform 1;
         exception when others then
           null;
         end protected;
       end $body$;`,
      "public.before_labeled_exception",
    ],
    [
      `do $body$ begin
         <<protected>> begin
           perform 1;
         exception when others then
           null;
         end protected;
         create table public.after_labeled_exception (id integer);
       end $body$;`,
      "public.after_labeled_exception",
    ],
  ]) {
    const [result] = deriveMigrationDependencyClosure(
      [{ currentFilename: transition, presentOnLiveMain: true, freshHistoryOrder: 1 }],
      new Map([[transition, sql]]),
    );
    assert.deepEqual(result.producedObjects, [{ kind: "table", identifier }]);
  }

  for (const sql of [
    `do $body$ begin
       return;
       create table public.after_return (id integer);
     end $body$;`,
    `do $body$ begin
       exit finished;
       drop table public.conditional_target;
     end $body$;`,
  ]) {
    assertConditionalFailure(sql);
  }

  for (const sql of [
    `do $outer$ begin
       if false then
         do $inner$ begin
           create table public.nested_conditional_create (id integer);
         end $inner$;
       end if;
     end $outer$;`,
    `do $outer$ begin
       while false loop
         do $inner$ begin
           drop table public.conditional_target;
         end $inner$;
       end loop;
     end $outer$;`,
    `do $outer$ begin
       return;
       do $inner$ begin
         create table public.nested_after_return (id integer);
       end $inner$;
     end $outer$;`,
    `do $outer$ begin
       begin
         do $inner$ begin
           alter table public.conditional_target rename to nested_renamed;
         end $inner$;
       exception when others then
         null;
       end;
     end $outer$;`,
  ]) {
    assertConditionalFailure(sql);
  }

  const nestedConditionalModify = deriveMigrationDependencyClosure(
    records,
    new Map([
      [create, "create table public.conditional_target (id bigint);"],
      [
        transition,
        `do $outer$ begin
           if false then
             do $inner$ begin
               alter table public.conditional_target add column nested_unreachable text;
             end $inner$;
           end if;
         end $outer$;`,
      ],
    ]),
  );
  assert.deepEqual(nestedConditionalModify[1].modifiedObjects, []);
  assert.deepEqual(nestedConditionalModify[1].referencedDatabaseObjects, [
    { kind: "table", identifier: "public.conditional_target" },
  ]);
});

test("classifies closed CREATE-side relation, type and function dependencies", () => {
  const cases = [
    [
      "create table public.like_child (like other.source);",
      { kind: "table", identifier: "other.source" },
    ],
    [
      "create table public.partition_child partition of other.parent for values in (1);",
      { kind: "table", identifier: "other.parent" },
    ],
    [
      "create type public.range_type as range (subtype = other.element);",
      { kind: "type", identifier: "other.element" },
    ],
    [
      "create operator public.@@ (procedure = other.step, leftarg = integer, rightarg = integer);",
      { kind: "function", identifier: "other.step" },
    ],
    [
      `create function public.supported_f(value integer) returns integer
         support other.step language sql as $fn$ select value $fn$;`,
      { kind: "function", identifier: "other.step" },
    ],
  ];
  for (const [sql, expected] of cases) {
    assert.deepEqual(deriveDatabaseObjectReferences(sql, [expected]), [expected]);
    assertClosureFailure(
      () =>
        deriveDatabaseObjectReferences(sql, [
          {
            kind: expected.kind === "function" ? "table" : "function",
            identifier: expected.identifier,
          },
        ]),
      "WRONG_DATABASE_OBJECT_KIND",
    );
  }
});

test("limits CREATE TABLE LIKE classification to table-definition elements", () => {
  const available = [
    { kind: "table", identifier: "public.patterns" },
    { kind: "table", identifier: "public.source" },
  ];
  assert.deepEqual(
    deriveDatabaseObjectReferences(
      `create table public.result as
       select src.value like p.pattern
       from public.source src cross join public.patterns p;`,
      available,
    ),
    available,
  );
});

test("fails closed on routine overload identities and preserves exact signature lineage", () => {
  const create = "20260101000000_create_routine.sql";
  const next = "20260101000001_routine_operation.sql";
  const records = [
    { currentFilename: create, presentOnLiveMain: true, freshHistoryOrder: 1 },
    { currentFilename: next, presentOnLiveMain: true, freshHistoryOrder: 2 },
  ];
  const assertRoutineFailure = (operation) =>
    assertClosureFailure(
      () =>
        deriveMigrationDependencyClosure(
          records,
          new Map([
            [
              create,
              "create function public.f(value integer) returns integer language sql as $fn$ select value $fn$;",
            ],
            [next, operation],
          ]),
        ),
      "UNSUPPORTED_OVERLOADED_ROUTINE_IDENTITY",
    );

  assertRoutineFailure(
    "create function public.f(value text) returns text language sql as $fn$ select value $fn$;",
  );
  assertRoutineFailure("drop function public.f(text);");
  assertRoutineFailure("grant execute on function public.f(text) to authenticated;");
  assertRoutineFailure("alter function public.f(text) rename to g;");

  const renamed = deriveMigrationDependencyClosure(
    [
      ...records,
      {
        currentFilename: "20260101000002_grant_renamed.sql",
        presentOnLiveMain: true,
        freshHistoryOrder: 3,
      },
    ],
    new Map([
      [
        create,
        "create function public.f(value integer) returns integer language sql as $fn$ select value $fn$;",
      ],
      [next, "alter function public.f(integer) rename to g;"],
      [
        "20260101000002_grant_renamed.sql",
        "grant execute on function public.g(integer) to authenticated;",
      ],
    ]),
  );
  assert.deepEqual(renamed[1].droppedObjects, [
    { kind: "function", identifier: "public.f" },
  ]);
  assert.deepEqual(renamed[1].producedObjects, [
    { kind: "function", identifier: "public.g" },
  ]);
  assert.deepEqual(renamed[2].exactDependencyPredecessors, [next]);
});

test("canonicalizes supported compound and alias routine input types without collisions", () => {
  const create = "20260101000000_create_compound_routine.sql";
  const operation = "20260101000001_operate_compound_routine.sql";
  const records = [
    { currentFilename: create, presentOnLiveMain: true, freshHistoryOrder: 1 },
    { currentFilename: operation, presentOnLiveMain: true, freshHistoryOrder: 2 },
  ];
  const closure = (createSql, operationSql) =>
    deriveMigrationDependencyClosure(
      records,
      new Map([
        [create, createSql],
        [operation, operationSql],
      ]),
    );

  for (const [createType, operationType] of [
    ["value double precision", "double precision"],
    ["value integer", "int"],
    ["value varchar(10)", "varchar"],
    ["value pg_catalog.int4", "integer"],
    ["value integer", "pg_catalog.\"int4\""],
    ["value timestamp with time zone", "timestamptz"],
    ["value timestamp(3) with time zone", "timestamptz"],
    ["value time with time zone", "timetz"],
    ["value character", "char"],
    ["value char", "pg_catalog.\"bpchar\""],
    ["value integer[]", "integer[][]"],
    ["value float(1)", "float4"],
    ["value float(25)", "float8"],
    ["value integer", '"int4"'],
    ["value oid", "pg_catalog.oid"],
    ["value regclass", '"regclass"'],
    ["value interval year to month", "interval"],
  ]) {
    const result = closure(
      `create function public.f(${createType}) returns void language sql as $fn$ select null $fn$;`,
      `drop function public.f(${operationType});`,
    );
    assert.deepEqual(result[1].droppedObjects, [
      { kind: "function", identifier: "public.f" },
    ]);
  }

  for (const operationSql of [
    `create or replace function public.f(value double precision) returns void language sql as $fn$ select null $fn$;`,
    `alter function public.f(double precision) parallel safe;`,
    `grant execute on function public.f(double precision) to authenticated;`,
    `revoke execute on function public.f(double precision) from authenticated;`,
    `alter function public.f(double precision) rename to g;`,
  ]) {
    assert.doesNotThrow(() =>
      closure(
        `create function public.f(value double precision) returns void language sql as $fn$ select null $fn$;`,
        operationSql,
      ),
    );
  }

  assertClosureFailure(
    () =>
      closure(
        `create domain public.precision as text;
         create function public.f(double precision) returns void language sql as $fn$ select null $fn$;`,
        `create function public.f(value precision) returns void language sql as $fn$ select null $fn$;`,
      ),
    "UNQUALIFIED_CUSTOM_ROUTINE_TYPE_UNSUPPORTED",
  );
  assertClosureFailure(
    () =>
      closure(
        `create function public.f(double precision) returns void language sql as $fn$ select null $fn$;`,
        `drop function public.f(precision);`,
      ),
    "UNQUALIFIED_CUSTOM_ROUTINE_TYPE_UNSUPPORTED",
  );
  assertClosureFailure(
    () =>
      closure(
        `create function public.f(value float(1)) returns void language sql as $fn$ select null $fn$;`,
        `drop function public.f(float(25));`,
      ),
    "UNSUPPORTED_OVERLOADED_ROUTINE_IDENTITY",
  );
  assertClosureFailure(
    () =>
      closure(
        `create function public.f(value pg_catalog.\"char\") returns void language sql as $fn$ select null $fn$;`,
        `drop function public.f(char);`,
      ),
    "UNSUPPORTED_OVERLOADED_ROUTINE_IDENTITY",
  );
});

test("distinguishes quoted routine argument and output names from quoted types", () => {
  assert.deepEqual(
    deriveProducedDatabaseObjects(`
      create function public.named_input("MyArg" integer) returns integer
        language sql as $fn$ select "MyArg" $fn$;
      create function public.named_output(out "MyOut" integer)
        language sql as $fn$ select 1 $fn$;
      create function public.named_table_output() returns table ("MyCol" integer)
        language sql as $fn$ select 1 $fn$;
    `),
    [
      { kind: "function", identifier: "public.named_input" },
      { kind: "function", identifier: "public.named_output" },
      { kind: "function", identifier: "public.named_table_output" },
    ],
  );

  const create = "20260101000000_quoted_argument_name.sql";
  const drop = "20260101000001_drop_quoted_argument_name.sql";
  const derived = deriveMigrationDependencyClosure(
    [
      { currentFilename: create, presentOnLiveMain: true, freshHistoryOrder: 1 },
      { currentFilename: drop, presentOnLiveMain: true, freshHistoryOrder: 2 },
    ],
    new Map([
      [
        create,
        `create function public.f("arg" integer) returns integer
           language sql as $fn$ select "arg" $fn$;`,
      ],
      [drop, "drop function public.f(integer);"],
    ]),
  );
  assert.deepEqual(derived[1].droppedObjects, [
    { kind: "function", identifier: "public.f" },
  ]);
});

test("fails closed on unqualified custom routine inputs and returns", () => {
  const filename = "20260101000000_unqualified_custom_routine_type.sql";
  const record = {
    currentFilename: filename,
    presentOnLiveMain: true,
    freshHistoryOrder: 1,
  };
  for (const sql of [
    `create function public.f(value "MyType") returns void
       language sql as $fn$ select null $fn$;`,
    `create function public.f(value "a.b") returns void
       language sql as $fn$ select null $fn$;`,
    `create function public.f() returns mytype
       language sql as $fn$ select null $fn$;`,
    `create function public.f() returns "MyType"
       language sql as $fn$ select null $fn$;`,
    `create function public.f() returns table (value "MyType")
       language sql as $fn$ select null $fn$;`,
  ]) {
    assertClosureFailure(
      () => deriveMigrationDependencyClosure([record], new Map([[filename, sql]])),
      "UNQUALIFIED_CUSTOM_ROUTINE_TYPE_UNSUPPORTED",
    );
  }
});

test("binds generic ROUTINE operations and qualified custom type provenance", () => {
  const create = "20260101000000_create_generic_routine.sql";
  const operation = "20260101000001_generic_routine_operation.sql";
  const records = [
    { currentFilename: create, presentOnLiveMain: true, freshHistoryOrder: 1 },
    { currentFilename: operation, presentOnLiveMain: true, freshHistoryOrder: 2 },
  ];
  const closure = (operationSql) =>
    deriveMigrationDependencyClosure(
      records,
      new Map([
        [
          create,
          "create function public.f(value integer) returns integer language sql as $fn$ select value $fn$;",
        ],
        [operation, operationSql],
      ]),
    );

  assert.deepEqual(closure("drop routine public.f(integer);")[1].droppedObjects, [
    { kind: "function", identifier: "public.f" },
  ]);
  for (const sql of [
    "grant execute on routine public.f(integer) to authenticated;",
    "revoke execute on routine public.f(integer) from authenticated;",
    "alter routine public.f(integer) parallel safe;",
  ]) {
    assert.doesNotThrow(() => closure(sql));
  }
  assertClosureFailure(
    () => closure("alter routine public.f(text) parallel safe;"),
    "UNSUPPORTED_OVERLOADED_ROUTINE_IDENTITY",
  );

  const typeFile = "20260101000000_create_custom_type.sql";
  const functionFile = "20260101000001_use_custom_type.sql";
  const qualified = deriveMigrationDependencyClosure(
    [
      { currentFilename: typeFile, presentOnLiveMain: true, freshHistoryOrder: 1 },
      { currentFilename: functionFile, presentOnLiveMain: true, freshHistoryOrder: 2 },
    ],
    new Map([
      [typeFile, "create type public.mytype as (value text);"],
      [
        functionFile,
        `create function public.typed_f(value public.mytype) returns void
           language sql as $fn$ select null $fn$;
         create function public.typed_return() returns public.mytype
           language sql as $fn$ select null::public.mytype $fn$;`,
      ],
    ]),
  );
  assert.deepEqual(qualified[1].referencedDatabaseObjects, [
    { kind: "type", identifier: "public.mytype" },
  ]);
  assert.deepEqual(qualified[1].exactDependencyPredecessors, [typeFile]);
  assertClosureFailure(
    () =>
      deriveMigrationDependencyClosure(
        [
          { currentFilename: typeFile, presentOnLiveMain: true, freshHistoryOrder: 1 },
          { currentFilename: functionFile, presentOnLiveMain: true, freshHistoryOrder: 2 },
        ],
        new Map([
          [typeFile, "create type public.mytype as (value text);"],
          [
            functionFile,
            "create function public.typed_f(value mytype) returns void language sql as $fn$ select null $fn$;",
          ],
        ]),
      ),
    "UNQUALIFIED_CUSTOM_ROUTINE_TYPE_UNSUPPORTED",
  );
});

test("preserves generic ROUTINE identity after SET SCHEMA", () => {
  const filenames = [
    "20260101000000_create_routine_for_schema.sql",
    "20260101000001_move_routine_schema.sql",
    "20260101000002_use_moved_routine.sql",
  ];
  const derived = deriveMigrationDependencyClosure(
    filenames.map((currentFilename, index) => ({
      currentFilename,
      presentOnLiveMain: true,
      freshHistoryOrder: index + 1,
    })),
    new Map([
      [
        filenames[0],
        `create function public.f(value integer) returns integer
           language sql as $fn$ select value $fn$;`,
      ],
      [filenames[1], "alter routine public.f(integer) set schema other;"],
      [
        filenames[2],
        `select other.f(1);
         grant execute on routine other.f(integer) to authenticated;`,
      ],
    ]),
  );
  assert.deepEqual(derived[1].producedObjects, [
    { kind: "function", identifier: "other.f" },
  ]);
  assert.deepEqual(derived[2].referencedDatabaseObjects, [
    { kind: "function", identifier: "other.f" },
  ]);
  assert.deepEqual(derived[2].exactDependencyPredecessors, [filenames[1]]);

  for (const operationSql of [
    "alter routine other.f(integer) parallel safe;",
    "drop routine other.f(integer);",
  ]) {
    assert.doesNotThrow(() =>
      deriveMigrationDependencyClosure(
        filenames.map((currentFilename, index) => ({
          currentFilename,
          presentOnLiveMain: true,
          freshHistoryOrder: index + 1,
        })),
        new Map([
          [
            filenames[0],
            `create function public.f(value integer) returns integer
               language sql as $fn$ select value $fn$;`,
          ],
          [filenames[1], "alter routine public.f(integer) set schema other;"],
          [filenames[2], operationSql],
        ]),
      ),
    );
  }
});

test("contains no case-insensitive identifier-regex fallback", async () => {
  const analyzer = await text(DEPENDENCY_ANALYZER);
  assert.doesNotMatch(analyzer, /toLowerCase\s*\(/u);
  assert.doesNotMatch(analyzer, /\/[^\n/]+\/[dgmsuvy]*i[dgmsuvy]*/u);
  assert.doesNotMatch(analyzer, /new RegExp\([^\n]+["'][dgmsuvy]*i[dgmsuvy]*["']/u);
  assert.equal(
    analyzer.match(/foldAsciiIdentifier\(/gu)?.length,
    2,
    "ASCII folding must exist only at its definition and the unquoted-token call site",
  );
});

test("parses executable CREATE EXTENSION forms and ignores comments and strings", () => {
  const derived = extractCreateExtensions(`
    -- CREATE EXTENSION postgis;
    /* CREATE EXTENSION postgis; /* nested CREATE EXTENSION postgis; */ */
    select 'CREATE EXTENSION postgis;';
    do $body$ begin perform 'CREATE EXTENSION postgis;'; end $body$;
    CrEaTe ExTeNsIoN IF NOT EXISTS "pgcrypto";
    CREATE EXTENSION vector WITH SCHEMA "extensions";
    create extension pgcrypto schema extensions;
  `);

  assert.deepEqual(
    derived.map(({ name, schema, ifNotExists, statementOrdinal }) => ({
      name,
      schema,
      ifNotExists,
      statementOrdinal,
    })),
    [
      { name: "pgcrypto", schema: null, ifNotExists: true, statementOrdinal: 1 },
      { name: "vector", schema: "extensions", ifNotExists: false, statementOrdinal: 2 },
      { name: "pgcrypto", schema: "extensions", ifNotExists: false, statementOrdinal: 3 },
    ],
  );
  assert.equal(derived.every((entry) => /^[a-f0-9]{64}$/.test(entry.statementSha256)), true);
  assertClosureFailure(
    () => extractCreateExtensions("CREATE EXTENSION pgvector;"),
    "PROHIBITED_EXTENSION_ALIAS",
  );
  assertClosureFailure(
    () => extractCreateExtensions("CREATE EXTENSION postgis;"),
    "UNREGISTERED_EXTENSION",
  );
  assertClosureFailure(
    () => extractCreateExtensions("CREATE EXTENSION pgcrypto VERSION '1.3';"),
    "UNRECOGNIZED_CREATE_EXTENSION",
  );
});

test("derives the closed relation, view, sequence, type and function producer classes", () => {
  assert.deepEqual(
    deriveProducedDatabaseObjects(`
      create table public.t (id bigint);
      create view public.v as select id from public.t;
      create sequence public.s;
      create type public.status as enum ('ready');
      create or replace function public.f() returns void as $$ begin null; end $$ language plpgsql;
      create domain public.positive_integer as integer check (value > 0);
      create procedure public.p() language sql as $$ select null $$;
      create temp table public.temp_t (id bigint);
      create temporary view public.temp_v as select 1 as id;
    `),
    [
      { kind: "table", identifier: "public.t" },
      { kind: "view", identifier: "public.v" },
      { kind: "sequence", identifier: "public.s" },
      { kind: "type", identifier: "public.status" },
      { kind: "function", identifier: "public.f" },
      { kind: "type", identifier: "public.positive_integer" },
      { kind: "function", identifier: "public.p" },
      { kind: "table", identifier: "public.temp_t" },
      { kind: "view", identifier: "public.temp_v" },
    ],
  );
});

test("distinguishes a closed environment extension from migration producers", () => {
  const [derived] = deriveMigrationDependencyClosure(
    [
      {
        currentFilename: "20260101000000_environment_vector_consumer.sql",
        presentOnLiveMain: true,
        freshHistoryOrder: 1,
      },
    ],
    new Map([
      [
        "20260101000000_environment_vector_consumer.sql",
        "create table public.embedding (value vector(3));",
      ],
    ]),
    {
      environmentRequiredExtensions: [{ name: "vector", schema: null }],
    },
  );

  assert.deepEqual(derived.requiredExtensions, [
    {
      name: "vector",
      schema: null,
      evidence: [{ kind: "type", identifier: "vector", occurrences: 1 }],
      satisfaction: "ENVIRONMENT",
      producerMigration: null,
      producerFreshHistoryOrder: null,
    },
  ]);
  assert.deepEqual(derived.extensionDependencyPredecessors, []);
  assertClosureFailure(
    () =>
      deriveMigrationDependencyClosure(
        [
          {
            currentFilename: "20260101000000_environment_vector_consumer.sql",
            presentOnLiveMain: true,
            freshHistoryOrder: 1,
          },
        ],
        new Map([
          [
            "20260101000000_environment_vector_consumer.sql",
            "create table public.embedding (value vector(3));",
          ],
        ]),
        { environmentRequiredExtensions: [{ name: "postgis", schema: null }] },
      ),
    "UNREGISTERED_ENVIRONMENT_EXTENSION",
  );
});

test("fails closed under dependency-class mutations", async (context) => {
  const { manifest, sqlByFilename } = await dependencyClosureFixture();
  const byName = (candidate) =>
    new Map(candidate.records.map((record) => [record.currentFilename, record]));
  const cases = [
    [
      "legal pgcrypto deletion",
      (candidate) => {
        byName(candidate).get("20260615_legal_grounding.sql").createdExtensions.shift();
      },
      "MANIFEST_SQL_MISMATCH",
    ],
    [
      "legal vector deletion",
      (candidate) => {
        byName(candidate).get("20260615_legal_grounding.sql").createdExtensions.pop();
      },
      "MANIFEST_SQL_MISMATCH",
    ],
    [
      "concept pgcrypto deletion",
      (candidate) => {
        byName(candidate)
          .get("20260623_personal_concept_graph_atomic_transition.sql")
          .createdExtensions.pop();
      },
      "MANIFEST_SQL_MISMATCH",
    ],
    [
      "fake extension addition",
      (candidate) => {
        byName(candidate).get("20260615_legal_grounding.sql").createdExtensions.push({
          name: "postgis",
          schema: null,
          schemaSource: "SQL_UNSPECIFIED",
          ifNotExists: true,
          statementOrdinal: 3,
          statementSha256: "0".repeat(64),
        });
      },
      "MANIFEST_SQL_MISMATCH",
    ],
    [
      "wrong extension schema",
      (candidate) => {
        byName(candidate).get("20260615_legal_grounding.sql").createdExtensions[1].schema =
          "extensions";
      },
      "MANIFEST_SQL_MISMATCH",
    ],
    [
      "wrong extension producer",
      (candidate) => {
        byName(candidate).get(
          "20260721060237_s233a_answer_review_persistence.sql",
        ).requiredExtensions[0].producerMigration = "20260422_inverge_service_core.sql";
      },
      "MANIFEST_SQL_MISMATCH",
    ],
    [
      "unqualified digest dependency deletion",
      (candidate) => {
        const identity = byName(candidate).get(
          "20260615_legal_article_chunk_identity.sql",
        );
        identity.requiredExtensions = [];
        identity.extensionDependencyPredecessors = [];
      },
      "MANIFEST_SQL_MISMATCH",
    ],
    [
      "exact dependency predecessor deletion",
      (candidate) => {
        byName(candidate)
          .get("20260423_inverge_service_role_grants.sql")
          .exactDependencyPredecessors.shift();
      },
      "MANIFEST_SQL_MISMATCH",
    ],
    [
      "policy predecessor override deletion",
      (candidate) => {
        candidate.migrationDependencyClosureV1.exactPredecessorOverrides.shift();
      },
      "INVALID_EXACT_PREDECESSOR_OVERRIDE_REGISTRY",
    ],
    [
      "closed qualified schema deletion",
      (candidate) => {
        candidate.migrationDependencyClosureV1.closedQualifiedDatabaseSchemas =
          candidate.migrationDependencyClosureV1.closedQualifiedDatabaseSchemas.filter(
            (schema) => schema !== "public",
          );
      },
      "INVALID_CLOSED_QUALIFIED_DATABASE_SCHEMA_REGISTRY",
    ],
    [
      "auth.uid deletion",
      (candidate) => {
        const core = byName(candidate).get("20260422_inverge_service_core.sql");
        core.consumes = core.consumes.filter(
          (object) => object.identifier !== "auth.uid",
        );
      },
      "EXTERNAL_FUNCTION_SQL_MISMATCH",
    ],
    [
      "relation dependency deletion",
      (candidate) => {
        const reviewOs = byName(candidate).get("20260424_review_os_alpha.sql");
        reviewOs.consumes = reviewOs.consumes.filter(
          (object) => object.identifier !== "auth.users",
        );
      },
      "DATABASE_OBJECT_SQL_MISMATCH",
    ],
    [
      "wrong produced-object kind",
      (candidate) => {
        byName(candidate).get("20260422_inverge_service_core.sql").produces[0].kind =
          "view";
      },
      "PRODUCED_OBJECT_SQL_MISMATCH",
    ],
    [
      "read-only migration declared as modifier",
      (candidate) => {
        const readOnly = candidate.records.find(
          (record) =>
            record.presentOnLiveMain &&
            record.consumes.length > 0 &&
            (record.modifies ?? []).length === 0 &&
            (record.drops ?? []).length === 0,
        );
        readOnly.modifies = [readOnly.consumes[0]];
      },
      "MODIFIED_OBJECT_SQL_MISMATCH",
    ],
    [
      "SQL-derived modification deletion",
      (candidate) => {
        const modifier = candidate.records.find(
          (record) => record.presentOnLiveMain && (record.modifies ?? []).length > 0,
        );
        modifier.modifies = [];
      },
      "MODIFIED_OBJECT_SQL_MISMATCH",
    ],
    [
      "false drop declaration",
      (candidate) => {
        const producer = candidate.records.find(
          (record) => record.presentOnLiveMain && record.produces.length > 0,
        );
        producer.drops = [producer.produces[0]];
      },
      "DROPPED_OBJECT_SQL_MISMATCH",
    ],
    [
      "declared edge without SQL evidence",
      (candidate) => {
        byName(candidate).get("20260422_inverge_service_core.sql").consumes.push({
          kind: "table",
          identifier: "public.unproved_dependency",
        });
      },
      "DATABASE_OBJECT_SQL_MISMATCH",
    ],
    [
      "consumer before producer",
      (candidate) => {
        byName(candidate).get("20260423_inverge_service_role_grants.sql").freshHistoryOrder =
          0;
      },
      "UNREGISTERED_QUALIFIED_DATABASE_OBJECT",
    ],
  ];

  for (const [name, mutate, expectedCode] of cases) {
    await context.test(name, () => {
      const candidate = structuredClone(manifest);
      mutate(candidate);
      assertClosureFailure(
        () => validateMigrationDependencyClosure(candidate, sqlByFilename),
        expectedCode,
      );
    });
  }
});

test("binds every closed dependency registry and parser rule to the analyzer", async (context) => {
  const { manifest, sqlByFilename } = await dependencyClosureFixture();
  const cases = [
    ["dependency class", (closure) => closure.closedDependencyClasses.pop()],
    ["parser contract", (closure) => closure.parserContract.tokenClasses.pop()],
    [
      "extension registry",
      (closure) =>
        closure.extensionRegistry.push({
          canonicalName: "postgis",
          prohibitedAliases: [],
          sqlUseEvidence: [],
        }),
    ],
    [
      "external-function registry",
      (closure) => {
        closure.externalFunctionRegistry[0].dependencyMode = "UNBOUND";
      },
    ],
    [
      "exact comparison rule",
      (closure) => {
        delete closure.exactComparisonRules.wrongDatabaseObjectKindFails;
      },
    ],
  ];

  for (const [name, mutate] of cases) {
    await context.test(name, () => {
      const candidate = structuredClone(manifest);
      mutate(candidate.migrationDependencyClosureV1);
      assertClosureFailure(
        () => validateMigrationDependencyClosure(candidate, sqlByFilename),
        "INVALID_CLOSED_ANALYZER_CONTRACT",
      );
    });
  }
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
  assert.deepEqual(recovery.deliveryControl.sourceAuthorityIssueLink, {
    mode: "REFERENCE_ONLY",
    repository: "chachathecat/inverge",
    baseRef: "main",
    baseSha: "ffdd3dcc2398dd27b991eee0be34f832da0a65b5",
    headRef: "codex/wcv-c3r-terminal-identifier-replan",
    headRepository: "chachathecat/inverge",
    pullRequestTitle:
      "[WCV-C3R] Install serial structural recovery authority — terminal clean replan",
    trackerIssue: 781,
    requiredReferenceLine: "Refs #781",
    requiredDispositionLine:
      "- Tracker disposition: remains open; closure authority: C3R-L",
    closingKeywordsAllowed: false,
    exceptionAppliesOnlyWhenExactLinesPresent: true,
    fullGithubClosingKeywordFamilyBlocked: true,
    terminalClosureStage: "C3R-L",
  });
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
  assert.ok(ownedPaths.includes("scripts/automation/validate-pr-contract.mjs"));
  assert.ok(ownedPaths.includes(DEPENDENCY_ANALYZER));
  assert.ok(ownedPaths.includes("tests/agent-factory-contract-validation.test.mjs"));
  for (const path of ownedPaths) {
    assert.doesNotMatch(path, /^(?:app|components|lib\/review-os|supabase|\.github\/workflows)\//);
    assert.doesNotMatch(path, /(?:^|\/)(?:package\.json|[^/]*lock[^/]*)$/);
  }
  assert.match(validation, /source authority installed by Tracker #781/);
});

test("keeps all new authority artifacts newline terminated", async () => {
  for (const path of [DECISION, CONTRACT, VALIDATION, FOCUSED_TEST, DEPENDENCY_ANALYZER]) {
    assert.equal((await text(path)).endsWith("\n"), true, path);
  }
});
