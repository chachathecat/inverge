import { FirstStageKernelError, exactObject, requiredIdentifier, requiredUtcInstant } from "../kernel/domain";
import { privateSessionDigest as digest } from "./session-service";
import { validateCivilLawProof } from "./foundation-law-applicability";

type Row = Record<string, unknown>;
/** A server-code installation of EXISTING Foundation objects, not a receipt,
 * issuer, database or client upload format. An empty installation grants nothing.
 * packetSha256 pins the private bytes; each questionSha256 binds the complete
 * private question to its Foundation five-choice projection. Neither is public
 * learner metadata. Real installations require separately authorized review. */
export type PrivateApplicabilityInstallation = Readonly<{
  packetSha256: string;
  dataClass: "human_reviewed_private" | "synthetic_test_only";
  items: readonly Readonly<{ questionSha256: string; examDate: string; choices: readonly unknown[]; receiptReference: unknown }>[];
  receipts: readonly unknown[];
  reviewers: readonly Readonly<{ identity: string; classes: readonly string[] }>[];
  historyExtractionConfigurations: readonly unknown[];
}>;

export function applicabilityFailure(): never { throw new FirstStageKernelError("adapter_mismatch"); }
export function requireSame(a: unknown, b: unknown) { if (digest(a) !== digest(b)) applicabilityFailure(); }
export function requiredHash(value: unknown): string {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/u.test(value)) applicabilityFailure();
  return value;
}
export function requiredDay(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(value) ||
    !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) applicabilityFailure();
  return value;
}
export function immutableReference(value: unknown) {
  const row = exactObject(value, ["evidence_id", "evidence_version", "evidence_sha256"]);
  return { evidence_id: requiredIdentifier(row.evidence_id), evidence_version: requiredIdentifier(row.evidence_version),
    evidence_sha256: requiredHash(row.evidence_sha256) };
}
function validJson(value: unknown, depth = 0): void {
  if (depth > 35) applicabilityFailure();
  if (typeof value === "string") {
    // JCS rejects lone surrogates; JSON.stringify alone would silently escape them.
    if (value.length > 16_384 || /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value)) applicabilityFailure();
  } else if (typeof value === "number") { if (!Number.isFinite(value)) applicabilityFailure(); }
  else if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) { validJson(key, depth + 1); validJson(child, depth + 1); }
  } else if (value !== null && typeof value !== "boolean") applicabilityFailure();
}

/** Resolves only the current, independently installed snapshot. Recomputed hashes
 * prove integrity, not provenance: the production caller supplies this snapshot
 * from server-only reviewed code, never from the packet, HTTP or an env flag. */
