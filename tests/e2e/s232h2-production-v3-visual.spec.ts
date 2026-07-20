import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
  type Route,
  type TestInfo,
} from "@playwright/test";
import { createHash } from "node:crypto";
import { chmod, readFile, unlink, writeFile } from "node:fs/promises";
import { isAbsolute } from "node:path";

import { CALCULATOR_ROUTINE_SESSION_STORAGE_PREFIX } from "../../lib/review-os/calculator-routine";
import {
  buildExactFixtureLearningSignal,
  exactFixtureGeneratedArtifacts,
  exactFixtureMistakeType,
  exactFixtureProductionMetadata,
  resolveSyntheticItemId,
  syntheticCaptureReviewDate,
  syntheticFixtureAnswer,
  syntheticFixtureCorrectAnswer,
  syntheticFixtureGap,
  syntheticFixtureProblemIdentifier,
  syntheticFixtureQuestion,
  syntheticFixtureSource,
  syntheticFixtureTitle,
  syntheticLedgerAnswer,
  syntheticLedgerCorrectAnswer,
  syntheticLedgerGap,
  syntheticOwnerId,
  syntheticQueueAnchorSource,
  type SyntheticItem,
} from "../../scripts/support/s232h2-exact-fixture";

import {
  establishProtectedPreviewSession,
  loginWithExplicitTestAccountSession,
  protectionHeaders,
  runtimeBaseUrl,
  runtimeRunnerSha,
  runtimeTargetSha,
  type ExplicitTestCredential,
} from "./support/authenticated-runtime";

const runtimeEnabled = process.env.S232H2_VISUAL_RUNTIME === "1";
const baselineUrl = process.env.E2E_BASELINE_URL?.trim() ?? "";
const baselineHost =
  process.env.E2E_BASELINE_EXPECTED_HOST?.trim().toLowerCase() ?? "";
const baselineSha = process.env.E2E_BASELINE_SHA?.trim() ?? "";
const mergeBaseSha = process.env.E2E_MERGE_BASE_SHA?.trim() ?? "";
const baselineTreeSha = process.env.E2E_BASELINE_TREE_SHA?.trim() ?? "";
const visualProofPath = process.env.S232H2_VISUAL_PROOF_PATH?.trim() ?? "";
const fixedBaselineSha = "35836d419161d7cfe55e3e3c088fcc4d66376a7d";

type VisualCredentialSlot = "visual" | "user-b";
type VisualCredentialCandidate = ExplicitTestCredential & {
  slot: VisualCredentialSlot;
};

const visualCredentialCandidates = [
  {
    slot: "visual" as const,
    email: process.env.E2E_VISUAL_USER_EMAIL?.trim() ?? "",
    password: process.env.E2E_VISUAL_USER_PASSWORD ?? "",
  },
  {
    slot: "user-b" as const,
    email: process.env.E2E_USER_B_EMAIL?.trim() ?? "",
    password: process.env.E2E_USER_B_PASSWORD ?? "",
  },
].filter(
  (candidate): candidate is VisualCredentialCandidate =>
    candidate.email.length > 0 && candidate.password.length > 0,
);

const viewports = [
  { label: "390", width: 390, height: 844 },
  { label: "768", width: 768, height: 1024 },
  { label: "1440", width: 1440, height: 1024 },
] as const;

type RouteDefinition = {
  id: string;
  label: string;
  authenticated: boolean;
  path: string | ((itemId: string) => string);
};

const requiredRoutes: readonly RouteDefinition[] = [
  { id: "home", label: "홈", authenticated: false, path: "/" },
  { id: "login", label: "로그인", authenticated: false, path: "/login" },
  { id: "today", label: "오늘", authenticated: true, path: "/app?mode=second" },
  {
    id: "capture",
    label: "오늘 한 것",
    authenticated: true,
    path: "/app/capture?mode=second",
  },
  {
    id: "answer-review",
    label: "답안 검토",
    authenticated: true,
    path: "/answer-review?mode=second",
  },
  {
    id: "review",
    label: "복습",
    authenticated: true,
    path: "/app/review?mode=second",
  },
  {
    id: "notes",
    label: "학습 노트",
    authenticated: true,
    path: "/app/notes?mode=second",
  },
  {
    id: "ledger",
    label: "학습 원장 상세",
    authenticated: true,
    path: (itemId) =>
      "/app/items/" + encodeURIComponent(itemId) + "?mode=second",
  },
  {
    id: "session",
    label: "오늘 세션",
    authenticated: true,
    path: "/app/session?mode=second",
  },
  {
    id: "agenda",
    label: "학습 기록",
    authenticated: true,
    path: "/app/agenda?mode=second",
  },
  {
    id: "weekly",
    label: "주간 계획",
    authenticated: true,
    path: "/app/weekly?mode=second",
  },
  {
    id: "write",
    label: "새 답안 작성",
    authenticated: true,
    path: "/app/write?mode=second",
  },
  {
    id: "calculator",
    label: "fx-9860GIII 계산 루틴",
    authenticated: true,
    path: "/app/calculator?mode=second&context=practice&focus=casio",
  },
] as const;

const routeContractNodes: Record<string, string[]> = {
  home: ["43:2", "44:9", "45:2", "61:2", "61:80"],
  login: ["43:2", "44:9", "45:2", "61:2", "61:80"],
  today: ["43:2", "44:9", "45:2", "61:2", "61:80"],
  capture: ["43:2", "44:9", "45:2", "48:75", "50:59", "61:2", "61:80"],
  "answer-review": ["43:2", "44:9", "45:2", "48:75", "50:59", "61:2", "61:80"],
  review: ["43:2", "44:9", "45:2", "61:2", "61:80"],
  notes: ["43:2", "44:9", "45:2", "50:59", "61:2", "61:80"],
  ledger: [
    "43:2",
    "44:9",
    "45:2",
    "47:28",
    "48:75",
    "50:59",
    "51:44",
    "52:42",
    "56:2",
    "59:62",
    "61:2",
    "61:80",
  ],
  session: ["43:2", "44:9", "45:2", "50:59", "61:2", "61:80"],
  agenda: ["43:2", "44:9", "45:2", "61:2", "61:80"],
  weekly: ["43:2", "44:9", "45:2", "61:2", "61:80"],
  write: ["43:2", "44:9", "45:2", "50:59", "61:2", "61:80"],
  calculator: [
    "43:2",
    "44:9",
    "45:2",
    "48:75",
    "51:44",
    "53:129",
    "57:34",
    "61:2",
    "61:80",
  ],
};

type RuntimeErrorEvidence = {
  consoleErrors: string[];
  pageErrors: string[];
  sameOriginRequestFailures: string[];
};

type AuditProfile = "mobile-full" | "geometry";

type AuditRow = {
  auditKind: "initial-route" | "dynamic-state";
  auditProfile: AuditProfile;
  state: string;
  route: string;
  requestedPath: string;
  viewport: string;
  viewportWidth: number;
  mainCount: number;
  visibleH1Count: number;
  mainLeft: number;
  mainWidth: number;
  horizontalOverflow: number;
  visiblePrimaryActionCount: number | null;
  undersizedTargetCount: number | null;
  viewportBoundsFailureCount: number;
  axeSeriousOrCritical: number | null;
  keyboardFocusVisible: boolean | null;
  gradientCount: number;
  shadowCount: number;
  fixedDockCount: number;
  canonicalDock: boolean;
  canvasColor: string;
  bodyFontFamily: string;
  pageEdge: number;
  controlHeight: number;
  controlRadius: number;
  readingColumn: number;
  contentMax: number;
};

type StableGateFailure = {
  phase: "privacy" | "a11y" | "visual" | "baseline" | "closure";
  routeStateAlias: string;
  viewport: string;
  stableStep:
    | "configuration"
    | "login"
    | "source-read"
    | "cross-account"
    | "preparation"
    | "audit"
    | "cleanup"
    | "privacy"
    | "screenshot"
    | "snapshot-read"
    | "snapshot-drift"
    | "figma";
  errorFamily:
    | "configuration"
    | "authentication"
    | "http-status"
    | "timeout"
    | "assertion"
    | "unexpected"
    | "unknown-endpoint"
    | "unknown-row"
    | "mutation-blocked"
    | "identity"
    | "canary"
    | "opaque-surface"
    | "snapshot-read-failed"
    | "snapshot-drift";
  count: number;
};

type ScreenshotEvidence = {
  fileName: string;
  buffer: Buffer;
  boundary: ArtifactBoundaryObservation;
  guard: EndpointGuardEvidence;
  identityMaskRequired: boolean;
};

type FigmaComparison = {
  node: "56:2" | "57:34" | "59:62";
  route: string;
  actualFileName: string;
  referenceFileName: string;
  actualWidth: number;
  actualHeight: number;
  referenceWidth: number;
  referenceHeight: number;
  meanColorDelta: number;
  nearPixelRatio: number;
  darkPixelRatioDelta: number;
  warmPixelRatioDelta: number;
  bluePixelRatioDelta: number;
  cellRgbMeanAbsoluteError: number;
  cellOccupancyMeanAbsoluteError: number;
  edgeGridCorrelation: number;
  edgeEnergyRatio: number;
  dilatedEdgeF1: number;
  anchorMaxRgbMeanDelta: number;
  anchorMaxLuminanceStdDelta: number;
  anchorMaxDarkRatioDelta: number;
  anchorMinEdgeDensityRatio: number;
  anchorMaxEdgeDensityRatio: number;
  passed: boolean;
};

const calculatorCasioFixtureEntries = {
  conditions: "합성 조건: 원문 숫자와 단위를 먼저 확인합니다.",
  formula: "합성 산식: V = I ÷ R",
  numbers_units: "합성 대입: 120,000원 ÷ 0.06",
} as const;
const calculatorCasioFixtureInput =
  "120000 ÷ 0.06 EXE · 합성 입력을 실제 기기에서 직접 대조합니다.";
const calculatorCompletionFixtureEntries = {
  display_value: "2,000,000 · 합성 화면값",
  answer_value: "2,000,000원 · 합성 기재값",
  unit_rounding: "원 단위로 합성 반올림을 확인했습니다.",
} as const;

const figmaReferences = [
  {
    node: "56:2" as const,
    route: "/app/items/[itemId]?mode=second",
    actualFileName: "s232h2-after-ledger-390.png",
    referenceFileName: "s232h2-figma-mobile-ledger-56-2.png",
    snapshotName: "figma-mobile-ledger.png",
  },
  {
    node: "59:62" as const,
    route: "/app/items/[itemId]?mode=second",
    actualFileName: "s232h2-after-ledger-1440.png",
    referenceFileName: "s232h2-figma-desktop-ledger-59-62.png",
    snapshotName: "figma-desktop-ledger.png",
  },
  {
    node: "57:34" as const,
    route: "/app/calculator?mode=second&context=practice&focus=casio",
    actualFileName: "s232h2-after-calculator-390.png",
    referenceFileName: "s232h2-figma-mobile-calculator-57-34.png",
    snapshotName: "figma-mobile-calculator.png",
  },
] as const;

const dynamicScreenshotNames = new Set([
  "s232h2-after-capture-extraction-preview-390.png",
  "s232h2-after-answer-review-result-390.png",
  "s232h2-after-answer-review-rewrite-390.png",
  "s232h2-after-review-revealed-selected-390.png",
  "s232h2-after-session-saved-capture-390.png",
  "s232h2-after-calculator-completed-saved-390.png",
]);

test.use({
  extraHTTPHeaders: protectionHeaders,
  screenshot: "off",
  trace: "off",
  video: "off",
});

test.skip(
  !runtimeEnabled,
  "Set S232H2_VISUAL_RUNTIME=1 for the exact-head V3 visual gate.",
);
test.describe.configure({ retries: 0 });

function requireSafeVisualRuntime() {
  if (
    runtimeRunnerSha !== runtimeTargetSha ||
    !/^[0-9a-f]{40}$/i.test(runtimeRunnerSha)
  ) {
    throw new Error("S232H2 exact-head runtime configuration is invalid.");
  }
  if (
    baselineSha !== fixedBaselineSha ||
    !/^[0-9a-f]{40}$/i.test(mergeBaseSha) ||
    !/^[0-9a-f]{40}$/i.test(baselineTreeSha)
  ) {
    throw new Error("S232H2 fixed-baseline runtime configuration is invalid.");
  }
  if (!runtimeBaseUrl || !baselineUrl || !baselineHost) {
    throw new Error("S232H2 Preview configuration is incomplete.");
  }
  const current = new URL(runtimeBaseUrl);
  const baseline = new URL(baselineUrl);
  const approved = (url: URL) =>
    url.protocol === "https:" &&
    /^inverge-[a-z0-9-]+-chachathecats-projects\.vercel\.app$/i.test(
      url.hostname,
    );
  if (
    !approved(current) ||
    !approved(baseline) ||
    baseline.hostname.toLowerCase() !== baselineHost
  ) {
    throw new Error("S232H2 refuses an unapproved runtime host.");
  }
  if (
    !visualProofPath ||
    !isAbsolute(visualProofPath) ||
    !visualProofPath.endsWith("s232h2-visual-proof.json")
  ) {
    throw new Error("S232H2 visual proof path must be runner-temporary.");
  }
}

function cleanVisualAccountRequired(): never {
  throw new Error(
    "S232H2_CLEAN_VISUAL_ACCOUNT_REQUIRED E2E_VISUAL_USER_EMAIL E2E_VISUAL_USER_PASSWORD",
  );
}

function visualProofContractRequired(): never {
  throw new Error("S232H2_VISUAL_PROOF_CONTRACT_REQUIRED");
}

function monitorPageRuntime(
  page: Page,
  expectedOrigin: string,
): RuntimeErrorEvidence {
  const evidence: RuntimeErrorEvidence = {
    consoleErrors: [],
    pageErrors: [],
    sameOriginRequestFailures: [],
  };
  page.on("console", (message) => {
    if (message.type() === "error") {
      evidence.consoleErrors.push("console-error");
    }
  });
  page.on("pageerror", () => {
    evidence.pageErrors.push("page-error");
  });
  page.on("requestfailed", (request) => {
    const url = new URL(request.url());
    const failure = request.failure()?.errorText ?? "unknown";
    if (url.origin !== expectedOrigin) return;
    const headers = request.headers();
    const isExplicitPrefetch =
      headers["next-router-prefetch"] === "1" ||
      headers.purpose === "prefetch" ||
      headers["sec-purpose"]?.includes("prefetch") === true;
    const isSupersededDocumentNavigation =
      failure === "net::ERR_ABORTED" &&
      request.method() === "GET" &&
      request.isNavigationRequest() &&
      request.resourceType() === "document";
    const isCancelledExplicitPrefetch =
      failure === "net::ERR_ABORTED" &&
      request.method() === "GET" &&
      isExplicitPrefetch;
    if (isSupersededDocumentNavigation || isCancelledExplicitPrefetch) return;
    evidence.sameOriginRequestFailures.push("same-origin-request-failure");
  });
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.origin !== expectedOrigin || response.status() < 400) return;
    evidence.sameOriginRequestFailures.push("same-origin-http-error");
  });
  return evidence;
}

function visualAuditRequestHeaders(baseUrl = runtimeBaseUrl) {
  return {
    ...protectionHeaders,
    "x-s232h2-audit-sha":
      baseUrl === baselineUrl ? baselineSha : runtimeRunnerSha,
  };
}

async function settleRuntimeMonitors(...pages: Page[]) {
  for (const page of pages) {
    if (page.isClosed()) continue;
    await page.waitForLoadState("networkidle", { timeout: 10_000 });
    await page.evaluate(async () => {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      await new Promise<void>((resolve) => window.setTimeout(resolve, 100));
    });
  }
}

async function verifyRuntimeVersion(
  page: Page,
  expectedSha: string,
  expectedBaseUrl = runtimeBaseUrl,
) {
  const expectedOrigin = new URL(expectedBaseUrl).origin;
  const response = await page
    .context()
    .request.get(new URL("/api/runtime/version", expectedOrigin).toString(), {
      headers: visualAuditRequestHeaders(expectedBaseUrl),
      maxRedirects: 0,
      timeout: 30_000,
    });
  const responseUrl = new URL(response.url());
  const body = (await response.json().catch(() => null)) as {
    ready?: unknown;
    deploymentSha?: unknown;
  } | null;
  const observed = {
    origin: responseUrl.origin,
    status: response.status(),
    ready: body?.ready,
    deploymentSha: body?.deploymentSha,
  };
  expect(observed).toEqual({
    origin: expectedOrigin,
    status: 200,
    ready: true,
    deploymentSha: expectedSha,
  });
}

type VisualSourceName =
  | "items"
  | "notes"
  | "tags"
  | "recurrence"
  | "reviewQueue"
  | "studyLogs"
  | "weeklySummaries"
  | "learningSignals"
  | "agendaUsage"
  | "todaySeeds"
  | "studyProfiles"
  | "conceptNodes";

type VisualSourceSnapshot = {
  sessionUserId: string;
  sources: Record<VisualSourceName, Array<Record<string, unknown>>>;
  truncated: Record<VisualSourceName, boolean>;
};

type VisualAccountAudit = {
  clean: boolean;
  sessionBound: boolean;
  endpointReadSucceeded: boolean;
  sessionFingerprint: string;
  snapshotReadSucceeded: boolean;
  fingerprint: string;
  itemIds: string[];
  exactFixtureIds: string[];
  ledgerItemId: string | null;
  primaryQueueTitle: string | null;
  itemCount: number;
  studyLogCount: number;
  queueCount: number;
  todayReferenceCount: number;
  weeklyReferenceCount: number;
  nonFixtureRowCount: number;
  unknownReferenceCount: number;
};

type VisualEndpointAudit = {
  readSucceeded: boolean;
  unknownReferenceCount: number;
  primaryQueueTitle: string | null;
};

type CandidateAuditHandle = {
  credential: VisualCredentialCandidate;
  context: BrowserContext | null;
  page: Page | null;
  audit: VisualAccountAudit | null;
  completed: boolean;
  failureStep: "login" | "source-read" | null;
};

type PrivacyGateSummary = {
  scheduledCandidates: number;
  completedAudits: number;
  notRunCount: number;
  blockerCount: number;
  screenshotCallCount: number;
  endpointReadSucceeded: boolean;
  snapshotReadSucceeded: boolean;
  snapshotStable: boolean;
  crossAccountDenied: boolean;
  deniedCanaryDomCount: number;
  selectedAccountItemCount: number;
  selectedExactFixtureCount: number;
  fixtureOwnershipClosed: boolean;
  unknownLearnerEndpointCount: number;
  unknownLearnerRowCount: number;
  rawIdentityArtifactCount: number;
  targetSessionBound: boolean;
  baselineSessionBound: boolean;
  baselineUsesSelectedFixture: boolean;
};

type A11yGateSummary = {
  scheduledCandidates: number;
  completedAudits: number;
  blockerCount: number;
  mobileFullScheduled: number;
  mobileFullCompleted: number;
  geometryScheduled: number;
  geometryCompleted: number;
  keyboardScheduled: number;
  keyboardCompleted: number;
};

type VisualGateSummary = {
  scheduledCandidates: number;
  completedAudits: number;
  preparationBlockerCount: number;
  cleanupBlockerCount: number;
  visualBlockerCount: number;
  privacyBlockerCount: number;
  screenshotCallCount: number;
  snapshotReadSucceeded: boolean;
  snapshotStable: boolean;
};

type VisualProof = {
  schemaVersion: 4;
  selectedSlot: VisualCredentialSlot;
  selectedFingerprint: string;
  selectedSessionFingerprint: string;
  fixtureIds: string[];
  ledgerItemId: string;
  primaryQueueTitle: string;
  deniedCanary: string;
  privacyGate: PrivacyGateSummary;
  a11yGate?: A11yGateSummary;
  auditRows?: AuditRow[];
};

function recordStableGateFailure(
  failures: StableGateFailure[],
  failure: Omit<StableGateFailure, "count"> & { count?: number },
) {
  const count = failure.count ?? 1;
  const existing = failures.find(
    (candidate) =>
      candidate.phase === failure.phase &&
      candidate.routeStateAlias === failure.routeStateAlias &&
      candidate.viewport === failure.viewport &&
      candidate.stableStep === failure.stableStep &&
      candidate.errorFamily === failure.errorFamily,
  );
  if (existing) {
    existing.count += count;
    return;
  }
  failures.push({ ...failure, count });
}

function stableErrorFamily(error: unknown): StableGateFailure["errorFamily"] {
  if (error instanceof Error && /timeout/i.test(error.name)) return "timeout";
  if (error instanceof Error && /assert/i.test(error.name)) return "assertion";
  return "unexpected";
}

function resolveCredential(slot: VisualCredentialSlot) {
  return visualCredentialCandidates.find(
    (candidate) => candidate.slot === slot,
  );
}

async function writeVisualProof(proof: VisualProof) {
  await writeFile(visualProofPath, JSON.stringify(proof), {
    encoding: "utf8",
    mode: 0o600,
  });
  await chmod(visualProofPath, 0o600);
}

async function readVisualProof(): Promise<VisualProof> {
  const parsed = JSON.parse(
    await readFile(visualProofPath, "utf8"),
  ) as VisualProof;
  if (
    parsed.schemaVersion !== 4 ||
    !resolveCredential(parsed.selectedSlot) ||
    !/^[0-9a-f]{64}$/.test(parsed.selectedFingerprint) ||
    !/^[0-9a-f]{64}$/.test(parsed.selectedSessionFingerprint) ||
    !Array.isArray(parsed.fixtureIds) ||
    parsed.fixtureIds.length < 1 ||
    !parsed.ledgerItemId ||
    !parsed.primaryQueueTitle ||
    !parsed.deniedCanary
  ) {
    throw new Error("S232H2 visual proof is invalid.");
  }
  return parsed;
}

function exactFixtureMarkers(
  item: SyntheticItem,
  role: "ledger" | "queue-anchor",
) {
  const rawExtraction = item.rawPayload?.raw_extraction_json;
  const confirmed = item.rawPayload?.user_confirmed_fields;
  return (
    rawExtraction !== null &&
    typeof rawExtraction === "object" &&
    (rawExtraction as Record<string, unknown>).acceptance_fixture_id ===
      syntheticOwnerId &&
    (rawExtraction as Record<string, unknown>).acceptance_fixture_role ===
      role &&
    confirmed !== null &&
    typeof confirmed === "object" &&
    (confirmed as Record<string, unknown>).acceptance_fixture_id ===
      syntheticOwnerId &&
    (confirmed as Record<string, unknown>).acceptance_fixture_role === role
  );
}

function exactFixtureRole(
  item: SyntheticItem,
): "ledger" | "queue-anchor" | null {
  if (isExactVisualLedger(item)) return "ledger";
  if (isExactVisualQueueAnchor(item)) return "queue-anchor";
  return null;
}

function isCanonicalIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const timestamp = Date.parse(value);
  return (
    Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value
  );
}

function captureFixtureTimingClosed(value: unknown, createdAt: unknown) {
  if (
    !isCanonicalIsoTimestamp(createdAt) ||
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }
  const captureSignal = (value as Record<string, unknown>)
    .curriculum_anchored_capture_signal;
  if (
    captureSignal === null ||
    typeof captureSignal !== "object" ||
    Array.isArray(captureSignal)
  ) {
    return false;
  }
  const signal = captureSignal as Record<string, unknown>;
  const queue = signal.reviewQueueCandidate;
  const learning = signal.learningStateUpdateCandidate;
  if (
    queue === null ||
    typeof queue !== "object" ||
    Array.isArray(queue)
  ) {
    return false;
  }
  if (learning === null) {
    return !Object.hasOwn(
      queue as Record<string, unknown>,
      "dueAtCandidate",
    );
  }
  if (typeof learning !== "object" || Array.isArray(learning)) return false;
  const dueAt = (queue as Record<string, unknown>).dueAtCandidate;
  const nextReviewAt = (learning as Record<string, unknown>)
    .nextReviewAtCandidate;
  if (
    !isCanonicalIsoTimestamp(dueAt) ||
    !isCanonicalIsoTimestamp(nextReviewAt)
  ) {
    return false;
  }
  const created = Date.parse(createdAt);
  const dueDelta = Date.parse(dueAt) - created;
  const reviewDelta = Date.parse(nextReviewAt) - created;
  const tolerance = 5 * 60_000;
  return (
    Math.abs(dueDelta - 2 * 86_400_000) <= tolerance &&
    Math.abs(reviewDelta - 3 * 86_400_000) <= tolerance &&
    Math.abs(reviewDelta - dueDelta - 86_400_000) <= tolerance
  );
}

function canonicalCaptureFixtureProjection(value: unknown) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const clone = JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  const captureSignal = clone.curriculum_anchored_capture_signal;
  if (
    captureSignal === null ||
    typeof captureSignal !== "object" ||
    Array.isArray(captureSignal)
  ) {
    return null;
  }
  const signal = captureSignal as Record<string, unknown>;
  const queue = signal.reviewQueueCandidate;
  const learning = signal.learningStateUpdateCandidate;
  if (
    queue === null ||
    typeof queue !== "object" ||
    Array.isArray(queue)
  ) {
    return null;
  }
  if (learning === null) {
    return Object.hasOwn(
      queue as Record<string, unknown>,
      "dueAtCandidate",
    )
      ? null
      : canonicalJson(clone);
  }
  if (
    typeof learning !== "object" ||
    Array.isArray(learning) ||
    !isCanonicalIsoTimestamp(
      (queue as Record<string, unknown>).dueAtCandidate,
    ) ||
    !isCanonicalIsoTimestamp(
      (learning as Record<string, unknown>).nextReviewAtCandidate,
    )
  ) {
    return null;
  }
  (queue as Record<string, unknown>).dueAtCandidate = "fixture-plus-two-days";
  (learning as Record<string, unknown>).nextReviewAtCandidate =
    "fixture-plus-three-days";
  return canonicalJson(clone);
}

