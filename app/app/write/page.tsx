import { redirect } from "next/navigation";

import {
  V3ActionLink,
  V3QuietDisclosure,
  V3RouteFrame,
  V3SectionHeader,
  V3Surface,
} from "@/components/learner";
import { WrongAnswerCaptureForm } from "@/components/review-os/capture-form";
import { ReviewOsFeedbackButton } from "@/components/review-os/feedback-button";
import { ReviewOsAccessState } from "@/components/review-os/review-os-access-state";
import { resolveAppraisalMode } from "@/lib/review-os/appraisal";
import { buildReviewOsReturnTo, getReviewOsServerContext } from "@/lib/review-os/server";

type PageProps = {
  searchParams?: Promise<{ mode?: string }>;
};

export default async function ReviewOsWritePage({ searchParams }: PageProps) {
  const modeParam = (await searchParams)?.mode;
  const { session, access, profile } = await getReviewOsServerContext(buildReviewOsReturnTo("/app/write", modeParam));
  if (access.status !== "allowed") return <ReviewOsAccessState access={access} embedded />;
  if (!session.userId) return null;

  const mode = resolveAppraisalMode(profile, modeParam);
  if (mode !== "second") {
    redirect(`/app/capture?mode=${mode}`);
  }

  return (
    <div
      data-s224v-surface="/app/write"
      data-s232e-write-flow="capture-form"
      data-s232e-second-write-page
    >
      <V3RouteFrame className="space-y-7">
      <header className="max-w-[var(--layout-reading-column)] space-y-2" data-v3-layout="route-header">
        <p className="v3-type-caption text-[var(--color-text-secondary)]">다시쓰기 · 한 단계씩</p>
        <h1 id="write-page-title" className="v3-type-screen hero-balance ko-keep text-[var(--color-text-primary)]">
          새 답안 작성
        </h1>
        <p className="v3-type-body ko-keep text-[var(--color-text-secondary)]">
          먼저 회상하고 작성한 뒤, 참고 정리와 비교해 가장 큰 약점 1개를 고칩니다.
        </p>
      </header>

      <V3Surface as="section" className="space-y-5">
        <V3SectionHeader
          eyebrow="감정평가사 2차"
          title="새 답안 작성하기"
          description="쟁점 회상에서 문단 다시쓰기까지 한 흐름으로 진행합니다."
        />
        <div>
          <WrongAnswerCaptureForm
            userId={session.userId}
            mode={mode}
            labelledBy="write-page-title"
            workflow="second-write"
            initialPreferredSubjects={profile?.preferredSubjects}
          />
        </div>
      </V3Surface>

      <V3QuietDisclosure
        summary="다른 시작 방법"
        helper="이미 쓴 답안이나 문제부터 확인해야 할 때만 선택하세요."
      >
        <div className="grid gap-2 sm:grid-cols-3">
          <V3ActionLink href="/answer-review?mode=second" tone="secondary" fullWidth>
            답안 스냅 검토
          </V3ActionLink>
          <V3ActionLink href="/answer-review?mode=second&intent=case" tone="secondary" fullWidth>
            사례 스캔
          </V3ActionLink>
          <V3ActionLink href="/problem-snap?mode=second" tone="secondary" fullWidth>
            문제 먼저 이해하기
          </V3ActionLink>
        </div>
      </V3QuietDisclosure>

      <ReviewOsFeedbackButton route="/app/write" pageContext={{ section: "write", mode }} presentation={mode === "second" ? "v3" : "legacy"} />
      </V3RouteFrame>
    </div>
  );
}
