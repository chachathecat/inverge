import crypto from "node:crypto";

import type { RubricEvidenceSubject } from "./rubric-evidence-contract";
import type { S233ScoringSkillIdentity } from "./s233-parallel-execution-contract";
import type { S233aQueueTodayLinkageCommand } from "./s233a-types";

const SUBJECT_LABEL: Record<RubricEvidenceSubject, string> = {
  practice: "실무",
  theory: "이론",
  law: "법규",
};

export function buildS233aQueueTodayLinkage(input: {
  reviewId: string;
  answerSubmissionId: string;
  subject: RubricEvidenceSubject;
  skill: S233ScoringSkillIdentity | null;
  abstained: boolean;
  now: string;
}): S233aQueueTodayLinkageCommand {
  const actionType: S233aQueueTodayLinkageCommand["actionType"] = input.abstained
    ? "withhold_until_verified"
    : input.skill?.remediationActionType === "rewrite"
      ? "rewrite"
      : input.skill?.remediationActionType === "recalculate"
        ? "recalculate"
        : "retry";
  const dueAt = new Date(Date.parse(input.now) + 24 * 60 * 60 * 1_000).toISOString();
  const actionLabel =
    actionType === "recalculate"
      ? "계산 과정을 다시 확인하세요."
      : actionType === "rewrite"
        ? "핵심 문단을 다시 작성하세요."
        : actionType === "withhold_until_verified"
          ? "불확실한 판단을 보류하고 근거를 다시 확인하세요."
          : "같은 요구를 다시 풀어 보세요.";
  return {
    reviewQueueItemId: `s233a-${crypto.randomUUID()}`,
    todayPlanTaskId: crypto.randomUUID(),
    reviewId: input.reviewId,
    answerSubmissionId: input.answerSubmissionId,
    subject: input.subject,
    skillId: input.skill?.skillId ?? null,
    actionType,
    priorityScore: input.abstained || input.skill?.critical === true ? 95 : 75,
    dueAt,
    renderedText: `${SUBJECT_LABEL[input.subject]} 답안: ${actionLabel}`,
    containsRawContent: false,
  };
}
