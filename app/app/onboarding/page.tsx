import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildBeginnerFirstPlan,
  normalizeWeakSubjectName,
  type BeginnerCurrentLevel,
  type BeginnerDailyAvailableMinutes,
  type BeginnerPreferredStart,
} from "@/lib/review-os/beginner-first-plan";
import { type AppraiserExamMode } from "@/lib/review-os/curriculum-reference";
import { buildExecutionBridge } from "@/lib/review-os/first-plan-execution-bridge";

const EXAM_MODE_OPTIONS: Array<{ value: AppraiserExamMode; label: string }> = [
  { value: "first", label: "감정평가사 1차" },
  { value: "second", label: "감정평가사 2차" },
];
const DAILY_MINUTE_OPTIONS: BeginnerDailyAvailableMinutes[] = [30, 60, 90, 180];
const CURRENT_LEVEL_OPTIONS: BeginnerCurrentLevel[] = ["처음 시작", "조금 공부함", "기출/답안 경험 있음", "막판 정리"];
const PREFERRED_START_OPTIONS: BeginnerPreferredStart[] = ["O/X", "개념 회상", "회계 계산틀", "2차 다시쓰기", "CASIO", "쟁점 찾기"];
const FIRST_WEAK_SUBJECTS = ["", "민법", "경제학원론", "부동산학원론", "감정평가관계법규", "회계학"];
const SECOND_WEAK_SUBJECTS = ["", "감정평가실무", "감정평가이론", "감정평가 및 보상법규"];

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseExamMode(value: string | undefined): AppraiserExamMode {
  return value === "second" ? "second" : "first";
}

function parseDailyMinutes(value: string | undefined): BeginnerDailyAvailableMinutes {
  const parsed = Number(value);
  if (parsed === 60 || parsed === 90 || parsed === 180) return parsed;
  return 30;
}

function parseCurrentLevel(value: string | undefined): BeginnerCurrentLevel {
  return CURRENT_LEVEL_OPTIONS.includes(value as BeginnerCurrentLevel) ? value as BeginnerCurrentLevel : "처음 시작";
}

function parsePreferredStart(value: string | undefined): BeginnerPreferredStart | undefined {
  return PREFERRED_START_OPTIONS.includes(value as BeginnerPreferredStart) ? value as BeginnerPreferredStart : undefined;
}

function parseDaysUntilExam(value: string | undefined) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 90;
  return Math.max(0, Math.round(parsed));
}

function optionClasses(active: boolean) {
  return `rounded-2xl border px-4 py-3 text-left text-sm transition ${
    active
      ? "border-[color:var(--primary)] bg-[color:var(--primary-soft)] text-[color:var(--foreground-strong)]"
      : "border-[var(--border)] bg-[color:var(--surface)] text-[color:var(--muted-strong)]"
  }`;
}

function startHref(examMode: AppraiserExamMode, subjectName: string | null | undefined) {
  if (examMode === "second") return "/app/write?mode=second";
  const subject = subjectName || "민법";
  return `/app/capture?mode=first&subject=${encodeURIComponent(subject)}`;
}

