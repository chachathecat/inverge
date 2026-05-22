import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isAllowedAdminEmail } from "@/lib/auth/admin";
import { getServerSessionUser } from "@/lib/auth/session";
import { reviewOsService } from "@/lib/review-os/service";

export default async function AdminBetaFunnelPage() {
  const session = await getServerSessionUser();
  if (!session.isAuthenticated || !isAllowedAdminEmail(session.email)) {
    return <div className="mx-auto max-w-3xl px-5 py-12 text-sm text-[color:var(--muted)]">접근 권한이 없습니다.</div>;
  }
  const funnel = await reviewOsService.getAdminBetaFunnel();
  const breakdownEntries = Object.entries(funnel.breakdowns);
  return <div className="mx-auto max-w-7xl space-y-6 px-5 py-10"><h1 className="text-[30px] font-medium">Korean Beta Funnel QA v1</h1><p className="text-sm text-[color:var(--muted)]">sanitized telemetry only</p><div className="grid gap-5 lg:grid-cols-2">{["Capture funnel","Daily ritual funnel"].map((title,idx)=><Card key={title}><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">{(idx===0?funnel.captureFunnel:funnel.dailyRitualFunnel).map((row)=><div key={row.eventName} className="flex justify-between rounded-xl border px-3 py-2"><span>{row.eventName}</span><span>{row.count} · {row.conversionFromPrevious===null?"-":`${row.conversionFromPrevious}%`}</span></div>)}</CardContent></Card>)}</div><Card><CardHeader><CardTitle>Top 5 friction signals</CardTitle></CardHeader><CardContent>{funnel.topFrictionSignals.map((item)=><div key={item.key} className="flex justify-between rounded-xl border px-3 py-2"><span>{item.label}</span><span>{item.count} · {item.rate}%</span></div>)}</CardContent></Card><Card><CardHeader><CardTitle>Metadata breakdown</CardTitle><CardDescription>rawQuestionText rawAnswerText raw_ocr_text raw_extraction_json full answer full problem are forbidden.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{breakdownEntries.map(([key,values])=><div key={key} className="rounded-xl border p-3"><p className="text-xs uppercase">{key}</p><div className="mt-2 space-y-1 text-sm">{values.length===0?<p>No data</p>:values.slice(0,6).map((entry)=><p key={`${key}-${entry.value}`}>{entry.value} · {entry.count}</p>)}</div></div>)}</CardContent></Card></div>;
}
