import Link from "next/link";

import {
  BiggestGap,
  V3ActionLink,
  V3RouteFrame,
  V3RouteHeader,
  V3Surface,
} from "@/components/learner";
import { LocalBetaNotesSection } from "@/components/review-os/local-beta-note-reflection";
import {
  CoreRouteReadEmptyShell,
  CoreRouteReadErrorPage,
} from "@/components/review-os/core-route-read-state";
import { ReviewOsAccessState } from "@/components/review-os/review-os-access-state";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { getModeConfig, resolveAppraisalMode, type AppraisalMode } from "@/lib/review-os/appraisal";
import { resolveEssentialCoreRouteRead } from "@/lib/review-os/core-route-read-outcome";
import { buildReviewOsReturnTo, getReviewOsServerContext } from "@/lib/review-os/server";
import { reviewOsService } from "@/lib/review-os/service";
import type { LearningSignalEventRecord, WrongAnswerItemRecord } from "@/lib/review-os/types";

type PageProps = {
  searchParams?: Promise<{ mode?: string; saved?: string }>;
};

type CaptureNoteSummary = {
  biggestGap?: string;
  nextAction?: string;
  topicCandidate?: string;
  mistakeType?: string;
};

const EMPTY_GAP_COPY = "아직 정리된 약점 후보가 없습니다. 오늘 한 것을 다시 올리면 더 선명해집니다.";
const EMPTY_ACTION_COPY = "오늘 한 것 1개를 올리고 다음 행동을 다시 정리합니다.";
const EMPTY_TOPIC_COPY = "아직 논점 후보가 없습니다.";

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readCaptureNoteSummary(item: WrongAnswerItemRecord): CaptureNoteSummary {
  const payload =
    typeof item.derivedPayload?.capture_note_engine_v2 === "object" && item.derivedPayload.capture_note_engine_v2
      ? (item.derivedPayload.capture_note_engine_v2 as Record<string, unknown>)
      : typeof item.derivedPayload?.capture_note_engine_v1 === "object" && item.derivedPayload.capture_note_engine_v1
        ? (item.derivedPayload.capture_note_engine_v1 as Record<string, unknown>)
        : null;

  return {
    biggestGap: readString(payload?.one_biggest_gap) ?? undefined,
    nextAction: readString(payload?.one_next_action) ?? undefined,
    topicCandidate: readString(payload?.topic_candidate) ?? undefined,
    mistakeType: readString(payload?.mistake_type) ?? undefined,
  };
}

function resolveBiggestGap(item: WrongAnswerItemRecord) {
  const capture = readCaptureNoteSummary(item);
  return (
    capture.biggestGap ??
    readString(item.derivedPayload?.biggestGap) ??
    readString(item.derivedPayload?.comparisonPoint) ??
    readString(item.derivedPayload?.mistakeType) ??
    readString(item.userReasonPreset) ??
    EMPTY_GAP_COPY
  );
}

function resolveNextAction(item: WrongAnswerItemRecord, mode: AppraisalMode) {
  const capture = readCaptureNoteSummary(item);
  return (
    capture.nextAction ??
    readString(item.derivedPayload?.nextAction) ??
    readString(item.derivedPayload?.nextTask) ??
    (mode === "second" ? "문단 하나를 다시 쓰고 약점 1개만 줄입니다." : "놓친 조건 1개를 회상하고 짧게 다시 풉니다.")
  );
}

function resolveTopicCandidate(item: WrongAnswerItemRecord) {
  const capture = readCaptureNoteSummary(item);
  return (
    capture.topicCandidate ??
    readString(item.derivedPayload?.topicCandidate) ??
    readString(item.derivedPayload?.topicTag) ??
    readString(item.problemTitle) ??
    EMPTY_TOPIC_COPY
  );
}

function formatCreatedDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric" }).format(date);
}

function sourceTypeLabel(sourceType: string) {
  if (sourceType === "problem-snap") return "Problem Snap";
  if (sourceType === "answer_review") return "답안 훈련 기록";
  if (sourceType === "review_queue") return "복습 예정";
  if (sourceType === "wrong_answer") return "학습 노트";
  return "학습 기록";
}