function exactFixtureLearningSignal(item: SyntheticItem) {
  const role = exactFixtureRole(item);
  return role ? buildExactFixtureLearningSignal(item, role) : null;
}

function exactGeneratedRow(
  row: Record<string, unknown>,
  expected: Record<string, unknown>,
) {
  return Object.entries(expected).every(([key, value]) => row[key] === value);
}

function exactFixturePayloadClosed(
  item: SyntheticItem,
  role: "ledger" | "queue-anchor",
) {
  const raw = item.rawPayload;
  const derived = item.derivedPayload;
  const answer =
    role === "ledger" ? syntheticLedgerAnswer : syntheticFixtureAnswer;
  const gap = role === "ledger" ? syntheticLedgerGap : syntheticFixtureGap;
  const keyConcepts =
    role === "ledger"
      ? ["사업인정", "처분성", "수용권"]
      : ["신뢰보호", "공적 견해표명", "보호가치"];
  const weakStructurePoint =
    role === "ledger"
      ? "법률효과와 권리구제 필요성을 같은 순서로 연결해야 합니다."
      : "요건과 사실 적용을 같은 순서로 연결해야 합니다.";
  const weakApplicationSentence =
    role === "ledger"
      ? "사업인정으로 발생하는 구체적 법률효과를 적어야 합니다."
      : "공적 견해표명에 해당하는 합성 사실을 구체적으로 연결해야 합니다.";
  const rewriteInstruction =
    role === "ledger"
      ? "처분의 법률효과와 권리구제 필요성을 한 문단에 연결합니다."
      : "요건, 대응 사실, 소결론을 한 문단에 연결합니다.";
  const referenceStructure =
    role === "ledger"
      ? syntheticLedgerCorrectAnswer
      : "I. 공적 견해표명 II. 신뢰와 귀책 III. 보호가치 IV. 결론";
  const aiDraft = raw?.aiDraft;
  const productionMetadata = exactFixtureProductionMetadata(item, role);
  const expectedAiDraft = {
    keyConcepts,
    coreFormula: null,
    comparisonPoint: null,
    missingIssue: gap,
    weakStructurePoint,
    weakApplicationSentence,
    rewriteInstruction,
    calculationRisk: null,
    unitRisk: null,
    rewriteTaskType: "second_answer_rewrite",
    supportedCalculatorTemplateId: null,
    referenceStructure,
    myAnswerSummary: answer,
    caseSummary: null,
  };
  const expectedRawKeys = [
    "aiDraft",
    "artifactType",
    "biggest_gap",
    "captureMethod",
    "capture_intent",
    "concept_card",
    "created_from_capture",
    "due_at",
    "issue_recall",
    "learner_answer_submission",
    "mode",
    "nextReviewDate",
    "normalized_draft",
    "noteKind",
    "outline_draft",
    "produced_answer_before_reference",
    "production_before_comparison",
    "raw_extraction_json",
    "raw_ocr_text",
    "reference_answer_added_after_production",
    "review_stage",
    "rewrite_completed",
    "rewrite_instruction",
    "rewrite_paragraph",
    "rewrite_source_gap",
    "rewrite_source_item_id",
    "subjectLabel",
    "taxonomyClassification",
    "user_confirmed_fields",
  ];
  const expectedDerivedKeys = [
    "calculationRisk",
    "capture_note_engine_v1",
    "capture_note_engine_v2",
    "cloze_candidate",
    "conceptFamily",
    "conceptNextTaskType",
    "conceptNodeId",
    "concept_card",
    "concept_node_candidate",
    "created_from_capture",
    "learner_answer_submission",
    "missingIssueCandidate",
    "mistakeType",
    "recurrenceCount",
    "retrievalPrompt",
    "review_stage",
    "rewriteTaskType",
    "supportedCalculatorTemplateId",
    "taxonomyClassification",
    "topicTag",
    "unitRisk",
    "weakStructurePoint",
  ];
  const expectedConfirmed = {
    subjectLabel: "감정평가 및 보상법규",
    userAnswer: answer,
    production_before_comparison: true,
    reference_answer_added_after_production: true,
    biggest_gap: gap,
    sourceType: "text",
    examMode: "second",
    hasManualCorrection: false,
    ocrConfirmedByLearner: false,
    acceptance_fixture_id: syntheticOwnerId,
    acceptance_fixture_role: role,
  };
  const expectedIssueRecall =
    role === "ledger"
      ? "사업인정의 처분성을 법률효과 중심으로 검토합니다."
      : "신뢰보호 요건을 순서대로 검토합니다.";
  const expectedOutline =
    role === "ledger"
      ? "I. 사업인정의 성격 II. 수용권 설정 III. 권리구제 IV. 결론"
      : referenceStructure;
  return (
    raw !== undefined &&
    derived !== undefined &&
    hasExactObjectKeys(raw, expectedRawKeys) &&
    hasExactObjectKeys(derived, expectedDerivedKeys) &&
    raw.captureMethod === "text" &&
    raw.raw_ocr_text === answer &&
    JSON.stringify(canonicalJson(raw.raw_extraction_json)) ===
      JSON.stringify(
        canonicalJson({
          acceptance_fixture_id: syntheticOwnerId,
          acceptance_fixture_role: role,
        }),
      ) &&
    JSON.stringify(canonicalJson(raw.user_confirmed_fields)) ===
      JSON.stringify(canonicalJson(expectedConfirmed)) &&
    raw.normalized_draft === null &&
    raw.mode === "second" &&
    raw.artifactType === "second_correction" &&
    raw.noteKind === "교정노트" &&
    raw.subjectLabel === "감정평가 및 보상법규" &&
    canonicalJson(aiDraft) !== null &&
    JSON.stringify(canonicalJson(aiDraft)) ===
      JSON.stringify(canonicalJson(expectedAiDraft)) &&
    raw.rewrite_source_item_id === null &&
    raw.rewrite_source_gap === null &&
    raw.rewrite_instruction === rewriteInstruction &&
    raw.rewrite_paragraph === null &&
    raw.rewrite_completed === false &&
    raw.concept_card === null &&
    raw.review_stage === null &&
    raw.due_at === null &&
    raw.issue_recall === expectedIssueRecall &&
    raw.outline_draft === expectedOutline &&
    raw.biggest_gap === gap &&
    raw.created_from_capture === true &&
    raw.capture_intent === "save" &&
    typeof raw.nextReviewDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(raw.nextReviewDate) &&
    JSON.stringify(canonicalJson(raw.taxonomyClassification)) ===
      JSON.stringify(
        canonicalJson(productionMetadata.taxonomyClassification),
      ) &&
    JSON.stringify(canonicalJson(raw.learner_answer_submission)) ===
      JSON.stringify(canonicalJson(productionMetadata.answerSubmission)) &&
    raw.production_before_comparison === true &&
    raw.produced_answer_before_reference === true &&
    raw.reference_answer_added_after_production === true &&
    derived.topicTag === item.problemTitle &&
    derived.mistakeType === exactFixtureMistakeType(item) &&
    derived.created_from_capture === true &&
    JSON.stringify(canonicalJson(derived.taxonomyClassification)) ===
      JSON.stringify(
        canonicalJson(productionMetadata.taxonomyClassification),
      ) &&
    captureFixtureTimingClosed(
      derived.capture_note_engine_v1,
      item.createdAt,
    ) &&
    captureFixtureTimingClosed(
      derived.capture_note_engine_v2,
      item.createdAt,
    ) &&
    JSON.stringify(
      canonicalCaptureFixtureProjection(derived.capture_note_engine_v1),
    ) ===
      JSON.stringify(
        canonicalCaptureFixtureProjection(productionMetadata.captureNoteV1),
      ) &&
    JSON.stringify(
      canonicalCaptureFixtureProjection(derived.capture_note_engine_v2),
    ) ===
      JSON.stringify(
        canonicalCaptureFixtureProjection(productionMetadata.captureNoteV2),
      ) &&
    JSON.stringify(canonicalJson(derived.learner_answer_submission)) ===
      JSON.stringify(
        canonicalJson(productionMetadata.answerSubmissionDerived),
      ) &&
    typeof derived.recurrenceCount === "number" &&
    derived.recurrenceCount === 1 &&
    derived.concept_card === null &&
    derived.review_stage === null &&
    derived.cloze_candidate === keyConcepts[0] &&
    derived.rewriteTaskType === "second_answer_rewrite" &&
    derived.missingIssueCandidate === gap &&
    derived.weakStructurePoint === weakStructurePoint &&
    derived.calculationRisk === null &&
    derived.unitRisk === null &&
    derived.supportedCalculatorTemplateId === null
  );
}

function isExactVisualLedger(item: SyntheticItem) {
  return (
    item.examName === "감정평가사 2차" &&
    item.subjectLabel === "감정평가 및 보상법규" &&
    item.sourceType === "text" &&
    item.sourceLabel === syntheticFixtureSource &&
    item.problemTitle === syntheticFixtureTitle &&
    item.problemIdentifier === syntheticFixtureProblemIdentifier &&
    item.rawQuestionText === syntheticFixtureQuestion &&
    item.rawAnswerText === syntheticLedgerAnswer &&
    item.correctAnswer === syntheticLedgerCorrectAnswer &&
    item.userAnswer === syntheticLedgerAnswer &&
    item.userReasonText === syntheticLedgerGap &&
    item.userReasonPreset === undefined &&
    item.user_reason_preset === null &&
    item.confidence === "중간" &&
    item.timeSpentSeconds === null &&
    exactFixtureMarkers(item, "ledger") &&
    exactFixturePayloadClosed(item, "ledger")
  );
}

function isExactVisualQueueAnchor(item: SyntheticItem) {
  const identifier = item.problemIdentifier?.match(
    /^s232h2:v3-visual:queue:(\d{3})$/,
  );
  if (!identifier) return false;
  const serial = identifier[1];
  return (
    item.examName === "감정평가사 2차" &&
    item.subjectLabel === "감정평가 및 보상법규" &&
    item.sourceType === "text" &&
    item.sourceLabel === syntheticQueueAnchorSource &&
    item.problemTitle === "S232H2 합성 복습 앵커 " + serial &&
    item.rawQuestionText ===
      "S232H2 합성 복습 앵커 " +
        serial +
        ": 신뢰보호 요건을 다시 연결합니다." &&
    item.rawAnswerText === syntheticFixtureAnswer &&
    item.correctAnswer === syntheticFixtureCorrectAnswer &&
    item.userAnswer === syntheticFixtureAnswer &&
    item.userReasonText === syntheticFixtureGap &&
    item.userReasonPreset === undefined &&
    item.user_reason_preset === null &&
    item.confidence === "낮음" &&
    item.timeSpentSeconds === 180 &&
    exactFixtureMarkers(item, "queue-anchor") &&
    exactFixturePayloadClosed(item, "queue-anchor")
  );
}

function classifyExactFixtureGraph(
  items: SyntheticItem[],
  sessionUserId: string,
) {
  const byId = new Map(
    items
      .map((item) => [resolveSyntheticItemId(item), item] as const)
      .filter(([itemId]) => itemId.length > 0),
  );
  const owned = new Set<string>();
  for (const [itemId, item] of byId) {
    if (
      item.userId === sessionUserId &&
      (isExactVisualLedger(item) || isExactVisualQueueAnchor(item))
    ) {
      owned.add(itemId);
    }
  }
  return { byId, owned };
}

function canonicalJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonicalJson(entry)]),
  );
}

const visualSourceNames: readonly VisualSourceName[] = [
  "items",
  "notes",
  "tags",
  "recurrence",
  "reviewQueue",
  "studyLogs",
  "weeklySummaries",
  "learningSignals",
  "agendaUsage",
  "todaySeeds",
  "studyProfiles",
  "conceptNodes",
];

function canonicalSourceRows(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => JSON.stringify(canonicalJson(row))).sort();
}

function sameStringSequenceMembers(
  left: readonly string[],
  right: readonly string[],
) {
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return (
    sortedLeft.length === sortedRight.length &&
    sortedLeft.every((value, index) => value === sortedRight[index])
  );
}

function sourceFingerprint(snapshot: VisualSourceSnapshot) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        sessionUserId: snapshot.sessionUserId,
        items: canonicalSourceRows(snapshot.sources.items),
        notes: canonicalSourceRows(snapshot.sources.notes),
        tags: canonicalSourceRows(snapshot.sources.tags),
        recurrence: canonicalSourceRows(snapshot.sources.recurrence),
        reviewQueue: canonicalSourceRows(snapshot.sources.reviewQueue),
        studyLogs: canonicalSourceRows(snapshot.sources.studyLogs),
        weeklySummaries: canonicalSourceRows(snapshot.sources.weeklySummaries),
        learningSignals: canonicalSourceRows(snapshot.sources.learningSignals),
        agendaUsage: canonicalSourceRows(snapshot.sources.agendaUsage),
        todaySeeds: canonicalSourceRows(snapshot.sources.todaySeeds),
        studyProfiles: canonicalSourceRows(snapshot.sources.studyProfiles),
        conceptNodes: canonicalSourceRows(snapshot.sources.conceptNodes),
      }),
    )
    .digest("hex");
}

async function readVisualSourceSnapshot(
  page: Page,
  credential: VisualCredentialCandidate,
): Promise<VisualSourceSnapshot> {
  const [sessionResponse, auditResponse] = await Promise.all([
    page
      .context()
      .request.get(new URL("/api/auth/session", runtimeBaseUrl).toString(), {
        headers: visualAuditRequestHeaders(),
      }),
    page
      .context()
      .request.get(
        new URL("/api/os/visual-source-audit", runtimeBaseUrl).toString(),
        { headers: visualAuditRequestHeaders() },
      ),
  ]);
  const sessionBody = (await sessionResponse.json().catch(() => null)) as {
    ok?: unknown;
    session?: {
      userId?: unknown;
      email?: unknown;
      isAuthenticated?: unknown;
      isDemo?: unknown;
    };
  } | null;
  const auditBody = (await auditResponse.json().catch(() => null)) as {
    ok?: unknown;
    sessionUserId?: unknown;
    sources?: Partial<Record<VisualSourceName, Array<Record<string, unknown>>>>;
    truncated?: Partial<Record<VisualSourceName, unknown>>;
  } | null;
  const sessionUserId = sessionBody?.session?.userId;
  if (
    sessionResponse.status() !== 200 ||
    auditResponse.status() !== 200 ||
    sessionBody?.ok !== true ||
    sessionBody.session?.isAuthenticated !== true ||
    sessionBody.session?.isDemo !== false ||
    typeof sessionUserId !== "string" ||
    typeof sessionBody.session.email !== "string" ||
    sessionBody.session.email.toLowerCase() !==
      credential.email.toLowerCase() ||
    auditBody?.ok !== true ||
    auditBody.sessionUserId !== sessionUserId ||
    !auditBody.sources ||
    !auditBody.truncated
  ) {
    throw new Error("S232H2 source audit read failed.");
  }
  for (const name of visualSourceNames) {
    if (
      !Array.isArray(auditBody.sources[name]) ||
      typeof auditBody.truncated[name] !== "boolean"
    ) {
      throw new Error("S232H2 source audit shape failed.");
    }
  }
  return {
    sessionUserId,
    sources: auditBody.sources as VisualSourceSnapshot["sources"],
    truncated: auditBody.truncated as VisualSourceSnapshot["truncated"],
  };
}

function hasExactObjectKeys(
  value: unknown,
  expectedKeys: readonly string[],
): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value as Record<string, unknown>)
      .sort()
      .join(",") === [...expectedKeys].sort().join(",")
  );
}

async function readVisualEndpointAudit(
  page: Page,
  ownedItemIds: ReadonlySet<string>,
  rawSnapshot: VisualSourceSnapshot,
): Promise<VisualEndpointAudit> {
  const paths = [
    "/api/os/items?limit=501",
    "/api/os/study-logs?mode=second&limit=501",
    "/api/os/review-queue",
    "/api/os/today-focus?mode=second",
    "/api/os/weekly-summary?mode=second",
  ] as const;
  const responses = await Promise.all(
    paths.map((path) =>
      page.context().request.get(new URL(path, runtimeBaseUrl).toString(), {
        headers: visualAuditRequestHeaders(),
        maxRedirects: 0,
        timeout: 30_000,
      }),
    ),
  );
  const bodies = await Promise.all(
    responses.map((response) => response.json().catch(() => null)),
  );
  if (
    responses.some(
      (response) =>
        response.status() !== 200 ||
        new URL(response.url()).origin !== new URL(runtimeBaseUrl).origin,
    ) ||
    !hasExactObjectKeys(bodies[0], ["ok", "items"]) ||
    !hasExactObjectKeys(bodies[1], ["ok", "logs"]) ||
    !hasExactObjectKeys(bodies[2], ["ok", "items"]) ||
    !hasExactObjectKeys(bodies[3], ["ok", "focus"]) ||
    !hasExactObjectKeys(bodies[4], ["ok", "summary", "plan"]) ||
    bodies.some((body) => (body as Record<string, unknown>).ok !== true)
  ) {
    return {
      readSucceeded: false,
      unknownReferenceCount: 1,
      primaryQueueTitle: null,
    };
  }

  const endpointItems = bodies[0].items;
  const endpointLogs = bodies[1].logs;
  const endpointQueue = bodies[2].items;
  const focus = bodies[3].focus;
  const weeklySummary = bodies[4].summary;
  const weeklyPlan = bodies[4].plan;
  if (
    !Array.isArray(endpointItems) ||
    !Array.isArray(endpointLogs) ||
    !Array.isArray(endpointQueue) ||
    !hasExactObjectKeys(focus, [
      "lines",
      "nextAction",
      "nextActionType",
      "primaryTaskLabel",
      "reason",
      "estimatedDurationMinutes",
      "priorityScore",
      "sourceQueueId",
      "sourceItemId",
      "queue",
    ]) ||
    !Array.isArray(focus.queue) ||
    !hasExactObjectKeys(weeklyPlan, [
      "mode",
      "summary",
      "primaryActionLabel",
      "tasks",
      "recovery",
      "secondaryRecords",
    ]) ||
    !Array.isArray(weeklyPlan.tasks)
  ) {
    return {
      readSucceeded: false,
      unknownReferenceCount: 1,
      primaryQueueTitle: null,
    };
  }

  const rawItemIds = rawSnapshot.sources.items
    .map((row) => row.id)
    .filter((value): value is string => typeof value === "string");
  const endpointItemIds = endpointItems
    .map((row) =>
      row && typeof row === "object"
        ? (row as Record<string, unknown>).id
        : null,
    )
    .filter((value): value is string => typeof value === "string");
  const pendingQueueIds = new Set(
    rawSnapshot.sources.reviewQueue
      .filter((row) => row.status === "pending")
      .map((row) => row.id)
      .filter((value): value is string => typeof value === "string"),
  );
  const queueCards = endpointQueue.filter(
    (row): row is Record<string, unknown> =>
      row !== null && typeof row === "object" && !Array.isArray(row),
  );
  const focusQueue = focus.queue.filter(
    (row): row is Record<string, unknown> =>
      row !== null && typeof row === "object" && !Array.isArray(row),
  );
  const planTasks = weeklyPlan.tasks.filter(
    (row): row is Record<string, unknown> =>
      row !== null && typeof row === "object" && !Array.isArray(row),
  );
  const recovery = weeklyPlan.recovery;
  const recoveryTask =
    recovery !== null &&
    typeof recovery === "object" &&
    !Array.isArray(recovery) &&
    (recovery as Record<string, unknown>).task !== null &&
    typeof (recovery as Record<string, unknown>).task === "object" &&
    !Array.isArray((recovery as Record<string, unknown>).task)
      ? ((recovery as Record<string, unknown>).task as Record<string, unknown>)
      : null;
  const knownQueueCard = (row: Record<string, unknown>) =>
    typeof row.queueId === "string" &&
    pendingQueueIds.has(row.queueId) &&
    typeof row.itemId === "string" &&
    ownedItemIds.has(row.itemId);
  const unknownReferenceCount =
    (endpointItems.length === endpointItemIds.length ? 0 : 1) +
    (sameStringSequenceMembers(rawItemIds, endpointItemIds) ? 0 : 1) +
    endpointItemIds.filter((itemId) => !ownedItemIds.has(itemId)).length +
    endpointLogs.length +
    (queueCards.length === endpointQueue.length ? 0 : 1) +
    queueCards.filter((row) => !knownQueueCard(row)).length +
    (focusQueue.length === focus.queue.length ? 0 : 1) +
    focusQueue.filter((row) => !knownQueueCard(row)).length +
    (focus.sourceQueueId === null ||
    (typeof focus.sourceQueueId === "string" &&
      pendingQueueIds.has(focus.sourceQueueId))
      ? 0
      : 1) +
    (focus.sourceItemId === null ||
    (typeof focus.sourceItemId === "string" &&
      ownedItemIds.has(focus.sourceItemId))
      ? 0
      : 1) +
    (planTasks.length === weeklyPlan.tasks.length ? 0 : 1) +
    planTasks.filter(
      (row) =>
        typeof row.queueId !== "string" ||
        !pendingQueueIds.has(row.queueId) ||
        typeof row.itemId !== "string" ||
        !ownedItemIds.has(row.itemId),
    ).length +
    (recovery === null || (recoveryTask && knownQueueCard(recoveryTask))
      ? 0
      : 1) +
    (weeklySummary === null ? 0 : 1);
  const primaryQueueTitle =
    typeof queueCards[0]?.problemTitle === "string"
      ? queueCards[0].problemTitle
      : null;
  return {
    readSucceeded: unknownReferenceCount === 0,
    unknownReferenceCount,
    primaryQueueTitle,
  };
}

async function verifySessionBinding(
  page: Page,
  credential: VisualCredentialCandidate,
  baseUrl: string,
  expectedFingerprint: string,
) {
  const response = await page
    .context()
    .request.get(new URL("/api/auth/session", baseUrl).toString(), {
      headers: visualAuditRequestHeaders(baseUrl),
    });
  const body = (await response.json().catch(() => null)) as {
    ok?: unknown;
    session?: {
      userId?: unknown;
      email?: unknown;
      isAuthenticated?: unknown;
      isDemo?: unknown;
    };
  } | null;
  const userId = body?.session?.userId;
  return (
    response.status() === 200 &&
    body?.ok === true &&
    body.session?.isAuthenticated === true &&
    body.session.isDemo === false &&
    typeof userId === "string" &&
    typeof body.session.email === "string" &&
    body.session.email.toLowerCase() === credential.email.toLowerCase() &&
    createHash("sha256")
      .update("s232h2-session:" + userId)
      .digest("hex") === expectedFingerprint
  );
}

function normalizeAuditItem(row: Record<string, unknown>): SyntheticItem {
  return {
    ...row,
    id: typeof row.id === "string" ? row.id : undefined,
    userId: typeof row.user_id === "string" ? row.user_id : undefined,
    examName: typeof row.exam_name === "string" ? row.exam_name : undefined,
    subjectLabel:
      typeof row.subject_label === "string" ? row.subject_label : undefined,
    sourceType:
      typeof row.source_type === "string" ? row.source_type : undefined,
    sourceLabel:
      typeof row.source_label === "string" ? row.source_label : undefined,
    problemTitle:
      typeof row.problem_title === "string" ? row.problem_title : undefined,
    problemIdentifier:
      typeof row.problem_identifier === "string"
        ? row.problem_identifier
        : undefined,
    rawQuestionText:
      typeof row.raw_question_text === "string"
        ? row.raw_question_text
        : undefined,
    rawAnswerText:
      typeof row.raw_answer_text === "string" ? row.raw_answer_text : undefined,
    correctAnswer:
      typeof row.correct_answer === "string" ? row.correct_answer : undefined,
    userAnswer:
      typeof row.user_answer === "string" ? row.user_answer : undefined,
    userReasonText:
      typeof row.user_reason_text === "string"
        ? row.user_reason_text
        : undefined,
    userReasonPreset:
      typeof row.user_reason_preset === "string"
        ? row.user_reason_preset
        : undefined,
    confidence: typeof row.confidence === "string" ? row.confidence : undefined,
    timeSpentSeconds:
      typeof row.time_spent_seconds === "number"
        ? row.time_spent_seconds
        : row.time_spent_seconds === null
          ? null
          : undefined,
    createdAt:
      typeof row.created_at === "string" &&
      Number.isFinite(Date.parse(row.created_at))
        ? new Date(Date.parse(row.created_at)).toISOString()
        : undefined,
    rawPayload:
      row.raw_payload && typeof row.raw_payload === "object"
        ? (row.raw_payload as Record<string, unknown>)
        : undefined,
    derivedPayload:
      row.derived_payload && typeof row.derived_payload === "object"
        ? (row.derived_payload as Record<string, unknown>)
        : undefined,
  };
}

