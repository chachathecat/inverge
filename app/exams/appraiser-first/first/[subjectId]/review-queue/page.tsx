import { redirect } from "next/navigation";

import { normalizeAppraisalFirstSubjectId } from "@/lib/appraisal-first/subject-id";

type ReviewQueuePageProps = {
  params: Promise<{ subjectId: string }>;
};

export default async function AppraiserFirstReviewQueuePage({ params }: ReviewQueuePageProps) {
  const { subjectId } = await params;
  redirect(`/exams/appraisal-first/${normalizeAppraisalFirstSubjectId(subjectId)}/review`);
}
