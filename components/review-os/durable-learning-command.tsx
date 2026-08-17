"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { DurableLearningView } from "@/lib/review-os/durable-learning-server";

type Fields = Record<string, string>;

const REQUIRED_RESPONSE_FIELDS = {
  appraisal_practical: ["result", "operator", "unit", "sign", "rounding"],
  appraisal_theory: ["predicateId", "polarity", "forbiddenPredicateAsserted"],
  appraisal_law: ["blockerCount", "currentness"],
} as const satisfies Record<DurableLearningView["case"]["subject"], readonly string[]>;

const INPUT_CLASS =
  "min-h-11 w-full rounded-md border border-[var(--color-border-default)] bg-transparent px-3";

function explicitNumber(value: string | undefined) {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function explicitBoolean(value: string | undefined) {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function learnerResponseFieldsComplete(
  subject: DurableLearningView["case"]["subject"],
  fields: Fields,
) {
  return REQUIRED_RESPONSE_FIELDS[subject].every((field) => Boolean(fields[field]?.trim()));
}

function updateCaseId(caseId: string | null) {
  const url = new URL(window.location.href);
  if (caseId) url.searchParams.set("caseId", caseId);
  else url.searchParams.delete("caseId");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

function labelForState(state: DurableLearningView["case"]["state"]) {
  const labels: Record<typeof state, string> = {
    REPAIR_VERIFIED_SAME_SESSION: "같은 세션 복구 확인 · D+1 대기",
    D1_REPRODUCED: "D+1 독립 재현 확인 · D+7 전이 대기",
    D7_TRANSFER_OBSERVED: "D+7 전이 확인 · 시간제한 재발 검사 대기",
    TIMED_RECURRENCE_CONFIRMED: "시간제한 재발 검사 확인",
    CURRENTLY_CLEAR: "현재 안정 후보",
    REOPENED: "후속 독립 실패로 다시 열림",
    STALE: "동결 구성 변경으로 중단",
    DEFERRED: "보류",
    BLOCKED: "수동 확인 필요",
  };
  return labels[state];
}

function failureNoteFor(view: DurableLearningView) {
  const timedOut = view.case.resultReasonCodes.includes("trusted_timer_timeout_preserved");
  const rejected = view.case.resultReasonCodes.includes("typed_proof_rejected");
  if (!timedOut && !rejected) return null;
  const failedCriterion = {
    appraisal_practical: "총수익과 운영비의 순서, 연산자, 결과, 단위, 부호와 반올림을 한 계산 관계로 맞춰야 합니다.",
    appraisal_theory: "제시된 목표 범위 안에서 핵심 관계의 의미와 극성을 구분하고 금지 관계를 주장하지 않아야 합니다.",
    appraisal_law: "제시된 출처·버전·조문·효력기간·적용 기준일을 함께 확인하고 현재성과 열린 차단 근거 수를 판단해야 합니다.",
  }[view.case.subject];
  return {
    title: timedOut ? "제한시간 근거 미충족" : "과목별 증명 불일치",
    why: timedOut
      ? "신뢰된 제한시간 안에 제출되지 않아 이번 답안은 독립 근거로 인정되지 않았습니다."
      : "제출한 닫힌 과목별 판단이 서버의 봉인된 구조 검증을 통과하지 못했습니다.",
    failedCriterion,
    nextAction: "위 기준을 적용해 새 독립 시도를 시작하고 답안 본문과 과목별 판단을 다시 제출하세요.",
    nextReview: view.case.nextEligibleAt ?? "즉시 독립 재시도 준비 가능",
  };
}

function learnerResponseFor(subject: DurableLearningView["case"]["subject"], fields: Fields) {
  if (subject === "appraisal_practical") {
    return {
      kind: "PRACTICE_CALCULATION",
      operator: fields.operator,
      result: explicitNumber(fields.result),
      unit: fields.unit,
      sign: fields.sign,
      rounding: fields.rounding,
    };
  }
  if (subject === "appraisal_theory") {
    return {
      kind: "THEORY_PREDICATE",
      predicateId: fields.predicateId,
      forbiddenPredicateAsserted: explicitBoolean(fields.forbiddenPredicateAsserted),
      polarity: fields.polarity,
    };
  }
  return {
    kind: "LAW_EXACT_APPLICABILITY",
    currentness: fields.currentness,
    blockerCount: explicitNumber(fields.blockerCount),
  };
}

function SubjectLearnerResponseFields({
  attempt,
  fields,
  setFields,
}: {
  attempt: NonNullable<DurableLearningView["attempt"]>;
  fields: Fields;
  setFields: (next: Fields) => void;
}) {
  function field(name: string, label: string, inputMode?: "numeric") {
    return (
      <label className="space-y-1">
        <span className="text-sm font-medium">{label}</span>
        <input
          aria-label={label}
          inputMode={inputMode}
          value={fields[name] ?? ""}
          onChange={(event) => setFields({ ...fields, [name]: event.target.value })}
          className={INPUT_CLASS}
        />
      </label>
    );
  }
  const context = attempt.inputContext;
  if (context.kind === "PRACTICE_CALCULATION") {
    return (
      <div className="space-y-3">
        <dl className="grid gap-1 rounded-lg bg-[var(--color-background-surface)] p-3 text-sm" data-wcv-c3-input-context="practice">
          <div><dt className="inline font-medium">문항 앵커:</dt> <dd className="inline">{context.anchorId}</dd></div>
          <div><dt className="inline font-medium">연간 총수익:</dt> <dd className="inline">{context.grossIncome.toLocaleString("ko-KR")}원</dd></div>
          <div><dt className="inline font-medium">연간 운영비:</dt> <dd className="inline">{context.operatingExpense.toLocaleString("ko-KR")}원</dd></div>
        </dl>
        <div className="grid gap-3 sm:grid-cols-2">
          {field("result", "계산 결과", "numeric")}
          {[["operator", "연산자", ["SUBTRACT", "ADD"]], ["unit", "단위", ["KRW_PER_YEAR", "KRW"]], ["sign", "부호", ["POSITIVE", "NEGATIVE"]], ["rounding", "반올림", ["NONE", "HALF_UP"]]].map(([name, label, options]) => (
            <label key={String(name)} className="space-y-1">
              <span className="text-sm font-medium">{String(label)}</span>
              <select aria-label={String(label)} value={fields[String(name)] ?? ""} onChange={(event) => setFields({ ...fields, [String(name)]: event.target.value })} className={INPUT_CLASS}>
                <option value="">선택</option>
                {(options as string[]).map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
          ))}
        </div>
      </div>
    );
  }
  if (context.kind === "THEORY_PREDICATE") {
    return (
      <div className="space-y-3">
        <dl className="grid gap-1 rounded-lg bg-[var(--color-background-surface)] p-3 text-sm" data-wcv-c3-input-context="theory">
          <div><dt className="inline font-medium">문항 앵커:</dt> <dd className="inline">{context.anchorId}</dd></div>
          <div><dt className="inline font-medium">목표 범위:</dt> <dd className="inline">{context.targetScopeId}</dd></div>
        </dl>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1"><span className="text-sm font-medium">핵심 관계</span><select aria-label="핵심 관계" value={fields.predicateId ?? ""} onChange={(event) => setFields({ ...fields, predicateId: event.target.value })} className={INPUT_CLASS}><option value="">선택</option>{context.predicateOptions.map((option) => <option key={option.id} value={option.id}>{option.labelKo}</option>)}</select></label>
          <label className="space-y-1"><span className="text-sm font-medium">선택한 관계의 극성</span><select aria-label="선택한 관계의 극성" value={fields.polarity ?? ""} onChange={(event) => setFields({ ...fields, polarity: event.target.value })} className={INPUT_CLASS}><option value="">선택</option><option value="POSITIVE">긍정</option><option value="NEGATIVE">부정</option></select></label>
          <label className="space-y-1"><span className="text-sm font-medium">금지 관계를 주장했는가</span><select aria-label="금지 술어 주장 여부" value={fields.forbiddenPredicateAsserted ?? ""} onChange={(event) => setFields({ ...fields, forbiddenPredicateAsserted: event.target.value })} className={INPUT_CLASS}><option value="">선택</option><option value="false">아니요</option><option value="true">예</option></select></label>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <dl className="grid gap-1 rounded-lg bg-[var(--color-background-surface)] p-3 text-sm" data-wcv-c3-input-context="law">
        <div><dt className="inline font-medium">복구 앵커:</dt> <dd className="inline">{context.anchorId}</dd></div>
        <div><dt className="inline font-medium">법령 출처:</dt> <dd className="inline">{context.sourceId}</dd></div>
        <div><dt className="inline font-medium">출처 버전:</dt> <dd className="inline">{context.sourceVersionId}</dd></div>
        <div><dt className="inline font-medium">조문 앵커:</dt> <dd className="inline">{context.lawAnchorVersionId}</dd></div>
        <div><dt className="inline font-medium">정확 위치:</dt> <dd className="inline">{context.exactLocator}</dd></div>
        <div><dt className="inline font-medium">효력 기간:</dt> <dd className="inline">{context.effectiveFrom}부터 · 종료일 없음</dd></div>
        <div><dt className="inline font-medium">적용 기준일:</dt> <dd className="inline">{context.applicableAsOf}</dd></div>
        <div><dt className="inline font-medium">제시된 차단 근거:</dt> <dd className="inline">{context.blockingFindingCodes.length === 0 ? "없음" : context.blockingFindingCodes.join(", ")}</dd></div>
      </dl>
      <div className="grid gap-3 sm:grid-cols-2">
        {field("blockerCount", "열린 차단 근거 수", "numeric")}
        <label className="space-y-1"><span className="text-sm font-medium">현재성 판단</span><select aria-label="현재성" value={fields.currentness ?? ""} onChange={(event) => setFields({ ...fields, currentness: event.target.value })} className={INPUT_CLASS}><option value="">선택</option><option value="APPLICABLE_CURRENT">현재 적용 가능</option><option value="STALE">구버전</option><option value="UNKNOWN">확인 불가</option></select></label>
      </div>
    </div>
  );
}

export function DurableLearningCommand({ ownerScope }: { ownerScope: string }) {
  const search = useSearchParams();
  const sourceSessionId = search.get("sourceSessionId") ?? "";
  const initialCaseId = search.get("caseId");
  const [view, setView] = useState<DurableLearningView | null>(null);
  const [body, setBody] = useState("");
  const [fields, setFields] = useState<Fields>({});
  const [availableMinutes, setAvailableMinutes] = useState("180");
  const [recoveryMode, setRecoveryMode] = useState<"NORMAL" | "MINIMUM_MAINTENANCE">("NORMAL");
  const [fixedMinutes, setFixedMinutes] = useState("0");
  const [busy, setBusy] = useState(Boolean(initialCaseId));
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<{ fingerprint: string; commandId: string } | null>(null);
  const fixedCommitmentId = useRef<string | null>(null);

  function accept(next: DurableLearningView, preserveAttemptDraft = false) {
    setView(next);
    if (!preserveAttemptDraft) {
      setBody("");
      setFields({});
    }
    updateCaseId(next.case.caseId);
  }

  useEffect(() => {
    if (!initialCaseId) return;
    let active = true;
    fetch(`/api/review-os/durable-learning?caseId=${encodeURIComponent(initialCaseId)}`, { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || !payload.ok) throw new Error(payload.error ?? "load_failed");
        if (active) accept(payload.view as DurableLearningView);
      })
      .catch(() => active && setError("내구성 복구 기록을 불러오지 못했습니다."))
      .finally(() => active && setBusy(false));
    return () => { active = false; };
  }, [initialCaseId]);

  const waitingCaseId = view?.case.nextAction === "WAIT_FOR_ELIGIBILITY"
    ? view.case.caseId
    : null;
  const waitingUntil = view?.case.nextAction === "WAIT_FOR_ELIGIBILITY"
    ? view.case.nextEligibleAt
    : null;

  useEffect(() => {
    if (!waitingCaseId || !waitingUntil) return;
    const eligibleAtMs = Date.parse(waitingUntil);
    if (!Number.isFinite(eligibleAtMs)) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setBusy(true);
      setError(null);
      void fetch(`/api/review-os/durable-learning?caseId=${encodeURIComponent(waitingCaseId)}`, {
        credentials: "same-origin",
        cache: "no-store",
      })
        .then(async (response) => {
          const payload = await response.json();
          if (!response.ok || !payload.ok) throw new Error(payload.error ?? "load_failed");
          if (!active) return;
          const next = payload.view as DurableLearningView;
          setView(next);
          setBody("");
          setFields({});
          updateCaseId(next.case.caseId);
        })
        .catch(() => active && setError("다음 독립 시도 가능 시점을 확인하지 못했습니다."))
        .finally(() => active && setBusy(false));
    }, Math.max(0, eligibleAtMs - Date.now() + 50));
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [waitingCaseId, waitingUntil]);

  async function post(action: string, fields: Record<string, unknown> = {}) {
    setBusy(true);
    setError(null);
    let definitive = false;
    const currentAttemptId = view?.attempt?.attemptId ?? null;
    try {
      const common = view ? { caseId: view.case.caseId, expectedVersion: view.case.recordVersion } : {};
      const fingerprint = JSON.stringify({ action, ...common, ...fields, ownerScope });
      const commandId = pending.current?.fingerprint === fingerprint ? pending.current.commandId : crypto.randomUUID();
      pending.current = { fingerprint, commandId };
      const response = await fetch("/api/review-os/durable-learning", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...common, ...fields, ...(action === "export" ? {} : { commandId }) }),
      });
      const payload = await response.json();
      definitive = response.status < 500;
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "command_failed");
      if (payload.view) {
        const next = payload.view as DurableLearningView;
        accept(next, currentAttemptId !== null && next.attempt?.attemptId === currentAttemptId);
      }
      return payload;
    } catch (caught) {
      setError(caught instanceof Error && caught.message === "stale_record" ? "다른 탭의 변경을 먼저 다시 불러오세요." : "요청을 안전하게 완료하지 못했습니다. 같은 명령 ID로 다시 시도할 수 있습니다.");
      return null;
    } finally {
      if (definitive) pending.current = null;
      setBusy(false);
    }
  }

  async function exportCase() {
    if (!view) return;
    const payload = await post("export");
    if (!payload?.exportBundle) return;
    const blob = new Blob([JSON.stringify(payload.exportBundle, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `dabangil-durable-learning-${view.case.caseId}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function deleteCase() {
    if (!view || !window.confirm("이 C3 복구 사례와 비공개 시도 본문을 삭제할까요? 삭제 영수증만 남습니다.")) return;
    const payload = await post("delete");
    if (payload?.deleted) {
      setView(null);
      updateCaseId(null);
    }
  }

  function currentPlanFields() {
    const parsedAvailableMinutes = explicitNumber(availableMinutes);
    const parsedFixedMinutes = explicitNumber(fixedMinutes);
    if (parsedFixedMinutes !== null && parsedFixedMinutes > 0 && !fixedCommitmentId.current) {
      fixedCommitmentId.current = crypto.randomUUID();
    }
    return {
      availableMinutes: parsedAvailableMinutes,
      recoveryMode,
      fixedCommitments:
        parsedFixedMinutes === 0
          ? []
          : parsedFixedMinutes !== null && parsedFixedMinutes > 0
            ? [{ commitmentId: fixedCommitmentId.current, label: "MANUAL_COMMITMENT", minutes: parsedFixedMinutes }]
            : null,
    };
  }

  const primary = !view
    ? { label: "검증된 C2 복구에서 시작", disabled: !sourceSessionId, run: () => post("start", { sourceSessionId }) }
    : view.case.nextAction === "PREPARE_INDEPENDENT_ATTEMPT"
      ? { label: "독립 시도 시작 · 타이머와 문항 봉인 해제", disabled: false, run: () => post("prepare_attempt") }
    : view.case.nextAction === "WAIT_FOR_ELIGIBILITY"
      ? { label: "다음 가능 시점까지 대기", disabled: true, run: () => undefined }
    : view.case.nextAction === "SUBMIT_INDEPENDENT_ATTEMPT"
        ? { label: "독립 시도 제출 및 검증", disabled: body.trim().length === 0 || !learnerResponseFieldsComplete(view.case.subject, fields), run: () => post("record_evidence", { body, learnerResponse: learnerResponseFor(view.case.subject, fields) }) }
        : view.case.nextAction === "EVALUATE_CURRENTLY_CLEAR"
          ? { label: "D+1 · D+7 · 시간제한 근거로 현재 안정 확인", disabled: false, run: () => post("evaluate_currently_clear") }
          : { label: "현재 단계에서 가능한 기본 행동 없음", disabled: true, run: () => undefined };
  const failureNote = view ? failureNoteFor(view) : null;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5" data-wcv-c3-durable-learning="">
      <header className="space-y-2">
        <p className="v3-type-caption text-[var(--color-text-brand)]">Owner 전용 · 합성 fixture · 기본 비활성 · 비-Production</p>
        <h1 className="v3-type-heading-1 text-[var(--color-text-primary)]">내구성 간극 복구와 오늘 지휘</h1>
        <p className="v3-type-body text-[var(--color-text-secondary)]">같은 세션의 성공을 숙달로 과장하지 않습니다. D+1 재현, D+7 전이, 시간제한 재발 검사를 서로 다른 문항군에서 통과한 근거만 현재 안정 후보로 올립니다.</p>
      </header>

      <section className="space-y-5 rounded-[var(--v3-radius-card)] border border-[var(--color-border-default)] bg-[var(--color-background-elevated)] p-4 shadow-sm sm:p-6" aria-labelledby="durable-state-heading">
        <div className="space-y-1">
          <p className="v3-type-caption text-[var(--color-text-secondary)]">{view ? `${view.case.subject} · 기록 버전 ${view.case.recordVersion}` : "검증된 C2 세션을 연결하세요"}</p>
          <h2 id="durable-state-heading" className="v3-type-heading-2 text-[var(--color-text-primary)]">{view ? labelForState(view.case.state) : "내구성 검증 시작"}</h2>
        </div>

        {view?.attempt ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-[var(--color-background-surface)] p-4">
              <p className="v3-type-label-strong">{view.attempt.stage} · {view.attempt.transferDistance}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{view.attempt.prompt}</p>
              <p className="mt-2 text-xs text-[var(--color-text-secondary)]">서버 시작 {view.attempt.trustedStartedAt}{view.attempt.timeLimitSeconds ? ` · 제한 ${view.attempt.timeLimitSeconds}초` : ""}</p>
            </div>
            <label className="block space-y-2"><span className="v3-type-label-strong">보지 않고 작성한 독립 답안</span><Textarea aria-label="보지 않고 작성한 독립 답안" value={body} onChange={(event) => setBody(event.target.value)} className="min-h-48" /></label>
            <fieldset className="space-y-3 rounded-lg border border-[var(--color-border-focus)] p-4"><legend className="px-1 v3-type-label-strong">직접 확인하는 과목별 증명</legend><p className="text-sm text-[var(--color-text-secondary)]">서버가 문항·출처 식별자를 묶고, 학습자는 정답으로 판단한 닫힌 필드만 직접 선택합니다. 어느 선택이 정답인지는 제출 전 표시하지 않습니다.</p><SubjectLearnerResponseFields attempt={view.attempt} fields={fields} setFields={setFields} /></fieldset>
          </div>
        ) : null}

        {view ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-3"><p className="v3-type-label-strong">반복 감점 신호</p><p className="mt-1 text-sm">{view.recurringDeduction.status} · 실패 {view.recurringDeduction.eligibleFailureCount} · 반대근거 {view.recurringDeduction.eligibleCounterEvidenceCount}</p></div>
            <div className="rounded-lg border p-3"><p className="v3-type-label-strong">다음 가능 시점</p><p className="mt-1 text-sm">{view.case.nextEligibleAt ?? "추가 시간 게이트 없음"}</p></div>
          </div>
        ) : null}

        {view && failureNote ? (
          <section className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950" role="status" data-wcv-c3-result-note="">
            <p className="v3-type-caption">가장 큰 간극 1개</p>
            <h3 className="font-semibold">{failureNote.title}</h3>
            <p><strong>왜 틀렸는가:</strong> {failureNote.why}</p>
            <p><strong>실패한 기준:</strong> {failureNote.failedCriterion}</p>
            <p><strong>다음 행동 1개:</strong> {failureNote.nextAction}</p>
            <p><strong>재발 상태:</strong> {view.recurringDeduction.status} · 실패 {view.recurringDeduction.eligibleFailureCount} · 반대근거 {view.recurringDeduction.eligibleCounterEvidenceCount}</p>
            <p><strong>다음 검토:</strong> {failureNote.nextReview}</p>
          </section>
        ) : null}

        {error ? <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">{error}</p> : null}
        <Button type="button" size="lg" className="w-full sm:w-auto" disabled={busy || primary.disabled} onClick={primary.run} data-primary-action>{busy ? "안전하게 처리 중…" : primary.label}</Button>
      </section>

      {view ? (
        <details className="rounded-[var(--v3-radius-card)] border border-[var(--color-border-default)] bg-[var(--color-background-elevated)] p-4">
          <summary className="min-h-11 cursor-pointer py-2 font-medium">Today / Full-Day 계획과 내 기록</summary>
          <div className="mt-4 space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1"><span className="text-sm font-medium">가용 분</span><input aria-label="가용 분" inputMode="numeric" value={availableMinutes} onChange={(event) => setAvailableMinutes(event.target.value)} className={INPUT_CLASS} /></label>
              <label className="space-y-1"><span className="text-sm font-medium">회복 모드</span><select aria-label="회복 모드" value={recoveryMode} onChange={(event) => setRecoveryMode(event.target.value as typeof recoveryMode)} className={INPUT_CLASS}><option value="NORMAL">NORMAL</option><option value="MINIMUM_MAINTENANCE">MINIMUM_MAINTENANCE</option></select></label>
              <label className="space-y-1"><span className="text-sm font-medium">고정 일정 분</span><input aria-label="고정 일정 분" inputMode="numeric" value={fixedMinutes} onChange={(event) => setFixedMinutes(event.target.value)} className={INPUT_CLASS} /></label>
            </div>
            <Button type="button" variant="outline" disabled={busy} onClick={() => void post("build_plan", currentPlanFields())}>근거 우선 계획 만들기</Button>
            {view.latestPlan ? (
              <div className="space-y-3 rounded-lg border p-3">
                <p className="font-medium">핵심 결과 {view.latestPlan.coreOutcomes.length}개 · 결정 {view.latestPlan.decision}</p>
                <ol className="space-y-2">{view.latestPlan.coreOutcomes.map((outcome) => <li key={outcome.outcomeId} className="text-sm"><strong>{outcome.rank}. {outcome.kind}</strong><br />{outcome.successCriterionKo} · {outcome.estimatedMinutes}분</li>)}</ol>
                {view.latestPlan.decision === "PROPOSED" ? <div className="flex flex-wrap gap-2"><Button type="button" disabled={busy} onClick={() => post("decide_plan", { decision: "ACCEPTED", reason: "accepted_as_proposed" })}>계획 수락</Button><Button type="button" variant="outline" disabled={busy} onClick={() => post("decide_plan", { decision: "EDITED", reason: "available_minutes_changed", ...currentPlanFields() })}>현재 입력으로 수정 확정</Button><Button type="button" variant="outline" disabled={busy} onClick={() => post("decide_plan", { decision: "REJECTED", reason: "deferred_by_learner" })}>오늘 보류</Button></div> : null}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={busy} onClick={exportCase}>내 기록 내보내기</Button><Button type="button" variant="outline" disabled={busy} onClick={deleteCase}>이 C3 사례 삭제</Button></div>
            <p className="text-sm text-[var(--color-text-secondary)]">비공개 답안 본문 {view.ledger.artifacts.length}개 · 본문 없는 근거 이벤트 {view.ledger.events.length}개</p>
          </div>
        </details>
      ) : null}

      <p className="v3-type-caption text-[var(--color-text-secondary)]">계획의 수락·수정·거절만으로 숙달 상태는 바뀌지 않습니다. 답안 본문은 사용자 전용 저장소에 분리되고 반복 감점 투영에는 본문이 들어가지 않습니다.</p>
    </div>
  );
}
