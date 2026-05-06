import { buildExtractionCandidateFromSource } from "./past-exam-extraction-adapter";
import type { PastExamExtractionCandidate } from "./past-exam-source";

export type PastExamOcrAdapterInput = {
  source_document_id: string;
  storage_path: string;
  source_type: "pdf";
};

export type PastExamOcrProvider =
  | "manual_stub"
  | "gemini_vision"
  | "google_document_ai"
  | "future_provider";

export type PastExamOcrProviderMode = "disabled" | "stub_only" | "provider_ready";

export type PastExamOcrProviderConfig = {
  provider: PastExamOcrProvider;
  mode: PastExamOcrProviderMode;
  internal_only: true;
};

export type PastExamOcrProviderConfigInput = {
  provider?: string;
  mode?: string;
};

export type PastExamOcrAdapterResult = {
  source_document_id: string;
  extraction_status: "extracted" | "failed";
  extracted_text: string;
  extracted_text_policy: "reference_only";
  review_status: "needs_review";
  provider: PastExamOcrProvider;
  notes: string;
};

function normalizeProvider(provider?: string): PastExamOcrProvider {
  if (provider === "gemini_vision") {
    return "gemini_vision";
  }
  if (provider === "google_document_ai") {
    return "google_document_ai";
  }
  if (provider === "future_provider") {
    return "future_provider";
  }
  return "manual_stub";
}

function normalizeMode(mode?: string): PastExamOcrProviderMode {
  if (mode === "disabled") {
    return "disabled";
  }
  if (mode === "provider_ready") {
    return "provider_ready";
  }
  return "stub_only";
}

export function resolvePastExamOcrProviderConfig(
  input?: PastExamOcrProviderConfigInput,
): PastExamOcrProviderConfig {
  const normalizedProvider = normalizeProvider(input?.provider);
  const normalizedMode = normalizeMode(input?.mode);
  const mode =
    normalizedMode === "provider_ready" && normalizedProvider !== "manual_stub"
      ? "provider_ready"
      : "stub_only";

  return {
    provider: mode === "provider_ready" ? normalizedProvider : "manual_stub",
    mode,
    internal_only: true,
  };
}

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

export function buildOcrResultWithConfiguredProvider(
  input: PastExamOcrAdapterInput,
): PastExamOcrAdapterResult {
  const providerConfig = resolvePastExamOcrProviderConfig();

  if (providerConfig.provider === "manual_stub" || providerConfig.mode === "stub_only") {
    return buildManualOcrStubResult(input);
  }

  return {
    source_document_id: input.source_document_id,
    extraction_status: "failed",
    extracted_text: "",
    extracted_text_policy: "reference_only",
    review_status: "needs_review",
    provider: providerConfig.provider,
    notes: "Provider adapter is not enabled; review required.",
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
