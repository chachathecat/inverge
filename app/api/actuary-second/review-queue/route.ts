import { actuarySecondService } from "@/lib/actuary-second/service";
import { getActuarySecondMvpUserId, jsonOk, jsonRouteError, parseActuarySecondSubjectId } from "@/lib/actuary-second/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const subjectId = parseActuarySecondSubjectId(url.searchParams.get("subjectId"));
    return jsonOk(await actuarySecondService.listReviewQueue(subjectId, await getActuarySecondMvpUserId(request)));
  } catch (error) {
    return jsonRouteError(error, "actuary-second-review-queue-fetch-error", 500);
  }
}
