import { appraisalFirstService } from "@/lib/appraisal-first/service";
import { getMvpUserId, jsonOk, jsonRouteError } from "@/lib/appraisal-first/http";
import type { AppraisalFirstOnboardingInput } from "@/lib/appraisal-first/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    return jsonOk(await appraisalFirstService.getOnboarding(await getMvpUserId(request)));
  } catch (error) {
    return jsonRouteError(error, "Invalid onboarding payload");
  }
}

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as AppraisalFirstOnboardingInput;
    return jsonOk(await appraisalFirstService.saveOnboarding(input, await getMvpUserId(request)));
  } catch (error) {
    return jsonRouteError(error, "Invalid onboarding payload");
  }
}
