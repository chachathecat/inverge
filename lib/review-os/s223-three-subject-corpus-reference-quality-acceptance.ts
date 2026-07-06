import { assertNoRawUserDataInDerived, sanitizeDerivedMetadata } from "./data-boundary";
import {
  loadLawSourceVersionReport,
  type LawSourceVersionReport,
} from "./law-source-version-registry";
import { S211_LAW_ANSWER_REVIEW_ENGINE_VERSION } from "./s211-law-answer-review-engine";
import { S214_REFERENCE_ANSWER_PIPELINE_VERSION } from "./s214-reference-answer-pipeline";
import { S215_REFERENCE_ANSWER_RELEASE_GATE_VERSION } from "./s215-reference-answer-release-gate";
import {
  loadSecondRoundQuestionIngestionReport,
  type SecondRoundQuestionIngestionReport,
} from "./second-round-question-registry";
import {
  loadSecondRoundReferenceAnswerPackageReport,
  type SecondRoundReferenceAnswerPackageReport,
} from "./second-round-reference-answer-package-registry";
import {
  loadTheoryConceptCorpusReport,
  type TheoryConceptCorpusReport,
} from "./theory-concept-corpus-registry";
import { S212_THEORY_ANSWER_REVIEW_ENGINE_VERSION } from "./theory-answer-review-engine";
import {
  loadPracticeCalculationUnitReport,
  type PracticeCalculationUnitReport,
} from "./practice-calculation-unit-registry";
import { S213_PRACTICE_ANSWER_REVIEW_ENGINE_VERSION } from "./practice-answer-review-engine";

export const S223_THREE_SUBJECT_CORPUS_ACCEPTANCE_VERSION =
  "s223.three_subject_corpus_reference_quality_acceptance.v1" as const;

export type S223ImplementationMode = "source_acceptance_contract_only";
export type S223Subject = "practice" | "theory" | "law";
export type S223GateStatus =
  | "represented"
  | "present"
  | "not_applicable"
  | "source_contract_ready"
  | "blocked_pending_source_verification"
  | "blocked_pending_runtime_evidence"
  | "blocked_until_s224_runtime_acceptance";

export type S223RuntimeBoundary = {
  learnerRuntimeAcceptanceFlowChanged: false;
  academyRuntimeRouteChanged: false;
  publicArchiveUiAdded: false;
  checkoutAdded: false;
  paymentWebhookAdded: false;
  billingProviderCalled: false;
  productionBillingActivated: false;
  entitlementEnforcementActivated: false;
  productionPricingUiAdded: false;
  authChanged: false;
  providerRuntimeExpanded: false;
  ocrRuntimeExpanded: false;
  supabaseMigrationAdded: false;
  workflowChanged: false;
};

export type S223DataBoundary = {
  metadataOnly: true;
  learnerMaterialIncluded: false;
  ocrMaterialIncluded: false;
  problemMaterialIncluded: false;
  referenceProseIncluded: false;
  sourceExcerptIncluded: false;
  calculationSheetIncluded: false;
  providerPayloadIncluded: false;
  credentialIncluded: false;
  paymentSecretIncluded: false;
  billingSecretIncluded: false;
  assetBytesIncluded: false;
  containsRawContent: false;
};

export type S223AuthorityBoundary = {
  learningReferenceOnly: true;
  authorityClaimAllowed: false;
  officialGradingClaimAllowed: false;
  officialModelAnswerClaimAllowed: false;
  confirmedScoreClaimAllowed: false;
  passProbabilityClaimAllowed: false;
  passFailPredictionClaimAllowed: false;
  guaranteeClaimAllowed: false;
};

export type S223CommonSubjectGate = {
  subject: S223Subject;
  sourceProvenanceMetadataStatus: S223GateStatus;
  subjectCoverageMetadataStatus: S223GateStatus;
  referencePackageStatus: S223GateStatus;
  issueEvidenceReviewDraftStatus: S223GateStatus;
  criticConsensusReleaseGateStatus: S223GateStatus;
  qualityAcceptanceReadinessStatus: S223GateStatus;
  learnerRuntimeAcceptanceStatus: "not_in_s223";
  publicLaunchReadinessStatus: "blocked_until_s224_s225";
  sourceSkeletonCount: number;
  referencePackageCount: number;
  releasedReferencePackageCount: number;
  openBlockingSourceOrConceptCount: number;
  metadataOnly: true;
  containsRawContent: false;
};

