import { parseSubjectId, getMvpUserId, jsonOk, jsonRouteError } from "@/lib/appraisal-first/http";
import { appraisalFirstRepository } from "@/lib/appraisal-first/file-repository";
import { appraisalFirstService } from "@/lib/appraisal-first/service";
import type { SetSubmissionInput } from "@/lib/appraisal-first/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const subjectId = parseSubjectId(url.searchParams.get("subjectId"));
    return jsonOk(await appraisalFirstRepository.listSetSubmissions(await getMvpUserId(request), subjectId));
  } catch (error) {
    return jsonRouteError(error, "set-submissions-fetch-error", 500);
  }
}

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as SetSubmissionInput;
    return jsonOk(await appraisalFirstService.saveSetSubmission(input, await getMvpUserId(request)));
  } catch (error) {
    return jsonRouteError(error, "Invalid set submission payload");
  }
}
