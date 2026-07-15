import { CalculatorWorkflowPage } from "@/components/review-os/calculator-workflow-page";
import { ReviewOsAccessState } from "@/components/review-os/review-os-access-state";
import { resolveAppraisalMode } from "@/lib/review-os/appraisal";
import { buildReviewOsReturnTo, getReviewOsServerContext } from "@/lib/review-os/server";
import { getCalculatorWorkflow } from "@/lib/review-os/calculator-workflow";
import { parseCalculatorRoutineRecoveryReference } from "@/lib/review-os/calculator-routine-learning-signal";

type PageProps = {
  searchParams?: Promise<{
    context?: string;
    focus?: string;
    mode?: string;
    recoveryRoutineId?: string;
    recoverySource?: string;
  }>;
};

export default async function CalculatorWorkflowRoute({ searchParams }: PageProps) {
  const params = await searchParams;
  const { session, access, profile } = await getReviewOsServerContext(buildReviewOsReturnTo("/app/calculator", params?.mode));
  if (access.status !== "allowed") return <ReviewOsAccessState access={access} embedded />;
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
  const recoveryReference = (() => {
    if (mode !== "second" || context !== "practice" || params?.focus !== "casio") return null;
    try {
      return parseCalculatorRoutineRecoveryReference({
        metadataOnly: true,
        routineId: params?.recoveryRoutineId,
        source: params?.recoverySource,
      });
    } catch {
      return null;
    }
  })();

  return <CalculatorWorkflowPage focus={params?.focus} workflow={resolvedWorkflow} recoveryReference={recoveryReference} />;
}
