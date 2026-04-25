import { AppraisalFirstReviewQueuePage } from "@/components/inverge/appraisal-first-review-queue";

type AppraisalFirstReviewRouteProps = {
  params: Promise<{ subjectId: string }>;
};

export default async function AppraisalFirstReviewRoute({ params }: AppraisalFirstReviewRouteProps) {
  const { subjectId } = await params;
  return <AppraisalFirstReviewQueuePage subjectId={subjectId} />;
}
