import {
  canMarkExtractionCandidateReviewed,
  canMarkStructuredCandidateReviewed,
  type PastExamExtractionReviewRecord,
  type PastExamStructuredCandidateReviewRecord,
} from "./past-exam-source";
import {
  listPastExamSourceTextPilotExtractionCandidates,
  listPastExamSourceTextPilotStructuredCandidates,
} from "./past-exam-source-text-pilot";

const REVIEWED_AT_ISO = "2026-05-06T00:00:00.000Z";

const extractionCandidate = listPastExamSourceTextPilotExtractionCandidates()[0];
const structuredCandidate = listPastExamSourceTextPilotStructuredCandidates()[0];

const PAST_EXAM_EXTRACTION_REVIEW_RECORDS: PastExamExtractionReviewRecord[] = [
  {
    id: "review-appraiser-second-2025-36-practice-q1-extraction",
    candidate_id: extractionCandidate.id,
    source_document_id: extractionCandidate.source_document_id,
    reviewer_role: "operator",
    decision: "approve",
    review_notes: "Pilot review record for workflow validation.",
    reviewed_at: REVIEWED_AT_ISO,
    result_status: "reviewed",
  },
];

const PAST_EXAM_STRUCTURED_CANDIDATE_REVIEW_RECORDS: PastExamStructuredCandidateReviewRecord[] = [
  {
    id: "review-appraiser-second-2025-36-practice-q1-structured",
    candidate_id: structuredCandidate.id,
    source_document_id: structuredCandidate.source_document_id,
    linked_reference_id: structuredCandidate.linked_reference_id,
    reviewer_role: "operator",
    decision: "approve",
    review_notes: "Pilot review record for workflow validation.",
    reviewed_at: REVIEWED_AT_ISO,
    result_status: "reviewed",
  },
];

export function listPastExamExtractionReviewRecords(): PastExamExtractionReviewRecord[] {
  return PAST_EXAM_EXTRACTION_REVIEW_RECORDS.map((record) => ({ ...record }));
}

export function listPastExamStructuredCandidateReviewRecords(): PastExamStructuredCandidateReviewRecord[] {
  return PAST_EXAM_STRUCTURED_CANDIDATE_REVIEW_RECORDS.map((record) => ({ ...record }));
}

export function canPilotExtractionCandidateBeMarkedReviewed(): boolean {
  return canMarkExtractionCandidateReviewed(extractionCandidate, PAST_EXAM_EXTRACTION_REVIEW_RECORDS[0]);
}

export function canPilotStructuredCandidateBeMarkedReviewed(): boolean {
  return canMarkStructuredCandidateReviewed(structuredCandidate, PAST_EXAM_STRUCTURED_CANDIDATE_REVIEW_RECORDS[0]);
}
