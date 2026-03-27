"use client";
import { useState } from "react";

export default function CalculatorPage() {
  const [capital, setCapital] = useState(3000);
  const [risk, setRisk] = useState(1);
  const [slPts, setSlPts] = useState(16);

  // Pattern #18 Guardrails: validate before calculating
  const riskDollar = capital * (risk / 100);
  const lotSize = riskDollar / (slPts * 100);
  const lotRound = Math.round(lotSize * 100) / 100;

  const isExtremelyDangerous = lotRound > 0.5 || risk > 3;
  const isDangerous = lotRound > 0.1 || risk > 2;
  const isSafe = !isDangerous;

  const rr = slPts > 0 ? ((slPts * 1.5) / slPts).toFixed(1) : "—";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold gradient-text">Risk Guard</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-dim)" }}>
          Pattern #18 Guardrails — Bảo vệ tài khoản khỏi over-leverage
        </p>
      </div>

      {/* Formula note */}
      <div className="glass p-4">
        <div className="text-xs font-semibold mb-2" style={{ color: "var(--gold)" }}>CÔNG THỨC ĐÚNG XAUUSD</div>
        <div className="mono text-sm" style={{ color: "var(--text-primary)" }}>
          Lot = (Vốn × Risk%) / (SL_pts × $100)
        </div>
        <div className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>
          XAUUSD: 1 lot = 100 oz · Giá di 1 point = $100/lot
        </div>
      </div>

      {/* Inputs */}
      <div className="glass p-6 space-y-5">
        <div>
          <label className="text-sm font-medium mb-2 block" style={{ color: "var(--text-dim)" }}>
            💰 Vốn (USD)
          </label>
          <input type="number" value={capital} onChange={e => setCapital(+e.target.value)}
            className="input-dark w-full px-4 py-3 text-lg font-bold mono" />
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm font-medium" style={{ color: "var(--text-dim)" }}>⚡ Risk %</label>
            <span className="text-sm mono font-bold" style={{ color: risk > 2 ? "var(--red)" : "var(--green)" }}>{risk}%</span>
          </div>
          <input type="range" min={0.5} max={5} step={0.5} value={risk}
            onChange={e => setRisk(+e.target.value)}
            className="w-full accent-amber-400" />
          <div className="flex justify-between text-xs mt-1" style={{ color: "var(--text-dim)" }}>
            <span>0.5% (An toàn)</span><span>2% (Giới hạn)</span><span>5% (Nguy hiểm)</span>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block" style={{ color: "var(--text-dim)" }}>
            📏 Stop Loss (points)
          </label>
          <input type="number" value={slPts} onChange={e => setSlPts(+e.target.value)}
            className="input-dark w-full px-4 py-3 mono" />
          <div className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>
            Ví dụ: Entry 4440, SL 4424 → SL = 16 points
          </div>
        </div>
      </div>

      {/* Result — Pattern #18 Guardrails */}
      <div className="glass p-6">
        <div className="text-xs font-semibold mb-4" style={{ color: "var(--text-dim)" }}>
          🛡️ KẾT QUẢ — Pattern #18 Guardrails
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="text-xs mb-1" style={{ color: "var(--text-dim)" }}>Risk tiền mặt</div>
            <div className="text-2xl font-bold mono" style={{ color: "var(--gold)" }}>
              ${riskDollar.toFixed(0)}
            </div>
          </div>
          <div className="p-4 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="text-xs mb-1" style={{ color: "var(--text-dim)" }}>Lot size</div>
            <div className="text-2xl font-bold mono"
              style={{ color: isSafe ? "var(--green)" : isDangerous ? "var(--gold)" : "var(--red)" }}>
              {lotRound.toFixed(2)} lot
            </div>
          </div>
        </div>

        {/* Safety verdict */}
        <div className={`p-4 rounded-xl ${isExtremelyDangerous ? "badge-sell" : isDangerous ? "badge-wait" : "badge-buy"}`}>
          <div className="font-bold mb-1">
            {isExtremelyDangerous ? "🚨 CỰC KỲ NGUY HIỂM — Có thể thổi tài khoản" :
             isDangerous ? "⚠️ RỦI RO CAO — Vượt ngưỡng an toàn 2%" :
             "✅ AN TOÀN — Trong vùng risk khuyến nghị"}
          </div>
          <div className="text-sm opacity-90">
            {isExtremelyDangerous
              ? `Với vốn $${capital.toLocaleString()}, lot ${lotRound} = risk $${(lotRound * slPts * 100).toFixed(0)} = ${(lotRound * slPts * 100 / capital * 100).toFixed(1)}% vốn. Giảm lot xuống dưới 0.05.`
              : isDangerous
              ? `Risk ${risk}% vượt ngưỡng an toàn 1-2%. Nên giảm về risk 1% = lot ${(capital * 0.01 / (slPts * 100)).toFixed(2)}.`
              : `Lot ${lotRound} với SL ${slPts}pt = risk $${riskDollar.toFixed(0)} (${risk}% vốn). Vùng an toàn!`}
          </div>
        </div>

        {/* Reference lots */}
        <div className="mt-4 space-y-2">
          <div className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>SO SÁNH THEO RISK LEVEL:</div>
          {[0.5, 1, 1.5, 2].map(r => {
            const l = (capital * (r/100) / (slPts * 100));
            return (
              <div key={r} className="flex items-center justify-between text-sm">
                <span style={{ color: "var(--text-dim)" }}>Risk {r}% (${(capital * r / 100).toFixed(0)})</span>
                <span className="mono font-semibold"
                  style={{ color: r <= 1 ? "var(--green)" : r <= 2 ? "var(--gold)" : "var(--red)" }}>
                  {l.toFixed(2)} lot
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
