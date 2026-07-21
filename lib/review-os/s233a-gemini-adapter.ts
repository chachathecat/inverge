import "server-only";

import { structureAnswerReviewWithGemini } from "@/lib/evaluate/gemini";

import { getS233aUnambiguousSegmentId } from "./s233a-evidence-locator";

import type {
  S233aConditionalCritic,
  S233aEvaluationInput,
  S233aGradeObservation,
  S233aPrimaryGradeResult,
  S233aPrimarySubjectGrader,
} from "./s233a-types";

const MODEL_VERSION = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const PRIMARY_PROMPT_VERSION = "s233a-primary-subject-structure.v1";
const CRITIC_PROMPT_VERSION = "s233a-conditional-critic-structure.v1";

function uncertain(text: string): boolean {
  return /검토 필요|입력.*부족|맥락.*부족|확인.*필요/.test(text);
}

async function observe(
  input: S233aEvaluationInput,
  stage: "primary_subject_grader" | "conditional_critic",
): Promise<S233aPrimaryGradeResult> {
  const draft = await structureAnswerReviewWithGemini({
    questionFiles: [],
    answerFiles: [],
    referenceFiles: [],
    questionText: input.request.questionText,
    answerText: input.request.learnerInput.normalizedText,
    referenceText: input.materials.evaluationReferenceText,
    referenceGroundingContext: [
      "S233A AI-only personal learner review.",
      `evaluationStage:${stage}`,
      `subject:${input.request.subject}`,
      `trustedMaterialReceipt:${input.materials.materialReceiptId}`,
      "Use only the immutable Answer Pack and learner input supplied here.",
      "Do not claim official grading, expert verification, pass probability, or human approval.",
    ].join("\n"),
    explanationLevel: "exam",
  });
  const uncertainty = uncertain(
    [draft.requiredIssues, draft.weakLogicPoint, draft.weakParagraphPoint, draft.caution].join(" "),
  );
  // The reused structure grader does not return per-skill learner locators. A
  // single input segment is therefore the only evidence anchor it can bind
  // without guessing; multi-segment answers must abstain until an anchoring-
  // capable grader is available.
  const segmentId = getS233aUnambiguousSegmentId(input.request.learnerInput.segments);
  const observations: S233aGradeObservation[] = input.skills.map((skill, index) => {
    if (uncertainty || !segmentId) {
      return {
        skillId: skill.skillId,
        status: "not_assessable",
        learnerSegmentId: null,
        learnerCalculationStepId: null,
        confidence: "low",
        uncertaintyCodes: ["evaluator_uncertain"],
        abstentionReason: "evaluator_uncertain",
      };
    }
    const hasMissingIssue = index === 0 && draft.missingIssueCandidates.length > 0;
    const hasWeakLogic = index === 1 && draft.weakLogicPoint.trim().length > 0;
    const hasWeakParagraph = index === 2 && draft.weakParagraphPoint.trim().length > 0;
    const status = hasMissingIssue ? "missing" : hasWeakLogic || hasWeakParagraph ? "partial" : "met";
    return {
      skillId: skill.skillId,
      status,
      learnerSegmentId: status === "missing" ? null : segmentId,
      learnerCalculationStepId: null,
      confidence: status === "met" ? "high" : "medium",
      uncertaintyCodes: [],
      abstentionReason: null,
    };
  });
  return { status: "completed", observations };
}

export function createS233aGeminiPrimaryGrader(): S233aPrimarySubjectGrader {
  return {
    modelVersion: MODEL_VERSION,
    promptVersion: PRIMARY_PROMPT_VERSION,
    grade: (input) => observe(input, "primary_subject_grader"),
  };
}

export function createS233aGeminiConditionalCritic(): S233aConditionalCritic {
  return {
    modelVersion: MODEL_VERSION,
    promptVersion: CRITIC_PROMPT_VERSION,
    async review(input) {
      const second = await observe(input, "conditional_critic");
      const statusBySkill = new Map(second.observations.map((item) => [item.skillId, item.status]));
      const disagreement = input.primary.observations.some(
        (item) => statusBySkill.get(item.skillId) !== item.status,
      );
      if (second.status === "abstained" || disagreement) {
        return { status: "abstained", unresolvedCodes: ["critic_disagreement_unresolved"] };
      }
      return { status: "completed", unresolvedCodes: [] };
    },
  };
}
