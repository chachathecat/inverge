import { randomBytes, randomUUID } from "node:crypto";
import {
  appendFile,
  chmod,
  readFile,
  unlink,
  writeFile,
} from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { request, type APIRequestContext } from "@playwright/test";
import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";

import {
  buildExactPrimaryFixtureGraph,
  type ExactPrimaryFixtureGraph,
} from "./support/s232h2-exact-fixture";

export const S232H2_EPHEMERAL_PROJECT_REF = "vajcduseyicjhyhrclax";
export const S232H2_EPHEMERAL_PROJECT_URL =
  `https://${S232H2_EPHEMERAL_PROJECT_REF}.supabase.co`;
export const S232H2_EPHEMERAL_SUITE = "s232h2-production-v3-visual";
export const S232H2_EPHEMERAL_MARKER_VERSION = 1;
export const S232H2_AUTH_PAGE_SIZE = 100;
export const S232H2_AUTH_MAX_PAGES = 10;
export const S232H2_STALE_MAX_USERS = 20;
export const S232H2_STALE_AFTER_MS = 6 * 60 * 60 * 1_000;
export const S232H2_CURRENT_MAX_USERS = 2;
export const S232H2_EXPECTED_REPOSITORY = "chachathecat/inverge";
export const S232H2_EXPECTED_PR_NUMBER = 627;

type FixtureRole = "primary" | "isolation";
type RunnerCommand = "provision" | "cleanup";

type RunnerConfig = {
  adminKey: string;
  runId: string;
  runAttempt: string;
  repository: typeof S232H2_EXPECTED_REPOSITORY;
  prNumber: typeof S232H2_EXPECTED_PR_NUMBER;
  headSha: string;
  statePath: string;
};

type TestMarker = {
  version: typeof S232H2_EPHEMERAL_MARKER_VERSION;
  suite: typeof S232H2_EPHEMERAL_SUITE;
  repository: typeof S232H2_EXPECTED_REPOSITORY;
  pr_number: typeof S232H2_EXPECTED_PR_NUMBER;
  head_sha: string;
  run_id: string;
  run_attempt: string;
  role: FixtureRole;
  created_at: string;
};

type EphemeralCredential = {
  role: FixtureRole;
  email: string;
  password: string;
};

type ProvisionedUser = EphemeralCredential & {
  id: string;
  marker: TestMarker;
};

type RunnerState = {
  schemaVersion: 1;
  projectRef: typeof S232H2_EPHEMERAL_PROJECT_REF;
  suite: typeof S232H2_EPHEMERAL_SUITE;
  repository: typeof S232H2_EXPECTED_REPOSITORY;
  prNumber: typeof S232H2_EXPECTED_PR_NUMBER;
  headSha: string;
  runId: string;
  runAttempt: string;
  primaryUserId: string;
  isolationUserId: string;
  primaryItemIds: [string, string];
  isolationItemId: string;
};

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

type PreviewSnapshot = {
  sessionUserId: string;
  sources: Record<VisualSourceName, Array<Record<string, unknown>>>;
  truncated: Record<VisualSourceName, boolean>;
};

const VISUAL_SOURCE_NAMES: readonly VisualSourceName[] = [
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

const ZERO_PRIMARY_SOURCE_TABLES = [
  "study_logs",
  "weekly_learning_summaries",
  "action_seeds",
  "study_profiles",
  "personal_concept_nodes",
] as const;

const USER_TABLES_IN_SAFE_DELETE_ORDER = [
  "review_queue_items",
  "learning_signal_events",
  "usage_events",
  "recurrence_features",
  "study_logs",
  "weekly_learning_summaries",
  "action_seeds",
  "personal_concept_nodes",
  "study_profiles",
  "wrong_answer_items",
] as const;

let activeStage = "startup";

class SafeFailure extends Error {
  constructor(code: string) {
    super(code);
    this.name = "SafeFailure";
  }
}

function fail(code: string): never {
  throw new SafeFailure(code);
}

function assertSafeScalar(value: string, code: string) {
  if (!value || /[\r\n]/.test(value)) fail(code);
  return value;
}

function maskImmediately(value: string) {
  assertSafeScalar(value, "S232H2_MASK_VALUE_INVALID");
  process.stdout.write(`::add-mask::${value}\n`);
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) fail("S232H2_REQUIRED_ENV_MISSING");
  return assertSafeScalar(value, "S232H2_REQUIRED_ENV_INVALID");
}

