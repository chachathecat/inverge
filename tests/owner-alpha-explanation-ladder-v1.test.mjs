import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  OWNER_ALPHA_EXPLANATION_LADDER_CONTRACT_VERSION,
  OWNER_ALPHA_LAW_EXPLANATION_BLOCKS,
  OWNER_ALPHA_PRACTICAL_EXPLANATION_BLOCKS,
  OWNER_ALPHA_THEORY_EXPLANATION_BLOCKS,
  isOwnerAlphaExplanationLadderV1,
  ownerAlphaExplanationBlockLabel,
  ownerAlphaExplanationLadderReleaseBlockers,
} from "../lib/review-os/owner-alpha-explanation-ladder-contract.ts";
import {
  ownerAlphaCalculationReleaseBlockers,
  validateOwnerAlphaCalculationGraph,
} from "../lib/review-os/owner-alpha-calculation-validator.ts";
import {
  OWNER_ALPHA_AI_REFERENCE_DISCLAIMER,
  OWNER_ALPHA_AI_REFERENCE_LABEL,
  isOwnerAlphaPracticeSession,
} from "../lib/review-os/owner-alpha-practice-contract.ts";
import { compileOwnerAlphaPracticeProblem } from "../lib/review-os/owner-alpha-practice-compiler.ts";
import { ownerAlphaPracticeMetadataProjection } from "../lib/review-os/owner-alpha-practice-metadata.ts";
import { OwnerAlphaProviderError } from "../lib/review-os/owner-alpha-practice-provider-contract.ts";
import { OwnerAlphaPracticeRuntime } from "../lib/review-os/owner-alpha-practice-runtime.ts";
import {
  ownerAlphaSubjectReferenceReleaseBlockers,
} from "../lib/review-os/owner-alpha-practice-subject-adapters.ts";
import {
  isOwnerAlphaSubjectAdapterModel,
} from "../lib/review-os/owner-alpha-subject-adapter-contract.ts";

const SYNTHETIC_FIXTURES = Object.freeze([
  {
    id: "synthetic-practical-comparison-allocation-adjustment",
    syntheticStructureOnly: true,
    ownerGoldenDogfood: false,
    subject: "appraisal_practical",
    text: "가상 비교사례 가격은 10억원이고 토지 배분비율은 60%이다. 가상 대상 토지에 사정보정률 5%를 적용할 때 비교·배분·보정의 방법 선택과 계산 순서를 제시하시오.",
    blockTypes: OWNER_ALPHA_PRACTICAL_EXPLANATION_BLOCKS,
    gapType: "method_selection_gap",
    rewriteMode: "recalculation",
    canonicalRewriteMode: "recalculate",
  },
  {
    id: "synthetic-theory-market-value-argument",
    syntheticStructureOnly: true,
    ownerGoldenDogfood: false,
    subject: "appraisal_theory",
    text: "가상 논술 연습이다. 시장가치의 정의를 전제로 두 관점을 비교하고, 전제 → 논증 → 반대 고려 → 평가 → 결론의 순서로 서술하시오.",
    blockTypes: OWNER_ALPHA_THEORY_EXPLANATION_BLOCKS,
    gapType: "logical_jump",
    rewriteMode: "argument_bridge",
    canonicalRewriteMode: "rewrite",
  },
  {
    id: "synthetic-law-fictional-compensation-procedure",
    syntheticStructureOnly: true,
    ownerGoldenDogfood: false,
    subject: "appraisal_compensation_law",
    text: "다음은 전적으로 가상인 보상절차 사례이다. 문제에서 제공하는 법률 조문의 유효일은 2026.07.04이다. 공익사업법 제10조 제1항을 전제로, 가상 사업시행자의 통지 사실을 요건별로 대응하고 포섭하라. 반대 해석과 법적 효과 및 결론도 후보로 검토하시오.",
    blockTypes: OWNER_ALPHA_LAW_EXPLANATION_BLOCKS,
    gapType: "weak_subsumption",
    rewriteMode: "subsumption_rewrite",
    canonicalRewriteMode: "rewrite",
  },
]);

function clone(value) {
  return value === null || value === undefined ? value : structuredClone(value);
}

function memoryRepository() {
  const rows = new Map();
  const evidence = { attempts: 0, rewrites: 0, completions: 0, usage: 0 };
  return {
    rows,
    evidence,
    async create(session) {
      rows.set(session.sessionId, clone(session));
      return clone(session);
    },
    async load(sessionId) {
      return clone(rows.get(sessionId) ?? null);
    },
    async save(session, expectedRecordVersion) {
      const current = rows.get(session.sessionId);
      if (!current || current.recordVersion !== expectedRecordVersion) {
        const error = new Error("owner-alpha-practice-repository:stale_record");
        error.code = "stale_record";
        throw error;
      }
      const next = {
        ...clone(session),
        recordVersion: expectedRecordVersion + 1,
        updatedAt: new Date(Date.parse(current.updatedAt) + 1).toISOString(),
      };
      rows.set(session.sessionId, next);
      return clone(next);
    },
    async listRecentSessions() {
      return [...rows.values()].map(clone);
    },
    async saveIndependentAttempt() {
      evidence.attempts += 1;
    },
    async saveRewrite() {
      evidence.rewrites += 1;
    },
    async recordReferenceUsage() {
      evidence.usage += 1;
    },
    async projectCompletion() {
      evidence.completions += 1;
    },
  };
}

function calculationNode(claimedResult = 600_000_000) {
  return {
    nodeId: "synthetic-allocation-node",
    claimId: "synthetic-practical-calculation-claim",
    label: "가상 사례가격 × 토지 배분비율",
    primitive: "allocation",
    total: 1_000_000_000,
    ratio: 60,
    ratioInput: "percent",
    claimedResult,
    resultUnit: "원",
    critical: true,
  };
}

function claimsFor(fixture) {
  const prefix = fixture.subject;
  if (fixture.subject === "appraisal_practical") {
    return [
      {
        claimId: `${prefix}-direction-claim`,
        claimType: "method",
        summary: "가상 방법 선택 방향",
        state: "ai_inference",
        critical: true,
        evidenceRefIds: [],
        calculationNodeId: null,
        resolutionCode: "provider_only",
      },
      {
        claimId: `${prefix}-exam-core-claim`,
        claimType: "method",
        summary: "가상 시험 답안 핵심",
        state: "ai_inference",
        critical: true,
        evidenceRefIds: [],
        calculationNodeId: null,
        resolutionCode: "provider_only",
      },
      {
        claimId: "synthetic-practical-calculation-claim",
        claimType: "formula",
        summary: "가상 배분 계산",
        state: "ai_inference",
        critical: true,
        evidenceRefIds: [],
        calculationNodeId: "synthetic-allocation-node",
        resolutionCode: "provider_only",
      },
    ];
  }
  return ["one", "two", "three", "four"].map((suffix, index) => ({
    claimId: `${prefix}-${suffix}-claim`,
    claimType: fixture.subject === "appraisal_compensation_law" ? "source" : "concept",
    summary: `가상 구조 주장 ${index + 1}`,
    state: "ai_inference",
    critical: index < 2,
    evidenceRefIds: [],
    calculationNodeId: null,
    resolutionCode: "provider_only",
  }));
}

function ladderFor(fixture, referenceId, checkQuestionId) {
  const claims = claimsFor(fixture);
  const common = {
    contractVersion: OWNER_ALPHA_EXPLANATION_LADDER_CONTRACT_VERSION,
    parentReferenceId: referenceId,
    subject: fixture.subject,
  };
  if (fixture.subject === "appraisal_practical") {
    return {
      ...common,
      blocks: [
        {
          blockType: "solution_direction",
          level: "l1",
          sectionIndex: 0,
          claimIds: [claims[0].claimId],
          calculationNodeIds: [],
          checkQuestionId: null,
        },
        {
          blockType: "exam_core",
          level: "l2",
          sectionIndex: 0,
          claimIds: [claims[1].claimId],
          calculationNodeIds: [],
          checkQuestionId: null,
        },
        {
          blockType: "calculation_or_method_trap",
          level: "l2",
          sectionIndex: 1,
          claimIds: [claims[2].claimId],
          calculationNodeIds: ["synthetic-allocation-node"],
          checkQuestionId: null,
        },
        {
          blockType: "ten_second_calculation_or_method_check",
          level: "l3",
          sectionIndex: 0,
          claimIds: [claims[0].claimId, claims[2].claimId],
          calculationNodeIds: ["synthetic-allocation-node"],
          checkQuestionId,
        },
      ],
    };
  }
  const levels = ["l1", "l2", "l2", "l3"];
  const sectionIndexes = [0, 0, 1, 0];
  return {
    ...common,
    blocks: fixture.blockTypes.map((blockType, index) => ({
      blockType,
      level: levels[index],
      sectionIndex: sectionIndexes[index],
      claimIds: [claims[index].claimId],
      calculationNodeIds: [],
      checkQuestionId: index === 3 ? checkQuestionId : null,
    })),
  };
}

