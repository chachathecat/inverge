import assert from "node:assert/strict";
import fs, { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  LearnerSupportEventError,
  buildLearnerSupportUsageEventV1,
} from "../lib/core-blitz/learner-support-event.ts";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

function input(choice = "EASY_EXPLANATION") {
  return {
    eventId: "11111111-1111-4111-8111-111111111111",
    itemId: "22222222-2222-5222-8222-222222222222",
    choice,
    surface: "STUDY_LEDGER_DETAIL",
    occurredAt: "2026-09-03T11:00:00.000Z",
  };
}

const assertCode = (fn, code) =>
  assert.throws(
    fn,
    (error) =>
      error instanceof LearnerSupportEventError && error.code === code,
  );

test("learner support records assistance without creating mastery or transfer", () => {
  const event = buildLearnerSupportUsageEventV1(input());
  assert.equal(event.eventName, "learner_support_choice_recorded");
  assert.equal(event.entityType, "wrong_answer_item");
  assert.equal(event.metadataJson.assistanceClass, "EASY_EXPLANATION");
  assert.equal(event.metadataJson.independentAttemptEligible, false);
  assert.equal(event.metadataJson.sameItemMasteryEvidenceEligible, false);
  assert.equal(event.metadataJson.transferEvidenceEligible, false);
  assert.equal(event.metadataJson.requiresDistinctUnaidedAttempt, true);
  assert.equal(event.metadataJson.masteryCreatedByChoice, false);
  assert.equal(event.metadataJson.transferCreatedByChoice, false);
  assert.equal(event.metadataJson.containsRawContent, false);

  const tryFirst = buildLearnerSupportUsageEventV1(input("TRY_FIRST"));
  assert.equal(tryFirst.metadataJson.assistanceClass, "NONE");
  assert.equal(tryFirst.metadataJson.independentAttemptEligible, true);
  assert.equal(tryFirst.metadataJson.masteryCreatedByChoice, false);
});

test("learner support input is exact, UUID-bound and server-time compatible", () => {
  assertCode(
    () => buildLearnerSupportUsageEventV1({ ...input(), extra: true }),
    "INVALID_INPUT",
  );
  assertCode(
    () =>
      buildLearnerSupportUsageEventV1({
        ...input(),
        eventId: "not-a-uuid",
      }),
    "INVALID_IDENTITY",
  );
  assertCode(
    () =>
      buildLearnerSupportUsageEventV1({
        ...input(),
        occurredAt: "2026-09-03",
      }),
    "INVALID_TIMESTAMP",
  );
  assertCode(
    () => buildLearnerSupportUsageEventV1(input("UNKNOWN")),
    "INVALID_CHOICE",
  );
});

