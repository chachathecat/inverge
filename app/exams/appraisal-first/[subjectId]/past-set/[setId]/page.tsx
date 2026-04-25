import { AppraisalFirstPastSetSolvingPage } from "@/components/inverge/appraisal-first-past-set-solving";

type AppraisalFirstPastSetRouteProps = {
  params: Promise<{ subjectId: string; setId: string }>;
};

export default async function AppraisalFirstPastSetRoute({ params }: AppraisalFirstPastSetRouteProps) {
  const { subjectId, setId } = await params;
  return <AppraisalFirstPastSetSolvingPage subjectId={subjectId} setId={setId} />;
}
