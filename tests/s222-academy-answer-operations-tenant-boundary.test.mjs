import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

import {
  S222_ACADEMY_ANSWER_OPERATIONS_CONTRACT,
  S222_ACADEMY_ANSWER_OPERATIONS_VERSION,
  assertS222MetadataOnly,
  authorizeS222AcademyOperation,
  buildS222AcademyOperationState,
  buildS222AuditEvent,
  buildS222ReadinessReport,
  validateS222AcademyAnswerOperationsContract,
  validateS222AcademyOperationState,
} from "../lib/review-os/s222-academy-answer-operations-tenant-boundary.ts";
import { assertNoRawUserDataInDerived, SAFE_DERIVED_SIGNAL_KEYS } from "../lib/review-os/data-boundary.ts";
import { createRoadmapRunnerPlanFromYaml } from "../lib/agent-factory/roadmap-runner.ts";

function unsafeObjectWithKey(left, right) {
  return Object.fromEntries([[`${left}${right}`, "blocked"]]);
}

function baseAccess(overrides = {}) {
  return {
    academyTenantId: "academy_tenant_s222_a",
    requestedTenantId: "academy_tenant_s222_a",
    operatorIdHash: "operator_hash_s222_001",
    operatorRole: "academy_operator",
    routeFamily: "academy_operations",
    ...overrides,
  };
}

