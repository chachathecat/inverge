import assert from "node:assert/strict";
import test from "node:test";

import { compileOwnerAlphaPracticeProblem } from "../lib/review-os/owner-alpha-practice-compiler.ts";
import {
  isOwnerAlphaTheoryReasoningPath,
  ownerAlphaTheoryReasoningPathProjection,
  verifyOwnerAlphaTheoryRepair,
} from "../lib/review-os/owner-alpha-theory-reasoning-path.ts";

const initialCommittedAt = "2026-08-04T00:00:00.000Z";
const revisedCommittedAt = "2026-08-04T01:00:00.000Z";

function fixture() {
  const problemModel = compileOwnerAlphaPracticeProblem({
    problemId: "theory-reasoning-path-test",
    subject: "appraisal_theory",
    problemText:
      "시장가치의 정의와 가치 형성 원리를 제시하고 두 관점을 비교하라. 각 관점의 논리적 전제와 반대 견해를 검토하고 실무 적용을 평가하여 결론을 제시하시오.",
  });
  assert.equal(problemModel.subjectAdapter.adapter, "TheoryAdapter");
  const adapter = problemModel.subjectAdapter;
  assert.ok(adapter.keyConceptCoverage.some((item) => item.concept === "시장가치"));
  const initialCommitment = {
    demandVerb: "비교·평가하라",
    thesis: "시장가치는 가치 형성 원리를 비교할 때 실무적 의미가 드러난다.",
    orderedOutlineRoleRefs: [...adapter.paragraphRoles],
    selectedConceptRefs: ["시장가치"],
    confidence: "medium",
    committedAt: initialCommittedAt,
  };
  const path = ownerAlphaTheoryReasoningPathProjection({
    pathId: "theory-path-1",
    problemRevisionChecksum: "theory-problem-checksum",
    adapter,
    initialCommitment,
    basisChecksum: "theory-initial-basis",
  });
  const revisedCommitment = {
    demandVerb: "비교·평가하라",
    thesis:
      "시장가치는 가치 형성 원리의 공통점과 차이를 비교하고 실무 적용을 평가해야 설명된다.",
    orderedOutlineRoleRefs: [...adapter.paragraphRoles],
    selectedConceptRefs: ["시장가치"],
    confidence: "medium",
    committedAt: revisedCommittedAt,
  };
  const submission = {
    demandVerb: revisedCommitment.demandVerb,
    thesis: revisedCommitment.thesis,
    orderedOutlineRoleRefs: [...revisedCommitment.orderedOutlineRoleRefs],
    selectedConceptRefs: [...revisedCommitment.selectedConceptRefs],
    conceptArgumentLinks: [
      {
        conceptRef: "시장가치",
        outlineRoleRef: "argument",
        argument: "시장가치 개념을 가치 형성 원리의 논증 단계와 연결한다.",
      },
    ],
    comparisonOrEvaluation:
      "두 관점의 공통점과 차이를 비교하고 실무 적용상 한계를 평가한다.",
    counterPosition:
      "반대 견해가 전제하는 가치 개념을 구분하여 논증의 한계를 제시한다.",
    conclusion:
      "따라서 시장가치는 비교와 평가를 거쳐 실무적 의미를 갖는다.",
    compression: "가치 원리 비교 → 실무 평가 → 시장가치 결론",
  };
  return { adapter, path, initialCommitment, revisedCommitment, submission };
}

test("TheoryReasoningPath preserves pre-feedback commitment and returns structural support without score or correctness claims", () => {
  const { adapter, path, initialCommitment, revisedCommitment, submission } =
    fixture();
  assert.equal(isOwnerAlphaTheoryReasoningPath(path), true);
  assert.deepEqual(path.initialCommitment, initialCommitment);
  assert.equal(path.revisedCommitment, null);
  assert.equal(path.repairVerification.status, "not_started");
  assert.equal(path.comparisonOrEvaluationRequired, true);
  assert.equal(path.counterPositionRequired, true);

  const supported = verifyOwnerAlphaTheoryRepair({
    path,
    adapter,
    revisedCommitment,
    submission,
    supportedAt: revisedCommittedAt,
    basisChecksum: "theory-supported-basis",
  });
  assert.equal(isOwnerAlphaTheoryReasoningPath(supported), true);
  assert.equal(supported.repairVerification.status, "structurally_supported");
  assert.equal(
    supported.repairVerification.checks.every(
      (check) => check.status === "supported",
    ),
    true,
  );
  assert.deepEqual(supported.initialCommitment, initialCommitment);
  assert.deepEqual(supported.revisedCommitment, revisedCommitment);
  assert.equal(supported.repairVerification.blockerCodes.length, 0);
  const serialized = JSON.stringify(supported);
  assert.doesNotMatch(serialized, /numericScore|authoritativeCorrectness|correctnessState/);
  assert.doesNotMatch(serialized, /"status":"verified"/);
});

