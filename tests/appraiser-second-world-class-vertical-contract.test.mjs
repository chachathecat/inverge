import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const files = {
  agents: "AGENTS.md",
  decision:
    "docs/decisions/2026-08-10-owner-appraiser-second-world-class-vertical-execution.md",
  strategy:
    "docs/strategy/dabangil-appraiser-second-world-class-vertical-execution-v1-2026-08-10.md",
  benchmark:
    "docs/qa/appraiser-second-world-class-benchmark-and-adoption-matrix-v1-2026-08-10.md",
  contract:
    "config/dabangil-appraiser-second-world-class-vertical-v1.json",
  validation:
    "docs/qa/appraiser-second-world-class-vertical-validation.md",
  runner: "scripts/run-node-tests.mjs",
};

const read = (path) => readFileSync(path, "utf8");
const agents = read(files.agents);
const decision = read(files.decision);
const strategy = read(files.strategy);
const benchmark = read(files.benchmark);
const validation = read(files.validation);
const contractText = read(files.contract);
const runner = read(files.runner);
const contract = JSON.parse(contractText);

const includesAll = (text, markers, label) => {
  for (const marker of markers) {
    assert.ok(text.includes(marker), `${label} missing marker: ${marker}`);
  }
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const valueAtPath = (value, path) => typeof path === "string"
  ? path.split(".").reduce((current, key) => current?.[key], value)
  : undefined;

const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

const exactStringSet = (actual, expected) => {
  if (!Array.isArray(actual) || !Array.isArray(expected) || actual.length === 0) return false;
  if (actual.some((value) => !isNonEmptyString(value))) return false;
  if (new Set(actual).size !== actual.length || new Set(expected).size !== expected.length) return false;
  return [...actual].sort().join("\u0000") === [...expected].sort().join("\u0000");
};

const unquoteMarkdownCell = (value) => {
  const trimmed = value.trim();
  const code = trimmed.match(/^`([^`]*)`$/);
  return code ? code[1] : trimmed;
};

const tableAfterHeading = (text, heading) => {
  const headingMarker = `### ${heading}`;
  const headingIndex = text.indexOf(headingMarker);
  if (headingIndex < 0) return { headers: [], rows: [] };
  const afterHeading = text.slice(headingIndex + headingMarker.length);
  const nextHeadingIndex = afterHeading.search(/^### /m);
  const section = nextHeadingIndex < 0
    ? afterHeading
    : afterHeading.slice(0, nextHeadingIndex);
  const lines = section.split("\n");
  const tableStart = lines.findIndex((line) => line.trim().startsWith("|"));
  if (tableStart < 0) return { headers: [], rows: [] };
  const tableLines = [];
  for (const line of lines.slice(tableStart)) {
    if (!line.trim().startsWith("|")) break;
    tableLines.push(line.trim());
  }
  const parseLine = (line) => line
    .split("|")
    .slice(1, -1)
    .map(unquoteMarkdownCell);
  const headers = parseLine(tableLines[0] ?? "");
  const separator = parseLine(tableLines[1] ?? "");
  if (
    headers.length === 0
    || separator.length !== headers.length
    || separator.some((cell) => !/^:?-{3,}:?$/.test(cell))
  ) return { headers: [], rows: [] };
  return {
    headers,
    rows: tableLines.slice(2).map((line) => {
      const cells = parseLine(line);
      return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
    }),
  };
};

const deriveLifecycleVocabulary = (text) => {
  const declaration = text.match(
    /Dependency and model adapters use the state vocabulary([\s\S]*?)\.\nThis reset schedules only/,
  )?.[1] ?? "";
  return [...declaration.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
};

const expectedLifecycleCandidates = [
  "Ajv",
  "decimal.js",
  "Inspect AI",
  "ts-fsrs",
  "pyBKT",
  "pgvector",
  "PaddleOCR",
  "Tesseract",
  "OR-Tools",
];

const expectedReferenceEntries = [
  "OATutor",
  "H5P Branching",
  "QTI 3",
  "Caliper",
  "W3C PROV",
  "NIST AI RMF",
];

const forbiddenLifecycleSlotValues = [
  "future_phase_1_candidate",
  "future_optional_adapter",
  "deferred_due_candidate",
  "benchmark_shadow_only",
];

const lifecycleLedgerErrors = (lifecycleRows, referenceRows, canonicalStates) => {
  const errors = [];
  const canonical = new Set(canonicalStates);
  const forbidden = new Set(forbiddenLifecycleSlotValues);
  const seenCandidates = new Set();

  for (const row of lifecycleRows) {
    const candidate = row.Candidate;
    const state = row["Lifecycle state"];
    if (!isNonEmptyString(candidate)) errors.push("missing candidate");
    if (seenCandidates.has(candidate)) errors.push(`duplicate candidate: ${candidate}`);
    seenCandidates.add(candidate);
    if (!isNonEmptyString(state)) errors.push(`missing lifecycle state: ${candidate}`);
    if (!canonical.has(state)) errors.push(`unknown lifecycle state: ${candidate}:${state}`);
    if (forbidden.has(state)) errors.push(`forbidden lifecycle state: ${candidate}:${state}`);
    for (const field of ["Planning phase", "Planning role"]) {
      const value = row[field];
      if (!isNonEmptyString(value)) errors.push(`missing ${field}: ${candidate}`);
      if (canonical.has(value) || forbidden.has(value)) {
        errors.push(`planning metadata occupies lifecycle authority: ${candidate}:${field}`);
      }
    }
    if (!isNonEmptyString(row["Allowed role"])) errors.push(`missing allowed role: ${candidate}`);
  }

  for (const candidate of expectedLifecycleCandidates) {
    if (!seenCandidates.has(candidate)) errors.push(`missing lifecycle candidate: ${candidate}`);
  }
  for (const candidate of seenCandidates) {
    if (!expectedLifecycleCandidates.includes(candidate)) {
      errors.push(`unexpected lifecycle candidate: ${candidate}`);
    }
  }

  const seenReferences = new Set();
  for (const row of referenceRows) {
    const reference = row.Reference;
    const category = row["Reference category"];
    if (!isNonEmptyString(reference)) errors.push("missing reference");
    if (seenReferences.has(reference)) errors.push(`duplicate reference: ${reference}`);
    seenReferences.add(reference);
    if (!isNonEmptyString(category)) errors.push(`missing reference category: ${reference}`);
    if (canonical.has(category) || forbidden.has(category)) {
      errors.push(`reference category occupies lifecycle state: ${reference}`);
    }
    if (seenCandidates.has(reference)) errors.push(`reference inside lifecycle ledger: ${reference}`);
    if (!isNonEmptyString(row["Allowed use"])) errors.push(`missing allowed use: ${reference}`);
  }
  for (const reference of expectedReferenceEntries) {
    if (!seenReferences.has(reference)) errors.push(`missing reference entry: ${reference}`);
  }
  for (const reference of seenReferences) {
    if (!expectedReferenceEntries.includes(reference)) {
      errors.push(`unexpected reference entry: ${reference}`);
    }
  }
  return errors;
};

const tutorDefinitionErrors = ({
  states = contract.tutorStateMachine,
  defaultPath = contract.defaultAttemptFirstPath,
  guidedPath = contract.guidedRevealOverrideContract.path,
  transitionContract = contract.tutorTransitionContract,
} = {}) => {
  const errors = [];
  const stateSet = new Set(states);
  if (stateSet.size !== states.length) errors.push("duplicate state");

  const normalEdges = new Set();
  for (const transition of transitionContract.normalTransitions ?? []) {
    if (!stateSet.has(transition.from) || !stateSet.has(transition.to)) {
      errors.push(`normal endpoint outside enum: ${transition.from}->${transition.to}`);
    }
    const edge = `${transition.from}->${transition.to}`;
    if (normalEdges.has(edge)) errors.push(`duplicate normal edge: ${edge}`);
    normalEdges.add(edge);
  }
  for (const transition of transitionContract.failClosedTransitions ?? []) {
    if (!stateSet.has(transition.from) || !stateSet.has(transition.to)) {
      errors.push(`fail-closed endpoint outside enum: ${transition.from}->${transition.to}`);
    }
  }
  const invalidation = transitionContract.basisOrConfigurationInvalidationTransition;
  if (!stateSet.has(invalidation?.to)) errors.push("stale endpoint outside enum");
  for (const from of invalidation?.fromStates ?? []) {
    if (!stateSet.has(from)) errors.push(`stale source outside enum: ${from}`);
  }

  for (const [label, path] of [["default", defaultPath], ["guided", guidedPath]]) {
    for (const state of path) {
      if (!stateSet.has(state)) errors.push(`${label} path state outside enum: ${state}`);
    }
    for (let index = 0; index < path.length - 1; index += 1) {
      const edge = `${path[index]}->${path[index + 1]}`;
      if (!normalEdges.has(edge)) errors.push(`${label} adjacent edge missing: ${edge}`);
    }
  }
  const expectedNormalEdges = new Set(["INTAKE->ORIENT", "SCHEDULE->COMPLETED"]);
  for (const path of [defaultPath, guidedPath]) {
    for (let index = 0; index < path.length - 1; index += 1) {
      expectedNormalEdges.add(`${path[index]}->${path[index + 1]}`);
    }
  }
  for (const edge of normalEdges) {
    if (!expectedNormalEdges.has(edge)) errors.push(`normal path broadened: ${edge}`);
  }
  if (guidedPath.includes("ATTEMPT")) errors.push("guided path contains ATTEMPT");
  if (normalEdges.has("CONFIRM_GUIDED_REVEAL_OVERRIDE->GUIDED_STUDY")) {
    errors.push("guided path bypasses exposure commit");
  }
  if (!normalEdges.has("SCHEDULE->COMPLETED")) errors.push("default terminal edge missing");
  for (const terminal of ["COMPLETED", "GUIDED_EXIT", "BLOCKED", "STALE"]) {
    if (!stateSet.has(terminal)) errors.push(`terminal state missing: ${terminal}`);
  }
  return errors;
};

const rejectedTutorTransition = {
  accepted: false,
  stateAdvance: false,
  helpBytes: 0,
  positiveEvidence: 0,
};

const evaluateTutorTransition = (from, to, conditions = {}) => {
  const machine = contract.tutorTransitionContract;
  const states = new Set(contract.tutorStateMachine);
  if (!states.has(from) || !states.has(to)) return rejectedTutorTransition;

  const failClosed = machine.failClosedTransitions.find(
    (transition) => transition.from === from && transition.to === to,
  );
  if (failClosed) {
    return conditions[failClosed.when] === true
      ? { accepted: true, stateAdvance: true, to }
      : rejectedTutorTransition;
  }

  const invalidation = machine.basisOrConfigurationInvalidationTransition;
  if (to === invalidation.to && invalidation.fromStates.includes(from)) {
    return conditions[invalidation.when] === true
      ? { accepted: true, stateAdvance: true, to }
      : rejectedTutorTransition;
  }

  const normal = machine.normalTransitions.find(
    (transition) => transition.from === from && transition.to === to,
  );
  if (!normal) return rejectedTutorTransition;

  const helpGuard = machine.helpProducingTransitionGuards.find(
    (guard) => guard.from === from && guard.to === to,
  );
  if (helpGuard && conditions[helpGuard.requires] !== true) return rejectedTutorTransition;
  const completionGuard = machine.guidedCompletionGuard;
  if (
    completionGuard.from === from
    && completionGuard.to === to
    && conditions[completionGuard.requires] !== true
  ) return rejectedTutorTransition;

  return { accepted: true, stateAdvance: true, to };
};

const evaluateD7Eligibility = (candidate, context, _outerSummaryBoolean = false) => {
  const gate = contract.d7EligibilityContract;
  const failure = { eligible: false, ...gate.failureBehavior };
  const artifactIsCurrentAndBound = (artifact) => isRecord(artifact)
    && isNonEmptyString(artifact.ref)
    && artifact.authority === "TRUSTED_SERVER_RESOLVER"
    && artifact.current === true
    && artifact.stale === false
    && artifact.ambiguous === false
    && artifact.itemRevisionRef === candidate?.candidate?.itemRevisionRef
    && artifact.sourceIdentityRef === context.sourceIdentityRef
    && artifact.effectiveVersionRef === context.effectiveVersionRef;

  for (const conjunct of gate.requiredConjuncts) {
    const value = valueAtPath(candidate, conjunct.path);
    let passed = false;
    switch (conjunct.predicate) {
      case "EXACT_TRUSTED_CONTEXT":
        passed = valueAtPath(context, conjunct.contextPath) === conjunct.expected
          && context.trustedServerResolved === true
          && context.requestSupplied === false
          && context.clientSupplied === false
          && context.modelSupplied === false;
        break;
      case "EXACT_CONTEXT_BINDING":
        passed = isNonEmptyString(value) && value === valueAtPath(context, conjunct.contextPath);
        break;
      case "CURRENT_EXACT_D7_RIGHTS":
        passed = isRecord(value)
          && isNonEmptyString(value.decisionRef)
          && value.authority === conjunct.expectedAuthority
          && value.decision === conjunct.expectedDecision
          && value.use === conjunct.expectedUse
          && value.current === true
          && value.resolvedFreshAtAcceptance === true
          && value.stale === false
          && value.ambiguous === false
          && value.learnerScopeRef === context.learnerScopeRef
          && value.closureCaseRef === context.closureCaseRef
          && value.itemRevisionRef === candidate?.candidate?.itemRevisionRef
          && value.sourceIdentityRef === context.sourceIdentityRef
          && value.effectiveVersionRef === context.effectiveVersionRef;
        break;
      case "CURRENT_SOURCE_AND_EFFECTIVE_VERSION":
        passed = isRecord(value)
          && isNonEmptyString(value.resolutionRef)
          && value.authority === "TRUSTED_SERVER_RESOLVER"
          && value.current === true
          && value.resolvedFreshAtAcceptance === true
          && value.stale === false
          && value.ambiguous === false
          && value.identityRef === context.sourceIdentityRef
          && value.effectiveVersionRef === context.effectiveVersionRef
          && value.itemRevisionRef === candidate?.candidate?.itemRevisionRef;
        break;
      case "EXACT_CONTEXT_STRING_SET":
        passed = exactStringSet(value, valueAtPath(context, conjunct.contextPath));
        break;
      case "DIFFERENT_CONTEXT_VALUE":
        passed = isNonEmptyString(value)
          && isNonEmptyString(valueAtPath(context, conjunct.contextPath))
          && value !== valueAtPath(context, conjunct.contextPath);
        break;
      case "TRUSTED_NON_SAME_SURFACE_FAMILY":
        passed = isRecord(value)
          && isNonEmptyString(value.verificationRef)
          && value.authority === "TRUSTED_SERVER_VERIFIER"
          && value.current === true
          && value.stale === false
          && value.ambiguous === false
          && value.verified === true
          && value.nonSameSurface === true
          && value.itemRevisionRef === candidate?.candidate?.itemRevisionRef
          && isNonEmptyString(value.candidateItemFamilyRef)
          && value.sourceItemFamilyRef === context.sourceItemFamilyRef
          && value.candidateItemFamilyRef !== context.sourceItemFamilyRef;
        break;
      case "CURRENT_EXACT_BOUND_ARTIFACTS":
        passed = isRecord(value)
          && artifactIsCurrentAndBound(value.answer)
          && artifactIsCurrentAndBound(value.rubric)
          && artifactIsCurrentAndBound(value.validator);
        break;
      case "TRUSTED_SEALED_PRE_PRESENTATION_UNSEEN_SNAPSHOT":
        passed = isRecord(value)
          && value.authority === "TRUSTED_SERVER_RESOLVER"
          && isNonEmptyString(value.snapshotRef)
          && value.sealed === true
          && value.createdBeforePresentation === true
          && value.createdAfterPresentation === false
          && value.learnerScopeRef === context.learnerScopeRef
          && value.itemRevisionRef === candidate?.candidate?.itemRevisionRef
          && value.solutionHiddenAtSeal === true
          && value.helpBytesAtSeal === 0
          && value.priorUseCount === 0
          && value.consumptionCount === 1
          && value.consumedByAttemptRef === candidate?.attempt?.attemptRef
          && value.reused === false
          && value.stale === false
          && value.ambiguous === false;
        break;
      case "HIDDEN_ZERO_HELP_BYTES":
        passed = isRecord(value)
          && value.solutionHidden === true
          && ["hintBytes", "referenceBytes", "probeBytes", "solutionBytes"]
            .every((field) => value[field] === 0);
        break;
      case "GENUINE_COMPLETED_ATTEMPT_FIRST_SUCCESS":
        passed = isRecord(value)
          && value.authority === "TRUSTED_SERVER_RESOLVER"
          && isNonEmptyString(value.attemptRef)
          && value.mode === "attempt_first"
          && value.genuine === true
          && value.nonEmpty === true
          && value.successful === true
          && value.completed === true
          && value.committed === true
          && value.committedBeforeAnySolutionBytes === true
          && value.submittedBeforeSolutionReveal === true
          && value.assisted === false
          && value.guidedOverride === false
          && value.synthetic === false
          && value.placeholder === false
          && value.stale === false
          && value.ambiguous === false
          && value.learnerScopeRef === context.learnerScopeRef
          && value.closureCaseRef === context.closureCaseRef
          && value.itemRevisionRef === candidate?.candidate?.itemRevisionRef;
        break;
      case "EXACT_ZERO":
        passed = Number.isInteger(value) && value === 0;
        break;
      case "ZERO_CONTAMINATION_VECTOR":
        passed = isRecord(value)
          && ["total", "cache", "prefetch", "directRoute", "multiTab", "other"]
            .every((field) => Number.isInteger(value[field]) && value[field] === 0);
        break;
      case "FRESH_ACCEPTANCE_CURRENTNESS":
        passed = isRecord(value)
          && value.authority === "TRUSTED_SERVER_RESOLVER"
          && value.verifiedFreshAtAcceptance === true
          && value.verifiedAt === "D7_ACCEPTANCE"
          && value.priorEligibilityResultReused === false
          && value.rightsCurrent === true
          && value.sourceCurrent === true
          && value.artifactsCurrent === true
          && value.unseenSnapshotCurrent === true
          && value.attemptCurrent === true
          && value.driftDetected === false
          && value.stale === false
          && value.ambiguous === false;
        break;
      default:
        passed = false;
    }
    if (!passed) return failure;
  }
  return { eligible: true };
};

test("synchronizes WCV contract v1.0.8 and keeps V13 authoritative", () => {
  assert.equal(contract.version, "1.0.8");
  assert.equal(
    contract.activeMasterPlan,
    "docs/strategy/dabangil-professional-exam-reasoning-os-final-master-plan-v13-2026-08-06.md",
  );
  assert.equal(contract.role.mayReplaceActiveMasterPlan, false);
  assert.equal(contract.authorizationBoundary.activePointerMutation, false);
  assert.equal(contract.authorizationBoundary.roadmapMutation, false);
  includesAll(decision, ["contract_version: \"1.0.8\"", "V13은 계속 답안길의 유일한 active master plan"], "decision");
  includesAll(strategy, ["version: \"1.0.8\"", "V13을 교체하지 않는다"], "strategy");
  assert.ok(benchmark.includes("contract version: `1.0.8`"));
  assert.ok(validation.includes("contract version: `1.0.8`"));
  assert.ok(validation.includes("24/24 passed"));
  assert.ok(validation.includes("1,256/1,256 passed"));
});

test("authorizes no runtime, content, commercial, dependency or Production mutation", () => {
  for (const key of [
    "runtime",
    "ui",
    "api",
    "schema",
    "migration",
    "rls",
    "storage",
    "persistence",
    "provider",
    "dependency",
    "environment",
    "deployment",
    "production",
    "realContent",
    "ownerActivation",
    "externalLearner",
    "commercial",
    "pricing",
    "payment",
    "firstStageActivation",
    "otherExamActivation",
  ]) {
    assert.equal(contract.authorizationBoundary[key], false, key);
  }
});

test("pins the exact learner-value sequence", () => {
  assert.deepEqual(contract.coreLoop, [
    "CAPTURE",
    "CONFIRMED_REVISION",
    "EXACT_ANSWER_ANCHOR",
    "SUCCESSFUL_OUTCOME_QUALIFIED_BIGGEST_GAP",
    "DIRECT_REPAIR",
    "SAME_SESSION_VERIFICATION",
    "D1_INDEPENDENT_RECONSTRUCTION",
    "D7_VERIFIED_NON_SAME_SURFACE_TRANSFER",
    "TIMED_RECURRENCE",
    "RECURRING_DEDUCTION_PROJECTION",
    "AUTOMATIC_ERROR_NOTE",
    "SAFE_LEARNING_GAP_AND_CONCEPT_STATE_SIGNALS",
    "EVIDENCE_DRIVEN_REPLAN",
  ]);
});

test("requires successful evidence, sealed transfer, timed recurrence and fail-closed Trust", () => {
  const x = contract.hardInvariants;
  assert.equal(x.exactAnchorRequiredForUsableGap, true);
  assert.equal(x.evaluationCompletionSufficientForPositiveEvidence, false);
  assert.equal(x.aiViewIsIndependentPerformance, false);
  assert.equal(x.sameItemOrSameSurfaceIsTransfer, false);
  assert.equal(x.verifiedNonSameSurfaceRequiredForD7, true);
  assert.equal(x.timedRecurrenceRequiredForClosure, true);
  assert.equal(x.laterIndependentFailureReopensClosure, true);
  assert.equal(x.practiceDeterministicConflictBlocksNumericRelease, true);
  assert.equal(x.lawSourceOrEffectiveVersionConflictBlocksVerifiedRelease, true);
  assert.equal(x.oneCanonicalMasteryAuthority, true);
});

test("commits append-only exposure before any help byte", () => {
  const x = contract.hardInvariants;
  const exposure = contract.assistanceExposureContract;
  assert.equal(x.helpOutputRequiresPriorExposureCommit, true);
  assert.equal(x.exposureCommitFailureBehavior, "ZERO_HELP_BYTES_NO_EVIDENCE");
  assert.equal(x.exposedAttemptMayReturnToUnseen, false);
  assert.equal(x.laterDistinctIndependentAttemptRequiredAfterExposure, true);
  assert.deepEqual(exposure, {
    authority: "TRUSTED_SERVER_APPEND_ONLY",
    commitBeforeOutput: true,
    coveredOutputKinds: [
      "HINT",
      "EXPLANATION",
      "WORKED_STEP",
      "PROBE",
      "FULL_SOLUTION",
    ],
    commitFailureBehavior: "ZERO_OUTPUT_NO_EVIDENCE",
    exposedMayBeRelabeledUnseen: false,
    laterDistinctIndependentAttemptRequired: true,
    clientOrModelMayAssertExposureState: false,
    lineageDiscriminator: "lineageMode",
    lineageModes: [
      {
        lineageMode: "attempt_first",
        attemptRef: {
          presence: "REQUIRED",
          nonEmpty: true,
          genuine: true,
          placeholderAllowed: false,
        },
        guidedOverrideConfirmationRef: {
          presence: "FORBIDDEN",
          value: null,
        },
        requiredBindings: [
          "LEARNER_SCOPE",
          "TUTOR_EPISODE",
          "ITEM_REVISION",
          "ATTEMPT",
        ],
      },
      {
        lineageMode: "confirmed_pre_attempt_guided_override",
        attemptRef: {
          presence: "EXPLICIT_NULL",
          value: null,
          placeholderAllowed: false,
        },
        guidedOverrideConfirmationRef: {
          presence: "REQUIRED",
          nonEmpty: true,
          trustedServerRecorded: true,
        },
        requiredBindings: [
          "LEARNER_SCOPE",
          "TUTOR_EPISODE",
          "ITEM_REVISION",
          "GUIDED_OVERRIDE_CONFIRMATION",
        ],
      },
    ],
  });
  includesAll(strategy, ["AssistanceExposureCommitV1", "output 0 byte"], "strategy exposure contract");
  assert.ok(validation.includes("Pre-help exposure"));
});

test("gates every generated full solution on canonical S215 release and prior exposure", () => {
  const x = contract.hardInvariants;
  const release = contract.generatedFullSolutionReleaseContract;
  const { canonicalResultBinding: _canonicalResultBinding, ...releaseWithoutCanonicalResultBinding } = release;
  assert.equal(x.generatedFullSolutionRequiresCanonicalS215Release, true);
  assert.equal(x.exposureAndS215ReleaseAreIndependentConjunctiveGates, true);
  assert.deepEqual(releaseWithoutCanonicalResultBinding, {
    s215Version: "s215.reference_answer_critic_consensus_release_gate.v1",
    appliesToGeneratedPaths: [
      "NORMAL_SCAFFOLD_FULL_SOLUTION",
      "CONFIRMED_GUIDED_OVERRIDE_FULL_SOLUTION",
      "SEMANTICALLY_COMPLETE_GENERATED_SOLUTION_ANY_LABEL",
    ],
    semanticRelabelBypassAllowed: false,
    learnerAuthoredTimedFullAnswerPhraseAloneClassifiedAsGeneratedFullSolution: false,
    requiredResult: {
      status: "released",
      sourceAnchorIntegrity: {
        status: "passed",
        fabricatedSourceAnchorIds: [],
        fabricatedEvidenceAnchorIds: [],
      },
      releaseDecision: {
        status: "released",
        learningReferenceStatus: "released_learning_reference",
        releaseGateStatus: "released",
        referenceAnswerReleaseAllowed: true,
        learnerFacingLearningReferenceAllowed: true,
        requiredCaveatKey: "learning_reference_not_official_answer",
        learningReferenceOnly: true,
        officialClaimAllowed: false,
        officialGradingClaimAllowed: false,
        officialModelAnswerClaimAllowed: false,
        confirmedScoreClaimAllowed: false,
        scorePredictionAllowed: false,
        passProbabilityAllowed: false,
        passGuaranteeAllowed: false,
      },
    },
    learnerVisibleDisclosures: [
      "OFFICIAL_SOURCE_STATUS",
      "CANONICAL_VERIFICATION_STATUS",
      "VERIFICATION_REPORT",
      "UNCERTAINTY_AND_ALTERNATIVES",
    ],
    releaseBlockerGate: {
      openBlockingReleaseBlockerCount: 0,
      unresolvedBlockingUncertaintyCount: 0,
      blockedCodes: [
        "legal_source_blocker",
        "calculation_blocker",
        "consensus_missing",
        "unresolved_consensus_conflict",
      ],
    },
    authority: {
      trustedResolverOwnsRelease: true,
      client: false,
      model: false,
      requestLabels: false,
      outerBooleans: false,
    },
    conjunctiveGates: {
      exposureCommitRequired: true,
      s215ReleasedDecisionRequired: true,
      oneMaySubstituteForOther: false,
    },
    failureBehavior: {
      generatedFullSolutionBytes: 0,
      positiveEvidence: 0,
      usageSuccess: 0,
    },
  });
  includesAll(
    strategy,
    [
      "GeneratedFullSolutionReleaseContractV1",
      "s215.reference_answer_critic_consensus_release_gate.v1",
      "learner-authored timed full-answer attempt",
    ],
    "strategy S215 full-solution gate",
  );
});

test("exact-binds generated solutions and disclosures to one canonical S215-S214-S207 package", () => {
  const binding = contract.generatedFullSolutionReleaseContract.canonicalResultBinding;
  const expectedBinding = {
    authority: "TRUSTED_SERVER_RESOLVER",
    releaseAuthority: "EXISTING_CANONICAL_S215_RESULT_ONLY",
    secondReleaseAuthorityCreated: false,
    canonicalChain: [
      "GENERATED_SOLUTION_RELEASE_CANDIDATE",
      "S215_GATE_INPUT",
      "S215_GATE_RESULT",
      "S214_PIPELINE_RESULT",
      "S214_SOURCE_PACK",
      "S214_S207_PREREQUISITE",
      "MATCHED_S207_REFERENCE_PACKAGE",
    ],
    resolution: {
      cardinality: "EXACTLY_ONE",
      failClosedStates: ["MISSING", "MULTIPLE", "AMBIGUOUS", "STALE", "FOREIGN", "MISMATCHED"],
    },
    identity: {
      tupleFields: ["gateId", "questionId", "s214PipelineId", "referencePackageId"],
      equality: "FIELD_FOR_FIELD_EXACT",
      fieldMappings: {
        gateId: ["generatedSolution.gateId", "s215GateInput.gateId", "s215Result.gateId"],
        questionId: [
          "generatedSolution.questionId",
          "s215GateInput.questionId",
          "s215Result.questionId",
          "s214Result.questionId",
          "s214Result.sourcePack.questionId",
          "matchedS207ReferencePackage.questionId",
        ],
        s214PipelineId: [
          "generatedSolution.s214PipelineId",
          "s215GateInput.s214PipelineId",
          "s215Result.s214PipelineId",
          "s214Result.pipelineId",
        ],
        referencePackageId: [
          "generatedSolution.referencePackageId",
          "s215GateInput.referencePackageId",
          "s215Result.referencePackageId",
          "s214Result.sourcePack.referencePackageId",
          "s214Result.releasePrerequisites.s207Package.referencePackageId",
          "matchedS207ReferencePackage.id",
        ],
      },
      subjectMappings: [
        "generatedSolution.subject",
        "s215GateInput.subject",
        "s215Result.subject",
        "s214Result.subject",
        "s214Result.sourcePack.subject",
        "matchedS207ReferencePackage.subject",
      ],
      subjectEquality: "FIELD_FOR_FIELD_EXACT",
    },
    currentS207ReleaseStateGate: {
      authority: "TRUSTED_SERVER_RESOLVER",
      source: "CURRENT_CANONICAL_S207_REGISTRY_AT_OUTPUT_AUTHORIZATION",
      cachedHistoricalOrEmbeddedStateAllowed: false,
      identityRef: "canonicalResultBinding.identity",
      resolutionCardinality: "EXACTLY_ONE",
      evaluation: {
        timing: "EACH_OUTPUT_AUTHORIZATION_IMMEDIATELY_BEFORE_FIRST_BYTE",
        priorSuccessfulEvaluationReusable: false,
        stateDriftBeforeFirstByteFailsClosed: true,
      },
      requiredCurrentState: {
        release: {
          status: "released",
        },
        openBlockingReleaseBlockerCount: 0,
        unresolvedBlockingUncertaintyCount: 0,
        downstreamUsage: {
          s214GenerationInput: true,
          s215ReleaseGateInput: true,
        },
      },
      vetoOnly: true,
      mayAuthorizeWithoutReleasedS215: false,
      oldReleasedS215ResultMaySubstitute: false,
      failureBehaviorRef: "generatedFullSolutionReleaseContract.failureBehavior",
    },
    requiredS215Result: {
      sourceAnchorIntegrity: {
        status: "passed",
        fabricatedSourceAnchorIds: [],
        fabricatedEvidenceAnchorIds: [],
      },
      canonicalSourceAnchorIdsArrayAssumed: false,
    },
    boundArtifacts: [
      {
        artifact: "GENERATED_FULL_SOLUTION",
        identity: "INHERIT_OR_CARRY_EXACT_TUPLE",
        sourceAnchorRefs: "NON_EMPTY_PACKAGE_QUALIFIED",
        evidenceAnchorRefs: "NON_EMPTY_PACKAGE_QUALIFIED",
      },
      {
        artifact: "OFFICIAL_SOURCE_STATUS",
        identity: "INHERIT_OR_CARRY_EXACT_TUPLE",
        sourceAnchorRefs: "NON_EMPTY_PACKAGE_QUALIFIED",
        evidenceAnchorRefs: "NON_EMPTY_PACKAGE_QUALIFIED",
      },
      {
        artifact: "CANONICAL_VERIFICATION_STATUS",
        identity: "INHERIT_OR_CARRY_EXACT_TUPLE",
        sourceAnchorRefs: "NON_EMPTY_PACKAGE_QUALIFIED",
        evidenceAnchorRefs: "NON_EMPTY_PACKAGE_QUALIFIED",
      },
      {
        artifact: "VERIFICATION_REPORT",
        identity: "INHERIT_OR_CARRY_EXACT_TUPLE",
        sourceAnchorRefs: "NON_EMPTY_PACKAGE_QUALIFIED",
        evidenceAnchorRefs: "NON_EMPTY_PACKAGE_QUALIFIED",
      },
      {
        artifact: "UNCERTAINTY_AND_ALTERNATIVES",
        identity: "INHERIT_OR_CARRY_EXACT_TUPLE",
        sourceAnchorRefs: "NON_EMPTY_PACKAGE_QUALIFIED",
        evidenceAnchorRefs: "NON_EMPTY_PACKAGE_QUALIFIED",
      },
    ],
    anchorResolution: {
      sourceAnchorRefTuple: ["referencePackageId", "questionId", "sourceAnchorId"],
      sourceAnchorTarget: "matchedS207ReferencePackage.sourceAnchors[].anchorId",
      evidenceAnchorRefTuple: ["referencePackageId", "questionId", "evidenceId"],
      evidenceAnchorTarget: "matchedS207ReferencePackage.evidenceAnchors[].evidenceId",
      pipelineSourcePackMembershipRequired: true,
      resolutionCardinality: "EXACTLY_ONE",
      linkedEvidenceSourceAnchorRefsResolveWithinSamePackage: true,
      globalUnqualifiedAnchorIdMatchAllowed: false,
      emptyRequiredAnchorRefsAllowed: false,
      entireCanonicalAnchorSetCitationRequired: false,
    },
    identityAuthority: {
      trustedServerResolver: true,
      client: false,
      model: false,
      requestLabels: false,
      disclosureStrings: false,
      outerBooleans: false,
    },
    rejectedConditions: [
      "CROSS_QUESTION_ANCHOR",
      "CROSS_PACKAGE_ANCHOR",
      "MIXED_PACKAGE_DISCLOSURE",
      "GLOBAL_UNQUALIFIED_ANCHOR_MATCH",
      "EMPTY_REQUIRED_ANCHORS",
      "UNRESOLVED_ANCHOR",
      "MULTIPLE_ANCHOR_MATCHES",
      "STALE_ANCHOR",
      "FABRICATED_ANCHOR",
      "DISCLOSURE_IDENTITY_MISMATCH",
    ],
    failureBehavior: {
      generatedFullSolutionBytes: 0,
      positiveEvidence: 0,
      usageSuccess: 0,
    },
  };
  assert.deepEqual(binding, expectedBinding);

  const identity = {
    gateId: "gate-practice-2026-q1",
    questionId: "question-practice-2026-q1",
    s214PipelineId: "pipeline-practice-2026-q1",
    referencePackageId: "package-practice-2026-q1",
    subject: "practice",
  };
  const sourceAnchorRef = {
    referencePackageId: identity.referencePackageId,
    questionId: identity.questionId,
    sourceAnchorId: "source-anchor-1",
  };
  const evidenceAnchorRef = {
    referencePackageId: identity.referencePackageId,
    questionId: identity.questionId,
    evidenceId: "evidence-anchor-1",
  };
  const artifact = (artifactName) => ({
    artifact: artifactName,
    ...identity,
    sourceAnchorRefs: [{ ...sourceAnchorRef }],
    evidenceAnchorRefs: [{ ...evidenceAnchorRef }],
  });
  const fixture = {
    generatedSolution: artifact("GENERATED_FULL_SOLUTION"),
    s215GateInputs: [{ ...identity }],
    s215Results: [{
      ...identity,
      status: "released",
      sourceAnchorIntegrity: {
        status: "passed",
        fabricatedSourceAnchorIds: [],
        fabricatedEvidenceAnchorIds: [],
      },
    }],
    s214Results: [{
      pipelineId: identity.s214PipelineId,
      questionId: identity.questionId,
      subject: identity.subject,
      sourcePack: {
        questionId: identity.questionId,
        subject: identity.subject,
        referencePackageId: identity.referencePackageId,
        sourceAnchorIds: [sourceAnchorRef.sourceAnchorId],
        evidenceAnchorIds: [evidenceAnchorRef.evidenceId],
      },
      releasePrerequisites: {
        s207Package: { referencePackageId: identity.referencePackageId },
      },
    }],
    s207Packages: [{
      id: identity.referencePackageId,
      questionId: identity.questionId,
      subject: identity.subject,
      sourceAnchors: [{
        anchorId: sourceAnchorRef.sourceAnchorId,
        questionId: identity.questionId,
      }],
      evidenceAnchors: [{
        evidenceId: evidenceAnchorRef.evidenceId,
        sourceAnchorIds: [sourceAnchorRef.sourceAnchorId],
      }],
    }],
    disclosures: expectedBinding.boundArtifacts.slice(1).map(({ artifact: artifactName }) => artifact(artifactName)),
  };
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const exactIdentity = (candidate, generated) => (
    expectedBinding.identity.tupleFields.every((field) => candidate[field] === generated[field])
  );
  const failClosed = () => ({ released: false, ...expectedBinding.failureBehavior });
  const evaluate = (candidate) => {
    const generated = candidate.generatedSolution;
    const s215Inputs = candidate.s215GateInputs.filter((entry) => exactIdentity(entry, generated));
    const s215Results = candidate.s215Results.filter((entry) => exactIdentity(entry, generated));
    const s214Results = candidate.s214Results.filter((entry) => (
      entry.pipelineId === generated.s214PipelineId
      && entry.questionId === generated.questionId
      && entry.sourcePack.questionId === generated.questionId
      && entry.sourcePack.referencePackageId === generated.referencePackageId
      && entry.releasePrerequisites.s207Package.referencePackageId === generated.referencePackageId
    ));
    const s207Packages = candidate.s207Packages.filter((entry) => (
      entry.id === generated.referencePackageId && entry.questionId === generated.questionId
    ));
    if ([s215Inputs, s215Results, s214Results, s207Packages].some((matches) => matches.length !== 1)) {
      return failClosed();
    }

    const [s215Input] = s215Inputs;
    const [s215Result] = s215Results;
    const [s214Result] = s214Results;
    const [s207Package] = s207Packages;
    const chain = [generated, s215Input, s215Result, s214Result, s214Result.sourcePack, s207Package];
    if (chain.some((entry) => entry.stale === true || entry.subject !== generated.subject)) return failClosed();
    if (s215Result.status !== "released") return failClosed();
    if (!Object.is(s215Result.sourceAnchorIntegrity.status, "passed")) return failClosed();
    if (s215Result.sourceAnchorIntegrity.fabricatedSourceAnchorIds.length !== 0) return failClosed();
    if (s215Result.sourceAnchorIntegrity.fabricatedEvidenceAnchorIds.length !== 0) return failClosed();

    const artifacts = [generated, ...candidate.disclosures];
    const requiredArtifacts = expectedBinding.boundArtifacts.map((entry) => entry.artifact);
    if (artifacts.length !== requiredArtifacts.length) return failClosed();
    if (artifacts.some((entry, index) => entry.artifact !== requiredArtifacts[index])) return failClosed();
    for (const entry of artifacts) {
      if (!exactIdentity(entry, generated) || entry.subject !== generated.subject || entry.stale === true) return failClosed();
      if (entry.sourceAnchorRefs.length === 0 || entry.evidenceAnchorRefs.length === 0) return failClosed();
      for (const ref of entry.sourceAnchorRefs) {
        if (ref.stale === true) return failClosed();
        if (ref.referencePackageId !== generated.referencePackageId || ref.questionId !== generated.questionId) {
          return failClosed();
        }
        if (s214Result.sourcePack.sourceAnchorIds.filter((id) => id === ref.sourceAnchorId).length !== 1) {
          return failClosed();
        }
        const resolved = s207Package.sourceAnchors.filter((anchor) => (
          anchor.anchorId === ref.sourceAnchorId && anchor.questionId === ref.questionId && anchor.stale !== true
        ));
        if (resolved.length !== 1) return failClosed();
      }
      for (const ref of entry.evidenceAnchorRefs) {
        if (ref.stale === true) return failClosed();
        if (ref.referencePackageId !== generated.referencePackageId || ref.questionId !== generated.questionId) {
          return failClosed();
        }
        if (s214Result.sourcePack.evidenceAnchorIds.filter((id) => id === ref.evidenceId).length !== 1) {
          return failClosed();
        }
        const resolved = s207Package.evidenceAnchors.filter((anchor) => (
          anchor.evidenceId === ref.evidenceId && anchor.stale !== true
        ));
        if (resolved.length !== 1 || resolved[0].sourceAnchorIds.length === 0) return failClosed();
        for (const linkedSourceAnchorId of resolved[0].sourceAnchorIds) {
          if (s214Result.sourcePack.sourceAnchorIds.filter((id) => id === linkedSourceAnchorId).length !== 1) {
            return failClosed();
          }
          const linked = s207Package.sourceAnchors.filter((anchor) => (
            anchor.anchorId === linkedSourceAnchorId
            && anchor.questionId === generated.questionId
            && anchor.stale !== true
          ));
          if (linked.length !== 1) return failClosed();
        }
      }
    }
    return { released: true };
  };

  assert.deepEqual(evaluate(fixture), { released: true });
  const nearMatches = [
    ["gateId", (value) => { value.s215Results[0].gateId = "foreign-gate"; }],
    ["questionId", (value) => { value.s215Results[0].questionId = "foreign-question"; }],
    ["s214PipelineId", (value) => { value.s215Results[0].s214PipelineId = "foreign-pipeline"; }],
    ["referencePackageId", (value) => { value.s215Results[0].referencePackageId = "foreign-package"; }],
    ["source anchor", (value) => { value.generatedSolution.sourceAnchorRefs[0].sourceAnchorId = "foreign-source"; }],
    ["verification/evidence anchor", (value) => {
      value.disclosures[2].evidenceAnchorRefs[0].evidenceId = "foreign-evidence";
    }],
    ["multiple canonical result", (value) => { value.s215Results.push(clone(value.s215Results[0])); }],
    ["mixed-package disclosure", (value) => { value.disclosures[0].referencePackageId = "foreign-package"; }],
    ["stale matched package", (value) => { value.s207Packages[0].stale = true; }],
  ];
  for (const [label, mutate] of nearMatches) {
    const nearMatch = clone(fixture);
    mutate(nearMatch);
    assert.deepEqual(evaluate(nearMatch), failClosed(), `${label} must fail closed`);
  }
});

test("requires the exact current S207 package to remain releasable at output authorization", () => {
  const gate = contract.generatedFullSolutionReleaseContract.canonicalResultBinding.currentS207ReleaseStateGate;
  const expectedGate = {
    authority: "TRUSTED_SERVER_RESOLVER",
    source: "CURRENT_CANONICAL_S207_REGISTRY_AT_OUTPUT_AUTHORIZATION",
    cachedHistoricalOrEmbeddedStateAllowed: false,
    identityRef: "canonicalResultBinding.identity",
    resolutionCardinality: "EXACTLY_ONE",
    evaluation: {
      timing: "EACH_OUTPUT_AUTHORIZATION_IMMEDIATELY_BEFORE_FIRST_BYTE",
      priorSuccessfulEvaluationReusable: false,
      stateDriftBeforeFirstByteFailsClosed: true,
    },
    requiredCurrentState: {
      release: {
        status: "released",
      },
      openBlockingReleaseBlockerCount: 0,
      unresolvedBlockingUncertaintyCount: 0,
      downstreamUsage: {
        s214GenerationInput: true,
        s215ReleaseGateInput: true,
      },
    },
    vetoOnly: true,
    mayAuthorizeWithoutReleasedS215: false,
    oldReleasedS215ResultMaySubstitute: false,
    failureBehaviorRef: "generatedFullSolutionReleaseContract.failureBehavior",
  };
  assert.deepEqual(gate, expectedGate);

  const identity = {
    gateId: "gate-practice-current-s207",
    questionId: "question-practice-current-s207",
    s214PipelineId: "pipeline-practice-current-s207",
    referencePackageId: "package-practice-current-s207",
    subject: "practice",
  };
  const currentReleasedPackage = () => ({
    id: identity.referencePackageId,
    questionId: identity.questionId,
    subject: identity.subject,
    release: {
      status: "released",
      releasedAt: "2026-08-10T00:00:00.000Z",
      requiredCaveatKey: "learning_reference_not_official_answer",
      noOfficialAnswerGuardrail: true,
      learnerFacingOfficialClaimAllowed: false,
      releaseRequiresNoOpenBlockers: true,
    },
    releaseBlockers: [],
    uncertainty: [],
    downstreamUsage: {
      s214GenerationInput: true,
      s215ReleaseGateInput: true,
      s211LawReviewInput: true,
      s212TheoryReviewInput: true,
      s213PracticeReviewInput: true,
    },
  });
  const fixture = {
    generatedSolution: { ...identity },
    exposureCommit: { status: "committed" },
    historicalS215Results: [{ ...identity, status: "released" }],
    currentS207RegistryAtOutputAuthorization: {
      source: expectedGate.source,
      packages: [currentReleasedPackage()],
    },
    currentS207RegistryImmediatelyBeforeFirstByte: {
      source: expectedGate.source,
      packages: [currentReleasedPackage()],
    },
    historicalOrEmbeddedS207Packages: [currentReleasedPackage()],
  };
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const zeroOutcomes = contract.generatedFullSolutionReleaseContract.failureBehavior;
  const exactS215Identity = (candidate, generated) => (
    contract.generatedFullSolutionReleaseContract.canonicalResultBinding.identity.tupleFields
      .every((field) => candidate[field] === generated[field])
    && candidate.subject === generated.subject
  );
  const idPattern = /^[a-z0-9][a-z0-9_-]{2,180}$/;
  const isoInstantPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
  const releaseStatuses = [
    "draft",
    "blocked",
    "cross_checked",
    "source_verified",
    "subject_validated",
    "ready_for_s215",
    "released",
  ];
  const releaseBlockerKinds = [
    "rights",
    "problem_text",
    "source_anchor",
    "legal_source",
    "calculation",
    "theory_validation",
    "subject_validation",
    "unresolved_consensus",
    "prohibited_claim",
    "data_boundary",
    "unsupported_subject",
  ];
  const requiredResolvers = [
    "s208",
    "s209",
    "s210",
    "s214",
    "s215",
    "human_decision",
    "s207_validator",
  ];
  const uncertaintyKinds = [
    "source_uncertainty",
    "rights_uncertainty",
    "problem_text_uncertainty",
    "calculation_uncertainty",
    "legal_version_uncertainty",
    "theory_term_uncertainty",
    "consensus_conflict",
    "subject_validator_gap",
  ];
  const requireRecord = (value, label) => {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError(`${label} must be an object`);
    }
    return value;
  };
  const requireId = (value, label) => {
    if (typeof value !== "string" || !idPattern.test(value)) {
      throw new TypeError(`${label} must be a canonical id`);
    }
    return value;
  };
  const requireString = (value, label) => {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new TypeError(`${label} must be a non-empty string`);
    }
    return value;
  };
  const requireEnum = (value, allowed, label) => {
    if (!allowed.includes(value)) throw new TypeError(`${label} has an unsupported value`);
    return value;
  };
  const requireBoolean = (value, label) => {
    if (typeof value !== "boolean") throw new TypeError(`${label} must be boolean`);
    return value;
  };
  const requireIdArray = (value, label) => {
    if (!Array.isArray(value)) throw new TypeError(`${label} must be an array`);
    value.forEach((entry, index) => requireId(entry, `${label}[${index}]`));
    return value;
  };
  const requireUniqueIds = (values, label) => {
    if (new Set(values).size !== values.length) throw new TypeError(`${label} ids must be unique`);
  };
  const validateReleaseBlockerProjection = (value, index, packageLabel) => {
    const label = `${packageLabel}.releaseBlockers[${index}]`;
    const blocker = requireRecord(value, label);
    requireId(blocker.blockerId, `${label}.blockerId`);
    requireEnum(blocker.kind, releaseBlockerKinds, `${label}.kind`);
    requireEnum(blocker.status, ["open", "resolved"], `${label}.status`);
    requireEnum(blocker.severity, ["blocking", "warning"], `${label}.severity`);
    requireString(blocker.summary, `${label}.summary`);
    requireEnum(blocker.requiredResolver, requiredResolvers, `${label}.requiredResolver`);
    requireIdArray(blocker.sourceAnchorIds, `${label}.sourceAnchorIds`);
    requireIdArray(blocker.evidenceAnchorIds, `${label}.evidenceAnchorIds`);
    return blocker;
  };
  const validateUncertaintyProjection = (value, index, packageLabel) => {
    const label = `${packageLabel}.uncertainty[${index}]`;
    const uncertainty = requireRecord(value, label);
    requireId(uncertainty.uncertaintyId, `${label}.uncertaintyId`);
    requireEnum(uncertainty.kind, uncertaintyKinds, `${label}.kind`);
    requireEnum(uncertainty.severity, ["low", "medium", "high", "blocking"], `${label}.severity`);
    requireString(uncertainty.summary, `${label}.summary`);
    requireEnum(
      uncertainty.resolutionStatus,
      ["open", "resolved", "accepted_as_alternative", "blocked"],
      `${label}.resolutionStatus`,
    );
    requireBoolean(uncertainty.releaseBlocking, `${label}.releaseBlocking`);
    requireIdArray(uncertainty.sourceAnchorIds, `${label}.sourceAnchorIds`);
    requireIdArray(uncertainty.evidenceAnchorIds, `${label}.evidenceAnchorIds`);
    return uncertainty;
  };
  const validateCurrentS207PackageProjection = (value, index) => {
    const label = `currentS207Registry.packages[${index}]`;
    const pkg = requireRecord(value, label);
    requireId(pkg.id, `${label}.id`);
    requireId(pkg.questionId, `${label}.questionId`);
    requireEnum(pkg.subject, ["practice", "theory", "law"], `${label}.subject`);
    if (pkg.stale !== undefined) requireBoolean(pkg.stale, `${label}.stale`);

    const release = requireRecord(pkg.release, `${label}.release`);
    const releaseStatus = requireEnum(release.status, releaseStatuses, `${label}.release.status`);
    if (release.releasedAt !== undefined) {
      if (typeof release.releasedAt !== "string" || !isoInstantPattern.test(release.releasedAt)) {
        throw new TypeError(`${label}.release.releasedAt must be a deterministic ISO instant`);
      }
    }
    if (releaseStatus === "released" && release.releasedAt === undefined) {
      throw new TypeError(`${label}.release.releasedAt is required for released packages`);
    }
    requireEnum(
      release.requiredCaveatKey,
      ["learning_reference_not_official_answer"],
      `${label}.release.requiredCaveatKey`,
    );
    if (release.noOfficialAnswerGuardrail !== true) {
      throw new TypeError(`${label}.release.noOfficialAnswerGuardrail must be true`);
    }
    if (release.learnerFacingOfficialClaimAllowed !== false) {
      throw new TypeError(`${label}.release.learnerFacingOfficialClaimAllowed must be false`);
    }
    if (release.releaseRequiresNoOpenBlockers !== true) {
      throw new TypeError(`${label}.release.releaseRequiresNoOpenBlockers must be true`);
    }

    if (!Array.isArray(pkg.releaseBlockers)) throw new TypeError(`${label}.releaseBlockers must be an array`);
    if (!Array.isArray(pkg.uncertainty)) throw new TypeError(`${label}.uncertainty must be an array`);
    const releaseBlockers = pkg.releaseBlockers.map((entry, blockerIndex) => (
      validateReleaseBlockerProjection(entry, blockerIndex, label)
    ));
    const uncertainty = pkg.uncertainty.map((entry, uncertaintyIndex) => (
      validateUncertaintyProjection(entry, uncertaintyIndex, label)
    ));
    requireUniqueIds(releaseBlockers.map((entry) => entry.blockerId), `${label}.releaseBlockers`);
    requireUniqueIds(uncertainty.map((entry) => entry.uncertaintyId), `${label}.uncertainty`);

    const downstreamUsage = requireRecord(pkg.downstreamUsage, `${label}.downstreamUsage`);
    for (const field of [
      "s214GenerationInput",
      "s215ReleaseGateInput",
      "s211LawReviewInput",
      "s212TheoryReviewInput",
      "s213PracticeReviewInput",
    ]) {
      requireBoolean(downstreamUsage[field], `${label}.downstreamUsage.${field}`);
    }
    return pkg;
  };
  const validateCurrentS207RegistryProjection = (value) => {
    const registry = requireRecord(value, "currentS207Registry");
    if (registry.source !== expectedGate.source) throw new TypeError("currentS207Registry.source is invalid");
    if (!Array.isArray(registry.packages)) throw new TypeError("currentS207Registry.packages must be an array");
    registry.packages.forEach((entry, index) => validateCurrentS207PackageProjection(entry, index));
    return registry;
  };
  const releaseBlocker = (overrides = {}) => ({
    blockerId: "blocker-current-s207",
    kind: "calculation",
    status: "open",
    severity: "blocking",
    summary: "Synthetic metadata-only blocker",
    requiredResolver: "s207_validator",
    sourceAnchorIds: [],
    evidenceAnchorIds: [],
    ...overrides,
  });
  const currentUncertainty = (overrides = {}) => ({
    uncertaintyId: "uncertainty-current-s207",
    kind: "calculation_uncertainty",
    severity: "blocking",
    summary: "Synthetic metadata-only uncertainty",
    resolutionStatus: "open",
    releaseBlocking: true,
    sourceAnchorIds: [],
    evidenceAnchorIds: [],
    ...overrides,
  });
  const addUnrelatedPackageWithoutReleasedAtToBothReads = (candidate, status) => {
    for (const registry of [
      candidate.currentS207RegistryAtOutputAuthorization,
      candidate.currentS207RegistryImmediatelyBeforeFirstByte,
    ]) {
      const pkg = currentReleasedPackage();
      pkg.id = `package-unrelated-${status}`;
      pkg.questionId = `question-unrelated-${status}`;
      pkg.release.status = status;
      delete pkg.release.releasedAt;
      if (status === "blocked") {
        pkg.releaseBlockers.push(releaseBlocker({
          blockerId: "blocker-unrelated-blocked",
        }));
      }
      registry.packages.push(pkg);
    }
  };
  const resolveEligibleCurrentPackage = (registry, generated) => {
    try {
      const currentRegistry = validateCurrentS207RegistryProjection(registry);
      const matches = currentRegistry.packages.filter((entry) => (
        entry.id === generated.referencePackageId
        && entry.questionId === generated.questionId
        && entry.subject === generated.subject
      ));
      if (matches.length !== 1) return null;
      const [matched] = matches;
      if (matched.stale === true || matched.release.status !== "released") return null;
      const openBlockingReleaseBlockerCount = matched.releaseBlockers.filter((blocker) => (
        blocker.status === "open" && blocker.severity === "blocking"
      )).length;
      const unresolvedBlockingUncertaintyCount = matched.uncertainty.filter((uncertainty) => (
        uncertainty.releaseBlocking === true
        && !["resolved", "accepted_as_alternative"].includes(uncertainty.resolutionStatus)
      )).length;
      if (openBlockingReleaseBlockerCount !== 0 || unresolvedBlockingUncertaintyCount !== 0) return null;
      if (matched.downstreamUsage.s214GenerationInput !== true) return null;
      if (matched.downstreamUsage.s215ReleaseGateInput !== true) return null;
      return matched;
    } catch {
      return null;
    }
  };
  const evaluate = (candidate) => {
    const generated = candidate.generatedSolution;
    const releasedS215Results = candidate.historicalS215Results.filter((result) => (
      result.status === "released" && exactS215Identity(result, generated)
    ));
    if (candidate.exposureCommit?.status !== "committed" || releasedS215Results.length !== 1) {
      return zeroOutcomes;
    }
    const currentReads = [
      candidate.currentS207RegistryAtOutputAuthorization,
      candidate.currentS207RegistryImmediatelyBeforeFirstByte,
    ];
    if (currentReads.some((registry) => resolveEligibleCurrentPackage(registry, generated) === null)) {
      return zeroOutcomes;
    }
    return { authorizedByAllIndependentConjuncts: true };
  };
  const mutateBothCurrentReads = (candidate, mutate) => {
    mutate(candidate.currentS207RegistryAtOutputAuthorization.packages[0]);
    mutate(candidate.currentS207RegistryImmediatelyBeforeFirstByte.packages[0]);
  };

  assert.deepEqual(evaluate(fixture), { authorizedByAllIndependentConjuncts: true });

  const nonReleasedStatuses = [
    "draft",
    "blocked",
    "cross_checked",
    "source_verified",
    "subject_validated",
    "ready_for_s215",
  ];
  const negativeMutations = nonReleasedStatuses.map((status) => [
    `current release status ${status}`,
    (value) => mutateBothCurrentReads(value, (pkg) => {
      pkg.release.status = status;
      if (["draft", "blocked"].includes(status)) delete pkg.release.releasedAt;
      if (status === "blocked") {
        pkg.releaseBlockers.push(releaseBlocker({ blockerId: "blocker-matched-blocked" }));
      }
    }),
  ]);
  negativeMutations.push(
    ["open blocking release blocker", (value) => mutateBothCurrentReads(value, (pkg) => {
      pkg.releaseBlockers.push(releaseBlocker());
    })],
    ["open release-blocking uncertainty", (value) => mutateBothCurrentReads(value, (pkg) => {
      pkg.uncertainty.push(currentUncertainty());
    })],
    ["blocked release-blocking uncertainty", (value) => mutateBothCurrentReads(value, (pkg) => {
      pkg.uncertainty.push(currentUncertainty({ resolutionStatus: "blocked" }));
    })],
    ["exact released package missing releasedAt", (value) => mutateBothCurrentReads(value, (pkg) => {
      delete pkg.release.releasedAt;
    })],
    ["exact released package with malformed releasedAt", (value) => mutateBothCurrentReads(value, (pkg) => {
      pkg.release.releasedAt = "2026-08-10T00:00:00Z";
    })],
    ["exact released package with non-string releasedAt", (value) => mutateBothCurrentReads(value, (pkg) => {
      pkg.release.releasedAt = 1723248000000;
    })],
    ["unrelated released package missing releasedAt", (value) => {
      addUnrelatedPackageWithoutReleasedAtToBothReads(value, "released");
    }],
    ["open blocker with unsupported severity", (value) => mutateBothCurrentReads(value, (pkg) => {
      pkg.releaseBlockers.push(releaseBlocker({ severity: "blockng" }));
    })],
    ["blocker with missing status", (value) => mutateBothCurrentReads(value, (pkg) => {
      const blocker = releaseBlocker();
      delete blocker.status;
      pkg.releaseBlockers.push(blocker);
    })],
    ["blocker with unsupported status", (value) => mutateBothCurrentReads(value, (pkg) => {
      pkg.releaseBlockers.push(releaseBlocker({ status: "pending" }));
    })],
    ["uncertainty with missing releaseBlocking", (value) => mutateBothCurrentReads(value, (pkg) => {
      const uncertainty = currentUncertainty();
      delete uncertainty.releaseBlocking;
      pkg.uncertainty.push(uncertainty);
    })],
    ["uncertainty with non-boolean releaseBlocking", (value) => mutateBothCurrentReads(value, (pkg) => {
      pkg.uncertainty.push(currentUncertainty({ releaseBlocking: "true" }));
    })],
    ["uncertainty with missing resolutionStatus", (value) => mutateBothCurrentReads(value, (pkg) => {
      const uncertainty = currentUncertainty();
      delete uncertainty.resolutionStatus;
      pkg.uncertainty.push(uncertainty);
    })],
    ["uncertainty with unsupported resolutionStatus", (value) => mutateBothCurrentReads(value, (pkg) => {
      pkg.uncertainty.push(currentUncertainty({ resolutionStatus: "accepted" }));
    })],
    ["malformed entry only before first byte", (value) => {
      value.currentS207RegistryImmediatelyBeforeFirstByte.packages[0].releaseBlockers.push(null);
    }],
    ["S214 downstream use disabled", (value) => mutateBothCurrentReads(value, (pkg) => {
      pkg.downstreamUsage.s214GenerationInput = false;
    })],
    ["S215 downstream use disabled", (value) => mutateBothCurrentReads(value, (pkg) => {
      pkg.downstreamUsage.s215ReleaseGateInput = false;
    })],
    ["missing current package", (value) => {
      value.currentS207RegistryAtOutputAuthorization.packages = [];
    }],
    ["duplicate current package", (value) => {
      value.currentS207RegistryAtOutputAuthorization.packages.push(
        clone(value.currentS207RegistryAtOutputAuthorization.packages[0]),
      );
    }],
    ["invalid current package", (value) => {
      delete value.currentS207RegistryAtOutputAuthorization.packages[0].downstreamUsage;
    }],
    ["malformed unmatched package", (value) => {
      const foreignPackage = currentReleasedPackage();
      foreignPackage.id = "foreign-package";
      foreignPackage.releaseBlockers.push(releaseBlocker({ severity: "blockng" }));
      value.currentS207RegistryAtOutputAuthorization.packages.push(foreignPackage);
    }],
    ["foreign current package", (value) => {
      value.currentS207RegistryAtOutputAuthorization.packages[0].id = "foreign-package";
    }],
    ["historical or cached release while current canonical package is blocked", (value) => {
      mutateBothCurrentReads(value, (pkg) => { pkg.release.status = "blocked"; });
      value.historicalOrEmbeddedS207Packages[0].release.status = "released";
    }],
    ["current-state drift before first generated byte", (value) => {
      value.currentS207RegistryImmediatelyBeforeFirstByte.packages[0].release.status = "blocked";
    }],
  );
  for (const [label, mutate] of negativeMutations) {
    const candidate = clone(fixture);
    mutate(candidate);
    assert.deepEqual(evaluate(candidate), zeroOutcomes, `${label} must yield exact zero outcomes`);
  }

  const positiveControls = [
    ["unrelated valid draft package without releasedAt", (value) => {
      addUnrelatedPackageWithoutReleasedAtToBothReads(value, "draft");
    }],
    ["unrelated valid blocked package without releasedAt", (value) => {
      addUnrelatedPackageWithoutReleasedAtToBothReads(value, "blocked");
    }],
    ["resolved blocker", (value) => mutateBothCurrentReads(value, (pkg) => {
      pkg.releaseBlockers.push(releaseBlocker({ status: "resolved" }));
    })],
    ["open warning-only blocker", (value) => mutateBothCurrentReads(value, (pkg) => {
      pkg.releaseBlockers.push(releaseBlocker({ severity: "warning" }));
    })],
    ["resolved uncertainty", (value) => mutateBothCurrentReads(value, (pkg) => {
      pkg.uncertainty.push(currentUncertainty({ resolutionStatus: "resolved" }));
    })],
    ["accepted alternative uncertainty", (value) => mutateBothCurrentReads(value, (pkg) => {
      pkg.uncertainty.push(currentUncertainty({ resolutionStatus: "accepted_as_alternative" }));
    })],
  ];
  for (const [label, mutate] of positiveControls) {
    const candidate = clone(fixture);
    mutate(candidate);
    assert.deepEqual(
      evaluate(candidate),
      { authorizedByAllIndependentConjuncts: true },
      `${label} must retain its canonical nonblocking meaning`,
    );
  }
});