async function auditVisualAccountCandidate(
  page: Page,
  credential: VisualCredentialCandidate,
): Promise<VisualAccountAudit> {
  const observed = await readVisualSourceSnapshot(page, credential);
  const readsClosed = visualSourceNames.every(
    (name) => observed.truncated[name] === false,
  );
  const sessionUserId = observed.sessionUserId;
  const sessionBound =
    readsClosed && /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(sessionUserId);
  const sessionFingerprint = createHash("sha256")
    .update("s232h2-session:" + sessionUserId)
    .digest("hex");
  const listedItems = observed.sources.items.map(normalizeAuditItem);
  const logs = observed.sources.studyLogs;
  const queueRows = observed.sources.reviewQueue;
  const { byId, owned } = classifyExactFixtureGraph(listedItems, sessionUserId);
  const invalidOwnedItemDerivedRows = listedItems.filter((item) => {
    const itemId = resolveSyntheticItemId(item);
    if (!owned.has(itemId)) return false;
    const expectedSignal = exactFixtureLearningSignal(item);
    const expectedMetadata = expectedSignal?.metadataJson as
      Record<string, unknown> | undefined;
    return (
      !expectedSignal ||
      JSON.stringify(
        canonicalJson(item.derivedPayload?.concept_node_candidate),
      ) !==
        JSON.stringify(
          canonicalJson(expectedMetadata?.concept_node_candidate),
        ) ||
      item.derivedPayload?.conceptNodeId !== expectedMetadata?.conceptNodeId ||
      item.derivedPayload?.conceptFamily !== expectedMetadata?.conceptFamily ||
      item.derivedPayload?.retrievalPrompt !==
        expectedMetadata?.retrievalPrompt ||
      item.derivedPayload?.conceptNextTaskType !==
        expectedMetadata?.conceptNextTaskType
    );
  }).length;
  const listedIds = listedItems
    .map(resolveSyntheticItemId)
    .filter((itemId) => itemId.length > 0);
  let nonFixtureRowCount = listedIds.filter(
    (itemId) => !owned.has(itemId),
  ).length;
  const ownedUserRow = (row: Record<string, unknown>) =>
    row.user_id === sessionUserId;
  const invalidNoteRows = observed.sources.notes.filter((row) => {
    const itemId = row.wrong_answer_item_id;
    const item = typeof itemId === "string" ? byId.get(itemId) : null;
    return (
      !item ||
      !owned.has(itemId as string) ||
      !exactGeneratedRow(row, exactFixtureGeneratedArtifacts(item).note)
    );
  }).length;
  const invalidTagRows = observed.sources.tags.filter((row) => {
    const itemId = row.wrong_answer_item_id;
    const item = typeof itemId === "string" ? byId.get(itemId) : null;
    return (
      !item ||
      !owned.has(itemId as string) ||
      !exactGeneratedRow(row, exactFixtureGeneratedArtifacts(item).tag)
    );
  }).length;
  const invalidAttachedRows = invalidNoteRows + invalidTagRows;
  const invalidQueueRows = queueRows.filter((row) => {
    const itemId = row.source_submission_id;
    const item = typeof itemId === "string" ? byId.get(itemId) : null;
    const artifacts = item ? exactFixtureGeneratedArtifacts(item) : null;
    const role = item ? exactFixtureRole(item) : null;
    const rawPayload =
      row.raw_payload && typeof row.raw_payload === "object"
        ? (row.raw_payload as Record<string, unknown>)
        : null;
    const derivedPayload =
      row.derived_payload && typeof row.derived_payload === "object"
        ? (row.derived_payload as Record<string, unknown>)
        : null;
    return (
      !ownedUserRow(row) ||
      row.exam_id !== "wrong_answer_os" ||
      row.subject_id !== "감정평가 및 보상법규" ||
      row.stage !== "alpha" ||
      row.source_kind !== "wrong_answer" ||
      row.status !== "pending" ||
      !item ||
      !owned.has(itemId as string) ||
      !artifacts ||
      !role ||
      row.priority_score !== (role === "ledger" ? 75 : 95) ||
      !rawPayload ||
      !hasExactObjectKeys(rawPayload, ["dueAt", "reviewReason"]) ||
      typeof rawPayload.dueAt !== "string" ||
      !isCanonicalIsoTimestamp(rawPayload.dueAt) ||
      rawPayload.reviewReason !==
        "누락 논점 후보가 있어 짧게 다시 써야 합니다." ||
      !derivedPayload ||
      !hasExactObjectKeys(derivedPayload, [
        "topicTag",
        "mistakeType",
        "recurrenceCount",
        "concept_node_candidate",
        "conceptNodeId",
        "conceptFamily",
        "retrievalPrompt",
        "conceptNextTaskType",
        "schedulingPolicy",
        "retryDueAt",
        "followUpReviewAt",
        "nextReviewDate",
      ]) ||
      derivedPayload.topicTag !== artifacts.tag.topic_tag ||
      derivedPayload.mistakeType !== artifacts.tag.mistake_type ||
      derivedPayload.recurrenceCount !== 1 ||
      JSON.stringify(canonicalJson(derivedPayload.concept_node_candidate)) !==
        JSON.stringify(
          canonicalJson(item.derivedPayload?.concept_node_candidate),
        ) ||
      derivedPayload.conceptNodeId !== item.derivedPayload?.conceptNodeId ||
      derivedPayload.conceptFamily !== item.derivedPayload?.conceptFamily ||
      derivedPayload.retrievalPrompt !== item.derivedPayload?.retrievalPrompt ||
      derivedPayload.conceptNextTaskType !==
        item.derivedPayload?.conceptNextTaskType ||
      typeof derivedPayload.conceptNodeId !== "string" ||
      typeof derivedPayload.conceptFamily !== "string" ||
      typeof derivedPayload.retrievalPrompt !== "string" ||
      typeof derivedPayload.conceptNextTaskType !== "string" ||
      derivedPayload.schedulingPolicy !== "second_stage_weak_paragraph_48h" ||
      derivedPayload.retryDueAt !== null ||
      derivedPayload.followUpReviewAt !== null ||
      derivedPayload.nextReviewDate !== item.rawPayload?.nextReviewDate ||
      rawPayload.dueAt.slice(0, 10) !== derivedPayload.nextReviewDate
    );
  }).length;
  const tagSignatures = new Set(
    observed.sources.tags.flatMap((tag) => {
      const itemId = tag.wrong_answer_item_id;
      const item = typeof itemId === "string" ? byId.get(itemId) : null;
      if (!item || !owned.has(itemId as string)) return [];
      return [
        JSON.stringify([
          item.examName,
          item.subjectLabel,
          tag.topic_tag,
          tag.mistake_type,
        ]),
      ];
    }),
  );
  const invalidRecurrenceRows = observed.sources.recurrence.filter(
    (row) =>
      !ownedUserRow(row) ||
      row.exam_name !== "감정평가사 2차" ||
      row.subject_label !== "감정평가 및 보상법규" ||
      row.recurrence_count !== 1 ||
      row.risk_level !== "stable" ||
      !tagSignatures.has(
        JSON.stringify([
          row.exam_name,
          row.subject_label,
          row.topic_tag,
          row.mistake_type,
        ]),
      ),
  ).length;
  const invalidWeeklyRows = observed.sources.weeklySummaries.length;
  const invalidLearningSignalRows = observed.sources.learningSignals.filter(
    (row) => {
      const sourceItemId =
        row.metadata_json && typeof row.metadata_json === "object"
          ? (row.metadata_json as Record<string, unknown>).sourceItemId
          : null;
      const item =
        typeof sourceItemId === "string" ? byId.get(sourceItemId) : null;
      const expected = item ? exactFixtureLearningSignal(item) : null;
      return (
        !ownedUserRow(row) ||
        !item ||
        !owned.has(sourceItemId as string) ||
        !expected ||
        row.exam_mode !== expected.examMode ||
        row.subject !== expected.subject ||
        row.source_type !== expected.sourceType ||
        JSON.stringify(canonicalJson(row.derived_tags)) !==
          JSON.stringify(canonicalJson(expected.derivedTags)) ||
        JSON.stringify(canonicalJson(row.related_formulas)) !==
          JSON.stringify(canonicalJson(expected.relatedFormulas)) ||
        row.next_task_type !== expected.nextTaskType ||
        row.next_task !== expected.nextTask ||
        JSON.stringify(canonicalJson(row.metadata_json)) !==
          JSON.stringify(canonicalJson(expected.metadataJson))
      );
    },
  ).length;
  const allowedUsageEvents = new Set([
    "capture_saved",
    "post_save_execution_started",
    "post_save_execution_completed",
    "review_followup_scheduled",
  ]);
  const invalidUsageRows = observed.sources.agendaUsage.filter((row) => {
    const itemId = row.entity_id;
    const item = typeof itemId === "string" ? byId.get(itemId) : null;
    if (
      !ownedUserRow(row) ||
      !item ||
      !owned.has(itemId as string) ||
      typeof row.event_name !== "string" ||
      !allowedUsageEvents.has(row.event_name)
    ) {
      return true;
    }
    const metadata = row.metadata_json;
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      return true;
    }
    const tag = exactFixtureGeneratedArtifacts(item).tag;
    const role = exactFixtureRole(item);
    const expectedMetadata =
      row.event_name === "capture_saved"
        ? {
            mode: "second",
            subject: "감정평가 및 보상법규",
            sourceType: "text",
            confidence: role === "ledger" ? "중간" : "낮음",
            nextTaskType: "rewrite",
            topicCandidate: tag.topic_tag,
            mistakeType: tag.mistake_type,
            weakStructurePoint:
              role === "ledger"
                ? "법률효과와 권리구제 필요성을 같은 순서로 연결해야 합니다."
                : "요건과 사실 적용을 같은 순서로 연결해야 합니다.",
            missingIssue:
              role === "ledger" ? syntheticLedgerGap : syntheticFixtureGap,
            createdFromCapture: true,
          }
        : row.event_name === "post_save_execution_started" ||
            row.event_name === "review_followup_scheduled"
          ? {
              mode: "second",
              nextTaskType: "rewrite",
              createdFromCapture: true,
            }
          : { mode: "second", createdFromCapture: true };
    const expectedEntityType =
      row.event_name === "review_followup_scheduled"
        ? "review_queue_item"
        : "wrong_answer_item";
    return (
      row.entity_type !== expectedEntityType ||
      JSON.stringify(canonicalJson(metadata)) !==
        JSON.stringify(canonicalJson(expectedMetadata))
    );
  }).length;
  const usageMultiplicityClosed = [...owned].every((itemId) =>
    [...allowedUsageEvents].every(
      (eventName) =>
        observed.sources.agendaUsage.filter(
          (row) => row.entity_id === itemId && row.event_name === eventName,
        ).length === 1,
    ),
  );
  const fixtureMultiplicityClosed = [...owned].every((itemId) => {
    const item = byId.get(itemId);
    if (!item) return false;
    const artifacts = exactFixtureGeneratedArtifacts(item);
    return (
      observed.sources.notes.filter(
        (row) => row.wrong_answer_item_id === itemId,
      ).length === 1 &&
      observed.sources.tags.filter((row) => row.wrong_answer_item_id === itemId)
        .length === 1 &&
      observed.sources.recurrence.filter(
        (row) =>
          row.topic_tag === artifacts.tag.topic_tag &&
          row.mistake_type === artifacts.tag.mistake_type,
      ).length === 1 &&
      observed.sources.reviewQueue.filter(
        (row) => row.source_submission_id === itemId,
      ).length === 1 &&
      observed.sources.learningSignals.filter(
        (row) =>
          row.metadata_json &&
          typeof row.metadata_json === "object" &&
          (row.metadata_json as Record<string, unknown>).sourceItemId ===
            itemId,
      ).length === 1
    );
  });
  const invalidDerivedRows =
    invalidWeeklyRows +
    invalidLearningSignalRows +
    invalidUsageRows +
    (usageMultiplicityClosed ? 0 : 1) +
    (fixtureMultiplicityClosed ? 0 : 1) +
    observed.sources.todaySeeds.length +
    observed.sources.conceptNodes.length;
  const invalidStudyProfiles = observed.sources.studyProfiles.filter(
    (row) =>
      row.user_id !== sessionUserId ||
      row.exam_name !== "감정평가사 2차" ||
      row.exam_date !== null ||
      !Array.isArray(row.preferred_subjects) ||
      row.preferred_subjects.length > 1 ||
      row.preferred_subjects.some(
        (subject) => subject !== "감정평가 및 보상법규",
      ),
  ).length;
  nonFixtureRowCount +=
    invalidOwnedItemDerivedRows +
    invalidAttachedRows +
    invalidQueueRows +
    invalidRecurrenceRows +
    invalidDerivedRows +
    invalidStudyProfiles +
    logs.length;
  const unknownReferenceCount =
    invalidOwnedItemDerivedRows +
    invalidAttachedRows +
    invalidQueueRows +
    invalidRecurrenceRows +
    invalidDerivedRows +
    invalidStudyProfiles;
  const ledger = listedItems.find(
    (item) =>
      owned.has(resolveSyntheticItemId(item)) && isExactVisualLedger(item),
  );
  const endpointAudit = await readVisualEndpointAudit(page, owned, observed);
  const afterEndpointSnapshot = await readVisualSourceSnapshot(
    page,
    credential,
  );
  const endpointSnapshotStable =
    sourceFingerprint(afterEndpointSnapshot) === sourceFingerprint(observed);
  nonFixtureRowCount += endpointAudit.unknownReferenceCount;
  const allRowsOwned = listedItems.every(
    (item) =>
      item.userId === sessionUserId && owned.has(resolveSyntheticItemId(item)),
  );
  const clean =
    sessionBound &&
    readsClosed &&
    visualSourceNames.every(
      (name) => afterEndpointSnapshot.truncated[name] === false,
    ) &&
    endpointAudit.readSucceeded &&
    endpointSnapshotStable &&
    listedItems.length > 0 &&
    listedItems.length < 501 &&
    logs.length === 0 &&
    logs.length < 501 &&
    nonFixtureRowCount === 0 &&
    unknownReferenceCount === 0 &&
    allRowsOwned &&
    Boolean(ledger) &&
    Boolean(endpointAudit.primaryQueueTitle);
  return {
    clean,
    sessionBound,
    endpointReadSucceeded:
      endpointAudit.readSucceeded && endpointSnapshotStable,
    sessionFingerprint,
    snapshotReadSucceeded:
      readsClosed &&
      visualSourceNames.every(
        (name) => afterEndpointSnapshot.truncated[name] === false,
      ),
    fingerprint: sourceFingerprint(observed),
    itemIds: listedIds,
    exactFixtureIds: listedIds.filter((itemId) => owned.has(itemId)),
    ledgerItemId: ledger ? resolveSyntheticItemId(ledger) : null,
    primaryQueueTitle: endpointAudit.primaryQueueTitle,
    itemCount: listedItems.length,
    studyLogCount: logs.length,
    queueCount: queueRows.length,
    todayReferenceCount: observed.sources.todaySeeds.length,
    weeklyReferenceCount: observed.sources.weeklySummaries.length,
    nonFixtureRowCount,
    unknownReferenceCount:
      unknownReferenceCount + endpointAudit.unknownReferenceCount,
  };
}

async function openCandidateHandle(
  browser: Browser,
  credential: VisualCredentialCandidate,
): Promise<CandidateAuditHandle> {
  let context: BrowserContext | null = null;
  let page: Page | null = null;
  let failureStep: CandidateAuditHandle["failureStep"] = "login";
  try {
    context = await newPreviewContext(browser, runtimeBaseUrl);
    page = await context.newPage();
    await establishProtectedPreviewSession(page, "S232H2 visual source gate");
    await loginWithExplicitTestAccountSession(
      page,
      credential,
      runtimeBaseUrl,
      "second",
    );
    failureStep = "source-read";
    await verifyRuntimeVersion(page, runtimeRunnerSha);
    const audit = await auditVisualAccountCandidate(page, credential);
    return {
      credential,
      context,
      page,
      audit,
      completed: true,
      failureStep: null,
    };
  } catch {
    return {
      credential,
      context,
      page,
      audit: null,
      completed: false,
      failureStep,
    };
  }
}

async function readRlsProbe(page: Page, itemId: string) {
  const url = new URL("/api/os/visual-source-audit", runtimeBaseUrl);
  url.searchParams.set("probeItemId", itemId);
  const response = await page.context().request.get(url.toString(), {
    headers: visualAuditRequestHeaders(),
  });
  const body = (await response.json().catch(() => null)) as {
    ok?: unknown;
    rlsProbeVisible?: unknown;
  } | null;
  return {
    status: response.status(),
    exactShape:
      body !== null &&
      Object.keys(body).sort().join(",") === "ok,rlsProbeVisible",
    visible: body?.rlsProbeVisible === true,
    hidden: body?.rlsProbeVisible === false,
  };
}

function selectCleanVisualAccount(handles: CandidateAuditHandle[]) {
  for (const credential of visualCredentialCandidates) {
    const handle = handles.find(
      (candidate) => candidate.credential.slot === credential.slot,
    );
    if (handle?.audit?.clean && handle.context && handle.page) return handle;
  }
  return null;
}

function safeProofIds(proof: VisualProof) {
  return [
    ...proof.fixtureIds,
    proof.ledgerItemId,
    proof.deniedCanary,
    proof.selectedFingerprint,
    proof.selectedSessionFingerprint,
  ];
}

function sameStringSet(left: readonly string[], right: readonly string[]) {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  return (
    leftSet.size === rightSet.size &&
    [...leftSet].every((value) => rightSet.has(value))
  );
}

function resolveRoutePath(route: RouteDefinition, itemId: string) {
  return typeof route.path === "function" ? route.path(itemId) : route.path;
}