function referenceDraft(input, fixture, mutate) {
  const referenceId = `${input.sessionId}-reference`;
  const claims = claimsFor(fixture);
  const nodes = fixture.subject === "appraisal_practical" ? [calculationNode()] : [];
  const draft = {
    reference: {
      referenceId,
      label: OWNER_ALPHA_AI_REFERENCE_LABEL,
      disclaimer: OWNER_ALPHA_AI_REFERENCE_DISCLAIMER,
      modelProfileId: "synthetic-structure-only.v1",
      promptVersion: "synthetic-structure-only.v1",
      schemaVersion: "synthetic-structure-only.v1",
      generatedAt: input.generatedAt,
      hints: [1, 2, 3, 4].map((level) => ({
        hintId: `${fixture.id}-hint-${level}`,
        level,
        text: `가상 단계 힌트 ${level}`,
      })),
      l1: {
        title: "L1",
        sections: [
          { heading: "가상 쉬운 방향", body: "가상 L1 구조 설명" },
          { heading: "가상 보조 방향", body: "가상 L1 보조 설명" },
        ],
      },
      l2: {
        title: "L2",
        sections: [
          { heading: "가상 시험 핵심", body: "가상 L2 핵심 구조" },
          { heading: "가상 연결·함정", body: "가상 L2 연결 구조" },
        ],
      },
      l3: {
        title: "L3",
        sections: [
          { heading: "가상 10초 확인", body: "가상 L3 확인 구조" },
        ],
      },
      claims,
      calculationGraph: { nodes },
      explanationLadder: ladderFor(
        fixture,
        referenceId,
        input.checkQuestionIds.at(-1) ?? null,
      ),
      releaseStatus: "released",
      blockerCodes: [],
    },
    biggestGap: {
      gapId: `${fixture.id}-gap`,
      gapType: fixture.gapType,
      title: "가상 가장 큰 간극",
      reasonSelected: "가상 독립 시도에서 구조 연결 하나가 비었습니다.",
      inferredMisunderstanding: "가상 구조 연결을 다시 확인합니다.",
      successCriteria: "가상 구조를 도움 없이 다시 재현합니다.",
      conceptIds: [`${fixture.id}-concept`],
      state: "ai_candidate",
    },
    misconceptionGraph: {
      graphId: `${fixture.id}-graph`,
      nodes: [],
      edges: [],
    },
    rootCauseCandidates: [],
    variant: {
      variantId: `${fixture.id}-variant`,
      kind: fixture.subject === "appraisal_practical" ? "numeric" : "condition",
      changedOneThing: "가상 조건 하나만 변경",
      prompt: "가상 조건 하나만 바꾸어 다시 작성하세요.",
      verificationState: "ai_inference",
      calculationGraph: { nodes: [] },
    },
  };
  if (mutate) mutate(draft);
  return draft;
}

function harness(fixture, options = {}) {
  const repository = options.repository ?? memoryRepository();
  const calls = { reference: 0 };
  const provider = {
    async extractProblem(input) {
      return { extractedText: input.problemText, modelProfileId: "synthetic-ocr.v1" };
    },
    async generateReference(input) {
      calls.reference += 1;
      if (options.providerError) throw options.providerError;
      return referenceDraft(input, fixture, options.mutate);
    },
  };
  let id = 0;
  const now = new Date("2026-07-22T00:00:00.000Z");
  const runtime = new OwnerAlphaPracticeRuntime({
    repository,
    provider,
    assertReferenceEntitlement: async () => {},
    now: () => new Date(now),
    createId: () => `ladder-${++id}`,
    userId: options.userId ?? "11111111-1111-4111-8111-111111111111",
  });
  return { runtime, repository, calls, now };
}

async function prepareAttempt(runtime, fixture) {
  let view = await runtime.create({
    problemText: fixture.text,
    files: [],
    inputModality: "typed",
    subject: fixture.subject,
  });
  view = await runtime.confirmProblem({
    sessionId: view.sessionId,
    recordVersion: view.recordVersion,
    confirmedProblemText: view.confirmedProblemText,
  });
  view = await runtime.saveIndependentAttempt({
    sessionId: view.sessionId,
    recordVersion: view.recordVersion,
    attemptText: "가상 기준안을 보기 전에 구조와 근거를 먼저 작성했습니다.",
    elapsedTimeMs: 120_000,
    confidence: "medium",
  });
  return view;
}

test("fixtures are exactly one explicitly synthetic structure case per subject and never Golden dogfood", () => {
  assert.equal(SYNTHETIC_FIXTURES.length, 3);
  assert.deepEqual(
    SYNTHETIC_FIXTURES.map((fixture) => fixture.subject),
    [
      "appraisal_practical",
      "appraisal_theory",
      "appraisal_compensation_law",
    ],
  );
  assert.equal(new Set(SYNTHETIC_FIXTURES.map((fixture) => fixture.subject)).size, 3);
  assert.equal(
    SYNTHETIC_FIXTURES.every(
      (fixture) =>
        fixture.syntheticStructureOnly === true &&
        fixture.ownerGoldenDogfood === false,
    ),
    true,
  );
  assert.match(SYNTHETIC_FIXTURES[2].text, /전적으로 가상/);
  assert.match(SYNTHETIC_FIXTURES[2].text, /유효일/);
  assert.match(SYNTHETIC_FIXTURES[2].text, /요건별.*포섭/);
  assert.match(SYNTHETIC_FIXTURES[2].text, /반대 해석/);
});

for (const fixture of SYNTHETIC_FIXTURES) {
  test(`${fixture.subject} exposes one valid optional four-block projection only after the independent attempt`, async () => {
    const { runtime, repository, calls, now } = harness(fixture);
    let view = await prepareAttempt(runtime, fixture);
    assert.equal(view.aiReference, null);
    assert.equal(view.assistance.independentAttemptBeforeHelp, true);
    assert.equal(view.assistance.answerExposure, "none");

    view = (
      await runtime.requestAssistance({
        sessionId: view.sessionId,
        recordVersion: view.recordVersion,
        questionText: "가상 10초 확인 질문을 기존 Question Chain에 연결합니다.",
        revealFull: true,
      })
    ).view;
    assert.equal(calls.reference, 1);
    assert.ok(view.aiReference);
    const ladder = view.aiReference.explanationLadder;
    assert.ok(ladder);
    assert.equal(isOwnerAlphaExplanationLadderV1(ladder), true);
    assert.equal(ladder.parentReferenceId, view.aiReference.referenceId);
    assert.equal(ladder.subject, fixture.subject);
    assert.deepEqual(
      ladder.blocks.map((block) => block.blockType),
      fixture.blockTypes,
    );
    assert.equal(
      ownerAlphaExplanationLadderReleaseBlockers({
        ladder,
        parentReference: view.aiReference,
        subject: fixture.subject,
        checkQuestionIds: view.questionChain.entries.map(
          (entry) => entry.questionId,
        ),
      }).length,
      0,
    );
    assert.equal(isOwnerAlphaPracticeSession(await repository.load(view.sessionId)), true);
    assert.equal(JSON.stringify(ladder).includes("가상 L1 구조 설명"), false);
    assert.equal(JSON.stringify(ladder).includes("가상 L2 핵심 구조"), false);
    assert.equal(JSON.stringify(ladder).includes("가상 L3 확인 구조"), false);

    if (fixture.subject === "appraisal_practical") {
      assert.equal(view.calculationChecks.length, 1);
      assert.equal(view.calculationChecks[0].status, "validated");
      assert.deepEqual(ladder.blocks[3].calculationNodeIds, [
        "synthetic-allocation-node",
      ]);
      assert.ok(ladder.blocks[3].checkQuestionId);
    }
    if (fixture.subject === "appraisal_theory") {
      assert.equal(
        ownerAlphaExplanationBlockLabel("exam_answer_one_line"),
        "시험 답안 한 줄",
      );
      assert.equal(view.calculationChecks.length, 0);
    }
    if (fixture.subject === "appraisal_compensation_law") {
      assert.equal(
        view.aiReference.claims.every(
          (claim) =>
            claim.state === "ai_inference" ||
            claim.state === "unresolved_needs_review",
        ),
        true,
      );
      assert.equal(
        view.aiReference.claims.some(
          (claim) => claim.state === "official_source_grounded",
        ),
        false,
      );
    }

    view = (
      await runtime.requestAssistance({
        sessionId: view.sessionId,
        recordVersion: view.recordVersion,
        questionText: null,
        revealFull: true,
      })
    ).view;
    assert.equal(calls.reference, 1, "the ladder reuses the existing provider response");

    const completed = await runtime.completeRewrite({
      sessionId: view.sessionId,
      recordVersion: view.recordVersion,
      mode: fixture.canonicalRewriteMode,
      subjectMode: fixture.rewriteMode,
      rewriteText: "가상 간극 하나를 기준으로 구조를 직접 다시 작성했습니다.",
      inferredMisunderstanding: "가상 구조의 연결 순서를 놓쳤습니다.",
      successCriteria: "같은 구조를 도움 없이 다시 재현합니다.",
    });
    assert.equal(completed.status, "completed");
    assert.equal(completed.rewrite.subjectMode, fixture.rewriteMode);
    assert.equal(Date.parse(completed.fixedD1DueAt) - now.getTime(), 86_400_000);
    assert.ok(completed.links.reviewQueueItemId);
    assert.ok(completed.links.todayActionSeedId);
    assert.ok(completed.links.learningRecordId);
    assert.deepEqual(repository.evidence, {
      attempts: 1,
      rewrites: 1,
      completions: 1,
      usage: 2,
    });
  });
}

test("adapter-less v0 remains valid through completion and D+1 when the projection is absent", async () => {
  const fixture = SYNTHETIC_FIXTURES[0];
  const { runtime, repository } = harness(fixture, {
    mutate(draft) {
      delete draft.reference.explanationLadder;
    },
  });
  const current = await runtime.create({
    problemText: fixture.text,
    files: [],
    inputModality: "typed",
    subject: fixture.subject,
  });
  const legacy = clone(current);
  delete legacy.visibleHints;
  delete legacy.problemModel.subjectAdapter;
  legacy.subject = "감정평가실무";
  legacy.problemModel.subject = "감정평가실무";
  repository.rows.set(legacy.sessionId, clone(legacy));
  assert.equal(isOwnerAlphaPracticeSession(legacy), true);

  let view = await runtime.get(legacy.sessionId);
  view = await runtime.confirmProblem({
    sessionId: view.sessionId,
    recordVersion: view.recordVersion,
    confirmedProblemText: view.confirmedProblemText,
  });
  view = await runtime.saveIndependentAttempt({
    sessionId: view.sessionId,
    recordVersion: view.recordVersion,
    attemptText: "기존 v0 가상 실무 세션에서 독립 시도를 계속합니다.",
    elapsedTimeMs: 90_000,
    confidence: "medium",
  });
  view = (
    await runtime.requestAssistance({
      sessionId: view.sessionId,
      recordVersion: view.recordVersion,
      questionText: null,
      revealFull: true,
    })
  ).view;
  assert.equal(view.aiReference.explanationLadder, undefined);
  const completed = await runtime.completeRewrite({
    sessionId: view.sessionId,
    recordVersion: view.recordVersion,
    mode: "recalculate",
    rewriteText: "기존 v0 계산과 구조를 직접 다시 완성했습니다.",
    inferredMisunderstanding: "자료 역할과 계산 순서를 다시 확인했습니다.",
    successCriteria: "같은 문제를 도움 없이 다시 계산합니다.",
  });
  assert.equal(completed.status, "completed");
  assert.equal(completed.problemModel.subjectAdapter, undefined);
  assert.equal(completed.aiReference.explanationLadder, undefined);
  assert.ok(completed.fixedD1DueAt);
  assert.ok(completed.links.reviewQueueItemId);
  assert.equal(isOwnerAlphaPracticeSession(await repository.load(completed.sessionId)), true);
});

