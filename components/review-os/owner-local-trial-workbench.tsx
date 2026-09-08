"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { FirstStagePrivatePractice } from "./first-stage-private-practice";
import { OWNER_LOCAL_R3_TRIAL_NOTICE } from "@/lib/review-os/first-stage/runtime/owner-local-trial-boundary";
import type { createOwnerLocalTodayService, TrialPlanningPreferences } from "@/lib/review-os/first-stage/runtime/owner-local-today";

type Today = Awaited<ReturnType<ReturnType<typeof createOwnerLocalTodayService>["view"]>>;
type Payload = { ok: boolean; today?: Today; started?: { href: string }; error?: string };
const ROOT = "/app/first-stage/economics-trial";
const API = "/api/review-os/first-stage/economics-trial/sessions?view=today";
const PRIMARY = "min-h-11 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50";
const SECONDARY = "min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm disabled:opacity-50";
const clock = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2,"0")}:${String(minute % 60).padStart(2,"0")}`;
const minute = (time: string) => Number(time.slice(0,2))*60+Number(time.slice(3));
const subscribeLocation=(changed:()=>void)=>{window.addEventListener("popstate",changed);return ()=>window.removeEventListener("popstate",changed);};
const locationSearch=()=>window.location.search;
const serverSearch=()=>null;

/** The server page supplies no private content; selection happens after hydration. */
export function OwnerLocalTrialWorkbench() {
  const search=useSyncExternalStore(subscribeLocation,locationSearch,serverSearch);
  if (search === null) return <p className="p-8" role="status">로컬 학습 경로를 확인합니다.</p>;
  const params=new URLSearchParams(search),practice=["sessionId","createId","questionId","choose"].some(key=>params.has(key));
  return practice ? <><nav className="mx-auto max-w-2xl px-5 pt-6"><a href={ROOT} className="text-sm underline">Today로 돌아가 저장 결과·계획 확인</a></nav><FirstStagePrivatePractice ownerLocalTrial /></> : <OwnerLocalToday initialSearch={search} />;
}

function OwnerLocalToday({initialSearch}:{initialSearch:string}) {
  const params=new URLSearchParams(initialSearch);
  const priorStart=params.has("planId")&&params.has("actionId") ? {action:"start_planned",input:{planId:params.get("planId"),actionId:params.get("actionId")}}:null;
  const [today, setToday] = useState<Today | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loginRequired, setLoginRequired] = useState(false);
  const [retryable, setRetryable] = useState(Boolean(priorStart));
  const [preferences, setPreferences] = useState<TrialPlanningPreferences>({remainingMinutes:150,lifeMode:"custom",phase:"coverage",windows:[]});
  const [loginHref, setLoginHref] = useState(`/login?returnTo=${encodeURIComponent(ROOT+initialSearch)}`);
  const pending = useRef<unknown>(priorStart), inFlight = useRef(false), mounted = useRef(false);

  function accept(value: Today) {
    setToday(value);
    if (value.preferences) setPreferences({...value.preferences,
      remainingMinutes:"remainingMinutes" in value && typeof value.remainingMinutes==="number"?value.remainingMinutes:value.preferences.remainingMinutes});
    else {
      const local = new Date(Date.now()+9*3600_000);
      const startMinute = Math.min(1425,Math.ceil((local.getUTCHours()*60+local.getUTCMinutes())/15)*15);
      setPreferences({remainingMinutes:150,lifeMode:"custom",phase:"coverage",windows:[{id:"window-1",startMinute,endMinute:1439,environment:"desk",interruptibility:"low"}]});
    }
  }
  useEffect(() => {
    let active = true; mounted.current = true;
    fetch(API,{cache:"no-store",credentials:"same-origin"}).then(async response => {
      if ([401,403,404].includes(response.status)) { if(active)setLoginRequired(true); throw new Error("access"); }
      const payload = await response.json() as Payload;
      if (!response.ok || !payload.ok || !payload.today) throw new Error("unavailable");
      if (active) accept(payload.today);
    }).catch(() => { if(active)setError("현재 계획을 확인하지 못했습니다. 기록은 변경하지 않았습니다."); })
      .finally(() => {if(active)setBusy(false);});
    return () => {active=false; mounted.current=false;};
  }, []);

  async function send(command: unknown) {
    if (busy || inFlight.current) return;
    inFlight.current=true; pending.current=command; setBusy(true); setError(null); setRetryable(false);
    try {
      const response=await fetch(API,{method:"POST",cache:"no-store",credentials:"same-origin",
        headers:{"Content-Type":"application/json"},body:JSON.stringify(command)});
      const payload=await response.json() as Payload;
      if(!mounted.current)return;
      if([401,403,404].includes(response.status)) {setLoginRequired(true);throw new Error("access");}
      if(response.status===409 || response.status===400) {
        pending.current=null; window.history.replaceState(null,"",ROOT);
        setError("시간이나 학습 상태가 바뀌었습니다. 서버 기록을 새로 불러와 계획을 다시 확인하세요.");
        setToday(null);return;
      }
      if(!response.ok || !payload.ok)throw new Error("unavailable");
      if(payload.started) {window.location.assign(payload.started.href);return;}
      if(!payload.today)throw new Error("unavailable");
      accept(payload.today);pending.current=null;
    } catch {
      if(mounted.current) {setError("처리 결과를 확인하지 못했습니다. 같은 요청으로 다시 확인하면 중복 저장을 방지합니다.");setRetryable(true);}
    } finally {inFlight.current=false;if(mounted.current)setBusy(false);}
  }
  function start(actionId:string) {
    if(today?.state!=="planned" || !today.executableNowActionIds.includes(actionId) || busy || inFlight.current)return;
    const input={planId:today.planId,actionId};
    const href=`${ROOT}?${new URLSearchParams(input)}`;
    window.history.replaceState(null,"",href);setLoginHref(`/login?returnTo=${encodeURIComponent(href)}`);
    void send({action:"start_planned",input});
  }
  function editWindow(index:number,change:Partial<TrialPlanningPreferences["windows"][number]>) {
    setPreferences(previous=>({...previous,windows:previous.windows.map((value,i)=>i===index?{...value,...change}:value)}));
  }
  const planned=today?.state==="planned"?today:null;
  const next=planned?.actions.find(action=>action.id===planned.nextActionId);
  const executableNowActionIds=planned?.executableNowActionIds??[];
  return <main className="mx-auto max-w-3xl space-y-6 px-5 py-10">
    <header><p className="text-xs text-slate-500">Owner PC · 사람 미검토 · 경제학 r3</p><h1 className="mt-2 text-2xl font-bold">Today · 오늘 남은 학습</h1>
      <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">{OWNER_LOCAL_R3_TRIAL_NOTICE}</p></header>
    <section aria-live="polite" aria-busy={busy} className="space-y-4 rounded-2xl border bg-white p-6">
      {busy && <p role="status">서버의 시간·학습 기록을 확인합니다.</p>}
      {error && <p role="alert">{error}</p>}
      {loginRequired && <a className="underline" href={loginHref}>기존 로컬 계정으로 다시 로그인</a>}
      {retryable && !loginRequired && <button className={PRIMARY} disabled={busy} onClick={()=>void send(pending.current)}>같은 계획 요청 다시 확인</button>}
      {!busy && (error || today?.state==="history_incomplete") && <a href={ROOT} className="underline">현재 서버 기록 새로 불러오기</a>}
      {today?.state==="history_incomplete" && <p>조회 한도를 넘어 기록 전체를 확인할 수 없습니다. 누락된 기록을 새 재고로 간주하거나 계획을 실행하지 않습니다.</p>}
      {today && today.unavailableSessionCount>0 && <p>버전·근거를 확인할 수 없는 기록 {today.unavailableSessionCount}건은 제외했습니다. 기존 기록은 보존하며 새 문항의 미학습 여부를 단정하지 않습니다.</p>}
      {planned && !retryable && !loginRequired && <>
        <p>오늘 남은 {planned.remainingMinutes}분 · 계획 {planned.plan.plannedActiveMinutes}분 · 미배정 {planned.unallocatedMinutes}분</p>
        <p className="text-sm text-slate-600">설정 이후 완료 {planned.completedSinceDeclaration}회 × 예상 15분 차감. 실제 공부시간 측정값이 아닙니다. 진행 중 예약 {planned.inProgressReservedMinutes}분은 남은 시간 안에 포함합니다.</p>
        {next ? <button className={PRIMARY} disabled={busy || !executableNowActionIds.includes(next.id)} onClick={()=>start(next.id)}>{next.kind==="new"?"새 문제":next.kind==="retry"?"기한 복습":"이어하기"} · 경제학 {next.questionNumber}번</button> : <p>{planned.stockExhausted?"현재 시작 가능한 재고가 없습니다. 다음 복습 시각을 확인하세요.":"현재 시간·환경·회복 조건에 맞는 실행 블록이 없습니다."}</p>}
        {next && !executableNowActionIds.includes(next.id) && <p role="status">아직 이 블록의 시작 시간이 아닙니다. Full-Day 시간표를 확인하고 해당 시간이 되면 <a className="underline" href={ROOT}>현재 서버 계획 새로 확인</a>을 눌러 주세요.</p>}
        {planned.expiredBlockCount>0 && <p>지난 미실행 블록 {planned.expiredBlockCount}개는 완료로 처리하지 않습니다. 계속 공부하려면 아래 남은 시간·생활 조건을 저장해 다시 계획하세요.</p>}
        {planned.newStudyOpportunity && !planned.newStudyOpportunity.selected && <p className="text-sm">새 학습 보류: {planned.newStudyOpportunity.exception}</p>}
        {planned.overflowCount>0 && <p>계획 후보 한도 밖 {planned.overflowCount}건은 미완료로 남겨 두었습니다.</p>}
        <h2 className="font-semibold">오늘의 핵심 결과 · 최대 3개</h2>
        <ul className="space-y-2">{planned.plan.coreOutcomes.map(outcome=><li key={outcome.outcomeId}>{outcome.title} · {outcome.estimatedMinutes}분</li>)}</ul>
        <details><summary className="cursor-pointer py-3">Full-Day 시간표와 보류 항목</summary>
          <ol className="space-y-3">{planned.plan.executionBlocks.map(block=><li key={block.blockId} className="rounded-xl border p-3">{clock(block.startMinute)}–{clock(block.endMinute)} · {block.title}
            {block.candidateId && planned.actions.some(action=>action.id===block.candidateId) && block.candidateId!==next?.id && <button disabled={busy || !executableNowActionIds.includes(block.candidateId)} className={`${SECONDARY} ml-3`} onClick={()=>start(block.candidateId!)}>이 블록 시작</button>}</li>)}</ol>
          <ul>{planned.plan.deferredTasks.map(task=><li key={task.candidateId} className="mt-2 text-sm">{task.title}: {task.reason}</li>)}</ul>
        </details>
      </>}
    </section>
    {today && today.state!=="history_incomplete" && <details open={today.state==="availability_required"} className="rounded-2xl border bg-white p-6"><summary className="cursor-pointer font-semibold">남은 시간·생활 조건 설정</summary>
      <form className="mt-4 space-y-4" onSubmit={event=>{event.preventDefault();void send({action:"save_availability",input:{requestId:`availability-${crypto.randomUUID()}`,expectedRevision:today.preferencesRevision,preferences}});}}>
        <fieldset disabled={busy || retryable || loginRequired} className="space-y-4">
          <label className="block">지금부터 남은 공부시간(분)<input aria-label="남은 공부시간" type="number" min="0" max="720" required className="ml-3 rounded border p-2" value={preferences.remainingMinutes} onChange={event=>setPreferences({...preferences,remainingMinutes:Number(event.target.value)})}/></label>
          <label className="block">생활 조건<select aria-label="생활 조건" className="ml-3 rounded border p-2" value={preferences.lifeMode} onChange={event=>setPreferences({...preferences,lifeMode:event.target.value as TrialPlanningPreferences["lifeMode"]})}>
            {Object.entries({custom:"직접 설정",full_time_study:"전업 수험",full_time_employed:"직장 병행",part_time_employed:"시간제 근무",shift_or_irregular_work:"불규칙 근무",leave_or_transition:"휴직·전환",caregiving_constrained:"돌봄 병행",health_constrained:"건강 제약"}).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
          <label className="flex gap-2"><input type="checkbox" checked={preferences.phase==="recovery"} onChange={event=>setPreferences({...preferences,phase:event.target.checked?"recovery":"coverage"})}/>회복 모드 · 새 공부는 보류하고 기존 이어하기·복습을 제한된 용량으로 계획</label>
          <p className="text-sm">오늘 한국시간(KST) 기준 구간입니다. 이미 지난 시간은 서버가 제외합니다. 전체 일일 목표가 아니라 지금부터의 남은 시간을 입력하세요.</p>
          {preferences.windows.map((window,index)=><fieldset key={window.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3"><legend>시간 구간 {index+1}</legend>
            <label>시작<input aria-label={`구간 ${index+1} 시작`} type="time" required value={clock(window.startMinute)} onChange={event=>editWindow(index,{startMinute:minute(event.target.value)})}/></label>
            <label>종료<input aria-label={`구간 ${index+1} 종료`} type="time" required disabled={window.endMinute===1440} value={clock(window.endMinute===1440?0:window.endMinute)} onChange={event=>editWindow(index,{endMinute:minute(event.target.value)})}/></label>
            <label><input type="checkbox" checked={window.endMinute===1440} onChange={event=>editWindow(index,{endMinute:event.target.checked?1440:1439})}/>자정(24:00)에 종료</label>
            <label>환경<select value={window.environment} onChange={event=>editWindow(index,{environment:event.target.value as typeof window.environment})}>{Object.entries({desk:"책상",library:"도서관",office_break:"회사 휴식",commute_public_transit:"대중교통",walking:"이동",custom:"기타"}).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
            <label><input type="checkbox" checked={window.protected??false} onChange={event=>editWindow(index,{protected:event.target.checked})}/>다른 일정으로 사용 불가</label>
            <button type="button" className={SECONDARY} onClick={()=>setPreferences({...preferences,windows:preferences.windows.filter((_,i)=>i!==index)})}>구간 삭제</button>
          </fieldset>)}
          <button type="button" className={SECONDARY} disabled={preferences.windows.length>=8} onClick={()=>setPreferences({...preferences,windows:[...preferences.windows,{id:`window-${crypto.randomUUID()}`,startMinute:1080,endMinute:1200,environment:"desk",interruptibility:"low"}]})}>시간 구간 추가</button>
          <button type="submit" className={today.state==="availability_required"?PRIMARY:SECONDARY}>남은 시간 저장·재계획</button>
        </fieldset>
      </form>
    </details>}
    {today && <section className="rounded-2xl border bg-white p-6"><h2 className="font-semibold">저장된 미검토 시험 기록·다음 복습</h2>
      <p className="my-3 text-sm">사람 승인 0문항. 허용 원문 {today.inventory.originalCount}개와 각 변형 1개뿐이며, 긴 공부시간을 모두 채울 재고는 아닙니다. 문항 처리 완료는 숙달이나 전이 성공이 아닙니다.</p>
      <ul className="space-y-4">{today.history.map(row=><li key={row.sessionId}><a className="underline" href={`${ROOT}?${new URLSearchParams({sessionId:row.sessionId})}`}>경제학 {row.questionNumber}번 · {row.active?"진행 중":row.ready?"시작 대기":`응답 저장 ${row.committedAttempts.length}회`}</a>
        <ul className="text-sm text-slate-600">{row.reviews.map(review=><li key={review.reviewTaskId}>복습 {review.status==="completed"?"처리 완료":"대기"} · {new Date(review.dueAt).toLocaleString("ko-KR",{timeZone:"Asia/Seoul"})} KST · {review.stock==="available"?"변형 재고 있음":"새 변형 재고 없음"}</li>)}</ul></li>)}</ul>
    </section>}
    <a className="text-sm underline" href={`${ROOT}?choose=1`}>문항 직접 선택 · 기존 연습 화면</a>
  </main>;
}
