import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  OWNER_ALPHA_AI_REFERENCE_DISCLAIMER,
  OWNER_ALPHA_AI_REFERENCE_LABEL,
  OWNER_ALPHA_CLAIM_VERIFICATION_STATES,
} from "../lib/review-os/owner-alpha-practice-contract.ts";
import {
  evaluateOwnerAlphaCalculationNode,
  ownerAlphaCalculationReleaseBlockers,
  validateOwnerAlphaCalculationGraph,
} from "../lib/review-os/owner-alpha-calculation-validator.ts";
import {
  OwnerAlphaPracticeRuntime,
} from "../lib/review-os/owner-alpha-practice-runtime.ts";
import { OwnerAlphaProviderError } from "../lib/review-os/owner-alpha-practice-provider-contract.ts";

function clone(value) {
  return value === null || value === undefined ? value : structuredClone(value);
}

function memoryRepository() {
  const rows = new Map();
  const evidence = {
    attempts: [],
    rewrites: [],
    referenceUsage: [],
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
      assert.ok(current, "session must exist");
      assert.equal(current.recordVersion, expectedRecordVersion, "CAS record version");
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
        exposure: session.assistance.answerExposure,
        assistanceLevel: session.assistance.assistanceLevel,
      });
    },
    async saveRewrite(session) {
      evidence.rewrites.push({ sessionId: session.sessionId, rewrite: clone(session.rewrite) });
    },
    async recordReferenceUsage(session) {
      const row = {
        sessionId: session.sessionId,
        providerState: session.providerState.reference,
      };
      const existing = evidence.referenceUsage.findIndex(
        (item) => item.sessionId === session.sessionId,
      );
      if (existing === -1) evidence.referenceUsage.push(row);
      else evidence.referenceUsage[existing] = row;
    },
    async projectCompletion(session, projection) {
      evidence.completions.push({
        sessionId: session.sessionId,
        projection: clone(projection),
        dueAt: session.fixedD1DueAt,
      });
    },
  };
}

function calculationForFamily(family, conflict = false) {
  const common = {
    nodeId: `calc-${family}`,
    claimId: `claim-${family}`,
    label: `${family} 범용 계산`,
    resultUnit: "원",
    critical: true,
  };
  if (family === "cost_approach") {
    return {
      ...common,
      primitive: "area_times_unit_price",
      area: 100,
      unitPrice: 2_000_000,
      claimedResult: conflict ? 999 : 200_000_000,
    };
  }
  if (family === "comparison_approach") {
    return {
      ...common,
      primitive: "allocation",
      total: 1_000_000_000,
      ratio: 60,
      ratioInput: "percent",
      claimedResult: conflict ? 999 : 600_000_000,
    };
  }
  return {
    ...common,
    primitive: "present_value",
    futureValue: 110_000_000,
    rate: 10,
    periods: 1,
    rateInput: "percent",
    claimedResult: conflict ? 999 : 100_000_000,
  };
}

