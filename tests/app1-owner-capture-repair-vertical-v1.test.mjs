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
  getApp1LearnerAnswer,
  isApp1SubjectAuthorized,
} from "../lib/owner-study/app1-capture-repair-view-model.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const EXPECTED_PATHS = [
  "app/app/capture/page.tsx",
  "app/app/capture/repair/page.tsx",
  "app/api/answer-review/structure/route.ts",
  "components/owner-study/app1-capture-repair-loop.tsx",
  "components/review-os/capture-form.tsx",
  "config/dabangil-app1-owner-capture-repair-vertical-v1.json",
  "docs/product/dabangil-app1-owner-capture-repair-vertical-v1.md",
  "docs/qa/dabangil-app1-owner-capture-repair-validation.md",
  "lib/owner-study/app1-capture-repair-view-model.ts",
  "lib/review-os/repository.ts",
  "tests/answer-submission-ocr-save-contract.test.mjs",
  "tests/app1-owner-capture-repair-vertical-v1.test.mjs",
  "tests/e2e/app1-owner-capture-repair-vertical-v1.spec.ts",
  "tests/s225x-founder-grade-visual-taste-reset.test.mjs",
  "tests/ux-surface-reset-v1-answer-road.test.mjs",
];

const SHARED_ACCESS_INVENTORY_PATH = "tests/s232f2-access-availability.test.mjs";
const INHERITED_C3R_P_IDENTITY_PATH =
  "tests/wcv-c3r-p-practice-common-durable-runtime.test.mjs";
const INHERITED_C3R_P_RUNTIME_SPEC_PATH =
  "tests/e2e/wcv-c3r-p-practice-common-runtime.spec.ts";

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

