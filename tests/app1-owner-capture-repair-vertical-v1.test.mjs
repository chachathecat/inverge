import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  APP1_CONTRACT_VERSION,
  APP1_LIMITS,
  APP1_RUNTIME_BOUNDARY_RECEIPT,
  APP1_VERIFICATION_STATES,
  app1GuidedRepairHref,
  buildApp1NextReviewReceipt,
  buildApp1PrimaryGap,
  buildApp1RepairPersistenceInput,
  buildApp1StructureSummary,
  evaluateApp1SameSessionRepair,
  isApp1SubjectAuthorized,
} from "../lib/owner-study/app1-capture-repair-view-model.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const EXPECTED_PATHS = [
  "app/app/capture/page.tsx",
  "app/app/capture/repair/page.tsx",
  "components/owner-study/app1-capture-repair-loop.tsx",
  "components/review-os/capture-form.tsx",
  "config/dabangil-app1-owner-capture-repair-vertical-v1.json",
  "docs/product/dabangil-app1-owner-capture-repair-vertical-v1.md",
  "docs/qa/dabangil-app1-owner-capture-repair-validation.md",
  "lib/owner-study/app1-capture-repair-view-model.ts",
  "tests/answer-submission-ocr-save-contract.test.mjs",
  "tests/app1-owner-capture-repair-vertical-v1.test.mjs",
  "tests/e2e/app1-owner-capture-repair-vertical-v1.spec.ts",
  "tests/s225x-founder-grade-visual-taste-reset.test.mjs",
  "tests/ux-surface-reset-v1-answer-road.test.mjs",
];

const SHARED_ACCESS_INVENTORY_PATH = "tests/s232f2-access-availability.test.mjs";

function syntheticDetail(overrides = {}) {
  const base = {
    item: {
      id: "11111111-1111-4111-8111-111111111111",
      userId: "22222222-2222-4222-8222-222222222222",
      dedupeKey: "synthetic-app1-item",
      processingStatus: "completed",
      examName: "감정평가사 2차",
      subjectLabel: "감정평가이론",
      sourceType: "photo",
      sourceLabel: "synthetic-page-1",
      problemTitle: "저작권 안전 합성 문제",
      problemIdentifier: "SYNTHETIC-APP1-001",
      rawQuestionText: "합성 사례의 정의와 논거, 적용 관계를 설명하시오.",
      rawAnswerText: "정의를 제시하고 논거를 설명했다. 다만 사례 사실과 논거의 연결을 충분히 적지 못했다.",
      rewriteParagraph: "",
      correctAnswer: "-",
      userAnswer: "정의를 제시하고 논거를 설명했다. 다만 사례 사실과 논거의 연결을 충분히 적지 못했다.",
      userReasonText: "사례 적용 연결 부족",
      confidence: "중간",
      timeSpentSeconds: 720,
      nextReviewDate: "2026-08-30",
      keyConcepts: ["정의", "논거", "사례 적용"],
      coreFormula: "정의 → 논거 → 적용",
      comparisonPoint: "사례 적용을 직접 연결한다.",
      missingIssue: "사례 사실과 논거의 연결이 약합니다.",
      weakStructurePoint: "적용 문장이 부족합니다.",
      weakApplicationSentence: "사례 사실을 논거에 연결합니다.",
      rewriteInstruction: "사례 사실과 논거를 한 문장으로 직접 연결하세요.",
      referenceStructure: "정의 → 논거 → 사례 적용 → 결론",
      myAnswerSummary: "정의와 논거를 적었으나 적용이 부족함",
      caseSummary: "저작권 안전 합성 사례",
      issueRecall: "정의, 논거, 적용",
      outlineDraft: "I. 정의 II. 논거 III. 적용",
      productionBeforeComparison: true,
      referenceAnswerAddedAfterProduction: false,
      biggestGap: "사례 사실과 논거의 연결이 약합니다.",
      rewriteCompleted: false,
      captureIntent: "save",
      createdFromCapture: true,
      rawPayload: {
        user_confirmed_fields: {
          ocrConfirmedByLearner: true,
          pageCount: 2,
          lowConfidenceFlag: false,
          exact_anchor: "확인된 2페이지 · 적용 문단",
        },
      },
      derivedPayload: {},
      createdAt: "2026-08-29T00:00:00.000Z",
      updatedAt: "2026-08-29T00:01:00.000Z",
    },
    note: null,
    tags: [],
    recurrence: null,
    reviewQueue: [],
  };
  return {
    ...base,
    ...overrides,
    item: { ...base.item, ...(overrides.item ?? {}) },
  };
}

