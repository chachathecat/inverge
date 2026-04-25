import Link from "next/link";
import { ArrowRight, Check, MoveRight } from "lucide-react";

import { ContextBar } from "@/components/inverge/context-bar";
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
  EXAM_SELECTION_SUMMARIES,
  getExamHomePath,
  getExamSelectionSummary,
  getWorkContext,
  getWritePath,
} from "@/lib/inverge/mock-data";
import { cn } from "@/lib/utils";

const HERO_STATS = [
  { label: "지원 시험 트랙", value: "5+" },
  { label: "누적 분석 세션", value: "24,860" },
  { label: "상위 10% 샘플", value: "1,834" },
];

const WORKFLOW = [
  {
    title: "답안 제출",
    description: "텍스트로 쓰거나 이미지 답안을 올립니다.",
  },
  {
    title: "가장 큰 차이 진단",
    description: "과거 응시자 데이터와 상위 10% 샘플 기준으로 핵심 간극을 찾습니다.",
  },
  {
    title: "재작성",
    description: "한 문단만 다시 쓰고 같은 기준으로 재제출합니다.",
  },
];

const ABILITY_PREVIEW = [
  { label: "논점 구조화", value: 72 },
  { label: "근거 연결", value: 64 },
  { label: "결론 명료도", value: 58 },
];

type ExamHomeDashboardProps = {
  examId?: string;
  sessionId?: string;
  subjectId?: string;
};

function AbilityBar({ label, value }: { label: string; value: number }) {
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
    </div>
  );
}

