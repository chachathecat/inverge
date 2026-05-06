import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";

import {
  buildManualOcrStubResult,
  buildOcrResultWithConfiguredProvider,
  convertOcrResultToExtractionCandidate,
  invokeConfiguredOcrProvider,
  invokeManualOcrStubProvider,
  resolvePastExamOcrProviderConfig,
} from "../lib/review-os/past-exam-ocr-adapter.ts";

const adapterPath = new URL("../lib/review-os/past-exam-ocr-adapter.ts", import.meta.url);

test("default provider config is manual_stub", () => {
  const config = resolvePastExamOcrProviderConfig();
  assert.equal(config.provider, "manual_stub");
});

test("default provider mode is stub_only", () => {
  const config = resolvePastExamOcrProviderConfig();
  assert.equal(config.mode, "stub_only");
});

test("default provider config remains internal_only", () => {
  const config = resolvePastExamOcrProviderConfig();
  assert.equal(config.internal_only, true);
});

test("provider_ready requires explicit provider and mode", () => {
  const config = resolvePastExamOcrProviderConfig({
    provider: "google_document_ai",
    mode: "provider_ready",
  });
  assert.equal(config.provider, "google_document_ai");
  assert.equal(config.mode, "provider_ready");
});

test("provider_ready falls back to stub_only when provider is manual_stub", () => {
  const config = resolvePastExamOcrProviderConfig({
    provider: "manual_stub",
    mode: "provider_ready",
  });
  assert.equal(config.provider, "manual_stub");
  assert.equal(config.mode, "stub_only");
});

test("unknown provider/mode stays stub_only manual_stub", () => {
  const config = resolvePastExamOcrProviderConfig({
    provider: "unknown_provider",
    mode: "unknown_mode",
  });
  assert.equal(config.provider, "manual_stub");
  assert.equal(config.mode, "stub_only");
});

test("configured provider output remains reference_only", () => {
  const result = buildOcrResultWithConfiguredProvider({
    source_document_id: "source-ocr-config-1",
    storage_path: "sources/2025-1.pdf",
    source_type: "pdf",
  });

  assert.equal(result.extracted_text_policy, "reference_only");
});

test("configured provider output remains needs_review", () => {
  const result = buildOcrResultWithConfiguredProvider({
    source_document_id: "source-ocr-config-2",
    storage_path: "sources/2025-2.pdf",
    source_type: "pdf",
  });

  assert.equal(result.review_status, "needs_review");
});

test("stub result uses provider manual_stub", () => {
  const result = buildManualOcrStubResult({
    source_document_id: "source-ocr-3",
    storage_path: "sources/2025-3.pdf",
    source_type: "pdf",
  });

  assert.equal(result.provider, "manual_stub");
});

test("empty storage_path returns failed", () => {
  const result = buildManualOcrStubResult({
    source_document_id: "source-ocr-4",
    storage_path: "   ",
    source_type: "pdf",
  });

  assert.equal(result.extraction_status, "failed");
});

test("non-empty storage_path returns extracted", () => {
  const result = buildManualOcrStubResult({
    source_document_id: "source-ocr-5",
    storage_path: "sources/2025-5.pdf",
    source_type: "pdf",
  });

  assert.equal(result.extraction_status, "extracted");
});

test("conversion creates PastExamExtractionCandidate", () => {
  const result = buildManualOcrStubResult({
    source_document_id: "source-ocr-6",
    storage_path: "sources/2025-6.pdf",
    source_type: "pdf",
  });

  const candidate = convertOcrResultToExtractionCandidate(result);

  assert.equal(candidate.source_document_id, "source-ocr-6");
  assert.equal(candidate.created_from, "source_pdf");
  assert.equal(candidate.extracted_text_policy, "reference_only");
});

test("candidate remains needs_review", () => {
  const result = buildManualOcrStubResult({
    source_document_id: "source-ocr-7",
    storage_path: "sources/2025-7.pdf",
    source_type: "pdf",
  });

  const candidate = convertOcrResultToExtractionCandidate(result);

  assert.equal(candidate.review_status, "needs_review");
});



test("manual invoker returns reference_only", async () => {
  const result = await invokeManualOcrStubProvider({
    source_document_id: "source-ocr-invoke-1",
    storage_path: "sources/2025-invoke-1.pdf",
    source_type: "pdf",
    provider: "manual_stub",
  });

  assert.equal(result.extracted_text_policy, "reference_only");
});

test("manual invoker returns needs_review", async () => {
  const result = await invokeManualOcrStubProvider({
    source_document_id: "source-ocr-invoke-2",
    storage_path: "sources/2025-invoke-2.pdf",
    source_type: "pdf",
    provider: "manual_stub",
  });

  assert.equal(result.review_status, "needs_review");
});



test("manual invoker empty storage_path returns failed", async () => {
  const result = await invokeManualOcrStubProvider({
    source_document_id: "source-ocr-invoke-empty",
    storage_path: "   ",
    source_type: "pdf",
    provider: "manual_stub",
  });

  assert.equal(result.extraction_status, "failed");
});

