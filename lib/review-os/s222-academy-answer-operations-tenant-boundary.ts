import { assertNoRawUserDataInDerived, sanitizeDerivedMetadata } from "./data-boundary";
import { S211_LAW_ANSWER_REVIEW_ENGINE_VERSION } from "./s211-law-answer-review-engine";
import { S220_BILLING_ENTITLEMENT_VERSION, S220_IDEMPOTENT_USAGE_VERSION } from "./s220-billing-entitlement-credit-usage";
import { S221_COST_GUARDRAIL_VERSION, S221_PAID_TRUST_VERSION } from "./s221-paid-trust-privacy-cost-guardrails";
import { S213_PRACTICE_ANSWER_REVIEW_ENGINE_VERSION } from "./practice-answer-review-engine";
import { S212_THEORY_ANSWER_REVIEW_ENGINE_VERSION } from "./theory-answer-review-engine";

export const S222_ACADEMY_ANSWER_OPERATIONS_VERSION =
  "s222.academy_answer_operations_tenant_boundary.v1" as const;

export type S222ImplementationMode = "source_contract_only";

export type S222SubjectScope =
  | "practice"
  | "theory"
  | "law";

export type S222OperatorRole =
  | "academy_owner"
  | "academy_operator"
  | "academy_instructor"
  | "academy_reviewer"
  | "inverge_ops_auditor";

export type S222ForbiddenActorRole =
  | "learner"
  | "anonymous"
  | "billing_client"
  | "service_role_unscoped";

export type S222RouteFamily =
  | "academy_operations"
  | "learner_app"
  | "instructor_legacy"
  | "admin_internal";

export type S222AnswerReviewQueueVisibility =
  | "tenant_metadata_queue"
  | "assigned_operator_metadata_queue"
  | "instructor_approval_metadata_queue"
  | "learner_handoff_metadata_queue";

export type S222AssignmentReviewStatus =
  | "unassigned"
  | "assigned"
  | "in_review"
  | "waiting_instructor_approval"
  | "approved_for_handoff"
  | "returned_for_rework"
  | "archived_metadata_only";

export type S222ReviewEvidenceStatus =
  | "learner_evidence_ref_present"
  | "ocr_confirmation_needed"
  | "reference_package_unverified"
  | "calculation_verification_needed"
  | "source_verified_metadata_only"
  | "blocked_unresolved_source_or_calculation";

export type S222LearnerSafeHandoffStatus =
  | "not_ready"
  | "withheld_until_instructor_approval"
  | "approved_metadata_handoff_ready"
  | "handoff_sent_without_raw_content";

export type S222AuditEventKind =
  | "operator_access_allowed"
  | "operator_access_denied"
  | "queue_visibility_checked"
  | "assignment_status_changed"
  | "review_status_changed"
  | "evidence_status_changed"
  | "handoff_status_changed";

export type S222AccessDeniedReason =
  | "tenant_mismatch"
  | "operator_role_not_allowed"
  | "operator_id_hash_required"
  | "learner_route_forbidden"
  | "route_not_academy_operations";

export type S222RuntimeBoundary = {
  academyRouteAdded: false;
  academyApiRouteAdded: false;
  learnerRouteChanged: false;
  instructorRouteChanged: false;
  authChanged: false;
  supabaseMigrationAdded: false;
  workflowChanged: false;
  checkoutAdded: false;
  paymentWebhookAdded: false;
  billingProviderCalled: false;
  productionBillingActivated: false;
  entitlementEnforcementActivated: false;
  productionPricingUiAdded: false;
  providerRuntimeExpanded: false;
  ocrRuntimeExpanded: false;
  publicArchiveUiAdded: false;
  rawCorpusExpansionAdded: false;
};

export type S222DataBoundary = {
  metadataOnly: true;
  tenantScoped: true;
  learnerArtifactIncluded: false;
  ocrArtifactIncluded: false;
  problemMaterialIncluded: false;
  sourceAnchorExcerptIncluded: false;
  referenceProseIncluded: false;
  providerRuntimePayloadIncluded: false;
  paymentOrBillingRuntimeIncluded: false;
  credentialIncluded: false;
  assetBytesIncluded: false;
  globalReferenceWrite: false;
  containsRawContent: false;
};

export type S222TenantBoundaryContract = {
  academyTenantIdRequired: true;
  tenantScopedOperationState: true;
  crossTenantReadAllowed: false;
  crossTenantWriteAllowed: false;
  tenantIdField: "academyTenantId";
  learnerOwnedPrivateRefsOnly: true;
  sharedReferenceDataMutationAllowed: false;
  allowedRouteFamily: "academy_operations";
};

