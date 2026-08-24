"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  C3RPPlanBlock,
  C3RPPracticeClaimInput,
  C3RPView,
} from "@/lib/review-os/c3r-p-contract";

type ApiResult = {
  ok: boolean;
  error?: string;
  view?: C3RPView;
  scaffold?: string;
  biggestGapReasonCode?: string;
  canonicalSentence?: string;
  export?: Record<string, unknown>;
  result?: Record<string, unknown>;
};

const apiPath = "/api/review-os/c3r-p";
const C3R_P_DELETE_COMPLETE_HISTORY_KEY = "__dabangilC3RPDeleteComplete";

function id() {
  return window.crypto.randomUUID();
}

type StructuredCalculationInput = Readonly<{
  grossIncome: string;
  operatingExpense: string;
  result: string;
}>;

function numericField(value: string) {
  const normalized = value.replaceAll(",", "").trim();
  if (!/^\d+(?:\.\d+)?$/u.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function practiceClaim(
  fields: StructuredCalculationInput,
  sourceRevisionId: string | undefined,
): C3RPPracticeClaimInput | null {
  const grossIncome = numericField(fields.grossIncome);
  const operatingExpense = numericField(fields.operatingExpense);
  const result = numericField(fields.result);
  if (
    !sourceRevisionId ||
    grossIncome === null ||
    operatingExpense === null ||
    result === null
  ) return null;
  return {
    sourceRevisionId,
    anchorId: "repair-anchor:practice:synthetic-net-income",
    anchorVersionId: "repair-anchor:practice:synthetic-net-income@1",
    grossIncome: { value: grossIncome, unit: "KRW_PER_YEAR" },
    operatingExpense: { value: operatingExpense, unit: "KRW_PER_YEAR" },
    operator: "SUBTRACT",
    operandOrder: ["gross_income", "operating_expense"],
    result: { value: result, unit: "KRW_PER_YEAR" },
    sign: "POSITIVE",
    rounding: { mode: "HALF_UP", scale: 0, required: false },
    confirmationMode: "MANUAL_STRUCTURED",
  };
}

export function C3RPPracticeLoop({
  initialRecordId,
}: {
  initialRecordId: string | null;
}) {
  const [view, setView] = useState<C3RPView | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptBody, setAttemptBody] = useState(
    "연간 총수익에서 운영비를 빼야 하지만 결과와 단위를 아직 확정하지 못했습니다.",
  );
  const [failureNote, setFailureNote] = useState(
    "총수익과 운영비의 차감 순서, 결과 단위, 반올림 여부를 한 번에 묶지 못했다.",
  );
  const [structuredCalculation, setStructuredCalculation] = useState<StructuredCalculationInput>({
    grossIncome: "",
    operatingExpense: "",
    result: "",
  });
  const [prediction, setPrediction] = useState<
    "likely_success" | "likely_partial" | "likely_blocked"
  >("likely_partial");
  const [confidence, setConfidence] = useState<"low" | "medium" | "high">("medium");
  const [scaffold, setScaffold] = useState<string | null>(null);
  const [canonicalSentence, setCanonicalSentence] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const restored = view?.restored ?? null;
  const record = restored?.record ?? null;
  const gap = restored?.gaps[0] ?? null;
  const currentPlan = view?.currentPlan ?? null;

  async function request(body: Record<string, unknown>): Promise<ApiResult> {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as ApiResult;
      if (!response.ok || !data.ok) throw new Error(data.error ?? "request_failed");
      if (data.view) setView(data.view);
      if (data.scaffold) setScaffold(data.scaffold);
      if (data.canonicalSentence) setCanonicalSentence(data.canonicalSentence);
      return data;
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "request_failed";
      setError(message);
      return { ok: false };
    } finally {
      setPending(false);
    }
  }

  useEffect(() => {
    let active = true;
    const suffix = initialRecordId ? `?recordId=${encodeURIComponent(initialRecordId)}` : "";
    fetch(`${apiPath}${suffix}`, { cache: "no-store", credentials: "same-origin" })
      .then(async (response) => {
        const data = (await response.json()) as ApiResult;
        if (!response.ok || !data.ok || !data.view) {
          throw new Error(data.error ?? "load_failed");
        }
        if (active) setView(data.view);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "load_failed");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [initialRecordId]);

  useEffect(() => {
    const historyState = window.history.state;
    if (
      historyState &&
      typeof historyState === "object" &&
      historyState[C3R_P_DELETE_COMPLETE_HISTORY_KEY] === true
    ) {
      queueMicrotask(() => setExportStatus("삭제 완료"));
    }
  }, [initialRecordId]);

  const phaseLabel = useMemo(() => {
    if (!record) return "D0 시도 시작";
    return {
      D0_OPEN: "피드백 전 약속 완료",
      FEEDBACK_COMMITTED: "가장 큰 간극 1개",
      REPAIRED: "D+1 무도움 재구성",
      D1_COMPLETE: "봉인된 D+7 전이",
      D7_COMPLETE: "시간 기반 재출현",
      CLOSED: "독립 수행 완료",
      REOPENED: "후속 실패로 다시 열림",
    }[record.state];
  }, [record]);

  async function start() {
    const recordId = id();
    const data = await request({
      action: "start",
      commandId: id(),
      recordId,
      attemptId: id(),
      attemptBody,
      prediction,
      confidence,
      evidenceStep: "d0",
    });
    if (data.view) {
      window.history.replaceState(null, "", `/app/c3r-p?recordId=${recordId}`);
    }
  }

  async function feedback() {
    if (!record) return;
    await request({
      action: "commit_feedback",
      commandId: id(),
      recordId: record.id,
      expectedVersion: record.record_version,
      gapId: id(),
      failureNoteId: id(),
      assistanceEventId: id(),
      failureNote,
      evidenceStep: "feedback",
    });
  }

  async function repair() {
    if (!record) return;
    const claim = practiceClaim(structuredCalculation, view?.source.revisionId);
    if (!claim) {
      setError("structured_claim_required");
      return;
    }
    await request({
      action: "submit_repair",
      commandId: id(),
      recordId: record.id,
      expectedVersion: record.record_version,
      attemptId: id(),
      claim,
      evidenceStep: "feedback",
    });
  }

  async function review(
    action:
      | "record_assisted_review"
      | "complete_d1"
      | "complete_d7_transfer"
      | "complete_recurrence"
      | "record_later_failure",
  ) {
    if (!record) return;
    const claim = practiceClaim(structuredCalculation, view?.source.revisionId);
    if (!claim) {
      setError("structured_claim_required");
      return;
    }
    const evidenceStep = action === "record_assisted_review" || action === "complete_d1"
      ? "d1"
      : action === "complete_d7_transfer"
        ? "d7"
        : action === "complete_recurrence"
          ? "recurrence"
          : "reopen";
    await request({
      action,
      commandId: id(),
      recordId: record.id,
      expectedVersion: record.record_version,
      attemptId: id(),
      claim,
      evidenceStep,
    });
  }

  async function createPlan(kind: "TODAY" | "FULL_DAY") {
    if (!record) return;
    await request({
      action: "create_plan",
      commandId: id(),
      recordId: record.id,
      planId: id(),
      kind,
      availableMinutes: kind === "TODAY" ? 90 : 240,
      evidenceStep: "plan",
    });
  }

  async function decidePlan(decision: "ACCEPT" | "EDIT" | "REJECT") {
    if (!currentPlan || !record) return;
    const blocks: readonly C3RPPlanBlock[] | null =
      decision === "EDIT"
        ? currentPlan.blocks.map((block, index) => ({
            ...block,
            blockId: id(),
            ordinal: index + 1,
            minutes: Math.max(10, block.minutes - 5),
          }))
        : null;
    await request({
      action: "decide_plan",
      commandId: id(),
      recordId: record.id,
      planId: currentPlan.planId,
      expectedVersion: currentPlan.recordVersion,
      decision,
      blocks,
      evidenceStep: "plan",
    });
  }

  async function exportData() {
    const data = await request({ action: "export" });
    if (!data.ok || !data.export) return;
    const blob = new Blob([JSON.stringify(data.export, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "dabangil-c3r-p-practice-export.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setExportStatus("내보내기 완료");
  }

  async function deleteData() {
    if (!window.confirm("C3R-P 실무 학습 기록을 삭제할까요? 이 작업은 되돌릴 수 없습니다.")) return;
    const data = await request({ action: "delete" });
    if (!data.ok) return;
    if (data.result?.status !== "deleted") {
      setError("temporarily_unavailable");
      return;
    }
    const historyState = window.history.state;
    const nextHistoryState =
      historyState && typeof historyState === "object" && !Array.isArray(historyState)
        ? { ...historyState }
        : {};
    window.history.replaceState(
      { ...nextHistoryState, [C3R_P_DELETE_COMPLETE_HISTORY_KEY]: true },
      "",
      "/app/c3r-p",
    );
    setView((current) => current ? { ...current, restored: null, currentPlan: null } : current);
    setExportStatus("삭제 완료");
  }

  if (loading) {
    return <main className="mx-auto max-w-3xl p-6">실무 학습 기록을 복원하고 있습니다.</main>;
  }

  return (
    <main
      className="mx-auto grid max-w-3xl gap-6 p-6"
      data-c3r-p-practice-runtime="true"
      data-c3r-p-state={record?.state ?? "UNSTARTED"}
    >
      <header className="grid gap-2">
        <p className="text-sm font-semibold text-[var(--color-brand-primary)]">답안길 · 감평 2차 실무</p>
        <h1 className="text-3xl font-semibold text-[var(--color-text-primary)]">Practice 지속학습 루프</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          기본 OFF · Owner 전용 · 공식 채점이나 공식 모범답안이 아닌 학습용 Evidence Review입니다.
        </p>
      </header>

      {error ? (
        <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          요청을 완료하지 못했습니다: {error}
        </p>
      ) : null}

      <section className="rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">현재 한 가지 과업</p>
        <h2 className="mt-1 text-xl font-semibold" data-testid="c3r-p-phase">{phaseLabel}</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{view?.source.prompt}</p>

        {!record ? (
          <div className="mt-5 grid gap-4">
            <label className="grid gap-1 text-sm font-medium">
              도움을 보기 전 첫 시도
              <textarea
                className="min-h-32 rounded-xl border p-3 font-normal"
                value={attemptBody}
                onChange={(event) => setAttemptBody(event.target.value)}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1 text-sm font-medium">
                예상
                <select className="rounded-lg border p-2" value={prediction} onChange={(event) => setPrediction(event.target.value as typeof prediction)}>
                  <option value="likely_success">성공 예상</option>
                  <option value="likely_partial">부분 성공 예상</option>
                  <option value="likely_blocked">막힘 예상</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium">
                확신
                <select className="rounded-lg border p-2" value={confidence} onChange={(event) => setConfidence(event.target.value as typeof confidence)}>
                  <option value="low">낮음</option>
                  <option value="medium">보통</option>
                  <option value="high">높음</option>
                </select>
              </label>
            </div>
            <button disabled={pending} onClick={() => void start()} className="rounded-xl bg-[var(--color-action-primary)] px-4 py-3 font-semibold text-white disabled:opacity-50">
              첫 시도와 확신을 고정하기
            </button>
          </div>
        ) : null}

        {record?.state === "D0_OPEN" ? (
          <div className="mt-5 grid gap-3">
            <label className="grid gap-1 text-sm font-medium">
              내 실패 메모
              <textarea className="min-h-24 rounded-xl border p-3 font-normal" value={failureNote} onChange={(event) => setFailureNote(event.target.value)} />
            </label>
            <button disabled={pending} onClick={() => void feedback()} className="rounded-xl bg-[var(--color-action-primary)] px-4 py-3 font-semibold text-white disabled:opacity-50">
              도움 상태를 먼저 기록하고 가장 큰 간극 보기
            </button>
          </div>
        ) : null}

        {record && ["FEEDBACK_COMMITTED", "REPAIRED", "D1_COMPLETE", "D7_COMPLETE", "CLOSED"].includes(record.state) ? (
          <fieldset className="mt-5 grid gap-3 rounded-xl border border-[var(--color-border-default)] p-4">
            <legend className="px-2 text-sm font-semibold">내가 직접 입력한 구조화 계산</legend>
            <p className="text-sm text-[var(--color-text-secondary)]">
              세 값을 직접 입력해야 서버가 이 시도 자체를 검증합니다. 연산은 총수익 − 운영비, 단위는 원/년, 부호는 양수, 반올림은 없음으로 고정됩니다.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-1 text-sm font-medium">
                연간 총수익
                <input
                  data-testid="c3r-p-gross-income"
                  inputMode="decimal"
                  className="rounded-lg border p-2 font-normal"
                  value={structuredCalculation.grossIncome}
                  onChange={(event) => setStructuredCalculation((current) => ({
                    ...current,
                    grossIncome: event.target.value,
                  }))}
                  placeholder="120000000"
                />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                연간 운영비
                <input
                  data-testid="c3r-p-operating-expense"
                  inputMode="decimal"
                  className="rounded-lg border p-2 font-normal"
                  value={structuredCalculation.operatingExpense}
                  onChange={(event) => setStructuredCalculation((current) => ({
                    ...current,
                    operatingExpense: event.target.value,
                  }))}
                  placeholder="20000000"
                />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                계산 결과
                <input
                  data-testid="c3r-p-result"
                  inputMode="decimal"
                  className="rounded-lg border p-2 font-normal"
                  value={structuredCalculation.result}
                  onChange={(event) => setStructuredCalculation((current) => ({
                    ...current,
                    result: event.target.value,
                  }))}
                  placeholder="100000000"
                />
              </label>
            </div>
          </fieldset>
        ) : null}

        {record?.state === "FEEDBACK_COMMITTED" ? (
          <div className="mt-5 grid gap-3">
            <div className="rounded-xl bg-amber-50 p-4 text-sm">
              <strong>가장 큰 간극 1개:</strong> {view?.source.gapLabel}
              <p className="mt-2">{scaffold ?? view?.source.scaffold}</p>
            </div>
            <button disabled={pending} onClick={() => void repair()} className="rounded-xl bg-[var(--color-action-primary)] px-4 py-3 font-semibold text-white disabled:opacity-50">
              내가 입력한 구조화 계산으로 수리 저장
            </button>
          </div>
        ) : null}

        {record?.state === "REPAIRED" ? (
          <div className="mt-5 grid gap-3">
            <p className="rounded-xl bg-slate-50 p-3 text-sm">D+1은 도움 없이 다시 구성해야 독립 성공으로 기록됩니다.</p>
            <button disabled={pending} onClick={() => void review("record_assisted_review")} className="rounded-xl border px-4 py-3 font-semibold disabled:opacity-50">
              도움을 사용한 D+1 기록(독립 성공 아님)
            </button>
            <button disabled={pending} onClick={() => void review("complete_d1")} className="rounded-xl bg-[var(--color-action-primary)] px-4 py-3 font-semibold text-white disabled:opacity-50">
              D+1 무도움 재구성 완료
            </button>
          </div>
        ) : null}

        {record?.state === "D1_COMPLETE" ? (
          <button disabled={pending} onClick={() => void review("complete_d7_transfer")} className="mt-5 w-full rounded-xl bg-[var(--color-action-primary)] px-4 py-3 font-semibold text-white disabled:opacity-50">
            다른 문항·다른 화면에서 봉인된 D+7 전이 완료
          </button>
        ) : null}

        {record?.state === "D7_COMPLETE" ? (
          <button disabled={pending} onClick={() => void review("complete_recurrence")} className="mt-5 w-full rounded-xl bg-[var(--color-action-primary)] px-4 py-3 font-semibold text-white disabled:opacity-50">
            시간 기반 재출현 독립 수행 완료
          </button>
        ) : null}

        {record?.state === "CLOSED" ? (
          <div className="mt-5 grid gap-2">
            <p className="text-sm text-[var(--color-text-secondary)]">후속 수행에서 실제로 입력한 값이 틀렸을 때만 간극을 다시 엽니다.</p>
            <button disabled={pending} onClick={() => void review("record_later_failure")} className="w-full rounded-xl border border-amber-500 px-4 py-3 font-semibold text-amber-800 disabled:opacity-50">
              입력한 후속 실패로 간극 다시 열기
            </button>
          </div>
        ) : null}

        {record?.state === "REOPENED" ? (
          <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm">이전 종료가 취소되고 Review Queue에 즉시 다시 등록되었습니다.</p>
        ) : null}

        {canonicalSentence ? (
          <p className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm" data-testid="c3r-p-canonical-sentence">학습용 확인 문장: {canonicalSentence}</p>
        ) : null}
      </section>

      {record ? (
        <section className="grid gap-4 rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm" data-testid="c3r-p-ledger">
          <div>
            <h2 className="text-lg font-semibold">Personal Study Ledger</h2>
            <p className="text-sm text-[var(--color-text-secondary)]">원문은 개인 영역에만 있고, 아래 증거 투영은 본문을 포함하지 않습니다.</p>
          </div>
          <ul className="grid gap-2 text-sm">
            {(restored?.ledger ?? []).map((entry) => (
              <li key={entry.id} className="rounded-lg bg-slate-50 p-3">
                {entry.entry_kind} · {entry.evidence_ref.split("#")[1]}
              </li>
            ))}
          </ul>
          {gap ? <p className="text-sm">현재 간극: {gap.state} · 다시 열림 {gap.reopen_count}회</p> : null}
          {restored?.failureNotes[0] ? <p className="rounded-lg border p-3 text-sm">내 실패 메모: {restored.failureNotes[0].body}</p> : null}
        </section>
      ) : null}

      {record?.state === "REOPENED" ? (
        <section className="grid gap-3 rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm" data-testid="c3r-p-planner">
          <h2 className="text-lg font-semibold">Review Queue · Today · Full-Day</h2>
          <p className="text-sm">실행 가능한 항목만 계획에 들어가며 CoreOutcome은 최대 3개입니다.</p>
          <div className="grid grid-cols-2 gap-3">
            <button disabled={pending} onClick={() => void createPlan("TODAY")} className="rounded-xl border px-4 py-3 font-semibold">Today 90분</button>
            <button disabled={pending} onClick={() => void createPlan("FULL_DAY")} className="rounded-xl border px-4 py-3 font-semibold">Full-Day 240분</button>
          </div>
          {currentPlan ? (
            <div className="grid gap-3 rounded-xl bg-slate-50 p-4">
              <p className="font-semibold">계획 상태: {currentPlan.state}</p>
              <ul className="text-sm">
                {currentPlan.blocks.map((block) => <li key={block.blockId}>{block.ordinal}. {block.blockKind} · {block.minutes}분</li>)}
              </ul>
              <p className="text-sm">dayComplete: {String(currentPlan.dayComplete)}</p>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => void decidePlan("ACCEPT")} className="rounded-lg border p-2">수락</button>
                <button onClick={() => void decidePlan("EDIT")} className="rounded-lg border p-2">편집</button>
                <button onClick={() => void decidePlan("REJECT")} className="rounded-lg border p-2">거절</button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {record ? (
        <section className="grid gap-3 rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">복원 · 내보내기 · 삭제</h2>
          <p className="text-sm">이 URL을 새로고침하거나 두 번째 브라우저에서 열면 같은 기록을 서버에서 복원합니다.</p>
          <div className="grid grid-cols-2 gap-3">
            <button disabled={pending} onClick={() => void exportData()} className="rounded-xl border px-4 py-3 font-semibold">내 데이터 내보내기</button>
            <button disabled={pending} onClick={() => void deleteData()} className="rounded-xl border border-red-300 px-4 py-3 font-semibold text-red-700">내 C3R-P 데이터 삭제</button>
          </div>
          {exportStatus ? <p className="text-sm" role="status">{exportStatus}</p> : null}
        </section>
      ) : null}
    </main>
  );
}
