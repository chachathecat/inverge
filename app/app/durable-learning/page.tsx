import { notFound } from "next/navigation";

import { DurableLearningCommand } from "@/components/review-os/durable-learning-command";
import {
  isDurableLearningAccessError,
  requireDurableLearningAccess,
} from "@/lib/review-os/durable-learning-access";

export const dynamic = "force-dynamic";

export default async function DurableLearningPage() {
  let ownerScope: string;
  try {
    const access = await requireDurableLearningAccess();
    ownerScope = access.userId;
  } catch (error) {
    if (isDurableLearningAccessError(error)) notFound();
    throw error;
  }
  return <DurableLearningCommand ownerScope={ownerScope} />;
}