export default async function ReviewOsOnboardingPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const examMode = parseExamMode(firstValue(params.examMode));
  const daysUntilExam = parseDaysUntilExam(firstValue(params.daysUntilExam));
  const dailyAvailableMinutes = parseDailyMinutes(firstValue(params.dailyAvailableMinutes));
  const currentLevel = parseCurrentLevel(firstValue(params.currentLevel));
  const preferredStart = parsePreferredStart(firstValue(params.preferredStart));
  const weakSubjectName = normalizeWeakSubjectName(examMode, firstValue(params.weakSubjectName));
  const generated = firstValue(params.plan) === "1";
  const weakSubjectOptions = examMode === "first" ? FIRST_WEAK_SUBJECTS : SECOND_WEAK_SUBJECTS;
  const plan = generated
    ? buildBeginnerFirstPlan({
        examMode,
        daysUntilExam,
        dailyAvailableMinutes,
        currentLevel,
        weakSubjectName,
        preferredStart,
      })
    : null;
  const executionBridge = plan
    ? buildExecutionBridge(plan.todayPlan, {
        examMode,
        weakSubjectName: plan.onboardingSummary.weakSubjectName,
        source: "onboarding",
      })
    : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card className="border-[var(--border)] bg-[color:var(--surface)] shadow-none">
        <CardHeader>
          <CardTitle>첫 오늘 계획 만들기</CardTitle>
          <CardDescription>
            시험일까지 남은 시간과 현재 상태를 기준으로 오늘 할 일 3개만 정합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-7" method="get">
            <input type="hidden" name="plan" value="1" />

            <section className="space-y-3">
              <p className="text-sm font-medium text-[color:var(--foreground-strong)]">시험 구분</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {EXAM_MODE_OPTIONS.map((option) => (
                  <label key={option.value} className={optionClasses(examMode === option.value)}>
                    <input className="sr-only" type="radio" name="examMode" value={option.value} defaultChecked={examMode === option.value} />
                    {option.label}
                  </label>
                ))}
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-[1fr_1.4fr]">
              <label className="space-y-2">
                <span className="text-sm font-medium text-[color:var(--foreground-strong)]">시험일까지 남은 날</span>
                <input
                  className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[color:var(--surface)] px-4 text-sm outline-none"
                  min="0"
                  name="daysUntilExam"
                  type="number"
                  defaultValue={daysUntilExam}
                />
              </label>
              <section className="space-y-2">
                <p className="text-sm font-medium text-[color:var(--foreground-strong)]">오늘 가능한 시간</p>
                <div className="grid gap-2 sm:grid-cols-4">
                  {DAILY_MINUTE_OPTIONS.map((minutes) => (
                    <label key={minutes} className={optionClasses(dailyAvailableMinutes === minutes)}>
                      <input className="sr-only" type="radio" name="dailyAvailableMinutes" value={minutes} defaultChecked={dailyAvailableMinutes === minutes} />
                      {minutes}분
                    </label>
                  ))}
                </div>
              </section>
            </section>

            <section className="space-y-3">
              <p className="text-sm font-medium text-[color:var(--foreground-strong)]">현재 상태</p>
              <div className="grid gap-2 sm:grid-cols-4">
                {CURRENT_LEVEL_OPTIONS.map((level) => (
                  <label key={level} className={optionClasses(currentLevel === level)}>
                    <input className="sr-only" type="radio" name="currentLevel" value={level} defaultChecked={currentLevel === level} />
                    {level}
                  </label>
                ))}
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-[color:var(--foreground-strong)]">약한 과목</span>
                <select
                  className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[color:var(--surface)] px-4 text-sm outline-none"
                  name="weakSubjectName"
                  defaultValue={weakSubjectName ?? ""}
                >
                  {weakSubjectOptions.map((subject) => (
                    <option key={subject || "none"} value={subject}>{subject || "선택하지 않음"}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-[color:var(--foreground-strong)]">먼저 시작하고 싶은 방식</span>
                <select
                  className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[color:var(--surface)] px-4 text-sm outline-none"
                  name="preferredStart"
                  defaultValue={preferredStart ?? ""}
                >
                  <option value="">추천에 맡기기</option>
                  {PREFERRED_START_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
            </section>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button type="submit" size="lg">오늘 계획 만들기</Button>
              <p className="text-sm leading-6 text-[color:var(--muted)]">큰 커리큘럼을 고르지 않고, 오늘 실행할 작은 순서만 미리 봅니다.</p>
            </div>
          </form>
        </CardContent>
      </Card>

      {plan ? (
        <Card className="border-[var(--border)] bg-[color:var(--surface)] shadow-none">
          <CardHeader>
            <CardTitle>오늘 할 일 {plan.todayPlan.length}개</CardTitle>
            <CardDescription>{plan.onboardingSummary.biggestFocus}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <ol className="grid gap-3">
              {executionBridge?.tasks.map(({ task, href }, index) => (
                <li key={task.id} className="rounded-2xl border border-[var(--border)] bg-[color:var(--surface-soft)] p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-[color:var(--muted)]">{index + 1}. {task.taskType} · {task.estimatedMinutes}분</p>
                      <p className="text-base font-semibold text-[color:var(--foreground-strong)]">{task.title}</p>
                      <p className="text-sm leading-7 text-[color:var(--muted-strong)]">{task.nextStep}</p>
                      <Link href={href} className="inline-flex text-sm font-medium text-[color:var(--foreground-strong)] underline underline-offset-2">이 과제 시작</Link>
                    </div>
                  </div>
                </li>
              ))}
            </ol>

            <div className="rounded-2xl border border-[var(--border)] bg-[color:var(--surface)] p-4 text-sm leading-7 text-[color:var(--muted-strong)]">
              <p><span className="font-medium text-[color:var(--foreground-strong)]">가장 큰 초점:</span> {plan.onboardingSummary.biggestFocus}</p>
              <p>{plan.onboardingSummary.recoveryLine}</p>
            </div>

            {plan.planWarnings.length > 0 ? (
              <details className="rounded-2xl border border-[var(--border)] bg-[color:var(--surface)] p-4 text-sm text-[color:var(--muted)]">
                <summary className="cursor-pointer text-[color:var(--foreground-strong)]">커리큘럼 기준 메모</summary>
                <ul className="mt-3 list-disc space-y-2 pl-5 leading-7">
                  {plan.planWarnings.map((warning) => <li key={warning}>{warning}</li>)}
                </ul>
              </details>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Link className={buttonVariants({ className: "w-full sm:w-auto", size: "lg" })} href={executionBridge?.primaryHref ?? startHref(examMode, plan.onboardingSummary.weakSubjectName)}>오늘 계획으로 시작</Link>
              <Link className={buttonVariants({ className: "w-full sm:w-auto", variant: "outline" })} href={startHref(examMode, plan.onboardingSummary.weakSubjectName)}>오늘 한 것 올리기</Link>
              <Link className={buttonVariants({ className: "w-full sm:w-auto", variant: "ghost" })} href="/app">나중에 조정</Link>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
