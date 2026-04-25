import { ActuaryFirstReviewQueuePage } from "@/components/inverge/actuary-first-review-queue";

type RouteProps = {
  params: Promise<{ subjectId: string }>;
};

export default async function ActuaryFirstReviewRoute({ params }: RouteProps) {
  const { subjectId } = await params;
  return <ActuaryFirstReviewQueuePage subjectId={subjectId} />;
}