function draft({ gap = "사례 사실과 논거의 연결이 약합니다.", strength = "정의와 핵심 논거가 확인됩니다." } = {}) {
  return {
    questionSummary: "합성 문제의 구조를 검토합니다.",
    coreConcepts: ["정의", "논거", "적용"],
    requiredIssues: "정의, 논거, 사례 적용",
    userAnswerSummary: "정의와 논거가 있고 적용 연결이 약합니다.",
    userAnswerStructure: "정의 → 논거",
    referenceStructure: "정의 → 논거 → 적용 → 결론",
    strengths: strength ? [strength] : [],
    missingIssueCandidates: [gap],
    weakParagraphPoint: "사례 사실을 논거에 연결하는 한 문장을 직접 적으세요.",
    weakLogicPoint: "논거에서 사례로 이어지는 연결이 필요합니다.",
    rewriteTarget: "적용 연결 문장",
    rewriteDraftSuggestion: "학습자가 직접 작성해야 합니다.",
    nextAction: "사례 사실과 논거를 한 문장으로 직접 연결하세요.",
    caution: "학습 보조 초안입니다.",
    plainExplanation: "한 연결만 직접 보강합니다.",
    keyTermExplanations: ["적용: 사실을 기준에 연결하는 단계"],
    stepByStepExplanation: ["논거 확인", "사례 사실 확인", "직접 연결"],
    examAnswerHints: ["적용 연결을 확인합니다."],
  };
}

test("APP1-CONTRACT-001 freezes the exact 13-path Owner-only/default-off candidate", async () => {
  const config = JSON.parse(await read("config/dabangil-app1-owner-capture-repair-vertical-v1.json"));
  assert.equal(config.contractVersion, APP1_CONTRACT_VERSION);
  assert.equal(config.base.sha, "761b7f6b7648d19845ab3385665e92046165dddd");
  assert.equal(config.base.tree, "c6c6a8ad876c2f40b5276a26485b088656addf49");
  assert.deepEqual(config.changedPaths, EXPECTED_PATHS);
  assert.equal(config.changedPaths.length, 13);
  assert.equal(config.access.ownerOnly, true);
  assert.equal(config.access.defaultOff, true);
  assert.equal(config.access.gate, "trusted-repair-access");
  assert.equal(config.activation.public, false);
  assert.equal(config.activation.remoteSupabaseMutation, false);
  assert.equal(config.activation.productionMutation, false);
  assert.deepEqual(APP1_RUNTIME_BOUNDARY_RECEIPT, {
    contractVersion: APP1_CONTRACT_VERSION,
    ownerOnly: true,
    defaultOff: true,
    publicNavigation: false,
    existingCaptureOcrApiOnly: true,
    existingAnswerReviewApiOnly: true,
    existingLearnerPersistenceApiOnly: true,
    newApi: false,
    newDatabaseOrMigration: false,
    newProviderRouting: false,
    paymentActivation: false,
    productionActivation: false,
    sameSessionMasteryAuthority: false,
    transferAuthority: false,
  });
});

test("APP1-VM-001 builds a bounded OCR-confirmed structure summary", () => {
  const summary = buildApp1StructureSummary(syntheticDetail());
  assert.equal(summary.subject, "감정평가이론");
  assert.equal(summary.ocrConfirmed, true);
  assert.equal(summary.pageOrSectionCount, 2);
  assert.deepEqual(summary.detectedSections, ["문제", "학습자 답안", "계산·작업 메모", "구조 메모"]);
  assert.equal(summary.uncertainty, null);
  assert.ok(Object.isFrozen(summary));

  const blocked = buildApp1StructureSummary(
    syntheticDetail({ item: { rawPayload: { user_confirmed_fields: { pageCount: 1 } } } }),
  );
  assert.equal(blocked.ocrConfirmed, false);
  assert.match(blocked.uncertainty, /OCR 확인 영수증/);
});

