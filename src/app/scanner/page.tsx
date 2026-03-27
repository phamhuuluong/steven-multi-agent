"use client";
import { useEffect, useRef, useState, useCallback } from "react";

const PAIRS = [
  { symbol: "OANDA:XAUUSD", label: "XAU/USD 🥇", yf: "GC=F", short: "XAU" },
  { symbol: "FX:EURUSD",    label: "EUR/USD",     yf: "EURUSD=X", short: "EUR" },
  { symbol: "FX:GBPUSD",    label: "GBP/USD",     yf: "GBPUSD=X", short: "GBP" },
  { symbol: "TVC:DXY",      label: "DXY 💵",       yf: "DX-Y.NYB", short: "DXY" },
  { symbol: "OANDA:XAGUSD", label: "XAG/USD 🥈",  yf: "SI=F", short: "XAG" },
  { symbol: "CRYPTOCAP:BTC",label: "BTC/USD ₿",   yf: "BTC-USD", short: "BTC" },
];

const TIMEFRAMES = [
  { interval: "15",  label: "M15" },
  { interval: "60",  label: "H1" },
  { interval: "240", label: "H4" },
  { interval: "1D",  label: "D1" },
];

function corrColor(v: number) {
  if (v >= 0.7)  return { bg: "rgba(0,212,170,0.25)", color: "var(--green)" };
  if (v >= 0.3)  return { bg: "rgba(0,212,170,0.10)", color: "var(--green)" };
  if (v <= -0.7) return { bg: "rgba(255,77,106,0.25)", color: "var(--red)" };
  if (v <= -0.3) return { bg: "rgba(255,77,106,0.10)", color: "var(--red)" };
  return { bg: "rgba(255,255,255,0.04)", color: "var(--text-dim)" };
}

function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 5) return 0;
  const ax = a.slice(-n), bx = b.slice(-n);
  const ma = ax.reduce((s, v) => s + v, 0) / n;
  const mb = bx.reduce((s, v) => s + v, 0) / n;
  const num = ax.reduce((s, v, i) => s + (v - ma) * (bx[i] - mb), 0);
  const da = Math.sqrt(ax.reduce((s, v) => s + (v - ma) ** 2, 0));
  const db = Math.sqrt(bx.reduce((s, v) => s + (v - mb) ** 2, 0));
  return da && db ? parseFloat((num / (da * db)).toFixed(2)) : 0;
}

// TradingView widget — use .text not .innerHTML
function TVWidget({ symbol, interval }: { symbol: string; interval: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.cssText = "width:100%;height:100%";
    el.appendChild(widgetDiv);

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js";
    script.async = true;
    // KEY FIX: use .text not .innerHTML for the script config
    script.text = JSON.stringify({
      interval,
      width: "100%",
      height: 220,
      symbol,
      showIntervalTabs: false,
      displayMode: "single",
      locale: "vi_VN",
      colorTheme: "dark",
      isTransparent: true,
    });
    el.appendChild(script);

    return () => { el.innerHTML = ""; };
  }, [symbol, interval]);

  return (
    <div ref={ref}
      className="tradingview-widget-container"
      style={{ width: "100%", height: "220px" }}
    />
  );
}

