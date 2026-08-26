"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type AvailabilityView = Readonly<{
  state: "capacity_preview_ready";
  queueState: "blocked_subject_adapter_required";
  defaultOff: true;
  persistenceMutation: false;
  learningEfficacyClaim: false;
}>;

type PreviewView = Readonly<{
  planKind: "today" | "full_day";
  queueAvailability: Readonly<{
    state: "blocked";
    itemCount: 0;
    blocker: "subject_adapter_required";
  }>;
  capacity: Readonly<{
    declaredActiveMinutes: number;
    effectiveActiveMinutes: number;
    schedulableActiveMinutes: number;
    capacityBand: string;
    evidenceLevel: string;
    unallocatedBufferMinutes: number;
  }>;
  planning: Readonly<{
    date: string;
    coreOutcomeCount: number;
    executionBlockCount: number;
    plannedActiveMinutes: number;
    completionMeaning: "block_completion_is_not_mastery";
    masteryMutationAllowed: false;
    deterministicPlanDigestAuthority: "replay_hint_only_not_identity_or_authorization";
  }>;
  persistenceMutation: false;
  aiGenerationEntitlementChanged: false;
  capacityHistoryEvidenceUsed: false;
}>;

type ApiResult = Readonly<{
  ok: boolean;
  error?: string;
  view?: AvailabilityView | PreviewView;
}>;

const API_PATH = "/api/review-os/first-stage/study-capacity";

