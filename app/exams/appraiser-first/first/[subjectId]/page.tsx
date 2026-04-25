import { redirect } from "next/navigation";

import { normalizeAppraisalFirstSubjectId } from "@/lib/appraisal-first/subject-id";

type SubjectPageProps = {
  params: Promise<{ subjectId: string }>;
};

export default async function AppraiserFirstSubjectPage({ params }: SubjectPageProps) {
  const { subjectId } = await params;
  redirect(`/exams/appraisal-first/${normalizeAppraisalFirstSubjectId(subjectId)}/dashboard`);
}
