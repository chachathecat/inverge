import assert from "node:assert/strict";
import test from "node:test";
import { renderPrivateReviewPacket, reviewPacketSha256 } from "../scripts/content-review/render-private-review-packet.mjs";

function fixture() {
  const original = { id: "synthetic-original", number: 1, stem: "SYNTHETIC ORIGINAL",
    choices: ["alpha", "beta", "gamma", "delta", "epsilon"], officialKeyObserved: 2,
    concept: "Original synthetic concept", choiceExplanations: ["original-a", "original-b", "original-c", "original-d", "original-e"],
    easyExplanation: "Original synthetic explanation", verifiedBy: { human: false }, runtimeEligible: false };
  const retry = { id: "synthetic-retry", sourceOriginalNumber: 1, stem: "SYNTHETIC RETRY",
    choices: ["one", "two", "three", "four", "five"], proposedChoice: 4, officialKeyApplies: false,
    concept: "Retry synthetic concept", choiceExplanations: ["retry-a", "retry-b", "retry-c", "retry-d", "retry-e"],
    easyExplanation: "Retry synthetic explanation", transferOrMeasurementEligible: false, runtimeEligible: false };
  return { runtimeEligible: false, originals: [original], retryCandidates: [retry] };
}
function bound(packet) {
  const source = JSON.stringify(packet);
  return [source, JSON.stringify({ reviewPacketSha256: reviewPacketSha256(source), results: [
    { id: "original-1", computedChoice: 2, checksPassed: true, humanReview: false, runtimeAuthorityGranted: false },
    { id: "synthetic-retry", computedChoice: 4, checksPassed: true, humanReview: false, runtimeAuthorityGranted: false },
  ] })];
}

test("renderer rejects the actual root-cause shape: original choice explanations wired to retry concept", () => {
  const packet = fixture();
  packet.retryCandidates[0].concept = packet.originals[0].choiceExplanations;
  assert.throws(() => renderPrivateReviewPacket(...bound(packet)), /private_review_packet_invalid/u);
});
test("renderer never accepts answer values or copied explanation text as a concept", () => {
  for (const concept of ["cost 12, answer 24", "original-a", "Original synthetic explanation"]) {
    const packet = fixture(); packet.retryCandidates[0].concept = concept;
    assert.throws(() => renderPrivateReviewPacket(...bound(packet)), /private_review_packet_invalid/u);
  }
});
test("explicit named fields stay with their own question and HTML is escaped", () => {
  const packet = fixture(); packet.retryCandidates[0].stem = '<script>alert("synthetic")</script>';
  const html = renderPrivateReviewPacket(...bound(packet));
  const retry = html.split('data-question-id="synthetic-retry"')[1];
  const concept = retry.split('data-field="concept">')[1].split("</dd>")[0];
  assert.match(concept, /Retry synthetic concept/u);
  assert.doesNotMatch(concept, /original-|retry-[abcde]/u);
  assert.match(retry, /retry-a/u); assert.doesNotMatch(retry, /original-a/u);
  assert.doesNotMatch(html, /<script>/u); assert.match(html, /&lt;script&gt;/u);
});
test("stale packet binding, mismatched answer, duplicated lineage and fake review promotion fail closed", () => {
  const packet = fixture(), [source, results] = bound(packet);
  packet.retryCandidates[0].easyExplanation = "new version";
  assert.throws(() => renderPrivateReviewPacket(JSON.stringify(packet), results), /private_review_packet_invalid/u);
  for (const mutate of [p => { p.retryCandidates[0].proposedChoice = 2; }, p => { p.retryCandidates[0].sourceOriginalNumber = 99; },
    p => { p.originals[0].verifiedBy.human = true; }, p => { p.retryCandidates[0].transferOrMeasurementEligible = true; }]) {
    const changed = JSON.parse(source); mutate(changed);
    assert.throws(() => renderPrivateReviewPacket(...bound(changed)), /private_review_packet_invalid/u);
  }
});