function referenceDraft(family, { conflict = false, unresolvedMethod = false } = {}) {
  const calculation = unresolvedMethod ? null : calculationForFamily(family, conflict);
  const conceptId = `concept-${family}`;
  return {
    reference: {
      referenceId: `reference-${family}`,
      label: OWNER_ALPHA_AI_REFERENCE_LABEL,
      disclaimer: OWNER_ALPHA_AI_REFERENCE_DISCLAIMER,
      modelProfileId: "fake-owner-alpha.v1",
      promptVersion: "fake-prompt.v1",
      schemaVersion: "fake-schema.v1",
      generatedAt: "2026-07-22T00:00:00.000Z",
      hints: [1, 2, 3, 4].map((level) => ({
        hintId: `hint-${family}-${level}`,
        level,
        text: `${family} 힌트 ${level}`,
      })),
      l1: {
        title: "L1",
        sections: [{ heading: "회상 뼈대", body: "요구사항과 방법 선택 이유를 먼저 쓴다." }],
      },
      l2: {
        title: "L2",
        sections: [{ heading: "시험 분량", body: "산식과 단위를 포함한 학습 답안이다." }],
      },
      l3: {
        title: "L3",
        sections: [{ heading: "개념 주석", body: "대안은 근거가 있을 때만 구분한다." }],
      },
      claims: [
        {
          claimId: `claim-${family}`,
          claimType: unresolvedMethod ? "method" : "formula",
          summary: unresolvedMethod ? "방법 선택은 추가 검토가 필요합니다." : "구조화된 계산 결과",
          state: unresolvedMethod ? "unresolved_needs_review" : "ai_inference",
          critical: true,
          evidenceRefIds: [],
          calculationNodeId: calculation?.nodeId ?? null,
          resolutionCode: unresolvedMethod ? "multiple_reasonable_approaches" : "provider_only",
        },
      ],
      calculationGraph: { nodes: calculation ? [calculation] : [] },
      releaseStatus: "released",
      blockerCodes: [],
    },
    biggestGap: {
      gapId: `gap-${family}`,
      title: "방법과 수치의 연결",
      reasonSelected: "독립 시도에서 산식 선택 이유가 가장 크게 비었습니다.",
      inferredMisunderstanding: "자료 역할과 산식 입력값을 혼동한 것으로 추정됩니다.",
      successCriteria: "자료 역할을 구분하고 같은 산식을 단위와 함께 재현합니다.",
      conceptIds: [conceptId],
      state: "ai_candidate",
    },
    misconceptionGraph: {
      graphId: `graph-${family}`,
      nodes: [
        {
          conceptId,
          label: "자료 역할과 산식 입력",
          state: "suspected",
          evidenceRefIds: ["independent-attempt"],
        },
      ],
      edges: [],
    },
    rootCauseCandidates: [
      {
        rootCauseId: `root-${family}`,
        label: "자료 역할 선행 구분 부족",
        rationale: "독립 시도에서 입력 자료의 역할 설명이 없었습니다.",
        confidence: "medium",
        evidenceRefIds: ["independent-attempt"],
        conceptIds: [conceptId],
        state: "candidate",
      },
    ],
    variant: {
      variantId: `variant-${family}`,
      kind: "condition",
      changedOneThing: "적용 시점 조건 하나 변경",
      prompt: "적용 시점만 1년 뒤로 바뀌면 계산 순서가 어떻게 달라지는지 쓰세요.",
      verificationState: "ai_inference",
      calculationGraph: { nodes: [] },
    },
  };
}

function provider(options = {}) {
  const calls = { extract: 0, reference: 0 };
  return {
    calls,
    async extractProblem(input) {
      calls.extract += 1;
      if (options.extractError) throw options.extractError;
      return { extractedText: input.problemText || "OCR 추출 문제", modelProfileId: "fake-ocr.v1" };
    },
    async generateReference(input) {
      calls.reference += 1;
      if (options.referenceError) throw options.referenceError;
      return referenceDraft(input.problemModel.methodFamily, options);
    },
  };
}

function harness(options = {}) {
  const repository = memoryRepository();
  const fakeProvider = provider(options);
  let id = 0;
  const now = new Date("2026-07-22T00:00:00.000Z");
  const runtime = new OwnerAlphaPracticeRuntime({
    repository,
    provider: fakeProvider,
    assertReferenceEntitlement: async () => {
      if (options.entitlementError) throw options.entitlementError;
    },
    now: () => new Date(now),
    createId: () => `owner-alpha-id-${++id}`,
    userId: "11111111-1111-4111-8111-111111111111",
  });
  return { runtime, repository, provider: fakeProvider, now };
}

async function prepareAttempt(runtime, problemText) {
  let view = await runtime.create({ problemText, files: [], inputModality: "typed" });
  view = await runtime.confirmProblem({
    sessionId: view.sessionId,
    recordVersion: view.recordVersion,
    confirmedProblemText: view.confirmedProblemText,
  });
  view = await runtime.saveIndependentAttempt({
    sessionId: view.sessionId,
    recordVersion: view.recordVersion,
    attemptText: "방법을 선택하고 문제의 숫자를 산식에 대입해 계산했습니다.",
    elapsedTimeMs: 120_000,
    confidence: "medium",
  });
  return view;
}

async function revealReference(runtime, initial) {
  let view = initial;
  for (let level = 1; level <= 4; level += 1) {
    const result = await runtime.requestAssistance({
      sessionId: view.sessionId,
      recordVersion: view.recordVersion,
      questionText: level === 1 ? "이 자료를 어느 단계에 적용하나요?" : null,
      revealFull: false,
    });
    assert.equal(result.providerFailed, false);
    view = result.view;
    assert.equal(view.aiReference, null, "full reference remains hidden before explicit reveal");
    assert.equal(view.visibleHints.length, level);
  }
  const revealed = await runtime.requestAssistance({
    sessionId: view.sessionId,
    recordVersion: view.recordVersion,
    questionText: "전체 학습용 기준안을 확인하겠습니다.",
    revealFull: true,
  });
  assert.equal(revealed.providerFailed, false);
  return revealed.view;
}

