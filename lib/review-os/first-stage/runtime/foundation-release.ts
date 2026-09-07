import { exactObject, requiredIdentifier } from "../kernel/domain";
import { privateSessionDigest as digest } from "./session-service";
import { applicabilityFailure as fail, requireSame as same, immutableReference, bodyReference,
  BODY_DECISION_FIELDS, PRE_RELEASE_FIELDS, type FoundationEvidence, type PrivateApplicabilityInstallation } from "./foundation-applicability";
import { FIVE, PRIVATE_USE, RETRY_RELEASE_VERSION, RETRY_RELEASE_FIELDS, RETRY_KEY_FIELDS, RETRY_PROVENANCE_FIELDS } from "./foundation-release-contract";
import { nonempty, releaseContext, sourcePair, type Row } from "./foundation-release-rights";
import { validateOfficialKey, officialSession } from "./foundation-release-key";
import { profileForQuestion } from "./foundation-official-profile";
import { validateLawReleaseEvidence } from "./foundation-release-validation";
import { validateRealEstateReleaseEvidence } from "./foundation-real-estate-release";
import { validateEconomicsReleaseEvidence } from "./foundation-economics-release";

const HUMAN = "named_owner_authorized_human_reviewer";
const CONTENT = "named_owner_authorized_human_content_reviewer";
const asPacketReference = (reference: unknown) => {
  const ref = immutableReference(reference);
  return { schemaVersion: "first_stage.immutable_evidence_reference.v1", evidenceId: ref.evidence_id,
    evidenceVersion: ref.evidence_version, evidenceSha256: ref.evidence_sha256 };
};
export function questionBody(row: Row) { return JSON.stringify({ stem: row.stem, choices: row.choices }); }
export const TRANSCRIPTION_CONFIG = Object.freeze({ method: "human_reviewed_transcription", version: "1",
  output: ["stem", "choices"], encoding: "UTF-8", serialization: "JSON.stringify-in-declared-field-order" });
export type FinalReleaseProjection = Readonly<{ question: readonly string[]; feedback: readonly string[] }>;

/** Final per-item use authorization. Selection is fixed by the exact server-
 * installed packet/item digest; no request field or six-check receipt can pick a
 * weaker branch. Nothing is issued here, and no content is installed by this code. */
