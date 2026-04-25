import Link from "next/link";
import { ArrowRight, Check, Clock, ListChecks } from "lucide-react";

import { EventOnView } from "@/components/inverge/event-on-view";
import { FirstExamShell } from "@/components/inverge/first-exam-shell";
import {
  FocusSurface,
  QuietSection,
  RefinedBadge,
  RefinedShell,
  SectionHeading,
  SnapshotItem,
} from "@/components/inverge/refined-primitives";
import { buttonVariants } from "@/components/ui/button";
import {
  FIRST_EXAM_REVIEW_QUEUE,
  FIRST_EXAM_SET_RECORDS,
  firstExamReviewQueuePath,
  firstExamSetInputPath,
  firstExamSubjectPath,
  getFirstExamSubject,
} from "@/lib/inverge/first-exam-data";
import { cn } from "@/lib/utils";

function AbilityBar({ label, value, description }: { label: string; value: number; description?: string }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-[color:var(--foreground-strong)]">{label}</p>
        <p className="text-caption text-[color:var(--muted)]">{value}/100</p>
      </div>
      <div className="mt-2 h-2 rounded-full bg-[color:var(--surface-muted)]">
        <div
          className="h-full rounded-full bg-[color:var(--primary)] transition-[width] duration-700 ease-out"
          style={{ width: `${value}%` }}
        />
      </div>
      {description ? <p className="mt-2 text-caption text-[color:var(--muted)]">{description}</p> : null}
    </div>
  );
}

export function FirstExamOnboarding() {
  return (
    <FirstExamShell>
      <RefinedShell className="space-y-8">
        <FocusSurface className="p-6 sm:p-10">
          <RefinedBadge>온보딩</RefinedBadge>
          <h1 className="mt-5 max-w-3xl text-[40px] font-medium leading-[1.12] tracking-[-0.05em] text-[color:var(--foreground-strong)] sm:text-[52px]">
            처음이어도 이번 주 계획부터 바로 잡습니다.
          </h1>
          <p className="mt-5 max-w-2xl text-body text-[color:var(--muted)]">
            감정평가사 1차는 사진 채점보다 풀이 세트의 행동 데이터가 중요합니다. 아직 기록이 적어도 과목별
            체감 난도와 최근 풀이 상태로 첫 주 코칭을 시작할 수 있습니다.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {["현재 진도", "불안한 과목", "최근 풀이량"].map((item) => (
              <div key={item} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface-soft)] p-5">
                <p className="text-sm font-medium text-[color:var(--foreground-strong)]">{item}</p>
                <p className="mt-2 text-caption text-[color:var(--muted)]">초기 진단에만 조용히 반영됩니다.</p>
              </div>
            ))}
          </div>
          <Link href="/exams/appraiser-first/first/starter-diagnosis" className={cn(buttonVariants({ size: "lg" }), "mt-8")}>
            첫 진단 시작하기
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </FocusSurface>
      </RefinedShell>
    </FirstExamShell>
  );
}

