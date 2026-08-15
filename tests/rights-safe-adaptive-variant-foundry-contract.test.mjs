import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const CONTRACT = "config/dabangil-rights-safe-adaptive-variant-foundry-v1.json";
const EXPECTED_REFERENCE_EDGES = [
  ["SkillBlueprintV1", "sourceDecisionId", "SourceEligibilityDecisionV1", "decisionId"],
  ["VariantCandidateV1", "blueprintId", "SkillBlueprintV1", "blueprintId"],
  ["VariantReleaseArtifactV1", "candidateId", "VariantCandidateV1", "candidateId"],
  ["VariantReleaseArtifactV1", "rightsManifestId", "RightsManifestV1", "manifestId"],
  ["ExposureLedgerV1", "artifactId", "VariantReleaseArtifactV1", "artifactId"],
  ["DisputeAndRetirementV1", "artifactId", "VariantReleaseArtifactV1", "artifactId"],
];
const EXPECTED_IDENTITY_FIELDS = [
  ["SourceEligibilityDecisionV1", "decisionId"],
  ["RightsManifestV1", "manifestId"],
  ["SkillBlueprintV1", "blueprintId"],
  ["VariantCandidateV1", "candidateId"],
  ["VariantReleaseArtifactV1", "artifactId"],
];
const EXPECTED_SCOPED_IDENTIFIERS = [
  ["HumanCreativeContributionV1", "contributorId", "CONTRIBUTOR_REGISTRY_EXACT_POLICY_SCOPE"],
  ["SkillBlueprintV1", "skillId", "FOUNDRY_SKILL_TAXONOMY_EXACT_VERSION"],
  ["ExposureLedgerV1", "idempotencyKey", "LEARNER_SCOPE_EXPOSURE_OPERATION_IDEMPOTENCY"],
  ["BankScarcityEventV1", "skillId", "FOUNDRY_SKILL_TAXONOMY_EXACT_VERSION"],
];

async function text(path) {
  return readFile(new URL(path, root), "utf8");
}
async function json(path) {
  return JSON.parse(await text(path));
}

function sourceFieldKey(contract, field) {
  return `${contract}.${field}`;
}

