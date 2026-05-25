import { getEntitlementLimit } from "@/lib/review-os/entitlements";
import { reviewOsRepository } from "@/lib/review-os/repository";
import type { AccessState } from "@/lib/review-os/types";

const ANSWER_REVIEW_MONTHLY_LIMIT: Record<AccessState["entitlementTier"], number> = {
  free_trial: 5,
  core: 30,
  extra_credits_ready: 60,
};

const CAPTURE_OCR_MONTHLY_LIMIT: Record<AccessState["entitlementTier"], number> = {
  free_trial: 20,
  core: 150,
  extra_credits_ready: 220,
};

const PROBLEM_SNAP_MONTHLY_LIMIT: Record<AccessState["entitlementTier"], number> = {
  free_trial: 10,
  core: 80,
  extra_credits_ready: 120,
};

export class EntitlementBlockedError extends Error {
  constructor(
    public readonly code: "FREE_TRIAL_LIMIT_REACHED" | "CORE_LIMIT_REACHED" | "BILLING_REQUIRED",
    public readonly feature: "wrong_answer" | "answer_review" | "capture_ocr" | "problem_snap",
    public readonly messageKo: string,
  ) {
    super(messageKo);
  }
}

function dayStartIso(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

function monthStartIso(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

async function countEventSince(userId: string, eventName: string, sinceIso: string) {
  const events = await reviewOsRepository.listRecentUsageEventsByNames(userId, [eventName], sinceIso, 500);
  return events.length;
}

function isAdminOverrideEnabled() {
  return process.env.AI_COST_GUARDRAIL_ADMIN_OVERRIDE === "true";
}

export async function resolveUserEntitlement(userId: string) {
  const tier = (await reviewOsRepository.getProfileTier(userId)) as AccessState["entitlementTier"];
  return {
    tier,
    limits: getEntitlementLimit(tier),
    answerReviewMonthlyLimit: ANSWER_REVIEW_MONTHLY_LIMIT[tier],
    captureOcrMonthlyLimit: CAPTURE_OCR_MONTHLY_LIMIT[tier],
    problemSnapMonthlyLimit: PROBLEM_SNAP_MONTHLY_LIMIT[tier],
  };
}

export async function getUsageState(userId: string) {
  const entitlement = await resolveUserEntitlement(userId);
  const monthlyWrongAnswers = await reviewOsRepository.countMonthlyWrongAnswers(userId, monthStartIso());
  const answerReviewUsed = await countEventSince(userId, "answer_review_structure_success", monthStartIso());
  const captureOcrUsed = await countEventSince(userId, "capture_ocr_success", monthStartIso());
  const problemSnapUsed = await countEventSince(userId, "problem_snap_success", monthStartIso());
  const answerReviewDailyUsed = await countEventSince(userId, "answer_review_structure_success", dayStartIso());
  const captureOcrDailyUsed = await countEventSince(userId, "capture_ocr_success", dayStartIso());
  const problemSnapDailyUsed = await countEventSince(userId, "problem_snap_success", dayStartIso());
  return { entitlement, monthlyWrongAnswers, answerReviewUsed, captureOcrUsed, problemSnapUsed, answerReviewDailyUsed, captureOcrDailyUsed, problemSnapDailyUsed };
}

function blockByTier(tier: AccessState["entitlementTier"], feature: EntitlementBlockedError["feature"]) {
  if (tier === "free_trial") return new EntitlementBlockedError("FREE_TRIAL_LIMIT_REACHED", feature, "무료 체험 한도에 도달했습니다. 코어 플랜으로 업그레이드하거나 지원팀에 문의해 주세요.");
  if (tier === "core") return new EntitlementBlockedError("CORE_LIMIT_REACHED", feature, "코어 플랜 월 한도에 도달했습니다. 결제 설정 이후 업그레이드 또는 지원팀 문의를 진행해 주세요.");
  return new EntitlementBlockedError("BILLING_REQUIRED", feature, "결제 설정이 아직 준비되지 않았습니다. 지원팀에 문의해 주세요.");
}

export async function assertCanCreateWrongAnswer(userId: string) {
  const usage = await getUsageState(userId);
  if (usage.monthlyWrongAnswers >= usage.entitlement.limits.monthlyWrongAnswers) throw blockByTier(usage.entitlement.tier, "wrong_answer");
}

export async function assertCanRunAnswerReview(userId: string) {
  if (isAdminOverrideEnabled()) return;
  const usage = await getUsageState(userId);
  const dailyCap = Math.max(1, Math.ceil(usage.entitlement.answerReviewMonthlyLimit / 10));
  if (usage.answerReviewDailyUsed >= dailyCap) throw blockByTier(usage.entitlement.tier, "answer_review");
  if (usage.answerReviewUsed >= usage.entitlement.answerReviewMonthlyLimit) throw blockByTier(usage.entitlement.tier, "answer_review");
}

export async function assertCanUploadCapture(userId: string) {
  if (isAdminOverrideEnabled()) return;
  const usage = await getUsageState(userId);
  const captureDailyCap = Math.max(1, Math.ceil(usage.entitlement.captureOcrMonthlyLimit / 10));
  const snapDailyCap = Math.max(1, Math.ceil(usage.entitlement.problemSnapMonthlyLimit / 10));
  if (usage.captureOcrDailyUsed >= captureDailyCap) throw blockByTier(usage.entitlement.tier, "capture_ocr");
  if (usage.problemSnapDailyUsed >= snapDailyCap) throw blockByTier(usage.entitlement.tier, "problem_snap");
  if (usage.captureOcrUsed >= usage.entitlement.captureOcrMonthlyLimit) throw blockByTier(usage.entitlement.tier, "capture_ocr");
  if (usage.problemSnapUsed >= usage.entitlement.problemSnapMonthlyLimit) throw blockByTier(usage.entitlement.tier, "problem_snap");
}