export type S223PracticeSubjectGate = S223CommonSubjectGate & {
  subject: "practice";
  practiceCalculationGate: {
    calculationInputMetadataStatus: S223GateStatus;
    supportedCalculationTypeMetadataStatus: S223GateStatus;
    unitCheckStatus: S223GateStatus;
    roundingCheckStatus: S223GateStatus;
    checksumValidationMetadataStatus: S223GateStatus;
    calculatorModel: "casio_fx_9860giii";
    resetSafeHandKeyedRoutineRequired: true;
    storedProgramDependencyAllowed: false;
    calculationMaterialStored: false;
    releaseAllowedUnitCount: number;
    supportedMetadataUnitCount: number;
  };
};

export type S223TheorySubjectGate = S223CommonSubjectGate & {
  subject: "theory";
  theoryConceptGate: {
    conceptNodeReferenceStatus: S223GateStatus;
    definitionCoverageStatus: S223GateStatus;
    comparisonCoverageStatus: S223GateStatus;
    applicationCoverageStatus: S223GateStatus;
    generatedAnswerProseTreatedAsAuthority: false;
    conceptCount: number;
    conceptAnchorCount: number;
  };
};

export type S223LawSubjectGate = S223CommonSubjectGate & {
  subject: "law";
  lawSourceVersionGate: {
    legalSourceVersionStatus: S223GateStatus;
    examDateLawStatus: S223GateStatus;
    currentLawDistinctionStatus: S223GateStatus;
    legalGroundingEvidenceStatus: S223GateStatus;
    sourceExcerptStored: false;
    lawSourceCount: number;
    sourceAnchorCount: number;
  };
};

export type S223SubjectAcceptanceGate =
  | S223PracticeSubjectGate
  | S223TheorySubjectGate
  | S223LawSubjectGate;

export type S223ThreeSubjectCorpusAcceptanceContract = {
  version: typeof S223_THREE_SUBJECT_CORPUS_ACCEPTANCE_VERSION;
  implementationMode: S223ImplementationMode;
  upstreamContracts: {
    s203QuestionRegistrySafeUse: "s203_canonical_question_ingestion_contract_only";
    s207ReferencePackageSafeUse: "s207_reference_answer_package_contract_only";
    s208LawSourceSafeUse: "s208_law_source_version_validation_only";
    s209TheoryConceptSafeUse: "s209_theory_concept_corpus_validation_only";
    s210PracticeCalculationSafeUse: "s210_practice_calculation_unit_contract_only";
    s211LawReviewEngineVersion: typeof S211_LAW_ANSWER_REVIEW_ENGINE_VERSION;
    s212TheoryReviewEngineVersion: typeof S212_THEORY_ANSWER_REVIEW_ENGINE_VERSION;
    s213PracticeReviewEngineVersion: typeof S213_PRACTICE_ANSWER_REVIEW_ENGINE_VERSION;
    s214ReferencePipelineVersion: typeof S214_REFERENCE_ANSWER_PIPELINE_VERSION;
    s215ReleaseGateVersion: typeof S215_REFERENCE_ANSWER_RELEASE_GATE_VERSION;
  };
  subjectScope: S223Subject[];
  requiredAcceptanceSignals: string[];
  runtimeBoundary: S223RuntimeBoundary;
  dataBoundary: S223DataBoundary;
  authorityBoundary: S223AuthorityBoundary;
};