function hostileReference(fixture = SYNTHETIC_FIXTURES[0]) {
  const input = {
    sessionId: "hostile-ladder-session",
    generatedAt: "2026-07-22T00:00:00.000Z",
    checkQuestionIds: ["hostile-check-question"],
  };
  const draft = referenceDraft(input, fixture);
  const problemModel = compileOwnerAlphaPracticeProblem({
    problemId: input.sessionId,
    problemText: fixture.text,
    subject: fixture.subject,
  });
  return { input, draft, problemModel };
}

test("exact membership and exact metadata keys reject duplicate, missing, foreign, partial, and copied-body blocks", () => {
  const { draft } = hostileReference();
  const valid = draft.reference.explanationLadder;
  assert.equal(isOwnerAlphaExplanationLadderV1(valid), true);

  const duplicate = clone(valid);
  duplicate.blocks[1].blockType = duplicate.blocks[0].blockType;
  assert.equal(isOwnerAlphaExplanationLadderV1(duplicate), false);

  const missing = clone(valid);
  missing.blocks.pop();
  assert.equal(isOwnerAlphaExplanationLadderV1(missing), false);

  const foreign = clone(valid);
  foreign.subject = "appraisal_theory";
  assert.equal(isOwnerAlphaExplanationLadderV1(foreign), false);

  const copiedBody = clone(valid);
  copiedBody.blocks[0].body = "복제되어서는 안 되는 가상 본문";
  assert.equal(isOwnerAlphaExplanationLadderV1(copiedBody), false);

  const partial = clone(valid);
  delete partial.blocks[3].claimIds;
  assert.deepEqual(
    ownerAlphaExplanationLadderReleaseBlockers({
      ladder: partial,
      parentReference: draft.reference,
      subject: "appraisal_practical",
      checkQuestionIds: ["hostile-check-question"],
    }),
    ["explanation_ladder:invalid_contract"],
  );

  const separateReleaseAuthority = clone(valid);
  separateReleaseAuthority.releaseStatus = "released";
  assert.equal(isOwnerAlphaExplanationLadderV1(separateReleaseAuthority), false);
});

test("section, claim, calculation, parent, subject, and question bindings fail closed", () => {
  const { draft } = hostileReference();
  const context = (ladder, subject = "appraisal_practical") =>
    ownerAlphaExplanationLadderReleaseBlockers({
      ladder,
      parentReference: draft.reference,
      subject,
      checkQuestionIds: ["hostile-check-question"],
    });

  const invalidSection = clone(draft.reference.explanationLadder);
  invalidSection.blocks[0].sectionIndex = 99;
  assert.ok(
    context(invalidSection).includes(
      "explanation_ladder:invalid_section:solution_direction",
    ),
  );

  const unboundClaim = clone(draft.reference.explanationLadder);
  unboundClaim.blocks[0].claimIds = ["foreign-claim"];
  assert.ok(
    context(unboundClaim).includes(
      "explanation_ladder:unbound_claim:solution_direction",
    ),
  );

  const missingCalculation = clone(draft.reference.explanationLadder);
  missingCalculation.blocks[2].calculationNodeIds = [];
  assert.ok(
    context(missingCalculation).includes(
      "explanation_ladder:missing_calculation:calculation_or_method_trap",
    ),
  );

  const irrelevantCalculation = clone(draft.reference.explanationLadder);
  irrelevantCalculation.blocks[2].claimIds = [
    "appraisal_practical-direction-claim",
  ];
  assert.ok(
    context(irrelevantCalculation).includes(
      "explanation_ladder:irrelevant_calculation:calculation_or_method_trap",
    ),
  );

  const orphanParent = clone(draft.reference);
  orphanParent.calculationGraph.nodes.push({
    ...calculationNode(),
    nodeId: "orphan-calculation-node",
    claimId: null,
  });
  const orphanCalculation = clone(draft.reference.explanationLadder);
  orphanCalculation.blocks[0].calculationNodeIds = [
    "orphan-calculation-node",
  ];
  assert.ok(
    ownerAlphaExplanationLadderReleaseBlockers({
      ladder: orphanCalculation,
      parentReference: orphanParent,
      subject: "appraisal_practical",
      checkQuestionIds: ["hostile-check-question"],
    }).includes("explanation_ladder:irrelevant_calculation:solution_direction"),
  );

  const invalidQuestion = clone(draft.reference.explanationLadder);
  invalidQuestion.blocks[3].checkQuestionId = "foreign-question";
  assert.ok(
    context(invalidQuestion).includes(
      "explanation_ladder:invalid_question:ten_second_calculation_or_method_check",
    ),
  );

  const foreignParent = clone(draft.reference.explanationLadder);
  foreignParent.parentReferenceId = "foreign-reference";
  assert.ok(
    context(foreignParent).includes(
      "explanation_ladder:foreign_parent_reference",
    ),
  );

  const theory = hostileReference(SYNTHETIC_FIXTURES[1]);
  assert.ok(
    ownerAlphaExplanationLadderReleaseBlockers({
      ladder: theory.draft.reference.explanationLadder,
      parentReference: theory.draft.reference,
      subject: "appraisal_practical",
      checkQuestionIds: ["hostile-check-question"],
    }).includes("explanation_ladder:foreign_subject"),
  );
});

test("Practical deterministic calculation and method conflicts both fail closed", () => {
  const conflictingNode = calculationNode(610_000_000);
  const checks = validateOwnerAlphaCalculationGraph({ nodes: [conflictingNode] });
  assert.equal(checks[0].status, "conflict");
  assert.ok(ownerAlphaCalculationReleaseBlockers(checks).length > 0);

  const { problemModel } = hostileReference();
  const methodBlockers = ownerAlphaSubjectReferenceReleaseBlockers({
    problemModel,
    claims: [
      {
        claimId: "hostile-method-conflict",
        claimType: "method",
        summary: "가상 방법 충돌",
        state: "unresolved_needs_review",
        critical: true,
        evidenceRefIds: [],
        calculationNodeId: null,
        resolutionCode: "deterministic_conflict",
      },
    ],
  });
  assert.ok(
    methodBlockers.includes(
      "practical:method_conflict:hostile-method-conflict",
    ),
  );
  const nonCriticalCalculationBlockers =
    ownerAlphaSubjectReferenceReleaseBlockers({
      problemModel,
      claims: [
        {
          claimId: "hostile-non-critical-calculation-conflict",
          claimType: "formula",
          summary: "가상 비critical 계산 충돌",
          state: "unresolved_needs_review",
          critical: false,
          evidenceRefIds: [],
          calculationNodeId: "hostile-non-critical-node",
          resolutionCode: "deterministic_conflict",
        },
      ],
    });
  assert.ok(
    nonCriticalCalculationBlockers.includes(
      "practical:calculation_conflict:hostile-non-critical-calculation-conflict",
    ),
  );
});

test("Theory calculation-backed formula and number claims never become learner-facing deterministic scoring", async () => {
  const fixture = SYNTHETIC_FIXTURES[1];
  const { runtime, repository } = harness(fixture, {
    mutate(draft) {
      delete draft.reference.explanationLadder;
      const node = {
        nodeId: "hostile-theory-score-node",
        claimId: "hostile-theory-score-claim",
        label: "가상 이론 점수 산술",
        primitive: "sum",
        values: [40, 40],
        claimedResult: 80,
        resultUnit: "점",
        critical: true,
      };
      draft.reference.claims = [
        {
          claimId: node.claimId,
          claimType: "number",
          summary: "가상 이론 점수 주장",
          state: "ai_inference",
          critical: true,
          evidenceRefIds: [],
          calculationNodeId: node.nodeId,
          resolutionCode: "provider_only",
        },
      ];
      draft.reference.calculationGraph.nodes = [node];
      draft.variant.calculationGraph.nodes = [
        { ...node, nodeId: "hostile-theory-variant-score-node" },
      ];
    },
  });
  let view = await prepareAttempt(runtime, fixture);
  view = (
    await runtime.requestAssistance({
      sessionId: view.sessionId,
      recordVersion: view.recordVersion,
      questionText: null,
      revealFull: true,
    })
  ).view;
  assert.equal(view.aiReference, null);
  assert.equal(view.status, "reference_withheld");
  assert.deepEqual(view.calculationChecks, []);
  const stored = await repository.load(view.sessionId);
  assert.equal(stored.aiReference.releaseStatus, "withheld");
  assert.ok(
    stored.aiReference.blockerCodes.some((code) =>
      code.startsWith("theory:substantive_claim_not_deterministic:"),
    ),
  );
  assert.equal(
    stored.aiReference.claims.every(
      (claim) => claim.state !== "deterministically_validated",
    ),
    true,
  );
  assert.equal(stored.variant.verificationState, "unresolved_needs_review");
  for (const generatedReferenceText of [
    "학습자 답안은 80점이며 정답으로 확정한다.",
    "80점짜리 답안으로 확정 평가한다.",
    "이 답안은 정답이다.",
    "답안 등급은 A로 확정한다.",
  ]) {
    assert.ok(
      ownerAlphaSubjectReferenceReleaseBlockers({
        problemModel: stored.problemModel,
        claims: [
          {
            claimId: "hostile-theory-prose-score",
            claimType: "concept",
            summary: "가상 점수 확정 문구",
            state: "ai_inference",
            critical: true,
            evidenceRefIds: [],
            calculationNodeId: null,
            resolutionCode: "provider_only",
          },
        ],
        generatedReferenceText,
      }).includes("theory:substantive_scoring_claim"),
    );
  }
});