test("requires exact ready S216 and S217 outputs before review completion and replan", () => {
  const x = contract.hardInvariants;
  const completion = contract.reviewCompletionContract;
  assert.equal(x.reviewCompletionRequiresSafeLearningGapS216AndS217, true);
  assert.equal(x.reviewCompletionChangesMastery, false);
  assert.deepEqual(completion, {
    s216Version: "s216.error_notebook_gap_taxonomy.v1",
    s217Version: "s217.personal_core_concept_graph.v1",
    authority: "TRUSTED_SERVER_RESOLVER",
    requiredOutputs: [
      "SAFE_LEARNING_GAP_SIGNAL",
      "S216_AUTOMATIC_ERROR_NOTE_READY",
      "S217_CONCEPT_STATE_GRAPH_READY",
    ],
    s216AutomaticErrorNote: {
      status: "ready",
      requiredMetadata: [
        "WHY_WRONG",
        "CORRECT_PRINCIPLE",
        "IMMEDIATE_FIX",
        "RECURRENCE",
        "NEXT_REVIEW",
      ],
    },
    s217ConceptStateResult: {
      status: "ready",
      canonicalStates: [
        "unknown",
        "exposed",
        "confused",
        "wrong",
        "recurring",
        "recovering",
        "stable",
        "at-risk",
      ],
    },
    exactBinding: {
      cardinality: "EXACTLY_ONE_CHAIN",
      fields: [
        "LEARNER_SCOPE",
        "SOURCE_REVIEW",
        "ANSWER_SUBMISSION_AND_EVIDENCE",
        "S216_ENTRY",
        "S217_GRAPH",
        "S217_SOURCE_REFERENCE_TO_EXACT_S216_ENTRY",
      ],
      s217SourceReferenceToExactS216EntryRequired: true,
      unrelatedAmbiguousStaleOrCrossReviewArtifactAccepted: false,
    },
    dataBoundary: {
      metadataOnly: true,
      rawLearnerContentAllowed: false,
    },
    replan: {
      requiresResolvedOutputRefs: true,
      requiredRefs: [
        "SAFE_LEARNING_GAP_SIGNAL_REF",
        "S216_AUTOMATIC_ERROR_NOTE_REF",
        "S217_CONCEPT_STATE_GRAPH_REF",
      ],
    },
    failClosed: {
      on: ["MISSING", "UNSAFE", "STALE", "AMBIGUOUS", "WITHHELD"],
      preserve: ["SAFE_BLOCKER", "SAFE_REASON", "SAFE_NEXT_ACTION"],
      reviewCompleted: false,
      readyErrorNoteEmitted: false,
      readyConceptStateEmitted: false,
      outerCompletionBooleanMaySubstitute: false,
    },
    completionEffects: {
      positiveEvidenceAwarded: false,
      masteryChanged: false,
      gapClosed: false,
      learningPrioritySet: false,
      secondMasteryAuthorityCreated: false,
    },
    clientModelRequestOrOuterClaimsMayComplete: false,
  });
  assert.deepEqual(contract.coreLoop.slice(-5), [
    "TIMED_RECURRENCE",
    "RECURRING_DEDUCTION_PROJECTION",
    "AUTOMATIC_ERROR_NOTE",
    "SAFE_LEARNING_GAP_AND_CONCEPT_STATE_SIGNALS",
    "EVIDENCE_DRIVEN_REPLAN",
  ]);
});