export type S223ReadinessReport = {
  version: typeof S223_THREE_SUBJECT_CORPUS_ACCEPTANCE_VERSION;
  valid: boolean;
  implementationMode: S223ImplementationMode;
  sourceLevelAcceptanceStatus: "accepted_source_contract_only" | "blocked";
  publicLaunchReadinessStatus: "blocked_until_s224_s225";
  subjectGates: S223SubjectAcceptanceGate[];
  totals: {
    subjectCount: number;
    subjectsWithSourceProvenanceMetadata: number;
    subjectsWithReferencePackageContract: number;
    subjectsWithCriticConsensusReleaseGate: number;
    sourceSkeletonCount: number;
    referencePackageCount: number;
    releasedReferencePackageCount: number;
    lawOpenBlockingBlockerCount: number;
    theoryOpenBlockingBlockerCount: number;
    practiceReleaseAllowedUnitCount: number;
    publicLaunchAllowedSubjectCount: number;
  };
  runtimeBoundary: S223RuntimeBoundary;
  dataBoundary: S223DataBoundary;
  authorityBoundary: S223AuthorityBoundary;
  metadataOnly: true;
  containsRawContent: false;
  safeUse: "s223_three_subject_source_quality_acceptance_only";
};

export type S223ValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

type S223ReportInputs = {
  questionReport?: SecondRoundQuestionIngestionReport;
  referenceReport?: SecondRoundReferenceAnswerPackageReport;
  lawReport?: LawSourceVersionReport;
  theoryReport?: TheoryConceptCorpusReport;
  practiceReport?: PracticeCalculationUnitReport;
};

const SUBJECTS: S223Subject[] = ["practice", "theory", "law"];

const RUNTIME_BOUNDARY: S223RuntimeBoundary = {
  learnerRuntimeAcceptanceFlowChanged: false,
  academyRuntimeRouteChanged: false,
  publicArchiveUiAdded: false,
  checkoutAdded: false,
  paymentWebhookAdded: false,
  billingProviderCalled: false,
  productionBillingActivated: false,
  entitlementEnforcementActivated: false,
  productionPricingUiAdded: false,
  authChanged: false,
  providerRuntimeExpanded: false,
  ocrRuntimeExpanded: false,
  supabaseMigrationAdded: false,
  workflowChanged: false,
};

const DATA_BOUNDARY: S223DataBoundary = {
  metadataOnly: true,
  learnerMaterialIncluded: false,
  ocrMaterialIncluded: false,
  problemMaterialIncluded: false,
  referenceProseIncluded: false,
  sourceExcerptIncluded: false,
  calculationSheetIncluded: false,
  providerPayloadIncluded: false,
  credentialIncluded: false,
  paymentSecretIncluded: false,
  billingSecretIncluded: false,
  assetBytesIncluded: false,
  containsRawContent: false,
};

const AUTHORITY_BOUNDARY: S223AuthorityBoundary = {
  learningReferenceOnly: true,
  authorityClaimAllowed: false,
  officialGradingClaimAllowed: false,
  officialModelAnswerClaimAllowed: false,
  confirmedScoreClaimAllowed: false,
  passProbabilityClaimAllowed: false,
  passFailPredictionClaimAllowed: false,
  guaranteeClaimAllowed: false,
};

const FORBIDDEN_RAW_FIELD_NAMES = new Set([
  "answerText",
  "rawAnswerText",
  "userAnswerText",
  "ocrText",
  "rawOcrText",
  "problemText",
  "questionText",
  "referenceText",
  "generatedAnswerProse",
  "sourceExcerpt",
  "providerPayload",
  "paymentSecret",
  "billingSecret",
  "credential",
  "pdfBytes",
  "hwpBytes",
  "imageBytes",
  "calculationSheet",
]);

const AUTHORITY_FLAG_KEYS = new Set([
  "authorityClaimAllowed",
  "officialGradingClaimAllowed",
  "officialModelAnswerClaimAllowed",
  "confirmedScoreClaimAllowed",
  "passProbabilityClaimAllowed",
  "passFailPredictionClaimAllowed",
  "guaranteeClaimAllowed",
]);

const FORBIDDEN_AUTHORITY_COPY_PATTERNS = [
  /official\s+grading/i,
  /official\s+model[- ]?answer/i,
  /confirmed\s+score/i,
  /pass\s+probability/i,
  /pass\/fail\s+prediction/i,
  /pass\s+guarantee/i,
  /guaranteed\s+score/i,
];

