"use client";
import { useEffect, useState, useCallback } from "react";

const HUB = process.env.NEXT_PUBLIC_HUB_URL || "https://hub.lomofx.com";

type BtcData = {
  price: number; change_1h: number; change_24h: number; bias: string;
  vp: { "1h": { poc: number; vah: number; val: number }; "4h": { poc: number; vah: number; val: number } };
  ob: { bullish_1h: number[]; bearish_1h: number[]; bullish_4h: number[]; bearish_4h: number[] };
  fvg: { up_1h: number[][]; down_1h: number[][]; up_4h: number[][]; down_4h: number[][] };
  sweeps: { type: string; level: number; close: number }[];
  wyckoff_phase: string; cvd: number; cvd_divergence: boolean; cvd_divergence_type: string;
  long_ratio: number; short_ratio: number; open_interest: number; oi_change_24h_pct: number;
  l2_bid_walls: { price: number; qty_usd: number }[]; l2_ask_walls: { price: number; qty_usd: number }[];
  summary: string; timestamp: string;
};

function biasClass(b: string) {
  const u = b?.toUpperCase();
  if (u?.includes("STRONG BUY") || u?.includes("STRONG_BUY")) return "badge-buy";
  if (u?.includes("BUY")) return "badge-buy";
  if (u?.includes("STRONG SELL") || u?.includes("STRONG_SELL")) return "badge-sell";
  if (u?.includes("SELL")) return "badge-sell";
  return "badge-wait";
}

function wyckoffColor(phase: string) {
  if (phase === "Markup") return "var(--green)";
  if (phase === "Accumulation") return "var(--blue)";
  if (phase === "Markdown") return "var(--red)";
  if (phase === "Distribution") return "#a78bfa";
  return "var(--gold)";
}

function Chip({ label, color }: { label: string; color?: string }) {
  return (
    <span className="px-2 py-0.5 rounded-md text-xs font-mono font-semibold"
      style={{ background: "rgba(255,255,255,0.06)", color: color || "var(--text-primary)" }}>
      {label}
    </span>
  );
}

