import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const contractPath = "config/dabangil-post-wcv-c3-productization-v1.json";
const contract = JSON.parse(fs.readFileSync(path.join(root, contractPath), "utf8"));
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("source package is subordinate, closed and complete", () => {
  assert.equal(contract.contractId, "POST_WCV_C3_PRODUCTIZATION_V1");
  assert.equal(contract.programId, "INVERGE_OWNER_STUDY_OS");
  assert.equal(contract.authority.sourceOnly, true);
  assert.equal(contract.authority.createsMasterPlan, false);
  assert.equal(contract.authority.createsControlPlane, false);
  assert.equal(
    contract.authority.liveGitHubAuthority,
    "IMPLEMENTED_STATE_FACTS_ONLY",
  );
  assert.equal("liveGitHubWins" in contract.authority, false);
  assert.deepEqual(contract.authority.childIssues, [771, 773, 774, 775]);
  for (const file of Object.values(contract.documents)) {
    assert.equal(fs.existsSync(path.join(root, file)), true, `missing ${file}`);
  }
  const index = read(contract.documents.sourceIndex);
  assert.match(index, /docs\/dabangil-unified-program-contract\.md/);
  assert.match(index, /roadmap\/active-program\.yml/);
  assert.match(index, /live GitHub와 현재 tree는 구현된 상태의 사실만 결정/);
  assert.match(index, /V14를 만들지 않는다/);
  assert.match(index, /계획 이슈와 과거 문서.*현재 런타임 권한이\s*아니다/s);
});

test("critical path keeps gated activation and mandatory adjacent work explicit", () => {
  assert.deepEqual(contract.phaseGraph.criticalPath, [
    "S0", "S1", "S2", "S3", "S4", "S4A", "S4B", "S5", "S6",
  ]);
  assert.equal(contract.phaseGraph.phases.S3, "OWNER_ONLY_PRODUCTION_WEB_GATED");
  assert.equal(contract.phaseGraph.phases.S4A, "ONE_TOUCH_UNDERSTANDING");
  assert.equal(contract.firstRound.mandatory, true);
  assert.deepEqual(contract.firstRound.subjects, [
    "CIVIL_LAW",
    "ECONOMICS",
    "REAL_ESTATE_PRINCIPLES",
    "APPRAISER_RELATED_LAW",
    "ACCOUNTING",
  ]);
  assert.equal(contract.firstRound.english, "EXTERNAL_QUALIFYING_SCORE_ONLY");
  assert.equal(
    contract.firstRound.officialProfileSource,
    "docs/s235b-first-round-adaptive-mcq-foundation-contract.md",
  );
  assert.deepEqual(contract.firstRound.timedRunners, [
    "SESSION_1_120_QUESTIONS_120_MINUTES",
    "SESSION_2_80_QUESTIONS_80_MINUTES",
  ]);
  assert.deepEqual(contract.firstRound.subjectRuntimeDependencyGraph, {
    "ULC-M1": ["WCV-C3", "S241A"],
    "ULC-M2": ["ULC-M1"],
    "ULC-K1": ["ULC-M2"],
    "ULC-F1": ["ULC-K1", "S238B"],
    "ULC-F2": ["ULC-F1"],
    "ULC-F3": ["ULC-F2"],
    "ULC-F4": ["ULC-F3"],
    "ULC-F5": ["ULC-F4"],
  });
  assert.deepEqual(contract.firstRound.subjectSequence, [
    "ULC-F1", "ULC-F2", "ULC-F3", "ULC-F4", "ULC-F5",
  ]);
  assert.equal("sequence" in contract.firstRound, false);
  assert.equal(contract.firstRound.correctClickCreatesMastery, false);
  assert.equal(contract.firstRound.modelOutputIsAnswerAuthority, false);
});

