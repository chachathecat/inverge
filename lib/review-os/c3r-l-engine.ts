import "server-only";

import crypto from "node:crypto";

import {
  buildLawApplicabilityClaim,
  renderLawApplicabilityClaim,
  validateLawApplicabilityClaim,
} from "./trusted-repair-engine";
import { trustedRepairCanonicalFixture } from "./trusted-repair-fixtures";
import { resolveTrustedRepairSourceBinding } from "./trusted-repair-source-binding";
import type {
  LawApplicabilityAnchorV1,
} from "./trusted-repair-contract";
import {
  C3R_L_RUNTIME_ARTIFACT_REF,
  C3RLError,
  type C3RLDashboard,
  type C3RLPlanBlockInput,
  type C3RLLawClaimInput,
} from "./c3r-l-contract";

export const C3R_L_SOURCE = Object.freeze({
  sourceId: "law-source:synthetic-official-act",
  problemId: "c3r-l:law:synthetic-article-10-applicability",
  revisionId: "d9f7e7fa-9d1d-4c65-8d2f-719e44356001",
  itemId: "c3r-l:law:synthetic-article-10-applicability:d0",
  artifactId: "c3r-l:law:synthetic-article-10-applicability:artifact-v1",
  gapId: "repair-anchor:law:synthetic-article-10",
});

export const C3R_L_TRANSFER_TASK = Object.freeze({
  itemId: "c3r-l:law:synthetic-article-10-applicability:d7-transfer-v1",
  surfaceId: "server:law-transfer-v1",
  prompt:
    "별도 전이 과업: 합성 법령 Article 10의 정확한 출처·버전·위치·효력기간·적용일·현재성과 열린 차단 근거 0개를 다시 결합하세요. 제출 전에는 기준 결합 문장을 공개하지 않습니다.",
});

function lawFixture() {
  return trustedRepairCanonicalFixture("appraisal_law");
}

function lawAnchor(): LawApplicabilityAnchorV1 {
  const fixture = lawFixture();
  const anchor = fixture.anchors[0];
  if (!anchor || !("lawApplicability" in anchor)) {
    throw new C3RLError("temporarily_unavailable");
  }
  return anchor.lawApplicability;
}

export function c3rLSourceView() {
  const fixture = lawFixture();
  return {
    ...C3R_L_SOURCE,
    prompt: fixture.prompt,
    gapLabel: fixture.anchors[0]?.labelKo ?? "Article 10 정확 법규적용 결합",
    scaffold:
      fixture.scaffoldByAnchor[C3R_L_SOURCE.gapId] ??
      "출처·버전·Article 10 위치·효력기간·적용일·현재성과 열린 차단 근거 0개를 각각 확인하세요.",
  };
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) =>
    `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
}

export function c3rLSha256(value: unknown) {
  return crypto.createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function evaluateC3RLLawClaim(input: {
  claim: C3RLLawClaimInput;
  confirmedAt: string;
}) {
  const claim = buildLawApplicabilityClaim({
    claim: input.claim,
    learnerConfirmedAt: input.confirmedAt,
  });
  const evaluation = validateLawApplicabilityClaim({
    claim,
    anchor: lawAnchor(),
    expectedSourceRevisionId: C3R_L_SOURCE.revisionId,
    sourceBinding: resolveTrustedRepairSourceBinding(lawFixture()),
  });
  return {
    claim,
    evaluation,
    canonicalSentence: renderLawApplicabilityClaim(claim),
  };
}

export function c3rLTransferTaskId(recordId: string) {
  const bytes = crypto.createHash("sha256")
    .update(`c3r-l-transfer-task-v1:${recordId}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function c3rLBiggestGap(initialAttempt: string) {
  const hasLocator = /Article\s*10|제\s*10조/iu.test(initialAttempt);
  const hasVersion = /2026-01-01|2026\.\s*1\.\s*1/iu.test(initialAttempt);
  const hasApplicableDate = /2026-08-15|2026\.\s*8\.\s*15/iu.test(initialAttempt);
  return {
    conceptId: C3R_L_SOURCE.gapId,
    evidenceRef: `${C3R_L_RUNTIME_ARTIFACT_REF}#707:BODYLESS_RECURRING_DEDUCTION_EVIDENCE_PROJECTION`,
    reasonCode: hasLocator && hasVersion && hasApplicableDate
      ? "CURRENTNESS_OR_BLOCKER_BINDING_INCOMPLETE"
      : "EXACT_LAW_APPLICABILITY_BINDING_INCOMPLETE",
  };
}

export function buildC3RLPlan(input: {
  dashboard: C3RLDashboard;
  availableMinutes: number;
  idFactory: () => string;
}) {
  if (!Number.isSafeInteger(input.availableMinutes) ||
    input.availableMinutes < 30 || input.availableMinutes > 720) {
    throw new C3RLError("invalid_input");
  }
  const eligible = input.dashboard.queue.filter((item) => item.eligible)
    .sort((left, right) =>
      left.dueAt.localeCompare(right.dueAt) || left.recordId.localeCompare(right.recordId));
  const blocks: C3RLPlanBlockInput[] = [];
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
