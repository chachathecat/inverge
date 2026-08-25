import {
  expect,
  test,
  type APIRequestContext,
  type BrowserContext,
  type Page,
  type Route,
} from "@playwright/test";
import { execFileSync, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname } from "node:path";

const baseURL = process.env.E2E_BASE_URL ?? "";
const ownerEmail = process.env.C3R_L_OWNER_EMAIL ?? "";
const ownerPassword = process.env.C3R_L_OWNER_PASSWORD ?? "";
const otherOwnerEmail = process.env.C3R_L_OTHER_OWNER_EMAIL ?? "";
const otherOwnerPassword = process.env.C3R_L_OTHER_OWNER_PASSWORD ?? "";
const nonOwnerEmail = process.env.C3R_L_NON_OWNER_EMAIL ?? "";
const nonOwnerPassword = process.env.C3R_L_NON_OWNER_PASSWORD ?? "";
const evidencePath = process.env.C3R_L_BROWSER_EVIDENCE_PATH ?? "";
const practiceCompatibilityEvidencePath =
  process.env.C3R_L_PRACTICE_COMPATIBILITY_EVIDENCE_PATH ?? "";
const databaseContainer = process.env.C3R_L_DATABASE_CONTAINER ?? "";
const mode = process.env.C3R_L_BROWSER_MODE ?? "journey";
const browserFailureStagePath = process.env.C3R_L_BROWSER_FAILURE_STAGE_PATH ?? "";
const DATABASE_CONTAINER = /^supabase_db_c3r-l-cycle-[12]-\d+-\d+$/u;
const BROWSER_FAILURE_STAGE_SCHEMA_VERSION = "inverge.c3r_l.browser_failure_stage.v1";
const BROWSER_FAILURE_STAGES = {
  journey: [
    "LOAD_RETRY_INITIAL", "LOAD_RETRY_ERROR_VISIBLE", "LOAD_RETRY_COMPLETE",
    "STALE_BOOKMARK_INITIAL", "STALE_BOOKMARK_ERROR_VISIBLE",
    "STALE_BOOKMARK_RECOVERY_COMPLETE",
    "INITIAL_RUNTIME", "LAW_START", "FEEDBACK_COMMIT", "FEEDBACK_UI",
    "DIRECT_RPC_DENIALS", "REPAIR_REPLAY", "EARLY_D1_UI", "ASSISTED_REVIEW",
    "D1_PLAN_COMPLETE", "EARLY_D7_UI", "D7_PLAN_COMPLETE", "EARLY_RECURRENCE_UI",
    "RECURRENCE", "TERMINAL_PLAN_UI", "REOPEN", "EARLY_REOPEN_UI",
    "REOPEN_COMPLETE", "PRACTICE_COMPAT_THEORY_START", "PRACTICE_COMPATIBILITY",
    "PRACTICE_START", "THEORY_COMPATIBILITY",
    "THEORY_COMPAT_START", "THEORY_COMPAT_FEEDBACK", "THEORY_COMPAT_REJECTED_REPAIR",
    "THEORY_COMPAT_REPAIR", "THEORY_COMPAT_ASSISTED", "THEORY_COMPAT_D1_PLAN",
    "THEORY_COMPAT_D1_COMPLETE", "THEORY_COMPAT_D7_PLAN", "THEORY_COMPAT_D7_PRESENT",
    "THEORY_COMPAT_D7_COMPLETE", "THEORY_COMPAT_RECURRENCE", "THEORY_COMPAT_REOPEN",
    "THEORY_COMPAT_REOPEN_COMPLETE", "THEORY_COMPAT_RESTORE", "THEORY_COMPAT_EXPORT",
    "THEORY_COMPAT_DELETE", "THEORY_COMPAT_ISOLATION", "THEORY_START", "ISOLATION",
    "PERSISTENCE_EVIDENCE", "TERMINAL_CONTEXT_CLOSE", "COMPLETE",
  ],
  restore: ["RESTORE_LOAD", "EXPORT", "DELETE_ISOLATION", "COMPLETE"],
  feature_off: ["ACCESS_GATE", "COMPLETE"],
  production_denied: ["ACCESS_GATE", "COMPLETE"],
} as const;
type BrowserMode = keyof typeof BROWSER_FAILURE_STAGES;
type BrowserFailureStage = (typeof BROWSER_FAILURE_STAGES)[BrowserMode][number];

type RuntimeView = {
  restored: null | {
    record: { id: string; state: string; record_version: number };
    attempts: Array<Record<string, unknown>>;
    transferTask: null | { taskId: string; state: string; prompt: string | null };
  };
  currentPlan: null | {
    planId: string;
    recordVersion: number;
    state: string;
    blocks: Array<{ blockId: string; executionState: string }>;
  };
};

type ApiBody = { ok: boolean; view?: RuntimeView; export?: Record<string, unknown> };

type PracticeRuntimeView = {
  restored: null | {
    record: { id: string; state: string; record_version: number };
    transferTask: null | { taskId: string; state: string };
  };
  currentPlan: null | {
    planId: string;
    recordVersion: number;
    state: string;
    blocks: Array<{ blockId: string; executionState: string }>;
  };
  dashboard: { queue: Array<Record<string, unknown>> };
};

type PracticeApiBody = {
  ok: boolean;
  error?: string;
  view?: PracticeRuntimeView;
  export?: Record<string, unknown>;
  result?: Record<string, unknown>;
};

function requireRuntime() {
  for (const value of [
    baseURL, ownerEmail, ownerPassword, otherOwnerEmail, otherOwnerPassword,
    nonOwnerEmail, nonOwnerPassword, evidencePath, practiceCompatibilityEvidencePath,
    browserFailureStagePath,
  ]) {
    if (!value) throw new Error("C3R-L browser runtime environment is incomplete");
  }
  if (!DATABASE_CONTAINER.test(databaseContainer)) {
    throw new Error("C3R-L database container boundary is invalid");
  }
  if (!["journey", "restore", "feature_off", "production_denied"].includes(mode)) {
    throw new Error("C3R-L browser mode is invalid");
  }
  if (dirname(browserFailureStagePath) !== dirname(evidencePath) ||
    basename(browserFailureStagePath) !== `browser-stage-${mode}.json`) {
    throw new Error("C3R-L browser failure-stage path is invalid");
  }
  if (!['127.0.0.1', 'localhost', '::1'].includes(new URL(baseURL).hostname)) {
    throw new Error("C3R-L browser runtime refused a non-local target");
  }
}

function markBrowserFailureStage(stage: BrowserFailureStage) {
  const stages = BROWSER_FAILURE_STAGES[mode as BrowserMode] as readonly string[];
  if (!stages.includes(stage)) throw new Error("C3R-L browser failure stage is invalid");
  writeFileSync(browserFailureStagePath, `${JSON.stringify({
    schemaVersion: BROWSER_FAILURE_STAGE_SCHEMA_VERSION,
    mode,
    stage,
  })}\n`, { mode: 0o600 });
}

async function login(context: BrowserContext, email: string, password: string) {
  const response = await context.request.post("/api/auth/sign-in", {
    data: { email, password, mode: "second" },
  });
  expect(response.status()).toBe(200);
}

