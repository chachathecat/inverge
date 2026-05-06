export type PastExamExtractionStatus = "uploaded" | "extracted" | "failed";

export type PastExamSourceReviewStatus = "needs_review" | "reviewed";

export type PastExamSourceDocument = {
  id: string;
  exam_year: number;
  exam_name: string;
  stage: "first" | "second";
  subject: string;
  source_type: "pdf";
  storage_path: string;
  extraction_status: PastExamExtractionStatus;
  raw_text_policy: "reference_only";
  review_status: PastExamSourceReviewStatus;
  linked_reference_ids: string[];
};

export type PastExamExtractionCandidate = {
  id: string;
  source_document_id: string;
  extraction_status: "extracted" | "failed";
  extracted_text_policy: "reference_only";
  review_status: "needs_review" | "reviewed";
  extracted_text?: string;
  extraction_notes?: string;
  created_from: "source_pdf";
};

export type PastExamStructuredCandidate = {
  id: string;
  source_document_id: string;
  linked_reference_id: string;
  candidate_status: "needs_review" | "reviewed";
  raw_text_policy: "reference_only";
  topic_tags_candidate: string[];
  issue_tags_candidate: string[];
  skill_tags_candidate: string[];
  expected_answer_skeleton_candidate: string[];
  scoring_checkpoint_skeleton_candidate: string[];
  common_gap_candidates: string[];
  created_from: "source_pdf_extraction";
};

export function isReferenceOnlyExtractionCandidate(
  candidate: PastExamExtractionCandidate,
): candidate is PastExamExtractionCandidate & {
  extracted_text_policy: "reference_only";
  review_status: "needs_review";
  created_from: "source_pdf";
} {
  return (
    candidate.extracted_text_policy === "reference_only" &&
    candidate.review_status === "needs_review" &&
    candidate.created_from === "source_pdf"
  );
}

export function isReviewRequiredStructuredCandidate(
  candidate: PastExamStructuredCandidate,
): candidate is PastExamStructuredCandidate & {
  raw_text_policy: "reference_only";
  candidate_status: "needs_review";
  created_from: "source_pdf_extraction";
} {
  return (
    candidate.raw_text_policy === "reference_only" &&
    candidate.candidate_status === "needs_review" &&
    candidate.created_from === "source_pdf_extraction"
  );
}
