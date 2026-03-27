"use client";
import { useEffect, useState, useCallback } from "react";

const HUB = process.env.NEXT_PUBLIC_HUB_URL || "https://hub.lomofx.com";

function getBiasClass(bias: string) {
  const b = bias?.toUpperCase();
  if (b?.includes("BUY")) return "badge-buy";
  if (b?.includes("SELL")) return "badge-sell";
  return "badge-wait";
}

function LiveTicker({ symbol, price, change }: { symbol: string; price: string; change?: number }) {
  return (
    <div className="glass glass-hover px-5 py-4 flex items-center justify-between cursor-default">
      <div>
        <div className="text-xs font-semibold mb-1" style={{ color: "var(--text-dim)" }}>{symbol}</div>
        <div className="text-2xl font-bold mono" style={{ color: "var(--text-primary)" }}>{price}</div>
      </div>
      {change !== undefined && (
        <div className={`text-sm font-semibold px-3 py-1 rounded-full ${change >= 0 ? "badge-buy" : "badge-sell"}`}>
          {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(2)}
        </div>
      )}
    </div>
  );
}

function PatternBadge({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
      style={{ background: "rgba(245,166,35,0.08)", border: "1px solid rgba(245,166,35,0.2)", color: "var(--gold)" }}>
      <span className="font-bold">#{n}</span> {label}
    </div>
  );
}