function runtimeBoundary(): S223RuntimeBoundary {
  return { ...RUNTIME_BOUNDARY };
}

function dataBoundary(): S223DataBoundary {
  return { ...DATA_BOUNDARY };
}

function authorityBoundary(): S223AuthorityBoundary {
  return { ...AUTHORITY_BOUNDARY };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertS223BoundaryObject(value: unknown, path = "metadata"): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertS223BoundaryObject(entry, `${path}[${index}]`));
    return;
  }
  if (!isRecord(value)) {
    if (typeof value === "string") {
      for (const pattern of FORBIDDEN_AUTHORITY_COPY_PATTERNS) {
        if (pattern.test(value)) throw new Error(`s223-forbidden-authority-copy:${path}`);
      }
    }
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_RAW_FIELD_NAMES.has(key) && child !== false && child !== null) {
      throw new Error(`s223-forbidden-raw-content-field:${path}.${key}`);
    }
    if (AUTHORITY_FLAG_KEYS.has(key) && child !== false) {
      throw new Error(`s223-forbidden-authority-claim-field:${path}.${key}`);
    }
    assertS223BoundaryObject(child, `${path}.${key}`);
  }
}

function boundaryHasOnlyFalseValues(boundary: S223RuntimeBoundary) {
  return Object.values(boundary).every((value) => value === false);
}

function dataBoundaryIsMetadataOnly(boundary: S223DataBoundary) {
  return (
    boundary.metadataOnly === true
    && boundary.learnerMaterialIncluded === false
    && boundary.ocrMaterialIncluded === false
    && boundary.problemMaterialIncluded === false
    && boundary.referenceProseIncluded === false
    && boundary.sourceExcerptIncluded === false
    && boundary.calculationSheetIncluded === false
    && boundary.providerPayloadIncluded === false
    && boundary.credentialIncluded === false
    && boundary.paymentSecretIncluded === false
    && boundary.billingSecretIncluded === false
    && boundary.assetBytesIncluded === false
    && boundary.containsRawContent === false
  );
}

function authorityBoundaryIsDisabled(boundary: S223AuthorityBoundary) {
  return (
    boundary.learningReferenceOnly === true
    && boundary.authorityClaimAllowed === false
    && boundary.officialGradingClaimAllowed === false
    && boundary.officialModelAnswerClaimAllowed === false
    && boundary.confirmedScoreClaimAllowed === false
    && boundary.passProbabilityClaimAllowed === false
    && boundary.passFailPredictionClaimAllowed === false
    && boundary.guaranteeClaimAllowed === false
  );
}

function sourceSkeletonCount(questionReport: SecondRoundQuestionIngestionReport, subject: S223Subject) {
  return questionReport.sourceSkeletons.filter((entry) => entry.subject === subject).length;
}

function referencePackageCount(referenceReport: SecondRoundReferenceAnswerPackageReport, subject: S223Subject) {
  return referenceReport.totals.subjectPackageCounts[subject] ?? 0;
}

function commonGate(
  subject: S223Subject,
  inputs: Required<S223ReportInputs>,
): S223CommonSubjectGate {
  const skeletonCount = sourceSkeletonCount(inputs.questionReport, subject);
  const packageCount = referencePackageCount(inputs.referenceReport, subject);
  return {
    subject,
    sourceProvenanceMetadataStatus: skeletonCount > 0 ? "present" : "blocked_pending_source_verification",
    subjectCoverageMetadataStatus: skeletonCount > 0 ? "present" : "blocked_pending_source_verification",
    referencePackageStatus: "represented",
    issueEvidenceReviewDraftStatus: "represented",
    criticConsensusReleaseGateStatus: "represented",
    qualityAcceptanceReadinessStatus: "source_contract_ready",
    learnerRuntimeAcceptanceStatus: "not_in_s223",
    publicLaunchReadinessStatus: "blocked_until_s224_s225",
    sourceSkeletonCount: skeletonCount,
    referencePackageCount: packageCount,
    releasedReferencePackageCount: inputs.referenceReport.totals.releasedPackageCount,
    openBlockingSourceOrConceptCount: 0,
    metadataOnly: true,
    containsRawContent: false,
  };
}