test("preserves the confirmed guided override without fabricating an attempt", () => {
  const x = contract.hardInvariants;
  const override = contract.guidedRevealOverrideContract;
  assert.equal(x.guidedOverrideMayFabricateAttempt, false);
  assert.equal(x.guidedOverrideIsIndependentEvidence, false);
  assert.deepEqual(contract.defaultAttemptFirstPath, [
    "ORIENT",
    "COMMIT",
    "ATTEMPT",
    "DIAGNOSE",
    "SCAFFOLD",
    "RECONSTRUCT",
    "REPAIR",
    "VERIFY",
    "CONTRAST",
    "TRANSFER",
    "TIMED_RECURRENCE",
    "SCHEDULE",
  ]);
  assert.deepEqual(contract.assistanceExposureContract.lineageModes, [
    {
      lineageMode: "attempt_first",
      attemptRef: {
        presence: "REQUIRED",
        nonEmpty: true,
        genuine: true,
        placeholderAllowed: false,
      },
      guidedOverrideConfirmationRef: { presence: "FORBIDDEN", value: null },
      requiredBindings: ["LEARNER_SCOPE", "TUTOR_EPISODE", "ITEM_REVISION", "ATTEMPT"],
    },
    {
      lineageMode: "confirmed_pre_attempt_guided_override",
      attemptRef: { presence: "EXPLICIT_NULL", value: null, placeholderAllowed: false },
      guidedOverrideConfirmationRef: {
        presence: "REQUIRED",
        nonEmpty: true,
        trustedServerRecorded: true,
      },
      requiredBindings: [
        "LEARNER_SCOPE",
        "TUTOR_EPISODE",
        "ITEM_REVISION",
        "GUIDED_OVERRIDE_CONFIRMATION",
      ],
    },
  ]);
  assert.deepEqual(override, {
    mode: "confirmed_pre_attempt_guided_override",
    defaultMode: "attempt_first",
    deliberateLearnerRequestRequired: true,
    trustedServerConfirmationRequired: true,
    confirmationIsExposureCommit: false,
    path: [
      "ORIENT",
      "CONFIRM_GUIDED_REVEAL_OVERRIDE",
      "COMMIT_ASSISTANCE_EXPOSURE",
      "GUIDED_STUDY",
      "RECONSTRUCT",
      "REPAIR",
      "VERIFY",
      "SCHEDULE_LATER_DISTINCT_INDEPENDENT_REVIEW",
      "GUIDED_EXIT",
    ],
    attemptStepPresent: false,
    emptyPlaceholderOrSyntheticAttemptAllowed: false,
    exposureCommitBeforeFirstHelpByte: true,
    commitFailure: {
      helpBytes: 0,
      positiveEvidence: 0,
      usageSuccess: 0,
      episodeState: "BLOCKED",
    },
    bypassSurfaces: ["RETRY", "DIRECT_ENDPOINT", "CACHE", "PREFETCH", "MULTI_TAB"],
    permanentQualification: {
      assistanceState: "ASSISTED",
      exposureState: "EXPOSED",
      learningOnly: true,
      mayRelabelUnseen: false,
      mayRelabelIndependent: false,
    },
    cannotEstablish: ["STABLE_MASTERY", "D1", "D7", "TRANSFER", "CLOSURE"],
    laterIndependentReview: {
      mode: "attempt_first",
      distinct: true,
      durableScheduleRequiredBefore: "GUIDED_EXIT",
      scheduleFailure: "BLOCK_GUIDED_COMPLETION",
      committedExposureLineageRetained: true,
    },
    generatedFullSolutionReleaseContractRef: "generatedFullSolutionReleaseContract",
  });
  assert.equal(override.path.includes("ATTEMPT"), false);
});