function signalCta(signal: Pick<LearningSignalEventRecord, "sourceType" | "subject">, mode: AppraisalMode) {
  if (signal.sourceType === "problem-snap") {
    return mode === "second"
      ? { label: "답안 훈련으로 보기", href: `/answer-review?mode=${mode}&subject=${encodeURIComponent(signal.subject)}` }
      : { label: "다시 풀기", href: `/problem-snap?mode=${mode}&subject=${encodeURIComponent(signal.subject)}` };
  }

  if (signal.sourceType === "answer_review") {
    return { label: "답안 훈련하기", href: `/answer-review?mode=${mode}` };
  }

  return { label: "오늘 할 일에서 보기", href: `/app?mode=${mode}` };
}

function NoteBridgeFields({
  subject,
  topic,
  biggestGap,
  nextAction,
  v3 = false,
}: {
  subject: string;
  topic: string;
  biggestGap: string;
  nextAction: string;
  v3?: boolean;
}) {
  return (
    <dl className={v3
      ? "v3-type-compact divide-y divide-[var(--color-border-default)] border-y border-[var(--color-border-default)] text-[var(--color-text-secondary)]"
      : "grid gap-3 text-sm md:grid-cols-2"}>
      <div className={v3 ? "py-3" : "rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-3"}>
        <dt className="text-xs text-[color:var(--muted)]">과목</dt>
        <dd className="mt-1 text-[color:var(--foreground-strong)]">{subject}</dd>
      </div>
      <div className={v3 ? "py-3" : "rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-3"}>
        <dt className="text-xs text-[color:var(--muted)]">논점 후보</dt>
        <dd className="mt-1 text-[color:var(--foreground-strong)]">{topic}</dd>
      </div>
      <div className={v3 ? "py-3" : "rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-3"}>
        <dt className="text-xs text-[color:var(--muted)]">가장 큰 약점</dt>
        <dd className="mt-1 text-[color:var(--foreground-strong)]">{biggestGap}</dd>
      </div>
      <div className={v3 ? "py-3" : "rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-3"}>
        <dt className="text-xs text-[color:var(--muted)]">다음 행동</dt>
        <dd className="mt-1 text-[color:var(--foreground-strong)]">{nextAction || EMPTY_ACTION_COPY}</dd>
      </div>
    </dl>
  );
}

