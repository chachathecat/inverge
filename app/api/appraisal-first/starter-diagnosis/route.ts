import { appraisalFirstService } from "@/lib/appraisal-first/service";
import { getMvpUserId, jsonOk, jsonRouteError } from "@/lib/appraisal-first/http";
import type { StarterDiagnosisInput } from "@/lib/appraisal-first/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    return jsonOk(await appraisalFirstService.getStarterDiagnosis(await getMvpUserId(request)));
  } catch (error) {
    return jsonRouteError(error, "starter-diagnosis-fetch-error", 500);
  }
}

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as StarterDiagnosisInput;
    return jsonOk(await appraisalFirstService.saveStarterDiagnosis(input, await getMvpUserId(request)));
  } catch (error) {
    return jsonRouteError(error, "Invalid starter diagnosis payload");
  }
}
