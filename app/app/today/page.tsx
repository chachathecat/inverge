import { redirect } from "next/navigation";

type PageProps = {
  searchParams?: Promise<{ mode?: string }>;
};

export default async function TodayPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const mode = query?.mode;

  if (mode === "second") {
    redirect("/app?mode=second");
  }

  if (mode === "first") {
    redirect("/app?mode=first");
  }

  redirect("/app");
}
