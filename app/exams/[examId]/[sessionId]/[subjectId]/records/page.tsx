import { RecordsView } from "@/components/inverge/records-view";
import { readWorkRouteParams } from "@/lib/inverge/router";

type RecordsPageProps = {
  params: Promise<{ examId: string; sessionId: string; subjectId: string }>;
};

export default async function RecordsPage({ params }: RecordsPageProps) {
  return <RecordsView {...readWorkRouteParams(await params)} />;
}