test("Theory ladder rejects calculation binding even when the parent node exists", () => {
  const { draft } = hostileReference(SYNTHETIC_FIXTURES[1]);
  const node = {
    ...calculationNode(),
    nodeId: "theory-existing-node",
    claimId: draft.reference.claims[0].claimId,
  };
  draft.reference.claims[0].calculationNodeId = node.nodeId;
  draft.reference.calculationGraph.nodes = [node];
  draft.reference.explanationLadder.blocks[0].calculationNodeIds = [node.nodeId];
  const blockers = ownerAlphaExplanationLadderReleaseBlockers({
    ladder: draft.reference.explanationLadder,
    parentReference: draft.reference,
    subject: "appraisal_theory",
    checkQuestionIds: ["hostile-check-question"],
  });
  assert.ok(
    blockers.includes(
      "explanation_ladder:theory_substantive_scoring_prohibited",
    ),
  );
});

test("Law stays candidate-only and blocks fabricated articles, cases, empty sources, and unknown effective versions", async () => {
  const fixture = SYNTHETIC_FIXTURES[2];
  const { problemModel } = hostileReference(fixture);
  const fabricatedArticle = ownerAlphaSubjectReferenceReleaseBlockers({
    problemModel,
    claims: claimsFor(fixture),
    generatedReferenceText: "가상 Provider가 공익사업법 제999조를 생성했다.",
  });
  assert.ok(fabricatedArticle.includes("law:unbound_article_reference"));
  const foreignStatute = ownerAlphaSubjectReferenceReleaseBlockers({
    problemModel,
    claims: claimsFor(fixture),
    generatedReferenceText:
      "가상 Provider가 가상보상법 제10조 제1항을 확정 적용했다.",
  });
  assert.ok(foreignStatute.includes("law:unbound_article_reference"));
  for (const generatedReferenceText of [
    "가상 Provider가 가상보상 법 제10조 제1항을 확정 적용했다.",
    "가상 Provider가 가상 보상에 관한 법률 제10조 제1항을 확정 적용했다.",
  ]) {
    assert.ok(
      ownerAlphaSubjectReferenceReleaseBlockers({
        problemModel,
        claims: claimsFor(fixture),
        generatedReferenceText,
      }).includes("law:unbound_article_reference"),
    );
  }
  assert.ok(
    ownerAlphaSubjectReferenceReleaseBlockers({
      problemModel,
      claims: claimsFor(fixture),
      generatedReferenceText:
        "2099.01.01 시행 법령 버전을 확정 적용한다.",
    }).includes("law:unbound_effective_date_reference"),
  );
  const boundProblemReferences = ownerAlphaSubjectReferenceReleaseBlockers({
    problemModel,
    claims: claimsFor(fixture),
    generatedReferenceText:
      "공익사업법 제10조 제1항과 법률 조문의 유효일 2026.07.04를 문제 제공 후보로 연결한다.",
  });
  assert.equal(
    boundProblemReferences.includes("law:unbound_article_reference"),
    false,
  );
  assert.equal(
    boundProblemReferences.includes("law:unbound_effective_date_reference"),
    false,
  );
  const twoDigitCase = ownerAlphaSubjectReferenceReleaseBlockers({
    problemModel,
    claims: claimsFor(fixture),
    generatedReferenceText: "가상 Provider가 대법원 99두9999 판결을 생성했다.",
  });
  assert.ok(
    twoDigitCase.includes("law:unbound_case_or_adjudication_reference"),
  );
  const fabricatedAdjudication = ownerAlphaSubjectReferenceReleaseBlockers({
    problemModel,
    claims: claimsFor(fixture),
    generatedReferenceText:
      "가상 Provider가 중앙토지수용위원회 2099년 제999호 재결례를 생성했다.",
  });
  assert.ok(
    fabricatedAdjudication.includes(
      "law:unbound_case_or_adjudication_reference",
    ),
  );
  assert.ok(
    ownerAlphaSubjectReferenceReleaseBlockers({
      problemModel,
      claims: [
        {
          claimId: "hostile-law-deterministic-claim",
          claimType: "number",
          summary: "가상 법규 산술 주장",
          state: "deterministically_validated",
          critical: false,
          evidenceRefIds: [],
          calculationNodeId: "hostile-law-node",
          resolutionCode: "supported",
        },
      ],
    }).includes(
      "law:candidate_only_claim_required:hostile-law-deterministic-claim",
    ),
  );

  const emptySource = clone(problemModel);
  emptySource.subjectAdapter.applicableLawCandidates = [
    {
      label: "가상 법률 후보",
      state: "official_source_grounded",
      officialSourceRefId: " ",
    },
  ];
  assert.equal(isOwnerAlphaSubjectAdapterModel(emptySource.subjectAdapter), false);
  assert.ok(
    ownerAlphaSubjectReferenceReleaseBlockers({
      problemModel: emptySource,
      claims: [],
    }).includes("law:official_source_promotion_without_reference"),
  );

  const ordinaryDateModel = compileOwnerAlphaPracticeProblem({
    problemId: "ordinary-date-law",
    problemText:
      "전적으로 가상인 보상 사례이다. 거래일은 2026.07.04이고 사업일은 2026.07.05이다. 공익사업법 제10조 제1항의 요건과 포섭을 후보로 검토하시오.",
    subject: "appraisal_compensation_law",
  });
  assert.equal(
    ordinaryDateModel.subjectAdapter.effectiveDateRequirement.effectiveAt,
    null,
  );
  assert.ok(
    ownerAlphaSubjectReferenceReleaseBlockers({
      problemModel: ordinaryDateModel,
      claims: [],
    }).includes("law:effective_date_unknown"),
  );

  for (const [problemId, problemText] of [
    [
      "ordinary-date-with-unresolved-version",
      "공익사업법 제10조 제1항이 문제된다. 거래일은 2026.07.04이고 법령 기준일은 별도 확인하라.",
    ],
    [
      "project-date-with-unknown-effective-date",
      "공익사업법 제10조 제1항이 문제된다. 사업일은 2026.07.04이고 조문 유효일은 알려지지 않았다.",
    ],
    [
      "malformed-effective-date",
      "법률 조문의 유효일은 2026.99.99이다. 공익사업법 제10조 제1항을 검토하라.",
    ],
    [
      "month-only-effective-version",
      "법률 조문의 유효일은 2026.07이다. 공익사업법 제10조 제1항을 검토하라.",
    ],
  ]) {
    const model = compileOwnerAlphaPracticeProblem({
      problemId,
      problemText,
      subject: "appraisal_compensation_law",
    });
    assert.equal(
      model.subjectAdapter.effectiveDateRequirement.effectiveAt,
      null,
    );
    assert.ok(
      ownerAlphaSubjectReferenceReleaseBlockers({
        problemModel: model,
        claims: [],
      }).includes("law:effective_date_unknown"),
    );
  }

  const lawHarness = harness(fixture, {
    mutate(draft) {
      delete draft.reference.explanationLadder;
      const node = {
        ...calculationNode(),
        nodeId: "hostile-law-calculation-node",
        claimId: "hostile-law-calculation-claim",
      };
      draft.reference.claims = [
        {
          claimId: node.claimId,
          claimType: "number",
          summary: "가상 법규 계산 후보",
          state: "ai_inference",
          critical: false,
          evidenceRefIds: [],
          calculationNodeId: node.nodeId,
          resolutionCode: "provider_only",
        },
      ];
      draft.reference.calculationGraph.nodes = [node];
      draft.variant.calculationGraph.nodes = [
        { ...node, nodeId: "hostile-law-variant-node" },
      ];
    },
  });
  let lawView = await prepareAttempt(lawHarness.runtime, fixture);
  lawView = (
    await lawHarness.runtime.requestAssistance({
      sessionId: lawView.sessionId,
      recordVersion: lawView.recordVersion,
      questionText: null,
      revealFull: true,
    })
  ).view;
  const storedLaw = await lawHarness.repository.load(lawView.sessionId);
  assert.equal(
    storedLaw.aiReference.claims.every(
      (claim) => claim.state !== "deterministically_validated",
    ),
    true,
  );
  assert.equal(storedLaw.variant.verificationState, "unresolved_needs_review");
});

