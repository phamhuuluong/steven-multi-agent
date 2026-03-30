"use client";
import { useEffect, useRef, useState, useCallback } from "react";

const PAIRS = [
  { symbol: "OANDA:XAUUSD", label: "XAU/USD", emoji: "🥇", yf: "GC=F",      short: "XAU" },
  { symbol: "FX:EURUSD",    label: "EUR/USD", emoji: "🇪🇺", yf: "EURUSD=X",  short: "EUR" },
  { symbol: "FX:GBPUSD",    label: "GBP/USD", emoji: "🇬🇧", yf: "GBPUSD=X",  short: "GBP" },
  { symbol: "TVC:DXY",      label: "DXY",     emoji: "💵", yf: "DX-Y.NYB",   short: "DXY" },
  { symbol: "OANDA:XAGUSD", label: "XAG/USD", emoji: "🥈", yf: "SI=F",       short: "XAG" },
  { symbol: "CRYPTOCAP:BTC",label: "BTC/USD", emoji: "₿",  yf: "BTC-USD",    short: "BTC" },
];

function corrColor(v: number) {
  if (v >= 0.7)  return { bg: "rgba(0,212,170,0.22)", color: "#00d4aa", border: "rgba(0,212,170,0.35)" };
  if (v >= 0.3)  return { bg: "rgba(0,212,170,0.08)", color: "#00d4aa", border: "rgba(0,212,170,0.15)" };
  if (v <= -0.7) return { bg: "rgba(255,77,106,0.22)", color: "#ff4d6a", border: "rgba(255,77,106,0.35)" };
  if (v <= -0.3) return { bg: "rgba(255,77,106,0.08)", color: "#ff4d6a", border: "rgba(255,77,106,0.15)" };
  return { bg: "rgba(255,255,255,0.03)", color: "var(--text-dim)", border: "transparent" };
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

// TradingView Technical Analysis Widget — D1 fixed
function TVWidget({ symbol }: { symbol: string }) {
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
    script.text = JSON.stringify({
      interval: "1D",
      width: "100%",
      height: 240,
      symbol,
      showIntervalTabs: false,
      displayMode: "single",
      locale: "vi_VN",
      colorTheme: "dark",
      isTransparent: true,
    });
    el.appendChild(script);
    return () => { el.innerHTML = ""; };
  }, [symbol]);
  return <div ref={ref} className="tradingview-widget-container" style={{ width: "100%", height: "240px" }} />;
}

