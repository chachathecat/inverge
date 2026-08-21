import { createHash } from "node:crypto";
import {
  loadLiveMigrationSql,
  validateMigrationDependencyClosure,
} from "./wcv-c3r-a0-migration-dependency-closure.mjs";

export const MIGRATION_LEDGER_STATUS_V2 = Object.freeze([
  "LEDGER_APPLIED",
  "LEDGER_ABSENT",
]);

export const MIGRATION_SCHEMA_STATUS_V2 = Object.freeze([
  "SCHEMA_MATCH_VERIFIED",
  "SCHEMA_PRESENT_UNVERIFIED",
  "SCHEMA_PARTIAL",
  "SCHEMA_ABSENT",
  "SCHEMA_UNASSESSED",
]);

export const MIGRATION_SOURCE_TREATMENT_V2 = Object.freeze([
  "PRESERVE",
  "REPAIR_IN_PLACE_FOR_FRESH_HISTORY",
  "REPLACE_WITH_COMPATIBILITY_STUB",
  "SUPERSEDE_BY_FORWARD_RECONCILIATION",
  "RETIRE_FROM_ACTIVE_CHAIN_WITH_EXACT_ALIAS_RECEIPT",
]);

export const MIGRATION_FILENAME_TREATMENT_V2 = Object.freeze([
  "PRESERVE_VERSION",
  "RENAME_LEDGER_ABSENT_TO_UNIQUE_14_DIGIT_VERSION",
  "PRESERVE_APPLIED_VERSION_WITH_COMPATIBILITY_BEHAVIOR",
  "HISTORICAL_ALIAS_PLUS_CANONICAL_VERSION",
]);

export const REMOTE_CONTINUITY_TREATMENT_V2 = Object.freeze([
  "NO_REMOTE_ACTION_REQUIRED",
  "EXACT_SCHEMA_EQUIVALENCE_REQUIRED",
  "FUTURE_HISTORY_REPAIR_OWNER_GATE",
  "FUTURE_FORWARD_RECONCILIATION_OWNER_GATE",
  "REMOTE_DEPLOY_BLOCKED",
]);

export const A0_HISTORICAL_RECEIPT_V1 = Object.freeze({
  pullRequest: 785,
  reviewedHead: "f7f959368525f8a5895026f1361f6e13fd6226e0",
  reviewedTree: "543f8dfb5fdd026c1361e1a502376945912e6c5c",
  squashMergeSha: "3a7047cf4c7fc68247137bafbca2434abdadbc7f",
  resultingMainSha: "3a7047cf4c7fc68247137bafbca2434abdadbc7f",
  resultingMainTree: "543f8dfb5fdd026c1361e1a502376945912e6c5c",
});

export const A1_HISTORICAL_PROGRAM_RECEIPT_V1 = Object.freeze({
  pullRequest: 786,
  baseSha: "3a7047cf4c7fc68247137bafbca2434abdadbc7f",
  reviewedHead: "ff9dfbebea182d647daa84a349fcc50610f0ed1b",
  reviewedTree: "3c48da6fe991d8c02e3991e0a571b3b12139932c",
  squashMergeSha: "54afffcc539981ded65591f1f027171343bfce40",
  resultingMainSha: "54afffcc539981ded65591f1f027171343bfce40",
  resultingMainTree: "3c48da6fe991d8c02e3991e0a571b3b12139932c",
});

export const EXACT_REMOTE_LEDGER_RECORDS_V1 = Object.freeze([
  ["20260422", "inverge_service_core"],
  ["20260423", "inverge_service_role_grants"],
  ["20260424", "review_os_alpha"],
  ["20260426", "review_os_study_logs"],
  ["20260427", "study_logs_taxonomy_candidates"],
  ["20260429", "learning_signal_events"],
  ["20260430", "exam_archive"],
  ["20260605", "create_personal_concept_nodes"],
  ["20260622", "mobile_pwa_web_push_reminder"],
  ["20260623", "personal_concept_graph_atomic_transition"],
  ["202606232130", "personal_concept_graph_rpc_only_write_boundary"],
  ["20260730025332", "s236p_lean_owner_private"],
  ["20260730060233", "s236p_owner_private_lifecycle_hardening"],
  ["20260730065744", "s236p_owner_private_authenticated_download_info"],
  ["20260730151052", "s236p_owner_private_expiry_read_gate"],
].map(([version, name]) => Object.freeze({ version, name })));

