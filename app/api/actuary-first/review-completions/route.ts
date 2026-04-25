import { actuaryFirstService } from "@/lib/actuary-first/service";
import { getActuaryMvpUserId, jsonOk, jsonRouteError } from "@/lib/actuary-first/http";
import type { ReviewCompletionInput } from "@/lib/actuary-first/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as ReviewCompletionInput;
    return jsonOk(await actuaryFirstService.completeReview(input, await getActuaryMvpUserId(request)));
  } catch (error) {
    return jsonRouteError(error, "Invalid actuary review completion payload");
  }
}
