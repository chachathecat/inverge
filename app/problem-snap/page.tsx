import ProblemSnapClientPage from "./problem-snap-client";

type PageProps = {
  searchParams?: Promise<{ mode?: string }>;
};

export default async function ProblemSnapPage({ searchParams }: PageProps) {
  const mode = (await searchParams)?.mode === "first" ? "first" : "second";
  return <ProblemSnapClientPage initialExamMode={mode} />;
}
