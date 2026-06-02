import { CalculatorWorkflowPage } from "@/components/review-os/calculator-workflow-page";
import { resolveAppraisalMode } from "@/lib/review-os/appraisal";
import { buildReviewOsReturnTo, getReviewOsServerContext } from "@/lib/review-os/server";
import { getCalculatorWorkflow } from "@/lib/review-os/calculator-workflow";

type PageProps = {
  searchParams?: Promise<{ context?: string; focus?: string; mode?: string }>;
};

export default async function CalculatorWorkflowRoute({ searchParams }: PageProps) {
  const params = await searchParams;
  const { session, profile } = await getReviewOsServerContext(buildReviewOsReturnTo("/app/calculator", params?.mode));
  if (!session.userId) return null;

  const mode = resolveAppraisalMode(profile, params?.mode);
  const requestedContext = params?.context;
  const fallbackContext = mode === "second" ? "practice" : "accounting";
  const context =
    requestedContext === "practice" || requestedContext === "accounting"
      ? requestedContext
      : fallbackContext;
  const workflow = getCalculatorWorkflow(context);
  const resolvedWorkflow = workflow.mode === mode ? workflow : getCalculatorWorkflow(fallbackContext);

  return <CalculatorWorkflowPage focus={params?.focus} workflow={resolvedWorkflow} />;
}