export type S222OperatorBoundaryContract = {
  allowedRoles: S222OperatorRole[];
  forbiddenActorRoles: S222ForbiddenActorRole[];
  operatorIdMustBeHashed: true;
  learnerActorAllowed: false;
  finalLearnerHandoffRequiresAcademyApproval: true;
  invergeProvidesHumanExpertService: false;
};

export type S222QueueVisibilityContract = {
  visibility: S222AnswerReviewQueueVisibility;
  tenantScoped: true;
  operatorScoped: boolean;
  learnerVisible: boolean;
  learnerArtifactIncluded: false;
  ocrArtifactIncluded: false;
  problemMaterialIncluded: false;
};

export type S222AcademyAnswerOperationsContract = {
  version: typeof S222_ACADEMY_ANSWER_OPERATIONS_VERSION;
  implementationMode: S222ImplementationMode;
  upstreamLawEngineVersion: typeof S211_LAW_ANSWER_REVIEW_ENGINE_VERSION;
  upstreamTheoryEngineVersion: typeof S212_THEORY_ANSWER_REVIEW_ENGINE_VERSION;
  upstreamPracticeEngineVersion: typeof S213_PRACTICE_ANSWER_REVIEW_ENGINE_VERSION;
  upstreamEntitlementVersion: typeof S220_BILLING_ENTITLEMENT_VERSION;
  upstreamIdempotentUsageVersion: typeof S220_IDEMPOTENT_USAGE_VERSION;
  upstreamPaidTrustVersion: typeof S221_PAID_TRUST_VERSION;
  upstreamCostGuardrailVersion: typeof S221_COST_GUARDRAIL_VERSION;
  subjectScope: S222SubjectScope[];
  tenantBoundary: S222TenantBoundaryContract;
  operatorBoundary: S222OperatorBoundaryContract;
  answerReviewQueueVisibility: S222QueueVisibilityContract[];
  assignmentReviewStatuses: S222AssignmentReviewStatus[];
  reviewEvidenceStatuses: S222ReviewEvidenceStatus[];
  learnerSafeHandoffStatuses: S222LearnerSafeHandoffStatus[];
  auditEventKinds: S222AuditEventKind[];
  authorityBoundary: {
    operationalReviewDraftOnly: true;
    learnerFacingAuthorityClaimAllowed: false;
    finalLearnerHandoffRequiresAcademyApproval: true;
    b2cHumanExpertReviewClaimAllowed: false;
  };
  runtimeBoundary: S222RuntimeBoundary;
  dataBoundary: S222DataBoundary;
};

export type S222AcademyOperationAccessInput = {
  academyTenantId: string;
  requestedTenantId: string;
  operatorIdHash: string;
  operatorRole: S222OperatorRole | S222ForbiddenActorRole | string;
  routeFamily: S222RouteFamily;
};

export type S222AccessDecision = {
  contractVersion: typeof S222_ACADEMY_ANSWER_OPERATIONS_VERSION;
  allowed: boolean;
  deniedReasons: S222AccessDeniedReason[];
  academyTenantId: string;
  requestedTenantId: string;
  operatorIdHash: string;
  operatorRole: string;
  routeFamily: S222RouteFamily;
  metadataOnly: true;
  containsRawContent: false;
};

export type S222AcademyOperationQueueItemInput = {
  operationId: string;
  queueItemId: string;
  academyTenantId: string;
  assignmentId: string;
  reviewRequestId: string;
  answerSubmissionRefId: string;
  learnerIdHash: string;
  questionRefId: string;
  subject: S222SubjectScope;
  assignedOperatorIdHash?: string | null;
  queueVisibility?: S222AnswerReviewQueueVisibility;
  assignmentStatus?: S222AssignmentReviewStatus;
  reviewStatus?: S222AssignmentReviewStatus;
  evidenceStatus?: S222ReviewEvidenceStatus;
  learnerSafeHandoffStatus?: S222LearnerSafeHandoffStatus;
  createdAt: string;
  updatedAt: string;
};

export type S222AcademyOperationQueueItem = Required<
  Omit<
    S222AcademyOperationQueueItemInput,
    | "assignedOperatorIdHash"
    | "queueVisibility"
    | "assignmentStatus"
    | "reviewStatus"
    | "evidenceStatus"
    | "learnerSafeHandoffStatus"
  >