test("APP1-ACCESS-001 preserves the exact partial subject authorization", () => {
  const practiceOnly = ["appraisal_practical"];
  assert.equal(isApp1SubjectAuthorized("감정평가실무", practiceOnly), true);
  assert.equal(isApp1SubjectAuthorized("감정평가이론", practiceOnly), false);
  assert.equal(
    isApp1SubjectAuthorized("감정평가 및 보상법규", practiceOnly),
    false,
  );
  assert.equal(isApp1SubjectAuthorized("민법", practiceOnly), false);
});

test("APP1-VM-002 emits exactly one anchored gap and one direct action", () => {
  const gap = buildApp1PrimaryGap(syntheticDetail(), draft());
  assert.equal(gap.gap, "사례 사실과 논거의 연결이 약합니다.");
  assert.equal(gap.anchor, "확인된 2페이지 · 적용 문단");
  assert.equal(gap.anchorKind, "exact");
  assert.equal(gap.expectedMinutes, 8);
  assert.ok(gap.alreadySuccessful);
  assert.ok(gap.repairAction);
  assert.equal(Object.keys(gap).filter((key) => key === "gap").length, 1);
});

test("APP1-VM-003 requires learner-entered repair and reports honest same-session states", () => {
  const detail = syntheticDetail();
  const requestedGap = buildApp1PrimaryGap(detail, draft());
  const tooShort = evaluateApp1SameSessionRepair({ detail, requestedGap, repairText: "짧은 입력", repairDraft: null });
  assert.equal(tooShort.state, "one_connection_still_missing");

  const confirmed = evaluateApp1SameSessionRepair({
    detail,
    requestedGap,
    repairText: "사례의 합성 사실 A는 위 논거의 요건 B를 충족하므로 결론 C에 이른다고 직접 연결했다.",
    repairDraft: draft({ gap: "결론 문장의 범위를 한정할 필요가 있습니다." }),
  });
  assert.equal(confirmed.state, "repair_confirmed_for_this_session");
  assert.equal(confirmed.sameSessionOnly, true);
  assert.equal(confirmed.masteryCreated, false);
  assert.equal(confirmed.transferCreated, false);

  const unchanged = evaluateApp1SameSessionRepair({
    detail,
    requestedGap,
    repairText: "사례의 합성 사실 A를 논거의 기준 B와 연결하려 했으나 여전히 연결이 충분하지 않은 입력이다.",
    repairDraft: draft(),
  });
  assert.equal(unchanged.state, "one_connection_still_missing");

  const shiftedPrimary = draft({
    gap: "결론 문장의 범위를 한정할 필요가 있습니다.",
  });
  shiftedPrimary.missingIssueCandidates.push(requestedGap.gap);
  const originalGapStillPresent = evaluateApp1SameSessionRepair({
    detail,
    requestedGap,
    repairText: "사례의 합성 사실 A는 위 논거의 요건 B를 충족하므로 결론 C에 이른다고 직접 연결했다.",
    repairDraft: shiftedPrimary,
  });
  assert.equal(
    originalGapStillPresent.state,
    "one_connection_still_missing",
    "moving the requested gap behind a new primary gap cannot confirm repair",
  );
  const shiftedPayload = buildApp1RepairPersistenceInput({
    detail,
    gap: requestedGap,
    repairText: "사례의 합성 사실 A는 위 논거의 요건 B를 충족하므로 결론 C에 이른다고 직접 연결했다.",
    verification: originalGapStillPresent,
    operation: {
      operationId: "88888888-8888-4888-8888-888888888888",
      workRevisionId: "99999999-9999-4999-8999-999999999999",
    },
  });
  assert.equal(shiftedPayload.rewriteCompleted, false);
  assert.equal(evaluateApp1SameSessionRepair({ detail, requestedGap, repairText: "직접 작성한 보류 입력입니다. 충분한 길이를 갖습니다.", repairDraft: null, deferred: true }).state, "deferred");
  assert.deepEqual(APP1_VERIFICATION_STATES, [
    "repair_confirmed_for_this_session",
    "one_connection_still_missing",
    "guided_path_needed",
    "deferred",
    "blocked_by_ocr_or_source_uncertainty",
  ]);
});

