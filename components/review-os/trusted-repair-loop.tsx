"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { TrustedRepairView } from "@/lib/review-os/trusted-repair-server";

type Subject = TrustedRepairView["session"]["subject"];
type InputMode = TrustedRepairView["session"]["inputMode"];
type ApiAction =
  | "start"
  | "confirm_revision"
  | "commit_prediction"
  | "commit_attempt"
  | "commit_self_diagnosis"
  | "diagnose"
  | "request_scaffold"
  | "submit_repair"
  | "continue";

const SUBJECTS: readonly { value: Subject; label: string }[] = [
  { value: "appraisal_practical", label: "감정평가실무" },
  { value: "appraisal_theory", label: "감정평가이론" },
  { value: "appraisal_compensation_law", label: "감정평가 및 보상법규" },
];

const INPUT_MODES: readonly { value: InputMode; label: string }[] = [
  { value: "TYPED_TEXT", label: "직접 입력" },
  { value: "EDITABLE_PHOTO_OCR", label: "사진 OCR 초안" },
  { value: "EDITABLE_PDF_OCR", label: "PDF OCR 초안" },
  { value: "EDITABLE_VOICE_TRANSCRIPTION", label: "음성 전사 초안" },
  { value: "STRUCTURED_SELECTION", label: "구조화 선택" },
];

const TERMINAL_STATES = new Set([
  "verified",
  "partial",
  "guided",
  "deferred",
  "blocked",
  "uncertain",
  "stale",
]);