async function readRunnerConfig(): Promise<RunnerConfig> {
  const adminKey = requiredEnv("S232H2_SUPABASE_ADMIN_KEY");
  const runId = requiredEnv("GITHUB_RUN_ID");
  const runAttempt = requiredEnv("GITHUB_RUN_ATTEMPT");
  const repository = requiredEnv("GITHUB_REPOSITORY");
  const eventPath = requiredEnv("GITHUB_EVENT_PATH");
  const runnerTemp = requiredEnv("RUNNER_TEMP");
  const headSha = requiredEnv("E2E_RUNNER_SHA");
  const statePath = requiredEnv("S232H2_EPHEMERAL_STATE_PATH");
  if (!/^\d+$/.test(runId) || !/^\d+$/.test(runAttempt)) {
    fail("S232H2_RUN_MARKER_INVALID");
  }
  if (
    repository !== S232H2_EXPECTED_REPOSITORY ||
    !/^[0-9a-f]{40}$/i.test(headSha) ||
    !isAbsolute(eventPath) ||
    !isAbsolute(runnerTemp)
  ) {
    fail("S232H2_GITHUB_CONTEXT_INVALID");
  }
  if (
    !isAbsolute(statePath) ||
    resolve(statePath) !== resolve(runnerTemp, "s232h2-ephemeral-state.json")
  ) {
    fail("S232H2_STATE_PATH_INVALID");
  }
  let event: {
    repository?: { full_name?: unknown };
    pull_request?: {
      number?: unknown;
      head?: {
        sha?: unknown;
        repo?: { full_name?: unknown };
      };
    };
  };
  try {
    event = JSON.parse(await readFile(eventPath, "utf8")) as typeof event;
  } catch {
    fail("S232H2_GITHUB_EVENT_INVALID");
  }
  if (
    event.repository?.full_name !== S232H2_EXPECTED_REPOSITORY ||
    event.pull_request?.number !== S232H2_EXPECTED_PR_NUMBER ||
    event.pull_request.head?.sha !== headSha ||
    event.pull_request.head.repo?.full_name !== S232H2_EXPECTED_REPOSITORY
  ) {
    fail("S232H2_GITHUB_EVENT_MISMATCH");
  }
  return {
    adminKey,
    runId,
    runAttempt,
    repository: S232H2_EXPECTED_REPOSITORY,
    prNumber: S232H2_EXPECTED_PR_NUMBER,
    headSha: headSha.toLowerCase(),
    statePath,
  };
}

function createAdminClient(adminKey: string) {
  return createClient(S232H2_EPHEMERAL_PROJECT_URL, adminKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

function hasExactKeys(value: unknown, keys: readonly string[]) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value as Record<string, unknown>).sort().join(",") ===
      [...keys].sort().join(",")
  );
}

function parseExactMarker(user: User): TestMarker | null {
  const marker = user.app_metadata?.s232h2_test;
  if (
    !hasExactKeys(marker, [
      "version",
      "suite",
      "repository",
      "pr_number",
      "head_sha",
      "run_id",
      "run_attempt",
      "role",
      "created_at",
    ])
  ) {
    return null;
  }
  const candidate = marker as Record<string, unknown>;
  if (
    candidate.version !== S232H2_EPHEMERAL_MARKER_VERSION ||
    candidate.suite !== S232H2_EPHEMERAL_SUITE ||
    candidate.repository !== S232H2_EXPECTED_REPOSITORY ||
    candidate.pr_number !== S232H2_EXPECTED_PR_NUMBER ||
    typeof candidate.head_sha !== "string" ||
    !/^[0-9a-f]{40}$/.test(candidate.head_sha) ||
    typeof candidate.run_id !== "string" ||
    !/^\d+$/.test(candidate.run_id) ||
    typeof candidate.run_attempt !== "string" ||
    !/^\d+$/.test(candidate.run_attempt) ||
    (candidate.role !== "primary" && candidate.role !== "isolation") ||
    typeof candidate.created_at !== "string"
  ) {
    return null;
  }
  const markerCreatedAt = Date.parse(candidate.created_at);
  if (
    !Number.isFinite(markerCreatedAt) ||
    new Date(markerCreatedAt).toISOString() !== candidate.created_at
  ) {
    return null;
  }
  const expectedEmail = new RegExp(
    `^s232h2-${candidate.role}-${candidate.run_id}-${candidate.run_attempt}-[0-9a-f]{16}@s232h2\\.invalid$`,
  );
  if (!user.email || !expectedEmail.test(user.email)) return null;
  const authCreatedAt = Date.parse(user.created_at);
  if (
    !Number.isFinite(authCreatedAt) ||
    !Number.isFinite(markerCreatedAt) ||
    Math.abs(authCreatedAt - markerCreatedAt) > 5 * 60_000
  ) {
    return null;
  }
  return candidate as TestMarker;
}

export function isExactS232h2MarkerUser(user: User) {
  return parseExactMarker(user) !== null;
}

function isCurrentRunMarker(marker: TestMarker, config: RunnerConfig) {
  return (
    marker.repository === config.repository &&
    marker.pr_number === config.prNumber &&
    marker.head_sha === config.headSha &&
    marker.run_id === config.runId &&
    marker.run_attempt === config.runAttempt
  );
}

async function listBoundedAuthUsers(client: SupabaseClient) {
  const users: User[] = [];
  let expectedTotal: number | null = null;
  for (let page = 1; page <= S232H2_AUTH_MAX_PAGES; page += 1) {
    const result = await client.auth.admin.listUsers({
      page,
      perPage: S232H2_AUTH_PAGE_SIZE,
    });
    if (
      result.error ||
      !Array.isArray(result.data.users) ||
      !Number.isInteger(result.data.total) ||
      result.data.total < 0
    ) {
      fail("S232H2_AUTH_SCAN_FAILED");
    }
    expectedTotal ??= result.data.total;
    if (result.data.total !== expectedTotal) {
      fail("S232H2_AUTH_SCAN_CHANGED");
    }
    users.push(...result.data.users);
    if (new Set(users.map((user) => user.id)).size !== users.length) {
      fail("S232H2_AUTH_SCAN_DUPLICATE");
    }
    if (users.length === expectedTotal) {
      if (result.data.nextPage !== null) {
        fail("S232H2_AUTH_SCAN_INCOMPLETE");
      }
      return users;
    }
    if (
      users.length > expectedTotal ||
      result.data.nextPage !== page + 1 ||
      result.data.users.length === 0
    ) {
      fail("S232H2_AUTH_SCAN_INCOMPLETE");
    }
  }
  fail("S232H2_AUTH_SCAN_BOUND_EXHAUSTED");
}

