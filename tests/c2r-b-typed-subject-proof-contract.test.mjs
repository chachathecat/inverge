import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const CONTRACT = "config/dabangil-c2r-b-typed-subject-proof-architecture-v1.json";
const DECISION = "docs/decisions/2026-08-15-owner-c2r-b-typed-proof-obligations.md";
const STRATEGY = "docs/strategy/dabangil-c2r-b-typed-subject-proof-architecture-v1.md";
const QA = "docs/qa/c2r-b-typed-subject-proof-validation.md";
const FOCUSED_TEST = "tests/c2r-b-typed-subject-proof-contract.test.mjs";

const EXPECTED_PATHS = [
  "AGENTS.md",
  "roadmap/active-program.yml",
  "config/dabangil-unified-program-contract.json",
  "config/dabangil-unified-product-multisurface-launch-v1.json",
  "docs/dabangil-unified-program-contract.md",
  "docs/inverge-master-roadmap.md",
  "docs/decisions/2026-08-15-owner-c2r-b-typed-proof-obligations.md",
  "docs/strategy/dabangil-c2r-b-typed-subject-proof-architecture-v1.md",
  "config/dabangil-c2r-b-typed-subject-proof-architecture-v1.json",
  "docs/qa/c2r-b-typed-subject-proof-validation.md",
  "tests/c2r-b-typed-subject-proof-contract.test.mjs",
  "tests/rights-safe-adaptive-variant-foundry-contract.test.mjs",
  "tests/wcv-c2r-structural-recovery-authority.test.mjs",
  "tests/wcv-campaign-authority-roadmap-reconciliation.test.mjs",
  "tests/dabangil-unified-product-multisurface-launch-authority.test.mjs",
  "scripts/run-node-tests.mjs",
  "docs/strategy/ACTIVE-MASTER-PLAN.md",
  "docs/strategy/dabangil-unified-product-multisurface-launch-v1-2026-08-14.md",
];

async function text(path) {
  return readFile(new URL(path, root), "utf8");
}

async function json(path) {
  return JSON.parse(await text(path));
}

function recordsByType(contract) {
  return {
    RepairProofObligationV1: contract.proofObligations,
    RepairAnchorV1: contract.canonicalAnchors,
    CalculationRelationAnchorV1: contract.canonicalAnchors.filter(
      (anchor) => anchor.anchorKind === "PRACTICE_CALCULATION_RELATION",
    ),
    ScopedPredicateAnchorV1: contract.canonicalAnchors.filter(
      (anchor) => anchor.anchorKind === "THEORY_SCOPED_PREDICATE",
    ),
    LawApplicabilityAnchorV1: contract.canonicalAnchors.filter(
      (anchor) => anchor.anchorKind === "LAW_APPLICABILITY",
    ),
    ProofEvaluationPolicyV1: contract.registries.evaluationPolicies,
    TutorEpisodeInterfaceV1: contract.registries.episodeInterfaces,
    SubjectVerticalFreezeV1: contract.subjectVerticalFreezes,
    LawSourceV1: contract.registries.lawSources,
    LawAnchorV1: contract.registries.lawAnchors,
    LawAnchorVersionV1: contract.registries.lawAnchorVersions,
    LawSourceBindingV1: contract.registries.lawSourceBindings,
  };
}

