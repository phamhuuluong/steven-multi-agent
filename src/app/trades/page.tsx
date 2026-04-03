"use client";
import { useState, useEffect, useCallback } from "react";

const HUB = "https://hub.lomofx.com";

interface MT5Trade {
  ticket: string;
  signal_id?: string;
  symbol: string;
  type?: string;
  entry?: number;
  sl?: number;
  tp1?: number;
  tp2?: number;
  lot?: number;
  ts_open?: string;
  open_time?: string;
  status?: string;
  profit_pips: number;
  profit_usd?: number;
  ts_close?: string;
  close_time?: string;
  close_reason?: string;
}

function formatTime(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit", month: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso.substring(0, 16); }
}

function closeReasonLabel(reason?: string) {
  const map: Record<string, string> = {
    tp1: "TP1 ✅", tp2: "TP2 🎯", sl: "SL ❌",
    trailing: "Trailing ✅", manual: "Manual",
  };
  return reason ? (map[reason.toLowerCase()] ?? reason) : "—";
}

export default function TradesPage() {
  const [tab, setTab] = useState<"active" | "closed">("active");
  const [active, setActive] = useState<MT5Trade[]>([]);
  const [closed, setClosed] = useState<MT5Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch(`${HUB}/api/mt5/active_trades`).then(r => r.json()),
        fetch(`${HUB}/api/mt5/closed_trades`).then(r => r.json()),
      ]);
      // API returns raw array directly (not wrapped in {trades:[]})
      setActive(Array.isArray(r1) ? r1 : (r1.trades ?? []));
      const closedData = Array.isArray(r2) ? r2 : (r2.trades ?? []);
      setClosed([...closedData].reverse());
      setLastUpdate(new Date().toLocaleTimeString("vi-VN"));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 10000);
    return () => clearInterval(id);
  }, [fetchAll]);

  // Stats
  const totalClosed = closed.length;
  const wins = closed.filter(t => t.profit_pips > 0).length;
  const losses = closed.filter(t => t.profit_pips <= 0).length;
  const winRate = totalClosed > 0 ? (wins / totalClosed) * 100 : 0;
  const totalPips = closed.reduce((s, t) => s + (t.profit_pips ?? 0), 0);

  const trades = tab === "active" ? active : closed;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold gradient-text">⚡ AI Signal</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-dim)" }}>
            Lệnh được MT5 EA thực thi theo tín hiệu Hội Đồng AI
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchAll}
            className="btn-ghost px-4 py-2 rounded-xl text-sm flex items-center gap-2"
            style={{ color: "var(--gold)", border: "1px solid var(--border)" }}
          >
            {loading ? "⏳" : "🔄"} Refetch
            {lastUpdate && <span style={{ color: "var(--text-dim)", fontSize: 11 }}>({lastUpdate})</span>}
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Đang Mở", val: `${active.length}`, color: "#FFD700" },
          { label: "Tổng Đã Đóng", val: `${totalClosed}`, color: "var(--text-primary)" },
          { label: "Win Rate", val: `${winRate.toFixed(0)}%`, color: winRate >= 50 ? "#00E676" : "#FF5252" },
          { label: "Tổng Pips", val: `${totalPips >= 0 ? "+" : ""}${totalPips.toFixed(1)}`, color: totalPips >= 0 ? "#00E676" : "#FF5252" },
        ].map(s => (
          <div key={s.label} className="card text-center py-3">
            <div className="text-xl font-bold" style={{ color: s.color }}>{s.val}</div>
            <div className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 mb-4">
        {(["active", "closed"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-5 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              background: tab === t ? "rgba(245,166,35,0.15)" : "var(--bg-card)",
              color: tab === t ? "var(--gold)" : "var(--text-dim)",
              border: tab === t ? "1px solid var(--gold)" : "1px solid var(--border)",
            }}>
            {t === "active" ? `⚡ AI Signal (${active.length})` : `📋 Lịch Sử (${closed.length})`}
          </button>
        ))}
      </div>

      {/* Trades Table */}
      {trades.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">{tab === "active" ? "⚡" : "📋"}</div>
          <p className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>
            {tab === "active" ? "Chưa có AI Signal đang chạy" : "Chưa có lịch sử lệnh"}
          </p>
          <p className="text-sm mt-2" style={{ color: "var(--text-dim)" }}>
            {tab === "active"
              ? "MT5 EA sẽ vào lệnh khi Hội Đồng AI ra tín hiệu PENDING_EXECUTION"
              : "Lịch sử lệnh sẽ hiển thị sau khi EA đóng lệnh đầu tiên"}
          </p>
        </div>
      ) : tab === "active" ? (
        // Active trades — full columns
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.03)" }}>
                  {["Hướng", "Symbol", "Entry", "SL", "TP1", "TP2", "Lot", "Mở lúc", "Signal ID"].map(h => (
                    <th key={h} style={{ padding: "12px 14px", textAlign: "left", color: "var(--text-dim)", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trades.map((t, i) => {
                  const isBuy = t.type?.toUpperCase() === "BUY";
                  const dirColor = isBuy ? "#00E676" : "#FF5252";
                  return (
                    <tr key={t.ticket ?? i} style={{ borderBottom: "1px solid var(--border)" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <td style={{ padding: "12px 14px" }}>
                        {t.type && <span style={{ background: dirColor, color: "#000", fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6 }}>{t.type.toUpperCase()}</span>}
                      </td>
                      <td style={{ padding: "12px 14px", fontWeight: 600 }}>{t.symbol}</td>
                      <td style={{ padding: "12px 14px" }}>{t.entry?.toFixed(2) ?? "—"}</td>
                      <td style={{ padding: "12px 14px", color: "#FF5252" }}>{t.sl?.toFixed(2) ?? "—"}</td>
                      <td style={{ padding: "12px 14px", color: "#00E676" }}>{t.tp1?.toFixed(2) ?? "—"}</td>
                      <td style={{ padding: "12px 14px", color: "#FFD700" }}>{t.tp2?.toFixed(2) ?? "—"}</td>
                      <td style={{ padding: "12px 14px", color: "var(--text-dim)" }}>{t.lot ?? "—"}</td>
                      <td style={{ padding: "12px 14px", color: "var(--text-dim)", fontSize: 12 }}>{formatTime(t.ts_open ?? t.open_time)}</td>
                      <td style={{ padding: "12px 14px", color: "var(--gold)", fontSize: 11, opacity: 0.7 }}>{t.signal_id ? `#${t.signal_id.substring(0, 8)}` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        // Closed trades — compact: no empty entry/sl/tp columns
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.03)" }}>
                  {["#Ticket", "Symbol", "Kết Quả", "Lý Do", "Đóng Lúc", "Signal ID"].map(h => (
                    <th key={h} style={{ padding: "12px 14px", textAlign: "left", color: "var(--text-dim)", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trades.map((t, i) => {
                  const pipColor = t.profit_pips > 0 ? "#00E676" : t.profit_pips < 0 ? "#FF5252" : "#888";
                  return (
                    <tr key={t.ticket ?? i} style={{ borderBottom: "1px solid var(--border)" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <td style={{ padding: "12px 14px", color: "var(--text-dim)", fontFamily: "monospace" }}>#{String(t.ticket).slice(-6)}</td>
                      <td style={{ padding: "12px 14px", fontWeight: 600 }}>{t.symbol}</td>
                      <td style={{ padding: "12px 14px", fontWeight: 700, fontSize: 15, color: pipColor }}>
                        {t.profit_pips >= 0 ? "+" : ""}{t.profit_pips?.toFixed(1)} pips
                        {t.profit_usd != null && <span style={{ fontSize: 11, marginLeft: 6, opacity: 0.7 }}>(${t.profit_usd?.toFixed(2)})</span>}
                      </td>
                      <td style={{ padding: "12px 14px" }}>{closeReasonLabel(t.close_reason)}</td>
                      <td style={{ padding: "12px 14px", color: "var(--text-dim)", fontSize: 12 }}>{formatTime(t.ts_close ?? t.close_time)}</td>
                      <td style={{ padding: "12px 14px", color: "var(--gold)", fontSize: 11, opacity: 0.7 }}>{t.signal_id ? `#${t.signal_id.substring(0, 8)}` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
