import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import {
  S232G_ALIASES,
  S232G_EVIDENCE_KEYS,
  S232G_EXCLUSIONS,
  S232G_LIMITATIONS,
  S232G_ROUTES,
  S232G_SCENARIOS,
  S232G_SUMMARY_KEYS,
  S232G_VIEWPORTS,
  S232G_WIDTH_EQUIVALENT_VIEWPORT,
  buildS232GExpectedEvidenceDescriptors,
  s232gEvidenceCompositeKey,
} from "../tests/support/s232g-contract.mjs";

const shaPattern = /^[0-9a-f]{40}$/;
const emailPattern = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const urlPattern = /https?:\/\//i;
const uuidPattern = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;

function fail(code) {
  throw new Error(`S232G evidence validation failed: ${code}`);
}

function exactKeys(value, expected, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${code}-object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) fail(`${code}-keys`);
  for (const key of actual) {
    const entry = value[key];
    if (entry !== null && typeof entry === "object") fail(`${code}-nested`);
  }
}

function assertNoSecondaryLeak(raw, code) {
  if (emailPattern.test(raw)) fail(`${code}-email`);
  if (urlPattern.test(raw)) fail(`${code}-url`);
  if (uuidPattern.test(raw)) fail(`${code}-uuid`);
}

function assertInteger(value, expected, code) {
  if (!Number.isInteger(value) || value !== expected) fail(code);
}

function assertBoundedInteger(value, minimum, maximum, code) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) fail(code);
}