function practiceGate(inputs: Required<S223ReportInputs>): S223PracticeSubjectGate {
  const base = commonGate("practice", inputs);
  return sanitizeDerivedMetadata({
    ...base,
    qualityAcceptanceReadinessStatus: inputs.practiceReport.totals.supportedMetadataUnitCount > 0
      ? "source_contract_ready"
      : "blocked_pending_source_verification",
    openBlockingSourceOrConceptCount: inputs.practiceReport.totals.blockedReleaseUnitCount,
    practiceCalculationGate: {
      calculationInputMetadataStatus: "present",
      supportedCalculationTypeMetadataStatus: "present",
      unitCheckStatus: "present",
      roundingCheckStatus: "present",
      checksumValidationMetadataStatus: "represented",
      calculatorModel: "casio_fx_9860giii",
      resetSafeHandKeyedRoutineRequired: true,
      storedProgramDependencyAllowed: false,
      calculationMaterialStored: false,
      releaseAllowedUnitCount: inputs.practiceReport.totals.releaseAllowedUnitCount,
      supportedMetadataUnitCount: inputs.practiceReport.totals.supportedMetadataUnitCount,
    },
  }) as S223PracticeSubjectGate;
}

function theoryGate(inputs: Required<S223ReportInputs>): S223TheorySubjectGate {
  const base = commonGate("theory", inputs);
  return sanitizeDerivedMetadata({
    ...base,
    qualityAcceptanceReadinessStatus: "source_contract_ready",
    openBlockingSourceOrConceptCount: inputs.theoryReport.totals.openBlockingBlockerCount,
    theoryConceptGate: {
      conceptNodeReferenceStatus: inputs.theoryReport.totals.conceptCount > 0 ? "present" : "blocked_pending_source_verification",
      definitionCoverageStatus: "represented",
      comparisonCoverageStatus: "represented",
      applicationCoverageStatus: "represented",
      generatedAnswerProseTreatedAsAuthority: false,
      conceptCount: inputs.theoryReport.totals.conceptCount,
      conceptAnchorCount: inputs.theoryReport.totals.conceptAnchorCount,
    },
  }) as S223TheorySubjectGate;
}

function lawGate(inputs: Required<S223ReportInputs>): S223LawSubjectGate {
  const base = commonGate("law", inputs);
  return sanitizeDerivedMetadata({
    ...base,
    qualityAcceptanceReadinessStatus: "source_contract_ready",
    openBlockingSourceOrConceptCount: inputs.lawReport.totals.openBlockingBlockerCount,
    lawSourceVersionGate: {
      legalSourceVersionStatus: inputs.lawReport.totals.lawSourceCount > 0 ? "present" : "blocked_pending_source_verification",
      examDateLawStatus: "represented",
      currentLawDistinctionStatus: "represented",
      legalGroundingEvidenceStatus: "represented",
      sourceExcerptStored: false,
      lawSourceCount: inputs.lawReport.totals.lawSourceCount,
      sourceAnchorCount: inputs.lawReport.totals.sourceAnchorCount,
    },
  }) as S223LawSubjectGate;
}

function loadDefaultReports(): Required<S223ReportInputs> {
  return {
    questionReport: loadSecondRoundQuestionIngestionReport(),
    referenceReport: loadSecondRoundReferenceAnswerPackageReport(),
    lawReport: loadLawSourceVersionReport(),
    theoryReport: loadTheoryConceptCorpusReport(),
    practiceReport: loadPracticeCalculationUnitReport(),
  };
}

