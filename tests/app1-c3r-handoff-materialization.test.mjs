import assert from "node:assert/strict";
import test from "node:test";

import {
  App1C3rHandoffRuntimeError,
  materializeApp1C3rHandoffH0V1,
} from "../lib/review-os/app1-c3r-handoff-runtime.ts";

function candidate() {
  return {
    schemaVersion: "app1_c3r_handoff_candidate.v1",
    state: "D1_UNAIDED_REVIEW_REQUIRED",
    sourceItemId: "11111111-1111-5111-a111-111111111111",
    conceptNodeId: "concept-1",
    track: "PRACTICE",
    c3rRoute: "/app/c3r-p",
    journeyKey: "app1-c3r:practice:11111111-1111-5111-a111-111111111111",
    reviewUnitKey: "app1-c3r:practice:11111111-1111-5111-a111-111111111111:d1",
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

function memoryPort() {
  const journeys = new Map();
  const reviewUnits = new Map();
  return {
    journeys,
    reviewUnits,
    port: {
      async ensureJourney(input) {
        const existing = journeys.get(input.journeyKey);
        if (existing) return { status: "existing", value: existing };
        const value = Object.freeze({
          journeyId: "journey-1",
          journeyKey: input.journeyKey,
          itemId: input.itemId,
          repairRevisionId: input.repairRevisionId,
          track: input.track,
          c3rRoute: input.c3rRoute,
          durable: true,
        });
        journeys.set(input.journeyKey, value);
        return { status: "created", value };
      },
      async ensureD1ReviewUnit(input) {
        const existing = reviewUnits.get(input.reviewUnitKey);
        if (existing) return { status: "existing", value: existing };
        const value = Object.freeze({
          reviewUnitId: "review-unit-1",
          reviewUnitKey: input.reviewUnitKey,
          journeyId: input.journey.journeyId,
          itemId: input.itemId,
          dueKind: "D1",
          dueAt: input.dueAt,
          assistanceClass: "NONE",
          learnerVisible: true,
          requiresUnaidedAttempt: true,
          durable: true,
        });
        reviewUnits.set(input.reviewUnitKey, value);
        return { status: "created", value };
      },
    },
  };
}

const input = (port) => ({
  candidate: candidate(),
  app1ReceiptId: "app1-receipt-1",
  repairRevisionId: "repair-revision-1",
  persistedAt: "2026-09-03T00:00:00.000Z",
  d1DueAt: "2026-09-04T00:00:00.000Z",
  port,
});

test("materialization is durable and idempotent across retries", async () => {
  const store = memoryPort();
  const first = await materializeApp1C3rHandoffH0V1(input(store.port));
  const second = await materializeApp1C3rHandoffH0V1(input(store.port));

  assert.equal(first.outcome, "APP1_C3R_HANDOFF_H0_MATERIALIZED");
  assert.equal(first.journeyStatus, "created");
  assert.equal(first.reviewUnitStatus, "created");
  assert.equal(second.journeyStatus, "existing");
  assert.equal(second.reviewUnitStatus, "existing");
  assert.equal(store.journeys.size, 1);
  assert.equal(store.reviewUnits.size, 1);
  assert.equal(second.h0Receipt.learnerVisibleNextUnaidedCheck, true);
});

test("mismatched durable journey or ReviewUnit fails closed", async () => {
  const store = memoryPort();
  store.port.ensureJourney = async (value) => ({
    status: "created",
    value: {
      journeyId: "journey-1",
      journeyKey: value.journeyKey,
      itemId: "other-item",
      repairRevisionId: value.repairRevisionId,
      track: value.track,
      c3rRoute: value.c3rRoute,
      durable: true,
    },
  });
  await assert.rejects(
    () => materializeApp1C3rHandoffH0V1(input(store.port)),
    (error) =>
      error instanceof App1C3rHandoffRuntimeError &&
      error.code === "JOURNEY_BINDING_CONFLICT",
  );
});

test("invalid timing and non-durable adapter results cannot materialize H0", async () => {
  const store = memoryPort();
  await assert.rejects(
    () =>
      materializeApp1C3rHandoffH0V1({
        ...input(store.port),
        d1DueAt: "2026-09-03T00:00:00.000Z",
      }),
    (error) =>
      error instanceof App1C3rHandoffRuntimeError &&
      error.code === "INVALID_INPUT",
  );

  store.port.ensureJourney = async (value) => ({
    status: "created",
    value: {
      journeyId: "journey-1",
      journeyKey: value.journeyKey,
      itemId: value.itemId,
      repairRevisionId: value.repairRevisionId,
      track: value.track,
      c3rRoute: value.c3rRoute,
      durable: false,
    },
  });
  await assert.rejects(
    () => materializeApp1C3rHandoffH0V1(input(store.port)),
    (error) =>
      error instanceof App1C3rHandoffRuntimeError &&
      error.code === "NON_DURABLE_RESULT",
  );
});
