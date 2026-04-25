import { ExamHomeDashboard } from "@/components/inverge/entry-screens";
import { readWorkRouteParams } from "@/lib/inverge/router";

type ExamHomePageProps = {
  params: Promise<{ examId: string; sessionId: string; subjectId: string }>;
};

export default async function ExamHomePage({ params }: ExamHomePageProps) {
  return <ExamHomeDashboard {...readWorkRouteParams(await params)} />;
}