const smokeFamilies = [
  {
    family: "cost_approach",
    text: "대상건물의 면적은 100㎡이고 재조달원가 단가는 200만원/㎡이다. 내용연수와 잔존내용연수를 고려하여 감가수정 후 적산가격을 산정하시오.",
  },
  {
    family: "comparison_approach",
    text: "거래사례비교법을 적용한다. 사례가격은 10억원이고 토지 배분비율은 60%이다. 사정보정과 시점수정을 거쳐 대상 토지가격을 산정하시오.",
    expectedProblemNumber: 1_000_000_000,
  },
  {
    family: "income_approach",
    text: "수익방식으로 평가한다. 1년 후 순수익은 1억1천만원이고 할인율은 10%이다. 현재가치와 환원가액을 산정하시오.",
    expectedProblemNumber: 110_000_000,
  },
];

for (const fixture of smokeFamilies) {
  test(`${fixture.family} uses the same generic independent-attempt, verification, rewrite, and D+1 loop`, async () => {
    const { runtime, repository, provider: fakeProvider, now } = harness();
    let view = await prepareAttempt(runtime, fixture.text);
    assert.equal(view.problemModel.methodFamily, fixture.family);
    assert.ok(view.problemModel.requirements.length >= 1);
    assert.ok(view.problemModel.givenNumbers.length >= 1);
    if (fixture.expectedProblemNumber) {
      assert.equal(
        view.problemModel.givenNumbers.some(
          (number) => number.value === fixture.expectedProblemNumber,
        ),
        true,
        "Korean currency compounds remain one reproducible problem-given value",
      );
    }
    assert.equal(
      view.problemModel.claimVerificationStates
        .filter((claim) => claim.claimType === "number")
        .every((claim) => claim.state === "problem_given"),
      true,
    );
    assert.equal(view.assistance.independentAttemptBeforeHelp, true);
    assert.equal(view.assistance.answerExposure, "none");
    assert.deepEqual(repository.evidence.attempts[0], {
      sessionId: view.sessionId,
      exposure: "none",
      assistanceLevel: 0,
    });

    view = await revealReference(runtime, view);
    assert.equal(fakeProvider.calls.reference, 1);
    assert.equal(view.aiReference.label, OWNER_ALPHA_AI_REFERENCE_LABEL);
    assert.match(view.aiReference.disclaimer, /공식 정답/);
    assert.equal(view.aiReference.l1.sections.length > 0, true);
    assert.equal(view.aiReference.l2.sections.length > 0, true);
    assert.equal(view.aiReference.l3.sections.length > 0, true);
    assert.equal(view.calculationChecks[0].status, "validated");
    assert.equal(
      view.problemModel.claimVerificationStates.some(
        (claim) => claim.state === "deterministically_validated",
      ),
      true,
    );
    assert.equal(view.biggestGap.state, "ai_candidate");
    assert.equal(view.misconceptionGraph.nodes.length, 1);
    assert.equal(view.rootCauseCandidates.length, 1);
    assert.ok(view.questionChain.entries.length >= 3);

    const completed = await runtime.completeRewrite({
      sessionId: view.sessionId,
      recordVersion: view.recordVersion,
      mode: fixture.family === "income_approach" ? "recalculate" : "rewrite",
      rewriteText: "자료 역할을 먼저 구분하고, 선택 이유를 쓴 뒤 단위가 유지되도록 직접 다시 계산했습니다.",
      inferredMisunderstanding: "자료 역할과 산식 입력 순서를 혼동했습니다.",
      successCriteria: "같은 방법을 이유·단위와 함께 독립적으로 재현합니다.",
    });
    assert.equal(completed.status, "completed");
    assert.equal(
      Date.parse(completed.fixedD1DueAt) - now.getTime(),
      86_400_000,
      "D+1 is fixed at exactly 24 hours",
    );
    assert.ok(completed.links.reviewQueueItemId);
    assert.ok(completed.links.todayActionSeedId);
    assert.ok(completed.links.learningRecordId);
    assert.equal(completed.questionChain.entries.at(-1).kind, "variant");
    assert.equal(repository.evidence.referenceUsage.length, 1);
    assert.equal(repository.evidence.rewrites.length, 1);
    assert.equal(repository.evidence.completions.length, 1);
  });
}

