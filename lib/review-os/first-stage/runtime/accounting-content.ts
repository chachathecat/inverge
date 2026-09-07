import { loadPrivateReviewedContent, type PrivateContentInput } from "./private-reviewed-content";

export { PRIVATE_CONTENT_MAX_BYTES as ACCOUNTING_CONTENT_MAX_BYTES,
  PRIVATE_CONTENT_REVIEW_CHECKS as ACCOUNTING_REVIEW_CHECKS,
  type PrivateContentApproval as AccountingContentApproval } from "./private-reviewed-content";

/** Accounting remains a separate exact-schema/key/subject catalog, not economics stock. */
export const loadAccountingContent = (options: PrivateContentInput) =>
  loadPrivateReviewedContent("accounting", options);