test("Law basis-form statute dates are version-bound without promoting ordinary appraisal dates", () => {
  const problemModel = compileOwnerAlphaPracticeProblem({
    problemId: "synthetic-law-basis-version-reference",
    problemText:
      "전적으로 가상인 사례이다. 문제에서 제공하는 법률 조문의 유효일은 2026.07.04이다. 공익사업법 제10조 제1항을 검토하라.",
    subject: "appraisal_compensation_law",
  });
  const blockersFor = (generatedReferenceText) =>
    ownerAlphaSubjectReferenceReleaseBlockers({
      problemModel,
      claims: [],
      generatedReferenceText,
    });

  for (const generatedReferenceText of [
    "2099.01.01 기준 공익사업법 제10조를 적용한다.",
    "공익사업법 제10조(2099.01.01 기준)를 적용한다.",
    "２０９９．０１．０１　기준，공익사업법 제１０조를 적용한다.",
    "공익사업법 제１０조［２０９９／０１／０１ 기준］을 적용한다.",
    "2099 . 01 . 01 기준 — 공익사업법 제 10 조를 적용한다.",
    "공익사업법 제10조 : 2099년 1월 1일을 기준으로 적용한다.",
    "2099.01.01. 기준 「공익사업법」 제10조를 적용한다.",
    "「공익사업법」 제10조【2099.01.01, 기준】을 적용한다.",
    "공익사업법 제10조는 2099.01.01 기준으로 적용한다.",
    "공익사업법 제10조를 2099.01.01 기준으로 적용한다.",
    "제10조는 2099.01.01 기준으로 적용한다.",
    "제10조상 2099.01.01 기준으로 적용한다.",
    "제10조에 2099.01.01 기준으로 적용한다.",
    "2099.01.01 기준 제10조를 적용한다.",
    "2099.01.01 기준으로 공익사업법상 제10조를 적용한다.",
    "2099.01.01 기준으로 공익사업법의 제10조를 적용한다.",
    "2099.01.01 기준으로는 공익사업법 제10조를 적용한다.",
    "2099.01.01 기준은 공익사업법 제10조를 적용한다.",
    "2099.01.01 기준일에는 공익사업법 제10조를 적용한다.",
    "2099.01.01을 기준일로 공익사업법 제10조를 적용한다.",
    "2099.01.01을 기준일로서 공익사업법 제10조를 적용한다.",
    "2099.01.01을 기준일자로 공익사업법 제10조를 적용한다.",
    "2099.01.01을 법령 기준일자로 공익사업법 제10조를 적용한다.",
    "2099.01.01을 법률의 기준일자로 공익사업법 제10조를 적용한다.",
    "2099.01.01은 조문 기준일자이며 공익사업법 제10조를 적용한다.",
    "2099.01.01을 적용 기준일자로 공익사업법 제10조를 적용한다.",
    "2099.01.01 기준이며 공익사업법 제10조를 적용한다.",
    "2099.01.01 기준이고 공익사업법 제10조를 적용한다.",
    "2099.01.01 기준이므로 공익사업법 제10조를 적용한다.",
    "2099.01.01 기준이지만 공익사업법 제10조를 적용한다.",
    "2099.01.01 기준으로서 공익사업법 제10조를 적용한다.",
    "2099.01.01을 법령 기준일로서 공익사업법 제10조를 적용한다.",
    "2099.01.01을 법령상 기준일로써 공익사업법 제10조를 적용한다.",
    "2099.01.01은 법령 기준일이며 공익사업법 제10조를 적용한다.",
    "2099.01.01이 법령 기준일인 공익사업법 제10조를 적용한다.",
    "2099.01.01 기준일 현재 공익사업법 제10조를 적용한다.",
    "2099.01.01 기준일 당시의 공익사업법 제10조를 적용한다.",
    "법령 기준일로서 2099.01.01 공익사업법 제10조를 적용한다.",
    "법령 기준일로써 2099.01.01 공익사업법 제10조를 적용한다.",
    "법령 기준일로 ２０９９／０１／０１，공익사업법 제１０조를 적용한다.",
    "법령 기준일이며 2099.01.01 공익사업법 제10조를 적용한다.",
    "법령 기준일로서：(２０９９／０１／０１） 공익사업법 제１０조를 적용한다.",
    "법령 기준일자는 2099.01.01이다. 공익사업법 제10조를 적용한다.",
    "법령 기준일자로는 2099.01.01이다. 공익사업법 제10조를 적용한다.",
    "법령 기준일자에는 2099.01.01이다. 공익사업법 제10조를 적용한다.",
    "법령상 기준일자는 2099.01.01이다. 공익사업법 제10조를 적용한다.",
    "법률의 기준일자: 2099.01.01, 공익사업법 제10조를 적용한다.",
    "조문 기준일자는 2099.01.01이다. 공익사업법 제10조를 적용한다.",
    "공익사업법 제10조 법령 기준일자는 2099.01.01이다.",
    "적용 기준일자: 2099.01.01, 공익사업법 제10조를 적용한다.",
    "공익사업법 제10조(기준일: 2099.01.01)를 적용한다.",
    "제10조의 기준일은 2099.01.01이다.",
    "공익사업법 제10조에 따른 기준일은 2099.01.01이다.",
    "공익사업법 제10조에 의한 기준일은 2099.01.01이다.",
    "공익사업법 제10조에서 정한 기준일은 2099.01.01이다.",
    "공익사업법 기준일은 2099.01.01이다.",
    "공익사업법의 기준일: 2099.01.01이다.",
    "공익사업법은 2099.01.01 기준으로 적용한다.",
    "2099.01.01 기준 공익사업법을 적용한다.",
    "기준일: 2099.01.01 공익사업법을 적용한다.",
    "기준일: (2099.01.01) 공익사업법 제10조를 적용한다.",
    "공익사업법 제１０조［기준일：（２０９９／０１／０１）］을 적용한다.",
    "2099.01.01 기준 공 익 사 업 법 상 제 10 조를 적용한다.",
    "2099.01.01\n기준:\n공익사업법 제10조를 적용한다.",
  ]) {
    assert.deepEqual(
      blockersFor(generatedReferenceText),
      ["law:unbound_effective_date_reference"],
      generatedReferenceText,
    );
  }

  for (const generatedReferenceText of [
    "2026.07.04 기준 공익사업법 제10조를 적용한다.",
    "공익사업법 제10조(2026.07.04 기준)를 적용한다.",
    "２０２６．０７．０４　기준，공익사업법 제１０조를 적용한다.",
    "공익사업법 제１０조［２０２６／０７／０４ 기준］을 적용한다.",
    "2026 . 07 . 04 기준 — 공익사업법 제 10 조를 적용한다.",
    "2026.07.04. 기준 「공익사업법」 제10조를 적용한다.",
    "「공익사업법」 제10조【2026.07.04, 기준】을 적용한다.",
    "공익사업법 제10조는 2026.07.04 기준으로 적용한다.",
    "공익사업법 제10조를 2026.07.04 기준으로 적용한다.",
    "제10조는 2026.07.04 기준으로 적용한다.",
    "제10조상 2026.07.04 기준으로 적용한다.",
    "제10조에 2026.07.04 기준으로 적용한다.",
    "2026.07.04 기준 제10조를 적용한다.",
    "2026.07.04 기준으로 공익사업법상 제10조를 적용한다.",
    "2026.07.04 기준으로 공익사업법의 제10조를 적용한다.",
    "2026.07.04 기준으로는 공익사업법 제10조를 적용한다.",
    "2026.07.04 기준은 공익사업법 제10조를 적용한다.",
    "2026.07.04 기준일에는 공익사업법 제10조를 적용한다.",
    "2026.07.04을 기준일로 공익사업법 제10조를 적용한다.",
    "2026.07.04을 기준일로서 공익사업법 제10조를 적용한다.",
    "2026.07.04을 기준일자로 공익사업법 제10조를 적용한다.",
    "2026.07.04을 법령 기준일자로 공익사업법 제10조를 적용한다.",
    "2026.07.04을 법률의 기준일자로 공익사업법 제10조를 적용한다.",
    "2026.07.04은 조문 기준일자이며 공익사업법 제10조를 적용한다.",
    "2026.07.04을 적용 기준일자로 공익사업법 제10조를 적용한다.",
    "2026.07.04 기준이며 공익사업법 제10조를 적용한다.",
    "2026.07.04 기준이고 공익사업법 제10조를 적용한다.",
    "2026.07.04 기준이므로 공익사업법 제10조를 적용한다.",
    "2026.07.04 기준이지만 공익사업법 제10조를 적용한다.",
    "2026.07.04 기준으로서 공익사업법 제10조를 적용한다.",
    "2026.07.04을 법령 기준일로서 공익사업법 제10조를 적용한다.",
    "2026.07.04을 법령상 기준일로써 공익사업법 제10조를 적용한다.",
    "2026.07.04은 법령 기준일이며 공익사업법 제10조를 적용한다.",
    "2026.07.04이 법령 기준일인 공익사업법 제10조를 적용한다.",
    "2026.07.04 기준일 현재 공익사업법 제10조를 적용한다.",
    "2026.07.04 기준일 당시의 공익사업법 제10조를 적용한다.",
    "법령 기준일로서 2026.07.04 공익사업법 제10조를 적용한다.",
    "법령 기준일로써 2026.07.04 공익사업법 제10조를 적용한다.",
    "법령 기준일로 ２０２６／０７／０４，공익사업법 제１０조를 적용한다.",
    "법령 기준일이며 2026.07.04 공익사업법 제10조를 적용한다.",
    "법령 기준일로서：(２０２６／０７／０４） 공익사업법 제１０조를 적용한다.",
    "법령 기준일자는 2026.07.04이다. 공익사업법 제10조를 적용한다.",
    "법령 기준일자로는 2026.07.04이다. 공익사업법 제10조를 적용한다.",
    "법령 기준일자에는 2026.07.04이다. 공익사업법 제10조를 적용한다.",
    "법령상 기준일자는 2026.07.04이다. 공익사업법 제10조를 적용한다.",
    "법률의 기준일자: 2026.07.04, 공익사업법 제10조를 적용한다.",
    "조문 기준일자는 2026.07.04이다. 공익사업법 제10조를 적용한다.",
    "공익사업법 제10조 법령 기준일자는 2026.07.04이다.",
    "적용 기준일자: 2026.07.04, 공익사업법 제10조를 적용한다.",
    "공익사업법 제10조(기준일: 2026.07.04)를 적용한다.",
    "제10조의 기준일은 2026.07.04이다.",
    "공익사업법 제10조에 따른 기준일은 2026.07.04이다.",
    "공익사업법 제10조에 의한 기준일은 2026.07.04이다.",
    "공익사업법 제10조에서 정한 기준일은 2026.07.04이다.",
    "공익사업법 기준일은 2026.07.04이다.",
    "공익사업법의 기준일: 2026.07.04이다.",
    "공익사업법은 2026.07.04 기준으로 적용한다.",
    "2026.07.04 기준 공익사업법을 적용한다.",
    "기준일: 2026.07.04 공익사업법을 적용한다.",
    "기준일: (2026.07.04) 공익사업법 제10조를 적용한다.",
    "공익사업법 제１０조［기준일：（２０２６／０７／０４）］을 적용한다.",
    "2026.07.04 기준 공 익 사 업 법 상 제 10 조를 적용한다.",
    "2026.07.04\n기준:\n공익사업법 제10조를 적용한다.",
  ]) {
    assert.deepEqual(
      blockersFor(generatedReferenceText),
      [],
      generatedReferenceText,
    );
  }

  for (const shortStatute of ["민법", "헌법"]) {
    const shortStatuteModel = compileOwnerAlphaPracticeProblem({
      problemId: `synthetic-short-statute-${shortStatute}`,
      problemText: `법률 조문의 유효일은 2026.07.04이다. ${shortStatute} 제10조를 검토하라.`,
      subject: "appraisal_compensation_law",
    });
    const shortStatuteBlockersFor = (generatedReferenceText) =>
      ownerAlphaSubjectReferenceReleaseBlockers({
        problemModel: shortStatuteModel,
        claims: [],
        generatedReferenceText,
      });
    assert.deepEqual(
      shortStatuteBlockersFor(
        `2099.01.01 기준 ${shortStatute} 제10조를 적용한다.`,
      ),
      ["law:unbound_effective_date_reference"],
    );
    assert.deepEqual(
      shortStatuteBlockersFor(
        `${shortStatute} 제10조(2099.01.01 기준)를 적용한다.`,
      ),
      ["law:unbound_effective_date_reference"],
    );
    assert.deepEqual(
      shortStatuteBlockersFor(
        `2026.07.04 기준 ${shortStatute} 제10조를 적용한다.`,
      ),
      [],
    );
    assert.deepEqual(
      shortStatuteBlockersFor(
        `${shortStatute} 제10조(2026.07.04 기준)를 적용한다.`,
      ),
      [],
    );
  }

  const legalBasisDateProblemModel = compileOwnerAlphaPracticeProblem({
    problemId: "synthetic-law-label-first-basis-date",
    problemText:
      "법령 기준일자는 2026.07.04이다. 공익사업법 제10조를 검토하라.",
    subject: "appraisal_compensation_law",
  });
  assert.equal(
    legalBasisDateProblemModel.subjectAdapter.effectiveDateRequirement
      .effectiveAt,
    "2026.07.04",
  );
  assert.deepEqual(
    ownerAlphaSubjectReferenceReleaseBlockers({
      problemModel: legalBasisDateProblemModel,
      claims: [],
      generatedReferenceText:
        "공익사업법 제10조의 법령 기준일자는 2099.01.01이다.",
    }),
    ["law:unbound_effective_date_reference"],
  );
  assert.deepEqual(
    ownerAlphaSubjectReferenceReleaseBlockers({
      problemModel: legalBasisDateProblemModel,
      claims: [],
      generatedReferenceText:
        "공익사업법 제10조의 법령 기준일자는 2026.07.04이다.",
    }),
    [],
  );
  assert.ok(
    blockersFor(
      "공익사업법 제10조의 법령 기준일자는 미상이며 별도 확인이 필요하다.",
    ).includes("law:effective_date_unknown"),
  );

  for (const problemText of [
    "2026.07.04을 법령 기준일자로 공익사업법 제10조를 검토하라.",
    "2026.07.04 법률의 기준일자이다. 공익사업법 제10조를 검토하라.",
    "２０２６．０７．０４을 조문 기준일자로 공익사업법 제１０조를 검토하라.",
    "법령 기준일자로는 2026.07.04이다. 공익사업법 제10조를 검토하라.",
    "적용 기준일자는 2026.07.04이다. 공익사업법 제10조를 검토하라.",
  ]) {
    const dateFirstProblemModel = compileOwnerAlphaPracticeProblem({
      problemId: "synthetic-law-date-first-basis-date",
      problemText,
      subject: "appraisal_compensation_law",
    });
    assert.equal(
      dateFirstProblemModel.subjectAdapter.effectiveDateRequirement.effectiveAt,
      "2026.07.04",
      problemText,
    );
    assert.deepEqual(
      ownerAlphaSubjectReferenceReleaseBlockers({
        problemModel: dateFirstProblemModel,
        claims: [],
        generatedReferenceText:
          "2026.07.04 기준 공익사업법 제10조를 적용한다.",
      }),
      [],
      problemText,
    );
  }

  for (const problemText of [
    "평가일인 2026.07.04을 기준일자로 정하고 공익사업법 제10조를 검토하라.",
    "2026.99.99을 법령 기준일자로 공익사업법 제10조를 검토하라.",
  ]) {
    const unboundProblemModel = compileOwnerAlphaPracticeProblem({
      problemId: "synthetic-unbound-date-first-basis-date",
      problemText,
      subject: "appraisal_compensation_law",
    });
    assert.equal(
      unboundProblemModel.subjectAdapter.effectiveDateRequirement.effectiveAt,
      null,
      problemText,
    );
  }

  for (const generatedReferenceText of [
    "거래일은 2099.01.01 기준이고 공익사업법 제10조를 검토한다.",
    "평가일은 2099.01.01 기준이며 공익사업법 제10조를 검토한다.",
    "평가일인 2099.01.01은 기준일이고 공익사업법 제10조를 검토한다.",
    "평가일은 2099.01.01 기준일 현재 공익사업법 제10조를 검토한다.",
    "평가기준일로서 2099.01.01 공익사업법 제10조를 검토한다.",
    "평가기준일이며 2099.01.01 공익사업법 제10조를 검토한다.",
    "평가기준일: 2099.01.01 공익사업법 제10조를 검토한다.",
    "평가일의 기준일: 2099.01.01 공익사업법 제10조를 검토한다.",
    "거래일 기준일: 2099.01.01 공익사업법 제10조를 검토한다.",
    "평가일에 따른 기준일: 2099.01.01 공익사업법 제10조를 검토한다.",
    "공익사업법의 평가기준일: 2099.01.01을 검토한다.",
    "공익사업법 거래일은 2099.01.01 기준으로 검토한다.",
    "평가일은 2099.01.01 기준 공익사업법을 검토한다.",
    "평가 기준일: 2099.01.01 공익사업법을 검토한다.",
    "감정평가 기준일은 2099.01.01 공익사업법을 검토한다.",
    "기준 시점은 2099.01.01 기준 공익사업법을 검토한다.",
    "거래일은 2099.01.01 기준, 공익사업법 제10조를 검토한다.",
    "평가일은 2099.01.01 기준 — 공익사업법 제10조를 검토한다.",
    "평가일인 2025.07.01 기준 공익사업법 제10조를 검토한다.",
    "제10조는 평가일인 2025.07.01 기준을 참조한다.",
    "평가일 현재 2099.01.01 기준, 공익사업법 제10조를 검토한다.",
    "평가일(가격시점)은 2099.01.01 기준, 공익사업법 제10조를 검토한다.",
    "제10조는 평가일 현재 2099.01.01 기준을 참조한다.",
    "평가일 현재의 2099.01.01 기준, 공익사업법 제10조를 검토한다.",
    "가격시점으로서 2099.01.01 기준, 공익사업법 제10조를 검토한다.",
    "평가일은 2099.01.01 기준으로는 공익사업법 제10조를 검토한다.",
    "평가일은 2099.01.01을 기준일로 공익사업법 제10조를 검토한다.",
    "2099.01.01 기준 보상액을 산정하고 공익사업법 제10조를 검토한다.",
    "2099.01.01 기준이며 보상액을 산정하고 공익사업법 제10조를 검토한다.",
    "2099.01.01 기준일 현재 보상액을 산정하고 공익사업법 제10조를 검토한다.",
    "기준일: 2099.01.01 보상액을 산정하고 공익사업법 제10조를 검토한다.",
    "공익사업법 제10조에 따른 요건을 검토하고 기준일: 2099.01.01이다.",
    "공익사업법 관련 기준일: 2099.01.01이다.",
    "사업일은 2099.01.01 기준 공익사업법 제10조를 검토한다.",
    "기준시점은 2099.01.01 기준, 공익사업법 제10조를 검토한다.",
    "감정평가일은 2099.01.01이다. 공익사업법 제10조를 검토한다.",
    "자료시점은 2099.01.01이고 공익사업법 제10조를 검토한다.",
    `2099.01.01 기준${" ".repeat(200)}공익사업법 제10조를 검토한다.`,
    `공익사업법 제10조${" ".repeat(200)}2099.01.01 기준을 검토한다.`,
  ]) {
    assert.deepEqual(
      blockersFor(generatedReferenceText),
      [],
      generatedReferenceText,
    );
  }
});