export const S223_THREE_SUBJECT_CORPUS_ACCEPTANCE_CONTRACT =
  sanitizeDerivedMetadata({
    version: S223_THREE_SUBJECT_CORPUS_ACCEPTANCE_VERSION,
    implementationMode: "source_acceptance_contract_only",
    upstreamContracts: {
      s203QuestionRegistrySafeUse: "s203_canonical_question_ingestion_contract_only",
      s207ReferencePackageSafeUse: "s207_reference_answer_package_contract_only",
      s208LawSourceSafeUse: "s208_law_source_version_validation_only",
      s209TheoryConceptSafeUse: "s209_theory_concept_corpus_validation_only",
      s210PracticeCalculationSafeUse: "s210_practice_calculation_unit_contract_only",
      s211LawReviewEngineVersion: S211_LAW_ANSWER_REVIEW_ENGINE_VERSION,
      s212TheoryReviewEngineVersion: S212_THEORY_ANSWER_REVIEW_ENGINE_VERSION,
      s213PracticeReviewEngineVersion: S213_PRACTICE_ANSWER_REVIEW_ENGINE_VERSION,
      s214ReferencePipelineVersion: S214_REFERENCE_ANSWER_PIPELINE_VERSION,
      s215ReleaseGateVersion: S215_REFERENCE_ANSWER_RELEASE_GATE_VERSION,
    },
    subjectScope: SUBJECTS,
    requiredAcceptanceSignals: [
      "source_provenance_metadata",
      "subject_coverage_metadata",
      "reference_package_status",
      "issue_evidence_review_draft_status",
      "law_source_version_grounding",
      "theory_concept_coverage",
      "practice_calculation_validation",
      "critic_consensus_release_gate_status",
      "quality_acceptance_readiness_status",
    ],
    runtimeBoundary: runtimeBoundary(),
    dataBoundary: dataBoundary(),
    authorityBoundary: authorityBoundary(),
  }) as S223ThreeSubjectCorpusAcceptanceContract;

export function assertS223MetadataOnly(value: unknown): void {
  assertNoRawUserDataInDerived(value);
  assertS223BoundaryObject(value);
}

export function buildS223ThreeSubjectCorpusAcceptanceReport(
  inputs: S223ReportInputs = {},
): S223ReadinessReport {
  const reports: Required<S223ReportInputs> = {
    ...loadDefaultReports(),
    ...inputs,
  };
  const subjectGates: S223SubjectAcceptanceGate[] = [
    practiceGate(reports),
    theoryGate(reports),
    lawGate(reports),
  ];

  const totals = {
    subjectCount: subjectGates.length,
    subjectsWithSourceProvenanceMetadata: subjectGates.filter((gate) => gate.sourceProvenanceMetadataStatus === "present").length,
    subjectsWithReferencePackageContract: subjectGates.filter((gate) => gate.referencePackageStatus === "represented").length,
    subjectsWithCriticConsensusReleaseGate: subjectGates.filter((gate) => gate.criticConsensusReleaseGateStatus === "represented").length,
    sourceSkeletonCount: reports.questionReport.totals.sourceSkeletonCount,
    referencePackageCount: reports.referenceReport.totals.packageCount,
    releasedReferencePackageCount: reports.referenceReport.totals.releasedPackageCount,
    lawOpenBlockingBlockerCount: reports.lawReport.totals.openBlockingBlockerCount,
    theoryOpenBlockingBlockerCount: reports.theoryReport.totals.openBlockingBlockerCount,
    practiceReleaseAllowedUnitCount: reports.practiceReport.totals.releaseAllowedUnitCount,
    publicLaunchAllowedSubjectCount: 0,
  };

  const valid = (
    totals.subjectCount === 3
    && totals.subjectsWithSourceProvenanceMetadata === 3
    && totals.subjectsWithReferencePackageContract === 3
    && totals.subjectsWithCriticConsensusReleaseGate === 3
    && reports.questionReport.metadataOnly === true
    && reports.referenceReport.metadataOnly === true
    && reports.lawReport.metadataOnly === true
    && reports.theoryReport.metadataOnly === true
    && reports.practiceReport.metadataOnly === true
    && reports.practiceReport.totals.releaseAllowedUnitCount === 0
  );

  const report = sanitizeDerivedMetadata({
    version: S223_THREE_SUBJECT_CORPUS_ACCEPTANCE_VERSION,
    valid,
    implementationMode: "source_acceptance_contract_only",
    sourceLevelAcceptanceStatus: valid ? "accepted_source_contract_only" : "blocked",
    publicLaunchReadinessStatus: "blocked_until_s224_s225",
    subjectGates,
    totals,
    runtimeBoundary: runtimeBoundary(),
    dataBoundary: dataBoundary(),
    authorityBoundary: authorityBoundary(),
    metadataOnly: true,
    containsRawContent: false,
    safeUse: "s223_three_subject_source_quality_acceptance_only",
  }) as S223ReadinessReport;
  assertS223MetadataOnly(report);
  return report;
}

