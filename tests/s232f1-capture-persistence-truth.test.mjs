import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CAPTURE_MEMORY_ONLY_SAVE_ERROR_EVIDENCE,
  CAPTURE_PERSISTENCE_METADATA_KEYS,
  buildCaptureCompletedEvidence,
  buildCaptureDedupeConflictEvidence,
  buildCapturePersistenceMetadata,
  buildDurableCapturePersistenceReceipt,
  resolvePendingCaptureSaveOperation,
} from "../lib/review-os/capture-persistence-controller.ts";
import {
  clearReviewOsBrowserState,
  listReviewOsLocalBetaNotes,
  saveReviewOsLocalBetaNoteWithStatus,
} from "../lib/review-os/browser-storage.ts";
import { buildFailureAwareStateModel } from "../lib/review-os/failure-aware-state.ts";

const read = (relativePath) => readFileSync(relativePath, "utf8");

const OPERATION_ID = "018f2f4a-7b2c-7d21-8a3f-1234567890ab";
const REVISION_ID = "018f2f4a-7b2c-7d22-9a3f-1234567890ab";
const OTHER_REVISION_ID = "018f2f4a-7b2c-7d23-aa3f-1234567890ab";
const RECORD_ID = "018f2f4a-7b2c-7d24-ba3f-1234567890ab";
const AT = "2026-07-15T03:04:05.000Z";
const operation = Object.freeze({ operationId: OPERATION_ID, workRevisionId: REVISION_ID });

test("S232F.1 binds durable Completed to the exact echoed save operation and work revision", () => {
  assert.deepEqual(CAPTURE_PERSISTENCE_METADATA_KEYS, {
    operationId: "persistence_operation_id",
    workRevisionId: "persistence_work_revision_id",
  });
  assert.deepEqual(buildCapturePersistenceMetadata(operation), {
    persistence_operation_id: OPERATION_ID,
    persistence_work_revision_id: REVISION_ID,
  });

  const record = {
    id: RECORD_ID,
    updatedAt: AT,
    rawPayload: {
      user_confirmed_fields: buildCapturePersistenceMetadata(operation),
    },
  };
  const receipt = buildDurableCapturePersistenceReceipt(record, operation);
  assert.deepEqual(receipt, {
    kind: "durable_record",
    recordId: RECORD_ID,
    operationId: OPERATION_ID,
    workRevisionId: REVISION_ID,
    persistedAt: AT,
  });
  const evidence = buildCaptureCompletedEvidence(receipt);
  const model = buildFailureAwareStateModel(evidence);
  assert.equal(model.state, "completed");
  assert.equal(model.persistence?.kind, "durable_record");
  assert.equal(model.operationId, OPERATION_ID);
  assert.equal(model.workRevisionId, REVISION_ID);
  assert.equal(
    buildCaptureDedupeConflictEvidence(record, operation, "2026-07-15T03:04:06.000Z"),
    null,
    "a bound durable record must never be reclassified as conflict",
  );

  for (const invalidRecord of [
    { ...record, rawPayload: {} },
    { ...record, rawPayload: { user_confirmed_fields: {} } },
    {
      ...record,
      rawPayload: {
        user_confirmed_fields: {
          persistence_operation_id: OPERATION_ID,
          persistence_work_revision_id: OTHER_REVISION_ID,
        },
      },
    },
    { ...record, id: "server-record" },
    { ...record, updatedAt: "2026-07-15" },
  ]) {
    assert.equal(
      buildDurableCapturePersistenceReceipt(invalidRecord, operation),
      null,
      `unbound durable record became Completed: ${JSON.stringify(invalidRecord)}`,
    );
  }

  for (const unprovenConflictRecord of [
    { ...record, rawPayload: {} },
    { ...record, rawPayload: { user_confirmed_fields: {} } },
    {
      ...record,
      rawPayload: {
        user_confirmed_fields: {
          persistence_operation_id: "malformed-operation",
          persistence_work_revision_id: OTHER_REVISION_ID,
        },
      },
    },
    {
      ...record,
      rawPayload: {
        user_confirmed_fields: {
          persistence_operation_id: OPERATION_ID,
          persistence_work_revision_id: "malformed-revision",
        },
      },
    },
    {
      ...record,
      rawPayload: {
        user_confirmed_fields: {
          persistence_operation_id: "018f2f4a-7b2c-7d25-8a3f-1234567890ab",
          persistence_work_revision_id: REVISION_ID,
        },
      },
    },
    { ...record, id: "server-record" },
    { ...record, updatedAt: "2026-07-15" },
  ]) {
    assert.equal(
      buildCaptureDedupeConflictEvidence(
        unprovenConflictRecord,
        operation,
        "2026-07-15T03:04:06.000Z",
      ),
      null,
      "missing, malformed, or same-revision evidence must fail closed",
    );
  }

  const staleDedupedRecord = {
    ...record,
    rawPayload: {
      user_confirmed_fields: {
        persistence_operation_id: "018f2f4a-7b2c-7d25-8a3f-1234567890ab",
        persistence_work_revision_id: OTHER_REVISION_ID,
      },
    },
  };
  assert.equal(
    buildDurableCapturePersistenceReceipt(staleDedupedRecord, operation),
    null,
    "an older deduped record cannot complete the current learner revision",
  );
  const conflictEvidence = buildCaptureDedupeConflictEvidence(
    staleDedupedRecord,
    operation,
    "2026-07-15T03:04:06.000Z",
  );
  assert.ok(conflictEvidence);
  const conflictModel = buildFailureAwareStateModel(conflictEvidence);
  assert.equal(conflictModel.state, "conflict");
  assert.equal(conflictModel.safety.kind, "memory_only");
  assert.equal(conflictModel.conflictSourceCount, 2);
  assert.equal(conflictModel.conflictComparator, "sync_revision");

  const acceptedRequest = resolvePendingCaptureSaveOperation(null, "same-work-snapshot");
  const responseLostRetry = resolvePendingCaptureSaveOperation(
    acceptedRequest,
    "same-work-snapshot",
  );
  assert.strictEqual(
    responseLostRetry,
    acceptedRequest,
    "an unchanged retry must reuse the accepted request binding",
  );
  const dedupedAcceptedRecord = {
    id: RECORD_ID,
    updatedAt: AT,
    rawPayload: {
      user_confirmed_fields: buildCapturePersistenceMetadata(
        acceptedRequest.binding,
      ),
    },
  };
  assert.ok(
    buildDurableCapturePersistenceReceipt(
      dedupedAcceptedRecord,
      responseLostRetry.binding,
    ),
    "accepted-but-response-lost must converge through the bound dedupe record",
  );
  const editedRetry = resolvePendingCaptureSaveOperation(
    responseLostRetry,
    "edited-work-snapshot",
  );
  assert.notEqual(
    editedRetry.binding.workRevisionId,
    responseLostRetry.binding.workRevisionId,
    "edited work must receive a new revision binding",
  );
});