test("critical AI/deterministic disagreement fails closed without reference promotion or success usage", async () => {
  const { runtime, repository } = harness({ conflict: true });
  let view = await prepareAttempt(
    runtime,
    "원가방식으로 대상건물 100㎡에 단가 200만원을 적용하여 재조달원가를 산정하시오.",
  );
  const result = await runtime.requestAssistance({
    sessionId: view.sessionId,
    recordVersion: view.recordVersion,
    questionText: "계산값을 확인해 주세요.",
    revealFull: true,
  });
  view = result.view;
  assert.equal(view.status, "reference_withheld");
  assert.equal(view.providerState.reference, "withheld");
  assert.equal(view.aiReference, null);
  assert.deepEqual(view.visibleHints, []);
  assert.equal(view.calculationChecks[0].status, "conflict");
  assert.equal(
    view.problemModel.claimVerificationStates.some(
      (claim) => claim.resolutionCode === "deterministic_conflict" && claim.state === "unresolved_needs_review",
    ),
    true,
  );
  assert.equal(repository.evidence.referenceUsage.length, 0);
});

test("provider timeout persists no AI evidence or usage and the native rewrite/D+1 loop remains available", async () => {
  const { runtime, repository } = harness({
    referenceError: new OwnerAlphaProviderError("timeout"),
  });
  let view = await prepareAttempt(
    runtime,
    "수익방식으로 순수익 1억원과 환원이율 5%를 적용하여 수익가액을 산정하시오.",
  );
  const failed = await runtime.requestAssistance({
    sessionId: view.sessionId,
    recordVersion: view.recordVersion,
    questionText: "환원 순서를 확인하고 싶습니다.",
    revealFull: false,
  });
  assert.equal(failed.providerFailed, true);
  view = failed.view;
  assert.equal(view.providerState.reference, "failed_retryable");
  assert.equal(view.providerState.failureCode, "timeout");
  assert.equal(view.aiReference, null);
  assert.equal(view.biggestGap.state, "fallback_unresolved");
  assert.equal(view.variant.verificationState, "unresolved_needs_review");
  assert.equal(repository.evidence.referenceUsage.length, 0);

  const completed = await runtime.completeRewrite({
    sessionId: view.sessionId,
    recordVersion: view.recordVersion,
    mode: "recalculate",
    rewriteText: "AI 없이 순수익을 환원이율로 나누고 단위와 결과를 직접 검산했습니다.",
    inferredMisunderstanding: "환원이율의 백분율 방향을 다시 확인해야 합니다.",
    successCriteria: "환원이율을 소수로 바꾸어 직접 재계산합니다.",
  });
  assert.equal(completed.status, "completed");
  assert.equal(repository.evidence.completions.length, 1);
});

test("entitlement quota fails closed into the same native rewrite and D+1 fallback without a provider call", async () => {
  const { runtime, repository, provider: fakeProvider } = harness({
    entitlementError: new OwnerAlphaProviderError("quota"),
  });
  let view = await prepareAttempt(
    runtime,
    "거래사례비교법으로 사례가격 10억원에 배분비율 60%를 적용하여 토지가격을 산정하시오.",
  );
  const failed = await runtime.requestAssistance({
    sessionId: view.sessionId,
    recordVersion: view.recordVersion,
    questionText: "AI 한도와 무관하게 직접 복습을 계속합니다.",
    revealFull: false,
  });
  view = failed.view;
  assert.equal(failed.providerFailed, true);
  assert.equal(view.providerState.failureCode, "quota");
  assert.equal(view.providerState.reference, "failed_retryable");
  assert.equal(fakeProvider.calls.reference, 0);
  assert.equal(repository.evidence.referenceUsage.length, 0);

  const completed = await runtime.completeRewrite({
    sessionId: view.sessionId,
    recordVersion: view.recordVersion,
    mode: "recalculate",
    rewriteText: "사례가격과 배분비율의 방향을 직접 확인하고 AI 없이 다시 계산했습니다.",
    inferredMisunderstanding: "배분비율 적용 방향을 다시 확인해야 합니다.",
    successCriteria: "전체 가격과 배분비율을 사용해 직접 재현합니다.",
  });
  assert.equal(completed.status, "completed");
  assert.equal(repository.evidence.completions.length, 1);
});