export const EXACT_LEDGER_ABSENT_FILES_V1 = Object.freeze([
  "20260608_create_personal_learning_states.sql",
  "20260615_legal_grounding.sql",
  "20260615_legal_article_chunk_identity.sql",
  "20260615_legal_retrieval.sql",
  "20260615_legal_grounding_guard.sql",
  "20260616_legal_grounding_guard_service_role_grant.sql",
  "20260721060237_s233a_answer_review_persistence.sql",
  "20260817090000_c2r_c_p_structured_practice_proof.sql",
  "20260817113000_c2r_c_t_structural_theory_proof.sql",
  "20260817170000_c2r_c_l_exact_law_applicability.sql",
]);

const EXACT_A0_ARTIFACTS = Object.freeze({
  decision: Object.freeze({
    ref: "docs/decisions/2026-08-21-owner-wcv-c3r-a0-migration-dependency-authority.md",
    gitBlob: "8996f6c61f6cf0c5f7c908e97437a2f24bc65f8f",
    sha256: "f3be7b829539fa51c9037a58f05ed5a7c3fccbfcae28b3bb7b716330865b2ba6",
  }),
  manifest: Object.freeze({
    ref: "config/dabangil-wcv-c3r-a0-migration-dependency-authority-v1.json",
    gitBlob: "49916703d0a144647d6abce8cc98971042a35e1c",
    sha256: "e6e6d741d47732137860c0efc5c0dddc6b75e54fbd0ed6f2b1bcbe88e9f9d8e9",
  }),
  analyzer: Object.freeze({
    ref: "scripts/automation/wcv-c3r-a0-migration-dependency-closure.mjs",
    gitBlob: "23ba3b9f2af452b250cea0cbbbc5f135e8643b2d",
    sha256: "85751e62c300465b205f5e6d19357261af892a0072e06de2c4322258290fa6ec",
  }),
  focusedTest: Object.freeze({
    ref: "tests/wcv-c3r-a0-migration-dependency-authority.test.mjs",
    gitBlob: "04c5e3254ac03712a0fde27ef068329299305c40",
    sha256: "fa7e388a0f785b41661ac4fff342de7afe9dc05e03dee0e7afb0d3548bc6daaa",
  }),
});

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function deriveA0BaselineInventory(a0Manifest) {
  return a0Manifest.records.map((record) => ({
    currentFilename: record.currentFilename,
    currentVersionToken: record.currentVersionToken,
    sqlSha256: record.sqlSha256,
    exactDependencyPredecessors: record.exactDependencyPredecessors,
    freshHistoryOrder: record.freshHistoryOrder,
  }));
}

export function deriveA0BaselineInventoryDigest(a0Manifest) {
  return sha256(canonicalJson(deriveA0BaselineInventory(a0Manifest)));
}

function assertClosedEnum(errors, label, actual, expected) {
  if (!same(actual, expected)) errors.push(label);
}