async function waitForStableRender(page: Page) {
  await page.locator("body").waitFor({ state: "visible" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
}

async function gotoRequiredRoute(page: Page, requestedPath: string) {
  await page.goto(requestedPath, {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  await waitForStableRender(page);
  await settleRuntimeMonitors(page);
  const expected = new URL(requestedPath, "https://s232h2.invalid");
  const observed = new URL(page.url());
  expect(
    observed.pathname === expected.pathname,
    "The required production route must not redirect to a different pathname.",
  ).toBe(true);
  for (const [key, value] of expected.searchParams) {
    expect(
      observed.searchParams.get(key) === value,
      `The required production route must preserve its ${key} query contract.`,
    ).toBe(true);
  }
}

async function visibleTargetFailures(page: Page) {
  return page
    .locator(
      'a[href], button, summary, input:not([type="hidden"]), select, textarea, [role="button"]',
    )
    .evaluateAll((elements) =>
      elements.flatMap((element) => {
        if (!(element instanceof HTMLElement)) return [];
        if (
          element.matches(":disabled") ||
          element.getAttribute("aria-disabled") === "true" ||
          element.getAttribute("tabindex") === "-1"
        )
          return [];
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        if (
          rect.width === 0 ||
          rect.height === 0 ||
          style.display === "none" ||
          style.visibility === "hidden" ||
          (style.clip !== "auto" && !element.matches(":focus")) ||
          (style.clipPath !== "none" && !element.matches(":focus"))
        )
          return [];

        const input = element instanceof HTMLInputElement ? element : null;
        const target =
          input && (input.type === "checkbox" || input.type === "radio")
            ? (element.closest("label") ?? element)
            : element;
        const targetRect = target.getBoundingClientRect();
        if (targetRect.width >= 44 && targetRect.height >= 44) return [];
        return [
          {
            tag: element.tagName.toLowerCase(),
            width: Math.round(targetRect.width * 10) / 10,
            height: Math.round(targetRect.height * 10) / 10,
          },
        ];
      }),
    );
}

const focusOriginAttribute = "data-s232h2-focus-origin";

type SkipLinkFailureCode =
  | "S232H2_SKIP_LINK_COUNT_INVALID"
  | "S232H2_SKIP_LINK_NOT_FIRST_TAB_STOP"
  | "S232H2_SKIP_LINK_NOT_FOCUS_VISIBLE"
  | "S232H2_SKIP_LINK_FOCUS_INDICATOR_MISSING"
  | "S232H2_SKIP_LINK_NO_RENDERED_BOX"
  | "S232H2_SKIP_LINK_TARGET_BELOW_44"
  | "S232H2_SKIP_LINK_NOT_FULLY_IN_VIEWPORT"
  | "S232H2_SKIP_LINK_ACTIVATION_FAILED";

type SkipLinkMeasurement = {
  skipLinkCount: number;
  focusVisible: boolean;
  focusIndicatorPresent: boolean;
  inViewport: boolean;
  boundingBoxPresent: boolean;
  width: number;
  height: number;
  reachedByKeyboard: boolean;
  activationMovedFocus: boolean;
  originRemoved: boolean;
};

function skipLinkFailureCodes(
  measurement: SkipLinkMeasurement,
): SkipLinkFailureCode[] {
  if (measurement.skipLinkCount !== 1)
    return ["S232H2_SKIP_LINK_COUNT_INVALID"];
  if (!measurement.reachedByKeyboard)
    return ["S232H2_SKIP_LINK_NOT_FIRST_TAB_STOP"];
  const failures: SkipLinkFailureCode[] = [];
  if (!measurement.focusVisible)
    failures.push("S232H2_SKIP_LINK_NOT_FOCUS_VISIBLE");
  if (!measurement.focusIndicatorPresent)
    failures.push("S232H2_SKIP_LINK_FOCUS_INDICATOR_MISSING");
  if (!measurement.boundingBoxPresent) {
    failures.push("S232H2_SKIP_LINK_NO_RENDERED_BOX");
  } else {
    if (measurement.width < 44 || measurement.height < 44)
      failures.push("S232H2_SKIP_LINK_TARGET_BELOW_44");
    if (!measurement.inViewport)
      failures.push("S232H2_SKIP_LINK_NOT_FULLY_IN_VIEWPORT");
  }
  if (!measurement.activationMovedFocus)
    failures.push("S232H2_SKIP_LINK_ACTIVATION_FAILED");
  return failures;
}

async function removeKeyboardTraversalOrigin(page: Page) {
  await page
    .evaluate((attribute) => {
      for (const origin of document.querySelectorAll(`[${attribute}]`))
        origin.remove();
    }, focusOriginAttribute)
    .catch(() => undefined);
}

async function beginKeyboardTraversalAtDocumentStart(
  page: Page,
): Promise<SkipLinkMeasurement> {
  let measurement: Omit<
    SkipLinkMeasurement,
    "activationMovedFocus" | "originRemoved"
  > = {
    skipLinkCount: 0,
    focusVisible: false,
    focusIndicatorPresent: false,
    inViewport: false,
    boundingBoxPresent: false,
    width: 0,
    height: 0,
    reachedByKeyboard: false,
  };
  try {
    await page.evaluate((attribute) => {
      for (const staleOrigin of document.querySelectorAll(`[${attribute}]`))
        staleOrigin.remove();
      const origin = document.createElement("span");
      origin.setAttribute(attribute, "");
      origin.setAttribute("aria-hidden", "true");
      origin.tabIndex = -1;
      origin.style.position = "absolute";
      origin.style.inlineSize = "0";
      origin.style.blockSize = "0";
      origin.style.overflow = "hidden";
      origin.style.opacity = "0";
      origin.style.pointerEvents = "none";
      document.body.insertBefore(origin, document.body.firstChild);
      origin.focus({ preventScroll: true });
    }, focusOriginAttribute);

    // This real keyboard transition is the reachability proof. The temporary
    // programmatic focus above is only a deterministic traversal origin.
    await page.keyboard.press("Tab");
    measurement = await page.evaluate(async () => {
      const links = Array.from(
        document.querySelectorAll<HTMLAnchorElement>("a[data-v3-skip-link]"),
      );
      const link = links.length === 1 ? links[0] : null;
      const reachedByKeyboard = Boolean(
        link && document.activeElement === link,
      );
      if (!link) {
        return {
          skipLinkCount: links.length,
          focusVisible: false,
          focusIndicatorPresent: false,
          inViewport: false,
          boundingBoxPresent: false,
          width: 0,
          height: 0,
          reachedByKeyboard,
        };
      }
      await Promise.all(
        link
          .getAnimations()
          .map((animation) => animation.finished.catch(() => undefined)),
      );
      const style = getComputedStyle(link);
      const rect = link.getBoundingClientRect();
      const focusVisible = link.matches(":focus-visible");
      const hasOutline =
        style.outlineStyle !== "none" &&
        Number.parseFloat(style.outlineWidth) > 0;
      const hasRing = style.boxShadow !== "none";
      const boundingBoxPresent =
        link.getClientRects().length > 0 && rect.width > 0 && rect.height > 0;
      return {
        skipLinkCount: links.length,
        focusVisible,
        focusIndicatorPresent: focusVisible && (hasOutline || hasRing),
        inViewport:
          boundingBoxPresent &&
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= window.innerHeight &&
          rect.right <= window.innerWidth,
        boundingBoxPresent,
        width: Math.round(rect.width * 10) / 10,
        height: Math.round(rect.height * 10) / 10,
        reachedByKeyboard,
      };
    });
  } finally {
    await removeKeyboardTraversalOrigin(page);
  }
  const originRemoved =
    (await page.locator(`[${focusOriginAttribute}]`).count()) === 0;
  return {
    ...measurement,
    activationMovedFocus: false,
    originRemoved,
  };
}

async function activateCanonicalSkipLink(page: Page) {
  const activation = await page.evaluate(() => {
    const links = Array.from(
      document.querySelectorAll<HTMLAnchorElement>("a[data-v3-skip-link]"),
    );
    const link = links.length === 1 ? links[0] : null;
    const href = link?.getAttribute("href") ?? "";
    const validHash = /^#[a-z0-9_-]+$/i.test(href);
    if (!link || !validHash) return { ready: false, auditHash: null };
    link.focus({ preventScroll: true });
    return { ready: true, auditHash: href };
  });
  if (!activation.ready || !activation.auditHash)
    return { activationMovedFocus: false, auditHash: null };
  await page.keyboard.press("Enter");
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  const activationMovedFocus = await page.evaluate((auditHash) => {
    if (!auditHash || window.location.hash !== auditHash) return false;
    const target = document.getElementById(auditHash.slice(1));
    return target instanceof HTMLElement && document.activeElement === target;
  }, activation.auditHash);
  return { activationMovedFocus, auditHash: activation.auditHash };
}

async function visiblePrimaryActions(page: Page) {
  return page
    .locator(
      'a[href], button, input[type="submit"], input[type="button"], [role="button"]',
    )
    .evaluateAll((elements) => {
      const rootStyle = getComputedStyle(document.documentElement);
      const normalizeColor = (variable: string) => {
        const probe = document.createElement("span");
        probe.style.backgroundColor = `var(${variable})`;
        document.body.append(probe);
        const color = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return color;
      };
      const brandBackgrounds = new Set(
        [
          normalizeColor("--color-background-brand"),
          normalizeColor("--brand-700"),
          normalizeColor("--primary"),
          rootStyle.getPropertyValue("--color-background-brand").trim(),
        ].filter(Boolean),
      );
      return elements.flatMap((element) => {
        if (!(element instanceof HTMLElement)) return [];
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const inViewport =
          rect.width > 0 &&
          rect.height > 0 &&
          rect.bottom > 0 &&
          rect.right > 0 &&
          rect.top < window.innerHeight &&
          rect.left < window.innerWidth &&
          style.display !== "none" &&
          style.visibility !== "hidden";
        if (!inViewport) return [];
        const explicitPrimary =
          (element.dataset.v3Component === "Action" &&
            element.dataset.v3ActionTone === "primary") ||
          element.hasAttribute("data-s228-primary-action") ||
          element.hasAttribute("data-s224v-dominant-primary-action") ||
          element.hasAttribute("data-s225x-dominant-primary-after-input") ||
          element.hasAttribute("data-s226-capture-primary-action") ||
          element.hasAttribute("data-s226-primary-cta") ||
          element.hasAttribute("data-s232e-second-write-primary-action");
        const computedPrimary =
          brandBackgrounds.has(style.backgroundColor) &&
          style.backgroundColor !== "rgba(0, 0, 0, 0)";
        if (!explicitPrimary && !computedPrimary) return [];
        return [
          {
            tag: element.tagName.toLowerCase(),
            disabled:
              element.matches(":disabled") ||
              element.getAttribute("aria-disabled") === "true",
          },
        ];
      });
    });
}

async function visibleViewportBoundsFailures(page: Page) {
  return page
    .locator(
      "main [data-v3-component], main h1, main h2, main h3, main p, main blockquote, main input, main textarea, main button, main a",
    )
    .evaluateAll((elements) =>
      elements.flatMap((element) => {
        if (!(element instanceof HTMLElement)) return [];
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const visible =
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          style.clip === "auto" &&
          style.clipPath === "none";
        if (
          !visible ||
          (rect.left >= -1 && rect.right <= window.innerWidth + 1)
        )
          return [];
        return [
          {
            tag: element.tagName.toLowerCase(),
            left: Math.round(rect.left * 10) / 10,
            right: Math.round(rect.right * 10) / 10,
          },
        ];
      }),
    );
}

async function visualStyleMetrics(page: Page) {
  return page.locator("html, body, body *").evaluateAll((elements) => {
    let gradientCount = 0;
    let shadowCount = 0;
    const shadowElements: Array<{
      tag: string;
      component: string | null;
      testId: string | null;
    }> = [];
    const fixedDocks: Array<{
      component: string | null;
      bottom: number;
      height: number;
    }> = [];

    for (const element of elements) {
      if (!(element instanceof HTMLElement)) continue;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      if (
        rect.width === 0 ||
        rect.height === 0 ||
        style.display === "none" ||
        style.visibility === "hidden"
      )
        continue;
      if (/gradient\(/i.test(style.backgroundImage)) gradientCount += 1;
      if (style.boxShadow !== "none" || /drop-shadow\(/i.test(style.filter)) {
        shadowCount += 1;
        shadowElements.push({
          tag: element.tagName.toLowerCase(),
          component: element.getAttribute("data-v3-component"),
          testId: element.getAttribute("data-testid"),
        });
      }
      if (
        style.position === "fixed" &&
        rect.bottom > window.innerHeight - 2 &&
        rect.top < window.innerHeight &&
        rect.right > 0 &&
        rect.left < window.innerWidth
      ) {
        fixedDocks.push({
          component: element.getAttribute("data-v3-component"),
          bottom: Math.round(rect.bottom),
          height: Math.round(rect.height),
        });
      }
    }
    return { gradientCount, shadowCount, shadowElements, fixedDocks };
  });
}

type CanonicalTopRecoveryOptions = Readonly<{
  originalUrl?: string;
  auditHash?: string | null;
}>;

async function stabilizeCanonicalTop(
  page: Page,
  options: CanonicalTopRecoveryOptions = {},
) {
  return page.evaluate(async ({ originalUrl, auditHash }) => {
    const describeActiveElement = () => {
      const element = document.activeElement;
      if (!(element instanceof HTMLElement)) return "non-html";
      const tag = element.tagName.toLowerCase();
      const role = element.getAttribute("role");
      return role && /^[a-z][a-z0-9-]*$/i.test(role) ? `${tag}:${role}` : tag;
    };
    const root = document.documentElement;
    const original = originalUrl ? new URL(originalUrl) : null;
    const current = new URL(window.location.href);
    const sameDocument = Boolean(
      original &&
      original.origin === current.origin &&
      original.pathname === current.pathname &&
      original.search === current.search,
    );
    const hashCreatedByAudit = Boolean(
      auditHash &&
      original &&
      sameDocument &&
      current.hash === auditHash &&
      original.hash !== auditHash,
    );
    const previousScrollBehavior = {
      value: root.style.getPropertyValue("scroll-behavior"),
      priority: root.style.getPropertyPriority("scroll-behavior"),
    };
    const metadata = {
      originalHashPresent: original ? original.hash.length > 0 : null,
      auditHashPresent: Boolean(auditHash),
      hashBeforeRecoveryPresent: current.hash.length > 0,
      hashCreatedByAudit,
      hashRestored: false,
      hashAfterRecoveryPresent: current.hash.length > 0,
      activeElementBeforeBlur: describeActiveElement(),
      activeElementAfterBlur: "unknown",
      quiescentSequence: [] as Array<{
        frame: number;
        windowScrollY: number;
        scrollingElementScrollTop: number;
      }>,
      immediateAfterReset: null as {
        windowScrollY: number;
        scrollingElementScrollTop: number;
      } | null,
      postResetSequence: [] as Array<{
        frame: number;
        windowScrollY: number;
        scrollingElementScrollTop: number;
      }>,
    };

    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    metadata.activeElementAfterBlur = describeActiveElement();

    try {
      root.style.setProperty("scroll-behavior", "auto", "important");
      void root.offsetHeight;

      if (hashCreatedByAudit && original) {
        history.replaceState(
          history.state,
          "",
          `${original.pathname}${original.search}${original.hash}`,
        );
        metadata.hashRestored = true;
      }
      metadata.hashAfterRecoveryPresent = window.location.hash.length > 0;

      let identicalQuiescentFrames = 0;
      let previousSample: {
        windowScrollY: number;
        scrollingElementScrollTop: number;
      } | null = null;
      await new Promise<void>((resolve) => {
        const observeQuiescence = () => {
          const sample = {
            windowScrollY: window.scrollY,
            scrollingElementScrollTop:
              document.scrollingElement?.scrollTop ?? 0,
          };
          metadata.quiescentSequence.push({
            frame: metadata.quiescentSequence.length + 1,
            ...sample,
          });
          identicalQuiescentFrames =
            previousSample &&
            previousSample.windowScrollY === sample.windowScrollY &&
            previousSample.scrollingElementScrollTop ===
              sample.scrollingElementScrollTop
              ? identicalQuiescentFrames + 1
              : 1;
          previousSample = sample;
          if (
            identicalQuiescentFrames >= 3 ||
            metadata.quiescentSequence.length >= 60
          ) {
            resolve();
            return;
          }
          requestAnimationFrame(observeQuiescence);
        };
        requestAnimationFrame(observeQuiescence);
      });

      const quiescent = identicalQuiescentFrames >= 3;
      if (!quiescent) {
        return {
          ...metadata,
          quiescent,
          identicalQuiescentFrames,
          stable: false,
          failureCode: "S232H2_SCROLL_NOT_QUIESCENT" as const,
          finalWindowScrollY: window.scrollY,
          finalScrollingElementScrollTop:
            document.scrollingElement?.scrollTop ?? 0,
        };
      }

      const instantTop = {
        top: 0,
        left: 0,
        behavior: "instant" as ScrollBehavior,
      };
      window.scrollTo(instantTop);
      metadata.immediateAfterReset = {
        windowScrollY: window.scrollY,
        scrollingElementScrollTop: document.scrollingElement?.scrollTop ?? 0,
      };
      await new Promise<void>((resolve) => {
        const observePostReset = () => {
          metadata.postResetSequence.push({
            frame: metadata.postResetSequence.length + 1,
            windowScrollY: window.scrollY,
            scrollingElementScrollTop:
              document.scrollingElement?.scrollTop ?? 0,
          });
          if (metadata.postResetSequence.length >= 3) {
            resolve();
            return;
          }
          requestAnimationFrame(observePostReset);
        };
        requestAnimationFrame(observePostReset);
      });

      const immediateAtTop =
        metadata.immediateAfterReset.windowScrollY === 0 &&
        metadata.immediateAfterReset.scrollingElementScrollTop === 0;
      const postResetAtTop = metadata.postResetSequence.every(
        (sample) =>
          sample.windowScrollY === 0 && sample.scrollingElementScrollTop === 0,
      );
      const stable = immediateAtTop && postResetAtTop;
      return {
        ...metadata,
        quiescent,
        identicalQuiescentFrames,
        immediateAtTop,
        postResetAtTop,
        stable,
        failureCode: stable ? null : ("S232H2_CANONICAL_TOP_UNSTABLE" as const),
        finalWindowScrollY: window.scrollY,
        finalScrollingElementScrollTop:
          document.scrollingElement?.scrollTop ?? 0,
      };
    } finally {
      if (previousScrollBehavior.value) {
        root.style.setProperty(
          "scroll-behavior",
          previousScrollBehavior.value,
          previousScrollBehavior.priority,
        );
      } else {
        root.style.removeProperty("scroll-behavior");
      }
    }
  }, options);
}

async function waitForFocusedElementReveal(page: Page) {
  await page
    .waitForFunction(
      () => {
        const element = document.activeElement;
        if (!(element instanceof HTMLElement) || element === document.body)
          return true;
        const rect = element.getBoundingClientRect();
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          rect.bottom > 0 &&
          rect.right > 0 &&
          rect.top < window.innerHeight &&
          rect.left < window.innerWidth
        );
      },
      undefined,
      { timeout: 1_000 },
    )
    .catch(() => undefined);
}

async function activeKeyboardFocusState(page: Page) {
  return page.evaluate(() => {
    const focusable = Array.from(
      document.querySelectorAll<HTMLElement>(
        'a[href], button, summary, input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"]), [role="button"]',
      ),
    ).filter((candidate) => {
      const candidateStyle = getComputedStyle(candidate);
      const candidateRect = candidate.getBoundingClientRect();
      return (
        candidate.tabIndex >= 0 &&
        !candidate.matches(":disabled") &&
        candidate.getAttribute("aria-disabled") !== "true" &&
        !candidate.closest("[inert]") &&
        candidateRect.width > 0 &&
        candidateRect.height > 0 &&
        candidateStyle.display !== "none" &&
        candidateStyle.visibility !== "hidden"
      );
    });
    const element = document.activeElement;
    if (!(element instanceof HTMLElement) || element === document.body) {
      return { active: null, focusableCount: focusable.length };
    }
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const hasOutline =
      style.outlineStyle !== "none" &&
      Number.parseFloat(style.outlineWidth) > 0;
    const hasRing = style.boxShadow !== "none";
    const brandProbe = document.createElement("span");
    brandProbe.style.backgroundColor = "var(--color-background-brand)";
    document.body.append(brandProbe);
    const brandBackground = getComputedStyle(brandProbe).backgroundColor;
    brandProbe.remove();
    const explicitPrimary =
      (element.dataset.v3Component === "Action" &&
        element.dataset.v3ActionTone === "primary") ||
      element.hasAttribute("data-s228-primary-action") ||
      element.hasAttribute("data-s224v-dominant-primary-action") ||
      element.hasAttribute("data-s225x-dominant-primary-after-input") ||
      element.hasAttribute("data-s226-capture-primary-action") ||
      element.hasAttribute("data-s226-primary-cta") ||
      element.hasAttribute("data-s232e-second-write-primary-action") ||
      (brandBackground !== "rgba(0, 0, 0, 0)" &&
        style.backgroundColor === brandBackground);
    return {
      active: {
        focusIndex: focusable.indexOf(element),
        inViewport:
          rect.width > 0 &&
          rect.height > 0 &&
          rect.bottom > 0 &&
          rect.right > 0 &&
          rect.top < window.innerHeight &&
          rect.left < window.innerWidth,
        hasIndicator:
          element.matches(":focus-visible") && (hasOutline || hasRing),
        explicitPrimary,
      },
      focusableCount: focusable.length,
    };
  });
}

async function verifyKeyboardFocus(page: Page, primaryActionCount: number) {
  const focusAuditStartUrl = page.url();
  const preFocusControl = await stabilizeCanonicalTop(page);
  let completedFocusTraversal = false;
  let everyFocusVisible = true;
  let enabledPrimaryReached = primaryActionCount === 0;
  let firstFocusIndex: number | null = null;
  let completionKind:
    "enumerated-stops" | "browser-cycle" | "document-exit" | null = null;
  const visitedFocusIndexes = new Set<number>();

  const skipLinkStart = await beginKeyboardTraversalAtDocumentStart(page);
  await waitForFocusedElementReveal(page);
  let focusState = await activeKeyboardFocusState(page);
  const focusStopCount = focusState.focusableCount;
  const visitFocusState = (state: typeof focusState) => {
    const active = state.active;
    if (!active || active.focusIndex < 0) return false;
    if (firstFocusIndex === null) firstFocusIndex = active.focusIndex;
    visitedFocusIndexes.add(active.focusIndex);
    if (!active.inViewport || !active.hasIndicator) everyFocusVisible = false;
    if (active.inViewport && active.hasIndicator && active.explicitPrimary)
      enabledPrimaryReached = true;
    return true;
  };
  visitFocusState(focusState);
  if (focusStopCount > 0 && visitedFocusIndexes.size >= focusStopCount) {
    completedFocusTraversal = true;
    completionKind = "enumerated-stops";
  }

  // The traversal budget is derived from the rendered focus stops. It is not
  // an arbitrary retry loop and cannot hide a misplaced skip link.
  for (
    let remainingStop = 0;
    remainingStop < focusStopCount && !completedFocusTraversal;
    remainingStop += 1
  ) {
    await page.keyboard.press("Tab");
    await waitForFocusedElementReveal(page);
    focusState = await activeKeyboardFocusState(page);
    if (!focusState.active || focusState.active.focusIndex < 0) {
      if (visitedFocusIndexes.size > 0) {
        completedFocusTraversal = true;
        completionKind = "document-exit";
      }
      break;
    }
    if (
      firstFocusIndex !== null &&
      focusState.active.focusIndex === firstFocusIndex &&
      visitedFocusIndexes.size > 0
    ) {
      completedFocusTraversal = true;
      completionKind = "browser-cycle";
      break;
    }
    visitFocusState(focusState);
    if (
      focusState.focusableCount > 0 &&
      visitedFocusIndexes.size >= focusState.focusableCount
    ) {
      completedFocusTraversal = true;
      completionKind = "enumerated-stops";
    }
  }

  const activation = await activateCanonicalSkipLink(page);
  const skipLink = {
    ...skipLinkStart,
    activationMovedFocus: activation.activationMovedFocus,
  };
  const skipLinkFailures = skipLinkFailureCodes(skipLink);
  const skipLinkActivated =
    skipLink.reachedByKeyboard &&
    skipLink.activationMovedFocus &&
    !skipLinkFailures.includes("S232H2_SKIP_LINK_ACTIVATION_FAILED");
  const scrollRecovery = await stabilizeCanonicalTop(page, {
    originalUrl: focusAuditStartUrl,
    auditHash: activation.auditHash,
  });
  const keyboardFocusPassed =
    completedFocusTraversal &&
    visitedFocusIndexes.size > 0 &&
    everyFocusVisible &&
    enabledPrimaryReached &&
    skipLinkActivated;
  return {
    passed: keyboardFocusPassed,
    completedFocusTraversal,
    completionKind,
    focusStopCount,
    visitedFocusStopCount: visitedFocusIndexes.size,
    everyFocusVisible,
    enabledPrimaryReached,
    skipLinkActivated,
    skipLink,
    skipLinkFailures,
    preFocusControl,
    scrollRecovery,
  };
}

async function verifyRepresentativeFigmaStructure(
  page: Page,
  routeId: string,
  viewportWidth: number,
) {
  if (
    routeId === "ledger" &&
    (viewportWidth === 390 || viewportWidth === 1440)
  ) {
    const readingHeader = page.locator("[data-s232d2-reading-header]");
    const stateEvidence = readingHeader.locator("[data-s232d2-state-evidence]");
    const recoveryHeading = page.locator("[data-s232d2-recovery-heading]");
    const chrome = await page
      .locator("[data-s232d1-ledger-chrome]")
      .boundingBox();
    const reading = await page
      .locator("[data-s232d2-reading-column]")
      .boundingBox();
    const trust = await page
      .locator('[data-v3-component="TrustEvidenceBar"]')
      .first()
      .boundingBox();
    const gap = await page
      .locator('[data-v3-component="BiggestGap"]')
      .first()
      .boundingBox();
    const excerpt = await page
      .locator('[data-v3-component="EvidenceExcerpt"]')
      .first()
      .boundingBox();
    const sticky = await page
      .locator('[data-v3-component="StickyAction"]')
      .boundingBox();
    await expect(stateEvidence).toBeVisible();
    await expect(readingHeader).toHaveCSS("border-bottom-width", "0px");
    await expect(recoveryHeading).toContainText("이번에 회복할 문장");
    const canonicalOrder = await page.evaluate(() => {
      const reading = document.querySelector("[data-s232d2-reading-column]");
      const selectors = [
        '[data-v3-component="TrustEvidenceBar"]',
        '[data-v3-component="BiggestGap"]',
        "[data-s232d2-recovery-heading]",
        "[data-s232d2-learner-evidence]",
        '[data-v3-component="StickyAction"]',
      ];
      const nodes = selectors.map((selector) =>
        reading?.querySelector(selector),
      );
      return (
        nodes.every(Boolean) &&
        nodes.every(
          (node, index) =>
            index === 0 ||
            Boolean(
              nodes[index - 1]!.compareDocumentPosition(node!) &
              Node.DOCUMENT_POSITION_FOLLOWING,
            ),
        )
      );
    });
    expect(canonicalOrder).toBe(true);
    for (const box of [chrome, reading, trust, gap, excerpt, sticky])
      expect(box).not.toBeNull();
    expect(chrome!.y).toBeCloseTo(0, 0);
    expect(chrome!.height).toBeCloseTo(viewportWidth === 390 ? 56 : 72, 0);
    expect(trust!.y).toBeLessThan(gap!.y);
    expect(gap!.y).toBeLessThan(excerpt!.y);
    if (viewportWidth === 390) {
      expect(reading!.x).toBeCloseTo(20, 0);
      expect(reading!.width).toBeCloseTo(350, 0);
      expect(sticky!.x).toBeCloseTo(0, 0);
      expect(sticky!.width).toBeCloseTo(390, 0);
      expect(sticky!.y + sticky!.height).toBeCloseTo(844, 0);
    } else {
      const rail = await page
        .locator("[data-s232d2-evidence-rail]")
        .boundingBox();
      await expect(
        page.locator(
          "[data-s232d2-evidence-rail] [data-s232d2-recovery-context]",
        ),
      ).toBeVisible();
      expect(rail).not.toBeNull();
      expect(reading!.x).toBeCloseTo(220, 0);
      expect(reading!.width).toBeGreaterThanOrEqual(640);
      expect(reading!.width).toBeLessThanOrEqual(700);
      expect(rail!.x).toBeGreaterThan(reading!.x + reading!.width);
      expect(rail!.width).toBeGreaterThanOrEqual(260);
      expect(rail!.width).toBeLessThanOrEqual(320);
      expect(sticky!.width).toBeCloseTo(300, 0);
    }
  }
  if (routeId === "calculator" && viewportWidth === 390) {
    const content = await page
      .locator("#calculator-routine-content")
      .boundingBox();
    const trust = await page
      .getByTestId("calculator-focus-trust")
      .boundingBox();
    const step = await page
      .locator('[data-v3-component="CalculatorStep"]')
      .boundingBox();
    const display = await page
      .locator("[data-calculator-step-display]")
      .boundingBox();
    const sticky = await page
      .locator('[data-v3-component="StickyAction"]')
      .boundingBox();
    for (const box of [content, trust, step, display, sticky])
      expect(box).not.toBeNull();
    expect(content!.x).toBeCloseTo(0, 0);
    expect(content!.width).toBeCloseTo(390, 0);
    expect(trust!.x).toBeCloseTo(20, 0);
    expect(trust!.width).toBeCloseTo(350, 0);
    expect(trust!.y).toBeLessThan(step!.y);
    expect(step!.x).toBeCloseTo(20, 0);
    expect(step!.width).toBeCloseTo(350, 0);
    expect(display!.x).toBeGreaterThanOrEqual(step!.x + 20);
    expect(display!.x + display!.width).toBeLessThanOrEqual(
      step!.x + step!.width - 20,
    );
    expect(sticky!.x).toBeCloseTo(0, 0);
    expect(sticky!.width).toBeCloseTo(390, 0);
    expect(sticky!.y + sticky!.height).toBeCloseTo(844, 0);
  }
}

type ShellCapabilities = {
  kind: "learner-shell" | "standalone-tool" | "login-form" | "public";
  requiresSkipLink: boolean;
  skipLinkCount: number;
  loginControlCount: number;
  structureValid: boolean;
};

type EndpointGuardEvidence = {
  unknownEndpointCount: number;
  unknownRowCount: number;
  blockedMutationCount: number;
};

function recordEndpointGuardFailures(
  failures: StableGateFailure[],
  phase: StableGateFailure["phase"],
  routeStateAlias: string,
  viewport: string,
  guard: EndpointGuardEvidence,
) {
  for (const [errorFamily, count] of [
    ["unknown-endpoint", guard.unknownEndpointCount],
    ["unknown-row", guard.unknownRowCount],
    ["mutation-blocked", guard.blockedMutationCount],
  ] as const) {
    if (count === 0) continue;
    recordStableGateFailure(failures, {
      phase,
      routeStateAlias,
      viewport,
      stableStep: "privacy",
      errorFamily,
      count,
    });
  }
}

type ArtifactBoundaryObservation = {
  visibleEmailOutsideMask: number;
  rawCredentialArtifactCount: number;
  rawIdentifierArtifactCount: number;
  deniedCanaryDomCount: number;
  opaqueSurfaceCount: number;
  identityMaskCount: number;
};

async function inspectShellCapabilities(
  page: Page,
): Promise<ShellCapabilities> {
  return page.evaluate(() => {
    const learnerShell = document.querySelectorAll(
      "[data-learner-shell]",
    ).length;
    const standaloneTool = document.querySelectorAll(
      "[data-standalone-learner-tool-nav]",
    ).length;
    const answerReviewShell = document.querySelectorAll(
      '[data-answer-review-stage="answer-review-shell"]',
    ).length;
    const loginControls = [
      document.querySelector('input[type="email"]'),
      document.querySelector('input[type="password"]'),
      document.querySelector('button[type="submit"]'),
    ].filter(Boolean).length;
    const skipLinkCount = document.querySelectorAll(
      "a[data-v3-skip-link]",
    ).length;
    if (learnerShell > 0 || answerReviewShell > 0) {
      return {
        kind: "learner-shell" as const,
        requiresSkipLink: true,
        skipLinkCount,
        loginControlCount: loginControls,
        structureValid:
          learnerShell + answerReviewShell === 1 && standaloneTool === 0,
      };
    }
    if (standaloneTool > 0) {
      return {
        kind: "standalone-tool" as const,
        requiresSkipLink: true,
        skipLinkCount,
        loginControlCount: loginControls,
        structureValid: standaloneTool === 1,
      };
    }
    if (loginControls === 3) {
      return {
        kind: "login-form" as const,
        requiresSkipLink: false,
        skipLinkCount,
        loginControlCount: loginControls,
        structureValid: true,
      };
    }
    return {
      kind: "public" as const,
      requiresSkipLink: false,
      skipLinkCount,
      loginControlCount: loginControls,
      structureValid: true,
    };
  });
}

async function auditLoginFormFocus(page: Page) {
  const controls = [
    page.locator('input[type="email"]'),
    page.locator('input[type="password"]'),
    page.locator('button[type="submit"]'),
  ];
  let completed = 0;
  for (const control of controls) {
    if ((await control.count()) !== 1 || !(await control.isVisible())) continue;
    await control.focus();
    if (
      await control.evaluate((element) => document.activeElement === element)
    ) {
      completed += 1;
    }
  }
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });
  return completed;
}

async function auditRoute(
  page: Page,
  route: RouteDefinition,
  requestedPath: string,
  viewport: (typeof viewports)[number],
  options: {
    profile: AuditProfile;
    keyboard: boolean;
    state?: string;
    auditKind?: AuditRow["auditKind"];
    navigate?: boolean;
    failures: StableGateFailure[];
    phase: StableGateFailure["phase"];
    routeStateAlias: string;
  },
): Promise<AuditRow> {
  const viewportLabel = viewport.width + "x" + viewport.height;
  const fail = (
    stableStep: StableGateFailure["stableStep"],
    errorFamily: StableGateFailure["errorFamily"],
    count = 1,
  ) => {
    if (count <= 0) return;
    recordStableGateFailure(options.failures, {
      phase: options.phase,
      routeStateAlias: options.routeStateAlias,
      viewport: viewportLabel,
      stableStep,
      errorFamily,
      count,
    });
  };

  await page.setViewportSize({
    width: viewport.width,
    height: viewport.height,
  });
  if (options.navigate !== false) {
    await gotoRequiredRoute(page, requestedPath);
  } else {
    await waitForStableRender(page);
  }

  const canonicalTop = await stabilizeCanonicalTop(page);
  if (canonicalTop.failureCode) fail("audit", "assertion");

  const main = page.locator("main");
  const mainCount = await main.count();
  const mainVisible = mainCount === 1 && (await main.isVisible());
  const mainBox = mainCount === 1 ? await main.boundingBox() : null;
  if (
    !mainVisible ||
    !mainBox ||
    mainBox.width <= 0 ||
    mainBox.x < -1 ||
    mainBox.x + mainBox.width > viewport.width + 1
  ) {
    fail("audit", "assertion");
  }

  const visibleH1Count = await page.locator("h1:visible").count();
  if (visibleH1Count !== 1) fail("audit", "assertion");

  const foundation = await page.evaluate(() => ({
    horizontalOverflow: Math.max(
      0,
      document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
    canvasColor: getComputedStyle(document.body).backgroundColor,
    bodyFontFamily: getComputedStyle(document.body).fontFamily,
    pageEdge: Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--layout-page-edge",
      ),
    ),
    controlHeight: Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--control-height",
      ),
    ),
    controlRadius: Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--v3-radius-control",
      ),
    ),
    readingColumn: Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--layout-reading-column",
      ),
    ),
    contentMax: Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--layout-content-max",
      ),
    ),
  }));
  if (foundation.horizontalOverflow !== 0) {
    fail("audit", "assertion", foundation.horizontalOverflow);
  }
  if (
    foundation.canvasColor !== "rgb(247, 246, 243)" ||
    !/Noto Sans KR/i.test(foundation.bodyFontFamily) ||
    foundation.pageEdge !== (viewport.width < 768 ? 20 : 32) ||
    foundation.controlHeight !== 52 ||
    foundation.controlRadius !== 12 ||
    foundation.readingColumn !== 680 ||
    foundation.contentMax !== 1120
  ) {
    fail("audit", "assertion");
  }

  try {
    await verifyRepresentativeFigmaStructure(page, route.id, viewport.width);
  } catch {
    fail("audit", "assertion");
  }

  const viewportBoundsFailures = await visibleViewportBoundsFailures(page);
  if (viewportBoundsFailures.length > 0) {
    fail("audit", "assertion", viewportBoundsFailures.length);
  }

  const capabilities = await inspectShellCapabilities(page);
  if (
    !capabilities.structureValid ||
    (capabilities.requiresSkipLink && capabilities.skipLinkCount !== 1) ||
    (!capabilities.requiresSkipLink && capabilities.skipLinkCount > 1)
  ) {
    fail("audit", "assertion");
  }
  if (capabilities.kind === "login-form") {
    const focused = await auditLoginFormFocus(page);
    if (focused !== 3) fail("audit", "assertion");
  }

  const styles = await visualStyleMetrics(page);
  if (styles.gradientCount > 0) {
    fail("audit", "assertion", styles.gradientCount);
  }
  if (viewport.width === 1440 && styles.shadowCount > 0) {
    fail("audit", "assertion", styles.shadowCount);
  }
  const expectsCanonicalDock =
    viewport.width < 1024 &&
    (route.id === "ledger" || route.id === "calculator");
  if (expectsCanonicalDock) {
    if (
      styles.fixedDocks.length !== 1 ||
      styles.fixedDocks[0]?.component !== "StickyAction" ||
      (styles.fixedDocks[0]?.height ?? 0) < 84
    ) {
      fail("audit", "assertion");
    }
  } else if (styles.fixedDocks.length !== 0) {
    fail("audit", "assertion", styles.fixedDocks.length);
  }

  let visiblePrimaryActionCount: number | null = null;
  let undersizedTargetCount: number | null = null;
  let axeSeriousOrCritical: number | null = null;
  let keyboardFocusVisible: boolean | null = null;
  if (options.profile === "mobile-full") {
    const primaryActions = await visiblePrimaryActions(page);
    visiblePrimaryActionCount = primaryActions.length;
    if (visiblePrimaryActionCount > 1) {
      fail("audit", "assertion", visiblePrimaryActionCount - 1);
    }
    const targetFailures = await visibleTargetFailures(page);
    undersizedTargetCount = targetFailures.length;
    if (undersizedTargetCount > 0) {
      fail("audit", "assertion", undersizedTargetCount);
    }
    try {
      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      axeSeriousOrCritical = axe.violations.filter(
        (violation) =>
          violation.impact === "serious" || violation.impact === "critical",
      ).length;
      if (axeSeriousOrCritical > 0) {
        fail("audit", "assertion", axeSeriousOrCritical);
      }
    } catch {
      fail("audit", "unexpected");
    }

    if (options.keyboard) {
      if (!capabilities.requiresSkipLink) {
        fail("audit", "assertion");
        keyboardFocusVisible = false;
      } else {
        try {
          const enabledPrimaryActionCount = primaryActions.filter(
            (action) => !action.disabled,
          ).length;
          const keyboard = await verifyKeyboardFocus(
            page,
            enabledPrimaryActionCount,
          );
          keyboardFocusVisible = keyboard.passed;
          if (
            !keyboard.passed ||
            keyboard.skipLinkFailures.length > 0 ||
            !keyboard.skipLink.originRemoved
          ) {
            fail("audit", "assertion");
          }
        } catch {
          keyboardFocusVisible = false;
          fail("audit", "unexpected");
        }
      }
    }
  }

  return {
    auditKind: options.auditKind ?? "initial-route",
    auditProfile: options.profile,
    state: options.state ?? "initial",
    route: route.id,
    requestedPath:
      route.id === "ledger" ? "/app/items/[itemId]?mode=second" : requestedPath,
    viewport: viewportLabel,
    viewportWidth: viewport.width,
    mainCount,
    visibleH1Count,
    mainLeft: Math.round((mainBox?.x ?? 0) * 10) / 10,
    mainWidth: Math.round((mainBox?.width ?? 0) * 10) / 10,
    horizontalOverflow: foundation.horizontalOverflow,
    visiblePrimaryActionCount,
    undersizedTargetCount,
    viewportBoundsFailureCount: viewportBoundsFailures.length,
    axeSeriousOrCritical,
    keyboardFocusVisible,
    gradientCount: styles.gradientCount,
    shadowCount: styles.shadowCount,
    fixedDockCount: styles.fixedDocks.length,
    canonicalDock: expectsCanonicalDock,
    canvasColor: foundation.canvasColor,
    bodyFontFamily: foundation.bodyFontFamily,
    pageEdge: foundation.pageEdge,
    controlHeight: foundation.controlHeight,
    controlRadius: foundation.controlRadius,
    readingColumn: foundation.readingColumn,
    contentMax: foundation.contentMax,
  };
}

