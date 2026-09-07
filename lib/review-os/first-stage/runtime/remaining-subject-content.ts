import { loadPrivateReviewedContent, type PrivateContentInput } from "./private-reviewed-content";

// Fixed server entry points. HTTP input never selects a subject policy.
export const loadCivilLawContent = (input: PrivateContentInput) =>
  loadPrivateReviewedContent("civil_law", input);
export const loadRealEstatePrinciplesContent = (input: PrivateContentInput) =>
  loadPrivateReviewedContent("real_estate_principles", input);
export const loadAppraiserRelatedLawContent = (input: PrivateContentInput) =>
  loadPrivateReviewedContent("appraiser_related_law", input);