export function FrontPage() {
  return (
    <RefinedShell className="space-y-16 py-12 sm:py-16 lg:py-20">
      <section className="grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="animate-in-up">
          <RefinedBadge>프리미엄 답안 재작성 워크플로우</RefinedBadge>
          <h1 className="mt-6 max-w-3xl text-[44px] font-medium leading-[1.08] tracking-[-0.055em] text-[color:var(--foreground-strong)] sm:text-[58px]">
            답안을 쓰고, 가장 큰 차이를 찾고, 바로 다시 씁니다.
          </h1>
          <p className="mt-6 max-w-2xl text-body text-[color:var(--muted)]">
            Inverge는 시험 준비를 복잡한 대시보드로 만들지 않습니다. 과거 응시자 데이터와 상위권 답안 비교를
            바탕으로 지금 고쳐야 할 한 지점을 조용히 정리합니다.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/exams" className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
              시험 선택하기
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link href="#workflow" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}>
              작동 방식 보기
            </Link>
          </div>
          <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
            {HERO_STATS.map((stat) => (
              <div key={stat.label} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface)] p-4">
                <p className="text-h3 font-medium text-[color:var(--foreground-strong)]">{stat.value}</p>
                <p className="mt-1 text-caption text-[color:var(--muted)]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <FocusSurface className="animate-in-up overflow-hidden [animation-delay:120ms]">
          <div className="border-b border-[var(--border)] px-6 py-5">
            <p className="text-caption text-[color:var(--muted)]">능력 요약 미리보기</p>
            <h2 className="mt-2 text-h2 font-medium text-[color:var(--foreground-strong)]">
              현재 답안은 목표 기준보다 결론 연결 보완이 필요합니다.
            </h2>
          </div>
          <div className="space-y-5 px-6 py-6">
            {ABILITY_PREVIEW.map((item) => (
              <AbilityBar key={item.label} label={item.label} value={item.value} />
            ))}
          </div>
          <div className="border-t border-[var(--border)] bg-[color:var(--surface-soft)] px-6 py-5">
            <p className="text-sm leading-7 text-[color:var(--muted)]">
              과거 응시자 데이터 분석 결과, 현재 당신의 성과는 상위 29% 수준입니다. 합격자 평균 수준(상위
              18%)까지 도달하려면 결론 연결 보완을 가장 추천합니다.
            </p>
          </div>
        </FocusSurface>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {EXAM_SELECTION_SUMMARIES.map((exam) => (
          <Link
            key={exam.id}
            href={getExamHomePath(exam.id)}
            className="group rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-5 transition hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-soft)]"
          >
            <p className="text-caption text-[color:var(--muted)]">{exam.sessionLabel}</p>
            <h3 className="mt-3 text-h3 font-medium text-[color:var(--foreground-strong)]">{exam.name}</h3>
            <p className="mt-4 text-sm leading-6 text-[color:var(--muted)]">{exam.description}</p>
          </Link>
        ))}
      </section>

      <section id="workflow" className="space-y-6">
        <SectionHeading
          eyebrow="작동 방식"
          title="세 단계만 반복합니다"
          description="복잡한 관리 화면보다 실행 속도를 우선합니다. 제출, 진단, 재작성의 루프만 선명하게 남겼습니다."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {WORKFLOW.map((step, index) => (
            <QuietSection key={step.title} className="p-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--primary)] text-sm text-white">
                {index + 1}
              </div>
              <h3 className="mt-5 text-h3 font-medium text-[color:var(--foreground-strong)]">{step.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">{step.description}</p>
            </QuietSection>
          ))}
        </div>
      </section>
    </RefinedShell>
  );
}

export function ExamSelectionPage() {
  const recommended = EXAM_SELECTION_SUMMARIES.filter((exam) => exam.recommended);
  const others = EXAM_SELECTION_SUMMARIES.filter((exam) => !exam.recommended);
  const ordered = [...recommended, ...others];

  return (
    <RefinedShell className="space-y-10">
      <section className="max-w-3xl animate-in-up">
        <RefinedBadge>시험 선택</RefinedBadge>
        <h1 className="mt-5 text-[40px] font-medium leading-[1.12] tracking-[-0.05em] text-[color:var(--foreground-strong)] sm:text-[52px]">
          준비 중인 시험을 선택하세요.
        </h1>
        <p className="mt-5 text-body text-[color:var(--muted)]">
          시험마다 답안의 구조와 평가 축이 다릅니다. 선택한 시험과 과목 맥락은 이후 작성, 비교, 기록 화면에
          그대로 적용됩니다.
        </p>
      </section>

      <div className="space-y-4">
        {ordered.map((exam) => (
          <Link
            key={exam.id}
            href={getExamHomePath(exam.id)}
            className="group grid gap-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-5 transition hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-soft)] sm:grid-cols-[1fr_auto] sm:items-center sm:p-6"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-h2 font-medium text-[color:var(--foreground-strong)]">{exam.name}</h2>
                {exam.recommended ? <RefinedBadge tone="green">추천</RefinedBadge> : null}
                <RefinedBadge>{exam.sessionLabel}</RefinedBadge>
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--muted)]">{exam.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {exam.axes.map((axis) => (
                  <span key={axis} className="rounded-full bg-[color:var(--surface-soft)] px-3 py-1 text-caption text-[color:var(--muted-strong)]">
                    {axis}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-5 sm:justify-end">
              <p className="text-caption text-[color:var(--muted)]">{exam.proof}</p>
              <MoveRight className="h-5 w-5 text-[color:var(--foreground-strong)] transition group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </div>
    </RefinedShell>
  );
}

export function ExamHomeDashboard({ examId, sessionId, subjectId }: ExamHomeDashboardProps) {
  const { exam, session, subject, state, positionCopy, targetCopy } = getWorkContext({ examId, sessionId, subjectId });
  const summary = getExamSelectionSummary(exam.id);
  const topWeakness = state.repeatedWeaknesses[0];
  const writeHref = getWritePath(exam.id, subject.id);
  const abilities = summary.axes.slice(0, 3).map((axis, index) => ({
    label: axis,
    value: [72, 64, 58][index] ?? 62,
  }));

  return (
    <>
      <ContextBar exam={exam} session={session} subject={subject} screen="home" />
      <RefinedShell className="space-y-8">
        <FocusSurface className="overflow-hidden">
          <div className="grid gap-0 lg:grid-cols-[1fr_360px]">
            <div className="px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
              <RefinedBadge>{subject.name} 홈</RefinedBadge>
              <h1 className="mt-5 max-w-3xl text-[36px] font-medium leading-[1.14] tracking-[-0.045em] text-[color:var(--foreground-strong)] sm:text-[46px]">
                오늘은 {state.mission.title}만 처리하면 됩니다.
              </h1>
              <p className="mt-5 max-w-3xl text-body text-[color:var(--muted)]">
                {positionCopy} {targetCopy}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href={writeHref} className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
                  답안 작성 시작
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  href={`/exams/${exam.id}/${session.id}/${subject.id}/records`}
                  className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}
                >
                  기록 보기
                </Link>
              </div>
            </div>

            <aside className="border-t border-[var(--border)] bg-[color:var(--surface-soft)] px-6 py-6 lg:border-l lg:border-t-0">
              <p className="text-caption text-[color:var(--muted)]">오늘의 미션</p>
              <h2 className="mt-2 text-h3 font-medium text-[color:var(--foreground-strong)]">{state.mission.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">{state.mission.whyThisMatters}</p>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <SnapshotItem label="예상 시간" value={state.mission.estimatedTime} />
                <SnapshotItem label="D-day" value={`${state.dDay}일`} />
              </div>
            </aside>
          </div>
        </FocusSurface>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <QuietSection className="p-6 sm:p-8">
            <SectionHeading
              eyebrow="능력 요약"
              title="세 가지 축만 확인하세요"
              description="능력 막대는 우선순위를 보기 위한 조용한 지표입니다. 실제 결과를 보장하지 않습니다."
            />
            <div className="mt-7 space-y-5">
              {abilities.map((ability) => (
                <AbilityBar key={ability.label} label={ability.label} value={ability.value} />
              ))}
            </div>
          </QuietSection>

          <QuietSection className="p-6 sm:p-8">
            <SectionHeading eyebrow="최근 변화" title={state.currentState} />
            <div className="mt-7 space-y-5">
              <SnapshotItem label="현재 위치" value={`상위 ${state.currentRelativePosition}%`} />
              <SnapshotItem label="최근 변화" value={state.deltaFromPrevious < 0 ? `${Math.abs(state.deltaFromPrevious)}%p 개선` : `${state.deltaFromPrevious}%p 하락`} />
              <SnapshotItem label="반복 약점" value={topWeakness?.name ?? "없음"} />
            </div>
          </QuietSection>
        </div>

        <QuietSection className="p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-caption text-[color:var(--muted)]">다음 행동</p>
              <h2 className="mt-2 text-h2 font-medium text-[color:var(--foreground-strong)]">
                먼저 한 답안을 제출하고, 가장 큰 차이 하나만 확인하세요.
              </h2>
              <p className="mt-3 text-body text-[color:var(--muted)]">
                결과 화면에서는 상위 10% 답안과 비교한 뒤 바로 재작성 화면으로 이어집니다.
              </p>
            </div>
            <Link href={writeHref} className={cn(buttonVariants({ size: "lg" }), "w-full lg:w-auto")}>
              작성으로 이동
              <Check className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </QuietSection>
      </RefinedShell>
    </>
  );
}