export function validateS232GEvidenceValues({ ndjsonRaw, summaryRaw, expectedSha }) {
  if (!shaPattern.test(expectedSha)) fail("expected-sha");
  assertNoSecondaryLeak(ndjsonRaw, "matrix");
  assertNoSecondaryLeak(summaryRaw, "summary");
  if (!ndjsonRaw.endsWith("\n")) fail("matrix-final-newline");

  const lines = ndjsonRaw.slice(0, -1).split("\n");
  if (lines.some((line) => line.trim() === "")) fail("matrix-blank-line");
  const rows = lines.map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      fail("matrix-json");
    }
  });
  const expectedRows = buildS232GExpectedEvidenceDescriptors();
  assertInteger(rows.length, expectedRows.length, "matrix-row-count");

  const allowedRoutes = new Set([
    ...S232G_ROUTES.map((route) => route.evidenceRoute),
    ...S232G_ALIASES.map((alias) => alias.evidenceRoute),
  ]);
  const allowedViewports = new Set([
    ...S232G_VIEWPORTS.map((viewport) => viewport.key),
    S232G_WIDTH_EQUIVALENT_VIEWPORT.key,
    "n/a",
  ]);
  const allowedScenarios = new Set(S232G_SCENARIOS);
  const allowedLimitations = new Set(S232G_LIMITATIONS);
  const expectedByKey = new Map(
    expectedRows.map((row) => [s232gEvidenceCompositeKey(row), row]),
  );
  const seen = new Set();

  for (const row of rows) {
    exactKeys(row, S232G_EVIDENCE_KEYS, "matrix-row");
    if (row.commitSha !== expectedSha || row.deploymentSha !== expectedSha) {
      fail("matrix-sha");
    }
    if (!allowedRoutes.has(row.route)) fail("matrix-route-enum");
    if (!allowedViewports.has(row.viewport)) fail("matrix-viewport-enum");
    if (!allowedScenarios.has(row.scenario)) fail("matrix-scenario-enum");
    if (row.result !== "pass") fail("matrix-result");
    if (!allowedLimitations.has(row.remainingLimitation)) fail("matrix-limitation-enum");
    const key = s232gEvidenceCompositeKey(row);
    if (seen.has(key)) fail("matrix-duplicate");
    seen.add(key);
    const expected = expectedByKey.get(key);
    if (!expected) fail("matrix-unexpected-row");
    if (row.remainingLimitation !== expected.remainingLimitation) {
      fail("matrix-limitation-mismatch");
    }
  }
  if (seen.size !== expectedByKey.size) fail("matrix-missing-row");
  for (const key of expectedByKey.keys()) {
    if (!seen.has(key)) fail("matrix-missing-row");
  }

  let summary;
  try {
    summary = JSON.parse(summaryRaw);
  } catch {
    fail("summary-json");
  }
  exactKeys(summary, S232G_SUMMARY_KEYS, "summary");
  if (summary.schemaVersion !== 1 || summary.result !== "pass") fail("summary-result");
  if (summary.commitSha !== expectedSha || summary.deploymentSha !== expectedSha) {
    fail("summary-sha");
  }

  const exactIntegers = {
    rowCount: expectedRows.length,
    canonicalRouteCount: S232G_ROUTES.length,
    aliasCount: S232G_ALIASES.length,
    excludedRouteCount: S232G_EXCLUSIONS.length,
    viewportCount: S232G_VIEWPORTS.length,
    axeScanCount: S232G_ROUTES.length * (S232G_VIEWPORTS.length + 1),
    axeBlockingCount: 0,
    visibleHeadingCount: S232G_ROUTES.length,
    keyboardRouteCount: S232G_ROUTES.length,
    keyboardFailureCount: 0,
    horizontalOverflowCount: 0,
    nestedTwoDimensionalScrollCount: 0,
    clippedCoreContentCount: 0,
    consoleErrorCount: 0,
    pageErrorCount: 0,
    requestFailureCount: 0,
    httpErrorCount: 0,
    sourceCreatedCount: 1,
    durableSaveReceiptCount: 1,
    reloadComparisonCount: 1,
    notesRoundTripCount: 1,
    freshAccountContextCount: 1,
    crossAccountApiDenialCount: 2,
    crossAccountUiDenialCount: 1,
    crossAccountCollectionAbsenceCount: 3,
    ownerPositiveControlCount: 2,
    stateAnnouncementProxyCount: 1,
    directFigmaProductFrameRouteCount: 1,
    directFigmaComponentOnlyRouteCount: 1,
    semanticComponentOnlyRouteCount: S232G_ROUTES.length - 2,
  };
  for (const [key, value] of Object.entries(exactIntegers)) {
    assertInteger(summary[key], value, `summary-${key}`);
  }
  assertBoundedInteger(
    summary.blockedPreviewToolbarMutationCount,
    0,
    64,
    "summary-toolbar-mutation",
  );
  assertBoundedInteger(
    summary.excludedPreviewToolbarConsoleErrorCount,
    0,
    summary.blockedPreviewToolbarMutationCount,
    "summary-toolbar-console",
  );
  for (const key of [
    "actualBrowserZoomClaimed", "realScreenReaderClaimed", "credentialsCaptured",
    "rawLearnerContentCaptured", "requestBodyCaptured", "responseBodyCaptured",
    "itemIdCaptured", "userIdCaptured", "emailCaptured", "urlCaptured",
    "domCaptured", "screenshotCaptured", "traceCaptured", "videoCaptured",
  ]) {
    if (summary[key] !== false) fail(`summary-${key}`);
  }
  return { rows, summary };
}

export async function validateAndCopyS232GEvidence({
  ndjsonPath,
  summaryPath,
  expectedSha,
  validatedDirectory,
}) {
  const [ndjsonRaw, summaryRaw] = await Promise.all([
    readFile(ndjsonPath, "utf8"),
    readFile(summaryPath, "utf8"),
  ]);
  const validated = validateS232GEvidenceValues({ ndjsonRaw, summaryRaw, expectedSha });
  await mkdir(validatedDirectory, { recursive: true });
  await Promise.all([
    writeFile(
      resolve(validatedDirectory, "s232g-matrix.ndjson"),
      validated.rows.map((row) => JSON.stringify(row)).join("\n") + "\n",
      "utf8",
    ),
    writeFile(
      resolve(validatedDirectory, "s232g-summary.json"),
      JSON.stringify(validated.summary, null, 2) + "\n",
      "utf8",
    ),
  ]);
  return validated;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  const [ndjsonPath, summaryPath, expectedSha, validatedDirectory] = process.argv.slice(2);
  if (!ndjsonPath || !summaryPath || !expectedSha || !validatedDirectory) {
    fail("arguments");
  }
  await validateAndCopyS232GEvidence({
    ndjsonPath,
    summaryPath,
    expectedSha,
    validatedDirectory,
  });
  process.stdout.write("S232G metadata-only evidence validated.\n");
}
