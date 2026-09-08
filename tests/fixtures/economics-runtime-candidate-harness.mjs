import { createHash } from "node:crypto";
import { prepareEconomicsRuntimeCandidate } from "../../scripts/content-review/prepare-economics-runtime-candidate.mjs";
import { syntheticContentInput } from "./first-stage-economics-content-harness.mjs";

const hash = value => createHash("sha256").update(value).digest("hex");
export function syntheticReviewInputs({ numericTrialModels = false } = {}) {
  const originals = [46, 49, 51, 52, 53].map(number => ({ id: `qnet-2025-36-s1-A-${number}`,
    kind: "official_original_transcription", number, stem: `SYNTHETIC_CANDIDATE_STEM_${number}`,
    choices: ["Synthetic alpha", "Synthetic beta", "Synthetic gamma", "Synthetic delta", "Synthetic epsilon"],
    officialKeyObserved: 2, concept: "Synthetic original concept", answerBasis: "Synthetic observation only",
    choiceExplanations: ["alpha reason", "beta reason", "gamma reason", "delta reason", "epsilon reason"],
    easyExplanation: "SYNTHETIC_CANDIDATE_EXPLANATION", recalculation: "Synthetic prior arithmetic evidence",
    verifiedBy: { human: false }, runtimeEligible: false, transferOrMeasurementEligible: false }));
  const retryCandidates = originals.map(row => ({ ...row, id: `r${row.number}`,
    kind: "ai_authored_modified_practice_candidate", sourceOriginalNumber: row.number,
    stem: `SYNTHETIC_CANDIDATE_RETRY_${row.number}`, concept: "Synthetic retry concept", proposedChoice: 4,
    officialKeyApplies: false, verification: "Synthetic prior independent calculation", difference: "Synthetic changed values" }));
  // Entirely synthetic model records; not copied from the private r3 corpus.
  const models = numericTrialModels ? {
    "original-49": {leader:"8",follower:"4",price:"12",profit:"64",zeroFollowerThreshold:"16",zeroRegimeBestQuantity:"16",zeroRegimeBestProfit:"-1",zeroRegimeDerivativeAtBest:"-1"},
    r49: {leader:"12",follower:"6",price:"18",profit:"144",zeroFollowerThreshold:"24",zeroRegimeBestQuantity:"24",zeroRegimeBestProfit:"0",zeroRegimeDerivativeAtBest:"-2"},
    "original-51": {cartelTotal:"12",follower:"6",deviator:"9",profit:"81"},
    r51: {cartelTotal:"16",follower:"8",deviator:"12",profit:"144"},
    "original-53": {marketQuantity:"12",socialQuantity:"8",unitTax:"12",welfareImprovement:"32"},
    r53: {marketQuantity:"15",socialQuantity:"10",unitTax:"15",welfareImprovement:"50"},
  } : {};
  for (const row of [...originals,...retryCandidates]) {
    const original=originals.includes(row), n=original?row.number:row.sourceOriginalNumber;
    const model=models[original?`original-${n}`:row.id];
    if (!model) continue;
    const target=n===49?(original?model.leader:model.price):n===51?(original?model.profit:model.deviator):(original?model.welfareImprovement:model.unitTax);
    row.choices=["1001","1002","1003","1004","1005"];
    row.choices[(original?2:4)-1]=target;
  }
  const packet = { schemaVersion: "issue883.economics.review_candidate.v1", packetVersion: "issue883-economics-review-r3",
    humanReview: { reviewer: null, decision: null, state: "pending" }, runtimeEligible: false,
    exam: { year: 2025, round: 36, stage: 1, session: 1, subject: "economics_principles", pdfBooklet: "A", keyBookletExplicit: null },
    sources: [{ postId: "5231525", sha256: hash(JSON.stringify("synthetic-q1-asset-bytes")) }, { postId: "5246129", sha256: hash(JSON.stringify("synthetic-key-asset-bytes")) }],
    sourcePolicy: { rawPublicGit: false, providerCalls: false }, originals, retryCandidates };
  const reviewSource = JSON.stringify(packet);
  return { reviewSource, calculationSource: JSON.stringify({ reviewPacketSha256: hash(reviewSource),
    results: [...originals.map(row => ({ id: `original-${row.number}`, computedChoice: 2 })),
      ...retryCandidates.map(row => ({ id: row.id, computedChoice: 4 }))].map(row => ({ ...row, checksPassed: true,
        humanReview: false, runtimeAuthorityGranted: false,
        ...(models[row.id]?{method:"exact_rational_and_independent_objective_or_area_crosscheck",values:models[row.id]}:{}) })) }),
    aiEvidenceSource: JSON.stringify({ packetSha256: hash(reviewSource), humanReviewComplete: false, contentApprovalGranted: false,
      runtimeActivationApproved: false, transferMeasurementApproved: false, answerKeyExplicitBookletAObserved: false,
      verbatimTranscriptionClaim: false, originalAnswerChoices: Object.fromEntries(originals.map(row => [row.number, 2])),
      retryAnswerChoices: Object.fromEntries(retryCandidates.map(row => [row.id, 4])) }),
    sourceObservationSource: JSON.stringify({ syntheticOnly: true }), humanChecklistSource: "SYNTHETIC SIX PENDING CHECKS" };
}
export function syntheticRuntimeCandidateInput() {
  const { candidate } = prepareEconomicsRuntimeCandidate(syntheticReviewInputs());
  // Only entirely synthetic input uses this explicit test classification.
  candidate.dataClass = "synthetic_test_only";
  return syntheticContentInput(candidate);
}
