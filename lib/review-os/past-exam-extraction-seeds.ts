import type { PastExamExtractionCandidate, PastExamStructuredCandidate } from "./past-exam-source";
import { listPastExamReferences } from "./past-exam-reference";

const EXTRACTION_PLACEHOLDER =
  "PDF extraction candidate placeholder for source tracking. Full extracted text requires manual review.";

const PAST_EXAM_EXTRACTION_CANDIDATES: PastExamExtractionCandidate[] = [
  {
    id: "appraiser-second-2025-36-practice-q1-extraction-candidate-v1",
    source_document_id: "appraiser-second-2025-36-practice-q1-source-pdf",
    extraction_status: "extracted",
    extracted_text_policy: "reference_only",
    review_status: "needs_review",
    extracted_text: EXTRACTION_PLACEHOLDER,
    extraction_notes: "Manual pilot candidate; review required",
    created_from: "source_pdf",
  },
  {
    id: "appraiser-second-2025-36-theory-q2-extraction-candidate-v1",
    source_document_id: "appraiser-second-2025-36-theory-q2-source-pdf",
    extraction_status: "extracted",
    extracted_text_policy: "reference_only",
    review_status: "needs_review",
    extracted_text: EXTRACTION_PLACEHOLDER,
    extraction_notes: "Manual pilot candidate; review required",
    created_from: "source_pdf",
  },
  {
    id: "appraiser-second-2025-36-law-q3-extraction-candidate-v1",
    source_document_id: "appraiser-second-2025-36-law-q3-source-pdf",
    extraction_status: "extracted",
    extracted_text_policy: "reference_only",
    review_status: "needs_review",
    extracted_text: EXTRACTION_PLACEHOLDER,
    extraction_notes: "Manual pilot candidate; review required",
    created_from: "source_pdf",
  },
];

const PILOT_SOURCE_DOCUMENT_TO_REFERENCE_ID: Record<string, string> = {
  "appraiser-second-2025-36-practice-q1-source-pdf": "appraiser-second-2025-36-practice-q1",
  "appraiser-second-2025-36-theory-q2-source-pdf": "appraiser-second-2025-36-theory-q2",
  "appraiser-second-2025-36-law-q3-source-pdf": "appraiser-second-2025-36-law-q3",
};

const PAST_EXAM_STRUCTURED_CANDIDATES: PastExamStructuredCandidate[] = listPastExamReferences("second")
  .filter((ref) => Object.values(PILOT_SOURCE_DOCUMENT_TO_REFERENCE_ID).includes(ref.id))
  .map((ref) => {
    const sourceDocumentId = Object.keys(PILOT_SOURCE_DOCUMENT_TO_REFERENCE_ID).find(
      (docId) => PILOT_SOURCE_DOCUMENT_TO_REFERENCE_ID[docId] === ref.id,
    );

    if (!sourceDocumentId) {
      throw new Error(`Missing source document mapping for reference ${ref.id}`);
    }

    return {
      id: `${ref.id}-structured-candidate-v1`,
      source_document_id: sourceDocumentId,
      linked_reference_id: ref.id,
      candidate_status: "needs_review",
      raw_text_policy: "reference_only",
      topic_tags_candidate: [...ref.topic_tags],
      issue_tags_candidate: [...ref.issue_tags],
      skill_tags_candidate: [...ref.skill_tags],
      expected_answer_skeleton_candidate: [...ref.expected_answer_skeleton],
      scoring_checkpoint_skeleton_candidate: [...ref.scoring_checkpoint_skeleton],
      common_gap_candidates: [...ref.common_gap_candidates],
      created_from: "source_pdf_extraction",
    };
  });

export function listPastExamExtractionCandidates(): PastExamExtractionCandidate[] {
  return PAST_EXAM_EXTRACTION_CANDIDATES.map((candidate) => ({ ...candidate }));
}

export function listPastExamStructuredCandidates(): PastExamStructuredCandidate[] {
  return PAST_EXAM_STRUCTURED_CANDIDATES.map((candidate) => ({
    ...candidate,
    topic_tags_candidate: [...candidate.topic_tags_candidate],
    issue_tags_candidate: [...candidate.issue_tags_candidate],
    skill_tags_candidate: [...candidate.skill_tags_candidate],
    expected_answer_skeleton_candidate: [...candidate.expected_answer_skeleton_candidate],
    scoring_checkpoint_skeleton_candidate: [...candidate.scoring_checkpoint_skeleton_candidate],
    common_gap_candidates: [...candidate.common_gap_candidates],
  }));
}

export function findExtractionCandidatesBySourceDocumentId(sourceDocumentId: string): PastExamExtractionCandidate[] {
  return listPastExamExtractionCandidates().filter((candidate) => candidate.source_document_id === sourceDocumentId);
}

export function findStructuredCandidatesByReferenceId(referenceId: string): PastExamStructuredCandidate[] {
  return listPastExamStructuredCandidates().filter((candidate) => candidate.linked_reference_id === referenceId);
}