async function runReadOnlyCompatibilityProbe(client: SupabaseClient) {
  const authResult = await client.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (authResult.error || !Array.isArray(authResult.data.users)) {
    fail("S232H2_ADMIN_AUTH_COMPATIBILITY_FAILED");
  }
  const dataResult = await client
    .from("profiles")
    .select("user_id", { count: "exact", head: true })
    .limit(1);
  if (dataResult.error || typeof dataResult.count !== "number") {
    fail("S232H2_ADMIN_DATA_COMPATIBILITY_FAILED");
  }
}

function newCredential(
  role: FixtureRole,
  config: Pick<RunnerConfig, "runId" | "runAttempt">,
): EphemeralCredential {
  const email = `s232h2-${role}-${config.runId}-${config.runAttempt}-${randomBytes(8).toString("hex")}@s232h2.invalid`;
  maskImmediately(email);
  const password = "Aa1!" + randomBytes(36).toString("base64url");
  maskImmediately(password);
  return { role, email, password };
}

function buildMarker(role: FixtureRole, config: RunnerConfig): TestMarker {
  return {
    version: S232H2_EPHEMERAL_MARKER_VERSION,
    suite: S232H2_EPHEMERAL_SUITE,
    repository: config.repository,
    pr_number: config.prNumber,
    head_sha: config.headSha,
    run_id: config.runId,
    run_attempt: config.runAttempt,
    role,
    created_at: new Date().toISOString(),
  };
}

async function createMarkedUser(
  client: SupabaseClient,
  credential: EphemeralCredential,
  config: RunnerConfig,
): Promise<ProvisionedUser> {
  const marker = buildMarker(credential.role, config);
  const result = await client.auth.admin.createUser({
    email: credential.email,
    password: credential.password,
    email_confirm: true,
    app_metadata: { s232h2_test: marker },
  });
  if (result.error || !result.data.user?.id) {
    fail("S232H2_AUTH_USER_CREATE_FAILED");
  }
  const id = result.data.user.id;
  maskImmediately(id);
  const observedMarker = parseExactMarker(result.data.user);
  if (
    !observedMarker ||
    !isCurrentRunMarker(observedMarker, config) ||
    observedMarker.role !== credential.role ||
    typeof result.data.user.email_confirmed_at !== "string"
  ) {
    fail("S232H2_AUTH_USER_MARKER_FAILED");
  }
  return { ...credential, id, marker };
}

async function insertRows(
  client: SupabaseClient,
  table: string,
  rows: Array<Record<string, unknown>>,
  code: string,
) {
  if (rows.length === 0) return;
  const result = await client.from(table).insert(rows);
  if (result.error) fail(code);
}

function buildIsolationCanary(userId: string, now = new Date()) {
  const id = randomUUID();
  const timestamp = now.toISOString();
  return {
    id,
    row: {
      id,
      user_id: userId,
      exam_name: "감정평가사 2차",
      subject_label: "감정평가 및 보상법규",
      source_type: "text",
      source_label: "S232H2 isolation RLS canary",
      problem_title: "S232H2 isolation canary",
      problem_identifier: "s232h2:v3-visual:isolation:v1",
      raw_question_text: "S232H2 합성 RLS 격리 확인 문제입니다.",
      raw_answer_text: "격리 확인용 합성 답안입니다.",
      correct_answer: "격리 확인용 합성 참고 정리입니다.",
      user_answer: "격리 확인용 합성 답안입니다.",
      user_reason_text: "계정 경계 확인용 합성 기록입니다.",
      user_reason_preset: null,
      confidence: "중간",
      time_spent_seconds: null,
      dedupe_key: randomBytes(32).toString("hex"),
      processing_status: "completed",
      raw_payload: {},
      derived_payload: {},
      created_at: timestamp,
      updated_at: timestamp,
    },
  };
}

async function seedFixtureGraph(
  client: SupabaseClient,
  primary: ProvisionedUser,
  isolation: ProvisionedUser,
) {
  const timestamp = new Date();
  const graph = buildExactPrimaryFixtureGraph(primary.id, timestamp);
  const isolationCanary = buildIsolationCanary(isolation.id, timestamp);
  for (const itemId of graph.itemIds) maskImmediately(itemId);
  maskImmediately(isolationCanary.id);
  await insertRows(
    client,
    "profiles",
    [primary, isolation].map((user) => ({
      user_id: user.id,
      email: null,
      display_name: null,
      invite_status: "active",
      entitlement_tier: "core",
      created_at: timestamp.toISOString(),
      updated_at: timestamp.toISOString(),
    })),
    "S232H2_PROFILE_INSERT_FAILED",
  );
  await insertRows(
    client,
    "wrong_answer_items",
    [...graph.items, isolationCanary.row],
    "S232H2_ITEM_INSERT_FAILED",
  );
  await insertRows(
    client,
    "wrong_answer_notes",
    graph.notes,
    "S232H2_NOTE_INSERT_FAILED",
  );
  await insertRows(
    client,
    "wrong_answer_tags",
    graph.tags,
    "S232H2_TAG_INSERT_FAILED",
  );
  await insertRows(
    client,
    "recurrence_features",
    graph.recurrence,
    "S232H2_RECURRENCE_INSERT_FAILED",
  );
  await insertRows(
    client,
    "review_queue_items",
    graph.reviewQueue,
    "S232H2_QUEUE_INSERT_FAILED",
  );
  await insertRows(
    client,
    "learning_signal_events",
    graph.learningSignals,
    "S232H2_SIGNAL_INSERT_FAILED",
  );
  await insertRows(
    client,
    "usage_events",
    graph.usageEvents,
    "S232H2_USAGE_INSERT_FAILED",
  );
  return { graph, isolationCanaryId: isolationCanary.id };
}

function canonicalJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonicalJson(entry)]),
  );
}

function canonicalStableSnapshot(snapshot: PreviewSnapshot) {
  return {
    sessionUserId: snapshot.sessionUserId,
    sources: Object.fromEntries(
      VISUAL_SOURCE_NAMES.map((name) => [
        name,
        snapshot.sources[name]
          .map((row) => JSON.stringify(canonicalJson(row)))
          .sort(),
      ]),
    ),
    truncated: canonicalJson(snapshot.truncated),
  };
}

function comparableRow(row: Record<string, unknown>) {
  return canonicalJson(
    Object.fromEntries(
      Object.entries(row).filter(
        ([key]) =>
          key !== "created_at" &&
          key !== "updated_at" &&
          key !== "last_seen_at",
      ),
    ),
  );
}

function comparableRows(rows: Array<Record<string, unknown>>) {
  return rows
    .map(comparableRow)
    .map((row) => JSON.stringify(row))
    .sort();
}

function assertExactRows(
  actual: Array<Record<string, unknown>>,
  expected: Array<Record<string, unknown>>,
  code: string,
) {
  if (
    JSON.stringify(comparableRows(actual)) !==
    JSON.stringify(comparableRows(expected))
  ) {
    fail(code);
  }
}

async function selectUserRows(
  client: SupabaseClient,
  table: string,
  userId: string,
) {
  const result = await client.from(table).select("*").eq("user_id", userId);
  if (result.error || !Array.isArray(result.data)) {
    fail("S232H2_FIXTURE_READ_FAILED");
  }
  return result.data as Array<Record<string, unknown>>;
}

async function selectItemChildren(
  client: SupabaseClient,
  table: string,
  itemIds: readonly string[],
) {
  if (itemIds.length === 0) return [];
  const result = await client
    .from(table)
    .select("*")
    .in("wrong_answer_item_id", [...itemIds]);
  if (result.error || !Array.isArray(result.data)) {
    fail("S232H2_FIXTURE_CHILD_READ_FAILED");
  }
  return result.data as Array<Record<string, unknown>>;
}

async function verifyAdminFixtureGraph(
  client: SupabaseClient,
  primary: ProvisionedUser,
  isolation: ProvisionedUser,
  graph: ExactPrimaryFixtureGraph,
  isolationCanaryId: string,
) {
  const profileResult = await client
    .from("profiles")
    .select("user_id,email,display_name,invite_status,entitlement_tier")
    .in("user_id", [primary.id, isolation.id]);
  if (profileResult.error || !Array.isArray(profileResult.data)) {
    fail("S232H2_PROFILE_VERIFY_FAILED");
  }
  assertExactRows(
    profileResult.data as Array<Record<string, unknown>>,
    [primary, isolation].map((user) => ({
      user_id: user.id,
      email: null,
      display_name: null,
      invite_status: "active",
      entitlement_tier: "core",
    })),
    "S232H2_PROFILE_VERIFY_FAILED",
  );

  const primaryItems = await selectUserRows(
    client,
    "wrong_answer_items",
    primary.id,
  );
  assertExactRows(primaryItems, graph.items, "S232H2_PRIMARY_ITEMS_NOT_EXACT");
  assertExactRows(
    await selectItemChildren(client, "wrong_answer_notes", graph.itemIds),
    graph.notes,
    "S232H2_PRIMARY_NOTES_NOT_EXACT",
  );
  assertExactRows(
    await selectItemChildren(client, "wrong_answer_tags", graph.itemIds),
    graph.tags,
    "S232H2_PRIMARY_TAGS_NOT_EXACT",
  );
  assertExactRows(
    await selectUserRows(client, "recurrence_features", primary.id),
    graph.recurrence,
    "S232H2_PRIMARY_RECURRENCE_NOT_EXACT",
  );
  assertExactRows(
    await selectUserRows(client, "review_queue_items", primary.id),
    graph.reviewQueue,
    "S232H2_PRIMARY_QUEUE_NOT_EXACT",
  );
  assertExactRows(
    await selectUserRows(client, "learning_signal_events", primary.id),
    graph.learningSignals,
    "S232H2_PRIMARY_SIGNALS_NOT_EXACT",
  );
  assertExactRows(
    await selectUserRows(client, "usage_events", primary.id),
    graph.usageEvents,
    "S232H2_PRIMARY_USAGE_NOT_EXACT",
  );
  for (const table of ZERO_PRIMARY_SOURCE_TABLES) {
    if ((await selectUserRows(client, table, primary.id)).length !== 0) {
      fail("S232H2_PRIMARY_UNRELATED_ROWS_PRESENT");
    }
  }
  const isolationItems = await selectUserRows(
    client,
    "wrong_answer_items",
    isolation.id,
  );
  if (
    isolationItems.length !== 1 ||
    isolationItems[0]?.id !== isolationCanaryId ||
    isolationItems[0]?.user_id !== isolation.id
  ) {
    fail("S232H2_ISOLATION_CANARY_NOT_EXACT");
  }
  for (const table of [
    "recurrence_features",
    "review_queue_items",
    "learning_signal_events",
    "usage_events",
    ...ZERO_PRIMARY_SOURCE_TABLES,
  ]) {
    if ((await selectUserRows(client, table, isolation.id)).length !== 0) {
      fail("S232H2_ISOLATION_GRAPH_OVERGROWN");
    }
  }
}

