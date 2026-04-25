import { actuarySecondService } from "@/lib/actuary-second/service";
import {
  getActuarySecondMvpUserId,
  jsonOk,
  jsonRouteError,
  parseActuarySecondSubjectId,
} from "@/lib/actuary-second/http";
import type { ActuarySecondVerifierInput } from "@/lib/actuary-second/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const subjectId = parseActuarySecondSubjectId(url.searchParams.get("subjectId"));
    return jsonOk(await actuarySecondService.listSubmissions(subjectId, await getActuarySecondMvpUserId(request)));
  } catch (error) {
    return jsonRouteError(error, "actuary-second-submissions-fetch-error", 500);
  }
}

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as ActuarySecondVerifierInput;
    return jsonOk(await actuarySecondService.saveSubmission(input, await getActuarySecondMvpUserId(request)));
  } catch (error) {
    return jsonRouteError(error, "Invalid actuary-second verifier payload");
  }
}