export function validateS223ThreeSubjectCorpusAcceptance(
  contract = S223_THREE_SUBJECT_CORPUS_ACCEPTANCE_CONTRACT,
  report = buildS223ThreeSubjectCorpusAcceptanceReport(),
): S223ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    assertS223MetadataOnly(contract);
    assertS223MetadataOnly(report);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "s223-data-boundary-error");
  }

  if (contract.version !== S223_THREE_SUBJECT_CORPUS_ACCEPTANCE_VERSION) errors.push("contract.version mismatch");
  if (contract.implementationMode !== "source_acceptance_contract_only") errors.push("S223 must remain source acceptance only");
  if (!SUBJECTS.every((subject) => contract.subjectScope.includes(subject))) errors.push("all three second-round subjects are required");
  if (!boundaryHasOnlyFalseValues(contract.runtimeBoundary)) errors.push("contract.runtimeBoundary must remain false");
  if (!dataBoundaryIsMetadataOnly(contract.dataBoundary)) errors.push("contract.dataBoundary must remain metadata-only");
  if (!authorityBoundaryIsDisabled(contract.authorityBoundary)) errors.push("contract.authorityBoundary must remain disabled");
  if (!boundaryHasOnlyFalseValues(report.runtimeBoundary)) errors.push("report.runtimeBoundary must remain false");
  if (!dataBoundaryIsMetadataOnly(report.dataBoundary)) errors.push("report.dataBoundary must remain metadata-only");
  if (!authorityBoundaryIsDisabled(report.authorityBoundary)) errors.push("report.authorityBoundary must remain disabled");
  if (report.valid !== true) errors.push("S223 source-level acceptance report must be valid");
  if (report.sourceLevelAcceptanceStatus !== "accepted_source_contract_only") errors.push("S223 source-level acceptance status must pass");
  if (report.publicLaunchReadinessStatus !== "blocked_until_s224_s225") errors.push("S223 must not authorize public paid launch");
  if (report.totals.publicLaunchAllowedSubjectCount !== 0) errors.push("S223 must not allow subject public launch");

  const subjects = new Set(report.subjectGates.map((gate) => gate.subject));
  for (const subject of SUBJECTS) {
    if (!subjects.has(subject)) errors.push(`missing S223 subject gate ${subject}`);
  }

  const practice = report.subjectGates.find((gate): gate is S223PracticeSubjectGate => gate.subject === "practice");
  if (!practice) {
    errors.push("missing practice gate");
  } else {
    if (practice.practiceCalculationGate.calculatorModel !== "casio_fx_9860giii") errors.push("practice calculator model mismatch");
    if (practice.practiceCalculationGate.storedProgramDependencyAllowed !== false) errors.push("practice stored-program dependency must be false");
    if (practice.practiceCalculationGate.releaseAllowedUnitCount !== 0) errors.push("practice release must remain fail-closed in S223");
  }

  const theory = report.subjectGates.find((gate): gate is S223TheorySubjectGate => gate.subject === "theory");
  if (!theory) {
    errors.push("missing theory gate");
  } else if (theory.theoryConceptGate.generatedAnswerProseTreatedAsAuthority !== false) {
    errors.push("theory generated prose must not be authority");
  }

  const law = report.subjectGates.find((gate): gate is S223LawSubjectGate => gate.subject === "law");
  if (!law) {
    errors.push("missing law gate");
  } else if (law.lawSourceVersionGate.sourceExcerptStored !== false) {
    errors.push("law source excerpts must not be stored");
  }

  return { valid: errors.length === 0, errors, warnings };
}
