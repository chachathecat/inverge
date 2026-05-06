import type { PastExamSourceDocument } from "./past-exam-source";

const PAST_EXAM_SOURCE_DOCUMENTS: PastExamSourceDocument[] = [
  {
    id: "appraiser-second-2025-36-practice-q1-source-pdf",
    exam_year: 2025,
    exam_name: "제36회 감정평가사 2차",
    stage: "second",
    subject: "감정평가실무",
    source_type: "pdf",
    storage_path: "past-exams/2025/36/second/practice/q1/source.pdf",
    extraction_status: "uploaded",
    review_status: "needs_review",
    raw_text_policy: "reference_only",
    linked_reference_ids: ["appraiser-second-2025-36-practice-q1"],
  },
  {
    id: "appraiser-second-2025-36-theory-q2-source-pdf",
    exam_year: 2025,
    exam_name: "제36회 감정평가사 2차",
    stage: "second",
    subject: "감정평가이론",
    source_type: "pdf",
    storage_path: "past-exams/2025/36/second/theory/q2/source.pdf",
    extraction_status: "uploaded",
    review_status: "needs_review",
    raw_text_policy: "reference_only",
    linked_reference_ids: ["appraiser-second-2025-36-theory-q2"],
  },
  {
    id: "appraiser-second-2025-36-law-q3-source-pdf",
    exam_year: 2025,
    exam_name: "제36회 감정평가사 2차",
    stage: "second",
    subject: "감정평가 및 보상법규",
    source_type: "pdf",
    storage_path: "past-exams/2025/36/second/law/q3/source.pdf",
    extraction_status: "uploaded",
    review_status: "needs_review",
    raw_text_policy: "reference_only",
    linked_reference_ids: ["appraiser-second-2025-36-law-q3"],
  },
];

export function listPastExamSourceDocuments(): PastExamSourceDocument[] {
  return PAST_EXAM_SOURCE_DOCUMENTS.map((item) => ({ ...item, linked_reference_ids: [...item.linked_reference_ids] }));
}

export function findPastExamSourceDocumentsByReferenceId(
  referenceId: string
): PastExamSourceDocument[] {
  return listPastExamSourceDocuments().filter((item) => item.linked_reference_ids.includes(referenceId));
}

export function findPastExamSourceDocumentsByYear(year: number): PastExamSourceDocument[] {
  return listPastExamSourceDocuments().filter((item) => item.exam_year === year);
}
