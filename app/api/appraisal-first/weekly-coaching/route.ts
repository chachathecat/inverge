import { appraisalFirstService } from "@/lib/appraisal-first/service";
import { getMvpUserId, jsonOk, jsonRouteError } from "@/lib/appraisal-first/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    return jsonOk(await appraisalFirstService.getOrCreateWeeklyCoaching(await getMvpUserId(request)));
  } catch (error) {
    return jsonRouteError(error, "weekly-coaching-fetch-error", 500);
  }
}

export async function POST(request: Request) {
  try {
    return jsonOk(await appraisalFirstService.getOrCreateWeeklyCoaching(await getMvpUserId(request)));
  } catch (error) {
    return jsonRouteError(error, "weekly-coaching-save-error", 500);
  }
}