export function validateA2AuthorityContract(contract, a0Manifest) {
  const errors = [];
  if (contract.contractId !== "dabangil.wcv.c3r.a2.migration-history-reconciliation") {
    errors.push("CONTRACT_ID");
  }
  if (contract.contractVersion !== "1.0.0") errors.push("CONTRACT_VERSION");
  for (const [field, value] of Object.entries(A0_HISTORICAL_RECEIPT_V1)) {
    if (contract.a0HistoricalReceiptV1?.[field] !== value) errors.push(`A0_${field}`);
  }
  for (const [field, value] of Object.entries(A1_HISTORICAL_PROGRAM_RECEIPT_V1)) {
    if (contract.a1HistoricalProgramReceiptV1?.[field] !== value) errors.push(`A1_${field}`);
  }
  if (!same(contract.a0HistoricalReceiptV1?.immutableArtifacts, EXACT_A0_ARTIFACTS)) {
    errors.push("A0_IMMUTABLE_ARTIFACTS");
  }
  if (!same(contract.a1HistoricalProgramReceiptV1?.strictStageOrder, ["C3R-P", "C3R-T", "C3R-L"])) {
    errors.push("A1_STAGE_ORDER");
  }
  if (!same(contract.a1HistoricalProgramReceiptV1?.actionableCounts, { p0: 0, p1: 0, p2: 0 })) {
    errors.push("A1_ACTIONABLE");
  }
  if (contract.a1HistoricalProgramReceiptV1?.unresolvedActionableThreads !== 0) {
    errors.push("A1_THREADS");
  }
  assertClosedEnum(errors, "LEDGER_ENUM", contract.closedEnums?.migrationLedgerStatusV2, MIGRATION_LEDGER_STATUS_V2);
  assertClosedEnum(errors, "SCHEMA_ENUM", contract.closedEnums?.migrationSchemaStatusV2, MIGRATION_SCHEMA_STATUS_V2);
  assertClosedEnum(errors, "SOURCE_ENUM", contract.closedEnums?.migrationSourceTreatmentV2, MIGRATION_SOURCE_TREATMENT_V2);
  assertClosedEnum(errors, "FILENAME_ENUM", contract.closedEnums?.migrationFilenameTreatmentV2, MIGRATION_FILENAME_TREATMENT_V2);
  assertClosedEnum(errors, "CONTINUITY_ENUM", contract.closedEnums?.remoteContinuityTreatmentV2, REMOTE_CONTINUITY_TREATMENT_V2);

  const ledger = contract.remoteMigrationLedgerReceiptV1 ?? {};
  if (ledger.receiptType !== "RemoteMigrationLedgerReceiptV1") errors.push("LEDGER_RECEIPT_TYPE");
  if (ledger.provenance !== "LIVE_READ_ONLY") errors.push("LEDGER_PROVENANCE");
  if (ledger.logicalProjectName !== "inverge-beta") errors.push("LEDGER_PROJECT");
  if (ledger.environmentClass !== "NON_PRODUCTION_BETA") errors.push("LEDGER_ENVIRONMENT");
  if (ledger.projectHealthObserved !== "ACTIVE_HEALTHY") errors.push("LEDGER_PROJECT_HEALTH");
  if (ledger.nonSecretProjectFingerprintScheme !== "SHA256_UTF8_SUPABASE_PROJECT_REF_V1") errors.push("LEDGER_PROJECT_FINGERPRINT_SCHEME");
  if (ledger.nonSecretProjectFingerprint !== "5a58c1e637d9cacb4bc8a71c377a57c4c7863ef9e87a6dfc3597bc83e56770d4") {
    errors.push("LEDGER_PROJECT_FINGERPRINT");
  }
  if (ledger.observedAtUtc !== "2026-08-21T07:17:37.805066Z" || ledger.observedAtKst !== "2026-08-21T16:17:37.805066+09:00") {
    errors.push("LEDGER_OBSERVATION_TIME");
  }
  if (!same(ledger.toolQueryProvenance, [
    "mcp__codex_apps__supabase_list_projects",
    "mcp__codex_apps__supabase_get_project",
    "mcp__codex_apps__supabase_list_migrations",
    "mcp__codex_apps__supabase_execute_sql:SELECT_ONLY:supabase_migrations.schema_migrations:jsonb_agg_order_by_version_name",
  ])) errors.push("LEDGER_TOOL_QUERY_PROVENANCE");
  if (!same(ledger.orderedRecords, EXACT_REMOTE_LEDGER_RECORDS_V1)) errors.push("LEDGER_RECORDS");
  if (ledger.exactCount !== 15) errors.push("LEDGER_COUNT");
  if (ledger.receiptDigestMethod !== "SHA256_POSTGRES_JSONB_TEXT_JSONB_AGG_BUILD_OBJECT_ORDER_BY_VERSION_NAME") errors.push("LEDGER_RECEIPT_DIGEST_METHOD");
  if (ledger.receiptDigest !== "45bcc29f8a21eb53e153e6d106250883ae843daa1057869390fd92cabc2a35c4") {
    errors.push("LEDGER_RECEIPT_DIGEST");
  }
  if (ledger.remoteMutationCount !== 0) errors.push("LEDGER_REMOTE_MUTATION");
  if (ledger.learnerPrivateBodyCount !== 0) errors.push("LEDGER_PRIVATE_BODY");
  if (ledger.rawCredentialStored !== false) errors.push("LEDGER_CREDENTIAL");

  const schema = contract.remoteSchemaMetadataReceiptV1 ?? {};
  if (schema.receiptType !== "RemoteSchemaMetadataReceiptV1") errors.push("SCHEMA_RECEIPT_TYPE");
  if (schema.provenance !== "LIVE_READ_ONLY") errors.push("SCHEMA_PROVENANCE");
  if (!same(schema.observationWindowUtc, {
    relations: "2026-08-21T07:18:07.719574Z",
    functions: "2026-08-21T07:18:26.733723Z",
    extensions: "2026-08-21T07:18:36.763633Z",
  })) errors.push("SCHEMA_OBSERVATION_WINDOW");
  if (!same(schema.toolQueryProvenance, [
    "mcp__codex_apps__supabase_list_extensions",
    "mcp__codex_apps__supabase_execute_sql:SELECT_ONLY:pg_catalog+information_schema:49_target_relations",
    "mcp__codex_apps__supabase_execute_sql:SELECT_ONLY:pg_catalog:14_target_functions",
  ])) errors.push("SCHEMA_TOOL_QUERY_PROVENANCE");
  if (schema.receiptDigest !== "cbe27ce7e921f310e6ec7d0f243060cc919e2bfd8bc8299cacac43d88f15aabd") {
    errors.push("SCHEMA_RECEIPT_DIGEST");
  }
  if (schema.remoteMutationCount !== 0) errors.push("SCHEMA_REMOTE_MUTATION");
  if (schema.learnerPrivateBodyCount !== 0) errors.push("SCHEMA_PRIVATE_BODY");
  if (schema.secretCount !== 0) errors.push("SCHEMA_SECRET");
  if (schema.objectPresenceEstablishesMigrationEquivalence !== false) {
    errors.push("SCHEMA_EQUIVALENCE_PROMOTION");
  }
  const relationPresence = schema.relationPresenceExactly ?? [];
  const functionPresence = schema.functionPresenceExactly ?? [];
  if (relationPresence.length !== 49 || new Set(relationPresence.map((entry) => entry.objectIdentifier)).size !== 49 || relationPresence.filter((entry) => entry.presenceState === "PRESENT").length !== 39 || relationPresence.filter((entry) => entry.presenceState === "ABSENT").length !== 10 || relationPresence.some((entry) => entry.objectKind !== "relation")) {
    errors.push("SCHEMA_RELATION_PRESENCE_RECEIPT");
  }
  if (functionPresence.length !== 14 || new Set(functionPresence.map((entry) => entry.objectIdentifier)).size !== 14 || functionPresence.filter((entry) => entry.presenceState === "PRESENT").length !== 6 || functionPresence.filter((entry) => entry.presenceState === "ABSENT").length !== 8 || functionPresence.some((entry) => entry.objectKind !== "function")) {
    errors.push("SCHEMA_FUNCTION_PRESENCE_RECEIPT");
  }
  if (sha256(canonicalJson(relationPresence)) !== schema.relationSummary?.presenceProjectionSha256 || schema.relationSummary?.presenceProjectionSha256 !== "3bfdbf802d875c0d919cd364c7d7041bba6ff265a09eed1b517f4816723962cb") errors.push("SCHEMA_RELATION_PROJECTION_DIGEST");
  if (sha256(canonicalJson(functionPresence)) !== schema.functionSummary?.presenceProjectionSha256 || schema.functionSummary?.presenceProjectionSha256 !== "36d799965a4c8f48ff1f89bd2a3fe794a1cf6ea2c7d34488f2406f3c3e9d726b") errors.push("SCHEMA_FUNCTION_PROJECTION_DIGEST");
  if (schema.relationSummary?.orderedMetadataSha256 !== "4cc6bf679d983c68990fd2012b71b337dc39b82f1a2565157cd9a15a3dd69234" || schema.functionSummary?.orderedMetadataSha256 !== "37eae9e3aa0119f523cef5ad755d801b531136afb79e004a0e3f9ea6eaff9a29") errors.push("SCHEMA_ORDERED_METADATA_DIGEST");
  if (sha256(canonicalJson(schema.selectedMaterialObservations)) !== schema.selectedMaterialObservationsSha256 || schema.selectedMaterialObservationsSha256 !== "17f79a7519bae955eb10241e85983d75894d0fa9b0b6a787917a63e496d2f7ab") errors.push("SCHEMA_SELECTED_MATERIAL_DIGEST");
  if (!same(schema.extensions, [
    { name: "pgcrypto", schema: "extensions", installedVersion: "1.3" },
    { name: "vector", schema: "public", installedVersion: "0.8.0" },
  ]) || schema.extensionRowsSha256 !== "4e4fbcb0d5b1dbeb52aacdde0c000355377903161ef38ad7d26cdaabfa53b0e6") errors.push("SCHEMA_EXTENSIONS");
  if (schema.receiptDigestPreimage !== "RemoteSchemaMetadataReceiptV1|relations:4cc6bf679d983c68990fd2012b71b337dc39b82f1a2565157cd9a15a3dd69234|functions:37eae9e3aa0119f523cef5ad755d801b531136afb79e004a0e3f9ea6eaff9a29|extensions:4e4fbcb0d5b1dbeb52aacdde0c000355377903161ef38ad7d26cdaabfa53b0e6") errors.push("SCHEMA_RECEIPT_DIGEST_PREIMAGE");

  if (deriveA0BaselineInventoryDigest(a0Manifest) !== contract.a0HistoricalReceiptV1?.baselineInventoryDigest) {
    errors.push("A0_BASELINE_INVENTORY_DIGEST");
  }
  if (contract.a0HistoricalReceiptV1?.baselineInventoryDigestAlgorithm !== "SHA256_UTF8_CANONICAL_JSON_V1") {
    errors.push("A0_BASELINE_INVENTORY_DIGEST_ALGORITHM");
  }
  if (contract.a0HistoricalReceiptV1?.baselineInventoryDigestPreimageDomain !== "A0 manifest records in declared order projected to currentFilename,currentVersionToken,sqlSha256,exactDependencyPredecessors,freshHistoryOrder; arrays preserve order; object keys sort lexicographically; JSON is minified") {
    errors.push("A0_BASELINE_INVENTORY_DIGEST_PREIMAGE_DOMAIN");
  }
  const baselineByFilename = new Map(a0Manifest.records.map((record) => [record.currentFilename, record]));
  const records = contract.migrationRecordReconciliationsV2 ?? [];
  if (records.length !== 25) errors.push("RECONCILIATION_COUNT");
  const seen = new Set();
  for (const record of records) {
    const baseline = baselineByFilename.get(record.currentFilename);
    if (!baseline || seen.has(record.currentFilename)) {
      errors.push(`RECORD_IDENTITY_${record.currentFilename}`);
      continue;
    }
    seen.add(record.currentFilename);
    if (record.currentVersionToken !== baseline.currentVersionToken) errors.push(`VERSION_${record.currentFilename}`);
    if (record.currentSqlDigest !== baseline.sqlSha256) errors.push(`DIGEST_${record.currentFilename}`);
    if (record.a0BaselineBinding !== `A0:${baseline.currentFilename}:${baseline.sqlSha256}`) errors.push(`A0_BINDING_${record.currentFilename}`);
    if (!MIGRATION_LEDGER_STATUS_V2.includes(record.ledgerStatus)) errors.push(`LEDGER_STATUS_${record.currentFilename}`);
    if (!MIGRATION_SCHEMA_STATUS_V2.includes(record.schemaStatus)) errors.push(`SCHEMA_STATUS_${record.currentFilename}`);
    if (!MIGRATION_SOURCE_TREATMENT_V2.includes(record.sourceTreatment)) errors.push(`SOURCE_TREATMENT_${record.currentFilename}`);
    if (!MIGRATION_FILENAME_TREATMENT_V2.includes(record.filenameTreatment)) errors.push(`FILENAME_TREATMENT_${record.currentFilename}`);
    if (!REMOTE_CONTINUITY_TREATMENT_V2.includes(record.remoteContinuityTreatment)) errors.push(`CONTINUITY_${record.currentFilename}`);
    for (const field of ["syntax", "dependencyOrder"]) {
      if (!["PASS", "FAIL", "UNVERIFIED"].includes(record.freshHistoryStatus?.[field])) errors.push(`FRESH_${field}_${record.currentFilename}`);
    }
    for (const field of ["exactFailureCode", "exactFailureClass", "exactRepairRequirement"]) {
      if (!(field in (record.freshHistoryStatus ?? {}))) errors.push(`FRESH_${field}_${record.currentFilename}`);
    }
    if (!Number.isInteger(record.exactProposedFreshHistoryOrder)) errors.push(`ORDER_${record.currentFilename}`);
    if (!Array.isArray(record.evidenceRefs) || record.evidenceRefs.length === 0) errors.push(`EVIDENCE_${record.currentFilename}`);
    if (record.currentAuthorityStatus !== "A0_BASELINE_BOUND_A2_RECONCILIATION_PLAN") errors.push(`AUTHORITY_${record.currentFilename}`);
  }
  if (seen.size !== 25) errors.push("RECONCILIATION_COVERAGE");

  const appliedVersions = new Set(EXACT_REMOTE_LEDGER_RECORDS_V1.map((record) => record.version));
  for (const record of records) {
    const expected = appliedVersions.has(record.currentVersionToken) ? "LEDGER_APPLIED" : "LEDGER_ABSENT";
    if (record.ledgerStatus !== expected) errors.push(`LEDGER_CLASSIFICATION_${record.currentFilename}`);
  }
  const absent = records.filter((record) => record.ledgerStatus === "LEDGER_ABSENT").map((record) => record.currentFilename);
  if (!same(absent, EXACT_LEDGER_ABSENT_FILES_V1)) errors.push("LEDGER_ABSENT_SET");
  if (records.filter((record) => record.schemaStatus === "SCHEMA_PRESENT_UNVERIFIED").length !== 20 || records.filter((record) => record.schemaStatus === "SCHEMA_ABSENT").length !== 5 || records.some((record) => ["SCHEMA_MATCH_VERIFIED", "SCHEMA_PARTIAL", "SCHEMA_UNASSESSED"].includes(record.schemaStatus))) {
    errors.push("SCHEMA_CLASSIFICATION_DISTRIBUTION");
  }

  const learning = records.find((record) => record.currentFilename === "20260608_create_personal_learning_states.sql");
  if (!learning || learning.schemaStatus !== "SCHEMA_ABSENT" || learning.freshHistoryStatus.syntax !== "FAIL" || learning.freshHistoryStatus.exactFailureCode !== "42P19" || learning.sourceTreatment !== "REPAIR_IN_PLACE_FOR_FRESH_HISTORY" || learning.filenameTreatment !== "RENAME_LEDGER_ABSENT_TO_UNIQUE_14_DIGIT_VERSION" || learning.proposedCanonicalFilename !== "20260608090000_create_personal_learning_states.sql" || learning.remoteContinuityTreatment !== "FUTURE_FORWARD_RECONCILIATION_OWNER_GATE") {
    errors.push("PERSONAL_LEARNING_STATES_DISPOSITION");
  }

  const legalFiles = contract.exactReconciliationDecisions?.legalFamily?.currentFilesExactly;
  const legalOrder = contract.exactReconciliationDecisions?.legalFamily?.canonicalOrderExactly;
  if (!same(legalFiles, EXACT_LEDGER_ABSENT_FILES_V1.slice(1, 6))) errors.push("LEGAL_FILES");
  if (!same(legalOrder, [
    "20260615090000_legal_grounding.sql",
    "20260615100000_legal_article_chunk_identity.sql",
    "20260615110000_legal_retrieval.sql",
    "20260615120000_legal_grounding_guard.sql",
    "20260616100000_legal_grounding_guard_service_role_grant.sql",
  ])) errors.push("LEGAL_CANONICAL_ORDER");
  for (const filename of legalFiles ?? []) {
    const record = records.find((entry) => entry.currentFilename === filename);
    if (!record || record.ledgerStatus !== "LEDGER_ABSENT" || record.schemaStatus !== "SCHEMA_PRESENT_UNVERIFIED" || record.remoteContinuityTreatment !== "EXACT_SCHEMA_EQUIVALENCE_REQUIRED") errors.push(`LEGAL_DISPOSITION_${filename}`);
  }

  const atomic = records.find((record) => record.currentFilename === "20260623_personal_concept_graph_atomic_transition.sql");
  const boundary = records.find((record) => record.currentFilename === "202606232130_personal_concept_graph_rpc_only_write_boundary.sql");
  if (!atomic || !boundary || atomic.ledgerStatus !== "LEDGER_APPLIED" || boundary.ledgerStatus !== "LEDGER_APPLIED" || atomic.filenameTreatment !== "PRESERVE_VERSION" || boundary.filenameTreatment !== "PRESERVE_APPLIED_VERSION_WITH_COMPATIBILITY_BEHAVIOR" || boundary.sourceTreatment !== "REPLACE_WITH_COMPATIBILITY_STUB" || atomic.freshHistoryStatus.dependencyOrder !== "FAIL" || boundary.freshHistoryStatus.dependencyOrder !== "FAIL") {
    errors.push("CONCEPT_GRAPH_DISPOSITION");
  }
  if (contract.exactReconciliationDecisions?.conceptGraph?.forwardBoundaryAppendRequired !== true) errors.push("CONCEPT_FORWARD_BOUNDARY");

  if (!same(contract.serialProgram?.strictStageOrder, ["C3R-P", "C3R-T", "C3R-L"])) errors.push("SERIAL_ORDER");
  if (!same(contract.serialProgram?.c3rPRequiresValidatedReceipts, ["C3R-A0", "C3R-A1", "C3R-A2"])) errors.push("P_RECEIPTS");
  if (contract.serialProgram?.c3rPState !== "dependency_ready_unstarted_after_validated_a2_receipt") errors.push("P_STATE");
  if (contract.serialProgram?.c3rTState !== "blocked_on_validated_c3r_p_receipt") errors.push("T_STATE");
  if (contract.serialProgram?.c3rLState !== "blocked_on_validated_c3r_p_and_c3r_t_receipts") errors.push("L_STATE");
  if (contract.serialProgram?.wcvC3State !== "incomplete") errors.push("WCV_C3_STATE");

  for (const field of ["migrationFileMutationPerformed", "remoteMigrationHistoryRepairAuthorized", "remoteDbPushAuthorized", "linkedResetAuthorized", "remoteSqlMutationAuthorized", "runtimeImplementationAuthorized", "productionAuthorized", "paymentAuthorized", "providerAuthorized", "learnerActivationAuthorized"]) {
    if (contract.activationBoundary?.[field] !== false) errors.push(`ACTIVATION_${field}`);
  }
  if (contract.activationBoundary?.remoteMutationCount !== 0) errors.push("REMOTE_MUTATION_COUNT");
  if (contract.activationBoundary?.successorRuntimeStarted !== 0) errors.push("SUCCESSOR_STARTED");
  return errors;
}

