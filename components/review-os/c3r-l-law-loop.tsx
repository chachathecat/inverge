"use client";

import { useCallback, useEffect, useState } from "react";

import {
  C3R_L_ANCHOR_ID,
  C3R_L_ANCHOR_VERSION_ID,
  C3R_L_LAW_ANCHOR_ID,
  C3R_L_LAW_ANCHOR_VERSION_ID,
  C3R_L_SOURCE_BINDING_ID,
  C3R_L_SOURCE_ID,
  C3R_L_SOURCE_VERSION_ID,
  c3rLCompletionPlanBinding,
  c3rLCurrentQueueItem,
  type C3RLPlanBlockInput,
  type C3RLView,
} from "@/lib/review-os/c3r-l-contract";

type ApiResult = {
  ok: boolean;
  error?: string;
  view?: C3RLView;
  scaffold?: string;
  canonicalSentence?: string;
  export?: Record<string, unknown>;
  result?: Record<string, unknown>;
};

const apiPath = "/api/review-os/c3r-l";
function id() { return crypto.randomUUID(); }

type LawClaimDraft = {
  anchorId: string;
  anchorVersionId: string;
  lawSourceBindingId: string;
  sourceId: string;
  sourceVersionId: string;
  lawAnchorId: string;
  lawAnchorVersionId: string;
  exactLocator: string;
  exactVersionIdentity: string;
  effectiveFrom: string;
  effectiveTo: string;
  applicableAsOf: string;
  currentLawApplicability: "" | "APPLICABLE_CURRENT" | "NOT_CURRENT" | "UNRESOLVED";
  openBlockingReferenceIds: string;
  blockerCount: string;
};
type LawTextClaimKey = Exclude<keyof LawClaimDraft, "currentLawApplicability">;

const emptyLawClaimDraft: LawClaimDraft = {
  anchorId: "", anchorVersionId: "", lawSourceBindingId: "", sourceId: "",
  sourceVersionId: "", lawAnchorId: "", lawAnchorVersionId: "", exactLocator: "",
  exactVersionIdentity: "", effectiveFrom: "", effectiveTo: "", applicableAsOf: "",
  currentLawApplicability: "", openBlockingReferenceIds: "", blockerCount: "",
};
const lawClaimTextFields: ReadonlyArray<{
  key: LawTextClaimKey;
  label: string;
  optional?: boolean;
}> = [
  { key: "anchorId", label: "수리 앵커 ID" },
  { key: "anchorVersionId", label: "수리 앵커 버전 ID" },
  { key: "lawSourceBindingId", label: "법원문 결합 ID" },
  { key: "sourceId", label: "출처 ID" },
  { key: "sourceVersionId", label: "출처 버전 ID" },
  { key: "lawAnchorId", label: "법조문 앵커 ID" },
  { key: "lawAnchorVersionId", label: "법조문 앵커 버전 ID" },
  { key: "exactLocator", label: "정확 위치" },
  { key: "exactVersionIdentity", label: "정확 버전 식별자" },
  { key: "effectiveFrom", label: "효력 시작일 (YYYY-MM-DD)" },
  { key: "effectiveTo", label: "효력 종료일 (없으면 비움)", optional: true },
  { key: "applicableAsOf", label: "적용 기준일 (YYYY-MM-DD)" },
  { key: "openBlockingReferenceIds", label: "열린 차단 근거 ID (쉼표 구분, 없으면 비움)", optional: true },
  { key: "blockerCount", label: "열린 차단 근거 수" },
];

