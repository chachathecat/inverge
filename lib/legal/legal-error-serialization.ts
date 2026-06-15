const SENSITIVE_ENV_KEYS = ["LAW_OPEN_API_OC", "SUPABASE_SERVICE_ROLE_KEY"] as const;
const SAFE_ERROR_FIELDS = ["message", "code", "details", "hint", "name"] as const;

type SafeErrorValue = string | number | boolean | null | SafeErrorRecord | SafeErrorValue[];
interface SafeErrorRecord {
  [key: string]: SafeErrorValue;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function redactSensitiveText(value: string): string {
  let redacted = value;

  for (const key of SENSITIVE_ENV_KEYS) {
    const secret = process.env[key];

    if (secret) {
      redacted = redacted.split(secret).join(`[redacted:${key}]`);
    }
  }

  if (/<\?xml|<[^>]+>[\s\S]*<\/[^>]+>/.test(redacted)) {
    return "[redacted:xml]";
  }

  return redacted;
}

function sanitizeValue(value: unknown, depth = 0): SafeErrorValue | undefined {
  if (value === null || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return redactSensitiveText(value);
  }

  if (Array.isArray(value)) {
    if (depth >= 1) {
      return "[redacted:nested]";
    }

    return value.slice(0, 10).map((item) => sanitizeValue(item, depth + 1) ?? null);
  }

  if (isRecord(value)) {
    if (depth >= 1) {
      return "[redacted:nested]";
    }

    const output: SafeErrorRecord = {};

    for (const [key, child] of Object.entries(value)) {
      const sanitized = sanitizeValue(child, depth + 1);

      if (sanitized !== undefined) {
        output[key] = sanitized;
      }
    }

    return output;
  }

  return undefined;
}

export function serializeUnknownLegalIngestError(error: unknown): SafeErrorRecord {
  const serialized: SafeErrorRecord = {};

  if (error instanceof Error) {
    serialized.name = redactSensitiveText(error.name);
    serialized.message = redactSensitiveText(error.message);

    if (error.stack) {
      serialized.stack = redactSensitiveText(error.stack);
    }
  }

  if (isRecord(error)) {
    for (const field of SAFE_ERROR_FIELDS) {
      const sanitized = sanitizeValue(error[field]);

      if (sanitized !== undefined) {
        serialized[field] = sanitized;
      }
    }

    for (const [key, value] of Object.entries(error)) {
      if (key in serialized || key === "stack") {
        continue;
      }

      const sanitized = sanitizeValue(value);

      if (sanitized !== undefined) {
        serialized[key] = sanitized;
      }
    }
  }

  if (Object.keys(serialized).length === 0) {
    serialized.message = typeof error === "string" ? redactSensitiveText(error) : "Unknown legal ingest error.";
  }

  return serialized;
}

export function formatUnknownLegalIngestError(error: unknown): string {
  return JSON.stringify(serializeUnknownLegalIngestError(error));
}
