import { notFound } from "next/navigation";

import { SubmitWorkspace } from "@/components/inverge/submit-workspace";
import { readWorkRouteParamsStrict } from "@/lib/inverge/router";

type WritePageProps = {
  params: Promise<{ examId: string; sessionId: string; subjectId: string }>;
};

export default async function WritePage({ params }: WritePageProps) {
  const route = readWorkRouteParamsStrict(await params);
  if (!route) notFound();

  return <SubmitWorkspace {...route} />;
}
