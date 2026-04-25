import { ExamHome } from "@/components/inverge/exam-home";
import { getServerSessionUser } from "@/lib/auth/session";
import { buildAppraiserHomeState } from "@/lib/inverge/exam-home";

export default async function AppraiserExamHomePage() {
  const session = await getServerSessionUser();
  const userId = session.userId ?? "mvp-user";
  const state = await buildAppraiserHomeState(userId);

  return <ExamHome state={state} />;
}