async function post(request: APIRequestContext, data: Record<string, unknown>) {
  const response = await request.post("/api/review-os/c3r-l", { data });
  const body = await response.json() as ApiBody;
  expect(response.status(), JSON.stringify(body)).toBe(200);
  expect(body.ok).toBe(true);
  return body;
}

function passClaim() {
  return {
    sourceRevisionId: "d9f7e7fa-9d1d-4c65-8d2f-719e44356001",
    anchorId: "repair-anchor:law:synthetic-article-10",
    anchorVersionId: "repair-anchor:law:synthetic-article-10@1",
    lawSourceBindingId: "law-binding:synthetic-official-act:article-10",
    sourceId: "law-source:synthetic-official-act",
    sourceVersionId: "law-source:synthetic-official-act@2026-01-01",
    lawAnchorId: "law-anchor:synthetic-official-act:article-10",
    lawAnchorVersionId: "law-anchor:synthetic-official-act:article-10@2026-01-01",
    exactLocator: "Article 10",
    exactVersionIdentity: "2026-01-01",
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    applicableAsOf: "2026-08-15",
    currentLawApplicability: "APPLICABLE_CURRENT",
    blockerState: { openBlockingReferenceIds: [], blockerCount: 0 },
    confirmationMode: "MANUAL_STRUCTURED",
  };
}

function failedClaim() {
  const claim = passClaim();
  return {
    ...claim,
    exactLocator: "Article 11",
  };
}

function crossTargetClaim() {
  const claim = passClaim();
  return {
    ...claim,
    sourceId: "law-source:synthetic-other-act",
  };
}

function psqlArgs() {
  return [
    "exec", "--interactive", databaseContainer, "psql", "--no-psqlrc", "--quiet",
    "--tuples-only", "--no-align", "--set", "ON_ERROR_STOP=1",
    "--username", "postgres", "--dbname", "postgres",
  ];
}

function databaseScalar(sql: string) {
  return execFileSync("docker", psqlArgs(), {
    input: sql,
    encoding: "utf8",
    timeout: 15_000,
  }).trim();
}

function directRpcFailure(sql: string, marker: RegExp) {
  const result = spawnSync("docker", psqlArgs(), {
    input: `begin;\nset local role service_role;\n${sql}\ncommit;\n`,
    encoding: "utf8",
    timeout: 15_000,
  });
  expect(result.status).not.toBe(0);
  expect(`${result.stdout}\n${result.stderr}`).toMatch(marker);
}

function encodedJson(value: unknown) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64");
}

function rpcSql(input: {
  userId: string;
  commandId: string;
  expectedVersion: number;
  action: string;
  payload: Record<string, unknown>;
}) {
  return `select public.c3r_l_apply_learning_command_v1(
    '${input.userId}'::uuid, '${input.commandId}'::uuid, ${input.expectedVersion},
    '${input.action}', convert_from(decode('${encodedJson(input.payload)}', 'base64'), 'UTF8')::jsonb
  );`;
}

