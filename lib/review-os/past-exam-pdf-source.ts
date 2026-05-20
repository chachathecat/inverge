export type PastExamPdfSourceDocument = {
  id: string;
  exam_year: number;
  exam_name: string;
  stage: "first" | "second";
  subject: string;
  source_file_name: string;
  source_file_path?: string;
  page_count?: number;
  raw_text_policy: "reference_only";
  review_status: "uploaded" | "extracted" | "structured" | "needs_review" | "verified";
  extraction_status: "pending" | "extracted" | "failed";
  linked_reference_ids: string[];
  notes?: string;
  created_at: string;
};

export type PastExamPdfExtractionCandidate = {
  id: string;
  source_document_id: string;
  page_range: string;
  extracted_text_policy: "reference_only";
  extraction_status: "pending" | "extracted" | "failed";
  review_status: "needs_review";
  extracted_text_preview?: string;
  extraction_notes?: string;
};

export type PastExamPdfStructuredCandidate = {
  id: string;
  source_document_id: string;
  linked_reference_id?: string;
  exam_year: number;
  subject: string;
  question_number: number;
  topic_tags: string[];
  issue_tags: string[];
  skill_tags: string[];
  expected_answer_skeleton: string[];
  scoring_checkpoint_skeleton: string[];
  common_gap_candidates: string[];
  raw_text_policy: "reference_only";
  candidate_status: "needs_review" | "verified" | "rejected";
};

const SOURCE_NOTES = "Operator-uploaded PDF intake placeholder; extraction/review required";

const SOURCE_DOCUMENTS: PastExamPdfSourceDocument[] = [
  [2023, "34회", "감정평가실무", "practice", "q1"],
  [2023, "34회", "감정평가이론", "theory", "q2"],
  [2023, "34회", "감정평가 및 보상법규", "law", "q3"],
  [2024, "35회", "감정평가실무", "practice", "q1"],
  [2024, "35회", "감정평가이론", "theory", "q2"],
  [2024, "35회", "감정평가 및 보상법규", "law", "q3"],
  [2025, "36회", "감정평가실무", "practice", "q1"],
  [2025, "36회", "감정평가이론", "theory", "q2"],
  [2025, "36회", "감정평가 및 보상법규", "law", "q3"],
].map(([year, examName, subject, track, qno]) => ({
  id: `appraiser-second-${year}-${track}-pdf-source`,
  exam_year: year,
  exam_name: `감정평가사 2차 ${examName}`,
  stage: "second",
  subject,
  source_file_name: `appraiser-second-${year}-${track}.pdf`,
  source_file_path: `operator-only/past-exam-pdf/${year}/second/${track}/source.pdf`,
  raw_text_policy: "reference_only",
  review_status: "uploaded",
  extraction_status: "pending",
  linked_reference_ids: [`appraiser-second-${year}-${Number(examName.replace('회',''))}-${track}-${qno}`],
  notes: SOURCE_NOTES,
  created_at: `${year}-01-01T00:00:00.000Z`,
}));

const EXTRACTION_CANDIDATES: PastExamPdfExtractionCandidate[] = SOURCE_DOCUMENTS.map((source) => ({
  id: `${source.id}-candidate`,
  source_document_id: source.id,
  page_range: "TBD",
  extracted_text_policy: "reference_only",
  extraction_status: "pending",
  review_status: "needs_review",
  extraction_notes: "Extraction candidate placeholder; operator extraction required.",
}));

const STRUCTURED_CANDIDATES: PastExamPdfStructuredCandidate[] = SOURCE_DOCUMENTS.map((source) => ({
  id: `${source.id}-structured`,
  source_document_id: source.id,
  linked_reference_id: source.linked_reference_ids[0],
  exam_year: source.exam_year,
  subject: source.subject,
  question_number: Number(source.linked_reference_ids[0]?.match(/q(\d+)$/)?.[1] || 1),
  topic_tags: [],
  issue_tags: [],
  skill_tags: [],
  expected_answer_skeleton: [],
  scoring_checkpoint_skeleton: [],
  common_gap_candidates: [],
  raw_text_policy: "reference_only",
  candidate_status: "needs_review",
}));

export function listPastExamPdfSourceDocuments(): PastExamPdfSourceDocument[] {
  return SOURCE_DOCUMENTS.map((item) => ({ ...item, linked_reference_ids: [...item.linked_reference_ids] }));
}

export function findPastExamPdfSourceDocumentById(id: string): PastExamPdfSourceDocument | undefined {
  return listPastExamPdfSourceDocuments().find((item) => item.id === id);
}

export function listPastExamPdfExtractionCandidates(): PastExamPdfExtractionCandidate[] {
  return EXTRACTION_CANDIDATES.map((item) => ({ ...item }));
}

export function listPastExamPdfStructuredCandidates(): PastExamPdfStructuredCandidate[] {
  return STRUCTURED_CANDIDATES.map((item) => ({ ...item }));
}

export function buildPastExamPdfIntakePlan() {
  return {
    workflow: [
      "collect_pdf",
      "register_source_document",
      "extract_text_or_ocr",
      "split_question_candidates",
      "draft_structured_reference",
      "human_review",
      "mark_verified",
      "enable_answer_review_grounding",
    ] as const,
    pilot_scope: "2023–2025 second-stage PDFs",
    source_documents: listPastExamPdfSourceDocuments(),
    extraction_candidates: listPastExamPdfExtractionCandidates(),
    structured_candidates: listPastExamPdfStructuredCandidates(),
  };
}