function validateIdentityAndReferenceGraph(contract) {
  const errors = [];
  const records = recordsByType(contract);

  for (const [type, schema] of Object.entries(contract.identitySchemas)) {
    const rows = records[type] ?? [];
    if (rows.length === 0) errors.push(`missing-type:${type}`);
    for (const field of [...schema.stableIdentityFields, ...schema.versionIdentityFields]) {
      const values = rows.map((row) => row[field]);
      if (values.some((value) => typeof value !== "string" || value.length === 0)) {
        errors.push(`missing-identity:${type}.${field}`);
      }
      if (new Set(values).size !== values.length) {
        errors.push(`duplicate-identity:${type}.${field}`);
      }
    }
    for (const field of schema.requiredReferenceFields) {
      if (rows.some((row) => typeof row[field] !== "string" || row[field].length === 0)) {
        errors.push(`missing-reference:${type}.${field}`);
      }
    }
  }

  const edgeIds = contract.referenceGraph.map((edge) => edge.edgeId);
  if (new Set(edgeIds).size !== edgeIds.length) errors.push("duplicate-edge-id");

  for (const edge of contract.referenceGraph) {
    for (const source of records[edge.fromType] ?? []) {
      const value = source[edge.fromField];
      if (typeof value !== "string" || value.length === 0) {
        errors.push(`missing-edge-source:${edge.edgeId}`);
        continue;
      }
      const targets = (records[edge.toType] ?? []).filter(
        (target) => target[edge.toField] === value,
      );
      if (targets.length !== 1) errors.push(`edge-target-count:${edge.edgeId}:${targets.length}`);
    }
  }

  for (const binding of contract.correlatedReferenceBindings ?? []) {
    for (const source of records[binding.fromType] ?? []) {
      const targets = (records[binding.toType] ?? []).filter((target) =>
        binding.identityPairs.every(
          ({ fromField, toField }) => source[fromField] === target[toField],
        ),
      );
      if (targets.length !== 1) {
        errors.push(
          `correlated-target-count:${binding.bindingId}:${source.proofObligationId}:${targets.length}`,
        );
        continue;
      }
      const targetSubject =
        binding.targetSubjectByDiscriminator[targets[0][binding.targetDiscriminatorField]];
      if (source[binding.fromSubjectField] !== targetSubject) {
        errors.push(
          `correlated-subject-mismatch:${binding.bindingId}:${source.proofObligationId}`,
        );
      }
    }
  }

  const adjacency = new Map();
  for (const edge of contract.referenceGraph) {
    const next = adjacency.get(edge.fromType) ?? new Set();
    next.add(edge.toType);
    adjacency.set(edge.fromType, next);
  }
  const visiting = new Set();
  const visited = new Set();
  function visit(type) {
    if (visiting.has(type)) return false;
    if (visited.has(type)) return true;
    visiting.add(type);
    for (const target of adjacency.get(type) ?? []) {
      if (!visit(target)) return false;
    }
    visiting.delete(type);
    visited.add(type);
    return true;
  }
  for (const type of adjacency.keys()) {
    if (!visit(type)) errors.push("reference-cycle");
  }

  return errors;
}

function clone(value) {
  return structuredClone(value);
}

function evaluatePractice(anchor, evidence) {
  if (!evidence?.relation) return "UNSUPPORTED";
  const relation = evidence.relation;
  const roles = anchor.operandRoles.map((operand) => operand.role);
  if (new Set(roles).size !== roles.length) return "AMBIGUOUS";
  if (JSON.stringify(anchor.operandOrder) !== JSON.stringify(roles)) return "BLOCKED";
  for (const field of ["operator", "operandOrder", "units", "sign", "supportedTransformation"] ) {
    if (JSON.stringify(relation[field]) !== JSON.stringify(anchor[field])) return "BLOCKED";
  }
  if (JSON.stringify(relation.rounding) !== JSON.stringify(anchor.rounding)) return "BLOCKED";
  if (relation.operandRoles.length !== anchor.operandRoles.length) return "PARTIAL";
  for (let index = 0; index < anchor.operandRoles.length; index += 1) {
    const expected = anchor.operandRoles[index];
    const actual = relation.operandRoles[index];
    if (actual.role !== expected.role || actual.unit !== expected.unit) {
      return "BLOCKED";
    }
  }
  const values = relation.operandRoles.map((operand) => operand.value);
  if (values.some((value) => !Number.isFinite(value) || !Number.isSafeInteger(value))) {
    return "UNSUPPORTED";
  }
  let calculated;
  if (relation.operator === "ADD") calculated = values[0] + values[1];
  if (relation.operator === "SUBTRACT") calculated = values[0] - values[1];
  if (relation.operator === "MULTIPLY") calculated = values[0] * values[1];
  if (relation.operator === "DIVIDE") calculated = values[0] / values[1];
  if (!Number.isFinite(calculated) || !Number.isSafeInteger(calculated)) return "UNSUPPORTED";
  if (relation.operandRoles.some((operand, index) => operand.value !== anchor.operandRoles[index].value)) {
    return "BLOCKED";
  }
  if (
    relation.result.value !== calculated ||
    relation.result.value !== anchor.result.value ||
    relation.result.unit !== anchor.result.unit
  ) {
    return "BLOCKED";
  }
  return "PASS";
}

