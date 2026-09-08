"use client";

import { useEffect, useRef, useState } from "react";
import type { ChoiceId, Confidence, FirstStageSubjectId, WorkTraceStep } from "@/lib/review-os/first-stage/kernel/domain";
import type { PrivateFirstStageSessionView } from "@/lib/review-os/first-stage/runtime/session-service";
import type { PrivateContentBlocker } from "@/lib/review-os/first-stage/runtime/session-application";
import { OWNER_LOCAL_R3_TRIAL_NOTICE } from "@/lib/review-os/first-stage/runtime/owner-local-trial-boundary";

type Availability = { state: "available" | "blocked";
  blocker: PrivateContentBlocker | null;
  questions: { questionId: string; subjectId: string; questionNumber: number }[] };
type Payload = { ok: boolean; error?: string; view?: PrivateFirstStageSessionView;
  availability?: Availability };
const requestId = () => `request-${crypto.randomUUID()}`;
const BUTTON = "rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50";
const BLOCKER_MESSAGES: Record<PrivateContentBlocker, string> = {
  owner_local_trial_content_required: "사용 불가 — PC 전용 r3 시험 문항의 설치·출처·정답·계산 근거가 충족되지 않았습니다. 사람 검토 승인과는 별개입니다.",
  approved_content_required: "사용 불가 — 권리·정답·인적 검토가 승인된 콘텐츠가 아직 없습니다. 개발 후보나 합성 자료는 학습 재고가 아닙니다.",
  subject_applicability_implementation_required: "사용 불가 — 이 과목의 적용시점·과목별 검토 증빙을 확인하는 기능이 미구현입니다. 콘텐츠 승인만으로 사용할 수 없습니다.",
};
function isContentBlocker(value: string | undefined): value is PrivateContentBlocker {
  return value === "approved_content_required" || value === "subject_applicability_implementation_required" || value === "owner_local_trial_content_required";
}
const SUBJECTS = {
  economics_principles: { label: "경제학", api: "/api/review-os/first-stage/sessions" },
  accounting: { label: "회계학", api: "/api/review-os/first-stage/accounting/sessions" },
  civil_law: { label: "민법", api: "/api/review-os/first-stage/civil-law/sessions" },
  real_estate_principles: { label: "부동산학원론", api: "/api/review-os/first-stage/real-estate-principles/sessions" },
  appraiser_related_law: { label: "감정평가관계법규", api: "/api/review-os/first-stage/appraiser-related-law/sessions" },
} as const;

/** No initial question/answer props: all private projections come from the guarded HTTP route. */
export function FirstStagePrivatePractice({ subject = "economics_principles", ownerLocalTrial = false }: {
  subject?: FirstStageSubjectId;
  ownerLocalTrial?: boolean;
} = {}) {
  // Changing subjects must not reuse another subject's pending intent or display.
  return <PrivatePracticeSession key={`${subject}:${ownerLocalTrial}`} subject={subject} ownerLocalTrial={ownerLocalTrial} />;
}

