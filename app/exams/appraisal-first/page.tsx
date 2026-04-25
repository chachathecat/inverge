import { AppraisalFirstSubjectHub } from "@/components/inverge/appraisal-first-subject-hub";
import { getServerSessionUser } from "@/lib/auth/session";
import { buildAppraisalFirstHubState } from "@/lib/inverge/appraisal-first-hub";

export default async function AppraisalFirstHomePage() {
  const session = await getServerSessionUser();
  const userId = session.userId ?? "mvp-user";
  const state = await buildAppraisalFirstHubState(userId);

  return <AppraisalFirstSubjectHub state={state} />;
}
