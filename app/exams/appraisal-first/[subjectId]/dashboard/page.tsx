import { AppraisalFirstSubjectDashboardPage } from "@/components/inverge/appraisal-first-subject-dashboard";

type AppraisalFirstSubjectDashboardRouteProps = {
  params: Promise<{ subjectId: string }>;
};

export default async function AppraisalFirstSubjectDashboardRoute({ params }: AppraisalFirstSubjectDashboardRouteProps) {
  const { subjectId } = await params;
  return <AppraisalFirstSubjectDashboardPage subjectId={subjectId} />;
}