test("mixed method stays unresolved instead of receiving fabricated certainty", async () => {
  const { runtime } = harness({ unresolvedMethod: true });
  let view = await prepareAttempt(
    runtime,
    "원가방식과 수익방식을 함께 검토하고 어느 방법을 적용할지 논한 뒤 가격을 산정하시오.",
  );
  assert.equal(view.problemModel.methodFamily, "mixed_or_uncertain");
  assert.equal(
    view.problemModel.claimVerificationStates.find((claim) => claim.claimType === "method").state,
    "unresolved_needs_review",
  );
  view = await revealReference(runtime, view);
  assert.equal(
    view.problemModel.claimVerificationStates
      .filter((claim) => claim.claimType === "method")
      .every((claim) => claim.state === "unresolved_needs_review"),
    true,
  );
});

test("hostile provider cannot self-promote an AI claim to official or deterministic evidence", async () => {
  const repository = memoryRepository();
  const hostileProvider = provider();
  hostileProvider.generateReference = async (input) => {
    const draft = referenceDraft(input.problemModel.methodFamily, { unresolvedMethod: true });
    draft.reference.claims[0].state = "official_source_grounded";
    draft.reference.claims[0].resolutionCode = "supported";
    return draft;
  };
  let id = 0;
  const hostileRuntime = new OwnerAlphaPracticeRuntime({
    repository,
    provider: hostileProvider,
    assertReferenceEntitlement: async () => {},
    now: () => new Date("2026-07-22T00:00:00.000Z"),
    createId: () => `hostile-${++id}`,
    userId: "11111111-1111-4111-8111-111111111111",
  });
  let view = await prepareAttempt(
    hostileRuntime,
    "수익방식으로 순수익 1억원과 환원이율 5%를 적용하여 수익가액을 산정하시오.",
  );
  view = (await hostileRuntime.requestAssistance({
    sessionId: view.sessionId,
    recordVersion: view.recordVersion,
    questionText: null,
    revealFull: true,
  })).view;
  const hostileClaim = view.problemModel.claimVerificationStates.at(-1);
  assert.equal(hostileClaim.state, "ai_inference");
  assert.equal(hostileClaim.resolutionCode, "provider_only");
});

test("CAS claim allows only one provider call for concurrent assistance requests", async () => {
  const { runtime, provider: fakeProvider } = harness();
  const view = await prepareAttempt(
    runtime,
    "원가방식으로 대상건물 100㎡의 재조달원가와 감가수정액을 산정하시오.",
  );
  const input = {
    sessionId: view.sessionId,
    recordVersion: view.recordVersion,
    questionText: "동시에 보낸 질문입니다.",
    revealFull: false,
  };
  const settled = await Promise.allSettled([
    runtime.requestAssistance(input),
    runtime.requestAssistance(input),
  ]);
  assert.equal(settled.filter((item) => item.status === "fulfilled").length, 1);
  assert.equal(settled.filter((item) => item.status === "rejected").length, 1);
  assert.equal(fakeProvider.calls.reference, 1);
});

test("a visible in-flight provider lease blocks an updated-version hostile retry", async () => {
  const repository = memoryRepository();
  let releaseProvider;
  let providerCalls = 0;
  const heldProvider = provider();
  heldProvider.generateReference = async (input) => {
    providerCalls += 1;
    await new Promise((resolve) => {
      releaseProvider = resolve;
    });
    return referenceDraft(input.problemModel.methodFamily);
  };
  let id = 0;
  const runtime = new OwnerAlphaPracticeRuntime({
    repository,
    provider: heldProvider,
    assertReferenceEntitlement: async () => {},
    now: () => new Date("2026-07-22T00:00:00.000Z"),
    createId: () => `lease-${++id}`,
    userId: "11111111-1111-4111-8111-111111111111",
  });
  const view = await prepareAttempt(
    runtime,
    "수익방식으로 순수익 1억원을 환원이율 5%로 환원하시오.",
  );
  const first = runtime.requestAssistance({
    sessionId: view.sessionId,
    recordVersion: view.recordVersion,
    questionText: "첫 요청",
    revealFull: false,
  });
  while (!releaseProvider) await new Promise((resolve) => setImmediate(resolve));
  const generating = await repository.load(view.sessionId);
  assert.equal(generating.providerState.reference, "generating");
  await assert.rejects(
    runtime.requestAssistance({
      sessionId: view.sessionId,
      recordVersion: generating.recordVersion,
      questionText: "공격적 중복 요청",
      revealFull: false,
    }),
    /invalid_transition/,
  );
  assert.equal(providerCalls, 1);
  releaseProvider();
  await first;
});

