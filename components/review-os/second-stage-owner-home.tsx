import Link from "next/link";

import {
  V3ActionLink,
  V3QuietDisclosure,
  V3RouteFrame,
  V3RouteHeader,
  V3Surface,
} from "@/components/learner";
import type { SecondStageOwnerHomeView } from "@/lib/review-os/second-stage-owner-home";

export function SecondStageOwnerHome({ view }: { view: SecondStageOwnerHomeView }) {
  return (
    <V3RouteFrame className="space-y-7" width="content">
      <V3RouteHeader
        eyebrow="감정평가사 2차 · Owner"
        title="실무·이론·법규, 지금 할 한 가지"
        description="세 과목의 기존 저장 상태를 확인해 지금 이어갈 작업 하나를 먼저 보여줍니다."
        titleId="second-stage-owner-home-title"
      />

      <div data-second-stage-owner-primary>
      <V3Surface
        as="section"
        tone={view.primaryAction.kind === "retry" ? "attention" : "focus"}
        labelledBy="second-stage-owner-primary-title"
      >
        <p className="v3-type-caption text-[var(--color-text-brand)]">오늘의 한 가지</p>
        <h2
          id="second-stage-owner-primary-title"
          className="v3-type-section ko-keep mt-1 text-[var(--color-text-primary)]"
        >
          {view.primaryAction.label}
        </h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-3" data-second-stage-owner-primary-context>
          <div>
            <dt className="v3-type-label text-[var(--color-text-secondary)]">왜 지금</dt>
            <dd className="v3-type-compact ko-keep mt-1 text-[var(--color-text-primary)]">
              {view.primaryAction.reason}
            </dd>
          </div>
          <div>
            <dt className="v3-type-label text-[var(--color-text-secondary)]">예상 시간</dt>
            <dd className="v3-type-compact mt-1 text-[var(--color-text-primary)]">
              {view.primaryAction.estimatedMinutes}
            </dd>
          </div>
          <div>
            <dt className="v3-type-label text-[var(--color-text-secondary)]">끝나면</dt>
            <dd className="v3-type-compact ko-keep mt-1 text-[var(--color-text-primary)]">
              {view.primaryAction.after}
            </dd>
          </div>
        </dl>
        <div className="mt-6" data-second-stage-owner-primary-cta>
          <V3ActionLink href={view.primaryAction.href} tone="primary">
            {view.primaryAction.label}
          </V3ActionLink>
        </div>
      </V3Surface>
      </div>

      <section aria-labelledby="second-stage-owner-subjects-title" className="space-y-4">
        <div>
          <p className="v3-type-caption text-[var(--color-text-secondary)]">
            과목별 상태 · {view.admittedSubjectCount}/3 사용 가능
          </p>
          <h2
            id="second-stage-owner-subjects-title"
            className="v3-type-section ko-keep mt-1 text-[var(--color-text-primary)]"
          >
            세 과목의 현재 위치
          </h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-3" data-second-stage-owner-subjects>
          {view.subjects.map((subject) => (
            <div
              key={subject.subjectId}
              data-second-stage-owner-subject={subject.subjectId}
              data-second-stage-owner-status={subject.status}
            >
            <V3Surface
              as="section"
              density="compact"
              tone={subject.status === "due" || subject.status === "resume" ? "attention" : subject.status === "stable" ? "stable" : "surface"}
              labelledBy={`second-stage-owner-${subject.subjectId}-title`}
              className="h-full"
            >
              <p className="v3-type-caption text-[var(--color-text-secondary)]">
                {subject.statusLabel}
              </p>
              <h3
                id={`second-stage-owner-${subject.subjectId}-title`}
                className="v3-type-body-strong ko-keep mt-1 text-[var(--color-text-primary)]"
              >
                {subject.label}
              </h3>
              <p className="v3-type-compact ko-keep mt-3 text-[var(--color-text-secondary)]">
                {subject.description}
              </p>
              {subject.href && subject.linkLabel ? (
                <Link
                  href={subject.href}
                  className="v3-type-label-strong mt-4 inline-flex min-h-11 items-center text-[var(--color-text-primary)] underline underline-offset-4"
                >
                  {subject.linkLabel}
                </Link>
              ) : null}
            </V3Surface>
            </div>
          ))}
        </div>
      </section>

      <V3QuietDisclosure
        summary="기존 2차 흐름 보기"
        helper="일반 답안 업로드와 오늘 화면은 기존 학습 기록을 그대로 사용합니다."
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <V3ActionLink href="/app/capture?mode=second" tone="quiet" fullWidth>
            새 답안 올리기
          </V3ActionLink>
          <V3ActionLink href="/app?mode=second" tone="quiet" fullWidth>
            오늘 화면 보기
          </V3ActionLink>
        </div>
      </V3QuietDisclosure>
    </V3RouteFrame>
  );
}