test("S232F.1 round-trips only a browser-local summary and never synthesizes Completed", () => {
  const values = new Map();
  const localStorage = {
    get length() {
      return values.size;
    },
    key(index) {
      return Array.from(values.keys())[index] ?? null;
    },
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
    clear() {
      values.clear();
    },
  };
  globalThis.window = { localStorage };
  try {
    clearReviewOsBrowserState();
    const result = saveReviewOsLocalBetaNoteWithStatus({
      mode: "first",
      subjectLabel: "test-subject",
      sourceType: "text",
      problemTitle: "test-title",
      biggestGap: "one-gap-summary",
      nextAction: "one-next-action",
    });
    assert.equal(result.savedToBrowser, true);
    assert.deepEqual(Object.keys(result).sort(), ["note", "savedToBrowser"]);
    const [roundTripped] = listReviewOsLocalBetaNotes("first");
    assert.equal(roundTripped.id, result.note.id);
    assert.equal(roundTripped.biggestGap, "one-gap-summary");
    assert.equal(roundTripped.nextAction, "one-next-action");
    assert.equal("operationId" in roundTripped, false);
    assert.equal("workRevisionId" in roundTripped, false);
  } finally {
    delete globalThis.window;
  }

  const controller = read("lib/review-os/capture-persistence-controller.ts");
  assert.doesNotMatch(controller, /buildLocalCapturePersistenceReceipt/);
});