test("a stale provider completion cannot commit usage before canonical session CAS", async () => {
  const repository = memoryRepository();
  let releaseFirstProvider;
  let providerCalls = 0;
  const staleProvider = provider();
  staleProvider.generateReference = async (input) => {
    providerCalls += 1;
    if (providerCalls === 1) {
      await new Promise((resolve) => {
        releaseFirstProvider = resolve;
      });
      return referenceDraft(input.problemModel.methodFamily);
    }
    throw new OwnerAlphaProviderError("timeout");
  };
  let id = 0;
  let now = new Date("2026-07-22T00:00:00.000Z");
  const runtime = new OwnerAlphaPracticeRuntime({
    repository,
    provider: staleProvider,
    assertReferenceEntitlement: async () => {},
    now: () => new Date(now),
    createId: () => `stale-provider-${++id}`,
    userId: "11111111-1111-4111-8111-111111111111",
  });
  const view = await prepareAttempt(
    runtime,
    "수익방식으로 순수익 1억원을 환원이율 5%로 환원하시오.",
  );
  const first = runtime.requestAssistance({
    sessionId: view.sessionId,
    recordVersion: view.recordVersion,
    questionText: "첫 요청",
    revealFull: false,
  });
  while (!releaseFirstProvider) await new Promise((resolve) => setImmediate(resolve));

  now = new Date("2026-07-22T00:01:01.000Z");
  const expiredLease = await repository.load(view.sessionId);
  const retry = await runtime.requestAssistance({
    sessionId: view.sessionId,
    recordVersion: expiredLease.recordVersion,
    questionText: "만료 후 재시도",
    revealFull: false,
  });
  assert.equal(retry.providerFailed, true);
  assert.equal(retry.view.providerState.failureCode, "timeout");

  releaseFirstProvider();
  await assert.rejects(first, /CAS record version/);
  assert.equal(repository.evidence.referenceUsage.length, 0);
  assert.equal((await repository.load(view.sessionId)).providerState.reference, "failed_retryable");
});

test("completion CAS is claimed before Queue, Today, Record, or rewrite projections", async () => {
  const { runtime, repository } = harness();
  let view = await prepareAttempt(
    runtime,
    "원가방식으로 대상건물 100㎡에 단가 200만원을 적용하여 적산가격을 산정하시오.",
  );
  view = (await runtime.requestAssistance({
    sessionId: view.sessionId,
    recordVersion: view.recordVersion,
    questionText: null,
    revealFull: true,
  })).view;
  const command = {
    sessionId: view.sessionId,
    recordVersion: view.recordVersion,
    mode: "recalculate",
    rewriteText: "자료 역할과 단위를 구분하고 같은 산식을 직접 다시 계산했습니다.",
    inferredMisunderstanding: "단가 입력 순서를 혼동했습니다.",
    successCriteria: "면적과 단가를 단위와 함께 재현합니다.",
  };
  const settled = await Promise.allSettled([
    runtime.completeRewrite(command),
    runtime.completeRewrite(command),
  ]);
  assert.equal(settled.filter((item) => item.status === "fulfilled").length, 1);
  assert.equal(settled.filter((item) => item.status === "rejected").length, 1);
  assert.equal(repository.evidence.rewrites.length, 1);
  assert.equal(repository.evidence.completions.length, 1);
});

test("Question Replay Link connects a later similar misconception without a graph UI", async () => {
  const { runtime } = harness();
  let first = await prepareAttempt(
    runtime,
    "거래사례비교법에서 사례가격 10억원의 토지 배분비율 60%를 적용하여 토지가격을 산정하시오.",
  );
  first = (await runtime.requestAssistance({
    sessionId: first.sessionId,
    recordVersion: first.recordVersion,
    questionText: "배분 순서를 묻습니다.",
    revealFull: false,
  })).view;
  assert.equal(first.questionReplayLinks.length, 0);

  let second = await prepareAttempt(
    runtime,
    "거래사례비교법에서 사례가격 12억원의 건물 배분비율 40%를 적용하고 사정보정하시오.",
  );
  second = (await runtime.requestAssistance({
    sessionId: second.sessionId,
    recordVersion: second.recordVersion,
    questionText: "이번에도 배분 자료 역할이 헷갈립니다.",
    revealFull: false,
  })).view;
  assert.equal(second.questionReplayLinks.length, 1);
  assert.equal(second.questionReplayLinks[0].priorSessionId, first.sessionId);
  assert.ok(["misconception", "root_cause"].includes(second.questionReplayLinks[0].basis));
});