function draft({
  gap = "사례 사실과 논거의 연결이 약합니다.",
  strength = "정의와 핵심 논거가 확인됩니다.",
  strengths,
  missingIssueCandidates,
  weakParagraphPoint = "사례 사실을 논거에 연결하는 한 문장을 직접 적으세요.",
  weakLogicPoint = "논거에서 사례로 이어지는 연결이 필요합니다.",
} = {}) {
  return {
    questionSummary: "합성 문제의 구조를 검토합니다.",
    coreConcepts: ["정의", "논거", "적용"],
    requiredIssues: "정의, 논거, 사례 적용",
    userAnswerSummary: "정의와 논거가 있고 적용 연결이 약합니다.",
    userAnswerStructure: "정의 → 논거",
    referenceStructure: "정의 → 논거 → 적용 → 결론",
    strengths: strengths ?? (strength ? [strength] : []),
    missingIssueCandidates: missingIssueCandidates ?? [gap],
    weakParagraphPoint,
    weakLogicPoint,
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

function resolvedTargetDraft({
  strength =
    "임대료 미납 사실을 계약 해지 논거의 요건에 연결하여 계약 종료 결론을 도출했습니다.",
} = {}) {
  return draft({
    gap: "결론 문장의 범위를 한정할 필요가 있습니다.",
    strengths: [strength],
    missingIssueCandidates: ["결론 문장의 범위를 한정할 필요가 있습니다."],
    weakParagraphPoint: "결론 문장의 범위를 한정해 다시 적으세요.",
    weakLogicPoint: "결론 범위의 한정 근거를 확인해야 합니다.",
  });
}

test("APP1-CONTRACT-001 freezes the exact 15-path Owner-only/default-off core candidate", async () => {
  const config = JSON.parse(await read("config/dabangil-app1-owner-capture-repair-vertical-v1.json"));
  assert.equal(config.contractVersion, APP1_CONTRACT_VERSION);
  assert.equal(config.base.sha, "761b7f6b7648d19845ab3385665e92046165dddd");
  assert.equal(config.base.tree, "c6c6a8ad876c2f40b5276a26485b088656addf49");
  assert.deepEqual(config.changedPaths, EXPECTED_PATHS);
  assert.equal(config.changedPaths.length, 15);
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

  const longSourceAnswer = `확인된 장문 답안입니다.\n\n${"가".repeat(
    APP1_LIMITS.maximumRepairCharacters + 1,
  )}`;
  const longSourceDetail = syntheticDetail({
    item: {
      userAnswer: longSourceAnswer,
      rawAnswerText: "",
      rewriteParagraph: "",
    },
  });
  assert.equal(getApp1LearnerAnswer(longSourceDetail), longSourceAnswer);
  assert.equal(buildApp1StructureSummary(longSourceDetail).uncertainty, null);
});

test("APP1-VM-001A skips only closed persisted answer placeholders and preserves substantive body precedence", () => {
  const multilineTheory =
    "시효 완성 시점을 먼저 특정했다.\r\n\r\n그 시점의 판단 근거를 별도 문단으로 설명했다.";
  assert.equal(
    getApp1LearnerAnswer(
      syntheticDetail({
        item: {
          userAnswer: "-",
          rawAnswerText: "—",
          rewriteParagraph: multilineTheory,
        },
      }),
    ),
    multilineTheory.replace(/\r\n/gu, "\n"),
  );

  const practiceCalculation = "NOI = 100 - 20\r\nV = NOI / 0.05\r\n검산: 단위 확인";
  assert.equal(
    getApp1LearnerAnswer(
      syntheticDetail({
        item: {
          userAnswer: "–",
          rawAnswerText: "-",
          rewriteParagraph: practiceCalculation,
        },
      }),
    ),
    practiceCalculation.replace(/\r\n/gu, "\n"),
  );
  assert.equal(
    getApp1LearnerAnswer(
      syntheticDetail({
        item: {
          userAnswer: "짧음",
          rawAnswerText: "더 긴 원문",
          rewriteParagraph: "다시 쓴 문단",
        },
      }),
    ),
    "짧음",
  );
  assert.equal(
    getApp1LearnerAnswer(
      syntheticDetail({
        item: {
          userAnswer: "-",
          rawAnswerText: "—",
          rewriteParagraph: "",
        },
      }),
    ),
    "",
  );
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

  const unlocated = buildApp1PrimaryGap(
    syntheticDetail({
      item: {
        rawPayload: {
          user_confirmed_fields: {
            ocrConfirmedByLearner: true,
            pageCount: 2,
          },
        },
      },
    }),
    draft(),
  );
  assert.equal(
    unlocated.anchor,
    "확인된 2페이지 답안 전체 · 세부 위치 미확인",
  );
  assert.equal(unlocated.anchorKind, "unavailable");
  assert.doesNotMatch(unlocated.anchor, /문단 1/u);
});

test("APP1-VM-003 requires target-specific learner and draft evidence without model-wording authority", () => {
  const detail = syntheticDetail();
  const requestedGap = buildApp1PrimaryGap(detail, draft());
  const targetRepair =
    "사례의 합성 사실 A는 위 논거의 요건 B를 충족하므로 결론 C에 이른다고 직접 연결했다.";
  const tooShort = evaluateApp1SameSessionRepair({
    detail,
    requestedGap,
    repairText: "짧은 입력",
    repairDraft: null,
  });
  assert.equal(tooShort.state, "one_connection_still_missing");

  const exactDefectUnchanged = evaluateApp1SameSessionRepair({
    detail,
    requestedGap,
    repairText: "사례 사실과 논거의 연결을 시도했지만 여전히 부족하여 제대로 보강하지 못했다.",
    repairDraft: draft({ strength: "" }),
  });
  const paraphrasedDefectUnchanged = evaluateApp1SameSessionRepair({
    detail,
    requestedGap,
    repairText: targetRepair,
    repairDraft: draft({
      gap: "사안의 구체적 사실을 근거 기준과 결부하는 설명이 여전히 빠져 있습니다.",
      strength: "",
    }),
  });
  const genericStrengthWithUnresolvedDefect = evaluateApp1SameSessionRepair({
    detail,
    requestedGap,
    repairText: targetRepair,
    repairDraft: draft(),
  });
  const modelOnlyTargetClaim = evaluateApp1SameSessionRepair({
    detail,
    requestedGap,
    repairText: "결론 문장의 범위를 한정해 표현을 명확히 보강했다.",
    repairDraft: resolvedTargetDraft(),
  });
  const differentSameFacetRepair = evaluateApp1SameSessionRepair({
    detail,
    requestedGap,
    repairText:
      "다른 사례 사실을 별개 논거 기준에 적용해 결론을 도출했다고 설명했다.",
    repairDraft: resolvedTargetDraft(),
  });
  const discussionOnlyRepair = evaluateApp1SameSessionRepair({
    detail,
    requestedGap,
    repairText:
      "사례 사실과 논거 연결은 검토 항목으로 명시하고 확인 대상으로 설명했다.",
    repairDraft: resolvedTargetDraft({
      strength: "사례 사실과 논거 연결을 검토 항목으로 명시하고 확인 대상으로 설명했습니다.",
    }),
  });
  const intendedButIncompleteRepair = evaluateApp1SameSessionRepair({
    detail,
    requestedGap,
    repairText:
      "사례 사실과 논거의 연결을 향후 보강하려고 한다고 직접 설명했다.",
    repairDraft: resolvedTargetDraft({
      strength: "사례 사실과 논거의 연결을 보강하고자 계획했습니다.",
    }),
  });
  const conditionalPassiveRepair = evaluateApp1SameSessionRepair({
    detail,
    requestedGap,
    repairText:
      "사례 사실과 논거의 연결이 보강되어야 한다고 설명했다.",
    repairDraft: resolvedTargetDraft({
      strength: "사례 사실과 논거의 연결이 보강되도록 설명했습니다.",
    }),
  });
  const activeObligationOrDesire = evaluateApp1SameSessionRepair({
    detail,
    requestedGap,
    repairText:
      "사례 사실을 논거 요건에 충족하여야 하며 연결을 바로잡고 싶다고 설명했다.",
    repairDraft: resolvedTargetDraft({
      strength: "사례 사실을 논거에 연결하여야 하며 바로잡고 싶다고 설명했습니다.",
    }),
  });
  const explainedButUnrepaired = evaluateApp1SameSessionRepair({
    detail,
    requestedGap,
    repairText:
      "사례 사실과 논거의 연결을 보강하지 못한 이유를 설명했다.",
    repairDraft: resolvedTargetDraft({
      strength: "사례 사실과 논거의 연결을 보강하지 못했다고 설명했습니다.",
    }),
  });
  const namedTargetGap = {
    ...requestedGap,
    gap: "Alpha 사례 사실과 Beta 논거의 연결이 약합니다.",
    repairAction: "Alpha 사실을 Beta 논거에 연결해 보강하세요.",
  };
  const wrongNamedTargetRepair = evaluateApp1SameSessionRepair({
    detail,
    requestedGap: namedTargetGap,
    repairText:
      "Gamma 사례 사실을 Delta 논거 기준에 연결해 결론을 도출하고 보강했다.",
    repairDraft: resolvedTargetDraft({
      strength: "Gamma 사실을 Delta 논거에 연결해 결론을 도출하고 보강했습니다.",
    }),
  });
  const ambiguousRepair = evaluateApp1SameSessionRepair({
    detail,
    requestedGap,
    repairText: targetRepair,
    repairDraft: draft({
      gap: "사안의 사실과 논거 기준의 연계가 아직 충분하지 않습니다.",
      strengths: ["사례 사실을 논거의 요건에 연결하여 결론을 도출했습니다."],
      weakParagraphPoint: "결론 문장의 범위를 한정해 다시 적으세요.",
      weakLogicPoint: "결론 범위의 한정 근거를 확인해야 합니다.",
    }),
  });

  for (const verification of [
    exactDefectUnchanged,
    paraphrasedDefectUnchanged,
    genericStrengthWithUnresolvedDefect,
    modelOnlyTargetClaim,
    differentSameFacetRepair,
    discussionOnlyRepair,
    intendedButIncompleteRepair,
    conditionalPassiveRepair,
    activeObligationOrDesire,
    explainedButUnrepaired,
    wrongNamedTargetRepair,
    ambiguousRepair,
  ]) {
    assert.equal(verification.state, "one_connection_still_missing");
    assert.equal(verification.masteryCreated, false);
    assert.equal(verification.transferCreated, false);
  }

  const confirmed = evaluateApp1SameSessionRepair({
    detail,
    requestedGap,
    repairText: targetRepair,
    repairDraft: resolvedTargetDraft(),
  });
  assert.equal(confirmed.state, "repair_confirmed_for_this_session");
  assert.equal(confirmed.sameSessionOnly, true);
  assert.equal(confirmed.masteryCreated, false);
  assert.equal(confirmed.transferCreated, false);

  const equivalentWording = evaluateApp1SameSessionRepair({
    detail,
    requestedGap,
    repairText:
      "사안의 임대료 미납 사실을 계약 해지 기준에 적용하여 판단을 도출했다고 직접 설명했다.",
    repairDraft: resolvedTargetDraft({
      strength: "임대료 미납 사실을 계약 해지 근거와 연계하여 판단을 도출했습니다.",
    }),
  });
  assert.equal(equivalentWording.state, "repair_confirmed_for_this_session");

  const singleFacetGap = {
    ...requestedGap,
    gap: "계산 단위가 약합니다.",
    repairAction: "산식 단위를 검산해 바로잡으세요.",
  };
  const singleFacetEquivalent = evaluateApp1SameSessionRepair({
    detail,
    requestedGap: singleFacetGap,
    repairText:
      "임대료 수익 120에서 비용 20을 빼 순수익 100으로 계산하고 단위를 바로잡아 검산을 완료했다고 직접 설명했다.",
    repairDraft: draft({
      gap: "문단 구조를 보강할 필요가 있습니다.",
      strengths: [
        "임대료 수익 120에서 비용 20을 빼 순수익 100으로 계산하고 수식 단위를 바로잡아 검산을 완료했습니다.",
      ],
      missingIssueCandidates: ["문단 구조를 보강할 필요가 있습니다."],
      weakParagraphPoint: "문단 순서를 다시 확인하세요.",
      weakLogicPoint: "구조 순서를 확인해야 합니다.",
    }),
  });
  assert.equal(singleFacetEquivalent.state, "repair_confirmed_for_this_session");

  const resolvedNegativeNoun = evaluateApp1SameSessionRepair({
    detail,
    requestedGap: singleFacetGap,
    repairText:
      "임대료 수익 120에서 비용 20을 빼 순수익 100으로 계산해 오류를 바로잡고 산식 단위 검산을 완료했다고 직접 설명했다.",
    repairDraft: draft({
      gap: "문단 구조를 보강할 필요가 있습니다.",
      strengths: [
        "임대료 수익 120에서 비용 20을 빼 순수익 100으로 계산해 오류를 바로잡고 수식 단위 검산을 완료했습니다.",
      ],
      missingIssueCandidates: ["문단 구조를 보강할 필요가 있습니다."],
      weakParagraphPoint: "문단 순서를 다시 확인하세요.",
      weakLogicPoint: "구조 순서를 확인해야 합니다.",
    }),
  });
  assert.equal(resolvedNegativeNoun.state, "repair_confirmed_for_this_session");

  const selfReportedCompletionWithoutReconstruction = evaluateApp1SameSessionRepair({
    detail,
    requestedGap,
    repairText:
      "부족했던 사례 사실과 논거 연결을 보강했다고 직접 설명했다.",
    repairDraft: resolvedTargetDraft({
      strength: "누락된 사례 사실과 논거 연결을 보강했다고 명시했습니다.",
    }),
  });
  assert.equal(
    selfReportedCompletionWithoutReconstruction.state,
    "one_connection_still_missing",
  );

  const correctNamedTargetRepair = evaluateApp1SameSessionRepair({
    detail,
    requestedGap: namedTargetGap,
    repairText:
      "Alpha 사례 사실을 Beta 논거 기준에 연결해 결론을 도출하고 보강했다.",
    repairDraft: resolvedTargetDraft({
      strength: "Alpha 사실을 Beta 논거에 연결해 결론을 도출하고 보강했습니다.",
    }),
  });
  assert.equal(correctNamedTargetRepair.state, "repair_confirmed_for_this_session");

  const ambiguousPayload = buildApp1RepairPersistenceInput({
    detail,
    gap: requestedGap,
    repairText: targetRepair,
    verification: ambiguousRepair,
    operation: {
      operationId: "88888888-8888-4888-8888-888888888888",
      workRevisionId: "99999999-9999-4999-8999-999999999999",
    },
  });
  assert.equal(ambiguousPayload.rewriteCompleted, false);
  assert.equal(
    evaluateApp1SameSessionRepair({
      detail,
      requestedGap,
      repairText: "직접 작성한 보류 입력입니다. 충분한 길이를 갖습니다.",
      repairDraft: null,
      deferred: true,
    }).state,
    "deferred",
  );
  assert.deepEqual(APP1_VERIFICATION_STATES, [
    "repair_confirmed_for_this_session",
    "one_connection_still_missing",
    "guided_path_needed",
    "deferred",
    "blocked_by_ocr_or_source_uncertainty",
  ]);
});

test("APP1-VM-003C confirms stable out-of-vocabulary targets only with positive learner and draft evidence", () => {
  const detail = syntheticDetail();
  const baseGap = buildApp1PrimaryGap(detail, draft());
  const requestedGap = {
    ...baseGap,
    gap: "시효 완성 시점을 빠뜨렸습니다.",
    whyItMatters: "시효 완성 시점이 달라지면 법률효과의 판단 기준이 달라집니다.",
    repairAction: "시효 완성 시점을 보충하세요.",
  };
  const validRepair =
    "시효 완성 시점의 법률효과와 판단 기준을 기준일 다음 날로 특정하고 그 이유를 명시했습니다.";
  const validDraft = draft({
    gap: "결론 문장의 범위를 한정할 필요가 있습니다.",
    strengths: [
      "시효 완성 시점의 법률효과와 판단 기준을 기준일 다음 날로 특정하고 이유를 명시했습니다.",
    ],
    missingIssueCandidates: ["결론 문장의 범위를 한정할 필요가 있습니다."],
    weakParagraphPoint: "결론 범위를 다시 확인하세요.",
    weakLogicPoint: "결론 범위의 근거를 확인해야 합니다.",
  });
  assert.equal(
    evaluateApp1SameSessionRepair({
      detail,
      requestedGap,
      repairText: validRepair,
      repairDraft: validDraft,
    }).state,
    "repair_confirmed_for_this_session",
  );

  const cases = [
    {
      name: "unchanged target",
      repairText: "시효 완성 시점을 여전히 빠뜨려 보강하지 못했다고 설명했습니다.",
      repairDraft: validDraft,
    },
    {
      name: "generic strength",
      repairText: "문장의 표현을 명확히 보강하고 전체 구조를 다시 정리했습니다.",
      repairDraft: validDraft,
    },
    {
      name: "generic target echo",
      repairText: "시효 완성 시점을 확인했습니다.",
      repairDraft: validDraft,
    },
    {
      name: "target echo with unrelated filler",
      repairText: "시효 완성 시점을 확인했습니다. 답안 전체를 정리했습니다.",
      repairDraft: draft({
        gap: "결론 문장의 범위를 한정할 필요가 있습니다.",
        strengths: ["시효 완성 시점을 확인했습니다. 답안 전체를 정리했습니다."],
        missingIssueCandidates: ["결론 문장의 범위를 한정할 필요가 있습니다."],
      }),
    },
    {
      name: "contradictory target echo with unrelated filler",
      repairText: "시효 완성 시점을 오류로 명시했습니다. 답안 전체를 정리했습니다.",
      repairDraft: draft({
        gap: "결론 문장의 범위를 한정할 필요가 있습니다.",
        strengths: ["시효 완성 시점을 오류로 명시했습니다. 답안 전체를 정리했습니다."],
        missingIssueCandidates: ["결론 문장의 범위를 한정할 필요가 있습니다."],
      }),
    },
    {
      name: "contradictory learner completion claim",
      repairText: "시효 완성 시점을 틀리게 명시했습니다.",
      repairDraft: validDraft,
    },
    {
      name: "contradictory draft strength",
      repairText: validRepair,
      repairDraft: draft({
        gap: "결론 문장의 범위를 한정할 필요가 있습니다.",
        strengths: ["시효 완성 시점을 틀리게 명시했습니다."],
        missingIssueCandidates: ["결론 문장의 범위를 한정할 필요가 있습니다."],
        weakParagraphPoint: "결론 범위를 다시 확인하세요.",
        weakLogicPoint: "결론 범위의 근거를 확인해야 합니다.",
      }),
    },
    {
      name: "unrelated repair",
      repairText: "손실보상 결론의 범위를 한정하고 그 판단 이유를 명시했습니다.",
      repairDraft: validDraft,
    },
    {
      name: "target remains missing",
      repairText: validRepair,
      repairDraft: draft({
        gap: "시효 완성 시점의 설명이 아직 빠져 있습니다.",
        strengths: ["시효 완성 시점을 검토 대상으로 확인했습니다."],
        missingIssueCandidates: ["시효 완성 시점의 설명이 아직 빠져 있습니다."],
      }),
    },
    {
      name: "conflicting evidence",
      repairText: validRepair,
      repairDraft: draft({
        gap: "결론 문장의 범위를 한정할 필요가 있습니다.",
        strengths: ["시효 완성 시점을 명시했습니다."],
        missingIssueCandidates: ["시효 완성 시점의 근거가 여전히 부족합니다."],
      }),
    },
  ];
  for (const fixture of cases) {
    const verification = evaluateApp1SameSessionRepair({
      detail,
      requestedGap,
      repairText: fixture.repairText,
      repairDraft: fixture.repairDraft,
    });
    assert.equal(verification.state, "one_connection_still_missing", fixture.name);
    assert.equal(verification.masteryCreated, false, fixture.name);
    assert.equal(verification.transferCreated, false, fixture.name);
  }

  const unstableGap = {
    ...baseGap,
    gap: "이 부분이 약합니다.",
    whyItMatters: "보완이 필요합니다.",
    repairAction: "직접 보강하세요.",
  };
  assert.equal(
    evaluateApp1SameSessionRepair({
      detail,
      requestedGap: unstableGap,
      repairText: "표현을 명확히 보강하고 완료했다고 직접 설명했습니다.",
      repairDraft: draft({
        gap: "결론 범위를 확인할 필요가 있습니다.",
        strengths: ["표현을 명확히 보강하고 완료했습니다."],
        missingIssueCandidates: ["결론 범위를 확인할 필요가 있습니다."],
      }),
    }).state,
    "one_connection_still_missing",
  );
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
  const repairText =
    "사례의 합성 사실 A는 위 논거의 요건 B를 충족하므로 결론 C에 이른다고 직접 연결했다.";
  const verification = evaluateApp1SameSessionRepair({
    detail,
    requestedGap,
    repairText,
    repairDraft: resolvedTargetDraft(),
  });
  assert.equal(verification.state, "repair_confirmed_for_this_session");
  const payload = buildApp1RepairPersistenceInput({
    detail,
    gap: requestedGap,
    repairText,
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
  assert.equal("nextReviewDate" in payload, false);
  assert.equal("releaseStatus" in payload, false);
  assert.equal("mastery" in payload, false);
  assert.equal("transfer" in payload, false);
});

test("APP1-VM-004A preserves multiline Theory, Law and Practice bodies without inheriting stale schedules", () => {
  const cases = [
    {
      subjectLabel: "감정평가이론",
      sourceType: "text",
      repairText:
        "  임대료 미납 사실을 계약 해지 논거의 요건에 연결하여 계약 종료 결론을 도출했다.\r\n\r\n둘째 문단에서 그 적용 이유를 직접 설명했다.  ",
      expected:
        "임대료 미납 사실을 계약 해지 논거의 요건에 연결하여 계약 종료 결론을 도출했다.\n\n둘째 문단에서 그 적용 이유를 직접 설명했다.",
      strength:
        "임대료 미납 사실을 계약 해지 논거의 요건에 연결하여 계약 종료 결론을 도출했습니다.",
      nextReviewDate: "2020-01-01",
      reviewQueue: [],
    },
    {
      subjectLabel: "감정평가 및 보상법규",
      sourceType: "text",
      repairText:
        "임대료 미납 사실을 계약 해지 법리 기준에 적용해 계약 종료 결론을 도출했다.\r\n\r\n조문 근거와 사안 적용을 별도 문단으로 유지했다.",
      expected:
        "임대료 미납 사실을 계약 해지 법리 기준에 적용해 계약 종료 결론을 도출했다.\n\n조문 근거와 사안 적용을 별도 문단으로 유지했다.",
      strength:
        "임대료 미납 사실을 계약 해지 법리 기준에 적용해 계약 종료 결론을 도출했습니다.",
      nextReviewDate: null,
      reviewQueue: [{
        queueId: "55555555-5555-4555-8555-555555555555",
        itemId: "11111111-1111-4111-8111-111111111111",
        dueAt: "2020-01-01T00:00:00.000Z",
      }],
    },
    {
      subjectLabel: "감정평가실무",
      sourceType: "text",
      repairText:
        "임대료 수익 120과 비용 20이라는 사례 사실을 수익환원 계산 논거의 요건에 연결하여 순수익 100을 산출하고 단위와 부호 검산을 완료했다.\r\nNOI = 120 - 20\r\nV = NOI / 0.05\r\n검산: 단위와 부호를 확인했다.",
      expected:
        "임대료 수익 120과 비용 20이라는 사례 사실을 수익환원 계산 논거의 요건에 연결하여 순수익 100을 산출하고 단위와 부호 검산을 완료했다.\nNOI = 120 - 20\nV = NOI / 0.05\n검산: 단위와 부호를 확인했다.",
      strength:
        "임대료 수익 120과 비용 20이라는 사례 사실을 수익환원 계산 논거의 요건에 연결하여 순수익 100을 산출하고 단위와 부호 검산을 완료했습니다.",
      nextReviewDate: "2020-01-01",
      reviewQueue: [{
        queueId: "55555555-5555-4555-8555-555555555555",
        itemId: "11111111-1111-4111-8111-111111111111",
        dueAt: "2020-01-01T00:00:00.000Z",
      }],
    },
  ];

  for (const fixture of cases) {
    const detail = syntheticDetail({
      item: {
        subjectLabel: fixture.subjectLabel,
        sourceType: fixture.sourceType,
        nextReviewDate: fixture.nextReviewDate,
      },
      reviewQueue: fixture.reviewQueue,
    });
    const requestedGap = buildApp1PrimaryGap(detail, draft());
    const verification = evaluateApp1SameSessionRepair({
      detail,
      requestedGap,
      repairText: fixture.repairText,
      repairDraft: resolvedTargetDraft({ strength: fixture.strength }),
    });
    assert.equal(
      verification.state,
      "repair_confirmed_for_this_session",
      fixture.subjectLabel,
    );
    const payload = buildApp1RepairPersistenceInput({
      detail,
      gap: requestedGap,
      repairText: fixture.repairText,
      verification,
      operation: {
        operationId: "33333333-3333-4333-8333-333333333333",
        workRevisionId: "44444444-4444-4444-8444-444444444444",
      },
    });
    assert.equal(payload.rawAnswerText, fixture.expected);
    assert.equal(payload.rewriteParagraph, fixture.expected);
    assert.equal(payload.userAnswer, fixture.expected);
    assert.equal("nextReviewDate" in payload, false);
  }
});

test("APP1-VM-004B enforces exact normalized 4,000/4,001-character body bounds", () => {
  const detail = syntheticDetail();
  const requestedGap = buildApp1PrimaryGap(detail, draft());
  const prefix =
    "임대료 미납 사실을 계약 해지 논거의 요건에 연결하여 계약 종료 결론을 도출했다고 직접 설명했다.";
  const exactMaximum = `${prefix}${"가".repeat(
    APP1_LIMITS.maximumRepairCharacters - prefix.length,
  )}`;
  const accepted = evaluateApp1SameSessionRepair({
    detail,
    requestedGap,
    repairText: exactMaximum,
    repairDraft: resolvedTargetDraft(),
  });
  assert.equal(accepted.state, "repair_confirmed_for_this_session");
  const acceptedPayload = buildApp1RepairPersistenceInput({
    detail,
    gap: requestedGap,
    repairText: exactMaximum,
    verification: accepted,
    operation: {
      operationId: "33333333-3333-4333-8333-333333333333",
      workRevisionId: "44444444-4444-4444-8444-444444444444",
    },
  });
  assert.equal(acceptedPayload.rawAnswerText.length, 4_000);
  assert.equal(acceptedPayload.rawAnswerText, exactMaximum);

  const excessive = `${exactMaximum}가`;
  const rejected = evaluateApp1SameSessionRepair({
    detail,
    requestedGap,
    repairText: excessive,
    repairDraft: resolvedTargetDraft(),
  });
  assert.equal(rejected.state, "one_connection_still_missing");
  assert.match(rejected.reason, /4000자 이하/u);
  assert.throws(
    () =>
      buildApp1RepairPersistenceInput({
        detail,
        gap: requestedGap,
        repairText: excessive,
        verification: accepted,
        operation: {
          operationId: "33333333-3333-4333-8333-333333333333",
          workRevisionId: "44444444-4444-4444-8444-444444444444",
        },
      }),
    /app1:repair-input-too-long/u,
  );
});
test("APP1-VM-005 announces a next review only from an exactly cross-bound new item detail", () => {
  const persistence = Object.freeze({
    kind: "durable_record",
    recordId: "66666666-6666-4666-8666-666666666666",
    operationId: "77777777-7777-4777-8777-777777777777",
    workRevisionId: "88888888-8888-4888-8888-888888888888",
    persistedAt: "2026-08-29T01:00:00.000Z",
  });
  const baseQueue = {
    queueId: "55555555-5555-4555-8555-555555555555",
    itemId: persistence.recordId,
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
    itemCreatedAt: persistence.persistedAt,
  };
  const repairDetail = syntheticDetail({
    item: {
      id: persistence.recordId,
      updatedAt: persistence.persistedAt,
      rawPayload: {
        user_confirmed_fields: {
          persistence_operation_id: persistence.operationId,
          persistence_work_revision_id: persistence.workRevisionId,
        },
      },
    },
    reviewQueue: [baseQueue],
  });
  const receipt = buildApp1NextReviewReceipt(
    repairDetail,
    baseQueue.itemId,
    persistence,
  );
  assert.equal(receipt.policyWindow, "D+1");
  assert.match(receipt.nextIndependentAction, /답을 보지 않고/);
  assert.equal(
    buildApp1NextReviewReceipt(
      syntheticDetail({ reviewQueue: [baseQueue] }),
      baseQueue.itemId,
      persistence,
    ),
    null,
    "the fetched detail must be bound to the exact new item",
  );
  assert.equal(
    buildApp1NextReviewReceipt(
      { ...repairDetail, reviewQueue: [{ ...baseQueue, queueId: "invalid" }] },
      baseQueue.itemId,
      persistence,
    ),
    null,
  );
  assert.equal(
    buildApp1NextReviewReceipt(
      { ...repairDetail, reviewQueue: [baseQueue, { ...baseQueue }] },
      baseQueue.itemId,
      persistence,
    ),
    null,
  );
  assert.equal(
    buildApp1NextReviewReceipt(
      {
        ...repairDetail,
        reviewQueue: [{ ...baseQueue, dueAt: "2026-08-28T01:00:00.000Z" }],
      },
      baseQueue.itemId,
      persistence,
    ),
    null,
  );
  assert.equal(
    buildApp1NextReviewReceipt(
      {
        ...repairDetail,
        item: { ...repairDetail.item, updatedAt: "2026-08-29T00:59:59.000Z" },
      },
      baseQueue.itemId,
      persistence,
    ),
    null,
    "item update time must equal the durable persistence receipt",
  );
  assert.equal(
    buildApp1NextReviewReceipt(
      {
        ...repairDetail,
        item: {
          ...repairDetail.item,
          rawPayload: {
            user_confirmed_fields: {
              persistence_operation_id: "99999999-9999-4999-8999-999999999999",
              persistence_work_revision_id: persistence.workRevisionId,
            },
          },
        },
      },
      baseQueue.itemId,
      persistence,
    ),
    null,
    "item operation metadata must equal the durable persistence receipt",
  );
  assert.equal(
    buildApp1NextReviewReceipt(
      {
        ...repairDetail,
        item: {
          ...repairDetail.item,
          rawPayload: {
            user_confirmed_fields: {
              persistence_operation_id: persistence.operationId,
              persistence_work_revision_id: "99999999-9999-4999-8999-999999999999",
            },
          },
        },
      },
      baseQueue.itemId,
      persistence,
    ),
    null,
    "item work-revision metadata must independently equal the durable receipt",
  );});
test("APP1-UI-001 binds exact copy, one-gap UI, no prefilled repair and truthful failures", async () => {
  const capturePage = await read("app/app/capture/page.tsx");
  const captureForm = await read("components/review-os/capture-form.tsx");
  const repairPage = await read("app/app/capture/repair/page.tsx");
  const repairLoop = await read("components/owner-study/app1-capture-repair-loop.tsx");
  assert.ok(captureForm.includes("사진·PDF·텍스트로 시작"));
  assert.ok(captureForm.includes("data-app1-capture-input-chooser"));
  assert.ok(captureForm.includes('aria-expanded={ownerCaptureRepairEnabled ? app1InputChooserOpen : undefined}'));
  assert.ok(captureForm.includes('aria-controls={ownerCaptureRepairEnabled ? app1InputChooserId : undefined}'));
  for (const choice of ["사진 찍기", "PDF 선택", "텍스트 붙여넣기"]) {
    assert.ok(captureForm.includes(choice), `missing APP-1 input choice: ${choice}`);
  }
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

test("APP1-API-001 isolates repair verification from learning-state signals behind exact Owner bindings", async () => {
  const route = await read("app/api/answer-review/structure/route.ts");
  const repairLoop = await read("components/owner-study/app1-capture-repair-loop.tsx");
  const config = JSON.parse(await read("config/dabangil-app1-owner-capture-repair-vertical-v1.json"));

  assert.deepEqual(config.answerReviewStructure.requestPurposes, [
    "learning_analysis",
    "repair_verification",
  ]);
  assert.equal(config.answerReviewStructure.defaultRequestPurpose, "learning_analysis");
  assert.equal(config.answerReviewStructure.repairVerificationCreatesLearningSignal, false);
  assert.match(route, /value === null\) return "learning_analysis"/u);
  assert.match(route, /requestPurposeValues\.length > 1/u);
  assert.match(route, /ANSWER_REVIEW_REQUEST_PURPOSES = \["learning_analysis", "repair_verification"\]/u);
  assert.match(route, /!session\.isAuthenticated \|\| !session\.userId \|\| !session\.email/u);
  assert.match(route, /ITEM_ID_PATTERN\.test\(sourceItemId\)/u);
  assert.match(route, /sourceItemIdValues\.length !== 1/u);
  assert.match(route, /sourceItemId !== sourceItemId\.trim\(\)/u);
  assert.match(route, /trustedRepairAuthorizedSubjects\(session\.email\)/u);
  assert.match(route, /isApp1SubjectAuthorized\(subject, authorizedSubjects\)/u);
  assert.match(route, /reviewOsRepository\.getWrongAnswerItem\([\s\S]*?session\.userId,[\s\S]*?sourceItemId/u);
  assert.match(route, /sourceItem\.examName !== "감정평가사 2차"/u);
  assert.match(route, /sourceItem\.subjectLabel !== subject/u);
  assert.ok(
    route.indexOf('requestPurpose === "repair_verification"') <
      route.indexOf("isGeminiConfigured()"),
    "repair authorization must complete before provider execution",
  );
  assert.match(
    route,
    /session\.userId && session\.email && requestPurpose === "learning_analysis" && !skipReason/u,
  );
  assert.match(route, /learningSignalSkipReason = requestPurpose === "repair_verification" \? "repair_verification"/u);
  assert.match(route, /metadataJson|requestPurpose|\{ examMode: mode, explanationLevel, requestPurpose \}/u);
  assert.match(repairLoop, /formData\.set\("requestPurpose", requestPurpose\)/u);
  assert.match(repairLoop, /requestPurpose === "repair_verification"[\s\S]*?formData\.set\("sourceItemId", detail\.item\.id\)/u);
  assert.match(repairLoop, /getApp1LearnerAnswer\(detail\),\s*"learning_analysis"/u);
  assert.match(repairLoop, /trimmed,\s*"repair_verification"/u);
});

test("APP1-UI-002A exposes guided fallback after verification service failure without save authority", async () => {
  const repairLoop = await read("components/owner-study/app1-capture-repair-loop.tsx");
  const verifyRepair = repairLoop.match(
    /async function verifyRepair\(\) \{[\s\S]*?(?=\n  function deferRepair\(\))/u,
  )?.[0];
  const saveRepair = repairLoop.match(
    /async function saveRepair\(\) \{[\s\S]*?(?=\n  const busy =)/u,
  )?.[0];

  assert.ok(verifyRepair, "missing verification request boundary");
  assert.match(
    verifyRepair,
    /catch \{\s*setVerification\(preliminary\);\s*setError\(VERIFICATION_FAILURE_MESSAGE\);\s*setPhase\("repair_verification"\);\s*\}/u,
  );
  assert.match(
    repairLoop,
    /verification\.state === "guided_path_needed"[\s\S]*?app1GuidedRepairHref\(gap\.subject\)[\s\S]*?구조화된 신뢰 복구로 이동[\s\S]*?직접 복구 다시 시도/u,
  );
  assert.ok(saveRepair, "missing repair persistence boundary");
  assert.match(
    saveRepair,
    /verification\.state !== "repair_confirmed_for_this_session"[\s\S]*?완료되지 않은 복구는 성공 기록으로 저장하지 않습니다/u,
  );
  assert.match(
    repairLoop,
    /verification\.state === "repair_confirmed_for_this_session" \? \([\s\S]*?data-app1-save-repair/u,
  );
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
test("APP1-UI-004 keeps queue confirmation post-save and item-specific", async () => {
  const repairLoop = await read("components/owner-study/app1-capture-repair-loop.tsx");
  const receiptIndex = repairLoop.indexOf(
    "const receipt = buildDurableCapturePersistenceReceipt(",
  );
  const settleIndex = repairLoop.indexOf(
    "pendingSaveRef.current = null;",
    receiptIndex,
  );
  const persistedLinkIndex = repairLoop.indexOf(
    "setPersistedRecordId(payload.item.id);",
    settleIndex,
  );
  const itemDetailIndex = repairLoop.indexOf(
    "/api/os/items/${encodeURIComponent(payload.item.id)}",
    persistedLinkIndex,
  );
  const savedWithoutQueueIndex = repairLoop.indexOf(
    'setPhase("saved_without_queue")',
    itemDetailIndex,
  );
  const completedIndex = repairLoop.indexOf(
    'setPhase("completed")',
    savedWithoutQueueIndex,
  );

  assert.ok(receiptIndex >= 0);
  assert.ok(settleIndex > receiptIndex);
  assert.ok(persistedLinkIndex > settleIndex);
  assert.ok(itemDetailIndex > persistedLinkIndex);
  assert.ok(savedWithoutQueueIndex > itemDetailIndex);
  assert.ok(completedIndex > savedWithoutQueueIndex);
  assert.match(
    repairLoop.slice(itemDetailIndex, savedWithoutQueueIndex),
    /catch \{\s*queueReceipt = null;\s*\}/u,
  );
  assert.match(
    repairLoop.slice(itemDetailIndex, savedWithoutQueueIndex),
    /buildApp1NextReviewReceipt\(\s*itemPayload\.detail,\s*payload\.item\.id,\s*receipt/u,
  );
  assert.equal(repairLoop.includes("/api/os/review-queue"), false);
  assert.match(
    repairLoop,
    /data-app1-saved-without-queue[\s\S]*?data-app1-persistence-receipt="durable"/u,
  );
  assert.equal(
    repairLoop
      .slice(settleIndex, completedIndex)
      .includes('setPhase("repair_verification")'),
    false,
    "post-save Queue uncertainty must not return to the pre-save phase",
  );
  assert.match(
    repairLoop,
    /function editRepairAfterConflict\(\) \{[\s\S]*?pendingSaveRef\.current = null;[\s\S]*?setVerification\(null\);[\s\S]*?setConflict\(false\);[\s\S]*?setPhase\("direct_repair"\);/u,
  );
  assert.match(
    repairLoop,
    /conflict \? \([\s\S]*?data-app1-edit-conflicted-repair[\s\S]*?복구 입력 수정하기[\s\S]*?: verification\.state === "repair_confirmed_for_this_session"/u,
  );
});

test("APP1-QUEUE-001 reads every exact item Queue row before ordering and without a global limit", async () => {
  const repository = await read("lib/review-os/repository.ts");
  const method = repository.match(
    /private async listReviewQueueForWrongAnswerItem\([\s\S]*?(?=\n  async getWrongAnswerDetail\()/u,
  )?.[0];
  const detailMethod = repository.match(
    /async getWrongAnswerDetail\([\s\S]*?(?=\n  async upsertWeeklySummary\()/u,
  )?.[0];
  assert.ok(method, "missing exact item-specific Queue repository query");
  assert.ok(detailMethod, "missing wrong-answer detail repository method");
  const filters = [
    '.eq("user_id", userId)',
    '.eq("exam_id", "wrong_answer_os")',
    '.eq("stage", "alpha")',
    '.eq("status", "pending")',
    '.eq("source_kind", "wrong_answer")',
    '.eq("source_submission_id", item.id)',
  ];
  let previousIndex = method.indexOf('.select("*", { count: "exact" })');
  assert.ok(previousIndex >= 0);
  for (const filter of filters) {
    const index = method.indexOf(filter);
    assert.ok(index > previousIndex, `missing or unordered Queue filter: ${filter}`);
    previousIndex = index;
  }
  const firstOrder = method.indexOf('.order("priority_score"');
  assert.ok(firstOrder > previousIndex, "Queue filters must precede ordering");
  const finalOrder = method.indexOf('.order("id"', firstOrder);
  const range = method.indexOf(".range(offset, offset + pageSize - 1)");
  assert.ok(finalOrder > firstOrder);
  assert.ok(range > finalOrder, "item-specific paging must follow exact filters and order");
  assert.doesNotMatch(method, /\.limit\(/u);
  assert.match(method, /expectedTotal \?\?= result\.count/u);
  assert.match(method, /result\.count !== expectedTotal/u);
  assert.match(method, /queueRows\.length === expectedTotal/u);
  assert.match(method, /pageRows\.length === 0/u);
  assert.match(method, /seenRowIds\.has\(rowId\)/u);
  assert.match(
    method,
    /queueRows\.map\(\(row\) =>[\s\S]*?mapReviewQueueCard\(row, item, primaryTag\)/u,
  );
  assert.match(
    detailMethod,
    /this\.listReviewQueueForWrongAnswerItem\(userId, item, primaryTag\)/u,
  );
  assert.doesNotMatch(
    detailMethod,
    /listReviewQueue\(userId, 20\)|reviewQueue\.filter/u,
  );
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
  assert.equal(config.changedPaths.length, 15);
  assert.equal(config.changedPaths.includes(SHARED_ACCESS_INVENTORY_PATH), false);
  assert.equal(config.changedPaths.includes(INHERITED_C3R_P_IDENTITY_PATH), false);
  assert.equal(config.changedPaths.includes(INHERITED_C3R_P_RUNTIME_SPEC_PATH), false);
  assert.equal(
    new Set([
      ...config.changedPaths,
      SHARED_ACCESS_INVENTORY_PATH,
      INHERITED_C3R_P_IDENTITY_PATH,
      INHERITED_C3R_P_RUNTIME_SPEC_PATH,
    ]).size,
    18,
  );
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
    'waitForEvent("filechooser")',
    "setFiles",
    'requestPurpose", "learning_analysis"',
    'requestPurpose", "repair_verification"',
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