function writeEvidence(value: Record<string, unknown>) {
  mkdirSync(dirname(evidencePath), { recursive: true });
  writeFileSync(evidencePath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

function writePracticeCompatibilityEvidence(value: Record<string, unknown>) {
  mkdirSync(dirname(practiceCompatibilityEvidencePath), { recursive: true });
  writeFileSync(
    practiceCompatibilityEvidencePath,
    `${JSON.stringify(value, null, 2)}\n`,
    { mode: 0o600 },
  );
}

function practiceClaim(result = 100_000_000, transferTask = false) {
  return {
    sourceRevisionId: "26a4f3bd-ddf3-4215-9fdf-d83453122ce1",
    anchorId: "repair-anchor:practice:synthetic-net-income",
    anchorVersionId: transferTask
      ? "repair-anchor:practice:synthetic-net-income@d7-transfer-v1"
      : "repair-anchor:practice:synthetic-net-income@1",
    grossIncome: { value: transferTask ? 150_000_000 : 120_000_000, unit: "KRW_PER_YEAR" },
    operatingExpense: { value: transferTask ? 30_000_000 : 20_000_000,
      unit: "KRW_PER_YEAR" },
    operator: "SUBTRACT",
    operandOrder: ["gross_income", "operating_expense"],
    result: { value: transferTask ? 120_000_000 : result, unit: "KRW_PER_YEAR" },
    sign: "POSITIVE",
    rounding: { mode: "HALF_UP", scale: 0, required: false },
    confirmationMode: "MANUAL_STRUCTURED",
  };
}

async function postPractice(request: APIRequestContext, data: Record<string, unknown>) {
  const response = await request.post("/api/review-os/c3r-p", { data });
  const body = await response.json() as PracticeApiBody;
  expect(response.status(), JSON.stringify(body)).toBe(200);
  expect(body.ok).toBe(true);
  return body;
}

function practicePlanInput(view: PracticeRuntimeView) {
  const block = view.currentPlan?.blocks.find((item) => item.executionState === "PENDING");
  return {
    planBlockId: block?.blockId ?? null,
    planId: view.currentPlan?.planId ?? null,
    planVersion: view.currentPlan?.recordVersion ?? null,
  };
}

async function createAcceptedPracticePlan(
  request: APIRequestContext,
  recordId: string,
  kind: "TODAY" | "FULL_DAY",
  evidenceStep: string,
) {
  let body = await postPractice(request, {
    action: "create_plan", commandId: randomUUID(), recordId, planId: randomUUID(), kind,
    availableMinutes: kind === "TODAY" ? 90 : 180, evidenceStep,
  });
  expect(body.view?.currentPlan?.state).toBe("PROPOSED");
  body = await postPractice(request, {
    action: "decide_plan", commandId: randomUUID(), recordId,
    planId: body.view?.currentPlan?.planId,
    expectedVersion: body.view?.currentPlan?.recordVersion,
    decision: "ACCEPT", blocks: null, evidenceStep,
  });
  expect(body.view?.currentPlan?.state).toBe("ACCEPTED");
  return body;
}

async function exercisePracticeCompatibility(
  request: APIRequestContext,
  coexistingLawRecordId: string,
  coexistingTheoryRecordId: string,
  expectedLawAttemptCount: number,
) {
  const recordId = randomUUID();
  let body = await postPractice(request, {
    action: "start", commandId: randomUUID(), recordId, attemptId: randomUUID(),
    attemptBody: "총수익에서 운영비를 차감해 순수익을 계산한다.",
    prediction: "likely_partial", confidence: "medium", evidenceStep: "d0",
  });
  body = await postPractice(request, {
    action: "commit_feedback", commandId: randomUUID(), recordId,
    expectedVersion: body.view?.restored?.record.record_version,
    gapId: randomUUID(), failureNoteId: randomUUID(), assistanceEventId: randomUUID(),
    failureNote: "차감 관계와 단위를 함께 고정하지 못했다.", evidenceStep: "feedback",
  });
  const rejected = await request.post("/api/review-os/c3r-p", { data: {
    action: "submit_repair", commandId: randomUUID(), recordId,
    expectedVersion: body.view?.restored?.record.record_version,
    attemptId: randomUUID(), claim: practiceClaim(90_000_000), evidenceStep: "feedback",
  }});
  expect(rejected.status()).toBe(409);
  expect(await rejected.json()).toEqual({ ok: false, error: "invalid_transition" });
  body = await postPractice(request, {
    action: "submit_repair", commandId: randomUUID(), recordId,
    expectedVersion: body.view?.restored?.record.record_version,
    attemptId: randomUUID(), claim: practiceClaim(), evidenceStep: "feedback",
  });
  body = await createAcceptedPracticePlan(request, recordId, "TODAY", "d1");
  if (!body.view) throw new Error("Practice D+1 plan view is missing");
  body = await postPractice(request, {
    action: "complete_d1", commandId: randomUUID(), recordId,
    expectedVersion: body.view.restored?.record.record_version,
    attemptId: randomUUID(), claim: practiceClaim(), ...practicePlanInput(body.view),
    evidenceStep: "d1",
  });
  body = await createAcceptedPracticePlan(request, recordId, "FULL_DAY", "d7");
  const transferTaskId = body.view?.restored?.transferTask?.taskId;
  if (!transferTaskId) throw new Error("Practice transfer task is missing");
  body = await postPractice(request, {
    action: "present_d7_transfer_task", commandId: randomUUID(), recordId,
    expectedVersion: body.view?.restored?.record.record_version,
    transferTaskId, evidenceStep: "d7",
  });
  if (!body.view) throw new Error("Practice D+7 view is missing");
  body = await postPractice(request, {
    action: "complete_d7_transfer", commandId: randomUUID(), recordId,
    expectedVersion: body.view.restored?.record.record_version,
    attemptId: randomUUID(), claim: practiceClaim(100_000_000, true), transferTaskId,
    ...practicePlanInput(body.view), evidenceStep: "d7",
  });
  body = await postPractice(request, {
    action: "complete_recurrence", commandId: randomUUID(), recordId,
    expectedVersion: body.view?.restored?.record.record_version,
    attemptId: randomUUID(), claim: practiceClaim(), planBlockId: null,
    planId: null, planVersion: null, evidenceStep: "recurrence",
  });
  body = await postPractice(request, {
    action: "record_later_failure", commandId: randomUUID(), recordId,
    expectedVersion: body.view?.restored?.record.record_version,
    attemptId: randomUUID(), claim: practiceClaim(90_000_000), evidenceStep: "reopen",
  });
  body = await postPractice(request, {
    action: "complete_reopened_review", commandId: randomUUID(), recordId,
    expectedVersion: body.view?.restored?.record.record_version,
    attemptId: randomUUID(), claim: practiceClaim(), planBlockId: null,
    planId: null, planVersion: null, evidenceStep: "reopenComplete",
  });
  expect(body.view?.restored?.record.state).toBe("CLOSED");
  const restored = await request.get(
    `/api/review-os/c3r-p?recordId=${recordId}&evidenceStep=reopenComplete`,
  );
  expect(restored.status()).toBe(200);
  const restoredBody = await restored.json() as PracticeApiBody;
  expect(restoredBody.view?.restored?.record.state).toBe("CLOSED");
  expect(Array.isArray(restoredBody.view?.dashboard.queue)).toBe(true);
  const exported = await postPractice(request, { action: "export" });
  expect(exported.export?.subject).toBe("PRACTICE");
  for (const collection of ["records", "attempts", "plans"] as const) {
    const rows = exported.export?.[collection];
    expect(Array.isArray(rows)).toBe(true);
    expect((rows as Array<Record<string, unknown>>).every((row) => row.subject === "PRACTICE"))
      .toBe(true);
  }
  const serializedExport = JSON.stringify(exported.export);
  expect(serializedExport).not.toContain(coexistingLawRecordId);
  expect(serializedExport).not.toContain(coexistingTheoryRecordId);
  await postPractice(request, { action: "delete" });
  expect((await request.get(`/api/review-os/c3r-p?recordId=${recordId}`)).status()).toBe(404);
  const preservedLaw = await request.get(
    `/api/review-os/c3r-l?recordId=${coexistingLawRecordId}`,
  );
  expect(preservedLaw.status()).toBe(200);
  const preservedLawBody = await preservedLaw.json() as ApiBody;
  expect(preservedLawBody.view?.restored?.record.state).toBe("CLOSED");
  expect(preservedLawBody.view?.restored?.attempts).toHaveLength(expectedLawAttemptCount);
  const preservedTheory = await request.get(
    `/api/review-os/c3r-t?recordId=${coexistingTheoryRecordId}`,
  );
  expect(preservedTheory.status()).toBe(200);
  const preservedTheoryBody = await preservedTheory.json() as ApiBody;
  expect(preservedTheoryBody.view?.restored?.record.state).toBe("D0_OPEN");
  expect(preservedTheoryBody.view?.restored?.attempts).toHaveLength(1);
  expect(databaseScalar(`select concat_ws('|',
    (select count(*) from public.c3r_p_learning_records
      where id='${coexistingLawRecordId}'::uuid and subject='LAW'),
    (select count(*) from public.c3r_p_attempts
      where record_id='${coexistingLawRecordId}'::uuid and subject='LAW'),
    (select count(*) from public.c3r_p_learning_records
      where id='${coexistingTheoryRecordId}'::uuid and subject='THEORY'),
    (select count(*) from public.c3r_p_attempts
      where record_id='${coexistingTheoryRecordId}'::uuid and subject='THEORY')
  );`)).toBe(`1|${expectedLawAttemptCount}|1|1`);
  writePracticeCompatibilityEvidence({
    schemaVersion: "inverge.c3r_l.practice_compatibility_metadata.v1",
    browserToPostgres: true,
    practiceVertical: true,
    plannerCreateDecide: true,
    d1: true,
    d7: true,
    recurrence: true,
    reopen: true,
    restoreDashboard: true,
    completeLearnerExport: true,
    practiceExportExcludesLaw: true,
    practiceExportExcludesTheory: true,
    delete: true,
    practiceDeletePreservesLaw: true,
    practiceDeletePreservesTheory: true,
    negativeValidatorDenied: true,
    rawLearnerBodyInEvidence: false,
    providerCalls: 0,
  });
}

function theoryClaim(failed = false) {
  return {
    sourceRevisionId: "b8e6d6e9-8c0c-4b54-9c1e-608d33245001",
    anchorId: "repair-anchor:theory:synthetic-income-approach",
    anchorVersionId: "repair-anchor:theory:synthetic-income-approach@1",
    targetScopeId: "theory-target:synthetic-income-approach",
    clauses: [{
      clauseIndex: 1,
      scopeResolution: "EXACT",
      scopeId: "theory-target:synthetic-income-approach",
      predicates: [
        { predicateId: "converts_expected_income_to_value", polarity: "ASSERTED" },
        { predicateId: "uses_only_historical_cost", polarity: failed ? "ASSERTED" : "NEGATED" },
      ],
    }],
    confirmationMode: "MANUAL_STRUCTURED",
  };
}

async function postTheory(request: APIRequestContext, data: Record<string, unknown>) {
  const response = await request.post("/api/review-os/c3r-t", { data });
  const body = await response.json() as ApiBody;
  expect(response.status(), JSON.stringify(body)).toBe(200);
  expect(body.ok).toBe(true);
  return body;
}

async function createAcceptedTheoryPlan(
  request: APIRequestContext,
  recordId: string,
  kind: "TODAY" | "FULL_DAY",
  evidenceStep: string,
) {
  let body = await postTheory(request, {
    action: "create_plan", commandId: randomUUID(), recordId, planId: randomUUID(), kind,
    availableMinutes: kind === "TODAY" ? 90 : 180, evidenceStep,
  });
  body = await postTheory(request, {
    action: "decide_plan", commandId: randomUUID(), recordId,
    planId: body.view?.currentPlan?.planId,
    expectedVersion: body.view?.currentPlan?.recordVersion,
    decision: "ACCEPT", blocks: null, evidenceStep,
  });
  expect(body.view?.currentPlan?.state).toBe("ACCEPTED");
  return body;
}

async function exerciseTheoryCompatibility(
  request: APIRequestContext,
  recordId: string,
  coexistingLawRecordId: string,
  coexistingPracticeRecordId: string,
  expectedLawAttemptCount: number,
) {
  markBrowserFailureStage("THEORY_COMPAT_START");
  const existing = await request.get(`/api/review-os/c3r-t?recordId=${recordId}&evidenceStep=d0`);
  expect(existing.status()).toBe(200);
  let body = await existing.json() as ApiBody;
  expect(body.view?.restored?.record.state).toBe("D0_OPEN");
  expect(body.view?.restored?.attempts).toHaveLength(1);
  markBrowserFailureStage("THEORY_COMPAT_FEEDBACK");
  body = await postTheory(request, {
    action: "commit_feedback", commandId: randomUUID(), recordId,
    expectedVersion: body.view?.restored?.record.record_version,
    gapId: randomUUID(), failureNoteId: randomUUID(), assistanceEventId: randomUUID(),
    failureNote: "목표 범위와 금지 술어를 함께 고정하지 못했다.", evidenceStep: "feedback",
  });
  markBrowserFailureStage("THEORY_COMPAT_REJECTED_REPAIR");
  const rejected = await request.post("/api/review-os/c3r-t", { data: {
    action: "submit_repair", commandId: randomUUID(), recordId,
    expectedVersion: body.view?.restored?.record.record_version,
    attemptId: randomUUID(), claim: theoryClaim(true), evidenceStep: "feedback",
  }});
  expect(rejected.status()).toBe(409);
  expect(await rejected.json()).toEqual({ ok: false, error: "invalid_transition" });
  markBrowserFailureStage("THEORY_COMPAT_REPAIR");
  body = await postTheory(request, {
    action: "submit_repair", commandId: randomUUID(), recordId,
    expectedVersion: body.view?.restored?.record.record_version,
    attemptId: randomUUID(), claim: theoryClaim(), evidenceStep: "feedback",
  });
  markBrowserFailureStage("THEORY_COMPAT_ASSISTED");
  body = await postTheory(request, {
    action: "record_assisted_review", commandId: randomUUID(), recordId,
    expectedVersion: body.view?.restored?.record.record_version,
    attemptId: randomUUID(), claim: theoryClaim(), evidenceStep: "d1",
  });
  markBrowserFailureStage("THEORY_COMPAT_D1_PLAN");
  body = await createAcceptedTheoryPlan(request, recordId, "TODAY", "d1Rescheduled");
  if (!body.view) throw new Error("Theory D+1 plan view is missing");
  markBrowserFailureStage("THEORY_COMPAT_D1_COMPLETE");
  body = await postTheory(request, {
    action: "complete_d1", commandId: randomUUID(), recordId,
    expectedVersion: body.view.restored?.record.record_version,
    attemptId: randomUUID(), claim: theoryClaim(), ...currentPlanInput(body.view),
    evidenceStep: "d1Rescheduled",
  });
  markBrowserFailureStage("THEORY_COMPAT_D7_PLAN");
  body = await createAcceptedTheoryPlan(request, recordId, "FULL_DAY", "d7");
  const transferTaskId = body.view?.restored?.transferTask?.taskId;
  if (!transferTaskId) throw new Error("Theory transfer task is missing");
  markBrowserFailureStage("THEORY_COMPAT_D7_PRESENT");
  body = await postTheory(request, {
    action: "present_d7_transfer_task", commandId: randomUUID(), recordId,
    expectedVersion: body.view?.restored?.record.record_version,
    transferTaskId, evidenceStep: "d7",
  });
  if (!body.view) throw new Error("Theory D+7 view is missing");
  markBrowserFailureStage("THEORY_COMPAT_D7_COMPLETE");
  body = await postTheory(request, {
    action: "complete_d7_transfer", commandId: randomUUID(), recordId,
    expectedVersion: body.view.restored?.record.record_version,
    attemptId: randomUUID(), claim: theoryClaim(), transferTaskId,
    ...currentPlanInput(body.view), evidenceStep: "d7",
  });
  markBrowserFailureStage("THEORY_COMPAT_RECURRENCE");
  body = await postTheory(request, {
    action: "complete_recurrence", commandId: randomUUID(), recordId,
    expectedVersion: body.view?.restored?.record.record_version,
    attemptId: randomUUID(), claim: theoryClaim(), planBlockId: null,
    planId: null, planVersion: null, evidenceStep: "recurrence",
  });
  markBrowserFailureStage("THEORY_COMPAT_REOPEN");
  body = await postTheory(request, {
    action: "record_later_failure", commandId: randomUUID(), recordId,
    expectedVersion: body.view?.restored?.record.record_version,
    attemptId: randomUUID(), claim: theoryClaim(true), evidenceStep: "reopen",
  });
  markBrowserFailureStage("THEORY_COMPAT_REOPEN_COMPLETE");
  body = await postTheory(request, {
    action: "complete_reopened_review", commandId: randomUUID(), recordId,
    expectedVersion: body.view?.restored?.record.record_version,
    attemptId: randomUUID(), claim: theoryClaim(), planBlockId: null,
    planId: null, planVersion: null, evidenceStep: "reopenComplete",
  });
  expect(body.view?.restored?.record.state).toBe("CLOSED");
  markBrowserFailureStage("THEORY_COMPAT_RESTORE");
  const restored = await request.get(
    `/api/review-os/c3r-t?recordId=${recordId}&evidenceStep=reopenComplete`,
  );
  expect(restored.status()).toBe(200);
  expect((await restored.json() as ApiBody).view?.restored?.record.state).toBe("CLOSED");
  markBrowserFailureStage("THEORY_COMPAT_EXPORT");
  const exported = await postTheory(request, { action: "export" });
  expect(exported.export?.subject).toBe("THEORY");
  for (const collection of ["records", "attempts", "plans"] as const) {
    const rows = exported.export?.[collection];
    expect(Array.isArray(rows)).toBe(true);
    expect((rows as Array<Record<string, unknown>>).every((row) => row.subject === "THEORY"))
      .toBe(true);
  }
  const serializedExport = JSON.stringify(exported.export);
  expect(serializedExport).not.toContain(coexistingLawRecordId);
  expect(serializedExport).not.toContain(coexistingPracticeRecordId);
  markBrowserFailureStage("THEORY_COMPAT_DELETE");
  await postTheory(request, { action: "delete" });
  expect((await request.get(`/api/review-os/c3r-t?recordId=${recordId}`)).status()).toBe(404);
  markBrowserFailureStage("THEORY_COMPAT_ISOLATION");
  const preservedLaw = await request.get(`/api/review-os/c3r-l?recordId=${coexistingLawRecordId}`);
  expect(preservedLaw.status()).toBe(200);
  const preservedLawBody = await preservedLaw.json() as ApiBody;
  expect(preservedLawBody.view?.restored?.record.state).toBe("CLOSED");
  expect(preservedLawBody.view?.restored?.attempts).toHaveLength(expectedLawAttemptCount);
  const preservedPractice = await request.get(
    `/api/review-os/c3r-p?recordId=${coexistingPracticeRecordId}`,
  );
  expect(preservedPractice.status()).toBe(200);
  const preservedPracticeBody = await preservedPractice.json() as PracticeApiBody;
  expect(preservedPracticeBody.view?.restored?.record.state).toBe("D0_OPEN");
  expect(databaseScalar(`select concat_ws('|',
    (select count(*) from public.c3r_p_learning_records
      where id='${coexistingLawRecordId}'::uuid and subject='LAW'),
    (select count(*) from public.c3r_p_attempts
      where record_id='${coexistingLawRecordId}'::uuid and subject='LAW'),
    (select count(*) from public.c3r_p_learning_records
      where id='${coexistingPracticeRecordId}'::uuid and subject='PRACTICE'),
    (select count(*) from public.c3r_p_attempts
      where record_id='${coexistingPracticeRecordId}'::uuid and subject='PRACTICE')
  );`)).toBe(`1|${expectedLawAttemptCount}|1|1`);
  return recordId;
}

function lawEvidenceStepRoute(evidenceStep: string) {
  return async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "GET" && url.pathname === "/api/review-os/c3r-l") {
      url.searchParams.set("evidenceStep", evidenceStep);
      await route.continue({ url: url.toString() });
      return;
    }
    await route.continue();
  };
}

