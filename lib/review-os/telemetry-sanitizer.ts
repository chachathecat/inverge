import { sanitizeDerivedMetadata } from "./data-boundary";

export function sanitizeCaptureTelemetryMetadata<T>(input: T): T {
  return sanitizeDerivedMetadata(input);
}
