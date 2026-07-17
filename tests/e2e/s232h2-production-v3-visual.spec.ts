import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";

import {
  establishProtectedPreviewSession,
  loginWithDedicatedTestAccount,
  protectionHeaders,
  requireSafeAuthenticatedRuntime,
  runtimeBaseUrl,
  runtimeRunnerSha,
  runtimeTargetSha,
  sanitizeRuntimeEvidence,
} from "./support/authenticated-runtime";
import {
  collectSyntheticPayloadFailurePaths,
  summarizeSyntheticPayloadFailurePaths,
} from "./support/synthetic-payload-diagnostics";

const runtimeEnabled = process.env.S232H2_VISUAL_RUNTIME === "1";
const baselineUrl = process.env.E2E_BASELINE_URL?.trim() ?? "";
const baselineHost =
  process.env.E2E_BASELINE_EXPECTED_HOST?.trim().toLowerCase() ?? "";
const baselineSha = process.env.E2E_BASELINE_SHA?.trim() ?? "";
const mergeBaseSha = process.env.E2E_MERGE_BASE_SHA?.trim() ?? "";
const baselineTreeSha = process.env.E2E_BASELINE_TREE_SHA?.trim() ?? "";
const testEmail = process.env.E2E_USER_EMAIL?.trim() ?? "";
const fixedBaselineSha = "35836d419161d7cfe55e3e3c088fcc4d66376a7d";

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
    path: (itemId) => `/app/items/${encodeURIComponent(itemId)}?mode=second`,
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
  "answer-review": [
    "43:2",
    "44:9",
    "45:2",
    "48:75",
    "50:59",
    "61:2",
    "61:80",
  ],
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

type AuditRow = {
  auditKind: "initial-route" | "dynamic-state";
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
  visiblePrimaryActionCount: number;
  undersizedTargetCount: number;
  viewportBoundsFailureCount: number;
  axeSeriousOrCritical: number;
  keyboardFocusVisible: boolean;
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

type ScreenshotEvidence = {
  fileName: string;
  buffer: Buffer;
};

type PrivacyAudit = {
  accountItemCount: number;
  syntheticItemCount: number;
  exactFixtureItemCount: number;
  accountStudyLogCount: number;
  syntheticStudyLogCount: number;
  queueItemCount: number;
  syntheticQueueItemCount: number;
  todayItemCount: number;
  syntheticTodayItemCount: number;
  itemListingComplete: boolean;
  studyLogListingComplete: boolean;
  sessionBound: boolean;
  governedSyntheticAccount: boolean;
  strictOwnershipContract: boolean;
  detailOwnershipClosed: boolean;
  pendingOwnedQueue: boolean;
  queueDetailsAudited: boolean;
  todayDetailsAudited: boolean;
  weeklyTaskDetailsAudited: boolean;
  syntheticAccountOnly: boolean;
  syntheticFixtureOnly: boolean;
  privateLearnerContentCaptured: boolean;
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

const syntheticOwnerId = "s232h2:v3-visual:v1";
const syntheticFixtureSource = "S232H2 synthetic visual acceptance";
const syntheticFixtureTitle = "S232H2 합성 학습 원장";
const syntheticFixtureProblemIdentifier = "s232h2:v3-visual:ledger:v1";
const syntheticFixtureQuestion =
  "신뢰보호원칙의 요건을 검토하시오. 시각 검증용 합성 문제입니다.";
const syntheticFixtureAnswer =
  "행정청의 공적 견해표명과 보호가치 있는 신뢰를 차례로 검토합니다. 이 문장은 시각 검증용 합성 기록입니다.";
const syntheticFixtureCorrectAnswer =
  "공적 견해표명, 귀책사유 부재, 신뢰에 따른 행위, 보호가치를 순서대로 확인합니다.";
const syntheticFixtureGap =
  "요건과 대응 사실을 잇는 문장 하나가 빠져 있습니다.";
const syntheticQueueAnchorSource = `${syntheticFixtureSource} · queue anchor`;

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
test.describe.configure({ timeout: 1_500_000, retries: 0 });

function requireSafeBaselineRuntime() {
  if (baselineSha !== fixedBaselineSha) {
    throw new Error("S232H.2 must use the fixed PR1 baseline SHA.");
  }
  if (
    !/^[0-9a-f]{40}$/i.test(mergeBaseSha) ||
    !/^[0-9a-f]{40}$/i.test(baselineTreeSha)
  ) {
    throw new Error(
      "S232H.2 requires the workflow-proven merge-base and baseline tree SHAs.",
    );
  }
  if (!baselineUrl || !baselineHost || !testEmail) {
    throw new Error(
      "S232H.2 baseline runtime or dedicated test-account configuration is missing.",
    );
  }

  const url = new URL(baselineUrl);
  const productionHosts = new Set([
    "inverge.vercel.app",
    "inverge.ai",
    "www.inverge.ai",
    "inverge.app",
    "www.inverge.app",
  ]);
  if (
    url.protocol !== "https:" ||
    url.hostname.toLowerCase() !== baselineHost ||
    productionHosts.has(baselineHost) ||
    !/^inverge-[a-z0-9-]+-chachathecats-projects\.vercel\.app$/i.test(
      baselineHost,
    )
  ) {
    throw new Error(
      "S232H.2 refuses a baseline outside the exact approved non-production Preview.",
    );
  }
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
      evidence.consoleErrors.push(sanitizeRuntimeEvidence(message.text()));
    }
  });
  page.on("pageerror", (error) => {
    evidence.pageErrors.push(sanitizeRuntimeEvidence(error.message));
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
    evidence.sameOriginRequestFailures.push(
      `${request.method()} ${url.pathname} ${sanitizeRuntimeEvidence(failure)}`,
    );
  });
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.origin !== expectedOrigin || response.status() < 400) return;
    evidence.sameOriginRequestFailures.push(
      `${response.request().method()} ${url.pathname} HTTP ${response.status()}`,
    );
  });
  return evidence;
}

async function settleRuntimeMonitors(...pages: Page[]) {
  for (const page of pages) {
    if (page.isClosed()) continue;
    await page
      .waitForLoadState("networkidle", { timeout: 5_000 })
      .catch(() => undefined);
    await page.evaluate(async () => {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      await new Promise<void>((resolve) => window.setTimeout(resolve, 100));
    });
  }
}

async function verifyRuntimeVersion(page: Page, expectedSha: string) {
  const observed = await page.evaluate(async () => {
    const response = await fetch("/api/runtime/version", {
      cache: "no-store",
      credentials: "same-origin",
    });
    const body = (await response.json()) as {
      ready?: boolean;
      deploymentSha?: string;
    };
    return {
      status: response.status,
      ready: body.ready,
      deploymentSha: body.deploymentSha,
    };
  });
  expect(observed).toEqual({
    status: 200,
    ready: true,
    deploymentSha: expectedSha,
  });
}

type SyntheticItem = {
  id?: string;
  itemId?: string;
  userId?: string;
  examName?: string;
  subjectLabel?: string;
  sourceType?: string;
  sourceLabel?: string;
  problemTitle?: string;
  problemIdentifier?: string;
  rawQuestionText?: string;
  rawAnswerText?: string;
  correctAnswer?: string;
  userAnswer?: string;
  userReasonText?: string;
  userReasonPreset?: string;
  confidence?: string;
  rawPayload?: Record<string, unknown>;
  derivedPayload?: Record<string, unknown>;
};

type SyntheticQueueCard = { itemId?: string; problemTitle?: string };
type JsonRead = { status: number; body: Record<string, unknown> };
type SyntheticAccountData = {
  session: JsonRead;
  items: JsonRead;
  logs: JsonRead;
  queue: JsonRead;
  today: JsonRead | null;
  weekly: JsonRead | null;
  details: Array<{ itemId: string; read: JsonRead }>;
};
type SyntheticAccountAudit = {
  privacyAudit: PrivacyAudit;
  items: SyntheticItem[];
  queue: SyntheticQueueCard[];
  ownedItemIds: Set<string>;
  primaryQueueTitle: string | null;
};

function resolveSyntheticItemId(item: SyntheticItem) {
  return item.id ?? item.itemId ?? "";
}

async function readSyntheticAccountData(
  page: Page,
  { includePlanning }: { includePlanning: boolean },
): Promise<SyntheticAccountData> {
  return page.evaluate(
    async ({ includePlanning }) => {
      const readJson = async (path: string) => {
        const response = await fetch(path, {
          cache: "no-store",
          credentials: "same-origin",
        });
        const body = (await response.json().catch(() => ({}))) as Record<
          string,
          unknown
        >;
        return { status: response.status, body };
      };
      const [session, items, logs, queue] = await Promise.all([
        readJson("/api/auth/session"),
        readJson("/api/os/items?limit=501"),
        readJson("/api/os/study-logs?mode=second&limit=501"),
        readJson("/api/os/review-queue"),
      ]);
      const [today, weekly] = includePlanning
        ? await Promise.all([
            readJson("/api/os/today-focus?mode=second"),
            readJson("/api/os/weekly-summary?mode=second"),
          ])
        : [null, null];

      const queueItems = Array.isArray(queue.body.items)
        ? queue.body.items
        : [];
      const todayFocus =
        today?.body.focus && typeof today.body.focus === "object"
          ? (today.body.focus as Record<string, unknown>)
          : {};
      const todayQueue = Array.isArray(todayFocus.queue)
        ? todayFocus.queue
        : [];
      const weeklyPlan =
        weekly?.body.plan && typeof weekly.body.plan === "object"
          ? (weekly.body.plan as Record<string, unknown>)
          : {};
      const weeklyTasks = Array.isArray(weeklyPlan.tasks)
        ? weeklyPlan.tasks
        : [];
      const recovery =
        weeklyPlan.recovery && typeof weeklyPlan.recovery === "object"
          ? (weeklyPlan.recovery as Record<string, unknown>)
          : null;
      const recoveryTask =
        recovery?.task && typeof recovery.task === "object"
          ? (recovery.task as Record<string, unknown>)
          : null;
      const candidateIds = [
        ...queueItems.map((item) =>
          item && typeof item === "object"
            ? (item as Record<string, unknown>).itemId
            : null,
        ),
        ...todayQueue.map((item) =>
          item && typeof item === "object"
            ? (item as Record<string, unknown>).itemId
            : null,
        ),
        todayFocus.sourceItemId,
        ...weeklyTasks.map((task) =>
          task && typeof task === "object"
            ? (task as Record<string, unknown>).itemId
            : null,
        ),
        recoveryTask?.itemId,
      ].filter(
        (value): value is string =>
          typeof value === "string" && value.length > 0,
      );

      const details: Array<{
        itemId: string;
        read: { status: number; body: Record<string, unknown> };
      }> = [];
      const queuedIds = [...new Set(candidateIds)];
      const visited = new Set<string>();
      while (queuedIds.length > 0) {
        const itemId = queuedIds.shift()!;
        if (visited.has(itemId)) continue;
        if (visited.size >= 100)
          throw new Error(
            "Synthetic ownership ancestry exceeded its fail-closed bound.",
          );
        visited.add(itemId);
        const read = await readJson(
          `/api/os/items/${encodeURIComponent(itemId)}`,
        );
        details.push({ itemId, read });
        const detail =
          read.body.detail && typeof read.body.detail === "object"
            ? (read.body.detail as Record<string, unknown>)
            : null;
        const item =
          detail?.item && typeof detail.item === "object"
            ? (detail.item as Record<string, unknown>)
            : null;
        const rawPayload =
          item?.rawPayload && typeof item.rawPayload === "object"
            ? (item.rawPayload as Record<string, unknown>)
            : null;
        const sourceId = rawPayload?.rewrite_source_item_id;
        if (
          typeof sourceId === "string" &&
          sourceId.length > 0 &&
          !visited.has(sourceId)
        ) {
          queuedIds.push(sourceId);
        }
      }
      return { session, items, logs, queue, today, weekly, details };
    },
    { includePlanning },
  );
}