function hasExactQuery(
  url: URL,
  expected: Readonly<Record<string, readonly string[]>>,
) {
  const keys = [...url.searchParams.keys()];
  if (keys.length !== Object.keys(expected).length) return false;
  return Object.entries(expected).every(([key, values]) => {
    const actual = url.searchParams.getAll(key);
    return (
      actual.length === values.length &&
      actual.every((value, index) => value === values[index])
    );
  });
}

function isKnownLearnerRead(url: URL, allowedItemIds: Set<string>) {
  const pathname = url.pathname;
  if (
    (pathname === "/api/os/items" &&
      (hasExactQuery(url, {}) || hasExactQuery(url, { limit: ["501"] }))) ||
    (pathname === "/api/os/study-logs" &&
      hasExactQuery(url, { mode: ["second"], limit: ["501"] })) ||
    (pathname === "/api/os/review-queue" && hasExactQuery(url, {})) ||
    (pathname === "/api/os/today-focus" &&
      hasExactQuery(url, { mode: ["second"] })) ||
    (pathname === "/api/os/weekly-summary" &&
      hasExactQuery(url, { mode: ["second"] }))
  ) {
    return { known: true, rowKnown: true };
  }
  const item = pathname.match(/^\/api\/os\/items\/([^/]+)$/);
  if (item) {
    let decoded = "";
    try {
      decoded = decodeURIComponent(item[1]);
    } catch {
      return { known: true, rowKnown: false };
    }
    return { known: true, rowKnown: allowedItemIds.has(decoded) };
  }
  return { known: false, rowKnown: false };
}

async function blockUnexpectedLearnerMutation(
  context: BrowserContext,
  fixtureIds: readonly string[],
) {
  const evidence: EndpointGuardEvidence = {
    unknownEndpointCount: 0,
    unknownRowCount: 0,
    blockedMutationCount: 0,
  };
  const allowedItemIds = new Set(fixtureIds);
  await context.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    const learnerDataEndpoint =
      pathname.startsWith("/api/os/") ||
      pathname === "/api/inverge/ocr" ||
      pathname === "/api/answer-review/structure";
    if (!learnerDataEndpoint) {
      await route.continue();
      return;
    }
    if (request.method() !== "GET") {
      evidence.blockedMutationCount += 1;
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, error: "S232H2_MUTATION_BLOCKED" }),
      });
      return;
    }
    const known = isKnownLearnerRead(url, allowedItemIds);
    if (!known.known) {
      evidence.unknownEndpointCount += 1;
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, error: "S232H2_UNKNOWN_ENDPOINT" }),
      });
      return;
    }
    if (!known.rowKnown) {
      evidence.unknownRowCount += 1;
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, error: "S232H2_UNKNOWN_ROW" }),
      });
      return;
    }
    await route.continue();
  });
  return evidence;
}

async function installDeterministicVisualMocks(context: BrowserContext) {
  const exactSyntheticPost = async (
    route: Route,
    kind: "ocr" | "answer-review" | "calculator",
  ) => {
    const request = route.request();
    const url = new URL(request.url());
    const contentType = request.headers()["content-type"] ?? "";
    const body = request.postDataBuffer();
    if (
      request.method() !== "POST" ||
      [...url.searchParams.keys()].length !== 0 ||
      !body ||
      body.byteLength === 0 ||
      body.byteLength > 65_536
    ) {
      await route.fallback();
      return false;
    }
    if (kind === "calculator") {
      if (!contentType.startsWith("application/json")) {
        await route.fallback();
        return false;
      }
      const parsed = (() => {
        try {
          return JSON.parse(body.toString("utf8")) as Record<string, unknown>;
        } catch {
          return null;
        }
      })();
      if (
        !parsed ||
        parsed.metadataOnly !== true ||
        parsed.version !== 1 ||
        parsed.routineType !== "calculator_routine" ||
        parsed.examMode !== "second" ||
        parsed.subject !== "감정평가실무" ||
        parsed.sourceStatus !== "draft" ||
        parsed.needsOfficialVerification !== true ||
        !Array.isArray(parsed.completedStepIds) ||
        !Array.isArray(parsed.verificationMethods) ||
        !parsed.verificationMethods.includes("reverse_calculation") ||
        !Array.isArray(parsed.mistakeTypes) ||
        parsed.mistakeTypes.length !== 1 ||
        parsed.mistakeTypes[0] !== "none"
      ) {
        await route.fallback();
        return false;
      }
      return true;
    }
    if (!contentType.startsWith("multipart/form-data; boundary=")) {
      await route.fallback();
      return false;
    }
    const serialized = body.toString("utf8");
    const rawIdentity =
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(serialized) ||
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i.test(
        serialized,
      );
    const exactFixtureInput =
      kind === "ocr"
        ? serialized.includes("합성 사례 메모입니다.") &&
          serialized.includes("신뢰보호 요건과 대응 사실")
        : serialized.includes(
            "합성 답안입니다. 논점, 기준, 적용, 결론 순서로 직접 작성했습니다.",
          ) && serialized.includes("second");
    if (rawIdentity || !exactFixtureInput) {
      await route.fallback();
      return false;
    }
    return true;
  };

  await context.route("**/api/inverge/ocr", async (route) => {
    if (!(await exactSyntheticPost(route, "ocr"))) return;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        mode: "second",
        raw_ocr_text: "합성 사례에서 신뢰보호 요건과 대응 사실을 연결합니다.",
        raw_extraction_json: { source_status: "synthetic_fixture" },
        normalized_draft: {
          subject_guess: "감정평가 및 보상법규",
          case_title: "합성 신뢰보호 답안",
          case_summary: "합성 사례",
          reference_outline: "요건과 사실 적용",
          user_answer_summary: "합성 답안 요약",
          missing_issue: "요건과 대응 사실 연결",
          weak_sentence: "적용 문장을 보강합니다.",
          weak_structure_point: "요건과 사실을 같은 순서로 연결",
          rewrite_instruction: "연결 문장 한 문단을 다시 씁니다.",
          review_date_suggestion: syntheticCaptureReviewDate,
          needs_review: false,
        },
      }),
    });
  });
  await context.route("**/api/answer-review/structure", async (route) => {
    if (!(await exactSyntheticPost(route, "answer-review"))) return;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        draft: {
          questionSummary: "합성 브라우저 전용 문제",
          coreConcepts: ["합성 논점", "합성 기준"],
          strengths: ["논점 순서를 유지했습니다."],
          missingIssueCandidates: ["요건과 대응 사실의 연결"],
          requiredIssues: "신뢰보호 요건과 보호가치",
          userAnswerStructure: "논점에서 결론까지의 합성 구조",
          referenceStructure: "요건, 적용, 결론의 합성 참고 구조",
          weakLogicPoint: "대응 사실의 연결 근거",
          weakParagraphPoint: "적용 문단의 연결 문장",
          rewriteTarget: "요건과 대응 사실을 잇는 한 문단",
          rewriteDraftSuggestion:
            "합성 사실은 공적 견해표명에 대한 신뢰와 직접 연결됩니다.",
          nextAction: "연결 문장 한 문단을 직접 다시 씁니다.",
          caution: "공식 채점이나 합격 판단이 아닌 합성 학습 보조 결과입니다.",
        },
        learningSignalStatus: "skipped",
        referenceGrounding: { used: false, displayLabel: "", references: [] },
      }),
    });
  });
  await context.route(
    "**/api/os/calculator-routine/complete",
    async (route) => {
      if (!(await exactSyntheticPost(route, "calculator"))) return;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          status: "saved",
          learningRecordSaved: true,
          learningRecordId: "11111111-1111-4111-8111-111111111111",
          deduped: false,
        }),
      });
    },
  );
}

async function inspectSyntheticArtifactBoundary(
  page: Page,
  credential: VisualCredentialCandidate,
  proof: VisualProof,
): Promise<ArtifactBoundaryObservation> {
  const identitySelector =
    '[data-s224v-learner-mode-entry="second-only"] > span:last-child';
  const observation = await page.evaluate(
    ({ email, password, deniedCanary, identitySelector }) => {
      const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
      const uuidPattern =
        /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;
      const insideIdentityMask = (element: Element) =>
        element.matches(identitySelector) ||
        Boolean(element.closest(identitySelector));
      const visibleEmailOutsideMask = Array.from(
        document.querySelectorAll<HTMLElement>("body *"),
      ).filter((element) => {
        if (insideIdentityMask(element)) return false;
        const directText = Array.from(element.childNodes)
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent ?? "")
          .join(" ")
          .trim();
        if (!emailPattern.test(directText)) return false;
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== "none" &&
          style.visibility !== "hidden"
        );
      }).length;
      const serializedValues = Array.from(
        document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
          "input,textarea",
        ),
      )
        .map((control) => control.value)
        .join("\n");
      const html = document.documentElement.innerHTML;
      const rawEmailOutsideMask = Array.from(
        document.querySelectorAll<HTMLElement>("body *"),
      ).some((element) => {
        if (insideIdentityMask(element)) return false;
        const attributeText = Array.from(element.attributes)
          .map((attribute) => attribute.value)
          .join("\n");
        const directOwnText = Array.from(element.childNodes)
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent ?? "")
          .join("\n");
        const normalizedOwnText = directOwnText.trimStart();
        const isInlineNextFlightTransport =
          element instanceof HTMLScriptElement &&
          !element.hasAttribute("src") &&
          (normalizedOwnText.startsWith(
            "(self.__next_f=self.__next_f||[]).push(",
          ) || normalizedOwnText.startsWith("self.__next_f.push("));
        const ownText = isInlineNextFlightTransport ? "" : directOwnText;
        const value =
          element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement
            ? element.value
            : "";
        return [attributeText, ownText, value].some((entry) =>
          entry.includes(email),
        );
      });
      const rawCredentialArtifactCount =
        (password &&
        (html.includes(password) || serializedValues.includes(password))
          ? 1
          : 0) + (email && rawEmailOutsideMask ? 1 : 0);
      const visibleArtifactText = Array.from(
        document.querySelectorAll<HTMLElement>("body *"),
      )
        .filter((element) => {
          if (insideIdentityMask(element)) return false;
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return (
            rect.width > 0 &&
            rect.height > 0 &&
            style.display !== "none" &&
            style.visibility !== "hidden"
          );
        })
        .flatMap((element) => {
          const ownText = Array.from(element.childNodes)
            .filter((node) => node.nodeType === Node.TEXT_NODE)
            .map((node) => node.textContent ?? "");
          const value =
            element instanceof HTMLInputElement ||
            element instanceof HTMLTextAreaElement
              ? [element.value]
              : [];
          return [...ownText, ...value];
        })
        .join("\n");
      const rawIdentifierArtifactCount = uuidPattern.test(visibleArtifactText)
        ? 1
        : 0;
      const deniedCanaryDomCount =
        (html.includes(deniedCanary) ? 1 : 0) +
        (serializedValues.includes(deniedCanary) ? 1 : 0);
      const opaqueSurfaceCount = Array.from(
        document.querySelectorAll<HTMLElement>("canvas,iframe,object,embed"),
      ).filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== "none" &&
          style.visibility !== "hidden"
        );
      }).length;
      const identityMaskCount = Array.from(
        document.querySelectorAll<HTMLElement>(identitySelector),
      ).filter((element) => {
        const rect = element.getBoundingClientRect();
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          element.textContent?.includes(email)
        );
      }).length;
      return {
        visibleEmailOutsideMask,
        rawCredentialArtifactCount,
        rawIdentifierArtifactCount,
        deniedCanaryDomCount,
        opaqueSurfaceCount,
        identityMaskCount,
      };
    },
    {
      email: credential.email,
      password: credential.password,
      deniedCanary: proof.deniedCanary,
      identitySelector,
    },
  );
  return observation;
}

async function captureSyntheticScreenshot(
  page: Page,
  credential: VisualCredentialCandidate,
  proof: VisualProof,
  guard: EndpointGuardEvidence,
  failures: StableGateFailure[],
  metadata: {
    phase: StableGateFailure["phase"];
    routeStateAlias: string;
    viewport: string;
    fileName: string;
    fullPage?: boolean;
    identityMaskRequired: boolean;
  },
): Promise<ScreenshotEvidence | null> {
  const fail = (
    stableStep: StableGateFailure["stableStep"],
    errorFamily: StableGateFailure["errorFamily"],
    count = 1,
  ) =>
    recordStableGateFailure(failures, {
      phase: metadata.phase,
      routeStateAlias: metadata.routeStateAlias,
      viewport: metadata.viewport,
      stableStep,
      errorFamily,
      count,
    });
  const canonicalTop = await stabilizeCanonicalTop(page);
  if (canonicalTop.failureCode || canonicalTop.finalWindowScrollY !== 0) {
    fail("screenshot", "assertion");
    return null;
  }
  await removeKeyboardTraversalOrigin(page);
  const boundary = await inspectSyntheticArtifactBoundary(
    page,
    credential,
    proof,
  );
  if (boundary.visibleEmailOutsideMask > 0) {
    fail("privacy", "identity", boundary.visibleEmailOutsideMask);
  }
  if (boundary.rawCredentialArtifactCount > 0) {
    fail("privacy", "identity", boundary.rawCredentialArtifactCount);
  }
  if (boundary.rawIdentifierArtifactCount > 0) {
    fail("privacy", "identity", boundary.rawIdentifierArtifactCount);
  }
  if (boundary.deniedCanaryDomCount > 0) {
    fail("privacy", "canary", boundary.deniedCanaryDomCount);
  }
  if (boundary.opaqueSurfaceCount > 0) {
    fail("privacy", "opaque-surface", boundary.opaqueSurfaceCount);
  }
  if (metadata.identityMaskRequired && boundary.identityMaskCount === 0) {
    fail("privacy", "identity");
  }
  recordEndpointGuardFailures(
    failures,
    metadata.phase,
    metadata.routeStateAlias,
    metadata.viewport,
    guard,
  );
  if (
    guard.unknownEndpointCount > 0 ||
    guard.unknownRowCount > 0 ||
    guard.blockedMutationCount > 0
  ) {
    return null;
  }
  if (
    boundary.visibleEmailOutsideMask > 0 ||
    boundary.rawCredentialArtifactCount > 0 ||
    boundary.rawIdentifierArtifactCount > 0 ||
    boundary.deniedCanaryDomCount > 0 ||
    boundary.opaqueSurfaceCount > 0 ||
    (metadata.identityMaskRequired && boundary.identityMaskCount === 0)
  ) {
    return null;
  }

  const masks = [];
  const identity = page.locator(
    '[data-s224v-learner-mode-entry="second-only"] > span:last-child',
  );
  for (const surface of await identity.all()) {
    if (await surface.isVisible()) masks.push(surface);
  }
  const buffer = await page.screenshot({
    fullPage: metadata.fullPage ?? true,
    animations: "disabled",
    mask: masks,
    maskColor: "#000000",
  });
  return {
    fileName: metadata.fileName,
    buffer,
    boundary,
    guard: { ...guard },
    identityMaskRequired: metadata.identityMaskRequired,
  };
}

async function prepareInitialRoute(
  page: Page,
  route: RouteDefinition,
  requestedPath: string,
  viewport: (typeof viewports)[number],
) {
  await page.setViewportSize({
    width: viewport.width,
    height: viewport.height,
  });
  await gotoRequiredRoute(page, requestedPath);
  if (route.id === "calculator" && viewport.width === 390) {
    await advanceCalculatorToCasioInput(page);
  }
}

async function runIsolatedDynamicCandidate<T>({
  browser,
  credential,
  proof,
  failures,
  phase,
  routeStateAlias,
  run,
}: {
  browser: Browser;
  credential: VisualCredentialCandidate;
  proof: VisualProof;
  failures: StableGateFailure[];
  phase: "a11y" | "visual";
  routeStateAlias: string;
  run: (
    page: Page,
    guard: EndpointGuardEvidence,
    markAudit: () => void,
  ) => Promise<T>;
}): Promise<T | null> {
  let context: BrowserContext | null = null;
  let activeStep: StableGateFailure["stableStep"] = "preparation";
  try {
    context = await newPreviewContext(browser, runtimeBaseUrl);
    const page = await context.newPage();
    await establishProtectedPreviewSession(page, "S232H2 isolated dynamic");
    await loginWithExplicitTestAccountSession(
      page,
      credential,
      runtimeBaseUrl,
      "second",
    );
    await verifyRuntimeVersion(page, runtimeRunnerSha);
    const guard = await blockUnexpectedLearnerMutation(
      context,
      proof.fixtureIds,
    );
    await installDeterministicVisualMocks(context);
    const runtimeErrors = monitorPageRuntime(
      page,
      new URL(runtimeBaseUrl).origin,
    );
    const result = await run(page, guard, () => {
      activeStep = "audit";
    });
    await settleRuntimeMonitors(page);
    const errorCount =
      runtimeErrors.consoleErrors.length +
      runtimeErrors.pageErrors.length +
      runtimeErrors.sameOriginRequestFailures.length;
    if (errorCount > 0) {
      recordStableGateFailure(failures, {
        phase,
        routeStateAlias,
        viewport: "390x844",
        stableStep: "audit",
        errorFamily: "unexpected",
        count: errorCount,
      });
    }
    return result;
  } catch (error) {
    recordStableGateFailure(failures, {
      phase,
      routeStateAlias,
      viewport: "390x844",
      stableStep: activeStep,
      errorFamily: stableErrorFamily(error),
    });
    return null;
  } finally {
    if (context) {
      try {
        await context.unrouteAll({ behavior: "wait" });
      } catch (error) {
        recordStableGateFailure(failures, {
          phase,
          routeStateAlias,
          viewport: "390x844",
          stableStep: "cleanup",
          errorFamily: stableErrorFamily(error),
        });
      }
      try {
        await context.close();
      } catch (error) {
        recordStableGateFailure(failures, {
          phase,
          routeStateAlias,
          viewport: "390x844",
          stableStep: "cleanup",
          errorFamily: stableErrorFamily(error),
        });
      }
    }
  }
}