> & {
  assignedOperatorIdHash: string | null;
  queueVisibility: S222AnswerReviewQueueVisibility;
  assignmentStatus: S222AssignmentReviewStatus;
  reviewStatus: S222AssignmentReviewStatus;
  evidenceStatus: S222ReviewEvidenceStatus;
  learnerSafeHandoffStatus: S222LearnerSafeHandoffStatus;
  metadataOnly: true;
  containsRawContent: false;
  dataBoundary: S222DataBoundary;
};

export type S222AuditEventInput = {
  eventId: string;
  eventKind: S222AuditEventKind;
  academyTenantId: string;
  operatorIdHash: string;
  operatorRole: S222OperatorRole | string;
  operationId: string;
  queueItemId?: string | null;
  occurredAt: string;
  reasonCode: string;
};

export type S222AuditEvent = S222AuditEventInput & {
  contractVersion: typeof S222_ACADEMY_ANSWER_OPERATIONS_VERSION;
  metadataOnly: true;
  containsRawContent: false;
  runtimeBoundary: S222RuntimeBoundary;
  dataBoundary: S222DataBoundary;
};

export type S222AcademyOperationStateInput = S222AcademyOperationAccessInput & {
  stateId: string;
  generatedAt: string;
  queueItems: S222AcademyOperationQueueItemInput[];
  auditEvents?: S222AuditEventInput[];
};

export type S222AcademyOperationState = {
  contractVersion: typeof S222_ACADEMY_ANSWER_OPERATIONS_VERSION;
  stateId: string;
  academyTenantId: string;
  generatedAt: string;
  accessDecision: S222AccessDecision;
  queueItems: S222AcademyOperationQueueItem[];
  auditEvents: S222AuditEvent[];
  queueItemCount: number;
  tenantScoped: true;
  metadataOnly: true;
  containsRawContent: false;
  runtimeBoundary: S222RuntimeBoundary;
  dataBoundary: S222DataBoundary;
};

export type S222ValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

const SUBJECT_SCOPE: S222SubjectScope[] = ["practice", "theory", "law"];

const ALLOWED_OPERATOR_ROLES: S222OperatorRole[] = [
  "academy_owner",
  "academy_operator",
  "academy_instructor",
  "academy_reviewer",
  "inverge_ops_auditor",
];

const FORBIDDEN_ACTOR_ROLES: S222ForbiddenActorRole[] = [
  "learner",
  "anonymous",
  "billing_client",
  "service_role_unscoped",
];

const ASSIGNMENT_REVIEW_STATUSES: S222AssignmentReviewStatus[] = [
  "unassigned",
  "assigned",
  "in_review",
  "waiting_instructor_approval",
  "approved_for_handoff",
  "returned_for_rework",
  "archived_metadata_only",
];

const REVIEW_EVIDENCE_STATUSES: S222ReviewEvidenceStatus[] = [
  "learner_evidence_ref_present",
  "ocr_confirmation_needed",
  "reference_package_unverified",
  "calculation_verification_needed",
  "source_verified_metadata_only",
  "blocked_unresolved_source_or_calculation",
];

const LEARNER_SAFE_HANDOFF_STATUSES: S222LearnerSafeHandoffStatus[] = [
  "not_ready",
  "withheld_until_instructor_approval",
  "approved_metadata_handoff_ready",
  "handoff_sent_without_raw_content",
];

const AUDIT_EVENT_KINDS: S222AuditEventKind[] = [
  "operator_access_allowed",
  "operator_access_denied",
  "queue_visibility_checked",
  "assignment_status_changed",
  "review_status_changed",
  "evidence_status_changed",
  "handoff_status_changed",
];

const RUNTIME_BOUNDARY: S222RuntimeBoundary = {
  academyRouteAdded: false,
  academyApiRouteAdded: false,
  learnerRouteChanged: false,
  instructorRouteChanged: false,
  authChanged: false,
  supabaseMigrationAdded: false,
  workflowChanged: false,
  checkoutAdded: false,
  paymentWebhookAdded: false,
  billingProviderCalled: false,
  productionBillingActivated: false,
  entitlementEnforcementActivated: false,
  productionPricingUiAdded: false,
  providerRuntimeExpanded: false,
  ocrRuntimeExpanded: false,
  publicArchiveUiAdded: false,
  rawCorpusExpansionAdded: false,
};