test("all reusable deterministic primitives reproduce supported arithmetic outside the LLM", () => {
  const nodes = [
    { nodeId: "expression", claimId: null, label: "expression", primitive: "expression_order", expression: { kind: "operation", operator: "add", operands: [{ kind: "literal", value: 2 }, { kind: "operation", operator: "multiply", operands: [{ kind: "literal", value: 3 }, { kind: "literal", value: 4 }] }] }, claimedResult: 14, resultUnit: null, critical: true },
    { nodeId: "sum", claimId: null, label: "sum", primitive: "sum", values: [1, 2, 3], claimedResult: 6, resultUnit: null, critical: true },
    { nodeId: "subtract", claimId: null, label: "subtract", primitive: "subtraction", minuend: 10, subtrahends: [2, 3], claimedResult: 5, resultUnit: null, critical: true },
    { nodeId: "ratio", claimId: null, label: "ratio", primitive: "ratio", numerator: 1, denominator: 2, claimedResult: 0.5, resultUnit: null, critical: true },
    { nodeId: "percent", claimId: null, label: "percent", primitive: "percentage_direction", baseValue: 100, rate: 10, direction: "increase", rateInput: "percent", claimedResult: 110, resultUnit: null, critical: true },
    { nodeId: "unit", claimId: null, label: "unit", primitive: "unit_conversion", value: 1, fromUnit: "평", toUnit: "㎡", claimedResult: 3.305785, resultUnit: "㎡", critical: true },
    { nodeId: "date", claimId: null, label: "date", primitive: "elapsed_period", fromDate: "2024-01-01", toDate: "2024-01-31", basis: "days", claimedResult: 30, resultUnit: "days", critical: true },
    { nodeId: "round", claimId: null, label: "round", primitive: "rounding", value: 1.236, digits: 2, mode: "round", claimedResult: 1.24, resultUnit: null, critical: true },
    { nodeId: "significant", claimId: null, label: "significant", primitive: "significant_digits", value: 1234, digits: 2, claimedResult: 1200, resultUnit: null, critical: true },
    { nodeId: "area", claimId: null, label: "area", primitive: "area_times_unit_price", area: 20, unitPrice: 30, claimedResult: 600, resultUnit: null, critical: true },
    { nodeId: "allocation", claimId: null, label: "allocation", primitive: "allocation", total: 1000, ratio: 40, ratioInput: "percent", claimedResult: 400, resultUnit: null, critical: true },
    { nodeId: "residual", claimId: null, label: "residual", primitive: "residual", total: 1000, deductions: [100, 50], claimedResult: 850, resultUnit: null, critical: true },
    { nodeId: "index", claimId: null, label: "index", primitive: "index_ratio", targetIndex: 120, baseIndex: 100, claimedResult: 1.2, resultUnit: null, critical: true },
    { nodeId: "pv", claimId: null, label: "pv", primitive: "present_value", futureValue: 110, rate: 10, periods: 1, rateInput: "percent", claimedResult: 100, resultUnit: null, critical: true },
    { nodeId: "annuity", claimId: null, label: "annuity", primitive: "annuity_factor", rate: 10, periods: 2, rateInput: "percent", claimedResult: 1.7355371900826446, resultUnit: null, critical: true },
    { nodeId: "cap", claimId: null, label: "cap", primitive: "capitalization", netIncome: 100, capitalizationRate: 5, rateInput: "percent", claimedResult: 2000, resultUnit: null, critical: true },
    { nodeId: "life", claimId: null, label: "life", primitive: "remaining_life_ratio", remainingLife: 20, totalLife: 40, claimedResult: 0.5, resultUnit: null, critical: true },
  ];
  const checks = validateOwnerAlphaCalculationGraph({ nodes });
  assert.equal(checks.length, nodes.length);
  assert.equal(checks.every((check) => check.status === "validated"), true);
  assert.equal(evaluateOwnerAlphaCalculationNode(nodes[0]), 14);

  const invalid = validateOwnerAlphaCalculationGraph({
    nodes: [{ nodeId: "bad", claimId: null, label: "bad", primitive: "ratio", numerator: 1, denominator: 0, claimedResult: 0, resultUnit: null, critical: true }],
  });
  assert.equal(invalid[0].status, "invalid");
  assert.equal(ownerAlphaCalculationReleaseBlockers(invalid).length, 1);
});