async function runVisualCandidate({
  page,
  credential,
  proof,
  guard,
  failures,
  phase,
  routeStateAlias,
  viewport,
  fileName,
  fullPage,
  identityMaskRequired,
  prepare,
  cleanup,
}: {
  page: Page;
  credential: VisualCredentialCandidate;
  proof: VisualProof;
  guard: EndpointGuardEvidence;
  failures: StableGateFailure[];
  phase: StableGateFailure["phase"];
  routeStateAlias: string;
  viewport: string;
  fileName: string;
  fullPage?: boolean;
  identityMaskRequired: boolean;
  prepare: () => Promise<void>;
  cleanup?: () => Promise<void>;
}) {
  let screenshot: ScreenshotEvidence | null = null;
  let prepared = false;
  try {
    await prepare();
    prepared = true;
    screenshot = await captureSyntheticScreenshot(
      page,
      credential,
      proof,
      guard,
      failures,
      {
        phase,
        routeStateAlias,
        viewport,
        fileName,
        fullPage,
        identityMaskRequired,
      },
    );
  } catch (error) {
    recordStableGateFailure(failures, {
      phase,
      routeStateAlias,
      viewport,
      stableStep: prepared ? "screenshot" : "preparation",
      errorFamily: stableErrorFamily(error),
    });
  } finally {
    try {
      await removeKeyboardTraversalOrigin(page);
    } catch (error) {
      recordStableGateFailure(failures, {
        phase,
        routeStateAlias,
        viewport,
        stableStep: "cleanup",
        errorFamily: stableErrorFamily(error),
      });
    }
    if (cleanup) {
      try {
        await cleanup();
      } catch (error) {
        recordStableGateFailure(failures, {
          phase,
          routeStateAlias,
          viewport,
          stableStep: "cleanup",
          errorFamily: stableErrorFamily(error),
        });
      }
    }
  }
  return screenshot;
}

async function closeSharedContext(
  context: BrowserContext | null,
  failures: StableGateFailure[],
  phase: StableGateFailure["phase"],
  routeStateAlias: string,
) {
  if (!context) return;
  for (const closeStep of [
    () => context.unrouteAll({ behavior: "wait" }),
    () => context.close(),
  ]) {
    try {
      await closeStep();
    } catch (error) {
      recordStableGateFailure(failures, {
        phase,
        routeStateAlias,
        viewport: "all",
        stableStep: "cleanup",
        errorFamily: stableErrorFamily(error),
      });
    }
  }
}

async function advanceCalculatorToCasioInput(page: Page) {
  await page.evaluate(() => window.sessionStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForStableRender(page);
  await settleRuntimeMonitors(page);

  const trainer = page.locator("[data-calculator-routine-trainer]");
  await expect(trainer).toBeVisible();
  await expect(trainer).toHaveAttribute(
    "data-calculator-routine-view-state",
    "empty",
    { timeout: 20_000 },
  );

  const focusStart = page.getByTestId("calculator-focus-action-control");
  if ((await focusStart.count()) === 1 && (await focusStart.isVisible())) {
    await focusStart.click();
  } else {
    await trainer
      .getByRole("button", { name: /계산(?:형 문제라면|·검산).*루틴 시작/ })
      .click();
  }

  for (const stepId of ["conditions", "formula", "numbers_units"] as const) {
    const active = trainer.locator(
      `[data-calculator-routine-active-step="${stepId}"]`,
    );
    await expect(active).toBeVisible();
    await active
      .locator("textarea")
      .fill(calculatorCasioFixtureEntries[stepId]);

    const focusNext = page.getByTestId("calculator-focus-action-control");
    if ((await focusNext.count()) === 1 && (await focusNext.isVisible())) {
      await expect(focusNext).toBeEnabled();
      await focusNext.click();
    } else {
      const next = trainer.getByRole("button", { name: /^다음 ·/ });
      await expect(next).toBeEnabled();
      await next.click();
    }
  }

  const casio = trainer.locator(
    '[data-calculator-routine-active-step="casio_input"]',
  );
  await expect(casio).toBeVisible();
  await casio.locator("textarea").fill(calculatorCasioFixtureInput);
  await expect(
    casio.locator('[data-v3-component="CalculatorStep"]'),
  ).toBeVisible();
}

async function compareScreenshotToFigmaReference(
  page: Page,
  testInfo: TestInfo,
  actual: ScreenshotEvidence,
  reference: (typeof figmaReferences)[number],
): Promise<FigmaComparison> {
  const referenceBuffer = await readFile(
    testInfo.snapshotPath(reference.snapshotName),
  );
  await writeFile(
    testInfo.outputPath(reference.referenceFileName),
    referenceBuffer,
  );
  const metrics = await page.evaluate(
    async ({ actualBase64, referenceBase64, node }) => {
      const decode = async (base64: string) => {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1)
          bytes[index] = binary.charCodeAt(index);
        return createImageBitmap(new Blob([bytes], { type: "image/png" }));
      };
      const [actualImage, referenceImage] = await Promise.all([
        decode(actualBase64),
        decode(referenceBase64),
      ]);
      const sampleWidth = 192;
      const sampleHeight = Math.max(
        64,
        Math.round(
          sampleWidth * (referenceImage.height / referenceImage.width),
        ),
      );
      const sample = (image: ImageBitmap) => {
        const canvas = document.createElement("canvas");
        canvas.width = sampleWidth;
        canvas.height = sampleHeight;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context)
          throw new Error(
            "Canvas 2D context is required for the Figma comparison.",
          );
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.drawImage(image, 0, 0, sampleWidth, sampleHeight);
        return context.getImageData(0, 0, sampleWidth, sampleHeight).data;
      };
      const actualPixels = sample(actualImage);
      const referencePixels = sample(referenceImage);
      let colorDeltaSum = 0;
      let nearPixels = 0;
      let actualDark = 0;
      let referenceDark = 0;
      let actualWarm = 0;
      let referenceWarm = 0;
      let actualBlue = 0;
      let referenceBlue = 0;
      const pixelCount = actualPixels.length / 4;
      const classify = (red: number, green: number, blue: number) => ({
        dark: (red + green + blue) / 3 < 105,
        warm: red - blue > 18 && red >= green && green > blue,
        blue: blue - red > 10 || (blue > green && green - red > 4),
      });
      for (let offset = 0; offset < actualPixels.length; offset += 4) {
        const delta =
          (Math.abs(actualPixels[offset] - referencePixels[offset]) +
            Math.abs(actualPixels[offset + 1] - referencePixels[offset + 1]) +
            Math.abs(actualPixels[offset + 2] - referencePixels[offset + 2])) /
          765;
        colorDeltaSum += delta;
        if (delta <= 0.14) nearPixels += 1;
        const actualClass = classify(
          actualPixels[offset],
          actualPixels[offset + 1],
          actualPixels[offset + 2],
        );
        const referenceClass = classify(
          referencePixels[offset],
          referencePixels[offset + 1],
          referencePixels[offset + 2],
        );
        if (actualClass.dark) actualDark += 1;
        if (referenceClass.dark) referenceDark += 1;
        if (actualClass.warm) actualWarm += 1;
        if (referenceClass.warm) referenceWarm += 1;
        if (actualClass.blue) actualBlue += 1;
        if (referenceClass.blue) referenceBlue += 1;
      }
      const ratioDelta = (left: number, right: number) =>
        Math.abs(left / pixelCount - right / pixelCount);

      const normalized = (pixels: Uint8ClampedArray) => {
        const red = new Float64Array(pixelCount);
        const green = new Float64Array(pixelCount);
        const blue = new Float64Array(pixelCount);
        const luminance = new Float64Array(pixelCount);
        for (let pixel = 0; pixel < pixelCount; pixel += 1) {
          const offset = pixel * 4;
          red[pixel] = pixels[offset] / 255;
          green[pixel] = pixels[offset + 1] / 255;
          blue[pixel] = pixels[offset + 2] / 255;
          luminance[pixel] =
            0.2126 * red[pixel] + 0.7152 * green[pixel] + 0.0722 * blue[pixel];
        }
        const edges = new Uint8Array(pixelCount);
        for (let y = 1; y < sampleHeight - 1; y += 1) {
          for (let x = 1; x < sampleWidth - 1; x += 1) {
            const index = y * sampleWidth + x;
            const energy =
              Math.abs(luminance[index + 1] - luminance[index - 1]) +
              Math.abs(
                luminance[index + sampleWidth] - luminance[index - sampleWidth],
              );
            if (energy > 0.11) edges[index] = 1;
          }
        }
        return { red, green, blue, luminance, edges };
      };
      const actualNormalized = normalized(actualPixels);
      const referenceNormalized = normalized(referencePixels);
      const gridColumns = node === "59:62" ? 12 : 6;
      const gridRows = node === "59:62" ? 8 : 12;
      type RegionFeature = {
        rgb: [number, number, number];
        occupancy: [number, number, number];
        luminanceStd: number;
        edgeDensity: number;
      };
      const regionFeature = (
        values: ReturnType<typeof normalized>,
        x0: number,
        y0: number,
        x1: number,
        y1: number,
      ): RegionFeature => {
        let count = 0;
        let sumRed = 0;
        let sumGreen = 0;
        let sumBlue = 0;
        let sumLuminance = 0;
        let sumLuminanceSquared = 0;
        let dark = 0;
        let warm = 0;
        let blue = 0;
        let edge = 0;
        for (let y = Math.max(0, y0); y < Math.min(sampleHeight, y1); y += 1) {
          for (let x = Math.max(0, x0); x < Math.min(sampleWidth, x1); x += 1) {
            const index = y * sampleWidth + x;
            const red = values.red[index];
            const green = values.green[index];
            const blueValue = values.blue[index];
            const luminance = values.luminance[index];
            count += 1;
            sumRed += red;
            sumGreen += green;
            sumBlue += blueValue;
            sumLuminance += luminance;
            sumLuminanceSquared += luminance * luminance;
            if (luminance < 0.58) dark += 1;
            if (red - blueValue > 0.08 && red >= green) warm += 1;
            if (blueValue - red > 0.04 && blueValue >= green) blue += 1;
            edge += values.edges[index];
          }
        }
        const divisor = Math.max(1, count);
        const meanLuminance = sumLuminance / divisor;
        return {
          rgb: [sumRed / divisor, sumGreen / divisor, sumBlue / divisor],
          occupancy: [dark / divisor, warm / divisor, blue / divisor],
          luminanceStd: Math.sqrt(
            Math.max(0, sumLuminanceSquared / divisor - meanLuminance ** 2),
          ),
          edgeDensity: edge / divisor,
        };
      };
      const gridFeatures = (values: ReturnType<typeof normalized>) => {
        const features: RegionFeature[] = [];
        for (let row = 0; row < gridRows; row += 1) {
          for (let column = 0; column < gridColumns; column += 1) {
            features.push(
              regionFeature(
                values,
                Math.round((column * sampleWidth) / gridColumns),
                Math.round((row * sampleHeight) / gridRows),
                Math.round(((column + 1) * sampleWidth) / gridColumns),
                Math.round(((row + 1) * sampleHeight) / gridRows),
              ),
            );
          }
        }
        return features;
      };
      const actualGrid = gridFeatures(actualNormalized);
      const referenceGrid = gridFeatures(referenceNormalized);
      let cellRgbDelta = 0;
      let cellOccupancyDelta = 0;
      for (let index = 0; index < actualGrid.length; index += 1) {
        for (let channel = 0; channel < 3; channel += 1) {
          cellRgbDelta += Math.abs(
            actualGrid[index].rgb[channel] - referenceGrid[index].rgb[channel],
          );
          cellOccupancyDelta += Math.abs(
            actualGrid[index].occupancy[channel] -
              referenceGrid[index].occupancy[channel],
          );
        }
      }
      const cellRgbMeanAbsoluteError = cellRgbDelta / (actualGrid.length * 3);
      const cellOccupancyMeanAbsoluteError =
        cellOccupancyDelta / (actualGrid.length * 3);
      const actualEdgeGrid = actualGrid.map((feature) => feature.edgeDensity);
      const referenceEdgeGrid = referenceGrid.map(
        (feature) => feature.edgeDensity,
      );
      const correlation = (left: number[], right: number[]) => {
        const leftMean =
          left.reduce((sum, value) => sum + value, 0) / left.length;
        const rightMean =
          right.reduce((sum, value) => sum + value, 0) / right.length;
        let covariance = 0;
        let leftVariance = 0;
        let rightVariance = 0;
        for (let index = 0; index < left.length; index += 1) {
          const leftCentered = left[index] - leftMean;
          const rightCentered = right[index] - rightMean;
          covariance += leftCentered * rightCentered;
          leftVariance += leftCentered ** 2;
          rightVariance += rightCentered ** 2;
        }
        if (leftVariance === 0 || rightVariance === 0) return 0;
        return covariance / Math.sqrt(leftVariance * rightVariance);
      };
      const edgeGridCorrelation = correlation(
        actualEdgeGrid,
        referenceEdgeGrid,
      );
      const actualEdgeEnergy = actualNormalized.edges.reduce(
        (sum, value) => sum + value,
        0,
      );
      const referenceEdgeEnergy = referenceNormalized.edges.reduce(
        (sum, value) => sum + value,
        0,
      );
      const edgeEnergyRatio =
        referenceEdgeEnergy > 0 ? actualEdgeEnergy / referenceEdgeEnergy : 0;
      const hasDilatedNeighbor = (edges: Uint8Array, index: number) => {
        const y = Math.floor(index / sampleWidth);
        const x = index % sampleWidth;
        for (let yOffset = -1; yOffset <= 1; yOffset += 1) {
          for (let xOffset = -1; xOffset <= 1; xOffset += 1) {
            const nextX = x + xOffset;
            const nextY = y + yOffset;
            if (
              nextX >= 0 &&
              nextX < sampleWidth &&
              nextY >= 0 &&
              nextY < sampleHeight &&
              edges[nextY * sampleWidth + nextX] === 1
            )
              return true;
          }
        }
        return false;
      };
      let actualMatched = 0;
      let referenceMatched = 0;
      for (let index = 0; index < pixelCount; index += 1) {
        if (
          actualNormalized.edges[index] &&
          hasDilatedNeighbor(referenceNormalized.edges, index)
        )
          actualMatched += 1;
        if (
          referenceNormalized.edges[index] &&
          hasDilatedNeighbor(actualNormalized.edges, index)
        )
          referenceMatched += 1;
      }
      const edgePrecision =
        actualEdgeEnergy > 0 ? actualMatched / actualEdgeEnergy : 0;
      const edgeRecall =
        referenceEdgeEnergy > 0 ? referenceMatched / referenceEdgeEnergy : 0;
      const dilatedEdgeF1 =
        edgePrecision + edgeRecall > 0
          ? (2 * edgePrecision * edgeRecall) / (edgePrecision + edgeRecall)
          : 0;

      const anchorsByNode: Record<
        string,
        Array<[number, number, number, number]>
      > = {
        "56:2": [
          [0, 0, 390, 56],
          [20, 210, 370, 282],
          [20, 303, 370, 444],
          [20, 513, 370, 702],
          [0, 729, 390, 844],
          [20, 770, 370, 822],
        ],
        "59:62": [
          [0, 0, 1440, 73],
          [220, 258, 900, 330],
          [220, 351, 900, 481],
          [220, 551, 900, 741],
          [932, 112, 1220, 292],
          [932, 312, 1220, 572],
          [932, 592, 1220, 847],
          [220, 786, 520, 838],
        ],
        "57:34": [
          [0, 0, 390, 56],
          [20, 193, 370, 264],
          [20, 285, 370, 664],
          [44, 343, 346, 466],
          [44, 478, 346, 565],
          [44, 577, 346, 623],
          [0, 729, 390, 844],
          [20, 770, 370, 822],
        ],
      };
      const sourceWidth = referenceImage.width;
      const sourceHeight = referenceImage.height;
      const scaleAnchor = ([x0, y0, x1, y1]: [
        number,
        number,
        number,
        number,
      ]) =>
        [
          Math.round((x0 * sampleWidth) / sourceWidth),
          Math.round((y0 * sampleHeight) / sourceHeight),
          Math.round((x1 * sampleWidth) / sourceWidth),
          Math.round((y1 * sampleHeight) / sourceHeight),
        ] as const;
      let anchorMaxRgbMeanDelta = 0;
      let anchorMaxLuminanceStdDelta = 0;
      let anchorMaxDarkRatioDelta = 0;
      let anchorMinEdgeDensityRatio = Number.POSITIVE_INFINITY;
      let anchorMaxEdgeDensityRatio = 0;
      for (const anchor of anchorsByNode[node] ?? []) {
        const [x0, y0, x1, y1] = scaleAnchor(anchor);
        const actualFeature = regionFeature(actualNormalized, x0, y0, x1, y1);
        const referenceFeature = regionFeature(
          referenceNormalized,
          x0,
          y0,
          x1,
          y1,
        );
        anchorMaxRgbMeanDelta = Math.max(
          anchorMaxRgbMeanDelta,
          ...actualFeature.rgb.map((value, index) =>
            Math.abs(value - referenceFeature.rgb[index]),
          ),
        );
        anchorMaxLuminanceStdDelta = Math.max(
          anchorMaxLuminanceStdDelta,
          Math.abs(actualFeature.luminanceStd - referenceFeature.luminanceStd),
        );
        anchorMaxDarkRatioDelta = Math.max(
          anchorMaxDarkRatioDelta,
          Math.abs(actualFeature.occupancy[0] - referenceFeature.occupancy[0]),
        );
        const edgeRatio =
          referenceFeature.edgeDensity > 0
            ? actualFeature.edgeDensity / referenceFeature.edgeDensity
            : 0;
        anchorMinEdgeDensityRatio = Math.min(
          anchorMinEdgeDensityRatio,
          edgeRatio,
        );
        anchorMaxEdgeDensityRatio = Math.max(
          anchorMaxEdgeDensityRatio,
          edgeRatio,
        );
      }
      if (!Number.isFinite(anchorMinEdgeDensityRatio))
        anchorMinEdgeDensityRatio = 0;
      return {
        actualWidth: actualImage.width,
        actualHeight: actualImage.height,
        referenceWidth: referenceImage.width,
        referenceHeight: referenceImage.height,
        meanColorDelta: colorDeltaSum / pixelCount,
        nearPixelRatio: nearPixels / pixelCount,
        darkPixelRatioDelta: ratioDelta(actualDark, referenceDark),
        warmPixelRatioDelta: ratioDelta(actualWarm, referenceWarm),
        bluePixelRatioDelta: ratioDelta(actualBlue, referenceBlue),
        cellRgbMeanAbsoluteError,
        cellOccupancyMeanAbsoluteError,
        edgeGridCorrelation,
        edgeEnergyRatio,
        dilatedEdgeF1,
        anchorMaxRgbMeanDelta,
        anchorMaxLuminanceStdDelta,
        anchorMaxDarkRatioDelta,
        anchorMinEdgeDensityRatio,
        anchorMaxEdgeDensityRatio,
      };
    },
    {
      actualBase64: actual.buffer.toString("base64"),
      referenceBase64: referenceBuffer.toString("base64"),
      node: reference.node,
    },
  );

  expect
    .soft(metrics.actualWidth, `${reference.node} actual width`)
    .toBe(metrics.referenceWidth);
  expect
    .soft(metrics.actualHeight, `${reference.node} actual height`)
    .toBe(metrics.referenceHeight);
  expect
    .soft(
      metrics.meanColorDelta,
      `${reference.node} mean canonical-pixel delta`,
    )
    .toBeLessThanOrEqual(0.18);
  expect
    .soft(
      metrics.nearPixelRatio,
      `${reference.node} near-canonical pixel ratio`,
    )
    .toBeGreaterThanOrEqual(0.5);
  expect
    .soft(
      metrics.darkPixelRatioDelta,
      `${reference.node} quiet-navy distribution`,
    )
    .toBeLessThanOrEqual(0.09);
  expect
    .soft(
      metrics.warmPixelRatioDelta,
      `${reference.node} recovery-cue distribution`,
    )
    .toBeLessThanOrEqual(0.09);
  expect
    .soft(
      metrics.bluePixelRatioDelta,
      `${reference.node} evidence-blue distribution`,
    )
    .toBeLessThanOrEqual(0.12);
  expect
    .soft(
      metrics.cellRgbMeanAbsoluteError,
      `${reference.node} spatial RGB grid`,
    )
    .toBeLessThanOrEqual(0.1);
  expect
    .soft(
      metrics.cellOccupancyMeanAbsoluteError,
      `${reference.node} spatial semantic-color grid`,
    )
    .toBeLessThanOrEqual(0.12);
  expect
    .soft(
      metrics.edgeGridCorrelation,
      `${reference.node} spatial edge-grid correlation`,
    )
    .toBeGreaterThanOrEqual(0.5);
  expect
    .soft(metrics.edgeEnergyRatio, `${reference.node} edge-energy lower bound`)
    .toBeGreaterThanOrEqual(0.4);
  expect
    .soft(metrics.edgeEnergyRatio, `${reference.node} edge-energy upper bound`)
    .toBeLessThanOrEqual(2.2);
  expect
    .soft(metrics.dilatedEdgeF1, `${reference.node} spatial edge overlap`)
    .toBeGreaterThanOrEqual(0.25);
  expect
    .soft(
      metrics.anchorMaxRgbMeanDelta,
      `${reference.node} anchor RGB geometry`,
    )
    .toBeLessThanOrEqual(0.18);
  expect
    .soft(
      metrics.anchorMaxLuminanceStdDelta,
      `${reference.node} anchor contrast geometry`,
    )
    .toBeLessThanOrEqual(0.18);
  expect
    .soft(
      metrics.anchorMaxDarkRatioDelta,
      `${reference.node} anchor dark occupancy`,
    )
    .toBeLessThanOrEqual(0.2);
  expect
    .soft(
      metrics.anchorMinEdgeDensityRatio,
      `${reference.node} anchor edge lower bound`,
    )
    .toBeGreaterThanOrEqual(0.2);
  expect
    .soft(
      metrics.anchorMaxEdgeDensityRatio,
      `${reference.node} anchor edge upper bound`,
    )
    .toBeLessThanOrEqual(3.5);
  const passed =
    metrics.actualWidth === metrics.referenceWidth &&
    metrics.actualHeight === metrics.referenceHeight &&
    metrics.meanColorDelta <= 0.18 &&
    metrics.nearPixelRatio >= 0.5 &&
    metrics.darkPixelRatioDelta <= 0.09 &&
    metrics.warmPixelRatioDelta <= 0.09 &&
    metrics.bluePixelRatioDelta <= 0.12 &&
    metrics.cellRgbMeanAbsoluteError <= 0.1 &&
    metrics.cellOccupancyMeanAbsoluteError <= 0.12 &&
    metrics.edgeGridCorrelation >= 0.5 &&
    metrics.edgeEnergyRatio >= 0.4 &&
    metrics.edgeEnergyRatio <= 2.2 &&
    metrics.dilatedEdgeF1 >= 0.25 &&
    metrics.anchorMaxRgbMeanDelta <= 0.18 &&
    metrics.anchorMaxLuminanceStdDelta <= 0.18 &&
    metrics.anchorMaxDarkRatioDelta <= 0.2 &&
    metrics.anchorMinEdgeDensityRatio >= 0.2 &&
    metrics.anchorMaxEdgeDensityRatio <= 3.5;
  expect
    .soft(
      passed,
      `${reference.node} must satisfy every direct Figma comparison threshold.`,
    )
    .toBe(true);

  return {
    node: reference.node,
    route: reference.route,
    actualFileName: actual.fileName,
    referenceFileName: reference.referenceFileName,
    ...metrics,
    passed,
  };
}

