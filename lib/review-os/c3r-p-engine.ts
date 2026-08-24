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
  PracticeCalculationClaimV2,
  PracticeCalculationClaimV2Input,
} from "./trusted-repair-contract";
import {
  C3R_P_TRANSFER_ANCHOR_ID,
  C3R_P_TRANSFER_ANCHOR_VERSION_ID,
  C3R_P_RUNTIME_ARTIFACT_REF,
  C3RPError,
  type C3RPDashboard,
  type C3RPPlanBlockInput,
  type C3RPPracticeClaimInput,
} from "./c3r-p-contract";

export const C3R_P_SOURCE = Object.freeze({
  sourceId: "inverge-synthetic-practice-valuation-v1",
  problemId: "c3r-p:practice:annual-net-income",
  revisionId: "26a4f3bd-ddf3-4215-9fdf-d83453122ce1",
  itemId: "c3r-p:practice:annual-net-income:d0",
  artifactId: "c3r-p:practice:annual-net-income:artifact-v1",
  gapId: "repair-anchor:practice:synthetic-net-income",
});

export const C3R_P_TRANSFER_TASK = Object.freeze({
  anchorId: C3R_P_TRANSFER_ANCHOR_ID,
  anchorVersionId: C3R_P_TRANSFER_ANCHOR_VERSION_ID,
  itemId: "c3r-p:practice:annual-net-income:d7-transfer-v1",
  surfaceId: "server:practice-transfer-v1",
  prompt:
    "별도 전이 과업: 연간 총수익 150,000,000원과 연간 운영비 30,000,000원을 사용해 연간 순수익을 직접 계산하세요. 결과와 단위를 제출하기 전에는 정답을 공개하지 않습니다.",
  grossIncome: 150_000_000,
  operatingExpense: 30_000_000,
  result: 120_000_000,
});

type C3RPVersionedCalculationAnchor = Omit<
  CalculationRelationAnchorV1,
  "anchorVersionId"
> & Readonly<{
  anchorVersionId: C3RPPracticeClaimInput["anchorVersionId"];
}>;

function practiceAnchor(transfer = false): C3RPVersionedCalculationAnchor {
  const fixture = trustedRepairCanonicalFixture("appraisal_practical");
  const anchor = fixture.anchors[0];
  if (!anchor || !("calculationRelation" in anchor)) {
    throw new C3RPError("temporarily_unavailable");
  }
  const relation = anchor.calculationRelation as CalculationRelationAnchorV1;
  if (!transfer) return relation;
  return {
    ...relation,
    anchorId: C3R_P_TRANSFER_TASK.anchorId,
    anchorVersionId: C3R_P_TRANSFER_TASK.anchorVersionId,
    operandRoles: [
      {
        role: "gross_income",
        value: C3R_P_TRANSFER_TASK.grossIncome,
        unit: "KRW_PER_YEAR",
      },
      {
        role: "operating_expense",
        value: C3R_P_TRANSFER_TASK.operatingExpense,
        unit: "KRW_PER_YEAR",
      },
    ],
    result: {
      value: C3R_P_TRANSFER_TASK.result,
      unit: "KRW_PER_YEAR",
    },
  } satisfies C3RPVersionedCalculationAnchor;
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
  claim: C3RPPracticeClaimInput;
  confirmedAt: string;
  transferTask?: boolean;
}) {
  const claim = buildPracticeCalculationClaim({
    claim: input.claim as PracticeCalculationClaimV2Input,
    learnerConfirmedAt: input.confirmedAt,
  }) as PracticeCalculationClaimV2 & C3RPPracticeClaimInput;
  const anchor = practiceAnchor(input.transferTask === true);
  const evaluation = validatePracticeCalculationClaim({
    claim: claim as PracticeCalculationClaimV2,
    anchor: anchor as CalculationRelationAnchorV1,
    expectedSourceRevisionId: C3R_P_SOURCE.revisionId,
  });
  return {
    claim,
    evaluation,
    proofDigest: c3rPSha256({ claim, evaluation }),
    canonicalSentence: renderPracticeCalculationClaim(claim),
  };
}

export function c3rPTransferTaskId(recordId: string) {
  const bytes = crypto
    .createHash("sha256")
    .update(`c3r-p-transfer-task-v1:${recordId}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
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
      reviewPhase: eligible[index].reviewPhase,
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
