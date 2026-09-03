import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  App1C3rReviewOsAdapterError,
  materializeApp1C3rReviewOsAdapterV1,
} from "../lib/review-os/app1-c3r-review-os-adapter.ts";

const ITEM_ID = "11111111-1111-5111-a111-111111111111";
const QUEUE_ID = "22222222-2222-5222-a222-222222222222";
const SIGNAL_ID = "33333333-3333-5333-a333-333333333333";
const DUE_AT = "2026-09-04T12:00:00.000Z";

function candidate() {
  return {
    schemaVersion: "app1_c3r_handoff_candidate.v1",
    state: "D1_UNAIDED_REVIEW_REQUIRED",
    sourceItemId: ITEM_ID,
    conceptNodeId: "concept-1",
    track: "THEORY",
    c3rRoute: "/app/c3r-t",
    journeyKey: `app1-c3r:theory:${ITEM_ID}`,
    reviewUnitKey: `app1-c3r:theory:${ITEM_ID}:d1`,
    reviewPhase: "D1",
    assistanceClass: "NONE",
    learnerVisible: true,
    requiresUnaidedAttempt: true,
    sameItemMasteryGainAllowed: false,
    transferEvidenceEligible: false,
    durableC3rJourneyCreated: false,
    durableReviewUnitCreated: false,
    authority: "EXISTING_C3R_AND_REVIEW_QUEUE_ONLY",
  };
}

function item() {
  return {
    id: ITEM_ID,
    subjectLabel: "감정평가이론",
    updatedAt: "2026-09-03T12:00:00.000Z",
    rawPayload: {
      user_confirmed_fields: {
        persistence_work_revision_id: "revision-1",
      },
      app1_post_insert_replay_v1: {
        itemId: ITEM_ID,
        queueId: QUEUE_ID,
        learningSignalId: SIGNAL_ID,
        workRevisionId: "revision-1",
        learningSignal: {
          metadataJson: {
            app1_c3r_handoff_candidate: candidate(),
          },
        },
      },
    },
  };
}

function storage(overrides = {}) {
  const projections = new Map();
  return {
    projections,
    async ensureJourneyProjection(value) {
      const existing = projections.get(value.journeyId);
      if (existing) return { status: "existing", value: existing };
      projections.set(value.journeyId, value);
      return { status: "created", value };
    },
    async loadReviewQueueUnit() {
      return {
        reviewUnitId: QUEUE_ID,
        userId: "user-1",
        itemId: ITEM_ID,
        subject: "감정평가이론",
        status: "pending",
        dueAt: DUE_AT,
      };
    },
    ...overrides,
  };
}

function assertCode(code) {
  return (error) =>
    error instanceof App1C3rReviewOsAdapterError && error.code === code;
}

test("APP-1 H0 persists one bodyless journey projection and reuses the canonical queue", async () => {
  const port = storage();
  const first = await materializeApp1C3rReviewOsAdapterV1({
    userId: "user-1",
    item: item(),
    storage: port,
  });
  const second = await materializeApp1C3rReviewOsAdapterV1({
    userId: "user-1",
    item: item(),
    storage: port,
  });

  assert.equal(first.outcome, "APP1_C3R_HANDOFF_H0_MATERIALIZED");
  assert.equal(first.journeyStatus, "created");
  assert.equal(second.journeyStatus, "existing");
  assert.equal(first.reviewUnitStatus, "existing");
  assert.equal(first.reviewUnit.reviewUnitId, QUEUE_ID);
  assert.equal(first.reviewUnit.assistanceClass, "NONE");
  assert.equal(first.queueReused, true);
  assert.equal(first.duplicateQueueCreated, false);
  assert.equal(first.dedicatedC3rEvidenceMutated, false);
  assert.equal(port.projections.size, 1);
  const [projection] = port.projections.values();
  assert.equal(projection.containsRawContent, false);
  assert.equal(projection.masteryCreated, false);
  assert.equal(projection.transferCreated, false);
});

test("APP-1 H0 fails closed when the canonical Review Queue row is missing", async () => {
  await assert.rejects(
    () =>
      materializeApp1C3rReviewOsAdapterV1({
        userId: "user-1",
        item: item(),
        storage: storage({ loadReviewQueueUnit: async () => null }),
      }),
    assertCode("REVIEW_QUEUE_MISSING"),
  );
});

test("APP-1 H0 rejects queue and replay binding drift", async () => {
  await assert.rejects(
    () =>
      materializeApp1C3rReviewOsAdapterV1({
        userId: "user-1",
        item: item(),
        storage: storage({
          loadReviewQueueUnit: async () => ({
            reviewUnitId: QUEUE_ID,
            userId: "user-1",
            itemId: ITEM_ID,
            subject: "감정평가 및 보상법규",
            status: "pending",
            dueAt: DUE_AT,
          }),
        }),
      }),
    assertCode("REVIEW_QUEUE_BINDING_CONFLICT"),
  );

  const drifted = item();
  drifted.rawPayload.user_confirmed_fields.persistence_work_revision_id =
    "different-revision";
  await assert.rejects(
    () =>
      materializeApp1C3rReviewOsAdapterV1({
        userId: "user-1",
        item: drifted,
        storage: storage(),
      }),
    assertCode("INVALID_REPLAY_PLAN"),
  );
});

test("server adapter reuses Review Queue and the APP-1 route invokes it", () => {
  const repository = readFileSync(
    "lib/review-os/app1-c3r-review-os-repository.ts",
    "utf8",
  );
  const route = readFileSync("app/api/os/items/route.ts", "utf8");

  assert.match(
    repository,
    /from\("learning_signal_events"\)[\s\S]*?\.insert\(expected\)/u,
  );
  assert.match(repository, /from\("review_queue_items"\)[\s\S]*?\.select\(/u);
  assert.doesNotMatch(
    repository,
    /from\("review_queue_items"\)[\s\S]{0,160}?\.insert\(/u,
  );
  assert.doesNotMatch(
    repository,
    /from\("review_queue_items"\)[\s\S]{0,160}?\.update\(/u,
  );
  assert.match(repository, /eq\("id", input\.reviewUnitId\)/u);
  assert.match(repository, /eq\("user_id", userId\)/u);
  assert.match(repository, /eq\("source_submission_id", input\.itemId\)/u);
  assert.match(route, /materializeApp1C3rReviewOsHandoffV1/u);
  assert.match(
    route,
    /app1Command\s*\?\s*await materializeApp1C3rReviewOsHandoffV1\(userId, result\.item\)/u,
  );
});