function exactItemFields(
  item: SyntheticItem,
  expected: {
    subjectLabel: string;
    sourceLabel: string;
    problemTitle: string | RegExp;
    rawQuestionText?: string;
    rawAnswerText?: string;
    correctAnswer: string;
    userAnswer: string;
    userReasonText: string;
  },
) {
  const titleMatches =
    expected.problemTitle instanceof RegExp
      ? expected.problemTitle.test(item.problemTitle ?? "")
      : item.problemTitle === expected.problemTitle;
  return (
    item.examName === "감정평가사 2차" &&
    item.subjectLabel === expected.subjectLabel &&
    item.sourceType === "text" &&
    item.sourceLabel === expected.sourceLabel &&
    titleMatches &&
    (item.problemIdentifier === undefined || item.problemIdentifier === "") &&
    item.rawQuestionText === expected.rawQuestionText &&
    item.rawAnswerText === expected.rawAnswerText &&
    item.correctAnswer === expected.correctAnswer &&
    item.userAnswer === expected.userAnswer &&
    item.userReasonText === expected.userReasonText &&
    (item.userReasonPreset === undefined || item.userReasonPreset === "") &&
    item.confidence === "중간"
  );
}

function h2AcceptanceMarkers(
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

function isCurrentH2Ledger(item: SyntheticItem) {
  return (
    item.examName === "감정평가사 2차" &&
    item.subjectLabel === "감정평가 및 보상법규" &&
    item.sourceType === "text" &&
    item.sourceLabel === syntheticFixtureSource &&
    item.problemTitle === syntheticFixtureTitle &&
    item.problemIdentifier === syntheticFixtureProblemIdentifier &&
    item.rawQuestionText === syntheticFixtureQuestion &&
    item.rawAnswerText === syntheticFixtureAnswer &&
    item.correctAnswer === syntheticFixtureCorrectAnswer &&
    item.userAnswer === syntheticFixtureAnswer &&
    item.userReasonText === syntheticFixtureGap &&
    item.confidence === "중간" &&
    h2AcceptanceMarkers(item, "ledger")
  );
}

function isLegacyH2Ledger(item: SyntheticItem) {
  return exactItemFields(item, {
    subjectLabel: "감정평가 및 보상법규",
    sourceLabel: syntheticFixtureSource,
    problemTitle: syntheticFixtureTitle,
    rawQuestionText: syntheticFixtureQuestion,
    rawAnswerText: syntheticFixtureAnswer,
    correctAnswer: syntheticFixtureCorrectAnswer,
    userAnswer: syntheticFixtureAnswer,
    userReasonText: syntheticFixtureGap,
  });
}

function isH2QueueAnchor(item: SyntheticItem) {
  const identifier = item.problemIdentifier?.match(
    /^s232h2:v3-visual:queue:(\d{3})$/,
  );
  if (!identifier) return false;
  const generation = identifier[1];
  return (
    item.examName === "감정평가사 2차" &&
    item.subjectLabel === "감정평가 및 보상법규" &&
    item.sourceType === "text" &&
    item.sourceLabel === syntheticQueueAnchorSource &&
    item.problemTitle === `S232H2 합성 복습 앵커 ${generation}` &&
    item.rawQuestionText ===
      `S232H2 합성 복습 앵커 ${generation}: 신뢰보호 요건을 다시 연결합니다.` &&
    item.rawAnswerText === syntheticFixtureAnswer &&
    item.correctAnswer === syntheticFixtureCorrectAnswer &&
    item.userAnswer === syntheticFixtureAnswer &&
    item.userReasonText === syntheticFixtureGap &&
    item.confidence === "낮음" &&
    h2AcceptanceMarkers(item, "queue-anchor")
  );
}

const historicalSyntheticContracts = [
  (item: SyntheticItem) =>
    exactItemFields(item, {
      subjectLabel: "감정평가 및 보상법규",
      sourceLabel: "S228 synthetic runtime acceptance",
      problemTitle: /^S228 synthetic Study Ledger [0-9a-f]{10}$/,
      rawQuestionText:
        "신뢰보호원칙의 적용 요건을 검토하시오. 합성 테스트 데이터입니다.",
      rawAnswerText:
        "합리적 기대 가능성은 행정청의 공적 견해표명과 보호가치 있는 신뢰를 중심으로 검토합니다. 다만 이 문단은 비교를 위한 합성 테스트 기록입니다.",
      correctAnswer:
        "공적 견해표명, 귀책사유 부재, 신뢰에 따른 행위, 보호가치를 순서대로 확인합니다.",
      userAnswer:
        "합리적 기대 가능성은 행정청의 공적 견해표명과 보호가치 있는 신뢰를 중심으로 검토합니다. 다만 이 문단은 비교를 위한 합성 테스트 기록입니다.",
      userReasonText: "신뢰보호 요건과 사실관계의 대응 문장이 빠져 있습니다.",
    }),
  (item: SyntheticItem) =>
    exactItemFields(item, {
      subjectLabel: "감정평가실무",
      sourceLabel: "S232B.1 synthetic runtime acceptance",
      problemTitle: /^S232B\.1 synthetic confirmed detail [0-9a-f]{10}$/,
      rawQuestionText:
        "보상액 산정의 기준시점과 적용 근거를 설명하시오. 합성 테스트 데이터입니다.",
      rawAnswerText:
        "보상액 산정의 기준시점과 적용 근거를 순서대로 연결합니다. S232B.1 합성 테스트 기록입니다.",
      correctAnswer: "기준시점과 적용 근거를 순서대로 설명합니다.",
      userAnswer:
        "보상액 산정의 기준시점과 적용 근거를 순서대로 연결합니다. S232B.1 합성 테스트 기록입니다.",
      userReasonText:
        "기준시점과 적용 근거 사이의 연결 문장을 한 번 더 확인합니다.",
    }),
  (item: SyntheticItem) =>
    exactItemFields(item, {
      subjectLabel: "감정평가실무",
      sourceLabel: "S232B.2 synthetic runtime acceptance",
      problemTitle: /^S232B\.2 synthetic StickyAction detail [0-9a-f]{10}$/,
      rawQuestionText:
        "보상액 산정 기준과 적용 근거를 설명하시오. 합성 테스트 데이터입니다.",
      rawAnswerText:
        "보상액 산정 기준과 적용 근거를 순서대로 연결합니다. S232B.2 합성 테스트 기록입니다.",
      correctAnswer: "기준과 적용 근거를 순서대로 설명합니다.",
      userAnswer:
        "보상액 산정 기준과 적용 근거를 순서대로 연결합니다. S232B.2 합성 테스트 기록입니다.",
      userReasonText: "기준과 근거 사이의 연결 문장을 한 번 더 확인합니다.",
    }),
  (item: SyntheticItem) =>
    exactItemFields(item, {
      subjectLabel: "감정평가 및 보상법규",
      sourceLabel: "S227 synthetic invited-account runtime",
      problemTitle: /^S227 합성 학습 기록 [0-9a-f]{10}$/,
      rawQuestionText:
        "사업인정의 처분성을 검토하시오. 합성 테스트 데이터입니다.",
      rawAnswerText:
        "사업인정은 공익사업의 시행을 확정하고 수용권을 설정하는 처분으로 검토합니다. 이 문장은 초대 계정 흐름 검증만을 위한 합성 기록입니다.",
      correctAnswer:
        "사업인정의 공익사업 확정, 수용권 설정, 권리구제 필요성을 순서대로 확인합니다.",
      userAnswer:
        "사업인정은 공익사업의 시행을 확정하고 수용권을 설정하는 처분으로 검토합니다. 이 문장은 초대 계정 흐름 검증만을 위한 합성 기록입니다.",
      userReasonText:
        "처분성의 근거와 구체적 법률효과를 연결하는 문장이 빠져 있습니다.",
    }),
  (item: SyntheticItem) =>
    exactItemFields(item, {
      subjectLabel: "감정평가이론",
      sourceLabel: "S227 synthetic empty-evidence runtime",
      problemTitle: /^S227 합성 빈 근거 기록 [0-9a-f]{10}$/,
      correctAnswer: "",
      userAnswer: "",
      userReasonText: "비교 근거를 추가하기 전의 정직한 빈 상태를 확인합니다.",
    }),
] as const;

function matchesExactSyntheticRootFields(item: SyntheticItem) {
  return (
    isCurrentH2Ledger(item) ||
    isLegacyH2Ledger(item) ||
    isH2QueueAnchor(item) ||
    historicalSyntheticContracts.some((contract) => contract(item))
  );
}

const exactSyntheticRewriteParagraphs = new Set([
  "행정청의 공적 견해표명이 있었고 학습자에게 귀책사유가 없으며, 그 신뢰에 따른 행위와 보호가치를 사실관계에 대응해 검토하므로 신뢰보호원칙의 적용 가능성을 인정할 수 있습니다. 합성 테스트 문단입니다.",
  "사업인정은 공익사업 시행을 확정하면서 수용권을 설정하여 국민의 권리관계에 직접 영향을 주고, 그 법률효과에 대한 권리구제가 필요하므로 처분성을 인정할 수 있습니다. 합성 테스트 문단입니다.",
]);

const exactSyntheticPayloadSystemStrings = new Set([
  "",
  "text",
  "second",
  "save",
  "capture",
  "capture-note",
  "second_correction",
  "교정노트",
  "rewrite",
  "paragraph_rewrite",
  "second_answer_rewrite",
  "legal_application",
  "legal_issue_recall",
  "requirement_subsumption",
  "theory_keyword",
  "keyword_recall",
  "outline_recall",
  "calculation_template",
  "formula_check",
  "casio_step",
  "curriculum_capture",
  "captured_unchecked_concept",
  "draft",
  "unknown",
  "confused",
  "low",
  "medium",
  "high",
  "critical",
  "ai_suggested",
  "needs_review",
  "rules",
  "fallback",
  "concept_confusion",
  "2차 답안 보강",
  "s204.learner_answer_submission.v1",
  "user_owned_service_data",
  "authenticated_request_user",
  "derived_learning_metadata",
  "not_required_text_input",
  "confirmed_by_learner",
  "review_os_wrong_answer_item",
  "server_record_after_save_local_draft_before_save",
  "learning_support_draft",
  "OCR 결과는 학습 보조 초안입니다. 저장 전 직접 수정할 수 있습니다.",
  "사용자 확인 후 개인 노트에만 보관",
  "사례 요약은 노트 세부에서 확인합니다.",
  "내 답안 요약은 노트 세부에서 확인합니다.",
  "10분 다시쓰기",
  "10분 다시 쓰기",
  "한 문단 설명 다시쓰기",
  "처분성 판단 문단 보강",
  "목차 3줄 회상 후 10분 다시쓰기",
  "키워드 3개 회상 후 한 문단 설명",
  "타건 순서는 지원되는 계산 템플릿에 한해 제공됩니다.",
  "사업인정 처분성·권리구제 관계 구분",
  "답안 구조 점검",
  "답안 구조 점검(점검 필요)",
  "구조",
  "개념 확인 필요",
  "구조 보강 필요",
  "처분성 문단",
  "산식 검산",
  "키워드 논리",
  "3방식",
  "사업인정",
  "토지보상법",
  "행정법 기초",
  "시장가치/공정가치",
  "10초 확인",
  "일치하는 커리큘럼 노드를 찾지 못해 과목 기반 안전 후보로 유지합니다.",
  "s232h2:v3-visual:v1",
  "ledger",
  "queue-anchor",
  "감정평가 및 보상법규",
  "감정평가실무",
  "감정평가이론",
  "신뢰보호",
  "공적 견해표명",
  "보호가치",
  "기준시점",
  "적용 근거",
  "산정 기준",
  "사업인정",
  "처분성",
  "수용권",
  "시장가치",
  "가치다원성",
  "요건과 사실 적용을 같은 순서로 연결해야 합니다.",
  "공적 견해표명에 해당하는 사실을 구체적으로 연결해야 합니다.",
  "공적 견해표명에 해당하는 합성 사실을 구체적으로 연결해야 합니다.",
  "요건, 대응 사실, 소결론을 한 문단에 연결합니다.",
  "I. 공적 견해표명 II. 신뢰와 귀책 III. 보호가치 IV. 결론",
  "신뢰보호 요건을 순서대로 검토합니다.",
  "법률효과와 권리구제 필요성을 같은 순서로 연결해야 합니다.",
  "사업인정으로 발생하는 구체적 법률효과를 적어야 합니다.",
  "처분의 법률효과와 권리구제 필요성을 한 문단에 연결합니다.",
  "사업인정의 처분성을 법률효과 중심으로 검토합니다.",
  "I. 사업인정의 성격 II. 수용권 설정 III. 권리구제 IV. 결론",
  "근거를 확인한 뒤 구조를 보강합니다.",
  "확인되지 않은 근거는 단정하지 않습니다.",
  "근거를 확인한 뒤 한 문단을 작성합니다.",
  "시장가치와 가치다원성의 관계를 확인합니다.",
  "I. 시장가치 II. 가치다원성 III. 관계",
  "기준시점과 적용 근거를 한 문단에 연결합니다.",
  "기준과 근거를 한 문단에 연결합니다.",
  "요건을 먼저 쓰고 대응 사실과 소결론을 한 문단에 연결합니다.",
  // Exact public metadata produced by the current taxonomy and curriculum
  // builders for the six allowlisted synthetic fixture families. Never add
  // observed payload values or AI output here.
  "요건",
  "공익사업 요건",
  "요건식별",
  "필수요건 누락",
  "요건 충족 판단 근거 부족",
  "감정평가",
  "보상법규",
  "요건을",
  "요건과",
  "조문",
  "핵심 조문 구조",
  "조문인용 정확도",
  "조문 번호 혼동",
  "요건-효과 연결 누락",
  "사안포섭",
  "쟁점 구조화",
  "포섭 논증",
  "쟁점 누락",
  "규범-사실 연결 부족",
  "판례/법리",
  "쟁점별 판례법리",
  "판례 적용",
  "사실관계와 법리 분리 실패",
  "판례 취지 오독",
  "적용",
  "사실",
  "적용을",
  "local_taxonomy_v1",
  "행정법 기초에서 쟁점/조문/요건/사안 포섭/결론 중 하나를 먼저 떠올려 보세요.",
  "감정평가 및 보상법규 문단 12분 다시쓰기",
  "1타 쉬운풀이",
  "합격 한 줄",
  "출제자 함정",
  "curriculum-capture-capture-note-second-감정평가-및-보상법규-fallback",
  "감정평가 및 보상법규 감정평가 및 보상법규 12분 다시쓰기",
  "curriculum-review-capture-note-second-감정평가-및-보상법규-fallback",
  "요건과 사실 적용을 같은 순서로 연결해야 합니다.(점검 필요)",
  "토지보상법에서 쟁점/조문/요건/사안 포섭/결론 중 하나를 먼저 떠올려 보세요.",
  "평가방법 선택",
  "방법 적용 판단",
  "방법선택 논증",
  "대상물 특성 미반영",
  "방법 선택 근거 부족",
  "근거",
  "결론 수치",
  "시산가액 조정",
  "결론 정합성 검토",
  "시산가액 조정근거 부족",
  "결론-근거 불일치",
  "합성",
  "수익방식",
  "환원/할인",
  "수익가치 산정",
  "현금흐름 가정 불명확",
  "환원율 적용 오류",
  "3방식에서 산식/단위/계산과정/결론 기재값 중 하나를 먼저 적어 보세요.",
  "second_practice_income_approach",
  "수익환원법 적용과 검산",
  "issue_spotting",
  "수익환원법 적용과 검산 15분 다시쓰기",
  "outline_recall → calculation_template → casio_step → 7일 뒤 paragraph_rewrite",
  "retrieval_check_then_1_3",
  "감정평가실무 개념 상태: unknown → confused",
  "curriculum-capture-capture-note-second_practice_income_approach",
  "실무 수익환원법 적용과 검산 산식 검산 15분",
  "curriculum-review-capture-note-second_practice_income_approach",
  "수익환원법 적용과 검산 산식 검산 재시도 예약",
  "보정",
  "개별요인 보정",
  "보정근거 제시",
  "보정항목 누락",
  "보정률 근거 부족",
  "second_practice_compensation_amount",
  "보상액 산정 구조",
  "절차",
  "절차 단계 서술",
  "절차 선후 누락",
  "주체별 권한 혼동",
  "사업인정의",
  "사업인정으로",
  "효과",
  "법률효과를",
  "법률효과와",
  "결론",
  "최종 결론 구성",
  "결론 압축",
  "근거 없는 단정",
  "주문형 결론 누락",
  "사업인정에서 쟁점/조문/요건/사안 포섭/결론 중 하나를 먼저 떠올려 보세요.",
  "second_law_project_approval_disposition",
  "사업인정의 처분성과 권리구제",
  "사업인정의 처분성과 권리구제 문단 10분 다시쓰기",
  "issue_spotting → legal_application → 4일 뒤 outline_recall → 14일 뒤 paragraph_rewrite",
  "감정평가 및 보상법규 개념 상태: unknown → confused",
  "curriculum-capture-capture-note-second_law_project_approval_disposition",
  "법규 사업인정 처분성 문단 10분 다시쓰기",
  "curriculum-review-capture-note-second_law_project_approval_disposition",
  "사업인정의 처분성과 권리구제 처분성 문단 재시도 예약",
  "법률효과와 권리구제 필요성을 같은 순서로 연결해야 합니다.(점검 필요)",
  "평가방식 논리",
  "방식 간 정합성",
  "논리 전개",
  "방식별 전제 누락",
  "논리 비약",
  "가치이론",
  "가치개념 구분",
  "개념 정합성",
  "가치개념 혼용",
  "정의 반복형 서술",
  "최고최선이용",
  "법적·물리적·경제적 검토",
  "판단기준 적용",
  "검토순서 혼동",
  "실현가능성 검토 누락",
  "시장가치/공정가치에서 정의/논거/비교/사례 적용 키워드를 먼저 떠올려 보세요.",
  ...exactSyntheticRewriteParagraphs,
]);

const exactSyntheticSystemValuePatterns = [
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z)?$/,
  /^s232h2:v3-visual:(?:ledger:v1|queue:\d{3})$/,
  /^concept:second:(?:감정평가실무:(?:3방식|원가방식|비교방식|수익방식|토지평가|건물평가|임대료평가|보상평가|특수물건|검산-CASIO)|감정평가이론:(?:감정평가의-본질|가치이론|시장분석|최고최선이용|3방식-이론|시장가치-공정가치|감정평가-절차|평가윤리)|감정평가-및-보상법규:(?:행정법-기초|토지보상법|사업인정|수용재결|손실보상-원칙|보상항목|행정쟁송|감정평가법령))$/,
  /^curriculum-(?:capture|review)-capture-note-second-(?:practice-(?:method-selection|adjustment|income-approach|cost-approach|sales-comparison|final-value)|theory-(?:value-theory|price-principle|approach-logic|market-analysis|highest-best-use)|comp-law-(?:requirements|statute|procedure-project-approval|precedent-principles|issue-subsumption|conclusion))$/,
  /^second-(?:practice-(?:method-selection|adjustment|income-approach|cost-approach|sales-comparison|final-value)|theory-(?:value-theory|price-principle|approach-logic|market-analysis|highest-best-use)|comp-law-(?:requirements|statute|procedure-project-approval|precedent-principles|issue-subsumption|conclusion))$/,
] as const;

