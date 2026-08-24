import "server-only";

import crypto from "node:crypto";

import {
  buildPracticeCalculationClaim,
  renderPracticeCalculationClaim,
  validatePracticeCalculationClaim,
} from "./trusted-repair-engine";
import { trustedRepairCanonicalFixture } from "./trusted-repair-fixtures";
import type {
  CalculationRelationAnchorV1,
  PracticeCalculationClaimV2Input,
} from "./trusted-repair-contract";
import {
  C3R_P_RUNTIME_ARTIFACT_REF,
  C3RPError,
  type C3RPDashboard,
  type C3RPPlanBlockInput,
} from "./c3r-p-contract";

export const C3R_P_SOURCE = Object.freeze({
  sourceId: "inverge-synthetic-practice-valuation-v1",
  problemId: "c3r-p:practice:annual-net-income",
  revisionId: "26a4f3bd-ddf3-4215-9fdf-d83453122ce1",
  itemId: "c3r-p:practice:annual-net-income:d0",
  transferItemId: "c3r-p:practice:annual-net-income:d7-transfer",
  artifactId: "c3r-p:practice:annual-net-income:artifact-v1",
  gapId: "repair-anchor:practice:synthetic-net-income",
});

function practiceAnchor() {
  const fixture = trustedRepairCanonicalFixture("appraisal_practical");
  const anchor = fixture.anchors[0];
  if (!anchor || !("calculationRelation" in anchor)) {
    throw new C3RPError("temporarily_unavailable");
  }
  return anchor.calculationRelation as CalculationRelationAnchorV1;
}

export function c3rPSourceView() {
  const fixture = trustedRepairCanonicalFixture("appraisal_practical");
  return {
    ...C3R_P_SOURCE,
    prompt: fixture.prompt,
    gapLabel: fixture.anchors[0]?.labelKo ?? "연간 순수익 계산 관계",
    scaffold:
      fixture.scaffoldByAnchor[C3R_P_SOURCE.gapId] ??
      "연간 총수익에서 연간 운영비를 차감하고 단위를 확인하세요.",
  };
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(",")}}`;
}

export function c3rPSha256(value: unknown) {
  return crypto.createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function evaluateC3RPPracticeClaim(input: {
  claim: PracticeCalculationClaimV2Input;
  confirmedAt: string;
}) {
  const claim = buildPracticeCalculationClaim({
    claim: input.claim,
    learnerConfirmedAt: input.confirmedAt,
  });
  const evaluation = validatePracticeCalculationClaim({
    claim,
    anchor: practiceAnchor(),
    expectedSourceRevisionId: C3R_P_SOURCE.revisionId,
  });
  return {
    claim,
    evaluation,
    proofDigest: c3rPSha256({ claim, evaluation }),
    canonicalSentence: renderPracticeCalculationClaim(claim),
  };
}

export function c3rPBiggestGap(initialAttempt: string) {
  const hasExpectedResult = /100[\s,]?000[\s,]?000/u.test(initialAttempt);
  return {
    conceptId: C3R_P_SOURCE.gapId,
    evidenceRef: `${C3R_P_RUNTIME_ARTIFACT_REF}#707:BODYLESS_RECURRING_DEDUCTION_EVIDENCE_PROJECTION`,
    reasonCode: hasExpectedResult
      ? "UNIT_SIGN_ROUNDING_BINDING_INCOMPLETE"
      : "ORDERED_RESULT_RELATION_INCOMPLETE",
  };
}

export function buildC3RPPlan(input: {
  dashboard: C3RPDashboard;
  availableMinutes: number;
  idFactory: () => string;
}) {
  if (
    !Number.isSafeInteger(input.availableMinutes) ||
    input.availableMinutes < 30 ||
    input.availableMinutes > 720
  ) {
    throw new C3RPError("invalid_input");
  }
  const eligible = input.dashboard.queue
    .filter((item) => item.eligible)
    .sort((left, right) =>
      left.dueAt.localeCompare(right.dueAt) ||
      left.recordId.localeCompare(right.recordId),
    );
  const blocks: C3RPPlanBlockInput[] = [];
  let remaining = input.availableMinutes;
  for (let index = 0; index < eligible.length && remaining > 0; index += 1) {
    const minutes = Math.min(index < 3 ? 30 : 15, remaining);
    blocks.push({
      blockId: input.idFactory(),
      blockKind: index < 3 ? "CORE_OUTCOME" : "SUPPORT",
      recordId: eligible[index].recordId,
      gapId: eligible[index].gapId,
      ordinal: index + 1,
      minutes,
    });
    remaining -= minutes;
  }
  return {
    blocks,
    dayComplete: input.dashboard.queue.length === 0,
    supportWorkRemaining:
      blocks.length < eligible.length ||
      input.dashboard.queue.some((item) => !item.eligible),
  };
}