export default function ScannerPage() {
  const [matrix, setMatrix] = useState<number[][]>([]);
  const [corrLoading, setCorrLoading] = useState(true);
  const [aiExplanation, setAiExplanation] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const loadCorrelation = useCallback(async () => {
    setCorrLoading(true);
    setMatrix([]);
    try {
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
          message: `Phân tích ma trận tương quan 30 ngày này và giải thích ý nghĩa giao dịch:\n${matrixText}\nNêu rõ: cặp nào đồng hướng, nghịch hướng, ứng dụng vào giao dịch vàng XAUUSD. Ngắn gọn, thực chiến.`
        })
      });
      const data = await r.json();
      setAiExplanation(data.reply || "");
    } catch {}
    setAiLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
        <div>
          <h1 style={{
            fontSize: "22px", fontWeight: 800, margin: 0,
            background: "linear-gradient(135deg, #f5a623 0%, #f7c948 60%, #ffe066 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
          }}>Trend Scanner</h1>
          <p style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "4px" }}>
            Phân tích kỹ thuật ngày · Ma trận tương quan 30D
          </p>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: "6px",
          padding: "6px 12px", borderRadius: "8px",
          background: "rgba(245,166,35,0.12)", border: "1px solid rgba(245,166,35,0.3)"
        }}>
          <span style={{ fontSize: "11px", color: "#f5a623", fontWeight: 700 }}>📅 DAILY</span>
          <span style={{ fontSize: "10px", color: "var(--text-dim)" }}>TradingView D1</span>
        </div>
      </div>

      {/* ── TradingView Grid ── */}
      <div style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "16px", padding: "20px"
      }}>
        {/* Section title */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <div style={{ width: "3px", height: "18px", background: "linear-gradient(to bottom, #f5a623, #f7c948)", borderRadius: "2px" }} />
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#f5a623", letterSpacing: "0.05em" }}>
            📊 TECHNICAL ANALYSIS — D1
          </span>
          <span style={{ fontSize: "11px", color: "var(--text-dim)", marginLeft: "4px" }}>TradingView</span>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "12px"
        }}>
          {PAIRS.map((pair) => (
            <div key={pair.symbol} style={{
              background: "rgba(0,0,0,0.25)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "12px", overflow: "hidden",
              transition: "border-color 0.2s",
            }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(245,166,35,0.35)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)")}
            >
              {/* Card header */}
              <div style={{
                padding: "10px 14px",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "rgba(255,255,255,0.015)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "15px" }}>{pair.emoji}</span>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>{pair.label}</span>
                </div>
                <span style={{
                  fontSize: "10px", fontWeight: 700,
                  padding: "2px 8px", borderRadius: "20px",
                  background: "rgba(245,166,35,0.15)", color: "#f5a623",
                  border: "1px solid rgba(245,166,35,0.25)"
                }}>D1</span>
              </div>
              <TVWidget symbol={pair.symbol} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Correlation Matrix ── */}
      <div style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "16px", padding: "20px"
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <div style={{ width: "3px", height: "18px", background: "linear-gradient(to bottom, #8b5cf6, #a78bfa)", borderRadius: "2px" }} />
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#a78bfa", letterSpacing: "0.05em" }}>
                🔗 MA TRẬN TƯƠNG QUAN — 30 ngày
              </span>
            </div>
            <p style={{ fontSize: "11px", color: "var(--text-dim)", margin: 0, marginLeft: "11px" }}>
              Pearson coefficient · Yahoo Finance Daily · &gt;0.7 đồng hướng mạnh · &lt;−0.7 nghịch hướng
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={loadCorrelation} disabled={corrLoading}
              style={{
                padding: "6px 14px", fontSize: "12px", fontWeight: 600, borderRadius: "8px",
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                color: "var(--text-dim)", cursor: "pointer", opacity: corrLoading ? 0.5 : 1
              }}>
              {corrLoading ? "⏳" : "↻ Refresh"}
            </button>
            <button onClick={askAI} disabled={aiLoading || corrLoading || !matrix.length}
              style={{
                padding: "6px 16px", fontSize: "12px", fontWeight: 600, borderRadius: "8px",
                background: "linear-gradient(135deg, #f5a623, #f7c948)",
                border: "none", color: "#1a1a2e", cursor: "pointer",
                opacity: (aiLoading || corrLoading || !matrix.length) ? 0.5 : 1
              }}>
              {aiLoading ? "⏳ Đang phân tích..." : "🤖 AI giải thích"}
            </button>
          </div>
        </div>

        {corrLoading ? (
          <div style={{ textAlign: "center", padding: "32px", color: "var(--text-dim)" }}>
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>⏳</div>
            <div style={{ fontSize: "13px" }}>Đang tải dữ liệu Yahoo Finance...</div>
          </div>
        ) : matrix.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px", color: "var(--text-dim)", fontSize: "13px" }}>
            ⚠️ Không tải được dữ liệu. Thử lại sau.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "3px" }}>
              <thead>
                <tr>
                  <th style={{
                    textAlign: "left", paddingBottom: "10px", paddingRight: "12px",
                    fontSize: "11px", color: "var(--text-dim)", fontWeight: 600
                  }}>CẶP</th>
                  {PAIRS.map(p => (
                    <th key={p.short} style={{
                      paddingBottom: "10px", textAlign: "center", minWidth: "60px",
                      fontSize: "11px", color: "var(--text-dim)", fontWeight: 700
                    }}>
                      <span style={{ fontSize: "12px" }}>{p.emoji}</span><br />
                      {p.short}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PAIRS.map((pair, i) => (
                  <tr key={pair.short}>
                    <td style={{
                      paddingRight: "16px", paddingTop: "3px", paddingBottom: "3px",
                      fontSize: "12px", fontWeight: 700, color: "#f5a623", whiteSpace: "nowrap"
                    }}>
                      {pair.emoji} {pair.short}
                    </td>
                    {matrix[i]?.map((v, j) => {
                      const s = corrColor(v);
                      const isDiag = i === j;
                      return (
                        <td key={j}
                          title={`${pair.short} vs ${PAIRS[j].short}: ${v}`}
                          style={{
                            padding: "8px 6px", textAlign: "center",
                            background: isDiag ? "rgba(245,166,35,0.15)" : s.bg,
                            color: isDiag ? "#f5a623" : s.color,
                            fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                            fontSize: "12px", borderRadius: "6px",
                            border: `1px solid ${isDiag ? "rgba(245,166,35,0.3)" : s.border}`,
                            transition: "transform 0.1s",
                            cursor: "default"
                          }}
                        >
                          {v === 1.0 ? "1.00" : v.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Legend */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "14px" }}>
              {[
                { color: "#00d4aa", bg: "rgba(0,212,170,0.15)", label: "≥0.7 Đồng hướng mạnh" },
                { color: "#00d4aa", bg: "rgba(0,212,170,0.06)", label: "0.3–0.7 Đồng hướng" },
                { color: "var(--text-dim)", bg: "rgba(255,255,255,0.04)", label: "Trung lập" },
                { color: "#ff4d6a", bg: "rgba(255,77,106,0.06)", label: "−0.3–−0.7 Nghịch hướng" },
                { color: "#ff4d6a", bg: "rgba(255,77,106,0.15)", label: "≤−0.7 Nghịch hướng mạnh" },
              ].map(l => (
                <span key={l.label} style={{
                  display: "inline-flex", alignItems: "center", gap: "5px",
                  padding: "4px 10px", borderRadius: "6px",
                  background: l.bg, color: l.color, fontSize: "10px", fontWeight: 600
                }}>
                  <span style={{
                    width: "6px", height: "6px", borderRadius: "50%",
                    backgroundColor: l.color, flexShrink: 0
                  }} />
                  {l.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* AI Explanation */}
        {aiExplanation && (
          <div style={{
            marginTop: "16px", padding: "16px", borderRadius: "12px",
            background: "rgba(245,166,35,0.06)", border: "1px solid rgba(245,166,35,0.2)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              <span style={{ fontSize: "18px" }}>🤖</span>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#f5a623" }}>
                Steven AI — Phân tích tương quan
              </span>
            </div>
            <div style={{
              fontSize: "13px", lineHeight: 1.7, color: "var(--text-primary)",
              whiteSpace: "pre-wrap"
            }}>
              {aiExplanation}
            </div>
          </div>
        )}
      </div>

      {/* ── Responsive override for smaller screens ── */}
      <style>{`
        @media (max-width: 900px) {
          .tv-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 580px) {
          .tv-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
