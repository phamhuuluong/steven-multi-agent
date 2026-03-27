"use client";
import { useEffect, useRef, useState, useCallback } from "react";

// Independence from hub — all data from TradingView + Yahoo Finance API
// Pattern #3: Parallelization (fetch all pairs simultaneously)
// Pattern #5: Tool Use (Yahoo Finance as external tool for correlation)

const PAIRS = [
  { symbol: "OANDA:XAUUSD", label: "XAU/USD 🥇", yf: "GC=F" },
  { symbol: "FX:EURUSD",    label: "EUR/USD",     yf: "EURUSD=X" },
  { symbol: "FX:GBPUSD",    label: "GBP/USD",     yf: "GBPUSD=X" },
  { symbol: "TVC:DXY",      label: "DXY 💵",       yf: "DX-Y.NYB" },
  { symbol: "OANDA:XAGUSD", label: "XAG/USD 🥈",  yf: "SI=F" },
  { symbol: "CRYPTOCAP:BTC",label: "BTC/USD ₿",   yf: "BTC-USD" },
];

const TIMEFRAMES = [
  { interval: "15", label: "M15" },
  { interval: "60", label: "H1" },
  { interval: "240", label: "H4" },
  { interval: "1D", label: "D1" },
];

// Thresholds for signal color
function signalColor(rec: string) {
  const r = rec?.toUpperCase();
  if (r?.includes("STRONG_BUY") || r?.includes("STRONG BUY")) return "badge-buy";
  if (r?.includes("BUY")) return "badge-buy";
  if (r?.includes("STRONG_SELL") || r?.includes("STRONG SELL")) return "badge-sell";
  if (r?.includes("SELL")) return "badge-sell";
  return "badge-wait";
}

// Correlation matrix cell color
function corrColor(v: number) {
  if (v >= 0.7) return "rgba(0,212,170,0.25)";
  if (v >= 0.3) return "rgba(0,212,170,0.1)";
  if (v <= -0.7) return "rgba(255,77,106,0.25)";
  if (v <= -0.3) return "rgba(255,77,106,0.1)";
  return "rgba(255,255,255,0.03)";
}

// Widget refs key to force remount
let widgetCounter = 0;

function TVAnalysisWidget({ symbol, interval }: { symbol: string; interval: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const key = `tv_${symbol}_${interval}_${++widgetCounter}`;

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";
    const container = document.createElement("div");
    container.className = "tradingview-widget-container";
    container.style.cssText = "width:100%;height:100%";
    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    widget.style.cssText = "width:100%;height:100%";
    container.appendChild(widget);
    ref.current.appendChild(container);
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      interval,
      width: "100%",
      height: "100%",
      symbol,
      showIntervalTabs: false,
      locale: "vi_VN",
      colorTheme: "dark",
      isTransparent: true,
      displayMode: "single",
    });
    container.appendChild(script);
  }, [symbol, interval]);

  return <div ref={ref} style={{ width: "100%", height: "180px" }} />;
}

