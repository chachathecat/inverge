import { ActuarySecondRecordsPage } from "@/components/inverge/actuary-second-records";

type RouteProps = {
  params: Promise<{ subjectId: string }>;
};

export default async function ActuarySecondRecordsRoute({ params }: RouteProps) {
  const { subjectId } = await params;
  return <ActuarySecondRecordsPage subjectId={subjectId} />;
}
