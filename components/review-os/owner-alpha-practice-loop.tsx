"use client";

import Link from "next/link";
import { useState } from "react";

import {
  FocusSurface,
  QuietSection,
  RefinedBadge,
  RefinedShell,
  SectionHeading,
} from "@/components/inverge/refined-primitives";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  OWNER_ALPHA_AI_REFERENCE_LABEL,
  OWNER_ALPHA_PRACTICE_ROUTE_KEY,
  ownerAlphaMethodFamilyLabel,
  ownerAlphaVerificationLabel,
  type OwnerAlphaPracticeView,
} from "@/lib/review-os/owner-alpha-practice-contract";
import {
  ownerAlphaSubjectHeading,
  ownerAlphaSubjectRewriteModeLabel,
} from "@/lib/review-os/owner-alpha-practice-subject-adapters";
import {
  OWNER_ALPHA_PRACTICE_SUBJECTS,
  ownerAlphaSubjectLabel,
  type OwnerAlphaPracticeSubject,
} from "@/lib/review-os/owner-alpha-subject-adapter-contract";

type ApiPayload = {
  ok?: boolean;
  error?: string | null;
  refreshRequired?: boolean;
  retryable?: boolean;
  session?: OwnerAlphaPracticeView;
};

function statusLabel(session: OwnerAlphaPracticeView | null) {
  if (!session) return "문제 입력";
  if (session.status === "problem_compiled") return "문제 이해";
  if (session.status === "problem_confirmed") return "먼저 풀기";
  if (session.status === "attempt_saved") return "힌트";
  if (session.status === "reference_generating") return "힌트 생성 중";
  if (session.status === "reference_ready") {
    return session.assistance.assistanceLevel === 5
      ? "AI 학습용 기준안"
      : "힌트";
  }
  if (session.status === "reference_withheld") return "계산·근거 확인";
  if (session.status === "completion_pending") return "연결 저장 복구";
  if (session.status === "completed") return "다음 복습";
  return "다시 풀기";
}

function currentGuidance(session: OwnerAlphaPracticeView | null) {
  if (!session) {
    return {
      now: "문제 이미지·PDF 또는 텍스트를 입력하세요.",
      why: "독립 시도부터 D+1 복습까지 한 학습 기록으로 연결하기 위해 선택했습니다.",
      misunderstanding: "아직 추정하지 않았습니다.",
      success: "문제 요구사항·자료 역할·수치·시점을 확인 가능한 형태로 구조화합니다.",
    };
  }
  if (session.status === "problem_compiled") {
    return {
      now: "OCR 원문과 핵심 수치·단위·날짜를 직접 확인하세요.",
      why: "잘못 읽은 조건 위에 풀이를 쌓지 않기 위해 먼저 확인합니다.",
      misunderstanding: "아직 확정하지 않았습니다. 방법군은 문제 문언상 후보일 뿐입니다.",
      success: "요구사항과 모든 핵심 숫자가 원문과 일치합니다.",
    };
  }
  if (session.status === "problem_confirmed") {
    return {
      now: "기준안을 보지 않은 상태에서 먼저 직접 푸세요.",
      why: "독립 시도와 답안 노출 뒤 시도를 분리해 실제 학습 간극을 남깁니다.",
      misunderstanding: "독립 시도 전에는 오개념을 단정하지 않습니다.",
      success: "적용 방법·산식·계산 과정 또는 답안 목차를 자신의 말로 남깁니다.",
    };
  }
  if (
    !session.biggestGap ||
    (session.providerState.reference === "succeeded" &&
      session.assistance.assistanceLevel < 5)
  ) {
    return {
      now: "막힌 지점을 질문하고 가장 작은 힌트부터 요청하세요.",
      why: "독립 시도는 저장됐고, 이제 도움의 양과 답안 노출을 분리 기록합니다.",
      misunderstanding: "독립 시도와 다음 도움을 대조한 뒤 한 가지를 추정합니다.",
      success: "힌트만으로 다시 이어가거나, 필요할 때만 전체 학습용 기준안을 엽니다.",
    };
  }
  if (session.status !== "completed") {
    return {
      now: "가장 큰 간극 하나를 확인하고 직접 재작성 또는 재계산하세요.",
      why: session.biggestGap.reasonSelected,
      misunderstanding: session.biggestGap.inferredMisunderstanding,
      success: session.biggestGap.successCriteria,
    };
  }
  return {
    now: "D+1 복습 일정을 확인하고, 조건 변형 1개를 다음 시도에 사용하세요.",
    why: "오늘의 재작성 결과를 Queue·Today·Learning Record에 연결했습니다.",
    misunderstanding:
      session.biggestGap?.inferredMisunderstanding ?? "직접 확인 필요",
    success:
      session.biggestGap?.successCriteria ?? "같은 방법을 다시 설명하고 계산합니다.",
  };
}

