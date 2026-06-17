import { redirect } from "next/navigation";

export default function TodayPage({ searchParams }: { searchParams?: { mode?: string } }) {
  const mode = searchParams?.mode;
  const target = mode === "second" ? "/app/session?mode=second" : mode === "first" ? "/app/session?mode=first" : "/app/session";
  redirect(target);
}