test("enforces the complete canonical tutor state and transition machine", () => {
  const transitionContract = contract.tutorTransitionContract;
  assert.equal(transitionContract.authority, "CANONICAL_MACHINE_READABLE_TRANSITION_AUTHORITY");
  assert.equal(transitionContract.stateEnumRef, "tutorStateMachine");
  assert.equal(tutorDefinitionErrors().length, 0);

  for (const path of [contract.defaultAttemptFirstPath, contract.guidedRevealOverrideContract.path]) {
    for (let index = 0; index < path.length - 1; index += 1) {
      const result = evaluateTutorTransition(path[index], path[index + 1], {
        SUCCESSFUL_APPEND_ONLY_ASSISTANCE_EXPOSURE_COMMIT: true,
        DURABLE_LATER_DISTINCT_ATTEMPT_FIRST_REVIEW_SCHEDULE: true,
      });
      assert.equal(result.accepted, true, `${path[index]}->${path[index + 1]}`);
      assert.equal(result.stateAdvance, true, `${path[index]}->${path[index + 1]}`);
    }
  }
  assert.equal(evaluateTutorTransition("INTAKE", "ORIENT").accepted, true);
  assert.equal(evaluateTutorTransition("SCHEDULE", "COMPLETED").accepted, true);

  const missingGuidedState = contract.tutorStateMachine.filter(
    (state) => state !== "GUIDED_STUDY",
  );
  assert.ok(tutorDefinitionErrors({ states: missingGuidedState }).length > 0);

  const missingAdjacentTransition = clone(transitionContract);
  missingAdjacentTransition.normalTransitions = missingAdjacentTransition.normalTransitions.filter(
    ({ from, to }) => !(from === "VERIFY" && to === "SCHEDULE_LATER_DISTINCT_INDEPENDENT_REVIEW"),
  );
  assert.ok(tutorDefinitionErrors({ transitionContract: missingAdjacentTransition }).length > 0);

  const externalEndpoint = clone(transitionContract);
  externalEndpoint.normalTransitions[0].to = "UNDECLARED_STATE";
  assert.ok(tutorDefinitionErrors({ transitionContract: externalEndpoint }).length > 0);

  const broadenedNormalPath = clone(transitionContract);
  broadenedNormalPath.normalTransitions.push({
    from: "ATTEMPT",
    to: "TRANSFER",
    paths: ["UNDECLARED_SHORTCUT"],
  });
  assert.ok(tutorDefinitionErrors({ transitionContract: broadenedNormalPath }).length > 0);

  const guidedWithAttempt = [...contract.guidedRevealOverrideContract.path];
  guidedWithAttempt.splice(3, 0, "ATTEMPT");
  assert.ok(tutorDefinitionErrors({ guidedPath: guidedWithAttempt }).length > 0);

  assert.deepEqual(
    evaluateTutorTransition("ORIENT", "GUIDED_STUDY", {
      SUCCESSFUL_APPEND_ONLY_ASSISTANCE_EXPOSURE_COMMIT: true,
    }),
    rejectedTutorTransition,
  );
  assert.deepEqual(
    evaluateTutorTransition("CONFIRM_GUIDED_REVEAL_OVERRIDE", "GUIDED_STUDY", {
      SUCCESSFUL_APPEND_ONLY_ASSISTANCE_EXPOSURE_COMMIT: true,
    }),
    rejectedTutorTransition,
  );
  assert.deepEqual(
    evaluateTutorTransition("COMMIT_ASSISTANCE_EXPOSURE", "GUIDED_STUDY"),
    rejectedTutorTransition,
  );
  assert.equal(
    evaluateTutorTransition("COMMIT_ASSISTANCE_EXPOSURE", "BLOCKED", {
      ASSISTANCE_EXPOSURE_COMMIT_FAILED: true,
    }).accepted,
    true,
  );
  assert.deepEqual(
    evaluateTutorTransition("SCHEDULE_LATER_DISTINCT_INDEPENDENT_REVIEW", "GUIDED_EXIT"),
    rejectedTutorTransition,
  );
  assert.equal(
    evaluateTutorTransition("SCHEDULE_LATER_DISTINCT_INDEPENDENT_REVIEW", "BLOCKED", {
      DURABLE_LATER_DISTINCT_INDEPENDENT_REVIEW_SCHEDULE_FAILED: true,
    }).accepted,
    true,
  );
  assert.deepEqual(
    evaluateTutorTransition("COMPLETED", "STALE"),
    rejectedTutorTransition,
  );
  assert.equal(
    evaluateTutorTransition("COMPLETED", "STALE", {
      CURRENT_BASIS_OR_CONFIGURATION_INVALID: true,
    }).accepted,
    true,
  );
});