function errorMessage(code: string | null | undefined) {
  if (code === "provider_retryable") {
    return "AI 제공자가 응답하지 않았습니다. 성공 기준안이나 사용량으로 기록하지 않았습니다. 다시 시도하거나 직접 재작성으로 계속할 수 있습니다.";
  }
  if (code === "stale_record") return "다른 탭의 최신 기록을 불러왔습니다. 내용을 확인한 뒤 다시 시도하세요.";
  if (code === "request_too_large") return "전체 파일 크기가 너무 큽니다.";
  if (code === "unsupported_file") return "지원되는 이미지·PDF·텍스트 파일만 3개까지 올릴 수 있습니다.";
  if (code === "FREE_TRIAL_LIMIT_REACHED" || code === "CORE_LIMIT_REACHED") {
    return "현재 AI 사용 한도에 도달했습니다. 직접 재작성과 기존 기록 열람은 계속할 수 있습니다.";
  }
  return "요청을 완료하지 못했습니다. 입력과 연결 상태를 확인해 주세요.";
}

export function OwnerAlphaPracticeLoop({
  initialSession,
}: {
  initialSession: OwnerAlphaPracticeView | null;
}) {
  const [session, setSession] = useState(initialSession);
  const [subject, setSubject] = useState<OwnerAlphaPracticeSubject>(
    initialSession?.problemModel.subjectAdapter?.subject ??
      "appraisal_practical",
  );
  const [problemText, setProblemText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [confirmedProblemText, setConfirmedProblemText] = useState(
    initialSession?.confirmedProblemText ?? "",
  );
  const [attemptText, setAttemptText] = useState("");
  const [confidence, setConfidence] = useState<"low" | "medium" | "high">("medium");
  const [attemptStartedAt, setAttemptStartedAt] = useState(() => {
    const persistedStart =
      initialSession?.status === "problem_confirmed"
        ? Date.parse(initialSession.updatedAt)
        : Number.NaN;
    return Number.isFinite(persistedStart) ? persistedStart : Date.now();
  });
  const [questionText, setQuestionText] = useState("");
  const [rewriteMode, setRewriteMode] = useState<"rewrite" | "recalculate">(
    initialSession?.rewrite?.mode ?? "recalculate",
  );
  const [rewriteText, setRewriteText] = useState(
    initialSession?.rewrite?.text ?? "",
  );
  const [subjectRewriteMode, setSubjectRewriteMode] = useState<string>(
    initialSession?.rewrite?.subjectMode ??
      initialSession?.problemModel.subjectAdapter?.defaultRewriteMode ??
      "recalculation",
  );
  const [inferredMisunderstanding, setInferredMisunderstanding] = useState(
    initialSession?.biggestGap?.inferredMisunderstanding ?? "",
  );
  const [successCriteria, setSuccessCriteria] = useState(
    initialSession?.biggestGap?.successCriteria ?? "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const guidance = currentGuidance(session);

  function applySession(next: OwnerAlphaPracticeView) {
    setSession(next);
    if (next.problemModel.subjectAdapter) {
      setSubject(next.problemModel.subjectAdapter.subject);
      if (next.problemModel.subjectAdapter.subject !== "appraisal_practical") {
        setRewriteMode("rewrite");
      }
      setSubjectRewriteMode(
        next.rewrite?.subjectMode ??
          next.problemModel.subjectAdapter.defaultRewriteMode,
      );
    }
    setConfirmedProblemText(next.confirmedProblemText);
    if (next.biggestGap) {
      setInferredMisunderstanding((current) =>
        current.trim() ? current : next.biggestGap?.inferredMisunderstanding ?? "",
      );
      setSuccessCriteria((current) =>
        current.trim() ? current : next.biggestGap?.successCriteria ?? "",
      );
    }
    if (next.rewrite) {
      setRewriteMode(next.rewrite.mode);
      setRewriteText((current) => current || next.rewrite?.text || "");
    }
  }

  async function refreshSession(sessionId: string) {
    const response = await fetch(
      `/api/problem-snap/owner-alpha?sessionId=${encodeURIComponent(sessionId)}`,
      { cache: "no-store" },
    );
    const payload = (await response.json()) as ApiPayload;
    if (payload.session) applySession(payload.session);
    return payload;
  }

  async function sendCommand(
    action: string,
    body: Record<string, unknown>,
  ) {
    if (!session) return null;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/problem-snap/owner-alpha", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          sessionId: session.sessionId,
          recordVersion: session.recordVersion,
          ...body,
        }),
      });
      const payload = (await response.json()) as ApiPayload;
      if (payload.session) applySession(payload.session);
      if (!response.ok) {
        if (payload.refreshRequired) await refreshSession(session.sessionId);
        setError(errorMessage(payload.error));
        return null;
      }
      return payload.session ?? null;
    } catch {
      setError(errorMessage(null));
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function createProblem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const formData = new FormData();
      formData.set("subject", subject);
      formData.set("problemText", problemText);
      files.forEach((file) => formData.append("problemFiles", file));
      const response = await fetch("/api/problem-snap/owner-alpha", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as ApiPayload;
      if (!response.ok || !payload.session) {
        setError(errorMessage(payload.error));
        return;
      }
      applySession(payload.session);
      window.history.replaceState(
        null,
        "",
        `/problem-snap?ownerAlpha=${OWNER_ALPHA_PRACTICE_ROUTE_KEY}&sessionId=${encodeURIComponent(payload.session.sessionId)}`,
      );
    } catch {
      setError(errorMessage(null));
    } finally {
      setBusy(false);
    }
  }

  async function confirmProblem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const confirmed = await sendCommand("confirm_problem", {
      confirmedProblemText,
    });
    if (confirmed) setAttemptStartedAt(Date.now());
  }

  async function saveAttempt(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await sendCommand("save_attempt", {
      attemptText,
      confidence,
      elapsedTimeMs: Date.now() - attemptStartedAt,
    });
    if (saved) setAttemptText("");
  }

  async function requestAssistance(revealFull: boolean) {
    const saved = await sendCommand(
      revealFull ? "reveal_reference" : "request_assistance",
      { questionText },
    );
    if (saved) setQuestionText("");
  }

  async function completeRewrite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendCommand("complete_rewrite", {
      mode: rewriteMode,
      subjectMode: subjectRewriteMode,
      rewriteText,
      inferredMisunderstanding,
      successCriteria,
    });
  }

  const showRewrite = Boolean(
    session?.biggestGap &&
      session.variant &&
      session.status !== "completed" &&
      (session.assistance.assistanceLevel === 5 ||
        session.providerState.reference === "failed_retryable" ||
        session.providerState.reference === "withheld"),
  );
  const nextAssistanceLevel = session
    ? Math.min(4, Math.max(1, session.assistance.assistanceLevel + 1))
    : 1;
  const activeAdapter = session?.problemModel.subjectAdapter ?? null;
  const activeSubject = activeAdapter?.subject ?? subject;

  return (
    <main id="main-content">
      <RefinedShell className="space-y-6" data-owner-alpha-practice>
        <SectionHeading
          eyebrow="OWNER ALPHA · PRIVATE"
          title={
            session
              ? ownerAlphaSubjectHeading(session.problemModel)
              : `${ownerAlphaSubjectLabel(activeSubject)} 범용 학습 루프`
          }
          description="실무·이론·법규가 하나의 learner-owned 흐름을 사용하되, 과목별 답안 구조·검증·전이 기준은 분리합니다."
          action={<RefinedBadge tone="amber">{statusLabel(session)}</RefinedBadge>}
        />

        <FocusSurface className="p-5 sm:p-6" aria-labelledby="current-task-heading">
          <h2 id="current-task-heading" className="text-lg font-semibold text-[color:var(--foreground-strong)]">
            지금 무엇을 해야 하나요?
          </h2>
          <p className="mt-2 text-base leading-7">{guidance.now}</p>
          <dl className="mt-5 grid gap-4 border-t border-[var(--border)] pt-5 md:grid-cols-3">
            <div>
              <dt className="text-xs font-medium text-[color:var(--muted)]">왜 이 과제인가</dt>
              <dd className="mt-1 text-sm leading-6">{guidance.why}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-[color:var(--muted)]">추정되는 혼동</dt>
              <dd className="mt-1 text-sm leading-6">{guidance.misunderstanding}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-[color:var(--muted)]">성공 기준</dt>
              <dd className="mt-1 text-sm leading-6">{guidance.success}</dd>
            </div>
          </dl>
        </FocusSurface>

        <div aria-live="polite" aria-atomic="true">
          {error ? (
            <p className="rounded-[var(--radius-md)] border border-[color:rgba(166,87,78,0.35)] bg-[color:var(--status-red-soft)] px-4 py-3 text-sm">
              {error}
            </p>
          ) : null}
        </div>

        {!session ? (
          <Card>
            <CardHeader>
              <CardTitle>1. 문제 입력</CardTitle>
              <CardDescription>이미지·PDF·텍스트 중 하나를 넣으세요. 파일 OCR이 실패해도 함께 입력한 텍스트가 있으면 구조화를 계속합니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={createProblem} className="space-y-5">
                <fieldset>
                  <legend className="text-sm font-medium">과목</legend>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    {OWNER_ALPHA_PRACTICE_SUBJECTS.map((value) => (
                      <label
                        key={value}
                        className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-input)] border border-[var(--border)] px-3 py-2 text-sm"
                      >
                        <input
                          type="radio"
                          name="owner-alpha-subject"
                          value={value}
                          checked={subject === value}
                          onChange={() => setSubject(value)}
                        />
                        {ownerAlphaSubjectLabel(value)}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div>
                  <label htmlFor="owner-alpha-problem-text" className="text-sm font-medium">문제 텍스트</label>
                  <Textarea
                    id="owner-alpha-problem-text"
                    value={problemText}
                    onChange={(event) => setProblemText(event.target.value)}
                    placeholder="문제, 자료, 수치, 요구사항을 붙여 넣으세요."
                    maxLength={24_000}
                  />
                </div>
                <div>
                  <label htmlFor="owner-alpha-problem-files" className="text-sm font-medium">이미지·PDF·텍스트 파일</label>
                  <input
                    id="owner-alpha-problem-files"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,text/plain"
                    multiple
                    onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 3))}
                    className="mt-2 block min-h-11 w-full rounded-[var(--radius-input)] border border-[var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-[color:var(--surface-soft)] file:px-3 file:py-1.5"
                  />
                  <p className="mt-2 text-xs text-[color:var(--muted)]">최대 3개, 각 8MB. AI 추출 결과는 다음 단계에서 반드시 직접 확인합니다.</p>
                </div>
                <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={busy || (!problemText.trim() && files.length === 0)}>
                  {busy ? "구조화 중…" : "문제 구조화 시작"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : null}

        {session?.status === "problem_compiled" ? (
          <Card>
            <CardHeader>
              <CardTitle>2. 문제·자료 역할 확인</CardTitle>
              <CardDescription>AI OCR이나 텍스트 정리는 기준 원문이 아닙니다. 아래 내용을 원본과 직접 대조해 확정하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <ProblemStructure session={session} />
              <form onSubmit={confirmProblem} className="space-y-4">
                <label htmlFor="owner-alpha-confirmed-problem" className="text-sm font-medium">확인한 문제 원문</label>
                <Textarea
                  id="owner-alpha-confirmed-problem"
                  value={confirmedProblemText}
                  onChange={(event) => setConfirmedProblemText(event.target.value)}
                  maxLength={24_000}
                  required
                />
                <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={busy || confirmedProblemText.trim().length < 10}>
                  {busy ? "저장 중…" : "핵심 OCR 확인 완료"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : null}

        {session?.status === "problem_confirmed" ? (
          <Card>
            <CardHeader>
              <CardTitle>3. 먼저 풀기</CardTitle>
              <CardDescription>아직 AI 기준안은 생성·노출되지 않았습니다. 완성 답안이 아니어도 방법 선택 이유와 계산 흔적을 남기세요.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveAttempt} className="space-y-5">
                <div>
                  <label htmlFor="owner-alpha-attempt" className="text-sm font-medium">내 독립 시도</label>
                  <Textarea
                    id="owner-alpha-attempt"
                    value={attemptText}
                    onChange={(event) => setAttemptText(event.target.value)}
                    placeholder="적용 방법, 산식, 계산 순서 또는 답안 목차를 적으세요."
                    maxLength={16_000}
                    required
                  />
                </div>
                <fieldset>
                  <legend className="text-sm font-medium">현재 확신</legend>
                  <div className="mt-2 flex flex-wrap gap-4">
                    {(["low", "medium", "high"] as const).map((value) => (
                      <label key={value} className="inline-flex min-h-11 items-center gap-2">
                        <input type="radio" name="confidence" value={value} checked={confidence === value} onChange={() => setConfidence(value)} />
                        {value === "low" ? "낮음" : value === "medium" ? "중간" : "높음"}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={busy || attemptText.trim().length < 10}>
                  {busy ? "독립 시도 저장 중…" : "독립 시도 저장"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : null}

        {session?.independentAttempt && !showRewrite && session.status !== "completed" ? (
          <Card>
            <CardHeader>
              <CardTitle>4. 단계형 도움</CardTitle>
              <CardDescription>질문 순서와 노출 수준을 기록합니다. 전체 기준안은 네 단계 힌트 뒤 직접 요청할 때만 보입니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <label htmlFor="owner-alpha-question" className="text-sm font-medium">지금 막힌 질문</label>
                <Textarea
                  id="owner-alpha-question"
                  value={questionText}
                  onChange={(event) => setQuestionText(event.target.value)}
                  className="min-h-28"
                  maxLength={2_000}
                  placeholder="예: 이 자료는 대상물건과 사례 중 어디에 적용하나요?"
                />
              </div>
              {session.visibleHints.length > 0 ? (
                <ol className="space-y-3" aria-label="공개된 힌트">
                  {session.visibleHints.map((hint) => (
                    <li key={hint.hintId} className="rounded-[var(--radius-md)] bg-[color:var(--surface-soft)] p-4 text-sm leading-6">
                      <span className="font-medium">힌트 {hint.level}</span><br />{hint.text}
                    </li>
                  ))}
                </ol>
              ) : null}
              <Button
                type="button"
                size="lg"
                className="w-full sm:w-auto"
                disabled={busy}
                onClick={() => requestAssistance(session.assistance.assistanceLevel >= 4)}
              >
                {busy
                  ? "확인 중…"
                  : session.assistance.assistanceLevel >= 4
                    ? `${OWNER_ALPHA_AI_REFERENCE_LABEL} L1/L2/L3 열기`
                    : `힌트 ${nextAssistanceLevel} 요청`}
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {session?.aiReference ? (
          <AiReferencePanel session={session} />
        ) : null}

        {session?.independentAttempt &&
        (session.assistance.assistanceLevel === 5 ||
          session.providerState.reference === "failed_retryable" ||
          session.providerState.reference === "withheld") ? (
          <VerificationPanel session={session} />
        ) : null}

        {showRewrite && session ? (
          <Card>
            <CardHeader>
              <CardTitle>6. 가장 큰 간극 하나 → 다시 풀기</CardTitle>
              <CardDescription>{session.biggestGap?.reasonSelected}</CardDescription>
            </CardHeader>
            <CardContent>
              {session.providerState.reference === "failed_retryable" &&
              session.status !== "completion_pending" ? (
                <div className="mb-5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface-soft)] p-4">
                  <p className="text-sm leading-6">
                    AI 기준안 없이도 아래 재작성은 계속할 수 있습니다. 필요하면 제공자 응답만 다시 시도하세요.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3 w-full sm:w-auto"
                    disabled={busy}
                    onClick={() => requestAssistance(session.assistance.assistanceLevel >= 4)}
                  >
                    {busy ? "다시 확인 중…" : "AI 학습용 기준안 다시 시도"}
                  </Button>
                </div>
              ) : null}
              <form onSubmit={completeRewrite} className="space-y-5">
                <div>
                  <label htmlFor="owner-alpha-misunderstanding" className="text-sm font-medium">내가 이해하지 못한 것으로 보는 한 가지</label>
                  <Textarea id="owner-alpha-misunderstanding" value={inferredMisunderstanding} onChange={(event) => setInferredMisunderstanding(event.target.value)} className="min-h-24" maxLength={1_200} required />
                </div>
                <div>
                  <label htmlFor="owner-alpha-success" className="text-sm font-medium">성공 기준</label>
                  <Textarea id="owner-alpha-success" value={successCriteria} onChange={(event) => setSuccessCriteria(event.target.value)} className="min-h-24" maxLength={1_200} required />
                </div>
                {!activeAdapter || activeAdapter.subject === "appraisal_practical" ? (
                  <fieldset>
                    <legend className="text-sm font-medium">직접 수행 방식</legend>
                    <div className="mt-2 flex flex-wrap gap-4">
                      <label className="inline-flex min-h-11 items-center gap-2"><input type="radio" name="rewrite-mode" checked={rewriteMode === "recalculate"} onChange={() => { setRewriteMode("recalculate"); setSubjectRewriteMode("recalculation"); }} />재계산</label>
                      <label className="inline-flex min-h-11 items-center gap-2"><input type="radio" name="rewrite-mode" checked={rewriteMode === "rewrite"} onChange={() => { setRewriteMode("rewrite"); setSubjectRewriteMode("answer_structure_rewrite"); }} />재작성</label>
                    </div>
                  </fieldset>
                ) : activeAdapter ? (
                  <div>
                    <label htmlFor="owner-alpha-subject-rewrite-mode" className="text-sm font-medium">과목별 재작성 방식</label>
                    <select
                      id="owner-alpha-subject-rewrite-mode"
                      value={subjectRewriteMode}
                      onChange={(event) => setSubjectRewriteMode(event.target.value)}
                      className="mt-2 min-h-11 w-full rounded-[var(--radius-input)] border border-[var(--border)] bg-[color:var(--surface)] px-3 text-sm sm:w-auto"
                    >
                      {activeAdapter.rewriteModes.map((mode) => (
                        <option key={mode} value={mode}>{ownerAlphaSubjectRewriteModeLabel(mode)}</option>
                      ))}
                    </select>
                  </div>
                ) : null}
                <div>
                  <label htmlFor="owner-alpha-rewrite" className="text-sm font-medium">내 재작성·재계산</label>
                  <Textarea id="owner-alpha-rewrite" value={rewriteText} onChange={(event) => setRewriteText(event.target.value)} maxLength={16_000} required />
                </div>
                <QuietSection className="p-4">
                  <p className="text-xs font-medium text-[color:var(--muted)]">조건 변형 1개</p>
                  <p className="mt-2 text-sm font-medium">{session.variant?.changedOneThing}</p>
                  <p className="mt-1 text-sm leading-6">{session.variant?.prompt}</p>
                </QuietSection>
                <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={busy || rewriteText.trim().length < 10 || inferredMisunderstanding.trim().length < 3 || successCriteria.trim().length < 3}>
                  {busy
                    ? "연결 저장 중…"
                    : session.status === "completion_pending"
                      ? "Queue·Today·Records 연결 다시 완료"
                      : "재학습 완료 및 D+1 예약"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : null}

        {session?.status === "completed" ? (
          <Card>
            <CardHeader>
              <CardTitle>7. 다음 복습 연결 완료</CardTitle>
              <CardDescription>고정 D+1 과제와 학습 기록이 같은 세션 식별자로 연결됐습니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <dl className="grid gap-4 sm:grid-cols-2">
                <div><dt className="text-xs text-[color:var(--muted)]">D+1 예정</dt><dd className="mt-1 font-medium">{session.fixedD1DueAt ? new Date(session.fixedD1DueAt).toLocaleString("ko-KR") : "확인 필요"}</dd></div>
                <div><dt className="text-xs text-[color:var(--muted)]">Learning Record</dt><dd className="mt-1 break-all font-mono text-xs">{session.links.learningRecordId}</dd></div>
              </dl>
              <nav aria-label="학습 기록 연결" className="flex flex-wrap gap-3">
                <Link href="/app/review?mode=second" className="inline-flex min-h-11 items-center rounded-full border border-[var(--border)] px-5 text-sm font-medium hover:bg-[color:var(--surface-soft)]">Queue</Link>
                <Link href="/app?mode=second" className="inline-flex min-h-11 items-center rounded-full border border-[var(--border)] px-5 text-sm font-medium hover:bg-[color:var(--surface-soft)]">Today</Link>
                <Link href="/app/items?mode=second" className="inline-flex min-h-11 items-center rounded-full border border-[var(--border)] px-5 text-sm font-medium hover:bg-[color:var(--surface-soft)]">Records</Link>
              </nav>
            </CardContent>
          </Card>
        ) : null}

        {session ? <LearningEvidencePanel session={session} /> : null}
      </RefinedShell>
    </main>
  );
}

function ProblemStructure({ session }: { session: OwnerAlphaPracticeView }) {
  const adapter = session.problemModel.subjectAdapter;
  return (
    <QuietSection className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        {adapter ? <RefinedBadge tone="amber">{ownerAlphaSubjectLabel(adapter.subject)}</RefinedBadge> : null}
        {!adapter || adapter.adapter === "PracticalAdapter" ? (
          <RefinedBadge>{ownerAlphaMethodFamilyLabel(session.problemModel.methodFamily)}</RefinedBadge>
        ) : null}
        {session.problemModel.topicCandidates.map((topic) => <RefinedBadge key={topic}>{topic}</RefinedBadge>)}
      </div>
      {!adapter || adapter.adapter === "PracticalAdapter" ? (
        <div className="mt-4 grid gap-5 md:grid-cols-3">
          <div><h3 className="text-sm font-medium">요구사항</h3><ul className="mt-2 space-y-1 text-sm">{session.problemModel.requirements.map((item) => <li key={item.requirementId}>• {item.text}</li>)}</ul></div>
          <div><h3 className="text-sm font-medium">자료 역할</h3><ul className="mt-2 space-y-1 text-sm">{session.problemModel.entitiesAndRoles.length > 0 ? session.problemModel.entitiesAndRoles.map((item) => <li key={item.entityId}>• {item.label} · {item.role}</li>) : <li>• 직접 확인 필요</li>}</ul></div>
          <div><h3 className="text-sm font-medium">수치·단위</h3><ul className="mt-2 space-y-1 text-sm">{session.problemModel.givenNumbers.length > 0 ? session.problemModel.givenNumbers.slice(0, 12).map((item) => <li key={item.numberId}>• {item.value.toLocaleString("ko-KR")} {item.unit}</li>) : <li>• 직접 확인 필요</li>}</ul></div>
        </div>
      ) : adapter.adapter === "TheoryAdapter" ? (
        <div className="mt-4 grid gap-5 md:grid-cols-3">
          <div><h3 className="text-sm font-medium">쟁점 후보</h3><ul className="mt-2 space-y-1 text-sm">{adapter.issueCandidates.map((item) => <li key={item}>• {item}</li>)}</ul></div>
          <div><h3 className="text-sm font-medium">예상 목차</h3><ol className="mt-2 space-y-1 text-sm">{adapter.expectedOutlineHierarchy.map((item, index) => <li key={item}>{index + 1}. {item}</li>)}</ol></div>
          <div><h3 className="text-sm font-medium">검증 범위</h3><p className="mt-2 text-sm leading-6">구조·관계·모순·포괄성·근거 상태만 확인합니다. 이론 내용을 결정론적으로 채점하지 않습니다.</p></div>
        </div>
      ) : (
        <div className="mt-4 grid gap-5 md:grid-cols-3">
          <div><h3 className="text-sm font-medium">법적 쟁점 후보</h3><ul className="mt-2 space-y-1 text-sm">{adapter.legalIssueCandidates.map((item) => <li key={item}>• {item}</li>)}</ul></div>
          <div><h3 className="text-sm font-medium">법적 근거·유효일</h3><ul className="mt-2 space-y-1 text-sm">{adapter.articleAndParagraphReferences.length > 0 ? adapter.articleAndParagraphReferences.map((item) => <li key={item.citation}>• {item.citation} · {ownerAlphaVerificationLabel(item.state)}</li>) : <li>• 조문·항 공식 원문 확인 필요</li>}<li>• 유효일: {adapter.effectiveDateRequirement.effectiveAt ?? "검토 필요"}</li></ul></div>
          <div><h3 className="text-sm font-medium">검증 원칙</h3><p className="mt-2 text-sm leading-6">공식 원문 참조 없이 AI 법적 진술을 공식 근거로 승격하지 않으며, 유효일 미상은 검토 필요로 닫습니다.</p></div>
        </div>
      )}
      {adapter && adapter.secondaryDomains.length > 0 ? (
        <p className="mt-4 border-t border-[var(--border)] pt-4 text-xs text-[color:var(--muted)]">
          보조 도메인: {adapter.secondaryDomains.map(ownerAlphaSubjectLabel).join(" · ")}
        </p>
      ) : null}
    </QuietSection>
  );
}

function AiReferencePanel({ session }: { session: OwnerAlphaPracticeView }) {
  const reference = session.aiReference;
  if (!reference) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{reference.label}</CardTitle>
        <CardDescription>{reference.disclaimer}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {[reference.l1, reference.l2, reference.l3].map((level, index) => (
          <details key={level.title} open={index === 0} className="rounded-[var(--radius-md)] border border-[var(--border)] p-4">
            <summary className="cursor-pointer font-medium">{level.title}</summary>
            <div className="mt-4 space-y-4">{level.sections.map((section) => <section key={`${level.title}-${section.heading}`}><h4 className="text-sm font-medium">{section.heading}</h4><p className="mt-1 whitespace-pre-wrap text-sm leading-7">{section.body}</p></section>)}</div>
          </details>
        ))}
      </CardContent>
    </Card>
  );
}

function VerificationPanel({ session }: { session: OwnerAlphaPracticeView }) {
  const claims = session.problemModel.claimVerificationStates;
  return (
    <Card>
      <CardHeader>
        <CardTitle>5. 계산·출처·주장 검증</CardTitle>
        <CardDescription>{session.providerState.reference === "withheld" ? "AI 계산과 결정론 검증이 충돌해 기준안을 공개하지 않았습니다." : "각 주요 숫자·산식·주장의 현재 근거 상태입니다."}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-3">{claims.map((claim) => <li key={claim.claimId} className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--border)] p-3 sm:flex-row sm:items-start sm:justify-between"><span className="text-sm leading-6">{claim.summary}</span><RefinedBadge tone={claim.state === "unresolved_needs_review" ? "amber" : claim.state === "deterministically_validated" ? "green" : "neutral"}>{ownerAlphaVerificationLabel(claim.state)}</RefinedBadge></li>)}</ul>
        {session.calculationChecks.length > 0 ? <details className="rounded-[var(--radius-md)] bg-[color:var(--surface-soft)] p-4"><summary className="cursor-pointer text-sm font-medium">결정론적 계산 결과 {session.calculationChecks.length}개</summary><ul className="mt-3 space-y-2 text-sm">{session.calculationChecks.map((check) => <li key={check.nodeId}>{check.nodeId} · {check.status} · AI {check.claimedResult.toLocaleString("ko-KR")} / 검증 {check.deterministicResult?.toLocaleString("ko-KR") ?? "불가"}</li>)}</ul></details> : null}
      </CardContent>
    </Card>
  );
}

function LearningEvidencePanel({ session }: { session: OwnerAlphaPracticeView }) {
  return (
    <QuietSection className="p-4 sm:p-5">
      <details>
        <summary className="cursor-pointer text-sm font-medium">학습 증거 · Question Chain / Misconception / Root Cause / Replay</summary>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <section><h3 className="text-sm font-medium">Question Chain</h3><ol className="mt-2 space-y-2 text-sm">{session.questionChain.entries.map((entry) => <li key={entry.questionId}>{entry.sequence}. {entry.questionText}</li>)}</ol></section>
          <section><h3 className="text-sm font-medium">Misconception</h3><ul className="mt-2 space-y-2 text-sm">{session.misconceptionGraph.nodes.length > 0 ? session.misconceptionGraph.nodes.map((node) => <li key={node.conceptId}>• {node.label} · {node.state}</li>) : <li>• 아직 기록 없음</li>}</ul></section>
          <section><h3 className="text-sm font-medium">Root Cause Candidate</h3><ul className="mt-2 space-y-2 text-sm">{session.rootCauseCandidates.length > 0 ? session.rootCauseCandidates.map((root) => <li key={root.rootCauseId}>• {root.label} · {root.confidence}<br /><span className="text-[color:var(--muted)]">{root.rationale}</span></li>) : <li>• 아직 기록 없음</li>}</ul></section>
          <section><h3 className="text-sm font-medium">Question Replay Link</h3><ul className="mt-2 space-y-2 text-sm">{session.questionReplayLinks.length > 0 ? session.questionReplayLinks.map((link) => <li key={link.replayLinkId}>• {link.basis} · 이전 세션 {link.priorSessionId.slice(0, 8)}</li>) : <li>• 연결할 과거 유사 기록 없음</li>}</ul></section>
        </div>
      </details>
    </QuietSection>
  );
}