function requirePreviewConfig() {
  const baseUrl = requiredEnv("E2E_BASE_URL");
  const expectedHost = requiredEnv("E2E_EXPECTED_HOST").toLowerCase();
  const runnerSha = requiredEnv("E2E_RUNNER_SHA");
  const bypassSecret = requiredEnv("VERCEL_AUTOMATION_BYPASS_SECRET");
  const url = new URL(baseUrl);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.hostname.toLowerCase() !== expectedHost ||
    !/^inverge-[a-z0-9-]+-chachathecats-projects\.vercel\.app$/i.test(
      url.hostname,
    ) ||
    !/^[0-9a-f]{40}$/i.test(runnerSha)
  ) {
    fail("S232H2_PREVIEW_CONFIG_INVALID");
  }
  return { baseUrl: url.origin, runnerSha, bypassSecret };
}

async function readJson(response: {
  json(): Promise<unknown>;
  status(): number;
}) {
  try {
    return await response.json();
  } catch {
    fail("S232H2_PREVIEW_JSON_INVALID");
  }
}

async function createPreviewSession(
  credential: ProvisionedUser,
  expectedUserId: string,
) {
  const preview = requirePreviewConfig();
  const context = await request.newContext({
    baseURL: preview.baseUrl,
    extraHTTPHeaders: {
      "x-vercel-protection-bypass": preview.bypassSecret,
      "x-vercel-set-bypass-cookie": "true",
    },
  });
  try {
    const versionResponse = await context.get("/api/runtime/version", {
      maxRedirects: 0,
      timeout: 30_000,
    });
    const versionBody = (await readJson(versionResponse)) as Record<
      string,
      unknown
    >;
    if (
      versionResponse.status() !== 200 ||
      versionBody.ready !== true ||
      versionBody.deploymentSha !== preview.runnerSha
    ) {
      fail("S232H2_PREVIEW_EXACT_HEAD_FAILED");
    }
    const signInResponse = await context.post("/api/auth/sign-in", {
      data: {
        email: credential.email,
        password: credential.password,
        mode: "second",
      },
      maxRedirects: 0,
      timeout: 30_000,
    });
    const signInBody = (await readJson(signInResponse)) as Record<
      string,
      unknown
    >;
    if (signInResponse.status() !== 200 || signInBody.ok !== true) {
      fail("S232H2_PREVIEW_SIGN_IN_FAILED");
    }
    const sessionResponse = await context.get("/api/auth/session", {
      timeout: 30_000,
    });
    const sessionBody = (await readJson(sessionResponse)) as {
      ok?: unknown;
      session?: Record<string, unknown>;
    };
    if (
      sessionResponse.status() !== 200 ||
      sessionBody.ok !== true ||
      sessionBody.session?.userId !== expectedUserId ||
      sessionBody.session?.email !== credential.email ||
      sessionBody.session?.isAuthenticated !== true ||
      sessionBody.session?.isDemo !== false
    ) {
      fail("S232H2_PREVIEW_SESSION_BINDING_FAILED");
    }
    return { context, runnerSha: preview.runnerSha };
  } catch (error) {
    await context.dispose().catch(() => undefined);
    throw error;
  }
}

async function readPreviewSnapshot(
  context: APIRequestContext,
  runnerSha: string,
): Promise<PreviewSnapshot> {
  const response = await context.get("/api/os/visual-source-audit", {
    headers: { "x-s232h2-audit-sha": runnerSha },
    maxRedirects: 0,
    timeout: 30_000,
  });
  const body = (await readJson(response)) as {
    ok?: unknown;
    sessionUserId?: unknown;
    sources?: Partial<PreviewSnapshot["sources"]>;
    truncated?: Partial<PreviewSnapshot["truncated"]>;
  };
  if (
    response.status() !== 200 ||
    body.ok !== true ||
    typeof body.sessionUserId !== "string" ||
    !body.sources ||
    !body.truncated
  ) {
    fail("S232H2_PREVIEW_SOURCE_AUDIT_FAILED");
  }
  for (const name of VISUAL_SOURCE_NAMES) {
    if (
      !Array.isArray(body.sources[name]) ||
      body.truncated[name] !== false
    ) {
      fail("S232H2_PREVIEW_SOURCE_AUDIT_TRUNCATED");
    }
  }
  return {
    sessionUserId: body.sessionUserId,
    sources: body.sources as PreviewSnapshot["sources"],
    truncated: body.truncated as PreviewSnapshot["truncated"],
  };
}

async function readRlsProbe(
  context: APIRequestContext,
  runnerSha: string,
  itemId: string,
) {
  const response = await context.get(
    "/api/os/visual-source-audit?probeItemId=" + encodeURIComponent(itemId),
    {
      headers: { "x-s232h2-audit-sha": runnerSha },
      maxRedirects: 0,
      timeout: 30_000,
    },
  );
  const body = (await readJson(response)) as Record<string, unknown>;
  if (
    response.status() !== 200 ||
    !hasExactKeys(body, ["ok", "rlsProbeVisible"]) ||
    body.ok !== true ||
    typeof body.rlsProbeVisible !== "boolean"
  ) {
    fail("S232H2_PREVIEW_RLS_PROBE_FAILED");
  }
  return body.rlsProbeVisible;
}

