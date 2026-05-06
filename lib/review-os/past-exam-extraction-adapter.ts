import type { PastExamReferenceItem } from "./past-exam-reference";
import type { PastExamExtractionCandidate, PastExamStructuredCandidate } from "./past-exam-source";

export function buildExtractionCandidateFromSource(params: {
  sourceDocumentId: string;
  extractedText: string;
  extractionNotes?: string;
}): PastExamExtractionCandidate {
  const normalizedText = params.extractedText.trim();

  return {
    id: `${params.sourceDocumentId}-extraction-candidate`,
    source_document_id: params.sourceDocumentId,
    extraction_status: normalizedText.length > 0 ? "extracted" : "failed",
    extracted_text_policy: "reference_only",
    review_status: "needs_review",
    extracted_text: normalizedText.length > 0 ? params.extractedText : undefined,
    extraction_notes: params.extractionNotes ?? "Generated extraction candidate; review required.",
    created_from: "source_pdf",
  };
}

export function buildStructuredCandidateFromReference(params: {
  sourceDocumentId: string;
  reference: PastExamReferenceItem;
}): PastExamStructuredCandidate {
  return {
    id: `${params.sourceDocumentId}-${params.reference.id}-structured-candidate`,
    source_document_id: params.sourceDocumentId,
    linked_reference_id: params.reference.id,
    candidate_status: "needs_review",
    raw_text_policy: "reference_only",
    topic_tags_candidate: [...params.reference.topic_tags],
    issue_tags_candidate: [...params.reference.issue_tags],
    skill_tags_candidate: [...params.reference.skill_tags],
    expected_answer_skeleton_candidate: [...params.reference.expected_answer_skeleton],
    scoring_checkpoint_skeleton_candidate: [...params.reference.scoring_checkpoint_skeleton],
    common_gap_candidates: [...params.reference.common_gap_candidates],
    created_from: "source_pdf_extraction",
  };
}
