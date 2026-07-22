import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  OWNER_ALPHA_AI_REFERENCE_DISCLAIMER,
  OWNER_ALPHA_AI_REFERENCE_LABEL,
  isOwnerAlphaPracticeSession,
} from "../lib/review-os/owner-alpha-practice-contract.ts";
import { compileOwnerAlphaPracticeProblem } from "../lib/review-os/owner-alpha-practice-compiler.ts";
import { ownerAlphaPracticeMetadataProjection } from "../lib/review-os/owner-alpha-practice-metadata.ts";
import { OwnerAlphaProviderError } from "../lib/review-os/owner-alpha-practice-provider-contract.ts";
import {
  ownerAlphaSubjectReferenceReleaseBlockers,
  routeOwnerAlphaPracticeSubject,
} from "../lib/review-os/owner-alpha-practice-subject-adapters.ts";
import { OwnerAlphaPracticeRuntime } from "../lib/review-os/owner-alpha-practice-runtime.ts";
import {
  OWNER_ALPHA_LAW_GAP_TYPES,
  OWNER_ALPHA_LAW_REWRITE_MODES,
  OWNER_ALPHA_PRACTICE_SUBJECTS,
  OWNER_ALPHA_SUBJECT_ADAPTER_CONTRACT_VERSION,
  OWNER_ALPHA_THEORY_GAP_TYPES,
  OWNER_ALPHA_THEORY_REWRITE_MODES,
  projectOwnerAlphaSubjectPracticeContract,
} from "../lib/review-os/owner-alpha-subject-adapter-contract.ts";