test("Law problem legal dates aggregate by canonical value and conflicts fail closed", async () => {
  const compileLaw = (problemId, problemText) =>
    compileOwnerAlphaPracticeProblem({
      problemId,
      problemText,
      subject: "appraisal_compensation_law",
    });
  const primaryConflictText =
    "법령 기준일자는 2026.07.04이다.\n적용 기준일자는 2099.01.01이다.\n공익사업법 제10조를 검토하라.";
  const conflictProblems = [
    primaryConflictText,
    "적용 기준일자는 2099.01.01이다. 법령 기준일자는 2026.07.04이다. 공익사업법 제10조를 검토하라.",
    "2026.07.04을 법령 기준일자로 정한다. 2099.01.01을 적용 기준일자로 정한다. 공익사업법 제10조를 검토하라.",
    "법령 기준일자는 2026-07-04이다. 2099년 1월 1일을 조문 기준일자로 정한다. 공익사업법 제10조를 검토하라.",
    "법령 기준일자는\n２０２６／０７／０４이다.\n적용 기준일자는\n２０９９－０１－０１이다.\n공익사업법 제１０조를 검토하라.",
    "법령 기준일자：(２０２６／０７／０４）이다. 적용 기준일자=[2099-01-01]이다. 공익사업법 제10조를 검토하라.",
    "법령 기준일자는 2026.07.04이다. 적용 기준일자는 2099.01.01이다. 조문 기준일자는 2030.12.31이다. 공익사업법 제10조를 검토하라.",
    "공익사업법의 법령 기준일자는 2026.07.04이다. 민법의 적용 기준일자는 2099.01.01이다. 공익사업법 제10조와 민법 제10조를 검토하라.",
    "법령 기준일자는 2026.07.04이다. 민법 제10조의 기준일자는 2099.01.01이다. 공익사업법 제10조와 민법 제10조를 검토하라.",
    "공익사업법 제10조의 기준일자는 2026.07.04이다. 민법 제10조의 기준일자는 2099.01.01이다.",
  ];

  for (const [index, problemText] of conflictProblems.entries()) {
    const model = compileLaw(`law-date-conflict-${index}`, problemText);
    const adapter = model.subjectAdapter;
    assert.equal(adapter.effectiveDateRequirement.effectiveAt, null, problemText);
    assert.equal(
      adapter.effectiveDateRequirement.state,
      "unresolved_needs_review",
      problemText,
    );
    assert.equal(
      adapter.articleAndParagraphReferences.every(
        (reference) => reference.effectiveAt === null,
      ),
      true,
      problemText,
    );
    assert.ok(
      adapter.unresolvedSourceOrVersionIssue.includes(
        "적용 법령의 유효일을 확인해야 합니다.",
      ),
      problemText,
    );
  }

  const conflictModel = compileLaw(
    "law-date-conflict-primary",
    primaryConflictText,
  );
  const conflictBlockersFor = (generatedReferenceText) =>
    ownerAlphaSubjectReferenceReleaseBlockers({
      problemModel: conflictModel,
      claims: [],
      generatedReferenceText,
    });
  for (const generatedReferenceText of [
    "2026.07.04 기준 공익사업법 제10조를 적용한다.",
    "2099.01.01 기준 공익사업법 제10조를 적용한다.",
    "2030.12.31 기준 공익사업법 제10조를 적용한다.",
  ]) {
    const blockers = conflictBlockersFor(generatedReferenceText);
    assert.deepEqual(
      blockers,
      ["law:effective_date_unknown", "law:unbound_effective_date_reference"],
      generatedReferenceText,
    );
    assert.equal(
      blockers.filter((code) => code === "law:effective_date_unknown").length,
      1,
    );
    assert.equal(
      blockers.filter(
        (code) => code === "law:unbound_effective_date_reference",
      ).length,
      1,
    );
  }
  assert.deepEqual(conflictBlockersFor("공익사업법 제10조를 적용한다."), [
    "law:effective_date_unknown",
  ]);

  const mixedAdjacentConflictModel = compileLaw(
    "law-date-mixed-adjacent-conflict",
    conflictProblems.at(-2),
  );
  assert.deepEqual(
    ownerAlphaSubjectReferenceReleaseBlockers({
      problemModel: mixedAdjacentConflictModel,
      claims: [],
      generatedReferenceText:
        "2026.07.04 기준 공익사업법 제10조를 적용한다.",
    }),
    ["law:effective_date_unknown", "law:unbound_effective_date_reference"],
  );

  const repeatedDateModel = compileLaw(
    "law-repeated-canonical-date",
    "법령 기준일자는 2026.07.04이다. 적용 기준일자는 2026-07-04이다. ２０２６／０７／０４을 조문 기준일자로 정한다. 공익사업법 제10조를 검토하라.",
  );
  assert.equal(
    repeatedDateModel.subjectAdapter.effectiveDateRequirement.effectiveAt,
    "2026.07.04",
  );
  assert.equal(
    repeatedDateModel.subjectAdapter.effectiveDateRequirement.state,
    "problem_given",
  );
  assert.equal(
    repeatedDateModel.subjectAdapter.articleAndParagraphReferences.every(
      (reference) => reference.effectiveAt === "2026.07.04",
    ),
    true,
  );
  assert.deepEqual(
    ownerAlphaSubjectReferenceReleaseBlockers({
      problemModel: repeatedDateModel,
      claims: [],
      generatedReferenceText:
        "２０２６／０７／０４ 기준 공익사업법 제１０조를 적용한다.",
    }),
    [],
  );

  const ordinaryControl = compileLaw(
    "law-date-plus-ordinary-controls",
    "법령 기준일자는 2026.07.04이다. 거래일은 2099.01.01, 평가일은 2099.01.02, 사업일은 2099.01.03, 기준시점은 2099.01.04, 가격시점은 2099.01.05, 자료시점은 2099.01.06, 시점수정일은 2099.01.07이다. 공익사업법 제10조를 검토하라.",
  );
  assert.equal(
    ordinaryControl.subjectAdapter.effectiveDateRequirement.effectiveAt,
    "2026.07.04",
  );
  assert.equal(
    ordinaryControl.subjectAdapter.effectiveDateRequirement.state,
    "problem_given",
  );

  for (const [problemId, problemText] of [
    ["law-date-absent", "공익사업법 제10조를 검토하라."],
    [
      "law-date-malformed",
      "법령 기준일자는 2026.99.99이다. 공익사업법 제10조를 검토하라.",
    ],
    [
      "law-date-partial",
      "적용 기준일자는 2026.07이다. 공익사업법 제10조를 검토하라.",
    ],
    [
      "law-date-unknown",
      "법령 기준일자는 미상이며 별도 확인이 필요하다. 공익사업법 제10조를 검토하라.",
    ],
    [
      "non-law-generic-valid-date",
      "보험계약 유효일은 2026.07.04이다. 공익사업법 제10조를 검토하라.",
    ],
    [
      "non-law-generic-commencement-date",
      "사업 시행일은 2026.07.04이다. 공익사업법 제10조를 검토하라.",
    ],
  ]) {
    const model = compileLaw(problemId, problemText);
    assert.equal(
      model.subjectAdapter.effectiveDateRequirement.effectiveAt,
      null,
      problemText,
    );
    assert.equal(
      model.subjectAdapter.effectiveDateRequirement.state,
      "unresolved_needs_review",
      problemText,
    );
  }

  const conflictFixture = {
    ...SYNTHETIC_FIXTURES[2],
    id: "synthetic-law-conflicting-version-runtime",
    text: primaryConflictText,
  };
  const conflictHarness = harness(conflictFixture, {
    mutate(draft) {
      draft.reference.l1.sections[0].body =
        "2026.07.04 기준 공익사업법 제10조를 적용한다.";
    },
  });
  let conflictView = await prepareAttempt(
    conflictHarness.runtime,
    conflictFixture,
  );
  conflictView = (
    await conflictHarness.runtime.requestAssistance({
      sessionId: conflictView.sessionId,
      recordVersion: conflictView.recordVersion,
      questionText: null,
      revealFull: true,
    })
  ).view;
  const storedConflict = await conflictHarness.repository.load(
    conflictView.sessionId,
  );
  assert.equal(conflictView.status, "reference_withheld");
  assert.equal(conflictView.aiReference, null);
  assert.equal(storedConflict.aiReference.releaseStatus, "withheld");
  assert.equal(
    storedConflict.aiReference.blockerCodes.filter(
      (code) => code === "law:effective_date_unknown",
    ).length,
    1,
  );
  assert.equal(
    storedConflict.aiReference.blockerCodes.filter(
      (code) => code === "law:unbound_effective_date_reference",
    ).length,
    1,
  );
});