async function prepareCaptureExtractionPreview(page: Page) {
  await gotoRequiredRoute(page, "/app/capture?mode=second");
  await page.evaluate(() => {
    for (const key of Object.keys(window.localStorage)) {
      if (
        key.startsWith("inverge:review-os:") &&
        key.includes(":capture-draft:second")
      ) {
        window.localStorage.removeItem(key);
      }
    }
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForStableRender(page);
  await settleRuntimeMonitors(page);
  await page.getByText("다른 입력 방식", { exact: true }).click();
  await page
    .getByRole("button", { name: "텍스트 붙여넣기", exact: true })
    .click();
  await page
    .getByLabel("오늘 공부한 내용 또는 내 답안")
    .fill(
      "합성 사례 메모입니다. 내 답안은 신뢰보호 요건과 대응 사실을 차례로 연결합니다.",
    );
  await page.getByTestId("capture-save-primary").click();
  await expect(
    page.locator("[data-v3-capture-extraction-preview]"),
  ).toBeVisible({ timeout: 20_000 });
  await expect(
    page.locator('[data-s232e-capture-stage="preview"]'),
  ).toBeVisible();
}

async function prepareAnswerReviewResult(page: Page) {
  await gotoRequiredRoute(page, "/answer-review?mode=second");
  await page
    .getByTestId("answer-review-my-answer-input")
    .fill("합성 답안입니다. 논점, 기준, 적용, 결론 순서로 직접 작성했습니다.");
  await page.getByTestId("answer-review-start").click();
  await expect(
    page.locator('[data-s232e4-answer-review-result="one-gap-first"]'),
  ).toBeVisible({ timeout: 20_000 });
}

async function prepareReviewSelectedState(
  page: Page,
  expectedPrimaryTitle: string,
) {
  await gotoRequiredRoute(page, "/app/review?mode=second");
  const queue = page.locator("[data-s232d4-review-queue]");
  await expect(queue).toBeVisible({ timeout: 20_000 });
  await expect(queue.locator("[data-s232d4-review-meta] h2")).toHaveText(
    expectedPrimaryTitle,
  );
  await queue
    .getByLabel("복습 전 먼저 떠올린 내용")
    .fill("합성 회상: 요건과 대응 사실을 먼저 연결합니다.");
  await queue.getByRole("button", { name: "확인하기", exact: true }).click();
  const selected = queue.locator('[data-review-recall-outcome="fuzzy"]');
  await selected.click();
  await expect(selected).toHaveAttribute("data-v3-selected", "true");
  await expect(
    queue.locator("[data-review-interval-suggestion]"),
  ).toBeVisible();
}

async function clickCalculatorFocusAction(page: Page) {
  const action = page.getByTestId("calculator-focus-action-control");
  await expect(action).toBeVisible();
  await expect(action).toBeEnabled();
  await action.click();
}

async function completeCalculatorRoutine(page: Page) {
  const trainer = page.locator("[data-calculator-routine-trainer]");
  await clickCalculatorFocusAction(page);
  for (const stepId of [
    "display_value",
    "answer_value",
    "unit_rounding",
  ] as const) {
    const active = trainer.locator(
      `[data-calculator-routine-active-step="${stepId}"]`,
    );
    await expect(active).toBeVisible();
    await active
      .locator("textarea")
      .fill(calculatorCompletionFixtureEntries[stepId]);
    await clickCalculatorFocusAction(page);
  }
  const verification = trainer.locator(
    '[data-calculator-routine-active-step="verification"]',
  );
  await expect(verification).toBeVisible();
  await verification.getByLabel("역산", { exact: true }).check();
  await clickCalculatorFocusAction(page);
  const mistake = trainer.locator(
    '[data-calculator-routine-active-step="mistake_type"]',
  );
  await expect(mistake).toBeVisible();
  await mistake.getByLabel("실수 없음", { exact: true }).check();
  await clickCalculatorFocusAction(page);
  await expect(trainer).toHaveAttribute(
    "data-calculator-routine-state",
    "completed",
    { timeout: 20_000 },
  );
  await expect(
    page.locator('[data-calculator-routine-sync-state="saved"]'),
  ).toBeVisible({ timeout: 20_000 });
}

async function newPreviewContext(browser: Browser, baseURL: string) {
  return browser.newContext({
    baseURL,
    extraHTTPHeaders: {
      ...protectionHeaders,
      "x-s232h2-audit-sha":
        baseURL === baselineUrl ? baselineSha : runtimeRunnerSha,
    },
    viewport: { width: 390, height: 844 },
    recordVideo: undefined,
  });
}

function allErrorCounts(...groups: RuntimeErrorEvidence[]) {
  return {
    consoleErrors: groups.flatMap((group) => group.consoleErrors),
    pageErrors: groups.flatMap((group) => group.pageErrors),
    sameOriginRequestFailures: groups.flatMap(
      (group) => group.sameOriginRequestFailures,
    ),
  };
}

test("@a11y S232H.2 deterministic focus-origin micro-fixture", async ({
  page,
}) => {
  test.setTimeout(15_000);
  const fixture = async ({
    skipCount = 1,
    beforeControl = false,
    skipAttributes = "",
    focusRule = "top:0;outline:3px solid rgb(18,44,70)",
    width = 44,
    height = 44,
    activation = true,
    laterControlCount = 36,
  }: {
    skipCount?: number;
    beforeControl?: boolean;
    skipAttributes?: string;
    focusRule?: string;
    width?: number;
    height?: number;
    activation?: boolean;
    laterControlCount?: number;
  } = {}) => {
    const skips = Array.from(
      { length: skipCount },
      (_, index) =>
        `<a class="skip" data-v3-skip-link href="#main" ${skipAttributes}>skip-${index}</a>`,
    ).join("");
    const controls = Array.from(
      { length: laterControlCount },
      (_, index) => `<button id="control-${index}">control-${index}</button>`,
    ).join("");
    await page.setContent(`
      <style>
        * { box-sizing: border-box; }
        .skip {
          position: fixed;
          top: -80px;
          left: 0;
          display: block;
          width: ${width}px;
          height: ${height}px;
          padding: 0;
          border: 0;
          overflow: hidden;
          font-size: 0;
          outline: none;
          box-shadow: none;
        }
        .skip:focus-visible { ${focusRule}; }
      </style>
      ${beforeControl ? '<button id="before">before</button>' : ""}
      ${skips}
      ${controls}
      <main id="main" tabindex="-1">main</main>
      <script>
        for (const link of document.querySelectorAll('[data-v3-skip-link]')) {
          if (${activation ? "true" : "false"}) {
            link.addEventListener('click', () => {
              document.getElementById('main')?.focus({ preventScroll: true });
            });
          } else {
            link.addEventListener('click', (event) => event.preventDefault());
          }
        }
      </script>
    `);
    if (laterControlCount > 0) {
      await page.locator(`#control-${laterControlCount - 1}`).click();
      await page.evaluate(() => {
        if (document.activeElement instanceof HTMLElement)
          document.activeElement.blur();
      });
    }
    const start = await beginKeyboardTraversalAtDocumentStart(page);
    const activated = await activateCanonicalSkipLink(page);
    const measurement = {
      ...start,
      activationMovedFocus: activated.activationMovedFocus,
    };
    return {
      measurement,
      failures: skipLinkFailureCodes(measurement),
      originCount: await page.locator(`[${focusOriginAttribute}]`).count(),
    };
  };

  const success = await fixture();
  expect(success.failures).toEqual([]);
  expect(success.measurement).toMatchObject({
    skipLinkCount: 1,
    reachedByKeyboard: true,
    focusVisible: true,
    focusIndicatorPresent: true,
    boundingBoxPresent: true,
    inViewport: true,
    width: 44,
    height: 44,
    activationMovedFocus: true,
    originRemoved: true,
  });
  expect(success.originCount).toBe(0);

  expect((await fixture({ beforeControl: true })).failures).toEqual([
    "S232H2_SKIP_LINK_NOT_FIRST_TAB_STOP",
  ]);
  for (const skipCount of [0, 2])
    expect((await fixture({ skipCount })).failures).toEqual([
      "S232H2_SKIP_LINK_COUNT_INVALID",
    ]);
  for (const skipAttributes of ['tabindex="-1"', "inert"])
    expect((await fixture({ skipAttributes })).failures).toContain(
      "S232H2_SKIP_LINK_NOT_FIRST_TAB_STOP",
    );
  expect(
    (
      await fixture({
        focusRule: "top:900px;outline:3px solid rgb(18,44,70)",
      })
    ).failures,
  ).toContain("S232H2_SKIP_LINK_NOT_FULLY_IN_VIEWPORT");
  expect((await fixture({ width: 0, height: 0 })).failures).toContain(
    "S232H2_SKIP_LINK_NO_RENDERED_BOX",
  );
  for (const [width, height] of [
    [43, 48],
    [48, 43],
  ] as const)
    expect((await fixture({ width, height })).failures).toContain(
      "S232H2_SKIP_LINK_TARGET_BELOW_44",
    );
  expect((await fixture({ width: 44, height: 44 })).failures).toEqual([]);
  expect(
    (
      await fixture({
        focusRule: "top:0;outline:none;box-shadow:none",
      })
    ).failures,
  ).toContain("S232H2_SKIP_LINK_FOCUS_INDICATOR_MISSING");
  expect((await fixture({ activation: false })).failures).toContain(
    "S232H2_SKIP_LINK_ACTIVATION_FAILED",
  );
  for (const invalidFixture of [
    await fixture({ beforeControl: true }),
    await fixture({ skipCount: 0 }),
    await fixture({ width: 0, height: 0 }),
  ]) {
    expect(invalidFixture.measurement.originRemoved).toBe(true);
    expect(invalidFixture.originCount).toBe(0);
  }
});

test("@privacy S232H.2 privacy/auth source gate", async ({ browser }) => {
  test.setTimeout(170_000);
  requireSafeVisualRuntime();
  if (visualCredentialCandidates.length !== 2) cleanVisualAccountRequired();

  const handles = await Promise.all(
    visualCredentialCandidates.map((credential) =>
      openCandidateHandle(browser, credential),
    ),
  );
  const cleanupFailures: StableGateFailure[] = [];
  let proof: VisualProof | null = null;
  try {
    if (handles.some((handle) => !handle.completed)) {
      throw new Error("S232H2_PRIVACY_SOURCE_AUDIT_INCOMPLETE");
    }
    const selected = selectCleanVisualAccount(handles);
    if (!selected?.audit || !selected.page) cleanVisualAccountRequired();
    const denied = handles.find(
      (candidate) =>
        candidate.credential.slot !== selected.credential.slot &&
        candidate.page &&
        candidate.audit?.sessionBound &&
        candidate.audit.sessionFingerprint !==
          selected.audit.sessionFingerprint &&
        candidate.audit.itemIds.some((itemId) =>
          /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(itemId),
        ),
    );
    if (!denied?.page || !denied.audit) {
      throw new Error("S232H2_CROSS_ACCOUNT_GATE_OPEN");
    }
    const deniedCanary = denied.audit.itemIds.find((itemId) =>
      /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(itemId),
    );
    if (!deniedCanary) {
      throw new Error("S232H2_CROSS_ACCOUNT_GATE_OPEN");
    }

    const ownerRead = await readRlsProbe(denied.page, deniedCanary);
    const deniedRead = await readRlsProbe(selected.page, deniedCanary);
    let deniedCanaryDomCount = 0;
    try {
      await gotoRequiredRoute(selected.page, "/app?mode=second");
      deniedCanaryDomCount = await selected.page.evaluate(
        (canary) =>
          document.documentElement.innerHTML.includes(canary) ||
          Array.from(
            document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
              "input,textarea",
            ),
          ).some((control) => control.value.includes(canary))
            ? 1
            : 0,
        deniedCanary,
      );
    } catch {
      throw new Error("S232H2_CROSS_ACCOUNT_GATE_OPEN");
    }
    const ownerReadAgain = await readRlsProbe(denied.page, deniedCanary);
    let finalAudit: VisualAccountAudit;
    try {
      finalAudit = await auditVisualAccountCandidate(
        selected.page,
        selected.credential,
      );
    } catch {
      throw new Error("S232H2_PRIVACY_SNAPSHOT_READ_FAILED");
    }
    const crossAccountDenied =
      ownerRead.status === 200 &&
      ownerRead.exactShape &&
      ownerRead.visible &&
      ownerReadAgain.status === 200 &&
      ownerReadAgain.exactShape &&
      ownerReadAgain.visible &&
      deniedRead.status === 200 &&
      deniedRead.exactShape &&
      deniedRead.hidden;
    const snapshotStable =
      finalAudit.snapshotReadSucceeded &&
      finalAudit.fingerprint === selected.audit.fingerprint;
    if (!finalAudit.snapshotReadSucceeded) {
      throw new Error("S232H2_PRIVACY_SNAPSHOT_READ_FAILED");
    }
    if (!snapshotStable) {
      throw new Error("S232H2_PRIVACY_SNAPSHOT_DRIFT");
    }
    if (!crossAccountDenied || deniedCanaryDomCount !== 0) {
      throw new Error("S232H2_CROSS_ACCOUNT_GATE_OPEN");
    }

    proof = {
      schemaVersion: 4,
      selectedSlot: selected.credential.slot,
      selectedFingerprint: selected.audit.fingerprint,
      selectedSessionFingerprint: selected.audit.sessionFingerprint,
      fixtureIds: selected.audit.exactFixtureIds,
      ledgerItemId: selected.audit.ledgerItemId!,
      primaryQueueTitle: selected.audit.primaryQueueTitle!,
      deniedCanary,
      privacyGate: {
        scheduledCandidates: visualCredentialCandidates.length,
        completedAudits: handles.filter((handle) => handle.completed).length,
        notRunCount: 0,
        blockerCount: 0,
        screenshotCallCount: 0,
        endpointReadSucceeded:
          selected.audit.endpointReadSucceeded &&
          finalAudit.endpointReadSucceeded,
        snapshotReadSucceeded: finalAudit.snapshotReadSucceeded,
        snapshotStable,
        crossAccountDenied,
        deniedCanaryDomCount,
        selectedAccountItemCount: selected.audit.itemCount,
        selectedExactFixtureCount: selected.audit.exactFixtureIds.length,
        fixtureOwnershipClosed:
          selected.audit.nonFixtureRowCount === 0 &&
          selected.audit.unknownReferenceCount === 0,
        unknownLearnerEndpointCount: 0,
        unknownLearnerRowCount: 0,
        rawIdentityArtifactCount: 0,
        targetSessionBound: selected.audit.sessionBound,
        baselineSessionBound: false,
        baselineUsesSelectedFixture: false,
      },
    };
  } finally {
    await Promise.all(
      handles.map(async (handle) => {
        if (!handle.context) return;
        try {
          await handle.context.close();
        } catch (error) {
          recordStableGateFailure(cleanupFailures, {
            phase: "privacy",
            routeStateAlias: "candidate-" + handle.credential.slot,
            viewport: "source-only",
            stableStep: "cleanup",
            errorFamily: stableErrorFamily(error),
          });
        }
      }),
    );
  }
  if (cleanupFailures.length > 0) {
    await unlink(visualProofPath).catch(() => undefined);
    throw new Error(
      "S232H2_PRIVACY_GATE_OPEN " +
        JSON.stringify({ blockers: cleanupFailures }),
    );
  }
  if (!proof) {
    throw new Error("S232H2_PRIVACY_GATE_OPEN");
  }
  await writeVisualProof(proof);
  expect(proof.privacyGate.scheduledCandidates).toBe(
    proof.privacyGate.completedAudits,
  );
  expect(proof.privacyGate.notRunCount).toBe(0);
  expect(proof.privacyGate.blockerCount).toBe(0);
  expect(proof.privacyGate.screenshotCallCount).toBe(0);
  expect(proof.privacyGate.endpointReadSucceeded).toBe(true);
});

test("@a11y S232H.2 split accessibility gate", async ({ browser }) => {
  test.setTimeout(680_000);
  requireSafeVisualRuntime();
  const proof = await readVisualProof();
  const credential = resolveCredential(proof.selectedSlot);
  if (!credential) visualProofContractRequired();

  const failures: StableGateFailure[] = [];
  const auditRows: AuditRow[] = [];
  let completedAudits = 0;
  let mobileFullCompleted = 0;
  let geometryCompleted = 0;
  let keyboardCompleted = 0;
  let authenticatedContext: BrowserContext | null = null;
  let publicContext: BrowserContext | null = null;
  try {
    authenticatedContext = await newPreviewContext(browser, runtimeBaseUrl);
    const authenticatedPage = await authenticatedContext.newPage();
    await establishProtectedPreviewSession(
      authenticatedPage,
      "S232H2 accessibility target",
    );
    await loginWithExplicitTestAccountSession(
      authenticatedPage,
      credential,
      runtimeBaseUrl,
      "second",
    );
    await verifyRuntimeVersion(authenticatedPage, runtimeRunnerSha);
    const sourceAudit = await auditVisualAccountCandidate(
      authenticatedPage,
      credential,
    );
    if (
      !sourceAudit.snapshotReadSucceeded ||
      sourceAudit.fingerprint !== proof.selectedFingerprint ||
      !sourceAudit.clean
    ) {
      recordStableGateFailure(failures, {
        phase: "a11y",
        routeStateAlias: "account-snapshot",
        viewport: "all",
        stableStep: "snapshot-drift",
        errorFamily: "snapshot-drift",
      });
    }
    const authenticatedGuard = await blockUnexpectedLearnerMutation(
      authenticatedContext,
      proof.fixtureIds,
    );
    await installDeterministicVisualMocks(authenticatedContext);
    const authenticatedErrors = monitorPageRuntime(
      authenticatedPage,
      new URL(runtimeBaseUrl).origin,
    );

    publicContext = await newPreviewContext(browser, runtimeBaseUrl);
    const publicPage = await publicContext.newPage();
    const publicGuard = await blockUnexpectedLearnerMutation(
      publicContext,
      proof.fixtureIds,
    );
    await installDeterministicVisualMocks(publicContext);
    const publicErrors = monitorPageRuntime(
      publicPage,
      new URL(runtimeBaseUrl).origin,
    );

    for (const route of requiredRoutes) {
      let routePrepared = false;
      for (const viewport of viewports) {
        const routePage = route.authenticated ? authenticatedPage : publicPage;
        const routeStateAlias = route.id + "-initial";
        const requestedPath = resolveRoutePath(route, proof.ledgerItemId);
        const profile: AuditProfile =
          viewport.width === 390 ? "mobile-full" : "geometry";
        const keyboard =
          viewport.width === 390 &&
          (route.id === "today" || route.id === "ledger");
        let activeStep: StableGateFailure["stableStep"] = "preparation";
        try {
          const requiresCalculatorWideReset =
            route.id === "calculator" &&
            viewport.width >= 768 &&
            (viewport.width === 768 || !routePrepared);
          const requiresRouteNavigation =
            !routePrepared || requiresCalculatorWideReset;
          if (requiresRouteNavigation) {
            routePrepared = false;
            if (requiresCalculatorWideReset) {
              await routePage.evaluate((storagePrefix) => {
                for (const key of Object.keys(window.sessionStorage)) {
                  if (key.startsWith(storagePrefix)) {
                    window.sessionStorage.removeItem(key);
                  }
                }
              }, CALCULATOR_ROUTINE_SESSION_STORAGE_PREFIX);
            }
            await prepareInitialRoute(
              routePage,
              route,
              requestedPath,
              viewport,
            );
            routePrepared = true;
          } else {
            await routePage.setViewportSize({
              width: viewport.width,
              height: viewport.height,
            });
            await waitForStableRender(routePage);
          }
          activeStep = "audit";
          const row = await auditRoute(
            routePage,
            route,
            requestedPath,
            viewport,
            {
              profile,
              keyboard,
              navigate: false,
              failures,
              phase: "a11y",
              routeStateAlias,
            },
          );
          const boundary = await inspectSyntheticArtifactBoundary(
            routePage,
            credential,
            proof,
          );
          recordEndpointGuardFailures(
            failures,
            "a11y",
            routeStateAlias,
            viewport.width + "x" + viewport.height,
            route.authenticated ? authenticatedGuard : publicGuard,
          );
          const privacyCount =
            boundary.visibleEmailOutsideMask +
            boundary.rawCredentialArtifactCount +
            boundary.rawIdentifierArtifactCount +
            boundary.deniedCanaryDomCount +
            boundary.opaqueSurfaceCount;
          if (privacyCount > 0) {
            recordStableGateFailure(failures, {
              phase: "a11y",
              routeStateAlias,
              viewport: viewport.width + "x" + viewport.height,
              stableStep: "privacy",
              errorFamily: "identity",
              count: privacyCount,
            });
          }
          await settleRuntimeMonitors(routePage);
          auditRows.push(row);
          completedAudits += 1;
          if (profile === "mobile-full") mobileFullCompleted += 1;
          else geometryCompleted += 1;
          if (keyboard) keyboardCompleted += 1;
        } catch (error) {
          recordStableGateFailure(failures, {
            phase: "a11y",
            routeStateAlias,
            viewport: viewport.width + "x" + viewport.height,
            stableStep: activeStep,
            errorFamily: stableErrorFamily(error),
          });
        } finally {
          try {
            await removeKeyboardTraversalOrigin(routePage);
          } catch (error) {
            recordStableGateFailure(failures, {
              phase: "a11y",
              routeStateAlias,
              viewport: viewport.width + "x" + viewport.height,
              stableStep: "cleanup",
              errorFamily: stableErrorFamily(error),
            });
          }
        }
      }
    }

    const dynamicCandidates = [
      {
        routeId: "capture",
        state: "extraction-preview",
        requestedPath: "/app/capture?mode=second",
        prepare: (page: Page) => prepareCaptureExtractionPreview(page),
      },
      {
        routeId: "answer-review",
        state: "result",
        requestedPath: "/answer-review?mode=second",
        prepare: (page: Page) => prepareAnswerReviewResult(page),
      },
      {
        routeId: "answer-review",
        state: "rewrite",
        requestedPath: "/answer-review?mode=second",
        prepare: async (page: Page) => {
          await prepareAnswerReviewResult(page);
          await page.locator("[data-s232e4-rewrite-entry]").click();
          await expect(
            page.locator(
              '[data-s232e4-answer-review-rewrite="single-paragraph"]',
            ),
          ).toBeVisible();
        },
      },
      {
        routeId: "review",
        state: "revealed-selected",
        requestedPath: "/app/review?mode=second",
        prepare: (page: Page) =>
          prepareReviewSelectedState(page, proof.primaryQueueTitle),
      },
      {
        routeId: "session",
        state: "saved-capture",
        requestedPath:
          "/app/session?mode=second&savedCapture=1&itemId=[itemId]",
        prepare: async (page: Page) => {
          await gotoRequiredRoute(
            page,
            "/app/session?mode=second&savedCapture=1&itemId=" +
              encodeURIComponent(proof.ledgerItemId),
          );
          await expect(
            page.getByText("오늘 계획에 반영했습니다.", { exact: true }),
          ).toBeVisible();
        },
      },
      {
        routeId: "calculator",
        state: "completed-saved",
        requestedPath:
          "/app/calculator?mode=second&context=practice&focus=casio",
        prepare: async (page: Page) => {
          await gotoRequiredRoute(
            page,
            "/app/calculator?mode=second&context=practice&focus=casio",
          );
          await advanceCalculatorToCasioInput(page);
          await completeCalculatorRoutine(page);
        },
      },
    ] as const;

    for (const dynamic of dynamicCandidates) {
      const routeStateAlias = dynamic.routeId + "-" + dynamic.state;
      const row = await runIsolatedDynamicCandidate({
        browser,
        credential,
        proof,
        failures,
        phase: "a11y",
        routeStateAlias,
        run: async (page, guard, markAudit) => {
          await dynamic.prepare(page);
          markAudit();
          const audited = await auditRoute(
            page,
            requiredRoutes.find((route) => route.id === dynamic.routeId)!,
            dynamic.requestedPath,
            viewports[0],
            {
              profile: "mobile-full",
              keyboard:
                dynamic.routeId === "answer-review" &&
                dynamic.state === "rewrite",
              state: dynamic.state,
              auditKind: "dynamic-state",
              navigate: false,
              failures,
              phase: "a11y",
              routeStateAlias,
            },
          );
          const boundary = await inspectSyntheticArtifactBoundary(
            page,
            credential,
            proof,
          );
          recordEndpointGuardFailures(
            failures,
            "a11y",
            routeStateAlias,
            "390x844",
            guard,
          );
          const privacyCount =
            boundary.visibleEmailOutsideMask +
            boundary.rawCredentialArtifactCount +
            boundary.rawIdentifierArtifactCount +
            boundary.deniedCanaryDomCount +
            boundary.opaqueSurfaceCount;
          if (privacyCount > 0) {
            recordStableGateFailure(failures, {
              phase: "a11y",
              routeStateAlias,
              viewport: "390x844",
              stableStep: "privacy",
              errorFamily: "identity",
              count: privacyCount,
            });
          }
          return audited;
        },
      });
      if (row) {
        auditRows.push(row);
        completedAudits += 1;
        mobileFullCompleted += 1;
        if (
          dynamic.routeId === "answer-review" &&
          dynamic.state === "rewrite"
        ) {
          keyboardCompleted += 1;
        }
      }
    }

    await settleRuntimeMonitors(authenticatedPage, publicPage);
    const runtimeErrorCount =
      authenticatedErrors.consoleErrors.length +
      authenticatedErrors.pageErrors.length +
      authenticatedErrors.sameOriginRequestFailures.length +
      publicErrors.consoleErrors.length +
      publicErrors.pageErrors.length +
      publicErrors.sameOriginRequestFailures.length;
    if (runtimeErrorCount > 0) {
      recordStableGateFailure(failures, {
        phase: "a11y",
        routeStateAlias: "runtime-errors",
        viewport: "all",
        stableStep: "audit",
        errorFamily: "unexpected",
        count: runtimeErrorCount,
      });
    }
  } catch (error) {
    recordStableGateFailure(failures, {
      phase: "a11y",
      routeStateAlias: "gate-setup",
      viewport: "all",
      stableStep: "preparation",
      errorFamily: stableErrorFamily(error),
    });
  } finally {
    await closeSharedContext(
      authenticatedContext,
      failures,
      "a11y",
      "authenticated-context",
    );
    await closeSharedContext(publicContext, failures, "a11y", "public-context");
  }

  const a11yGate: A11yGateSummary = {
    scheduledCandidates: 45,
    completedAudits,
    blockerCount: failures.reduce((sum, failure) => sum + failure.count, 0),
    mobileFullScheduled: 19,
    mobileFullCompleted,
    geometryScheduled: 26,
    geometryCompleted,
    keyboardScheduled: 3,
    keyboardCompleted,
  };
  expect(
    a11yGate,
    "S232H2_A11Y_GATE_OPEN " + JSON.stringify({ a11yGate, blockers: failures }),
  ).toEqual({
    scheduledCandidates: 45,
    completedAudits: 45,
    blockerCount: 0,
    mobileFullScheduled: 19,
    mobileFullCompleted: 19,
    geometryScheduled: 26,
    geometryCompleted: 26,
    keyboardScheduled: 3,
    keyboardCompleted: 3,
  });
  proof.a11yGate = a11yGate;
  proof.auditRows = auditRows;
  await writeVisualProof(proof);
});

test("@visual S232H.2 one-pass visual and Figma gate", async ({
  browser,
}, testInfo) => {
  test.setTimeout(870_000);
  requireSafeVisualRuntime();
  const proof = await readVisualProof();
  const credential = resolveCredential(proof.selectedSlot);
  if (!credential || !proof.a11yGate || !proof.auditRows) {
    visualProofContractRequired();
  }

  const failures: StableGateFailure[] = [];
  const afterScreenshots: ScreenshotEvidence[] = [];
  const baselineScreenshots: ScreenshotEvidence[] = [];
  const runtimeErrorGroups: RuntimeErrorEvidence[] = [];
  let screenshotCallCount = 0;
  let completedAudits = 0;
  let targetContext: BrowserContext | null = null;
  let publicContext: BrowserContext | null = null;
  let baselineContext: BrowserContext | null = null;
  let targetAudit: VisualAccountAudit | null = null;
  let baselineSessionBound = false;
  let targetPage: Page | null = null;
  try {
    targetContext = await newPreviewContext(browser, runtimeBaseUrl);
    targetPage = await targetContext.newPage();
    await establishProtectedPreviewSession(targetPage, "S232H2 visual target");
    await loginWithExplicitTestAccountSession(
      targetPage,
      credential,
      runtimeBaseUrl,
      "second",
    );
    await verifyRuntimeVersion(targetPage, runtimeRunnerSha);
    targetAudit = await auditVisualAccountCandidate(targetPage, credential);
    if (
      !targetAudit.clean ||
      targetAudit.fingerprint !== proof.selectedFingerprint
    ) {
      recordStableGateFailure(failures, {
        phase: "closure",
        routeStateAlias: "target-account",
        viewport: "all",
        stableStep: "snapshot-drift",
        errorFamily: "snapshot-drift",
      });
    }
    const targetGuard = await blockUnexpectedLearnerMutation(
      targetContext,
      proof.fixtureIds,
    );
    await installDeterministicVisualMocks(targetContext);
    const targetErrors = monitorPageRuntime(
      targetPage,
      new URL(runtimeBaseUrl).origin,
    );
    runtimeErrorGroups.push(targetErrors);

    publicContext = await newPreviewContext(browser, runtimeBaseUrl);
    const publicPage = await publicContext.newPage();
    const publicGuard = await blockUnexpectedLearnerMutation(
      publicContext,
      proof.fixtureIds,
    );
    await installDeterministicVisualMocks(publicContext);
    const publicErrors = monitorPageRuntime(
      publicPage,
      new URL(runtimeBaseUrl).origin,
    );
    runtimeErrorGroups.push(publicErrors);

    baselineContext = await newPreviewContext(browser, baselineUrl);
    const baselinePage = await baselineContext.newPage();
    await loginWithExplicitTestAccountSession(
      baselinePage,
      credential,
      baselineUrl,
      "second",
    );
    await verifyRuntimeVersion(baselinePage, baselineSha, baselineUrl);
    baselineSessionBound = await verifySessionBinding(
      baselinePage,
      credential,
      baselineUrl,
      proof.selectedSessionFingerprint,
    );
    if (!baselineSessionBound) {
      recordStableGateFailure(failures, {
        phase: "baseline",
        routeStateAlias: "baseline-account",
        viewport: "all",
        stableStep: "login",
        errorFamily: "authentication",
      });
    }
    const baselineGuard = await blockUnexpectedLearnerMutation(
      baselineContext,
      proof.fixtureIds,
    );
    await installDeterministicVisualMocks(baselineContext);
    const baselineErrors = monitorPageRuntime(
      baselinePage,
      new URL(baselineUrl).origin,
    );
    runtimeErrorGroups.push(baselineErrors);

    for (const viewport of viewports) {
      for (const route of requiredRoutes) {
        const include =
          viewport.width === 390 ||
          (viewport.width === 768 &&
            (route.id === "today" || route.id === "ledger")) ||
          (viewport.width === 1440 && route.id === "ledger");
        if (!include) continue;
        const routePage = route.authenticated ? targetPage : publicPage;
        const routeGuard = route.authenticated ? targetGuard : publicGuard;
        const requestedPath = resolveRoutePath(route, proof.ledgerItemId);
        const representative =
          (route.id === "ledger" &&
            (viewport.width === 390 || viewport.width === 1440)) ||
          (route.id === "calculator" && viewport.width === 390);
        const screenshot = await runVisualCandidate({
          page: routePage,
          credential,
          proof,
          guard: routeGuard,
          failures,
          phase: "visual",
          routeStateAlias: route.id + "-initial",
          viewport: viewport.width + "x" + viewport.height,
          fileName: "s232h2-after-" + route.id + "-" + viewport.label + ".png",
          fullPage: !representative,
          identityMaskRequired:
            route.authenticated && route.id !== "answer-review",
          prepare: () =>
            prepareInitialRoute(routePage, route, requestedPath, viewport),
        });
        screenshotCallCount += screenshot ? 1 : 0;
        if (screenshot) {
          afterScreenshots.push(screenshot);
          completedAudits += 1;
        }
      }
    }

    const dynamicVisuals = [
      {
        routeId: "capture",
        state: "extraction-preview",
        fileName: "s232h2-after-capture-extraction-preview-390.png",
        prepare: (page: Page) => prepareCaptureExtractionPreview(page),
      },
      {
        routeId: "answer-review",
        state: "result",
        fileName: "s232h2-after-answer-review-result-390.png",
        prepare: (page: Page) => prepareAnswerReviewResult(page),
      },
      {
        routeId: "answer-review",
        state: "rewrite",
        fileName: "s232h2-after-answer-review-rewrite-390.png",
        prepare: async (page: Page) => {
          await prepareAnswerReviewResult(page);
          await page.locator("[data-s232e4-rewrite-entry]").click();
          await expect(
            page.locator(
              '[data-s232e4-answer-review-rewrite="single-paragraph"]',
            ),
          ).toBeVisible();
        },
      },
      {
        routeId: "review",
        state: "revealed-selected",
        fileName: "s232h2-after-review-revealed-selected-390.png",
        prepare: (page: Page) =>
          prepareReviewSelectedState(page, proof.primaryQueueTitle),
      },
      {
        routeId: "session",
        state: "saved-capture",
        fileName: "s232h2-after-session-saved-capture-390.png",
        prepare: async (page: Page) => {
          await gotoRequiredRoute(
            page,
            "/app/session?mode=second&savedCapture=1&itemId=" +
              encodeURIComponent(proof.ledgerItemId),
          );
          await expect(
            page.getByText("오늘 계획에 반영했습니다.", { exact: true }),
          ).toBeVisible();
        },
      },
      {
        routeId: "calculator",
        state: "completed-saved",
        fileName: "s232h2-after-calculator-completed-saved-390.png",
        prepare: async (page: Page) => {
          await gotoRequiredRoute(
            page,
            "/app/calculator?mode=second&context=practice&focus=casio",
          );
          await advanceCalculatorToCasioInput(page);
          await completeCalculatorRoutine(page);
        },
      },
    ] as const;

    for (const dynamic of dynamicVisuals) {
      const routeStateAlias = dynamic.routeId + "-" + dynamic.state;
      const screenshot = await runIsolatedDynamicCandidate({
        browser,
        credential,
        proof,
        failures,
        phase: "visual",
        routeStateAlias,
        run: async (page, guard) =>
          runVisualCandidate({
            page,
            credential,
            proof,
            guard,
            failures,
            phase: "visual",
            routeStateAlias,
            viewport: "390x844",
            fileName: dynamic.fileName,
            identityMaskRequired: dynamic.routeId !== "answer-review",
            prepare: () => dynamic.prepare(page),
          }),
      });
      if (screenshot) {
        afterScreenshots.push(screenshot);
        screenshotCallCount += 1;
        completedAudits += 1;
      }
    }

    for (const viewport of [viewports[0], viewports[2]]) {
      const screenshot = await runVisualCandidate({
        page: baselinePage,
        credential,
        proof,
        guard: baselineGuard,
        failures,
        phase: "baseline",
        routeStateAlias: "before-ledger",
        viewport: viewport.width + "x" + viewport.height,
        fileName: "s232h2-before-ledger-" + viewport.label + ".png",
        fullPage: false,
        identityMaskRequired: true,
        prepare: async () => {
          await baselinePage.setViewportSize({
            width: viewport.width,
            height: viewport.height,
          });
          await gotoRequiredRoute(
            baselinePage,
            "/app/items/" +
              encodeURIComponent(proof.ledgerItemId) +
              "?mode=second",
          );
          await expect(
            baselinePage.getByRole("heading", {
              level: 1,
              name: syntheticFixtureTitle,
            }),
          ).toBeVisible();
        },
      });
      if (screenshot) {
        baselineScreenshots.push(screenshot);
        screenshotCallCount += 1;
        completedAudits += 1;
      }
    }
    const beforeCalculator = await runVisualCandidate({
      page: baselinePage,
      credential,
      proof,
      guard: baselineGuard,
      failures,
      phase: "baseline",
      routeStateAlias: "before-calculator",
      viewport: "390x844",
      fileName: "s232h2-before-calculator-390.png",
      fullPage: false,
      identityMaskRequired: true,
      prepare: async () => {
        await baselinePage.setViewportSize({ width: 390, height: 844 });
        await gotoRequiredRoute(
          baselinePage,
          "/app/calculator?mode=second&context=practice&focus=casio",
        );
        await advanceCalculatorToCasioInput(baselinePage);
      },
    });
    if (beforeCalculator) {
      baselineScreenshots.push(beforeCalculator);
      screenshotCallCount += 1;
      completedAudits += 1;
    }

    await verifyRuntimeVersion(targetPage, runtimeRunnerSha);
    await verifyRuntimeVersion(baselinePage, baselineSha, baselineUrl);
    await settleRuntimeMonitors(targetPage, publicPage, baselinePage);
    const runtimeErrorCount =
      targetErrors.consoleErrors.length +
      targetErrors.pageErrors.length +
      targetErrors.sameOriginRequestFailures.length +
      publicErrors.consoleErrors.length +
      publicErrors.pageErrors.length +
      publicErrors.sameOriginRequestFailures.length +
      baselineErrors.consoleErrors.length +
      baselineErrors.pageErrors.length +
      baselineErrors.sameOriginRequestFailures.length;
    if (runtimeErrorCount > 0) {
      recordStableGateFailure(failures, {
        phase: "visual",
        routeStateAlias: "runtime-errors",
        viewport: "all",
        stableStep: "audit",
        errorFamily: "unexpected",
        count: runtimeErrorCount,
      });
    }
  } catch (error) {
    recordStableGateFailure(failures, {
      phase: "visual",
      routeStateAlias: "gate-setup",
      viewport: "all",
      stableStep: "preparation",
      errorFamily: stableErrorFamily(error),
    });
  }

  let finalAudit: VisualAccountAudit | null = null;
  if (targetPage) {
    try {
      finalAudit = await auditVisualAccountCandidate(targetPage, credential);
    } catch {
      recordStableGateFailure(failures, {
        phase: "closure",
        routeStateAlias: "account-snapshot",
        viewport: "all",
        stableStep: "snapshot-read",
        errorFamily: "snapshot-read-failed",
      });
    }
  }
  const snapshotReadSucceeded = Boolean(finalAudit?.snapshotReadSucceeded);
  const snapshotStable =
    snapshotReadSucceeded &&
    finalAudit?.fingerprint === proof.selectedFingerprint;
  if (!snapshotReadSucceeded) {
    recordStableGateFailure(failures, {
      phase: "closure",
      routeStateAlias: "account-snapshot",
      viewport: "all",
      stableStep: "snapshot-read",
      errorFamily: "snapshot-read-failed",
    });
  } else if (!snapshotStable) {
    recordStableGateFailure(failures, {
      phase: "closure",
      routeStateAlias: "account-snapshot",
      viewport: "all",
      stableStep: "snapshot-drift",
      errorFamily: "snapshot-drift",
    });
  }

  const privacyClosureOpen = failures.some((failure) =>
    ["privacy", "snapshot-read", "snapshot-drift"].includes(failure.stableStep),
  );
  const diagnosticActualNames = new Set([
    "s232h2-after-ledger-390.png",
    "s232h2-after-ledger-1440.png",
    "s232h2-after-calculator-390.png",
  ]);
  if (!privacyClosureOpen) {
    for (const screenshot of afterScreenshots) {
      if (!diagnosticActualNames.has(screenshot.fileName)) continue;
      await writeFile(
        testInfo.outputPath(screenshot.fileName),
        screenshot.buffer,
      );
    }
  }

  const figmaComparisons: FigmaComparison[] = [];
  for (const reference of figmaReferences) {
    const actual = afterScreenshots.find(
      (screenshot) => screenshot.fileName === reference.actualFileName,
    );
    if (!targetPage || !actual || privacyClosureOpen) {
      recordStableGateFailure(failures, {
        phase: "visual",
        routeStateAlias: "figma-" + reference.node.replace(":", "-"),
        viewport: "representative",
        stableStep: "figma",
        errorFamily: "assertion",
      });
      continue;
    }
    try {
      const comparison = await compareScreenshotToFigmaReference(
        targetPage,
        testInfo,
        actual,
        reference,
      );
      figmaComparisons.push(comparison);
      if (!comparison.passed) {
        recordStableGateFailure(failures, {
          phase: "visual",
          routeStateAlias: "figma-" + reference.node.replace(":", "-"),
          viewport: "representative",
          stableStep: "figma",
          errorFamily: "assertion",
        });
      }
    } catch (error) {
      recordStableGateFailure(failures, {
        phase: "visual",
        routeStateAlias: "figma-" + reference.node.replace(":", "-"),
        viewport: "representative",
        stableStep: "figma",
        errorFamily: stableErrorFamily(error),
      });
    }
  }
  const figmaReferenceScreenshots = figmaReferences.map(
    (reference) => reference.referenceFileName,
  );

  await closeSharedContext(targetContext, failures, "visual", "target-context");
  await closeSharedContext(publicContext, failures, "visual", "public-context");
  await closeSharedContext(
    baselineContext,
    failures,
    "baseline",
    "baseline-context",
  );

  const preparationBlockerCount = failures
    .filter((failure) => failure.stableStep === "preparation")
    .reduce((sum, failure) => sum + failure.count, 0);
  const cleanupBlockerCount = failures
    .filter((failure) => failure.stableStep === "cleanup")
    .reduce((sum, failure) => sum + failure.count, 0);
  const privacyBlockerCount = failures
    .filter(
      (failure) =>
        failure.stableStep === "privacy" ||
        failure.stableStep === "snapshot-read" ||
        failure.stableStep === "snapshot-drift",
    )
    .reduce((sum, failure) => sum + failure.count, 0);
  const visualBlockerCount = failures
    .filter(
      (failure) =>
        ![
          "preparation",
          "cleanup",
          "privacy",
          "snapshot-read",
          "snapshot-drift",
        ].includes(failure.stableStep),
    )
    .reduce((sum, failure) => sum + failure.count, 0);
  const visualGate: VisualGateSummary = {
    scheduledCandidates: 25,
    completedAudits,
    preparationBlockerCount,
    cleanupBlockerCount,
    visualBlockerCount,
    privacyBlockerCount,
    screenshotCallCount,
    snapshotReadSucceeded,
    snapshotStable,
  };
  expect(
    visualGate,
    "S232H2_VISUAL_GATE_OPEN " +
      JSON.stringify({ visualGate, blockers: failures }),
  ).toEqual({
    scheduledCandidates: 25,
    completedAudits: 25,
    preparationBlockerCount: 0,
    cleanupBlockerCount: 0,
    visualBlockerCount: 0,
    privacyBlockerCount: 0,
    screenshotCallCount: 25,
    snapshotReadSucceeded: true,
    snapshotStable: true,
  });
  expect(afterScreenshots).toHaveLength(22);
  expect(baselineScreenshots).toHaveLength(3);
  expect(targetPage).not.toBeNull();
  expect(targetAudit?.sessionBound).toBe(true);
  expect(baselineSessionBound).toBe(true);

  const capturedScreenshots = [...baselineScreenshots, ...afterScreenshots];
  const rawIdentityArtifactCount = capturedScreenshots.reduce(
    (sum, screenshot) =>
      sum +
      screenshot.boundary.visibleEmailOutsideMask +
      screenshot.boundary.rawCredentialArtifactCount +
      screenshot.boundary.rawIdentifierArtifactCount,
    0,
  );
  const deniedCanaryArtifactCount = capturedScreenshots.reduce(
    (sum, screenshot) => sum + screenshot.boundary.deniedCanaryDomCount,
    0,
  );
  const opaqueSurfaceArtifactCount = capturedScreenshots.reduce(
    (sum, screenshot) => sum + screenshot.boundary.opaqueSurfaceCount,
    0,
  );
  const unknownLearnerEndpointCount = Math.max(
    0,
    ...capturedScreenshots.map(
      (screenshot) => screenshot.guard.unknownEndpointCount,
    ),
  );
  const unknownLearnerRowCount = Math.max(
    0,
    ...capturedScreenshots.map(
      (screenshot) => screenshot.guard.unknownRowCount,
    ),
  );
  const blockedLearnerMutationCount = Math.max(
    0,
    ...capturedScreenshots.map(
      (screenshot) => screenshot.guard.blockedMutationCount,
    ),
  );
  const identityMasked =
    capturedScreenshots.some((screenshot) => screenshot.identityMaskRequired) &&
    capturedScreenshots.every(
      (screenshot) =>
        !screenshot.identityMaskRequired ||
        screenshot.boundary.identityMaskCount > 0,
    );
  const actualAccountArtifactCount =
    rawIdentityArtifactCount +
    deniedCanaryArtifactCount +
    opaqueSurfaceArtifactCount +
    unknownLearnerEndpointCount +
    unknownLearnerRowCount +
    blockedLearnerMutationCount;
  expect({
    rawIdentityArtifactCount,
    deniedCanaryArtifactCount,
    opaqueSurfaceArtifactCount,
    unknownLearnerEndpointCount,
    unknownLearnerRowCount,
    blockedLearnerMutationCount,
    identityMasked,
    actualAccountArtifactCount,
  }).toEqual({
    rawIdentityArtifactCount: 0,
    deniedCanaryArtifactCount: 0,
    opaqueSurfaceArtifactCount: 0,
    unknownLearnerEndpointCount: 0,
    unknownLearnerRowCount: 0,
    blockedLearnerMutationCount: 0,
    identityMasked: true,
    actualAccountArtifactCount: 0,
  });

  for (const screenshot of capturedScreenshots) {
    await writeFile(
      testInfo.outputPath(screenshot.fileName),
      screenshot.buffer,
    );
  }

  proof.privacyGate.rawIdentityArtifactCount = rawIdentityArtifactCount;
  proof.privacyGate.deniedCanaryDomCount = deniedCanaryArtifactCount;
  proof.privacyGate.unknownLearnerEndpointCount = unknownLearnerEndpointCount;
  proof.privacyGate.unknownLearnerRowCount = unknownLearnerRowCount;
  proof.privacyGate.targetSessionBound = targetAudit?.sessionBound === true;
  proof.privacyGate.baselineSessionBound = baselineSessionBound;
  proof.privacyGate.baselineUsesSelectedFixture =
    baselineSessionBound &&
    baselineScreenshots.filter((screenshot) =>
      screenshot.fileName.startsWith("s232h2-before-ledger-"),
    ).length === 2 &&
    targetAudit?.fingerprint === proof.selectedFingerprint &&
    sameStringSet(targetAudit?.exactFixtureIds ?? [], proof.fixtureIds);

  const screenshotNames = [
    ...baselineScreenshots.map((screenshot) => screenshot.fileName),
    ...afterScreenshots.map((screenshot) => screenshot.fileName),
    ...figmaReferenceScreenshots,
  ];
  const dynamicAfterScreenshotCount = afterScreenshots.filter((screenshot) =>
    dynamicScreenshotNames.has(screenshot.fileName),
  ).length;
  const initialAfterScreenshotCount =
    afterScreenshots.length - dynamicAfterScreenshotCount;
  const allErrors = allErrorCounts(...runtimeErrorGroups);
  const manifest = {
    schemaVersion: 4,
    result: figmaComparisons.every((comparison) => comparison.passed)
      ? "pass"
      : "fail",
    runnerSha: runtimeRunnerSha,
    targetDeploymentSha: runtimeTargetSha,
    baselineDeploymentSha: baselineSha,
    mergeBaseSha,
    baselineTreeSha,
    routeCount: requiredRoutes.length,
    viewportCount: viewports.length,
    initialAuditRowCount: proof.auditRows!.filter(
      (row) => row.auditKind === "initial-route",
    ).length,
    dynamicAuditRowCount: proof.auditRows!.filter(
      (row) => row.auditKind === "dynamic-state",
    ).length,
    auditRowCount: proof.auditRows!.length,
    auditRows: proof.auditRows,
    beforeScreenshotCount: baselineScreenshots.length,
    initialAfterScreenshotCount,
    dynamicScreenshotCount: dynamicAfterScreenshotCount,
    afterScreenshotCount: afterScreenshots.length,
    figmaReferenceScreenshotCount: figmaReferenceScreenshots.length,
    figmaComparisonCount: figmaComparisons.length,
    screenshotCount: screenshotNames.length,
    screenshotCallCount,
    screenshots: screenshotNames,
    privacyGate: proof.privacyGate,
    a11yGate: proof.a11yGate,
    visualGate,
    figmaComparisons,
    figmaMapping: {
      foundations: ["43:2", "44:9", "45:2"],
      componentOverview: "61:2",
      componentContracts: [
        "47:28",
        "48:75",
        "50:59",
        "51:44",
        "52:42",
        "53:129",
        "61:80",
      ],
      representatives: ["56:2", "59:62", "57:34"],
      routeContracts: requiredRoutes.map((route) => ({
        route:
          route.id === "ledger"
            ? "/app/items/[itemId]?mode=second"
            : resolveRoutePath(route, "[itemId]"),
        nodes: routeContractNodes[route.id],
      })),
    },
    syntheticFixtureReady: targetAudit?.clean === true,
    fixtureOwnershipClosed:
      proof.privacyGate.fixtureOwnershipClosed &&
      finalAudit?.nonFixtureRowCount === 0 &&
      finalAudit?.unknownReferenceCount === 0,
    credentialsRedacted: rawIdentityArtifactCount === 0,
    identityMasked,
    privateLearnerContentCaptured: actualAccountArtifactCount !== 0,
    actualAccountArtifactCount,
    syntheticContentCaptured:
      targetAudit?.clean === true && capturedScreenshots.length === 25,
    rawInputArtifactCaptured: false,
    domCaptured: false,
    traceCaptured: false,
    videoCaptured: false,
    consoleErrorCount: allErrors.consoleErrors.length,
    pageErrorCount: allErrors.pageErrors.length,
    sameOriginRequestFailureCount: allErrors.sameOriginRequestFailures.length,
  };
  let serialized = JSON.stringify(manifest, null, 2);
  const forbiddenArtifactValues = [
    ...visualCredentialCandidates.flatMap((candidate) => [
      candidate.email,
      candidate.password,
    ]),
    ...safeProofIds(proof),
  ].filter((value) => value.length > 0);
  const leaked = forbiddenArtifactValues.some((value) =>
    serialized.includes(value),
  );
  const rawEmail = /@[a-z0-9.-]+\.[a-z]{2,}/i.test(serialized);
  if (leaked || rawEmail) {
    throw new Error("S232H2 manifest redaction failed.");
  }
  serialized = JSON.stringify(manifest, null, 2);
  await writeFile(
    testInfo.outputPath("s232h2-visual-manifest.json"),
    serialized,
    "utf8",
  );

  await unlink(visualProofPath).catch(() => undefined);
});