test("learner language requires one truthful action without internal leakage", () => {
  assert.equal(contract.firstGlance.dominantActionCount, 1);
  assert.deepEqual(contract.firstGlance.requiredFields, [
    "what", "whyNow", "estimatedMinutes", "nextStep",
  ]);
  assert.equal(contract.learnerLabels.primaryTask, "오늘의 한 가지");
  assert.equal(contract.learnerLabels.D1, "다음 날 혼자 해보기");
  assert.equal(contract.learnerLabels.D7, "일주일 뒤 다른 문제");
  assert.equal(contract.learnerLabels.stable, "현재 안정");
  for (const token of [
    "D+1", "D+7", "Today Plan", "CURRENTLY_CLEAR", "NORMAL", "anchorId",
  ]) {
    assert.equal(contract.forbiddenFirstViewportIdentifiers.includes(token), true);
  }
  const language = read(contract.documents.learnerLanguage);
  assert.match(language, /완전 정복/);
  assert.match(language, /무엇·이유·시간·다음/);
});

test("one-touch help cannot create mastery or bypass subject authority", () => {
  const help = contract.oneTouchUnderstanding;
  assert.equal(help.maximumDefaultCandidates, 3);
  assert.equal(help.exposureCommittedBeforeProtectedBody, true);
  assert.equal(help.openCreatesMastery, false);
  assert.equal(help.openCreatesVerified, false);
  assert.equal(help.sameSessionRecallQualifiesDelayedEvidence, false);
  assert.equal(help.cachedCompiledCardFirst, true);
  assert.equal(help.strongestModelPerTap, false);
  assert.deepEqual(help.subjectAuthority, {
    PRACTICE: "DETERMINISTIC_NUMBER_UNIT_SIGN_ROUNDING_INVERSE",
    THEORY: "TARGET_SCOPE_RUBRIC_EVIDENCE",
    LAW: "EXACT_SOURCE_EFFECTIVE_VERSION_CURRENTNESS",
  });
  assert.equal(help.helpLevels.filter((level) => level.strongAssistance).length, 1);
  assert.equal(help.contracts.includes("ContextualHelpExposureV1"), true);
  const source = read(contract.documents.oneTouchUnderstanding);
  assert.match(source, /body-before\s+commit 금지/);
  assert.match(source, /cycle, 누락, 단위 불일치.*fail closed/s);
  assert.match(source, /strongest model을 호출하지 않는다/);
});

test("presentation modes cannot change learning truth", () => {
  const modes = contract.presentationModes;
  assert.equal(modes.default, "STANDARD");
  assert.deepEqual(modes.allowed, ["STANDARD", "GAMEFUL", "LOW_STIMULATION"]);
  assert.equal(modes.gamefulOptIn, true);
  assert.equal(modes.reversible, true);
  assert.equal(modes.remotelyDisableable, true);
  assert.equal(modes.lowStimulationFeatureParity, true);
  assert.deepEqual(modes.semanticFieldsLockedAcrossModes, [
    "answer", "evidence", "biggestGap", "nextAction", "eligibility", "dueAt",
    "mastery", "score", "entitlement", "usage", "cost",
  ]);
  for (const prohibited of ["RANDOM_REWARD", "PUNITIVE_STREAK", "PAY_TO_REPAIR"]) {
    assert.equal(modes.prohibited.includes(prohibited), true);
  }
});

