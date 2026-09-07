import { exactObject, requiredIdentifier, requiredSafeInteger, requiredUtcInstant } from "../kernel/domain";
import { privateSessionDigest as digest } from "./session-service";
import { applicabilityFailure as fail, requiredDay, requiredHash, requireSame, type FoundationEvidence } from "./foundation-applicability";

export const LAW_PROOF_FIELDS = ("proof_receipt_id proof_receipt_version proof_receipt_sha256 authority_id selected_version_identity " +
  "official_version_history_url official_version_history_receipt predecessor_version_identity_or_null successor_version_identity_or_null " +
  "effective_from effective_to_or_null exam_date raw_artifact_sha256 transport_receipt content_identity_receipt amendment_chain_record_count " +
  "amendment_chain_records amendment_chain_digest amendment_chain_complete_through_exam_date reviewer reviewed_at decision").split(" ");
export const LAW_HISTORY_FIELDS = ("receipt_id receipt_version receipt_sha256 authority_id official_version_history_url retrieved_at raw_history_sha256 " +
  "transport_receipt_reference content_identity_receipt_reference version_entry_count ordered_version_entries ordered_version_entries_digest " +
  "history_extraction_receipt_reference reviewer reviewed_at decision").split(" ");
export const LAW_EXTRACTION_FIELDS = ("receipt_id receipt_version receipt_sha256 authority_id official_version_history_url raw_history_sha256 extraction_method " +
  "extractor_or_parser_version extraction_configuration_digest version_entry_count ordered_version_entries ordered_version_entries_digest reviewer reviewed_at decision").split(" ");
export const LAW_CHAIN_FIELDS = ("chain_ordinal version_identity official_version_url promulgation_number promulgation_date effective_from effective_to_or_null " +
  "raw_artifact_sha256 transport_receipt content_identity_receipt amendment_disposition").split(" ");
const ENTRY_FIELDS = "version_identity promulgation_number promulgation_date effective_from effective_to_or_null".split(" ");
// Closed local projections of the Foundation transport/content-identity
// requirements. They are observations in the trusted installation, not claims
// read from a question. This consumer does not fetch law.go.kr or issue receipts.
const TRANSPORT_FIELDS = ("receipt_id receipt_version receipt_sha256 requested_url final_url redirect_urls http_status content_type byte_count " +
  "raw_artifact_sha256 login_error_or_interstitial").split(" ");
const IDENTITY_FIELDS = ("receipt_id receipt_version receipt_sha256 expected_official_name expected_mst_or_lsi_seq expected_promulgation_number " +
  "expected_effective_date representation_schema_or_magic_match raw_artifact_sha256").split(" ");
function officialText(value: unknown) {
  if (typeof value !== "string" || !value.trim() || value.length > 500) fail();
}
function officialUrl(value: unknown, final = false) {
  if (typeof value !== "string") fail();
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.port ||
    !(final ? ["www.law.go.kr"] : ["www.law.go.kr", "law.go.kr"]).includes(url.hostname)) fail();
  return value;
}
function transport(evidence: FoundationEvidence, ref: unknown, url: unknown, sha: unknown) {
  const row = evidence.resolve(ref, TRANSPORT_FIELDS);
  if (row.requested_url !== officialUrl(url) || row.http_status !== 200 || row.login_error_or_interstitial !== false ||
    !["application/xml", "text/xml", "application/octet-stream", "application/pdf"].includes(String(row.content_type))) fail();
  officialUrl(row.final_url, true);
  if (!Array.isArray(row.redirect_urls) || row.redirect_urls.length > 10) fail();
  row.redirect_urls.forEach(value => officialUrl(value));
  requiredSafeInteger(row.byte_count, 1, 100_000_000); requireSame(requiredHash(row.raw_artifact_sha256), requiredHash(sha));
}
function identity(evidence: FoundationEvidence, ref: unknown, sha: unknown, version?: unknown, number?: unknown, from?: unknown) {
  const row = evidence.resolve(ref, IDENTITY_FIELDS);
  if (row.expected_official_name !== "민법" || row.representation_schema_or_magic_match !== true) fail();
  requiredIdentifier(row.expected_mst_or_lsi_seq); officialText(row.expected_promulgation_number); requiredDay(row.expected_effective_date);
  requireSame(requiredHash(row.raw_artifact_sha256), requiredHash(sha));
  if (version !== undefined) requireSame(row.expected_mst_or_lsi_seq, version);
  if (number !== undefined) requireSame(row.expected_promulgation_number, number);
  if (from !== undefined) requireSame(row.expected_effective_date, from);
}