function assertPreviewPrimaryExact(
  snapshot: PreviewSnapshot,
  primaryUserId: string,
  graph: ExactPrimaryFixtureGraph,
) {
  if (snapshot.sessionUserId !== primaryUserId) {
    fail("S232H2_PREVIEW_PRIMARY_OWNER_FAILED");
  }
  assertExactRows(snapshot.sources.items, graph.items, "S232H2_PREVIEW_ITEMS_NOT_EXACT");
  assertExactRows(snapshot.sources.notes, graph.notes, "S232H2_PREVIEW_NOTES_NOT_EXACT");
  assertExactRows(snapshot.sources.tags, graph.tags, "S232H2_PREVIEW_TAGS_NOT_EXACT");
  assertExactRows(snapshot.sources.recurrence, graph.recurrence, "S232H2_PREVIEW_RECURRENCE_NOT_EXACT");
  assertExactRows(snapshot.sources.reviewQueue, graph.reviewQueue, "S232H2_PREVIEW_QUEUE_NOT_EXACT");
  assertExactRows(snapshot.sources.learningSignals, graph.learningSignals, "S232H2_PREVIEW_SIGNALS_NOT_EXACT");
  assertExactRows(snapshot.sources.agendaUsage, graph.usageEvents, "S232H2_PREVIEW_USAGE_NOT_EXACT");
  for (const name of [
    "studyLogs",
    "weeklySummaries",
    "todaySeeds",
    "studyProfiles",
    "conceptNodes",
  ] as const) {
    if (snapshot.sources[name].length !== 0) {
      fail("S232H2_PREVIEW_UNRELATED_ROWS_PRESENT");
    }
  }
}

async function verifyPreviewJwtAndRls(
  primary: ProvisionedUser,
  isolation: ProvisionedUser,
  graph: ExactPrimaryFixtureGraph,
  isolationCanaryId: string,
) {
  const primarySession = await createPreviewSession(primary, primary.id);
  const isolationSession = await createPreviewSession(isolation, isolation.id);
  try {
    const primaryBefore = await readPreviewSnapshot(
      primarySession.context,
      primarySession.runnerSha,
    );
    assertPreviewPrimaryExact(primaryBefore, primary.id, graph);
    const isolationSnapshot = await readPreviewSnapshot(
      isolationSession.context,
      isolationSession.runnerSha,
    );
    if (
      isolationSnapshot.sessionUserId !== isolation.id ||
      isolationSnapshot.sources.items.length !== 1 ||
      isolationSnapshot.sources.items[0]?.id !== isolationCanaryId ||
      VISUAL_SOURCE_NAMES.some(
        (name) => name !== "items" && isolationSnapshot.sources[name].length,
      )
    ) {
      fail("S232H2_PREVIEW_ISOLATION_GRAPH_FAILED");
    }
    const ownerVisible = await readRlsProbe(
      isolationSession.context,
      isolationSession.runnerSha,
      isolationCanaryId,
    );
    const primaryHidden = await readRlsProbe(
      primarySession.context,
      primarySession.runnerSha,
      isolationCanaryId,
    );
    if (!ownerVisible || primaryHidden) fail("S232H2_PREVIEW_RLS_FAILED");
    const primaryAfter = await readPreviewSnapshot(
      primarySession.context,
      primarySession.runnerSha,
    );
    assertPreviewPrimaryExact(primaryAfter, primary.id, graph);
    if (
      JSON.stringify(canonicalStableSnapshot(primaryBefore)) !==
      JSON.stringify(canonicalStableSnapshot(primaryAfter))
    ) {
      fail("S232H2_PREVIEW_SNAPSHOT_DRIFT");
    }
  } finally {
    await Promise.all([
      primarySession.context.dispose(),
      isolationSession.context.dispose(),
    ]);
  }
}

async function writeRunnerState(path: string, state: RunnerState) {
  await writeFile(path, JSON.stringify(state), {
    encoding: "utf8",
    mode: 0o600,
  });
  await chmod(path, 0o600);
}