test("binds D+1 to the frozen D0 configuration and restarts on mismatch", () => {
  const x = contract.hardInvariants;
  const frozen = contract.frozenD0Configuration;
  assert.equal(x.d1RequiresFrozenD0Configuration, true);
  assert.equal(x.incompatibleD0D1ConfigurationBehavior, "STALE_RESTART_D0");
  assert.equal(x.securityRepairMaySilentlyPreserveD0Evidence, false);
  assert.deepEqual(frozen.requiredBindings, [
    "PROBLEM_REVISION",
    "SOURCE_VERSION",
    "MODEL_VERSION",
    "PROMPT_VERSION",
    "RUBRIC_VERSION",
    "VALIDATOR_VERSION",
    "FULL_DAY_POLICY_VERSION",
    "NOTEBOOK_SCHEMA_VERSION",
    "TUTOR_POLICY_VERSION",
    "ASSISTANCE_POLICY_VERSION",
    "MEASUREMENT_POLICY_VERSION",
    "ITEM_RELEASE_ARTIFACT",
  ]);
  assert.equal(frozen.onMismatch, "STALE_RESTART_D0");
  assert.equal(frozen.securityRepairBehavior, "INVALIDATE_AND_RESTART");
  assert.equal(frozen.silentEvidenceCarryForwardAllowed, false);
  includesAll(strategy, ["FrozenD0ConfigurationSnapshotV1", "D0부터 restart"], "strategy frozen D0 contract");
  assert.ok(validation.includes("Frozen D0"));
});