function exactSyntheticPayloadValues(
  item: SyntheticItem,
  parent?: SyntheticItem,
) {
  const allowed = new Set(exactSyntheticPayloadSystemStrings);
  const trustedRecords = [item, parent].filter(
    (value): value is SyntheticItem => Boolean(value),
  );
  for (const trusted of trustedRecords) {
    for (const value of [
      trusted.id,
      trusted.itemId,
      trusted.userId,
      trusted.examName,
      trusted.subjectLabel,
      trusted.sourceType,
      trusted.sourceLabel,
      trusted.problemTitle,
      trusted.problemIdentifier,
      trusted.rawQuestionText,
      trusted.rawAnswerText,
      trusted.correctAnswer,
      trusted.userAnswer,
      trusted.userReasonText,
      trusted.userReasonPreset,
      trusted.confidence,
    ]) {
      if (typeof value !== "string") continue;
      allowed.add(value);
      allowed.add(`${value}(후보)`);
      allowed.add(`${value}(점검 필요)`);
      allowed.add(`${value}(다시 확인할 부분)`);
    }
  }
  return allowed;
}

function hasExactSyntheticPayloadContract(
  item: SyntheticItem,
  parent?: SyntheticItem,
) {
  const allowed = exactSyntheticPayloadValues(item, parent);
  return exactSyntheticPayloadFailurePaths(item, allowed).length === 0;
}