export function C3RLLawLoop({ initialRecordId }: { initialRecordId: string | null }) {
  const [view, setView] = useState<C3RLView | null>(null);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [requestedRecordId, setRequestedRecordId] = useState(initialRecordId);
  const [initialLoadRevision, setInitialLoadRevision] = useState(0);
  const [attemptBody, setAttemptBody] = useState("");
  const [failureNote, setFailureNote] = useState("");
  const [prediction, setPrediction] = useState<"likely_success" | "likely_partial" | "likely_blocked">("likely_partial");
  const [confidence, setConfidence] = useState<"low" | "medium" | "high">("medium");
  const [lawBindingConfirmed, setLawBindingConfirmed] = useState(false);
  const [lawClaimDraft, setLawClaimDraft] = useState<LawClaimDraft>(emptyLawClaimDraft);
  const [availableMinutes, setAvailableMinutes] = useState(90);

  const request = useCallback(async (body?: Record<string, unknown>, query = "") => {
    setPending(true);
    setStatus(null);
    try {
      const response = await fetch(`${apiPath}${query}`, body ? {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      } : { cache: "no-store" });
      const data = await response.json() as ApiResult;
      if (!data.ok) setStatus(data.error ?? "요청을 완료하지 못했습니다.");
      if (data.view) setView(data.view);
      return data;
    } catch {
      setStatus("잠시 후 다시 시도하세요.");
      return { ok: false } as ApiResult;
    } finally {
      setPending(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const query = requestedRecordId ? `?recordId=${encodeURIComponent(requestedRecordId)}` : "";
    void fetch(`${apiPath}${query}`, { cache: "no-store" })
      .then(async (response) => response.json() as Promise<ApiResult>)
      .then((data) => {
        if (cancelled) return;
        if (!data.ok) setStatus(data.error ?? "요청을 완료하지 못했습니다.");
        if (data.view) setView(data.view);
      })
      .catch(() => {
        if (!cancelled) setStatus("잠시 후 다시 시도하세요.");
      });
    return () => { cancelled = true; };
  }, [initialLoadRevision, requestedRecordId]);

  const restored = view?.restored ?? null;
  const record = restored?.record ?? null;
  const gap = restored?.gaps[0] ?? null;
  const transferTask = restored?.transferTask ?? null;
  const queueItem = (reviewPhase: "D1" | "D7_TRANSFER" | "RECURRENCE" | "REOPENED_REVIEW") =>
    c3rLCurrentQueueItem({
      queue: view?.dashboard.queue ?? [],
      recordId: record?.id,
      recordState: record?.state,
      gapId: gap?.id,
      gapState: gap?.state,
      reviewPhase,
    });
  const d1QueueItem = queueItem("D1");
  const d7QueueItem = queueItem("D7_TRANSFER");
  const recurrenceQueueItem = queueItem("RECURRENCE");
  const reopenedQueueItem = queueItem("REOPENED_REVIEW");
  const d1Eligible = d1QueueItem?.eligible === true;
  const d7Eligible = d7QueueItem?.eligible === true;
  const recurrenceEligible = recurrenceQueueItem?.eligible === true;
  const reopenedEligible = reopenedQueueItem?.eligible === true;
  const hasEligibleQueueItem = view?.dashboard.queue.some((item) => item.eligible) === true;
  const currentPhase = record?.state === "REPAIRED" ? "D1"
    : record?.state === "D1_COMPLETE" ? "D7_TRANSFER"
      : record?.state === "D7_COMPLETE" ? "RECURRENCE"
        : record?.state === "REOPENED" ? "REOPENED_REVIEW" : null;
  const completionPlanBinding = c3rLCompletionPlanBinding({
    plan: view?.currentPlan,
    recordId: record?.id,
    gapId: record?.primary_gap_id,
    reviewPhase: currentPhase,
  });

  function resetLawReconstruction() {
    setLawClaimDraft(emptyLawClaimDraft);
    setLawBindingConfirmed(false);
  }

  const requiredClaimValues = [
    lawClaimDraft.anchorId, lawClaimDraft.anchorVersionId, lawClaimDraft.lawSourceBindingId,
    lawClaimDraft.sourceId, lawClaimDraft.sourceVersionId, lawClaimDraft.lawAnchorId,
    lawClaimDraft.lawAnchorVersionId, lawClaimDraft.exactLocator,
    lawClaimDraft.exactVersionIdentity, lawClaimDraft.effectiveFrom,
    lawClaimDraft.applicableAsOf, lawClaimDraft.currentLawApplicability,
    lawClaimDraft.blockerCount,
  ];
  const reconstructionReady = lawBindingConfirmed && requiredClaimValues.every((value) =>
    value.trim().length > 0) && /^\d+$/u.test(lawClaimDraft.blockerCount);

  function updateClaimDraft<K extends keyof LawClaimDraft>(key: K, value: LawClaimDraft[K]) {
    setLawClaimDraft((current) => ({ ...current, [key]: value }));
    setLawBindingConfirmed(false);
  }

  function claim() {
    const blockerReferences = lawClaimDraft.openBlockingReferenceIds.split(",")
      .map((value) => value.trim()).filter(Boolean);
    return {
      sourceRevisionId: view?.source.revisionId,
      anchorId: lawClaimDraft.anchorId.trim(),
      anchorVersionId: lawClaimDraft.anchorVersionId.trim(),
      lawSourceBindingId: lawClaimDraft.lawSourceBindingId.trim(),
      sourceId: lawClaimDraft.sourceId.trim(),
      sourceVersionId: lawClaimDraft.sourceVersionId.trim(),
      lawAnchorId: lawClaimDraft.lawAnchorId.trim(),
      lawAnchorVersionId: lawClaimDraft.lawAnchorVersionId.trim(),
      exactLocator: lawClaimDraft.exactLocator.trim(),
      exactVersionIdentity: lawClaimDraft.exactVersionIdentity.trim(),
      effectiveFrom: lawClaimDraft.effectiveFrom.trim(),
      effectiveTo: lawClaimDraft.effectiveTo.trim() || null,
      applicableAsOf: lawClaimDraft.applicableAsOf.trim(),
      currentLawApplicability: lawClaimDraft.currentLawApplicability,
      blockerState: {
        openBlockingReferenceIds: blockerReferences,
        blockerCount: Number(lawClaimDraft.blockerCount),
      },
      confirmationMode: "MANUAL_STRUCTURED",
    };
  }

  async function start() {
    const recordId = id();
    const data = await request({
      action: "start", commandId: id(), recordId, attemptId: id(), attemptBody,
      prediction, confidence, evidenceStep: "d0",
    });
    if (data.ok) window.history.replaceState(null, "", `/app/c3r-l?recordId=${recordId}`);
  }
  async function commitFeedback() {
    if (!record) return;
    await request({
      action: "commit_feedback", commandId: id(), recordId: record.id,
      expectedVersion: record.record_version, gapId: id(), failureNoteId: id(),
      assistanceEventId: id(), failureNote, evidenceStep: "feedback",
    });
  }
  async function submitRepair() {
    if (!record) return;
    const data = await request({
      action: "submit_repair", commandId: id(), recordId: record.id,
      expectedVersion: record.record_version, attemptId: id(), claim: claim(),
      evidenceStep: "feedback",
    });
    if (data.ok) resetLawReconstruction();
  }
  async function review(action: "record_assisted_review" | "complete_d1" |
    "complete_d7_transfer" | "complete_recurrence" | "complete_reopened_review" |
    "record_later_failure") {
    if (!record) return;
    const evidenceStep = action === "record_assisted_review" ? "d1"
      : action === "complete_d1" ? "d1Fresh"
        : action === "complete_d7_transfer" ? "d7"
          : action === "complete_recurrence" ? "recurrence"
            : action === "record_later_failure" ? "reopen" : "reopenComplete";
    const data = await request({
      action, commandId: id(), recordId: record.id,
      expectedVersion: record.record_version, attemptId: id(),
      claim: claim(),
      ...(action === "complete_d7_transfer" ? { transferTaskId: transferTask?.taskId } : {}),
      ...(new Set(["complete_d1", "complete_d7_transfer", "complete_recurrence", "complete_reopened_review"])
        .has(action) ? completionPlanBinding : {}),
      evidenceStep,
    });
    if (data.ok) resetLawReconstruction();
  }
  async function presentTransfer() {
    if (!record || !transferTask) return;
    const data = await request({
      action: "present_d7_transfer_task", commandId: id(), recordId: record.id,
      expectedVersion: record.record_version, transferTaskId: transferTask.taskId,
      evidenceStep: "d7",
    });
    if (data.ok) resetLawReconstruction();
  }
  async function createPlan(kind: "TODAY" | "FULL_DAY") {
    if (!record) return;
    await request({
      action: "create_plan", commandId: id(), recordId: record.id, planId: id(), kind,
      availableMinutes, evidenceStep: kind === "TODAY" ? "planToday" : "planFullDay",
    });
  }
  async function decidePlan(decision: "ACCEPT" | "EDIT" | "REJECT") {
    if (!record || !view?.currentPlan) return;
    const blocks: readonly C3RLPlanBlockInput[] | null = decision === "EDIT"
      ? view.currentPlan.blocks.map((block, index) => ({
          blockId: block.blockId, blockKind: block.blockKind, recordId: block.recordId,
          gapId: block.gapId, reviewPhase: block.reviewPhase, ordinal: index + 1,
          minutes: Math.max(1, block.minutes - 5),
        })) : null;
    await request({
      action: "decide_plan", commandId: id(), recordId: record.id,
      planId: view.currentPlan.planId, expectedVersion: view.currentPlan.recordVersion,
      decision, blocks, evidenceStep: "plan",
    });
  }
  async function exportData() {
    const data = await request({ action: "export" });
    if (!data.ok || !data.export) return;
    const blob = new Blob([JSON.stringify(data.export, null, 2)], { type: "application/json" });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = "dabangil-c3r-l-law-export.json";
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  }
  async function deleteData() {
    if (!window.confirm("내 C3R-L 법규 학습 데이터만 삭제할까요? 실무·이론 데이터는 유지됩니다.")) return;
    const data = await request({ action: "delete" });
    if (data.result?.status === "deleted") {
      setView((current) => current ? { ...current, restored: null, currentPlan: null } : current);
      window.history.replaceState(null, "", "/app/c3r-l");
    }
  }

  if (!view) return status ? (
    <main className="mx-auto grid max-w-3xl gap-3 p-6" data-testid="c3r-l-load-error">
      <p role="alert" className="rounded-lg border border-amber-300 p-3">{status}</p>
      <button type="button" className="rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white"
        onClick={() => { setStatus(null); setInitialLoadRevision((revision) => revision + 1); }}>
        다시 시도
      </button>
      <button type="button" className="rounded-xl border border-slate-400 px-4 py-3 font-semibold"
        onClick={() => {
          window.history.replaceState(null, "", "/app/c3r-l");
          setStatus(null);
          setRequestedRecordId(null);
          setInitialLoadRevision((revision) => revision + 1);
        }}>
        기본 법규 학습으로 돌아가기
      </button>
    </main>
  ) : (
    <main className="mx-auto max-w-3xl p-6" data-testid="c3r-l-loading">
      법규 학습 상태를 불러오는 중입니다.
    </main>
  );

  return (
    <main className="mx-auto grid max-w-3xl gap-6 p-6" data-testid="c3r-l-runtime">
      <header className="grid gap-2">
        <p className="text-sm font-semibold text-slate-600">Owner-only · 기본 OFF · 법규 durable-learning</p>
        <h1 className="text-2xl font-bold">감정평가 및 보상법규 정확 적용 재구성</h1>
        <p className="text-sm text-slate-700">설명을 보기 전에 직접 답하고, 한 가지 핵심 간극을 고친 뒤 예정된 전이까지 이어갑니다.</p>
      </header>
      {status ? <p role="status" className="rounded-lg border border-amber-300 p-3">{status}</p> : null}
      <section className="grid gap-3 rounded-2xl border p-5">
        <h2 className="font-bold">현재 과업</h2>
        <p>{view.source.prompt}</p>
        {!record ? <>
          <label className="grid gap-1">예측
            <select value={prediction} onChange={(event) => setPrediction(event.target.value as typeof prediction)} className="rounded-lg border p-2">
              <option value="likely_success">성공할 것 같다</option><option value="likely_partial">부분 성공</option><option value="likely_blocked">막힐 것 같다</option>
            </select>
          </label>
          <label className="grid gap-1">확신
            <select value={confidence} onChange={(event) => setConfidence(event.target.value as typeof confidence)} className="rounded-lg border p-2">
              <option value="low">낮음</option><option value="medium">보통</option><option value="high">높음</option>
            </select>
          </label>
          <textarea value={attemptBody} onChange={(event) => setAttemptBody(event.target.value)} placeholder="먼저 자신의 문장으로 답하세요." className="min-h-32 rounded-lg border p-3" />
          <button disabled={pending || !attemptBody.trim()} onClick={() => void start()} className="rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-50">D0 답안 고정</button>
        </> : <p data-testid="c3r-l-state">상태: <strong>{record.state}</strong> · 버전 {record.record_version}</p>}
      </section>

      {record?.state === "D0_OPEN" ? <section className="grid gap-3 rounded-2xl border p-5">
        <h2 className="font-bold">가장 큰 간극 1개</h2><p>{view.source.gapLabel}</p>
        <textarea value={failureNote} onChange={(event) => setFailureNote(event.target.value)} placeholder="내 실패 메모" className="min-h-24 rounded-lg border p-3" />
        <button disabled={pending || !failureNote.trim()} onClick={() => void commitFeedback()} className="rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-50">간극 고정하고 최소 힌트 보기</button>
      </section> : null}

      {record && !["D0_OPEN", "FEEDBACK_COMMITTED"].includes(record.state) ? null : record?.state === "FEEDBACK_COMMITTED" ? <section className="rounded-2xl border p-5"><p><strong>최소 힌트:</strong> {view.source.scaffold}</p></section> : null}

      {record && ["FEEDBACK_COMMITTED", "REPAIRED", "D1_COMPLETE", "D7_COMPLETE", "CLOSED", "REOPENED"].includes(record.state) ? <section className="grid gap-3 rounded-2xl border p-5" data-testid="c3r-l-structured-claim">
        <h2 className="font-bold">정확 법규적용 결합</h2>
        <p className="text-sm text-slate-700">자유서술이나 상태 라벨은 검증 근거가 아닙니다. 답을 표시하지 않은 빈 필드에서 이번 단계의 출처 결합을 새로 재구성하세요. 단계가 바뀌면 입력은 지워집니다.</p>
        {record.state === "FEEDBACK_COMMITTED" ? <aside className="grid gap-1 rounded-xl bg-slate-50 p-3 text-sm" data-testid="c3r-l-direct-repair-reference">
          <p className="font-semibold">직접 수리용 검증 참조 — 이후 독립 복습에서는 숨겨집니다.</p>
          <p>{C3R_L_ANCHOR_ID} · {C3R_L_ANCHOR_VERSION_ID}</p>
          <p>{C3R_L_SOURCE_BINDING_ID} · {C3R_L_SOURCE_ID} · {C3R_L_SOURCE_VERSION_ID}</p>
          <p>{C3R_L_LAW_ANCHOR_ID} · {C3R_L_LAW_ANCHOR_VERSION_ID}</p>
          <p>Article 10 · 2026-01-01부터 종료일 없음 · 2026-08-15 기준 · APPLICABLE_CURRENT · 열린 차단 근거 0개</p>
        </aside> : null}
        <div className="grid gap-3 sm:grid-cols-2" data-testid="c3r-l-reconstruction-fields">
          {lawClaimTextFields.map((field) => <label key={field.key} className="grid gap-1 text-sm">
            {field.label}
            <input
              data-testid={`c3r-l-claim-${field.key}`}
              value={lawClaimDraft[field.key]}
              onChange={(event) => updateClaimDraft(field.key, event.target.value)}
              required={!field.optional}
              inputMode={field.key === "blockerCount" ? "numeric" : undefined}
              className="rounded-lg border p-2"
            />
          </label>)}
          <label className="grid gap-1 text-sm">현재 법규 적용 상태
            <select
              data-testid="c3r-l-claim-currentLawApplicability"
              value={lawClaimDraft.currentLawApplicability}
              onChange={(event) => updateClaimDraft("currentLawApplicability",
                event.target.value as LawClaimDraft["currentLawApplicability"])}
              className="rounded-lg border p-2"
            >
              <option value="">직접 선택</option>
              <option value="APPLICABLE_CURRENT">현재 적용</option>
              <option value="NOT_CURRENT">현재 미적용</option>
              <option value="UNRESOLVED">미해결</option>
            </select>
          </label>
        </div>
        <label className="flex items-start gap-2"><input type="checkbox" checked={lawBindingConfirmed} onChange={(event) => setLawBindingConfirmed(event.target.checked)} /><span>이번 단계에서 출처·버전·위치·효력기간·적용일·현재성과 차단 근거를 직접 재구성했습니다.</span></label>
        {record.state === "FEEDBACK_COMMITTED" ? <button disabled={pending || !reconstructionReady} onClick={() => void submitRepair()} className="rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-50">구조화 재작성 제출</button> : null}
        {record.state === "REPAIRED" ? <div className="grid gap-2">{!d1Eligible ? <p id="c3r-l-d1-eligibility" role="status" data-testid="c3r-l-d1-eligibility" className="rounded-xl bg-slate-50 p-3 text-sm">D+1 복습은 서버 Review Queue 예정 시각{d1QueueItem?.dueAt ? ` ${d1QueueItem.dueAt}` : ""} 이후에 열립니다.</p> : null}<div className="grid grid-cols-2 gap-2"><button disabled={pending || !d1Eligible || !reconstructionReady} aria-describedby={!d1Eligible ? "c3r-l-d1-eligibility" : undefined} onClick={() => void review("record_assisted_review")} className="rounded-xl border px-4 py-3 disabled:opacity-50">도움받아 복습</button><button disabled={pending || !d1Eligible || !reconstructionReady} aria-describedby={!d1Eligible ? "c3r-l-d1-eligibility" : undefined} onClick={() => void review("complete_d1")} className="rounded-xl bg-slate-900 px-4 py-3 text-white disabled:opacity-50">D+1 독립 재구성</button></div></div> : null}
        {record.state === "D1_COMPLETE" ? <div className="grid gap-2">{!d7Eligible ? <p id="c3r-l-d7-eligibility" role="status" data-testid="c3r-l-d7-eligibility" className="rounded-xl bg-slate-50 p-3 text-sm">D+7 전이 과업은 서버 Review Queue 예정 시각{d7QueueItem?.dueAt ? ` ${d7QueueItem.dueAt}` : ""} 이후에 열립니다.</p> : null}{transferTask?.state === "SEALED" ? <button disabled={pending || !d7Eligible} aria-describedby={!d7Eligible ? "c3r-l-d7-eligibility" : undefined} onClick={() => void presentTransfer()} className="rounded-xl bg-slate-900 px-4 py-3 text-white disabled:opacity-50">D+7 전이 과업 열기</button> : null}{transferTask?.prompt ? <p data-testid="c3r-l-transfer-prompt">{transferTask.prompt}</p> : <p data-testid="c3r-l-transfer-sealed">전이 과업은 아직 봉인되어 있습니다.</p>}{transferTask?.state === "PRESENTED" ? <button disabled={pending || !d7Eligible || !reconstructionReady} aria-describedby={!d7Eligible ? "c3r-l-d7-eligibility" : undefined} onClick={() => void review("complete_d7_transfer")} className="rounded-xl bg-slate-900 px-4 py-3 text-white disabled:opacity-50">D+7 전이 제출</button> : null}</div> : null}
        {record.state === "D7_COMPLETE" ? <div className="grid gap-2">{!recurrenceEligible ? <p id="c3r-l-recurrence-eligibility" role="status" data-testid="c3r-l-recurrence-eligibility" className="rounded-xl bg-slate-50 p-3 text-sm">시간 제한 재현은 서버 Review Queue 예정 시각{recurrenceQueueItem?.dueAt ? ` ${recurrenceQueueItem.dueAt}` : ""} 이후에 열립니다.</p> : null}<button disabled={pending || !recurrenceEligible || !reconstructionReady} aria-describedby={!recurrenceEligible ? "c3r-l-recurrence-eligibility" : undefined} onClick={() => void review("complete_recurrence")} className="rounded-xl bg-slate-900 px-4 py-3 text-white disabled:opacity-50">시간 제한 재현 완료</button></div> : null}
        {record.state === "CLOSED" ? <button disabled={pending || !reconstructionReady} onClick={() => void review("record_later_failure")} className="rounded-xl border border-amber-500 px-4 py-3 text-amber-800 disabled:opacity-50">후속 실패로 다시 열기</button> : null}
        {record.state === "REOPENED" ? <div className="grid gap-2">{!reopenedEligible ? <p id="c3r-l-reopened-eligibility" role="status" data-testid="c3r-l-reopened-eligibility" className="rounded-xl bg-slate-50 p-3 text-sm">재개 복습은 서버 Review Queue 예정 시각{reopenedQueueItem?.dueAt ? ` ${reopenedQueueItem.dueAt}` : ""} 이후에 열립니다.</p> : null}<button disabled={pending || !reopenedEligible || !reconstructionReady} aria-describedby={!reopenedEligible ? "c3r-l-reopened-eligibility" : undefined} onClick={() => void review("complete_reopened_review")} className="rounded-xl bg-slate-900 px-4 py-3 text-white disabled:opacity-50">재개 복습 독립 완료</button></div> : null}
      </section> : null}

      {record ? <section className="grid gap-3 rounded-2xl border p-5">
        <h2 className="font-bold">Review Queue · Today / Full-Day</h2>
        <p>대기 {view.dashboard.queue.length}개 · CoreOutcome 최대 3개</p>
        <label>가용 시간 <input type="number" min={30} max={720} value={availableMinutes} onChange={(e) => setAvailableMinutes(Number(e.target.value))} className="ml-2 w-24 rounded border p-2" />분</label>
        {!view.currentPlan ? <div className="grid gap-2">{!hasEligibleQueueItem ? <p id="c3r-l-plan-eligibility" role="status" data-testid="c3r-l-plan-eligibility" className="rounded-xl bg-slate-50 p-3 text-sm">예정 시각이 된 법규 Review Queue 항목이 있을 때 계획을 만들 수 있습니다.</p> : null}<div className="grid grid-cols-2 gap-2"><button disabled={pending || !hasEligibleQueueItem} aria-describedby={!hasEligibleQueueItem ? "c3r-l-plan-eligibility" : undefined} onClick={() => void createPlan("TODAY")} className="rounded-xl border px-4 py-3 disabled:opacity-50">Today 계획</button><button disabled={pending || !hasEligibleQueueItem} aria-describedby={!hasEligibleQueueItem ? "c3r-l-plan-eligibility" : undefined} onClick={() => void createPlan("FULL_DAY")} className="rounded-xl border px-4 py-3 disabled:opacity-50">Full-Day 계획</button></div></div> : <div className="grid gap-2" data-testid="c3r-l-current-plan"><p>{view.currentPlan.planKind} · {view.currentPlan.state}</p><div className="grid grid-cols-3 gap-2"><button onClick={() => void decidePlan("ACCEPT")} className="rounded border p-2">수락</button><button onClick={() => void decidePlan("EDIT")} className="rounded border p-2">편집</button><button onClick={() => void decidePlan("REJECT")} className="rounded border p-2">거절</button></div></div>}
      </section> : null}

      {restored ? <section className="grid gap-3 rounded-2xl border p-5"><h2 className="font-bold">개인 학습원장</h2>{restored.ledger.map((entry) => <p key={entry.id} className="text-sm">{entry.entry_kind} · {entry.occurred_at}</p>)}{restored.failureNotes[0] ? <p className="rounded border p-3">내 실패 메모: {restored.failureNotes[0].body}</p> : null}</section> : null}
      <section className="grid grid-cols-2 gap-2"><button disabled={pending} onClick={() => void exportData()} className="rounded-xl border px-4 py-3">내 법규 데이터 내보내기</button><button disabled={pending} onClick={() => void deleteData()} className="rounded-xl border border-red-300 px-4 py-3 text-red-700">내 C3R-L 법규 데이터 삭제</button></section>
    </main>
  );
}
