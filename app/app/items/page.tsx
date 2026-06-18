import Link from "next/link";

import { LocalBetaNotesSection } from "@/components/review-os/local-beta-note-reflection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getModeConfig, resolveAppraisalMode, type AppraisalMode } from "@/lib/review-os/appraisal";
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
  if (sourceType === "answer_review") return "답안 검토 기록";
  if (sourceType === "review_queue") return "복습 예정";
  if (sourceType === "wrong_answer") return "학습 노트";
  return "학습 기록";
}

function signalCta(signal: Pick<LearningSignalEventRecord, "sourceType" | "subject">, mode: AppraisalMode) {
  if (signal.sourceType === "problem-snap") {
    return mode === "second"
      ? { label: "답안 검토로 보기", href: `/answer-review?mode=${mode}&subject=${encodeURIComponent(signal.subject)}` }
      : { label: "다시 풀기", href: `/problem-snap?mode=${mode}&subject=${encodeURIComponent(signal.subject)}` };
  }

  if (signal.sourceType === "answer_review") {
    return { label: "답안 검토하기", href: `/answer-review?mode=${mode}` };
  }

  return { label: "오늘 할 일에서 보기", href: `/app?mode=${mode}` };
}

function NoteBridgeFields({
  subject,
  topic,
  biggestGap,
  nextAction,
}: {
  subject: string;
  topic: string;
  biggestGap: string;
  nextAction: string;
}) {
  return (
    <dl className="grid gap-3 text-sm md:grid-cols-2">
      <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-3">
        <dt className="text-xs text-[color:var(--muted)]">과목</dt>
        <dd className="mt-1 text-[color:var(--foreground-strong)]">{subject}</dd>
      </div>
      <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-3">
        <dt className="text-xs text-[color:var(--muted)]">논점 후보</dt>
        <dd className="mt-1 text-[color:var(--foreground-strong)]">{topic}</dd>
      </div>
      <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-3">
        <dt className="text-xs text-[color:var(--muted)]">가장 큰 약점</dt>
        <dd className="mt-1 text-[color:var(--foreground-strong)]">{biggestGap}</dd>
      </div>
      <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-3">
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
  const { session, profile } = await getReviewOsServerContext(buildReviewOsReturnTo(routePath, modeParam));
  if (!session.userId || !session.email) return null;

  const mode = resolveAppraisalMode(profile, modeParam);
  const config = getModeConfig(mode);
  const items = (await reviewOsService.listWrongAnswerItems(session.userId, session.email, 60).catch(() => [])).filter(
    (item) => item.examName === config.label,
  );
  const learningSignals = await reviewOsService.listLearningSignalEvents(session.userId, session.email, mode, 20).catch(() => []);
  const hasItems = items.length > 0;
  const hasLearningSignals = learningSignals.length > 0;
  const isNotesRoute = routePath === "/app/notes";
  const pageTitle = isNotesRoute ? "학습 노트" : "학습 기록";
  const helperCopy = isNotesRoute
    ? "오늘 한 것에서 만든 가장 큰 약점과 다음 행동을 모아봅니다."
    : "학습 노트와 복습 흐름을 기록으로 확인합니다.";

  return (
    <div className="space-y-6">
      <Card className="border-[var(--border)] bg-[color:var(--surface)] shadow-none">
        <CardHeader className="space-y-2">
          <CardTitle>{pageTitle}</CardTitle>
          <CardDescription>{helperCopy}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasItems && !hasLearningSignals ? (
            <div className="space-y-4 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-[color:var(--foreground-strong)]">아직 쌓인 학습 노트가 없습니다.</p>
                <p className="text-sm text-[color:var(--muted)]">오늘 한 것을 하나 올리면 가장 큰 약점과 다음 행동이 만들어집니다.</p>
              </div>
              <Link href={`/app/capture?mode=${mode}`} className="inline-flex w-full sm:w-auto">
                <Button type="button" className="w-full sm:w-auto">
                  오늘 한 것 올리기
                </Button>
              </Link>
            </div>
          ) : null}

          {savedParam ? (
            <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] px-4 py-3">
              <p className="text-sm font-medium text-[color:var(--foreground-strong)]">방금 저장한 학습 노트가 반영되었습니다.</p>
              <p className="mt-1 text-sm text-[color:var(--muted)]">
                가장 큰 약점 1개와 다음 행동 1개를 먼저 확인하고, 오늘 할 일에 반영할 후보로 이어갑니다.
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
              {items.map((item) => {
                const topic = resolveTopicCandidate(item);
                const biggestGap = resolveBiggestGap(item);
                const nextAction = resolveNextAction(item, mode);
                const createdAt = formatCreatedDate(item.createdAt);

                return (
                  <section key={item.id} className="rounded-[var(--radius-lg)] border border-[var(--border)] px-4 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)] px-3 py-1 text-xs text-[color:var(--muted)]">
                            학습 노트
                          </span>
                          <span className="rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)] px-3 py-1 text-xs text-[color:var(--muted)]">
                            Review 연결: 복습 예정
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
                      <NoteBridgeFields subject={item.subjectLabel} topic={topic} biggestGap={biggestGap} nextAction={nextAction} />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-[color:var(--muted)]">
                      <span>Today 연결: 오늘 할 일에 반영할 후보</span>
                      <span>Review 연결: 다시 풀기/다시 쓰기 복습 예정</span>
                      <span>Agenda 연결: 학습 기록</span>
                    </div>
                  </section>
                );
              })}
            </div>
          ) : null}

          {!hasItems && hasLearningSignals ? (
            <div className="space-y-3">
              {learningSignals.slice(0, 8).map((signal) => {
                const createdAt = formatCreatedDate(signal.createdAt);
                const biggestGap = signal.derivedTags[0] ?? "최근 학습 신호";
                const nextAction = signal.nextTask || (mode === "second" ? "문단 하나를 다시 씁니다." : "놓친 조건 1개를 회상합니다.");
                const cta = signalCta(signal, mode);

                return (
                  <section key={signal.id} className="rounded-[var(--radius-lg)] border border-[var(--border)] px-4 py-4">
                    <p className="text-xs font-medium text-[color:var(--muted)]">{sourceTypeLabel(signal.sourceType)}</p>
                    <h2 className="mt-1 text-sm font-medium text-[color:var(--foreground-strong)]">{signal.subject}</h2>
                    <div className="mt-3">
                      <NoteBridgeFields subject={signal.subject} topic={signal.derivedTags[1] ?? EMPTY_TOPIC_COPY} biggestGap={biggestGap} nextAction={nextAction} />
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
        </CardContent>
      </Card>

      <LocalBetaNotesSection mode={mode} />
    </div>
  );
}

export default async function ReviewOsItemsPage({ searchParams }: PageProps) {
  return renderReviewOsItemsPage(searchParams);
}
