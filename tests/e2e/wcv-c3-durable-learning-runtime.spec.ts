import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import type { DurableLearningView } from "../../lib/review-os/durable-learning-server";
import type { TrustedRepairView } from "../../lib/review-os/trusted-repair-server";

const baseURL = process.env.E2E_BASE_URL ?? "";
const emailA = process.env.WCV_C3_USER_A_EMAIL ?? "";
const passwordA = process.env.WCV_C3_USER_A_PASSWORD ?? "";
const emailB = process.env.WCV_C3_USER_B_EMAIL ?? "";
const passwordB = process.env.WCV_C3_USER_B_PASSWORD ?? "";
const transientEvidencePath = process.env.WCV_C3_TRANSIENT_EVIDENCE_PATH ?? "";
const recoveryCaseId = process.env.WCV_C3_RECOVERY_CASE_ID ?? "";

const SUBJECTS = ["appraisal_practical", "appraisal_theory", "appraisal_law"] as const;
type Subject = (typeof SUBJECTS)[number];

function requireRuntime() {
  if (!baseURL || !emailA || !passwordA || !emailB || !passwordB) {
    throw new Error("WCV-C3 browser runtime environment is incomplete");
  }
  if (!new Set(["127.0.0.1", "localhost", "::1"]).has(new URL(baseURL).hostname)) {
    throw new Error("WCV-C3 browser runtime refused a non-local target");
  }
}

async function login(context: BrowserContext, email = emailA, password = passwordA) {
  const response = await context.request.post("/api/auth/sign-in", {
    data: { email, password, mode: "second" },
  });
  expect(response.status()).toBe(200);
}

async function contextFor(browser: Browser, viewport = { width: 390, height: 844 }, email = emailA, password = passwordA) {
  const context = await browser.newContext({ baseURL, viewport });
  await login(context, email, password);
  return context;
}

async function trustedCommand(context: BrowserContext, action: string, fields: Record<string, unknown>) {
  const response = await context.request.post("/api/review-os/trusted-repair", {
    data: { action, commandId: randomUUID(), ...fields },
  });
  const body = await response.json();
  expect(response.status(), `${action}:${body?.error ?? "unknown"}`).toBe(200);
  return body.view as TrustedRepairView;
}

async function c3Command(context: BrowserContext, action: string, view: DurableLearningView, fields: Record<string, unknown> = {}) {
  const response = await context.request.post("/api/review-os/durable-learning", {
    data: {
      action,
      caseId: view.case.caseId,
      expectedVersion: view.case.recordVersion,
      commandId: randomUUID(),
      ...fields,
    },
  });
  const body = await response.json();
  expect(response.status(), `${action}:${body?.error ?? "unknown"}`).toBe(200);
  return body.view as DurableLearningView;
}

function practiceClaim(view: TrustedRepairView) {
  const confirmation = view.structuredConfirmation;
  if (!confirmation) throw new Error("Practice structured confirmation is unavailable");
  return {
    sourceRevisionId: confirmation.sourceRevisionId,
    anchorId: confirmation.anchorId,
    anchorVersionId: confirmation.anchorVersionId,
    grossIncome: { value: 120000000, unit: confirmation.unit },
    operatingExpense: { value: 20000000, unit: confirmation.unit },
    operator: confirmation.operator,
    operandOrder: confirmation.operandOrder,
    result: { value: 100000000, unit: confirmation.unit },
    sign: confirmation.sign,
    rounding: confirmation.rounding,
    confirmationMode: "MANUAL_STRUCTURED",
  };
}