function baseStateInput(overrides = {}) {
  return {
    ...baseAccess(),
    stateId: "s222_state_001",
    generatedAt: "2026-07-06T09:00:00.000Z",
    queueItems: [
      {
        operationId: "s222_operation_001",
        queueItemId: "s222_queue_001",
        academyTenantId: "academy_tenant_s222_a",
        assignmentId: "s222_assignment_001",
        reviewRequestId: "s222_review_request_001",
        answerSubmissionRefId: "answer_submission_ref_s222_001",
        learnerIdHash: "learner_hash_s222_001",
        questionRefId: "question_ref_s222_law_001",
        subject: "law",
        assignedOperatorIdHash: "operator_hash_s222_001",
        queueVisibility: "assigned_operator_metadata_queue",
        assignmentStatus: "assigned",
        reviewStatus: "in_review",
        evidenceStatus: "learner_evidence_ref_present",
        learnerSafeHandoffStatus: "withheld_until_instructor_approval",
        createdAt: "2026-07-06T08:50:00.000Z",
        updatedAt: "2026-07-06T09:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

async function readTrackedS222Files() {
  const paths = [
    "lib/review-os/s222-academy-answer-operations-tenant-boundary.ts",
    "docs/s222-academy-answer-operations-tenant-boundary.md",
    "tests/s222-academy-answer-operations-tenant-boundary.test.mjs",
  ];
  const entries = [];
  for (const path of paths) {
    entries.push([path, await readFile(path, "utf8")]);
  }
  return entries;
}

function blockedAuthorityCopyPattern() {
  const phrases = [
    ["official", "grading"],
    ["official", "model", "answer"],
    ["confirmed", "score"],
    ["pass", "probability"],
    ["pass", "guarantee"],
    ["pass/fail", "prediction"],
  ];
  const alternatives = phrases.map((words) => words.map((word) => word.replace("/", "\\/")).join("\\s+"));
  return new RegExp(`\\b(?:${alternatives.join("|")})\\b`, "i");
}

function repositoryPathsIncludingUntracked() {
  return execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" })
    .split(/\r?\n/)
    .filter(Boolean);
}

test("S222 academy tenant and operator boundary contract exists and remains source-level only", () => {
  const contract = S222_ACADEMY_ANSWER_OPERATIONS_CONTRACT;
  const validation = validateS222AcademyAnswerOperationsContract();
  const report = buildS222ReadinessReport();

  assert.equal(contract.version, S222_ACADEMY_ANSWER_OPERATIONS_VERSION);
  assert.equal(contract.implementationMode, "source_contract_only");
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.equal(report.valid, true);
  assert.deepEqual(contract.subjectScope, ["practice", "theory", "law"]);
  assert.equal(contract.tenantBoundary.academyTenantIdRequired, true);
  assert.equal(contract.tenantBoundary.tenantScopedOperationState, true);
  assert.equal(contract.tenantBoundary.crossTenantReadAllowed, false);
  assert.equal(contract.tenantBoundary.crossTenantWriteAllowed, false);
  assert.equal(contract.tenantBoundary.allowedRouteFamily, "academy_operations");
  assert.equal(contract.operatorBoundary.learnerActorAllowed, false);
  assert.equal(contract.operatorBoundary.operatorIdMustBeHashed, true);
  assert.equal(contract.operatorBoundary.finalLearnerHandoffRequiresAcademyApproval, true);
  assert.ok(contract.operatorBoundary.allowedRoles.includes("academy_instructor"));
  assert.ok(contract.operatorBoundary.forbiddenActorRoles.includes("learner"));
  assert.equal(Object.values(contract.runtimeBoundary).every((value) => value === false), true);
  assert.equal(contract.dataBoundary.metadataOnly, true);
  assert.equal(contract.dataBoundary.tenantScoped, true);
  assert.equal(contract.dataBoundary.containsRawContent, false);
  assertNoRawUserDataInDerived(contract);
});

test("S222 answer review queue, assignment, evidence, handoff, and audit metadata are explicit", () => {
  const contract = S222_ACADEMY_ANSWER_OPERATIONS_CONTRACT;

  assert.deepEqual(
    contract.answerReviewQueueVisibility.map((entry) => entry.visibility),
    [
      "tenant_metadata_queue",
      "assigned_operator_metadata_queue",
      "instructor_approval_metadata_queue",
      "learner_handoff_metadata_queue",
    ],
  );
  for (const entry of contract.answerReviewQueueVisibility) {
    assert.equal(entry.tenantScoped, true);
    assert.equal(entry.learnerArtifactIncluded, false);
    assert.equal(entry.ocrArtifactIncluded, false);
    assert.equal(entry.problemMaterialIncluded, false);
  }
  for (const status of ["unassigned", "assigned", "in_review", "waiting_instructor_approval", "approved_for_handoff"]) {
    assert.ok(contract.assignmentReviewStatuses.includes(status));
  }
  for (const status of ["learner_evidence_ref_present", "ocr_confirmation_needed", "blocked_unresolved_source_or_calculation"]) {
    assert.ok(contract.reviewEvidenceStatuses.includes(status));
  }
  for (const status of ["not_ready", "withheld_until_instructor_approval", "approved_metadata_handoff_ready"]) {
    assert.ok(contract.learnerSafeHandoffStatuses.includes(status));
  }
  for (const kind of ["operator_access_allowed", "queue_visibility_checked", "handoff_status_changed"]) {
    assert.ok(contract.auditEventKinds.includes(kind));
  }
});

test("S222 academy operation state is tenant-scoped and metadata-only", () => {
  const state = buildS222AcademyOperationState(baseStateInput());
  const validation = validateS222AcademyOperationState(state);

  assert.equal(state.contractVersion, S222_ACADEMY_ANSWER_OPERATIONS_VERSION);
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.equal(state.academyTenantId, "academy_tenant_s222_a");
  assert.equal(state.tenantScoped, true);
  assert.equal(state.metadataOnly, true);
  assert.equal(state.containsRawContent, false);
  assert.equal(state.queueItemCount, 1);
  assert.equal(state.queueItems[0].academyTenantId, state.academyTenantId);
  assert.equal(state.queueItems[0].learnerIdHash, "learner_hash_s222_001");
  assert.equal(state.queueItems[0].answerSubmissionRefId, "answer_submission_ref_s222_001");
  assert.equal(state.queueItems[0].metadataOnly, true);
  assert.equal(state.queueItems[0].containsRawContent, false);
  assert.equal(state.auditEvents.length, 1);
  assert.equal(state.auditEvents[0].eventKind, "operator_access_allowed");
  assertNoRawUserDataInDerived(state);
});

test("S222 authorization denies tenant mismatch, learner route, and non-operator roles", () => {
  const allowed = authorizeS222AcademyOperation(baseAccess());
  assert.equal(allowed.allowed, true);
  assert.deepEqual(allowed.deniedReasons, []);

  const tenantMismatch = authorizeS222AcademyOperation(baseAccess({ requestedTenantId: "academy_tenant_other" }));
  assert.equal(tenantMismatch.allowed, false);
  assert.ok(tenantMismatch.deniedReasons.includes("tenant_mismatch"));

  const learnerRoute = authorizeS222AcademyOperation(baseAccess({ routeFamily: "learner_app" }));
  assert.equal(learnerRoute.allowed, false);
  assert.ok(learnerRoute.deniedReasons.includes("learner_route_forbidden"));

  const learnerRole = authorizeS222AcademyOperation(baseAccess({ operatorRole: "learner" }));
  assert.equal(learnerRole.allowed, false);
  assert.ok(learnerRole.deniedReasons.includes("operator_role_not_allowed"));

  assert.throws(
    () => buildS222AcademyOperationState(baseStateInput({ requestedTenantId: "academy_tenant_other" })),
    /s222-access-denied:tenant_mismatch/,
  );
});

test("S222 metadata rejects raw learner, OCR, problem, source, provider, payment, and authority fields", () => {
  const unsafeValues = [
    unsafeObjectWithKey("answer", "Text"),
    unsafeObjectWithKey("rawAnswer", "Text"),
    unsafeObjectWithKey("userAnswer", "Text"),
    unsafeObjectWithKey("ocr", "Text"),
    unsafeObjectWithKey("rawOcr", "Text"),
    unsafeObjectWithKey("problem", "Text"),
    unsafeObjectWithKey("question", "Text"),
    unsafeObjectWithKey("reference", "Text"),
    unsafeObjectWithKey("generatedAnswer", "Prose"),
    unsafeObjectWithKey("source", "Excerpt"),
    unsafeObjectWithKey("provider", "Payload"),
    unsafeObjectWithKey("payment", "Secret"),
    unsafeObjectWithKey("billing", "Secret"),
    unsafeObjectWithKey("officialModel", "Answer"),
    unsafeObjectWithKey("confirmed", "Score"),
    unsafeObjectWithKey("pass", "Probability"),
  ];

  for (const unsafe of unsafeValues) {
    assert.throws(
      () => assertS222MetadataOnly(unsafe),
      /raw-user-data-in-derived-metadata|s222-metadata-forbidden-content-field|s222-metadata-forbidden-authority-field/,
    );
    assert.throws(
      () => buildS222AcademyOperationState({ ...baseStateInput(), ...unsafe }),
      /raw-user-data-in-derived-metadata|s222-metadata-forbidden-content-field|s222-metadata-forbidden-authority-field/,
    );
  }

  assert.doesNotThrow(() => assertS222MetadataOnly(buildS222AuditEvent({
    eventId: "s222_audit_001",
    eventKind: "queue_visibility_checked",
    academyTenantId: "academy_tenant_s222_a",
    operatorIdHash: "operator_hash_s222_001",
    operatorRole: "academy_operator",
    operationId: "s222_operation_001",
    queueItemId: "s222_queue_001",
    occurredAt: "2026-07-06T09:01:00.000Z",
    reasonCode: "metadata_visibility_check",
  })));
});

test("S222 learner, instructor, and academy route separation is preserved", async () => {
  const learnerPaths = [
    "app/app/layout.tsx",
    "app/app/page.tsx",
    "app/app/capture/page.tsx",
    "components/review-os/capture-form.tsx",
    "app/answer-review/answer-review-client.tsx",
  ];
  for (const path of learnerPaths) {
    const source = await readFile(path, "utf8");
    assert.equal(source.includes("/academy"), false, `${path} must not link academy routes`);
    assert.equal(source.includes("s222-academy-answer-operations"), false, `${path} must not import S222 academy contract`);
    assert.equal(source.includes("S222_ACADEMY"), false, `${path} must not expose S222 academy symbols`);
  }

  const instructorPaths = [
    "app/instructor/source-review/page.tsx",
    "app/instructor/second-grading/page.tsx",
    "app/instructor/second-grading/second-grading-client.tsx",
  ];
  for (const path of instructorPaths) {
    const source = await readFile(path, "utf8");
    assert.equal(source.includes("s222-academy-answer-operations"), false, `${path} must not import S222 academy contract`);
  }
});

test("S222 files do not add checkout, webhook, provider, payment, OCR, route, auth, workflow, archive, or corpus runtime activation", async () => {
  const source = await readFile("lib/review-os/s222-academy-answer-operations-tenant-boundary.ts", "utf8");

  assert.doesNotMatch(source, /fetch\(|\/api\/|new OpenAI|GoogleGenerativeAI|createClient|from\(["']@supabase|STRIPE_SECRET_KEY|SUPABASE_SERVICE_ROLE/i);
  assert.doesNotMatch(source, /\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
  for (const token of [
    "academyRouteAdded",
    "academyApiRouteAdded",
    "learnerRouteChanged",
    "instructorRouteChanged",
    "authChanged",
    "supabaseMigrationAdded",
    "workflowChanged",
    "checkoutAdded",
    "paymentWebhookAdded",
    "billingProviderCalled",
    "productionBillingActivated",
    "entitlementEnforcementActivated",
    "productionPricingUiAdded",
    "providerRuntimeExpanded",
    "ocrRuntimeExpanded",
    "publicArchiveUiAdded",
    "rawCorpusExpansionAdded",
  ]) {
    assert.match(source, new RegExp(`${token}:\\s*false`), `${token} must remain false`);
  }
});

test("S222 tracked source, docs, and fixtures stay metadata-only without blocked authority copy", async () => {
  const s222Entries = await readTrackedS222Files();
  assert.ok(s222Entries.some(([path]) => path === "lib/review-os/s222-academy-answer-operations-tenant-boundary.ts"));
  assert.ok(s222Entries.some(([path]) => path === "docs/s222-academy-answer-operations-tenant-boundary.md"));

  const rawFieldAssignmentPattern =
    /["'](?:answerText|rawAnswerText|userAnswerText|ocrText|rawOcrText|problemText|questionText|referenceText|sourceExcerpt|providerPayload|paymentSecret|billingSecret|pdfBytes|imageBytes)["']\s*[:=]/i;
  const blockedClaimPattern = blockedAuthorityCopyPattern();

  for (const [path, text] of s222Entries) {
    assert.doesNotMatch(text, rawFieldAssignmentPattern, `${path} must not assign raw fields`);
    assert.doesNotMatch(text, blockedClaimPattern, `${path} must not include blocked authority copy`);
  }

  const tracked = repositoryPathsIncludingUntracked();
  assert.equal(
    tracked.some((path) => /(?:^|\/)(?:reference_corpus|data)\//.test(path.replace(/\\/g, "/")) && /s222/i.test(path)),
    false,
    "S222 must not add global reference corpus or data fixtures",
  );
});

test("S222 safe keys, docs, runner, roadmap, and Agent Factory example target are wired", async () => {
  const docs = await readFile("docs/s222-academy-answer-operations-tenant-boundary.md", "utf8");
  const runner = await readFile("scripts/run-node-tests.mjs", "utf8");
  const agentFactoryDocs = await readFile("docs/agent-factory-github-actions-button.md", "utf8");
  const agentFactoryButtonTest = await readFile("tests/agent-factory-github-actions-button.test.mjs", "utf8");
  const roadmapSource = await readFile("roadmap/active-program.yml", "utf8");
  const plan = createRoadmapRunnerPlanFromYaml(roadmapSource);
  const s222 = plan.analyses.find((item) => item.itemId === "S222");
  const s223 = plan.analyses.find((item) => item.itemId === "S223");
  const s224 = plan.analyses.find((item) => item.itemId === "S224");
  const s225 = plan.analyses.find((item) => item.itemId === "S225");

  for (const token of [
    "S222",
    "Academy Answer Operations Tenant Boundary",
    "tenant scoped",
    "metadata only",
    "operator roles",
    "queue visibility",
    "learner handoff",
    "audit event",
    "source contract only",
  ]) {
    assert.match(docs, new RegExp(token, "i"));
  }

  for (const key of [
    "academyTenantId",
    "academyTenantBoundaryVersion",
    "academyOperatorIdHash",
    "academyOperatorRole",
    "academyOperationStateId",
    "academyReviewQueueId",
    "academyAssignmentId",
    "academyReviewStatus",
    "academyEvidenceStatus",
    "academyLearnerSafeHandoffStatus",
    "academyAuditEventId",
    "academyAuditEventKind",
    "answerReviewQueueVisibility",
    "tenantBoundaryStatus",
    "operatorBoundaryStatus",
  ]) {
    assert.ok(SAFE_DERIVED_SIGNAL_KEYS.includes(key), `Missing S222 safe key ${key}`);
  }

  assert.match(runner, /tests\/s222-academy-answer-operations-tenant-boundary\.test\.mjs/);
  assert.match(agentFactoryDocs, /roadmap item id such as `S225`/);
  assert.match(agentFactoryButtonTest, /--target[\s\S]{0,80}S225/);
  assert.equal(s222?.statusCategory, "completed");
  assert.equal(s223?.statusCategory, "completed");
  assert.equal(s224?.statusCategory, "completed");
  assert.equal(s225?.readinessStatus, "blocked");
  assert.deepEqual(s225?.missingDependencies, ["O4D"]);
  assert.deepEqual(plan.selectedItemIds, ["S235B", "O3A"]);
});