function setDurableSessionId(sessionId: string | null) {
  const url = new URL(window.location.href);
  if (sessionId) url.searchParams.set("sessionId", sessionId);
  else url.searchParams.delete("sessionId");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

function stateHeading(state: string) {
  const headings: Record<string, string> = {
    editable_capture_draft: "편집 가능한 초안을 확인하세요",
    revision_confirmed: "이 답안의 결과를 먼저 예측하세요",
    prediction_committed: "도움 없이 한 번 답해 보세요",
    independent_attempt_committed: "가장 큰 빈틈을 스스로 짚어 보세요",
    self_diagnosis_committed: "독립 시도를 기준 앵커와 대조합니다",
    diagnosed: "가장 중요한 복구 지점이 정해졌습니다",
    exposure_committed: "가장 작은 도움만 열었습니다",
    repair_submitted: "같은 세션에서 복구 여부를 확인하세요",
    verified: "같은 세션 기준을 다시 구성했습니다",
    partial: "일부 기준은 아직 남아 있습니다",
    guided: "가이드 모드로 마쳤습니다",
    deferred: "이번 복구를 보류했습니다",
    blocked: "현재 근거로는 검증을 완료할 수 없습니다",
    uncertain: "현재 결과는 불확실합니다",
    stale: "답안 변경으로 이전 진단이 무효가 됐습니다",
  };
  return headings[state] ?? "신뢰 복구";
}

export function TrustedRepairLoop() {
  const searchParams = useSearchParams();
  const initialSessionId = searchParams.get("sessionId");
  const [view, setView] = useState<TrustedRepairView | null>(null);
  const [subject, setSubject] = useState<Subject>("appraisal_practical");
  const [inputMode, setInputMode] = useState<InputMode>("TYPED_TEXT");
  const [draft, setDraft] = useState("");
  const [attempt, setAttempt] = useState("");
  const [repair, setRepair] = useState("");
  const [prediction, setPrediction] = useState("likely_partial");
  const [confidence, setConfidence] = useState("medium");
  const [selfDiagnosis, setSelfDiagnosis] = useState("missing_core_reason");
  const [busy, setBusy] = useState(Boolean(initialSessionId));
  const [error, setError] = useState<string | null>(null);

  function acceptView(next: TrustedRepairView) {
    setView(next);
    setDraft(next.editableCaptureDraft ?? "");
    setAttempt("");
    setRepair("");
  }

  useEffect(() => {
    if (!initialSessionId) return;
    let active = true;
    fetch(`/api/review-os/trusted-repair?sessionId=${encodeURIComponent(initialSessionId)}`, {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || !payload.ok) throw new Error(payload.error ?? "load_failed");
        if (active) acceptView(payload.view as TrustedRepairView);
      })
      .catch(() => {
        if (active) setError("세션을 불러오지 못했습니다. 주소를 확인하거나 새로 시작하세요.");
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [initialSessionId]);

  async function command(action: ApiAction, fields: Record<string, unknown> = {}) {
    setBusy(true);
    setError(null);
    try {
      const common = view
        ? {
            sessionId: view.session.sessionId,
            expectedVersion: view.session.recordVersion,
          }
        : {};
      const response = await fetch("/api/review-os/trusted-repair", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ...common,
          commandId: crypto.randomUUID(),
          ...fields,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "command_failed");
      const next = payload.view as TrustedRepairView;
      acceptView(next);
      setDurableSessionId(next.session.sessionId);
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "command_failed";
      setError(
        code === "stale_record"
          ? "다른 화면에서 세션이 변경됐습니다. 새로고침해 최신 상태를 확인하세요."
          : "요청을 안전하게 완료하지 못했습니다. 입력과 연결 상태를 확인하세요.",
      );
    } finally {
      setBusy(false);
    }
  }

  const primary = (() => {
    if (!view) {
      return {
        label: "신뢰 복구 시작",
        run: () => command("start", { subject, inputMode }),
        disabled: false,
      };
    }
    const state = view.session.state;
    if (state === "editable_capture_draft") {
      return { label: "이 답안을 수정본으로 확정", run: () => command("confirm_revision", { body: draft }), disabled: !draft.trim() };
    }
    if (state === "revision_confirmed") {
      return { label: "예측을 먼저 확정", run: () => command("commit_prediction", { prediction, confidence }), disabled: false };
    }
    if (state === "prediction_committed") {
      return { label: "독립 시도 확정", run: () => command("commit_attempt", { body: attempt }), disabled: !attempt.trim() };
    }
    if (state === "independent_attempt_committed") {
      return { label: "자가 진단 확정", run: () => command("commit_self_diagnosis", { selfDiagnosisCode: selfDiagnosis }), disabled: false };
    }
    if (state === "self_diagnosis_committed") {
      return { label: "근거 기반 진단 만들기", run: () => command("diagnose"), disabled: false };
    }
    if (state === "diagnosed") {
      return { label: "가장 작은 도움 열기", run: () => command("request_scaffold"), disabled: false };
    }
    if (state === "exposure_committed") {
      return { label: "복구 답안 확정", run: () => command("submit_repair", { body: repair }), disabled: !repair.trim() };
    }
    if (state === "partial" && view.session.immediatePartialRetryAvailable) {
      return { label: "남은 기준 다시 쓰기", run: () => command("submit_repair", { body: repair }), disabled: !repair.trim() };
    }
    if (state === "partial") {
      return { label: "가이드로 전환", run: () => command("continue", { continuation: "SWITCH_TO_GUIDED" }), disabled: false };
    }
    if (state === "repair_submitted") {
      return { label: "같은 세션에서 검증하고 계속", run: () => command("continue", { continuation: "VERIFY_AND_CONTINUE" }), disabled: false };
    }
    return {
      label: "새 신뢰 복구 시작",
      run: () => {
        setView(null);
        setDraft("");
        setAttempt("");
        setRepair("");
        setError(null);
        setDurableSessionId(null);
      },
      disabled: false,
    };
  })();

  const state = view?.session.state ?? "start";
  const terminal = view ? TERMINAL_STATES.has(view.session.state) : false;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5" data-wcv-c2-trusted-repair>
      <header className="space-y-2">
        <p className="v3-type-caption text-[var(--color-text-brand)]">Owner 전용 · 합성 fixture · 기본 비활성</p>
        <h1 className="v3-type-heading-1 text-[var(--color-text-primary)]">첫 신뢰 복구</h1>
        <p className="v3-type-body text-[var(--color-text-secondary)]">
          독립 시도 뒤에 가장 작은 도움을 열고, 같은 세션의 한 기준만 다시 확인합니다.
        </p>
      </header>

      <section
        className="space-y-5 rounded-[var(--v3-radius-card)] border border-[var(--color-border-default)] bg-[var(--color-background-elevated)] p-4 shadow-sm sm:p-6"
        aria-labelledby="trusted-repair-state-heading"
        data-trusted-repair-state={state}
      >
        <div className="space-y-1">
          <p className="v3-type-caption text-[var(--color-text-secondary)]">
            {view ? `${view.fixture.labelKo} · 단계 ${view.session.recordVersion}` : "과목과 입력 방식을 고르세요"}
          </p>
          <h2 id="trusted-repair-state-heading" className="v3-type-heading-2 text-[var(--color-text-primary)]">
            {view ? stateHeading(view.session.state) : "복구할 합성 과제를 선택하세요"}
          </h2>
        </div>

        {!view ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="v3-type-label-strong">과목</span>
              <select value={subject} onChange={(event) => setSubject(event.target.value as Subject)} className="min-h-12 w-full rounded-lg border border-[var(--color-border-default)] bg-white px-3">
                {SUBJECTS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="space-y-2">
              <span className="v3-type-label-strong">편집 가능한 입력</span>
              <select value={inputMode} onChange={(event) => setInputMode(event.target.value as InputMode)} className="min-h-12 w-full rounded-lg border border-[var(--color-border-default)] bg-white px-3">
                {INPUT_MODES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-lg bg-[var(--color-background-surface)] p-4">
              <p className="v3-type-label-strong">합성 과제</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--color-text-secondary)]">{view.fixture.prompt}</p>
            </div>

            {view.session.guidance ? (
              <div className="grid gap-2 rounded-lg border border-[var(--color-border-default)] p-3 sm:grid-cols-2">
                <p className="text-sm"><strong>학습 목적</strong><br />{view.session.guidance.learningPurposeKo}</p>
                <p className="text-sm"><strong>다음 행동</strong><br />{view.session.guidance.nextActionKo}</p>
              </div>
            ) : null}

            {view.anchors.length > 0 ? (
              <section aria-labelledby="anchor-heading" className="space-y-2">
                <h3 id="anchor-heading" className="v3-type-label-strong">정확히 확인할 의미 앵커</h3>
                <ul className="grid gap-2 sm:grid-cols-3">
                  {view.anchors.map((anchor) => <li key={anchor.anchorId} className="rounded-lg border border-[var(--color-border-default)] p-3 text-sm">{anchor.labelKo}</li>)}
                </ul>
              </section>
            ) : null}

            {view.session.state === "editable_capture_draft" ? (
              <label className="block space-y-2">
                <span className="v3-type-label-strong">편집 가능한 캡처 초안</span>
                <Textarea aria-label="편집 가능한 캡처 초안" value={draft} onChange={(event) => setDraft(event.target.value)} className="min-h-48" />
              </label>
            ) : null}

            {view.session.state === "revision_confirmed" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2"><span className="v3-type-label-strong">예상 결과</span><select value={prediction} onChange={(event) => setPrediction(event.target.value)} className="min-h-12 w-full rounded-lg border px-3"><option value="likely_success">기준 충족 예상</option><option value="likely_partial">일부 충족 예상</option><option value="likely_blocked">차단 예상</option></select></label>
                <label className="space-y-2"><span className="v3-type-label-strong">예측 확신</span><select value={confidence} onChange={(event) => setConfidence(event.target.value)} className="min-h-12 w-full rounded-lg border px-3"><option value="low">낮음</option><option value="medium">보통</option><option value="high">높음</option></select></label>
              </div>
            ) : null}

            {view.session.state === "prediction_committed" ? (
              <label className="block space-y-2"><span className="v3-type-label-strong">도움 전 독립 시도</span><Textarea aria-label="도움 전 독립 시도" value={attempt} onChange={(event) => setAttempt(event.target.value)} className="min-h-48" /></label>
            ) : null}

            {view.session.state === "independent_attempt_committed" ? (
              <label className="block space-y-2"><span className="v3-type-label-strong">자가 진단</span><select value={selfDiagnosis} onChange={(event) => setSelfDiagnosis(event.target.value)} className="min-h-12 w-full rounded-lg border px-3"><option value="missing_core_reason">핵심 근거 누락</option><option value="unit_or_definition_drift">단위·정의 흔들림</option><option value="counter_evidence_unresolved">반대 근거 미해결</option></select></label>
            ) : null}

            {view.diagnosis ? (
              <section className="space-y-3" aria-labelledby="diagnosis-heading">
                <h3 id="diagnosis-heading" className="v3-type-label-strong">최대 3개 후보 · 1순위 복구 지점</h3>
                <ol className="space-y-2">
                  {view.diagnosis.candidates.map((candidate) => <li key={candidate.gapId} className={candidate.gapId === view.diagnosis?.primaryGapId ? "rounded-lg border-2 border-[var(--color-border-focus)] p-3" : "rounded-lg border p-3"}><p className="font-medium">{candidate.rank}. {candidate.labelKo}</p><p className="mt-1 text-sm text-[var(--color-text-secondary)]">{candidate.repairActionKo}</p></li>)}
                </ol>
                {view.session.repairPath ? <p className="text-sm text-[var(--color-text-secondary)]">선택된 복구 경로: <code>{view.session.repairPath}</code></p> : null}
              </section>
            ) : null}

            {view.scaffold ? (
              <aside className="rounded-lg border border-[var(--color-border-focus)] bg-[var(--color-background-brand-soft)] p-4" aria-label="커밋된 최소 도움">
                <p className="v3-type-label-strong">커밋된 최소 도움 · 수준 {view.scaffold.assistanceLevel}</p>
                <p className="mt-2 leading-6">{view.scaffold.text}</p>
              </aside>
            ) : null}

            {view.session.state === "exposure_committed" || (view.session.state === "partial" && view.session.immediatePartialRetryAvailable) ? (
              <label className="block space-y-2"><span className="v3-type-label-strong">{view.session.state === "partial" ? "남은 기준 다시 쓰기" : "보지 않고 다시 구성한 복구 답안"}</span><Textarea aria-label={view.session.state === "partial" ? "남은 기준 다시 쓰기" : "복구 답안"} value={repair} onChange={(event) => setRepair(event.target.value)} className="min-h-48" /></label>
            ) : null}

            {terminal ? (
              <div className="space-y-2 rounded-lg bg-[var(--color-background-surface)] p-4" role="status">
                <p className="font-medium">결과: {view.session.outcome ?? view.session.state}</p>
                {view.session.subject === "appraisal_compensation_law" && !view.source.verifiedForCurrentLaw ? <p className="text-sm leading-6">공식 출처·유효 버전·현행법 상태가 확인되지 않아 검증 완료로 표시하지 않았습니다.</p> : null}
                <p className="text-sm text-[var(--color-text-secondary)]">이 결과는 같은 세션의 한 기준에만 적용됩니다. 숙달·전이·안정성·점수·합격을 주장하지 않습니다.</p>
              </div>
            ) : null}
          </div>
        )}

        {error ? <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900" role="alert">{error}</p> : null}

        <Button type="button" size="lg" className="w-full sm:w-auto" disabled={busy || primary.disabled} onClick={primary.run} data-primary-action>
          {busy ? "안전하게 저장 중…" : primary.label}
        </Button>

        {view && ["diagnosed", "repair_submitted", "partial"].includes(view.session.state) ? (
          <details className="rounded-lg border border-[var(--color-border-default)] p-3">
            <summary className="min-h-11 cursor-pointer py-2 font-medium">다른 방식으로 하기</summary>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" disabled={busy} onClick={() => command("continue", { continuation: "DEFER_FOR_NOW" })}>지금은 보류 · DEFER_FOR_NOW</Button>
              {view.session.state === "partial" && !view.session.immediatePartialRetryAvailable ? null : <Button type="button" variant="outline" disabled={busy} onClick={() => command("continue", { continuation: "SWITCH_TO_GUIDED" })}>가이드로 전환 · SWITCH_TO_GUIDED</Button>}
            </div>
          </details>
        ) : null}
      </section>

      <p className="v3-type-caption text-[var(--color-text-secondary)]">
        입력 본문은 학습자 전용 append-only 저장소에 보관되며, 이 화면은 참조 답안·비밀값·체크섬을 반환하지 않습니다.
      </p>
    </div>
  );
}
