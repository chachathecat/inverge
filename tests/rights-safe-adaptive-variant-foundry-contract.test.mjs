import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const CONTRACT = "config/dabangil-rights-safe-adaptive-variant-foundry-v1.json";
const EXPECTED_REFERENCE_EDGES = [
  ["SourceEligibilityDecisionV1", "rightsManifestId", "RightsManifestV1", "manifestId"],
  ["SourceEligibilityDecisionV1", "rightsManifestVersionId", "RightsManifestV1", "manifestVersionId"],
  ["SkillBlueprintV1", "sourceDecisionId", "SourceEligibilityDecisionV1", "decisionId"],
  ["VariantCandidateV1", "blueprintId", "SkillBlueprintV1", "blueprintId"],
  ["VariantReleaseArtifactV1", "candidateId", "VariantCandidateV1", "candidateId"],
  ["VariantReleaseArtifactV1", "rightsManifestId", "RightsManifestV1", "manifestId"],
  ["VariantReleaseArtifactV1", "rightsManifestVersionId", "RightsManifestV1", "manifestVersionId"],
  ["ExposureLedgerV1", "artifactId", "VariantReleaseArtifactV1", "artifactId"],
  ["DisputeAndRetirementV1", "artifactId", "VariantReleaseArtifactV1", "artifactId"],
];
const EXPECTED_IDENTITY_FIELDS = [
  ["SourceEligibilityDecisionV1", "decisionId"],
  ["RightsManifestV1", "manifestId"],
  ["RightsManifestV1", "manifestVersionId"],
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
const EXPECTED_OWNED_PATHS = [
  "AGENTS.md",
  "roadmap/active-program.yml",
  "config/dabangil-unified-program-contract.json",
  "config/dabangil-unified-product-multisurface-launch-v1.json",
  "docs/dabangil-unified-program-contract.md",
  "docs/inverge-master-roadmap.md",
  "docs/decisions/2026-08-15-owner-c2r-a-rights-safe-source-firewall.md",
  "docs/strategy/dabangil-rights-safe-adaptive-variant-foundry-v1.md",
  "config/dabangil-rights-safe-adaptive-variant-foundry-v1.json",
  "docs/qa/rights-safe-adaptive-variant-foundry-validation.md",
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

function sourceFieldKey(contract, field) {
  return `${contract}.${field}`;
}

function declaredFields(contract) {
  return [
    ...(contract?.requiredFields ?? []),
    ...(contract?.conditionallyRequiredFieldsWhenAnySharedRoutePermitted ?? []),
  ];
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
    "failClosedWhenDuplicateIdentityVersion",
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
    const sourceFields = declaredFields(requiredContracts[reference.sourceContract]);
    const targetFields = requiredContracts[reference.targetContract]?.requiredFields;
    if (!requiredContracts[reference.sourceContract]) {
      errors.push(`source-contract:${reference.sourceContract}`);
    }
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
    const sourceFields = declaredFields(requiredContracts[identifier.sourceContract]);
    if (!requiredContracts[identifier.sourceContract]) {
      errors.push(`scoped-contract:${identifier.sourceContract}`);
    }
    else if (!sourceFields.includes(identifier.sourceField)) errors.push(`scoped-field:${sourceKey}`);
    if (!identifier.resolutionPolicy || identifier.failClosedWhenUnresolved !== true) {
      errors.push(`scoped-resolution:${sourceKey}`);
    }
    classify(identifier.sourceContract, identifier.sourceField, "external-or-scoped");
  }

  for (const [contractName, requiredContract] of Object.entries(requiredContracts)) {
    for (const field of declaredFields(requiredContract)) {
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
  for (const flag of [
    "decisionBasisChecksumRequired",
    "changedDecisionBasisCreatesNewDecisionIdentityOrExactRevision",
    "missingAmbiguousOrStaleIdentityFailsClosed",
  ]) {
    if (decisionPolicy[flag] !== true) errors.push(`decision-policy:${flag}`);
  }

  const rightsPolicy = integrity.rightsManifestIdentityPolicy ?? {};
  for (const flag of [
    "exactManifestAndVersionIdentityRequired",
    "manifestVersionUniqueWithinManifest",
    "sourceClassExplicit",
    "permittedPurposesExplicit",
    "statusExplicit",
    "validityWindowRequired",
    "changedRightsBasisCreatesNewManifestVersion",
    "unresolvedDuplicateOrAmbiguousVersionFailsClosed",
  ]) {
    if (rightsPolicy[flag] !== true) errors.push(`rights-policy:${flag}`);
  }

  const binding = integrity.conditionalRightsManifestBindingPolicy ?? {};
  if (binding.denyOnlyDecision !== "DENY_ALL_SHARED_ROUTES") {
    errors.push("rights-binding:deny-only-decision");
  }
  for (const flag of [
    "denyOnlyDecisionMayOmitManifest",
    "anySharedRoutePermissionRequiresExactBinding",
    "manifestIdAndVersionMustResolveToSameUniqueManifest",
    "sourceClassMustMatch",
    "decisionPurposeMustBePermitted",
    "decisionAndEvaluationMustBeWithinValidityWindow",
    "missingMismatchExpiredRevokedDisputedBlockedOrAmbiguousFailsClosed",
  ]) {
    if (binding[flag] !== true) errors.push(`rights-binding:${flag}`);
  }
  if (
    JSON.stringify(binding.requiredFieldsExactly) !==
    JSON.stringify(["rightsManifestId", "rightsManifestVersionId", "rightsEvaluatedAt"])
  ) {
    errors.push("rights-binding:required-fields");
  }

  return errors;
}

function assertHostileMutationFails(contract, name, mutate) {
  const candidate = structuredClone(contract);
  mutate(candidate);
  assert.notDeepEqual(validateContractReferenceIntegrity(candidate), [], name);
}

function parseFrontMatter(source) {
  const body = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
  assert.ok(body, "missing front matter");
  const result = {};
  let listKey = null;
  for (const line of body.split(/\r?\n/)) {
    const item = line.match(/^\s+-\s+["']?([^"']+)["']?\s*$/);
    if (item && listKey) {
      result[listKey].push(item[1]);
      continue;
    }
    const field = line.match(/^([a-z0-9_]+):\s*(.*)$/i);
    if (!field) continue;
    const [, key, raw] = field;
    if (raw === "") {
      result[key] = [];
      listKey = key;
      continue;
    }
    listKey = null;
    const value = raw.replace(/^["']|["']$/g, "");
    result[key] =
      value === "true" ? true : value === "false" ? false : /^\d+$/.test(value) ? Number(value) : value;
  }
  return result;
}

function authorityPrecedenceErrors(agents, laterDecisionSource, olderDecisionSource) {
  const errors = [];
  const laterPath =
    "docs/decisions/2026-08-15-owner-c2r-a-rights-safe-source-firewall.md";
  const olderPath =
    "docs/decisions/2026-08-14-wcv-c2-structural-recovery.md";
  const index =
    agents.match(/## Product source of truth([\s\S]*?)## Product scope/)?.[1] ?? "";
  const later = parseFrontMatter(laterDecisionSource);
  const older = parseFrontMatter(olderDecisionSource);

  if (index.indexOf(laterPath) < 0) errors.push("later-decision-missing");
  if (index.indexOf(olderPath) < 0) errors.push("older-decision-missing");
  if (index.indexOf(laterPath) >= index.indexOf(olderPath)) {
    errors.push("later-decision-order");
  }
  if (!later.decision_id || later.decision_id === older.decision_id) {
    errors.push("decision-id-distinct");
  }
  if (
    JSON.stringify(later.supersedes_for_exact_scope) !==
    JSON.stringify([
      "c2r_a_source_contract",
      "post_merge_current_replacement_stage",
      "post_merge_current_replacement_stage_issue",
    ])
  ) {
    errors.push("exact-supersession-scope");
  }
  if (new Set(later.supersedes_for_exact_scope ?? []).size !== 3) {
    errors.push("ambiguous-supersession-scope");
  }
  if (later.repository_authority_effective_on !== "expected_head_pinned_merge") {
    errors.push("authority-effective-on");
  }
  if (
    JSON.stringify(later.operational_successor_start_requires) !==
    JSON.stringify([
      "validated_c2r_a_merge_coverage_receipt",
      "issue_702_terminal_close",
    ])
  ) {
    errors.push("successor-start-requirements");
  }
  if (
    later.post_merge_current_replacement_stage !== "C2R-B" ||
    later.post_merge_current_replacement_stage_issue !== 714
  ) {
    errors.push("post-merge-selector");
  }
  if (
    later.issue_702_closure_requires_validated_receipt !== true ||
    later.automatic_start_allowed !== false
  ) {
    errors.push("receipt-or-auto-start");
  }
  if (
    !/five-stage serial chain/.test(laterDecisionSource) ||
    !/one-writer\/no-auto-start/.test(laterDecisionSource) ||
    !/(?:C2R-B leaving #714 open|leave Issue #714 open)/.test(laterDecisionSource)
  ) {
    errors.push("older-unaffected-ownership");
  }
  if (!/C2R-A and C2R-B are not parallel/.test(olderDecisionSource)) {
    errors.push("older-chain-preservation");
  }
  return errors;
}

function evaluateSharedBlueprintUse(contract, input) {
  const {
    decision,
    manifests,
    requestedPurpose,
    territory,
    useAsOf,
    currentDecisionBasisChecksum,
    releaseManifest,
    aiSelfCertified = false,
    invalidatedByRetirement = false,
  } = input;
  const allowed = new Set(contract.sourcePolicy.sourceClassesExactly);
  const denied = new Set(contract.sourcePolicy.hardDeniedSourceClassesExactly);
  if (decision && !allowed.has(decision.sourceClass)) {
    return { allowed: false, reason: "UNDECLARED_SOURCE_CLASS" };
  }
  if (
    !decision ||
    denied.has(decision.sourceClass) ||
    decision.decision === "DENY_ALL_SHARED_ROUTES"
  ) {
    return { allowed: false, reason: "HARD_DENY" };
  }
  if (aiSelfCertified) return { allowed: false, reason: "AI_SELF_CERTIFICATION" };
  if (
    !decision.decisionId ||
    !decision.decisionBasisChecksum ||
    decision.decisionBasisChecksum !== currentDecisionBasisChecksum
  ) {
    return { allowed: false, reason: "STALE_OR_MISSING_DECISION_IDENTITY" };
  }
  if (
    !decision.rightsManifestId ||
    !decision.rightsManifestVersionId ||
    !decision.rightsEvaluatedAt
  ) {
    assert.equal(
      contract.preBlueprintRightsBinding.releaseManifestCannotRetroactivelyCureMissingBlueprintBinding,
      true,
    );
    void releaseManifest;
    return { allowed: false, reason: "MISSING_PRE_BLUEPRINT_BINDING" };
  }
  const matches = manifests.filter(
    (manifest) =>
      manifest.manifestId === decision.rightsManifestId &&
      manifest.manifestVersionId === decision.rightsManifestVersionId,
  );
  if (matches.length !== 1) {
    return {
      allowed: false,
      reason: matches.length === 0 ? "UNRESOLVED_MANIFEST_VERSION" : "AMBIGUOUS_MANIFEST_VERSION",
    };
  }
  const [manifest] = matches;
  if (manifest.sourceClass !== decision.sourceClass) {
    return { allowed: false, reason: "SOURCE_CLASS_MISMATCH" };
  }
  if (
    !manifest.permittedPurposes.includes(decision.purpose) ||
    !manifest.permittedPurposes.includes(requestedPurpose)
  ) {
    return { allowed: false, reason: "PURPOSE_NOT_PERMITTED" };
  }
  if (
    !manifest.territory.includes("GLOBAL") &&
    !manifest.territory.includes(territory)
  ) {
    return { allowed: false, reason: "TERRITORY_NOT_ELIGIBLE" };
  }
  if (manifest.status !== "ACTIVE") {
    return { allowed: false, reason: `MANIFEST_${manifest.status}` };
  }
  const validFrom = Date.parse(manifest.validFrom);
  const validUntil = Date.parse(manifest.validUntil);
  if (
    !Number.isFinite(validFrom) ||
    !Number.isFinite(validUntil) ||
    validFrom > validUntil
  ) {
    return { allowed: false, reason: "INVALID_MANIFEST_VALIDITY_WINDOW" };
  }
  for (const [label, value] of [
    ["DECISION", decision.decidedAt],
    ["EVALUATION", decision.rightsEvaluatedAt],
    ["USE", useAsOf],
  ]) {
    const instant = Date.parse(value);
    if (!Number.isFinite(instant) || instant < validFrom || instant > validUntil) {
      return { allowed: false, reason: `${label}_OUTSIDE_VALIDITY` };
    }
  }
  if (invalidatedByRetirement) {
    return { allowed: false, reason: "DISPUTE_REVOCATION_OR_RETIREMENT" };
  }
  return { allowed: true, reason: "EXACT_BINDING_VALID" };
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
  assert.deepEqual(contract.requiredContracts.RightsManifestV1.identityFieldsExactly, [
    "manifestId",
    "manifestVersionId",
  ]);
  assert.deepEqual(contract.requiredContracts.RightsManifestV1.usableStatusesExactly, ["ACTIVE"]);
  assert.deepEqual(contract.requiredContracts.RightsManifestV1.failClosedStatusesExactly, [
    "REVOKED",
    "DISPUTED",
    "EXPIRED",
    "BLOCKED",
  ]);
  assert.deepEqual(
    contract.requiredContracts.SourceEligibilityDecisionV1
      .conditionallyRequiredFieldsWhenAnySharedRoutePermitted,
    ["rightsManifestId", "rightsManifestVersionId", "rightsEvaluatedAt"],
  );
  assert.equal(
    contract.requiredContracts.SourceEligibilityDecisionV1.deniedDecisionMayOmitRightsManifestBinding,
    true,
  );
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
    "decision",
    "denialCodes",
    "decidedAt",
    "policyVersion",
    "decisionBasisChecksum",
    "rightsManifestId",
    "rightsManifestVersionId",
    "rightsEvaluatedAt",
  ]);
  assert.match(strategy, /Every reusable `SkillBlueprintV1` binds one stable `sourceDecisionId`/);
  assert.match(strategy, /Missing, empty, stale, ambiguous or unresolved decision lineage blocks/);
  assert.match(strategy, /AI output may\s+neither create nor\s+self-certify/);
  assert.match(qa, /`C2RA-REF-011`/);

  const removeRequiredField = (contractName, field) => (candidate) => {
    candidate.requiredContracts[contractName].requiredFields =
      candidate.requiredContracts[contractName].requiredFields.filter((value) => value !== field);
  };
  const removeConditionalField = (contractName, field) => (candidate) => {
    candidate.requiredContracts[contractName].conditionallyRequiredFieldsWhenAnySharedRoutePermitted =
      candidate.requiredContracts[
        contractName
      ].conditionallyRequiredFieldsWhenAnySharedRoutePermitted.filter((value) => value !== field);
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
  assertHostileMutationFails(
    contract,
    "missing pre-blueprint manifest identity",
    removeConditionalField("SourceEligibilityDecisionV1", "rightsManifestId"),
  );
  assertHostileMutationFails(
    contract,
    "missing pre-blueprint manifest version identity",
    removeConditionalField("SourceEligibilityDecisionV1", "rightsManifestVersionId"),
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
    ["source decision to rights manifest", "SourceEligibilityDecisionV1", "rightsManifestId"],
    [
      "source decision to rights manifest version",
      "SourceEligibilityDecisionV1",
      "rightsManifestVersionId",
    ],
    ["candidate to blueprint", "VariantCandidateV1", "blueprintId"],
    ["release to candidate", "VariantReleaseArtifactV1", "candidateId"],
    ["release to rights manifest", "VariantReleaseArtifactV1", "rightsManifestId"],
    [
      "release to rights manifest version",
      "VariantReleaseArtifactV1",
      "rightsManifestVersionId",
    ],
    ["exposure to release artifact", "ExposureLedgerV1", "artifactId"],
    ["dispute to release artifact", "DisputeAndRetirementV1", "artifactId"],
  ]) {
    assertHostileMutationFails(contract, `missing ${name} lineage`, removeReference(sourceContract, sourceField));
  }
});

test("C2RA-RIGHTS-012 binds exact rights before blueprint extraction and every shared use", async () => {
  const contract = await json(CONTRACT);
  const decision = {
    decisionId: "source-decision-1",
    sourceClass: "INVERGE_ORIGINAL",
    purpose: "SHARED_BLUEPRINT_EXTRACTION",
    decision: "CONDITIONALLY_ELIGIBLE",
    denialCodes: [],
    decidedAt: "2026-08-15T01:00:00.000Z",
    policyVersion: "source-policy-v1",
    decisionBasisChecksum: "basis-current",
    rightsManifestId: "rights-1",
    rightsManifestVersionId: "rights-1-v3",
    rightsEvaluatedAt: "2026-08-15T01:05:00.000Z",
  };
  const manifest = {
    manifestId: "rights-1",
    manifestVersionId: "rights-1-v3",
    sourceClass: "INVERGE_ORIGINAL",
    rightsHolder: "Inverge",
    permittedPurposes: ["SHARED_BLUEPRINT_EXTRACTION"],
    territory: ["KR"],
    validFrom: "2026-08-01T00:00:00.000Z",
    validUntil: "2026-08-31T23:59:59.999Z",
    status: "ACTIVE",
    provenance: "rights-registry-entry-1",
  };
  const base = {
    decision,
    manifests: [manifest],
    requestedPurpose: "SHARED_BLUEPRINT_EXTRACTION",
    territory: "KR",
    useAsOf: "2026-08-15T02:00:00.000Z",
    currentDecisionBasisChecksum: "basis-current",
    releaseManifest: null,
  };

  assert.deepEqual(evaluateSharedBlueprintUse(contract, structuredClone(base)), {
    allowed: true,
    reason: "EXACT_BINDING_VALID",
  });
  assert.equal(
    Object.values(contract.preBlueprintRightsBinding).every((value) => value === true),
    true,
  );
  assert.equal(contract.blueprintUseRevalidation.requiredAtEverySharedRouteUse, true);
  assert.equal(contract.blueprintUseRevalidation.requiredChecksExactly.length, 9);
  assert.equal(
    contract.blueprintUseRevalidation
      .priorDecisionValidityCannotAuthorizeUseAfterManifestExpiryRevocationOrDispute,
    true,
  );

  const hostile = [
    [
      "MISSING_MANIFEST_ON_CONDITIONALLY_ELIGIBLE_DECISION",
      (input) => {
        input.manifests = [];
      },
    ],
    [
      "WRONG_MANIFEST_ID",
      (input) => {
        input.decision.rightsManifestId = "rights-wrong";
      },
    ],
    [
      "RIGHT_MANIFEST_ID_WRONG_VERSION",
      (input) => {
        input.decision.rightsManifestVersionId = "rights-1-v2";
      },
    ],
    [
      "SOURCE_CLASS_MISMATCH",
      (input) => {
        input.manifests[0].sourceClass = "CONTRACTED_EXPERT_ORIGINAL";
      },
    ],
    [
      "PURPOSE_NOT_PERMITTED",
      (input) => {
        input.manifests[0].permittedPurposes = ["PAID_DELIVERY"];
      },
    ],
    [
      "DECISION_TIME_OUTSIDE_VALIDITY",
      (input) => {
        input.decision.decidedAt = "2026-07-31T23:59:59.999Z";
      },
    ],
    [
      "BLUEPRINT_USE_AFTER_EXPIRY",
      (input) => {
        input.useAsOf = "2026-09-01T00:00:00.000Z";
      },
    ],
    [
      "REVOKED_MANIFEST",
      (input) => {
        input.manifests[0].status = "REVOKED";
      },
    ],
    [
      "DISPUTED_MANIFEST",
      (input) => {
        input.manifests[0].status = "DISPUTED";
      },
    ],
    [
      "AMBIGUOUS_DUPLICATE_MANIFEST_VERSION",
      (input) => {
        input.manifests.push(structuredClone(input.manifests[0]));
      },
    ],
    [
      "HARD_DENIED_SOURCE_WITH_VALID_MANIFEST",
      (input) => {
        input.decision.sourceClass = "BLOCKED";
        input.decision.decision = "DENY_ALL_SHARED_ROUTES";
      },
    ],
    [
      "RELEASE_MANIFEST_ATTEMPTS_TO_CURE_ABSENT_PRE_BLUEPRINT_BINDING",
      (input) => {
        delete input.decision.rightsManifestId;
        delete input.decision.rightsManifestVersionId;
        delete input.decision.rightsEvaluatedAt;
        input.releaseManifest = structuredClone(input.manifests[0]);
      },
    ],
    [
      "STALE_DECISION_BASIS_CHECKSUM",
      (input) => {
        input.currentDecisionBasisChecksum = "basis-new";
      },
    ],
    [
      "AI_SELF_CERTIFICATION",
      (input) => {
        input.aiSelfCertified = true;
      },
    ],
  ];
  assert.deepEqual(
    contract.hostileRightsBindingCasesExactly.slice(0, 14),
    hostile.map(([name]) => name),
  );
  for (const [name, mutate] of hostile) {
    const input = structuredClone(base);
    mutate(input);
    assert.equal(evaluateSharedBlueprintUse(contract, input).allowed, false, name);
  }
  for (const [name, mutate] of [
    [
      "UNDECLARED_SOURCE_CLASS",
      (input) => {
        input.decision.sourceClass = "MISSPELLED_OR_UNKNOWN_SOURCE_CLASS";
        input.manifests[0].sourceClass = "MISSPELLED_OR_UNKNOWN_SOURCE_CLASS";
      },
    ],
    [
      "MALFORMED_VALID_FROM",
      (input) => {
        input.manifests[0].validFrom = "not-an-instant";
      },
    ],
    [
      "MISSING_VALID_UNTIL",
      (input) => {
        delete input.manifests[0].validUntil;
      },
    ],
    [
      "INVERTED_VALIDITY_WINDOW",
      (input) => {
        input.manifests[0].validFrom = "2026-09-01T00:00:00.000Z";
      },
    ],
  ]) {
    const input = structuredClone(base);
    mutate(input);
    assert.equal(evaluateSharedBlueprintUse(contract, input).allowed, false, name);
  }
  for (const sourceClass of [
    "USER_PRIVATE_ONLY",
    "ACADEMY_OR_COMMERCIAL_TEXTBOOK",
    "RIGHTS_UNKNOWN",
  ]) {
    const input = structuredClone(base);
    input.decision.sourceClass = sourceClass;
    input.decision.decision = "DENY_ALL_SHARED_ROUTES";
    assert.deepEqual(evaluateSharedBlueprintUse(contract, input), {
      allowed: false,
      reason: "HARD_DENY",
    });
  }
  assert.equal(
    contract.hostileRightsBindingCasesExactly[14],
    "PRIVATE_ACADEMY_OR_UNKNOWN_SOURCE_ENTERS_SHARED_ROUTE",
  );

  const denyOnly = structuredClone(base);
  denyOnly.decision.sourceClass = "BLOCKED";
  denyOnly.decision.decision = "DENY_ALL_SHARED_ROUTES";
  delete denyOnly.decision.rightsManifestId;
  delete denyOnly.decision.rightsManifestVersionId;
  delete denyOnly.decision.rightsEvaluatedAt;
  denyOnly.manifests = [];
  assert.deepEqual(evaluateSharedBlueprintUse(contract, denyOnly), {
    allowed: false,
    reason: "HARD_DENY",
  });
});

test("C2RA-PRECEDENCE-013 registers one exact later supersession and preserves the chain", async () => {
  const [agents, laterDecision, olderDecision, unified, roadmap] = await Promise.all([
    text("AGENTS.md"),
    text("docs/decisions/2026-08-15-owner-c2r-a-rights-safe-source-firewall.md"),
    text("docs/decisions/2026-08-14-wcv-c2-structural-recovery.md"),
    json("config/dabangil-unified-program-contract.json"),
    text("roadmap/active-program.yml"),
  ]);
  assert.deepEqual(authorityPrecedenceErrors(agents, laterDecision, olderDecision), []);

  const laterPath =
    "docs/decisions/2026-08-15-owner-c2r-a-rights-safe-source-firewall.md";
  const olderPath =
    "docs/decisions/2026-08-14-wcv-c2-structural-recovery.md";
  const withoutLater = agents.replace(laterPath, "missing-later-decision.md");
  assert.notDeepEqual(
    authorityPrecedenceErrors(withoutLater, laterDecision, olderDecision),
    [],
  );
  const reordered = agents
    .replace(laterPath, "__LATER_DECISION__")
    .replace(olderPath, laterPath)
    .replace("__LATER_DECISION__", olderPath);
  assert.notDeepEqual(
    authorityPrecedenceErrors(reordered, laterDecision, olderDecision),
    [],
  );

  const sourceAuthority =
    unified.wcvCampaignOverlay.c2StructuralRecovery.c2rASourceContract;
  assert.equal(
    sourceAuthority.decisionId,
    "owner_c2r_a_rights_safe_source_firewall_2026_08_15",
  );
  assert.deepEqual(sourceAuthority.supersedesForExactScope, [
    "c2r_a_source_contract",
    "post_merge_current_replacement_stage",
    "post_merge_current_replacement_stage_issue",
  ]);
  assert.equal(sourceAuthority.postMergeCurrentReplacementStage, "C2R-B");
  assert.equal(sourceAuthority.postMergeCurrentReplacementStageIssue, 714);
  assert.deepEqual(sourceAuthority.operationalSuccessorStartRequires, [
    "validated_c2r_a_merge_coverage_receipt",
    "issue_702_terminal_close",
  ]);
  assert.match(
    roadmap,
    /soleNextReplacementStageDecision: docs\/decisions\/2026-08-14-wcv-c2-structural-recovery\.md/,
  );
  assert.match(roadmap, /c2rBOperationalStartRequiresIssue702Closure: true/);
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

test("C2RA-MATRIX-009 remains rowless after Practice, Theory and Law candidates", async () => {
  const [contract, matrix] = await Promise.all([json(CONTRACT), text("docs/qa/wcv-c2-replacement-regression-matrix.md")]);
  const rows = matrix.split(/\r?\n/).filter((line) => /^\| \d+ \|/.test(line));
  assert.equal(rows.length, 21);
  assert.equal(rows.filter((row) => row.includes(' | `uncovered` |')).length, 0);
  assert.equal(
    rows.filter((row) => row.includes(' | `candidate_coverage_pending_exact_merge` |')).length,
    21,
  );
  assert.equal(rows.some((row) => row.includes('C2R-A')), false);
  assert.deepEqual(contract.regressionMatrix.directRowsAssignedToC2RA, []);
  assert.deepEqual(contract.regressionMatrix.rowsChangedByC2RA, []);
});

test("C2RA-AUTH-010 retains the A transition after terminal Law completion", async () => {
  const [contract, unified, roadmap, agents, decision, qa] = await Promise.all([
    json(CONTRACT),
    json("config/dabangil-unified-program-contract.json"),
    text("roadmap/active-program.yml"),
    text("AGENTS.md"),
    text("docs/decisions/2026-08-15-owner-c2r-a-rights-safe-source-firewall.md"),
    text("docs/qa/rights-safe-adaptive-variant-foundry-validation.md"),
  ]);
  assert.equal(unified.wcvCampaignOverlay.c2StructuralRecovery.replacementStages[0].state, "complete_source_only");
  assert.equal(unified.wcvCampaignOverlay.c2StructuralRecovery.replacementStages[1].state, "complete_source_only");
  assert.equal(unified.wcvCampaignOverlay.c2StructuralRecovery.replacementStages[2].state, "complete_practice_runtime");
  assert.equal(unified.wcvCampaignOverlay.c2StructuralRecovery.replacementStages[3].state, "complete_theory_runtime");
  assert.equal(unified.wcvCampaignOverlay.c2StructuralRecovery.replacementStages[4].state, "complete_law_runtime");
  assert.equal(unified.wcvCampaignOverlay.soleNextReplacementStage, null);
  assert.equal(unified.wcvCampaignOverlay.soleNextReplacementStageIssue, null);
  assert.deepEqual(
    unified.wcvCampaignOverlay.c2StructuralRecovery.replacementStages[0].ownedPathsExactly,
    EXPECTED_OWNED_PATHS,
  );
  assert.match(roadmap, /completedImplementationItem: WCV-C3/);
  assert.match(roadmap, /ownerStudyOsNextMilestone: M4_FIRST_STAGE_COMMON_KERNEL/);
  assert.match(roadmap, /soleNextReplacementStage: null/);
  assert.match(
    agents,
    /Historical post-#717 selector state:[\s\S]*WCV-C3 \/ C3 \/ #706 \/\s+authorized_unstarted/,
  );
  assert.match(agents, /WCV-C3 Foundation Freeze/);
  assert.equal(Object.values(contract.authorizationBoundary).every((value) => value === false), true);
  assert.equal(contract.decision.runtimeReadinessEstablished, false);
  assert.equal(contract.successor.c2rACompletionEffectiveOnlyAfterExpectedHeadPinnedMergeAndValidatedReceipt, true);
  assert.deepEqual(contract.successor.c2rCPBlockedUntilTerminalValidatedStages, ["C2R-A", "C2R-B"]);
  assert.deepEqual(contract.successor.operationalC2RBStartRequires, [
    "VALIDATED_C2R_A_MERGE_COVERAGE_RECEIPT",
    "ISSUE_702_TERMINAL_CLOSE",
  ]);
  assert.deepEqual(contract.ownedPathsExactly, EXPECTED_OWNED_PATHS);
  const decisionManifest =
    decision.match(/## 7\. Exact owned-path manifest([\s\S]*?)No other path/)?.[1] ?? "";
  const qaManifest =
    qa.match(/## Frozen audit and owned-path manifest([\s\S]*?)No runtime/)?.[1] ?? "";
  assert.deepEqual(
    [...decisionManifest.matchAll(/`([^`]+)`/g)].map((match) => match[1]),
    EXPECTED_OWNED_PATHS,
  );
  assert.deepEqual(
    [...qaManifest.matchAll(/`([^`]+)`/g)].map((match) => match[1]),
    EXPECTED_OWNED_PATHS,
  );
});
