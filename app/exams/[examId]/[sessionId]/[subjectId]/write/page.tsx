import { SubmitWorkspace } from "@/components/inverge/submit-workspace";
import { readWorkRouteParams } from "@/lib/inverge/router";

type WritePageProps = {
  params: Promise<{ examId: string; sessionId: string; subjectId: string }>;
};

export default async function WritePage({ params }: WritePageProps) {
  const route = readWorkRouteParams(await params);

  return <SubmitWorkspace {...route} />;
}
