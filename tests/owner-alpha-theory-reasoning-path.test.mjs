import assert from "node:assert/strict";
import test from "node:test";

import { compileOwnerAlphaPracticeProblem } from "../lib/review-os/owner-alpha-practice-compiler.ts";
import {
  isOwnerAlphaTheoryReasoningPath,
  ownerAlphaTheoryReasoningPathProjection,
  verifyOwnerAlphaTheoryRepair,
} from "../lib/review-os/owner-alpha-theory-reasoning-path.ts";

const adapter = compileOwnerAlphaPracticeProblem({
  problemId: "synthetic-theory-reasoning",
  problemText:
    "시장가치의 정의와 가치 형성 원리를 제시하고 두 관점을 비교하라. 논리적 전제와 실무 적용을 평가하여 결론을 제시하시오.",
  subject: "appraisal_theory",
}).subjectAdapter;

assert.equal(adapter.adapter, "TheoryAdapter");

const initialCommitment = {
  demandVerb: "비교하고 평가하라",
  thesis: "가치 형성은 시장 참여자의 판단과 제약 조건의 상호작용으로 설명할 수 있다.",
  orderedOutlineItems: [
    { outlineItemId: "learner-outline-1", label: "정의와 전제" },
    { outlineItemId: "learner-outline-2", label: "관점 비교와 평가" },
    { outlineItemId: "learner-outline-3", label: "실무 연결과 결론" },
  ],
  selectedConcepts: [
    { conceptId: "learner-concept-1", label: "시장 참여자 판단" },
    { conceptId: "learner-concept-2", label: "가치 형성 제약" },
  ],
  confidence: "medium",
  committedAt: "2026-08-04T00:00:00.000Z",
};

function path(adapterInput = adapter) {
  return ownerAlphaTheoryReasoningPathProjection({
    pathId: "synthetic-theory:path",
    problemRevisionChecksum: "problem-revision-sha256",
    adapterBasisChecksum: "adapter-basis-sha256",
    adapter: adapterInput,
    initialCommitment: structuredClone(initialCommitment),
    basisChecksum: "initial-basis-sha256",
  });
}

function repair(overrides = {}) {
  return {
    demandVerb: "비교하고 평가하라",
    thesis: "가치 형성은 시장 참여자의 판단과 제약 조건의 상호작용으로 설명할 수 있다.",
    orderedOutlineItems: structuredClone(initialCommitment.orderedOutlineItems),
    selectedConcepts: structuredClone(initialCommitment.selectedConcepts),
    conceptArgumentLinks: [
      {
        conceptId: "learner-concept-1",
        outlineItemId: "learner-outline-1",
        argument: "시장 참여자의 판단이 가치 정의의 전제를 형성한다.",
      },
      {
        conceptId: "learner-concept-2",
        outlineItemId: "learner-outline-2",
        argument: "제약 조건의 차이가 두 관점의 평가를 갈라놓는다.",
      },
    ],
    comparisonOrEvaluation:
      "두 관점의 전제와 설명 범위를 비교하고 실무 적용의 한계를 평가한다.",
    counterPosition:
      "단일 원리만으로도 설명할 수 있다는 반대 입장을 검토한다.",
    conclusion: "따라서 상호작용 관점이 더 넓은 설명 구조를 제공한다.",
    compression: "정의-전제-비교-평가-결론을 한 줄로 연결한다.",
    ...overrides,
  };
}

function verify(options = {}) {
  const submission = options.submission ?? repair();
  const revisedCommitment = options.revisedCommitment ?? {
    demandVerb: submission.demandVerb,
    thesis: submission.thesis,
    orderedOutlineItems: structuredClone(submission.orderedOutlineItems),
    selectedConcepts: structuredClone(submission.selectedConcepts),
    confidence: "medium",
    committedAt: "2026-08-04T01:00:00.000Z",
  };
  return verifyOwnerAlphaTheoryRepair({
    path: options.path ?? path(),
    adapter: options.adapter ?? adapter,
    revisedCommitment,
    submission,
    supportedAt: "2026-08-04T01:00:00.000Z",
    problemRevisionChecksum:
      options.problemRevisionChecksum ?? "problem-revision-sha256",
    adapterBasisChecksum:
      options.adapterBasisChecksum ?? "adapter-basis-sha256",
    basisChecksum: "repair-basis-sha256",
  });
}

test("learner-authored outline and concept IDs need not equal hidden canonical adapter refs", () => {
  const projected = path();
  assert.equal(projected.repairVerification.status, "not_started");
  assert.notDeepEqual(
    projected.initialCommitment.orderedOutlineItems.map((item) => item.outlineItemId),
    projected.postCommitCanonicalOutlineRoleRefs,
  );
  assert.notDeepEqual(
    projected.initialCommitment.selectedConcepts.map((item) => item.conceptId),
    projected.postCommitCanonicalConceptRefs,
  );
  assert.equal(isOwnerAlphaTheoryReasoningPath(projected), true);

  const supported = verify();
  assert.equal(supported.repairVerification.status, "structurally_supported");
  assert.equal(supported.repairVerification.scope, "deterministic_structure_only");
  assert.deepEqual(supported.initialCommitment, initialCommitment);
  assert.equal("score" in supported.repairVerification, false);
  assert.equal("correct" in supported.repairVerification, false);
  assert.equal("official" in supported.repairVerification, false);
  assert.equal("verified" in supported.repairVerification, false);
  assert.equal("mastery" in supported.repairVerification, false);
  assert.equal(isOwnerAlphaTheoryReasoningPath(supported), true);
});

