import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sourceOfTruthDocs = [
  "AGENTS.md",
  "docs/decisions/2026-07-23-post-650-unified-program-reset.md",
  "docs/dabangil-unified-program-contract.md",
  "config/dabangil-unified-program-contract.json",
  "docs/inverge-second-round-final-product-spec.md",
  "docs/dabangil-second-exam-premium-os.md",
  "docs/dabangil-giii-practical-routine.md",
  "docs/dabangil-deep-review-unit-policy.md",
  "docs/dabangil-premium-figma-brief.md",
  "docs/inverge-master-roadmap.md",
  "docs/inverge-business-model.md",
  "docs/inverge-product-brief.md",
];

const s200rDocs = [
  "docs/dabangil-second-exam-premium-os.md",
  "docs/dabangil-giii-practical-routine.md",
  "docs/dabangil-deep-review-unit-policy.md",
  "docs/dabangil-premium-figma-brief.md",
];

async function read(path) {
  return readFile(path, "utf8");
}

async function combined(paths = sourceOfTruthDocs) {
  const parts = await Promise.all(paths.map(read));
  return parts.join("\n");
}

function parseScalar(rawValue) {
  const value = rawValue.trim();
  if (value === "[]") return [];
  if (value.startsWith("[") && value.endsWith("]")) {
    const body = value.slice(1, -1).trim();
    if (!body) return [];
    return body.split(",").map((entry) => parseScalar(entry));
  }
  if (/^-?\d+$/.test(value)) return Number(value);
  if (value === "true") return true;
  if (value === "false") return false;
  return value.replace(/^['"]|['"]$/g, "");
}

function parseActiveProgram(source) {
  const program = {};
  const items = [];
  let section = null;
  let currentItem = null;

  for (const line of source.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const top = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (top) {
      section = top[1];
      currentItem = null;
      continue;
    }
    if (section === "program") {
      const field = line.match(/^\s{2}([A-Za-z][\w-]*):\s*(.*)$/);
      if (field) program[field[1]] = parseScalar(field[2]);
      continue;
    }
    if (section === "items") {
      const start = line.match(/^\s{2}-\s+id:\s*(.*)$/);
      if (start) {
        currentItem = { id: parseScalar(start[1]) };
        items.push(currentItem);
        continue;
      }
      const field = line.match(/^\s{4}([A-Za-z][\w-]*):\s*(.*)$/);
      if (field && currentItem) currentItem[field[1]] = parseScalar(field[2]);
    }
  }

  return { program, items, byId: new Map(items.map((item) => [item.id, item])) };
}

test("S200R docs lock learner brand, premium product, scope, and GIII model", async () => {
  const docs = await combined();

  assert.match(docs, /learner-facing brand(?:[^\\n]{0,80})답안길/i);
  assert.match(docs, /답안길 2차 합격관제 OS/);
  assert.match(docs, /감평 2차 실무·이론·법규 답안을 시험일까지 운영해주는 합격관제 OS/);
  assert.match(docs, /감정평가실무/);
  assert.match(docs, /감정평가이론/);
  assert.match(docs, /감정평가 및 보상법규/);
  assert.match(docs, /casio_fx_9860giii/);
  assert.match(docs, /시험장 리셋 후에도 손으로 재현 가능한 fx-9860GIII 타건 루틴만 훈련한다/);
  assert.match(docs, /no stored-program dependency|stored-program dependency/i);
});

test("S200R final catalog and Deep Review Unit policy are documented", async () => {
  const docs = await combined();
  const premium = await read("docs/dabangil-second-exam-premium-os.md");
  const business = await read("docs/inverge-business-model.md");
  for (const planId of ["free", "second_os_basic", "second_os_pro", "second_control_premium"]) {
    assert.match(docs, new RegExp(`\\\`${planId}\\\``), `missing final plan ${planId}`);
  }
  for (const skuId of ["deep_review_5", "deep_review_15", "deep_review_40"]) {
    assert.match(docs, new RegExp(`\\\`${skuId}\\\``), `missing Deep Review SKU ${skuId}`);
  }

  assert.match(docs, /1 unit = one 25~50 point sub-question or up to 5 answer pages/);
  assert.match(docs, /2 units = one 100-minute full answer/);
  assert.match(docs, /Failed generation must not consume units/i);
  assert.match(docs, /managed_cohort[\s\S]{0,160}later-only[\s\S]{0,80}disabled/i);
  assert.match(docs, /season_pass[\s\S]{0,120}later-only[\s\S]{0,80}disabled/i);
  assert.match(docs, /No unlimited second-exam precision review|no unlimited second-exam precision review/);
  for (const source of [premium, business]) {
    assert.doesNotMatch(source, /\bactive target\b/i);
    assert.match(source, /taxonomy and pricing hypotheses only[\s\S]{0,160}none is a current offer/i);
    assert.match(source, /target taxonomy only — inactive until O4\/S225/);
  }
  assert.match(business, /taxonomy source of truth \(not active offers\)/i);
});

test("old Core and Intensive labels are not used as final target taxonomy", async () => {
  const docs = await combined();
  const forbiddenFinalTargetPatterns = [
    /Core:\s*(?:월|list-price|정가)/,
    /Intensive:\s*(?:월|list-price|정가)/,
    /Core\s+30\s+reviews/i,
    /Intensive\s+80\s+reviews/i,
    /Free\s+Core\s+Intensive/i,
    /##\s*10\.\d+\s+Core\b/,
    /##\s*10\.\d+\s+Intensive\b/,
  ];

  for (const pattern of forbiddenFinalTargetPatterns) {
    assert.doesNotMatch(docs, pattern);
  }
  assert.match(docs, /Legacy labels `Core` and `Intensive` are not the final target taxonomy/);
});

test("S200R docs preserve no-official-authority and no-B2C-human-review boundaries", async () => {
  const docs = await combined();

  assert.match(docs, /답안길 is not:[\s\S]{0,240}official grader/i);
  assert.match(docs, /답안길 is not:[\s\S]{0,260}official model-answer/i);
  assert.match(docs, /pass-probability product/i);
  assert.match(docs, /guaranteed-score product/i);
  assert.match(docs, /human expert-review B2C service/i);
  assert.match(docs, /must not imply pass guarantee/i);
  assert.match(docs, /must not sell human expert review as a B2C product|B2C 상품으로 판매하지 않는다/i);
});

test("active program adds S200R, completes S201/S202, preserves WIP, and updates downstream dependencies", async () => {
  const roadmap = parseActiveProgram(await read("roadmap/active-program.yml"));

  assert.equal(roadmap.program.wipLimit, 2);
  assert.equal(roadmap.byId.get("S201").status, "completed");
  assert.equal(roadmap.byId.get("S202").status, "completed");

  assert.deepEqual(roadmap.byId.get("S200R"), {
    id: "S200R",
    title: "Dabangil Premium Second-Round Control OS Alignment",
    status: "completed",
    completionScope: "historical_contract_evidence",
    currentReadinessEstablished: false,
    dependencies: ["S201", "S202"],
    lockGroup: "constitution",
    risk: "medium",
    priority: 4,
  });

  assert.deepEqual(roadmap.byId.get("S203").dependencies, ["S200R", "S201", "S202"]);
  assert.deepEqual(roadmap.byId.get("S204").dependencies, ["S200R"]);
  assert.deepEqual(roadmap.byId.get("S205").dependencies, ["S200R", "S201", "S204"]);
  assert.deepEqual(roadmap.byId.get("S210").dependencies, ["S200R", "S201", "S203"]);
  assert.deepEqual(roadmap.byId.get("S219").dependencies, ["S200R"]);
});

test("historical S200-S224 completion does not assert current readiness", async () => {
  const roadmap = parseActiveProgram(await read("roadmap/active-program.yml"));
  const historical = roadmap.items.filter(
    (item) => item.completionScope === "historical_contract_evidence",
  );

  assert.equal(historical.length, 26);
  for (const item of historical) {
    assert.equal(item.completionScope, "historical_contract_evidence", `${item.id} scope`);
    assert.equal(item.currentReadinessEstablished, false, `${item.id} readiness`);
  }
  assert.equal(roadmap.byId.get("S222").status, "completed");
  assert.equal(roadmap.byId.get("S224").status, "completed");
});

test("S235B closeout leaves O3A and first-round downstream work queued", async () => {
  const roadmap = parseActiveProgram(await read("roadmap/active-program.yml"));

  assert.equal(roadmap.byId.get("S235A").status, "completed");
  assert.equal(roadmap.byId.get("S235B").status, "completed");
  assert.equal(roadmap.byId.get("O3A").status, "queued");
  assert.deepEqual(roadmap.byId.get("O3A").dependencies, ["S235A"]);
  assert.equal(roadmap.byId.get("S236A").status, "queued");
  assert.deepEqual(roadmap.byId.get("S236A").dependencies, ["O3A"]);
  assert.equal(roadmap.byId.get("S236B").status, "queued");
  assert.deepEqual(roadmap.byId.get("S236B").dependencies, ["S235B"]);
  assert.equal(roadmap.byId.get("O3B").status, "queued");
  assert.deepEqual(roadmap.byId.get("O3B").dependencies, ["S236B"]);
});

test("active program dependency graph has no missing dependencies or self-dependencies", async () => {
  const roadmap = parseActiveProgram(await read("roadmap/active-program.yml"));
  const ids = new Set(roadmap.items.map((item) => item.id));

  for (const item of roadmap.items) {
    assert.equal(ids.has(item.id), true, `missing own id ${item.id}`);
    for (const dependency of item.dependencies ?? []) {
      assert.equal(ids.has(dependency), true, `${item.id} depends on missing ${dependency}`);
      assert.notEqual(dependency, item.id, `${item.id} must not depend on itself`);
    }
  }
});

test("Post-650 contract fixes authority, product sequence, and learning glossary", async () => {
  const policy = JSON.parse(await read("config/dabangil-unified-program-contract.json"));
  const contract = await read("docs/dabangil-unified-program-contract.md");
  const agents = await read("AGENTS.md");

  assert.equal(policy.contractVersion, "dabangil.unified_program.v1");
  assert.equal(policy.decision.status, "approved_for_contract_reset_only");
  assert.equal(policy.decision.runtimeActivationAuthorized, false);
  assert.equal(policy.decision.dependencyActivationAuthorized, false);
  assert.equal(policy.decision.providerModelPromptActivationAuthorized, false);
  assert.equal(policy.tracks.secondRound.privateFoundingBetaBeforePublicS225, true);
  assert.equal(policy.tracks.secondRound.publicSelfServeActivated, false);
  assert.equal(policy.tracks.firstRound.foundationState, "queued");
  assert.equal(policy.tracks.firstRound.legacyCompatibilityRuntime, "present_unaudited_not_newly_authorized");
  assert.equal(policy.tracks.firstRound.newRuntimeAuthorized, false);
  assert.equal(policy.tracks.bothTrack.requiresAuthenticatedFirstAcceptance, true);
  assert.equal(policy.tracks.bothTrack.requiresAuthenticatedSecondAcceptance, true);
  assert.equal(policy.tracks.academy.namedPartnerRequired, true);
  assert.equal(policy.tracks.academy.instructorExplicitApprovalRequired, true);
  assert.equal(policy.tracks.academy.runtimeAuthorized, false);

  assert.equal(policy.learningContracts.coreOutcome.maximum, 3);
  assert.equal(policy.learningContracts.fullDay.state, "canonical_contract_only");
  assert.equal(policy.learningContracts.fullDay.runtimeAuthorized, false);
  assert.equal(policy.learningContracts.fullDay.maximumAvailableMinutes, 720);
  assert.equal(policy.learningContracts.personalStudyLedger.state, "canonical_contract_only");
  assert.equal(policy.learningContracts.personalStudyLedger.lineageObject, "LearningDocument");
  assert.equal(policy.learningContracts.personalStudyLedger.rawContentPlane, "Personal Raw Vault");
  assert.equal(policy.learningContracts.executionBlock.maximum, null);
  assert.equal(policy.learningContracts.executionBlock.completionChangesMastery, false);
  assert.equal(policy.learningContracts.learningDocument.sharedRawContentAllowed, false);
  assert.equal(policy.learningContracts.reviewUnit.billable, false);
  assert.equal(policy.learningContracts.attemptFirst.exposureHistoryAppendOnly, true);
  assert.equal(policy.learningContracts.guidedStudy.state, "canonical_contract_only");
  assert.equal(policy.learningContracts.guidedStudy.runtimeAuthorized, false);
  assert.equal(policy.learningContracts.guidedStudy.mayRelabelAsIndependent, false);
  assert.equal(policy.learningContracts.guidedStudy.mayEstablishStableMastery, false);
  assert.equal(policy.learningContracts.assistanceAwareMastery.assistanceExposureAndMasteryAreSeparateAxes, true);
  assert.equal(policy.learningContracts.assistanceAwareMastery.id, "assistance-aware mastery");
  assert.equal(policy.learningContracts.assistanceAwareMastery.state, "canonical_contract_only");
  assert.equal(policy.learningContracts.assistanceAwareMastery.runtimeAuthorized, false);
  assert.equal(policy.learningContracts.assistanceAwareMastery.supportedSuccessMayEstablishStableMastery, false);
  assert.equal(policy.firstRoundFoundation.fiveSubjectAdapterContractsOnly, true);
  assert.equal(policy.learningContracts.goldHeldOutPhysicallySeparate, true);
  assert.equal(policy.firstRoundFoundation.qnetRightsGranularity, "per_post_and_per_attached_asset");
  assert.equal(policy.firstRoundFoundation.qnetItemInheritsMostRestrictivePostAssetDecision, true);
  assert.equal(policy.firstRoundFoundation.privateCapturePromotionAllowed, false);
  assert.doesNotMatch(agents, /private_personal_use_only` unless separately promoted/i);
  assert.match(agents, /Private capture remains `private_personal_use_only`[\s\S]{0,180}distinct, separately authored[\s\S]{0,180}Cleared Content Bank path/i);
  assert.deepEqual(policy.resetExecutionBoundary, {
    workShape: "one_docs_contracts_roadmap_pr",
    globalExclusivity: "manual_owner_enforced",
    mutationWip: 1,
    mutationWriter: "root_owner_only",
    additionalAgents: "read_only_auditors",
    runnerAutomaticallyEnforcesGlobalExclusivity: false,
  });
  assert.match(contract, /Golden 3[\s\S]*Wave A[\s\S]*Golden 9[\s\S]*Wave B\/C/);
  assert.match(contract, /second-round authenticated acceptance[\s\S]{0,160}Mineral Cobalt\/Figma\/home contract readiness[\s\S]{0,160}Owner O4 public self-serve approval/);
  assert.match(contract, /LearningDocument[\s\S]{0,900}service answers, notes, handwriting, and raw OCR[\s\S]{0,320}distinct contribution object[\s\S]{0,220}never converts, derives\s+from, or relocates the private `LearningDocument`/);
  assert.match(contract, /2026-06-25 first-round hard-freeze clauses[\s\S]*Superseded only for Foundation/);
});

test("second-round detail cannot bypass private beta, authenticated acceptance, or Academy gates", async () => {
  const spec = await read("docs/inverge-second-round-final-product-spec.md");
  const business = await read("docs/inverge-business-model.md");
  const master = await read("docs/inverge-master-roadmap.md");

  for (const prerequisite of [
    "golden_3_and_golden_9_content_gates_passed",
    "private_founding_beta_wave_bc_complete",
    "second_round_authenticated_acceptance_passed",
    "mineral_cobalt_figma_home_contract_readiness_passed",
    "owner_o4_public_self_serve_approval",
  ]) {
    assert.ok(spec.includes(prerequisite), `missing public prerequisite: ${prerequisite}`);
  }
  assert.match(spec, /target\/source-contract history[\s\S]{0,240}named partner/i);
  assert.match(spec, /exact-scope O4C/);
  assert.match(spec, /Academy는[\s\S]{0,180}named-partner lane[\s\S]{0,120}S225의\s+dependency가 아니다/);
  assert.match(business, /Named partner[\s\S]{0,160}exact-scope O4C[\s\S]{0,120}S225와는 독립/);
  assert.match(business, /Academy is not an S225 public self-serve dependency/);
  assert.match(business, /Academy Pilot-Only Gates[\s\S]{0,360}exact-scope O4C[\s\S]{0,100}do not\s+delay or authorize S225/);
  assert.match(master, /S222 is source-contract evidence only[\s\S]{0,180}not an S225\s+dependency/);
});

test("Founding Beta hypothesis preserves free value and three disjoint units", async () => {
  const policy = JSON.parse(await read("config/dabangil-unified-program-contract.json"));
  const commercial = policy.commercialHypothesis;

  assert.equal(commercial.status, "owner_hypothesis_not_active");
  assert.equal(commercial.invitationOnly, true);
  assert.equal(commercial.priceKrwVatIncluded, 69000);
  assert.equal(commercial.termDays, 30);
  assert.equal(commercial.automaticRenewal, false);
  assert.equal(commercial.includedMeter, "usable_review_unit_v1");
  assert.equal(commercial.includedUnits, 20);
  assert.equal(commercial.lifetimeFullValueFreeReviews, 1);
  assert.equal(commercial.paymentFirstProhibited, true);
  assert.equal(commercial.degradedFreeOutputProhibited, true);
  assert.equal(commercial.activationGate, "O4");
  assert.deepEqual(
    commercial.unitContracts.map((entry) => entry.id),
    ["ReviewUnit", "usable_review_unit_v1", "deep_review_unit"],
  );
  assert.ok(commercial.unitContracts.every((entry) => entry.balanceShared === false));
  assert.deepEqual(commercial.unitSeparation, {
    aliasAllowed: false,
    conversionAllowed: false,
    migrationAllowed: false,
    fallbackAllowed: false,
    balanceSharingAllowed: false,
  });
  assert.deepEqual(commercial.usableReviewUnitBands, [
    { pointsMinimum: 10, pointsMaximum: 25, units: 1 },
    { pointsMinimum: 40, pointsMaximum: 50, units: 2 },
    { pointsMinimum: 100, pointsMaximum: 100, units: 4 },
  ]);
  assert.equal(commercial.ambiguousPointsPolicy, "explicit_pre_submit_estimate_or_manual_decision_required");
  assert.equal(commercial.postResultIncreaseAllowed, false);
});

test("Post-650 data, consent, quarantine, OSS, and Owner gates remain non-active contracts", async () => {
  const policy = JSON.parse(await read("config/dabangil-unified-program-contract.json"));
  const agents = await read("AGENTS.md");
  const governance = await read("docs/inverge-data-governance.md");
  const dataBoundary = await read("docs/inverge-data-boundary.md");
  const unified = await read("docs/dabangil-unified-program-contract.md");
  const legacyBoundarySource = await read("lib/review-os/data-boundary.ts");

  assert.deepEqual(
    policy.dataPlanes.map((entry) => entry.id),
    [
      "Personal Raw Vault",
      "Academy Tenant Vault",
      "Shared Signal Plane",
      "Cleared Content Bank",
      "Model/Eval Registry",
    ],
  );
  assert.equal(policy.dataPlanes.find((entry) => entry.id === "Shared Signal Plane").rawContentAllowed, false);
  assert.match(legacyBoundarySource, /SAFE_DERIVED_SIGNAL_KEYS/);
  assert.equal(policy.legacyDerivedSignalBoundary.existingSafeDerivedSignalKeysSharedSignalEligible, false);
  assert.equal(policy.legacyDerivedSignalBoundary.existingLegacyTelemetrySharedSignalEligible, false);
  assert.equal(policy.legacyDerivedSignalBoundary.futureO2AdapterRequiresClosedValueLevelSchema, true);
  assert.equal(policy.legacyDerivedSignalBoundary.freeTextSharedSignalAllowed, false);
  assert.match(dataBoundary, /safe key name does not prove pseudonymity or non-reconstructiveness/i);
  assert.equal(policy.promotion.automaticPrivateToSharedPromotionAllowed, false);
  assert.equal(policy.promotion.rightsClearedContentMayImproveSharedSystemThroughClearedBank, true);
  assert.equal(policy.promotion.consentedPseudonymousSignalsMayImproveSharedSignalPlane, true);
  assert.equal(policy.promotion.privateFingerprintScope, "domain_separated_vault_scoped");
  assert.deepEqual(policy.promotion.privateFingerprintProperties, {
    keyedOneWay: true,
    vaultSpecificNonExportableDomainKeys: true,
    returnsEqualityOracle: false,
  });
  assert.equal(policy.promotion.globalFingerprintRequiresPromotedClearedContentBankMaterial, true);
  assert.deepEqual(policy.promotion.globalFingerprintAllowedPromotionBases, [
    "rights_cleared_official_owner_created_or_contracted",
    "separately_consented_user_owned_contribution",
  ]);
  assert.deepEqual(policy.promotion.userOwnedContributionBoundary, {
    separatelyAuthoredContributionObjectRequired: true,
    mayReclassifyPrivateServiceArtifact: false,
    rawServiceAnswersNotesHandwritingEligible: false,
    rawOcrEligible: false,
    actualRightsRequired: true,
  });
  assert.equal(policy.promotion.pseudonymousSignalConsentAloneAllowsGlobalFingerprint, false);
  assert.equal(policy.promotion.unscopedPrePromotionCrossVaultComparisonAllowed, false);
  assert.equal(policy.promotion.authorizedPromotionQuarantinePreflightOnly, true);
  assert.deepEqual(policy.promotion.authorizedPromotionQuarantinePreflight, {
    allowed: true,
    comparisonTarget: "Cleared Content Bank",
    requiresRightsPrerequisites: true,
    requiresContentContributionConsentForUserOwnedMaterial: true,
    domainSeparatedAndAccessControlled: true,
    internalLeastPrivilegeOnly: true,
    emitsEqualitySignalToSourceVaultOrUser: false,
    emitsOnlyDecisionMetadata: true,
    createsGlobalIdentifierBeforePromotion: false,
  });
  assert.equal(policy.promotion.privateCaptureResolutionChangesPrivateStatus, false);
  assert.equal(policy.promotion.conflictingAnswerQuarantine, true);
  assert.equal(policy.promotion.poisoningQuarantine, true);
  assert.equal(policy.promotion.onlineWeightUpdateAllowed, false);
  for (const source of [agents, dataBoundary, governance]) {
    assert.match(source, /Online model-weight update[s]? from any input (?:are|is) prohibited|Never perform any online model-weight update from any input/i);
    assert.match(source, /training is offline and requires an exact-scope O5 gate/i);
    assert.doesNotMatch(source, /online (?:user-input )?model-weight updates? from user input/i);
  }
  assert.equal(policy.consentLedger.revocationStopsFutureUseForRevokedPurpose, true);
  assert.ok(policy.consentLedger.revocationCovers.includes("academy_sharing"));
  assert.ok(policy.consentLedger.revocationCovers.includes("offline_model_training_and_dataset_refresh"));
  assert.deepEqual(policy.ossLifecycle, [
    "proposed",
    "benchmark_only",
    "shadow",
    "limited_activation",
    "active",
    "rollback",
  ]);
  assert.deepEqual(policy.ossTransitions.requiredSafetyPath, [
    "benchmark_only",
    "shadow",
    "limited_activation",
    "rollback",
  ]);
  assert.ok(policy.ossTransitions.rollbackAvailableFrom.includes("limited_activation"));
  assert.ok(policy.ossTransitions.rollbackAvailableFrom.includes("active"));
  assert.deepEqual(policy.ossTransitions.forward, [
    "proposed_to_benchmark_only",
    "benchmark_only_to_shadow",
    "shadow_to_limited_activation",
  ]);
  assert.deepEqual(policy.ossTransitions.unscheduled, [
    "limited_activation_to_active",
  ]);
  assert.deepEqual(policy.ossTransitions.edgeRequirements, {
    proposed_to_benchmark_only: {
      requires: [
        "pinned_version",
        "license_and_SBOM",
        "model_asset_rights_if_relevant",
        "isolated_benchmark_environment",
        "fallback_adapter",
        "named_owner",
        "tested_rollback_plan",
      ],
      priorPerformanceOrComparisonEvidenceRequired: false,
      activationGateRequired: false,
      manualQueuedRoadmapSelectionRequired: true,
      automaticTransitionAllowed: false,
    },
    benchmark_only_to_shadow: {
      requires: [
        "stage_specific_benchmark_comparison_evidence",
        "exact_scope_O2_measurement_consent",
        "adapter_specific_shadow_prerequisites",
      ],
      automaticTransitionAllowed: false,
    },
    shadow_to_limited_activation: {
      requires: [
        "same_exact_adapter_version_config_shadow_evidence",
        "exact_scope_O4E_naming_adapter_version_config_cohort_and_purpose",
      ],
      crossAdapterVersionConfigEvidenceSubstitutionAllowed: false,
      automaticTransitionAllowed: false,
    },
  });
  assert.deepEqual(policy.ossTransitions.rollbackTransition, {
    immediateFailSafe: true,
    newOwnerGateRequired: false,
    freshComparisonEvidenceRequired: false,
    testedPlanRequiredBeforeAnyNonProposedStage: true,
  });
  assert.deepEqual(policy.ossTransitions.activeTransition, {
    authorizedByThisReset: false,
    scheduledInRoadmap: false,
    o4eAuthorizes: "limited_activation_only",
    requires: [
      "same_exact_adapter_version_config_limited_activation_evidence",
      "new_roadmap_item",
      "future_exact_scope_O4_distinct_from_O4E",
    ],
  });
  assert.equal(policy.ossOrder.opencvPaddleOcr, "benchmark_only");
  assert.equal(policy.ossOrder.qtiXapiCaliper, "compatibility_contract_only");
  assert.equal(
    policy.ossOrder.tsFsrs,
    "benchmark_only_until_adapter_benchmark_comparison_evidence_o2_measurement_consent_and_beta_evidence_then_learner_hidden_shadow",
  );
  assert.equal(
    policy.ossOrder.pyBkt,
    "benchmark_only_until_adapter_benchmark_comparison_evidence_o2_measurement_consent_and_sufficient_closed_schema_skill_data_then_learner_hidden_shadow",
  );
  assert.equal(
    policy.ossOrder.irtCat,
    "contract_only_offline_analysis_simulation_after_attempts_and_held_out_no_execution_or_pre_O5_fitting",
  );
  assert.deepEqual(policy.ossIrtCatBoundary, {
    state: "contract_only_offline_analysis_and_simulation",
    executionAuthorizedByThisReset: false,
    analysisPrerequisites: [
      "sufficient_independent_attempts",
      "contamination_safe_held_out_data",
    ],
    analysisInputCases: {
      syntheticOrNonPersonalRightsClearedFixtures: {
        futureOfflineAnalysisEligibility: true,
        authorizedByThisReset: false,
        sourceRightsRequired: true,
        learnerOrAcademyDerived: false,
      },
      learnerOrAcademyDerivedAttemptSignals: {
        requires: [
          "exact_O2_approved_purpose",
          "purpose_consent",
          "closed_non_reconstructive_value_schema",
          "purpose_scoped_retention_and_revocation",
          "Shared Signal Plane",
        ],
        tenantContractMaySubstituteForLearnerConsent: false,
        rawContentAllowed: false,
      },
    },
    preO5FittingTrainingOrDatasetRefreshAllowed: false,
    fittingTrainingOrDatasetRefreshRequires: [
      "eligible_inputs_only",
      "separate_exact_purpose_consent",
      "future_exact_scope_O5",
    ],
    futureRuntimeModelParameterConfigInitialStage: "proposed",
  });
  assert.deepEqual(policy.ossShadowPrerequisites, {
    appliesTo: ["ts-fsrs", "pyBKT"],
    preShadowStage: "benchmark_only",
    learnerHiddenInstrumentationAllowedBeforeShadow: false,
    commonRequiredBeforeShadow: [
      "adapter_specific_benchmark_comparison_evidence",
      "exact_scope_O2_measurement_consent_approval",
    ],
    adapterSpecificRequiredBeforeShadow: {
      "ts-fsrs": ["beta_evidence"],
      pyBKT: ["sufficient_closed_schema_skill_event_data"],
    },
  });
  assert.deepEqual(policy.ossShadowSemantics, {
    mode: "observation_and_comparison_only",
    baselineDecisionAuthority: "native_fixed_schedule_and_native_rules_only",
    mayInfluenceRuntimeSurfaces: [],
    prohibitedInfluence: [
      "learner_visible_output",
      "academy_visible_output",
      "Today",
      "Full-Day",
      "Review Queue",
      "mastery",
      "scheduling",
      "recommendations",
      "entitlements",
      "operational_decisions",
      "persisted_product_state",
    ],
    permittedWrite: {
      plane: "Shared Signal Plane",
      requiresExactScopeO2Approval: true,
      requiresPurposeConsent: true,
      pseudonymous: true,
      nonReconstructive: true,
      approvedClosedValueLevelSchema: true,
      freeTextAllowed: false,
      rawContentAllowed: false,
      purposeScopedRetentionRequired: true,
      revocationStopsFutureUse: true,
    },
    modelEvalRegistryWrite: {
      scope: "aggregate_version_and_evidence_metadata_only",
      learnerLevelRecordAllowed: false,
      rawContentAllowed: false,
    },
    rawContentAllowed: false,
    mayInfluenceRuntimeProductBehavior: false,
    aggregateVersionedEvidenceMayInformHumanOwnerGate: true,
    automaticTransitionAllowed: false,
    tsFsrsComparisonBaseline: "fixed_schedule",
    pyBktLearnerVisibleProbabilityAllowed: false,
  });
  assert.deepEqual(policy.ossTrainingBoundary, {
    runtimeCandidatePolicy: {
      frozenAndVersioned: true,
      inPlaceModelOrParameterFittingAllowed: false,
      inPlaceTrainingAllowed: false,
      inPlaceDatasetRefreshAllowed: false,
    },
    preO5ShadowAndLimitedActivation: {
      mode: "inference_and_evaluation_only",
      researchUseAllowed: false,
      efficacyClaimsAllowed: false,
    },
    O2MaySubstituteForO5: false,
    O4EMaySubstituteForO5: false,
    O5ScopesNonTransferable: true,
    eligibleOfflineInputs: [
      "purpose_consented_pseudonymous_non_reconstructive_shared_signal",
      "promoted_rights_cleared_content_bank_material",
    ],
    directPersonalOrAcademyRawContentAllowed: false,
    offlineTrainingOrDatasetRefreshRequires: [
      "eligible_inputs_only",
      "separate_exact_purpose_consent",
      "future_exact_scope_O5",
    ],
    trainingOrRefreshO5AuthorizesRuntimeUse: false,
    trainingOrRefreshO5AuthorizesResearchOrEfficacyClaim: false,
    researchOrEfficacyO5AuthorizesTrainingOrRefresh: false,
    trainedRuntimeCandidate: {
      covers: ["model", "parameter", "adapter_config"],
      newCandidateIdentityRequired: true,
      initialStage: "proposed",
      newManualQueuedRoadmapItemRequired: true,
      completedS270OrO4EEvidenceGateReuseAllowed: false,
      mustIndependentlyClear: [
        "held_out_and_benchmark_evidence",
        "shadow",
        "new_exact_candidate_activation_gate",
      ],
      priorAdapterVersionConfigEvidenceTransferAllowed: false,
      hotSwapIntoExistingLimitedOrActiveAdapterAllowed: false,
    },
    refreshedDataset: {
      newDatasetIdentityRequired: true,
      mustIndependentlyClear: [
        "eligible_input_validation",
        "exact_purpose_consent",
        "rights_and_lineage",
        "quarantine",
        "held_out_validation",
      ],
      privateRawContentAllowed: false,
      runtimeInfluenceByItselfAllowed: false,
      logicalForm: "versioned_manifest_over_existing_eligible_plane_inputs",
      durableBodyStoreCreated: false,
      materialPlanes: ["Shared Signal Plane", "Cleared Content Bank"],
      modelEvalRegistryScope: "version_lineage_and_evidence_manifest_metadata_only",
      materialCopyIntoModelEvalRegistryAllowed: false,
      retainedOutsideFiveCanonicalPlanesAllowed: false,
      exactO5EphemeralMaterialization: {
        leastPrivilegeRequired: true,
        purposeScopedRetentionAndDeletionRequired: true,
        deleteWhenOfflineWorkflowEnds: true,
        durableRetentionAllowed: false,
      },
      runtimeArtifactProducedFromDatasetInitialStage: "proposed",
    },
    onlineWeightUpdateAllowed: false,
  });
  for (const source of [agents, unified]) {
    assert.match(
      source,
      /`ts-fsrs`\/`pyBKT` remain\s+`benchmark_only`, with no learner-hidden\s+instrumentation, until\s+adapter-specific benchmark\/comparison evidence\s+exists and the exact-scope O2\s+measurement\/consent gate is approved\./,
    );
    assert.match(
      source,
      /Only\s+then may they enter learner-hidden\s+`shadow`;/,
    );
    assert.doesNotMatch(source, /`ts-fsrs` and `pyBKT` start in learner-hidden shadow/);
    assert.match(
      source,
      /O4E authorizes limited activation only, never `active`;/,
    );
    assert.match(
      source,
      /future active transition requires that exact adapter\/version\/config's\s+limited-activation evidence, a new roadmap item, and a separate exact-scope O4\s+approval distinct from O4E\./,
    );
    assert.match(
      source,
      /`proposed → benchmark_only`\s+requires a pinned version, license\/SBOM, model-asset rights where relevant, an\s+isolated benchmark environment, a fallback adapter, a named owner, and a\s+tested rollback plan; it requires neither prior performance\/comparison\s+evidence nor an activation gate\./,
    );
    assert.match(
      source,
      /named owner must still manually select\s+the queued roadmap item; benchmark entry or execution is never automatic\./,
    );
    assert.match(
      source,
      /`shadow → limited_activation` requires shadow evidence\s+from the same exact adapter, version, and configuration, plus an exact-scope\s+O4E approval naming adapter, version\/config, cohort, and purpose\. Evidence\s+cannot transfer across adapters, versions, or configurations, and no\s+transition is automatic\./,
    );
    assert.match(
      source,
      /Rollback is [^\n]*immediate[^\n]*fail-safe/,
    );
    assert.match(
      source,
      /never waits\s+for a new Owner\s+gate or fresh comparison evidence/,
    );
    assert.match(
      source,
      /`shadow` is observation\/comparison only\./,
    );
    assert.match(
      source,
      /native fixed schedule and native\s+rules remain the sole decision authority\./,
    );
    assert.match(
      source,
      /Shadow output cannot change\s+learner- or Academy-visible output, Today\/Full-Day, Review Queue, mastery,\s+scheduling, recommendations, entitlements, operational decisions, or\s+persisted product state\./,
    );
    assert.match(
      source,
      /only permitted data write is to the Shared Signal\s+Plane, and only after exact-scope O2 approval, purpose consent, a pseudonymous\s+non-reconstructive transform, and an approved closed value-level schema with\s+no raw content or free text\./,
    );
    assert.match(
      source,
      /Purpose-scoped retention applies and revocation\s+stops future use\./,
    );
    assert.match(
      source,
      /Model\/Eval Registry may receive only aggregate, version,\s+and evidence metadata, never a learner-level record or raw content\. Shadow\s+records cannot influence runtime product behavior\. Aggregate, versioned\s+evidence in the Model\/Eval Registry may inform a human Owner gate, but it can\s+never trigger an automatic transition\./,
    );
    assert.match(
      source,
      /Runtime candidates stay frozen and versioned: `shadow`, `limited_activation`,\s+and any future `active` candidate never fit, train, or refresh in place\./,
    );
    assert.match(
      source,
      /Before O5, shadow and limited activation are inference\/evaluation only and\s+cannot authorize research use or ground an efficacy claim\. O2 and O4E do not\s+substitute for O5\./,
    );
    assert.match(
      source,
      /separate offline training or dataset-refresh workflow\s+requires eligible inputs—purpose-consented pseudonymous non-reconstructive\s+Shared Signal or promoted Cleared Content Bank material only—separate\s+exact-purpose consent, and a future exact-scope O5 gate\. Direct Personal or\s+Academy raw content is ineligible\./,
    );
    assert.match(
      source,
      /O5 scopes are non-transferable:\s+training\/refresh approval does not authorize research opt-in or efficacy\s+claims, and vice versa\./,
    );
    assert.match(
      source,
      /resulting\s+model, parameter, or adapter configuration receives a new candidate identity\s+at `proposed`, a new manually selected queued roadmap item, and no reuse of\s+completed S270\/O4E evidence or gates\./,
    );
    assert.match(
      source,
      /refreshed dataset instead receives a new dataset identity and independently\s+clears eligible-input, exact-consent, rights\/lineage, quarantine, and held-out\s+validation\. It is a versioned logical manifest over eligible bodies that\s+remain in the Shared Signal Plane or Cleared Content Bank, not a new durable\s+body store\./,
    );
    assert.match(
      source,
      /Model\/Eval stores only version, lineage, and evidence manifest\s+metadata, never row bodies\. An exact-O5 offline workflow may make only a\s+least-privilege ephemeral materialization with purpose-scoped\s+retention\/deletion; it is deleted when the workflow ends and is never retained\s+outside the five canonical planes\./,
    );
    assert.match(
      source,
      /IRT\/CAT remains a contract-only offline\s+analysis\/simulation lane after\s+sufficient independent attempts and\s+contamination-safe held-out data;\s+this\s+reset authorizes no IRT\/CAT execution\./,
    );
    assert.match(
      source,
      /Any IRT\/CAT fitting, training, or\s+dataset refresh requires eligible inputs,\s+separate exact-purpose consent,\s+and an exact-scope O5\./,
    );
    assert.match(
      source.replace(/\s+/g, " "),
      /Synthetic or non-personal rights-cleared fixtures may be eligible for a separately authorized future offline analysis under their source rights; this reset does not authorize it\./,
    );
    assert.match(
      source.replace(/\s+/g, " "),
      /Any learner- or Academy-derived attempt signal instead requires an exact O2-approved purpose, purpose consent, a closed non-reconstructive value schema, purpose-scoped retention\/revocation, and storage in the Shared Signal Plane; tenant contract alone is insufficient and raw content is prohibited\./,
    );
  }
  assert.equal(policy.ownerGates.O1, "approved_for_this_reset_only");
  for (const gate of ["O2", "O3", "O4", "O5"]) {
    assert.match(policy.ownerGates[gate], /^future_/);
  }
  assert.equal(policy.roadmapContract.perLockGroupConcurrentWriterLimit, 1);
  assert.equal(policy.roadmapContract.additionalConcurrentWritersInSameLockGroup, 0);
  assert.equal(policy.roadmapContract.sharedControlPlaneOverallMutationWip, 1);
  assert.deepEqual(policy.roadmapContract.historicalCompletionMetadata, {
    range: "S200_through_S224",
    completionScope: "historical_contract_evidence",
    currentReadinessEstablished: false,
  });
  assert.deepEqual(policy.roadmapContract.s234ResetReadyItemIdsSnapshot, [
    "S235A",
    "S235B",
  ]);
  assert.equal(
    policy.roadmapContract.currentStateAuthority,
    "roadmap/active-program.yml",
  );
  assert.equal(policy.roadmapContract.currentReadyItemIdsMirrored, false);
  assert.equal(policy.roadmapContract.selectionAutomaticallyStartsWork, false);
  assert.equal("readyAfterMerge" in policy.roadmapContract, false);
  assert.deepEqual(policy.roadmapContract.primaryStatusesUsed, ["completed", "queued"]);
  assert.deepEqual(policy.roadmapContract.runnerSupportedPrimaryStatuses.blocked, [
    "blocked",
    "human_decision",
  ]);
  assert.equal(policy.roadmapContract.scopedGateEdges.golden9, "O3C");
  assert.equal(policy.roadmapContract.scopedGateEdges.publicSelfServe, "O4D");
  assert.equal(policy.roadmapContract.scopedGateEdges.sharedSignalOssLimitedActivation, "O4E");
  assert.doesNotMatch(governance, /추가 활용은 명시적 동의 또는 계약 근거가 있을 때만 허용/);
  assert.doesNotMatch(governance, /예외: 명시적 동의\/계약\/법적 근거가 있을 때만 추가 재사용/);
  assert.doesNotMatch(governance, /Shared Signal\/content promotion\/offline training:/);
  assert.match(governance, /Shared Signal에는[\s\S]{0,160}raw body는 들어가지 않음/);
  assert.match(governance, /raw service 답안·필기·note·OCR은 content promotion 대상이 아님/);
  assert.match(governance, /별도 창작물의 distinct contribution object[\s\S]{0,180}Cleared Content\s+Bank/);
  assert.match(governance, /offline training은 O5[\s\S]{0,180}direct raw body는 사용하지 않음/);
  assert.match(governance, /tenant 계약만으로 필요한 learner consent를 대체하지 않음/);
  assert.match(governance, /rights-uncleared[\s\S]{0,180}pre-promotion[\s\S]{0,260}approved Cleared Content Bank promotion/);
  const boundaryDocs = await combined([
    "AGENTS.md",
    "docs/inverge-data-boundary.md",
    "docs/inverge-product-constitution.md",
    "docs/inverge-second-round-final-product-spec.md",
  ]);
  assert.doesNotMatch(boundaryDocs, /model-training material without explicit future consent|명시적 동의 없이 모델 학습/);
  assert.match(boundaryDocs, /consent is necessary but not sufficient|consent는 필요조건일 뿐 충분조건이 아니다/i);
});

test("Post-650 owned-file manifest is unique and materialized", async () => {
  const policy = JSON.parse(await read("config/dabangil-unified-program-contract.json"));
  const unique = new Set(policy.ownedFiles);

  assert.equal(unique.size, 35);
  assert.equal(unique.size, policy.ownedFiles.length);
  for (const path of policy.ownedFiles) {
    assert.ok((await read(path)).length > 0, `owned file must exist and be non-empty: ${path}`);
  }
});

test("S200R docs remain metadata-only without raw learner or official question content", async () => {
  const docs = await combined(s200rDocs);

  const forbiddenFields = [
    "rawLearnerText",
    "rawOcrText",
    "rawOCRText",
    "rawQuestionText",
    "rawAnswerText",
    "questionText",
    "answerText",
    "officialAnswer",
    "modelAnswer",
    "learnerAnswer",
    "problemText",
  ];
  for (const field of forbiddenFields) {
    assert.equal(docs.includes(`"${field}"`), false, `${field} must not be committed as structured data`);
  }

  const forbiddenRawPrompts = [
    "다음 중 옳은 것은",
    "다음 중 틀린 것은",
    "위 사례에서",
    "제시문을 읽고",
    "아래 자료를 이용하여",
    "기출문제 원문",
    "문제 전문",
    "답안 전문",
    "OCR 원문",
  ];
  for (const phrase of forbiddenRawPrompts) {
    assert.equal(docs.includes(phrase), false, `raw prompt marker must not appear: ${phrase}`);
  }
});
