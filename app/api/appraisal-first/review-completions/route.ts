import { parseSubjectId, getMvpUserId, jsonOk, jsonRouteError } from "@/lib/appraisal-first/http";
import { appraisalFirstRepository } from "@/lib/appraisal-first/file-repository";
import { appraisalFirstService } from "@/lib/appraisal-first/service";
import type { ReviewCompletionInput } from "@/lib/appraisal-first/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const subjectId = parseSubjectId(url.searchParams.get("subjectId"));
    return jsonOk(await appraisalFirstRepository.listReviewCompletions(await getMvpUserId(request), subjectId));
  } catch (error) {
    return jsonRouteError(error, "review-completions-fetch-error", 500);
  }
}

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as ReviewCompletionInput;
    return jsonOk(await appraisalFirstService.completeReview(input, await getMvpUserId(request)));
  } catch (error) {
    return jsonRouteError(error, "Invalid review completion payload");
  }
}