test("missing, unknown, duplicate, out-of-order, mismatched, and unlinked repair structures block", () => {
  const { adapter, path, revisedCommitment, submission } = fixture();
  const cases = [
    { submission: { ...submission, demandVerb: "" } },
    { submission: { ...submission, thesis: "" } },
    {
      revisedCommitment: { ...revisedCommitment, demandVerb: "" },
      submission,
    },
    {
      revisedCommitment: {
        ...revisedCommitment,
        orderedOutlineRoleRefs: [],
      },
      submission,
    },
    {
      revisedCommitment: {
        ...revisedCommitment,
        selectedConceptRefs: [],
      },
      submission,
    },
    {
      revisedCommitment: {
        ...revisedCommitment,
        selectedConceptRefs: ["unknown-concept"],
      },
      submission,
    },
    {
      revisedCommitment: {
        ...revisedCommitment,
        selectedConceptRefs: ["시장가치", "시장가치"],
      },
      submission,
    },
    {
      submission: {
        ...submission,
        orderedOutlineRoleRefs: submission.orderedOutlineRoleRefs.slice(1),
      },
    },
    {
      submission: {
        ...submission,
        orderedOutlineRoleRefs: [
          ...submission.orderedOutlineRoleRefs,
          submission.orderedOutlineRoleRefs[0],
        ],
      },
    },
    {
      submission: {
        ...submission,
        orderedOutlineRoleRefs: [
          submission.orderedOutlineRoleRefs[1],
          submission.orderedOutlineRoleRefs[0],
          ...submission.orderedOutlineRoleRefs.slice(2),
        ],
      },
    },
    {
      submission: {
        ...submission,
        orderedOutlineRoleRefs: [
          ...submission.orderedOutlineRoleRefs.slice(0, -1),
          "unknown-role",
        ],
      },
    },
    { submission: { ...submission, selectedConceptRefs: [] } },
    {
      submission: {
        ...submission,
        selectedConceptRefs: ["시장가치", "시장가치"],
      },
    },
    {
      submission: {
        ...submission,
        selectedConceptRefs: ["unknown-concept"],
      },
    },
    { submission: { ...submission, conceptArgumentLinks: [] } },
    {
      submission: {
        ...submission,
        conceptArgumentLinks: [
          {
            conceptRef: "unknown-concept",
            outlineRoleRef: "argument",
            argument: "알 수 없는 개념 연결",
          },
        ],
      },
    },
    {
      submission: {
        ...submission,
        conceptArgumentLinks: [
          {
            conceptRef: "시장가치",
            outlineRoleRef: "unknown-role",
            argument: "알 수 없는 목차 역할 연결",
          },
        ],
      },
    },
    {
      submission: {
        ...submission,
        conceptArgumentLinks: [
          submission.conceptArgumentLinks[0],
          { ...submission.conceptArgumentLinks[0] },
        ],
      },
    },
    { submission: { ...submission, comparisonOrEvaluation: null } },
    { submission: { ...submission, counterPosition: null } },
    { submission: { ...submission, conclusion: "" } },
    { submission: { ...submission, compression: "" } },
  ];

  for (const [index, blockedCase] of cases.entries()) {
    const blockedRevisedCommitment =
      blockedCase.revisedCommitment ?? revisedCommitment;
    const blocked = verifyOwnerAlphaTheoryRepair({
      path,
      adapter,
      revisedCommitment: blockedRevisedCommitment,
      submission: blockedCase.submission,
      supportedAt: revisedCommittedAt,
      basisChecksum: `theory-blocked-basis-${index}`,
    });
    assert.equal(blocked.repairVerification.status, "blocked", `case ${index}`);
    assert.equal(
      blocked.repairVerification.blockerCodes.length > 0,
      true,
      `case ${index}`,
    );
    assert.equal(blocked.repairVerification.supportedAt, null, `case ${index}`);
    assert.equal(isOwnerAlphaTheoryReasoningPath(blocked), true, `case ${index}`);
    assert.deepEqual(blocked.initialCommitment, path.initialCommitment);
    assert.deepEqual(blocked.revisedCommitment, blockedRevisedCommitment);
  }
});

