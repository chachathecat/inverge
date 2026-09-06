import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runInThisContext } from "node:vm";
import ts from "typescript";

const root = fileURLToPath(new URL("../../", import.meta.url));
const nativeRequire = createRequire(import.meta.url);
export const OWNER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const SOURCE_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
export const NOW = "2026-09-06T10:00:00.000Z";
export const RAW_MARKER = "SYNTHETIC_PRIVATE_REPAIR_BODY";

// Real request authorization, input builder, service, repository, scheduler,
// seals and handoff. Only session and transport are controlled collaborators.
// Each module graph has synthetic secrets, no provider key and its own locks.
export function productionHarness(executeQuery, options = {}) {
  const modules = new Map();
  const runtimeGlobal = {};
  const env = {
    NODE_ENV: "test",
    APP1_VERIFICATION_SIGNING_SECRET: Buffer.alloc(32, 0x5a).toString("base64url"),
    ALPHA_ADMIN_EMAILS: "synthetic-owner@example.invalid",
    WCV_C2R_C_T_OWNER_EMAILS: "synthetic-owner@example.invalid",
    WCV_C2R_C_T_THEORY_ENABLED: "true",
  };
  const session = { userId: OWNER_ID, email: env.ALPHA_ADMIN_EMAILS, isAuthenticated: true, authEnabled: true, isDemo: false };
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [options.now ?? NOW])); }
    static now() { return new Date(options.now ?? NOW).getTime(); }
  }
  const calls = [];
  const client = { from(table) {
    const q = { table, operation: "select", columns: "*", filters: [] };
    return {
      select(columns = "*", settings = {}) { Object.assign(q, { columns, ...settings }); return this; },
      insert(values) { Object.assign(q, { operation: "insert", values }); return this; },
      update(values) { Object.assign(q, { operation: "update", values }); return this; },
      eq(field, value) { q.filters.push([field, "eq", value]); return this; },
      lt(field, value) { q.filters.push([field, "lt", value]); return this; },
      gte(field, value) { q.filters.push([field, "gte", value]); return this; },
      in(field, value) { q.filters.push([field, "in", value]); return this; },
      not(field, operator, value) { assert.equal(operator, "is"); assert.equal(value, null); q.filters.push([field, "notNull", null]); return this; },
      order(field, settings = {}) { (q.orders ??= []).push([field, settings.ascending !== false]); return this; },
      limit(limit) { q.limit = limit; return this; },
      range(from, to) { q.range = [from, to]; return this; },
      maybeSingle() { q.single = true; return this; },
      then(resolve, reject) {
        calls.push(structuredClone(q));
        return Promise.resolve().then(async () => {
          if (options.beforeQuery) await options.beforeQuery(q);
          const result = await executeQuery(q);
          if (options.afterQuery) await options.afterQuery(q, result);
          return result;
        }).then(resolve, reject);
      },
    };
  } };
  const overrides = {
    "server-only": {},
    "next/server": { NextResponse: { json: (body, init) => Response.json(body, init) } },
    "@/lib/auth/session": {
      getServerSessionUser: async () => session,
      requireRequestUserId: async () => { assert.equal(session.isAuthenticated, true); return session.userId; },
      isDevSmokeAuthEnabled: () => false,
    },
    "@/lib/supabase/persistence": {
      getSupabasePersistenceClient: () => client,
      requireSupabasePersistence: (userId) => assert.equal(userId, OWNER_ID),
      assertSupabaseOperation: (name, result) => { if (result.error) throw new Error(`${name}:${result.error.code}`); },
    },
    "@/lib/review-os/s233a-supabase-repository": { s233aSupabaseRepository: {} },
    "@/lib/review-os/learning-metrics-sink": { recordLearningMetricIfEnabled() {} },
    "@/lib/review-os/http": { reviewOsErrorResponse: (error) => Response.json({ ok: false, error: error.message }, { status: 500 }) },
  };
  const noNetwork = () => { throw new Error("test-network-provider-execution-forbidden"); };
  function load(relative) {
    let filename = path.resolve(root, relative);
    if (!path.extname(filename)) filename += ".ts";
    if (modules.has(filename)) return modules.get(filename).exports;
    if (filename.endsWith(".json")) return JSON.parse(readFileSync(filename, "utf8"));
    const loadedModule = { exports: {} };
    modules.set(filename, loadedModule);
    const compiled = ts.transpileModule(readFileSync(filename, "utf8"), { fileName: filename, compilerOptions: {
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX,
    } }).outputText;
    const require = (specifier) => {
      const resolved = specifier.startsWith("@/") ? path.resolve(root, specifier.slice(2))
        : specifier.startsWith(".") ? path.resolve(path.dirname(filename), specifier) : null;
      const alias = resolved ? "@/" + path.relative(root, resolved).replaceAll("\\", "/").replace(/\.ts$/, "") : specifier;
      if (Object.hasOwn(overrides, alias)) return overrides[alias];
      return resolved ? load(resolved) : nativeRequire(specifier);
    };
    runInThisContext(`(function(require,module,exports,process,globalThis,Date,fetch,__dirname,__filename){${compiled}\n})`, { filename })(
      require, loadedModule, loadedModule.exports, { env, cwd: () => root }, runtimeGlobal, Clock, noNetwork, path.dirname(filename), filename,
    );
    return loadedModule.exports;
  }
  const repository = load("lib/review-os/repository").reviewOsRepository;
  const authority = load("lib/owner-study/app1-server-authority");
  const route = load("app/api/os/items/route");
  return {
    repository, authority, load, calls, session,
    async command(suffix = "one") {
      const detail = await repository.getWrongAnswerDetail(OWNER_ID, SOURCE_ID);
      const draft = {
        questionSummary: "합성 문제 구조", coreConcepts: ["정의", "논거", "적용"], requiredIssues: "정의, 논거, 적용",
        userAnswerSummary: "논거에서 적용 연결이 약함", userAnswerStructure: "정의 → 논거", referenceStructure: "정의 → 논거 → 적용 → 결론",
        strengths: ["정의와 핵심 논거가 확인됩니다."], missingIssueCandidates: ["사례 사실과 논거의 연결이 약합니다."],
        weakParagraphPoint: "사례 사실을 논거에 연결하는 한 문장을 직접 적으세요.", weakLogicPoint: "논거에서 사례로 이어지는 연결이 필요합니다.",
        rewriteTarget: "적용 연결 문장", rewriteDraftSuggestion: "직접 작성해야 합니다.", nextAction: "사실과 논거를 직접 연결하세요.",
        caution: "합성 학습 보조 초안", plainExplanation: "한 연결 보강", keyTermExplanations: [], stepByStepExplanation: [], examAnswerHints: [],
      };
      const analysis = authority.createApp1AnalysisAuthority({ userId: OWNER_ID, detail, draft });
      const repairText = `임대료 미납 사실을 계약 해지 논거의 요건에 연결하여 계약 종료 결론을 도출했습니다. ${RAW_MARKER} ${suffix}`;
      const operation = { persistenceOperationId: crypto.randomUUID(), persistenceWorkRevisionId: crypto.randomUUID() };
      const verification = authority.createApp1RepairVerificationAuthority({
        userId: OWNER_ID, detail, ...analysis, repairText, ...operation,
        repairDraft: { ...draft, strengths: ["임대료 미납 사실을 계약 해지 논거의 요건에 연결하여 계약 종료 결론을 도출했습니다."],
          missingIssueCandidates: ["결론 문장의 범위를 한정할 필요가 있습니다."],
          weakParagraphPoint: "결론 문장의 범위를 한정해 다시 적으세요.", weakLogicPoint: "결론 범위를 확인하세요." },
      });
      assert.ok(verification.verificationReceipt, JSON.stringify(verification.verification));
      const command = { commandVersion: authority.APP1_PERSISTENCE_COMMAND_VERSION, sourceItemId: SOURCE_ID,
        ...analysis, repairText, ...operation, verificationReceipt: verification.verificationReceipt };
      const input = authority.authorizeApp1PersistenceCommand({ userId: OWNER_ID, detail, command });
      assert.equal(input.nextReviewDate ?? null, null);
      return command;
    },
    async save(command) {
      const response = await route.POST(new Request("http://localhost/api/os/items", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(command),
      }));
      return { status: response.status, body: await response.json(), cacheControl: response.headers.get("cache-control") };
    },
  };
}

