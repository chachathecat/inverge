import "server-only";
import { createHash } from "node:crypto";
import { APP1_LAW_SUBJECT, APP1_LAW_SCOPE_NOTICE, parseApp1LawBinding } from "./app1-law-binding";
import { trustedRepairCanonicalFixture, validateTrustedRepairFixtureEligibility } from "../review-os/trusted-repair-fixtures";
import { resolveTrustedRepairSourceBinding } from "../review-os/trusted-repair-source-binding";
import { buildLawApplicabilityClaim, validateLawApplicabilityClaim } from "../review-os/trusted-repair-engine";
import { parseLawApplicabilityClaimV1Input } from "../review-os/trusted-repair-contract";
import type { WrongAnswerDetail } from "../review-os/types";
import type { AnswerReviewStructureDraft } from "../evaluate/answer-review-structure";
import type { App1PrimaryGap, App1RepairVerification } from "./app1-capture-repair-view-model";

const APP1_LAW_QUESTION = trustedRepairCanonicalFixture("appraisal_law").prompt;

// This is the existing synthetic applicability fixture, never a real-law registry.
export function app1LawSourceSnapshot(detail: WrongAnswerDetail) {
  if (detail.item.subjectLabel !== APP1_LAW_SUBJECT) return null;
  const fixture = trustedRepairCanonicalFixture("appraisal_law");
  if (detail.item.rawQuestionText?.trim() !== APP1_LAW_QUESTION || !validateTrustedRepairFixtureEligibility(fixture, new Date().toISOString()).eligible) throw Error("APP1_LAW_SOURCE_UNAVAILABLE");
  const binding = resolveTrustedRepairSourceBinding(fixture);
  const entry = fixture.anchors.find(anchor => "lawApplicability" in anchor);
  if (!entry || !("lawApplicability" in entry) || binding.bindingVersion !== "dabangil.c2r_c_l.exact_law_applicability.v1") throw Error("APP1_LAW_SOURCE_UNAVAILABLE");
  const anchor = entry.lawApplicability;
  if (binding.sourceStatus !== "VERIFIED_CURRENT" || binding.versionStatus !== "VERIFIED_CURRENT" || binding.anchorStatus !== "VERIFIED_CURRENT" || binding.currentLawStatus !== "APPLICABLE_CURRENT" || binding.blockerCount !== 0 || binding.openBlockingReferenceIds.length !== 0 ||
      binding.sourceAnchorId !== anchor.lawAnchorId || ["lawSourceBindingId","sourceId","sourceVersionId","lawAnchorVersionId","exactLocator","exactVersionIdentity","effectiveFrom","effectiveTo","applicableAsOf"].some(key => (binding as unknown as Record<string,unknown>)[key] !== (anchor as unknown as Record<string,unknown>)[key])) throw Error("APP1_LAW_SOURCE_UNAVAILABLE");
  return binding;
}
export function assertApp1LawBinding(detail: WrongAnswerDetail, value: unknown, revision: string) {
  if (detail.item.subjectLabel !== APP1_LAW_SUBJECT) { if (value !== undefined) throw Error("APP1_LAW_BINDING_REQUIRED"); return null; }
  const input = parseApp1LawBinding(value), fixture = trustedRepairCanonicalFixture("appraisal_law");
  const entry = fixture.anchors.find(anchor => "lawApplicability" in anchor);
  if (!entry || !("lawApplicability" in entry)) throw Error("APP1_LAW_SOURCE_UNAVAILABLE");
  const anchor = entry.lawApplicability, sourceBinding = app1LawSourceSnapshot(detail)!;
  const hash = createHash("sha256").update(revision).digest("hex");
  const sourceRevisionId = hash.slice(0,8)+"-"+hash.slice(8,12)+"-4"+hash.slice(13,16)+"-8"+hash.slice(17,20)+"-"+hash.slice(20,32);
  const claim = parseLawApplicabilityClaimV1Input({
    sourceRevisionId, anchorId: anchor.anchorId, anchorVersionId: anchor.anchorVersionId,
    lawSourceBindingId: anchor.lawSourceBindingId, sourceId: anchor.sourceId,
    sourceVersionId: anchor.sourceId+"@"+input.version, lawAnchorId: anchor.lawAnchorId,
    lawAnchorVersionId: anchor.lawAnchorId+"@"+input.version,
    exactLocator: input.locator, exactVersionIdentity: input.version,
    effectiveFrom: input.effectiveFrom, effectiveTo: input.effectiveTo === "없음" ? null : input.effectiveTo,
    applicableAsOf: input.applicableAsOf, currentLawApplicability: input.currentness === "가능" ? "APPLICABLE_CURRENT" : "UNKNOWN",
    blockerState: { openBlockingReferenceIds: [], blockerCount: /^0$/.test(input.blockerCount) ? 0 : -1 },
    confirmationMode: "MANUAL_STRUCTURED",
  });
  const result = validateLawApplicabilityClaim({ claim: buildLawApplicabilityClaim({claim,learnerConfirmedAt:new Date().toISOString()}), anchor, expectedSourceRevisionId:sourceRevisionId, sourceBinding });
  if (!result.verified) throw Error("APP1_LAW_BINDING_REQUIRED");
  return input;
}
export function evaluateApp1LawRepair(input: { detail: WrongAnswerDetail; gap: App1PrimaryGap; repairText: string; draft: AnswerReviewStructureDraft; lawBindingInput: unknown; revision: string }): App1RepairVerification {
  assertApp1LawBinding(input.detail, input.lawBindingInput, input.revision);
  const quote = input.draft.answerEvidenceQuote?.trim() ?? "";
  const text = input.repairText;
  const dates: string[] = text.match(/\d{4}-\d{2}-\d{2}/g) ?? [];
  // Closed applicability-only consistency check. Unsupported phrasing stays unconfirmed.
  const consistentBody = dates.includes("2026-01-01") && dates.includes("2026-08-15") && dates.every(date => ["2026-01-01","2026-08-15"].includes(date)) &&
    /2026-01-01\s*버전/.test(text) && /Article\s+10\b/.test(text) && !/Article\s+(?!10\b)\d+/.test(text) &&
    /2026-01-01부터\s*효력/.test(text) && /종료일은\s*없/.test(text) && /2026-08-15(?:에|\s*현재|로|을|를)/.test(text) &&
    /적용\s*가능/.test(text) && !/적용\s*(?:불가|되지|불가능|가능하지)|적용할\s*수\s*없/.test(text) &&
    /열린\s*차단\s*근거는\s*0개/.test(text) && !/차단\s*근거는\s*[1-9]/.test(text);
  const supported = consistentBody && quote.includes("2026-08-15") && /적용/.test(quote) && input.draft.diagnosticStatus === "no_clear_gap" && input.draft.reviewedAnswerScope === "entire_submitted_answer" && quote.length >= 4 && input.repairText.includes(quote);
  return { state: supported ? "repair_confirmed_for_this_session" : "guided_path_needed", requestedGap:input.gap.gap, observedGap:null,
    reason: supported ? APP1_LAW_SCOPE_NOTICE : "출처·적용일 구조는 확인했지만 문장 교정 결과는 확인되지 않았습니다. 오류나 완료로 단정하지 않습니다.",
    sameSessionOnly:true, masteryCreated:false, transferCreated:false };
}