async function assertLawControlsDisabled(
  page: Page,
  recordId: string,
  evidenceStep: string,
  buttonNames: readonly string[],
  eligibilityTestId: string | null,
) {
  const handler = lawEvidenceStepRoute(evidenceStep);
  await page.route("**/api/review-os/c3r-l*", handler);
  await page.goto(`/app/c3r-l?recordId=${recordId}`);
  for (const name of buttonNames) {
    await expect(page.getByRole("button", { name })).toBeDisabled();
  }
  if (eligibilityTestId) await expect(page.getByTestId(eligibilityTestId)).toBeVisible();
  await page.unroute("**/api/review-os/c3r-l*", handler);
}

async function assertBlankLawReconstruction(
  page: Page,
  recordId: string,
  evidenceStep: string,
  expectedReference: boolean,
  submitButtonName: string,
) {
  const handler = lawEvidenceStepRoute(evidenceStep);
  await page.route("**/api/review-os/c3r-l*", handler);
  await page.goto(`/app/c3r-l?recordId=${recordId}`);
  const reconstruction = page.getByTestId("c3r-l-reconstruction-fields");
  await expect(reconstruction).toBeVisible();
  const fields = reconstruction.locator("input, select");
  await expect(fields).toHaveCount(15);
  for (let index = 0; index < 15; index += 1) {
    await expect(fields.nth(index)).toHaveValue("");
  }
  if (expectedReference) {
    await expect(page.getByTestId("c3r-l-direct-repair-reference")).toBeVisible();
  } else {
    await expect(page.getByTestId("c3r-l-direct-repair-reference")).toHaveCount(0);
  }
  await expect(page.getByRole("button", { name: submitButtonName })).toBeDisabled();
  await page.unroute("**/api/review-os/c3r-l*", handler);
}

