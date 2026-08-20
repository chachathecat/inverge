import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import type { DurableLearningFixtureStage } from "../../lib/review-os/durable-learning-fixtures";
import type { DurableReviewOutputProjectionV1 } from "../../lib/review-os/durable-learning-contract";
import type { DurableLearningView } from "../../lib/review-os/durable-learning-server";
import type { TrustedRepairView } from "../../lib/review-os/trusted-repair-server";

const baseURL = process.env.E2E_BASE_URL ?? "";
const emailA = process.env.WCV_C3_USER_A_EMAIL ?? "";
const passwordA = process.env.WCV_C3_USER_A_PASSWORD ?? "";
const emailB = process.env.WCV_C3_USER_B_EMAIL ?? "";
const passwordB = process.env.WCV_C3_USER_B_PASSWORD ?? "";
const transientEvidencePath = process.env.WCV_C3_TRANSIENT_EVIDENCE_PATH ?? "";
const recoveryCaseId = process.env.WCV_C3_RECOVERY_CASE_ID ?? "";
const realTimeC3Only = process.env.WCV_C3_REAL_TIME_C3_ONLY === "true";

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

function assertRuntimeReviewOutputs(view: DurableLearningView, expectedOutcome: "SUCCESS" | "FAILURE" | "TIMEOUT") {
  const review = view.latestReviewOutcome;
  expect(review).not.toBeNull();
  const event = view.ledger.events.find(
    (candidate) => candidate.eventId === review?.binding.evidenceEventId,
  );
  expect(event?.outcome).toBe(expectedOutcome);
  const output = event?.payload.reviewOutput as DurableReviewOutputProjectionV1;
  expect(output.reviewOutcomeId).toBe(review?.reviewOutcomeId);
  expect(output.learningGapSignal.signalId).toBe(review?.learningGapSignalId);
  expect(output.conceptStateSignal.signalId).toBe(review?.conceptStateSignalId);
  expect(output.failureNoteId).toBe(review?.failureNoteId);
  expect(output.containsFailureNoteBody).toBe(false);
  for (const signal of [output.learningGapSignal, output.conceptStateSignal]) {
    expect(signal.binding).toEqual(review?.binding);
    expect(signal.evidenceContributionOnly).toBe(true);
    expect(signal.createsVerified).toBe(false);
    expect(signal.createsMastery).toBe(false);
    expect(signal.createsCurrentlyClear).toBe(false);
    expect(signal.createsReadiness).toBe(false);
    expect(signal.changesScore).toBe(false);
    expect(signal.containsBody).toBe(false);
    expect(signal.reconstructive).toBe(false);
    expect(signal.failureNoteBodyIncluded).toBe(false);
  }
  expect(output.conceptStateSignal.canonicalConceptStateChanged).toBe(false);
  expect(JSON.stringify(output)).not.toMatch(/private-|비공개|후속 독립 실패|"(?:rawBody|answerBody|ocrBody|noteBody)"/i);
  if (expectedOutcome === "SUCCESS") {
    expect(view.latestFailureNote).toBeNull();
    expect(review?.failureNoteId).toBeNull();
  } else {
    expect(view.latestFailureNote?.noteId).toBe(review?.failureNoteId);
    expect(view.latestFailureNote?.binding).toEqual(review?.binding);
    expect(view.latestFailureNote?.sourceMaterialInEntry).toBe(false);
    expect(view.latestFailureNote?.containsAttemptBody).toBe(false);
  }
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

function c3LearnerResponse(subject: Subject, stage: DurableLearningFixtureStage, wrong = false) {
  if (subject === "appraisal_practical") {
    const results = { D1: 100000000, D7: 115000000, TIMED: 75000000, RECURRENCE: 155000000 } as const;
    return {
      kind: "PRACTICE_CALCULATION",
      operator: "SUBTRACT",
      result: results[stage] + (wrong ? 1 : 0),
      unit: "KRW_PER_YEAR",
      sign: "POSITIVE",
      rounding: "NONE",
    };
  }
  if (subject === "appraisal_theory") {
    const predicates = {
      D1: "converts_expected_income_to_value",
      D7: "capitalizes_stabilized_income_into_value",
      TIMED: "reconciles_income_stream_and_yield_into_value",
      RECURRENCE: "distinguishes_income_risk_before_value_conversion",
    } as const;
    return {
      kind: "THEORY_PREDICATE",
      predicateId: predicates[stage],
      forbiddenPredicateAsserted: false,
      polarity: wrong ? "NEGATIVE" : "POSITIVE",
    };
  }
  return {
    kind: "LAW_EXACT_APPLICABILITY",
    currentness: wrong ? "STALE" : "APPLICABLE_CURRENT",
    blockerCount: 0,
  };
}

async function fillLearnerResponse(
  page: Page,
  subject: Subject,
  stage: DurableLearningFixtureStage,
  omitClosedZero = false,
) {
  const response = c3LearnerResponse(subject, stage);
  const contextKind = subject === "appraisal_practical" ? "practice" : subject === "appraisal_theory" ? "theory" : "law";
  await expect(page.locator(`[data-wcv-c3-input-context="${contextKind}"]`)).toBeVisible();
  if (response.kind === "PRACTICE_CALCULATION") {
    await page.getByLabel("계산 결과").fill(String(response.result));
    await page.getByLabel("연산자").selectOption(response.operator);
    await page.getByLabel("단위").selectOption(response.unit);
    await page.getByLabel("부호").selectOption(response.sign);
    await page.getByLabel("반올림").selectOption(response.rounding);
  } else if (response.kind === "THEORY_PREDICATE") {
    const relationshipLabels = {
      D1: "예상소득을 가치로 전환한다",
      D7: "안정화 소득을 환원해 가치를 구한다",
      TIMED: "소득흐름과 수익률을 함께 가치로 조정한다",
      RECURRENCE: "가치 전환 전에 소득 위험을 구분한다",
    } as const;
    await page.getByLabel("핵심 관계").selectOption({ label: relationshipLabels[stage] });
    await page.getByLabel("선택한 관계의 극성").selectOption(response.polarity);
    if (!omitClosedZero) {
      await page.getByLabel("금지 술어 주장 여부").selectOption(String(response.forbiddenPredicateAsserted));
    }
  } else {
    if (!omitClosedZero) await page.getByLabel("열린 차단 근거 수").fill(String(response.blockerCount));
    await page.getByLabel("현재성").selectOption(response.currentness);
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
  const responseFor = (action: string) => page.waitForResponse((response) => {
    if (response.request().method() !== "POST") return false;
    if (new URL(response.url()).pathname !== "/api/review-os/durable-learning") return false;
    try {
      return response.request().postDataJSON()?.action === action;
    } catch {
      return false;
    }
  });
  const requireSuccessfulResponse = async (action: string, responsePromise: ReturnType<typeof responseFor>) => {
    const response = await responsePromise;
    const payload = await response.json();
    expect(response.status(), `${action}:${payload?.error ?? "unknown"}`).toBe(200);
    expect(payload?.ok, `${action}:${payload?.error ?? "unknown"}`).toBe(true);
    return payload;
  };
  const activate = async (action: string, label: string | RegExp) => {
    const button = page.locator("[data-primary-action]");
    await expect(button).toHaveText(label);
    const responsePromise = responseFor(action);
    if (keyboardOnly) { await button.focus(); await page.keyboard.press("Enter"); } else await button.click();
    return requireSuccessfulResponse(action, responsePromise);
  };
  await activate("start", "검증된 C2 복구에서 시작");
  for (const { stage, state } of [
    { stage: "D1", state: "D1_REPRODUCED" },
    { stage: "D7", state: "D7_TRANSFER_OBSERVED" },
    { stage: "TIMED", state: "TIMED_RECURRENCE_CONFIRMED" },
  ] as const) {
    await activate("prepare_attempt", /독립 시도 시작/);
    const answer = page.getByLabel("보지 않고 작성한 독립 답안");
    await expect(answer).toBeVisible();
    const answerBody = `비공개 ${subject} 독립 답안`;
    await answer.fill(answerBody);
    const omitClosedZero = stage === "D1" && subject !== "appraisal_practical";
    await fillLearnerResponse(page, subject, stage, omitClosedZero);
    if (omitClosedZero) {
      await expect(page.locator("[data-primary-action]")).toBeDisabled();
      if (subject === "appraisal_theory") {
        await page.getByLabel("금지 술어 주장 여부").selectOption("false");
      } else {
        await page.getByLabel("열린 차단 근거 수").fill("0");
      }
    }
    if (stage === "D1" && subject === "appraisal_practical") {
      await page.getByText("Today / Full-Day 계획과 내 기록").click();
      const planResponse = responseFor("build_plan");
      await page.getByRole("button", { name: "근거 우선 계획 만들기" }).click();
      await requireSuccessfulResponse("build_plan", planResponse);
      await expect(answer).toHaveValue(answerBody);
      await expect(page.getByLabel("계산 결과")).toHaveValue("100000000");
      await expect(page.getByLabel("연산자")).toHaveValue("SUBTRACT");
      await expect(page.getByLabel("단위")).toHaveValue("KRW_PER_YEAR");
      await expect(page.getByLabel("부호")).toHaveValue("POSITIVE");
      await expect(page.getByLabel("반올림")).toHaveValue("NONE");
    }
    const submitted = await activate("record_evidence", "독립 시도 제출 및 검증");
    assertRuntimeReviewOutputs(submitted.view as DurableLearningView, "SUCCESS");
    await expect(page.getByText(state === "D1_REPRODUCED" ? /D\+1 독립 재현/ : state === "D7_TRANSFER_OBSERVED" ? /D\+7 전이 확인/ : /시간제한 재발 검사 확인/)).toBeVisible();
  }
  await activate("evaluate_currently_clear", /현재 안정 확인/);
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
  practice = await c3Command(owner, "decide_plan", practice, {
    decision: "EDITED",
    reason: "available_minutes_changed",
    availableMinutes: 90,
    recoveryMode: "MINIMUM_MAINTENANCE",
    fixedCommitments: [{ commitmentId: randomUUID(), label: "MANUAL_COMMITMENT", minutes: 15 }],
  });
  expect(practice.latestPlan.availableMinutes).toBe(90);
  expect(practice.latestPlan.fixedCommitments[0].minutes).toBe(15);
  expect(practice.latestPlan.decision).toBe("EDITED");
  expect(practice.case.state).toBe("CURRENTLY_CLEAR");
  practice = await c3Command(owner, "prepare_attempt", practice);
  const failureCommandId = randomUUID();
  const failureRequest = {
    action: "record_evidence",
    caseId: practice.case.caseId,
    expectedVersion: practice.case.recordVersion,
    commandId: failureCommandId,
    body: "후속 독립 실패",
    learnerResponse: c3LearnerResponse("appraisal_practical", "RECURRENCE", true),
  };
  const firstFailureResponse = await owner.request.post("/api/review-os/durable-learning", {
    data: failureRequest,
  });
  expect(firstFailureResponse.status()).toBe(200);
  practice = (await firstFailureResponse.json()).view as DurableLearningView;
  const replayedFailureResponse = await owner.request.post("/api/review-os/durable-learning", {
    data: failureRequest,
  });
  expect(replayedFailureResponse.status()).toBe(200);
  const replayedFailure = (await replayedFailureResponse.json()).view as DurableLearningView;
  expect(replayedFailure.case.recordVersion).toBe(practice.case.recordVersion);
  expect(replayedFailure.ledger.artifacts).toHaveLength(practice.ledger.artifacts.length);
  expect(replayedFailure.ledger.events).toHaveLength(practice.ledger.events.length);
  expect(replayedFailure.latestReviewOutcome).toEqual(practice.latestReviewOutcome);
  expect(replayedFailure.latestFailureNote).toEqual(practice.latestFailureNote);
  expect(practice.case.state).toBe("REOPENED");
  assertRuntimeReviewOutputs(practice, "FAILURE");
  const preservedReview = structuredClone(practice.latestReviewOutcome);
  const preservedFailureNote = structuredClone(practice.latestFailureNote);
  for (const decision of ["ACCEPTED", "EDITED", "REJECTED"] as const) {
    practice = await c3Command(owner, "build_plan", practice, {
      availableMinutes: 90,
      recoveryMode: "NORMAL",
      fixedCommitments: [],
    });
    expect(practice.latestReviewOutcome).toEqual(preservedReview);
    expect(practice.latestFailureNote).toEqual(preservedFailureNote);
    practice = await c3Command(owner, "decide_plan", practice, {
      decision,
      reason:
        decision === "ACCEPTED"
          ? "accepted_as_proposed"
          : decision === "EDITED"
            ? "available_minutes_changed"
            : "deferred_by_learner",
      ...(decision === "EDITED"
        ? {
            availableMinutes: 60,
            recoveryMode: "MINIMUM_MAINTENANCE",
            fixedCommitments: [],
          }
        : {}),
    });
    expect(practice.latestReviewOutcome).toEqual(preservedReview);
    expect(practice.latestFailureNote).toEqual(preservedFailureNote);
  }
  const feedbackPage = await owner.newPage();
  await feedbackPage.goto(`/app/durable-learning?caseId=${practice.case.caseId}`);
  const resultNote = feedbackPage.locator("[data-wcv-c3-result-note]");
  await expect(resultNote).toBeVisible();
  await expect(resultNote).toContainText("가장 큰 간극 1개");
  await expect(resultNote).toContainText("왜 틀렸는가");
  await expect(resultNote).toContainText("실패한 기준");
  await expect(resultNote).toContainText("다음 행동 1개");
  await expect(resultNote).toContainText("다음 검토");
  await feedbackPage.close();

  const secondOwner = await contextFor(browser);
  const secondBrowserResponse = await secondOwner.request.get(
    `/api/review-os/durable-learning?caseId=${practice.case.caseId}`,
  );
  expect(secondBrowserResponse.status()).toBe(200);
  const secondBrowserView = (await secondBrowserResponse.json()).view as DurableLearningView;
  expect(secondBrowserView.latestReviewOutcome).toEqual(preservedReview);
  expect(secondBrowserView.latestFailureNote).toEqual(preservedFailureNote);
  await secondOwner.close();

  const foreign = await contextFor(browser, { width: 390, height: 844 }, emailB, passwordB);
  const denied = await foreign.request.get(`/api/review-os/durable-learning?caseId=${caseIds[1]}`);
  expect(denied.status()).toBe(404);
  await foreign.close();

  const practiceExportResponse = await owner.request.post("/api/review-os/durable-learning", {
    data: {
      action: "export",
      caseId: practice.case.caseId,
      expectedVersion: practice.case.recordVersion,
    },
  });
  expect(practiceExportResponse.status()).toBe(200);
  const practiceExport = (await practiceExportResponse.json()).exportBundle;
  expect(practiceExport.caseRecord.stateData.latestReviewOutcome).toEqual(preservedReview);
  expect(practiceExport.caseRecord.stateData.failureNotes).toContainEqual(preservedFailureNote);
  expect(
    practiceExport.evidenceEvents.find(
      (event: { id?: string; eventId?: string }) =>
        (event.id ?? event.eventId) === preservedReview?.binding.evidenceEventId,
    )?.payload.reviewOutput.containsFailureNoteBody,
  ).toBe(false);

  const exportResponse = await owner.request.post("/api/review-os/durable-learning", { data: { action: "export", caseId: caseIds[2], expectedVersion: 8 } });
  expect(exportResponse.status()).toBe(200);
  expect((await exportResponse.json()).exportBundle.privateArtifacts).toHaveLength(3);
  const lawBody = await (await owner.request.get(`/api/review-os/durable-learning?caseId=${caseIds[2]}`)).json();
  let law = lawBody.view as DurableLearningView;
  law = await c3Command(owner, "prepare_attempt", law);
  law = await c3Command(owner, "record_evidence", law, {
    body: "비공개 삭제 경계 법규 실패",
    learnerResponse: c3LearnerResponse("appraisal_law", "RECURRENCE", true),
  });
  assertRuntimeReviewOutputs(law, "FAILURE");
  const deleted = await owner.request.post("/api/review-os/durable-learning", { data: { action: "delete", caseId: caseIds[2], expectedVersion: law.case.recordVersion, commandId: randomUUID() } });
  expect(deleted.status()).toBe(200);
  expect((await owner.request.get(`/api/review-os/durable-learning?caseId=${caseIds[2]}`)).status()).toBe(404);

  if (transientEvidencePath) writeFileSync(transientEvidencePath, `${JSON.stringify({ recoveryCaseId: practice.case.caseId, counts: { completedSubjects: 3, deletedCases: 1, reopenedCases: 1 } })}\n`, { mode: 0o600 });
  await owner.close();
});

test("WCV-C3 process restart restores exact private case", async ({ browser }) => {
  requireRuntime();
  test.skip(!recoveryCaseId || realTimeC3Only, "restart restoration runs only after the synthetic server restart");
  const owner = await contextFor(browser);
  const response = await owner.request.get(`/api/review-os/durable-learning?caseId=${recoveryCaseId}`);
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.view.case.state).toBe("REOPENED");
  expect(body.view.ledger.artifacts).toHaveLength(4);
  expect(body.view.latestReviewOutcome?.failureNoteId).toBe(body.view.latestFailureNote?.noteId);
  expect(body.view.latestReviewOutcome?.nextAction.action).toBe("PREPARE_INDEPENDENT_RETRY");
  assertRuntimeReviewOutputs(body.view as DurableLearningView, "FAILURE");
  expect((body.view as DurableLearningView).ledger.events.every((event) => event.payload.containsBody === false)).toBe(true);
  await owner.close();
});

