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

test("learner support route verifies the owned item before durable disclosure logging", () => {
  const route = read("app/api/os/learner-support/route.ts");
  const repository = read("lib/core-blitz/learner-support-repository.ts");
  const component = read("components/core-blitz/learner-support-panel.tsx");
  const page = read("app/app/items/[itemId]/support/page.tsx");

  assert.match(
    route,
    /getWrongAnswerDetail\([\s\S]*?detail\.item\.userId !== userId[\s\S]*?buildLearnerSupportUsageEventV1[\s\S]*?recordLearnerSupportUsageEventV1/u,
  );
  assert.match(route, /occurredAt: new Date\(\)\.toISOString\(\)/u);
  assert.match(repository, /\.eq\("id", event\.eventId\)[\s\S]*?\.eq\("user_id", userId\)/u);
  assert.match(repository, /learner-support-idempotency-conflict/u);
  assert.match(repository, /assertNoRawUserDataInDerived/u);

  for (const label of [
    "내가 먼저 풀기",
    "힌트 하나",
    "1타 쉬운풀이",
    "전체풀이",
    "정답만 보기",
  ]) {
    assert.ok(read("lib/core-blitz/learner-capability.ts").includes(label));
  }
  assert.match(component, /if \(!nextProjection\.available\)[\s\S]*?return;/u);
  assert.match(component, /fetch\("\/api\/os\/learner-support"/u);
  assert.match(component, /내용은 아직 공개하지 않았습니다/u);
  assert.match(page, /getWrongAnswerDetail/u);
  assert.match(page, /detail\.item\.examName !== "감정평가사 2차"/u);
  assert.match(page, /<LearnerSupportPanel/u);
});

test("Study Ledger is the sole authenticated learner-support entry", () => {
  const itemPage = read("app/app/items/[itemId]/page.tsx");
  const ledger = read("components/learner/study-ledger-ui.tsx");

  assert.ok(
    itemPage.includes(
      'supportHref={`/app/items/${encodeURIComponent(itemId)}/support`}',
    ),
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