function validateContractReferenceIntegrity(contract) {
  const errors = [];
  const requiredContracts = contract.requiredContracts ?? {};
  const integrity = contract.contractReferenceIntegrity ?? {};
  const identities = integrity.identityFieldsExactly ?? [];
  const references = integrity.referencesExactly ?? [];
  const scoped = integrity.externalOrScopedIdentifiersExactly ?? [];
  const expectedReferences = new Map(
    EXPECTED_REFERENCE_EDGES.map(([sourceContract, sourceField, targetContract, targetField]) => [
      sourceFieldKey(sourceContract, sourceField),
      sourceFieldKey(targetContract, targetField),
    ]),
  );
  const classifications = new Map();

  for (const flag of [
    "failClosedWhenReferenceMissing",
    "failClosedWhenReferenceUnresolved",
    "failClosedWhenReferenceAmbiguous",
  ]) {
    if (integrity[flag] !== true) errors.push(`fail-closed:${flag}`);
  }

  function classify(contractName, field, kind) {
    const key = sourceFieldKey(contractName, field);
    const kinds = classifications.get(key) ?? [];
    kinds.push(kind);
    classifications.set(key, kinds);
  }

  for (const identity of identities) {
    const requiredFields = requiredContracts[identity.contract]?.requiredFields;
    if (!requiredFields) errors.push(`identity-contract:${identity.contract}`);
    else if (!requiredFields.includes(identity.field)) {
      errors.push(`identity-field:${sourceFieldKey(identity.contract, identity.field)}`);
    }
    classify(identity.contract, identity.field, "identity");
  }

  const referenceTargets = new Map();
  for (const reference of references) {
    const sourceKey = sourceFieldKey(reference.sourceContract, reference.sourceField);
    const targetKey = sourceFieldKey(reference.targetContract, reference.targetField);
    const sourceFields = requiredContracts[reference.sourceContract]?.requiredFields;
    const targetFields = requiredContracts[reference.targetContract]?.requiredFields;
    if (!sourceFields) errors.push(`source-contract:${reference.sourceContract}`);
    else if (!sourceFields.includes(reference.sourceField)) errors.push(`source-field:${sourceKey}`);
    if (!targetFields) errors.push(`target-contract:${reference.targetContract}`);
    else if (!targetFields.includes(reference.targetField)) errors.push(`target-field:${targetKey}`);

    const targets = referenceTargets.get(sourceKey) ?? [];
    targets.push(targetKey);
    referenceTargets.set(sourceKey, targets);
    classify(reference.sourceContract, reference.sourceField, "internal-reference");
  }

  for (const [sourceKey, targets] of referenceTargets) {
    if (targets.length !== 1) errors.push(`ambiguous-reference:${sourceKey}`);
    const expectedTarget = expectedReferences.get(sourceKey);
    if (!expectedTarget || targets[0] !== expectedTarget) {
      errors.push(`reference-target:${sourceKey}->${targets.join(",")}`);
    }
  }
  for (const [sourceKey, targetKey] of expectedReferences) {
    if (!referenceTargets.has(sourceKey)) errors.push(`missing-reference:${sourceKey}->${targetKey}`);
  }

  for (const identifier of scoped) {
    const sourceKey = sourceFieldKey(identifier.sourceContract, identifier.sourceField);
    const sourceFields = requiredContracts[identifier.sourceContract]?.requiredFields;
    if (!sourceFields) errors.push(`scoped-contract:${identifier.sourceContract}`);
    else if (!sourceFields.includes(identifier.sourceField)) errors.push(`scoped-field:${sourceKey}`);
    if (!identifier.resolutionPolicy || identifier.failClosedWhenUnresolved !== true) {
      errors.push(`scoped-resolution:${sourceKey}`);
    }
    classify(identifier.sourceContract, identifier.sourceField, "external-or-scoped");
  }

  for (const [contractName, requiredContract] of Object.entries(requiredContracts)) {
    for (const field of requiredContract.requiredFields) {
      if (!/(?:Id|Ref|Refs|Key)$/.test(field)) continue;
      const key = sourceFieldKey(contractName, field);
      const kinds = classifications.get(key) ?? [];
      if (kinds.length !== 1) errors.push(`classification:${key}:${kinds.join(",")}`);
    }
  }
  for (const [key, kinds] of classifications) {
    if (kinds.length !== 1) errors.push(`duplicate-classification:${key}:${kinds.join(",")}`);
  }

  const decision = requiredContracts.SourceEligibilityDecisionV1 ?? {};
  if (decision.identityField !== "decisionId") errors.push("decision-identity-field");
  if (decision.identityStable !== true) errors.push("decision-identity-stability");
  if (decision.identityUniqueWithinPolicyScope !== true) errors.push("decision-identity-uniqueness");
  if (!decision.requiredFields?.includes("decisionId")) errors.push("decision-id-required");

  const decisionPolicy = integrity.sourceDecisionIdentityPolicy ?? {};
  for (const flag of [
    "nonEmptyRequired",
    "immutableForExactDecisionRevision",
    "versionedOrInvalidatedWhenDecisionBasisChanges",
  ]) {
    if (decisionPolicy[flag] !== true) errors.push(`decision-policy:${flag}`);
  }
  if (decisionPolicy.aiOutputMayCreateDecisionId !== false) errors.push("decision-policy:ai-create");
  if (decisionPolicy.aiOutputMaySelfCertifyDecisionId !== false) {
    errors.push("decision-policy:ai-self-certify");
  }

  return errors;
}

function assertHostileMutationFails(contract, name, mutate) {
  const candidate = structuredClone(contract);
  mutate(candidate);
  assert.notDeepEqual(validateContractReferenceIntegrity(candidate), [], name);
}