test("APP1-VM-003A exposes guided_path_needed without fabricating confirmation, mastery or transfer", () => {
  const detail = syntheticDetail();
  const requestedGap = buildApp1PrimaryGap(detail, draft());
  const guided = evaluateApp1SameSessionRepair({
    detail,
    requestedGap,
    repairText: "사례 사실과 논거를 연결하려고 직접 작성했지만 검토 초안을 아직 확인하지 못한 충분히 긴 합성 입력입니다.",
    repairDraft: null,
  });

  assert.equal(guided.state, "guided_path_needed");
  assert.equal(guided.sameSessionOnly, true);
  assert.equal(guided.masteryCreated, false);
  assert.equal(guided.transferCreated, false);
  assert.equal(app1GuidedRepairHref(requestedGap.subject), "/app/c3r-t");
  assert.equal("durableReceipt" in guided, false);
  assert.equal("queueReceipt" in guided, false);
  assert.equal("d7Transfer" in guided, false);
});

test("APP1-VM-003B blocks uncertain OCR/source evidence before successful repair persistence", async () => {
  const detail = syntheticDetail({
    item: {
      rawPayload: {
        user_confirmed_fields: {
          pageCount: 1,
          lowConfidenceFlag: true,
        },
      },
    },
  });
  const requestedGap = buildApp1PrimaryGap(detail, draft());
  const blocked = evaluateApp1SameSessionRepair({
    detail,
    requestedGap,
    repairText: "확인되지 않은 OCR 원문을 근거로 성공 처리해서는 안 되는 충분히 긴 합성 복구 입력입니다.",
    repairDraft: draft({ gap: "결론 문장의 범위를 한정할 필요가 있습니다." }),
  });

  assert.equal(blocked.state, "blocked_by_ocr_or_source_uncertainty");
  assert.equal(blocked.masteryCreated, false);
  assert.equal(blocked.transferCreated, false);
  assert.equal("durableReceipt" in blocked, false);
  assert.equal("queueReceipt" in blocked, false);

  const repairLoop = await read("components/owner-study/app1-capture-repair-loop.tsx");
  assert.ok(repairLoop.includes('verification.state === "blocked_by_ocr_or_source_uncertainty"'));
  assert.ok(repairLoop.includes("완료되지 않은 복구는 성공 기록으로 저장하지 않습니다."));
  assert.ok(repairLoop.includes("원문 다시 확인하기"));
  assert.ok(repairLoop.includes("/app/capture?mode=second&rewriteFrom="));
});

test("APP1-VM-004 persists through the existing learner-private receipt binding only", () => {
  const detail = syntheticDetail();
  const requestedGap = buildApp1PrimaryGap(detail, draft());
  const verification = evaluateApp1SameSessionRepair({
    detail,
    requestedGap,
    repairText: "사례의 합성 사실 A는 위 논거의 요건 B를 충족하므로 결론 C에 이른다고 직접 연결했다.",
    repairDraft: draft({ gap: "결론 문장의 범위를 한정할 필요가 있습니다." }),
  });
  const payload = buildApp1RepairPersistenceInput({
    detail,
    gap: requestedGap,
    repairText: "사례의 합성 사실 A는 위 논거의 요건 B를 충족하므로 결론 C에 이른다고 직접 연결했다.",
    verification,
    operation: {
      operationId: "33333333-3333-4333-8333-333333333333",
      workRevisionId: "44444444-4444-4444-8444-444444444444",
    },
  });
  assert.equal(payload.examName, "감정평가사 2차");
  assert.equal(payload.rewriteSourceItemId, detail.item.id);
  assert.equal(payload.extractionPayload.user_confirmed_fields.app1_same_session_only, true);
  assert.equal(payload.extractionPayload.user_confirmed_fields.app1_mastery_created, false);
  assert.equal(payload.extractionPayload.user_confirmed_fields.app1_transfer_created, false);
  assert.equal(payload.extractionPayload.user_confirmed_fields.persistence_operation_id, "33333333-3333-4333-8333-333333333333");
  assert.equal(payload.extractionPayload.user_confirmed_fields.persistence_work_revision_id, "44444444-4444-4444-8444-444444444444");
  assert.equal("releaseStatus" in payload, false);
  assert.equal("mastery" in payload, false);
  assert.equal("transfer" in payload, false);
});

