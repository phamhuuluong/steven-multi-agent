"use client";
import { useEffect, useState } from "react";

const HUB = process.env.NEXT_PUBLIC_HUB_URL || "https://hub.lomofx.com";

function getBiasClass(bias: string) {
  const b = bias?.toUpperCase();
  if (b?.includes("BUY")) return "badge-buy";
  if (b?.includes("SELL")) return "badge-sell";
  return "badge-wait";
}

export default function SignalsPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${HUB}/api/council_history`, { cache: "no-store" })
      .then(r => r.json()).then(d => { setHistory(d || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const wins = history.filter(h => h.outcome === "win").length;
  const losses = history.filter(h => h.outcome === "loss").length;
  const winRate = history.length > 0 ? ((wins / history.length) * 100).toFixed(0) : "—";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold gradient-text">Signal History</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-dim)" }}>
          Pattern #19 Evaluation & Observability · #20 Prioritization
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Tổng signal", value: history.length, color: "var(--text-primary)" },
          { label: "Win Rate", value: `${winRate}%`, color: "var(--green)" },
          { label: "Wins", value: wins, color: "var(--green)" },
          { label: "Losses", value: losses, color: "var(--red)" },
        ].map(s => (
          <div key={s.label} className="glass p-4 text-center">
            <div className="text-xs mb-1" style={{ color: "var(--text-dim)" }}>{s.label}</div>
            <div className="text-2xl font-bold mono" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="glass p-6">
        {loading ? (
          <div className="text-center py-8" style={{ color: "var(--text-dim)" }}>⏳ Đang tải...</div>
        ) : history.length === 0 ? (
          <div className="text-center py-8" style={{ color: "var(--text-dim)" }}>
            Chưa có signal history. Hub đang offline hoặc chưa có lệnh nào.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: "var(--text-dim)", borderBottom: "1px solid var(--border)" }}>
                  {["#", "Thời gian", "Bias", "Entry", "SL", "TP", "Conf", "Kết quả"].map(h => (
                    <th key={h} className="text-left pb-3 pr-4 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((h: any, i) => (
                  <tr key={i} className="transition-colors"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "")}>
                    <td className="py-3 pr-4 text-xs" style={{ color: "var(--text-dim)" }}>{i + 1}</td>
                    <td className="py-3 pr-4 text-xs mono" style={{ color: "var(--text-dim)" }}>
                      {h.timestamp || h.last_council_run || "—"}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${getBiasClass(h.overall_bias)}`}>
                        {h.overall_bias || "—"}
                      </span>
                    </td>
                    <td className="py-3 pr-4 mono" style={{ color: "var(--gold)" }}>{h.entry || "—"}</td>
                    <td className="py-3 pr-4 mono" style={{ color: "var(--red)" }}>{h.sl || "—"}</td>
                    <td className="py-3 pr-4 mono" style={{ color: "var(--green)" }}>{h.tp || "—"}</td>
                    <td className="py-3 pr-4 mono">{h.confidence || 0}%</td>
                    <td className="py-3 pr-4">
                      {h.outcome ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs ${h.outcome === "win" ? "badge-buy" : h.outcome === "loss" ? "badge-sell" : "badge-wait"}`}>
                          {h.outcome === "win" ? "✅ Win" : h.outcome === "loss" ? "❌ Loss" : "⏳ Pending"}
                        </span>
                      ) : (
                        <span className="text-xs badge-wait px-2 py-0.5 rounded-full">⏳ Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
