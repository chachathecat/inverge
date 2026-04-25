import { RewriteView } from "@/components/inverge/rewrite-view";
import { readWorkRouteParams } from "@/lib/inverge/router";

type RewritePageProps = {
  params: Promise<{ examId: string; sessionId: string; subjectId: string; submissionId: string }>;
};

export default async function RewritePage({ params }: RewritePageProps) {
  return <RewriteView {...readWorkRouteParams(await params)} />;
}
