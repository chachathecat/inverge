export type SecondExamSubmissionRecord = {
  submissionId: string;
  examId: string;
  sessionId: string;
  subjectId: string;
  promptId?: string;
  promptTitle?: string;
  answerText: string;
  answerLength: number;
  elapsedSeconds: number;
  submittedAt: string;
};

export type SecondExamRewriteRecord = {
  rewriteId: string;
  sourceSubmissionId: string;
  examId: string;
  sessionId: string;
  subjectId: string;
  focusLabel: string;
  gapTitle: string;
  rewrittenAnswerText: string;
  rewrittenAnswerLength: number;
  submittedAt: string;
};

export type SecondExamSourceEntry = {
  entryId: string;
  sourceType: "submission" | "rewrite";
  examId: string;
  sessionId: string;
  subjectId: string;
  answerText: string;
  answerLength: number;
  elapsedSeconds?: number;
  promptTitle?: string;
  focusLabel?: string;
  gapTitle?: string;
  sourceSubmissionId?: string;
  submittedAt: string;
};