export function FirstExamStarterDiagnosis() {
  return (
    <FirstExamShell>
      <RefinedShell className="space-y-8">
        <FocusSurface className="p-6 sm:p-10">
          <RefinedBadge>Starter Diagnosis</RefinedBadge>
          <h1 className="mt-5 text-h1 font-medium text-[color:var(--foreground-strong)]">
            첫 주는 법규 회상력과 회계 계산 안정성을 우선 관리합니다.
          </h1>
          <p className="mt-4 max-w-3xl text-body text-[color:var(--muted)]">
            아직 데이터는 충분하지 않지만, 감정평가사 1차의 초기 리스크를 기준으로 첫 주 계획을 구성했습니다.
            이번 주 목표는 예측이 아니라 반복 약점을 찾을 만큼의 세트 기록을 확보하는 것입니다.
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <SnapshotItem label="이번 주 세트 목표" value="6세트" />
            <SnapshotItem label="리뷰 큐 목표" value="30문항" />
            <SnapshotItem label="우선 과목" value="법규 · 회계학" />
          </div>
        </FocusSurface>

        <QuietSection className="p-6 sm:p-8">
          <SectionHeading
            eyebrow="첫 주 코칭 플랜"
            title="많이 푸는 것보다 반복 실수를 남기는 것이 우선입니다"
            description="각 세트는 정답률, 시간, 헷갈림, 실수 유형만 입력합니다. 문제 사진은 필요하지 않습니다."
          />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              "감정평가관계법규 25문항 세트 2회",
              "회계학 계산 20문항 세트 2회",
              "민법 선지 판단 25문항 세트 1회",
              "경제학원론 시간 제한 세트 1회",
            ].map((item) => (
              <div key={item} className="flex gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-4">
                <Check className="mt-0.5 h-4 w-4 text-[color:var(--foreground-strong)]" />
                <p className="text-sm text-[color:var(--muted-strong)]">{item}</p>
              </div>
            ))}
          </div>
          <Link href={firstExamSubjectPath("appraisal-law")} className={cn(buttonVariants({ size: "lg" }), "mt-7")}>
            과목 홈으로 이동
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </QuietSection>
      </RefinedShell>
    </FirstExamShell>
  );
}

export function FirstExamSubjectDashboard({ subjectId }: { subjectId: string }) {
  const subject = getFirstExamSubject(subjectId);
  const setInputHref = firstExamSetInputPath(subject.id);

  return (
    <FirstExamShell subject={subject}>
      <RefinedShell className="space-y-8">
        <FocusSurface className="grid gap-0 overflow-hidden lg:grid-cols-[1fr_340px]">
          <div className="p-6 sm:p-10">
            <RefinedBadge>{subject.name}</RefinedBadge>
            <h1 className="mt-5 max-w-3xl text-[36px] font-medium leading-[1.14] tracking-[-0.045em] text-[color:var(--foreground-strong)] sm:text-[46px]">
              오늘은 {subject.focus}을 확인할 세트 하나만 입력하세요.
            </h1>
            <p className="mt-5 max-w-2xl text-body text-[color:var(--muted)]">
              기본 입력 단위는 개별 문제가 아니라 문제 세트입니다. 정답률, 시간, 실수 유형을 함께 남기면 다음
              리뷰 큐와 주간 코칭이 더 정확해집니다.
            </p>
            <Link href={setInputHref} className={cn(buttonVariants({ size: "lg" }), "mt-8")}>
              오늘 세트 입력하기
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
          <aside className="border-t border-[var(--border)] bg-[color:var(--surface-soft)] p-6 lg:border-l lg:border-t-0">
            <SnapshotItem label="기본 세트" value={`${subject.defaultSetSize}문항`} />
            <div className="mt-6">
              <SnapshotItem label="반복 취약 단원" value={subject.weakUnits[0]} />
            </div>
            <div className="mt-6">
              <SnapshotItem label="오늘 복습 큐" value="12문항" />
            </div>
          </aside>
        </FocusSurface>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <QuietSection className="p-6 sm:p-8">
            <SectionHeading
              eyebrow="능력 모델"
              title="세 가지 축만 봅니다"
              description="능력 막대는 풀이 행동 데이터를 기반으로 한 관리 지표이며 실제 합격을 보장하지 않습니다."
            />
            <div className="mt-7 space-y-5">
              {subject.abilityScores.map((ability) => (
                <AbilityBar
                  key={ability.label}
                  label={ability.label}
                  value={ability.score}
                  description={ability.description}
                />
              ))}
            </div>
          </QuietSection>
          <QuietSection className="p-6 sm:p-8">
            <SectionHeading eyebrow="최근 변화" title="법규와 계산 과목의 변동성이 먼저 보입니다" />
            <div className="mt-7 space-y-5">
              <SnapshotItem label="최근 정답률" value="62%" />
              <SnapshotItem label="평균 풀이 시간" value="31분" />
              <SnapshotItem label="반복 실수" value="회상 실패 · 계산 누락" />
            </div>
          </QuietSection>
        </div>
      </RefinedShell>
    </FirstExamShell>
  );
}

