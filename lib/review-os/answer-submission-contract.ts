import type { AppraisalMode } from "./appraisal";
import { assertNoRawUserDataInDerived, sanitizeDerivedMetadata } from "./data-boundary";
import type { SourceType } from "./types";

export const ANSWER_SUBMISSION_OCR_TRUST_COPY = "OCR 결과는 초안입니다. 저장 전 직접 확인해 주세요.";

export type LearnerAnswerSubmissionInputKind = "image" | "pdf" | "text";

export type LearnerAnswerSubmissionOcrState =
  | "not_required_text_input"
  | "draft_needs_learner_confirmation"
  | "confirmed_by_learner"
  | "manual_text_fallback";

export type LearnerAnswerSubmissionPersistenceContract = {
  version: "s204.learner_answer_submission.v1";
  dataClass: "user_owned_service_data";
  ownerBinding: "authenticated_request_user";
  ownerUserId: string;
  examMode: "second";
  subject: string;
  source: {
    inputKind: LearnerAnswerSubmissionInputKind;
    originalSourceType: SourceType;
    pageCount: number;
    uploadBytesPersisted: false;
  };
  ocr: {
    state: LearnerAnswerSubmissionOcrState;
    trustCopy: typeof ANSWER_SUBMISSION_OCR_TRUST_COPY;
    editableBeforeSave: true;
    editedBeforeSave: boolean;
    confirmedByLearner: boolean;
    lowConfidenceFlag: boolean;
    captureQualityIssue: string | null;
    confirmedTextLength: number;
    storedInUserOwnedRecord: true;
  };
  save: {
    target: "review_os_wrong_answer_item";
    durableWhenAuthenticated: true;
    recoveryAfterRefresh: "server_record_after_save_local_draft_before_save";
    learnerRouteOnly: true;
    instructorRouteSeparated: true;
    globalReferenceWrite: false;
    modelTrainingUse: false;
    resultStartsWithGapAndAction: true;
    authorityClaim: "learning_support_draft";
  };
};

export type LearnerAnswerSubmissionDerivedMetadata = {
  contractVersion: LearnerAnswerSubmissionPersistenceContract["version"];
  dataClass: "derived_learning_metadata";
  examMode: "second";
  subject: string;
  sourceType: SourceType;
  inputKind: LearnerAnswerSubmissionInputKind;
  pageCount: number;
  ocrConfirmationState: LearnerAnswerSubmissionOcrState;
  ocrConfirmedByLearner: boolean;
  lowConfidenceFlag: boolean;
  captureQualityIssue: string | null;
  editableBeforeSave: true;
  learnerOwned: true;
  globalReferenceWrite: false;
  modelTrainingUse: false;
  resultStartsWithGapAndAction: true;
};

type BuildContractInput = {
  userId: string;
  mode: AppraisalMode;
  subject: string;
  sourceType: SourceType;
  pageCount?: number | null;
  lowConfidenceFlag?: boolean | null;
  captureQualityIssue?: string | null;
  hasManualCorrection?: boolean | null;
  ocrConfirmedByLearner?: boolean | null;
  confirmedText?: string | null;
};

function normalizeInputKind(sourceType: SourceType): LearnerAnswerSubmissionInputKind {
  if (sourceType === "pdf") return "pdf";
  if (sourceType === "photo" || sourceType === "image") return "image";
  return "text";
}

function normalizePageCount(value: number | null | undefined, inputKind: LearnerAnswerSubmissionInputKind) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return Math.round(value);
  return inputKind === "text" ? 0 : 1;
}

function normalizeQualityIssue(value: string | null | undefined) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || null;
}

