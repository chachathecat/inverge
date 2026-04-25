import { ExamHome } from "@/components/inverge/exam-home";
import { getServerSessionUser } from "@/lib/auth/session";
import { buildActuaryHomeState } from "@/lib/inverge/exam-home";

export default async function ActuaryExamHomePage() {
  const session = await getServerSessionUser();
  const userId = session.userId ?? "mvp-user";
  const state = await buildActuaryHomeState(userId);

  return <ExamHome state={state} />;
}
