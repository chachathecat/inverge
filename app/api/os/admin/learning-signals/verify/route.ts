import { NextResponse } from "next/server";

import { isAllowedAdminEmail } from "@/lib/auth/admin";
import { getServerSessionUser } from "@/lib/auth/session";
import { reviewOsService } from "@/lib/review-os/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSessionUser();
    if (session.authEnabled && !session.isAuthenticated) {
      return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
    }
    if (!isAllowedAdminEmail(session.email)) {
      return NextResponse.json({ ok: false, error: "admin-required" }, { status: 403 });
    }
    if (!session.userId) {
      return NextResponse.json({ ok: false, error: "사용자 정보를 확인할 수 없습니다." }, { status: 400 });
    }

    const [firstCount, secondCount, firstRecent, secondRecent] = await Promise.all([
      reviewOsService.countLearningSignalEvents(session.userId, "first"),
      reviewOsService.countLearningSignalEvents(session.userId, "second"),
      reviewOsService.listLearningSignalEvents(session.userId, "first", 5),
      reviewOsService.listLearningSignalEvents(session.userId, "second", 5),
    ]);

    return NextResponse.json({
      ok: true,
      summary: {
        firstCount,
        secondCount,
      },
      recent: {
        first: firstRecent.map((item) => ({
          id: item.id,
          subject: item.subject,
          sourceType: item.sourceType,
          nextTaskType: item.nextTaskType,
          derivedTagsCount: item.derivedTags.length,
          relatedFormulasCount: item.relatedFormulas.length,
          createdAt: item.createdAt,
        })),
        second: secondRecent.map((item) => ({
          id: item.id,
          subject: item.subject,
          sourceType: item.sourceType,
          nextTaskType: item.nextTaskType,
          derivedTagsCount: item.derivedTags.length,
          relatedFormulasCount: item.relatedFormulas.length,
          createdAt: item.createdAt,
        })),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "verification-failed",
      },
      { status: 500 },
    );
  }
}