// Fetch Yahoo Finance price data for correlation
async function fetchPriceData(ticker: string): Promise<number[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=30d&corsDomain=finance.yahoo.com`;
    const r = await fetch(url, { headers: { "Accept": "application/json" } });
    const d = await r.json();
    return d?.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.filter(Boolean) || [];
  } catch { return []; }
}

function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length, 20);
  if (n < 5) return 0;
  const ax = a.slice(-n), bx = b.slice(-n);
  const ma = ax.reduce((s, v) => s + v, 0) / n;
  const mb = bx.reduce((s, v) => s + v, 0) / n;
  const num = ax.reduce((s, v, i) => s + (v - ma) * (bx[i] - mb), 0);
  const da = Math.sqrt(ax.reduce((s, v) => s + (v - ma) ** 2, 0));
  const db = Math.sqrt(bx.reduce((s, v) => s + (v - mb) ** 2, 0));
  return da && db ? num / (da * db) : 0;
}

export default function ScannerPage() {
  const [corrData, setCorrData] = useState<number[][]>([]);
  const [corrLoading, setCorrLoading] = useState(true);
  const [activeTimeframe, setActiveTimeframe] = useState("60");

  const loadCorrelation = useCallback(async () => {
    setCorrLoading(true);
    try {
      // Pattern #3: Parallelization
      const allPrices = await Promise.all(PAIRS.map(p => fetchPriceData(p.yf)));
      const matrix: number[][] = PAIRS.map((_, i) =>
        PAIRS.map((_, j) => {
          if (i === j) return 1;
          return parseFloat(pearson(allPrices[i], allPrices[j]).toFixed(2));
        })
      );
      setCorrData(matrix);
    } catch {}
    setCorrLoading(false);
  }, []);

  useEffect(() => { loadCorrelation(); }, [loadCorrelation]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Trend Scanner</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-dim)" }}>
            Pattern #3 Parallelization · #5 Tool Use · Độc lập với hub
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {TIMEFRAMES.map(tf => (
            <button key={tf.interval} onClick={() => setActiveTimeframe(tf.interval)}
              className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-all cursor-pointer border-0 ${activeTimeframe === tf.interval ? "btn-gold" : "btn-ghost"}`}>
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Trend Scanner Grid */}
      <div className="glass p-4">
        <div className="text-xs font-semibold mb-3" style={{ color: "var(--text-dim)" }}>
          📊 TECHNICAL ANALYSIS — {TIMEFRAMES.find(t => t.interval === activeTimeframe)?.label} — TradingView
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PAIRS.map((pair) => (
            <div key={pair.symbol} className="rounded-xl overflow-hidden"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
              <div className="px-3 py-2 flex items-center justify-between"
                style={{ borderBottom: "1px solid var(--border)" }}>
                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {pair.label}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full badge-wait">
                  {TIMEFRAMES.find(t => t.interval === activeTimeframe)?.label}
                </span>
              </div>
              <TVAnalysisWidget symbol={pair.symbol} interval={activeTimeframe} />
            </div>
          ))}
        </div>
      </div>

      {/* Correlation Matrix */}
      <div className="glass p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>
            🔗 MA TRẬN TƯƠNG QUAN — 30 ngày (Yahoo Finance, không cần hub)
          </div>
          <button onClick={loadCorrelation} disabled={corrLoading}
            className="btn-ghost px-3 py-1 text-xs border-0 cursor-pointer disabled:opacity-50">
            {corrLoading ? "⏳" : "↻"}
          </button>
        </div>
        {corrLoading ? (
          <div className="text-center py-6" style={{ color: "var(--text-dim)" }}>
            ⏳ Đang tính toán tương quan...
          </div>
        ) : corrData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr>
                  <th className="text-left pb-2 pr-3" style={{ color: "var(--text-dim)", minWidth: "80px" }}>Cặp</th>
                  {PAIRS.map(p => (
                    <th key={p.yf} className="pb-2 px-2 text-center font-medium" style={{ color: "var(--text-dim)", minWidth: "56px" }}>
                      {p.label.split("/")[0].replace("XAU","XAU").split(" ")[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PAIRS.map((pair, i) => (
                  <tr key={pair.yf}>
                    <td className="py-1.5 pr-3 font-semibold" style={{ color: "var(--gold)", minWidth: "80px" }}>
                      {pair.label.split(" ")[0]}
                    </td>
                    {corrData[i]?.map((v, j) => (
                      <td key={j} className="py-1.5 px-2 text-center rounded font-mono transition-all"
                        style={{
                          background: corrColor(v),
                          color: v >= 0.7 ? "var(--green)" : v <= -0.7 ? "var(--red)" : "var(--text-primary)",
                          fontWeight: i === j ? "bold" : "normal"
                        }}>
                        {v.toFixed(2)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: "var(--text-dim)" }}>
              <span className="flex items-center gap-1"><span style={{ color: "var(--green)" }}>█</span> ≥0.7 tương quan dương</span>
              <span className="flex items-center gap-1"><span style={{ color: "var(--red)" }}>█</span> ≤-0.7 tương quan âm</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-4" style={{ color: "var(--text-dim)" }}>
            Không thể tải dữ liệu tương quan
          </div>
        )}
      </div>
    </div>
  );
}