test("Law bare adjacent unknown versions fail closed without ordinary-date false positives", async () => {
  const knownDateProblem = (problemId, statute = "공익사업법") =>
    compileOwnerAlphaPracticeProblem({
      problemId,
      problemText: `법령 기준일자는 2026.07.04이다. ${statute} 제10조를 검토하라.`,
      subject: "appraisal_compensation_law",
    });
  const problemModel = knownDateProblem("law-bare-unknown-primary");
  const blockersFor = (generatedReferenceText, model = problemModel) =>
    ownerAlphaSubjectReferenceReleaseBlockers({
      problemModel: model,
      claims: [],
      generatedReferenceText,
    });

  for (const generatedReferenceText of [
    "공익사업법 제10조의 기준일은 미상이다.",
    "제10조의 기준일은 알 수 없다.",
    "공익사업법 제10조(기준일자 불명).",
    "공익사업법의 기준일자는 미확인이다.",
    "공익사업법 제１０조［기준일자：미상］.",
    "공익사업법 제 10 조의 기준 일 자 는 별도 확인이 필요하다.",
  ]) {
    assert.deepEqual(
      blockersFor(generatedReferenceText),
      ["law:effective_date_unknown"],
      generatedReferenceText,
    );
  }

  for (const unknownTerm of [
    "알려지지 않음",
    "알 수 없음",
    "미상",
    "불명",
    "불확실",
    "미확인",
    "별도 확인",
    "확인 필요",
    "확인되지 않음",
  ]) {
    const generatedReferenceText =
      `공익사업법 제10조의 기준일자는 ${unknownTerm}이다.`;
    const blockers = blockersFor(generatedReferenceText);
    assert.deepEqual(
      blockers,
      ["law:effective_date_unknown"],
      generatedReferenceText,
    );
    assert.equal(
      blockers.filter((code) => code === "law:effective_date_unknown").length,
      1,
    );
  }

  for (const statute of ["민법", "헌법"]) {
    const shortLawModel = knownDateProblem(
      `law-bare-unknown-${statute}`,
      statute,
    );
    assert.deepEqual(
      blockersFor(
        `${statute} 제10조의 기준일자는 미상이며 확인이 필요하다.`,
        shortLawModel,
      ),
      ["law:effective_date_unknown"],
    );
  }

  assert.deepEqual(
    blockersFor(
      "공익사업법 제10조의 기준일자는 미상이다. 제10조의 기준일은 별도 확인이 필요하다.",
    ),
    ["law:effective_date_unknown"],
  );
  assert.deepEqual(
    blockersFor(
      "2026.07.04 기준 공익사업법 제10조를 적용한다. 공익사업법 제10조의 기준일자는 미상이다.",
    ),
    ["law:effective_date_unknown"],
  );
  assert.deepEqual(
    blockersFor(
      "2099.01.01 기준 공익사업법 제10조를 적용한다. 공익사업법 제10조의 기준일자는 미상이다.",
    ),
    ["law:effective_date_unknown", "law:unbound_effective_date_reference"],
  );

  for (const generatedReferenceText of [
    "평가기준일자는 미상이며 공익사업법 제10조를 검토한다.",
    "평가 기준일자는 미상, 공익사업법 제10조를 검토한다.",
    "감정평가 기준일자는 미상, 공익사업법 제10조를 검토한다.",
    "감정 평가 기준일자는 미상 (공익사업법 제10조를 검토한다).",
    "거래일의 기준일은 불명이다.",
    "사업일의 기준일은 미확인이고 공익사업법 제10조를 검토한다.",
    "기준시점은 미상이며 공익사업법 제10조를 검토한다.",
    "가격시점은 불명이며 공익사업법 제10조를 검토한다.",
    "자료시점은 미확인이고 공익사업법 제10조를 검토한다.",
    "시점수정일의 기준일은 별도 확인이고 공익사업법 제10조를 검토한다.",
    "기준일자는 미상이다.",
    "공익사업법 제10조.\n기준일자는 미상이다.",
    "공익사업법 제10조.기준일자는 미상이다.",
    "공익사업법 제10조。기준일자는 미상이다.",
    `공익사업법 제10조${" ".repeat(20)}기준일자는 미상이다.`,
    "기준일자는 미상이며 보상액을 산정하고 공익사업법 제10조를 검토한다.",
    "공익사업법 제10조의 기준일자는 2026.07.04이다.",
    "공익사업법 제10조의 평가기준일자는 미상이다.",
    "법령 기준일자는 불명확하지 않다. 공익사업법 제10조를 검토한다.",
  ]) {
    assert.deepEqual(
      blockersFor(generatedReferenceText),
      [],
      generatedReferenceText,
    );
  }

  const unknownHarness = harness(SYNTHETIC_FIXTURES[2], {
    mutate(draft) {
      draft.reference.l1.sections[0].body =
        "2026.07.04 기준 공익사업법 제10조를 적용한다. 공익사업법 제10조의 기준일자는 미상이며 별도 확인이 필요하다.";
    },
  });
  let unknownView = await prepareAttempt(
    unknownHarness.runtime,
    SYNTHETIC_FIXTURES[2],
  );
  unknownView = (
    await unknownHarness.runtime.requestAssistance({
      sessionId: unknownView.sessionId,
      recordVersion: unknownView.recordVersion,
      questionText: null,
      revealFull: true,
    })
  ).view;
  const storedUnknown = await unknownHarness.repository.load(
    unknownView.sessionId,
  );
  assert.equal(unknownView.status, "reference_withheld");
  assert.equal(unknownView.aiReference, null);
  assert.equal(storedUnknown.aiReference.releaseStatus, "withheld");
  assert.equal(
    storedUnknown.aiReference.blockerCodes.filter(
      (code) => code === "law:effective_date_unknown",
    ).length,
    1,
  );
  assert.equal(
    storedUnknown.aiReference.blockerCodes.includes(
      "law:unbound_effective_date_reference",
    ),
    false,
  );
});

