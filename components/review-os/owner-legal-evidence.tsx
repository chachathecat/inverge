"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { BRIDGE_MESSAGES, type BridgeResult, type HeldSnapshot, type SnapshotReference } from "@/lib/legal/owner-snapshot-bridge-contract";

const endpoint = "/api/review-os/first-stage/legal-evidence";
const identity = (row: HeldSnapshot) => [row.lawId, row.mst, row.effectiveDate, row.manifestSha256].join("/");
const date = (value: string) => /^\d{8}$/.test(value) ? value.slice(0, 4) + "-" + value.slice(4, 6) + "-" + value.slice(6) : value;

export function OwnerLegalEvidence() {
  const [snapshots, setSnapshots] = useState<readonly HeldSnapshot[]>([]);
  const [selection, setSelection] = useState("");
  const [mode, setMode] = useState("articleNumber");
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("MAIN");
  const [result, setResult] = useState<BridgeResult | null>(null);
  const [message, setMessage] = useState("보유 목록을 확인하고 있습니다.");
  const [busy, setBusy] = useState(true);
  const sequence = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const requests = sequence;
    let active = true;
    async function list() {
      try {
        const response = await fetch(endpoint, { cache: "no-store", credentials: "same-origin", signal: controller.signal });
        const value: BridgeResult = await response.json();
        if (!active) return;
        setSnapshots(response.ok && value.state === "OK" ? value.snapshots ?? [] : []);
        setMessage(BRIDGE_MESSAGES[value.state] ?? BRIDGE_MESSAGES.SEARCH_FAILED);
      } catch { if (active) setMessage(BRIDGE_MESSAGES.SEARCH_FAILED); }
      finally { if (active) setBusy(false); }
    }
    void list();
    // Do not retain a private body across a history-cache restoration.
    const clear = () => { requests.current++; setResult(null); setQuery(""); setBusy(false); };
    window.addEventListener("pagehide", clear);
    return () => { active = false; controller.abort(); window.removeEventListener("pagehide", clear); requests.current++; };
  }, []);

  async function read(command: unknown) {
    const current = ++sequence.current;
    setResult(null); setBusy(true); setMessage("보유 원문을 확인하고 있습니다.");
    try {
      const response = await fetch(endpoint, { method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(command) });
      const value: BridgeResult = await response.json();
      if (sequence.current !== current) return;
      if (response.ok && value.state === "OK") setResult(value);
      if (value.state === "ACCESS_DENIED") { setSnapshots([]); setSelection(""); }
      setMessage(BRIDGE_MESSAGES[value.state] ?? BRIDGE_MESSAGES.SEARCH_FAILED);
    } catch { if (sequence.current === current) setMessage(BRIDGE_MESSAGES.SEARCH_FAILED); }
    finally { if (sequence.current === current) setBusy(false); }
  }
  function search(event: FormEvent) {
    event.preventDefault();
    const held = snapshots.find(row => identity(row) === selection);
    if (!held || !query.trim() || busy) return;
    void read({ action: "search", input: { lawId: held.lawId, mst: held.mst, effectiveDate: held.effectiveDate,
      manifestSha256: held.manifestSha256, section: mode === "articleNumber" ? "MAIN" : section,
      [mode]: query.trim(), matchCount: 10 } });
  }
  const reopen = (reference: SnapshotReference) => { if (!busy) void read({ action: "reopen", reference }); };
  return <>
    <header className="space-y-3">
      <a className="text-sm underline" href="/app/first-stage">Owner 학습 화면으로 돌아가기</a>
      <h1 className="text-2xl font-semibold">보유 법령 근거 보기</h1>
      <p className="text-sm text-muted-foreground">독립 참고자료 화면입니다. 풀이·평가·미노출 측정에 연결하지 않습니다.</p>
      <p className="evidence-bar text-sm">보유 원문 무결성 확인은 법적 정답 검증이 아닙니다. 현행성·특정 시험/기준일 적용은 미확인입니다. AI 보충·다른 버전 대체를 하지 않습니다.</p>
    </header>
    <form className="operating-surface space-y-4 rounded-xl border p-5" onSubmit={search}>
      <label className="block space-y-1"><span>보유 법령·버전</span>
        <select className="min-h-11 w-full rounded border p-2" value={selection} disabled={busy} onChange={event => { setSelection(event.target.value); setResult(null); }}>
          <option value="">법령과 시행일을 선택하세요</option>
          {snapshots.map(row => <option key={identity(row)} value={identity(row)}>{row.lawName} · 시행 {date(row.effectiveDate)} · MST {row.mst}</option>)}
        </select>
      </label>
      <div className="flex flex-wrap gap-4">
        <label>조회 방식 <select className="min-h-11 rounded border p-2" value={mode} disabled={busy} onChange={event => { setMode(event.target.value); setResult(null); }}>
          <option value="articleNumber">조문 번호</option><option value="queryText">검색어</option>
        </select></label>
        {mode === "queryText" && <label>검색 범위 <select className="min-h-11 rounded border p-2" value={section} disabled={busy} onChange={event => { setSection(event.target.value); setResult(null); }}>
          <option value="MAIN">본칙</option><option value="SUPPLEMENTARY">부칙 단위</option><option value="ALL">본칙·부칙</option>
        </select></label>}
      </div>
      <label className="block space-y-1"><span>{mode === "articleNumber" ? "조문 번호" : "검색어"}</span>
        <input className="min-h-11 w-full rounded border p-2" value={query} disabled={busy} maxLength={mode === "articleNumber" ? 40 : 500}
          onChange={event => { setQuery(event.target.value); setResult(null); }} autoComplete="off" required />
      </label>
      <button className="primary-action min-h-11 rounded px-4 py-2 disabled:opacity-50" disabled={busy || !selection || !query.trim()}>보유 버전에서 조회</button>
      <p role="status" aria-live="polite" className="text-sm">{message}</p>
    </form>
    {result?.state === "OK" && <section aria-label="보유 조문 조회 결과" className="space-y-5">
      {result.originalReopened && <p role="status">동일 reference의 보유 원문·본문 무결성을 다시 확인했습니다.</p>}
      {result.totalMatches !== undefined && <p className="text-sm">일치 {result.totalMatches}건 · 표시 {result.returnedCount}건</p>}
      {result.anchors.map(anchor => <article key={anchor.reference.articleKey} className="operating-surface space-y-3 rounded-xl border p-5">
        <h2 className="text-lg font-semibold">{anchor.reference.lawName} · {anchor.reference.section === "MAIN" ?
          "제" + anchor.articleNumber + "조" + (anchor.branchNumber ? "의" + anchor.branchNumber : "") : "부칙 단위"} {anchor.title}</h2>
        <p className="text-sm">보유 버전 시행일 {date(anchor.reference.effectiveDate)} · 수집일 {anchor.reference.collectedAt}</p>
        {anchor.deleted && <p>삭제된 조문입니다. 유효한 규칙으로 해석하지 않습니다.</p>}
        <div className="whitespace-pre-wrap break-words leading-7">{anchor.bodyText}</div>
        <button className="secondary-action min-h-11 rounded border px-4 py-2" disabled={busy} onClick={() => reopen(anchor.reference)}>같은 원문 다시 확인</button>
        <details className="text-sm"><summary>참조·확인 범위</summary>
          <p>JSON 스냅샷 · 법령 ID {anchor.reference.lawId} · MST {anchor.reference.mst} · {anchor.reference.articleKey}</p>
          <p>원본 JSON의 조문 조각 및 표시 본문 일치만 확인합니다. DB UUID·XML 원문 검증·시험 적용 판단이 아닙니다.</p>
        </details>
      </article>)}
    </section>}
  </>;
}