function currentPlanInput(view: RuntimeView) {
  const block = view.currentPlan?.blocks.find((item) => item.executionState === "PENDING");
  return {
    planBlockId: block?.blockId ?? null,
    planId: view.currentPlan?.planId ?? null,
    planVersion: view.currentPlan?.recordVersion ?? null,
  };
}

test.beforeEach(() => requireRuntime());

test("C3R-L initial load errors support retry and stale-bookmark recovery", async ({ browser }) => {
  test.skip(mode !== "journey", "journey mode only");
  const owner = await browser.newContext({ baseURL });
  try {
    await login(owner, ownerEmail, ownerPassword);
    const page = await owner.newPage();
    markBrowserFailureStage("LOAD_RETRY_INITIAL");
    let failInitialLoads = true;
    const transientFailure = async (route: Route) => {
      if (failInitialLoads && route.request().method() === "GET") {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ ok: false, error: "temporarily_unavailable" }),
        });
        return;
      }
      await route.continue();
    };
    await page.route("**/api/review-os/c3r-l*", transientFailure);
    await page.goto("/app/c3r-l");
    await expect(page.getByTestId("c3r-l-load-error")).toBeVisible();
    await expect(page.getByRole("alert")).toContainText("temporarily_unavailable");
    failInitialLoads = false;
    markBrowserFailureStage("LOAD_RETRY_ERROR_VISIBLE");
    await page.getByRole("button", { name: "다시 시도", exact: true }).click();
    await expect(page.getByTestId("c3r-l-runtime")).toBeVisible();
    markBrowserFailureStage("LOAD_RETRY_COMPLETE");
    await page.unroute("**/api/review-os/c3r-l*", transientFailure);

    const missingRecordId = randomUUID();
    markBrowserFailureStage("STALE_BOOKMARK_INITIAL");
    await page.goto(`/app/c3r-l?recordId=${missingRecordId}`);
    await expect(page.getByTestId("c3r-l-load-error")).toBeVisible();
    await expect(page.getByRole("alert")).toContainText("not_found");
    markBrowserFailureStage("STALE_BOOKMARK_ERROR_VISIBLE");
    await page.getByRole("button", { name: "기본 법규 학습으로 돌아가기" }).click();
    await expect(page.getByTestId("c3r-l-runtime")).toBeVisible();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/app/c3r-l");
    await expect.poll(() => new URL(page.url()).search).toBe("");
    markBrowserFailureStage("STALE_BOOKMARK_RECOVERY_COMPLETE");
  } finally {
    await owner.close();
  }
});