export function validateFinalReleases(installation: PrivateApplicabilityInstallation, questions: readonly unknown[], keys: readonly unknown[], evidence: FoundationEvidence) {
  const completed = new Map<string, { row: Row; release: Row; reference: unknown; object: Row; projection: FinalReleaseProjection }>();
  let expiresAt = Infinity;
  // Originals first establishes a closed, non-cyclic lineage for private retries.
  const ordered = [...questions].sort((a, b) => Number((a as Row).kind === "practice_retry") - Number((b as Row).kind === "practice_retry"));
  for (const value of ordered) {
    const row = value as Row, reference = row.reference as Row;
    const id = requiredIdentifier(reference.questionId);
    if (completed.has(id) || !["original", "practice_retry"].includes(String(row.kind))) fail();
    const variant = row.kind === "practice_retry";
    const item = installation.items.find(item => item.questionSha256 === digest(row)); if (!item) fail();
    const release = evidence.resolve(item.releaseReference, variant ? RETRY_RELEASE_FIELDS : FIVE.releaseReceiptContract.requiredFields);
    const ctx = releaseContext(evidence, release);
    ctx.review(release, HUMAN, "approved_personal_only");
    if (release.receipt_version !== (variant ? RETRY_RELEASE_VERSION : FIVE.releaseReceiptContract.receiptVersion) ||
      release.item_id !== id || release.item_version !== reference.questionVersion || release.subject_id !== reference.subjectId ||
      release.requested_plane_or_null !== PRIVATE_USE.plane || release.requested_use_or_null !== PRIVATE_USE.use ||
      release.requested_audience_or_null !== PRIVATE_USE.audience ||
      (!["real_estate_principles", "economics_principles"].includes(String(reference.subjectId)) && release.subject_validator_receipt_reference_or_null !== null)) fail();
    same(release.pre_release_applicability_receipt_reference, item.receiptReference);
    const pre = ctx.resolve(item.receiptReference, PRE_RELEASE_FIELDS);
    same(release.applicable_version_status, pre.applicable_version_status); same(release.choice_set_digest, pre.choice_set_digest);
    const source = sourcePair(ctx, release.source_post_rights_receipt_reference, release.source_asset_rights_receipt_reference);
    same(release.source_post_id, source.post.row.post_id); same(release.source_asset_id, source.asset.row.asset_id);
    same(release.effective_rights_decision, source.effective); same(release.attribution, source.post.attribution);
    same(reference.rightsState, source.effective === "approved_owner_private_use" ? "verified_owner_private" : "verified_cleared");
    const object = exactObject(release.question_item_object_reference_or_null, FIVE.questionItemObjectReferenceShape.requiredFields);
    same(object.item_id, id); same(object.item_version, reference.questionVersion);
    const bodyless = Object.fromEntries(["object_id", "object_version", "object_sha256", "authorized_plane", "rights_decision_reference", "source_version_decision_reference"].map(field => [field, object[field]]));
    expiresAt = Math.min(expiresAt, bodyReference(bodyless, questionBody(row), reference,
      { ...release, component_evidence_references: pre.component_evidence_references }, evidence, item.examDate));
    const objectRights = ctx.resolve(object.rights_decision_reference, BODY_DECISION_FIELDS);
    const provenance = ctx.resolve(object.content_provenance_receipt_reference,
      variant ? RETRY_PROVENANCE_FIELDS : FIVE.questionItemObjectProvenanceReceiptShape.requiredFields);
    for (const field of ["item_id", "item_version", "source_post_id", "source_asset_id", "source_question_anchor",
      "source_post_rights_receipt_reference", "source_asset_rights_receipt_reference"]) same(provenance[field], release[field]);
    same(provenance.source_asset_raw_sha256, source.asset.row.sha256);
    for (const field of ["object_id", "object_version", "object_sha256"]) same(provenance[`output_${field}`], object[field]);
    same(release.author_provenance, object.content_provenance_receipt_reference);
    // Model assistance, if present, must bind the exact body and a reviewed human
    // provenance object; it never replaces the final named human decision.
    if (release.model_assistance_provenance_or_null !== null) {
      const model = ctx.resolve(release.model_assistance_provenance_or_null,
        "receipt_id receipt_version receipt_sha256 item_id item_version question_object_sha256 feedback_digest model_assisted reviewer reviewed_at decision".split(" "));
      same(model.item_id, id); same(model.item_version, reference.questionVersion); same(model.question_object_sha256, object.object_sha256);
      same(model.feedback_digest, digest([row.easyExplanation, row.choiceExplanations])); same(model.model_assisted, true);
      ctx.review(model, CONTENT, "reviewed_exact_model_assistance_disclosure");
    }
    const rootAttributions: Row[] = [
      { content_role: "question_source_post", choice_position_or_null: null, source_object_reference_or_null: null,
        rights_receipt_reference: release.source_post_rights_receipt_reference, exact_attribution: source.post.attribution },
      { content_role: "question_source_asset", choice_position_or_null: null, source_object_reference_or_null: null,
        rights_receipt_reference: release.source_asset_rights_receipt_reference, exact_attribution: source.asset.attribution },
      { content_role: "question_item_object", choice_position_or_null: null, source_object_reference_or_null: object,
        rights_receipt_reference: object.rights_decision_reference, exact_attribution: nonempty(objectRights.exact_attribution) },
    ];
    let keyReference: unknown;
    if (!variant) {
      const profile = profileForQuestion(reference);
      if (row.sourceQuestionId !== null || release.official_exam_round_id !== profile.id || release.session_profile_id !== officialSession(reference.subjectId, profile) ||
        reference.sessionId !== release.session_profile_id || release.official_question_number !== reference.questionNumber) fail();
      if (provenance.extraction_method_id !== TRANSCRIPTION_CONFIG.method || provenance.extraction_method_version !== TRANSCRIPTION_CONFIG.version ||
        provenance.extraction_configuration_digest !== digest(TRANSCRIPTION_CONFIG) || provenance.ocr_benchmark_gate_receipt_reference_or_null !== null) fail();
      ctx.review(provenance, CONTENT, "verified_question_item_object_provenance", source.asset.row.reviewed_at);
      const official = validateOfficialKey(ctx, release, row.correctChoice, source, installation.sourceObservations, profile);
      const position = (official.sourceObservation.ordered_position_bindings as Row[]).find(position =>
        position.subject_id === reference.subjectId && position.official_question_number === reference.questionNumber);
      if (!position) fail(); same(position.question_body_sha256, object.object_sha256); same(position.source_question_anchor, release.source_question_anchor);
      keyReference = release.verified_official_key_receipt_reference;
      rootAttributions.push(...["post", "asset"].map(kind => ({ content_role: `official_key_source_${kind}`, choice_position_or_null: null,
        source_object_reference_or_null: null, rights_receipt_reference: official.key[`key_${kind}_rights_receipt_reference`],
        exact_attribution: official.key[`key_${kind}_exact_attribution`] })));
    } else {
      if (release.item_kind !== "private_modified_retry" || release.authority !== "LEARNING_ONLY") fail();
      const original = completed.get(requiredIdentifier(row.sourceQuestionId)); if (!original || original.row.kind !== "original") fail();
      for (const field of ["subjectId", "examYear", "examRound", "sessionId", "questionNumber"])
        same(reference[field], (original.row.reference as Row)[field]);
      same(release.original_release_reference, original.reference);
      same(provenance.original_release_reference, original.reference); same(provenance.original_question_object_reference, original.object);
      same(provenance.concept_binding_digest, digest(row.concept)); same(row.concept, original.row.concept);
      if (provenance.derivation_kind !== "private_modified_practice_only" || object.object_sha256 === original.object.object_sha256) fail();
      for (const field of ["source_post_id", "source_asset_id", "source_question_anchor", "source_post_rights_receipt_reference", "source_asset_rights_receipt_reference"])
        same(release[field], original.release[field]);
      ctx.review(provenance, CONTENT, "verified_exact_private_variant_lineage", original.release.reviewed_at);
      const key = ctx.resolve(release.independent_answer_key_reference, RETRY_KEY_FIELDS);
      for (const field of ["item_id", "item_version", "subject_id", "choice_set_digest", "original_release_reference"]) same(key[field], release[field]);
      same(key.question_item_object_reference, object); same(key.answer_position_1_to_5, row.correctChoice);
      same(key.answer_reasoning_object_reference, item.easyExplanationReference); same(key.authority, "LEARNING_ONLY");
      ctx.review(key, "named_owner_authorized_human_answer_key_reviewer", "verified_independent_private_retry_key", provenance.reviewed_at);
      keyReference = release.independent_answer_key_reference;
      const keyRights = ctx.resolve((item.easyExplanationReference as Row).rights_decision_reference, BODY_DECISION_FIELDS);
      rootAttributions.push({ content_role: "independent_retry_answer_reasoning", choice_position_or_null: null,
        source_object_reference_or_null: item.easyExplanationReference, rights_receipt_reference: (item.easyExplanationReference as Row).rights_decision_reference,
        exact_attribution: nonempty(keyRights.exact_attribution) });
    }
    same(row.sourceEvidence, asPacketReference(object.content_provenance_receipt_reference)); same(row.rightsEvidence, asPacketReference(object.rights_decision_reference));
    const packetKeys = keys.filter(value => (value as Row).questionReferenceSha256 === digest(reference));
    if (packetKeys.length !== 1) fail(); same((packetKeys[0] as Row).evidence, asPacketReference(keyReference));
    const bundle = ctx.resolve(release.five_choice_feedback_bundle_receipt_reference_or_null, FIVE.fiveChoiceFeedbackBundleReceiptShape.requiredFields);
    same(bundle.item_id, id); same(bundle.item_version, reference.questionVersion); same(bundle.choice_set_digest, release.choice_set_digest);
    same(bundle.authorized_plane, PRIVATE_USE.plane);
    const feedbackRows = item.choices.map(value => {
      const choice = value as Row;
      return Object.fromEntries(FIVE.fiveChoiceFeedbackBundleReceiptShape.feedbackRowRequiredFields.map(field =>
        [field, choice[field === "verdict_true_or_false" ? "verdict_true_false_or_unresolved" : field]]));
    });
    same(bundle.ordered_choice_feedback_rows, feedbackRows); same(bundle.ordered_choice_feedback_rows_digest, digest(feedbackRows));
    const feedbackAttributions: Row[] = [];
    for (const choice of feedbackRows) {
      for (const kind of ["correction", "explanation"]) {
        const ref = choice[`${kind}_reference_or_null`] as Row | null; if (ref === null) continue;
        const rights = ctx.resolve(ref.rights_decision_reference, BODY_DECISION_FIELDS);
        feedbackAttributions.push({ choice_id: choice.choice_id, position_1_to_5: choice.position_1_to_5, feedback_kind: `${kind}_object`,
          source_object_reference: ref, rights_receipt_reference: ref.rights_decision_reference, exact_attribution: nonempty(rights.exact_attribution) });
      }
    }
    same(bundle.ordered_feedback_attribution_rows, feedbackAttributions); same(bundle.ordered_feedback_attribution_rows_digest, digest(feedbackAttributions));
    ctx.review(bundle, CONTENT, "verified_complete_five_choice_feedback_bundle", pre.reviewed_at);
    const attributionRows = [...rootAttributions, ...feedbackAttributions.map(row => ({ content_role: `choice_${row.feedback_kind}`,
      choice_position_or_null: row.position_1_to_5, source_object_reference_or_null: row.source_object_reference,
      rights_receipt_reference: row.rights_receipt_reference, exact_attribution: row.exact_attribution }))];
    const easy = item.easyExplanationReference as Row;
    const easyRights = ctx.resolve(easy.rights_decision_reference, BODY_DECISION_FIELDS);
    // Unlike a retry's independent answer reasoning, original easy feedback is
    // not part of the official key. Bind it explicitly in this final decision.
    if (!variant) attributionRows.push({
      content_role: FIVE.privateModifiedRetryReleaseContract.originalEasyExplanationAttributionBinding.contentRole,
      choice_position_or_null: null, source_object_reference_or_null: easy,
      rights_receipt_reference: easy.rights_decision_reference, exact_attribution: nonempty(easyRights.exact_attribution),
    });
    same(release.ordered_content_attribution_rows, attributionRows); same(release.ordered_content_attribution_rows_digest, digest(attributionRows));
    const uniqueAttributions = [...new Set(attributionRows.map(row => nonempty(row.exact_attribution)))];
    same(release.ordered_unique_attributions, uniqueAttributions); same(release.ordered_unique_attributions_digest, digest(uniqueAttributions));
    const validated = reference.subjectId === "real_estate_principles"
      ? validateRealEstateReleaseEvidence(ctx, release, pre, row, item.choices, keyReference, variant)
      : reference.subjectId === "economics_principles"
      ? validateEconomicsReleaseEvidence(ctx, release, pre, row, item.choices, keyReference, variant)
      : validateLawReleaseEvidence(ctx, release, pre, keyReference, variant);
    same(reference.sourceVersionManifestIds, validated.sourceVersionManifestIds);
    expiresAt = Math.min(expiresAt, ctx.expiry());
    // Question/source attribution only before response. Full ordered release
    // attribution and easy-explanation attribution appear with durable feedback.
    const projection = Object.freeze({ question: Object.freeze([...new Set(rootAttributions.slice(0, 3).map(row => nonempty(row.exact_attribution)))]),
      feedback: Object.freeze(uniqueAttributions) });
    completed.set(id, { row, release, reference: item.releaseReference, object, projection });
  }
  return { expiresAt, projections: new Map([...completed].map(([id, value]) => [id, value.projection])) };
}
