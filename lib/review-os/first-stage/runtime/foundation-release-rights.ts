import { exactObject, requiredIdentifier, requiredUtcInstant } from "../kernel/domain";
import { privateSessionDigest as digest } from "./session-service";
import { applicabilityFailure as fail, requireSame as same, requiredHash, type FoundationEvidence } from "./foundation-applicability";
import { PRIVATE_USE, RIGHTS } from "./foundation-release-contract";

export type Row = Record<string, unknown>;
export const TRANSPORT_FIELDS = ("receipt_id receipt_version receipt_sha256 requested_url final_url http_status content_type " +
  "byte_count raw_artifact_sha256 retrieved_at").split(" ");
export const IDENTITY_FIELDS = ("receipt_id receipt_version receipt_sha256 representation_url mime_type byte_count " +
  "raw_artifact_sha256 label_or_terms_locator").split(" ");
export function nonempty(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) fail(); return value;
}
export function rows(value: unknown, min = 1, max = 5000): unknown[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) fail(); return value;
}
export function unique(value: unknown): unknown[] {
  const result = rows(value); if (new Set(result.map(digest)).size !== result.length) fail(); return result;
}
export function https(value: unknown, qnet = false) {
  const url = new URL(nonempty(value));
  if (url.protocol !== "https:" || url.username || url.password || url.port ||
    (qnet && !["www.q-net.or.kr", "q-net.or.kr"].includes(url.hostname))) fail();
  return url;
}
export function releaseContext(evidence: FoundationEvidence, release: Row) {
  const reviewed = Date.parse(requiredUtcInstant(release.reviewed_at));
  let expiry = Infinity;
  return {
    evidence,
    resolve(reference: unknown, fields: readonly string[]) {
      const row = evidence.resolve(reference, fields);
      if (row.reviewed_at !== undefined && Date.parse(requiredUtcInstant(row.reviewed_at)) > reviewed) fail();
      return row;
    },
    review(row: Row, role: string, decision: string, at?: unknown) { evidence.reviewer(row, role, decision, at); },
    window(from: unknown, until: unknown) {
      const start = Date.parse(requiredUtcInstant(from));
      const end = until === null ? Infinity : Date.parse(requiredUtcInstant(until));
      if (start > Date.now() || end <= Date.now() || end <= start || reviewed < start || reviewed >= end) fail();
      expiry = Math.min(expiry, end);
    },
    expiry: () => expiry,
  };
}
export type ReleaseContext = ReturnType<typeof releaseContext>;
export const RIGHTS_ROLE = "named_owner_authorized_human_rights_reviewer";

/** A bounded consumer of current Foundation rights, not a rights issuer. This
 * private slice supports individually reviewed primary rights with verified
 * absence of third-party material. Permission-grant chains and OCR are not
 * silently approximated: unsupported branches remain denied. */
