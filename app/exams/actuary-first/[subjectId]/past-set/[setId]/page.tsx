import { ActuaryFirstPastSetSolvingPage } from "@/components/inverge/actuary-first-past-set-solving";

type RouteProps = {
  params: Promise<{ subjectId: string; setId: string }>;
};

export default async function ActuaryFirstPastSetRoute({ params }: RouteProps) {
  const { subjectId, setId } = await params;
  return <ActuaryFirstPastSetSolvingPage subjectId={subjectId} setId={setId} />;
}

