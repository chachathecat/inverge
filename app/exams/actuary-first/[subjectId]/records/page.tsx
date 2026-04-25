import { ActuaryFirstRecordsPage } from "@/components/inverge/actuary-first-records";

type RouteProps = {
  params: Promise<{ subjectId: string }>;
};

export default async function ActuaryFirstRecordsRoute({ params }: RouteProps) {
  const { subjectId } = await params;
  return <ActuaryFirstRecordsPage subjectId={subjectId} />;
}