test("C3R-L Owner Law journey reaches Postgres and remains isolated", async ({ browser }) => {
  test.skip(mode !== "journey", "journey mode only");
  const owner = await browser.newContext({ baseURL });
  const otherOwner = await browser.newContext({ baseURL });
  const nonOwner = await browser.newContext({ baseURL });
  await login(owner, ownerEmail, ownerPassword);
  await login(otherOwner, otherOwnerEmail, otherOwnerPassword);
  await login(nonOwner, nonOwnerEmail, nonOwnerPassword);

  const page = await owner.newPage();
  markBrowserFailureStage("INITIAL_RUNTIME");
  await page.goto("/app/c3r-l");
  await expect(page.getByTestId("c3r-l-runtime")).toBeVisible();

  markBrowserFailureStage("LAW_START");
  const recordId = randomUUID();
  const startCommandId = randomUUID();
  const startPayload = {
    action: "start", commandId: startCommandId, recordId, attemptId: randomUUID(),
    attemptBody: "합성 법령 Article 10의 적용 기준일과 현재성을 확인해야 한다고 생각한다.",
    prediction: "likely_partial", confidence: "medium", evidenceStep: "d0",
  };
  let body = await post(owner.request, startPayload);
  expect(body.view?.restored?.record.state).toBe("D0_OPEN");
  markBrowserFailureStage("FEEDBACK_COMMIT");
  const feedback = await post(owner.request, {
    action: "commit_feedback", commandId: randomUUID(), recordId,
    expectedVersion: body.view?.restored?.record.record_version,
    gapId: randomUUID(), failureNoteId: randomUUID(), assistanceEventId: randomUUID(),
    failureNote: "정확한 출처 버전과 적용일, 현재성, 차단 근거를 함께 고정하지 못했다.",
    evidenceStep: "feedback",
  });
  body = feedback;
  const record = body.view?.restored?.record;
  expect(record?.state).toBe("FEEDBACK_COMMITTED");
  if (!record) throw new Error("C3R-L feedback record is missing");
  markBrowserFailureStage("FEEDBACK_UI");
  await assertBlankLawReconstruction(page, recordId, "feedback", true, "구조화 재작성 제출");
  markBrowserFailureStage("DIRECT_RPC_DENIALS");
  const configurationDigest = databaseScalar(
    `select configuration_digest from public.c3r_p_learning_records where id='${recordId}'::uuid;`,
  );
  const ownerUserId = databaseScalar(
    `select user_id from public.c3r_p_learning_records where id='${recordId}'::uuid;`,
  );
  const basePayload = {
    recordId, attemptId: randomUUID(), claim: passClaim(),
    configurationDigest, occurredAt: "2026-08-25T00:06:00.000Z",
  };
  directRpcFailure(rpcSql({
    userId: ownerUserId,
    commandId: randomUUID(), expectedVersion: record.record_version, action: "submit_repair",
    payload: { ...basePayload, proofState: "PASS", proofDigest: "a".repeat(64),
      validatorId: "validator:law-exact-applicability@1", attemptBody: "forged" },
  }), /C3R_P_INVALID_INPUT|C3R_L_INVALID_INPUT/u);
  directRpcFailure(rpcSql({
    userId: ownerUserId,
    commandId: randomUUID(), expectedVersion: record.record_version, action: "submit_repair",
    payload: { ...basePayload, attemptId: randomUUID(), claim: crossTargetClaim() },
  }), /C3R_L_STRUCTURED_PROOF_REQUIRED/u);

  markBrowserFailureStage("REPAIR_REPLAY");
  const repairCommandId = randomUUID();
  const repairPayload = {
    action: "submit_repair", commandId: repairCommandId, recordId,
    expectedVersion: record.record_version, attemptId: randomUUID(), claim: passClaim(),
    evidenceStep: "feedback",
  };
  body = await post(owner.request, repairPayload);
  expect(body.view?.restored?.record.state).toBe("REPAIRED");
  await new Promise((resolve) => setTimeout(resolve, 25));
  const replay = await post(owner.request, repairPayload);
  expect(replay.view?.restored?.record.record_version)
    .toBe(body.view?.restored?.record.record_version);
  expect(replay.view?.restored?.attempts.length).toBe(body.view?.restored?.attempts.length);
  markBrowserFailureStage("EARLY_D1_UI");
  await assertLawControlsDisabled(
    page,
    recordId,
    "feedback",
    ["도움받아 복습", "D+1 독립 재구성", "Today 계획", "Full-Day 계획"],
    "c3r-l-d1-eligibility",
  );

  markBrowserFailureStage("ASSISTED_REVIEW");
  body = await post(owner.request, {
    action: "record_assisted_review", commandId: randomUUID(), recordId,
    expectedVersion: body.view?.restored?.record.record_version,
    attemptId: randomUUID(), claim: passClaim(), evidenceStep: "d1",
  });
  expect(body.view?.restored?.record.state).toBe("REPAIRED");

  markBrowserFailureStage("D1_PLAN_COMPLETE");
  body = await post(owner.request, {
    action: "create_plan", commandId: randomUUID(), recordId, planId: randomUUID(),
    kind: "TODAY", availableMinutes: 90, evidenceStep: "d1Rescheduled",
  });
  expect(body.view?.currentPlan?.state).toBe("PROPOSED");
  body = await post(owner.request, {
    action: "decide_plan", commandId: randomUUID(), recordId,
    planId: body.view?.currentPlan?.planId,
    expectedVersion: body.view?.currentPlan?.recordVersion,
    decision: "ACCEPT", blocks: null, evidenceStep: "d1Rescheduled",
  });
  body = await post(owner.request, {
    action: "complete_d1", commandId: randomUUID(), recordId,
    expectedVersion: body.view?.restored?.record.record_version,
    attemptId: randomUUID(), claim: passClaim(), ...currentPlanInput(body.view!),
    evidenceStep: "d1Rescheduled",
  });
  expect(body.view?.restored?.record.state).toBe("D1_COMPLETE");
  markBrowserFailureStage("EARLY_D7_UI");
  await assertLawControlsDisabled(
    page,
    recordId,
    "d1Fresh",
    ["D+7 전이 과업 열기", "Today 계획", "Full-Day 계획"],
    "c3r-l-d7-eligibility",
  );

  markBrowserFailureStage("D7_PLAN_COMPLETE");
  body = await post(owner.request, {
    action: "create_plan", commandId: randomUUID(), recordId, planId: randomUUID(),
    kind: "FULL_DAY", availableMinutes: 180, evidenceStep: "d7",
  });
  body = await post(owner.request, {
    action: "decide_plan", commandId: randomUUID(), recordId,
    planId: body.view?.currentPlan?.planId,
    expectedVersion: body.view?.currentPlan?.recordVersion,
    decision: "ACCEPT", blocks: null, evidenceStep: "d7",
  });
  const transferTaskId = body.view?.restored?.transferTask?.taskId;
  if (!transferTaskId) throw new Error("C3R-L sealed transfer task is missing");
  body = await post(owner.request, {
    action: "present_d7_transfer_task", commandId: randomUUID(), recordId,
    expectedVersion: body.view?.restored?.record.record_version,
    transferTaskId, evidenceStep: "d7",
  });
  expect(body.view?.restored?.transferTask?.state).toBe("PRESENTED");
  body = await post(owner.request, {
    action: "complete_d7_transfer", commandId: randomUUID(), recordId,
    expectedVersion: body.view?.restored?.record.record_version,
    attemptId: randomUUID(), claim: passClaim(), transferTaskId,
    ...currentPlanInput(body.view!), evidenceStep: "d7",
  });
  expect(body.view?.restored?.record.state).toBe("D7_COMPLETE");
  markBrowserFailureStage("EARLY_RECURRENCE_UI");
  await assertLawControlsDisabled(
    page,
    recordId,
    "d7",
    ["시간 제한 재현 완료", "Today 계획", "Full-Day 계획"],
    "c3r-l-recurrence-eligibility",
  );
  markBrowserFailureStage("RECURRENCE");
  body = await post(owner.request, {
    action: "complete_recurrence", commandId: randomUUID(), recordId,
    expectedVersion: body.view?.restored?.record.record_version,
    attemptId: randomUUID(), claim: passClaim(),
    planBlockId: null, planId: null, planVersion: null, evidenceStep: "recurrence",
  });
  expect(body.view?.restored?.record.state).toBe("CLOSED");
  markBrowserFailureStage("TERMINAL_PLAN_UI");
  await assertLawControlsDisabled(
    page,
    recordId,
    "recurrence",
    ["Today 계획", "Full-Day 계획"],
    "c3r-l-plan-eligibility",
  );
  await assertBlankLawReconstruction(page, recordId, "recurrence", false, "후속 실패로 다시 열기");
  markBrowserFailureStage("REOPEN");
  body = await post(owner.request, {
    action: "record_later_failure", commandId: randomUUID(), recordId,
    expectedVersion: body.view?.restored?.record.record_version,
    attemptId: randomUUID(), claim: failedClaim(), evidenceStep: "reopen",
  });
  expect(body.view?.restored?.record.state).toBe("REOPENED");
  const failedAttempt = body.view?.restored?.attempts.find((attempt) =>
    attempt.proof_state === "UNSUPPORTED");
  expect(failedAttempt?.body).toBe(
    "법규 적용 결합 검증 UNSUPPORTED: 현재 적용 가능성을 확인하지 못했습니다.",
  );
  expect(String(failedAttempt?.body)).not.toContain("현재 적용 가능하며");
  markBrowserFailureStage("EARLY_REOPEN_UI");
  await assertLawControlsDisabled(
    page,
    recordId,
    "d7",
    ["재개 복습 독립 완료", "Today 계획", "Full-Day 계획"],
    "c3r-l-reopened-eligibility",
  );
  markBrowserFailureStage("REOPEN_COMPLETE");
  body = await post(owner.request, {
    action: "complete_reopened_review", commandId: randomUUID(), recordId,
    expectedVersion: body.view?.restored?.record.record_version,
    attemptId: randomUUID(), claim: passClaim(),
    planBlockId: null, planId: null, planVersion: null, evidenceStep: "reopenComplete",
  });
  expect(body.view?.restored?.record.state).toBe("CLOSED");

  const lawAttemptCount = body.view?.restored?.attempts.length ?? 0;
  expect(lawAttemptCount).toBe(8);
  markBrowserFailureStage("PRACTICE_COMPAT_THEORY_START");
  const practiceCompatibilityTheoryRecordId = randomUUID();
  await postTheory(owner.request, {
    action: "start", commandId: randomUUID(), recordId: practiceCompatibilityTheoryRecordId,
    attemptId: randomUUID(),
    attemptBody: "수익방식의 목표 범위와 필수 술어를 다시 고정한다.",
    prediction: "likely_partial", confidence: "medium", evidenceStep: "d0",
  });
  markBrowserFailureStage("PRACTICE_COMPATIBILITY");
  await exercisePracticeCompatibility(
    owner.request,
    recordId,
    practiceCompatibilityTheoryRecordId,
    lawAttemptCount,
  );
  markBrowserFailureStage("PRACTICE_START");
  const practiceRecordId = randomUUID();
  await postPractice(owner.request, {
    action: "start", commandId: randomUUID(), recordId: practiceRecordId,
    attemptId: randomUUID(), attemptBody: "연간 순수익 계산을 다시 시작한다.",
    prediction: "likely_partial", confidence: "medium", evidenceStep: "d0",
  });
  markBrowserFailureStage("THEORY_COMPATIBILITY");
  const theoryCompatibilityRecordId = await exerciseTheoryCompatibility(
    owner.request,
    practiceCompatibilityTheoryRecordId,
    recordId,
    practiceRecordId,
    lawAttemptCount,
  );
  markBrowserFailureStage("THEORY_START");
  const theoryRecordId = randomUUID();
  await postTheory(owner.request, {
    action: "start", commandId: randomUUID(), recordId: theoryRecordId,
    attemptId: randomUUID(),
    attemptBody: "수익방식의 목표 범위와 필수 술어를 다시 고정한다.",
    prediction: "likely_partial", confidence: "medium", evidenceStep: "d0",
  });

  markBrowserFailureStage("ISOLATION");
  const otherUserId = databaseScalar(
    `select id from auth.users where lower(email)=lower('${otherOwnerEmail.replaceAll("'", "''")}');`,
  );
  directRpcFailure(
    `select public.c3r_l_restore_record_v1('${otherUserId}'::uuid, '${recordId}'::uuid);`,
    /C3R_L_NOT_FOUND/u,
  );
  directRpcFailure(
    `select public.c3r_p_restore_record_v1('${ownerUserId}'::uuid, '${recordId}'::uuid);`,
    /C3R_P_NOT_FOUND/u,
  );
  const otherResponse = await otherOwner.request.get(`/api/review-os/c3r-l?recordId=${recordId}`);
  expect(otherResponse.status()).toBe(404);
  const nonOwnerResponse = await nonOwner.request.get(`/api/review-os/c3r-l?recordId=${recordId}`);
  expect(nonOwnerResponse.status()).toBe(404);
  const anonymous = await browser.newContext({ baseURL });
  expect((await anonymous.request.get(`/api/review-os/c3r-l?recordId=${recordId}`)).status()).toBe(404);
  await anonymous.close();

  markBrowserFailureStage("PERSISTENCE_EVIDENCE");
  const persisted = databaseScalar(`select concat_ws('|',
    (select count(*) from public.c3r_p_learning_records where id='${recordId}'::uuid and subject='LAW'),
    (select count(*) from public.c3r_p_attempts where record_id='${recordId}'::uuid and validator_id is not null),
    (select count(*) from public.c3r_p_attempts where record_id='${recordId}'::uuid
      and proof_claim is not null and proof_evaluation is not null
      and proof_evaluation->>'state'=proof_state
      and proof_evaluation->'reasonCodes'=proof_reason_codes
      and proof_digest=encode(extensions.digest(convert_to(jsonb_build_object(
        'claim', proof_claim, 'evaluation', proof_evaluation)::text, 'UTF8'), 'sha256'), 'hex')),
    (select count(*) from public.c3r_p_attempts where record_id='${recordId}'::uuid
      and proof_state='UNSUPPORTED' and proof_reason_codes ? 'exact_locator_mismatch'),
    (select count(*) from public.c3r_p_attempts where record_id='${recordId}'::uuid
      and proof_state='UNSUPPORTED'
      and body='법규 적용 결합 검증 UNSUPPORTED: 현재 적용 가능성을 확인하지 못했습니다.'
      and body not like '%현재 적용 가능하며%'),
    (select count(*) from public.c3r_p_learning_records where id='${practiceRecordId}'::uuid and subject='PRACTICE'),
    (select count(*) from public.c3r_p_learning_records where id='${theoryRecordId}'::uuid and subject='THEORY')
  );`);
  expect(persisted).toBe("1|7|7|1|1|1|1");
  writeEvidence({
    schemaVersion: "inverge.c3r_l.browser_metadata.v1",
    recordId,
    practiceRecordId,
    theoryRecordId,
    theoryCompatibilityRecordId,
    browserToPostgres: true,
    directRpcForgedProofDenied: true,
    directRpcCrossTargetPassDenied: true,
    nonEvidenceRetryIdempotent: true,
    lawProofClaimEvaluationPersisted: true,
    exactFailureStateReasonPersisted: true,
    todayAndFullDay: true,
    d1AssistanceRescheduled: true,
    earlyD1UiSuppressed: true,
    earlyD7UiSuppressed: true,
    earlyRecurrenceUiSuppressed: true,
    earlyReopenedUiSuppressed: true,
    preDuePlanUiSuppressed: true,
    terminalPlanUiSuppressed: true,
    sealedD7Transfer: true,
    timedRecurrence: true,
    laterFailureReopen: true,
    postReopenIndependentCompletion: true,
    crossUserLawRestoreCamouflaged: true,
    crossSubjectPracticeRestoreCamouflaged: true,
    theoryDurableCompatibility: true,
    theoryDeletePreservesPracticeAndLaw: true,
    ownerOnly: true,
    rawLearnerBodyInEvidence: false,
    providerCalls: 0,
  });
  markBrowserFailureStage("TERMINAL_CONTEXT_CLOSE");
  await owner.close();
  await otherOwner.close();
  await nonOwner.close();
  markBrowserFailureStage("COMPLETE");
});