test("learner support route persists before constructing one non-cacheable projection", () => {
  const route = read("app/api/os/learner-support/route.ts");
  const access = read("lib/core-blitz/learner-support-access.ts");
  const repository = read("lib/core-blitz/learner-support-repository.ts");
  const component = read("components/core-blitz/learner-support-panel.tsx");
  const page = read("app/app/items/[itemId]/support/page.tsx");

  assert.match(access, /CORE_BLITZ_LEARNER_SUPPORT_ENABLED/u);
  assert.match(access, /CORE_BLITZ_LEARNER_SUPPORT_OWNER_EMAILS/u);
  assert.match(access, /process\.env\.VERCEL_ENV === "production"/u);
  assert.match(access, /!session\.authEnabled/u);
  assert.match(access, /!session\.isAuthenticated/u);
  assert.match(access, /session\.isDemo/u);
  assert.match(access, /process\.env\.ALPHA_ADMIN_EMAILS/u);
  assert.match(
    route,
    /hasCoreBlitzLearnerSupportOwnerAccess\(session\)[\s\S]*?learner-support-unavailable[\s\S]*?requireRequestUserId/u,
  );
  assert.match(
    route,
    /getWrongAnswerDetail\([\s\S]*?detail\.item\.userId !== userId[\s\S]*?detail\.item\.examName !== "감정평가사 2차"[\s\S]*?buildLearnerSupportUsageEventV1[\s\S]*?recordLearnerSupportUsageEventV1/u,
  );
  assert.match(route, /occurredAt: new Date\(\)\.toISOString\(\)/u);
  assert.match(repository, /\.eq\("id", event\.eventId\)[\s\S]*?\.eq\("user_id", userId\)/u);
  assert.match(repository, /learner-support-idempotency-conflict/u);
  assert.match(repository, /assertNoRawUserDataInDerived/u);

  const persistedAt = route.indexOf(
    "await recordLearnerSupportUsageEventV1(userId, event)",
  );
  const noteBuiltAt = route.indexOf("buildDetailStudyNote(detail)");
  const draftBuiltAt = route.indexOf("normalizeAnswerReviewStructureDraft({");
  const projectionBuiltAt = route.indexOf("projectLearnerSupportV1({");
  const projectionReturnedAt = route.indexOf("projection,", projectionBuiltAt);
  assert.ok(persistedAt > -1);
  assert.ok(noteBuiltAt > persistedAt);
  assert.ok(draftBuiltAt > noteBuiltAt);
  assert.ok(projectionBuiltAt > draftBuiltAt);
  assert.ok(projectionReturnedAt > projectionBuiltAt);
  assert.match(route, /choice: recorded\.event\.metadataJson\.choice/u);
  assert.match(route, /referenceAnswer: verifiedReferenceAnswer/u);
  assert.match(route, /const verifiedReferenceAnswer: string \| null = null/u);
  assert.match(route, /Cache-Control": "private, no-store, max-age=0"/u);
  assert.doesNotMatch(route, /projections/u);

  for (const label of [
    "내가 먼저 풀기",
    "힌트 하나",
    "1타 쉬운풀이",
    "전체풀이",
    "정답만 보기",
  ]) {
    assert.ok(read("lib/core-blitz/learner-capability.ts").includes(label));
  }
  assert.match(component, /setProjection\(null\)[\s\S]*?fetch\("\/api\/os\/learner-support"/u);
  assert.match(component, /fetch\("\/api\/os\/learner-support"/u);
  assert.match(component, /cache: "no-store"/u);
  assert.match(component, /setProjection\(payload\.projection\)/u);
  assert.doesNotMatch(component, /projectLearnerSupportV1/u);
  assert.doesNotMatch(component, /AnswerReviewStructureDraft/u);
  assert.match(component, /내용은 아직 공개하지 않았습니다/u);
  assert.match(component, /data-reference-authority/u);
  assert.match(component, /검증된 학습 참고 미연결/u);
  assert.match(page, /getWrongAnswerDetail/u);
  assert.match(
    page,
    /hasCoreBlitzLearnerSupportOwnerAccess\(session\)\) notFound\(\)/u,
  );
  assert.match(page, /detail\.item\.examName !== "감정평가사 2차"/u);
  assert.match(page, /<LearnerSupportPanel itemId=\{itemId\} \/>/u);
  assert.doesNotMatch(page, /normalizeAnswerReviewStructureDraft/u);
  assert.doesNotMatch(page, /buildDetailStudyNote/u);
  assert.doesNotMatch(page, /plainExplanation/u);
  assert.doesNotMatch(page, /stepByStepExplanation/u);
  assert.doesNotMatch(page, /examAnswerHints/u);
  assert.doesNotMatch(page, /detail\.item\.correctAnswer/u);
  assert.match(page, /<LearnerSupportPanel/u);
});

test("learner support retry reuses its event and stored chronology", () => {
  const repository = read("lib/core-blitz/learner-support-repository.ts");
  const component = read("components/core-blitz/learner-support-panel.tsx");

  assert.match(
    component,
    /eventIdsByChoice\.current\[choice\] \?\? crypto\.randomUUID\(\)[\s\S]*?eventIdsByChoice\.current\[choice\] = eventId/u,
  );
  assert.match(component, /body: JSON\.stringify\(\{[\s\S]*?eventId,/u);
  assert.match(
    component,
    /delete eventIdsByChoice\.current\[choice\];[\s\S]*?setProjection\(payload\.projection\)/u,
  );
  assert.match(repository, /delete identity\.occurredAt/u);
  assert.match(
    repository,
    /existingCreatedAt === existingMetadataOccurredAt/u,
  );
  assert.match(
    repository,
    /status: "deduped" as const, event: canonicalEvent/u,
  );
});

test("Study Ledger is the sole authenticated learner-support entry", () => {
  const itemPage = read("app/app/items/[itemId]/page.tsx");
  const ledger = read("components/learner/study-ledger-ui.tsx");

  assert.match(
    itemPage,
    /supportHref=\{[\s\S]*?hasCoreBlitzLearnerSupportOwnerAccess\(session\)[\s\S]*?`\/app\/items\/\$\{encodeURIComponent\(itemId\)\}\/support`[\s\S]*?: null/u,
  );
  assert.match(ledger, /supportHref\?: string \| null/u);
  assert.ok(ledger.includes("href={supportHref}"));
  assert.match(ledger, /data-core-blitz-learner-support-entry/u);
  assert.match(ledger, /필요한 만큼 도움받기/u);
  assert.equal(
    existsSync(path.join(root, "app/app/core-blitz/support/[itemId]/page.tsx")),
    false,
  );
  assert.equal(
    existsSync(path.join(root, "lib/core-blitz/learner-support-runtime.ts")),
    false,
  );
});

// Execute the actual route/component with isolated framework and storage ports.
// No provider, database, deployment, or real learner data is used here.
async function loadSupportTestModule(relativePath, dependencies, globals = {}) {
  const { default: ts } = await import("typescript");
  const { runInThisContext } = await import("node:vm");
  const compiled = ts.transpileModule(read(relativePath), {
    fileName: relativePath,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  });
  assert.equal(
    (compiled.diagnostics ?? []).filter(
      (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
    ).length,
    0,
  );
  const moduleExports = {};
  const execute = runInThisContext(
    `(function(require, exports, fetch, crypto) {\n${compiled.outputText}\n})`,
    { filename: relativePath },
  );
  execute((specifier) => {
    assert.ok(Object.hasOwn(dependencies, specifier), `Unexpected import: ${specifier}`);
    return dependencies[specifier];
  }, moduleExports, globals.fetch, globals.crypto);
  return moduleExports;
}

async function supportAvailabilityHarness(options = {}) {
  const capability = await import("../lib/core-blitz/learner-capability.ts");
  const calls = [];
  const saved = new Map();
  let failWrite = options.failWrite ?? false;
  const route = await loadSupportTestModule("app/api/os/learner-support/route.ts", {
    "next/server": { NextResponse: { json: (body, init) => Response.json(body, init) } },
    "@/lib/auth/session": {
      getServerSessionUser: async () => ({ userId: "owner-1", email: "owner@example.invalid" }),
      requireRequestUserId: async () => "owner-1",
    },
    "@/lib/core-blitz/learner-support-access": {
      hasCoreBlitzLearnerSupportOwnerAccess: () => options.ownerAllowed !== false,
    },
    "@/lib/core-blitz/learner-support-event": {
      LearnerSupportEventError,
      buildLearnerSupportUsageEventV1,
    },
    "@/lib/core-blitz/learner-support-repository": {
      recordLearnerSupportUsageEventV1: async (userId, event) => {
        assert.equal(userId, "owner-1");
        calls.push("write");
        if (failWrite) {
          failWrite = false;
          throw new Error("synthetic-write-failure");
        }
        const existing = saved.get(event.eventId);
        if (!existing) saved.set(event.eventId, event);
        return { status: existing ? "deduped" : "saved", event: existing ?? event };
      },
    },
    "@/lib/core-blitz/learner-capability": {
      projectLearnerSupportV1: (value) => {
        calls.push("projection");
        return capability.projectLearnerSupportV1(value);
      },
    },
    "@/lib/evaluate/answer-review-structure": {
      normalizeAnswerReviewStructureDraft: (value) => {
        calls.push("draft");
        return value;
      },
    },
    "@/lib/review-os/http": {
      reviewOsErrorResponse: () => Response.json({ ok: false, error: "synthetic-failure" }, { status: 503 }),
    },
    "@/lib/review-os/service": {
      reviewOsService: {
        getWrongAnswerDetail: async () => ({
          item: {
            id: input().itemId,
            userId: options.wrongOwner ? "other-owner" : "owner-1",
            examName: "감정평가사 2차",
            correctAnswer: "LEARNER_ENTERED_NOT_VERIFIED",
          },
          tags: [],
        }),
      },
    },
    "@/lib/review-os/study-note": {
      buildDetailStudyNote: () => {
        calls.push("note");
        return {
          coreLine: "SYNTHETIC_EASY_CONTENT",
          nextAction: "SYNTHETIC_HINT_CONTENT",
          keyTerms: ["synthetic term"],
        };
      },
    },
  });
  return {
    calls,
    saved,
    post: (choice, extra = {}) => {
      const source = input(choice);
      const body = {
        eventId: source.eventId,
        itemId: source.itemId,
        choice,
        surface: source.surface,
      };
      return route.POST(new Request("http://localhost/api/os/learner-support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, ...extra }),
      }));
    },
  };
}

for (const choice of ["FULL_SOLUTION", "DIRECT_ANSWER"]) {
  test(`availability: ${choice} and retries never persist a false exposure`, async () => {
    const harness = await supportAvailabilityHarness();
    for (let retry = 0; retry < 2; retry += 1) {
      const response = await harness.post(choice);
      assert.equal(response.status, 409);
      assert.match(response.headers.get("Cache-Control"), /private, no-store/u);
      assert.deepEqual(await response.json(), {
        ok: false,
        error: "verified-reference-unavailable",
      });
      assert.equal(harness.saved.size, 0);
      assert.deepEqual(harness.calls, []);
    }
  });
}

test("availability: available choices still persist before selected-only disclosure", async () => {
  for (const choice of ["TRY_FIRST", "ONE_HINT", "EASY_EXPLANATION"]) {
    const harness = await supportAvailabilityHarness();
    const response = await harness.post(choice);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.projection.available, true);
    assert.equal(body.projection.choice, choice);
    assert.equal(body.decision.choice, choice);
    assert.equal(body.decision.masteryCreatedByChoice, false);
    assert.equal(body.decision.transferCreatedByChoice, false);
    assert.deepEqual(harness.calls, ["write", "note", "draft", "projection"]);
    assert.equal(harness.saved.size, 1);
    assert.match(response.headers.get("Cache-Control"), /private, no-store/u);
    assert.equal(JSON.stringify(body).includes("LEARNER_ENTERED_NOT_VERIFIED"), false);
    if (choice === "TRY_FIRST") {
      assert.deepEqual(body.projection.sections, []);
      assert.equal(body.decision.assistanceClass, "NONE");
    } else if (choice === "ONE_HINT") {
      assert.equal(body.projection.sections.length, 1);
      assert.equal(JSON.stringify(body).includes("SYNTHETIC_EASY_CONTENT"), false);
    }
  }
});

test("availability: a failed write discloses nothing and the same request can retry", async () => {
  const harness = await supportAvailabilityHarness({ failWrite: true });
  const failed = await harness.post("EASY_EXPLANATION");
  assert.equal(failed.status, 503);
  assert.deepEqual(await failed.json(), { ok: false, error: "synthetic-failure" });
  assert.match(failed.headers.get("Cache-Control"), /private, no-store/u);
  assert.deepEqual(harness.calls, ["write"]);
  assert.equal(harness.saved.size, 0);

  const retry = await harness.post("EASY_EXPLANATION");
  const firstSuccess = await retry.json();
  assert.equal(retry.status, 200);
  assert.equal(firstSuccess.status, "saved");
  const duplicate = await harness.post("EASY_EXPLANATION");
  const repeated = await duplicate.json();
  assert.equal(duplicate.status, 200);
  assert.equal(repeated.status, "deduped");
  assert.deepEqual(repeated.decision, firstSuccess.decision);
  assert.equal(harness.saved.size, 1);
});

test("availability: client reference claims and invalid choices cannot bypass the gate", async () => {
  for (const [choice, extra] of [
    ["DIRECT_ANSWER", { verifiedReferenceAnswer: "fake" }],
    ["FULL_SOLUTION", { available: true }],
    ["UNKNOWN", {}],
    ["DIRECT_ANSWER", { eventId: "invalid" }],
  ]) {
    const harness = await supportAvailabilityHarness();
    const response = await harness.post(choice, extra);
    assert.equal(response.status, 400);
    assert.equal(harness.saved.size, 0);
    assert.deepEqual(harness.calls, []);
  }
  for (const options of [{ ownerAllowed: false }, { wrongOwner: true }]) {
    const harness = await supportAvailabilityHarness(options);
    assert.equal((await harness.post("DIRECT_ANSWER")).status, 404);
    assert.equal(harness.saved.size, 0);
    assert.deepEqual(harness.calls, []);
  }
});

test("availability: the actual panel disables unsupported answers and blocks their handlers", async () => {
  const capability = await import("../lib/core-blitz/learner-capability.ts");
  let networkCalls = 0;
  let eventIds = 0;
  const element = (type, props) => ({ type, props });
  const ui = await loadSupportTestModule("components/core-blitz/learner-support-panel.tsx", {
    react: {
      useMemo: (factory) => factory(),
      useState: (initial) => [initial, () => {}],
      useRef: (initial) => ({ current: initial }),
    },
    "react/jsx-runtime": { jsx: element, jsxs: element },
    "@/components/learner": { V3ActionButton: "button", V3Surface: "section" },
    "@/lib/core-blitz/learner-capability": capability,
  }, {
    fetch: async () => { networkCalls += 1; throw new Error("unexpected network"); },
    crypto: { randomUUID: () => { eventIds += 1; return input().eventId; } },
  });
  const buttons = [];
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object") return;
    if (node.props?.["data-learner-entry-choice"]) buttons.push(node);
    walk(node.props?.children);
  };
  walk(ui.LearnerSupportPanel({ itemId: input().itemId }));
  assert.equal(buttons.length, 5);
  for (const button of buttons) {
    const choice = button.props["data-learner-entry-choice"];
    const unavailable = ["FULL_SOLUTION", "DIRECT_ANSWER"].includes(choice);
    assert.equal(button.props.disabled, unavailable);
    if (unavailable) {
      assert.equal(button.props["aria-describedby"], "core-blitz-reference-unavailable");
      button.props.onClick();
    }
  }
  await Promise.resolve();
  assert.equal(networkCalls, 0);
  assert.equal(eventIds, 0);
});
