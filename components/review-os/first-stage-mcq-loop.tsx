"use client";

import { useEffect, useState } from "react";

type KernelView = Readonly<{
  schemaVersion: "first_stage.kernel_availability.v1";
  kernelSchemaVersion: string;
  subjectAdapterSchemaVersion: string;
  subjectAdapterInterfaceDigest: string;
  registeredSubjects: readonly string[];
  adapterState: "frozen_no_subject_adapters_installed";
  queueAvailability: Readonly<{
    schemaVersion: "first_stage.today_queue_availability.v1";
    state: "blocked";
    itemCount: 0;
    blocker: "subject_adapter_required";
    oneScreenOnePrimaryTask: true;
  }>;
  ownerOnly: true;
  defaultOff: true;
  productionAllowed: false;
  learningEfficacyClaim: false;
}>;

type ApiResult = Readonly<{
  ok: boolean;
  error?: string;
  view?: KernelView;
}>;

const API_PATH = "/api/review-os/first-stage/kernel";

export function FirstStageMcqLoop() {
  const [view, setView] = useState<KernelView | null>(null);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(method: "GET" | "POST") {
    setPending(true);
    setError(null);
    try {
      const result = await fetch(API_PATH, {
        method,
        cache: "no-store",
        credentials: "same-origin",
        headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
        body: method === "POST" ? JSON.stringify({ action: "today_queue" }) : undefined,
      });
      const payload = await result.json() as ApiResult;
      if (!result.ok || !payload.ok || !payload.view) throw new Error(payload.error ?? "load_failed");
      setView(payload.view);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "load_failed");
    } finally {
      setPending(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetch(API_PATH, {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
    }).then(async (result) => {
      const payload = await result.json() as ApiResult;
      if (!result.ok || !payload.ok || !payload.view) {
        throw new Error(payload.error ?? "load_failed");
      }
      if (active) setView(payload.view);
    }).catch((requestError: unknown) => {
      if (active) {
        setError(requestError instanceof Error ? requestError.message : "load_failed");
      }
    }).finally(() => {
      if (active) setPending(false);
    });
    return () => { active = false; };
  }, []);

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-2xl items-center px-5 py-10">
      <section className="w-full rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Owner private · default off
        </p>
        <h1 className="mt-3 text-2xl font-bold text-slate-950">1차 공통 MCQ 커널</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          공통 시도·복습·독립 재시도 규칙과 SubjectAdapter 경계가 고정되었습니다.
          아직 과목 어댑터와 실제 문항은 설치되지 않았습니다.
        </p>

        <div className="mt-6 rounded-2xl bg-slate-50 p-5" aria-live="polite">
          {error ? (
            <p className="text-sm font-medium text-rose-700">불러오지 못했습니다: {error}</p>
          ) : !view ? (
            <p className="text-sm text-slate-600">커널 상태를 확인하고 있습니다.</p>
          ) : (
            <div className="space-y-2 text-sm text-slate-700">
              <p><span className="font-semibold">상태:</span> SubjectAdapter 설치 대기</p>
              <p><span className="font-semibold">오늘 큐:</span> {view.queueAvailability.itemCount}개</p>
              <p><span className="font-semibold">등록 과목:</span> {view.registeredSubjects.length}개</p>
              <p className="break-all text-xs text-slate-500">
                Interface {view.subjectAdapterInterfaceDigest}
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          className="mt-6 w-full rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={pending}
          onClick={() => void load("POST")}
        >
          {pending ? "확인 중…" : "오늘 큐 확인"}
        </button>

        <p className="mt-4 text-xs leading-5 text-slate-500">
          학습 효능, 합격 가능성, 문항 보정 또는 공식 결과를 주장하지 않습니다.
        </p>
      </section>
    </main>
  );
}
