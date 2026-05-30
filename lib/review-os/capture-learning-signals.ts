import type { LearningSignalEventInput, WrongAnswerItemInput } from "@/lib/review-os/types";

type CaptureExamMode = LearningSignalEventInput["examMode"];

export function resolveCaptureExamMode(examName: string): CaptureExamMode {
  return examName === "감정평가사 2차" ? "감정평가사 2차" : "감정평가사 1차";
}

type CaptureLearningSignalInput = {
  itemId: string;
  examName: string;
  subject: string;
  sourceType: string;
  confidence: WrongAnswerItemInput["confidence"];
  timeSpentSeconds?: number;
  biggestGap?: string;
  nextAction?: string;
  mistakeReason?: string;
  keyConcepts?: string[];
  weakStructurePoint?: string;
  missingIssue?: string;
  rewriteInstruction?: string;
  createdFromCapture: boolean;
};

function uniq(values: Array<string | null | undefined>) {
  return [...new Set(values.map((v) => (typeof v === "string" ? v.trim() : "")).filter(Boolean))];
}

export function computeCaptureQueuePriority(input: {
  examName: string;
  confidence: string;
  timeSpentSeconds?: number | null;
  mistakeOrWeakPoint?: string;
  weakStructurePoint?: string;
  missingIssue?: string;
}) {
  let score = 50;
  if (input.confidence === "낮음") score += 20;
  else if (input.confidence === "중간") score += 10;
  if (/누락|구조|논점|계산|조건|개념/.test(input.mistakeOrWeakPoint ?? "")) score += 15;
  const examMode = resolveCaptureExamMode(input.examName);
  if (examMode === "감정평가사 2차" && (input.weakStructurePoint || input.missingIssue)) score += 15;
  if ((input.timeSpentSeconds ?? 0) >= 180 && input.confidence === "낮음") score += 10;
  return Math.min(100, score);
}

export function buildCaptureReviewReason(input: {
  examName: string;
  confidence: string;
  mistakeReason?: string;
  weakStructurePoint?: string;
  missingIssue?: string;
}) {
  const examMode = resolveCaptureExamMode(input.examName);
  if (examMode === "감정평가사 2차") {
    if (input.missingIssue) return "누락 논점 후보가 있어 짧게 다시 써야 합니다.";
    if (input.weakStructurePoint) return "답안 구조 보강이 필요한 항목입니다.";
    return "문단 재작성 후 다시 확인해야 합니다.";
  }
  if (input.confidence === "낮음") return "확신이 낮았던 항목이라 근거를 다시 고정해야 합니다.";
  if (/계산|조건/.test(input.mistakeReason ?? "")) return "계산/조건 실수를 줄이기 위해 다시 볼 항목입니다.";
  return "틀린 개념을 다시 확인해야 합니다.";
}

export function buildCaptureLearningSignal(input: CaptureLearningSignalInput): LearningSignalEventInput {
  const examMode = resolveCaptureExamMode(input.examName);
  const isSecond = examMode === "감정평가사 2차";
  const nextTaskType = isSecond ? "rewrite" : "retry";
  const nextTask = (isSecond ? input.rewriteInstruction : input.nextAction) ?? "한 번 더 짧게 다시 수행합니다.";

  const tags = isSecond
    ? uniq([
        input.subject,
        input.missingIssue,
        input.weakStructurePoint,
        "answer_structure",
        "rewrite_needed",
        input.missingIssue ? "issue_missing" : null,
        input.weakStructurePoint ? "structure_gap" : null,
      ])
    : uniq([
        input.subject,
        input.keyConcepts?.[0],
        input.mistakeReason,
        "objective_mistake",
        "review_needed",
        input.confidence === "낮음" ? "low_confidence" : null,
        (input.timeSpentSeconds ?? 0) >= 180 ? "slow_solve" : null,
      ]);

  const topicCandidate = input.keyConcepts?.[0] ?? input.missingIssue ?? input.weakStructurePoint ?? null;
  const skeletonKeywordHint = input.keyConcepts?.[0] ?? null;
  const combinedGapSignal = [input.mistakeReason, input.weakStructurePoint, input.missingIssue, input.biggestGap]
    .filter(Boolean)
    .join(" ");
  const reviewPriority = computeCaptureQueuePriority({
    examName: input.examName,
    confidence: input.confidence,
    timeSpentSeconds: input.timeSpentSeconds ?? null,
    mistakeOrWeakPoint: combinedGapSignal,
    weakStructurePoint: input.weakStructurePoint,
    missingIssue: input.missingIssue,
  });

  return {
    examMode,
    subject: input.subject,
    sourceType: input.sourceType,
    derivedTags: tags,
    relatedFormulas: [],
    nextTaskType,
    nextTask,
    metadataJson: {
      sourceItemId: input.itemId,
      biggestGap: input.biggestGap ?? null,
      nextAction: input.nextAction ?? null,
      nextTaskType,
      confidence: input.confidence,
      timeSpentSeconds: input.timeSpentSeconds ?? null,
      timeSpentMinutes: input.timeSpentSeconds ? Math.round(input.timeSpentSeconds / 60) : null,
      createdFromCapture: input.createdFromCapture,
      captureIntent: "save",
      topic_candidate: topicCandidate,
      mistake_type: input.mistakeReason ?? null,
      weak_structure_point: input.weakStructurePoint ?? null,
      missing_issue: input.missingIssue ?? null,
      taxonomy_candidate: topicCandidate ? { topic: topicCandidate, subject: input.subject } : null,
      similar_topic_suggestion: uniq([input.keyConcepts?.[1], input.keyConcepts?.[2], input.missingIssue]).slice(0, 2),
      review_priority: reviewPriority,
      skeleton_keyword_hint: skeletonKeywordHint,
    },
  };
}
