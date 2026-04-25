import { notFound } from "next/navigation";

import { ExamHomeDashboard } from "@/components/inverge/entry-screens";
import { readWorkRouteParamsStrict } from "@/lib/inverge/router";

type ExamHomePageProps = {
  params: Promise<{ examId: string; sessionId: string; subjectId: string }>;
};

export default async function ExamHomePage({ params }: ExamHomePageProps) {
  const route = readWorkRouteParamsStrict(await params);
  if (!route) notFound();
  return <ExamHomeDashboard {...route} />;
}