const DATA_BOUNDARY: S222DataBoundary = {
  metadataOnly: true,
  tenantScoped: true,
  learnerArtifactIncluded: false,
  ocrArtifactIncluded: false,
  problemMaterialIncluded: false,
  sourceAnchorExcerptIncluded: false,
  referenceProseIncluded: false,
  providerRuntimePayloadIncluded: false,
  paymentOrBillingRuntimeIncluded: false,
  credentialIncluded: false,
  assetBytesIncluded: false,
  globalReferenceWrite: false,
  containsRawContent: false,
};

const FORBIDDEN_METADATA_FIELD_PATTERN =
  /"(?:answerText|rawAnswerText|userAnswerText|ocrText|rawOcrText|problemText|questionText|referenceText|generatedAnswerProse|sourceExcerpt|providerPayload|paymentSecret|billingSecret|credential|pdfBytes|imageBytes|officialQuestionText|officialAnswerText|modelAnswer|instructorComment)"\s*:/i;

const FORBIDDEN_AUTHORITY_FIELD_PATTERN =
  /"(?:officialGrading|officialModelAnswer|confirmedScore|passProbability|passFailPrediction|passGuarantee|guaranteedScore)"\s*:/i;

const FORBIDDEN_AUTHORITY_COPY_PATTERNS = [
  /official\s+grading/i,
  /official\s+model[- ]?answer/i,
  /confirmed\s+score/i,
  /pass\s+probability/i,
  /pass\/fail\s+prediction/i,
  /pass\s+guarantee/i,
  /guaranteed\s+score/i,
];

function runtimeBoundary(): S222RuntimeBoundary {
  return { ...RUNTIME_BOUNDARY };
}

function dataBoundary(): S222DataBoundary {
  return { ...DATA_BOUNDARY };
}

function boundaryHasOnlyFalseValues(boundary: S222RuntimeBoundary) {
  return Object.values(boundary).every((value) => value === false);
}

function dataBoundaryIsMetadataOnly(boundary: S222DataBoundary) {
  return (
    boundary.metadataOnly === true
    && boundary.tenantScoped === true
    && boundary.learnerArtifactIncluded === false
    && boundary.ocrArtifactIncluded === false
    && boundary.problemMaterialIncluded === false
    && boundary.sourceAnchorExcerptIncluded === false
    && boundary.referenceProseIncluded === false
    && boundary.providerRuntimePayloadIncluded === false
    && boundary.paymentOrBillingRuntimeIncluded === false
    && boundary.credentialIncluded === false
    && boundary.assetBytesIncluded === false
    && boundary.globalReferenceWrite === false
    && boundary.containsRawContent === false
  );
}

function arrayContainsAll<T extends string>(actual: readonly T[], expected: readonly T[], label: string, errors: string[]) {
  for (const value of expected) {
    if (!actual.includes(value)) errors.push(`missing ${label} ${value}`);
  }
  if (new Set(actual).size !== actual.length) errors.push(`duplicate ${label}`);
}

export const S222_QUEUE_VISIBILITY_CONTRACT: S222QueueVisibilityContract[] = [
  {
    visibility: "tenant_metadata_queue",
    tenantScoped: true,
    operatorScoped: false,
    learnerVisible: false,
    learnerArtifactIncluded: false,
    ocrArtifactIncluded: false,
    problemMaterialIncluded: false,
  },
  {
    visibility: "assigned_operator_metadata_queue",
    tenantScoped: true,
    operatorScoped: true,
    learnerVisible: false,
    learnerArtifactIncluded: false,
    ocrArtifactIncluded: false,
    problemMaterialIncluded: false,
  },
  {
    visibility: "instructor_approval_metadata_queue",
    tenantScoped: true,
    operatorScoped: true,
    learnerVisible: false,
    learnerArtifactIncluded: false,
    ocrArtifactIncluded: false,
    problemMaterialIncluded: false,
  },
  {
    visibility: "learner_handoff_metadata_queue",
    tenantScoped: true,
    operatorScoped: true,
    learnerVisible: false,
    learnerArtifactIncluded: false,
    ocrArtifactIncluded: false,
    problemMaterialIncluded: false,
  },
];