test("timeout and invalid output preserve the native fallback while partial projection withholds the parent", async () => {
  const fixture = SYNTHETIC_FIXTURES[1];
  for (const code of ["timeout", "invalid_output"]) {
    const { runtime } = harness(fixture, {
      providerError: new OwnerAlphaProviderError(code),
    });
    let view = await prepareAttempt(runtime, fixture);
    const result = await runtime.requestAssistance({
      sessionId: view.sessionId,
      recordVersion: view.recordVersion,
      questionText: null,
      revealFull: true,
    });
    view = result.view;
    assert.equal(result.providerFailed, true);
    assert.equal(view.aiReference, null);
    assert.equal(view.status, "reference_withheld");
    assert.equal(view.providerState.failureCode, code);
    assert.ok(view.biggestGap);
    assert.ok(view.variant);
  }

  const partialHarness = harness(SYNTHETIC_FIXTURES[0], {
    mutate(draft) {
      draft.reference.explanationLadder.blocks.pop();
    },
  });
  let partial = await prepareAttempt(
    partialHarness.runtime,
    SYNTHETIC_FIXTURES[0],
  );
  partial = (
    await partialHarness.runtime.requestAssistance({
      sessionId: partial.sessionId,
      recordVersion: partial.recordVersion,
      questionText: null,
      revealFull: true,
    })
  ).view;
  const stored = await partialHarness.repository.load(partial.sessionId);
  assert.equal(partial.aiReference, null);
  assert.equal(stored.aiReference.releaseStatus, "withheld");
  assert.equal(stored.aiReference.explanationLadder, undefined);
  assert.ok(
    stored.aiReference.blockerCodes.includes(
      "explanation_ladder:invalid_contract",
    ),
  );
});

test("attempt-before-explanation, stale CAS, and replay-safe one-call behavior remain enforced", async () => {
  const fixture = SYNTHETIC_FIXTURES[0];
  const { runtime, calls } = harness(fixture);
  const created = await runtime.create({
    problemText: fixture.text,
    files: [],
    inputModality: "typed",
    subject: fixture.subject,
  });
  await assert.rejects(
    runtime.requestAssistance({
      sessionId: created.sessionId,
      recordVersion: created.recordVersion,
      questionText: null,
      revealFull: true,
    }),
    /invalid_transition/,
  );
  let view = await runtime.confirmProblem({
    sessionId: created.sessionId,
    recordVersion: created.recordVersion,
    confirmedProblemText: created.confirmedProblemText,
  });
  const staleVersion = view.recordVersion;
  view = await runtime.saveIndependentAttempt({
    sessionId: view.sessionId,
    recordVersion: view.recordVersion,
    attemptText: "가상 독립 시도를 먼저 저장합니다.",
    elapsedTimeMs: 60_000,
    confidence: "low",
  });
  await assert.rejects(
    runtime.requestAssistance({
      sessionId: view.sessionId,
      recordVersion: staleVersion,
      questionText: null,
      revealFull: true,
    }),
    /stale_record/,
  );
  view = (
    await runtime.requestAssistance({
      sessionId: view.sessionId,
      recordVersion: view.recordVersion,
      questionText: null,
      revealFull: true,
    })
  ).view;
  view = (
    await runtime.requestAssistance({
      sessionId: view.sessionId,
      recordVersion: view.recordVersion,
      questionText: null,
      revealFull: true,
    })
  ).view;
  assert.equal(calls.reference, 1);
  assert.ok(view.aiReference.explanationLadder);
});

test("metadata projection exposes only bounded ladder counts and no learner, problem, reference, provider, or credential body", async () => {
  const fixture = {
    ...SYNTHETIC_FIXTURES[0],
    text: `${SYNTHETIC_FIXTURES[0].text} PROBLEM_BODY_SENTINEL`,
  };
  const { runtime, repository } = harness(fixture, {
    mutate(draft) {
      draft.reference.l1.sections[0].body = "REFERENCE_BODY_SENTINEL";
      draft.reference.modelProfileId = "PROVIDER_BODY_SENTINEL";
      draft.reference.hints[0].text = "CREDENTIAL_BODY_SENTINEL";
    },
  });
  let view = await runtime.create({
    problemText: fixture.text,
    files: [],
    inputModality: "typed",
    subject: fixture.subject,
  });
  view = await runtime.confirmProblem({
    sessionId: view.sessionId,
    recordVersion: view.recordVersion,
    confirmedProblemText: view.confirmedProblemText,
  });
  view = await runtime.saveIndependentAttempt({
    sessionId: view.sessionId,
    recordVersion: view.recordVersion,
    attemptText: "LEARNER_BODY_SENTINEL 가상 독립 시도입니다.",
    elapsedTimeMs: 60_000,
    confidence: "medium",
  });
  view = (
    await runtime.requestAssistance({
      sessionId: view.sessionId,
      recordVersion: view.recordVersion,
      questionText: null,
      revealFull: true,
    })
  ).view;
  const stored = await repository.load(view.sessionId);
  const metadata = ownerAlphaPracticeMetadataProjection(stored);
  assert.deepEqual(Object.keys(metadata).sort(), [
    "claimStateCounts",
    "containsRawContent",
    "contractVersion",
    "criticalClaimCount",
    "explanationLadderBlockCount",
    "explanationLadderContractVersion",
    "explanationLadderPresent",
    "fixedD1DueAt",
    "methodFamily",
    "misconceptionEdgeCount",
    "misconceptionNodeCount",
    "problemType",
    "questionChainLength",
    "recordVersion",
    "replayLinkCount",
    "rootCauseCandidateCount",
    "secondaryDomains",
    "status",
    "subject",
    "subjectAdapterContractVersion",
    "topicCount",
  ].sort());
  assert.equal(
    metadata.explanationLadderContractVersion,
    OWNER_ALPHA_EXPLANATION_LADDER_CONTRACT_VERSION,
  );
  assert.equal(metadata.explanationLadderPresent, true);
  assert.equal(metadata.explanationLadderBlockCount, 4);
  assert.equal(metadata.containsRawContent, false);
  const serialized = JSON.stringify(metadata);
  for (const sentinel of [
    "LEARNER_BODY_SENTINEL",
    "PROBLEM_BODY_SENTINEL",
    "REFERENCE_BODY_SENTINEL",
    "PROVIDER_BODY_SENTINEL",
    "CREDENTIAL_BODY_SENTINEL",
  ]) {
    assert.equal(serialized.includes(sentinel), false);
  }
});

test("Owner Alpha wording, Node runner, exact-head workflow, RLS, privacy, and artifact contracts are wired", async () => {
  const [contract, provider, ui, runner, workflow, verifier] =
    await Promise.all([
      readFile(
        "lib/review-os/owner-alpha-explanation-ladder-contract.ts",
        "utf8",
      ),
      readFile("lib/review-os/owner-alpha-practice-provider.ts", "utf8"),
      readFile(
        "components/review-os/owner-alpha-practice-loop.tsx",
        "utf8",
      ),
      readFile("scripts/run-node-tests.mjs", "utf8"),
      readFile(".github/workflows/owner-alpha-practice-runtime.yml", "utf8"),
      readFile(
        "scripts/automation/verify-owner-alpha-practice-runtime.mjs",
        "utf8",
      ),
    ]);
  const legacyLabel = ["합격", "한 줄"].join(" ");
  assert.match(contract, /시험 답안 한 줄/);
  for (const source of [contract, provider, ui]) {
    assert.equal(source.includes(legacyLabel), false);
  }
  assert.match(runner, /owner-alpha-explanation-ladder-v1\.test\.mjs/);
  assert.match(workflow, /agent\/three-subject-explanation-ladder-v1/);
  assert.match(workflow, /agent\/owner-alpha-law-conflict-unknown-repair/);
  assert.doesNotMatch(workflow, /agent\/owner-alpha-law-version-basis-repair/);
  assert.match(workflow, /owner-alpha-explanation-ladder-v1\.test\.mjs/);
  assert.match(workflow, /Check out exact PR head/);
  assert.match(workflow, /Recheck exact head/);
  assert.match(workflow, /Run mobile-first exact-head browser and accessibility acceptance/);
  assert.match(workflow, /Upload metadata-only runtime evidence/);
  assert.match(verifier, /owner_alpha_explanation_ladder\.v1/);
  assert.match(verifier, /three_subject_ladder_metadata_projection/);
  assert.match(verifier, /two_user_cross_read_denied/);
  assert.match(verifier, /seven_table_cross_user_update_denied/);
  assert.match(verifier, /cross_user_insert_denied/);
  assert.match(verifier, /anonymous_read_denied/);
  assert.match(verifier, /problemBodiesPersisted:\s*false/);
  assert.match(verifier, /referenceBodiesPersisted:\s*false/);
  assert.match(verifier, /persistedBodyCounts/);
});