async function readRunnerState(path: string): Promise<RunnerState | null> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as RunnerState;
    if (
      !hasExactKeys(parsed, [
        "schemaVersion",
        "projectRef",
        "suite",
        "repository",
        "prNumber",
        "headSha",
        "runId",
        "runAttempt",
        "primaryUserId",
        "isolationUserId",
        "primaryItemIds",
        "isolationItemId",
      ]) ||
      parsed.schemaVersion !== 1 ||
      parsed.projectRef !== S232H2_EPHEMERAL_PROJECT_REF ||
      parsed.suite !== S232H2_EPHEMERAL_SUITE ||
      parsed.repository !== S232H2_EXPECTED_REPOSITORY ||
      parsed.prNumber !== S232H2_EXPECTED_PR_NUMBER ||
      typeof parsed.headSha !== "string" ||
      !/^[0-9a-f]{40}$/.test(parsed.headSha) ||
      typeof parsed.primaryUserId !== "string" ||
      typeof parsed.isolationUserId !== "string" ||
      !Array.isArray(parsed.primaryItemIds) ||
      parsed.primaryItemIds.length !== 2 ||
      parsed.primaryItemIds.some((id) => typeof id !== "string") ||
      typeof parsed.isolationItemId !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function publishMaskedCredentials(
  primary: ProvisionedUser,
  isolation: ProvisionedUser,
) {
  const githubEnv = requiredEnv("GITHUB_ENV");
  if (!isAbsolute(githubEnv)) fail("S232H2_GITHUB_ENV_INVALID");
  for (const value of [
    primary.email,
    primary.password,
    isolation.email,
    isolation.password,
  ]) {
    maskImmediately(value);
  }
  await appendFile(
    githubEnv,
    [
      `E2E_VISUAL_USER_EMAIL=${primary.email}`,
      `E2E_VISUAL_USER_PASSWORD=${primary.password}`,
      `E2E_USER_B_EMAIL=${isolation.email}`,
      `E2E_USER_B_PASSWORD=${isolation.password}`,
      "",
    ].join("\n"),
    { encoding: "utf8", mode: 0o600 },
  );
}

async function deleteByUser(
  client: SupabaseClient,
  table: string,
  userId: string,
) {
  const deleted = await client.from(table).delete().eq("user_id", userId);
  if (deleted.error) fail("S232H2_ROW_DELETE_FAILED");
  const confirmed = await client
    .from(table)
    .select("user_id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (confirmed.error || confirmed.count !== 0) {
    fail("S232H2_ROW_DELETE_UNCONFIRMED");
  }
}

async function deleteItemChildren(
  client: SupabaseClient,
  table: string,
  itemIds: readonly string[],
) {
  if (itemIds.length === 0) return;
  const deleted = await client
    .from(table)
    .delete()
    .in("wrong_answer_item_id", [...itemIds]);
  if (deleted.error) fail("S232H2_CHILD_DELETE_FAILED");
  const confirmed = await client
    .from(table)
    .select("wrong_answer_item_id", { count: "exact", head: true })
    .in("wrong_answer_item_id", [...itemIds]);
  if (confirmed.error || confirmed.count !== 0) {
    fail("S232H2_CHILD_DELETE_UNCONFIRMED");
  }
}

export async function revokeAllSessions(
  client: SupabaseClient,
  user: User,
  adminKey: string,
) {
  if (!user.email) fail("S232H2_REVOKE_EMAIL_MISSING");
  const replacementPassword =
    "Aa1!" + randomBytes(36).toString("base64url");
  maskImmediately(replacementPassword);
  const updateResult = await client.auth.admin.updateUserById(user.id, {
    password: replacementPassword,
  });
  if (updateResult.error) fail("S232H2_PASSWORD_ROTATION_FAILED");
  const sessionClient = createAdminClient(adminKey);
  const signIn = await sessionClient.auth.signInWithPassword({
    email: user.email,
    password: replacementPassword,
  });
  const accessToken = signIn.data.session?.access_token;
  const refreshToken = signIn.data.session?.refresh_token;
  if (signIn.error || !accessToken || !refreshToken) {
    fail("S232H2_REVOKE_SIGN_IN_FAILED");
  }
  maskImmediately(accessToken);
  maskImmediately(refreshToken);
  const signOut = await client.auth.admin.signOut(accessToken, "global");
  if (signOut.error) fail("S232H2_GLOBAL_SIGN_OUT_FAILED");
  const verificationClient = createAdminClient(adminKey);
  const refresh = await verificationClient.auth.refreshSession({
    refresh_token: refreshToken,
  });
  if (!refresh.error || refresh.data.session !== null) {
    fail("S232H2_SESSION_REVOCATION_UNCONFIRMED");
  }
}

export async function confirmAccountCleanup(
  client: SupabaseClient,
  userId: string,
) {
  const authResult = await client.auth.admin.getUserById(userId);
  if (!authResult.error || authResult.data.user !== null) {
    fail("S232H2_AUTH_DELETE_UNCONFIRMED");
  }
}

async function cleanupMarkedUser(
  client: SupabaseClient,
  user: User,
  config: RunnerConfig,
) {
  if (!isExactS232h2MarkerUser(user)) {
    fail("S232H2_CLEANUP_MARKER_REFUSED");
  }
  await revokeAllSessions(client, user, config.adminKey);
  const itemResult = await client
    .from("wrong_answer_items")
    .select("id")
    .eq("user_id", user.id);
  if (itemResult.error || !Array.isArray(itemResult.data)) {
    fail("S232H2_CLEANUP_ITEM_SCAN_FAILED");
  }
  const itemIds = itemResult.data
    .map((row) => row.id)
    .filter((id): id is string => typeof id === "string");
  await deleteItemChildren(client, "wrong_answer_notes", itemIds);
  await deleteItemChildren(client, "wrong_answer_tags", itemIds);
  for (const table of USER_TABLES_IN_SAFE_DELETE_ORDER) {
    await deleteByUser(client, table, user.id);
  }
  await deleteByUser(client, "profiles", user.id);
  const deleteResult = await client.auth.admin.deleteUser(user.id, false);
  if (deleteResult.error) fail("S232H2_AUTH_DELETE_FAILED");
  await confirmAccountCleanup(client, user.id);
}

async function cleanupStaleMarkedUsers(
  client: SupabaseClient,
  users: User[],
  config: RunnerConfig,
) {
  const now = Date.now();
  const stale = users.filter((user) => {
    const marker = parseExactMarker(user);
    return (
      marker !== null &&
      !isCurrentRunMarker(marker, config) &&
      now - Date.parse(marker.created_at) >= S232H2_STALE_AFTER_MS
    );
  });
  if (stale.length > S232H2_STALE_MAX_USERS) {
    fail("S232H2_STALE_CLEANUP_BOUND_EXCEEDED");
  }
  for (const user of stale) await cleanupMarkedUser(client, user, config);
}

async function currentRunUsers(client: SupabaseClient, config: RunnerConfig) {
  const users = await listBoundedAuthUsers(client);
  return users.filter((user) => {
    const marker = parseExactMarker(user);
    return marker !== null && isCurrentRunMarker(marker, config);
  });
}

async function provision(config: RunnerConfig) {
  activeStage = "compatibility-probe";
  const client = createAdminClient(config.adminKey);
  await runReadOnlyCompatibilityProbe(client);
  const scanned = await listBoundedAuthUsers(client);
  const current = scanned.filter((user) => {
    const marker = parseExactMarker(user);
    return marker !== null && isCurrentRunMarker(marker, config);
  });
  if (current.length !== 0) fail("S232H2_CURRENT_RUN_ALREADY_EXISTS");
  activeStage = "stale-cleanup";
  await cleanupStaleMarkedUsers(client, scanned, config);

  activeStage = "account-create";
  const primaryCredential = newCredential("primary", config);
  const isolationCredential = newCredential("isolation", config);
  const primary = await createMarkedUser(client, primaryCredential, config);
  const isolation = await createMarkedUser(
    client,
    isolationCredential,
    config,
  );
  activeStage = "fixture-seed";
  const { graph, isolationCanaryId } = await seedFixtureGraph(
    client,
    primary,
    isolation,
  );
  activeStage = "admin-fixture-verify";
  await verifyAdminFixtureGraph(
    client,
    primary,
    isolation,
    graph,
    isolationCanaryId,
  );
  activeStage = "preview-jwt-audit";
  await verifyPreviewJwtAndRls(
    primary,
    isolation,
    graph,
    isolationCanaryId,
  );
  activeStage = "state-write";
  await writeRunnerState(config.statePath, {
    schemaVersion: 1,
    projectRef: S232H2_EPHEMERAL_PROJECT_REF,
    suite: S232H2_EPHEMERAL_SUITE,
    repository: config.repository,
    prNumber: config.prNumber,
    headSha: config.headSha,
    runId: config.runId,
    runAttempt: config.runAttempt,
    primaryUserId: primary.id,
    isolationUserId: isolation.id,
    primaryItemIds: graph.itemIds,
    isolationItemId: isolationCanaryId,
  });
  activeStage = "credential-publish";
  await publishMaskedCredentials(primary, isolation);
  process.stdout.write("S232H2_EPHEMERAL_PROVISIONED\n");
}

async function cleanup(config: RunnerConfig) {
  activeStage = "cleanup-compatibility-probe";
  const client = createAdminClient(config.adminKey);
  await runReadOnlyCompatibilityProbe(client);
  const state = await readRunnerState(config.statePath);
  const users = await currentRunUsers(client, config);
  if (users.length > S232H2_CURRENT_MAX_USERS) {
    fail("S232H2_CURRENT_CLEANUP_BOUND_EXCEEDED");
  }
  const roles = users.map((user) => parseExactMarker(user)?.role);
  if (new Set(roles).size !== roles.length) {
    fail("S232H2_CURRENT_CLEANUP_ROLE_DUPLICATE");
  }
  let stateMatches = true;
  if (state) {
    stateMatches =
      state.runId === config.runId &&
      state.runAttempt === config.runAttempt &&
      state.repository === config.repository &&
      state.prNumber === config.prNumber &&
      state.headSha === config.headSha &&
      users.length === 2 &&
      users.some((user) => user.id === state.primaryUserId) &&
      users.some((user) => user.id === state.isolationUserId);
  }
  activeStage = "session-revoke-and-row-cleanup";
  for (const user of users) await cleanupMarkedUser(client, user, config);
  const remaining = await currentRunUsers(client, config);
  if (remaining.length !== 0) fail("S232H2_CURRENT_CLEANUP_UNCONFIRMED");
  await unlink(config.statePath).catch(() => undefined);
  if (!stateMatches) fail("S232H2_STATE_CLEANUP_MISMATCH");
  process.stdout.write("S232H2_EPHEMERAL_CLEANUP_CONFIRMED\n");
}

async function runCli() {
  const command = process.argv[2] as RunnerCommand | undefined;
  if (command !== "provision" && command !== "cleanup") {
    fail("S232H2_COMMAND_INVALID");
  }
  const config = await readRunnerConfig();
  if (command === "cleanup") {
    await cleanup(config);
    return;
  }
  try {
    await provision(config);
  } catch {
    activeStage = "provision-failure-cleanup";
    try {
      const client = createAdminClient(config.adminKey);
      const users = await currentRunUsers(client, config);
      if (users.length <= S232H2_CURRENT_MAX_USERS) {
        for (const user of users) await cleanupMarkedUser(client, user, config);
      }
    } catch {
      // The workflow's independent always() cleanup step retries fail-closed cleanup.
    }
    fail("S232H2_PROVISION_FAILED");
  }
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  runCli().catch(() => {
    process.stderr.write(`S232H2_EPHEMERAL_FAILED:${activeStage}\n`);
    process.exitCode = 1;
  });
}
