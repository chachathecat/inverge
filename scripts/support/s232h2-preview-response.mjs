/**
 * @typedef {
 *   | "runtime-version"
 *   | "sign-in"
 *   | "session"
 *   | "source-audit"
 *   | "rls-owner-probe"
 *   | "rls-cross-account-probe"
 * } PreviewRequestLabel
 */

/**
 * @typedef {
 *   | "REQUEST_FAILED"
 *   | "HTTP_REDIRECT"
 *   | "HTTP_CLIENT_ERROR"
 *   | "HTTP_SERVER_ERROR"
 *   | "HTTP_UNEXPECTED_STATUS"
 *   | "CONTENT_TYPE_MISSING"
 *   | "CONTENT_TYPE_NON_JSON"
 *   | "JSON_INVALID"
 *   | "JSON_VALUE_INVALID"
 * } PreviewRequestFailureKind
 */

export const PREVIEW_REQUEST_CODE_PREFIXES = Object.freeze({
  "runtime-version": "S232H2_PREVIEW_RUNTIME_VERSION",
  "sign-in": "S232H2_PREVIEW_SIGN_IN",
  session: "S232H2_PREVIEW_SESSION",
  "source-audit": "S232H2_PREVIEW_SOURCE_AUDIT",
  "rls-owner-probe": "S232H2_PREVIEW_RLS_OWNER_PROBE",
  "rls-cross-account-probe": "S232H2_PREVIEW_RLS_CROSS_ACCOUNT_PROBE",
});

const PREVIEW_REQUEST_FAILURE_KINDS = new Set([
  "REQUEST_FAILED",
  "HTTP_REDIRECT",
  "HTTP_CLIENT_ERROR",
  "HTTP_SERVER_ERROR",
  "HTTP_UNEXPECTED_STATUS",
  "CONTENT_TYPE_MISSING",
  "CONTENT_TYPE_NON_JSON",
  "JSON_INVALID",
  "JSON_VALUE_INVALID",
]);

/**
 * @param {PreviewRequestLabel} requestLabel
 * @param {PreviewRequestFailureKind} kind
 */
export function previewRequestFailureCode(requestLabel, kind) {
  const prefix = PREVIEW_REQUEST_CODE_PREFIXES[requestLabel];
  if (!prefix || !PREVIEW_REQUEST_FAILURE_KINDS.has(kind)) {
    return "S232H2_PREVIEW_CLASSIFICATION_INVALID";
  }
  return `${prefix}_${kind}`;
}

/**
 * @param {PreviewRequestLabel} requestLabel
 * @param {number} status
 * @param {string | undefined} contentTypeHeader
 */
export function previewResponseMetadataFailureCode(
  requestLabel,
  status,
  contentTypeHeader,
) {
  const statusClass = Math.floor(status / 100);
  if (statusClass === 3) {
    return previewRequestFailureCode(requestLabel, "HTTP_REDIRECT");
  }
  if (statusClass === 4) {
    return previewRequestFailureCode(requestLabel, "HTTP_CLIENT_ERROR");
  }
  if (statusClass === 5) {
    return previewRequestFailureCode(requestLabel, "HTTP_SERVER_ERROR");
  }
  if (!Number.isInteger(status) || status !== 200) {
    return previewRequestFailureCode(requestLabel, "HTTP_UNEXPECTED_STATUS");
  }
  const contentType = (contentTypeHeader ?? "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (!contentType) {
    return previewRequestFailureCode(requestLabel, "CONTENT_TYPE_MISSING");
  }
  if (contentType !== "application/json") {
    return previewRequestFailureCode(requestLabel, "CONTENT_TYPE_NON_JSON");
  }
  return null;
}

/** @param {unknown} value */
export function isPreviewJsonObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** @param {{ dispose(): Promise<void> }} response */
export async function disposePreviewResponse(response) {
  await response.dispose().catch(() => undefined);
}