function theoryClaim(view: TrustedRepairView) {
  const confirmation = view.theoryStructuredConfirmation;
  if (!confirmation) throw new Error("Theory structured confirmation is unavailable");
  return {
    sourceRevisionId: confirmation.sourceRevisionId,
    anchorId: confirmation.anchorId,
    anchorVersionId: confirmation.anchorVersionId,
    targetScopeId: confirmation.targetScopeId,
    clauses: [
      { clauseIndex: 1, scopeResolution: "EXACT", scopeId: confirmation.targetScopeId, predicates: [{ predicateId: confirmation.requiredPredicates[0], polarity: "ASSERTED" }] },
      { clauseIndex: 2, scopeResolution: "EXACT", scopeId: confirmation.targetScopeId, predicates: [{ predicateId: confirmation.forbiddenPredicates[0], polarity: "NEGATED" }] },
    ],
    confirmationMode: "MANUAL_STRUCTURED",
  };
}

function lawClaim(view: TrustedRepairView) {
  const confirmation = view.lawStructuredConfirmation;
  if (!confirmation) throw new Error("Law structured confirmation is unavailable");
  return {
    sourceRevisionId: confirmation.sourceRevisionId,
    anchorId: confirmation.anchorId,
    anchorVersionId: confirmation.anchorVersionId,
    lawSourceBindingId: confirmation.lawSourceBindingId,
    sourceId: confirmation.sourceId,
    sourceVersionId: confirmation.sourceVersionId,
    lawAnchorId: confirmation.lawAnchorId,
    lawAnchorVersionId: confirmation.lawAnchorVersionId,
    exactLocator: confirmation.exactLocator,
    exactVersionIdentity: confirmation.exactVersionIdentity,
    effectiveFrom: confirmation.effectiveFrom,
    effectiveTo: confirmation.effectiveTo,
    applicableAsOf: confirmation.applicableAsOf,
    currentLawApplicability: confirmation.currentLawApplicability,
    blockerState: confirmation.blockerState,
    confirmationMode: "MANUAL_STRUCTURED",
  };
}

async function createVerifiedSource(context: BrowserContext, subject: Subject) {
  let view = await trustedCommand(context, "start", { subject, inputMode: "TYPED_TEXT" });
  const transition = async (action: string, fields: Record<string, unknown> = {}) => {
    view = await trustedCommand(context, action, { sessionId: view.session.sessionId, expectedVersion: view.session.recordVersion, ...fields });
  };
  await transition("confirm_revision", { body: `합성 ${subject} 확정 수정본` });
  await transition("commit_prediction", { prediction: "likely_partial", confidence: "medium" });
  await transition("commit_attempt", { body: "도움 전 독립 시도에서 정확한 과목 결합을 구성한다." });
  await transition("commit_self_diagnosis", { selfDiagnosisCode: "typed_binding_required" });
  await transition("diagnose");
  await transition("request_scaffold");
  await transition("submit_repair", { body: "최소 도움 뒤 정확한 과목 결합을 다시 구성한다." });
  const action = subject === "appraisal_practical" ? "confirm_claim" : subject === "appraisal_theory" ? "confirm_theory_claim" : "confirm_law_claim";
  const claim = subject === "appraisal_practical" ? practiceClaim(view) : subject === "appraisal_theory" ? theoryClaim(view) : lawClaim(view);
  await transition(action, { claim });
  expect(view.session.state).toBe("verified");
  return view.session.sessionId as string;
}

function c3Commitment(subject: Subject, wrong = false) {
  if (subject === "appraisal_practical") return { kind: "PRACTICE_CALCULATION", anchorId: "repair-anchor:practice:synthetic-net-income", grossIncome: 120000000, operatingExpense: 20000000, operator: "SUBTRACT", result: wrong ? 99 : 100000000, unit: "KRW_PER_YEAR", sign: "POSITIVE", rounding: "NONE" };
  if (subject === "appraisal_theory") return { kind: "THEORY_PREDICATE", anchorId: "repair-anchor:theory:synthetic-income-approach", targetScopeId: "theory-target:synthetic-income-approach", requiredPredicate: "converts_expected_income_to_value", forbiddenPredicateAsserted: false, polarity: wrong ? "NEGATIVE" : "POSITIVE" };
  return { kind: "LAW_EXACT_APPLICABILITY", anchorId: "repair-anchor:law:synthetic-article-10", sourceId: "law-source:synthetic-official-act", sourceVersionId: "law-source:synthetic-official-act@2026-01-01", lawAnchorId: "law-anchor:synthetic-official-act:article-10", lawAnchorVersionId: "law-anchor:synthetic-official-act:article-10@2026-01-01", exactLocator: wrong ? "Article 11" : "Article 10", applicableAsOf: "2026-08-15", currentness: "APPLICABLE_CURRENT", blockerCount: 0 };
}