function evaluateTheory(anchor, evidence) {
  const occurrences = evidence?.occurrences ?? [];
  if (occurrences.length > anchor.overflowPolicy.maxPredicateOccurrences) return "UNSUPPORTED";
  if (evidence?.clauseCount > anchor.overflowPolicy.maxClauses) return "UNSUPPORTED";
  if (occurrences.some((item) => item.unresolvedAnaphora || !item.targetScopeId)) return "AMBIGUOUS";
  const targetIds = new Set([anchor.targetScopeId, ...anchor.acceptedTargetAliases]);
  const target = occurrences.filter((item) => targetIds.has(item.targetScopeId));
  if (target.length === 0) return "UNSUPPORTED";
  const crossTargetOnly = target.length === 0 && occurrences.length > 0;
  if (crossTargetOnly) return "UNSUPPORTED";
  for (const forbidden of anchor.forbiddenPredicates) {
    const polarities = new Set(
      target.filter((item) => item.predicate === forbidden).map((item) => item.polarity),
    );
    if (polarities.has("POSITIVE")) return "BLOCKED";
  }
  for (const required of anchor.requiredPredicates) {
    const polarities = new Set(
      target.filter((item) => item.predicate === required).map((item) => item.polarity),
    );
    if (polarities.has("POSITIVE") && polarities.has("NEGATIVE")) return "AMBIGUOUS";
    if (polarities.has("NEGATIVE")) return "PARTIAL";
    if (polarities.has("POSITIVE")) continue;
    const alternativeSatisfied = anchor.acceptableAlternatives.some((group) =>
      group.some((alternative) =>
        target.some(
          (item) => item.predicate === alternative && item.polarity === "POSITIVE",
        ),
      ),
    );
    if (!alternativeSatisfied) return "PARTIAL";
  }
  return "PASS";
}

function evaluateLaw(contract, anchor) {
  const bindingMatches = contract.registries.lawSourceBindings.filter(
    (binding) => binding.lawSourceBindingId === anchor.lawSourceBindingId,
  );
  if (bindingMatches.length !== 1) return "BLOCKED";
  const binding = bindingMatches[0];
  const sourceMatches = contract.registries.lawSources.filter(
    (source) => source.sourceId === anchor.sourceId && source.sourceVersionId === anchor.sourceVersionId,
  );
  const anchorMatches = contract.registries.lawAnchors.filter(
    (item) => item.lawAnchorId === anchor.lawAnchorId && item.sourceId === anchor.sourceId,
  );
  const versionMatches = contract.registries.lawAnchorVersions.filter(
    (item) => item.lawAnchorVersionId === anchor.lawAnchorVersionId,
  );
  if (sourceMatches.length !== 1 || anchorMatches.length !== 1 || versionMatches.length !== 1) {
    return "BLOCKED";
  }
  for (const field of [
    "sourceId",
    "sourceVersionId",
    "lawAnchorId",
    "lawAnchorVersionId",
    "exactLocator",
    "exactVersionIdentity",
    "effectiveFrom",
    "effectiveTo",
  ]) {
    if (binding[field] !== anchor[field]) return field.includes("Version") ? "STALE" : "BLOCKED";
  }
  const version = versionMatches[0];
  for (const field of ["sourceId", "sourceVersionId", "lawAnchorId", "exactLocator", "exactVersionIdentity"] ) {
    if (version[field] !== anchor[field]) return field.includes("Version") ? "STALE" : "BLOCKED";
  }
  if (binding.status !== "CURRENT" || anchor.currentLawApplicability !== "APPLICABLE_CURRENT") {
    return "STALE";
  }
  if (anchor.applicableAsOf < anchor.effectiveFrom) return "BLOCKED";
  if (anchor.effectiveTo !== null && anchor.applicableAsOf > anchor.effectiveTo) return "BLOCKED";
  if (
    binding.openBlockingReferenceIds.length !== 0 ||
    anchor.blockerState.blockerCount !== 0 ||
    anchor.blockerState.openBlockingReferenceIds.length !== 0
  ) {
    return "BLOCKED";
  }
  return "PASS";
}

