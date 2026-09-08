import crypto from "node:crypto";

export const reviewPacketSha256 = source => crypto.createHash("sha256").update(source).digest("hex");
const invalid = () => { throw new Error("private_review_packet_invalid"); };
const deniedAuthorityFlags = new Set(["runtimeEligible", "transferOrMeasurementEligible",
  "humanReviewComplete", "runtimeAuthorityGranted"]);

function pendingHumanReview(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).length === 3 && Object.keys(value).every(key => ["reviewer", "decision", "state"].includes(key)) &&
    value.reviewer === null && value.decision === null && value.state === "pending";
}

function assertReviewOnly(value) {
  if (value === null || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (deniedAuthorityFlags.has(key) && child !== false) invalid();
    if (key === "humanReview" && child !== false && !pendingHumanReview(child)) invalid();
    if (key === "verifiedBy" && child?.human !== false) invalid();
    assertReviewOnly(child);
  }
}

/** Pure shared audit: no filesystem, rendering, installation or approval. */
export function validatePrivateReviewPacket(source, calculationSource) {
  const packet = JSON.parse(source), calculation = JSON.parse(calculationSource);
  assertReviewOnly(packet);
  assertReviewOnly(calculation);
  if (!Array.isArray(packet.originals) || !Array.isArray(packet.retryCandidates) ||
    !packet.originals.length || packet.originals.length > 20 ||
    packet.originals.length !== packet.retryCandidates.length || packet.runtimeEligible !== false ||
    calculation.reviewPacketSha256 !== reviewPacketSha256(source)) invalid();
  const rows = [...packet.originals, ...packet.retryCandidates];
  if (new Set(packet.originals.map(row => row.number)).size !== packet.originals.length) invalid();
  const ids = rows.map(row => row.id);
  if (new Set(ids).size !== ids.length || calculation.results?.length !== rows.length) invalid();
  const results = new Map(calculation.results.map(result => [result.id, result]));
  if (results.size !== rows.length) invalid();
  for (const row of rows) {
    if (typeof row.id !== "string" || !Array.isArray(row.choices) || row.choices.length !== 5 ||
      !Array.isArray(row.choiceExplanations) || row.choiceExplanations.length !== 5 ||
      row.runtimeEligible !== false || row.transferOrMeasurementEligible !== false) invalid();
    // Named concepts are explanations of a skill, never an answer/choice list.
    // Validate before rendering; generic rendering previously hid a bad mapping.
    if (typeof row.concept !== "string" || !row.concept.trim() || row.concept.length > 300 ||
      /[0-9①-⑩]/u.test(row.concept) || rows.some(other =>
        [other.stem, other.easyExplanation, ...other.choiceExplanations].includes(row.concept))) invalid();
    if ([row.stem, row.easyExplanation, ...row.choices, ...row.choiceExplanations]
      .some(value => typeof value !== "string" || !value.trim())) invalid();
    const original = packet.originals.includes(row);
    const result = results.get(original ? `original-${row.number}` : row.id);
    if (!result || result.checksPassed !== true || result.humanReview !== false ||
      result.runtimeAuthorityGranted !== false || result.computedChoice !==
      (original ? row.officialKeyObserved : row.proposedChoice)) invalid();
    if (original ? row.verifiedBy?.human !== false : row.officialKeyApplies !== false) invalid();
  }
  const pairs = packet.originals.map(original => {
    const matches = packet.retryCandidates.filter(retry => retry.sourceOriginalNumber === original.number);
    if (matches.length !== 1) invalid();
    return [original, matches[0]];
  });
  return { packet, pairs };
}