test("S232F.1 total save failure is memory-only, retryable, and excludes every success subtree", () => {
  const errorModel = buildFailureAwareStateModel(CAPTURE_MEMORY_ONLY_SAVE_ERROR_EVIDENCE);
  assert.equal(errorModel.state, "error");
  assert.equal(errorModel.safety.kind, "memory_only");
  assert.equal(errorModel.retryable, true);
  assert.equal(errorModel.autoSyncEligible, false);
  assert.match(errorModel.safety.message, /현재 화면/);
  assert.doesNotMatch(
    JSON.stringify(CAPTURE_MEMORY_ONLY_SAVE_ERROR_EVIDENCE),
    /queued_for_sync|autoSyncRegistered|queueId/,
  );

  const capture = read("components/review-os/capture-form.tsx");
  const failureStart = capture.indexOf("if (saveFailed) {");
  const localStart = capture.indexOf('if (persistenceStatus === "local_fallback_saved")', failureStart);
  assert.ok(failureStart >= 0 && localStart > failureStart);
  const failureBranch = capture.slice(failureStart, localStart);

  assert.match(failureBranch, /CAPTURE_MEMORY_ONLY_SAVE_ERROR_EVIDENCE/);
  assert.match(failureBranch, /입력 확인 후 다시 저장하기/);
  assert.match(failureBranch, /data-capture-persistence-failure/);
  assert.match(failureBranch, /data-capture-receipt-bound="false"/);
  assert.doesNotMatch(failureBranch, /todayPlanCandidate|reviewQueueCandidate/);
  assert.doesNotMatch(failureBranch, /CognitiveLearningActionCard/);
  assert.doesNotMatch(failureBranch, /오늘 할 일로 이동|학습 노트에서 보기|복습으로 이어가기/);
  assert.doesNotMatch(failureBranch, /data-capture-plan-reflection-stage/);
  assert.equal((failureBranch.match(/action=\{/g) ?? []).length, 1);

  assert.match(capture, /data-capture-persistence-state="saving"/);
  assert.match(capture, /작업 메모리에 남아 있으며, 저장 완료 영수증은 아직 확인되지 않았습니다/);
  assert.match(capture, /data-capture-work-lock=\{submitting \? "locked" : "editable"\}/);
  assert.match(capture, /disabled=\{submitting\}/);
  assert.match(capture, /resolvePendingCaptureSaveOperation/);
  assert.equal((capture.match(/settleCaptureSaveOperation\(operation\)/g) ?? []).length, 2);
  assert.equal((capture.match(/buildCaptureDedupeConflictEvidence\(result\.item, operation\)/g) ?? []).length, 2);
  assert.match(capture, /data-capture-dedupe-conflict/);
  assert.match(capture, /학습 노트에서 기존 기록 확인/);
  const conflictStart = capture.indexOf("if (confirmation.conflictEvidence)");
  const ordinaryFailureStart = capture.indexOf("if (saveFailed)", conflictStart);
  const conflictBranch = capture.slice(conflictStart, ordinaryFailureStart);
  assert.ok(conflictStart >= 0 && ordinaryFailureStart > conflictStart);
  assert.match(conflictBranch, /capture-persistence-conflict-state/);
  assert.match(conflictBranch, /\/app\/notes\?mode=/);
  assert.doesNotMatch(conflictBranch, /입력 확인 후 다시 저장하기|data-capture-plan-reflection-stage/);
  assert.equal((conflictBranch.match(/action=\{/g) ?? []).length, 1);

  const workLockStart = capture.indexOf("<fieldset", capture.indexOf('data-capture-persistence-state="saving"'));
  const footerStart = capture.indexOf("<BottomPrimaryAction", workLockStart);
  const workLockEnd = capture.indexOf("</fieldset>", footerStart);
  assert.ok(workLockStart >= 0 && footerStart > workLockStart && workLockEnd > footerStart);
  assert.match(capture, /submitting \|\| stage === "intake" \? null/);
  const previewFooterStart = capture.indexOf('stage === "preview" ? (', footerStart);
  const previewFooter = capture.slice(
    previewFooterStart,
    capture.indexOf('stage === "intake" ? null', previewFooterStart),
  );
  assert.match(previewFooter, /disabled=\{submitting\}/);
  assert.match(capture, /if \(stage === "saved-plan"\) return;/);
  assert.match(capture, /buildCapturePersistenceMetadata\(operation\)/);
  assert.equal((capture.match(/buildCapturePersistenceMetadata\(operation\)/g) ?? []).length, 2);
  assert.match(capture, /buildDurableCapturePersistenceReceipt\(result\.item, operation\)/);
  assert.equal((capture.match(/const persistenceEvidence = buildDurableCapturePersistenceReceipt\(result\.item, operation\)/g) ?? []).length, 2);
  assert.equal((capture.match(/if \(!persistenceEvidence\)/g) ?? []).length, 2);
  const firstReceiptCheck = capture.indexOf("if (!persistenceEvidence)");
  const firstDraftClear = capture.indexOf("clearReviewOsDraft(storageKey)", firstReceiptCheck);
  assert.ok(firstReceiptCheck >= 0 && firstDraftClear > firstReceiptCheck);
  assert.match(capture, /if \(!completedEvidence\)/);
  assert.match(capture, /data-capture-receipt-bound="true"/);
  const missingReceiptGuard = capture.indexOf("if (!completedEvidence)");
  const durableSuccessStage = capture.indexOf("data-capture-plan-reflection-stage", missingReceiptGuard);
  assert.ok(missingReceiptGuard >= 0 && durableSuccessStage > missingReceiptGuard);
  const missingReceiptBranch = capture.slice(missingReceiptGuard, durableSuccessStage);
  assert.match(missingReceiptBranch, /CAPTURE_MEMORY_ONLY_SAVE_ERROR_EVIDENCE/);
  assert.doesNotMatch(missingReceiptBranch, /오늘 할 일로 이동|todayPlanCandidate|CognitiveLearningActionCard/);
  assert.equal((missingReceiptBranch.match(/action=\{/g) ?? []).length, 1);
  assert.doesNotMatch(capture, /queued_for_sync|autoSyncRegistered|queueId/);

  const durableStart = capture.indexOf("data-capture-plan-reflection-stage", localStart);
  assert.ok(localStart >= 0 && durableStart > localStart);
  const localBranch = capture.slice(localStart, missingReceiptGuard);
  assert.match(localBranch, /data-capture-local-summary/);
  assert.match(localBranch, /원문 입력은 이 작성 화면에 그대로 남아 있습니다/);
  assert.match(localBranch, /자동 동기화는 등록되지 않았으므로/);
  assert.doesNotMatch(localBranch, /buildCaptureCompletedEvidence|FailureAwareState/);
  assert.doesNotMatch(localBranch, /todayPlanCandidate|reviewQueueCandidate|CognitiveLearningActionCard/);
  assert.equal((localBranch.match(/<Button/g) ?? []).length, 1);

  const localSaveStart = capture.indexOf("async function saveLocalCaptureConfirmation");
  const localSaveEnd = capture.indexOf("function getLearnerCaptureContent", localSaveStart);
  const localSaveController = capture.slice(localSaveStart, localSaveEnd);
  assert.doesNotMatch(localSaveController, /clearReviewOsDraft/);
  assert.doesNotMatch(localSaveController, /persistenceEvidence/);
});

test("S232F.1 keeps Capture and Write on the same truthful controller and wires exact-head runtime", () => {
  const capturePage = read("app/app/capture/page.tsx");
  const writePage = read("app/app/write/page.tsx");
  const workflow = read(".github/workflows/s232f1-runtime.yml");
  const runtime = read("tests/e2e/s232f1-capture-persistence-truth.spec.ts");
  const docs = read("docs/qa/s232f1-capture-persistence-truth.md");

  assert.match(capturePage, /WrongAnswerCaptureForm/);
  assert.match(writePage, /WrongAnswerCaptureForm/);
  assert.match(workflow, /pull_request\.head\.sha/);
  assert.match(workflow, /run-s232f1-auth-e2e/);
  assert.match(workflow, /E2E_TARGET_SHA/);
  assert.match(workflow, /metadata-only S232F\.1 evidence/i);
  assert.match(runtime, /capture-persistence-error-state/);
  assert.match(runtime, /data-capture-plan-reflection-stage/);
  assert.match(runtime, /입력 확인 후 다시 저장하기/);
  assert.match(runtime, /textInputMethod = captureForm\.getByRole\("button", \{ name: "텍스트 붙여넣기", exact: true \}\)/);
  assert.match(runtime, /waitForReactClickHandler/);
  assert.ok(runtime.indexOf('await waitForReactClickHandler(textInputMethod, "Capture text input")') < runtime.indexOf("await textInputMethod.click()"));
  assert.ok(runtime.indexOf("await textInputMethod.click()") < runtime.indexOf("await expect(learnerInput).toBeVisible()"));
  assert.match(runtime, /AxeBuilder/);
  assert.match(runtime, /390/);
  assert.match(runtime, /1440/);
  assert.match(runtime, /rawLearnerContentCaptured:\s*false/);
  assert.match(runtime, /operationIdCaptured:\s*false/);
  assert.match(runtime, /workRevisionIdCaptured:\s*false/);
  assert.match(runtime, /recordIdCaptured:\s*false/);
  assert.match(docs, /no schema, API, auth, entitlement, or analytics/i);
});