async function fillCommitment(page: Page, subject: Subject) {
  if (subject === "appraisal_practical") {
    await page.getByLabel("계산 앵커 ID").fill("repair-anchor:practice:synthetic-net-income");
    await page.getByLabel("총수익").fill("120000000");
    await page.getByLabel("운영비").fill("20000000");
    await page.getByLabel("계산 결과").fill("100000000");
    await page.getByLabel("연산자").selectOption("SUBTRACT");
    await page.getByLabel("단위").selectOption("KRW_PER_YEAR");
    await page.getByLabel("부호").selectOption("POSITIVE");
    await page.getByLabel("반올림").selectOption("NONE");
  } else if (subject === "appraisal_theory") {
    await page.getByLabel("이론 앵커 ID").fill("repair-anchor:theory:synthetic-income-approach");
    await page.getByLabel("정확한 목표 범위 ID").fill("theory-target:synthetic-income-approach");
    await page.getByLabel("필수 술어 ID").fill("converts_expected_income_to_value");
    await page.getByLabel("필수 술어 극성").selectOption("POSITIVE");
    await page.getByLabel("금지 술어 주장 여부").selectOption("false");
  } else {
    const values: Record<string, string> = {
      "복구 앵커 ID": "repair-anchor:law:synthetic-article-10",
      "법령 출처 ID": "law-source:synthetic-official-act",
      "법령 출처 버전 ID": "law-source:synthetic-official-act@2026-01-01",
      "법령 앵커 ID": "law-anchor:synthetic-official-act:article-10",
      "법령 앵커 버전 ID": "law-anchor:synthetic-official-act:article-10@2026-01-01",
      "정확 위치": "Article 10",
      "적용 기준일": "2026-08-15",
      "열린 차단 근거 수": "0",
    };
    for (const [label, value] of Object.entries(values)) await page.getByLabel(label).fill(value);
    await page.getByLabel("현재성").selectOption("APPLICABLE_CURRENT");
  }
}

async function completeC3Ui(page: Page, sourceSessionId: string, subject: Subject, keyboardOnly: boolean) {
  const foreignHosts = new Set<string>();
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin !== new URL(baseURL).origin) foreignHosts.add(url.host);
  });
  await page.goto(`/app/durable-learning?sourceSessionId=${sourceSessionId}`);
  await expect(page.locator("[data-wcv-c3-durable-learning]")).toBeVisible();
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations.filter((item) => item.impact === "serious" || item.impact === "critical")).toEqual([]);
  const activate = async () => {
    const button = page.locator("[data-primary-action]");
    if (keyboardOnly) { await button.focus(); await page.keyboard.press("Enter"); } else await button.click();
  };
  await activate();
  for (const state of ["D1_REPRODUCED", "D7_TRANSFER_OBSERVED", "TIMED_RECURRENCE_CONFIRMED"]) {
    await activate();
    await page.getByLabel("보지 않고 작성한 독립 답안").fill(`비공개 ${subject} 독립 답안`);
    await fillCommitment(page, subject);
    await activate();
    await expect(page.getByText(state === "D1_REPRODUCED" ? /D\+1 독립 재현/ : state === "D7_TRANSFER_OBSERVED" ? /D\+7 전이 확인/ : /시간제한 재발 검사 확인/)).toBeVisible();
  }
  await activate();
  await expect(page.getByText("현재 안정 후보", { exact: true })).toBeVisible();
  expect([...foreignHosts]).toEqual([]);
  return new URL(page.url()).searchParams.get("caseId") as string;
}