test("enforces every structured D+7 conjunct with a one-conjunct hostile matrix", () => {
  const gate = contract.d7EligibilityContract;
  const context = {
    resolutionAuthority: "TRUSTED_SERVER_RESOLVER",
    trustedServerResolved: true,
    requestSupplied: false,
    clientSupplied: false,
    modelSupplied: false,
    learnerScopeRef: "learner-scope-1",
    closureCaseRef: "closure-case-1",
    sourceIdentityRef: "source-identity-1",
    effectiveVersionRef: "effective-version-1",
    sourceItemRevisionRef: "item-revision-source",
    sourceItemFamilyRef: "item-family-source",
    targetSkillRefs: ["skill-a", "skill-b"],
  };
  const currentArtifact = (ref) => ({
    ref,
    authority: "TRUSTED_SERVER_RESOLVER",
    current: true,
    stale: false,
    ambiguous: false,
    itemRevisionRef: "item-revision-candidate",
    sourceIdentityRef: context.sourceIdentityRef,
    effectiveVersionRef: context.effectiveVersionRef,
  });
  const eligible = {
    bindings: {
      learnerScopeRef: context.learnerScopeRef,
      closureCaseRef: context.closureCaseRef,
    },
    candidate: {
      itemRevisionRef: "item-revision-candidate",
      targetSkillRefs: [...context.targetSkillRefs],
    },
    rights: {
      decisionRef: "rights-decision-1",
      authority: "TRUSTED_SERVER_RESOLVER",
      decision: "AUTHORIZED",
      use: "D7_TRANSFER_ACCEPTANCE",
      current: true,
      resolvedFreshAtAcceptance: true,
      stale: false,
      ambiguous: false,
      learnerScopeRef: context.learnerScopeRef,
      closureCaseRef: context.closureCaseRef,
      itemRevisionRef: "item-revision-candidate",
      sourceIdentityRef: context.sourceIdentityRef,
      effectiveVersionRef: context.effectiveVersionRef,
    },
    source: {
      resolutionRef: "source-resolution-1",
      authority: "TRUSTED_SERVER_RESOLVER",
      current: true,
      resolvedFreshAtAcceptance: true,
      stale: false,
      ambiguous: false,
      identityRef: context.sourceIdentityRef,
      effectiveVersionRef: context.effectiveVersionRef,
      itemRevisionRef: "item-revision-candidate",
    },
    surface: {
      verificationRef: "surface-verification-1",
      authority: "TRUSTED_SERVER_VERIFIER",
      current: true,
      stale: false,
      ambiguous: false,
      verified: true,
      nonSameSurface: true,
      itemRevisionRef: "item-revision-candidate",
      sourceItemFamilyRef: context.sourceItemFamilyRef,
      candidateItemFamilyRef: "item-family-candidate",
    },
    artifacts: {
      answer: currentArtifact("answer-1"),
      rubric: currentArtifact("rubric-1"),
      validator: currentArtifact("validator-1"),
    },
    unseenSnapshot: {
      authority: "TRUSTED_SERVER_RESOLVER",
      snapshotRef: "unseen-snapshot-1",
      sealed: true,
      createdBeforePresentation: true,
      createdAfterPresentation: false,
      learnerScopeRef: context.learnerScopeRef,
      itemRevisionRef: "item-revision-candidate",
      solutionHiddenAtSeal: true,
      helpBytesAtSeal: 0,
      priorUseCount: 0,
      consumptionCount: 1,
      consumedByAttemptRef: "attempt-1",
      reused: false,
      stale: false,
      ambiguous: false,
    },
    presentation: {
      solutionHidden: true,
      hintBytes: 0,
      referenceBytes: 0,
      probeBytes: 0,
      solutionBytes: 0,
    },
    attempt: {
      authority: "TRUSTED_SERVER_RESOLVER",
      attemptRef: "attempt-1",
      mode: "attempt_first",
      genuine: true,
      nonEmpty: true,
      successful: true,
      completed: true,
      committed: true,
      committedBeforeAnySolutionBytes: true,
      submittedBeforeSolutionReveal: true,
      assisted: false,
      guidedOverride: false,
      synthetic: false,
      placeholder: false,
      stale: false,
      ambiguous: false,
      learnerScopeRef: context.learnerScopeRef,
      closureCaseRef: context.closureCaseRef,
      itemRevisionRef: "item-revision-candidate",
    },
    replayCount: 0,
    contamination: {
      total: 0,
      cache: 0,
      prefetch: 0,
      directRoute: 0,
      multiTab: 0,
      other: 0,
    },
    currentness: {
      authority: "TRUSTED_SERVER_RESOLVER",
      verifiedFreshAtAcceptance: true,
      verifiedAt: "D7_ACCEPTANCE",
      priorEligibilityResultReused: false,
      rightsCurrent: true,
      sourceCurrent: true,
      artifactsCurrent: true,
      unseenSnapshotCurrent: true,
      attemptCurrent: true,
      driftDetected: false,
      stale: false,
      ambiguous: false,
    },
    outerEligibilitySummary: true,
  };

  assert.equal(gate.consumedBy, "WCV_4_D1_D7_TIMED");
  assert.deepEqual(contract.implementationSliceContractBindings.WCV_4_D1_D7_TIMED, {
    d7EligibilityContractRef: "d7EligibilityContract",
    structuredGateRequired: true,
    summaryBooleanMaySubstitute: false,
  });
  assert.equal(gate.authority, "TRUSTED_SERVER_RESOLVER");
  assert.equal(gate.evaluationTiming, "FRESH_IMMEDIATELY_BEFORE_D7_ACCEPTANCE");
  assert.equal(gate.allConjunctsRequired, true);
  assert.equal(gate.priorEligibilityResultReusable, false);
  assert.deepEqual(gate.decisionContextBoundary, {
    onlyAcceptedInput: "TRUSTED_SERVER_RESOLVED_CONTEXT",
    requestFieldsReadAsAuthority: false,
    clientFieldsReadAsAuthority: false,
    modelFieldsReadAsAuthority: false,
    outerBooleanReadAsAuthority: false,
    candidateAuthorityClaimMaySubstitute: false,
  });
  assert.equal(new Set(gate.requiredConjuncts.map(({ id }) => id)).size, gate.requiredConjuncts.length);
  for (const conjunct of gate.requiredConjuncts) {
    assert.ok(gate.predicateVocabulary.includes(conjunct.predicate), conjunct.id);
  }
  assert.equal(gate.summaryBooleanCompatibility.eligibilityAuthority, false);
  assert.equal(gate.summaryBooleanCompatibility.maySubstituteForStructuredGate, false);
  assert.equal(gate.generatedItemPolicy.defaultQualification, "learning_only");
  assert.equal(gate.generatedItemPolicy.defaultVerification, "unverified");
  assert.equal(evaluateD7Eligibility(eligible, context).eligible, true);

  const hostileCases = [];
  const addCase = (label, mutateCandidate, mutateContext = () => {}, outer = false) => {
    const candidate = clone(eligible);
    const candidateContext = clone(context);
    mutateCandidate(candidate);
    mutateContext(candidateContext);
    hostileCases.push([label, candidate, candidateContext, outer]);
  };

  addCase(
    "request authority cannot substitute",
    (value) => { value.outerAuthorityClaim = "TRUSTED_SERVER_RESOLVER"; },
    (value) => {
      value.resolutionAuthority = "REQUEST";
      value.trustedServerResolved = false;
      value.requestSupplied = true;
    },
  );
  addCase("cross-learner binding", (value) => { value.bindings.learnerScopeRef = "learner-foreign"; });
  addCase("cross-closure binding", (value) => { value.bindings.closureCaseRef = "closure-foreign"; });
  addCase("missing rights", (value) => { delete value.rights; });
  addCase("missing rights decision ref", (value) => { delete value.rights.decisionRef; });
  addCase("blocked rights", (value) => { value.rights.decision = "BLOCKED"; });
  addCase("stale rights", (value) => { value.rights.stale = true; });
  addCase("non-fresh rights", (value) => { value.rights.resolvedFreshAtAcceptance = false; });
  addCase("foreign-scope rights", (value) => { value.rights.learnerScopeRef = "learner-foreign"; });
  addCase("wrong-use rights", (value) => { value.rights.use = "LEARNING_ONLY"; });
  addCase("missing source", (value) => { delete value.source; });
  addCase("missing source resolution ref", (value) => { delete value.source.resolutionRef; });
  addCase("stale source", (value) => { value.source.stale = true; });
  addCase("non-fresh source", (value) => { value.source.resolvedFreshAtAcceptance = false; });
  addCase("mismatched source identity", (value) => { value.source.identityRef = "source-other"; });
  addCase("foreign effective version", (value) => { value.source.effectiveVersionRef = "version-other"; });
  addCase("partial skill set", (value) => { value.candidate.targetSkillRefs = ["skill-a"]; });
  addCase("superset skill set", (value) => { value.candidate.targetSkillRefs.push("skill-c"); });
  addCase("cross-skill set", (value) => { value.candidate.targetSkillRefs = ["skill-x", "skill-y"]; });
  addCase(
    "same item revision",
    () => {},
    (value) => { value.sourceItemRevisionRef = "item-revision-candidate"; },
  );
  addCase("same-surface family", (value) => {
    value.surface.candidateItemFamilyRef = context.sourceItemFamilyRef;
    value.surface.nonSameSurface = false;
  });
  addCase("untrusted surface verification", (value) => { value.surface.authority = "MODEL"; });
  addCase("stale surface verification", (value) => { value.surface.stale = true; });
  addCase("ambiguous surface verification", (value) => { value.surface.ambiguous = true; });
  addCase("missing answer artifact", (value) => { delete value.artifacts.answer; });
  addCase("stale rubric artifact", (value) => { value.artifacts.rubric.stale = true; });
  addCase("ambiguous answer artifact", (value) => { value.artifacts.answer.ambiguous = true; });
  addCase("foreign validator artifact", (value) => {
    value.artifacts.validator.itemRevisionRef = "item-revision-foreign";
  });
  addCase("missing unseen snapshot", (value) => { delete value.unseenSnapshot; });
  addCase("foreign unseen snapshot", (value) => {
    value.unseenSnapshot.learnerScopeRef = "learner-foreign";
  });
  addCase("unsealed unseen snapshot", (value) => { value.unseenSnapshot.sealed = false; });
  addCase("reused unseen snapshot", (value) => { value.unseenSnapshot.reused = true; });
  addCase("previously consumed unseen snapshot", (value) => { value.unseenSnapshot.priorUseCount = 1; });
  addCase("snapshot consumed by another attempt", (value) => {
    value.unseenSnapshot.consumedByAttemptRef = "attempt-foreign";
  });
  addCase("ambiguous unseen snapshot", (value) => { value.unseenSnapshot.ambiguous = true; });
  addCase("after-presentation snapshot", (value) => {
    value.unseenSnapshot.createdBeforePresentation = false;
    value.unseenSnapshot.createdAfterPresentation = true;
  });
  addCase("prior exposure at seal", (value) => { value.unseenSnapshot.helpBytesAtSeal = 1; });
  addCase("hint byte", (value) => { value.presentation.hintBytes = 1; });
  addCase("reference byte", (value) => { value.presentation.referenceBytes = 1; });
  addCase("probe byte", (value) => { value.presentation.probeBytes = 1; });
  addCase("solution byte", (value) => { value.presentation.solutionBytes = 1; });
  addCase("assisted attempt", (value) => { value.attempt.assisted = true; });
  addCase("guided attempt", (value) => { value.attempt.guidedOverride = true; });
  addCase("synthetic attempt", (value) => { value.attempt.synthetic = true; });
  addCase("placeholder attempt", (value) => { value.attempt.placeholder = true; });
  addCase("unsuccessful attempt", (value) => { value.attempt.successful = false; });
  addCase("incomplete attempt", (value) => { value.attempt.completed = false; });
  addCase("empty attempt", (value) => { value.attempt.nonEmpty = false; });
  addCase("attempt committed after solution bytes", (value) => {
    value.attempt.committedBeforeAnySolutionBytes = false;
  });
  addCase("stale attempt", (value) => { value.attempt.stale = true; });
  addCase("ambiguous attempt", (value) => { value.attempt.ambiguous = true; });
  addCase("cross-learner attempt", (value) => { value.attempt.learnerScopeRef = "learner-foreign"; });
  addCase("cross-closure attempt", (value) => { value.attempt.closureCaseRef = "closure-foreign"; });
  addCase("replay", (value) => { value.replayCount = 1; });
  for (const channel of ["cache", "prefetch", "directRoute", "multiTab", "other"]) {
    addCase(`${channel} contamination`, (value) => { value.contamination[channel] = 1; });
  }
  addCase("prior eligibility result reused", (value) => {
    value.currentness.priorEligibilityResultReused = true;
  });
  addCase("currentness drift before acceptance", (value) => {
    value.currentness.driftDetected = true;
    value.currentness.sourceCurrent = false;
  });
  addCase("ambiguous currentness", (value) => { value.currentness.ambiguous = true; });
  addCase(
    "outer true while trusted rights conjunct fails",
    (value) => { value.rights.current = false; value.outerEligibilitySummary = true; },
    () => {},
    true,
  );

  const failure = { eligible: false, ...gate.failureBehavior };
  for (const [label, candidate, candidateContext, outer] of hostileCases) {
    assert.deepEqual(
      evaluateD7Eligibility(candidate, candidateContext, outer),
      failure,
      label,
    );
  }
  assert.deepEqual(gate.failureBehavior, {
    acceptedD7Evidence: false,
    masteryAdvance: false,
    closureAdvance: false,
    transferConfirmed: false,
    safeMaximumGapClosureStatus: "d1_reproduced",
  });
});