test("WCV-C3 real-time waiting and C3-only navigation honor independent gates", async ({ browser }) => {
  requireRuntime();
  test.skip(!recoveryCaseId || !realTimeC3Only, "real-time C3-only verification uses its dedicated restart");
  const owner = await contextFor(browser);
  const response = await owner.request.get(`/api/review-os/durable-learning?caseId=${recoveryCaseId}`);
  expect(response.status()).toBe(200);
  const body = await response.json();
  let view = body.view as DurableLearningView;
  expect(view.case.nextAction).toBe("WAIT_FOR_ELIGIBILITY");
  const boundaryDelayMs = Date.parse(view.case.nextEligibleAt ?? "") - Date.now();
  expect(boundaryDelayMs).toBeGreaterThan(0);
  expect(boundaryDelayMs).toBeLessThanOrEqual(20_000);
  const preservedBoundaryReview = structuredClone(view.latestReviewOutcome);
  const preservedBoundaryFailureNote = structuredClone(view.latestFailureNote);
  view = await c3Command(owner, "build_plan", view, {
    availableMinutes: 60,
    recoveryMode: "NORMAL",
    fixedCommitments: [],
  });
  expect(view.latestPlan?.coreOutcomes.map((outcome) => outcome.kind)).toEqual(["EVIDENCE_AUDIT"]);
  expect(view.latestPlan?.deferredReasonCodes).toContain("next_eligible_at_not_reached");
  expect(view.latestPlan?.immediatePrimaryOutcomeId).toBe(view.latestPlan?.coreOutcomes[0]?.outcomeId);
  const page = await owner.newPage();
  await page.goto(`/app/durable-learning?caseId=${recoveryCaseId}`);
  const primary = page.locator("[data-primary-action]");
  const resultNote = page.locator("[data-wcv-c3-result-note]");
  await expect(primary).toHaveText("다음 가능 시점까지 대기");
  await expect(primary).toBeDisabled();
  await expect(resultNote).toContainText("실패한 기준");
  const automaticBoundaryRefresh = page.waitForResponse(
    (candidate) =>
      candidate.request().method() === "GET" &&
      candidate.url().includes(`/api/review-os/durable-learning?caseId=${recoveryCaseId}`),
    { timeout: 30_000 },
  );
  await expect(primary).toHaveText(/독립 시도 시작/, { timeout: 30_000 });
  await expect(primary).toBeEnabled();
  const refreshedResponse = await automaticBoundaryRefresh;
  expect(refreshedResponse.status()).toBe(200);
  const refreshedBody = await refreshedResponse.json();
  expect(refreshedBody.view.case.nextAction).toBe("PREPARE_INDEPENDENT_ATTEMPT");
  expect(refreshedBody.view.latestReviewOutcome).toEqual(preservedBoundaryReview);
  expect(refreshedBody.view.latestFailureNote).toEqual(preservedBoundaryFailureNote);
  await expect(resultNote).toContainText("실패한 기준");
  await expect(resultNote).toContainText("다음 행동 1개");
  await expect(page.locator('a[href="/app/trusted-repair"]')).toHaveCount(0);
  await owner.close();
});
