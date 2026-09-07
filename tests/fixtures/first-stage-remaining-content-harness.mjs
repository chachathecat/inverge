import assert from "node:assert/strict";
import { economicsPacket, syntheticContentInput } from "./first-stage-economics-content-harness.mjs";
import { loadCivilLawContent, loadRealEstatePrinciplesContent, loadAppraiserRelatedLawContent } from "../../lib/review-os/first-stage/runtime/remaining-subject-content.ts";
import { privateSessionDigest as digest } from "../../lib/review-os/first-stage/runtime/session-service.ts";
import { civilApplicability } from "./first-stage-civil-applicability-harness.mjs";

const installations = new WeakMap();

export const SUBJECT_CASES = [
  { id: "civil_law", slug: "civil-law", name: "CivilLaw", label: "민법", legal: true, load: loadCivilLawContent },
  { id: "real_estate_principles", slug: "real-estate-principles", name: "RealEstatePrinciples", label: "부동산학원론", legal: false, load: loadRealEstatePrinciplesContent },
  { id: "appraiser_related_law", slug: "appraiser-related-law", name: "AppraiserRelatedLaw", label: "감정평가관계법규", legal: true, load: loadAppraiserRelatedLawContent },
];

// Transport/subject-binding fixtures only; no actual legal or subject-content claim.
export function remainingPacket(subject) {
  const spec = SUBJECT_CASES.find(row => row.id === subject); assert.ok(spec);
  const packet = economicsPacket();
  packet.schemaVersion = `first_stage.${subject}_private_content.v1`;
  packet.version = `synthetic-${spec.slug}-v1`;
  for (const [index, row] of packet.questions.entries()) {
    row.reference.subjectId = subject;
    row.reference.questionId = row.reference.questionId.replace("economics", spec.slug);
    if (row.sourceQuestionId) row.sourceQuestionId = row.sourceQuestionId.replace("economics", spec.slug);
    row.concept.id = `synthetic-${spec.slug}-concept`;
    row.stem = `SYNTHETIC_${spec.slug}_BODY_${index}`;
    row.easyExplanation = `SYNTHETIC_${spec.slug}_EXPLANATION`;
    packet.keys[index].questionReferenceSha256 = digest(row.reference);
  }
  if (subject === "civil_law") installations.set(packet, civilApplicability(packet));
  return packet;
}
export const remainingInput = (subject, packet = remainingPacket(subject)) => ({ ...syntheticContentInput(packet),
  ...(subject === "civil_law" ? { applicability: [installations.get(packet)] } : {}) });
export function rebindSyntheticCivilInput(packet) {
  installations.set(packet, civilApplicability(packet));
  return remainingInput("civil_law", packet);
}
export const remainingCatalogs = Object.fromEntries(await Promise.all(SUBJECT_CASES.map(async spec => {
  const catalog = await spec.load(remainingInput(spec.id));
  assert.ok(catalog, `${spec.id} synthetic input must pass its actual loader`);
  return [spec.id, catalog];
})));