const fixtures = Object.freeze([
  {
    id: "practical-comparison-allocation-adjustment",
    subject: "appraisal_practical",
    adapter: "PracticalAdapter",
    text: "대상 토지와 비교사례가 있다. 사례가격은 10억원이고 토지 배분비율은 60%이다. 사정보정률 5%를 적용하여 비교방식의 토지가격과 계산 근거를 산정하시오.",
    claimType: "formula",
    gapType: "data_role_gap",
    rewriteMode: "recalculation",
    canonicalRewriteMode: "recalculate",
  },
  {
    id: "theory-definition-comparison-evaluation",
    subject: "appraisal_theory",
    adapter: "TheoryAdapter",
    text: "시장가치의 정의와 가치 형성 원리를 제시하고 두 관점을 비교하라. 각 관점의 논리적 전제와 실무 적용을 평가하여 결론을 제시하시오.",
    claimType: "concept",
    gapType: "comparison_omission",
    rewriteMode: "compare_and_evaluate",
    canonicalRewriteMode: "rewrite",
  },
  {
    id: "law-requirement-application-effect",
    subject: "appraisal_compensation_law",
    adapter: "LawAdapter",
    text: "적용 법령의 유효일은 2026.07.04이다. 공익사업법 제10조 제1항의 절차가 문제된다. 제시된 사실을 요건별로 대응하고 사안 포섭, 법적 효과와 결론을 검토하시오.",
    claimType: "source",
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
  const evidence = {
    attempts: [],
    rewrites: [],
    referenceUsage: new Map(),
    completions: [],
  };
  return {
    rows,
    evidence,
    async create(session) {
      assert.equal(rows.has(session.sessionId), false);
      rows.set(session.sessionId, clone(session));
      return clone(session);
    },
    async load(sessionId) {
      return clone(rows.get(sessionId) ?? null);
    },
    async save(session, expectedRecordVersion) {
      const current = rows.get(session.sessionId);
      assert.ok(current);
      assert.equal(current.recordVersion, expectedRecordVersion, "canonical CAS");
      const persisted = {
        ...clone(session),
        recordVersion: expectedRecordVersion + 1,
        updatedAt: new Date(Date.parse(current.updatedAt) + 1).toISOString(),
      };
      rows.set(session.sessionId, persisted);
      return clone(persisted);
    },
    async listRecentSessions(limit = 20) {
      return [...rows.values()].slice(-limit).reverse().map(clone);
    },
    async saveIndependentAttempt(session) {
      evidence.attempts.push({
        sessionId: session.sessionId,
        subject: session.problemModel.subjectAdapter?.subject,
        answerExposure: session.assistance.answerExposure,
      });
    },
    async saveRewrite(session) {
      evidence.rewrites.push({
        sessionId: session.sessionId,
        mode: session.rewrite?.mode,
        subjectMode: session.rewrite?.subjectMode,
      });
    },
    async recordReferenceUsage(session) {
      evidence.referenceUsage.set(session.sessionId, {
        subject: session.problemModel.subjectAdapter?.subject,
        state: session.providerState.reference,
      });
    },
    async projectCompletion(session, projection) {
      evidence.completions.push({
        sessionId: session.sessionId,
        dueAt: session.fixedD1DueAt,
        projection: clone(projection),
      });
    },
  };
}

function calculationForFixture(fixture) {
  if (fixture.subject !== "appraisal_practical") return [];
  return [
    {
      nodeId: "calc-allocation",
      claimId: "claim-practical",
      label: "사례가격 × 토지 배분비율",
      primitive: "allocation",
      total: 1_000_000_000,
      ratio: 60,
      ratioInput: "percent",
      claimedResult: 600_000_000,
      resultUnit: "원",
      critical: true,
    },
  ];
}

function referenceDraft(input, fixture, mutate) {
  const nodes = calculationForFixture(fixture);
  const claim = {
    claimId: `claim-${fixture.subject}`,
    claimType: fixture.claimType,
    summary: `${fixture.subject} 학습용 주장`,
    state: "ai_inference",
    critical: true,
    evidenceRefIds: [],
    calculationNodeId: nodes[0]?.nodeId ?? null,
    resolutionCode: "provider_only",
  };
  if (nodes[0]) nodes[0].claimId = claim.claimId;
  const draft = {
    reference: {
      referenceId: `${input.sessionId}-reference`,
      label: OWNER_ALPHA_AI_REFERENCE_LABEL,
      disclaimer: OWNER_ALPHA_AI_REFERENCE_DISCLAIMER,
      modelProfileId: "three-subject-contract-fixture.v1",
      promptVersion: "three-subject-contract-fixture.v1",
      schemaVersion: "three-subject-contract-fixture.v1",
      generatedAt: input.generatedAt,
      hints: [1, 2, 3, 4].map((level) => ({
        hintId: `${fixture.id}-hint-${level}`,
        level,
        text: `${fixture.adapter} 단계형 힌트 ${level}`,
      })),
      l1: {
        title: "L1",
        sections: [{ heading: "회상 뼈대", body: "요구 구조를 먼저 인출한다." }],
      },
      l2: {
        title: "L2",
        sections: [{ heading: "연결 경로", body: "요구와 근거를 단계별로 연결한다." }],
      },
      l3: {
        title: "L3",
        sections: [{ heading: "전체 학습 구조", body: "검증 상태와 대안을 함께 확인한다." }],
      },
      claims: [claim],
      calculationGraph: { nodes },
      releaseStatus: "released",
      blockerCodes: [],
    },
    biggestGap: {
      gapId: `${fixture.id}-gap`,
      gapType: fixture.gapType,
      title: `${fixture.adapter} 가장 큰 간극`,
      reasonSelected: "독립 시도에서 한 연결이 가장 크게 비었습니다.",
      inferredMisunderstanding: "요구와 근거의 연결을 다시 확인해야 합니다.",
      successCriteria: "같은 구조를 자신의 말로 독립 재현합니다.",
      conceptIds: [`concept-${fixture.subject}`],
      state: "ai_candidate",
    },
    misconceptionGraph: {
      graphId: `${fixture.id}-misconception`,
      nodes: [
        {
          conceptId: `concept-${fixture.subject}`,
          label: `${fixture.adapter} 연결 개념`,
          state: "suspected",
          evidenceRefIds: [`${input.sessionId}:independent-attempt`],
        },
      ],
      edges: [],
    },
    rootCauseCandidates: [
      {
        rootCauseId: `${fixture.id}-root`,
        label: "구조 연결 선행 인출 부족",
        rationale: "독립 시도에 필요한 연결 한 단계가 없었습니다.",
        confidence: "medium",
        evidenceRefIds: [`${input.sessionId}:independent-attempt`],
        conceptIds: [`concept-${fixture.subject}`],
        state: "candidate",
      },
    ],
    variant: {
      variantId: `${fixture.id}-variant`,
      kind: fixture.subject === "appraisal_practical" ? "numeric" : "condition",
      changedOneThing: "핵심 조건 하나만 변경",
      prompt: "핵심 조건 하나만 달라졌을 때 같은 구조를 다시 적용하세요.",
      verificationState: "ai_inference",
      calculationGraph: { nodes: [] },
    },
  };
  if (mutate) mutate(draft);
  return draft;
}

function providerFor(options = {}) {
  return {
    calls: { extract: 0, reference: 0 },
    async extractProblem(input) {
      this.calls.extract += 1;
      return {
        extractedText: input.problemText,
        modelProfileId: "three-subject-ocr.v1",
      };
    },
    async generateReference(input) {
      this.calls.reference += 1;
      if (options.error) throw options.error;
      const fixture =
        fixtures.find(
          (item) => item.subject === input.problemModel.subjectAdapter?.subject,
        ) ?? fixtures[0];
      return referenceDraft(input, fixture, options.mutate);
    },
  };
}

function harness(options = {}) {
  const repository = options.repository ?? memoryRepository();
  const provider = options.provider ?? providerFor(options);
  let id = 0;
  const now = new Date("2026-07-22T00:00:00.000Z");
  const runtime = new OwnerAlphaPracticeRuntime({
    repository,
    provider,
    assertReferenceEntitlement: async () => {},
    now: () => new Date(now),
    createId: () => `${options.idPrefix ?? "three-subject"}-${++id}`,
    userId: options.userId ?? "11111111-1111-4111-8111-111111111111",
  });
  return { runtime, repository, provider, now };
}

async function prepareAttempt(runtime, fixture, text = fixture.text) {
  let view = await runtime.create({
    problemText: text,
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
    attemptText: "기준안을 보기 전에 요구 구조와 근거를 제 말로 먼저 작성했습니다.",
    elapsedTimeMs: 180_000,
    confidence: "medium",
  });
  return view;
}

test("contract fixtures are exactly the three required copyright-safe subject cases", () => {
  assert.equal(fixtures.length, 3);
  assert.deepEqual(
    fixtures.map((fixture) => fixture.subject),
    OWNER_ALPHA_PRACTICE_SUBJECTS,
  );
  assert.equal(new Set(fixtures.map((fixture) => fixture.id)).size, 3);
});

for (const fixture of fixtures) {
  test(`${fixture.adapter} uses the shared kernel through D+1 Queue, Today, and Learning Record`, async () => {
    const { runtime, repository, now } = harness();
    let prior = await prepareAttempt(runtime, fixture);
    prior = (
      await runtime.requestAssistance({
        sessionId: prior.sessionId,
        recordVersion: prior.recordVersion,
        questionText: "같은 과목의 이전 연결 증거를 남깁니다.",
        revealFull: true,
      })
    ).view;
    let view = await prepareAttempt(runtime, fixture);
    const adapter = view.problemModel.subjectAdapter;
    assert.equal(adapter.contractVersion, OWNER_ALPHA_SUBJECT_ADAPTER_CONTRACT_VERSION);
    assert.equal(adapter.subject, fixture.subject);
    assert.equal(adapter.adapter, fixture.adapter);
    assert.equal(view.independentAttempt !== null, true);
    assert.equal(view.assistance.independentAttemptBeforeHelp, true);
    assert.equal(view.assistance.answerExposure, "none");
    assert.deepEqual(repository.evidence.attempts.at(-1), {
      sessionId: view.sessionId,
      subject: fixture.subject,
      answerExposure: "none",
    });

    let result = await runtime.requestAssistance({
      sessionId: view.sessionId,
      recordVersion: view.recordVersion,
      questionText: "독립 시도에서 막힌 연결 한 가지를 확인합니다.",
      revealFull: false,
    });
    view = result.view;
    assert.equal(view.aiReference, null);
    assert.equal(view.visibleHints.length, 1);
    assert.equal(view.assistance.revealHistory.length, 1);

    result = await runtime.requestAssistance({
      sessionId: view.sessionId,
      recordVersion: view.recordVersion,
      questionText: "전체 학습 구조를 확인합니다.",
      revealFull: true,
    });
    view = result.view;
    assert.equal(view.aiReference.label, OWNER_ALPHA_AI_REFERENCE_LABEL);
    assert.ok(view.aiReference.l1.sections.length > 0);
    assert.ok(view.aiReference.l2.sections.length > 0);
    assert.ok(view.aiReference.l3.sections.length > 0);
    assert.equal(view.assistance.revealHistory.length, 2);
    assert.equal(view.biggestGap.gapType, fixture.gapType);
    assert.equal(view.misconceptionGraph.nodes.length, 1);
    assert.equal(view.rootCauseCandidates.length, 1);
    if (fixture.subject === "appraisal_practical") {
      assert.deepEqual(
        view.problemModel.subjectAdapter.calculationGraphNodeIds,
        view.problemModel.calculationGraph.nodes.map((node) => node.nodeId),
      );
    }
    assert.equal(view.questionReplayLinks.length, 1);
    assert.equal(view.questionReplayLinks[0].priorSessionId, prior.sessionId);
    assert.equal(
      (await repository.load(view.sessionId)).questionReplayLinks.length,
      1,
    );

    const completed = await runtime.completeRewrite({
      sessionId: view.sessionId,
      recordVersion: view.recordVersion,
      mode: fixture.canonicalRewriteMode,
      subjectMode: fixture.rewriteMode,
      rewriteText: "가장 큰 간극 하나를 기준으로 요구와 근거의 연결을 직접 다시 작성했습니다.",
      inferredMisunderstanding: "요구와 근거를 연결하는 순서를 놓쳤습니다.",
      successCriteria: "같은 구조를 도움 없이 다시 재현합니다.",
    });
    assert.equal(completed.status, "completed");
    assert.equal(completed.rewrite.subjectMode, fixture.rewriteMode);
    assert.equal(completed.rewrite.mode, fixture.canonicalRewriteMode);
    assert.equal(Date.parse(completed.fixedD1DueAt) - now.getTime(), 86_400_000);
    assert.ok(completed.links.reviewQueueItemId);
    assert.ok(completed.links.todayActionSeedId);
    assert.ok(completed.links.learningRecordId);
    assert.equal(completed.questionChain.entries.at(-1).kind, "variant");

    const shared = projectOwnerAlphaSubjectPracticeContract(completed);
    assert.equal(shared.subject, fixture.subject);
    assert.equal(shared.independentAttempt !== null, true);
    assert.equal(shared.assistanceEvidence.independentAttemptBeforeHelp, true);
    assert.equal(shared.learningReference.label, OWNER_ALPHA_AI_REFERENCE_LABEL);
    assert.equal(shared.biggestGap.gapType, fixture.gapType);
    assert.equal(shared.rewriteTask.selectedMode, fixture.rewriteMode);
    assert.ok(shared.variantTask);
    assert.ok(shared.transferTask.fixedD1DueAt);
    assert.ok(shared.queueTodayRecordLinks.queue);
    assert.ok(shared.queueTodayRecordLinks.today);
    assert.ok(shared.queueTodayRecordLinks.record);
    assert.equal(repository.evidence.rewrites.length, 1);
    assert.equal(repository.evidence.completions.length, 1);
    assert.equal(repository.evidence.referenceUsage.size, 2);
  });
}

test("existing v0 practical sessions remain readable, resumable, and completable without an adapter projection", async () => {
  const { runtime, repository } = harness();
  const current = await runtime.create({
    problemText: fixtures[0].text,
    files: [],
    inputModality: "typed",
    subject: "appraisal_practical",
  });
  const legacy = clone(current);
  delete legacy.visibleHints;
  delete legacy.problemModel.subjectAdapter;
  legacy.subject = "감정평가실무";
  legacy.problemModel.subject = "감정평가실무";
  repository.rows.set(legacy.sessionId, clone(legacy));
  assert.equal(isOwnerAlphaPracticeSession(legacy), true);
  assert.equal(projectOwnerAlphaSubjectPracticeContract(legacy), null);
  assert.equal(legacy.problemModel.methodFamily, "comparison_approach");

  let resumed = await runtime.get(legacy.sessionId);
  resumed = await runtime.confirmProblem({
    sessionId: resumed.sessionId,
    recordVersion: resumed.recordVersion,
    confirmedProblemText: resumed.confirmedProblemText,
  });
  assert.equal(resumed.subject, "감정평가실무");
  assert.equal(resumed.problemModel.subject, "감정평가실무");
  assert.equal(resumed.problemModel.subjectAdapter, undefined);
  assert.equal(isOwnerAlphaPracticeSession(resumed), true);

  resumed = await runtime.saveIndependentAttempt({
    sessionId: resumed.sessionId,
    recordVersion: resumed.recordVersion,
    attemptText: "기존 v0 실무 세션에서 독립 시도를 계속합니다.",
    elapsedTimeMs: 120_000,
    confidence: "medium",
  });
  resumed = (
    await runtime.requestAssistance({
      sessionId: resumed.sessionId,
      recordVersion: resumed.recordVersion,
      questionText: null,
      revealFull: true,
    })
  ).view;
  const completed = await runtime.completeRewrite({
    sessionId: resumed.sessionId,
    recordVersion: resumed.recordVersion,
    mode: "recalculate",
    rewriteText: "기존 v0 계산과 답안 구조를 직접 다시 완성했습니다.",
    inferredMisunderstanding: "자료 역할과 계산 순서를 다시 확인했습니다.",
    successCriteria: "같은 문제를 도움 없이 다시 계산합니다.",
  });
  assert.equal(completed.status, "completed");
  assert.equal(completed.problemModel.subjectAdapter, undefined);
  assert.equal(projectOwnerAlphaSubjectPracticeContract(completed), null);
});

test("v1 persistence rejects a mismatched subject or incomplete adapter contract", async () => {
  const { runtime } = harness();
  const current = await runtime.create({
    problemText: fixtures[1].text,
    files: [],
    inputModality: "typed",
    subject: "appraisal_theory",
  });
  const mismatched = clone(current);
  mismatched.subject = "appraisal_practical";
  assert.equal(isOwnerAlphaPracticeSession(mismatched), false);

  const incomplete = clone(current);
  incomplete.problemModel.subjectAdapter.rewriteModes = ["paragraph_rewrite"];
  assert.equal(isOwnerAlphaPracticeSession(incomplete), false);
});

test("v1 persistence rejects malformed versions, unknown subjects, illegal modes, and contradictory routing", async () => {
  const { runtime } = harness();
  const current = await runtime.create({
    problemText: fixtures[1].text,
    files: [],
    inputModality: "typed",
    subject: "appraisal_theory",
  });

  const malformedVersion = clone(current);
  malformedVersion.problemModel.subjectAdapter.contractVersion =
    "owner_alpha_subject_adapter.v999";
  assert.equal(isOwnerAlphaPracticeSession(malformedVersion), false);

  const unknownSubject = clone(current);
  unknownSubject.subject = "unknown_subject";
  unknownSubject.problemModel.subject = "unknown_subject";
  unknownSubject.problemModel.subjectAdapter.subject = "unknown_subject";
  assert.equal(isOwnerAlphaPracticeSession(unknownSubject), false);

  const illegalGap = clone(current);
  illegalGap.problemModel.subjectAdapter.gapTypes = [
    ...illegalGap.problemModel.subjectAdapter.gapTypes.slice(0, -1),
    "illegal_gap",
  ];
  assert.equal(isOwnerAlphaPracticeSession(illegalGap), false);

  const illegalRewrite = clone(current);
  illegalRewrite.problemModel.subjectAdapter.rewriteModes = [
    ...illegalRewrite.problemModel.subjectAdapter.rewriteModes.slice(0, -1),
    "illegal_rewrite",
  ];
  assert.equal(isOwnerAlphaPracticeSession(illegalRewrite), false);

  const contradictoryRouting = clone(current);
  contradictoryRouting.problemModel.subjectAdapter.secondaryDomains = [
    "appraisal_theory",
  ];
  assert.equal(isOwnerAlphaPracticeSession(contradictoryRouting), false);
});

test("TheoryAdapter never treats a validated arithmetic node as deterministic theory scoring", async () => {
  const { runtime } = harness({
    mutate(draft) {
      draft.reference.calculationGraph.nodes = [
        {
          nodeId: "hostile-theory-score",
          claimId: draft.reference.claims[0].claimId,
          label: "이론 주장을 숫자로 확정하려는 공격",
          primitive: "sum",
          values: [1, 1],
          claimedResult: 2,
          resultUnit: null,
          critical: true,
        },
      ];
      draft.reference.claims[0].calculationNodeId = "hostile-theory-score";
      draft.reference.claims[0].state = "deterministically_validated";
    },
  });
  let view = await prepareAttempt(runtime, fixtures[1]);
  view = (
    await runtime.requestAssistance({
      sessionId: view.sessionId,
      recordVersion: view.recordVersion,
      questionText: null,
      revealFull: true,
    })
  ).view;
  const theoryClaim = view.problemModel.claimVerificationStates.at(-1);
  assert.equal(theoryClaim.claimType, "concept");
  assert.equal(theoryClaim.state, "ai_inference");
  assert.equal(
    view.problemModel.subjectAdapter.validationPolicy.deterministicScoringAllowed,
    false,
  );
});

test("LawAdapter rejects hostile AI self-promotion to official-source grounding", async () => {
  const { runtime } = harness({
    mutate(draft) {
      draft.reference.claims[0].state = "official_source_grounded";
      draft.reference.claims[0].evidenceRefIds = ["invented-official-source"];
      draft.reference.claims[0].resolutionCode = "supported";
    },
  });
  let view = await prepareAttempt(runtime, fixtures[2]);
  view = (
    await runtime.requestAssistance({
      sessionId: view.sessionId,
      recordVersion: view.recordVersion,
      questionText: null,
      revealFull: true,
    })
  ).view;
  const lawClaim = view.problemModel.claimVerificationStates.at(-1);
  assert.equal(lawClaim.state, "ai_inference");
  assert.equal(lawClaim.resolutionCode, "provider_only");
  assert.equal(
    view.problemModel.claimVerificationStates.some(
      (claim) => claim.state === "official_source_grounded",
    ),
    false,
  );
  const hostileNativePromotion = clone(view);
  hostileNativePromotion.problemModel.subjectAdapter.applicableLawCandidates[0] = {
    ...hostileNativePromotion.problemModel.subjectAdapter
      .applicableLawCandidates[0],
    state: "official_source_grounded",
    officialSourceRefId: " ",
  };
  assert.equal(isOwnerAlphaPracticeSession(hostileNativePromotion), false);
  assert.ok(
    ownerAlphaSubjectReferenceReleaseBlockers({
      problemModel: hostileNativePromotion.problemModel,
      claims: hostileNativePromotion.problemModel.claimVerificationStates,
    }).includes("law:official_source_promotion_without_reference"),
  );
});

test("LawAdapter fails closed when the legal effective date is unknown", async () => {
  const { runtime, repository } = harness();
  const undated = fixtures[2].text.replace(
    "적용 법령의 유효일은 2026.07.04이다. ",
    "사업인정고시일은 2026.07.04이다. ",
  );
  let view = await prepareAttempt(runtime, fixtures[2], undated);
  view = (
    await runtime.requestAssistance({
      sessionId: view.sessionId,
      recordVersion: view.recordVersion,
      questionText: null,
      revealFull: true,
    })
  ).view;
  assert.equal(
    view.problemModel.subjectAdapter.effectiveDateRequirement.state,
    "unresolved_needs_review",
  );
  assert.equal(view.status, "reference_withheld");
  assert.equal(view.aiReference, null);
  const stored = await repository.load(view.sessionId);
  assert.ok(stored.aiReference.blockerCodes.includes("law:effective_date_unknown"));
  assert.equal(repository.evidence.referenceUsage.size, 0);
});

test("LawAdapter withholds a provider-invented article reference absent from the problem", async () => {
  const { runtime, repository } = harness({
    mutate(draft) {
      draft.reference.l1.sections[0].body =
        "공익사업법 제999조 제1항이 적용된다는 조문을 새로 만들어 냅니다.";
    },
  });
  let view = await prepareAttempt(runtime, fixtures[2]);
  view = (
    await runtime.requestAssistance({
      sessionId: view.sessionId,
      recordVersion: view.recordVersion,
      questionText: null,
      revealFull: true,
    })
  ).view;
  assert.equal(view.status, "reference_withheld");
  assert.equal(view.aiReference, null);
  const stored = await repository.load(view.sessionId);
  assert.ok(
    stored.aiReference.blockerCodes.includes(
      "law:unbound_article_reference",
    ),
  );
  assert.equal(repository.evidence.referenceUsage.size, 0);
});

test("compensation mixed-domain routing retains one primary subject and explicit secondary domains", () => {
  const routing = routeOwnerAlphaPracticeSubject({
    requestedSubject: "appraisal_compensation_law",
    problemText: fixtures.map((fixture) => fixture.text).join("\n"),
  });
  assert.equal(routing.primarySubject, "appraisal_compensation_law");
  assert.deepEqual(routing.secondaryDomains.sort(), [
    "appraisal_practical",
    "appraisal_theory",
  ]);
  assert.ok(routing.domainTags.includes("compensation_valuation"));
  assert.ok(routing.domainTags.includes("compensation_statute"));
  assert.ok(routing.domainTags.includes("just_compensation_theory") || routing.domainTags.includes("value_theory"));
  assert.ok(routing.domainTags.includes("mixed_subject"));
});

test("provider timeout preserves the native TheoryAdapter rewrite and D+1 fallback", async () => {
  const { runtime, repository } = harness({
    error: new OwnerAlphaProviderError("timeout"),
  });
  let view = await prepareAttempt(runtime, fixtures[1]);
  const failed = await runtime.requestAssistance({
    sessionId: view.sessionId,
    recordVersion: view.recordVersion,
    questionText: "논증 연결을 확인합니다.",
    revealFull: false,
  });
  view = failed.view;
  assert.equal(failed.providerFailed, true);
  assert.equal(view.providerState.failureCode, "timeout");
  assert.equal(view.biggestGap.gapType, "premise_gap");
  const completed = await runtime.completeRewrite({
    sessionId: view.sessionId,
    recordVersion: view.recordVersion,
    mode: "rewrite",
    subjectMode: "argument_bridge",
    rewriteText: "AI 기준안 없이 정의와 전제 사이의 논증 연결을 직접 다시 작성했습니다.",
    inferredMisunderstanding: "전제에서 결론으로 넘어가는 연결이 비었습니다.",
    successCriteria: "전제와 결론 사이 논증을 한 문단으로 재현합니다.",
  });
  assert.equal(completed.status, "completed");
  assert.equal(completed.rewrite.subjectMode, "argument_bridge");
  assert.equal(repository.evidence.referenceUsage.size, 0);
});

test("invalid provider output fails closed into the same native LawAdapter fallback", async () => {
  const { runtime, repository } = harness({
    error: new OwnerAlphaProviderError("invalid_output"),
  });
  let view = await prepareAttempt(runtime, fixtures[2]);
  const failed = await runtime.requestAssistance({
    sessionId: view.sessionId,
    recordVersion: view.recordVersion,
    questionText: null,
    revealFull: true,
  });
  view = failed.view;
  assert.equal(failed.providerFailed, true);
  assert.equal(view.providerState.failureCode, "invalid_output");
  assert.equal(view.status, "reference_withheld");
  assert.equal(view.aiReference, null);
  assert.equal(view.biggestGap.gapType, "fact_requirement_mapping_gap");
  assert.equal(repository.evidence.referenceUsage.size, 0);
});

test("all three subjects remain inside the same learner-owned repository boundary", async () => {
  const shared = new Map();
  function scopedRepository(userId) {
    const base = memoryRepository();
    return {
      ...base,
      async create(session) {
        shared.set(session.sessionId, { userId, session: clone(session) });
        return clone(session);
      },
      async load(sessionId) {
        const row = shared.get(sessionId);
        return row?.userId === userId ? clone(row.session) : null;
      },
      async save(session, expectedRecordVersion) {
        const row = shared.get(session.sessionId);
        assert.equal(row?.userId, userId);
        assert.equal(row.session.recordVersion, expectedRecordVersion);
        const persisted = {
          ...clone(session),
          recordVersion: expectedRecordVersion + 1,
          updatedAt: new Date(Date.parse(row.session.updatedAt) + 1).toISOString(),
        };
        shared.set(session.sessionId, { userId, session: persisted });
        return clone(persisted);
      },
      async listRecentSessions() {
        return [...shared.values()]
          .filter((row) => row.userId === userId)
          .map((row) => clone(row.session));
      },
    };
  }
  const ownerA = harness({
    repository: scopedRepository("user-a"),
    userId: "user-a",
    idPrefix: "owner-a",
  }).runtime;
  const ownerB = harness({
    repository: scopedRepository("user-b"),
    userId: "user-b",
    idPrefix: "owner-b",
  }).runtime;
  const practical = await ownerA.create({
    problemText: fixtures[0].text,
    files: [],
    inputModality: "typed",
    subject: fixtures[0].subject,
  });
  const law = await ownerB.create({
    problemText: fixtures[2].text,
    files: [],
    inputModality: "typed",
    subject: fixtures[2].subject,
  });
  await assert.rejects(ownerA.get(law.sessionId), /session_not_found/);
  await assert.rejects(ownerB.get(practical.sessionId), /session_not_found/);
});

test("metadata and exact-head RLS evidence contain no raw learner or provider bodies", async () => {
  const sentinelProblem = "PRIVATE_PROBLEM_SENTINEL";
  const sentinelAttempt = "PRIVATE_ATTEMPT_SENTINEL";
  const model = compileOwnerAlphaPracticeProblem({
    problemId: "metadata-boundary",
    problemText: `${sentinelProblem} ${fixtures[1].text}`,
    subject: fixtures[1].subject,
  });
  const now = "2026-07-22T00:00:00.000Z";
  const session = {
    contractVersion: "owner_alpha_universal_appraisal_practice.v0",
    sessionId: "metadata-boundary",
    recordVersion: 1,
    status: "attempt_saved",
    subject: fixtures[1].subject,
    createdAt: now,
    updatedAt: now,
    problemModel: model,
    confirmedProblemText: sentinelProblem,
    criticalOcrConfirmed: true,
    independentAttempt: {
      attemptId: "metadata-boundary:attempt",
      text: sentinelAttempt,
      elapsedTimeMs: 1,
      confidence: "medium",
      savedAt: now,
    },
    assistance: {
      assistanceLevel: 0,
      requestedByUser: false,
      hintIds: [],
      independentAttemptBeforeHelp: true,
      independentRecoveryAfterHelp: false,
      answerExposure: "none",
      revealHistory: [],
      elapsedTimeMs: 1,
      confidence: "medium",
      inputModality: "typed",
      variantFamilyId: null,
      variantDistance: null,
      sessionPosition: 1,
    },
    aiReference: null,
    calculationChecks: [],
    biggestGap: null,
    rewrite: null,
    fixedD1DueAt: null,
    variant: null,
    questionChain: { chainId: "metadata-questions", entries: [] },
    misconceptionGraph: { graphId: "metadata-graph", nodes: [], edges: [] },
    rootCauseCandidates: [],
    questionReplayLinks: [],
    providerState: {
      compile: "deterministic_fallback",
      reference: "not_requested",
      failureCode: null,
      modelProfileId: null,
      referenceAttemptStartedAt: null,
      referenceLeaseExpiresAt: null,
    },
    links: {
      answerSubmissionId: null,
      rewriteSubmissionId: null,
      reviewQueueItemId: null,
      todayActionSeedId: null,
      learningRecordId: null,
    },
  };
  const metadata = ownerAlphaPracticeMetadataProjection(session);
  const serialized = JSON.stringify(metadata);
  assert.equal(metadata.containsRawContent, false);
  assert.equal(serialized.includes(sentinelProblem), false);
  assert.equal(serialized.includes(sentinelAttempt), false);

  const [workflow, verifier] = await Promise.all([
    readFile(".github/workflows/owner-alpha-practice-runtime.yml", "utf8"),
    readFile("scripts/automation/verify-owner-alpha-practice-runtime.mjs", "utf8"),
  ]);
  assert.match(workflow, /Upload metadata-only runtime evidence/);
  assert.match(verifier, /learnerTextPersisted:\s*false/);
  assert.match(verifier, /providerBodiesPersisted:\s*false/);
  assert.match(verifier, /credentialMaterialPersisted:\s*false/);
});

test("the private UI preserves the v0 practical rewrite and recalculation choice", async () => {
  const component = await readFile(
    "components/review-os/owner-alpha-practice-loop.tsx",
    "utf8",
  );
  assert.match(
    component,
    /!activeAdapter \|\| activeAdapter\.subject === "appraisal_practical"/,
  );
});

test("the versioned contract exposes every required theory and law mode without automated correctness scoring", () => {
  assert.equal(OWNER_ALPHA_THEORY_GAP_TYPES.length, 10);
  assert.equal(OWNER_ALPHA_THEORY_REWRITE_MODES.length, 5);
  assert.equal(OWNER_ALPHA_LAW_GAP_TYPES.length, 10);
  assert.equal(OWNER_ALPHA_LAW_REWRITE_MODES.length, 6);
  const law = compileOwnerAlphaPracticeProblem({
    problemId: "law-policy",
    problemText: fixtures[2].text,
    subject: fixtures[2].subject,
  });
  assert.deepEqual(
    ownerAlphaSubjectReferenceReleaseBlockers({
      problemModel: law,
      claims: law.claimVerificationStates,
    }),
    [],
  );
  assert.equal(
    law.subjectAdapter.validationPolicy.automatedLegalCorrectnessScoringAllowed,
    false,
  );
});