export function sourceRights(ctx: ReleaseContext, reference: unknown, asset: boolean, parentReference: unknown = null) {
  const row = ctx.resolve(reference, asset ? RIGHTS.assetRequiredFields : RIGHTS.postRequiredFields);
  if (row.receipt_version !== RIGHTS.receiptVersion || ![
    "approved_owner_private_use", "approved_cleared_redistribution_with_attribution",
  ].includes(String(row.decision)) || row.third_party_rights_decision !== "no_third_party_material_verified" ||
    row.third_party_permission_receipt_reference_or_null !== null) fail();
  ctx.review(row, RIGHTS_ROLE, String(row.decision), row.retrieved_at);
  requiredIdentifier(row.post_id); if (asset) requiredIdentifier(row.asset_id);
  const attribution = nonempty(asset ? row.exact_attribution : row.attribution);
  const url = asset ? row.official_download_url : row.canonical_url;
  https(url, true); requiredHash(row.sha256);
  if (!Number.isSafeInteger(row.byte_count) || Number(row.byte_count) <= 0) fail();
  const transport = exactObject(row.transport_receipt, asset ? RIGHTS.assetTransportReceiptRequiredFields : RIGHTS.postTransportReceiptRequiredFields);
  same(transport.requested_url, url); same(transport.final_url, url);
  same(transport.retrieved_at, row.retrieved_at);
  if (transport.http_status !== 200 || transport.official_host_verified !== true ||
    (transport.content_type !== row.mime_type && !(asset && transport.content_type === "application/octet-stream"))) fail();
  const identity = exactObject(row.content_identity_receipt, asset ? RIGHTS.assetContentIdentityReceiptRequiredFields : RIGHTS.postContentIdentityReceiptRequiredFields);
  for (const field of ["post_id", "mime_type", "byte_count", "sha256"]) same(identity[field], row[field]);
  if (asset) {
    nonempty(row.filename);
    for (const field of ["asset_id", "official_download_url", "artifact_kind"]) same(identity[field], row[field]);
    same(identity.endpoint_post_id, row.post_id); same(identity.endpoint_asset_id, row.asset_id);
    same(identity.expected_filename, row.filename);
    if (identity.content_disposition_filename_or_null !== null) same(identity.content_disposition_filename_or_null, row.filename);
    if (identity.representation_magic_match !== true || !["pdf", "hwp", "hwpx"].includes(String(row.artifact_kind))) fail();
  } else {
    requiredIdentifier(row.board_id); nonempty(row.exact_title);
    for (const field of ["board_id", "canonical_url", "exact_title"]) same(identity[field], row[field]);
    nonempty(row.department); requiredUtcInstant(row.observed_at);
  }
  const scope = exactObject(row.decision_scope, RIGHTS.decisionScopeContract.requiredFields);
  requiredIdentifier(scope.scope_version);
  const ceilings = RIGHTS.decisionScopeContract.finalDecisionScopeTupleCeilings;
  const ceiling = row.decision === "approved_owner_private_use" ? ceilings.approved_owner_private_use : ceilings.approved_cleared_redistribution_with_attribution;
  const tuples = unique(scope.allowed_scope_tuples);
  if (!tuples.some(tuple => digest(tuple) === digest(PRIVATE_USE)) || tuples.some(tuple => !ceiling.some(allowed => digest(allowed) === digest(tuple)))) fail();
  for (const field of ["source_post_id", "source_asset_id_or_null", "source_content_sha256", "exact_attribution"]) {
    same(scope[field], ({ source_post_id: row.post_id, source_asset_id_or_null: asset ? row.asset_id : null,
      source_content_sha256: row.sha256, exact_attribution: attribution } as Row)[field]);
  }
  same(scope.legal_or_policy_basis_reference, row.primary_rights_basis_receipt_reference);
  const basis = ctx.resolve(row.primary_rights_basis_receipt_reference, RIGHTS.primaryRightsBasisReceiptShape.requiredFields);
  const observed = ctx.resolve(basis.basis_evidence_reference, RIGHTS.rightsBasisEvidenceReceiptShape.requiredFields);
  same(asset ? row.license_basis : row.post_license_evidence, basis.basis_evidence_reference);
  for (const field of ["source_post_id", "source_asset_id_or_null"]) { same(basis[field], scope[field]); same(observed[field], scope[field]); }
  same(basis.source_content_sha256, row.sha256); same(basis.exact_attribution, attribution);
  same(basis.basis_evidence_observed_at, observed.observed_at); same(basis.basis_evidence_raw_sha256, observed.raw_evidence_sha256);
  same(basis.label_or_terms_locator, observed.label_or_terms_locator); nonempty(basis.label_or_terms_locator);
  const basisTuples = unique(basis.allowed_scope_tuples);
  if (tuples.some(tuple => !basisTuples.some(allowed => digest(tuple) === digest(allowed)))) fail();
  const ownerPrivate = observed.evidence_kind === "authoritative_owner_private_policy";
  if (ownerPrivate) {
    if (basis.basis_type !== "owner_private_processing_basis" || basis.official_label_or_terms_url !== null || row.decision !== "approved_owner_private_use") fail();
    same(basisTuples, [PRIVATE_USE]);
  } else {
    if (!["official_post_license_label_or_terms", "official_terms_document"].includes(String(observed.evidence_kind)) ||
      basis.basis_type !== "official_license_label_and_terms") fail();
    same(basis.official_label_or_terms_url, observed.authoritative_representation_url); https(basis.official_label_or_terms_url, true);
    if (basisTuples.some(tuple => !ceilings.approved_cleared_redistribution_with_attribution.some(allowed => digest(tuple) === digest(allowed)))) fail();
  }
  https(observed.authoritative_representation_url);
  same(observed.parent_post_rights_receipt_reference_or_null, asset ? parentReference : null);
  same(observed.asset_in_scope_determination_or_null, asset ? "parent_post_basis_explicitly_covers_this_asset" : null);
  const observationTransport = ctx.resolve(observed.transport_receipt_reference, TRANSPORT_FIELDS);
  const observationIdentity = ctx.resolve(observed.content_identity_receipt_reference, IDENTITY_FIELDS);
  same(observationTransport.requested_url, observed.authoritative_representation_url);
  same(observationTransport.final_url, observed.authoritative_representation_url);
  same(observationIdentity.representation_url, observed.authoritative_representation_url);
  if (observationTransport.http_status !== 200) fail();
  for (const [field, transportField, identityField] of [["mime_type", "content_type", "mime_type"], ["byte_count", "byte_count", "byte_count"],
    ["raw_evidence_sha256", "raw_artifact_sha256", "raw_artifact_sha256"]]) {
    same(observed[field], observationTransport[transportField]); same(observed[field], observationIdentity[identityField]);
  }
  same(observationTransport.retrieved_at, observed.retrieved_at); same(observationIdentity.label_or_terms_locator, observed.label_or_terms_locator);
  requiredHash(observed.raw_evidence_sha256);
  if (!Number.isSafeInteger(observed.byte_count) || Number(observed.byte_count) <= 0) fail();
  ctx.review(observed, RIGHTS_ROLE, "verified_current_basis_evidence", observed.retrieved_at);
  if (Date.parse(requiredUtcInstant(observed.reviewed_at)) < Date.parse(requiredUtcInstant(observed.observed_at))) fail();
  ctx.review(basis, RIGHTS_ROLE, "verified_exact_primary_rights_basis", observed.reviewed_at);
  ctx.review(row, RIGHTS_ROLE, String(row.decision), basis.reviewed_at);
  // Scope review is independently authorized and cannot predate its basis.
  ctx.review({ ...scope, decision: "scope" }, RIGHTS_ROLE, "scope", basis.reviewed_at);
  ctx.review(row, RIGHTS_ROLE, String(row.decision), scope.reviewed_at);
  ctx.window(basis.effective_from, basis.expires_at_or_null);
  ctx.window(scope.reviewed_at, scope.expires_at_or_null);
  return { row, attribution };
}

export function sourcePair(ctx: ReleaseContext, postReference: unknown, assetReference: unknown) {
  const post = sourceRights(ctx, postReference, false), asset = sourceRights(ctx, assetReference, true, postReference);
  same(post.row.post_id, asset.row.post_id);
  return { post, asset, effective: [post.row, asset.row].some(row => row.decision === "approved_owner_private_use")
    ? "approved_owner_private_use" : "approved_cleared_redistribution_with_attribution" };
}