function exactSyntheticPayloadFailurePaths(
  item: SyntheticItem,
  allowed = exactSyntheticPayloadValues(item),
) {
  return collectSyntheticPayloadFailurePaths(
    item,
    (value) =>
      allowed.has(value) ||
      exactSyntheticSystemValuePatterns.some((pattern) =>
        pattern.test(value),
      ),
  );
}

function isExactSyntheticRoot(item: SyntheticItem) {
  return (
    matchesExactSyntheticRootFields(item) &&
    hasExactSyntheticPayloadContract(item)
  );
}

function isOwnedSyntheticRewrite(item: SyntheticItem, parent: SyntheticItem) {
  const rawPayload = item.rawPayload ?? {};
  if (
    item.examName !== parent.examName ||
    item.subjectLabel !== parent.subjectLabel ||
    item.sourceType !== parent.sourceType ||
    item.confidence !== parent.confidence ||
    rawPayload.rewrite_completed !== true ||
    item.problemTitle !== parent.problemTitle ||
    rawPayload.rewrite_source_item_id !== resolveSyntheticItemId(parent)
  )
    return false;
  const rewriteParagraph = rawPayload.rewrite_paragraph;
  if (
    typeof rewriteParagraph !== "string" ||
    !exactSyntheticRewriteParagraphs.has(rewriteParagraph)
  )
    return false;
  const parentValues = new Set([
    parent.sourceLabel,
    parent.problemTitle,
    parent.problemIdentifier,
    parent.rawQuestionText,
    parent.rawAnswerText,
    parent.correctAnswer,
    parent.userAnswer,
    parent.userReasonText,
    parent.userReasonPreset,
    parent.confidence,
    rewriteParagraph,
    undefined,
    null,
    "",
  ]);
  const visibleValues = [
    item.sourceLabel,
    item.problemTitle,
    item.problemIdentifier,
    item.rawQuestionText,
    item.rawAnswerText,
    item.correctAnswer,
    item.userAnswer,
    item.userReasonText,
    item.userReasonPreset,
    rawPayload.rewrite_source_gap,
    rawPayload.rewrite_instruction,
    rawPayload.rewrite_paragraph,
  ];
  return (
    visibleValues.every((value) => parentValues.has(value)) &&
    hasExactSyntheticPayloadContract(item, parent)
  );
}

function classifyOwnedSyntheticItems(
  items: SyntheticItem[],
  sessionUserId: string,
) {
  const byId = new Map(
    items.map((item) => [resolveSyntheticItemId(item), item] as const),
  );
  const owned = new Set<string>();
  for (const [itemId, item] of byId) {
    if (itemId && item.userId === sessionUserId && isExactSyntheticRoot(item))
      owned.add(itemId);
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const [itemId, item] of byId) {
      if (!itemId || owned.has(itemId) || item.userId !== sessionUserId)
        continue;
      const sourceId =
        typeof item.rawPayload?.rewrite_source_item_id === "string"
          ? item.rawPayload.rewrite_source_item_id
          : "";
      const parent = byId.get(sourceId);
      if (
        sourceId &&
        parent &&
        owned.has(sourceId) &&
        isOwnedSyntheticRewrite(item, parent)
      ) {
        owned.add(itemId);
        changed = true;
      }
    }
  }
  return { byId, owned };
}

function planningItemIds(observed: SyntheticAccountData) {
  const todayFocus =
    observed.today?.body.focus && typeof observed.today.body.focus === "object"
      ? (observed.today.body.focus as Record<string, unknown>)
      : {};
  const todayQueue = Array.isArray(todayFocus.queue) ? todayFocus.queue : [];
  const weeklyPlan =
    observed.weekly?.body.plan && typeof observed.weekly.body.plan === "object"
      ? (observed.weekly.body.plan as Record<string, unknown>)
      : {};
  const weeklyTasks = Array.isArray(weeklyPlan.tasks) ? weeklyPlan.tasks : [];
  const recovery =
    weeklyPlan.recovery && typeof weeklyPlan.recovery === "object"
      ? (weeklyPlan.recovery as Record<string, unknown>)
      : null;
  const recoveryTask =
    recovery?.task && typeof recovery.task === "object"
      ? (recovery.task as Record<string, unknown>)
      : null;
  return {
    today: [
      ...todayQueue.map((item) =>
        item && typeof item === "object"
          ? (item as Record<string, unknown>).itemId
          : null,
      ),
      todayFocus.sourceItemId,
    ].filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    ),
    weekly: [
      ...weeklyTasks.map((task) =>
        task && typeof task === "object"
          ? (task as Record<string, unknown>).itemId
          : null,
      ),
      recoveryTask?.itemId,
    ].filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    ),
  };
}

async function auditSyntheticAccount(
  page: Page,
  {
    expectedItemId,
    includePlanning,
  }: { expectedItemId?: string; includePlanning: boolean },
): Promise<SyntheticAccountAudit> {
  const observed = await readSyntheticAccountData(page, { includePlanning });
  const requiredReads = [
    observed.session,
    observed.items,
    observed.logs,
    observed.queue,
  ];
  if (includePlanning) requiredReads.push(observed.today!, observed.weekly!);
  for (const value of requiredReads) {
    expect(
      value.status,
      "Every privacy-audit API must be readable before screenshot capture.",
    ).toBe(200);
    expect(
      value.body.ok,
      "Every privacy-audit API must explicitly report ok=true.",
    ).toBe(true);
  }

  const session =
    observed.session.body.session &&
    typeof observed.session.body.session === "object"
      ? (observed.session.body.session as Record<string, unknown>)
      : {};
  const sessionUserId =
    typeof session.userId === "string" ? session.userId : "";
  const sessionBound =
    session.isAuthenticated === true &&
    session.isDemo === false &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      sessionUserId,
    ) &&
    typeof session.email === "string" &&
    session.email.toLowerCase() === testEmail.toLowerCase();
  // The operator runbook defines E2E_USER_EMAIL/E2E_USER_PASSWORD as a
  // test-only account. Those values are owner-controlled protected secrets;
  // the exact secret/session match above is the runtime trust root.
  const governedSyntheticAccount = sessionBound;
  expect(
    sessionBound,
    "The visual audit must be bound to the exact dedicated non-demo account.",
  ).toBe(true);
  expect(
    governedSyntheticAccount,
    "The protected test-only account secret must bind to the runtime session.",
  ).toBe(true);

  const listedItems = Array.isArray(observed.items.body.items)
    ? (observed.items.body.items as SyntheticItem[])
    : [];
  const logs = Array.isArray(observed.logs.body.logs)
    ? observed.logs.body.logs
    : [];
  const queue = Array.isArray(observed.queue.body.items)
    ? (observed.queue.body.items as SyntheticQueueCard[])
    : [];
  expect(Array.isArray(observed.items.body.items)).toBe(true);
  expect(Array.isArray(observed.logs.body.logs)).toBe(true);
  expect(Array.isArray(observed.queue.body.items)).toBe(true);

  const detailItems: SyntheticItem[] = [];
  for (const detailRead of observed.details) {
    expect(
      detailRead.read.status,
      `Synthetic ownership detail ${detailRead.itemId} must be readable.`,
    ).toBe(200);
    expect(detailRead.read.body.ok).toBe(true);
    const detail =
      detailRead.read.body.detail &&
      typeof detailRead.read.body.detail === "object"
        ? (detailRead.read.body.detail as Record<string, unknown>)
        : null;
    const item =
      detail?.item && typeof detail.item === "object"
        ? (detail.item as SyntheticItem)
        : null;
    expect(
      item,
      `Synthetic ownership detail ${detailRead.itemId} must contain an item.`,
    ).not.toBeNull();
    expect(resolveSyntheticItemId(item!)).toBe(detailRead.itemId);
    detailItems.push(item!);
  }
  const mergedById = new Map<string, SyntheticItem>();
  for (const item of [...listedItems, ...detailItems]) {
    const itemId = resolveSyntheticItemId(item);
    if (itemId) mergedById.set(itemId, item);
  }
  const mergedItems = [...mergedById.values()];
  const rootPayloadFailures = summarizeSyntheticPayloadFailurePaths(
    mergedItems
      .filter(matchesExactSyntheticRootFields)
      .map((item) => {
        const allowed = exactSyntheticPayloadValues(item);
        return {
          item,
          isAllowedString: (value: string) =>
            allowed.has(value) ||
            exactSyntheticSystemValuePatterns.some((pattern) =>
              pattern.test(value),
            ),
        };
      }),
  );
  const { owned } = classifyOwnedSyntheticItems(mergedItems, sessionUserId);
  const listedExactFixtures = listedItems.filter((item) =>
    owned.has(resolveSyntheticItemId(item)),
  );
  const accountOwned = new Set(
    mergedItems
      .filter((item) => item.userId === sessionUserId)
      .map(resolveSyntheticItemId)
      .filter(Boolean),
  );
  const listedAccountOwned = listedItems.filter(
    (item) => item.userId === sessionUserId,
  );
  const detailOwnershipClosed = detailItems.every(
    (item) => item.userId === sessionUserId,
  );
  const queueIds = queue
    .map((item) => item.itemId)
    .filter((value): value is string => Boolean(value));
  const syntheticQueue = queue.filter((item) =>
    Boolean(item.itemId && accountOwned.has(item.itemId)),
  );
  const planningIds = planningItemIds(observed);
  const syntheticTodayCount = planningIds.today.filter((itemId) =>
    accountOwned.has(itemId),
  ).length;
  const syntheticWeeklyCount = planningIds.weekly.filter((itemId) =>
    accountOwned.has(itemId),
  ).length;
  const itemListingComplete = listedItems.length < 501;
  const studyLogListingComplete = logs.length < 501;
  const strictOwnershipContract =
    listedAccountOwned.length === listedItems.length &&
    detailOwnershipClosed &&
    logs.length === 0;
  const queueDetailsAudited =
    queueIds.length === syntheticQueue.length &&
    queueIds.every((itemId) =>
      accountOwned.has(itemId) &&
      observed.details.some((detail) => detail.itemId === itemId),
    );
  const todayDetailsAudited =
    !includePlanning ||
    (planningIds.today.length === syntheticTodayCount &&
      planningIds.today.every((itemId) =>
        accountOwned.has(itemId) &&
        observed.details.some((detail) => detail.itemId === itemId),
      ));
  const weeklyTaskDetailsAudited =
    !includePlanning ||
    (planningIds.weekly.length === syntheticWeeklyCount &&
      planningIds.weekly.every((itemId) =>
        accountOwned.has(itemId) &&
        observed.details.some((detail) => detail.itemId === itemId),
      ));
  const pendingOwnedQueue = queueIds.some((itemId) => owned.has(itemId));
  const syntheticAccountOnly =
    governedSyntheticAccount &&
    itemListingComplete &&
    studyLogListingComplete &&
    strictOwnershipContract &&
    queueDetailsAudited &&
    todayDetailsAudited &&
    weeklyTaskDetailsAudited;
  const syntheticFixtureOnly =
    syntheticAccountOnly &&
    (!expectedItemId || owned.has(expectedItemId)) &&
    (!expectedItemId || pendingOwnedQueue);
  const privateLearnerContentCaptured = !(
    syntheticFixtureOnly &&
    governedSyntheticAccount &&
    strictOwnershipContract &&
    queueDetailsAudited &&
    todayDetailsAudited &&
    weeklyTaskDetailsAudited
  );

  expect(
    itemListingComplete,
    "The dedicated account item listing must be complete before capture.",
  ).toBe(true);
  expect(
    studyLogListingComplete,
    "The dedicated account study-log listing must be complete before capture.",
  ).toBe(true);
  expect(
    rootPayloadFailures,
    "Synthetic payload diagnostics expose schema paths and counts only, never values.",
  ).toEqual([]);
  expect(
    listedAccountOwned.length,
    "Every listed row must belong to the exact governed account.",
  ).toBe(listedItems.length);
  expect(
    logs.length,
    "The visual fixture creates no study logs; any study log makes capture fail closed.",
  ).toBe(0);
  expect(
    syntheticQueue.length,
    "Every queue row must close to a governed account item.",
  ).toBe(queue.length);
  expect(queueDetailsAudited).toBe(true);
  if (includePlanning) {
    expect(todayDetailsAudited).toBe(true);
    expect(weeklyTaskDetailsAudited).toBe(true);
  }
  if (expectedItemId) {
    expect(owned.has(expectedItemId)).toBe(true);
    expect(pendingOwnedQueue).toBe(true);
  }
  expect(syntheticAccountOnly).toBe(true);
  expect(syntheticFixtureOnly).toBe(true);
  expect(privateLearnerContentCaptured).toBe(false);

  return {
    items: listedItems,
    queue,
    ownedItemIds: owned,
    primaryQueueTitle: queue[0]?.problemTitle ?? null,
    privacyAudit: {
      accountItemCount: listedItems.length,
      syntheticItemCount: listedAccountOwned.length,
      exactFixtureItemCount: listedExactFixtures.length,
      accountStudyLogCount: logs.length,
      syntheticStudyLogCount: 0,
      queueItemCount: queue.length,
      syntheticQueueItemCount: syntheticQueue.length,
      todayItemCount: planningIds.today.length,
      syntheticTodayItemCount: syntheticTodayCount,
      itemListingComplete,
      studyLogListingComplete,
      sessionBound,
      governedSyntheticAccount,
      strictOwnershipContract,
      detailOwnershipClosed,
      pendingOwnedQueue,
      queueDetailsAudited,
      todayDetailsAudited,
      weeklyTaskDetailsAudited,
      syntheticAccountOnly,
      syntheticFixtureOnly,
      privateLearnerContentCaptured,
    },
  };
}

