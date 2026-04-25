import { appraisalFirstService } from "@/lib/appraisal-first/service";
import { getMvpUserId, jsonOk, jsonRouteError, parseSubjectId } from "@/lib/appraisal-first/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const subjectId = parseSubjectId(url.searchParams.get("subjectId"));
    return jsonOk(await appraisalFirstService.listReviewQueue(subjectId, await getMvpUserId(request)));
  } catch (error) {
    return jsonRouteError(error, "review-queue-fetch-error", 500);
  }
}
