import { buildExtractionCandidateFromSource } from "./past-exam-extraction-adapter";
import type { PastExamExtractionCandidate } from "./past-exam-source";

export type PastExamOcrAdapterInput = {
  source_document_id: string;
  storage_path: string;
  source_type: "pdf";
};

export type PastExamOcrAdapterResult = {
  source_document_id: string;
  extraction_status: "extracted" | "failed";
  extracted_text: string;
  extracted_text_policy: "reference_only";
  review_status: "needs_review";
  provider: "manual_stub" | "future_ocr_provider";
  notes: string;
};

export function buildManualOcrStubResult(input: PastExamOcrAdapterInput): PastExamOcrAdapterResult {
  const hasStoragePath = input.storage_path.trim().length > 0;

  return {
    source_document_id: input.source_document_id,
    extraction_status: hasStoragePath ? "extracted" : "failed",
    extracted_text: "Manual OCR stub placeholder. Review required.",
    extracted_text_policy: "reference_only",
    review_status: "needs_review",
    provider: "manual_stub",
    notes: "Stub only; no OCR provider called.",
  };
}

export function convertOcrResultToExtractionCandidate(
  result: PastExamOcrAdapterResult,
): PastExamExtractionCandidate {
  return buildExtractionCandidateFromSource({
    sourceDocumentId: result.source_document_id,
    extractedText: result.extraction_status === "failed" ? "" : result.extracted_text,
    extractionNotes: result.notes,
  });
}