export default function ScannerPage() {
  const [activeTimeframe, setActiveTimeframe] = useState("60");
  const [matrix, setMatrix] = useState<number[][]>([]);
  const [corrLoading, setCorrLoading] = useState(true);
  const [aiExplanation, setAiExplanation] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const loadCorrelation = useCallback(async () => {
    setCorrLoading(true);
    setMatrix([]);
    try {
      // Uses server-side /api/prices route (no CORS issue)
      const r = await fetch("/api/prices");
      const d = await r.json();
      const prices = PAIRS.map(p => d.data?.[p.yf] || []);
      const m = prices.map((a, i) => prices.map((b, j) => i === j ? 1.0 : pearson(a, b)));
      setMatrix(m);
    } catch {}
    setCorrLoading(false);
  }, []);

  useEffect(() => { loadCorrelation(); }, [loadCorrelation]);

  const askAI = async () => {
    if (!matrix.length) return;
    setAiLoading(true);
    setAiExplanation("");
    const matrixText = PAIRS.map((p, i) =>
      `${p.short}: ` + PAIRS.map((q, j) => `${q.short}=${matrix[i][j]}`).join(", ")
    ).join("\n");
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Phân tích ma trận tương quan 30 ngày này và giải thích ý nghĩa giao dịch (XAUUSD, EURUSD, GBPUSD, DXY, XAGUSD, BTC):\n${matrixText}\nNêu rõ: cặp nào đồng hướng, nghịch hướng, và ứng dụng vào giao dịch vàng.`
        })
      });
      const data = await r.json();
      setAiExplanation(data.reply || "");
    } catch {}
    setAiLoading(false);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Trend Scanner</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-dim)" }}>
            Đa cặp · Đa khung · Ma trận tương quan + AI phân tích
          </p>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {TIMEFRAMES.map(tf => (
            <button key={tf.interval} onClick={() => setActiveTimeframe(tf.interval)}
              className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-all cursor-pointer border-0 ${activeTimeframe === tf.interval ? "btn-gold" : "btn-ghost"}`}>
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* TradingView Analysis Grid */}
      <div className="glass p-4">
        <div className="text-xs font-semibold mb-3" style={{ color: "var(--gold)" }}>
          📊 TECHNICAL ANALYSIS — {TIMEFRAMES.find(t => t.interval === activeTimeframe)?.label} — TradingView
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PAIRS.map((pair) => (
            <div key={`${pair.symbol}-${activeTimeframe}`}
              className="rounded-xl overflow-hidden"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
              <div className="px-3 py-2 flex items-center justify-between"
                style={{ borderBottom: "1px solid var(--border)" }}>
                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {pair.label}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full badge-wait">
                  {TIMEFRAMES.find(t => t.interval === activeTimeframe)?.label}
                </span>
              </div>
              <TVWidget symbol={pair.symbol} interval={activeTimeframe} />
            </div>
          ))}
        </div>
      </div>

      {/* Correlation Matrix */}
      <div className="glass p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs font-semibold" style={{ color: "var(--gold)" }}>
              🔗 MA TRẬN TƯƠNG QUAN — 30 ngày (Yahoo Finance · server-side)
            </div>
            <div className="text-xs mt-0.5" style={{ color: "var(--text-dim)" }}>
              Pearson correlation coefficient — &gt;0.7 đồng hướng mạnh, &lt;-0.7 nghịch hướng mạnh
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={loadCorrelation} disabled={corrLoading}
              className="btn-ghost px-3 py-1.5 text-xs border-0 cursor-pointer disabled:opacity-50">
              {corrLoading ? "⏳" : "↻"}
            </button>
            <button onClick={askAI} disabled={aiLoading || corrLoading || !matrix.length}
              className="btn-gold px-3 py-1.5 text-xs cursor-pointer disabled:opacity-50">
              {aiLoading ? "⏳ AI..." : "🤖 AI giải thích"}
            </button>
          </div>
        </div>

        {corrLoading ? (
          <div className="text-center py-8" style={{ color: "var(--text-dim)" }}>
            ⏳ Đang fetch Yahoo Finance (server-side)...
          </div>
        ) : matrix.length === 0 ? (
          <div className="text-center py-6" style={{ color: "var(--text-dim)" }}>
            ⚠️ Không tải được dữ liệu. Thử lại sau.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left pb-2 pr-4 font-medium" style={{ color: "var(--text-dim)" }}>Cặp</th>
                  {PAIRS.map(p => (
                    <th key={p.short} className="pb-2 px-2 text-center font-medium w-16"
                      style={{ color: "var(--text-dim)" }}>{p.short}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PAIRS.map((pair, i) => (
                  <tr key={pair.short}>
                    <td className="py-2 pr-4 font-bold" style={{ color: "var(--gold)" }}>
                      {pair.short}
                    </td>
                    {matrix[i]?.map((v, j) => {
                      const style = corrColor(v);
                      return (
                        <td key={j} className="py-2 px-1 text-center rounded-lg transition-all"
                          title={`${pair.short} vs ${PAIRS[j].short}: ${v}`}
                          style={{
                            background: style.bg,
                            color: style.color,
                            fontWeight: i === j ? "bold" : "600",
                            fontFamily: "JetBrains Mono, monospace",
                            fontSize: "12px"
                          }}>
                          {v === 1.0 ? "1.00" : v.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-3 text-xs">
              {[
                { color: "var(--green)", bg: "rgba(0,212,170,0.2)", label: "≥0.7 Đồng hướng mạnh" },
                { color: "var(--green)", bg: "rgba(0,212,170,0.08)", label: "0.3~0.7 Đồng hướng vừa" },
                { color: "var(--text-dim)", bg: "rgba(255,255,255,0.04)", label: "-0.3~0.3 Trung lập" },
                { color: "var(--red)", bg: "rgba(255,77,106,0.08)", label: "-0.7~-0.3 Nghịch hướng" },
                { color: "var(--red)", bg: "rgba(255,77,106,0.2)", label: "≤-0.7 Nghịch hướng mạnh" },
              ].map(l => (
                <span key={l.label} className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
                  style={{ background: l.bg, color: l.color }}>
                  {l.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* AI Explanation */}
        {aiExplanation && (
          <div className="mt-4 p-4 rounded-xl fade-in"
            style={{ background: "rgba(245,166,35,0.06)", border: "1px solid rgba(245,166,35,0.2)" }}>
            <div className="flex items-center gap-2 mb-2">
              <span>🤖</span>
              <span className="text-xs font-semibold" style={{ color: "var(--gold)" }}>
                Steven AI — Phân tích tương quan
              </span>
            </div>
            <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-primary)" }}>
              {aiExplanation}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
