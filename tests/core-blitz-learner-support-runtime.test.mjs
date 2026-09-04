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
