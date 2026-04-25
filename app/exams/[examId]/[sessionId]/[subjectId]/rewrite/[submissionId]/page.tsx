import { notFound } from "next/navigation";

import { RewriteView } from "@/components/inverge/rewrite-view";
import { readWorkRouteParamsStrict } from "@/lib/inverge/router";

type RewritePageProps = {
  params: Promise<{ examId: string; sessionId: string; subjectId: string; submissionId: string }>;
};

export default async function RewritePage({ params }: RewritePageProps) {
  const route = readWorkRouteParamsStrict(await params);
  if (!route) notFound();
  return <RewriteView {...route} />;
}
