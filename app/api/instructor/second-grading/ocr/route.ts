import { NextResponse } from "next/server";

import { isAllowedAdminEmail } from "@/lib/auth/admin";
import { getServerSessionUser } from "@/lib/auth/session";
import { extractTranscriptionFromImages, GeminiEnvError, isGeminiConfigured } from "@/lib/evaluate/gemini";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await getServerSessionUser();
  if (session.authEnabled && !session.isAuthenticated) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }

  if (!session.isAuthenticated || !isAllowedAdminEmail(session.email)) {
    return NextResponse.json({ ok: false, error: "접근 권한이 필요합니다." }, { status: 403 });
  }

  if (!isGeminiConfigured()) {
    return NextResponse.json({ ok: false, errorCode: "GEMINI_NOT_CONFIGURED", error: "Gemini OCR 설정이 필요합니다." }, { status: 503 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size <= 0) {
      return NextResponse.json({ ok: false, error: "OCR할 이미지/PDF 파일을 선택해 주세요." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ ok: false, error: "파일 용량이 너무 큽니다. 20MB 이하 파일만 업로드해 주세요." }, { status: 413 });
    }

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isImage = file.type.startsWith("image/");
    if (!isPdf && !isImage) {
      return NextResponse.json({ ok: false, error: "지원하지 않는 파일 형식입니다. 이미지 또는 PDF만 업로드해 주세요." }, { status: 415 });
    }

    const text = (await extractTranscriptionFromImages([file])).trim();
    if (!text) {
      return NextResponse.json({ ok: false, error: "OCR 결과가 비어 있습니다. 원문이 잘 보이도록 다시 촬영하거나 파일을 바꿔 주세요." }, { status: 422 });
    }

    return NextResponse.json({ ok: true, text });
  } catch (error) {
    if (error instanceof GeminiEnvError) {
      return NextResponse.json({ ok: false, errorCode: "GEMINI_NOT_CONFIGURED", error: "Gemini OCR 설정이 필요합니다." }, { status: 503 });
    }
    return NextResponse.json({ ok: false, error: "OCR 처리에 실패했습니다. 파일을 다시 확인해 주세요." }, { status: 500 });
  }
}
