import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { renderPrivateReviewPacket } from "./render-private-review-packet.mjs";

const sha = value => createHash("sha256").update(value).digest("hex");
function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
}
const digest = value => sha(canonical(value));
const invalid = () => { throw new Error("economics_candidate_preparation_failed"); };
const CHECKS = ["source_transcription", "rights_and_booklet", "answer_keys", "feedback", "model_assumptions", "practice_retry_lineage"];
const NUMBERS = [46, 49, 51, 52, 53];

/** Offline transformation, NOT approval. No answer is solved or rewritten here.
 * Report and calculation evidence must already bind these exact review bytes. */
export function prepareEconomicsRuntimeCandidate(inputs) {
  const { reviewSource, calculationSource, aiEvidenceSource, sourceObservationSource, humanChecklistSource } = inputs;
  for (const source of Object.values(inputs)) {
    if (typeof source !== "string" || !source.length || Buffer.byteLength(source) > 2 * 1024 * 1024) invalid();
  }
  // Reuse the fixed review-packet audit (including the concept mapping regression).
  renderPrivateReviewPacket(reviewSource, calculationSource);
  const packet = JSON.parse(reviewSource), ai = JSON.parse(aiEvidenceSource);
  const observation = JSON.parse(sourceObservationSource);
  if (!observation || typeof observation !== "object" || Array.isArray(observation)) invalid();
  if (packet.schemaVersion !== "issue883.economics.review_candidate.v1" ||
    packet.packetVersion !== "issue883-economics-review-r3" || packet.exam?.year !== 2025 ||
    packet.exam?.round !== 36 || packet.exam?.stage !== 1 || packet.exam?.session !== 1 ||
    packet.exam?.subject !== "economics_principles" || packet.exam?.pdfBooklet !== "A" ||
    packet.exam?.keyBookletExplicit !== null || packet.originals.length !== 5 || packet.retryCandidates.length !== 5 ||
    canonical(packet.originals.map(row => row.number).sort((a,b) => a-b)) !== canonical(NUMBERS) ||
    ai.packetSha256 !== sha(reviewSource) || ai.humanReviewComplete !== false || ai.contentApprovalGranted !== false ||
    ai.runtimeActivationApproved !== false || ai.transferMeasurementApproved !== false ||
    ai.answerKeyExplicitBookletAObserved !== false || ai.verbatimTranscriptionClaim !== false) invalid();
  if (!Array.isArray(packet.sources) || packet.sources.length !== 2 ||
    packet.sourcePolicy?.rawPublicGit !== false || packet.sourcePolicy?.providerCalls !== false) invalid();
  const questionSource = packet.sources.find(row => row.postId === "5231525");
  const keySource = packet.sources.find(row => row.postId === "5246129");
  if (!questionSource || !keySource || packet.sources.some(row => !/^[a-f0-9]{64}$/u.test(row.sha256))) invalid();
  const reviewSha = sha(reviewSource), version = "issue883-economics-r3-runtime-v1";
  const evidence = (id, value) => ({ schemaVersion: "first_stage.immutable_evidence_reference.v1",
    evidenceId: `issue883-r3-${id}`, evidenceVersion: version, evidenceSha256: digest(value) });
  const mappings = [];
  const questions = [...packet.originals, ...packet.retryCandidates].map(row => {
    const original = packet.originals.includes(row), number = original ? row.number : row.sourceOriginalNumber;
    const originalRow = packet.originals.find(item => item.number === number);
    const answer = original ? row.officialKeyObserved : row.proposedChoice;
    if (!originalRow || answer !== (original ? ai.originalAnswerChoices?.[number] : ai.retryAnswerChoices?.[row.id]) ||
      row.id !== (original ? `qnet-2025-36-s1-A-${number}` : `r${number}`) ||
      row.kind !== (original ? "official_original_transcription" : "ai_authored_modified_practice_candidate")) invalid();
    const questionId = original ? row.id : `issue883-r3-${row.id}`;
    const reference = { schemaVersion: "first_stage.question_identity.v1", questionId, questionVersion: version,
      subjectId: "economics_principles", examYear: packet.exam.year, examRound: packet.exam.round,
      sessionId: "qnet-2025-36-s1-A", questionNumber: number, choiceCount: 5,
      sourceVersionManifestIds: [`issue883-r3-source-${number}`] };
    const result = { reference, kind: original ? "original" : "practice_retry",
      sourceQuestionId: original ? null : originalRow.id,
      stem: row.stem, choices: [...row.choices], correctChoice: answer,
      choiceExplanations: [...row.choiceExplanations], easyExplanation: row.easyExplanation,
      concept: { id: `issue883-economics-concept-${number}`, version },
      // Explicit editorial draft, included in the exact candidate for human review.
      feedback: { incorrectCauseByChoice: row.choices.map((_, i) => i + 1 === answer ? null : "C"),
        biggestGapCode: `economics-concept-${number}`, nextActionCode: "review-then-practice-retry" },
      sourceEvidence: evidence(`${row.id}-source`, { reviewSha, source: questionSource, sourceOriginalNumber: number,
        kind: row.kind, rowSha256: digest(row) }),
      rightsEvidence: evidence(`${row.id}-rights-observation`, { sourcePolicy: packet.sourcePolicy,
        sources: packet.sources, observationSha256: sha(sourceObservationSource), approved: false }),
      versionEvidence: evidence(`${row.id}-version`, { reviewSha, exam: packet.exam, rowSha256: digest(row) }) };
    const fields = ["stem", "choices", "choiceExplanations", "easyExplanation"];
    const identities = fields.map(field => ({ field, reviewSha256: digest(row[field]), candidateSha256: digest(result[field]), identical: canonical(row[field]) === canonical(result[field]) }));
    identities.push({ field: "correctChoice", reviewSha256: digest(answer), candidateSha256: digest(result.correctChoice), identical: answer === result.correctChoice });
    if (identities.some(field => !field.identical)) invalid();
    mappings.push({ reviewId: row.id, candidateQuestionId: questionId, sourceOriginalNumber: number,
      reviewRowSha256: digest(row), candidateRowSha256: digest(result), fields: identities,
      conceptDescription: row.concept, originalConceptDescription: originalRow.concept,
      answerBasis: original ? row.answerBasis : row.verification,
      recalculation: row.recalculation, difference: original ? null : row.difference,
      generatedFeedbackCodes: "AI_proposal_requires_feedback_and_model_assumptions_review" });
    return result;
  });
  const candidate = { schemaVersion: "first_stage.economics_private_candidate.v1", version,
    dataClass: "private_review_candidate", authority: "LEARNING_ONLY",
    exam: { year: 2025, round: 36, session: 1, booklet: "A", keyBookletExplicit: null },
    sourceBinding: { reviewPacketSha256: reviewSha, questionPostId: questionSource.postId, keyPostId: keySource.postId,
      questionFileSha256: questionSource.sha256, keyFileSha256: keySource.sha256 },
    reviewEvidence: [{ kind: "ai_review", sha256: sha(aiEvidenceSource) }, { kind: "calculations", sha256: sha(calculationSource) },
      { kind: "source_observation", sha256: sha(sourceObservationSource) }, { kind: "human_review_checklist", sha256: sha(humanChecklistSource) }],
    questions, keys: questions.map((row, index) => ({ questionReferenceSha256: digest(row.reference),
      choiceSetSha256: digest(row.choices.map((body, i) => ({ choiceId: i + 1, body }))), correctChoice: row.correctChoice,
      authority: row.kind === "original" ? "original_final_key" : "independently_reviewed_retry_key",
      evidence: evidence(`${row.reference.questionId}-key-review-basis`, { reviewSha, aiEvidenceSha256: sha(aiEvidenceSource),
        rowSha256: digest(row), sourceKeyFileSha256: row.kind === "original" ? keySource.sha256 : null,
        answerBasis: mappings[index].answerBasis, recalculation: mappings[index].recalculation }) })) };
  const serialized = JSON.stringify(candidate, null, 2) + "\n";
  const mapping = { schemaVersion: "issue883.economics.runtime_candidate_mapping.v1", candidateSha256: sha(serialized),
    reviewPacketSha256: reviewSha, sourceFiles: packet.sources, sourcePolicy: packet.sourcePolicy,
    reviewEvidence: candidate.reviewEvidence, exam: packet.exam, mappings,
    unchangedFields: mappings.flatMap(row => row.fields).length,
    approvalCount: 0, installationCount: 0, runtimeEligible: false,
    reviewer: null, reviewedAt: null, decision: null,
    humanChecks: CHECKS.map(check => ({ check, reviewer: null, reviewedAt: null, decision: null })),
    limitations: ["AI evidence is not human approval", "53 is normalized, not verbatim transcription",
      "Official key does not explicitly name booklet A", "Original full official-key obligations are not reduced by this 5+5 conversion",
      "Modified retries are practice-only; no transfer, measurement, mastery or official authorship",
      "Candidate file, mapping, exact source evidence and pending feedback codes must be reviewed before installation"] };
  return { candidate, serialized, mapping };
}