export const S222_ACADEMY_ANSWER_OPERATIONS_CONTRACT: S222AcademyAnswerOperationsContract = sanitizeDerivedMetadata({
  version: S222_ACADEMY_ANSWER_OPERATIONS_VERSION,
  implementationMode: "source_contract_only",
  upstreamLawEngineVersion: S211_LAW_ANSWER_REVIEW_ENGINE_VERSION,
  upstreamTheoryEngineVersion: S212_THEORY_ANSWER_REVIEW_ENGINE_VERSION,
  upstreamPracticeEngineVersion: S213_PRACTICE_ANSWER_REVIEW_ENGINE_VERSION,
  upstreamEntitlementVersion: S220_BILLING_ENTITLEMENT_VERSION,
  upstreamIdempotentUsageVersion: S220_IDEMPOTENT_USAGE_VERSION,
  upstreamPaidTrustVersion: S221_PAID_TRUST_VERSION,
  upstreamCostGuardrailVersion: S221_COST_GUARDRAIL_VERSION,
  subjectScope: SUBJECT_SCOPE,
  tenantBoundary: {
    academyTenantIdRequired: true,
    tenantScopedOperationState: true,
    crossTenantReadAllowed: false,
    crossTenantWriteAllowed: false,
    tenantIdField: "academyTenantId",
    learnerOwnedPrivateRefsOnly: true,
    sharedReferenceDataMutationAllowed: false,
    allowedRouteFamily: "academy_operations",
  },
  operatorBoundary: {
    allowedRoles: ALLOWED_OPERATOR_ROLES,
    forbiddenActorRoles: FORBIDDEN_ACTOR_ROLES,
    operatorIdMustBeHashed: true,
    learnerActorAllowed: false,
    finalLearnerHandoffRequiresAcademyApproval: true,
    invergeProvidesHumanExpertService: false,
  },
  answerReviewQueueVisibility: S222_QUEUE_VISIBILITY_CONTRACT,
  assignmentReviewStatuses: ASSIGNMENT_REVIEW_STATUSES,
  reviewEvidenceStatuses: REVIEW_EVIDENCE_STATUSES,
  learnerSafeHandoffStatuses: LEARNER_SAFE_HANDOFF_STATUSES,
  auditEventKinds: AUDIT_EVENT_KINDS,
  authorityBoundary: {
    operationalReviewDraftOnly: true,
    learnerFacingAuthorityClaimAllowed: false,
    finalLearnerHandoffRequiresAcademyApproval: true,
    b2cHumanExpertReviewClaimAllowed: false,
  },
  runtimeBoundary: runtimeBoundary(),
  dataBoundary: dataBoundary(),
}) as S222AcademyAnswerOperationsContract;

export function assertS222MetadataOnly(value: unknown): void {
  assertNoRawUserDataInDerived(value);
  const serialized = JSON.stringify(value);
  if (FORBIDDEN_METADATA_FIELD_PATTERN.test(serialized)) {
    throw new Error("s222-metadata-forbidden-content-field");
  }
  if (FORBIDDEN_AUTHORITY_FIELD_PATTERN.test(serialized)) {
    throw new Error("s222-metadata-forbidden-authority-field");
  }
  for (const pattern of FORBIDDEN_AUTHORITY_COPY_PATTERNS) {
    if (pattern.test(serialized)) {
      throw new Error(`s222-forbidden-authority-copy:${pattern}`);
    }
  }
}