test("C3R-L restart restore, export and subject-isolated delete are durable", async ({ browser }) => {
  test.skip(mode !== "restore", "restore mode only");
  markBrowserFailureStage("RESTORE_LOAD");
  const prior = JSON.parse(readFileSync(evidencePath, "utf8")) as Record<string, unknown>;
  const recordId = String(prior.recordId ?? "");
  const practiceRecordId = String(prior.practiceRecordId ?? "");
  const theoryRecordId = String(prior.theoryRecordId ?? "");
  const theoryCompatibilityRecordId = String(prior.theoryCompatibilityRecordId ?? "");
  expect(recordId).toMatch(/^[0-9a-f-]{36}$/u);
  const owner = await browser.newContext({ baseURL });
  await login(owner, ownerEmail, ownerPassword);
  const restored = await owner.request.get(`/api/review-os/c3r-l?recordId=${recordId}`);
  expect(restored.status()).toBe(200);
  const restoredBody = await restored.json() as ApiBody;
  expect(restoredBody.view?.restored?.record.state).toBe("CLOSED");
  const restoredFailure = restoredBody.view?.restored?.attempts.find((attempt) =>
    attempt.proof_state === "UNSUPPORTED" && Array.isArray(attempt.proof_reason_codes));
  expect(restoredFailure?.body).toBe(
    "법규 적용 결합 검증 UNSUPPORTED: 현재 적용 가능성을 확인하지 못했습니다.",
  );
  markBrowserFailureStage("EXPORT");
  const exported = await post(owner.request, { action: "export" });
  expect(exported.export?.subject).toBe("LAW");
  for (const collection of ["records", "attempts", "plans"] as const) {
    const rows = exported.export?.[collection];
    expect(Array.isArray(rows)).toBe(true);
    expect((rows as Array<Record<string, unknown>>).every((row) => row.subject === "LAW"))
      .toBe(true);
  }
  const receipts = exported.export?.commandReceipts as Array<Record<string, unknown>>;
  expect(Array.isArray(receipts)).toBe(true);
  expect(receipts.length).toBeGreaterThan(0);
  const knownLawAggregates = new Set([
    ...((exported.export?.records ?? []) as Array<Record<string, unknown>>).map((row) => row.id),
    ...((exported.export?.plans ?? []) as Array<Record<string, unknown>>).map((row) => row.id),
  ]);
  expect(receipts.every((receipt) => receipt.subject === "LAW" &&
    knownLawAggregates.has(receipt.aggregateId))).toBe(true);
  const serializedExport = JSON.stringify(exported.export);
  const exportedFailure = (exported.export?.attempts as Array<Record<string, unknown>>).find(
    (attempt) => attempt.proof_state === "UNSUPPORTED",
  );
  expect(exportedFailure?.body).toBe(
    "법규 적용 결합 검증 UNSUPPORTED: 현재 적용 가능성을 확인하지 못했습니다.",
  );
  expect(String(exportedFailure?.body)).not.toContain("현재 적용 가능하며");
  expect(serializedExport).not.toContain(practiceRecordId);
  expect(serializedExport).not.toContain(theoryRecordId);
  expect(serializedExport).not.toContain(theoryCompatibilityRecordId);
  expect(serializedExport).not.toMatch(/request_?sha256|requestSha256/u);
  markBrowserFailureStage("DELETE_ISOLATION");
  await post(owner.request, { action: "delete" });
  expect(databaseScalar(`select concat_ws('|',
    (select count(*) from public.c3r_p_learning_records where id='${recordId}'::uuid),
      (select count(*) from public.c3r_p_attempts where record_id='${recordId}'::uuid),
      (select count(*) from public.c3r_p_learning_records where id='${practiceRecordId}'::uuid and subject='PRACTICE'),
      (select count(*) from public.c3r_p_learning_records where id='${theoryRecordId}'::uuid and subject='THEORY'),
      (select count(*) from public.c3r_p_learning_records where id='${theoryCompatibilityRecordId}'::uuid)
    );`)).toBe("0|0|1|1|0");
  expect((await owner.request.get(`/api/review-os/c3r-l?recordId=${recordId}`)).status()).toBe(404);
  writeEvidence({
    ...prior,
    recordId: undefined,
    practiceRecordId: undefined,
    theoryRecordId: undefined,
    theoryCompatibilityRecordId: undefined,
    restartRestore: true,
    completeLearnerExport: true,
    lawDeletePreservesPractice: true,
    lawDeletePreservesTheory: true,
    restoreExportDelete: true,
    cleanupReady: true,
  });
  markBrowserFailureStage("COMPLETE");
  await owner.close();
});

test("C3R-L default-off and Production gates fail as not-found", async ({ browser }) => {
  test.skip(!["feature_off", "production_denied"].includes(mode), "gate mode only");
  markBrowserFailureStage("ACCESS_GATE");
  const owner = await browser.newContext({ baseURL });
  await login(owner, ownerEmail, ownerPassword);
  const response = await owner.request.get("/api/review-os/c3r-l");
  expect(response.status()).toBe(404);
  expect(await response.json()).toEqual({ ok: false, error: "not_found" });
  markBrowserFailureStage("COMPLETE");
  await owner.close();
});