test("invalid initial commitment and adapter references are rejected before projection", () => {
  const { adapter, initialCommitment } = fixture();
  const invalidCommitments = [
    { ...initialCommitment, demandVerb: "" },
    { ...initialCommitment, thesis: "" },
    { ...initialCommitment, orderedOutlineRoleRefs: [] },
    {
      ...initialCommitment,
      orderedOutlineRoleRefs: [
        ...initialCommitment.orderedOutlineRoleRefs,
        initialCommitment.orderedOutlineRoleRefs[0],
      ],
    },
    {
      ...initialCommitment,
      orderedOutlineRoleRefs: [
        ...initialCommitment.orderedOutlineRoleRefs.slice(0, -1),
        "unknown-role",
      ],
    },
    { ...initialCommitment, selectedConceptRefs: [] },
    {
      ...initialCommitment,
      selectedConceptRefs: ["시장가치", "시장가치"],
    },
    { ...initialCommitment, selectedConceptRefs: ["unknown-concept"] },
  ];
  for (const invalidCommitment of invalidCommitments) {
    assert.throws(
      () =>
        ownerAlphaTheoryReasoningPathProjection({
          pathId: "invalid-theory-path",
          problemRevisionChecksum: "problem-checksum",
          adapter,
          initialCommitment: invalidCommitment,
          basisChecksum: "basis-checksum",
        }),
      /invalid_initial_commitment/,
    );
  }

  const duplicateAdapter = structuredClone(adapter);
  duplicateAdapter.paragraphRoles.push(duplicateAdapter.paragraphRoles[0]);
  assert.throws(
    () =>
      ownerAlphaTheoryReasoningPathProjection({
        pathId: "duplicate-adapter-path",
        problemRevisionChecksum: "problem-checksum",
        adapter: duplicateAdapter,
        initialCommitment,
        basisChecksum: "basis-checksum",
      }),
    /invalid_adapter_refs/,
  );
});

test("comparison/evaluation and counter-position remain conditional structural dimensions", () => {
  const { adapter, initialCommitment, revisedCommitment, submission } = fixture();
  const optionalAdapter = structuredClone(adapter);
  optionalAdapter.comparisonTargets = [];
  optionalAdapter.evaluation = [];
  optionalAdapter.supportingAndOpposingConsiderations = [];
  optionalAdapter.unresolvedTheoreticalDispute = [];
  const path = ownerAlphaTheoryReasoningPathProjection({
    pathId: "optional-dimensions-path",
    problemRevisionChecksum: "optional-problem-checksum",
    adapter: optionalAdapter,
    initialCommitment,
    basisChecksum: "optional-initial-basis",
  });
  assert.equal(path.comparisonOrEvaluationRequired, false);
  assert.equal(path.counterPositionRequired, false);
  const supported = verifyOwnerAlphaTheoryRepair({
    path,
    adapter: optionalAdapter,
    revisedCommitment,
    submission: {
      ...submission,
      comparisonOrEvaluation: null,
      counterPosition: null,
    },
    supportedAt: revisedCommittedAt,
    basisChecksum: "optional-supported-basis",
  });
  assert.equal(supported.repairVerification.status, "structurally_supported");
  assert.equal(isOwnerAlphaTheoryReasoningPath(supported), true);
});

test("type guard rejects forged structural support, extra score fields, and non-theory status", () => {
  const { adapter, path, revisedCommitment, submission } = fixture();
  const supported = verifyOwnerAlphaTheoryRepair({
    path,
    adapter,
    revisedCommitment,
    submission,
    supportedAt: revisedCommittedAt,
    basisChecksum: "supported-basis",
  });

  const forgedEmpty = structuredClone(path);
  forgedEmpty.revisedCommitment = revisedCommitment;
  forgedEmpty.repairVerification = {
    scope: "deterministic_structure_only",
    status: "structurally_supported",
    checks: [],
    blockerCodes: [],
    supportedAt: revisedCommittedAt,
  };
  assert.equal(isOwnerAlphaTheoryReasoningPath(forgedEmpty), false);

  const withScore = structuredClone(supported);
  withScore.repairVerification.numericScore = 100;
  assert.equal(isOwnerAlphaTheoryReasoningPath(withScore), false);

  const verified = structuredClone(supported);
  verified.repairVerification.status = "verified";
  assert.equal(isOwnerAlphaTheoryReasoningPath(verified), false);
});