function PrivatePracticeSession({ subject, ownerLocalTrial }: { subject: FirstStageSubjectId; ownerLocalTrial: boolean }) {
  const API = ownerLocalTrial ? "/api/review-os/first-stage/economics-trial/sessions" : SUBJECTS[subject].api;
  const [view, setView] = useState<PrivateFirstStageSessionView | null>(null);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryable, setRetryable] = useState(false);
  const intent = useRef<unknown>(null);
  const inFlight = useRef(false);
  const mounted = useRef(false);
  const [selected, setSelected] = useState<ChoiceId | null>(null);
  const [previous, setPrevious] = useState<ChoiceId | null>(null);
  const [confidence, setConfidence] = useState<Confidence>("medium");
  const trace = useRef<WorkTraceStep[]>([]);
  const renderedAt = useRef(0);
  const shownAttemptId=useRef<string|null>(null);

  function showBlocker(blocker: PrivateContentBlocker) {
    setView(null); intent.current = null; setRetryable(false); setError(null);
    setAvailability({ state: "blocked", blocker, questions: [] });
  }

  function accept(payload: Payload) {
    if (payload.view) {
      setView(payload.view);
      const url = new URL(window.location.href);
      url.search = new URLSearchParams({ sessionId: payload.view.sessionId }).toString();
      window.history.replaceState(null, "", url);
      if(shownAttemptId.current!==payload.view.attempt?.attemptId) {
        setSelected(null); setPrevious(null); setConfidence("medium");
        trace.current = []; renderedAt.current = performance.now();
        shownAttemptId.current=payload.view.attempt?.attemptId??null;
      }
    }
    if (payload.availability) setAvailability(payload.availability);
  }

  useEffect(() => {
    let active = true;
    mounted.current = true;
    const params = new URL(window.location.href).searchParams;
    const id = params.get("sessionId");
    fetch(id ? `${API}?${new URLSearchParams({ sessionId: id })}` : API,
      { cache: "no-store", credentials: "same-origin" }).then(async (response) => {
      const payload = await response.json() as Payload;
      if ((!response.ok || !payload.ok) && isContentBlocker(payload.error)) {
        if (active) showBlocker(payload.error);
        return;
      }
      if (!response.ok || !payload.ok) throw new Error("unavailable");
      if (active) {
        accept(payload);
        if (!id && payload.availability?.state === "available" && params.has("createId") && params.has("questionId")) {
          intent.current = { action: "create", requestId: params.get("createId"), questionId: params.get("questionId") };
          setRetryable(true); setError("이전 시작 요청을 같은 식별자로 다시 확인하세요.");
        }
      }
    }).catch(() => { if (active) setError("기록을 불러올 수 없습니다. 승인 콘텐츠와 접근 권한을 확인하세요."); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; mounted.current = false; };
  }, [API]);

  async function send(command: unknown) {
    if (busy || inFlight.current) return;
    inFlight.current = true;
    intent.current = command;
    setBusy(true); setError(null); setRetryable(false);
    // Hide any prior assistance while the new durable result is unknown.
    setView(null);
    try {
      const response = await fetch(API, { method: "POST", cache: "no-store", credentials: "same-origin",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(command) });
      const payload = await response.json() as Payload;
      // The server may have saved successfully after navigation. Keep that write,
      // but never let an unmounted subject rewrite the next page's URL or UI.
      if (!mounted.current) return;
      if (!response.ok || !payload.ok || !payload.view) {
        if (isContentBlocker(payload.error)) { showBlocker(payload.error); return; }
        if (response.status === 409 || response.status === 400 || response.status === 404) {
          intent.current = null;
          setError("현재 기록을 다시 불러오세요. 승인 콘텐츠가 없으면 학습을 시작할 수 없습니다.");
          return;
        }
        throw new Error("unavailable");
      }
      accept(payload); intent.current = null;
    } catch {
      if (!mounted.current) return;
      setError("저장 결과를 확인하지 못했습니다. 같은 요청을 다시 확인할 수 있습니다.");
      setRetryable(true);
    } finally { inFlight.current = false; if (mounted.current) setBusy(false); }
  }

  function create(questionId: string) {
    if (busy || inFlight.current) return;
    const id = requestId();
    const url = new URL(window.location.href);
    url.search = new URLSearchParams({ createId: id, questionId }).toString();
    window.history.replaceState(null, "", url);
    void send({ action: "create", requestId: id, questionId });
  }

  function choose(choice: ChoiceId, eventAt: number) {
    if (selected === choice) return;
    if (trace.current.length >= 64) {
      setError("선택 변경 기록 한도입니다. 현재 선택을 저장하거나 서버 기록을 다시 불러오세요.");
      return;
    }
    if (selected !== null) setPrevious(selected);
    trace.current.push({ sequence: trace.current.length + 1,
      kind: selected === null ? "select_answer" : "change_answer",
      atElapsedMs: Math.max(0, Math.floor(eventAt - renderedAt.current)), choiceId: choice });
    setSelected(choice);
  }

  function command(action: "begin" | "submit" | "retry" | "help", fields: Record<string, unknown>) {
    if (!view) return;
    void send({ sessionId: view.sessionId, command: { action, requestId: requestId(),
      expectedRevision: view.revision, ...fields } });
  }

  const unavailable = availability?.state === "blocked" && !view;
  const selectedQuestion = availability?.questions.find(item => item.questionId === selectedQuestionId) ?? availability?.questions[0];
  return <main className="mx-auto w-full max-w-2xl px-5 py-10">
    <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
      <p className="text-xs font-semibold text-slate-500">Owner private · default off</p>
      <h1 className="mt-3 text-2xl font-bold text-slate-950">{SUBJECTS[subject].label} {ownerLocalTrial ? "미검토 로컬 시험" : "비공개 연습"}</h1>
      {ownerLocalTrial && <p role="note" className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">{OWNER_LOCAL_R3_TRIAL_NOTICE}</p>}
      <p className="mt-3 text-sm text-slate-600">먼저 응답하고, 저장된 결과의 해설과 다음 복습을 확인합니다.</p>
      <div className="mt-6 space-y-5" aria-live="polite" aria-busy={busy}>
        {busy && <p>서버 기록을 확인하고 있습니다.</p>}
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        {unavailable && <p>{BLOCKER_MESSAGES[availability.blocker ?? "approved_content_required"]}</p>}
        {!busy && !error && !view && availability?.state === "available" &&
          (ownerLocalTrial ? <div className="space-y-4">
            <label className="block text-sm">시험 문항 선택
              <select className="mt-2 block min-h-11 w-full rounded-xl border p-3" value={selectedQuestion?.questionId ?? ""}
                onChange={event => setSelectedQuestionId(event.target.value)}>
                {availability.questions.map(item=><option key={item.questionId} value={item.questionId}>경제학 {item.questionNumber}번 · 사람 미검토</option>)}
              </select>
            </label>
            {selectedQuestion && <button type="button" className={BUTTON} onClick={()=>create(selectedQuestion.questionId)}>
              사람 미검토 시험용 {selectedQuestion.questionNumber}번 시작</button>}
            <p className="text-xs text-slate-500">각 문항의 변형은 저장 후 D+1 복습에서만 열립니다. 목록에 없는 문항은 근거 검토 대기입니다.</p>
          </div> : availability.questions.map((item) => <button key={item.questionId} type="button" className={BUTTON}
            onClick={() => create(item.questionId)}>검토된 {item.questionNumber}번 시작</button>))}
        {!busy && view?.nextQuestionId && <button type="button" className={BUTTON}
          onClick={() => command("begin", { questionId: view.nextQuestionId })}>문제 열고 먼저 풀기</button>}
        {ownerLocalTrial && view?.question && Boolean(view.availableConceptAids?.length) && <details className="rounded-xl border p-4">
          <summary className="cursor-pointer">막혔다면 개념·선행 도움</summary>
          <p className="my-3 text-sm">틀린 답을 제출할 필요는 없습니다. 도움 열람을 먼저 저장하며, 이후 응답은 도움을 받은 연습입니다. 원인 진단·숙달 판정은 하지 않습니다.</p>
          {view.availableConceptAids?.map(kind=><button key={kind} type="button" disabled={busy} className="mr-3 min-h-11 rounded-lg border px-4"
            onClick={()=>command("help",{attemptId:view.attempt!.attemptId,kind})}>{kind==="concept"?"개념 도움 보기":"선행 계산 도움 보기"}</button>)}
        </details>}
        {ownerLocalTrial && view?.conceptAid && <section aria-label="저장 후 공개된 개념 도움" className="rounded-xl bg-slate-50 p-4">
          <h2 className="font-semibold">{view.conceptAid.kind==="concept"?"개념 도움":"선행 계산 도움"} · 사람 미검토</h2>
          <p className="mt-3 whitespace-pre-wrap">{view.conceptAid.text}</p>
        </section>}
        {ownerLocalTrial && view?.assistanceLevel==="hint_or_scaffold" && <p className="text-sm">도움을 받은 연습 · 독립 수행이나 전이·측정 증거가 아닙니다.</p>}
        {view?.question && <form onSubmit={(event) => {
          event.preventDefault();
          if (selected === null || !view.attempt) return;
          command("submit", { attemptId: view.attempt.attemptId, submission: {
            selectedChoice: selected, confidence, answerChanged: previous !== null,
            previousChoice: previous, eliminatedChoiceIds: [],
            workTrace: { schemaVersion: "first_stage.work_trace.v1", steps: trace.current },
          } });
        }} className="space-y-5">
          <p className="whitespace-pre-wrap">{view.question.stem}</p>
          {view.questionAttributions?.map((text, index) => <p key={index} className="whitespace-pre-wrap text-xs" data-content-attribution="question">{text}</p>)}
          <fieldset disabled={busy} className="space-y-3"><legend className="sr-only">답 선택</legend>
            {view.question.choices.map((choice) => <label key={choice.choiceId} className="flex gap-3 rounded-xl border p-3">
              <input type="radio" name="answer" checked={selected === choice.choiceId}
                onChange={(event) => choose(choice.choiceId, event.timeStamp)} />
              <span>{choice.choiceId}. {choice.body}</span>
            </label>)}
          </fieldset>
          <label className="flex items-center gap-3">확신도
            <select value={confidence} onChange={(event) => setConfidence(event.target.value as Confidence)}>
              <option value="low">낮음</option><option value="medium">보통</option><option value="high">높음</option>
            </select>
          </label>
          <p className="text-xs text-slate-500">{view.question.sourceStatusLabel} · {view.question.currentnessStatusLabel}</p>
          <button className={BUTTON} disabled={busy || selected === null} type="submit">응답 저장 후 해설 확인</button>
        </form>}
        {view?.explanation && <section aria-label="저장된 응답 해설" className="space-y-3 rounded-xl bg-slate-50 p-5">
          <h2 className="font-semibold">저장된 응답의 학습 참고 해설</h2>
          <p>{ownerLocalTrial ? (view.attempt?.decision === "correct" ? "제시된 검토 전 답과 일치" : "제시된 검토 전 답과 불일치")
            : view.attempt?.decision === "correct" ? "이번 응답: 정답" : view.attempt?.decision === "incorrect" ? "이번 응답: 오답" : "응답 상태 확인 필요"}</p>
          <p className="whitespace-pre-wrap">{view.explanation.text}</p>
          {view.explanation.attributions?.map((text, index) => <p key={index} className="whitespace-pre-wrap text-xs" data-content-attribution="feedback">{text}</p>)}
          <p className="text-xs">{view.explanation.sourceStatus} · 공식 해설이나 숙달 판정이 아닙니다.</p>
        </section>}
        {view?.reviewTasks.map((task) => <section key={task.reviewTaskId} className="rounded-xl border p-4">
          {task.status === "completed" ? <p>이 복습 처리 완료 — 학습 성공·숙달 판정과는 별개입니다.</p> :
            task.status === "retry_active" ? <p>독립 재시도 진행 중 — 위 문제를 이어서 풀어주세요.</p> : <>
              <p>복습 예정 시각: <time dateTime={task.dueAt}>{task.dueAt}</time></p>
              {task.retryAvailability === "exhausted" ? <p>복습 필요 — {ownerLocalTrial ? "시험용" : "검토된"} 새 재시도 문항이 부족합니다. 현재 기록은 보존됩니다.</p> :
              <button type="button" className={`${BUTTON} mt-3`} disabled={busy || !task.canStartRetry}
                onClick={() => command("retry", { reviewTaskId: task.reviewTaskId })}>예정 시각 이후 새 문제로 복습</button>}
              {task.retryAvailability === "available" && !task.canStartRetry && !view.question &&
                <p className="mt-2 text-xs text-slate-500">아직 복습 시각 전입니다. 예정 시각 이후 서버 기록을 다시 불러오세요.</p>}
            </>}
        </section>)}
        {retryable && <button type="button" className={BUTTON} disabled={busy}
          onClick={() => void send(intent.current)}>같은 요청 다시 확인</button>}
      </div>
      {!busy && <button type="button" className="mt-6 text-sm underline" onClick={() => window.location.reload()}>서버 기록 다시 불러오기</button>}
      {ownerLocalTrial && view && !busy && !retryable && !error && <p className="mt-4 text-sm">
        <a href="/app/first-stage/economics-trial" target="_blank" rel="noopener noreferrer" className="underline">다른 문항 선택 — 현재 기록은 이 창에 보존</a>
      </p>}
      <p className="mt-5 text-xs leading-5 text-slate-500">이 주소를 다시 열면 서버에 저장된 기록을 조회합니다.
        문항·해설은 브라우저 저장소에 저장하지 않습니다. 반복·도움만으로 숙달이나 전이 성공을 주장하지 않습니다.</p>
    </section>
  </main>;
}