function minuteOfDay(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function FirstStageStudyCapacityPlanner() {
  const [availability, setAvailability] = useState<AvailabilityView | null>(null);
  const [preview, setPreview] = useState<PreviewView | null>(null);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [planKind, setPlanKind] = useState<"today" | "full_day">("today");
  const [lifeMode, setLifeMode] = useState("full_time_study");
  const [phase, setPhase] = useState("timed_integration");
  const [scheduleVolatility, setScheduleVolatility] = useState("low");
  const [dayKind, setDayKind] = useState("weekday");
  const [declaredActiveMinutes, setDeclaredActiveMinutes] = useState(180);
  const [externalCommitmentMinutes, setExternalCommitmentMinutes] = useState(0);
  const [startTime, setStartTime] = useState("09:00");
  const [environment, setEnvironment] = useState("desk");
  const [interruptibility, setInterruptibility] = useState("low");

  useEffect(() => {
    let active = true;
    fetch(API_PATH, { method: "GET", cache: "no-store", credentials: "same-origin" })
      .then(async (result) => {
        const payload = await result.json() as ApiResult;
        if (!result.ok || !payload.ok || !payload.view) {
          throw new Error(payload.error ?? "load_failed");
        }
        if (active) setAvailability(payload.view as AvailabilityView);
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "load_failed");
      })
      .finally(() => { if (active) setPending(false); });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setPreview(null);
    const startMinute = minuteOfDay(startTime);
    const endMinute = startMinute + declaredActiveMinutes;
    if (endMinute > 1_440) {
      setPending(false);
      setError("학습 창이 자정을 넘지 않도록 시작 시각을 조정해 주세요.");
      return;
    }
    try {
      const result = await fetch(API_PATH, {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "capacity_preview",
          planKind,
          lifeMode,
          phase,
          scheduleVolatility,
          dayKind,
          declaredActiveMinutes,
          windows: [{
            id: "owner-declared-window-1",
            startMinute,
            endMinute,
            environment,
            interruptibility,
          }],
          externalCommitmentMinutes,
        }),
      });
      const payload = await result.json() as ApiResult;
      if (!result.ok || !payload.ok || !payload.view) {
        throw new Error(payload.error ?? "preview_failed");
      }
      setPreview(payload.view as PreviewView);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "preview_failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10">
      <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Owner private · default off · not saved
        </p>
        <h1 className="mt-3 text-2xl font-bold text-slate-950">학습 용량 계획 브리지</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          선언한 시간 창으로 Today 또는 Full-Day 용량을 계산합니다. 현재는 과목 어댑터가
          없어 실제 문항을 배치하지 않으며, 결과와 생활 모드는 저장하지 않습니다.
        </p>

        <form className="mt-7 grid gap-5" onSubmit={(event) => void submit(event)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              계획 종류
              <select className="rounded-xl border p-3" value={planKind} onChange={(event) => setPlanKind(event.target.value as "today" | "full_day")}>
                <option value="today">Today</option>
                <option value="full_day">Full-Day</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              생활 모드
              <select className="rounded-xl border p-3" value={lifeMode} onChange={(event) => setLifeMode(event.target.value)}>
                <option value="full_time_study">전업 학습</option>
                <option value="full_time_employed">전일 근무</option>
                <option value="part_time_employed">파트타임 근무</option>
                <option value="shift_or_irregular_work">교대·불규칙 근무</option>
                <option value="leave_or_transition">휴직·전환기</option>
                <option value="caregiving_constrained">돌봄 제약</option>
                <option value="health_constrained">건강 제약</option>
                <option value="custom">사용자 정의 제약</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              학습 단계
              <select className="rounded-xl border p-3" value={phase} onChange={(event) => setPhase(event.target.value)}>
                <option value="foundation">기초</option>
                <option value="coverage">범위 학습</option>
                <option value="consolidation">통합</option>
                <option value="timed_integration">시간 제한 통합</option>
                <option value="final_sprint">마무리</option>
                <option value="recovery">회복</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              일정 변동성
              <select className="rounded-xl border p-3" value={scheduleVolatility} onChange={(event) => setScheduleVolatility(event.target.value)}>
                <option value="low">낮음</option>
                <option value="medium">중간</option>
                <option value="high">높음</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              날짜 유형
              <select className="rounded-xl border p-3" value={dayKind} onChange={(event) => setDayKind(event.target.value)}>
                <option value="weekday">평일</option>
                <option value="weekend">주말</option>
                <option value="holiday">휴일</option>
                <option value="recovery">회복일</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              활성 학습 분 (30–720)
              <input className="rounded-xl border p-3" type="number" min={30} max={720} step={1} value={declaredActiveMinutes} onChange={(event) => setDeclaredActiveMinutes(Number(event.target.value))} />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              시작 시각
              <input className="rounded-xl border p-3" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              외부 일정 분
              <input className="rounded-xl border p-3" type="number" min={0} max={1440} step={1} value={externalCommitmentMinutes} onChange={(event) => setExternalCommitmentMinutes(Number(event.target.value))} />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              환경
              <select className="rounded-xl border p-3" value={environment} onChange={(event) => setEnvironment(event.target.value)}>
                <option value="desk">책상</option>
                <option value="library">도서관</option>
                <option value="office_break">직장 휴식</option>
                <option value="commute_public_transit">대중교통</option>
                <option value="walking">보행</option>
                <option value="custom">사용자 정의</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              방해 가능성
              <select className="rounded-xl border p-3" value={interruptibility} onChange={(event) => setInterruptibility(event.target.value)}>
                <option value="low">낮음</option>
                <option value="medium">중간</option>
                <option value="high">높음</option>
              </select>
            </label>
          </div>

          <button type="submit" className="w-full rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" disabled={pending || !availability}>
            {pending ? "계산 중…" : "용량 계획 미리보기"}
          </button>
        </form>

        <div className="mt-6 rounded-2xl bg-slate-50 p-5" aria-live="polite">
          {error ? (
            <p className="text-sm font-medium text-rose-700">계산하지 못했습니다: {error}</p>
          ) : preview ? (
            <div className="space-y-2 text-sm text-slate-700">
              <p><span className="font-semibold">날짜:</span> {preview.planning.date} (KST)</p>
              <p><span className="font-semibold">유효 용량:</span> {preview.capacity.effectiveActiveMinutes}분</p>
              <p><span className="font-semibold">배치 가능:</span> {preview.capacity.schedulableActiveMinutes}분</p>
              <p><span className="font-semibold">용량 구간:</span> {preview.capacity.capacityBand}</p>
              <p><span className="font-semibold">근거 상태:</span> 선언값만 사용</p>
              <p><span className="font-semibold">실제 문항 블록:</span> {preview.planning.executionBlockCount}개 · SubjectAdapter 설치 대기</p>
            </div>
          ) : (
            <p className="text-sm text-slate-600">선언값을 입력하면 저장 없이 용량을 계산합니다.</p>
          )}
        </div>

        <p className="mt-4 text-xs leading-5 text-slate-500">
          시간·블록 완료는 숙달이나 합격 가능성을 뜻하지 않습니다. AI 생성 한도와도 연결되지 않습니다.
        </p>
        <Link className="mt-5 inline-flex text-sm font-semibold text-slate-700 underline" href="/app/first-stage">
          1차 커널 상태로 돌아가기
        </Link>
      </section>
    </div>
  );
}