function syntheticItemPayload({
  role,
  generation,
}: {
  role: "ledger" | "queue-anchor";
  generation?: number;
}) {
  const serial = String(generation ?? 0).padStart(3, "0");
  const queueAnchor = role === "queue-anchor";
  return {
    examName: "감정평가사 2차",
    subjectLabel: "감정평가 및 보상법규",
    sourceType: "text",
    sourceLabel: queueAnchor
      ? syntheticQueueAnchorSource
      : syntheticFixtureSource,
    problemTitle: queueAnchor
      ? `S232H2 합성 복습 앵커 ${serial}`
      : syntheticFixtureTitle,
    problemIdentifier: queueAnchor
      ? `s232h2:v3-visual:queue:${serial}`
      : syntheticFixtureProblemIdentifier,
    rawQuestionText: queueAnchor
      ? `S232H2 합성 복습 앵커 ${serial}: 신뢰보호 요건을 다시 연결합니다.`
      : syntheticFixtureQuestion,
    rawAnswerText: syntheticFixtureAnswer,
    correctAnswer: syntheticFixtureCorrectAnswer,
    userAnswer: syntheticFixtureAnswer,
    userReasonText: syntheticFixtureGap,
    confidence: queueAnchor ? "낮음" : "중간",
    timeSpentSeconds: queueAnchor ? 180 : undefined,
    keyConcepts: ["신뢰보호", "공적 견해표명", "보호가치"],
    missingIssue: syntheticFixtureGap,
    weakStructurePoint: "요건과 사실 적용을 같은 순서로 연결해야 합니다.",
    weakApplicationSentence:
      "공적 견해표명에 해당하는 합성 사실을 구체적으로 연결해야 합니다.",
    rewriteInstruction: "요건, 대응 사실, 소결론을 한 문단에 연결합니다.",
    referenceStructure:
      "I. 공적 견해표명 II. 신뢰와 귀책 III. 보호가치 IV. 결론",
    myAnswerSummary: syntheticFixtureAnswer,
    issueRecall: "신뢰보호 요건을 순서대로 검토합니다.",
    outlineDraft: "I. 공적 견해표명 II. 신뢰와 귀책 III. 보호가치 IV. 결론",
    productionBeforeComparison: true,
    referenceAnswerAddedAfterProduction: true,
    biggestGap: syntheticFixtureGap,
    rewriteCompleted: false,
    captureIntent: "save",
    createdFromCapture: true,
    extractionPayload: {
      raw_ocr_text: syntheticFixtureAnswer,
      raw_extraction_json: {
        acceptance_fixture_id: syntheticOwnerId,
        acceptance_fixture_role: role,
      },
      normalized_draft: null,
      user_confirmed_fields: {
        subjectLabel: "감정평가 및 보상법규",
        userAnswer: syntheticFixtureAnswer,
        production_before_comparison: true,
        reference_answer_added_after_production: true,
        biggest_gap: syntheticFixtureGap,
        sourceType: "text",
        examMode: "second",
        acceptance_fixture_id: syntheticOwnerId,
        acceptance_fixture_role: role,
      },
    },
  };
}

async function postSyntheticItem(
  page: Page,
  payload: ReturnType<typeof syntheticItemPayload>,
) {
  const response = await page
    .context()
    .request.post("/api/os/items", { data: payload });
  const value = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    item?: { id?: string };
    deduped?: boolean;
    error?: string;
  };
  return {
    status: response.status(),
    ok: response.ok() && value.ok === true,
    value,
  };
}

async function ensureSyntheticLedgerFixture(
  page: Page,
  initialAudit: SyntheticAccountAudit,
) {
  let audit = initialAudit;
  let ledger = audit.items.find(
    (item) => isCurrentH2Ledger(item) || isLegacyH2Ledger(item),
  );
  if (!ledger) {
    const created = await postSyntheticItem(
      page,
      syntheticItemPayload({ role: "ledger" }),
    );
    expect(
      created.ok,
      created.value.error ??
        "The exact synthetic ledger fixture must be created.",
    ).toBe(true);
    expect(created.value.item?.id).toBeTruthy();
    audit = await auditSyntheticAccount(page, { includePlanning: false });
    ledger = audit.items.find(
      (item) => resolveSyntheticItemId(item) === created.value.item?.id,
    );
  }
  expect(
    ledger,
    "The exact synthetic ledger fixture must be present after preparation.",
  ).toBeDefined();
  const ledgerItemId = resolveSyntheticItemId(ledger!);
  expect(ledgerItemId).toBeTruthy();

  if (
    !audit.queue.some((item) =>
      Boolean(item.itemId && audit.ownedItemIds.has(item.itemId)),
    )
  ) {
    const existingGenerations = audit.items.flatMap((item) => {
      const match = item.problemIdentifier?.match(
        /^s232h2:v3-visual:queue:(\d{3})$/,
      );
      return match ? [Number(match[1])] : [];
    });
    let generation = Math.max(0, ...existingGenerations) + 1;
    let pendingQueueReady = false;
    const attemptEvidence: Array<{
      status: number;
      ok: boolean;
      deduped: boolean;
    }> = [];
    for (
      let attempt = 0;
      attempt < 2 && !pendingQueueReady;
      attempt += 1, generation += 1
    ) {
      const created = await postSyntheticItem(
        page,
        syntheticItemPayload({ role: "queue-anchor", generation }),
      );
      attemptEvidence.push({
        status: created.status,
        ok: created.ok,
        deduped: created.value.deduped === true,
      });
      if (!created.ok && created.status !== 409 && created.status !== 429) {
        expect(
          created.ok,
          created.value.error ?? "The synthetic queue anchor must be created.",
        ).toBe(true);
      }
      audit = await auditSyntheticAccount(page, { includePlanning: false });
      pendingQueueReady = audit.queue.some((item) =>
        Boolean(item.itemId && audit.ownedItemIds.has(item.itemId)),
      );
    }
    expect(
      pendingQueueReady,
      `A bounded exact-owned pending review queue must exist; creation attempts=${JSON.stringify(attemptEvidence)}.`,
    ).toBe(true);
  }
  return { ledgerItemId };
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
  const expected = new URL(requestedPath, "https://s232h2.invalid");
  const observed = new URL(page.url());
  expect(observed.pathname, `Unexpected redirect from ${requestedPath}`).toBe(
    expected.pathname,
  );
  for (const [key, value] of expected.searchParams) {
    expect(
      observed.searchParams.get(key),
      `Missing ${key} on ${requestedPath}`,
    ).toBe(value);
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
            name:
              element.getAttribute("aria-label") ??
              element.textContent?.trim().slice(0, 60) ??
              "",
            width: Math.round(targetRect.width * 10) / 10,
            height: Math.round(targetRect.height * 10) / 10,
          },
        ];
      }),
    );
}

async function focusRevealTargetFailures(page: Page) {
  const links = page.locator("a[data-v3-skip-link]");
  const failures: Array<{
    name: string;
    width: number;
    height: number;
    inViewport: boolean;
  }> = [];
  for (let index = 0; index < (await links.count()); index += 1) {
    const link = links.nth(index);
    const initiallyOffscreen = await link.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return (
        rect.bottom <= 0 ||
        rect.right <= 0 ||
        rect.top >= window.innerHeight ||
        rect.left >= window.innerWidth
      );
    });
    if (!initiallyOffscreen) continue;
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement)
        document.activeElement.blur();
      window.scrollTo(0, 0);
    });
    let reachedByKeyboard = false;
    for (let stop = 0; stop < 30 && !reachedByKeyboard; stop += 1) {
      await page.keyboard.press("Tab");
      reachedByKeyboard = await link.evaluate(
        (element) => document.activeElement === element,
      );
    }
    if (!reachedByKeyboard) {
      failures.push({
        name: (await link.textContent())?.trim().slice(0, 60) ?? "",
        width: 0,
        height: 0,
        inViewport: false,
      });
      continue;
    }
    await expect(
      link,
      "A keyboard-only skip target must reveal itself on focus.",
    ).toBeInViewport();
    const box = await link.boundingBox();
    const inViewport = await link.evaluate((element) =>
      element.matches(":focus-visible"),
    );
    if (!box || box.width < 44 || box.height < 44 || !inViewport) {
      failures.push({
        name: (await link.textContent())?.trim().slice(0, 60) ?? "",
        width: Math.round((box?.width ?? 0) * 10) / 10,
        height: Math.round((box?.height ?? 0) * 10) / 10,
        inViewport,
      });
    }
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement)
        document.activeElement.blur();
    });
  }
  return failures;
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
            name:
              element.getAttribute("aria-label") ??
              element.textContent?.trim().slice(0, 80) ??
              "",
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
            name:
              element.getAttribute("aria-label") ??
              element.textContent?.trim().slice(0, 60) ??
              "",
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

