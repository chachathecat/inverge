import { actuaryFirstService } from "@/lib/actuary-first/service";
import { getActuaryMvpUserId, jsonOk, jsonRouteError, parseActuarySubjectId } from "@/lib/actuary-first/http";
import type { ProbabilitySetSubmissionInput } from "@/lib/actuary-first/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const subjectId = parseActuarySubjectId(url.searchParams.get("subjectId"));
    return jsonOk(await actuaryFirstService.listSetSubmissions(subjectId, await getActuaryMvpUserId(request)));
  } catch (error) {
    return jsonRouteError(error, "actuary-set-submissions-fetch-error", 500);
  }
}

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as ProbabilitySetSubmissionInput;
    return jsonOk(await actuaryFirstService.saveSetSubmission(input, await getActuaryMvpUserId(request)));
  } catch (error) {
    return jsonRouteError(error, "Invalid actuary set submission payload");
  }
}
