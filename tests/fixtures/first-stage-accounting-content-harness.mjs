import assert from "node:assert/strict";
import { economicsPacket, syntheticContentInput } from "./first-stage-economics-content-harness.mjs";
import { loadAccountingContent } from "../../lib/review-os/first-stage/runtime/accounting-content.ts";
import { privateSessionDigest as digest } from "../../lib/review-os/first-stage/runtime/session-service.ts";

// Synthetic transport/adapter inputs only. Not a reviewed accounting question bank.
export function accountingPacket() {
  const packet = economicsPacket();
  packet.schemaVersion = "first_stage.accounting_private_content.v1";
  packet.version = "synthetic-accounting-v1";
  for (const [index, row] of packet.questions.entries()) {
    row.reference.subjectId = "accounting";
    row.reference.questionId = row.reference.questionId.replace("economics", "accounting");
    if (row.sourceQuestionId) row.sourceQuestionId = row.sourceQuestionId.replace("economics", "accounting");
    row.concept.id = "synthetic-accounting-concept";
    row.stem = index ? `SYNTHETIC_ACCOUNTING_RETRY_${index}` : "SYNTHETIC_PRIVATE_ACCOUNTING_BODY";
    row.easyExplanation = "SYNTHETIC_PRIVATE_ACCOUNTING_EXPLANATION";
    packet.keys[index].questionReferenceSha256 = digest(row.reference);
  }
  return packet;
}
export const syntheticAccountingInput = (packet = accountingPacket()) => syntheticContentInput(packet);
export const accountingCatalog = await loadAccountingContent(syntheticAccountingInput());
assert.ok(accountingCatalog, "synthetic accounting must pass the actual loader and adapter");