function tupleFromProse(source) {
  const normalized = source
    .replace(/[`*]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*\/\s*/g, "/");
  const match = normalized.match(
    /WCV-C2\/C2\/#717\/C2R-C-P\/#703(?:\/|,?\s+)(authorized_unstarted|authorized but unstarted)/i,
  );
  return match ? ["WCV-C2", "C2", 717, "C2R-C-P", 703, "authorized_unstarted"] : null;
}

test("C2RB-UNION-001 freezes exactly three typed RepairAnchorV1 members", async () => {
  const contract = await json(CONTRACT);
  assert.equal(
    contract.repairAnchorUnion.typeScript,
    "type RepairAnchorV1 = CalculationRelationAnchorV1 | ScopedPredicateAnchorV1 | LawApplicabilityAnchorV1;",
  );
  assert.deepEqual(contract.repairAnchorUnion.memberTypes, [
    "CalculationRelationAnchorV1",
    "ScopedPredicateAnchorV1",
    "LawApplicabilityAnchorV1",
  ]);
  assert.deepEqual(contract.repairAnchorUnion.anchorKinds, [
    "PRACTICE_CALCULATION_RELATION",
    "THEORY_SCOPED_PREDICATE",
    "LAW_APPLICABILITY",
  ]);
  assert.equal(contract.repairAnchorUnion.additionalAnchorKindsAllowed, false);
  assert.deepEqual(
    contract.canonicalAnchors.map((anchor) => anchor.anchorKind),
    contract.repairAnchorUnion.anchorKinds,
  );
});

test("C2RB-REF-002 resolves unique identities and an acyclic explicit graph", async () => {
  const contract = await json(CONTRACT);
  assert.deepEqual(validateIdentityAndReferenceGraph(contract), []);
  assert.deepEqual(contract.correlatedReferenceBindings, [
    {
      bindingId: "proof-obligation-to-one-anchor-identity-version-subject",
      fromType: "RepairProofObligationV1",
      toType: "RepairAnchorV1",
      identityPairs: [
        { fromField: "anchorId", toField: "anchorId" },
        { fromField: "anchorVersionId", toField: "anchorVersionId" },
      ],
      fromSubjectField: "subject",
      targetDiscriminatorField: "anchorKind",
      targetSubjectByDiscriminator: {
        PRACTICE_CALCULATION_RELATION: "PRACTICE",
        THEORY_SCOPED_PREDICATE: "THEORY",
        LAW_APPLICABILITY: "LAW",
      },
      cardinality: "exactly_one_composite_target",
      failureMode: "FAIL_CLOSED",
    },
  ]);
  const hostile = clone(contract);
  hostile.registries.lawSources.push(clone(hostile.registries.lawSources[0]));
  assert.ok(validateIdentityAndReferenceGraph(hostile).some((error) => error.startsWith("duplicate-identity")));
  const unresolved = clone(contract);
  unresolved.proofObligations[0].anchorVersionId = "missing-anchor-version";
  assert.ok(validateIdentityAndReferenceGraph(unresolved).some((error) => error.startsWith("edge-target-count")));
  const mismatchedPair = clone(contract);
  mismatchedPair.proofObligations[0].anchorVersionId = contract.canonicalAnchors[1].anchorVersionId;
  const mismatchedPairErrors = validateIdentityAndReferenceGraph(mismatchedPair);
  assert.ok(
    mismatchedPairErrors.some((error) => error.startsWith("correlated-target-count")),
  );
  assert.equal(
    mismatchedPairErrors.some((error) => error.startsWith("edge-target-count:proof-obligation-to-anchor")),
    false,
  );
  const crossSubject = clone(contract);
  crossSubject.proofObligations[0].subject = "THEORY";
  assert.ok(
    validateIdentityAndReferenceGraph(crossSubject).some((error) =>
      error.startsWith("correlated-subject-mismatch"),
    ),
  );
  assert.equal(contract.identityRules.referenceCyclesAllowed, false);
});

test("C2RB-PRACTICE-003 proves a relation and rejects disconnected or malformed numbers", async () => {
  const contract = await json(CONTRACT);
  const anchor = contract.canonicalAnchors[0];
  const valid = { relation: clone(anchor) };
  assert.equal(evaluatePractice(anchor, valid), "PASS");
  assert.equal(evaluatePractice(anchor, { numericTokens: [120000000, 20000000, 100000000] }), "UNSUPPORTED");
  const swapped = clone(valid);
  swapped.relation.operandRoles.reverse();
  assert.equal(evaluatePractice(anchor, swapped), "BLOCKED");
  const units = clone(valid);
  units.relation.operandRoles[0].unit = "KRW";
  assert.equal(evaluatePractice(anchor, units), "BLOCKED");
  const sign = clone(valid);
  sign.relation.sign = "NEGATIVE";
  assert.equal(evaluatePractice(anchor, sign), "BLOCKED");
  const rounding = clone(valid);
  rounding.relation.rounding.scale = 2;
  assert.equal(evaluatePractice(anchor, rounding), "BLOCKED");
  const overflowAnchor = clone(anchor);
  overflowAnchor.operator = "ADD";
  overflowAnchor.operandRoles[0].value = Number.MAX_SAFE_INTEGER;
  overflowAnchor.result.value = 0;
  assert.equal(evaluatePractice(overflowAnchor, { relation: clone(overflowAnchor) }), "UNSUPPORTED");
  assert.equal(contract.practiceCalculationRelation.substringNumericMatchAllowed, false);
});

test("C2RB-THEORY-004 keeps predicates and alternatives inside the exact target", async () => {
  const contract = await json(CONTRACT);
  const anchor = contract.canonicalAnchors[1];
  const positive = {
    clauseCount: 1,
    occurrences: [
      { targetScopeId: anchor.targetScopeId, predicate: anchor.requiredPredicates[0], polarity: "POSITIVE" },
    ],
  };
  assert.equal(evaluateTheory(anchor, positive), "PASS");
  assert.equal(
    evaluateTheory(anchor, {
      clauseCount: 1,
      occurrences: [
        { targetScopeId: "theory-target:other", predicate: anchor.requiredPredicates[0], polarity: "POSITIVE" },
      ],
    }),
    "UNSUPPORTED",
  );
  const mixed = clone(positive);
  mixed.occurrences.push({
    targetScopeId: anchor.targetScopeId,
    predicate: anchor.requiredPredicates[0],
    polarity: "NEGATIVE",
  });
  assert.equal(evaluateTheory(anchor, mixed), "AMBIGUOUS");
  assert.equal(
    evaluateTheory(anchor, {
      clauseCount: 1,
      occurrences: [
        { targetScopeId: anchor.acceptedTargetAliases[0], predicate: anchor.acceptableAlternatives[0][0], polarity: "POSITIVE" },
      ],
    }),
    "PASS",
  );
  assert.equal(
    evaluateTheory(anchor, {
      clauseCount: 1,
      occurrences: [{ unresolvedAnaphora: true, predicate: anchor.requiredPredicates[0], polarity: "POSITIVE" }],
    }),
    "AMBIGUOUS",
  );
  assert.equal(
    evaluateTheory(anchor, {
      clauseCount: 1,
      occurrences: Array.from({ length: 65 }, () => ({
        targetScopeId: anchor.targetScopeId,
        predicate: anchor.requiredPredicates[0],
        polarity: "POSITIVE",
      })),
    }),
    "UNSUPPORTED",
  );
});

test("C2RB-LAW-005 requires one exact current source-anchor-version binding", async () => {
  const contract = await json(CONTRACT);
  const anchor = contract.canonicalAnchors[2];
  assert.equal(evaluateLaw(contract, anchor), "PASS");
  const labelOnly = { currentLawApplicability: "APPLICABLE_CURRENT" };
  assert.equal(evaluateLaw(contract, labelOnly), "BLOCKED");
  const stale = clone(anchor);
  stale.sourceVersionId = "law-source:synthetic-official-act@stale";
  assert.equal(evaluateLaw(contract, stale), "BLOCKED");
  const wrongVersion = clone(anchor);
  wrongVersion.exactVersionIdentity = "2025-01-01";
  assert.equal(evaluateLaw(contract, wrongVersion), "STALE");
  const date = clone(anchor);
  date.applicableAsOf = "2025-12-31";
  assert.equal(evaluateLaw(contract, date), "BLOCKED");
  const blocked = clone(contract);
  blocked.registries.lawSourceBindings[0].openBlockingReferenceIds = ["blocker:1"];
  assert.equal(evaluateLaw(blocked, anchor), "BLOCKED");
  const ambiguous = clone(contract);
  ambiguous.registries.lawSourceBindings.push(clone(ambiguous.registries.lawSourceBindings[0]));
  assert.equal(evaluateLaw(ambiguous, anchor), "BLOCKED");
});

test("C2RB-GENERIC-006 makes token presence candidate-only and fail closed", async () => {
  const contract = await json(CONTRACT);
  assert.equal(contract.proofEvaluation.genericTokenPresence, "CANDIDATE_EVIDENCE_ONLY");
  assert.deepEqual(contract.proofEvaluation.genericTokenPresenceMayCreate, []);
  assert.deepEqual(contract.proofEvaluation.genericTokenPresenceMayNotCreate, [
    "SATISFIED",
    "VERIFIED",
    "CALCULATION_RELATION",
    "TARGET_SCOPED_SUPPORT",
    "CURRENT_LAW_APPLICABILITY",
    "TRANSFER_QUALIFICATION",
    "MASTERY",
  ]);
  assert.deepEqual(contract.proofEvaluation.states, [
    "PASS",
    "PARTIAL",
    "AMBIGUOUS",
    "UNSUPPORTED",
    "BLOCKED",
    "STALE",
  ]);
  assert.equal(contract.proofEvaluation.verifiedState, "PASS");
  assert.equal(contract.proofEvaluation.allOtherStatesVerified, false);
});

test("C2RB-TUTOR-007 freezes future episode order, modes, commands and no shortcuts", async () => {
  const contract = await json(CONTRACT);
  const episode = contract.registries.episodeInterfaces[0];
  assert.ok(episode.phases.indexOf("METACOGNITIVE_PREDICTION") < episode.phases.indexOf("SERVER_DIAGNOSIS"));
  assert.ok(episode.phases.indexOf("LEARNER_SELF_DIAGNOSIS") < episode.phases.indexOf("SERVER_DIAGNOSIS"));
  assert.deepEqual(episode.privateArtifactInputModes, ["TYPED", "PHOTO", "PDF", "VOICE", "STRUCTURED_SELECTION"]);
  assert.deepEqual(episode.continuationCommands, ["VERIFY_AND_CONTINUE", "DEFER_FOR_NOW", "SWITCH_TO_GUIDED"]);
  assert.deepEqual(episode.noShortcutActions, ["SAVE", "UPLOAD", "VIEW", "SKIP", "DEFER_FOR_NOW", "SWITCH_TO_GUIDED"]);
  assert.equal(episode.noShortcutActionMayCreateVerified, false);
  assert.equal(episode.episodeMayCreateMasteryTransferOrStability, false);
});

test("C2RB-ALLOC-008 completes only C2 while #714 and later allocations stay open", async () => {
  const [contract, unified] = await Promise.all([
    json(CONTRACT),
    json("config/dabangil-unified-program-contract.json"),
  ]);
  const boundary = contract.issue714AllocationBoundary;
  const tracker = unified.wcvCampaignOverlay.issue714Tracker;
  assert.equal(boundary.issue, 714);
  assert.equal(boundary.issueStateAfterMerge, "OPEN");
  assert.equal(boundary.completedAllocation, "C2");
  assert.equal(boundary.issueClosureAllowed, false);
  assert.deepEqual(boundary.remainingAllocations, ["C3", "C4", "C6"]);
  assert.deepEqual(boundary.completedRequirementIds, tracker.allocations.C2);
  assert.deepEqual(Object.keys(tracker.allocations), ["C2", "C3", "C4", "C6"]);
  assert.equal(tracker.allocations.C3.length, 6);
  assert.equal(tracker.allocations.C4.length, 3);
  assert.equal(tracker.allocations.C6.length, 4);
});

test("C2RB-STAGE-009 exposes one format-invariant post-merge current-stage tuple", async () => {
  const contract = await json(CONTRACT);
  const expected = ["WCV-C2", "C2", 717, "C2R-C-P", 703, "authorized_unstarted"];
  assert.deepEqual(Object.values(contract.canonicalCurrentStageTuple).slice(1), expected);
  const prosePaths = [DECISION, STRATEGY];
  for (const path of prosePaths) assert.deepEqual(tupleFromProse(await text(path)), expected, path);
  assert.deepEqual(contract.architectureFreeze.c2rCPStartRequiresValidatedTerminalStages, ["C2R-A", "C2R-B"]);
  assert.equal(contract.architectureFreeze.issueClosureUnlocksC2RCP, false);
  assert.equal(contract.architectureFreeze.c2rCPAutomaticStartAllowed, false);
});

test("C2RB-FREEZE-010 preserves complete subject verticals and zero activation", async () => {
  const contract = await json(CONTRACT);
  assert.deepEqual(contract.subjectVerticalFreezes.map((item) => item.stageId), ["C2R-C-P", "C2R-C-T", "C2R-C-L"]);
  assert.deepEqual(contract.subjectVerticalFreezes.map((item) => item.subject), ["PRACTICE", "THEORY", "LAW"]);
  assert.ok(contract.subjectVerticalFreezes.every((item) => item.completeOutcomeRequired === true));
  assert.equal(contract.architectureFreeze.horizontalRuntimeLayerAllowed, false);
  assert.equal(contract.architectureFreeze.commonRuntimeSubstrateFirstStage, "C2R-C-P");
  assert.ok(Object.entries(contract.activationBoundary).filter(([key]) => key !== "sourceContractOnly").every(([, value]) => value === false));
});

test("C2RB-PRECEDENCE-011 registers the later exact decision without rewriting history", async () => {
  const [agents, decision, aDecision, structural] = await Promise.all([
    text("AGENTS.md"),
    text(DECISION),
    text("docs/decisions/2026-08-15-owner-c2r-a-rights-safe-source-firewall.md"),
    text("docs/decisions/2026-08-14-wcv-c2-structural-recovery.md"),
  ]);
  const bIndex = agents.indexOf(DECISION);
  const aIndex = agents.indexOf("docs/decisions/2026-08-15-owner-c2r-a-rights-safe-source-firewall.md");
  const structuralIndex = agents.indexOf("docs/decisions/2026-08-14-wcv-c2-structural-recovery.md");
  assert.ok(bIndex >= 0 && bIndex < aIndex && aIndex < structuralIndex);
  assert.match(decision, /supersedes the 2026-08-15\s+C2R-A decision only/);
  assert.match(aDecision, /post_merge_current_replacement_stage: "C2R-B"/);
  assert.match(structural, /C2R-A and C2R-B are not parallel/);
});

test("C2RB-MANIFEST-012 freezes exactly 18 source-only paths and an executable QA command", async () => {
  const [contract, qa, runner] = await Promise.all([
    json(CONTRACT),
    text(QA),
    text("scripts/run-node-tests.mjs"),
  ]);
  assert.deepEqual(contract.frozenPathManifest, EXPECTED_PATHS);
  assert.equal(new Set(contract.frozenPathManifest).size, 18);
  assert.ok(contract.frozenPathManifest.every((path) => !/^(app|src|lib|supabase|\.github\/workflows)\//.test(path)));
  assert.ok(qa.includes(contract.validation.focusedCommand));
  assert.ok(runner.includes(FOCUSED_TEST));
  assert.equal(contract.stage.replacementTrackingIssue, 725);
  assert.equal(contract.stage.issueClosureAllowed, false);
});
