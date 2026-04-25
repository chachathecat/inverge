import { notFound } from "next/navigation";

import { RecordsView } from "@/components/inverge/records-view";
import { readWorkRouteParamsStrict } from "@/lib/inverge/router";

type RecordsPageProps = {
  params: Promise<{ examId: string; sessionId: string; subjectId: string }>;
};

export default async function RecordsPage({ params }: RecordsPageProps) {
  const route = readWorkRouteParamsStrict(await params);
  if (!route) notFound();
  return <RecordsView {...route} />;
}
