import { notFound } from "next/navigation";

import { ComparisonView } from "@/components/inverge/comparison-view";
import { readWorkRouteParamsStrict } from "@/lib/inverge/router";

type ComparePageProps = {
  params: Promise<{ examId: string; sessionId: string; subjectId: string; submissionId: string }>;
};

export default async function ComparePage({ params }: ComparePageProps) {
  const route = readWorkRouteParamsStrict(await params);
  if (!route) notFound();
  return <ComparisonView {...route} />;
}
