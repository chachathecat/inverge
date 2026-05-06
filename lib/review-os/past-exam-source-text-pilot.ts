import { buildExtractionCandidateFromSource, buildStructuredCandidateFromReference } from "./past-exam-extraction-adapter";
import { listPastExamReferences } from "./past-exam-reference";
import { listPastExamSourceDocuments } from "./past-exam-source-seeds";
import type { PastExamExtractionCandidate, PastExamStructuredCandidate } from "./past-exam-source";

const PILOT_SOURCE_DOCUMENT_ID = "appraiser-second-2025-36-practice-q1-source-pdf";
const PILOT_REFERENCE_ID = "appraiser-second-2025-36-practice-q1";

export function listPastExamSourceTextPilotExtractionCandidates(): PastExamExtractionCandidate[] {
  return [
    buildExtractionCandidateFromSource({
      sourceDocumentId: PILOT_SOURCE_DOCUMENT_ID,
      extractedText:
        "Manual source-text pilot placeholder for 2025 practice q1. Full PDF text requires review.",
      extractionNotes: "Manual pilot; not OCR; review required.",
    }),
  ];
}

export function listPastExamSourceTextPilotStructuredCandidates(): PastExamStructuredCandidate[] {
  const reference = listPastExamReferences("all").find((item) => item.id === PILOT_REFERENCE_ID);

  if (!reference) {
    throw new Error(`Missing pilot reference item: ${PILOT_REFERENCE_ID}`);
  }

  return [
    buildStructuredCandidateFromReference({
      sourceDocumentId: PILOT_SOURCE_DOCUMENT_ID,
      reference,
    }),
  ];
}

export function isPastExamSourceTextPilotLinkedToKnownSourceDocument(): boolean {
  return listPastExamSourceDocuments().some((item) => item.id === PILOT_SOURCE_DOCUMENT_ID);
}