test("APP1-VM-005 announces a next review only from an exact durable queue receipt", () => {
  const baseQueue = {
    queueId: "55555555-5555-4555-8555-555555555555",
    itemId: "66666666-6666-4666-8666-666666666666",
    examName: "감정평가사 2차",
    subjectLabel: "감정평가이론",
    problemTitle: "합성 문제 · 직접 복구",
    topicTag: "합성 태그",
    mistakeType: "연결 부족",
    reviewReason: "독립 복습",
    priorityScore: 1,
    dueAt: "2026-08-30T01:00:00.000Z",
    recurrenceCount: 0,
    confidence: "중간",
    timeSpentSeconds: 600,
    createdFromCapture: true,
    itemCreatedAt: "2026-08-29T01:00:00.000Z",
  };
  const receipt = buildApp1NextReviewReceipt(
    [baseQueue],
    baseQueue.itemId,
    "2026-08-29T01:00:00.000Z",
  );
  assert.equal(receipt.policyWindow, "D+1");
  assert.match(receipt.nextIndependentAction, /답을 보지 않고/);
  assert.equal(buildApp1NextReviewReceipt([baseQueue], "77777777-7777-4777-8777-777777777777", "2026-08-29T01:00:00.000Z"), null);
  assert.equal(buildApp1NextReviewReceipt([{ ...baseQueue, dueAt: "2026-08-28T01:00:00.000Z" }], baseQueue.itemId, "2026-08-29T01:00:00.000Z"), null);
});

test("APP1-UI-001 binds exact copy, one-gap UI, no prefilled repair and truthful failures", async () => {
  const capturePage = await read("app/app/capture/page.tsx");
  const captureForm = await read("components/review-os/capture-form.tsx");
  const repairPage = await read("app/app/capture/repair/page.tsx");
  const repairLoop = await read("components/owner-study/app1-capture-repair-loop.tsx");
  assert.ok(captureForm.includes("사진·PDF·텍스트로 시작"));
  assert.ok(captureForm.includes("OCR 결과는 초안입니다. 저장 전 직접 확인해 주세요."));
  assert.ok(captureForm.includes("const ownerCaptureRepairSubjectEnabled"));
  assert.ok(captureForm.includes("/app/capture/repair?itemId="));
  assert.ok(capturePage.includes("trustedRepairAuthorizedSubjects(session.email)"));
  assert.ok(capturePage.includes("ownerCaptureRepairSubjects={ownerCaptureRepairSubjects}"));
  assert.ok(captureForm.includes("isApp1SubjectAuthorized(form.subjectLabel, ownerCaptureRepairSubjects)"));
  assert.ok(repairPage.includes("requireTrustedRepairAccess()"));
  assert.ok(repairLoop.includes("이 내용으로 분석"));
  assert.equal((repairLoop.match(/<BiggestGap/g) ?? []).length, 1);
  assert.ok(repairLoop.includes('useState("")'));
  assert.ok(repairLoop.includes("AI가 완성 답안을 자동 입력하지 않습니다."));
  assert.ok(repairLoop.includes("중복 성공으로 처리하지 않았습니다."));
  assert.ok(repairLoop.includes("복습이 예약되었다고 표시하지 않습니다."));
  assert.ok(repairLoop.includes("새로고침하면 복원되지 않습니다."));
  assert.ok(repairLoop.includes("same-session") || repairLoop.includes("같은 세션"));
  assert.equal(repairLoop.includes("Date.now("), false);
});