export async function renderReviewOsItemsPage(searchParams: PageProps["searchParams"], routePath = "/app/items") {
  const query = await searchParams;
  const modeParam = query?.mode;
  const savedParam = query?.saved;
  const { session, access, profile } = await getReviewOsServerContext(buildReviewOsReturnTo(routePath, modeParam));
  if (access.status !== "allowed") return <ReviewOsAccessState access={access} embedded />;
  if (!session.userId || !session.email) return null;

  const mode = resolveAppraisalMode(profile, modeParam);
  const config = getModeConfig(mode);
  const isNotesRoute = routePath === "/app/notes";
  const [itemsRead, learningSignalsRead] = await Promise.all([
    resolveEssentialCoreRouteRead("notes_items", () =>
      reviewOsService.listWrongAnswerItems(session.userId!, session.email!, 60),
    ),
    resolveEssentialCoreRouteRead("notes_learning_signal_events", () =>
      reviewOsService.listLearningSignalEvents(session.userId!, session.email!, mode, 20),
    ),
  ]);
  if (itemsRead.status !== "ready" || learningSignalsRead.status !== "ready") {
    return <CoreRouteReadErrorPage surface={isNotesRoute ? "notes" : "items"} />;
  }

  const items = itemsRead.value.filter((item) => item.examName === config.label);
  const learningSignals = learningSignalsRead.value;
  const hasItems = items.length > 0;
  const hasLearningSignals = learningSignals.length > 0;
  const pageTitle = isNotesRoute ? "학습 노트" : "학습 기록";
  const helperCopy = isNotesRoute
    ? "오늘 한 것에서 만든 가장 큰 약점과 다음 행동을 모아봅니다."
    : "학습 노트와 복습 흐름을 기록으로 확인합니다.";
  const visibleItems = isNotesRoute ? items.slice(0, 3) : items;
  const foldedItems = isNotesRoute ? items.slice(3) : [];
  const visibleLearningSignals = isNotesRoute ? learningSignals.slice(0, 3) : learningSignals.slice(0, 8);
  const isSecondRound = mode === "second";

  if (!hasItems && !hasLearningSignals) {
    return (
      <CoreRouteReadEmptyShell
        surface={isNotesRoute ? "notes" : "items"}
        mode={mode}
        confirmedEmptyContent={(
          <section
            className="space-y-3"
            aria-label="학습 노트 시작 안내"
            data-s232f4a-route-specific-empty
          >
            <div className="space-y-1">
              <p className="text-sm font-medium text-[color:var(--foreground-strong)]">
                아직 쌓인 학습 노트가 없습니다.
              </p>
              <p className="text-sm text-[color:var(--muted)]">
                오늘 한 것을 하나 올리면 가장 큰 약점과 다음 행동이 만들어집니다.
              </p>
            </div>
            {isSecondRound ? (
              <V3ActionLink href="/app/capture?mode=second" data-s224v-dominant-primary-action>
                오늘 한 것 올리기
              </V3ActionLink>
            ) : (
              <Link
                href={`/app/capture?mode=${mode}`}
                className={buttonVariants({ className: "primary-action w-full sm:w-auto" })}
                data-s224v-dominant-primary-action
              >
                오늘 한 것 올리기
              </Link>
            )}
          </section>
        )}
      >
        <LocalBetaNotesSection
          mode={mode}
          showEmptyMessage={false}
          showReadUnavailableNotice={false}
        />
      </CoreRouteReadEmptyShell>
    );
  }

  const RecordsSurface = isSecondRound ? V3Surface : Card;
  const RecordsBody = isSecondRound ? "div" : CardContent;
  const itemsPage = (
    <div
      className={isSecondRound ? "space-y-7" : "space-y-6"}
      data-s224v-surface={isNotesRoute ? "/app/notes" : "/app/items"}
      data-s224v-primary-cta-count-above-fold="1"
      data-s224v-visible-trust-layer-count="0"
      data-s224v-visible-primary-work-items-max={isNotesRoute ? 3 : 8}
      data-s224v-secondary-diagnostics="quiet-disclosure"
      data-s224v-equal-weight-card-grid="absent"
      data-s224v-repeated-warning-copy="absent"
      data-s232d3-notes-list={isNotesRoute ? "recent-first" : undefined}
    >
      {isSecondRound ? (
        <V3RouteHeader
          eyebrow={isNotesRoute ? "최근 기록 3개" : "학습 기록"}
          title={pageTitle}
          description={helperCopy}
        />
      ) : null}
      <RecordsSurface className={isSecondRound ? "space-y-6" : "border-[var(--border)] bg-[color:var(--surface)] shadow-none"}>
        {!isSecondRound ? (
          <CardHeader className="space-y-2">
            <h1 className="text-title text-[color:var(--foreground-strong)]">{pageTitle}</h1>
            <CardDescription>{helperCopy}</CardDescription>
          </CardHeader>
        ) : null}
        {isNotesRoute ? (
          <p className={isSecondRound
            ? "v3-type-caption text-[var(--color-text-secondary)]"
            : "px-6 text-xs leading-5 text-[color:var(--muted)]"} data-notes-record-context>
            최근 3개 기록만 먼저 봅니다. 오래된 기록은 접어 두고, 가장 큰 약점과 다음 행동을 우선 확인합니다.
          </p>
        ) : null}
        <RecordsBody className={isSecondRound ? "space-y-5" : "space-y-4"}>
          {savedParam ? (
            <div className={isSecondRound
              ? "rounded-[var(--v3-radius-control)] border border-[var(--color-border-focus)] bg-[var(--color-background-focus)] px-4 py-4"
              : "rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] px-4 py-3"}>
              <p className="text-sm font-medium text-[color:var(--foreground-strong)]">방금 저장한 학습 노트가 반영되었습니다.</p>
              <p className="mt-1 text-sm text-[color:var(--muted)]">
                가장 큰 약점 1개와 다음 행동 1개를 먼저 확인하고, 오늘 계획에 반영합니다.
              </p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-[color:var(--muted)]">
                <Link href={`/app?mode=${mode}`} className="underline-offset-4 hover:underline">오늘 할 일</Link>
                <Link href={`/app/review?mode=${mode}`} className="underline-offset-4 hover:underline">복습</Link>
                <Link href={`/app/agenda?mode=${mode}`} className="underline-offset-4 hover:underline">학습 기록</Link>
              </div>
            </div>
          ) : null}

          {hasItems ? (
            <div className="space-y-4">
              {visibleItems.map((item) => {
                const topic = resolveTopicCandidate(item);
                const biggestGap = resolveBiggestGap(item);
                const nextAction = resolveNextAction(item, mode);
                const createdAt = formatCreatedDate(item.createdAt);

                if (isNotesRoute) {
                  const title = item.problemTitle ?? item.problemIdentifier ?? `${item.subjectLabel} 학습 노트`;

                  return (
                    <section
                      key={item.id}
                      className={isSecondRound
                        ? "border-b border-[var(--color-border-default)] py-6 first:pt-0 last:border-b-0 last:pb-0"
                        : "review-reason-card rounded-[var(--radius-lg)] border border-[var(--border)] px-4 py-4"}
                      aria-labelledby={`notes-title-${item.id}`}
                      data-notes-record-context
                      data-s232d3-note-card
                    >
                      <div className="space-y-4">
                        <header className="space-y-1" data-s232d3-note-meta>
                          <p className="text-xs text-[color:var(--muted)]">
                            {item.subjectLabel}
                            {createdAt ? ` · ${createdAt}` : ""}
                          </p>
                          <h2 id={`notes-title-${item.id}`} className="break-words text-sm font-medium text-[color:var(--foreground-strong)]">
                            {title}
                          </h2>
                        </header>

                        <BiggestGap
                          gap={biggestGap}
                          density="Compact"
                          showEvidence={false}
                          headingId={`notes-biggest-gap-${item.id}`}
                        />

                        <div
                          className={isSecondRound
                            ? "border-t border-[var(--color-border-default)] pt-4"
                            : "rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-3"}
                          data-s232d3-next-action
                        >
                          <p className="text-xs font-medium text-[color:var(--muted)]">다음 행동</p>
                          <p className="mt-1 break-words text-sm leading-6 text-[color:var(--foreground-strong)]">
                            {nextAction || EMPTY_ACTION_COPY}
                          </p>
                        </div>

                        <Link
                          href={`/app/items/${item.id}?mode=${mode}`}
                          className="inline-flex min-h-11 items-center text-sm font-medium text-[color:var(--foreground-strong)] underline-offset-4 hover:underline"
                          aria-label={`노트 자세히 보기: ${title}`}
                          data-s232d3-detail-link
                        >
                          노트 자세히 보기
                        </Link>

                        <div
                          className="flex flex-wrap gap-x-3 gap-y-1 border-t border-[color:var(--border-subtle)] pt-3 text-xs text-[color:var(--muted)]"
                          data-s232d3-secondary-connections
                        >
                          <span>논점 후보: {topic}</span>
                          <span>복습에 남길 내용</span>
                          <span>학습 기록에 저장</span>
                        </div>
                      </div>
                    </section>
                  );
                }

                return (
                  <section key={item.id} className={isSecondRound
                    ? "border-b border-[var(--color-border-default)] py-6 first:pt-0 last:border-b-0 last:pb-0"
                    : "review-reason-card rounded-[var(--radius-lg)] border border-[var(--border)] px-4 py-4"} data-notes-record-context>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          <span className={isSecondRound
                            ? "v3-type-caption text-[var(--color-text-secondary)]"
                            : "rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)] px-3 py-1 text-xs text-[color:var(--muted)]"}>
                            학습 노트
                          </span>
                          <span className={isSecondRound
                            ? "v3-type-caption text-[var(--color-text-secondary)]"
                            : "rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)] px-3 py-1 text-xs text-[color:var(--muted)]"}>
                            복습 연결: 복습 예정
                          </span>
                        </div>
                        <h2 className="text-sm font-medium text-[color:var(--foreground-strong)]">
                          {item.problemTitle ?? item.problemIdentifier ?? `${item.subjectLabel} 학습 노트`}
                        </h2>
                        {createdAt ? <p className="text-xs text-[color:var(--muted)]">{createdAt}</p> : null}
                      </div>
                      <Link
                        href={`/app/items/${item.id}?mode=${mode}`}
                        className="inline-flex text-sm font-medium text-[color:var(--foreground-strong)] underline-offset-4 hover:underline"
                      >
                        노트 자세히 보기
                      </Link>
                    </div>

                    <div className="mt-4">
                      <NoteBridgeFields subject={item.subjectLabel} topic={topic} biggestGap={biggestGap} nextAction={nextAction} v3={isSecondRound} />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-[color:var(--muted)]">
                      <span>오늘 계획 연결: 오늘 계획에 반영</span>
                      <span>복습 연결: 복습에 남길 내용</span>
                      <span>학습 기록 연결: 학습 기록에 저장</span>
                    </div>
                  </section>
                );
              })}
            </div>
          ) : null}

          {foldedItems.length > 0 ? (
            <details className={isSecondRound
              ? "group rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-elevated)] p-4"
              : "quiet-disclosure rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--bg-surface)] p-4"} data-v3-component={isSecondRound ? "QuietDisclosure" : undefined} data-s224v-secondary-diagnostics>
              <summary className={isSecondRound
                ? "v3-type-label-strong flex min-h-11 cursor-pointer list-none items-center text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                : "cursor-pointer list-none text-sm font-medium text-[color:var(--foreground-strong)]"}>
                이전 학습 노트 {foldedItems.length}개 보기
              </summary>
              <div className="mt-3 divide-y divide-[color:var(--border-subtle)]">
                {foldedItems.map((item) => (
                  <Link
                    key={item.id}
                    href={`/app/items/${item.id}?mode=${mode}`}
                    className="block py-3 text-sm text-[color:var(--foreground-strong)] underline-offset-4 hover:underline"
                  >
                    {item.problemTitle ?? item.problemIdentifier ?? `${item.subjectLabel} 학습 노트`}
                  </Link>
                ))}
              </div>
            </details>
          ) : null}

          {!hasItems && hasLearningSignals ? (
            <div className="space-y-3">
              {visibleLearningSignals.map((signal) => {
                const createdAt = formatCreatedDate(signal.createdAt);
                const biggestGap = signal.derivedTags[0] ?? "최근 학습 신호";
                const nextAction = signal.nextTask || (mode === "second" ? "문단 하나를 다시 씁니다." : "놓친 조건 1개를 회상합니다.");
                const cta = signalCta(signal, mode);

                return (
                  <section key={signal.id} className={isSecondRound
                    ? "border-b border-[var(--color-border-default)] py-6 first:pt-0 last:border-b-0 last:pb-0"
                    : "review-reason-card rounded-[var(--radius-lg)] border border-[var(--border)] px-4 py-4"} data-notes-record-context>
                    <p className="text-xs font-medium text-[color:var(--muted)]">{sourceTypeLabel(signal.sourceType)}</p>
                    <h2 className="mt-1 text-sm font-medium text-[color:var(--foreground-strong)]">{signal.subject}</h2>
                    <div className="mt-3">
                      <NoteBridgeFields subject={signal.subject} topic={signal.derivedTags[1] ?? EMPTY_TOPIC_COPY} biggestGap={biggestGap} nextAction={nextAction} v3={isSecondRound} />
                    </div>
                    {createdAt ? <p className="mt-2 text-xs text-[color:var(--muted)]">{createdAt}</p> : null}
                    <Link href={cta.href} className="mt-3 inline-flex text-sm font-medium text-[color:var(--foreground-strong)] underline-offset-4 hover:underline">
                      {cta.label}
                    </Link>
                  </section>
                );
              })}
            </div>
          ) : null}
        </RecordsBody>
      </RecordsSurface>

      <LocalBetaNotesSection mode={mode} showEmptyMessage={false} />
    </div>
  );

  return isSecondRound ? (
    <V3RouteFrame width="reading">
      {itemsPage}
    </V3RouteFrame>
  ) : itemsPage;
}

export default async function ReviewOsItemsPage({ searchParams }: PageProps) {
  return renderReviewOsItemsPage(searchParams);
}
