import Link from "next/link";
import { notFound } from "next/navigation";

import {
  LEARNER_SUPPORT_CHOICES_V1,
  createLearnerSupportProjectionV1,
  type LearnerSupportChoiceV1,
} from "@/lib/core-blitz/learner-support-runtime";
import { reviewOsService } from "@/lib/review-os/service";
import { requireTrustedRepairAccess } from "@/lib/review-os/trusted-repair-access";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ itemId: string }>;
  searchParams?: Promise<{ choice?: string }>;
};

const CHOICE_LABELS: Readonly<Record<LearnerSupportChoiceV1, string>> =
  Object.freeze({
    TRY_FIRST: "내가 먼저 풀기",
    ONE_HINT: "힌트 하나",
    EASY_EXPLANATION: "1타 쉬운풀이",
    FULL_SOLUTION: "전체풀이",
    DIRECT_ANSWER: "정답만 보기",
  });

function normalizedChoice(value: string | undefined): LearnerSupportChoiceV1 {
  return LEARNER_SUPPORT_CHOICES_V1.includes(value as LearnerSupportChoiceV1)
    ? (value as LearnerSupportChoiceV1)
    : "TRY_FIRST";
}

function substantiveReference(value: string | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized && !["-", "–", "—"].includes(normalized)
    ? normalized
    : null;
}

export default async function CoreBlitzLearnerSupportPage({
  params,
  searchParams,
}: PageProps) {
  const [{ itemId }, query] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({}),
  ]);

  let session: Awaited<ReturnType<typeof requireTrustedRepairAccess>>;
  try {
    session = await requireTrustedRepairAccess();
  } catch {
    notFound();
  }

  const detail = await reviewOsService.getWrongAnswerDetail(
    session.userId,
    session.email,
    itemId,
  );
  if (!detail || detail.item.examName !== "감정평가사 2차") notFound();

  const choice = normalizedChoice(query.choice);
  const projection = createLearnerSupportProjectionV1({
    itemId: detail.item.id,
    subject: detail.item.subjectLabel,
    choice,
    questionSummary:
      detail.item.rawQuestionText ??
      detail.item.problemTitle ??
      detail.item.problemIdentifier ??
      detail.item.subjectLabel,
    plainExplanation:
      detail.item.biggestGap ??
      detail.item.weakStructurePoint ??
      detail.item.missingIssue ??
      "문제 요구와 답안의 연결 한 가지를 먼저 확인하세요.",
    keyTerms: detail.item.keyConcepts ?? [],
    stepByStep: [
      detail.item.referenceStructure,
      detail.item.rewriteInstruction,
      detail.item.outlineDraft,
    ].filter((value): value is string =>
      typeof value === "string" && value.trim().length > 0,
    ),
    examHints: [
      detail.item.weakStructurePoint,
      detail.item.missingIssue,
      detail.item.coreFormula,
    ].filter((value): value is string =>
      typeof value === "string" && value.trim().length > 0,
    ),
    suppliedReferenceAnswer: substantiveReference(detail.item.correctAnswer),
  });

  return (
    <main
      className="mx-auto grid w-full max-w-3xl gap-6 px-5 py-8 lg:px-0"
      data-core-blitz-learner-support
      data-assistance-class={projection.assistanceClass}
      data-support-authority={projection.authority}
    >
      <header className="space-y-2">
        <p className="text-sm font-semibold text-[var(--color-text-brand)]">
          Owner 전용 · 기본 비활성
        </p>
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">
          필요한 만큼만 도움받기
        </h1>
        <p className="leading-7 text-[var(--color-text-secondary)]">
          {detail.item.subjectLabel} · 답을 보더라도 이후의 무도움 수행과
          숙달은 별도로 확인합니다.
        </p>
      </header>

      <nav
        aria-label="학습 도움 선택"
        className="grid gap-2 sm:grid-cols-2"
        data-core-blitz-support-choices
      >
        {LEARNER_SUPPORT_CHOICES_V1.map((candidate) => (
          <Link
            key={candidate}
            href={`/app/core-blitz/support/${encodeURIComponent(itemId)}?choice=${candidate}`}
            aria-current={candidate === choice ? "page" : undefined}
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--color-border-default)] bg-[var(--color-background-surface)] px-4 text-center font-semibold text-[var(--color-text-primary)] aria-[current=page]:border-[var(--color-border-focus)]"
          >
            {CHOICE_LABELS[candidate]}
          </Link>
        ))}
      </nav>

      <section className="space-y-4 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-background-surface)] p-5" data-core-blitz-support-result>
        <div className="space-y-1">
          <p className="text-sm text-[var(--color-text-secondary)]">
            {projection.authority === "SUPPLIED_REFERENCE"
              ? "사용자가 제공한 기준자료에 근거"
              : projection.authority === "TRY_FIRST"
                ? "도움 없이 시도"
                : "구조화된 학습 도움"}
          </p>
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
            {projection.title}
          </h2>
        </div>
        <ol className="grid gap-3">
          {projection.body.map((line, index) => (
            <li
              key={`${projection.projectionId}-${index}`}
              className="rounded-xl bg-[var(--color-background-subtle)] p-4 leading-7 text-[var(--color-text-primary)]"
            >
              {line}
            </li>
          ))}
        </ol>
      </section>

      <section
        className="rounded-2xl border border-[var(--color-border-attention)] bg-[var(--color-background-attention)] p-5"
        data-core-blitz-assistance-truth
      >
        <h2 className="font-semibold text-[var(--color-text-primary)]">
          학습 기록 판정
        </h2>
        <p className="mt-2 leading-7 text-[var(--color-text-secondary)]">
          {projection.independentAttemptEligible
            ? "현재 선택은 도움 없는 시도입니다. 실제 제출·검증 전에는 숙달로 확정하지 않습니다."
            : "현재 선택은 도움 사용으로 기록됩니다. 같은 문제의 숙달이나 전이 증거가 되지 않으며, 다른 시점의 무도움 수행이 필요합니다."}
        </p>
      </section>

      <footer className="flex flex-col gap-2 sm:flex-row">
        <Link
          href={`/app/items/${encodeURIComponent(itemId)}?mode=second`}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--color-border-default)] px-4 font-semibold text-[var(--color-text-primary)]"
        >
          학습 기록으로 돌아가기
        </Link>
        <Link
          href="/app/review?mode=second"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--color-border-default)] px-4 font-semibold text-[var(--color-text-primary)]"
        >
          복습 대기 보기
        </Link>
      </footer>
    </main>
  );
}