test("APP1-UI-002 never renders answer-analysis payload errors and binds exact safe learner copy", async () => {
  const repairLoop = await read("components/owner-study/app1-capture-repair-loop.tsx");
  assert.equal(repairLoop.includes("payload.error"), false);
  assert.ok(repairLoop.includes("답안 분석을 완료하지 못했습니다. 입력은 그대로 남아 있습니다."));
  assert.ok(repairLoop.includes("복구 입력 검토를 완료하지 못했습니다. 성공으로 처리되지 않았습니다."));
  assert.equal(repairLoop.includes("synthetic_analysis_unavailable"), false);
});

test("APP1-UI-003 enters repair only after a durable receipt without racing the route refresh", async () => {
  const captureForm = await read("components/review-os/capture-form.tsx");
  const receiptIndex = captureForm.indexOf(
    "const persistenceEvidence = buildDurableCapturePersistenceReceipt(result.item, operation);",
  );
  const repairBranch = captureForm.match(
    /if \(ownerCaptureRepairSubjectEnabled\) \{[\s\S]*?return;\s*\}/u,
  )?.[0];

  assert.ok(receiptIndex >= 0, "missing durable capture receipt gate");
  assert.ok(repairBranch, "missing APP-1 repair-route branch");
  assert.ok(captureForm.indexOf("if (ownerCaptureRepairSubjectEnabled)", receiptIndex) > receiptIndex);
  assert.match(repairBranch, /router\.push\([\s\S]*?\/app\/capture\/repair\?itemId=/u);
  assert.doesNotMatch(repairBranch, /router\.refresh\(\)/u);
});
test("APP1-PERMISSION-001 separates input confirmation from quick save at the IntakePanel boundary", async () => {
  const captureForm = await read("components/review-os/capture-form.tsx");
  const config = JSON.parse(await read("config/dabangil-app1-owner-capture-repair-vertical-v1.json"));
  const sharedAccessInventory = await read(SHARED_ACCESS_INVENTORY_PATH);
  const intakeBoundary = captureForm.match(/<IntakePanel\b[\s\S]*?\/>/u)?.[0];
  const intakePanel = captureForm.match(/function IntakePanel\([\s\S]*?(?=\nfunction ExtractionPreview\()/u)?.[0];

  assert.ok(intakeBoundary, "missing WrongAnswerCaptureForm to IntakePanel boundary");
  assert.ok(intakePanel, "missing IntakePanel implementation");
  assert.match(captureForm, /const canQuickSaveCapture = hasLearnerCaptureContent\(form\);/u);
  assert.match(intakeBoundary, /\bcanConfirmInput=\{canQuickSaveCapture\}/u);
  assert.match(
    intakeBoundary,
    /\bcanQuickSave=\{\s*canQuickSaveCapture\s*&&\s*!ownerCaptureRepairSubjectEnabled\s*\}/u,
  );
  assert.match(intakePanel, /\bcanConfirmInput: boolean;/u);
  assert.match(
    intakePanel,
    /onClick=\{onQuickSave\}\s+disabled=\{!canQuickSave \|\| saving \|\| extracting\}/u,
  );
  assert.match(
    intakePanel,
    /onClick=\{onGenerate\}\s+disabled=\{!canConfirmInput \|\| saving \|\| extracting\}/u,
  );
  assert.doesNotMatch(intakePanel, /onClick=\{onGenerate\}\s+disabled=\{!canQuickSave\b/u);

  const permissions = (validInput, app1AuthorizedSubject) => ({
    canConfirmInput: validInput,
    canQuickSave: validInput && !app1AuthorizedSubject,
  });
  assert.deepEqual(permissions(true, true), { canConfirmInput: true, canQuickSave: false });
  assert.deepEqual(permissions(true, false), { canConfirmInput: true, canQuickSave: true });
  assert.deepEqual(permissions(false, true), { canConfirmInput: false, canQuickSave: false });
  assert.deepEqual(permissions(false, false), { canConfirmInput: false, canQuickSave: false });

  const generateStart = captureForm.indexOf("async function generateStructuredDraft");
  const quickSaveStart = captureForm.indexOf("async function saveQuickCaptureFromIntake");
  assert.ok(generateStart >= 0 && quickSaveStart > generateStart);
  assert.doesNotMatch(
    captureForm.slice(generateStart, quickSaveStart),
    /\/api\/os\/items/u,
    "input confirmation must not perform the durable item save",
  );
  assert.deepEqual(config.changedPaths, EXPECTED_PATHS);
  assert.equal(config.changedPaths.length, 13);
  assert.equal(config.changedPaths.includes(SHARED_ACCESS_INVENTORY_PATH), false);
  assert.equal(new Set([...config.changedPaths, SHARED_ACCESS_INVENTORY_PATH]).size, 14);
  assert.match(sharedAccessInventory, /app\/app\/capture\/repair\/page\.tsx/u);
});

test("APP1-BOUNDARY-001 stays within existing API and product authority", async () => {
  const runtimeSources = await Promise.all([
    read("app/app/capture/page.tsx"),
    read("app/app/capture/repair/page.tsx"),
    read("components/owner-study/app1-capture-repair-loop.tsx"),
    read("components/review-os/capture-form.tsx"),
    read("lib/owner-study/app1-capture-repair-view-model.ts"),
  ]);
  const runtime = runtimeSources.join("\n");
  const governedEndpoints = [...runtime.matchAll(/["'`]\/api\/[^"'`?${]+/gu)].map((match) => match[0].slice(1));
  const allowed = new Set([
    "/api/answer-review/structure",
    "/api/inverge/ocr",
    "/api/os/items",
    "/api/os/items/",
    "/api/os/review-queue",
  ]);
  for (const endpoint of governedEndpoints) {
    assert.ok([...allowed].some((prefix) => endpoint.startsWith(prefix)), `unexpected APP-1 endpoint: ${endpoint}`);
  }
  for (const forbidden of [
    "@supabase/",
    "stripe",
    "process.env",
    "localStorage.setItem",
    "sessionStorage.setItem",
    "fs.writeFile",
    "PERSONAL_LEARNING_USABLE",
    "TRANSFER_VERIFIED",
    "MEASUREMENT_CALIBRATED",
  ]) {
    assert.equal(runtime.includes(forbidden), false, `forbidden APP-1 runtime token: ${forbidden}`);
  }
  assert.equal(app1GuidedRepairHref("감정평가실무"), "/app/c3r-p");
  assert.equal(app1GuidedRepairHref("감정평가이론"), "/app/c3r-t");
  assert.equal(app1GuidedRepairHref("감정평가 및 보상법규"), "/app/c3r-l");
});

test("APP1-E2E-CONTRACT-001 freezes executable synthetic browser assertions without claiming a run", async () => {
  const e2e = await read("tests/e2e/app1-owner-capture-repair-vertical-v1.spec.ts");
  for (const marker of [
    "APP1_AUTH_RUNTIME",
    "synthetic",
    "390",
    "768",
    "1440",
    "200%",
    "keyboard",
    "AxeBuilder",
    "serious",
    "critical",
    "data-app1-primary-gap-count",
    "data-app1-persistence-receipt",
    "data-app1-queue-receipt",
    "completeCapture(page, viewport.inputKind",
    'inputKind: "text"',
    'inputKind: "photo"',
    'inputKind: "pdf"',
    "setInputFiles",
    'url.pathname === "/api/inverge/ocr"',
    "OCR 결과는 초안입니다. 저장 전 직접 확인해 주세요.",
    "page.reload()",
    "deduped: true",
    "synthetic_analysis_unavailable",
    "synthetic_verification_unavailable",
    "synthetic_repair_save_unavailable",
    "복구 입력 검토를 완료하지 못했습니다. 성공으로 처리되지 않았습니다.",
    "복구 기록 저장에 실패했습니다. 완료로 처리되지 않았습니다.",
    "중복 성공으로 처리하지 않았습니다",
  ]) {
    assert.ok(e2e.includes(marker), `missing E2E marker: ${marker}`);
  }
  const qa = await read("docs/qa/dabangil-app1-owner-capture-repair-validation.md");
  assert.ok(qa.includes("Merely adding or typechecking the specification is not browser evidence"));
  assert.equal(APP1_LIMITS.callerOverride, false);
});
