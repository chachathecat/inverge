"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  BiggestGap,
  V3ActionButton,
  V3ActionLink,
  V3QuietDisclosure,
  V3RouteFrame,
  V3Surface,
} from "@/components/learner";
import { Textarea } from "@/components/ui/textarea";
import { normalizeAnswerReviewStructureDraft } from "@/lib/evaluate/answer-review-structure";
import {
  APP1_LIMITS,
  APP1_RUNTIME_BOUNDARY_RECEIPT,
  app1GuidedRepairHref,
  buildApp1NextReviewReceipt,
  buildApp1StructureSummary,
  evaluateApp1SameSessionRepair,
  getApp1LearnerAnswer,
  type App1NextReviewReceipt,
  type App1PrimaryGap,
  type App1RepairVerification,
} from "@/lib/owner-study/app1-capture-repair-view-model";
import {
  buildCaptureDedupeConflictEvidence,
  buildDurableCapturePersistenceReceipt,
  resolvePendingCaptureSaveOperation,
  type PendingCaptureSaveOperation,
} from "@/lib/review-os/capture-persistence-controller";
import type { WrongAnswerDetail } from "@/lib/review-os/types";

type TrustedRepairSubject =
  | "appraisal_practical"
  | "appraisal_theory"
  | "appraisal_law";

type App1Phase =
  | "loading"
  | "structure_confirmation"
  | "analyzing"
  | "evidence_review"
  | "direct_repair"
  | "verifying"
  | "repair_verification"
  | "saving"
  | "completed"
  | "saved_without_queue"
  | "failed";

const SUBJECT_ACCESS: Readonly<Record<string, TrustedRepairSubject>> =
  Object.freeze({
    감정평가실무: "appraisal_practical",
    감정평가이론: "appraisal_theory",
    "감정평가 및 보상법규": "appraisal_law",
  });

const VERIFICATION_LABELS: Readonly<Record<App1RepairVerification["state"], string>> =
  Object.freeze({
    repair_confirmed_for_this_session: "이 세션의 요청한 복구 1개가 확인되었습니다",
    one_connection_still_missing: "연결 1개가 아직 남아 있습니다",
    guided_path_needed: "구조화된 가이드 경로가 필요합니다",
    deferred: "이번 복구는 보류되었습니다",
    blocked_by_ocr_or_source_uncertainty: "OCR·원문 불확실성으로 복구 확인이 차단되었습니다",
  });

const POLICY_WINDOW_LABELS: Readonly<Record<App1NextReviewReceipt["policyWindow"], string>> =
  Object.freeze({
    "D+1": "D+1 독립 복습",
    later_transfer: "후속 전이 복습",
    timed_work: "시간 제한 작업",
    independent_review: "다음 독립 복습",
  });

function subjectAllowed(
  subject: string,
  availableSubjects: readonly TrustedRepairSubject[],
) {
  const required = SUBJECT_ACCESS[subject];
  return Boolean(required && availableSubjects.includes(required));
}

function safeError(value: unknown, fallback: string) {
  return value instanceof Error && value.message ? value.message : fallback;
}

const ANALYSIS_FAILURE_MESSAGE =
  "답안 분석을 완료하지 못했습니다. 입력은 그대로 남아 있습니다.";
const VERIFICATION_FAILURE_MESSAGE =
  "복구 입력 검토를 완료하지 못했습니다. 성공으로 처리되지 않았습니다.";
const AUTHORITY_EXPIRED_MESSAGE =
  "분석 기준 시간이 만료되었습니다. 복구 입력은 유지됩니다. 현재 기록을 다시 분석한 뒤 확인해 주세요.";

class App1StructureRequestError extends Error {
  constructor(
    message: string,
    readonly errorCode: string | null,
  ) {
    super(message);
    this.name = "App1StructureRequestError";
  }
}

