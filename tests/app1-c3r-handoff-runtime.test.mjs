import assert from "node:assert/strict";
import test from "node:test";

import {
  APP1_C3R_HANDOFF_CANDIDATE_VERSION,
  buildApp1C3rHandoffCandidateV1,
  isApp1DeterministicRepairItemIdV1,
} from "../lib/review-os/app1-c3r-handoff.ts";
import { buildCaptureLearningSignal } from "../lib/review-os/capture-learning-signals.ts";

const APP1_ITEM_ID = "11111111-1111-5111-a111-111111111111";

test("APP-1 deterministic repair IDs create a fail-closed D+1 C3R handoff candidate", () => {
  assert.equal(isApp1DeterministicRepairItemIdV1(APP1_ITEM_ID), true);
  const candidate = buildApp1C3rHandoffCandidateV1({
    itemId: APP1_ITEM_ID,
    examName: "감정평가사 2차",
    subject: "감정평가이론",
    conceptNodeId: "concept:appraisal-theory:application",
    createdFromCapture: true,
    hasRepairTarget: true,
    hasRepairDirective: true,
  });

  assert.ok(candidate);
  assert.equal(candidate.schemaVersion, APP1_C3R_HANDOFF_CANDIDATE_VERSION);
  assert.equal(candidate.track, "THEORY");
  assert.equal(candidate.c3rRoute, "/app/c3r-t");
  assert.equal(candidate.reviewPhase, "D1");
  assert.equal(candidate.assistanceClass, "NONE");
  assert.equal(candidate.learnerVisible, true);
  assert.equal(candidate.requiresUnaidedAttempt, true);
  assert.equal(candidate.sameItemMasteryGainAllowed, false);
  assert.equal(candidate.transferEvidenceEligible, false);
  assert.equal(candidate.durableC3rJourneyCreated, false);
  assert.equal(candidate.durableReviewUnitCreated, false);
  assert.match(candidate.journeyKey, new RegExp(APP1_ITEM_ID));
  assert.match(candidate.reviewUnitKey, /:d1$/u);
});

test("capture learning signal persists the APP-1 C3R candidate without raw repair text", () => {
  const signal = buildCaptureLearningSignal({
    itemId: APP1_ITEM_ID,
    examName: "감정평가사 2차",
    subject: "감정평가이론",
    sourceType: "text",
    confidence: "중간",
    biggestGap: "사례 사실과 이론적 논거의 연결이 빠졌습니다.",
    missingIssue: "사례 적용",
    weakStructurePoint: "논거 연결",
    rewriteInstruction: "사실과 논거를 한 문장으로 직접 연결합니다.",
    createdFromCapture: true,
  });

  const candidate = signal.metadataJson.app1_c3r_handoff_candidate;
  assert.ok(candidate && typeof candidate === "object");
  assert.equal(candidate.state, "D1_UNAIDED_REVIEW_REQUIRED");
  assert.equal(signal.metadataJson.c3rHandoffStatus, "D1_UNAIDED_REVIEW_REQUIRED");
  assert.ok(signal.derivedTags.includes("app1_c3r_d1_required"));

  const serialized = JSON.stringify(candidate);
  assert.doesNotMatch(serialized, /사례 사실|이론적 논거|직접 연결/u);
  assert.doesNotMatch(serialized, /answer|question|ocr|prompt|response/iu);
});

test("ordinary captures and unsupported subjects cannot impersonate APP-1 C3R handoff", () => {
  const ordinary = buildApp1C3rHandoffCandidateV1({
    itemId: "11111111-1111-4111-8111-111111111111",
    examName: "감정평가사 2차",
    subject: "감정평가이론",
    conceptNodeId: "concept:appraisal-theory:application",
    createdFromCapture: true,
    hasRepairTarget: true,
    hasRepairDirective: true,
  });
  assert.equal(ordinary, null);

  const unsupported = buildApp1C3rHandoffCandidateV1({
    itemId: APP1_ITEM_ID,
    examName: "감정평가사 2차",
    subject: "알 수 없는 과목",
    conceptNodeId: "concept:unknown",
    createdFromCapture: true,
    hasRepairTarget: true,
    hasRepairDirective: true,
  });
  assert.equal(unsupported, null);

  const firstStage = buildCaptureLearningSignal({
    itemId: APP1_ITEM_ID,
    examName: "감정평가사 1차",
    subject: "회계학",
    sourceType: "text",
    confidence: "낮음",
    biggestGap: "계산 실수",
    nextAction: "다시 계산",
    createdFromCapture: true,
  });
  assert.equal(firstStage.metadataJson.app1_c3r_handoff_candidate, null);
  assert.equal(firstStage.metadataJson.c3rHandoffStatus, null);
  assert.equal(firstStage.derivedTags.includes("app1_c3r_d1_required"), false);
});