test("rights, privacy and activation remain fail closed", () => {
  assert.deepEqual(new Set(Object.values(contract.activation)), new Set([false]));
  assert.equal(contract.rightsAndPrivacy.publicAvailabilityMeansPermission, false);
  assert.equal(contract.rightsAndPrivacy.privateUploadMayEnterSharedCache, false);
  assert.equal(contract.rightsAndPrivacy.privateUploadMayEnterAnalyticsBody, false);
  assert.equal(contract.rightsAndPrivacy.privateUploadMayEnterGeneration, false);
  assert.equal(contract.rightsAndPrivacy.privateUploadMayEnterModelTraining, false);
  assert.equal(contract.rightsAndPrivacy.privateCardMayCrossLearners, false);
  assert.equal(contract.rightsAndPrivacy.sharedMaterialRequiresIndependentRightsBasis, true);
  assert.equal(contract.secondStage.officialGradingClaim, false);
  assert.equal(contract.secondStage.officialModelAnswerClaim, false);
  assert.equal(contract.secondStage.passGuaranteeClaim, false);
  assert.deepEqual(contract.secondStage.referenceAnswerPolicy.requiredDisclosures, [
    "SOURCE_STATUS", "VERIFICATION_STATUS", "UNCERTAINTY",
  ]);
  assert.deepEqual(contract.secondStage.referenceAnswerPolicy.blockingConditions, [
    "LEGAL_SOURCE_BLOCKER", "CALCULATION_BLOCKER", "UNRESOLVED_CONSENSUS_BLOCKER",
  ]);
  assert.equal(
    contract.secondStage.referenceAnswerPolicy.canonicalValidator,
    "lib/review-os/second-round-reference-answer-package-registry.ts",
  );
  assert.equal(contract.secondStage.referenceAnswerPolicy.canonicalPackageValidationMustPass, true);
  assert.equal(contract.secondStage.referenceAnswerPolicy.minimumIndependentCandidateCount, 3);
  assert.equal(contract.secondStage.referenceAnswerPolicy.minimumCriticPassCount, 1);
  assert.deepEqual(contract.secondStage.referenceAnswerPolicy.requiredVerificationReport, {
    sourceStatus: "source_verified",
    evidenceStatus: "subject_validated",
    subjectValidationStatus: "subject_validated",
    criticConsensusStatus: "critic_consensus_passed",
    releaseGateStatus: "released",
    unresolvedConflictCount: 0,
  });
  assert.equal(contract.secondStage.referenceAnswerPolicy.subjectChecksMustPass, true);
  assert.equal(contract.secondStage.referenceAnswerPolicy.openBlockingReleaseBlockerCount, 0);
  assert.equal(contract.secondStage.referenceAnswerPolicy.unresolvedBlockingUncertaintyCount, 0);
  assert.equal(
    contract.secondStage.referenceAnswerPolicy.requiredLearningReferenceStatus,
    "released_learning_reference",
  );
  assert.deepEqual(contract.secondStage.referenceAnswerPolicy.requiredReleaseDecision, {
    status: "released",
    releasedAtRequired: true,
    requiredCaveatKey: "learning_reference_not_official_answer",
    noOfficialAnswerGuardrail: true,
    learnerFacingOfficialClaimAllowed: false,
    releaseRequiresNoOpenBlockers: true,
  });
  assert.deepEqual(contract.secondStage.referenceAnswerPolicy.disallowedRightsStatuses, [
    "needs_legal_review", "private_reference_only",
  ]);
  assert.equal(contract.secondStage.referenceAnswerPolicy.releaseWhileBlocked, false);
  const canonicalValidator = read(
    contract.secondStage.referenceAnswerPolicy.canonicalValidator,
  );
  assert.match(canonicalValidator, /function assertReleaseRules/);
  assert.match(canonicalValidator, /pkg\.release\.status !== "released"/);
  assert.match(canonicalValidator, /pkg\.learningReference\.status !== "released_learning_reference"/);
  assert.match(canonicalValidator, /!pkg\.release\.releasedAt/);
  assert.match(canonicalValidator, /needs_legal_review.*private_reference_only/s);
  const secondRound = read(contract.documents.secondRound);
  assert.match(secondRound, /출처 상태, 검증 상태와 불확실성/);
  assert.match(secondRound, /차단 상태이면\s*기준안을 공개하지 않는다/);
  assert.match(secondRound, /독립인 후보를 최소 3개/);
  assert.match(secondRound, /과목별 검증, 별도 critic 검토, 합의·충돌 처리와 출처 anchor/);
  assert.match(secondRound, /package 전체가 canonical validator를 통과/);
  assert.match(secondRound, /release decision은\s*`released`/);
  assert.match(secondRound, /learning-reference 상태는 `released_learning_reference`/);
});

test("source documents preserve accessibility and no-runtime receipt", () => {
  const combined = Object.values(contract.documents).map(read).join("\n");
  for (const token of ["390/768/1440", "200% reflow", "keyboard", "screen reader"]) {
    assert.match(combined, new RegExp(token.replace("%", "\\%"), "i"));
  }
  const validation = read(contract.documents.validation);
  assert.match(validation, /Production, 결제, 공개, 실제 사용자는 모두 false/);
  const runner = read("scripts/run-node-tests.mjs");
  assert.match(runner, /tests\/dabangil-post-wcv-c3-productization-contract\.test\.mjs/);
});
