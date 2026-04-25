import { NextResponse } from "next/server";

import { evaluateSubmission } from "@/lib/evaluate";
import { consumeRateLimit } from "@/lib/rate-limit";
import type { EvaluateRequestBody } from "@/types/evaluation";

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

async function parseRequest(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const answer = String(formData.get("answer") ?? "");
    const imageFiles = formData
      .getAll("images")
      .filter((item): item is File => item instanceof File && item.size > 0);

    return { answer, imageFiles };
  }

  const jsonBody = (await request.json()) as EvaluateRequestBody;
  return { answer: jsonBody.answer ?? "", imageFiles: [] as File[] };
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rate = consumeRateLimit(ip);

  if (!rate.allowed) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 },
    );
  }

  try {
    const { answer, imageFiles } = await parseRequest(request);

    if (!answer.trim() && imageFiles.length === 0) {
      return NextResponse.json(
        { error: "답안 텍스트 또는 이미지 최소 1개가 필요합니다." },
        { status: 400 },
      );
    }

    const evaluated = await evaluateSubmission({
      answer: answer.trim(),
      imageFiles,
    });

    return NextResponse.json(evaluated);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "분석 엔진 호출에 실패했습니다. 잠시 후 다시 시도해 주세요.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