export function FirstExamSetInput({ subjectId }: { subjectId: string }) {
  const subject = getFirstExamSubject(subjectId);

  return (
    <FirstExamShell subject={subject}>
      <RefinedShell className="space-y-8 pb-28">
        <FocusSurface className="p-6 sm:p-10">
          <RefinedBadge>세트 입력</RefinedBadge>
          <h1 className="mt-5 text-h1 font-medium text-[color:var(--foreground-strong)]">
            {subject.name} 세트 결과를 기록합니다.
          </h1>
          <p className="mt-4 max-w-2xl text-body text-[color:var(--muted)]">
            문제 사진을 올리지 않아도 됩니다. Inverge는 풀이 결과와 행동 패턴을 기준으로 코칭합니다.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {["총 문항", "맞힌 개수", "소요 시간", "헷갈린 문항"].map((label) => (
              <label key={label} className="block">
                <span className="text-caption text-[color:var(--muted)]">{label}</span>
                <input
                  className="mt-2 h-12 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface-soft)] px-4 text-sm outline-none focus:border-[var(--border-strong)]"
                  placeholder={label === "총 문항" ? `${subject.defaultSetSize}` : "0"}
                />
              </label>
            ))}
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-caption text-[color:var(--muted)]">주요 실수 유형</span>
              <select className="mt-2 h-12 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface-soft)] px-4 text-sm outline-none">
                <option>선지 표현 오독</option>
                <option>법규 회상 실패</option>
                <option>계산 실수</option>
                <option>시간 압박</option>
              </select>
            </label>
            <label className="block">
              <span className="text-caption text-[color:var(--muted)]">취약 단원</span>
              <input className="mt-2 h-12 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface-soft)] px-4 text-sm outline-none" placeholder={subject.weakUnits[0]} />
            </label>
          </div>
          <textarea
            className="mt-6 min-h-28 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-4 py-3 text-sm leading-7 outline-none"
            placeholder="정답률보다 중요한 것은 어떤 실수가 반복되는지입니다. 짧게만 남겨도 충분합니다."
          />
        </FocusSurface>
      </RefinedShell>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[color:color-mix(in_srgb,var(--surface)_92%,transparent)] px-5 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-[1180px] justify-end">
          <Link href={firstExamReviewQueuePath(subject.id)} className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
            세트 기록 저장
          </Link>
        </div>
      </div>
    </FirstExamShell>
  );
}

export function FirstExamReviewQueue({ subjectId }: { subjectId: string }) {
  const subject = getFirstExamSubject(subjectId);
  const items = FIRST_EXAM_REVIEW_QUEUE.filter((item) => item.subjectId === subject.id || item.priority === "today");

  return (
    <FirstExamShell subject={subject}>
      <RefinedShell className="space-y-8">
        <FocusSurface className="p-6 sm:p-10">
          <RefinedBadge>리뷰 큐</RefinedBadge>
          <h1 className="mt-5 text-h1 font-medium text-[color:var(--foreground-strong)]">
            오늘은 반복 실수를 줄일 문항만 복습합니다.
          </h1>
          <p className="mt-4 max-w-2xl text-body text-[color:var(--muted)]">
            정답으로 바뀌었더라도 헷갈림이 남아 있으면 큐에 유지됩니다. 해결 완료 전까지 주간 미션에 반영됩니다.
          </p>
        </FocusSurface>
        <div className="space-y-4">
          {items.map((item) => (
            <QuietSection key={item.id} className="grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
              <div>
                <RefinedBadge tone={item.priority === "today" ? "amber" : "neutral"}>
                  {item.priority === "today" ? "오늘 복습" : "이번 주"}
                </RefinedBadge>
                <h2 className="mt-3 text-h3 font-medium text-[color:var(--foreground-strong)]">{item.title}</h2>
                <p className="mt-2 text-sm leading-7 text-[color:var(--muted)]">{item.reason}</p>
              </div>
              <div className="text-right">
                <p className="text-h2 font-medium text-[color:var(--foreground-strong)]">{item.count}</p>
                <p className="text-caption text-[color:var(--muted)]">문항</p>
              </div>
            </QuietSection>
          ))}
        </div>
      </RefinedShell>
    </FirstExamShell>
  );
}

