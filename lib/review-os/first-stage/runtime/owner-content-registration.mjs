/** Server-authored exact pins only. A content file cannot register or approve itself. */
import registration from "../../../../config/owner-approved-content-registration.json" with { type: "json" };
/** @template T @param {T} value @returns {T} */
function freeze(value) { if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
export const OWNER_CONTENT_REGISTRATION = freeze(registration);
export const OWNER_CONTENT_BUNDLES = OWNER_CONTENT_REGISTRATION.bundles;
export function ownerContentBundle(key) { return OWNER_CONTENT_BUNDLES.find(bundle => bundle.key === key) ?? null; }
export function ownerContentReferenceRegistration(reference) {
  return OWNER_CONTENT_BUNDLES.find(bundle => bundle.ids.includes(reference.questionId) && bundle.version === reference.questionVersion) ?? null;
}
export function ownerContentCatalogIds() {
  return [...OWNER_CONTENT_BUNDLES.map(bundle => [bundle.key]), ...OWNER_CONTENT_REGISTRATION.catalogs]
    .map(keys => keys.flatMap(key => ownerContentBundle(key).ids.filter((_, index) => index % 2 === 0)));
}
