import { notFound } from "next/navigation";

import { FirstStageMcqLoop } from "@/components/review-os/first-stage-mcq-loop";
import { getServerSessionUser } from "@/lib/auth/session";
import {
  FIRST_STAGE_FEATURE_FLAG,
  FIRST_STAGE_OWNER_ALLOWLIST,
} from "@/lib/review-os/first-stage/kernel";

export const dynamic = "force-dynamic";

function emails(value: string | undefined) {
  return (value ?? "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
}

function productionDenied() {
  if (process.env.VERCEL_ENV === "production") return true;
  return process.env.NODE_ENV === "production" && process.env.VERCEL_ENV !== "preview";
}

export default async function FirstStageOwnerPage() {
  if (process.env[FIRST_STAGE_FEATURE_FLAG] !== "true" || productionDenied()) notFound();
  const session = await getServerSessionUser();
  const email = session.email?.trim().toLowerCase() ?? "";
  if (
    !session.isAuthenticated ||
    !session.userId ||
    !email ||
    !emails(process.env.ALPHA_ADMIN_EMAILS).includes(email) ||
    !emails(process.env[FIRST_STAGE_OWNER_ALLOWLIST]).includes(email)
  ) notFound();
  return <FirstStageMcqLoop />;
}
