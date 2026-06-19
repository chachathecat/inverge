import ProblemSnapClientPage from "./problem-snap-client";

type PageProps = {
  searchParams?: Promise<{ mode?: string; subject?: string }>;
};

export default async function ProblemSnapPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const mode = query?.mode === "first" ? "first" : "second";
  const subject = typeof query?.subject === "string" ? query.subject : undefined;
  return <ProblemSnapClientPage initialExamMode={mode} initialSubject={subject} />;
}