export default function BtcPage() {
  const [data, setData] = useState<BtcData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState("");

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const r = await window.fetch(`${HUB}/btc/analysis`, { cache: "no-store" });
      if (r.ok) {
        setData(await r.json());
        setLastUpdate(new Date().toLocaleTimeString("vi-VN"));
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); const id = setInterval(fetch, 60000); return () => clearInterval(id); }, [fetch]);

  if (loading && !data) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center" style={{ color: "var(--text-dim)" }}>
        <div className="text-3xl mb-2">⏳</div>Đang phân tích BTC từ Binance...
      </div>
    </div>
  );

  if (!data) return (
    <div className="glass p-8 text-center" style={{ color: "var(--text-dim)" }}>
      ⚠️ Không tải được BTC data
    </div>
  );

  const fmtPrice = (p: number) => p ? `$${p.toLocaleString("en-US", { maximumFractionDigits: 1 })}` : "—";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold gradient-text">BTC Analysis</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-dim)" }}>
            Binance L2 · SMC · Volume Profile · Wyckoff · CVD · L/S Ratio
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full pulse-live" style={{ background: "var(--green)" }}></div>
          <span className="text-xs mono" style={{ color: "var(--text-dim)" }}>{lastUpdate}</span>
          <button onClick={fetch} disabled={loading}
            className="btn-ghost px-3 py-1.5 text-xs border-0 cursor-pointer">↻</button>
        </div>
      </div>

      {/* Price + Bias row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass p-4">
          <div className="text-xs mb-1" style={{ color: "var(--text-dim)" }}>BTC/USDT</div>
          <div className="text-2xl font-bold mono" style={{ color: "var(--gold)" }}>{fmtPrice(data.price)}</div>
          <div className="flex gap-2 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full ${data.change_1h >= 0 ? "badge-buy" : "badge-sell"}`}>
              1H: {data.change_1h >= 0 ? "+" : ""}{data.change_1h}%
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${data.change_24h >= 0 ? "badge-buy" : "badge-sell"}`}>
              24H: {data.change_24h >= 0 ? "+" : ""}{data.change_24h}%
            </span>
          </div>
        </div>

        <div className="glass p-4">
          <div className="text-xs mb-1" style={{ color: "var(--text-dim)" }}>AI BIAS</div>
          <span className={`px-3 py-1.5 rounded-full text-sm font-bold ${biasClass(data.bias)}`}>{data.bias}</span>
          <div className="text-xs mt-2" style={{ color: "var(--text-dim)" }}>{data.summary.split("|")[0]}</div>
        </div>

        <div className="glass p-4">
          <div className="text-xs mb-1" style={{ color: "var(--text-dim)" }}>WYCKOFF PHASE</div>
          <div className="text-lg font-bold" style={{ color: wyckoffColor(data.wyckoff_phase) }}>
            {data.wyckoff_phase}
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>
            {data.wyckoff_phase === "Markup" ? "Trending up, buyers in control" :
             data.wyckoff_phase === "Markdown" ? "Trending down, sellers in control" :
             data.wyckoff_phase === "Accumulation" ? "Smart money absorbing supply" :
             data.wyckoff_phase === "Distribution" ? "Smart money distributing holdings" :
             "Sideways, direction unclear"}
          </div>
        </div>

        <div className="glass p-4">
          <div className="text-xs mb-1" style={{ color: "var(--text-dim)" }}>LONG / SHORT RATIO</div>
          <div className="flex items-end gap-2">
            <span className="text-xl font-bold" style={{ color: "var(--green)" }}>{data.long_ratio}%</span>
            <span className="text-xs mb-1" style={{ color: "var(--text-dim)" }}>/ </span>
            <span className="text-xl font-bold" style={{ color: "var(--red)" }}>{data.short_ratio}%</span>
          </div>
          <div className="flex rounded-full overflow-hidden h-2 mt-2">
            <div style={{ width: `${data.long_ratio}%`, background: "var(--green)" }} />
            <div style={{ width: `${data.short_ratio}%`, background: "var(--red)" }} />
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>
            OI {data.oi_change_24h_pct >= 0 ? "↑" : "↓"} {Math.abs(data.oi_change_24h_pct)}% 24h
            {data.long_ratio > 65 ? " · Crowd overleveraged LONG" : data.short_ratio > 60 ? " · Crowd overleveraged SHORT" : ""}
          </div>
        </div>
      </div>

      {/* Volume Profile + CVD */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass p-4">
          <div className="text-xs font-semibold mb-3" style={{ color: "var(--gold)" }}>📊 VOLUME PROFILE</div>
          {(["1h", "4h"] as const).map(tf => (
            <div key={tf} className="mb-3">
              <div className="text-xs font-semibold mb-1 uppercase" style={{ color: "var(--text-dim)" }}>{tf}</div>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-xs" style={{ color: "var(--text-dim)" }}>POC:</span>
                  <Chip label={fmtPrice(data.vp[tf].poc)} color="var(--gold)" />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs" style={{ color: "var(--text-dim)" }}>VAH:</span>
                  <Chip label={fmtPrice(data.vp[tf].vah)} color="var(--green)" />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs" style={{ color: "var(--text-dim)" }}>VAL:</span>
                  <Chip label={fmtPrice(data.vp[tf].val)} color="var(--red)" />
                </div>
              </div>
              {/* Price position bar */}
              {data.vp[tf].vah > data.vp[tf].val && (
                <div className="mt-2">
                  <div className="h-2 rounded-full relative overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="absolute h-full rounded-full"
                      style={{
                        background: "linear-gradient(90deg, var(--red), var(--gold), var(--green))",
                        width: "100%", opacity: 0.3
                      }} />
                    <div className="absolute top-0 w-0.5 h-full rounded"
                      style={{
                        background: "white",
                        left: `${Math.max(0, Math.min(100, (data.price - data.vp[tf].val) / (data.vp[tf].vah - data.vp[tf].val) * 100))}%`
                      }} />
                  </div>
                  <div className="flex justify-between text-xs mt-0.5" style={{ color: "var(--text-dim)", fontSize: "9px" }}>
                    <span>VAL</span><span>POC</span><span>VAH</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="glass p-4">
          <div className="text-xs font-semibold mb-3" style={{ color: "var(--gold)" }}>📈 CVD & ORDER FLOW</div>
          <div className="space-y-3">
            <div>
              <div className="text-xs mb-1" style={{ color: "var(--text-dim)" }}>Cumulative Volume Delta (1H)</div>
              <div className="text-xl font-bold mono" style={{ color: data.cvd >= 0 ? "var(--green)" : "var(--red)" }}>
                {data.cvd >= 0 ? "+" : ""}{data.cvd.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </div>
            </div>
            {data.cvd_divergence && (
              <div className="px-3 py-2 rounded-xl flex items-center gap-2"
                style={{ background: "rgba(255,77,106,0.1)", border: "1px solid rgba(255,77,106,0.3)" }}>
                <span>⚠️</span>
                <div className="text-xs" style={{ color: "var(--red)" }}>
                  <span className="font-bold">CVD Divergence: </span>
                  {data.cvd_divergence_type.replace("_", " ")} — giá và volume đang mâu thuẫn
                </div>
              </div>
            )}

            {/* L2 Order Book Walls */}
            <div>
              <div className="text-xs font-semibold mb-2" style={{ color: "var(--text-dim)" }}>L2 BID WALLS</div>
              {data.l2_bid_walls.length > 0 ? data.l2_bid_walls.map((w, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1">
                  <span className="mono" style={{ color: "var(--green)" }}>{fmtPrice(w.price)}</span>
                  <span style={{ color: "var(--text-dim)" }}>${w.qty_usd}M</span>
                </div>
              )) : <div className="text-xs" style={{ color: "var(--text-dim)" }}>Không có wall đáng kể</div>}
            </div>
            <div>
              <div className="text-xs font-semibold mb-2" style={{ color: "var(--text-dim)" }}>L2 ASK WALLS</div>
              {data.l2_ask_walls.length > 0 ? data.l2_ask_walls.map((w, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1">
                  <span className="mono" style={{ color: "var(--red)" }}>{fmtPrice(w.price)}</span>
                  <span style={{ color: "var(--text-dim)" }}>${w.qty_usd}M</span>
                </div>
              )) : <div className="text-xs" style={{ color: "var(--text-dim)" }}>Không có wall đáng kể</div>}
            </div>
          </div>
        </div>
      </div>

      {/* SMC: OB + FVG + Sweeps */}
      <div className="glass p-4">
        <div className="text-xs font-semibold mb-3" style={{ color: "var(--gold)" }}>
          🧠 SMART MONEY CONCEPTS (SMC)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Order Blocks */}
          <div>
            <div className="text-xs font-semibold mb-2" style={{ color: "var(--text-dim)" }}>ORDER BLOCKS</div>
            <div className="space-y-1.5">
              {data.ob.bullish_1h.map((p, i) => (
                <div key={`bull-1h-${i}`} className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: "var(--green)" }}></span>
                  <span className="font-semibold" style={{ color: "var(--green)" }}>Bull OB 1H</span>
                  <span className="mono">{fmtPrice(p)}</span>
                </div>
              ))}
              {data.ob.bullish_4h.map((p, i) => (
                <div key={`bull-4h-${i}`} className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: "var(--green)", opacity: 0.6 }}></span>
                  <span style={{ color: "var(--green)", opacity: 0.8 }}>Bull OB 4H</span>
                  <span className="mono">{fmtPrice(p)}</span>
                </div>
              ))}
              {data.ob.bearish_1h.map((p, i) => (
                <div key={`bear-1h-${i}`} className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: "var(--red)" }}></span>
                  <span className="font-semibold" style={{ color: "var(--red)" }}>Bear OB 1H</span>
                  <span className="mono">{fmtPrice(p)}</span>
                </div>
              ))}
              {data.ob.bearish_4h.map((p, i) => (
                <div key={`bear-4h-${i}`} className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: "var(--red)", opacity: 0.6 }}></span>
                  <span style={{ color: "var(--red)", opacity: 0.8 }}>Bear OB 4H</span>
                  <span className="mono">{fmtPrice(p)}</span>
                </div>
              ))}
              {!data.ob.bullish_1h.length && !data.ob.bearish_1h.length &&
                <div className="text-xs" style={{ color: "var(--text-dim)" }}>Không phát hiện OB</div>}
            </div>
          </div>

          {/* FVG */}
          <div>
            <div className="text-xs font-semibold mb-2" style={{ color: "var(--text-dim)" }}>FAIR VALUE GAPS</div>
            <div className="space-y-1.5">
              {data.fvg.up_1h.slice(0, 3).map((g, i) => (
                <div key={i} className="text-xs p-1.5 rounded-lg" style={{ background: "rgba(0,212,170,0.08)" }}>
                  <span style={{ color: "var(--green)" }}>▲ FVG 1H</span>
                  <span className="mono ml-2">{fmtPrice(g[0])} → {fmtPrice(g[1])}</span>
                </div>
              ))}
              {data.fvg.down_1h.slice(0, 3).map((g, i) => (
                <div key={i} className="text-xs p-1.5 rounded-lg" style={{ background: "rgba(255,77,106,0.08)" }}>
                  <span style={{ color: "var(--red)" }}>▼ FVG 1H</span>
                  <span className="mono ml-2">{fmtPrice(g[0])} → {fmtPrice(g[1])}</span>
                </div>
              ))}
              {!data.fvg.up_1h.length && !data.fvg.down_1h.length &&
                <div className="text-xs" style={{ color: "var(--text-dim)" }}>Không có FVG đáng kể</div>}
            </div>
          </div>

          {/* Sweeps */}
          <div>
            <div className="text-xs font-semibold mb-2" style={{ color: "var(--text-dim)" }}>LIQUIDITY SWEEPS</div>
            <div className="space-y-1.5">
              {data.sweeps.slice(0, 5).map((s, i) => (
                <div key={i} className="text-xs p-1.5 rounded-lg"
                  style={{ background: s.type === "sweep_high" ? "rgba(255,77,106,0.08)" : "rgba(0,212,170,0.08)" }}>
                  <div className={s.type === "sweep_high" ? "text-red-400" : "text-green-400"}
                    style={{ color: s.type === "sweep_high" ? "var(--red)" : "var(--green)", fontWeight: 600 }}>
                    {s.type === "sweep_high" ? "🔴 Sweep High" : "🟢 Sweep Low"}
                  </div>
                  <div className="mono mt-0.5" style={{ color: "var(--text-dim)" }}>
                    Level: {fmtPrice(s.level)} | Close: {fmtPrice(s.close)}
                  </div>
                </div>
              ))}
              {!data.sweeps.length &&
                <div className="text-xs" style={{ color: "var(--text-dim)" }}>Không có sweep gần đây</div>}
            </div>
          </div>
        </div>
      </div>

      {/* AI Summary */}
      <div className="glass px-4 py-3 flex items-start gap-2">
        <span className="text-lg flex-shrink-0">🤖</span>
        <div className="text-sm" style={{ color: "var(--text-dim)" }}>
          <span className="font-semibold" style={{ color: "var(--gold)" }}>AI Summary: </span>
          {data.summary}
          <span className="ml-2 text-xs" style={{ color: "var(--text-dim)", fontSize: "10px" }}>
            · {data.timestamp ? new Date(data.timestamp).toLocaleString("vi-VN") : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