test("keeps Today at three and Full-Day at trusted-server integer 30..720", () => {
  const x = contract.hardInvariants;
  assert.equal(x.todayCoreOutcomeMax, 3);
  assert.equal(x.fullDayExecutionBlockLimitMode, "AVAILABLE_MINUTES_0_TO_N");
  assert.equal(x.blockCompletionChangesMastery, false);
  assert.equal(x.engagementMaySetLearningPriority, false);
  assert.deepEqual(x.fullDayAvailableMinutes, {
    requiredType: "integer",
    minimum: 30,
    maximum: 720,
    outsideRangeBehavior: "REJECT_NO_PLAN",
  });
  includesAll(strategy, ["CoreOutcome은 0..3", "REJECT_NO_PLAN"], "strategy Full-Day contract");
});

test("requires complete Practice, Theory and Law Golden verticals", () => {
  for (const subject of ["practice", "theory", "law"]) {
    assert.ok(contract.goldenVerticals[subject]);
    assert.ok(contract.goldenVerticals[subject].requiredStory.length >= 6);
  }
  assert.equal(contract.goldenVerticals.practice.hardGates.deterministicGoldAccuracy, 1);
  assert.equal(contract.goldenVerticals.law.hardGates.unknownConflictFailClosed, 1);
});

test("requires the complete reset-safe casio_fx_9860giii routine", () => {
  const practice = contract.goldenVerticals.practice;
  assert.ok(practice.requiredStory.includes("CASIO_FX_9860GIII_RESET_SAFE_ROUTINE"));
  assert.deepEqual(practice.calculatorRoutineRequirements, [
    "FORMULA",
    "EXTRACTED_VALUES",
    "HAND_KEY_SEQUENCE",
    "EXPECTED_DISPLAY",
    "UNIT_SIGN_ROUNDING_CHECKS",
    "ANSWER_SHEET_TRANSFER",
    "RESET_SAFE_REPRODUCTION",
    "NO_PROGRAM_STORAGE_GUARDRAIL",
  ]);
  includesAll(
    strategy,
    [
      "casio_fx_9860giii",
      "formula",
      "extracted values",
      "hand-key sequence",
      "expected display",
      "answer-sheet transfer",
      "no-program-storage guardrail",
    ],
    "strategy GIII contract",
  );
  assert.ok(validation.includes("GIII routine"));
});

