import { redirect } from "next/navigation";

import { normalizeAppraisalFirstSubjectId } from "@/lib/appraisal-first/subject-id";

type SetInputPageProps = {
  params: Promise<{ subjectId: string }>;
};

export default async function AppraiserFirstSetInputPage({ params }: SetInputPageProps) {
  const { subjectId } = await params;
  redirect(`/exams/appraisal-first/${normalizeAppraisalFirstSubjectId(subjectId)}/past-set/intro-10`);
}
