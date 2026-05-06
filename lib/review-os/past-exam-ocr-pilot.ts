import { buildManualOcrStubResult, convertOcrResultToExtractionCandidate } from "./past-exam-ocr-adapter";
import { listPastExamSourceDocuments } from "./past-exam-source-seeds";
import type { PastExamExtractionCandidate } from "./past-exam-source";
import type { PastExamOcrAdapterResult } from "./past-exam-ocr-adapter";

export function listPastExamOcrPilotResults(): PastExamOcrAdapterResult[] {
  return listPastExamSourceDocuments()
    .filter((doc) => doc.exam_year === 2025)
    .map((doc) =>
      buildManualOcrStubResult({
        source_document_id: doc.id,
        storage_path: doc.storage_path,
        source_type: "pdf",
      }),
    );
}

export function listPastExamOcrPilotExtractionCandidates(): PastExamExtractionCandidate[] {
  return listPastExamOcrPilotResults().map((result) => convertOcrResultToExtractionCandidate(result));
}