export function resolveLearnerAnswerSubmissionOcrState(input: {
  sourceType: SourceType;
  lowConfidenceFlag?: boolean | null;
  captureQualityIssue?: string | null;
  hasManualCorrection?: boolean | null;
  ocrConfirmedByLearner?: boolean | null;
}): LearnerAnswerSubmissionOcrState {
  const inputKind = normalizeInputKind(input.sourceType);
  const qualityIssue = normalizeQualityIssue(input.captureQualityIssue);
  const confirmed = input.ocrConfirmedByLearner === true;
  const edited = input.hasManualCorrection === true;

  if (confirmed || edited) return "confirmed_by_learner";
  if (qualityIssue && /manual|fallback|pdf/i.test(qualityIssue)) return "manual_text_fallback";
  if (inputKind === "text") return "not_required_text_input";
  if (input.lowConfidenceFlag || inputKind === "image" || inputKind === "pdf") {
    return "draft_needs_learner_confirmation";
  }
  return "draft_needs_learner_confirmation";
}

export function buildLearnerAnswerSubmissionPersistenceContract(
  input: BuildContractInput,
): LearnerAnswerSubmissionPersistenceContract | null {
  if (input.mode !== "second") return null;

  const inputKind = normalizeInputKind(input.sourceType);
  const lowConfidenceFlag = input.lowConfidenceFlag === true;
  const hasManualCorrection = input.hasManualCorrection === true;
  const confirmedByLearner = input.ocrConfirmedByLearner === true || hasManualCorrection;
  const captureQualityIssue = normalizeQualityIssue(input.captureQualityIssue);
  const confirmedTextLength = typeof input.confirmedText === "string" ? input.confirmedText.trim().length : 0;

  return {
    version: "s204.learner_answer_submission.v1",
    dataClass: "user_owned_service_data",
    ownerBinding: "authenticated_request_user",
    ownerUserId: input.userId,
    examMode: "second",
    subject: input.subject,
    source: {
      inputKind,
      originalSourceType: input.sourceType,
      pageCount: normalizePageCount(input.pageCount, inputKind),
      uploadBytesPersisted: false,
    },
    ocr: {
      state: resolveLearnerAnswerSubmissionOcrState({
        sourceType: input.sourceType,
        lowConfidenceFlag,
        captureQualityIssue,
        hasManualCorrection,
        ocrConfirmedByLearner: confirmedByLearner,
      }),
      trustCopy: ANSWER_SUBMISSION_OCR_TRUST_COPY,
      editableBeforeSave: true,
      editedBeforeSave: hasManualCorrection,
      confirmedByLearner,
      lowConfidenceFlag,
      captureQualityIssue,
      confirmedTextLength,
      storedInUserOwnedRecord: true,
    },
    save: {
      target: "review_os_wrong_answer_item",
      durableWhenAuthenticated: true,
      recoveryAfterRefresh: "server_record_after_save_local_draft_before_save",
      learnerRouteOnly: true,
      instructorRouteSeparated: true,
      globalReferenceWrite: false,
      modelTrainingUse: false,
      resultStartsWithGapAndAction: true,
      authorityClaim: "learning_support_draft",
    },
  };
}

export function buildLearnerAnswerSubmissionDerivedMetadata(
  contract: LearnerAnswerSubmissionPersistenceContract | null,
): LearnerAnswerSubmissionDerivedMetadata | null {
  if (!contract) return null;

  const metadata = sanitizeDerivedMetadata({
    contractVersion: contract.version,
    dataClass: "derived_learning_metadata",
    examMode: contract.examMode,
    subject: contract.subject,
    sourceType: contract.source.originalSourceType,
    inputKind: contract.source.inputKind,
    pageCount: contract.source.pageCount,
    ocrConfirmationState: contract.ocr.state,
    ocrConfirmedByLearner: contract.ocr.confirmedByLearner,
    lowConfidenceFlag: contract.ocr.lowConfidenceFlag,
    captureQualityIssue: contract.ocr.captureQualityIssue,
    editableBeforeSave: true,
    learnerOwned: true,
    globalReferenceWrite: false,
    modelTrainingUse: false,
    resultStartsWithGapAndAction: true,
  }) as LearnerAnswerSubmissionDerivedMetadata;

  assertNoRawUserDataInDerived(metadata);
  return metadata;
}