test("keeps the documented C2R-A evidence command executable and focused", async () => {
  const [packageJson, qa] = await Promise.all([
    json("package.json"),
    text("docs/qa/rights-safe-adaptive-variant-foundry-validation.md"),
  ]);
  const intendedTestPaths = [
    "tests/rights-safe-adaptive-variant-foundry-contract.test.mjs",
    "tests/wcv-c2r-structural-recovery-authority.test.mjs",
    "tests/wcv-campaign-authority-roadmap-reconciliation.test.mjs",
    "tests/dabangil-unified-product-multisurface-launch-authority.test.mjs",
  ];
  const canonicalCommand = `node scripts/run-node-tests.mjs ${intendedTestPaths.join(" ")}`;

  assert.equal(packageJson.scripts.test, "node scripts/run-node-tests.mjs");
  assert.equal(Object.hasOwn(packageJson.scripts, "test:node"), false);
  assert.doesNotMatch(qa, /npm run test:node/);
  assert.equal(qa.includes(canonicalCommand), true);

  const documentedCommands = [...qa.matchAll(/`(node scripts\/run-node-tests\.mjs(?: [^`\n]+)?)`/g)].map(
    ([, command]) => command,
  );
  assert.deepEqual(documentedCommands, [canonicalCommand]);
  assert.deepEqual(canonicalCommand.split(/\s+/).slice(2), intendedTestPaths);
  await Promise.all(intendedTestPaths.map((path) => text(path)));
});

test("C2RA-SOURCE-001 and C2RA-RAW-002 fail closed across every shared route", async () => {
  const contract = await json(CONTRACT);
  const sourceClasses = ["INVERGE_ORIGINAL","RIGHTS_CLEARED_OFFICIAL","CONTRACTED_EXPERT_ORIGINAL","CLEARED_DETERMINISTIC_TEMPLATE","USER_PRIVATE_ONLY","ACADEMY_OR_COMMERCIAL_TEXTBOOK","RIGHTS_UNKNOWN","BLOCKED"];
  const denied = ["ACADEMY_OR_COMMERCIAL_TEXTBOOK","USER_PRIVATE_ONLY","RIGHTS_UNKNOWN","BLOCKED"];
  const routes = ["SHARED_BLUEPRINT_EXTRACTION","SHARED_GENERATION_CONTEXT","SHARED_VARIANT_BANK","CROSS_USER_CACHE_OR_REUSE","SHARED_CALIBRATION_BODY","ANALYTICS_BODY","MODEL_TRAINING_BODY","PAID_DELIVERY"];
  assert.deepEqual(contract.sourcePolicy.sourceClassesExactly, sourceClasses);
  assert.deepEqual(contract.sourcePolicy.hardDeniedSourceClassesExactly, denied);
  assert.deepEqual(contract.sourcePolicy.sharedRoutesExactly, routes);
  for (const sourceClass of denied) {
    const decision = contract.sourcePolicy.sourceEligibility[sourceClass];
    assert.equal(decision.decision, "DENY_ALL_SHARED_ROUTES", sourceClass);
    assert.match(decision.denialCode, /^SOURCE_CLASS_.+_SHARED_USE_DENIED$/);
    assert.deepEqual(decision.routeEligibility, Object.fromEntries(routes.map((route) => [route, false])));
  }
  assert.deepEqual(Object.values(contract.sourcePolicy.rawLearnerContent), [false, false, false, false, false, false, false]);
});

test("C2RA-CONTRACT-003 and C2RA-BANK-004 resolve contracts and separated banks", async () => {
  const contract = await json(CONTRACT);
  assert.deepEqual(Object.keys(contract.requiredContracts), ["SourceEligibilityDecisionV1","RightsManifestV1","HumanCreativeContributionV1","SkillBlueprintV1","VariantCandidateV1","VariantReleaseArtifactV1","ExposureLedgerV1","BankScarcityEventV1","DisputeAndRetirementV1"]);
  assert.equal(contract.requiredContracts.RightsManifestV1.releaseBlockedWhenMissingOrInvalid, true);
  assert.equal(contract.requiredContracts.VariantCandidateV1.aiSelfPromotionAllowed, false);
  assert.deepEqual(contract.bankModel.progressionExactly, ["DRAFT_CANDIDATE","AUTOMATED_CHECKED","LEARNING_USABLE","TRANSFER_VERIFIED","CALIBRATION_PILOT","CALIBRATED_MEASUREMENT"]);
  assert.deepEqual(contract.bankModel.holdOrTerminalStatesExactly, ["DISPUTED","BLOCKED","STALE","RETIRED"]);
  assert.deepEqual(contract.bankModel.banksExactly, ["LEARNING_BANK", "TRANSFER_BANK", "MEASUREMENT_BANK"]);
  assert.equal(contract.bankModel.separation.LEARNING_BANK.impliesTransferQualification, false);
  assert.equal(contract.bankModel.separation.TRANSFER_BANK.impliesCalibratedMeasurement, false);
  assert.equal(contract.bankModel.aiOutputMaySelfPublish, false);
  assert.equal(contract.bankModel.aiOutputMaySelfVerify, false);
});

test("C2RA-REF-011 closes every contract identity and reference", async () => {
  const [contract, strategy, qa] = await Promise.all([
    json(CONTRACT),
    text("docs/strategy/dabangil-rights-safe-adaptive-variant-foundry-v1.md"),
    text("docs/qa/rights-safe-adaptive-variant-foundry-validation.md"),
  ]);
  const integrity = contract.contractReferenceIntegrity;

  assert.deepEqual(validateContractReferenceIntegrity(contract), []);
  assert.deepEqual(
    integrity.identityFieldsExactly.map(({ contract: contractName, field }) => [contractName, field]),
    EXPECTED_IDENTITY_FIELDS,
  );
  assert.deepEqual(
    integrity.referencesExactly.map(
      ({ sourceContract, sourceField, targetContract, targetField }) => [
        sourceContract,
        sourceField,
        targetContract,
        targetField,
      ],
    ),
    EXPECTED_REFERENCE_EDGES,
  );
  assert.deepEqual(
    integrity.externalOrScopedIdentifiersExactly.map(
      ({ sourceContract, sourceField, resolutionPolicy }) => [
        sourceContract,
        sourceField,
        resolutionPolicy,
      ],
    ),
    EXPECTED_SCOPED_IDENTIFIERS,
  );
  assert.deepEqual(integrity.sourceDecisionIdentityPolicy.resolvesExactFields, [
    "sourceClass",
    "purpose",
    "policyVersion",
    "decision",
    "denialCodes",
    "decidedAt",
  ]);
  assert.match(strategy, /Every reusable `SkillBlueprintV1` binds one stable `sourceDecisionId`/);
  assert.match(strategy, /Missing, empty, stale, ambiguous or unresolved decision lineage blocks/);
  assert.match(strategy, /AI output may\s+neither create nor self-certify/);
  assert.match(qa, /`C2RA-REF-011`/);

  const removeRequiredField = (contractName, field) => (candidate) => {
    candidate.requiredContracts[contractName].requiredFields =
      candidate.requiredContracts[contractName].requiredFields.filter((value) => value !== field);
  };
  const removeReference = (sourceContract, sourceField) => (candidate) => {
    candidate.contractReferenceIntegrity.referencesExactly =
      candidate.contractReferenceIntegrity.referencesExactly.filter(
        (edge) => edge.sourceContract !== sourceContract || edge.sourceField !== sourceField,
      );
  };
  const findSourceDecisionEdge = (candidate) =>
    candidate.contractReferenceIntegrity.referencesExactly.find(
      (edge) =>
        edge.sourceContract === "SkillBlueprintV1" && edge.sourceField === "sourceDecisionId",
    );

  assertHostileMutationFails(
    contract,
    "missing decision identity",
    removeRequiredField("SourceEligibilityDecisionV1", "decisionId"),
  );
  assertHostileMutationFails(
    contract,
    "missing blueprint source-decision lineage",
    removeRequiredField("SkillBlueprintV1", "sourceDecisionId"),
  );
  assertHostileMutationFails(contract, "wrong source-decision target", (candidate) => {
    Object.assign(findSourceDecisionEdge(candidate), {
      targetContract: "RightsManifestV1",
      targetField: "manifestId",
    });
  });
  assertHostileMutationFails(contract, "ambiguous source-decision target", (candidate) => {
    candidate.contractReferenceIntegrity.referencesExactly.push({
      sourceContract: "SkillBlueprintV1",
      sourceField: "sourceDecisionId",
      targetContract: "RightsManifestV1",
      targetField: "manifestId",
    });
  });
  assertHostileMutationFails(contract, "missing target contract", (candidate) => {
    findSourceDecisionEdge(candidate).targetContract = "MissingDecisionContractV1";
  });
  assertHostileMutationFails(contract, "missing target field", (candidate) => {
    findSourceDecisionEdge(candidate).targetField = "missingDecisionId";
  });
  assertHostileMutationFails(contract, "unresolved references fail open", (candidate) => {
    delete candidate.contractReferenceIntegrity.failClosedWhenReferenceUnresolved;
  });
  assertHostileMutationFails(contract, "mutable decision identity", (candidate) => {
    candidate.requiredContracts.SourceEligibilityDecisionV1.identityStable = false;
  });
  assertHostileMutationFails(contract, "non-unique decision identity", (candidate) => {
    candidate.requiredContracts.SourceEligibilityDecisionV1.identityUniqueWithinPolicyScope = false;
  });

  for (const [name, sourceContract, sourceField] of [
    ["candidate to blueprint", "VariantCandidateV1", "blueprintId"],
    ["release to candidate", "VariantReleaseArtifactV1", "candidateId"],
    ["release to rights manifest", "VariantReleaseArtifactV1", "rightsManifestId"],
    ["exposure to release artifact", "ExposureLedgerV1", "artifactId"],
    ["dispute to release artifact", "DisputeAndRetirementV1", "artifactId"],
  ]) {
    assertHostileMutationFails(contract, `missing ${name} lineage`, removeReference(sourceContract, sourceField));
  }
});

test("C2RA-GAP-005 through C2RA-STATE-008 preserve ordered gates and lineage", async () => {
  const contract = await json(CONTRACT);
  assert.deepEqual(contract.bankFirstGenerationOnGap.stepsExactly, ["SEARCH_ELIGIBLE_BANK_ITEM","ASSIGN_IF_EXACT_SKILL_DIFFICULTY_FAMILY_EXPOSURE_MATCH","RECORD_BODYLESS_BANK_SCARCITY_EVENT_ON_GAP","GENERATE_OFFLINE_BATCH_FOR_PRIORITY_GAPS","REJECT_WITH_CHEAP_GATES_FIRST","ROUTE_SURVIVORS_TO_STRONG_CRITIC_AND_OWNER","RELEASE_TO_LEARNING_BANK_FIRST","PROMOTE_ONLY_FROM_ADDITIONAL_EVIDENCE"]);
  assert.deepEqual(contract.validationCascade.orderExactly, ["SOURCE_AND_RIGHTS","SCHEMA_AND_BLUEPRINT","DETERMINISTIC_AND_SOURCE_VALIDATOR","SIMILARITY_AND_RECONSTRUCTION_FIREWALL","LOW_COST_BLIND_SOLVER","CONDITIONAL_STRONG_CRITIC","OWNER_ADJUDICATION","LEARNER_PILOT_AND_CALIBRATION"]);
  assert.equal(contract.validationCascade.deterministicOrSourceConflictBlocksRelease, true);
  assert.equal(contract.bankFirstGenerationOnGap.realtimeGeneration.permittedUseOnly, "CLEARLY_LABELED_LOW_RISK_GUIDED_PRACTICE");
  for (const [key, value] of Object.entries(contract.bankFirstGenerationOnGap.realtimeGeneration)) {
    if (key !== "permittedUseOnly") assert.equal(value, false, key);
  }
  assert.deepEqual(contract.similarityAndReconstructionFirewall.nearCopyFailureTransformationsExactly, ["NUMBER_ONLY", "NAME_ONLY", "ORDER_ONLY", "WORD_ONLY"]);
  assert.equal(contract.similarityAndReconstructionFirewall.releaseBlockedOnNearCopy, true);
  assert.equal(contract.similarityAndReconstructionFirewall.outputMustNotEnableOriginalReconstruction, true);
  assert.equal(contract.sourcePolicy.similarityReferenceCorpus.secretlyScrapedAcademyFingerprintCorpusAllowed, false);
  assert.equal(contract.disputeRetirementAndLineage.noNewAssignmentInHoldOrTerminalState, true);
  assert.equal(contract.disputeRetirementAndLineage.retirementDoesNotEraseAuditLineage, true);
});

test("C2RA-MATRIX-009 changes no donor row", async () => {
  const [contract, matrix] = await Promise.all([json(CONTRACT), text("docs/qa/wcv-c2-replacement-regression-matrix.md")]);
  const rows = matrix.split(/\r?\n/).filter((line) => /^\| \d+ \|/.test(line));
  assert.equal(rows.length, 21);
  assert.equal(rows.every((row) => row.includes(' | `uncovered` |')), true);
  assert.equal(rows.some((row) => row.includes('C2R-A')), false);
  assert.deepEqual(contract.regressionMatrix.directRowsAssignedToC2RA, []);
  assert.deepEqual(contract.regressionMatrix.rowsChangedByC2RA, []);
});

test("C2RA-AUTH-010 advances only source authority to C2R-B and activates nothing", async () => {
  const [contract, unified, roadmap, agents] = await Promise.all([
    json(CONTRACT),
    json("config/dabangil-unified-program-contract.json"),
    text("roadmap/active-program.yml"),
    text("AGENTS.md"),
  ]);
  assert.equal(unified.wcvCampaignOverlay.c2StructuralRecovery.replacementStages[0].state, "complete_source_only");
  assert.equal(unified.wcvCampaignOverlay.c2StructuralRecovery.replacementStages[1].state, "authorized_unstarted");
  assert.equal(unified.wcvCampaignOverlay.soleNextReplacementStage, "C2R-B");
  assert.equal(unified.wcvCampaignOverlay.soleNextReplacementStageIssue, 714);
  assert.match(roadmap, /soleNextReplacementStage: C2R-B/);
  assert.match(roadmap, /soleNextReplacementStageIssue: 714/);
  assert.match(agents, /current authorized-but-unstarted stage `C2R-B` for Issue #714/);
  assert.equal(Object.values(contract.authorizationBoundary).every((value) => value === false), true);
  assert.equal(contract.decision.runtimeReadinessEstablished, false);
  assert.equal(contract.successor.c2rACompletionEffectiveOnlyAfterExpectedHeadPinnedMergeAndValidatedReceipt, true);
  assert.deepEqual(contract.successor.c2rCPBlockedUntilTerminalValidatedStages, ["C2R-A", "C2R-B"]);
  assert.deepEqual(contract.ownedPathsExactly, ["AGENTS.md","roadmap/active-program.yml","config/dabangil-unified-program-contract.json","config/dabangil-unified-product-multisurface-launch-v1.json","docs/dabangil-unified-program-contract.md","docs/inverge-master-roadmap.md","docs/decisions/2026-08-15-owner-c2r-a-rights-safe-source-firewall.md","docs/strategy/dabangil-rights-safe-adaptive-variant-foundry-v1.md","config/dabangil-rights-safe-adaptive-variant-foundry-v1.json","docs/qa/rights-safe-adaptive-variant-foundry-validation.md","tests/rights-safe-adaptive-variant-foundry-contract.test.mjs","tests/wcv-c2r-structural-recovery-authority.test.mjs","tests/wcv-campaign-authority-roadmap-reconciliation.test.mjs","tests/dabangil-unified-product-multisurface-launch-authority.test.mjs","scripts/run-node-tests.mjs"]);
});
