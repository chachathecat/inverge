import { redirect } from "next/navigation";
import { getServerSessionUser } from "@/lib/auth/session";
import SecondGradingClient from "./second-grading-client";

export default async function InstructorSecondGradingPage() {
  const session = await getServerSessionUser();
  if (session.authEnabled && !session.isAuthenticated) redirect("/login?returnTo=%2Finstructor%2Fsecond-grading");
  return <SecondGradingClient />;
}
