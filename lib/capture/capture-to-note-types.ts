import type { CaptureLegalGroundingHint, LegalConceptSourceAnchorClient } from "./legal-grounding-hook";
import type { CognitiveLearningActionUnit } from "../review-os/cognitive-learning-actions";

export type CaptureToNoteExamMode = "first" | "second";
export type CaptureToNoteSourceMode = "learner_capture";
export type CaptureToNoteSourceType = "photo" | "pdf" | "text";

export type CaptureToNoteNextTaskType =
  | "ox"
  | "cloze"
  | "concept_review"
  | "paragraph_rewrite"
  | "issue_recall"
  | "outline_review";

export type CaptureToNoteInput = {
  examMode: CaptureToNoteExamMode;
  subject: string;
  sourceType: CaptureToNoteSourceType;
  editableText: string;
  sourceMode?: CaptureToNoteSourceMode;
  problemSummary?: string | null;
  confidence?: "low" | "medium" | "high" | "unknown" | string | null;
  timeSpentMin?: number | string | null;
  conceptKeyCandidates?: readonly string[] | null;
  legalGroundingHint?: CaptureLegalGroundingHint | null;
  legalGroundingClient?: LegalConceptSourceAnchorClient | null;
};

export type CaptureToNoteDerivedSignals = {
  subject: string;
  topicCandidates: string[];
  mistakeType: string;
  weakStructurePoint: string;
  nextTaskType: CaptureToNoteNextTaskType;
};

export type CaptureToNoteTodayPlanCandidate = {
  id: string;
  metadataOnly: true;
  source: "capture_to_note";
  sourceMode: CaptureToNoteSourceMode;
  examMode: CaptureToNoteExamMode;
  subject: string;
  title: string;
  topicCandidates: string[];
  biggestGap: string;
  nextAction: string;
  nextTaskType: CaptureToNoteNextTaskType;
  estimatedMinutes: number;
  priority: number;
};

export type CaptureToNoteReviewQueueCandidate = {
  id: string;
  metadataOnly: true;
  source: "capture_to_note";
  sourceMode: CaptureToNoteSourceMode;
  examMode: CaptureToNoteExamMode;
  subject: string;
  reviewReason: string;
  biggestGap: string;
  nextAction: string;
  nextTaskType: CaptureToNoteNextTaskType;
  dueInDays: number;
  priority: number;
};

export type CaptureToNoteLegalGroundingSummary = {
  status: CaptureLegalGroundingHint["status"];
  canDraftLegalExplanation: boolean;
  needsReview: boolean;
  unsupported: boolean;
  learnerSafeMessage: string;
  sourceAnchorCount: number;
  verifiedAnchorCount: number;
};

export type CaptureToNoteDraft = {
  examMode: CaptureToNoteExamMode;
  subject: string;
  sourceType: CaptureToNoteSourceType;
  userEditableText: string;
  problemSummary: string;
  answerSummary: string;
  biggestGap: string;
  nextAction: string;
  derivedSignals: CaptureToNoteDerivedSignals;
  todayPlanCandidate: CaptureToNoteTodayPlanCandidate;
  todayPlanCandidates: CaptureToNoteTodayPlanCandidate[];
  reviewQueueCandidate: CaptureToNoteReviewQueueCandidate;
  cognitiveLearningAction: CognitiveLearningActionUnit;
  legalGroundingHint?: CaptureToNoteLegalGroundingSummary;
  dataBoundary: {
    learnerOwnedRawText: true;
    derivedSignalsOnlyForPlanning: true;
    globalReferenceWrite: false;
  };
};