// Shared by in-memory regressions and authenticated, network-isolated Postgres.
// Only fault timing/legacy stored representation is injected, never a schedule
// or expected H0 result; every save uses the actual production constructor.
export async function completedQueueRetryScenario(execute, scenario) {
  const app = productionHarness(execute);
  const read = async table => (await execute({ table, operation: "select", columns: "*", filters: [["user_id", "eq", OWNER_ID]] })).data;
  const initialItems = (await read("wrong_answer_items")).length;
  const initialQueues = (await read("review_queue_items")).length;
  const initialSignals = (await read("learning_signal_events")).length;
  const command = await app.command(scenario);
  const partial = scenario !== "completed_after_full_save" && scenario !== "legacy_completed_concurrent";
  let queueId;
  const writer = productionHarness(execute, { afterQuery(q, result) {
    if (!queueId && q.table === "review_queue_items" && q.operation === "insert" && !result.error) {
      queueId = q.values.id;
      if (partial) throw new Error("synthetic-response-loss-after-Queue");
    }
  } });
  const initial = await writer.save(command);
  assert.equal(initial.status, partial ? 500 : 200, JSON.stringify(initial.body));
  assert.ok(queueId);
  const queueBefore = (await read("review_queue_items")).find(row => row.id === queueId);
  if (!partial) {
    assert.equal(initial.body.app1C3rHandoff.currentPending, true);
    assert.equal((await app.repository.listReviewQueue(OWNER_ID, 100)).some(row => row.queueId === queueId), true);
  }
  if (scenario === "legacy_completed_concurrent") {
    const journey = (await read("learning_signal_events")).find(row => row.metadata_json.reviewUnitId === queueId);
    const metadata = { ...journey.metadata_json, state: "REPAIRED_AWAITING_D1" };
    delete metadata.linkKind;
    await execute({ table: "learning_signal_events", operation: "update", filters: [["id", "eq", journey.id], ["user_id", "eq", OWNER_ID]], values: {
      metadata_json: metadata, derived_tags: ["app1_c3r", "theory", "d1_unaided_review_required"],
      next_task_type: "c3r_d1_unaided_review", next_task: "D+1에 답을 보지 않고 보강한 연결을 다시 작성합니다.",
    } });
  }
  const completeDuringLink = scenario.startsWith("completion_");
  if (!completeDuringLink) await app.repository.completeReviewQueueItem(OWNER_ID, queueId);
  let completion;
  const overlap = async q => {
    if (completeDuringLink && q.table === "learning_signal_events" && q.operation === "insert" && q.values.source_type === "app1_c3r_handoff") {
      completion ??= app.repository.completeReviewQueueItem(OWNER_ID, queueId);
      await completion;
    }
  };
  const options = { now: "2026-09-08T10:00:00.000Z", [scenario === "completion_before_link" ? "beforeQuery" : "afterQuery"]: overlap };
  const results = await Promise.all([
    productionHarness(execute, options).save(command),
    productionHarness(execute, options).save(command),
  ]);
  for (const result of results) {
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.equal(result.cacheControl, "no-store");
    const handoff = result.body.app1C3rHandoff;
    assert.equal(handoff.outcome, "APP1_C3R_D1_ALREADY_COMPLETED");
    assert.equal(handoff.queueStatus, "completed");
    assert.equal(handoff.currentPending, false);
    assert.equal(Object.hasOwn(handoff, "h0Receipt"), false);
    assert.equal(Object.hasOwn(handoff, "reviewUnit"), false);
    assert.equal(handoff.completedReviewUnit.reviewUnitId, queueId);
    assert.equal(handoff.completedReviewUnit.originalD1DueAt, queueBefore.raw_payload.dueAt);
    assert.equal(handoff.masteryCreated, false);
    assert.equal(handoff.transferCreated, false);
  }
  const queueAfter = (await read("review_queue_items")).find(row => row.id === queueId);
  assert.equal(queueAfter.status, "completed");
  assert.deepEqual(queueAfter.raw_payload, queueBefore.raw_payload);
  assert.deepEqual(queueAfter.derived_payload, queueBefore.derived_payload);
  assert.equal((await app.repository.listReviewQueue(OWNER_ID, 100)).some(row => row.queueId === queueId), false);
  const signals = await read("learning_signal_events");
  const journey = signals.find(row => row.metadata_json.reviewUnitId === queueId);
  assert.equal(journey.metadata_json.linkKind, "APP1_REPAIR_TO_CANONICAL_D1");
  assert.equal(Object.hasOwn(journey.metadata_json, "state"), false);
  assert.equal(journey.next_task_type, "c3r_d1_link_record");
  assert.equal(journey.metadata_json.masteryCreated, false);
  assert.equal(journey.metadata_json.transferCreated, false);
  assert.equal(JSON.stringify(signals).includes(RAW_MARKER), false);
  assert.equal((await read("wrong_answer_items")).length, initialItems + 1);
  assert.equal((await read("review_queue_items")).length, initialQueues + 1);
  assert.equal(signals.length, initialSignals + 2);
  const settled = await productionHarness(execute, { now: "2026-09-09T10:00:00.000Z" }).save(command);
  assert.equal(settled.status, 200, JSON.stringify(settled.body));
  assert.deepEqual(settled.body.app1C3rHandoff, { ...results[1].body.app1C3rHandoff, journeyStatus: "existing" });
  assert.deepEqual((await read("review_queue_items")).find(row => row.id === queueId), queueAfter);
  assert.deepEqual(await read("learning_signal_events"), signals);
  // An earlier H0 remains historical evidence, not a current pending result.
  if (!partial) assert.equal(initial.body.app1C3rHandoff.h0Receipt.learnerVisibleNextUnaidedCheck, true);
  return results[0].body.item.id;
}

