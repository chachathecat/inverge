const FORBIDDEN_KEYS = new Set([
  "rawQuestionText",
  "rawAnswerText",
  "raw_ocr_text",
  "raw_extraction_json",
  "full user answer",
  "full problem text",
  "full reference answer",
]);

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((entry) => sanitizeValue(entry));
  if (!value || typeof value !== "object") return value;
  const output: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_KEYS.has(key)) continue;
    output[key] = sanitizeValue(child);
  }
  return output;
}

export function sanitizeCaptureTelemetryMetadata<T>(input: T): T {
  return sanitizeValue(input) as T;
}