test("missing, duplicate, unknown, out-of-order, mismatched, and unlinked theory structures block", () => {
  const cases = [
    repair({ conclusion: "" }),
    repair({
      selectedConcepts: [
        ...initialCommitment.selectedConcepts,
        structuredClone(initialCommitment.selectedConcepts[0]),
      ],
    }),
    repair({
      conceptArgumentLinks: [
        {
          conceptId: "unknown-concept",
          outlineItemId: "learner-outline-1",
          argument: "존재하지 않는 식별자는 연결할 수 없다.",
        },
      ],
    }),
    repair({ conceptArgumentLinks: [] }),
  ];
  for (const submission of cases) {
    const blocked = verify({ submission });
    assert.equal(blocked.repairVerification.status, "blocked");
    assert.equal(blocked.repairVerification.supportedAt, null);
    assert.ok(blocked.repairVerification.blockerCodes.length > 0);
  }

  const submission = repair();
  const outOfOrder = verify({
    submission,
    revisedCommitment: {
      ...initialCommitment,
      orderedOutlineItems: [...initialCommitment.orderedOutlineItems].reverse(),
      committedAt: "2026-08-04T01:00:00.000Z",
    },
  });
  assert.equal(outOfOrder.repairVerification.status, "blocked");
  assert.ok(
    outOfOrder.repairVerification.blockerCodes.some((code) =>
      code.endsWith(":out_of_order"),
    ),
  );

  const mismatched = verify({
    revisedCommitment: {
      ...initialCommitment,
      thesis: "서로 다른 수정 명제",
      committedAt: "2026-08-04T01:00:00.000Z",
    },
  });
  assert.equal(mismatched.repairVerification.status, "blocked");
});

test("conditional comparison and counter-position dimensions remain fail closed", () => {
  const requiredAdapter = structuredClone(adapter);
  requiredAdapter.supportingAndOpposingConsiderations = ["반대 입장 검토"];
  const requiredPath = path(requiredAdapter);
  assert.equal(requiredPath.comparisonOrEvaluationRequired, true);
  assert.equal(requiredPath.counterPositionRequired, true);
  for (const submission of [
    repair({ comparisonOrEvaluation: null }),
    repair({ counterPosition: null }),
  ]) {
    const blocked = verify({
      submission,
      adapter: requiredAdapter,
      path: requiredPath,
    });
    assert.equal(blocked.repairVerification.status, "blocked");
  }
});

test("invalid learner commitments and invalid hidden adapter refs are rejected before projection", () => {
  const invalidCommitments = [
    { ...initialCommitment, demandVerb: "" },
    { ...initialCommitment, thesis: "" },
    { ...initialCommitment, orderedOutlineItems: [] },
    {
      ...initialCommitment,
      orderedOutlineItems: [
        ...initialCommitment.orderedOutlineItems,
        structuredClone(initialCommitment.orderedOutlineItems[0]),
      ],
    },
    { ...initialCommitment, selectedConcepts: [] },
    {
      ...initialCommitment,
      selectedConcepts: [
        ...initialCommitment.selectedConcepts,
        structuredClone(initialCommitment.selectedConcepts[0]),
      ],
    },
    { ...initialCommitment, committedAt: "not-a-time" },
  ];
  for (const invalidCommitment of invalidCommitments) {
    assert.throws(
      () =>
        ownerAlphaTheoryReasoningPathProjection({
          pathId: "invalid-theory-path",
          problemRevisionChecksum: "problem-revision-sha256",
          adapterBasisChecksum: "adapter-basis-sha256",
          adapter,
          initialCommitment: invalidCommitment,
          basisChecksum: "initial-basis-sha256",
        }),
      /invalid_initial_commitment/,
    );
  }

  for (const invalidAdapter of [
    Object.assign(structuredClone(adapter), {
      paragraphRoles: [...adapter.paragraphRoles, adapter.paragraphRoles[0]],
    }),
    Object.assign(structuredClone(adapter), {
      keyConceptCoverage: [
        ...adapter.keyConceptCoverage,
        structuredClone(adapter.keyConceptCoverage[0]),
      ],
    }),
  ]) {
    assert.throws(
      () => path(invalidAdapter),
      /invalid_adapter_refs/,
    );
  }
});

test("problem or adapter basis drift blocks without changing the initial commitment", () => {
  for (const options of [
    { problemRevisionChecksum: "different-problem" },
    { adapterBasisChecksum: "different-adapter" },
  ]) {
    const blocked = verify(options);
    assert.equal(blocked.repairVerification.status, "blocked");
    assert.deepEqual(blocked.initialCommitment, initialCommitment);
    assert.ok(
      blocked.repairVerification.blockerCodes.includes(
        "theory_repair:adapter_or_problem_basis_mismatch",
      ),
    );
  }
});

test("type guard rejects forged scoring or authoritative verification fields", () => {
  const supported = verify();
  const forgedSupport = path();
  forgedSupport.revisedCommitment = {
    ...structuredClone(initialCommitment),
    committedAt: "2026-08-04T01:00:00.000Z",
  };
  forgedSupport.repairSubmission = repair();
  forgedSupport.repairVerification = {
    scope: "deterministic_structure_only",
    status: "structurally_supported",
    checks: [],
    blockerCodes: [],
    supportedAt: "2026-08-04T01:00:00.000Z",
  };
  assert.equal(isOwnerAlphaTheoryReasoningPath(forgedSupport), false);
  for (const [target, key, value] of [
    ["verification", "score", 100],
    ["verification", "correct", true],
    ["verification", "verified", true],
    ["path", "mastery", true],
  ]) {
    const forged = structuredClone(supported);
    if (target === "verification") forged.repairVerification[key] = value;
    else forged[key] = value;
    assert.equal(isOwnerAlphaTheoryReasoningPath(forged), false);
  }
});