export function seedRows() {
  return {
    profiles: [{ user_id: OWNER_ID, email: "synthetic-owner@example.invalid", invite_status: "active", entitlement_tier: "core" }],
    wrong_answer_items: [{
      id: SOURCE_ID, user_id: OWNER_ID, exam_name: "감정평가사 2차", subject_label: "감정평가이론", source_type: "photo",
      source_label: "synthetic", problem_title: "합성 임대료 사례", raw_question_text: "임대료 미납 사례에서 계약 해지 논거를 설명하시오.",
      raw_answer_text: "임대료 미납 사실과 계약 해지 논거를 제시했다. 적용 연결이 부족했다.", correct_answer: "-",
      user_answer: "정의와 논거를 적었으나 사례 적용이 부족합니다.", confidence: "중간", dedupe_key: "synthetic-source", processing_status: "completed",
      raw_payload: { user_confirmed_fields: { ocrConfirmedByLearner: true, pageCount: 1, lowConfidenceFlag: false } },
      derived_payload: {}, created_at: NOW, updated_at: NOW,
    }],
    wrong_answer_notes: [], wrong_answer_tags: [], recurrence_features: [], review_queue_items: [], learning_signal_events: [], usage_events: [],
  };
}

export function memoryTransport(seed = seedRows()) {
  const tables = structuredClone(seed);
  const valueAt = (row, field) => field.includes("->>") ? String(row[field.split("->>")[0]]?.[field.split("->>")[1]]) : row[field];
  const execute = async (q) => {
    const rows = tables[q.table];
    assert.ok(rows, `unexpected table ${q.table}`);
    const matches = row => q.filters.every(([field, op, value]) => {
      const actual = valueAt(row, field);
      if (op === "eq" && actual && typeof actual === "object" && typeof value === "string") {
        return JSON.stringify(actual) === JSON.stringify(JSON.parse(value));
      }
      return op === "notNull" ? actual != null : op === "eq" ? JSON.stringify(actual) === JSON.stringify(value) : op === "lt" ? actual < value : op === "gte" ? actual >= value : value.includes(actual);
    });
    if (q.operation === "insert") {
      const v = q.values;
      const conflict = rows.some(row => (v.id && row.id === v.id) || (q.table === "profiles" && row.user_id === v.user_id) ||
        (q.table === "wrong_answer_items" && row.user_id === v.user_id && row.dedupe_key === v.dedupe_key) ||
        (q.table === "recurrence_features" && ["user_id", "exam_name", "subject_label", "topic_tag", "mistake_type"].every(k => row[k] === v[k])));
      if (conflict) return { data: null, error: { code: "23505" } };
      rows.push({ created_at: NOW, updated_at: NOW, ...structuredClone(v) });
      return { data: null, error: null };
    }
    let selected = rows.filter(matches);
    if (q.operation === "update") {
      for (const row of selected) Object.assign(row, structuredClone(q.values));
      return { data: null, error: null };
    }
    const count = selected.length;
    if (q.orders) selected.sort((a,b) => { for (const [field, ascending] of q.orders) { const c = String(a[field]).localeCompare(String(b[field])); if(c) return c * (ascending ? 1 : -1); } return 0; });
    if (q.range) selected = selected.slice(q.range[0], q.range[1] + 1);
    if (q.limit !== undefined) selected = selected.slice(0,q.limit);
    if (q.columns !== "*") selected = selected.map(row => Object.fromEntries(q.columns.split(",").map(k => [k.trim(), row[k.trim()]])));
    return { data: q.head ? null : structuredClone(q.single ? selected[0] ?? null : selected), count, error: null };
  };
  return { tables, execute };
}
