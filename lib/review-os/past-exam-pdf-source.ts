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

type PdfSourceSeed = {
  year: number;
  examRound: number;
  examLabel: string;
  subject: string;
  track: "practice" | "theory" | "law";
  questionKey: "q1" | "q2" | "q3";
};

const PDF_SOURCE_SEEDS: PdfSourceSeed[] = [
  { year: 2023, examRound: 34, examLabel: "34회", subject: "감정평가실무", track: "practice", questionKey: "q1" },
  { year: 2023, examRound: 34, examLabel: "34회", subject: "감정평가이론", track: "theory", questionKey: "q2" },
  { year: 2023, examRound: 34, examLabel: "34회", subject: "감정평가 및 보상법규", track: "law", questionKey: "q3" },
  { year: 2024, examRound: 35, examLabel: "35회", subject: "감정평가실무", track: "practice", questionKey: "q1" },
  { year: 2024, examRound: 35, examLabel: "35회", subject: "감정평가이론", track: "theory", questionKey: "q2" },
  { year: 2024, examRound: 35, examLabel: "35회", subject: "감정평가 및 보상법규", track: "law", questionKey: "q3" },
  { year: 2025, examRound: 36, examLabel: "36회", subject: "감정평가실무", track: "practice", questionKey: "q1" },
  { year: 2025, examRound: 36, examLabel: "36회", subject: "감정평가이론", track: "theory", questionKey: "q2" },
  { year: 2025, examRound: 36, examLabel: "36회", subject: "감정평가 및 보상법규", track: "law", questionKey: "q3" },
];

const SOURCE_DOCUMENTS: PastExamPdfSourceDocument[] = PDF_SOURCE_SEEDS.map((seed) => ({
  id: `appraiser-second-${seed.year}-${seed.track}-pdf-source`,
  exam_year: seed.year,
  exam_name: `감정평가사 2차 ${seed.examLabel}`,
  stage: "second",
  subject: seed.subject,
  source_file_name: `appraiser-second-${seed.year}-${seed.track}.pdf`,
  source_file_path: `operator-only/past-exam-pdf/${seed.year}/second/${seed.track}/source.pdf`,
  raw_text_policy: "reference_only",
  review_status: "uploaded",
  extraction_status: "pending",
  linked_reference_ids: [`appraiser-second-${seed.year}-${seed.examRound}-${seed.track}-${seed.questionKey}`],
  notes: SOURCE_NOTES,
  created_at: `${seed.year}-01-01T00:00:00.000Z`,
}));

const EXTRACTION_CANDIDATES: PastExamPdfExtractionCandidate[] = SOURCE_DOCUMENTS.map((source) => ({
  id: `${source.id}-candidate`,
  source_document_id: source.id,
  page_range: "TBD",
  extracted_text_policy: "reference_only",
  extraction_status: "pending",
  review_status: "needs_review",
  extracted_text_preview: "",
  extraction_notes: "Operator review required before structured reference use",
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
  return STRUCTURED_CANDIDATES.map((item) => ({
    ...item,
    topic_tags: [...item.topic_tags],
    issue_tags: [...item.issue_tags],
    skill_tags: [...item.skill_tags],
    expected_answer_skeleton: [...item.expected_answer_skeleton],
    scoring_checkpoint_skeleton: [...item.scoring_checkpoint_skeleton],
    common_gap_candidates: [...item.common_gap_candidates],
  }));
}

export function findPastExamPdfExtractionCandidatesBySourceDocumentId(
  sourceDocumentId: string,
): PastExamPdfExtractionCandidate[] {
  return listPastExamPdfExtractionCandidates().filter((item) => item.source_document_id === sourceDocumentId);
}

export function findPastExamPdfStructuredCandidatesBySourceDocumentId(
  sourceDocumentId: string,
): PastExamPdfStructuredCandidate[] {
  return listPastExamPdfStructuredCandidates().filter((item) => item.source_document_id === sourceDocumentId);
}

export function getPastExamPdfIntakeCoverageSummary() {
  const sourceDocuments = listPastExamPdfSourceDocuments();
  const extractionCandidates = listPastExamPdfExtractionCandidates();
  const structuredCandidates = listPastExamPdfStructuredCandidates();
  const years = Array.from(new Set(sourceDocuments.map((item) => item.exam_year))).sort((a, b) => a - b);
  const subjects = Array.from(new Set(sourceDocuments.map((item) => item.subject))).sort((a, b) => a.localeCompare(b));
  const verifiedCount = structuredCandidates.filter((item) => item.candidate_status === "verified").length;
  const needsReviewCount = structuredCandidates.filter((item) => item.candidate_status === "needs_review").length;

  return {
    sourceDocumentCount: sourceDocuments.length,
    extractionCandidateCount: extractionCandidates.length,
    structuredCandidateCount: structuredCandidates.length,
    years,
    subjects,
    verifiedCount,
    needsReviewCount,
  };
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
