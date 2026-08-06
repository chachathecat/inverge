import assert from "node:assert/strict";
import test from "node:test";

import { evaluateOwnerAlphaCalculationNode } from "../lib/review-os/owner-alpha-calculation-validator.ts";
import { compileOwnerAlphaPracticeProblem } from "../lib/review-os/owner-alpha-practice-compiler.ts";
import {
  isOwnerAlphaPracticalDecisionPath,
  ownerAlphaPracticalDecisionPathProjection,
  verifyOwnerAlphaPracticalRepair,
} from "../lib/review-os/owner-alpha-practical-decision-path.ts";

const committedAt = "2026-08-04T00:00:00.000Z";

function fixture() {
  const problemModel = compileOwnerAlphaPracticeProblem({
    problemId: "practical-decision-path-test",
    problemText:
      "원가방식으로 대상건물 100㎡에 단가 200만원을 적용하여 재조달원가를 산정하시오.",
  });
  const calculationNode = {
    nodeId: "calc-area-unit-price",
    claimId: null,
    label: "면적 × 단가",
    primitive: "area_times_unit_price",
    area: 100,
    unitPrice: 2_000_000,
    claimedResult: 200_000_000,
    resultUnit: "원",
    critical: true,
  };
  problemModel.calculationGraph = { nodes: [calculationNode] };
  problemModel.subjectAdapter.calculationGraphNodeIds = [
    calculationNode.nodeId,
  ];
  const initialCommitment = {
    methodFamily: "mixed_or_uncertain",
    reason: "자료 역할을 먼저 구분해야 해서 방법을 보류했습니다.",
    firstCalculationDirection: "면적과 단가의 단위를 먼저 확인합니다.",
    confidence: "medium",
    committedAt,
  };
  const path = ownerAlphaPracticalDecisionPathProjection({
    pathId: "path-practical-1",
    problemRevisionChecksum: "problem-checksum",
    problemModel,
    initialCommitment,
    basisChecksum: "initial-basis-checksum",
  });
  const revisedCommitment = {
    methodFamily: "cost_approach",
    reason: "면적과 재조달원가 단가의 역할을 확인해 원가방식으로 수정했습니다.",
    firstCalculationDirection: "면적에 단가를 곱해 원 단위 결과를 다시 구합니다.",
    confidence: "medium",
    committedAt: "2026-08-04T01:00:00.000Z",
  };
  return { problemModel, path, revisedCommitment };
}

function requiredNodes(problemModel) {
  const critical = problemModel.calculationGraph.nodes.filter(
    (node) => node.critical,
  );
  return critical.length > 0 ? critical : problemModel.calculationGraph.nodes;
}

test("PracticalDecisionPath preserves the learner commitment and verifies every required value and unit", () => {
  const { problemModel, path, revisedCommitment } = fixture();
  assert.equal(isOwnerAlphaPracticalDecisionPath(path), true);
  assert.equal(path.initialCommitment.methodFamily, "mixed_or_uncertain");
  assert.equal(path.repairVerification.status, "not_started");

  const submissions = requiredNodes(problemModel).map((node) => ({
    nodeId: node.nodeId,
    value: evaluateOwnerAlphaCalculationNode(node),
    unit: node.resultUnit,
  }));
  assert.ok(submissions.length > 0);
  assert.equal(submissions.every((item) => Number.isFinite(item.value)), true);

  const verified = verifyOwnerAlphaPracticalRepair({
    path,
    problemModel,
    revisedCommitment,
    submissions,
    verifiedAt: "2026-08-04T01:00:00.000Z",
    basisChecksum: "verified-basis-checksum",
  });
  assert.equal(isOwnerAlphaPracticalDecisionPath(verified), true);
  assert.equal(verified.repairVerification.status, "verified");
  assert.equal(
    verified.repairVerification.checks.every(
      (check) => check.status === "validated",
    ),
    true,
  );
  assert.equal(verified.initialCommitment.methodFamily, "mixed_or_uncertain");
  assert.equal(verified.revisedCommitment.methodFamily, "cost_approach");
});

test("missing, wrong, duplicate, and unknown recalculation submissions fail closed", () => {
  const { problemModel, path, revisedCommitment } = fixture();
  const node = requiredNodes(problemModel)[0];
  assert.ok(node);
  const deterministicValue = evaluateOwnerAlphaCalculationNode(node);

  const blockedCases = [
    [],
    [{ nodeId: node.nodeId, value: deterministicValue * 1.25, unit: node.resultUnit }],
    [{ nodeId: node.nodeId, value: deterministicValue, unit: "만원" }],
    [
      { nodeId: node.nodeId, value: deterministicValue, unit: node.resultUnit },
      { nodeId: node.nodeId, value: deterministicValue, unit: node.resultUnit },
    ],
    [
      { nodeId: node.nodeId, value: deterministicValue, unit: node.resultUnit },
      { nodeId: "unknown-node", value: 1, unit: null },
    ],
  ];

  for (const submissions of blockedCases) {
    const blocked = verifyOwnerAlphaPracticalRepair({
      path,
      problemModel,
      revisedCommitment,
      submissions,
      verifiedAt: "2026-08-04T01:00:00.000Z",
      basisChecksum: "blocked-basis-checksum",
    });
    assert.equal(blocked.repairVerification.status, "blocked");
    assert.equal(blocked.repairVerification.blockerCodes.length > 0, true);
    assert.equal(blocked.repairVerification.verifiedAt, null);
    assert.equal(isOwnerAlphaPracticalDecisionPath(blocked), true);
  }
});

test("an unavailable deterministic graph stays explicit and cannot be forged into verified", () => {
  const { problemModel, path, revisedCommitment } = fixture();
  const unavailableModel = structuredClone(problemModel);
  unavailableModel.calculationGraph.nodes = [];
  unavailableModel.subjectAdapter.calculationGraphNodeIds = [];
  const unavailable = verifyOwnerAlphaPracticalRepair({
    path,
    problemModel: unavailableModel,
    revisedCommitment,
    submissions: [],
    verifiedAt: "2026-08-04T01:00:00.000Z",
    basisChecksum: "unavailable-basis-checksum",
  });
  assert.equal(unavailable.repairVerification.status, "not_available");
  assert.equal(unavailable.repairVerification.verifiedAt, null);
  assert.equal(isOwnerAlphaPracticalDecisionPath(unavailable), true);

  const forgedVerified = structuredClone(path);
  forgedVerified.revisedCommitment = revisedCommitment;
  forgedVerified.repairVerification = {
    status: "verified",
    checks: [],
    blockerCodes: [],
    verifiedAt: "2026-08-04T01:00:00.000Z",
  };
  assert.equal(isOwnerAlphaPracticalDecisionPath(forgedVerified), false);

  const forgedUnavailable = structuredClone(unavailable);
  forgedUnavailable.repairVerification.verifiedAt =
    "2026-08-04T01:00:00.000Z";
  assert.equal(isOwnerAlphaPracticalDecisionPath(forgedUnavailable), false);
});
