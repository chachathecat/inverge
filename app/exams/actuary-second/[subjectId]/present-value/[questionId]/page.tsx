import { ActuarySecondProblemWorkspace } from "@/components/inverge/actuary-second-problem-workspace";

type RouteProps = {
  params: Promise<{ subjectId: string; questionId: string }>;
};

export default async function ActuarySecondProblemRoute({ params }: RouteProps) {
  const { questionId } = await params;
  return <ActuarySecondProblemWorkspace questionId={questionId} />;
}