async function verifyKeyboardFocus(page: Page, primaryActionCount: number) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    window.scrollTo(0, 0);
  });

  let completedFocusTraversal = false;
  let everyFocusVisible = true;
  let enabledPrimaryReached = primaryActionCount === 0;
  let firstFocusIndex: number | null = null;
  let completionKind:
    | "enumerated-stops"
    | "browser-cycle"
    | "document-exit"
    | null = null;
  const visitedFocusIndexes = new Set<number>();
  let focusStopCount = 0;
  let emptyFocusStops = 0;
  for (let attempt = 0; attempt < 300; attempt += 1) {
    await page.keyboard.press("Tab");
    // Production keeps smooth scrolling for in-page navigation. Give the
    // browser a bounded chance to finish revealing the newly focused target
    // before measuring it; a target that remains offscreen still fails below.
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
    const state = await page.evaluate(() => {
      const element = document.activeElement;
      if (!(element instanceof HTMLElement) || element === document.body)
        return null;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const hasOutline =
        style.outlineStyle !== "none" &&
        Number.parseFloat(style.outlineWidth) > 0;
      const hasRing = style.boxShadow !== "none";
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
          candidateRect.width > 0 &&
          candidateRect.height > 0 &&
          candidateStyle.display !== "none" &&
          candidateStyle.visibility !== "hidden"
        );
      });
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
        focusIndex: focusable.indexOf(element),
        focusableCount: focusable.length,
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
      };
    });
    if (!state || state.focusIndex < 0) {
      emptyFocusStops += 1;
      if (emptyFocusStops > 2) {
        if (visitedFocusIndexes.size > 0) {
          completedFocusTraversal = true;
          completionKind = "document-exit";
        }
        break;
      }
      continue;
    }
    emptyFocusStops = 0;
    focusStopCount = Math.max(focusStopCount, state.focusableCount);
    if (firstFocusIndex === null) {
      firstFocusIndex = state.focusIndex;
    } else if (
      state.focusIndex === firstFocusIndex &&
      visitedFocusIndexes.size > 0
    ) {
      completedFocusTraversal = true;
      completionKind = "browser-cycle";
      break;
    }
    visitedFocusIndexes.add(state.focusIndex);
    if (!state.inViewport || !state.hasIndicator) everyFocusVisible = false;
    if (state?.inViewport && state.hasIndicator && state.explicitPrimary)
      enabledPrimaryReached = true;
    if (
      state.focusableCount > 0 &&
      visitedFocusIndexes.size >= state.focusableCount
    ) {
      completedFocusTraversal = true;
      completionKind = "enumerated-stops";
      break;
    }
  }
  const skipLinks = page.locator("a[data-v3-skip-link]");
  let skipLinkActivated = (await skipLinks.count()) === 0;
  if (!skipLinkActivated) {
    const skipLink = skipLinks.first();
    const expectedHash = await skipLink.getAttribute("href");
    expect(expectedHash).toMatch(/^#[a-z0-9_-]+$/i);
    await skipLink.evaluate((element) =>
      element.focus({ preventScroll: true }),
    );
    await page.keyboard.press("Enter");
    await expect.poll(() => new URL(page.url()).hash).toBe(expectedHash);
    skipLinkActivated = await page.evaluate((hash) => {
      if (!hash) return false;
      const target = document.querySelector(hash);
      return target instanceof HTMLElement && document.activeElement === target;
    }, expectedHash);
  }
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    root.style.scrollBehavior = previousScrollBehavior;
  });
  const passed =
    completedFocusTraversal &&
    visitedFocusIndexes.size > 0 &&
    everyFocusVisible &&
    enabledPrimaryReached &&
    skipLinkActivated;
  return {
    passed,
    completedFocusTraversal,
    completionKind,
    focusStopCount,
    visitedFocusStopCount: visitedFocusIndexes.size,
    everyFocusVisible,
    enabledPrimaryReached,
    skipLinkActivated,
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

async function auditRoute(
  page: Page,
  route: RouteDefinition,
  requestedPath: string,
  viewport: (typeof viewports)[number],
  options: {
    navigate?: boolean;
    state?: string;
    expectedCanonicalDock?: boolean;
  } = {},
): Promise<AuditRow> {
  await page.setViewportSize({
    width: viewport.width,
    height: viewport.height,
  });
  if (options.navigate !== false) {
    await gotoRequiredRoute(page, requestedPath);
  } else {
    await waitForStableRender(page);
  }
  if (
    options.navigate !== false &&
    route.id === "calculator" &&
    viewport.width === 390
  ) {
    await advanceCalculatorToCasioInput(page);
  }
  await page.evaluate(async () => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    window.scrollTo(0, 0);
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });

  const main = page.locator("main");
  await expect(
    main,
    `${route.label} must expose exactly one main landmark.`,
  ).toHaveCount(1);
  await expect(main).toBeVisible();
  const mainBox = await main.boundingBox();
  expect(mainBox).not.toBeNull();
  expect(mainBox!.width).toBeGreaterThan(0);
  expect(mainBox!.x).toBeGreaterThanOrEqual(-1);
  expect(mainBox!.x + mainBox!.width).toBeLessThanOrEqual(viewport.width + 1);

  const visibleH1Count = await page.locator("h1:visible").count();
  expect(
    visibleH1Count,
    `${route.label} must have one visible screen title.`,
  ).toBe(1);

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
  expect(
    foundation.horizontalOverflow,
    `${route.label} must not overflow horizontally.`,
  ).toBe(0);
  expect(foundation.canvasColor).toBe("rgb(247, 246, 243)");
  expect(foundation.bodyFontFamily).toMatch(/Noto Sans KR/i);
  expect(foundation.pageEdge).toBe(viewport.width < 768 ? 20 : 32);
  expect(foundation.controlHeight).toBe(52);
  expect(foundation.controlRadius).toBe(12);
  expect(foundation.readingColumn).toBe(680);
  expect(foundation.contentMax).toBe(1120);

  await verifyRepresentativeFigmaStructure(page, route.id, viewport.width);

  const primaryActions = await visiblePrimaryActions(page);
  const visiblePrimaryActionCount = primaryActions.length;
  expect(
    visiblePrimaryActionCount,
    `${route.label} must expose at most one primary action.`,
  ).toBeLessThanOrEqual(1);

  const targetFailures = [
    ...(await visibleTargetFailures(page)),
    ...(await focusRevealTargetFailures(page)),
  ];
  expect(
    targetFailures,
    `${route.label} has visible targets below 44×44.`,
  ).toEqual([]);
  const viewportBoundsFailures = await visibleViewportBoundsFailures(page);
  expect(
    viewportBoundsFailures,
    `${route.label} clips visible content outside the viewport.`,
  ).toEqual([]);

  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
  });
  const styles = await visualStyleMetrics(page);
  expect(styles.gradientCount, `${route.label} must not use gradients.`).toBe(
    0,
  );
  if (viewport.width === 1440) {
    expect(
      styles.shadowCount,
      `${route.label} desktop must not use shadows: ${JSON.stringify(styles.shadowElements)}.`,
    ).toBe(0);
  }

  const expectsCanonicalDock =
    options.expectedCanonicalDock ??
    (viewport.width < 1024 &&
      (route.id === "ledger" || route.id === "calculator"));
  if (expectsCanonicalDock) {
    expect(
      styles.fixedDocks,
      `${route.label} must expose exactly one canonical mobile dock.`,
    ).toHaveLength(1);
    expect(styles.fixedDocks[0]?.component).toBe("StickyAction");
    expect(styles.fixedDocks[0]?.height ?? 0).toBeGreaterThanOrEqual(84);
  } else {
    expect(
      styles.fixedDocks,
      `${route.label} must not invent a fixed mobile dock.`,
    ).toEqual([]);
  }

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const blockingAxe = axe.violations.filter(
    (violation) =>
      violation.impact === "serious" || violation.impact === "critical",
  );
  expect(
    blockingAxe,
    `${route.label} has serious/critical Axe violations: ${blockingAxe.map((item) => item.id).join(", ")}`,
  ).toEqual([]);

  const enabledPrimaryActionCount = primaryActions.filter(
    (action) => !action.disabled,
  ).length;
  const keyboardFocusAudit = await verifyKeyboardFocus(
    page,
    enabledPrimaryActionCount,
  );
  const keyboardFocusVisible = keyboardFocusAudit.passed;
  expect(
    keyboardFocusVisible,
    `${route.label} must expose visible keyboard focus: ${JSON.stringify(keyboardFocusAudit)}.`,
  ).toBe(true);

  return {
    auditKind: options.navigate === false ? "dynamic-state" : "initial-route",
    state: options.state ?? "initial",
    route: route.id,
    requestedPath:
      route.id === "ledger" ? "/app/items/[itemId]?mode=second" : requestedPath,
    viewport: `${viewport.width}x${viewport.height}`,
    viewportWidth: viewport.width,
    mainCount: 1,
    visibleH1Count,
    mainLeft: Math.round(mainBox!.x * 10) / 10,
    mainWidth: Math.round(mainBox!.width * 10) / 10,
    horizontalOverflow: foundation.horizontalOverflow,
    visiblePrimaryActionCount,
    undersizedTargetCount: targetFailures.length,
    viewportBoundsFailureCount: viewportBoundsFailures.length,
    axeSeriousOrCritical: blockingAxe.length,
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

async function captureSyntheticScreenshot(
  page: Page,
  testInfo: TestInfo,
  fileName: string,
  options: { fullPage?: boolean } = {},
): Promise<ScreenshotEvidence> {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    root.style.scrollBehavior = previousScrollBehavior;
  });

  const identity = page.locator(
    '[data-s224v-learner-mode-entry="second-only"] > span:last-child',
  );
  const visibleEmailOutsideMask = await page
    .locator("body *")
    .evaluateAll((elements, identitySelector) => {
      const pattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
      return elements.filter((element) => {
        if (
          !(element instanceof HTMLElement) ||
          element.matches(identitySelector)
        )
          return false;
        const directText = Array.from(element.childNodes)
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent ?? "")
          .join(" ")
          .trim();
        if (!pattern.test(directText)) return false;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== "none" &&
          style.visibility !== "hidden"
        );
      }).length;
    }, '[data-s224v-learner-mode-entry="second-only"] > span:last-child');
  expect(
    visibleEmailOutsideMask,
    "No visible email may escape the deterministic identity mask.",
  ).toBe(0);

  const masks: Locator[] = [];
  if ((await identity.count()) === 1 && (await identity.isVisible()))
    masks.push(identity);
  const buffer = await page.screenshot({
    path: testInfo.outputPath(fileName),
    fullPage: options.fullPage ?? true,
    animations: "disabled",
    mask: masks,
    maskColor: "#000000",
  });
  return { fileName, buffer };
}