test("manual invoker non-empty storage_path returns extracted", async () => {
  const result = await invokeManualOcrStubProvider({
    source_document_id: "source-ocr-invoke-non-empty",
    storage_path: "sources/2025-invoke-3.pdf",
    source_type: "pdf",
    provider: "manual_stub",
  });

  assert.equal(result.extraction_status, "extracted");
});

test("dispatcher default uses manual_stub path", async () => {
  const result = await invokeConfiguredOcrProvider({
    source_document_id: "source-ocr-dispatch-1",
    storage_path: "sources/2025-dispatch-1.pdf",
    source_type: "pdf",
  });

  assert.equal(result.provider, "manual_stub");
  assert.equal(result.extraction_status, "extracted");
});

test("dispatcher with manual_stub disabled mode returns failed", async () => {
  const result = await invokeConfiguredOcrProvider(
    {
      source_document_id: "source-ocr-dispatch-disabled",
      storage_path: "sources/2025-dispatch-disabled.pdf",
      source_type: "pdf",
    },
    {
      provider: "manual_stub",
      mode: "disabled",
      internal_only: true,
    },
  );

  assert.equal(result.provider, "manual_stub");
  assert.equal(result.extraction_status, "failed");
  assert.equal(result.extracted_text, "");
  assert.equal(result.extracted_text_policy, "reference_only");
  assert.equal(result.review_status, "needs_review");
  assert.match(result.notes, /disabled/i);
});

test("dispatcher with provider_ready real provider does not call external provider", async () => {
  const result = await invokeConfiguredOcrProvider(
    {
      source_document_id: "source-ocr-dispatch-2",
      storage_path: "sources/2025-dispatch-2.pdf",
      source_type: "pdf",
    },
    resolvePastExamOcrProviderConfig({
      provider: "google_document_ai",
      mode: "provider_ready",
    }),
  );

  assert.equal(result.provider, "google_document_ai");
  assert.equal(result.extraction_status, "failed");
  assert.equal(result.notes, "Real provider invocation is not implemented yet; review required.");
});

test("dispatcher result remains reference_only and needs_review", async () => {
  const result = await invokeConfiguredOcrProvider(
    {
      source_document_id: "source-ocr-dispatch-3",
      storage_path: "sources/2025-dispatch-3.pdf",
      source_type: "pdf",
    },
    resolvePastExamOcrProviderConfig({
      provider: "future_provider",
      mode: "provider_ready",
    }),
  );

  assert.equal(result.extracted_text_policy, "reference_only");
  assert.equal(result.review_status, "needs_review");
});

test("no OCR provider call", async () => {
  const source = await readFile(adapterPath, "utf8");
  const normalizedSource = source.toLowerCase();

  const forbidden = [
    /fetch\(/i,
    /\baxios\b/i,
    /@google-cloud\/vision/i,
    /\btesseract\b/i,
    /\bgoogleapis\b/i,
    /\bopenai\b/i,
    /DocumentProcessorServiceClient/i,
  ];
  for (const pattern of forbidden) {
    assert.equal(pattern.test(normalizedSource), false, `forbidden OCR provider token found: ${pattern}`);
  }
});

test("no upload route", async () => {
  const shouldNotExist = [
    new URL("../app/api/ocr/route.ts", import.meta.url),
    new URL("../app/api/pdf-upload/route.ts", import.meta.url),
  ];

  for (const pathUrl of shouldNotExist) {
    await assert.rejects(() => access(pathUrl, constants.F_OK));
  }
});

test("no learner source viewer", async () => {
  const shouldNotExist = [
    new URL("../app/exams/archive/source/page.tsx", import.meta.url),
    new URL("../app/exams/archive/source-upload/page.tsx", import.meta.url),
  ];

  for (const pathUrl of shouldNotExist) {
    await assert.rejects(() => access(pathUrl, constants.F_OK));
  }
});

test("no archive UI", async () => {
  const shouldNotExist = [new URL("../app/exams/archive/upload/page.tsx", import.meta.url)];

  for (const pathUrl of shouldNotExist) {
    await assert.rejects(() => access(pathUrl, constants.F_OK));
  }
});

test("no official answer/scoring/pass-fail language", async () => {
  const source = await readFile(adapterPath, "utf8");
  const forbidden = ["official_answer", "official_scoring", "pass_fail", "final judgment", "자동 채점"];

  for (const token of forbidden) {
    assert.equal(source.includes(token), false, `forbidden token found: ${token}`);
  }
});

test("no raw user OCR/user answer fields", async () => {
  const source = await readFile(adapterPath, "utf8");
  const forbidden = ["raw_user_ocr", "user_ocr", "raw_user_answer", "user_answer_raw"];

  for (const token of forbidden) {
    assert.equal(source.includes(token), false, `forbidden token found: ${token}`);
  }
});