export function validateCivilLawProof(evidence: FoundationEvidence, ref: unknown, examDate: string) {
  const proof = evidence.resolve(ref, LAW_PROOF_FIELDS, true);
  if (proof.authority_id !== "civil_code" || proof.exam_date !== examDate || examDate !== "2026-04-04" ||
    proof.amendment_chain_complete_through_exam_date !== true || !Array.isArray(proof.amendment_chain_records) ||
    !proof.amendment_chain_records.length || proof.amendment_chain_records.length > 512) fail();
  const chain = proof.amendment_chain_records.map(value => exactObject(value, LAW_CHAIN_FIELDS));
  if (proof.amendment_chain_record_count !== chain.length || new Set(chain.map(row => row.version_identity)).size !== chain.length) fail();
  requireSame(proof.amendment_chain_digest, digest(chain));
  for (const [index, row] of chain.entries()) {
    if (row.chain_ordinal !== index + 1) fail();
    requiredIdentifier(row.version_identity); officialText(row.promulgation_number); officialText(row.amendment_disposition);
    const from = requiredDay(row.effective_from), to = row.effective_to_or_null === null ? null : requiredDay(row.effective_to_or_null);
    if (requiredDay(row.promulgation_date) > from || (to !== null && from >= to) ||
      (index > 0 && chain[index - 1].effective_to_or_null !== from)) fail();
    transport(evidence, row.transport_receipt, row.official_version_url, row.raw_artifact_sha256);
    identity(evidence, row.content_identity_receipt, row.raw_artifact_sha256, row.version_identity, row.promulgation_number, from);
  }
  const selectedIndex = chain.findIndex(row => row.version_identity === proof.selected_version_identity);
  if (selectedIndex < 0) fail();
  const selected = chain[selectedIndex];
  for (const field of ["effective_from", "effective_to_or_null", "raw_artifact_sha256", "transport_receipt", "content_identity_receipt"]) {
    requireSame(proof[field], selected[field]);
  }
  if (String(selected.effective_from) > examDate || (selected.effective_to_or_null !== null && examDate >= String(selected.effective_to_or_null)) ||
    proof.predecessor_version_identity_or_null !== (chain[selectedIndex - 1]?.version_identity ?? null) ||
    proof.successor_version_identity_or_null !== (chain[selectedIndex + 1]?.version_identity ?? null)) fail();

  const history = evidence.resolve(proof.official_version_history_receipt, LAW_HISTORY_FIELDS);
  if (history.authority_id !== proof.authority_id || history.official_version_history_url !== proof.official_version_history_url ||
    history.version_entry_count !== chain.length) fail();
  officialUrl(history.official_version_history_url); requiredUtcInstant(history.retrieved_at);
  const entries = chain.map(row => Object.fromEntries(ENTRY_FIELDS.map(key => [key, row[key]])));
  requireSame(history.ordered_version_entries, entries); requireSame(history.ordered_version_entries_digest, digest(entries));
  transport(evidence, history.transport_receipt_reference, history.official_version_history_url, history.raw_history_sha256);
  identity(evidence, history.content_identity_receipt_reference, history.raw_history_sha256);
  const extraction = evidence.resolve(history.history_extraction_receipt_reference, LAW_EXTRACTION_FIELDS);
  for (const field of ["authority_id", "official_version_history_url", "raw_history_sha256", "version_entry_count", "ordered_version_entries", "ordered_version_entries_digest"]) {
    requireSame(extraction[field], history[field]);
  }
  requiredIdentifier(extraction.extraction_method); requiredIdentifier(extraction.extractor_or_parser_version);
  const configuration = evidence.extractionConfiguration(extraction.extraction_configuration_digest);
  requireSame(configuration.extraction_method, extraction.extraction_method);
  requireSame(configuration.extractor_or_parser_version, extraction.extractor_or_parser_version);
  evidence.reviewer(extraction, "named_owner_authorized_human_law_reviewer", "verified_complete_history_extraction", history.retrieved_at);
  evidence.reviewer(history, "named_owner_authorized_human_law_reviewer", "verified_complete_official_history_through_exam_date", extraction.reviewed_at);
  evidence.reviewer(proof, "named_owner_authorized_human_law_reviewer", "verified_in_force_on_exam_date", history.reviewed_at);
  return proof;
}
