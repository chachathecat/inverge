import Link from "next/link";

import { Button } from "@/components/ui/button";
import { DEVICE_APPENDIX_FX_9860GIII, type CalculatorWorkflow } from "@/lib/review-os/calculator-workflow";

type CalculatorWorkflowPageProps = {
  workflow: CalculatorWorkflow;
};

export function CalculatorWorkflowPage({ workflow }: CalculatorWorkflowPageProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-[var(--radius-card)] border border-[color:var(--brand-700)] bg-[color:var(--brand-050)] p-6 md:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-[66ch]">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-[color:var(--brand-700)] bg-[color:var(--bg-surface)] px-3 py-1 text-xs text-[color:var(--brand-700)]">
                {workflow.mode === "first" ? "감평 1차" : "감평 2차"}
              </span>
              <span className="rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-3 py-1 text-xs text-[color:var(--muted)]">
                {workflow.subject}
              </span>
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.035em] text-[color:var(--foreground-strong)]">{workflow.title}</h2>
            <p className="mt-2 text-sm leading-7 text-[color:var(--muted)]">{workflow.subtitle}</p>
            <p className="mt-3 rounded-2xl border border-[color:var(--cue-review)] bg-[color:var(--cue-review-bg)] px-4 py-3 text-sm leading-6 text-[color:var(--foreground-strong)]">
              Alpha note: 위 공통 스텝은 지금 사용할 수 있는 계산 흐름입니다. FX-9860GIII 조작 부록은 Draft/Beta이며 최종 운용 지침이 아닙니다.
            </p>
          </div>
          <Link href={`/app?mode=${workflow.mode}`}>
            <Button type="button" variant="outline">
              오늘로 돌아가기
            </Button>
          </Link>
        </div>
      </section>

      <section className="rounded-[var(--radius-card)] border border-[color:var(--cue-focus)] bg-[color:var(--cue-focus-bg)] p-5">
        <p className="text-caption text-[color:var(--cue-focus)]">Common workflow core</p>
        <h3 className="mt-1 text-title text-[color:var(--foreground-strong)]">기기와 무관하게 먼저 고정할 계산 흐름</h3>
        <p className="mt-2 text-sm leading-7 text-[color:var(--muted)]">
          아래 1-7번은 특정 계산기 모델이 아니라 문제지에 적을 값, 계산 순서, 검산, 답안에 옮길 내용을 정리합니다.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <WorkflowSection number="1" title="시험 전 체크" items={workflow.preExamChecks} />
        <WorkflowSection number="2" title="기본 세팅" items={workflow.basicSetup} />
      </section>

      <section className="rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-5">
        <SectionHeader number="3" title="문제유형 선택" description="문제 유형을 먼저 고르면 적을 값과 검산 지점이 줄어듭니다." />
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {workflow.problemTypes.map((type) => (
            <div key={type.id} className="rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] p-4">
              <p className="text-sm font-medium text-[color:var(--foreground-strong)]">{type.label}</p>
              <p className="mt-2 text-xs leading-5 text-[color:var(--muted)]">{type.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader number="4" title="스텝 카드" description="한 번에 한 카드만 보고 계산 흐름을 고정합니다." />
        <div className="grid gap-4">
          {workflow.stepCards.map((card) => (
            <article key={card.id} className="rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-5">
              <p className="text-caption text-[color:var(--cue-focus)]">Step</p>
              <h3 className="mt-1 text-title text-[color:var(--foreground-strong)]">{card.title}</h3>
              <p className="mt-2 text-sm leading-7 text-[color:var(--muted)]">{card.whenToUse}</p>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <CardList label="먼저 적을 값" items={card.valuesToWriteFirst} />
                <CardList label="계산 순서" items={card.calculationOrder} ordered />
              </div>

              <div className="mt-3 rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] px-4 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-caption text-[color:var(--muted)]">Button path</p>
                  <span className="w-fit rounded-full border border-[color:var(--cue-review)] bg-[color:var(--cue-review-bg)] px-2.5 py-1 text-[11px] text-[color:var(--cue-review)]">
                    {card.buttonPath.verificationStatus === "device-draft" ? "Device Draft/Beta" : "Common verified"}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--foreground-strong)]">{card.buttonPath.common}</p>
                <p className="mt-2 text-xs leading-5 text-[color:var(--muted)]">FX-9860GIII: {card.buttonPath.fx9860giiiDraft}</p>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                <SmallSignal label="흔한 실수" value={card.commonMistakes.join(" / ")} tone="risk" />
                <SmallSignal label="검산 체크" value={card.verificationCheck} tone="review" />
                <SmallSignal label="답안에 옮길 것" value={card.copyToAnswer} tone="focus" />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <WorkflowSection number="5" title="흔한 실수" items={workflow.commonMistakes} tone="risk" />
        <WorkflowSection number="6" title="검산 체크" items={workflow.verificationChecks} tone="focus" />
        <WorkflowSection number="7" title="1분 드릴" items={workflow.oneMinuteDrill} tone="review" />
      </section>

      <section className="rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-5">
        <div className="max-w-[66ch]">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-caption text-[color:var(--muted)]">Device-specific appendix</p>
            <span className="rounded-full border border-[color:var(--cue-review)] bg-[color:var(--cue-review-bg)] px-2.5 py-1 text-[11px] text-[color:var(--cue-review)]">
              Draft/Beta
            </span>
          </div>
          <h3 className="mt-1 text-title text-[color:var(--foreground-strong)]">{DEVICE_APPENDIX_FX_9860GIII.title}</h3>
          <p className="mt-2 text-sm leading-7 text-[color:var(--muted)]">{DEVICE_APPENDIX_FX_9860GIII.caution}</p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {DEVICE_APPENDIX_FX_9860GIII.sections.map((section) => (
            <div key={section.title} className="rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] p-4">
              <p className="text-sm font-medium text-[color:var(--foreground-strong)]">{section.title}</p>
              <ul className="mt-2 space-y-2 text-xs leading-5 text-[color:var(--muted)]">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionHeader({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div>
      <p className="text-caption text-[color:var(--muted)]">{number}</p>
      <h3 className="mt-1 text-title text-[color:var(--foreground-strong)]">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">{description}</p>
    </div>
  );
}

function WorkflowSection({
  number,
  title,
  items,
  tone = "neutral",
}: {
  number: string;
  title: string;
  items: string[];
  tone?: "focus" | "neutral" | "review" | "risk";
}) {
  const toneClass = {
    focus: "border-[color:var(--cue-focus)] bg-[color:var(--cue-focus-bg)]",
    neutral: "border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)]",
    review: "border-[color:var(--cue-review)] bg-[color:var(--cue-review-bg)]",
    risk: "border-[color:var(--cue-risk)] bg-[color:var(--cue-risk-bg)]",
  }[tone];

  return (
    <section className={`rounded-[var(--radius-card)] border p-5 ${toneClass}`}>
      <p className="text-caption text-[color:var(--muted)]">{number}</p>
      <h3 className="mt-1 text-title text-[color:var(--foreground-strong)]">{title}</h3>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item} className="text-sm leading-7 text-[color:var(--foreground-strong)]">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function CardList({ label, items, ordered = false }: { label: string; items: string[]; ordered?: boolean }) {
  const ListTag = ordered ? "ol" : "ul";

  return (
    <div className="rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] px-4 py-3">
      <p className="text-caption text-[color:var(--muted)]">{label}</p>
      <ListTag className="mt-2 space-y-2">
        {items.map((item, index) => (
          <li key={item} className="flex gap-3 text-sm leading-6 text-[color:var(--foreground-strong)]">
            {ordered ? <span className="tabular-nums text-[color:var(--muted)]">{index + 1}</span> : null}
            <span>{item}</span>
          </li>
        ))}
      </ListTag>
    </div>
  );
}

function SmallSignal({ label, value, tone }: { label: string; value: string; tone: "focus" | "review" | "risk" }) {
  const toneClass = {
    focus: "border-[color:var(--cue-focus)] bg-[color:var(--cue-focus-bg)] text-[color:var(--cue-focus)]",
    review: "border-[color:var(--cue-review)] bg-[color:var(--cue-review-bg)] text-[color:var(--cue-review)]",
    risk: "border-[color:var(--cue-risk)] bg-[color:var(--cue-risk-bg)] text-[color:var(--cue-risk)]",
  }[tone];

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
      <p className="text-caption">{label}</p>
      <p className="mt-1 text-sm leading-6 text-[color:var(--foreground-strong)]">{value}</p>
    </div>
  );
}
