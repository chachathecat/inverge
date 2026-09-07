import { exactObject, requiredIdentifier } from "../kernel/domain";
import { privateSessionDigest as digest } from "./session-service";
import { foundationEvidence, immutableReference, requireSame as same, applicabilityFailure as fail,
  type PrivateApplicabilityInstallation } from "./foundation-applicability";
import { FIVE, RIGHTS, MANIFEST_FIELDS, RETRY_RELEASE_FIELDS } from "./foundation-release-contract";
import { projectApprovedEconomicsCandidate } from "./economics-candidate";

const packetReference = (value: unknown) => {
  const ref = immutableReference(value);
  return { schemaVersion: "first_stage.immutable_evidence_reference.v1", evidenceId: ref.evidence_id,
    evidenceVersion: ref.evidence_version, evidenceSha256: ref.evidence_sha256 };
};

/** Bind a hash-approved neutral r3 file to the EXISTING installed Foundation.
 * Draft references are not issued authority. Only evidence-reference fields are
 * replaced; every body, choice, answer and feedback byte remains untouched.
 * This is preparation for validateEconomicsApplicability, never permission to
 * return the packet. Its complete projected row hash must match the installation. */
export function bindEconomicsCandidateRelease(value: unknown, expected: "human_reviewed_private" | "synthetic_test_only",
  installation: PrivateApplicabilityInstallation) {
  const projected = projectApprovedEconomicsCandidate(value, expected);
  const evidence = foundationEvidence(installation);
  const source = (value as Record<string, unknown>).sourceBinding as Record<string, unknown>;
  if (!Array.isArray(installation.items) || installation.items.length !== projected.packet.questions.length) fail();
  const used = new Set<unknown>();
  for (const row of projected.packet.questions) {
    const ref = row.reference;
    const fields = row.kind === "original" ? FIVE.releaseReceiptContract.requiredFields : RETRY_RELEASE_FIELDS;
    // Resolve by the sealed item identity, not an array position or client-selected kind.
    const matches = installation.items.filter(item => {
      const other = installation.receipts.find(value => (value as Record<string, unknown>).receipt_id === immutableReference(item.releaseReference).evidence_id) as Record<string, unknown> | undefined;
      return other?.item_id === ref.questionId && other?.item_version === ref.questionVersion;
    });
    if (matches.length !== 1 || used.has(matches[0])) fail();
    const item = matches[0]; used.add(item);
    const release = evidence.resolve(item.releaseReference, fields);
    same(release.subject_id, ref.subjectId);
    const object = exactObject(release.question_item_object_reference_or_null, FIVE.questionItemObjectReferenceShape.requiredFields);
    const asset = evidence.resolve(release.source_asset_rights_receipt_reference, RIGHTS.assetRequiredFields);
    same(asset.post_id, source.questionPostId); same(asset.sha256, source.questionFileSha256);
    const keyReference = row.kind === "original" ? release.verified_official_key_receipt_reference : release.independent_answer_key_reference;
    if (row.kind === "original") {
      const key = evidence.resolve(keyReference, FIVE.releaseReceiptContract.verifiedOfficialKeyReceiptShape.requiredFields);
      same(key.qnet_post_id, source.keyPostId); same(key.exact_asset_raw_sha256, source.keyFileSha256);
    }
    const keys = projected.packet.keys.filter(key => key.questionReferenceSha256 === digest(ref));
    if (keys.length !== 1 || !Array.isArray(release.source_version_manifest_references) || release.source_version_manifest_references.length !== 1) fail();
    const manifest = evidence.resolve(release.source_version_manifest_references[0], MANIFEST_FIELDS);
    ref.sourceVersionManifestIds = [requiredIdentifier(manifest.manifest_id)];
    row.sourceEvidence = packetReference(object.content_provenance_receipt_reference);
    row.rightsEvidence = packetReference(object.rights_decision_reference);
    row.versionEvidence = packetReference(item.receiptReference);
    keys[0].questionReferenceSha256 = digest(ref); keys[0].evidence = packetReference(keyReference);
    same(digest(row), item.questionSha256);
  }
  return projected;
}
