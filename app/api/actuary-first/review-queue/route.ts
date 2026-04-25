import { actuaryFirstService } from "@/lib/actuary-first/service";
import { getActuaryMvpUserId, jsonOk, jsonRouteError, parseActuarySubjectId } from "@/lib/actuary-first/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const subjectId = parseActuarySubjectId(url.searchParams.get("subjectId"));
    return jsonOk(await actuaryFirstService.listReviewQueue(subjectId, await getActuaryMvpUserId(request)));
  } catch (error) {
    return jsonRouteError(error, "actuary-review-queue-fetch-error", 500);
  }
}
