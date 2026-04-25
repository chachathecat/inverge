import { ComparisonView } from "@/components/inverge/comparison-view";
import { readWorkRouteParams } from "@/lib/inverge/router";

type ComparePageProps = {
  params: Promise<{ examId: string; sessionId: string; subjectId: string; submissionId: string }>;
};

export default async function ComparePage({ params }: ComparePageProps) {
  return <ComparisonView {...readWorkRouteParams(await params)} />;
}