export default function DashboardPage() {
  const [snap, setSnap] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  const fetchData = useCallback(async () => {
    try {
      const r = await fetch(`${HUB}/api/hub-snapshot`, { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        setSnap(d);
        setLastUpdate(new Date().toLocaleTimeString("vi-VN"));
      }
    } catch { /* hub offline */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 30000);
    return () => clearInterval(id);
  }, [fetchData]);

  const bias = snap?.overall_bias || "WAIT";
  const entry = snap?.entry || "—";
  const sl = snap?.sl || "—";
  const tp = snap?.tp || "—";
  const conf = snap?.confidence || 0;
  const buyPct = snap?.buy_pct || 50;
  const sellPct = snap?.sell_pct || 50;
  const cvd = snap?.cvd || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-dim)" }}>
            Real-time market intelligence • Pattern #3 Parallelization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full pulse-live" style={{ background: "var(--green)" }}></div>
          <span className="text-xs mono" style={{ color: "var(--text-dim)" }}>
            {lastUpdate ? `Cập nhật ${lastUpdate}` : "Đang kết nối..."}
          </span>
          <button onClick={fetchData}
            className="btn-ghost px-3 py-1.5 text-xs cursor-pointer border-0">
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Active patterns */}
      <div className="flex flex-wrap gap-2">
        <PatternBadge n={3} label="Parallelization" />
        <PatternBadge n={16} label="Resource Optimization" />
        <PatternBadge n={12} label="Exception Handling" />
      </div>

      {/* Price tickers */}
      <div className="grid grid-cols-3 gap-4">
        <LiveTicker symbol="XAUUSD" price={entry !== "—" ? String(entry) : "4,442.0"} change={0.3} />
        <LiveTicker symbol="DXY" price="104.2" change={-0.1} />
        <LiveTicker symbol="BTC/USD" price="87,240" change={1.2} />
      </div>

      {/* Main signal card */}
      {loading ? (
        <div className="glass p-8 text-center" style={{ color: "var(--text-dim)" }}>
          <div className="text-3xl mb-2">⏳</div>
          <div>Đang kết nối hub.lomofx.com...</div>
        </div>
      ) : (
        <div className="glass p-6 relative overflow-hidden signal-card-live">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-5"
            style={{ background: "radial-gradient(circle, var(--gold), transparent)", transform: "translate(30%, -30%)" }} />
          <div className="relative">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="text-xs font-semibold mb-2" style={{ color: "var(--text-dim)" }}>
                  🏛️ AI COUNCIL SIGNAL
                </div>
                <span className={`px-4 py-2 rounded-full text-lg font-bold ${getBiasClass(bias)}`}>
                  {bias}
                </span>
              </div>
              <div className="text-right">
                <div className="text-xs mb-1" style={{ color: "var(--text-dim)" }}>Tin cậy</div>
                <div className="text-3xl font-bold" style={{ color: conf >= 70 ? "var(--green)" : "var(--gold)" }}>
                  {conf}%
                </div>
              </div>
            </div>

            {/* Entry / SL / TP */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: "Entry", value: entry, color: "var(--gold)" },
                { label: "Stop Loss", value: sl, color: "var(--red)" },
                { label: "Take Profit", value: tp, color: "var(--green)" },
              ].map((item) => (
                <div key={item.label} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                  <div className="text-xs mb-1" style={{ color: "var(--text-dim)" }}>{item.label}</div>
                  <div className="text-xl font-bold mono" style={{ color: item.color }}>{item.value}</div>
                </div>
              ))}
            </div>

            {/* Order Flow */}
            <div className="space-y-3">
              <div className="flex justify-between text-xs" style={{ color: "var(--text-dim)" }}>
                <span>📈 Buy Pressure</span>
                <span>📉 Sell Pressure</span>
              </div>
              <div className="flex rounded-full overflow-hidden h-3">
                <div className="transition-all duration-700" style={{ width: `${buyPct}%`, background: "var(--green)" }} />
                <div className="transition-all duration-700" style={{ width: `${sellPct}%`, background: "var(--red)" }} />
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span style={{ color: "var(--green)" }}>{buyPct}% Buy</span>
                <span style={{ color: "var(--text-dim)" }}>CVD: {typeof cvd === "number" ? cvd.toLocaleString() : cvd} lots</span>
                <span style={{ color: "var(--red)" }}>{sellPct}% Sell</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 21 Patterns grid */}
      <div>
        <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-dim)" }}>
          21 AGENTIC DESIGN PATTERNS ĐƯỢC TÍCH HỢP
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {[
            { n: 1, name: "Prompt Chaining", desc: "Signal pipeline", active: true },
            { n: 2, name: "Routing", desc: "Intent detection", active: true },
            { n: 3, name: "Parallelization", desc: "Multi-feed fetch", active: true },
            { n: 4, name: "Reflection", desc: "Self-critique", active: false },
            { n: 5, name: "Tool Use", desc: "Calculator & Search", active: true },
            { n: 6, name: "Planning", desc: "Scenario builder", active: false },
            { n: 7, name: "Multi-Agent", desc: "AI Council", active: true },
            { n: 8, name: "Memory", desc: "Context history", active: false },
            { n: 9, name: "Adaptation", desc: "Self-improvement", active: false },
            { n: 10, name: "MCP", desc: "MT5 protocol", active: true },
            { n: 11, name: "Goal Monitoring", desc: "Target tracker", active: false },
            { n: 12, name: "Exception Handling", desc: "AI fallback chain", active: true },
            { n: 13, name: "Human-in-Loop", desc: "Signal approval", active: false },
            { n: 14, name: "RAG", desc: "Academy KB", active: true },
            { n: 15, name: "A2A Comm.", desc: "Agent debate", active: true },
            { n: 16, name: "Resource Opt.", desc: "Model selector", active: true },
            { n: 17, name: "CoT Reasoning", desc: "Think visible", active: true },
            { n: 18, name: "Guardrails", desc: "Risk validator", active: true },
            { n: 19, name: "Evaluation", desc: "AI judge", active: false },
            { n: 20, name: "Prioritization", desc: "Signal queue", active: false },
            { n: 21, name: "Exploration", desc: "Paper trading", active: false },
          ].map((p) => (
            <div key={p.n} className="p-3 rounded-xl flex items-center gap-2 transition-all"
              style={{
                background: p.active ? "rgba(245,166,35,0.07)" : "rgba(255,255,255,0.02)",
                border: `1px solid ${p.active ? "rgba(245,166,35,0.2)" : "var(--border)"}`,
                opacity: p.active ? 1 : 0.5
              }}>
              <div className="text-sm font-bold w-6 text-center" style={{ color: p.active ? "var(--gold)" : "var(--text-dim)" }}>
                {p.n}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate" style={{ color: p.active ? "var(--text-primary)" : "var(--text-dim)" }}>
                  {p.name}
                </div>
                <div className="text-xs truncate" style={{ color: "var(--text-dim)", fontSize: "10px" }}>
                  {p.desc}
                </div>
              </div>
              {p.active && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "var(--green)" }} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
