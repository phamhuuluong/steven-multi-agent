"use client";
import { useEffect, useState } from "react";

const HUB = process.env.NEXT_PUBLIC_HUB_URL || "https://hub.lomofx.com";

const AGENTS = [
  { key: "floor_trader", label: "Floor Trader", icon: "🏛️", color: "var(--green)", cssClass: "debate-floor", desc: "L2 Order Flow & DOM" },
  { key: "market_profile", label: "Market Profile", icon: "📊", color: "var(--blue)", cssClass: "debate-market", desc: "Volume Profile & Levels" },
  { key: "risk_desk", label: "Risk Desk", icon: "⚠️", color: "var(--red)", cssClass: "debate-risk", desc: "Risk Management" },
];

function getBiasClass(bias: string) {
  const b = bias?.toUpperCase();
  if (b?.includes("BUY")) return "badge-buy";
  if (b?.includes("SELL")) return "badge-sell";
  return "badge-wait";
}

export default function CouncilPage() {
  const [snap, setSnap] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [sr, hr] = await Promise.all([
        fetch(`${HUB}/orderflow/snapshot`, { cache: "no-store" }),
        fetch(`${HUB}/api/council_history`, { cache: "no-store" }),
      ]);
      if (sr.ok) setSnap(await sr.json());
      if (hr.ok) setHistory((await hr.json()).slice(0, 10));
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const bias = snap?.overall_bias || "WAIT";
  const conf = snap?.confidence || 0;
  const debate = snap?.debate || "";

  // Parse debate into lines per agent
  const debateLines = debate
    ? debate.split(/(?=\[)/).filter(Boolean).map((line: string, i: number) => {
        const bracketEnd = line.indexOf("]");
        const agentName = bracketEnd > 1 ? line.slice(1, bracketEnd).toLowerCase().replace(/\s+/g, "_") : "";
        const text = bracketEnd > 0 ? line.slice(bracketEnd + 1).trim() : line.trim();
        const agent = AGENTS.find(a => agentName.includes(a.key.replace("_", ""))) || AGENTS[i % AGENTS.length];
        return { agent, text, index: i };
      })
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">AI Council</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-dim)" }}>
            Pattern #7 Multi-Agent · #15 A2A Communication · #17 Chain-of-Thought
          </p>
        </div>
        <button onClick={fetchAll} disabled={loading}
          className="btn-gold px-5 py-2.5 text-sm cursor-pointer disabled:opacity-50">
          {loading ? "⏳ Đang tải..." : "⚡ Refresh"}
        </button>
      </div>

      {/* Agent cards */}
      <div className="grid grid-cols-3 gap-4">
        {AGENTS.map((agent) => (
          <div key={agent.key} className="glass p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{agent.icon}</span>
              <div>
                <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{agent.label}</div>
                <div className="text-xs" style={{ color: "var(--text-dim)" }}>{agent.desc}</div>
              </div>
            </div>
            <div className="w-full h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full" style={{ width: "100%", background: agent.color, opacity: 0.7 }} />
            </div>
          </div>
        ))}
      </div>

      {/* Signal result */}
      <div className="glass p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold" style={{ color: "var(--text-dim)" }}>COUNCIL VERDICT</div>
          <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${getBiasClass(bias)}`}>{bias}</span>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Entry", value: snap?.entry || "—", color: "var(--gold)" },
            { label: "SL", value: snap?.sl || "—", color: "var(--red)" },
            { label: "TP", value: snap?.tp || "—", color: "var(--green)" },
            { label: "Confidence", value: `${conf}%`, color: conf >= 70 ? "var(--green)" : "var(--gold)" },
          ].map((item) => (
            <div key={item.label} className="text-center p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="text-xs mb-1" style={{ color: "var(--text-dim)" }}>{item.label}</div>
              <div className="text-xl font-bold mono" style={{ color: item.color }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Confidence bar */}
        <div className="mt-4">
          <div className="progress-bar">
            <div className="progress-fill"
              style={{ width: `${conf}%`, background: `linear-gradient(90deg, var(--gold), ${conf >= 70 ? "var(--green)" : "var(--gold)"})` }} />
          </div>
        </div>
      </div>

      {/* Debate log */}
      <div className="glass p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🧠</span>
          <div>
            <div className="text-sm font-semibold">Debate Log</div>
            <div className="text-xs" style={{ color: "var(--text-dim)" }}>Pattern #15 A2A Communication · #17 Chain-of-Thought visible</div>
          </div>
        </div>
        <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
          {debateLines.length > 0 ? debateLines.map((line, i) => (
            <div key={i} className={`pl-4 py-2 rounded-r-xl fade-in ${line.agent.cssClass}`}
              style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="text-xs font-semibold mb-1 flex items-center gap-1.5"
                style={{ color: line.agent.color }}>
                {line.agent.icon} {line.agent.label}
              </div>
              <div className="text-sm leading-relaxed" style={{ color: "var(--text-dim)" }}>
                {line.text}
              </div>
            </div>
          )) : (
            <div className="py-4 text-center" style={{ color: "var(--text-dim)" }}>
              {loading ? "Đang tải debate log..." : snap?.last_council_run
                ? `Cập nhật lần cuối: ${snap.last_council_run}`
                : "Chưa có debate log. Hub đang offline?"}
            </div>
          )}
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="glass p-6">
          <div className="text-sm font-semibold mb-4" style={{ color: "var(--text-dim)" }}>
            📜 SIGNAL HISTORY — Pattern #19 Evaluation & Observability
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: "var(--text-dim)", borderBottom: "1px solid var(--border)" }}>
                  {["Thời gian", "Bias", "Entry", "SL", "TP", "Conf"].map(h => (
                    <th key={h} className="text-left pb-2 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((h: any, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td className="py-2 pr-4 text-xs mono" style={{ color: "var(--text-dim)" }}>{h.timestamp || h.last_council_run || "—"}</td>
                    <td className="py-2 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${getBiasClass(h.overall_bias)}`}>{h.overall_bias || "—"}</span>
                    </td>
                    <td className="py-2 pr-4 mono" style={{ color: "var(--gold)" }}>{h.entry || "—"}</td>
                    <td className="py-2 pr-4 mono" style={{ color: "var(--red)" }}>{h.sl || "—"}</td>
                    <td className="py-2 pr-4 mono" style={{ color: "var(--green)" }}>{h.tp || "—"}</td>
                    <td className="py-2 pr-4 mono">{h.confidence || 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