export function validateS222AcademyAnswerOperationsContract(
  contract = S222_ACADEMY_ANSWER_OPERATIONS_CONTRACT,
): S222ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    assertS222MetadataOnly(contract);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "s222-data-boundary-error");
  }

  if (contract.version !== S222_ACADEMY_ANSWER_OPERATIONS_VERSION) errors.push("contract.version mismatch");
  if (contract.implementationMode !== "source_contract_only") errors.push("S222 must remain source-contract-only");
  if (contract.upstreamLawEngineVersion !== S211_LAW_ANSWER_REVIEW_ENGINE_VERSION) errors.push("upstreamLawEngineVersion mismatch");
  if (contract.upstreamTheoryEngineVersion !== S212_THEORY_ANSWER_REVIEW_ENGINE_VERSION) errors.push("upstreamTheoryEngineVersion mismatch");
  if (contract.upstreamPracticeEngineVersion !== S213_PRACTICE_ANSWER_REVIEW_ENGINE_VERSION) errors.push("upstreamPracticeEngineVersion mismatch");
  if (contract.upstreamEntitlementVersion !== S220_BILLING_ENTITLEMENT_VERSION) errors.push("upstreamEntitlementVersion mismatch");
  if (contract.upstreamPaidTrustVersion !== S221_PAID_TRUST_VERSION) errors.push("upstreamPaidTrustVersion mismatch");
  if (!boundaryHasOnlyFalseValues(contract.runtimeBoundary)) errors.push("runtimeBoundary must remain false");
  if (!dataBoundaryIsMetadataOnly(contract.dataBoundary)) errors.push("dataBoundary must remain tenant-scoped metadata only");

  arrayContainsAll(contract.subjectScope, SUBJECT_SCOPE, "subject scope", errors);
  arrayContainsAll(contract.operatorBoundary.allowedRoles, ALLOWED_OPERATOR_ROLES, "operator role", errors);
  arrayContainsAll(contract.operatorBoundary.forbiddenActorRoles, FORBIDDEN_ACTOR_ROLES, "forbidden actor role", errors);
  arrayContainsAll(contract.assignmentReviewStatuses, ASSIGNMENT_REVIEW_STATUSES, "assignment status", errors);
  arrayContainsAll(contract.reviewEvidenceStatuses, REVIEW_EVIDENCE_STATUSES, "evidence status", errors);
  arrayContainsAll(contract.learnerSafeHandoffStatuses, LEARNER_SAFE_HANDOFF_STATUSES, "handoff status", errors);
  arrayContainsAll(contract.auditEventKinds, AUDIT_EVENT_KINDS, "audit event kind", errors);

  if (contract.tenantBoundary.allowedRouteFamily !== "academy_operations") errors.push("academy operations route family required");
  if (contract.tenantBoundary.crossTenantReadAllowed !== false || contract.tenantBoundary.crossTenantWriteAllowed !== false) {
    errors.push("cross-tenant operation access must be false");
  }
  if (contract.operatorBoundary.learnerActorAllowed !== false) errors.push("learner actors must not run academy operations");
  if (contract.authorityBoundary.learnerFacingAuthorityClaimAllowed !== false) errors.push("authority claims must remain disabled");
  if (contract.authorityBoundary.finalLearnerHandoffRequiresAcademyApproval !== true) {
    errors.push("learner handoff must require academy approval");
  }

  const visibilityValues = contract.answerReviewQueueVisibility.map((entry) => entry.visibility);
  arrayContainsAll(
    visibilityValues,
    S222_QUEUE_VISIBILITY_CONTRACT.map((entry) => entry.visibility),
    "queue visibility",
    errors,
  );
  for (const entry of contract.answerReviewQueueVisibility) {
    if (entry.tenantScoped !== true) errors.push(`${entry.visibility}.tenantScoped must be true`);
    if (entry.learnerArtifactIncluded !== false || entry.ocrArtifactIncluded !== false || entry.problemMaterialIncluded !== false) {
      errors.push(`${entry.visibility}.content boundary must remain false`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function authorizeS222AcademyOperation(
  input: S222AcademyOperationAccessInput & Record<string, unknown>,
): S222AccessDecision {
  assertS222MetadataOnly(input);
  const deniedReasons: S222AccessDeniedReason[] = [];

  if (!input.academyTenantId || input.requestedTenantId !== input.academyTenantId) {
    deniedReasons.push("tenant_mismatch");
  }
  if (!input.operatorIdHash?.trim()) deniedReasons.push("operator_id_hash_required");
  if (!ALLOWED_OPERATOR_ROLES.includes(input.operatorRole as S222OperatorRole)) {
    deniedReasons.push("operator_role_not_allowed");
  }
  if (input.routeFamily === "learner_app") {
    deniedReasons.push("learner_route_forbidden");
  } else if (input.routeFamily !== "academy_operations") {
    deniedReasons.push("route_not_academy_operations");
  }

  return sanitizeDerivedMetadata({
    contractVersion: S222_ACADEMY_ANSWER_OPERATIONS_VERSION,
    allowed: deniedReasons.length === 0,
    deniedReasons,
    academyTenantId: input.academyTenantId,
    requestedTenantId: input.requestedTenantId,
    operatorIdHash: input.operatorIdHash,
    operatorRole: input.operatorRole,
    routeFamily: input.routeFamily,
    metadataOnly: true,
    containsRawContent: false,
  }) as S222AccessDecision;
}

export function buildS222AuditEvent(input: S222AuditEventInput & Record<string, unknown>): S222AuditEvent {
  assertS222MetadataOnly(input);
  if (!AUDIT_EVENT_KINDS.includes(input.eventKind)) {
    throw new Error(`s222-unknown-audit-event-kind:${input.eventKind}`);
  }
  const event = sanitizeDerivedMetadata({
    contractVersion: S222_ACADEMY_ANSWER_OPERATIONS_VERSION,
    eventId: input.eventId,
    eventKind: input.eventKind,
    academyTenantId: input.academyTenantId,
    operatorIdHash: input.operatorIdHash,
    operatorRole: input.operatorRole,
    operationId: input.operationId,
    queueItemId: input.queueItemId ?? null,
    occurredAt: input.occurredAt,
    reasonCode: input.reasonCode,
    metadataOnly: true,
    containsRawContent: false,
    runtimeBoundary: runtimeBoundary(),
    dataBoundary: dataBoundary(),
  }) as S222AuditEvent;
  assertS222MetadataOnly(event);
  return event;
}

function normalizeQueueItem(
  input: S222AcademyOperationQueueItemInput,
  academyTenantId: string,
): S222AcademyOperationQueueItem {
  if (input.academyTenantId !== academyTenantId) {
    throw new Error("s222-queue-item-tenant-mismatch");
  }
  if (!SUBJECT_SCOPE.includes(input.subject)) {
    throw new Error(`s222-unknown-subject:${input.subject}`);
  }
  const item = sanitizeDerivedMetadata({
    operationId: input.operationId,
    queueItemId: input.queueItemId,
    academyTenantId: input.academyTenantId,
    assignmentId: input.assignmentId,
    reviewRequestId: input.reviewRequestId,
    answerSubmissionRefId: input.answerSubmissionRefId,
    learnerIdHash: input.learnerIdHash,
    questionRefId: input.questionRefId,
    subject: input.subject,
    assignedOperatorIdHash: input.assignedOperatorIdHash ?? null,
    queueVisibility: input.queueVisibility ?? "tenant_metadata_queue",
    assignmentStatus: input.assignmentStatus ?? "unassigned",
    reviewStatus: input.reviewStatus ?? "unassigned",
    evidenceStatus: input.evidenceStatus ?? "learner_evidence_ref_present",
    learnerSafeHandoffStatus: input.learnerSafeHandoffStatus ?? "not_ready",
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    metadataOnly: true,
    containsRawContent: false,
    dataBoundary: dataBoundary(),
  }) as S222AcademyOperationQueueItem;
  assertS222MetadataOnly(item);
  return item;
}

function defaultAuditEvent(input: S222AcademyOperationStateInput, allowed: boolean): S222AuditEvent {
  return buildS222AuditEvent({
    eventId: `${input.stateId}_${allowed ? "access_allowed" : "access_denied"}`,
    eventKind: allowed ? "operator_access_allowed" : "operator_access_denied",
    academyTenantId: input.academyTenantId,
    operatorIdHash: input.operatorIdHash,
    operatorRole: input.operatorRole,
    operationId: input.stateId,
    queueItemId: null,
    occurredAt: input.generatedAt,
    reasonCode: allowed ? "academy_operation_metadata_scope_ok" : "academy_operation_access_denied",
  });
}

export function buildS222AcademyOperationState(
  input: S222AcademyOperationStateInput & Record<string, unknown>,
): S222AcademyOperationState {
  assertS222MetadataOnly(input);
  const accessDecision = authorizeS222AcademyOperation(input);
  if (!accessDecision.allowed) {
    throw new Error(`s222-access-denied:${accessDecision.deniedReasons.join(",")}`);
  }
  const queueItems = input.queueItems.map((item) => normalizeQueueItem(item, input.academyTenantId));
  const auditEvents = (input.auditEvents?.length ? input.auditEvents : [defaultAuditEvent(input, true)]).map((event) =>
    buildS222AuditEvent(event),
  );

  const state = sanitizeDerivedMetadata({
    contractVersion: S222_ACADEMY_ANSWER_OPERATIONS_VERSION,
    stateId: input.stateId,
    academyTenantId: input.academyTenantId,
    generatedAt: input.generatedAt,
    accessDecision,
    queueItems,
    auditEvents,
    queueItemCount: queueItems.length,
    tenantScoped: true,
    metadataOnly: true,
    containsRawContent: false,
    runtimeBoundary: runtimeBoundary(),
    dataBoundary: dataBoundary(),
  }) as S222AcademyOperationState;
  const validation = validateS222AcademyOperationState(state);
  if (!validation.valid) {
    throw new Error(`s222-invalid-operation-state:${validation.errors.join("; ")}`);
  }
  return state;
}

export function validateS222AcademyOperationState(state: S222AcademyOperationState): S222ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    assertS222MetadataOnly(state);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "s222-state-data-boundary-error");
  }
  if (state.contractVersion !== S222_ACADEMY_ANSWER_OPERATIONS_VERSION) errors.push("state.contractVersion mismatch");
  if (!state.stateId) errors.push("stateId is required");
  if (!state.academyTenantId) errors.push("academyTenantId is required");
  if (state.accessDecision.academyTenantId !== state.academyTenantId) errors.push("accessDecision tenant mismatch");
  if (state.accessDecision.allowed !== true) errors.push("accessDecision must be allowed");
  if (state.tenantScoped !== true || state.metadataOnly !== true || state.containsRawContent !== false) {
    errors.push("state must remain tenant-scoped metadata only");
  }
  if (!boundaryHasOnlyFalseValues(state.runtimeBoundary)) errors.push("state.runtimeBoundary must remain false");
  if (!dataBoundaryIsMetadataOnly(state.dataBoundary)) errors.push("state.dataBoundary must remain metadata-only");
  if (state.queueItemCount !== state.queueItems.length) errors.push("queueItemCount mismatch");

  for (const item of state.queueItems) {
    if (item.academyTenantId !== state.academyTenantId) errors.push(`${item.queueItemId}.academyTenantId mismatch`);
    if (!SUBJECT_SCOPE.includes(item.subject)) errors.push(`${item.queueItemId}.subject unknown`);
    if (!ASSIGNMENT_REVIEW_STATUSES.includes(item.assignmentStatus)) errors.push(`${item.queueItemId}.assignmentStatus unknown`);
    if (!ASSIGNMENT_REVIEW_STATUSES.includes(item.reviewStatus)) errors.push(`${item.queueItemId}.reviewStatus unknown`);
    if (!REVIEW_EVIDENCE_STATUSES.includes(item.evidenceStatus)) errors.push(`${item.queueItemId}.evidenceStatus unknown`);
    if (!LEARNER_SAFE_HANDOFF_STATUSES.includes(item.learnerSafeHandoffStatus)) errors.push(`${item.queueItemId}.handoffStatus unknown`);
    if (item.metadataOnly !== true || item.containsRawContent !== false) errors.push(`${item.queueItemId}.metadata boundary failed`);
    if (!dataBoundaryIsMetadataOnly(item.dataBoundary)) errors.push(`${item.queueItemId}.dataBoundary failed`);
  }

  for (const event of state.auditEvents) {
    if (event.academyTenantId !== state.academyTenantId) errors.push(`${event.eventId}.academyTenantId mismatch`);
    if (!AUDIT_EVENT_KINDS.includes(event.eventKind)) errors.push(`${event.eventId}.eventKind unknown`);
    if (event.metadataOnly !== true || event.containsRawContent !== false) errors.push(`${event.eventId}.metadata boundary failed`);
    if (!boundaryHasOnlyFalseValues(event.runtimeBoundary)) errors.push(`${event.eventId}.runtimeBoundary failed`);
    if (!dataBoundaryIsMetadataOnly(event.dataBoundary)) errors.push(`${event.eventId}.dataBoundary failed`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function buildS222ReadinessReport(
  contract = S222_ACADEMY_ANSWER_OPERATIONS_CONTRACT,
) {
  const validation = validateS222AcademyAnswerOperationsContract(contract);
  return sanitizeDerivedMetadata({
    version: S222_ACADEMY_ANSWER_OPERATIONS_VERSION,
    valid: validation.valid,
    implementationMode: contract.implementationMode,
    subjectScope: contract.subjectScope,
    operatorRoleCount: contract.operatorBoundary.allowedRoles.length,
    queueVisibilityCount: contract.answerReviewQueueVisibility.length,
    assignmentReviewStatusCount: contract.assignmentReviewStatuses.length,
    reviewEvidenceStatusCount: contract.reviewEvidenceStatuses.length,
    learnerSafeHandoffStatusCount: contract.learnerSafeHandoffStatuses.length,
    auditEventKindCount: contract.auditEventKinds.length,
    academyRouteAdded: false,
    academyApiRouteAdded: false,
    learnerRouteChanged: false,
    instructorRouteChanged: false,
    checkoutAdded: false,
    paymentWebhookAdded: false,
    billingProviderCalled: false,
    productionBillingActivated: false,
    entitlementEnforcementActivated: false,
    providerRuntimeExpanded: false,
    ocrRuntimeExpanded: false,
    metadataOnly: true,
    tenantScoped: true,
    containsRawContent: false,
  });
}
