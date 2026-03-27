import { NextRequest, NextResponse } from "next/server";

// Server-side Yahoo Finance proxy — bypasses CORS for correlation matrix
// Tickers: GC=F (Gold), EURUSD=X, GBPUSD=X, DX-Y.NYB (DXY), SI=F (Silver), BTC-USD
export async function GET(req: NextRequest) {
  const tickers = ["GC=F", "EURUSD=X", "GBPUSD=X", "DX-Y.NYB", "SI=F", "BTC-USD"];
  
  try {
    const results = await Promise.allSettled(
      tickers.map(async (ticker) => {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=30d`;
        const r = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
          signal: AbortSignal.timeout(8000)
        });
        const d = await r.json();
        const closes: number[] = d?.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.filter(Boolean) || [];
        return { ticker, closes, last: closes[closes.length - 1] || 0 };
      })
    );

    const data: { [key: string]: number[] } = {};
    results.forEach((r) => {
      if (r.status === "fulfilled") {
        data[r.value.ticker] = r.value.closes;
      }
    });

    return NextResponse.json({ data });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
