import { AppraisalFirstRecordsPage } from "@/components/inverge/appraisal-first-records";

type AppraisalFirstRecordsRouteProps = {
  params: Promise<{ subjectId: string }>;
};

export default async function AppraisalFirstRecordsRoute({ params }: AppraisalFirstRecordsRouteProps) {
  const { subjectId } = await params;
  return <AppraisalFirstRecordsPage subjectId={subjectId} />;
}