test("native contract, owner gate, RLS-bound repository, and private existing-route UI remain explicit", async () => {
  assert.deepEqual(OWNER_ALPHA_CLAIM_VERIFICATION_STATES, [
    "problem_given",
    "official_source_grounded",
    "deterministically_validated",
    "cross_checked_ai",
    "ai_inference",
    "unresolved_needs_review",
  ]);
  const [
    contract,
    access,
    repository,
    api,
    page,
    ui,
    migration,
    runtimeEvidence,
    runtimeWorkflow,
  ] = await Promise.all([
    readFile("lib/review-os/owner-alpha-practice-contract.ts", "utf8"),
    readFile("lib/review-os/owner-alpha-practice-access.ts", "utf8"),
    readFile("lib/review-os/owner-alpha-practice-repository.ts", "utf8"),
    readFile("app/api/problem-snap/owner-alpha/route.ts", "utf8"),
    readFile("app/problem-snap/page.tsx", "utf8"),
    readFile("components/review-os/owner-alpha-practice-loop.tsx", "utf8"),
    readFile("supabase/migrations/20260422_inverge_service_core.sql", "utf8"),
    readFile("scripts/automation/verify-owner-alpha-practice-runtime.mjs", "utf8"),
    readFile(".github/workflows/owner-alpha-practice-runtime.yml", "utf8"),
  ]);
  for (const field of [
    "topicCandidates", "methodFamily", "subMethodCandidates", "requirements",
    "requestedOutputs", "pointAllocation", "entitiesAndRoles", "givenFacts",
    "givenNumbers", "units", "datesAndTimePoints", "assumptions", "methodCandidates",
    "rejectionReasons", "calculationGraph", "sourceStates", "claimVerificationStates",
    "questionChain", "misconceptionGraph", "rootCauseCandidates", "questionReplayLinks",
  ]) assert.match(contract, new RegExp(field));
  assert.match(contract, /OWNER_ALPHA_UNIVERSAL_PRACTICE_ENABLED/);
  assert.match(access, /process\.env\[OWNER_ALPHA_PRACTICE_FLAG\] === "true"/);
  assert.match(access, /session\.isAuthenticated/);
  assert.match(access, /isAllowedAdminEmail/);
  assert.match(repository, /createSupabaseServerClient/);
  assert.match(repository, /authResult\.data\.user\?\.id !== userId/);
  assert.match(repository, /\.eq\("user_id", this\.userId\)/);
  assert.equal(repository.includes("createSupabaseAdminClient"), false);
  assert.match(api, /requireOwnerAlphaPracticeAccess/);
  assert.ok(api.indexOf("requireOwnerAlphaPracticeAccess") < api.indexOf("request.formData()"));
  assert.match(page, /ownerAlpha === OWNER_ALPHA_PRACTICE_ROUTE_KEY/);
  assert.match(ui, /AI 학습용 기준안/);
  assert.match(ui, /지금 무엇을 해야 하나요/);
  assert.match(ui, /왜 이 과제인가/);
  assert.match(ui, /추정되는 혼동/);
  assert.match(ui, /성공 기준/);
  assert.match(migration, /create policy "exam sessions own access"/);
  assert.match(migration, /create policy "answer submissions own access"/);
  assert.match(migration, /create policy "rewrite submissions own access"/);
  assert.match(migration, /create policy "review queue own access"/);
  assert.match(runtimeEvidence, /20260721060237_s233a_answer_review_persistence\.sql/);
  assert.match(runtimeEvidence, /seven_table_cross_user_update_denied/);
  assert.match(runtimeWorkflow, /github\.event\.pull_request\.head\.sha/);
  assert.match(runtimeWorkflow, /owner-alpha-universal-practice-runtime\.spec\.ts/);
  assert.match(runtimeWorkflow, /upload-artifact@v4/);
});
