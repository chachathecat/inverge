export type PastExamSourceStatus = "uploaded" | "extracted" | "needs_review" | "reviewed";

export type PastExamSourceDocument = {
  id: string;
  exam_year: number;
  exam_name: string;
  stage: "first" | "second";
  subject?: string;
  source_type: "pdf";
  storage_path: string;
  extraction_status: PastExamSourceStatus;
  raw_text_policy: "reference_only";
  source_status: "needs_review" | "reviewed";
  linked_reference_ids: string[];
};