test("separates synthetic building from completed exact live activation", () => {
  const live = contract.lanes.liveActivation;
  const s236p = live.s236pActivationRevalidation;
  assert.ok(contract.lanes.syntheticBuild.allowed.includes("STATE_MACHINE"));
  assert.ok(contract.lanes.syntheticBuild.forbidden.includes("REAL_LEARNER_BODY"));
  assert.ok(live.requiredPreconditions.includes("CURRENT_O3A_EXACT_APPROVAL"));
  assert.ok(
    live.requiredPreconditions.includes(
      "S236P_CURRENT_EXACT_ACCEPTANCE_ARTIFACT_RESOLVED_AND_RECOMPUTED_AT_ACTIVATION",
    ),
  );
  assert.equal(s236p.required, true);
  assert.equal(s236p.timing, "IMMEDIATELY_BEFORE_EACH_LIVE_ACTIVATION");
  assert.equal(s236p.artifact, "CANONICAL_CONTENT_ADDRESSED_S236P_COMPLETION_ARTIFACT");
  assert.equal(s236p.resolutionCardinality, "EXACTLY_ONE");
  assert.deepEqual(s236p.requiredState, { acceptanceCompleted: true, terminalPass: true });
  for (const binding of [
    "RECEIPT_SET",
    "ASSERTION_EVIDENCE_SET",
    "PRIMARY_ATTESTOR_PROVENANCE_SET",
    "VERIFIED_INDEPENDENT_ATTESTATION",
    "EXACT_ENVIRONMENT_AND_VAULT",
    "FINAL_O4V_APPROVED_PACKET_DIGEST",
    "CURRENT_O4V_DECISION_RECEIPT_APPROVAL_AND_REVOCATION_STATE",
    "COMPLETION_TIME",
  ]) {
    assert.ok(s236p.recomputeBindings.includes(binding), `missing S236P binding: ${binding}`);
  }
  for (const rejected of [
    "UNRESOLVED",
    "AMBIGUOUS",
    "DIGEST_MISMATCH",
    "RECOMPUTE_FAILURE",
    "MISSING_OR_INVALID_ATTESTATION",
    "O4V_BINDING_MISMATCH_OR_REVOKED",
    "ENVIRONMENT_OR_VAULT_MISMATCH",
    "STALE",
  ]) {
    assert.ok(s236p.reject.includes(rejected), `missing S236P rejection: ${rejected}`);
  }
  assert.equal(s236p.failureDisposition, "BLOCK_LIVE_ACTIVATION");
  includesAll(
    strategy,
    [
      "acceptanceCompleted=true",
      "terminalPass=true",
      "canonical content-addressed S236P completion artifact",
      "current O4V",
      "recompute",
    ],
    "strategy activation gate",
  );
  includesAll(
    validation,
    ["completion booleans alone are insufficient", "content-addressed", "blocks live activation"],
    "validation activation gate",
  );
});

test("preserves the current O4F-to-S243C ordering without circularity", () => {
  const commercial = contract.lanes.commercialActivation;
  assert.deepEqual(commercial.canonicalDependencyPath, [
    "S241A",
    "O3C",
    "S239A",
    "S242C",
    "O4F",
    "S243C",
  ]);
  assert.deepEqual(commercial.preCanaryCompletedPath, [
    "S241A",
    "O3C",
    "S239A",
    "S242C",
    "O4F",
  ]);
  assert.equal(commercial.paidCanaryTarget, "S243C");
  assert.equal(commercial.s243cCompletionRequiredBeforePaidCanaryEntry, false);
  assert.equal(commercial.ownerPrivateAcceptanceMaySubstitute, false);
  assert.equal(commercial.genericOwnerActivationMaySubstitute, false);
  assert.equal(commercial.ownerPrivateEvidenceMaySubstituteExternalCommercialPath, false);
  assert.ok(strategy.includes("S241A → O3C → S239A → S242C → O4F → S243C"));
});

test("keeps private raw bodies out of training and shared planes", () => {
  const x = contract.hardInvariants;
  assert.equal(x.rawLearnerBodyInSharedAnalyticsOrTraining, false);
  assert.equal(x.rawLearnerContentAsModelTrainingInputForbidden, true);
  assert.equal(x.exactPurposeConsentAloneSufficientForRawLearnerContentTraining, false);
  assert.deepEqual(x.futureTrainingCandidates, [
    "CONSENTED_PSEUDONYMOUS_NON_RECONSTRUCTIVE_SIGNALS",
    "PROMOTED_CLEARED_CONTENT_BANK_MATERIAL",
  ]);
});

test("keeps the pyBKT disposition declaration benchmark-only until O2 and sufficient event data", () => {
  const fsrsSection = benchmark.match(/### 3\.5 FSRS \/ ts-fsrs[\s\S]*?(?=### 3\.6 pyBKT)/)?.[0] ?? "";
  assert.match(
    fsrsSection,
    /Current disposition is exactly:\s*\n\s*>\s*`benchmark_only`/i,
  );
  assert.match(
    strategy,
    /^\| ts-fsrs \| benchmark_only \| current_benchmark \| future_due_date_candidate \| isolated synthetic\/offline comparison only \|$/m,
  );
  includesAll(
    fsrsSection,
    [
      "isolated synthetic/offline comparison against a fixed/native scheduling baseline",
      "due-date candidate for an already-selected ReviewUnit only",
      "adapter-specific benchmark/comparison evidence",
      "exact-scope O2 measurement/consent approval",
      "beta evidence",
      "a separately authorized lifecycle transition",
      "learner-hidden instrumentation",
      "learner-state mutation",
      "product authority",
      "biggest gap",
      "mastery/closure",
      "Today priority",
      "D+7 eligibility",
      "pass readiness",
    ],
    "benchmark ts-fsrs boundary",
  );
  includesAll(
    strategy,
    [
      "ts-fsrs의 current disposition은 정확히 `benchmark_only`",
      "adapter-specific benchmark/comparison",
      "exact-scope O2 measurement/consent approval",
      "beta evidence",
      "a separately authorized lifecycle transition",
    ],
    "strategy ts-fsrs boundary",
  );
  assert.doesNotMatch(benchmark, /deferred_due_candidate/);
  assert.doesNotMatch(strategy, /deferred_due_candidate/);

  const bkt = contract.benchmarkAdoption.PYBKT;
  assert.equal(bkt.currentDisposition, "BENCHMARK_ONLY");
  assert.deepEqual(bkt.shadowPrerequisites, [
    "EXACT_O2_MEASUREMENT_CONSENT_GATE",
    "SUFFICIENT_CLOSED_SCHEMA_SKILL_EVENTS",
  ]);
  assert.ok(bkt.reject.includes("HIDDEN_SHADOW_BEFORE_O2"));
  assert.ok(bkt.reject.includes("SHADOW_FROM_SYNTHETIC_BENCHMARK_ALONE"));
  assert.ok(bkt.reject.includes("CANONICAL_MASTERY_AUTHORITY"));
  includesAll(strategy, ["pyBKT", "benchmark_only", "exact-scope O2 measurement/consent gate"], "strategy pyBKT boundary");
  assert.match(
    benchmark,
    /Current disposition is exactly:\s*\n\s*>\s*`benchmark_only`/i,
  );
  assert.doesNotMatch(
    benchmark,
    /Current disposition is exactly:\s*\n\s*>\s*`(?:shadow|benchmark_shadow_only)`/i,
  );
  includesAll(validation, ["pyBKT", "benchmark_only"], "validation pyBKT boundary");
});

test("registers the focused contract in the default test runner", () => {
  assert.ok(runner.includes("tests/appraiser-second-world-class-vertical-contract.test.mjs"));
});

test("requires complete open-source qualification before adoption", () => {
  const canonicalStates = deriveLifecycleVocabulary(agents);
  assert.deepEqual(canonicalStates, [
    "proposed",
    "benchmark_only",
    "shadow",
    "limited_activation",
    "active",
    "rollback",
  ]);

  const strategyLifecycle = tableAfterHeading(
    strategy,
    "Dependency/model-adapter lifecycle ledger",
  );
  const benchmarkLifecycle = tableAfterHeading(
    benchmark,
    "Dependency/model-adapter lifecycle ledger",
  );
  const strategyReferences = tableAfterHeading(
    strategy,
    "Pattern/reference classification ledger",
  );
  const benchmarkReferences = tableAfterHeading(
    benchmark,
    "Pattern/reference classification ledger",
  );
  const lifecycleHeaders = [
    "Candidate",
    "Lifecycle state",
    "Planning phase",
    "Planning role",
    "Allowed role",
  ];
  const referenceHeaders = ["Reference", "Reference category", "Allowed use"];
  assert.deepEqual(strategyLifecycle.headers, lifecycleHeaders);
  assert.deepEqual(benchmarkLifecycle.headers, lifecycleHeaders);
  assert.deepEqual(strategyReferences.headers, referenceHeaders);
  assert.deepEqual(benchmarkReferences.headers, referenceHeaders);
  assert.deepEqual(strategyLifecycle.rows, benchmarkLifecycle.rows);
  assert.deepEqual(strategyReferences.rows, benchmarkReferences.rows);
  assert.deepEqual(
    strategyLifecycle.rows.map((row) => [row.Candidate, row["Lifecycle state"]]),
    [
      ["Ajv", "proposed"],
      ["decimal.js", "proposed"],
      ["Inspect AI", "proposed"],
      ["ts-fsrs", "benchmark_only"],
      ["pyBKT", "benchmark_only"],
      ["pgvector", "proposed"],
      ["PaddleOCR", "benchmark_only"],
      ["Tesseract", "proposed"],
      ["OR-Tools", "proposed"],
    ],
  );
  assert.deepEqual(
    strategyReferences.rows.map((row) => row.Reference),
    expectedReferenceEntries,
  );
  assert.deepEqual(
    lifecycleLedgerErrors(
      strategyLifecycle.rows,
      strategyReferences.rows,
      canonicalStates,
    ),
    [],
  );
  assert.deepEqual(
    lifecycleLedgerErrors(
      benchmarkLifecycle.rows,
      benchmarkReferences.rows,
      canonicalStates,
    ),
    [],
  );

  const hostileFixtureFails = (mutate) => {
    const lifecycleRows = clone(strategyLifecycle.rows);
    const referenceRows = clone(strategyReferences.rows);
    mutate(lifecycleRows, referenceRows);
    return lifecycleLedgerErrors(lifecycleRows, referenceRows, canonicalStates).length > 0;
  };
  const hostileFixtures = [
    ["missing lifecycle state", (rows) => { rows[0]["Lifecycle state"] = ""; }],
    ["duplicate lifecycle row", (rows) => { rows.push(clone(rows[0])); }],
    ["duplicate lifecycle state in one slot", (rows) => {
      rows[0]["Lifecycle state"] = "proposed / proposed";
    }],
    ["unknown lifecycle state", (rows) => { rows[0]["Lifecycle state"] = "queued"; }],
    ["case-shifted lifecycle state", (rows) => { rows[0]["Lifecycle state"] = "Proposed"; }],
    ["composite lifecycle state", (rows) => {
      rows[0]["Lifecycle state"] = "proposed / benchmark_only";
    }],
    ["planning metadata as lifecycle authority", (rows) => {
      rows[0]["Planning phase"] = "proposed";
    }],
    ["reference placed in lifecycle ledger", (rows) => {
      rows.push({
        Candidate: "OATutor",
        "Lifecycle state": "proposed",
        "Planning phase": "reference",
        "Planning role": "pattern_reference",
        "Allowed role": "step/KC/scaffold pattern",
      });
    }],
  ];
  for (const [label, mutate] of hostileFixtures) {
    assert.equal(hostileFixtureFails(mutate), true, label);
  }
  for (const forbiddenState of forbiddenLifecycleSlotValues) {
    assert.equal(
      hostileFixtureFails((rows) => { rows[0]["Lifecycle state"] = forbiddenState; }),
      true,
      forbiddenState,
    );
    assert.equal(
      strategyLifecycle.rows.some((row) => row["Lifecycle state"] === forbiddenState),
      false,
      `strategy lifecycle slot ${forbiddenState}`,
    );
    assert.equal(
      benchmarkLifecycle.rows.some((row) => row["Lifecycle state"] === forbiddenState),
      false,
      `benchmark lifecycle slot ${forbiddenState}`,
    );
  }
  includesAll(
    strategy,
    ["Planning phase", "Planning role", "proposed → benchmark_only", "not lifecycle states"],
    "strategy lifecycle separation",
  );
  includesAll(
    benchmark,
    ["Planning phase", "Planning role", "proposed → benchmark_only", "not lifecycle states"],
    "benchmark lifecycle separation",
  );

  const required = new Set(contract.openSourceQualificationRequiredFields);
  for (const field of [
    "project",
    "version",
    "license",
    "securityPosture",
    "transitiveDependencies",
    "sbom",
    "dataEgress",
    "fallback",
    "rollback",
    "uninstallability",
    "promotionGate",
  ]) {
    assert.ok(required.has(field), field);
  }
  includesAll(
    benchmark,
    [
      "UWorld",
      "AMBOSS",
      "Duolingo Birdbrain",
      "Khanmigo",
      "OATutor",
      "Ajv",
      "decimal.js",
      "Inspect AI",
      "FSRS",
      "pyBKT",
      "H5P",
      "QTI 3",
      "Caliper",
      "W3C PROV",
      "NIST AI RMF",
      "Structured AI Tutor RCT",
      "Generative AI without guardrails",
      "Tutor CoPilot",
      "Retrieval Practice",
    ],
    "benchmark matrix",
  );
  assert.ok(benchmark.includes("외부 제품의 마케팅 주장은 답안길 효능 증거가 아니다"));
});

test("records superseded V13.1 and source-only non-claims", () => {
  assert.deepEqual(contract.pr697Disposition, {
    productIdeasAbsorbed: true,
    activeMasterPromotionRejected: true,
    recommendedAfterThisStandardAccepted: "SUPERSEDE_AND_CLOSE",
  });
  assert.ok(decision.includes("PR #697과 Issue #695는 2026-08-10 KST에 superseded"));
  includesAll(
    validation,
    [
      "runtime evidence: none",
      "learning efficacy",
      "commercial readiness",
      "Production readiness",
    ],
    "validation non-claims",
  );
});

test("all source artifacts end with a newline", () => {
  for (const [label, text] of [
    ["decision", decision],
    ["strategy", strategy],
    ["benchmark", benchmark],
    ["contract", contractText],
    ["validation", validation],
  ]) {
    assert.ok(text.endsWith("\n"), label);
  }
});