async function advanceCalculatorToCasioInput(page: Page) {
  await page.evaluate(() => window.sessionStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForStableRender(page);

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

  const entries: Record<string, string> = {
    conditions: "합성 조건: 원문 숫자와 단위를 먼저 확인합니다.",
    formula: "합성 산식: V = I ÷ R",
    numbers_units: "합성 대입: 120,000원 ÷ 0.06",
  };
  for (const stepId of ["conditions", "formula", "numbers_units"] as const) {
    const active = trainer.locator(
      `[data-calculator-routine-active-step="${stepId}"]`,
    );
    await expect(active).toBeVisible();
    await active.locator("textarea").fill(entries[stepId]);

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
  await casio
    .locator("textarea")
    .fill("120000 ÷ 0.06 EXE · 합성 입력을 실제 기기에서 직접 대조합니다.");
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

  expect(metrics.actualWidth, `${reference.node} actual width`).toBe(
    metrics.referenceWidth,
  );
  expect(metrics.actualHeight, `${reference.node} actual height`).toBe(
    metrics.referenceHeight,
  );
  expect(
    metrics.meanColorDelta,
    `${reference.node} mean canonical-pixel delta`,
  ).toBeLessThanOrEqual(0.18);
  expect(
    metrics.nearPixelRatio,
    `${reference.node} near-canonical pixel ratio`,
  ).toBeGreaterThanOrEqual(0.5);
  expect(
    metrics.darkPixelRatioDelta,
    `${reference.node} quiet-navy distribution`,
  ).toBeLessThanOrEqual(0.09);
  expect(
    metrics.warmPixelRatioDelta,
    `${reference.node} recovery-cue distribution`,
  ).toBeLessThanOrEqual(0.09);
  expect(
    metrics.bluePixelRatioDelta,
    `${reference.node} evidence-blue distribution`,
  ).toBeLessThanOrEqual(0.12);
  expect(
    metrics.cellRgbMeanAbsoluteError,
    `${reference.node} spatial RGB grid`,
  ).toBeLessThanOrEqual(0.1);
  expect(
    metrics.cellOccupancyMeanAbsoluteError,
    `${reference.node} spatial semantic-color grid`,
  ).toBeLessThanOrEqual(0.12);
  expect(
    metrics.edgeGridCorrelation,
    `${reference.node} spatial edge-grid correlation`,
  ).toBeGreaterThanOrEqual(0.5);
  expect(
    metrics.edgeEnergyRatio,
    `${reference.node} edge-energy lower bound`,
  ).toBeGreaterThanOrEqual(0.4);
  expect(
    metrics.edgeEnergyRatio,
    `${reference.node} edge-energy upper bound`,
  ).toBeLessThanOrEqual(2.2);
  expect(
    metrics.dilatedEdgeF1,
    `${reference.node} spatial edge overlap`,
  ).toBeGreaterThanOrEqual(0.25);
  expect(
    metrics.anchorMaxRgbMeanDelta,
    `${reference.node} anchor RGB geometry`,
  ).toBeLessThanOrEqual(0.18);
  expect(
    metrics.anchorMaxLuminanceStdDelta,
    `${reference.node} anchor contrast geometry`,
  ).toBeLessThanOrEqual(0.18);
  expect(
    metrics.anchorMaxDarkRatioDelta,
    `${reference.node} anchor dark occupancy`,
  ).toBeLessThanOrEqual(0.2);
  expect(
    metrics.anchorMinEdgeDensityRatio,
    `${reference.node} anchor edge lower bound`,
  ).toBeGreaterThanOrEqual(0.2);
  expect(
    metrics.anchorMaxEdgeDensityRatio,
    `${reference.node} anchor edge upper bound`,
  ).toBeLessThanOrEqual(3.5);
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
  expect(
    passed,
    `${reference.node} must satisfy every direct Figma comparison threshold.`,
  ).toBe(true);

  return {
    node: reference.node,
    route: reference.route,
    actualFileName: actual.fileName,
    referenceFileName: reference.referenceFileName,
    ...metrics,
    passed,
  };
}

function routeDefinition(id: string) {
  const route = requiredRoutes.find((candidate) => candidate.id === id);
  if (!route) throw new Error(`Missing required route definition: ${id}`);
  return route;
}

async function auditDynamicState(
  page: Page,
  routeId: string,
  state: string,
  requestedPath: string,
) {
  return auditRoute(
    page,
    routeDefinition(routeId),
    requestedPath,
    viewports[0],
    {
      navigate: false,
      state,
      expectedCanonicalDock: false,
    },
  );
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
  await page.route("**/api/inverge/ocr", async (route) => {
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
          review_date_suggestion: "2026-07-18",
          needs_review: false,
        },
      }),
    });
  });
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
  await page.route("**/api/answer-review/structure", async (route) => {
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
  const textEntries: Record<string, string> = {
    display_value: "2,000,000 · 합성 화면값",
    answer_value: "2,000,000원 · 합성 기재값",
    unit_rounding: "원 단위로 합성 반올림을 확인했습니다.",
  };
  for (const stepId of [
    "display_value",
    "answer_value",
    "unit_rounding",
  ] as const) {
    const active = trainer.locator(
      `[data-calculator-routine-active-step="${stepId}"]`,
    );
    await expect(active).toBeVisible();
    await active.locator("textarea").fill(textEntries[stepId]);
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
    extraHTTPHeaders: protectionHeaders,
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

test("S232H.2 adopts V3 across the production learner routes with direct before/after evidence", async ({
  browser,
  page,
}, testInfo) => {
  requireSafeAuthenticatedRuntime("S232H.2", {
    requireTargetSha: true,
    requireExactHead: true,
  });
  requireSafeBaselineRuntime();
  expect(requiredRoutes).toHaveLength(13);
  expect(runtimeRunnerSha).toBe(runtimeTargetSha);

  await establishProtectedPreviewSession(page, "S232H.2 PR2");
  const afterAuthenticatedErrors = monitorPageRuntime(
    page,
    new URL(runtimeBaseUrl).origin,
  );
  const { signInAttempts } = await loginWithDedicatedTestAccount(
    page,
    "second",
  );
  await verifyRuntimeVersion(page, runtimeRunnerSha);
  const preMutationAudit = await auditSyntheticAccount(page, {
    includePlanning: false,
  });
  const { ledgerItemId: syntheticItemId } = await ensureSyntheticLedgerFixture(
    page,
    preMutationAudit,
  );
  const postMutationAudit = await auditSyntheticAccount(page, {
    expectedItemId: syntheticItemId,
    includePlanning: true,
  });
  const privacyAudit = postMutationAudit.privacyAudit;
  expect(postMutationAudit.primaryQueueTitle).toBeTruthy();

  const publicContext = await newPreviewContext(browser, runtimeBaseUrl);
  const publicPage = await publicContext.newPage();
  const afterPublicErrors = monitorPageRuntime(
    publicPage,
    new URL(runtimeBaseUrl).origin,
  );

  const initialAuditRows: AuditRow[] = [];
  const initialAfterScreenshots: ScreenshotEvidence[] = [];
  for (const viewport of viewports) {
    for (const route of requiredRoutes) {
      const routePage = route.authenticated ? page : publicPage;
      const requestedPath = resolveRoutePath(route, syntheticItemId);
      initialAuditRows.push(
        await auditRoute(routePage, route, requestedPath, viewport),
      );

      const isAllRouteMobileEvidence = viewport.width === 390;
      const isRequiredReflowEvidence =
        viewport.width === 768 &&
        (route.id === "today" || route.id === "ledger");
      const isRequiredDesktopEvidence =
        viewport.width === 1440 && route.id === "ledger";
      if (
        isAllRouteMobileEvidence ||
        isRequiredReflowEvidence ||
        isRequiredDesktopEvidence
      ) {
        if (route.id === "calculator" && viewport.width === 390) {
          await expect(
            routePage.locator(
              '[data-calculator-routine-active-step="casio_input"] [data-v3-component="CalculatorStep"]',
            ),
          ).toBeVisible();
        }
        const isRepresentativeViewport =
          (route.id === "ledger" &&
            (viewport.width === 390 || viewport.width === 1440)) ||
          (route.id === "calculator" && viewport.width === 390);
        initialAfterScreenshots.push(
          await captureSyntheticScreenshot(
            routePage,
            testInfo,
            `s232h2-after-${route.id}-${viewport.label}.png`,
            { fullPage: !isRepresentativeViewport },
          ),
        );
      }
    }
  }
  expect(initialAuditRows).toHaveLength(39);
  expect(initialAfterScreenshots).toHaveLength(16);

  const figmaComparisons: FigmaComparison[] = [];
  for (const reference of figmaReferences) {
    const actual = initialAfterScreenshots.find(
      (screenshot) => screenshot.fileName === reference.actualFileName,
    );
    expect(
      actual,
      `Missing actual screenshot for Figma ${reference.node}.`,
    ).toBeDefined();
    figmaComparisons.push(
      await compareScreenshotToFigmaReference(
        page,
        testInfo,
        actual!,
        reference,
      ),
    );
  }
  expect(figmaComparisons).toHaveLength(3);
  expect(figmaComparisons.every((comparison) => comparison.passed)).toBe(true);
  const figmaReferenceScreenshots = figmaReferences.map(
    (reference) => reference.referenceFileName,
  );

  const dynamicAuditRows: AuditRow[] = [];
  const dynamicScreenshots: ScreenshotEvidence[] = [];

  await prepareCaptureExtractionPreview(page);
  dynamicAuditRows.push(
    await auditDynamicState(
      page,
      "capture",
      "extraction-preview",
      "/app/capture?mode=second",
    ),
  );
  dynamicScreenshots.push(
    await captureSyntheticScreenshot(
      page,
      testInfo,
      "s232h2-after-capture-extraction-preview-390.png",
    ),
  );
  await page.unroute("**/api/inverge/ocr");

  await prepareAnswerReviewResult(page);
  dynamicAuditRows.push(
    await auditDynamicState(
      page,
      "answer-review",
      "result",
      "/answer-review?mode=second",
    ),
  );
  dynamicScreenshots.push(
    await captureSyntheticScreenshot(
      page,
      testInfo,
      "s232h2-after-answer-review-result-390.png",
    ),
  );
  await page.locator("[data-s232e4-rewrite-entry]").click();
  await expect(
    page.locator('[data-s232e4-answer-review-rewrite="single-paragraph"]'),
  ).toBeVisible();
  dynamicAuditRows.push(
    await auditDynamicState(
      page,
      "answer-review",
      "rewrite",
      "/answer-review?mode=second",
    ),
  );
  dynamicScreenshots.push(
    await captureSyntheticScreenshot(
      page,
      testInfo,
      "s232h2-after-answer-review-rewrite-390.png",
    ),
  );
  await page.unroute("**/api/answer-review/structure");

  await prepareReviewSelectedState(page, postMutationAudit.primaryQueueTitle!);
  dynamicAuditRows.push(
    await auditDynamicState(
      page,
      "review",
      "revealed-selected",
      "/app/review?mode=second",
    ),
  );
  dynamicScreenshots.push(
    await captureSyntheticScreenshot(
      page,
      testInfo,
      "s232h2-after-review-revealed-selected-390.png",
    ),
  );

  const savedCapturePath = `/app/session?mode=second&savedCapture=1&itemId=${encodeURIComponent(syntheticItemId)}`;
  await gotoRequiredRoute(page, savedCapturePath);
  await expect(
    page.getByText("오늘 계획에 반영했습니다.", { exact: true }),
  ).toBeVisible();
  dynamicAuditRows.push(
    await auditDynamicState(
      page,
      "session",
      "saved-capture",
      "/app/session?mode=second&savedCapture=1&itemId=[itemId]",
    ),
  );
  dynamicScreenshots.push(
    await captureSyntheticScreenshot(
      page,
      testInfo,
      "s232h2-after-session-saved-capture-390.png",
    ),
  );

  await page.route("**/api/os/calculator-routine/complete", async (route) => {
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
  });
  const calculatorPath =
    "/app/calculator?mode=second&context=practice&focus=casio";
  await gotoRequiredRoute(page, calculatorPath);
  await advanceCalculatorToCasioInput(page);
  await completeCalculatorRoutine(page);
  dynamicAuditRows.push(
    await auditDynamicState(
      page,
      "calculator",
      "completed-saved",
      calculatorPath,
    ),
  );
  dynamicScreenshots.push(
    await captureSyntheticScreenshot(
      page,
      testInfo,
      "s232h2-after-calculator-completed-saved-390.png",
    ),
  );
  await page.unroute("**/api/os/calculator-routine/complete");

  expect(dynamicAuditRows).toHaveLength(6);
  expect(dynamicScreenshots).toHaveLength(6);
  const auditRows = [...initialAuditRows, ...dynamicAuditRows];
  const afterScreenshots = [...initialAfterScreenshots, ...dynamicScreenshots];
  expect(auditRows).toHaveLength(45);
  expect(afterScreenshots).toHaveLength(22);

  const baselineContext: BrowserContext = await newPreviewContext(
    browser,
    baselineUrl,
  );
  const baselinePage = await baselineContext.newPage();
  const baselineErrors = monitorPageRuntime(
    baselinePage,
    new URL(baselineUrl).origin,
  );
  const baselineLogin = await loginWithDedicatedTestAccount(
    baselinePage,
    "second",
  );
  await verifyRuntimeVersion(baselinePage, baselineSha);

  const baselineScreenshots: ScreenshotEvidence[] = [];
  for (const viewport of [viewports[0], viewports[2]]) {
    await baselinePage.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await gotoRequiredRoute(
      baselinePage,
      `/app/items/${encodeURIComponent(syntheticItemId)}?mode=second`,
    );
    baselineScreenshots.push(
      await captureSyntheticScreenshot(
        baselinePage,
        testInfo,
        `s232h2-before-ledger-${viewport.label}.png`,
        { fullPage: false },
      ),
    );
  }
  await baselinePage.setViewportSize({ width: 390, height: 844 });
  await gotoRequiredRoute(
    baselinePage,
    "/app/calculator?mode=second&context=practice&focus=casio",
  );
  await advanceCalculatorToCasioInput(baselinePage);
  baselineScreenshots.push(
    await captureSyntheticScreenshot(
      baselinePage,
      testInfo,
      "s232h2-before-calculator-390.png",
      { fullPage: false },
    ),
  );
  expect(baselineScreenshots).toHaveLength(3);

  await verifyRuntimeVersion(page, runtimeRunnerSha);
  await verifyRuntimeVersion(baselinePage, baselineSha);
  await settleRuntimeMonitors(page, publicPage, baselinePage);

  const afterErrors = allErrorCounts(
    afterAuthenticatedErrors,
    afterPublicErrors,
  );
  expect(afterErrors.consoleErrors).toEqual([]);
  expect(afterErrors.pageErrors).toEqual([]);
  expect(afterErrors.sameOriginRequestFailures).toEqual([]);
  expect(baselineErrors.consoleErrors).toEqual([]);
  expect(baselineErrors.pageErrors).toEqual([]);
  expect(baselineErrors.sameOriginRequestFailures).toEqual([]);

  const screenshotNames = [
    ...baselineScreenshots.map((screenshot) => screenshot.fileName),
    ...afterScreenshots.map((screenshot) => screenshot.fileName),
    ...figmaReferenceScreenshots,
  ];
  expect(screenshotNames).toHaveLength(28);
  expect(new Set(screenshotNames).size).toBe(screenshotNames.length);
  const credentialsRedacted =
    testEmail.length > 0 && screenshotNames.every((name) => !/@/i.test(name));
  const syntheticContentCaptured =
    privacyAudit.syntheticFixtureOnly && afterScreenshots.length === 22;
  const acceptanceSignals = [
    initialAuditRows.length === 39,
    dynamicAuditRows.length === 6,
    auditRows.length === 45,
    baselineScreenshots.length === 3,
    initialAfterScreenshots.length === 16,
    dynamicScreenshots.length === 6,
    afterScreenshots.length === 22,
    figmaComparisons.length === 3,
    figmaComparisons.every((comparison) => comparison.passed),
    screenshotNames.length === 28,
    privacyAudit.syntheticAccountOnly,
    privacyAudit.syntheticFixtureOnly,
    privacyAudit.sessionBound,
    privacyAudit.strictOwnershipContract,
    privacyAudit.pendingOwnedQueue,
    privacyAudit.queueDetailsAudited,
    privacyAudit.todayDetailsAudited,
    privacyAudit.weeklyTaskDetailsAudited,
    !privacyAudit.privateLearnerContentCaptured,
    credentialsRedacted,
    afterErrors.consoleErrors.length === 0,
    afterErrors.pageErrors.length === 0,
    afterErrors.sameOriginRequestFailures.length === 0,
    baselineErrors.consoleErrors.length === 0,
    baselineErrors.pageErrors.length === 0,
    baselineErrors.sameOriginRequestFailures.length === 0,
    auditRows.every(
      (row) =>
        row.mainCount === 1 &&
        row.visibleH1Count === 1 &&
        row.horizontalOverflow === 0 &&
        row.visiblePrimaryActionCount <= 1 &&
        row.undersizedTargetCount === 0 &&
        row.viewportBoundsFailureCount === 0 &&
        row.axeSeriousOrCritical === 0 &&
        row.keyboardFocusVisible &&
        row.gradientCount === 0,
    ),
  ];
  const result = acceptanceSignals.every(Boolean) ? "pass" : "fail";
  expect(result).toBe("pass");

  const manifest = {
    schemaVersion: 2,
    result,
    runnerSha: runtimeRunnerSha,
    targetDeploymentSha: runtimeTargetSha,
    baselineDeploymentSha: baselineSha,
    mergeBaseSha,
    baselineTreeSha,
    signInAttempts,
    baselineSignInAttempts: baselineLogin.signInAttempts,
    routeCount: requiredRoutes.length,
    viewportCount: viewports.length,
    initialAuditRowCount: initialAuditRows.length,
    dynamicAuditRowCount: dynamicAuditRows.length,
    auditRowCount: auditRows.length,
    auditRows,
    beforeScreenshotCount: baselineScreenshots.length,
    initialAfterScreenshotCount: initialAfterScreenshots.length,
    dynamicScreenshotCount: dynamicScreenshots.length,
    afterScreenshotCount: afterScreenshots.length,
    figmaReferenceScreenshotCount: figmaReferenceScreenshots.length,
    figmaComparisonCount: figmaComparisons.length,
    screenshotCount: screenshotNames.length,
    screenshots: screenshotNames,
    figmaComparisons,
    consoleErrorCount: afterErrors.consoleErrors.length,
    pageErrorCount: afterErrors.pageErrors.length,
    sameOriginRequestFailureCount: afterErrors.sameOriginRequestFailures.length,
    baselineConsoleErrorCount: baselineErrors.consoleErrors.length,
    baselinePageErrorCount: baselineErrors.pageErrors.length,
    baselineSameOriginRequestFailureCount:
      baselineErrors.sameOriginRequestFailures.length,
    figmaMapping: {
      foundations: [
        { node: "43:2", contract: "Color & Theme" },
        { node: "44:9", contract: "Typography" },
        { node: "45:2", contract: "Layout & Spacing" },
      ],
      componentOverview: { node: "61:2", contract: "V3 component contracts" },
      componentContracts: [
        { node: "47:28", contract: "StateChip" },
        { node: "48:75", contract: "TrustEvidenceBar" },
        { node: "50:59", contract: "BiggestGap" },
        { node: "51:44", contract: "StickyAction" },
        { node: "52:42", contract: "EvidenceExcerpt" },
        { node: "53:129", contract: "CalculatorStep" },
        { node: "61:80", contract: "Utilities & States" },
      ],
      representatives: [
        {
          node: "56:2",
          route: "/app/items/[itemId]?mode=second",
          viewport: 390,
        },
        {
          node: "59:62",
          route: "/app/items/[itemId]?mode=second",
          viewport: 1440,
        },
        {
          node: "57:34",
          route: "/app/calculator?mode=second&context=practice&focus=casio",
          viewport: 390,
        },
      ],
      routeContracts: requiredRoutes.map((route) => ({
        route:
          route.id === "ledger"
            ? "/app/items/[itemId]?mode=second"
            : resolveRoutePath(route, "[itemId]"),
        nodes: routeContractNodes[route.id],
      })),
    },
    calculatorCasioInputVisible: initialAuditRows.some(
      (row) => row.route === "calculator" && row.viewportWidth === 390,
    ),
    horizontalOverflowMaximum: Math.max(
      ...auditRows.map((row) => row.horizontalOverflow),
    ),
    axeSeriousOrCritical: auditRows.reduce(
      (sum, row) => sum + row.axeSeriousOrCritical,
      0,
    ),
    undersizedTargetCount: auditRows.reduce(
      (sum, row) => sum + row.undersizedTargetCount,
      0,
    ),
    viewportBoundsFailureCount: auditRows.reduce(
      (sum, row) => sum + row.viewportBoundsFailureCount,
      0,
    ),
    privacyAudit,
    syntheticAccountOnly: privacyAudit.syntheticAccountOnly,
    syntheticFixtureOnly: privacyAudit.syntheticFixtureOnly,
    syntheticContentCaptured,
    privateLearnerContentCaptured: privacyAudit.privateLearnerContentCaptured,
    credentialsRedacted,
    rawInputArtifactCaptured: false,
    domCaptured: false,
    traceCaptured: false,
    videoCaptured: false,
  };
  const serialized = JSON.stringify(manifest, null, 2);
  expect(serialized).not.toContain(testEmail);
  expect(serialized).not.toMatch(/@[a-z0-9.-]+\.[a-z]{2,}/i);
  await writeFile(
    testInfo.outputPath("s232h2-visual-manifest.json"),
    serialized,
    "utf8",
  );

  await baselineContext.close();
  await publicContext.close();
});