function digestSql(sql) {
  return sha256(sql.replace(/\r\n?/gu, "\n"));
}

function filenameVersion(filename) {
  return filename.match(/^(\d+)_/u)?.[1] ?? null;
}

function validateReplayReceipts(receipts) {
  return Array.isArray(receipts) && receipts.length === 2 &&
    new Set(receipts.map((receipt) => receipt.receiptId)).size === 2 &&
    receipts.every((receipt) => receipt.engine === "EXACT_ISOLATED_SUPABASE_RESET_REPLAY" && receipt.linkedRemote === false && receipt.success === true);
}

export function validateMigrationInventoryAuthorityV2(contract, a0Manifest, sqlByFilename, receiptBundle = {}) {
  const errors = validateA2AuthorityContract(contract, a0Manifest);
  const repairs = receiptBundle.repairReceipts ?? [];
  const appends = receiptBundle.appendReceipts ?? [];
  if (appends.length > 1) errors.push("APPEND_COUNT_EXCEEDS_ONE");
  if (appends.length > 0 && !same(
    repairs.map((receipt) => receipt.fromFilename),
    contract.c3rpAppendReceiptV1.requiredRepairPlanFilesExactly,
  )) {
    errors.push("APPEND_BEFORE_EXACT_REPAIR_CHECKPOINT");
  }
  const expected = new Map(a0Manifest.records.map((record) => [record.currentFilename, record.sqlSha256]));
  const plans = new Map(contract.migrationRecordReconciliationsV2.map((record) => [record.currentFilename, record]));
  const repairIds = new Set();
  for (const receipt of repairs) {
    const plan = plans.get(receipt.fromFilename);
    if (!plan || repairIds.has(receipt.receiptId)) {
      errors.push("REPAIR_RECEIPT_IDENTITY");
      continue;
    }
    repairIds.add(receipt.receiptId);
    const preservesSource = plan.sourceTreatment === "PRESERVE";
    const exactSpecialEvidence = receipt.fromFilename === "20260608_create_personal_learning_states.sql"
      ? receipt.implementationEvidence?.resolvedFailureCode === "42P19"
      : receipt.fromFilename === "202606232130_personal_concept_graph_rpc_only_write_boundary.sql"
        ? receipt.implementationEvidence?.compatibilitySafeBeforeProducer === true && receipt.implementationEvidence?.unsafeGrantBeforeProducer === false
        : true;
    if (receipt.receiptType !== "MigrationRepairReceiptV2" || receipt.a2AuthorityId !== contract.contractId || receipt.fromSqlDigest !== expected.get(receipt.fromFilename) || receipt.sourceTreatment !== plan.sourceTreatment || receipt.filenameTreatment !== plan.filenameTreatment || receipt.toFilename !== plan.proposedCanonicalFilename || receipt.exactFreshHistoryOrder !== plan.exactProposedFreshHistoryOrder || receipt.remoteMutationAuthorized !== false || receipt.exactHeadEvidence !== true || !exactSpecialEvidence || (preservesSource && receipt.toSqlDigest !== receipt.fromSqlDigest) || (!preservesSource && receipt.toSqlDigest === receipt.fromSqlDigest)) {
      errors.push(`REPAIR_RECEIPT_${receipt.fromFilename}`);
      continue;
    }
    expected.delete(receipt.fromFilename);
    expected.set(receipt.toFilename, receipt.toSqlDigest);
  }
  const appendIds = new Set();
  for (const receipt of appends) {
    if (appendIds.has(receipt.receiptId)) {
      errors.push("APPEND_DUPLICATE_RECEIPT");
      continue;
    }
    appendIds.add(receipt.receiptId);
    const version = filenameVersion(receipt.filename);
    const priorVersions = [...expected.keys()].map(filenameVersion).filter(Boolean);
    const maxPrior = priorVersions.sort().at(-1);
    if (receipt.receiptType !== "C3RPAppendReceiptV1" || receipt.a2AuthorityId !== contract.contractId || !same(receipt.purposeExactly, contract.c3rpAppendReceiptV1.requiredPurposeExactly) || !/^\d{14}_[a-z0-9_]+\.sql$/u.test(receipt.filename ?? "") || receipt.version !== version || version <= maxPrior || receipt.remoteApplicationAuthorized !== false || receipt.migrationHistoryRepairAuthorized !== false || !same(receipt.dependencyPredecessors, contract.c3rpAppendReceiptV1.requiredDependencyPredecessorsExactly) || !validateReplayReceipts(receipt.isolatedReplayReceipts) || receipt.exactHeadCentralEvidence !== true || receipt.exactHeadDedicatedRuntimeEvidence !== true || !Array.isArray(receipt.migrationSensitivePathClosure) || !Array.isArray(receipt.schemaRpcRlsObjectInventory)) {
      errors.push(`APPEND_RECEIPT_${receipt.receiptId ?? "UNKNOWN"}`);
      continue;
    }
    if (expected.has(receipt.filename) || [...expected.keys()].some((filename) => filenameVersion(filename) === version)) {
      errors.push(`APPEND_VERSION_${version}`);
      continue;
    }
    expected.set(receipt.filename, receipt.sqlDigest);
  }
  if (sqlByFilename.size !== expected.size) errors.push("LIVE_INVENTORY_COUNT");
  for (const [filename, expectedDigest] of expected) {
    const sql = sqlByFilename.get(filename);
    if (typeof sql !== "string") {
      errors.push(`LIVE_MISSING_${filename}`);
    } else if (digestSql(sql) !== expectedDigest) {
      errors.push(`LIVE_DIGEST_${filename}`);
    }
  }
  for (const filename of sqlByFilename.keys()) {
    if (!expected.has(filename)) errors.push(`LIVE_UNREGISTERED_${filename}`);
  }
  if (repairs.length === 0 && appends.length === 0 && errors.length === 0) {
    try {
      validateMigrationDependencyClosure(a0Manifest, sqlByFilename);
    } catch (error) {
      errors.push(`A0_HISTORICAL_REPLAY_${error.code ?? "FAILED"}`);
    }
  }
  return errors;
}

export async function loadCurrentInventory(repositoryRoot) {
  return loadLiveMigrationSql(`${repositoryRoot}/supabase/migrations`);
}
