import "server-only";

import crypto from "node:crypto";

import {
  buildTheoryPredicateClaim,
  renderTheoryPredicateClaim,
  validateTheoryPredicateClaim,
} from "./trusted-repair-engine";
import { trustedRepairCanonicalFixture } from "./trusted-repair-fixtures";
import type {
  ScopedPredicateAnchorV1,
} from "./trusted-repair-contract";
import {
  C3R_T_RUNTIME_ARTIFACT_REF,
  C3RTError,
  type C3RTDashboard,
  type C3RTPlanBlockInput,
  type C3RTTheoryClaimInput,
} from "./c3r-t-contract";

export const C3R_T_SOURCE = Object.freeze({
  sourceId: "inverge-synthetic-theory-income-approach-v1",
  problemId: "c3r-t:theory:income-approach-scope",
  revisionId: "b8e6d6e9-8c0c-4b54-9c1e-608d33245001",
  itemId: "c3r-t:theory:income-approach-scope:d0",
  artifactId: "c3r-t:theory:income-approach-scope:artifact-v1",
  gapId: "repair-anchor:theory:synthetic-income-approach",
});

export const C3R_T_TRANSFER_TASK = Object.freeze({
  itemId: "c3r-t:theory:income-approach-scope:d7-transfer-v1",
  surfaceId: "server:theory-transfer-v1",
  prompt:
    "별도 전이 과업: 합성 수익방식 사례에서 미래 순수익을 가치로 바꾸는 논리를 목표 범위에 고정해 설명하고, 역사적 원가만을 사용한다는 반대 술어가 왜 그 범위의 근거가 아닌지 구분하세요. 제출 전에는 기준 문장을 공개하지 않습니다.",
});

function theoryAnchor(): ScopedPredicateAnchorV1 {
  const fixture = trustedRepairCanonicalFixture("appraisal_theory");
  const anchor = fixture.anchors[0];
  if (!anchor || !("scopedPredicate" in anchor)) {
    throw new C3RTError("temporarily_unavailable");
  }
  return anchor.scopedPredicate;
}

export function c3rTSourceView() {
  const fixture = trustedRepairCanonicalFixture("appraisal_theory");
  return {
    ...C3R_T_SOURCE,
    prompt: fixture.prompt,
    gapLabel: fixture.anchors[0]?.labelKo ?? "수익방식 목표범위 술어",
    scaffold:
      fixture.scaffoldByAnchor[C3R_T_SOURCE.gapId] ??
      "목표 범위를 수익방식으로 고정하고 필수 술어와 금지 술어의 극성을 구분하세요.",
  };
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) =>
    `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
}

export function c3rTSha256(value: unknown) {
  return crypto.createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function evaluateC3RTTheoryClaim(input: {
  claim: C3RTTheoryClaimInput;
  confirmedAt: string;
}) {
  const claim = buildTheoryPredicateClaim({
    claim: input.claim,
    learnerConfirmedAt: input.confirmedAt,
  });
  const evaluation = validateTheoryPredicateClaim({
    claim,
    anchor: theoryAnchor(),
    expectedSourceRevisionId: C3R_T_SOURCE.revisionId,
  });
  return {
    claim,
    evaluation,
    canonicalSentence: renderTheoryPredicateClaim(claim),
  };
}

export function c3rTTransferTaskId(recordId: string) {
  const bytes = crypto.createHash("sha256")
    .update(`c3r-t-transfer-task-v1:${recordId}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function c3rTBiggestGap(initialAttempt: string) {
  const hasTarget = /수익방식|income approach/iu.test(initialAttempt);
  const hasRequired = /기대수익|expected income/iu.test(initialAttempt);
  return {
    conceptId: C3R_T_SOURCE.gapId,
    evidenceRef: `${C3R_T_RUNTIME_ARTIFACT_REF}#707:BODYLESS_RECURRING_DEDUCTION_EVIDENCE_PROJECTION`,
    reasonCode: hasTarget && hasRequired
      ? "PREDICATE_POLARITY_BINDING_INCOMPLETE"
      : "TARGET_SCOPE_PREDICATE_BINDING_INCOMPLETE",
  };
}

export function buildC3RTPlan(input: {
  dashboard: C3RTDashboard;
  availableMinutes: number;
  idFactory: () => string;
}) {
  if (!Number.isSafeInteger(input.availableMinutes) ||
    input.availableMinutes < 30 || input.availableMinutes > 720) {
    throw new C3RTError("invalid_input");
  }
  const eligible = input.dashboard.queue.filter((item) => item.eligible)
    .sort((left, right) =>
      left.dueAt.localeCompare(right.dueAt) || left.recordId.localeCompare(right.recordId));
  const blocks: C3RTPlanBlockInput[] = [];
  let remaining = input.availableMinutes;
  for (let index = 0; index < eligible.length && remaining > 0; index += 1) {
    const minutes = Math.min(index < 3 ? 30 : 15, remaining);
    blocks.push({
      blockId: input.idFactory(),
      blockKind: index < 3 ? "CORE_OUTCOME" : "SUPPORT",
      recordId: eligible[index].recordId,
      gapId: eligible[index].gapId,
      reviewPhase: eligible[index].reviewPhase,
      ordinal: index + 1,
      minutes,
    });
    remaining -= minutes;
  }
  return {
    blocks,
    dayComplete: input.dashboard.queue.length === 0,
    supportWorkRemaining: blocks.length < eligible.length ||
      input.dashboard.queue.some((item) => !item.eligible),
  };
}