export function FirstExamRecords() {
  return (
    <FirstExamShell>
      <RefinedShell className="space-y-8">
        <FocusSurface className="p-6 sm:p-10">
          <RefinedBadge>기록</RefinedBadge>
          <h1 className="mt-5 text-h1 font-medium text-[color:var(--foreground-strong)]">
            최근 세트 흐름을 조용히 확인합니다.
          </h1>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <SnapshotItem label="이번 주 세트" value="4/6" />
            <SnapshotItem label="평균 정답률" value="62%" />
            <SnapshotItem label="리뷰 큐 처리" value="18문항" />
          </div>
        </FocusSurface>
        <QuietSection className="overflow-hidden">
          {FIRST_EXAM_SET_RECORDS.map((record) => (
            <div key={record.id} className="grid gap-4 border-b border-[var(--border)] p-5 last:border-b-0 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:p-6">
              <div>
                <p className="text-sm font-medium text-[color:var(--foreground-strong)]">{record.title}</p>
                <p className="mt-1 text-caption text-[color:var(--muted)]">{record.completedAt} · {record.mistakePattern}</p>
              </div>
              <RefinedBadge>{record.correctCount}/{record.totalQuestions}</RefinedBadge>
              <RefinedBadge>{record.elapsedMinutes}분</RefinedBadge>
            </div>
          ))}
        </QuietSection>
      </RefinedShell>
    </FirstExamShell>
  );
}

export function FirstExamWeeklyCoaching() {
  return (
    <FirstExamShell>
      <EventOnView
        eventName="first.weekly_coaching.viewed"
        payload={{ examId: "appraisal_first", stage: "first" }}
      />
      <RefinedShell className="space-y-8">
        <FocusSurface className="p-6 sm:p-10">
          <RefinedBadge>주간 코칭</RefinedBadge>
          <h1 className="mt-5 max-w-3xl text-h1 font-medium text-[color:var(--foreground-strong)]">
            다음 주는 법규 회상력과 계산 안정성을 동시에 관리합니다.
          </h1>
          <p className="mt-4 max-w-3xl text-body text-[color:var(--muted)]">
            아직 부족한 부분은 분명하지만, 세트 기록이 쌓이면서 어떤 실수가 반복되는지 보이기 시작했습니다.
            다음 주는 넓게 늘리기보다 두 축을 안정화합니다.
          </p>
        </FocusSurface>
        <div className="grid gap-6 lg:grid-cols-2">
          <QuietSection className="p-6 sm:p-8">
            <SectionHeading eyebrow="다음 주 우선순위" title="6세트 + 리뷰 큐 30문항" />
            <div className="mt-6 space-y-4">
              {["감정평가관계법규 2세트", "회계학 계산 2세트", "민법 선지 판단 1세트", "경제학 시간 제한 1세트"].map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm text-[color:var(--muted-strong)]">
                  <ListChecks className="h-4 w-4 text-[color:var(--foreground-strong)]" />
                  {item}
                </div>
              ))}
            </div>
          </QuietSection>
          <QuietSection className="p-6 sm:p-8">
            <SectionHeading eyebrow="시간 관리" title="계산 과목은 제한 시간을 먼저 고정하세요" />
            <p className="mt-5 text-body text-[color:var(--muted)]">
              맞힌 문제라도 시간이 과도하게 걸렸다면 관리 대상입니다. 이번 주 회계학 세트는 20문항 30분 기준으로
              기록하세요.
            </p>
            <div className="mt-6 flex items-center gap-3 text-sm text-[color:var(--muted-strong)]">
              <Clock className="h-4 w-4 text-[color:var(--foreground-strong)]" />
              기준 시간 초과 문제는 자동으로 리뷰 큐에 남깁니다.
            </div>
          </QuietSection>
        </div>
      </RefinedShell>
    </FirstExamShell>
  );
}
