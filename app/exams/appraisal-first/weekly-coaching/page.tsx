import { AppraisalFirstWeeklyCoachingClient } from "@/components/inverge/appraisal-first-weekly-coaching-client";
import { appraisalFirstService } from "@/lib/appraisal-first/service";
import { requireServerSession } from "@/lib/auth/session";

export default async function AppraisalFirstWeeklyCoachingPage() {
  const session = await requireServerSession("/exams/appraisal-first/weekly-coaching");
  const plan = await appraisalFirstService.getOrCreateWeeklyCoaching(session.userId!);
  return <AppraisalFirstWeeklyCoachingClient plan={plan} />;
}