async function sha256Text(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function requestStructure(
  detail: WrongAnswerDetail,
  answerText: string,
  requestPurpose:
    | "app1_initial_analysis"
    | "repair_verification",
  failureMessage: string,
  authority?: Readonly<{
    primaryGap: App1PrimaryGap;
    analysisBinding: string;
    persistenceOperationId: string;
    persistenceWorkRevisionId: string;
  }>,
) {
  const formData = new FormData();
  formData.set("questionText", detail.item.rawQuestionText ?? "");
  formData.set("answerText", answerText);
  formData.set("referenceText", detail.item.correctAnswer === "-" ? "" : detail.item.correctAnswer);
  formData.set("examMode", "second");
  formData.set("subject", detail.item.subjectLabel);
  formData.set("explanationLevel", "standard");
  formData.set("requestPurpose", requestPurpose);
  formData.set("sourceItemId", detail.item.id);
  if (requestPurpose === "repair_verification" && authority) {
    formData.set("primaryGap", JSON.stringify(authority.primaryGap));
    formData.set("analysisBinding", authority.analysisBinding);
    formData.set(
      "persistenceOperationId",
      authority.persistenceOperationId,
    );
    formData.set(
      "persistenceWorkRevisionId",
      authority.persistenceWorkRevisionId,
    );
  }
  const response = await fetch("/api/answer-review/structure", {
    method: "POST",
    body: formData,
  });
  const payload = (await response.json().catch(() => null)) as
    | {
        ok: true;
        draft: unknown;
        primaryGap?: App1PrimaryGap;
        analysisBinding?: string;
        verification?: App1RepairVerification;
        verificationReceipt?: string | null;
      }
    | { ok: false; errorCode?: string }
    | null;
  if (!response.ok || !payload?.ok) {
    throw new App1StructureRequestError(
      failureMessage,
      payload && !payload.ok && typeof payload.errorCode === "string"
        ? payload.errorCode
        : null,
    );
  }
  return {
    draft: normalizeAnswerReviewStructureDraft(payload.draft),
    primaryGap: payload.primaryGap,
    analysisBinding: payload.analysisBinding,
    verification: payload.verification,
    verificationReceipt: payload.verificationReceipt ?? null,
  };
}

export function App1CaptureRepairLoop({
  ownerScope,
  itemId,
  availableSubjects,
}: {
  ownerScope: string;
  itemId: string;
  availableSubjects: readonly TrustedRepairSubject[];
}) {
  const [phase, setPhase] = useState<App1Phase>("loading");
  const [detail, setDetail] = useState<WrongAnswerDetail | null>(null);
  const [gap, setGap] = useState<App1PrimaryGap | null>(null);
  const [repairText, setRepairText] = useState("");
  const [verification, setVerification] =
    useState<App1RepairVerification | null>(null);
  const [analysisBinding, setAnalysisBinding] = useState<string | null>(null);
  const [verificationReceipt, setVerificationReceipt] =
    useState<string | null>(null);
  const [nextReview, setNextReview] =
    useState<App1NextReviewReceipt | null>(null);
  const [persistedRecordId, setPersistedRecordId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const pendingSaveRef = useRef<PendingCaptureSaveOperation | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const repairRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setPhase("loading");
      setError(null);
      try {
        const response = await fetch(`/api/os/items/${encodeURIComponent(itemId)}`, {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as
          | { ok: true; detail: WrongAnswerDetail | null }
          | { ok: false; error?: string }
          | null;
        if (!response.ok || !payload?.ok || !payload.detail) {
          throw new Error("저장된 Capture 기록을 불러오지 못했습니다.");
        }
        if (
          payload.detail.item.examName !== "감정평가사 2차" ||
          !subjectAllowed(payload.detail.item.subjectLabel, availableSubjects)
        ) {
          throw new Error("이 Owner 범위에서 복구할 수 없는 기록입니다.");
        }
        if (!active) return;
        setDetail(payload.detail);
        setPhase("structure_confirmation");
      } catch (loadError) {
        if (!active) return;
        setError(
          safeError(loadError, "저장된 Capture 기록을 불러오지 못했습니다."),
        );
        setPhase("failed");
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [availableSubjects, itemId]);

  useEffect(() => {
    if (phase === "loading") return;
    const frame = requestAnimationFrame(() => headingRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  const summary = useMemo(
    () => (detail ? buildApp1StructureSummary(detail) : null),
    [detail],
  );

  async function analyze() {
    if (!detail || !summary) return;
    if (!summary.ocrConfirmed || !getApp1LearnerAnswer(detail)) {
      setError(
        summary.uncertainty ??
          "확인된 학습자 답안이 없어 분석을 시작할 수 없습니다.",
      );
      return;
    }
    setPhase("analyzing");
    setError(null);
    setGap(null);
    setVerification(null);
    setAnalysisBinding(null);
    setVerificationReceipt(null);
    pendingSaveRef.current = null;
    try {
      const result = await requestStructure(
        detail,
        getApp1LearnerAnswer(detail),
        "app1_initial_analysis",
        ANALYSIS_FAILURE_MESSAGE,
      );
      if (
        !result.primaryGap ||
        typeof result.analysisBinding !== "string" ||
        !result.analysisBinding
      ) {
        throw new Error(ANALYSIS_FAILURE_MESSAGE);
      }
      setGap(result.primaryGap);
      setAnalysisBinding(result.analysisBinding);
      setPhase("evidence_review");
    } catch {
      setError(ANALYSIS_FAILURE_MESSAGE);
      setPhase("structure_confirmation");
    }
  }

  function beginRepair() {
    setVerification(null);
    setVerificationReceipt(null);
    pendingSaveRef.current = null;
    setError(null);
    setPhase("direct_repair");
    requestAnimationFrame(() => repairRef.current?.focus());
  }

  function returnToFreshAnalysis() {
    setGap(null);
    setAnalysisBinding(null);
    setVerification(null);
    setVerificationReceipt(null);
    pendingSaveRef.current = null;
    setConflict(false);
    setError(AUTHORITY_EXPIRED_MESSAGE);
    setPhase("structure_confirmation");
  }

  async function verifyRepair() {
    if (!detail || !gap || !analysisBinding) return;
    const trimmed = repairText.trim();
    const preliminary = evaluateApp1SameSessionRepair({
      detail,
      requestedGap: gap,
      repairText: trimmed,
      repairDraft: null,
    });
    if (trimmed.length < APP1_LIMITS.minimumRepairCharacters) {
      setVerification(preliminary);
      setVerificationReceipt(null);
      pendingSaveRef.current = null;
      setPhase("repair_verification");
      return;
    }
    setPhase("verifying");
    setError(null);
    try {
      const workFingerprint = await sha256Text(
        `${ownerScope}\u0000${detail.item.id}\u0000${analysisBinding}\u0000${gap.gap}\u0000${trimmed}`,
      );
      const pending = resolvePendingCaptureSaveOperation(
        pendingSaveRef.current,
        workFingerprint,
      );
      pendingSaveRef.current = pending;
      const result = await requestStructure(
        detail,
        trimmed,
        "repair_verification",
        VERIFICATION_FAILURE_MESSAGE,
        {
          primaryGap: gap,
          analysisBinding,
          persistenceOperationId: pending.binding.operationId,
          persistenceWorkRevisionId: pending.binding.workRevisionId,
        },
      );
      if (!result.verification) {
        throw new Error(VERIFICATION_FAILURE_MESSAGE);
      }
      const receipt =
        result.verification.state === "repair_confirmed_for_this_session" &&
        typeof result.verificationReceipt === "string" &&
        result.verificationReceipt
          ? result.verificationReceipt
          : null;
      setVerification(result.verification);
      setVerificationReceipt(receipt);
      setPhase("repair_verification");
    } catch (verificationError) {
      if (
        verificationError instanceof App1StructureRequestError &&
        [
          "APP1_ANALYSIS_BINDING_INVALID",
          "APP1_VERIFICATION_EXPIRED",
        ].includes(verificationError.errorCode ?? "")
      ) {
        returnToFreshAnalysis();
        return;
      }
      setVerification(preliminary);
      setVerificationReceipt(null);
      pendingSaveRef.current = null;
      setError(VERIFICATION_FAILURE_MESSAGE);
      setPhase("repair_verification");
    }
  }

  function deferRepair() {
    if (!detail || !gap) return;
    setVerification(
      evaluateApp1SameSessionRepair({
        detail,
        requestedGap: gap,
        repairText,
        repairDraft: null,
        deferred: true,
      }),
    );
    setVerificationReceipt(null);
    pendingSaveRef.current = null;
    setPhase("repair_verification");
  }

  function editRepairAfterConflict() {
    if (!conflict) return;
    pendingSaveRef.current = null;
    setVerification(null);
    setVerificationReceipt(null);
    setConflict(false);
    setError(null);
    setPhase("direct_repair");
    requestAnimationFrame(() => repairRef.current?.focus());
  }

  function updateRepairText(value: string) {
    setRepairText(value.slice(0, APP1_LIMITS.maximumRepairCharacters));
    setVerification(null);
    setVerificationReceipt(null);
    pendingSaveRef.current = null;
    setConflict(false);
  }

  async function saveRepair() {
    if (!detail || !gap || !verification || !analysisBinding) return;
    const pending = pendingSaveRef.current;
    if (
      verification.state !== "repair_confirmed_for_this_session" ||
      !verificationReceipt ||
      !pending
    ) {
      setError("완료되지 않은 복구는 성공 기록으로 저장하지 않습니다.");
      return;
    }
    setPhase("saving");
    setError(null);
    setConflict(false);
    try {
      const body = {
        commandVersion: "App1VerifiedRepairPersistenceCommandV1",
        sourceItemId: detail.item.id,
        primaryGap: gap,
        analysisBinding,
        verificationReceipt,
        repairText: repairText.trim(),
        persistenceOperationId: pending.binding.operationId,
        persistenceWorkRevisionId: pending.binding.workRevisionId,
      };
      const response = await fetch("/api/os/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            ok: true;
            deduped?: boolean;
            item: {
              id: string;
              updatedAt?: string;
              rawPayload?: Record<string, unknown>;
            };
          }
        | { ok: false; error?: string; errorCode?: string }
        | null;
      if (!response.ok || !payload?.ok || !payload.item) {
        if (
          payload &&
          !payload.ok &&
          [
            "APP1_VERIFICATION_EXPIRED",
            "APP1_ANALYSIS_BINDING_INVALID",
          ].includes(payload.errorCode ?? "")
        ) {
          returnToFreshAnalysis();
          return;
        }
        if (
          payload &&
          !payload.ok &&
          payload.errorCode === "APP1_VERIFICATION_RECEIPT_INVALID"
        ) {
          pendingSaveRef.current = null;
          setVerification(null);
          setVerificationReceipt(null);
          setError(
            "복구 확인 입력이 변경되었습니다. 입력은 유지되며 다시 확인해야 합니다.",
          );
          setPhase("direct_repair");
          return;
        }
        throw new Error("복구 기록 저장에 실패했습니다. 완료로 처리되지 않았습니다.");
      }
      const receipt = buildDurableCapturePersistenceReceipt(
        payload.item,
        pending.binding,
      );
      if (!receipt) {
        const dedupeConflict = payload.deduped
          ? buildCaptureDedupeConflictEvidence(payload.item, pending.binding)
          : null;
        setConflict(Boolean(dedupeConflict));
        throw new Error(
          dedupeConflict
            ? "같은 기록의 다른 수정본이 확인되었습니다. 중복 성공으로 처리하지 않았습니다."
            : "계정 저장 영수증을 확인하지 못했습니다. 완료로 처리되지 않았습니다.",
        );
      }

      pendingSaveRef.current = null;
      setVerificationReceipt(null);
      setPersistedRecordId(payload.item.id);
      let queueReceipt: App1NextReviewReceipt | null = null;
      try {
        const itemResponse = await fetch(
          `/api/os/items/${encodeURIComponent(payload.item.id)}`,
          { method: "GET", cache: "no-store" },
        );
        const itemPayload = (await itemResponse.json().catch(() => null)) as
          | { ok: true; detail: WrongAnswerDetail | null }
          | { ok: false }
          | null;
        queueReceipt =
          itemResponse.ok && itemPayload?.ok && itemPayload.detail
            ? buildApp1NextReviewReceipt(
                itemPayload.detail,
                payload.item.id,
                receipt,
              )
            : null;
      } catch {
        queueReceipt = null;
      }
      if (!queueReceipt) {
        setNextReview(null);
        setPhase("saved_without_queue");
        return;
      }
      setNextReview(queueReceipt);
      setPhase("completed");
    } catch (saveError) {
      setError(
        safeError(
          saveError,
          "복구 기록 저장에 실패했습니다. 완료로 처리되지 않았습니다.",
        ),
      );
      setPhase("repair_verification");
    }
  }

  const busy = ["loading", "analyzing", "verifying", "saving"].includes(phase);
  const phaseLabel = {
    loading: "저장된 기록 확인",
    structure_confirmation: "구조 확인",
    analyzing: "분석",
    evidence_review: "가장 큰 간극 1개",
    direct_repair: "직접 복구",
    verifying: "복구 확인",
    repair_verification: "복구 확인",
    saving: "저장",
    completed: "다음 복습",
    saved_without_queue: "복습 영수증 확인 필요",
    failed: "불러오기 실패",
  }[phase];

  return (
    <V3RouteFrame width="reading" className="space-y-6" data-app1-owner-capture-repair>
      <header className="space-y-2">
        <p className="v3-type-caption text-[var(--color-text-brand)]">
          Owner 전용 · 기본 비활성 · {phaseLabel}
        </p>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="v3-type-screen ko-keep text-[var(--color-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-border-focus)]"
        >
          Capture에서 직접 복구까지
        </h1>
        <p className="v3-type-body ko-keep text-[var(--color-text-secondary)]">
          확인한 답안에서 가장 큰 연결 1개만 고치고, 실제 저장 영수증이 있을 때만 다음 복습을 안내합니다.
        </p>
      </header>

      <nav aria-label="Capture 복구 위치" className="v3-type-caption text-[var(--color-text-secondary)]">
        오늘 한 것 올리기 → 구조 확인 → 간극 1개 → 직접 복구 → 다음 복습
      </nav>

      {busy ? (
        <div role="status" aria-live="polite" aria-busy="true">
          <V3Surface tone="subtle">
            <p className="v3-type-label-strong text-[var(--color-text-primary)]">
              {phase === "loading"
                ? "저장된 Capture 기록을 확인하고 있습니다."
                : phase === "analyzing"
                  ? "확인된 답안만 분석하고 있습니다."
                  : phase === "verifying"
                    ? "직접 쓴 복구 입력의 한 기준만 확인하고 있습니다."
                    : "복구 기록과 다음 복습 영수증을 확인하고 있습니다."}
            </p>
            <p className="v3-type-compact mt-2 text-[var(--color-text-secondary)]">
              응답이 끝나기 전에는 성공이나 복습 예약으로 표시하지 않습니다.
            </p>
          </V3Surface>
        </div>
      ) : null}

      {phase === "structure_confirmation" && detail && summary ? (
        <V3Surface className="space-y-5" data-app1-structure-confirmation>
          <div>
            <p className="v3-type-caption text-[var(--color-text-brand)]">3. 구조 확인</p>
            <h2 className="v3-type-section ko-keep mt-1 text-[var(--color-text-primary)]">
              분석할 내용을 먼저 확인하세요
            </h2>
          </div>
          <dl className="divide-y divide-[var(--color-border-default)] border-y border-[var(--color-border-default)]">
            <div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]">
              <dt className="v3-type-caption text-[var(--color-text-secondary)]">과목</dt>
              <dd className="v3-type-body text-[var(--color-text-primary)]">{summary.subject}</dd>
            </div>
            <div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]">
              <dt className="v3-type-caption text-[var(--color-text-secondary)]">확인된 구간</dt>
              <dd className="v3-type-body text-[var(--color-text-primary)]">
                {summary.detectedSections.join(" · ") || "확인 필요"}
              </dd>
            </div>
            <div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]">
              <dt className="v3-type-caption text-[var(--color-text-secondary)]">페이지/구간 수</dt>
              <dd className="v3-type-body tabular-nums text-[var(--color-text-primary)]">
                {summary.pageOrSectionCount}
              </dd>
            </div>
            <div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]">
              <dt className="v3-type-caption text-[var(--color-text-secondary)]">OCR 확인</dt>
              <dd className="v3-type-body text-[var(--color-text-primary)]">
                {summary.ocrConfirmed ? "학습자 확인됨" : "확인 영수증 없음"}
              </dd>
            </div>
          </dl>
          {summary.uncertainty ? (
            <p className="v3-type-compact rounded-[var(--v3-radius-control)] border border-[var(--color-border-attention)] bg-[var(--color-background-attention)] p-4 text-[var(--color-text-primary)]" role="alert">
              {summary.uncertainty}
            </p>
          ) : null}
          <V3ActionButton
            type="button"
            onClick={() => void analyze()}
            disabled={!summary.ocrConfirmed || !getApp1LearnerAnswer(detail)}
            data-app1-analyze
          >
            이 내용으로 분석
          </V3ActionButton>
        </V3Surface>
      ) : null}

      {phase === "evidence_review" && gap ? (
        <V3Surface className="space-y-5" data-app1-evidence-review>
          <div>
            <p className="v3-type-caption text-[var(--color-text-brand)]">4. Evidence Review</p>
            <h2 className="v3-type-section ko-keep mt-1 text-[var(--color-text-primary)]">
              지금 고칠 연결 1개
            </h2>
          </div>
          <div data-app1-primary-gap-count="1">
            <BiggestGap
              headingId="app1-primary-gap"
              gap={gap.gap}
              evidence={`${gap.anchor} · ${gap.whyItMatters}`}
              type="MissingLink"
            />
          </div>
          <dl className="grid gap-3 rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-subtle)] p-4">
            <div><dt className="v3-type-caption text-[var(--color-text-secondary)]">과목</dt><dd className="v3-type-body mt-1 text-[var(--color-text-primary)]">{gap.subject}</dd></div>
            <div><dt className="v3-type-caption text-[var(--color-text-secondary)]">확인된 부분</dt><dd className="v3-type-body mt-1 text-[var(--color-text-primary)]">{gap.alreadySuccessful}</dd></div>
            <div><dt className="v3-type-caption text-[var(--color-text-secondary)]">직접 할 복구</dt><dd className="v3-type-body mt-1 text-[var(--color-text-primary)]">{gap.repairAction}</dd></div>
            <div><dt className="v3-type-caption text-[var(--color-text-secondary)]">예상 시간</dt><dd className="v3-type-body mt-1 text-[var(--color-text-primary)]">{gap.expectedMinutes}분</dd></div>
          </dl>
          <p className="v3-type-compact text-[var(--color-text-secondary)]">
            공식 점수·합격 가능성·공식 모범답안·확정 감점은 제공하지 않습니다.
          </p>
          <V3ActionButton type="button" onClick={beginRepair} data-app1-direct-repair-entry>
            직접 복구하기
          </V3ActionButton>
        </V3Surface>
      ) : null}

      {phase === "direct_repair" && gap ? (
        <V3Surface className="space-y-5" data-app1-direct-repair>
          <div>
            <p className="v3-type-caption text-[var(--color-text-brand)]">5. 직접 복구</p>
            <h2 className="v3-type-section ko-keep mt-1 text-[var(--color-text-primary)]">
              답을 보지 않고 내가 직접 고치기
            </h2>
            <p className="v3-type-body ko-keep mt-2 text-[var(--color-text-secondary)]">
              요청 기준: {gap.repairAction}
            </p>
          </div>
          <label htmlFor="app1-repair-input" className="v3-type-label-strong text-[var(--color-text-primary)]">
            내 복구 입력
          </label>
          <Textarea
            ref={repairRef}
            id="app1-repair-input"
            value={repairText}
            onChange={(event) => updateRepairText(event.target.value)}
            className="min-h-48 rounded-[var(--v3-radius-control)] border-[var(--color-border-default)] bg-[var(--color-background-surface)]"
            placeholder={gap.subject.includes("실무") ? "산식·단위·검산을 직접 다시 적어 주세요." : gap.subject.includes("법규") ? "규범과 사안 적용을 직접 다시 연결해 주세요." : "주장과 논거를 직접 다시 연결해 주세요."}
            aria-describedby="app1-repair-help"
            data-app1-repair-input
          />
          <p id="app1-repair-help" className="v3-type-compact text-[var(--color-text-secondary)]">
            AI가 완성 답안을 자동 입력하지 않습니다. 현재 입력은 저장 전 메모리 안에만 있고, 새로고침하면 복원되지 않습니다.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <V3ActionButton type="button" onClick={() => void verifyRepair()} disabled={!repairText.trim()} data-app1-verify-repair>
              복구 확인
            </V3ActionButton>
            <button type="button" onClick={deferRepair} className="v3-type-label min-h-11 rounded-[var(--v3-radius-control)] px-4 text-[var(--color-text-secondary)] underline underline-offset-4">
              지금은 보류
            </button>
          </div>
        </V3Surface>
      ) : null}

      {phase === "repair_verification" && verification && gap ? (
        <V3Surface className="space-y-5" data-app1-repair-verification={verification.state}>
          <div>
            <p className="v3-type-caption text-[var(--color-text-brand)]">6. 복구 확인</p>
            <h2 className="v3-type-section ko-keep mt-1 text-[var(--color-text-primary)]">
              {VERIFICATION_LABELS[verification.state]}
            </h2>
            <p className="v3-type-body ko-keep mt-2 text-[var(--color-text-secondary)]">{verification.reason}</p>
          </div>
          <p className="v3-type-compact rounded-[var(--v3-radius-control)] border border-[var(--color-border-attention)] bg-[var(--color-background-attention)] p-4 text-[var(--color-text-primary)]">
            같은 세션의 요청 기준만 확인합니다. D+7 전이·숙달·점수·합격 상태는 만들지 않습니다.
          </p>
          {verification.state === "one_connection_still_missing" ? (
            <V3ActionButton type="button" onClick={() => setPhase("direct_repair")}>
              연결 1개 보강하기
            </V3ActionButton>
          ) : verification.state === "guided_path_needed" ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <V3ActionLink href={app1GuidedRepairHref(gap.subject)} tone="secondary">
                구조화된 신뢰 복구로 이동
              </V3ActionLink>
              <V3ActionButton type="button" onClick={() => setPhase("direct_repair")}>
                직접 복구 다시 시도
              </V3ActionButton>
            </div>
          ) : verification.state === "deferred" ? (
            <V3ActionLink href="/app?mode=second" tone="secondary">
              오늘 할 일로 돌아가기
            </V3ActionLink>
          ) : verification.state === "blocked_by_ocr_or_source_uncertainty" ? (
            <V3ActionLink href={`/app/capture?mode=second&rewriteFrom=${encodeURIComponent(itemId)}`} tone="secondary">
              원문 다시 확인하기
            </V3ActionLink>
          ) : null}
          {conflict ? (
            <V3ActionButton
              type="button"
              onClick={editRepairAfterConflict}
              data-app1-edit-conflicted-repair
            >
              복구 입력 수정하기
            </V3ActionButton>
          ) : verification.state === "repair_confirmed_for_this_session" &&
            verificationReceipt ? (
            <V3ActionButton type="button" onClick={() => void saveRepair()} data-app1-save-repair>
              복구 결과 저장하고 다음 복습 만들기
            </V3ActionButton>
          ) : null}
        </V3Surface>
      ) : null}

      {phase === "completed" && nextReview && persistedRecordId ? (
        <div role="status" aria-live="polite" data-app1-completed data-app1-persistence-receipt="durable" data-app1-queue-receipt="valid">
          <V3Surface className="space-y-5">
            <div>
              <p className="v3-type-caption text-[var(--color-text-stable)]">7. 다음 복습 · 저장 영수증 확인</p>
              <h2 className="v3-type-section ko-keep mt-1 text-[var(--color-text-primary)]">복구 기록과 다음 독립 행동이 저장되었습니다</h2>
            </div>
            <dl className="grid gap-3 rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-subtle)] p-4">
              <div><dt className="v3-type-caption text-[var(--color-text-secondary)]">다음 행동</dt><dd className="v3-type-body mt-1 text-[var(--color-text-primary)]">{nextReview.nextIndependentAction}</dd></div>
              <div><dt className="v3-type-caption text-[var(--color-text-secondary)]">복습 시점</dt><dd className="v3-type-body mt-1 text-[var(--color-text-primary)]">{POLICY_WINDOW_LABELS[nextReview.policyWindow]} · {new Date(nextReview.dueAt).toLocaleString("ko-KR")}</dd></div>
            </dl>
            <div className="flex flex-col gap-2 sm:flex-row">
              <V3ActionLink href="/app/review?mode=second">복습 대기로 이동</V3ActionLink>
              <V3ActionLink href="/app?mode=second" tone="secondary">오늘 할 일로 이동</V3ActionLink>
            </div>
          </V3Surface>
        </div>
      ) : null}

      {phase === "saved_without_queue" && persistedRecordId ? (
        <div
          role="alert"
          data-app1-saved-without-queue
          data-app1-persistence-receipt="durable"
        >
          <V3Surface className="space-y-4">
            <h2 className="v3-type-section ko-keep text-[var(--color-text-primary)]">복구 기록은 저장됐지만 다음 복습을 확인하지 못했습니다</h2>
            <p className="v3-type-body ko-keep text-[var(--color-text-secondary)]">
              복습이 예약되었다고 표시하지 않습니다. 학습 노트에서 저장 기록을 확인한 뒤 다시 시도해 주세요.
            </p>
            <V3ActionLink href={`/app/items/${encodeURIComponent(persistedRecordId)}?mode=second`} tone="secondary">
              저장 기록 확인
            </V3ActionLink>
          </V3Surface>
        </div>
      ) : null}

      {error ? (
        <section className="rounded-[var(--v3-radius-panel)] border border-[var(--color-border-risk)] bg-[var(--color-background-risk)] p-5" role="alert" aria-live="assertive" data-app1-error data-app1-conflict={conflict ? "true" : "false"}>
          <h2 className="v3-type-section ko-keep text-[var(--color-text-primary)]">완료로 처리되지 않았습니다</h2>
          <p className="v3-type-body ko-keep mt-2 text-[var(--color-text-secondary)]">{error}</p>
          {phase === "failed" ? (
            <Link href="/app/capture?mode=second" className="v3-type-label-strong mt-4 inline-flex min-h-11 items-center underline underline-offset-4">
              Capture로 돌아가기
            </Link>
          ) : null}
        </section>
      ) : null}

      <V3QuietDisclosure summary="이 결과가 만들지 않는 상태">
        <p>
          공식 채점, 확정 점수, 합격 가능성, 전이, 숙달, 공개 활성화, 결제 권한을 만들지 않습니다. 런타임 경계: {APP1_RUNTIME_BOUNDARY_RECEIPT.ownerOnly ? "Owner-only" : "blocked"}.
        </p>
      </V3QuietDisclosure>
    </V3RouteFrame>
  );
}