export function foundationEvidence(installation: PrivateApplicabilityInstallation) {
  if (!Array.isArray(installation.receipts) || installation.receipts.length > 5000 ||
    !Array.isArray(installation.reviewers) || !installation.reviewers.length) applicabilityFailure();
  const reviewers = new Map<string, readonly string[]>();
  for (const value of installation.reviewers) {
    exactObject(value, ["identity", "classes"]); requiredIdentifier(value.identity);
    if (reviewers.has(value.identity) || !Array.isArray(value.classes) || !value.classes.length ||
      new Set(value.classes).size !== value.classes.length) applicabilityFailure();
    value.classes.forEach((value: unknown) => requiredIdentifier(value)); reviewers.set(value.identity, value.classes);
  }
  const receipts = new Map<string, Row>();
  for (const value of installation.receipts) {
    if (!value || typeof value !== "object" || Array.isArray(value)) applicabilityFailure();
    const row = value as Row;
    const prefix = Object.hasOwn(row, "proof_receipt_id") ? "proof_receipt" : "receipt";
    const id = requiredIdentifier(row[`${prefix}_id`]); requiredIdentifier(row[`${prefix}_version`]);
    const sha = requiredHash(row[`${prefix}_sha256`]);
    const covered = Object.fromEntries(Object.entries(row).filter(([key]) => key !== `${prefix}_sha256`));
    if (receipts.has(id) || digest(covered) !== sha) applicabilityFailure();
    receipts.set(id, row);
  }
  return {
    extractionConfiguration(sha: unknown) {
      requiredHash(sha);
      if (!Array.isArray(installation.historyExtractionConfigurations)) applicabilityFailure();
      const matches = installation.historyExtractionConfigurations.filter(value => digest(value) === sha);
      if (matches.length !== 1) applicabilityFailure();
      const row = exactObject(matches[0], ["extraction_method", "extractor_or_parser_version", "schema_selectors", "pagination", "completeness_rules"]);
      requiredIdentifier(row.extraction_method); requiredIdentifier(row.extractor_or_parser_version);
      for (const field of ["schema_selectors", "pagination", "completeness_rules"]) {
        if (!Array.isArray(row[field]) || !row[field].length || row[field].length > 100 ||
          row[field].some(value => typeof value !== "string" || !value.trim())) applicabilityFailure();
      }
      return row;
    },
    resolve(reference: unknown, fields: readonly string[], proof = false): Row {
      const ref = immutableReference(reference), row = receipts.get(ref.evidence_id);
      if (!row) applicabilityFailure();
      exactObject(row, fields);
      const prefix = proof ? "proof_receipt" : "receipt";
      if (row[`${prefix}_id`] !== ref.evidence_id || row[`${prefix}_version`] !== ref.evidence_version ||
        row[`${prefix}_sha256`] !== ref.evidence_sha256) applicabilityFailure();
      return row;
    },
    reviewer(row: Row, role: string, decision: string, notBefore?: unknown) {
      const id = requiredIdentifier(row.reviewer), at = requiredUtcInstant(row.reviewed_at);
      if (!reviewers.get(id)?.includes(role) || row.decision !== decision || Date.parse(at) > Date.now() ||
        (notBefore !== undefined && Date.parse(at) < Date.parse(requiredUtcInstant(notBefore)))) applicabilityFailure();
    },
  };
}
export type FoundationEvidence = ReturnType<typeof foundationEvidence>;
export const PRE_RELEASE_FIELDS = ("receipt_id receipt_version receipt_sha256 item_id item_version subject_id choice_set_digest " +
  "source_anchor_ids_digest receipt_kind applicable_authority_ids authority_derivation_receipt_reference_or_null " +
  "component_evidence_references applicable_version_status reviewer reviewed_at decision").split(" ");
export const FOUNDATION_CHOICE_FIELDS = ("choice_id position_1_to_5 verdict_true_false_or_unresolved correction_status " +
  "correction_reference_or_null explanation_status explanation_reference_or_null source_anchor_ids law_or_kifrs_version_status uncertainty_codes").split(" ");
const BODY_REFERENCE_FIELDS = "object_id object_version object_sha256 authorized_plane rights_decision_reference source_version_decision_reference".split(" ");
function bodyReference(value: unknown) {
  const row = exactObject(value, BODY_REFERENCE_FIELDS);
  requiredIdentifier(row.object_id); requiredIdentifier(row.object_version); requiredHash(row.object_sha256);
  if (row.authorized_plane !== "Personal Raw Vault") applicabilityFailure();
  immutableReference(row.rights_decision_reference); immutableReference(row.source_version_decision_reference);
}

