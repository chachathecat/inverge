export type CaptureDiagnosticSource = "not_analyzed" | "self_assessment" | "previous_record";
export type CaptureLearningMaterial = "learner_input" | "ai_example_functional_test";
export type CaptureReviewProvenance = Readonly<{
  version: "capture_review_provenance.v1";
  diagnosis: CaptureDiagnosticSource;
  referenceComparison: "not_started" | "deferred" | "compared";
  learningMaterial: CaptureLearningMaterial;
}>;

export function readCaptureReviewProvenance(rawPayload: unknown): CaptureReviewProvenance | null {
  if (!rawPayload || typeof rawPayload !== "object") return null;
  const fields = (rawPayload as Record<string, unknown>).user_confirmed_fields;
  if (!fields || typeof fields !== "object") return null;
  const value = (fields as Record<string, unknown>).capture_review_provenance;
  if (!value || typeof value !== "object") return null;
  const p = value as Record<string, unknown>;
  if (Object.keys(p).length !== 4 || p.version !== "capture_review_provenance.v1" ||
    !["not_analyzed", "self_assessment", "previous_record"].includes(String(p.diagnosis)) ||
    !["not_started", "deferred", "compared"].includes(String(p.referenceComparison)) ||
    !["learner_input", "ai_example_functional_test"].includes(String(p.learningMaterial))) return null;
  return p as CaptureReviewProvenance;
}

export function isCaptureFunctionalTest(rawPayload: unknown) {
  return readCaptureReviewProvenance(rawPayload)?.learningMaterial === "ai_example_functional_test";
}

export function isUnanalyzedCaptureRecord(rawPayload: unknown) {
  return readCaptureReviewProvenance(rawPayload)?.diagnosis === "not_analyzed";
}
