import { CalculatorWorkflowPage } from "@/components/review-os/calculator-workflow-page";
import { parseAppraisalMode } from "@/lib/review-os/appraisal";
import { buildReviewOsReturnTo, getReviewOsServerContext } from "@/lib/review-os/server";
import { getCalculatorWorkflow } from "@/lib/review-os/calculator-workflow";

type PageProps = {
  searchParams?: Promise<{ context?: string; mode?: string }>;
};

export default async function CalculatorWorkflowRoute({ searchParams }: PageProps) {
  const params = await searchParams;
  const mode = parseAppraisalMode(params?.mode) ?? "first";
  const context = params?.context ?? (mode === "second" ? "practice" : "accounting");
  const workflow = getCalculatorWorkflow(context);
  const { session } = await getReviewOsServerContext(buildReviewOsReturnTo("/app/calculator", workflow.mode));
  if (!session.userId) return null;

  return <CalculatorWorkflowPage workflow={workflow} />;
}