export function validateCivilApplicability(installation: PrivateApplicabilityInstallation, questions: readonly unknown[]): string {
  validJson(installation);
  if (JSON.stringify(installation).length > 4 * 1024 * 1024) applicabilityFailure();
  exactObject(installation, ["packetSha256", "dataClass", "items", "receipts", "reviewers", "historyExtractionConfigurations"]);
  requiredHash(installation.packetSha256);
  const snapshot = structuredClone(installation), evidence = foundationEvidence(snapshot);
  if (!Array.isArray(snapshot.items) || snapshot.items.length !== questions.length ||
    new Set(snapshot.items.map(item => item.questionSha256)).size !== questions.length) applicabilityFailure();
  for (const value of questions) {
    const row = value as Row, reference = row.reference as Row;
    const item = snapshot.items.find(candidate => candidate.questionSha256 === digest(value));
    if (!item) applicabilityFailure();
    exactObject(item, ["questionSha256", "examDate", "choices", "receiptReference"]);
    requiredHash(item.questionSha256);
    if (requiredDay(item.examDate) !== "2026-04-04" || reference.examYear !== 2026 || reference.subjectId !== "civil_law" ||
      reference.currentnessState !== "verified_exam_date" || !Array.isArray(reference.sourceVersionManifestIds) ||
      !reference.sourceVersionManifestIds.includes("appraiser.first.law.2026-04-04.contract.v1")) applicabilityFailure();
    const ref = immutableReference(item.receiptReference);
    requireSame(row.versionEvidence, { schemaVersion: "first_stage.immutable_evidence_reference.v1", evidenceId: ref.evidence_id,
      evidenceVersion: ref.evidence_version, evidenceSha256: ref.evidence_sha256 });
    const receipt = evidence.resolve(ref, PRE_RELEASE_FIELDS);
    if (receipt.item_id !== reference.questionId || receipt.item_version !== reference.questionVersion ||
      receipt.subject_id !== reference.subjectId || receipt.receipt_kind !== "law_exam_date_bundle" ||
      receipt.applicable_version_status !== "law_exam_date_verified" || receipt.authority_derivation_receipt_reference_or_null !== null) applicabilityFailure();
    requireSame(receipt.applicable_authority_ids, ["civil_code"]);
    if (!Array.isArray(item.choices) || item.choices.length !== 5) applicabilityFailure();
    const anchors: string[] = [], ids = new Set<string>();
    item.choices.forEach((value: unknown, index: number) => {
      const choice = exactObject(value, FOUNDATION_CHOICE_FIELDS), correct = index + 1 === row.correctChoice;
      const id = requiredIdentifier(choice.choice_id);
      if (ids.has(id) || choice.position_1_to_5 !== index + 1 || choice.verdict_true_false_or_unresolved !== (correct ? "true" : "false") ||
        choice.correction_status !== (correct ? "verified_no_correction" : "verified_correction_available") ||
        choice.explanation_status !== "draft_private" || choice.law_or_kifrs_version_status !== "law_exam_date_verified") applicabilityFailure();
      ids.add(id);
      if (correct) { if (choice.correction_reference_or_null !== null) applicabilityFailure(); }
      else bodyReference(choice.correction_reference_or_null);
      bodyReference(choice.explanation_reference_or_null);
      if (!Array.isArray(choice.source_anchor_ids) || !choice.source_anchor_ids.length || choice.source_anchor_ids.length > 100 ||
        new Set(choice.source_anchor_ids).size !== choice.source_anchor_ids.length) applicabilityFailure();
      anchors.push(...choice.source_anchor_ids.map(value => requiredIdentifier(value)));
      requireSame(choice.uncertainty_codes, []);
    });
    requireSame(receipt.source_anchor_ids_digest, digest([...new Set(anchors)].sort()));
    requireSame(receipt.choice_set_digest, digest({ item_id: reference.questionId, item_version: reference.questionVersion, choices: item.choices }));
    if (!Array.isArray(receipt.component_evidence_references) || receipt.component_evidence_references.length !== 1) applicabilityFailure();
    const proof = validateCivilLawProof(evidence, receipt.component_evidence_references[0], item.examDate);
    evidence.reviewer(receipt, "named_owner_authorized_human_subject_or_version_reviewer", "verified_pre_release_applicability", proof.reviewed_at);
  }
  // Reconnect/retry cannot reuse a catalog validated under a revoked/replaced
  // installed snapshot. No receipt body is added to durable learner metadata.
  return digest(snapshot);
}
