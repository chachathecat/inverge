import { loadPrivateReviewedContent, type PrivateContentInput } from "./private-reviewed-content";

// Preserve the installed economics entry, schema and every deterministic identity.
export { PRIVATE_CONTENT_MAX_BYTES as ECONOMICS_CONTENT_MAX_BYTES,
  PRIVATE_CONTENT_REVIEW_CHECKS as ECONOMICS_REVIEW_CHECKS,
  type PrivateContentApproval as EconomicsContentApproval } from "./private-reviewed-content";

export const loadEconomicsContent = (options: PrivateContentInput) =>
  loadPrivateReviewedContent("economics_principles", options);