function privateDirectory(value) {
  if (!path.isAbsolute(value ?? "")) invalid();
  const root = realpathSync(value);
  for (let current = root;; current = path.dirname(current)) {
    if (existsSync(path.join(current, ".git"))) invalid();
    if (current === path.dirname(current)) break;
  }
  return root;
}
function preserveOrCreate(file, bytes) {
  if (existsSync(file)) {
    if (!lstatSync(file).isFile() || lstatSync(file).isSymbolicLink() || !readFileSync(file).equals(Buffer.from(bytes))) invalid();
    return;
  }
  writeFileSync(file, bytes, { flag: "wx", mode: 0o600 });
}
export function preparePrivateEconomicsFiles(rootPath) {
  const root = privateDirectory(rootPath), review = path.join(root, "issue-883-economics-r3-review");
  const read = file => {
    const resolved = realpathSync(file);
    const rel = path.relative(root, resolved);
    if (path.isAbsolute(rel) || rel === ".." || rel.startsWith(`..${path.sep}`) || lstatSync(resolved).size > 2 * 1024 * 1024) invalid();
    return readFileSync(resolved, "utf8");
  };
  const reviewSource = read(path.join(review, "review-packet-r3.json"));
  const sources = JSON.parse(reviewSource).sources;
  if (!Array.isArray(sources)) invalid();
  for (const source of sources) {
    if (path.basename(source.localFile) !== source.localFile) invalid();
    const file = realpathSync(path.join(root, source.localFile)), rel = path.relative(root, file);
    if (path.isAbsolute(rel) || rel.startsWith("..") || sha(readFileSync(file)) !== source.sha256) invalid();
  }
  const prepared = prepareEconomicsRuntimeCandidate({ reviewSource,
    calculationSource: read(path.join(review, "calculation-results.json")),
    aiEvidenceSource: read(path.join(root, "additional-ai-review-2026-09-07/review-evidence.json")),
    sourceObservationSource: read(path.join(review, "source-observation.json")),
    humanChecklistSource: read(path.join(review, "REVIEW-r3.md")) });
  const candidateFile = path.join(root, "economics-runtime-candidate-r3-v1.json");
  const mappingFile = path.join(root, "economics-runtime-mapping-r3-v1.json");
  preserveOrCreate(candidateFile, prepared.serialized);
  preserveOrCreate(mappingFile, JSON.stringify(prepared.mapping, null, 2) + "\n");
  return { candidateFile, mappingFile, questions: prepared.candidate.questions.length,
    unchangedFields: prepared.mapping.unchangedFields, approved: 0, installed: 0 };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { console.log(JSON.stringify(preparePrivateEconomicsFiles(process.argv[2]))); }
  catch { console.error("economics_candidate_preparation_failed"); process.exitCode = 1; }
}
