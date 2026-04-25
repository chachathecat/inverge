export type EvaluateRequestBody = {
  answer: string;
};

export type EvaluationResult = {
  total_score: number;
  structure_score: number;
  content_score: number;
  expression_score: number;
  weaknesses: [string, string, string];
  next_action: string;
};

export type EvaluationApiResponse = {
  result: EvaluationResult;
  transcription: string;
};

export type EvaluationRecord = {
  user_id: string;
  answer: string;
  transcription: string;
  result: EvaluationResult;
  created_at: string;
};

export type EvaluationHistoryPoint = {
  exam_date: string;
  total_score: number;
};