test("WCV-C3 three-subject browser, Postgres, plan, privacy and reopen chain", async ({ browser }) => {
  requireRuntime();
  test.skip(Boolean(recoveryCaseId), "normal acceptance is omitted during restart restoration");
  const viewports = [{ width: 390, height: 844 }, { width: 768, height: 900 }, { width: 1440, height: 900 }];
  const caseIds: string[] = [];
  for (let index = 0; index < SUBJECTS.length; index += 1) {
    const context = await contextFor(browser, viewports[index]);
    const sourceSessionId = await createVerifiedSource(context, SUBJECTS[index]);
    const page = await context.newPage();
    const caseId = await completeC3Ui(page, sourceSessionId, SUBJECTS[index], index === 0);
    caseIds.push(caseId);
    await context.close();
  }

  const owner = await contextFor(browser);
  let practice = (await owner.request.get(`/api/review-os/durable-learning?caseId=${caseIds[0]}`)).json().then((body) => body.view);
  practice = await practice;
  for (const availableMinutes of [30, 60, 90, 180, 600, 720]) {
    practice = await c3Command(owner, "build_plan", practice, { availableMinutes, recoveryMode: availableMinutes === 30 ? "MINIMUM_MAINTENANCE" : "NORMAL", fixedCommitments: availableMinutes >= 60 ? [{ commitmentId: randomUUID(), label: "MANUAL_COMMITMENT", minutes: 30 }] : [] });
    expect(practice.latestPlan.coreOutcomes.length).toBeLessThanOrEqual(3);
  }
  practice = await c3Command(owner, "decide_plan", practice, { decision: "EDITED", reason: "available_minutes_changed" });
  expect(practice.case.state).toBe("CURRENTLY_CLEAR");
  practice = await c3Command(owner, "prepare_attempt", practice);
  practice = await c3Command(owner, "record_evidence", practice, { body: "후속 독립 실패", commitment: c3Commitment("appraisal_practical", true) });
  expect(practice.case.state).toBe("REOPENED");

  const foreign = await contextFor(browser, { width: 390, height: 844 }, emailB, passwordB);
  const denied = await foreign.request.get(`/api/review-os/durable-learning?caseId=${caseIds[1]}`);
  expect(denied.status()).toBe(404);
  await foreign.close();

  const exportResponse = await owner.request.post("/api/review-os/durable-learning", { data: { action: "export", caseId: caseIds[2], expectedVersion: 8 } });
  expect(exportResponse.status()).toBe(200);
  expect((await exportResponse.json()).exportBundle.privateArtifacts).toHaveLength(3);
  const law = await (await owner.request.get(`/api/review-os/durable-learning?caseId=${caseIds[2]}`)).json();
  const deleted = await owner.request.post("/api/review-os/durable-learning", { data: { action: "delete", caseId: caseIds[2], expectedVersion: law.view.case.recordVersion, commandId: randomUUID() } });
  expect(deleted.status()).toBe(200);
  expect((await owner.request.get(`/api/review-os/durable-learning?caseId=${caseIds[2]}`)).status()).toBe(404);

  if (transientEvidencePath) writeFileSync(transientEvidencePath, `${JSON.stringify({ recoveryCaseId: caseIds[1], counts: { completedSubjects: 3, deletedCases: 1, reopenedCases: 1 } })}\n`, { mode: 0o600 });
  await owner.close();
});

test("WCV-C3 process restart restores exact private case", async ({ browser }) => {
  requireRuntime();
  test.skip(!recoveryCaseId, "restart restoration runs only after the server restart");
  const owner = await contextFor(browser);
  const response = await owner.request.get(`/api/review-os/durable-learning?caseId=${recoveryCaseId}`);
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.view.case.state).toBe("CURRENTLY_CLEAR");
  expect(body.view.ledger.artifacts).toHaveLength(3);
  expect((body.view as DurableLearningView).ledger.events.every((event) => event.payload.containsBody === false)).toBe(true);
  await owner.close();
});
