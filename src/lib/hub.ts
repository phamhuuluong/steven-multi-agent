const HUB = process.env.NEXT_PUBLIC_HUB_URL || "https://hub.lomofx.com";

// Verified working endpoints from hub.lomofx.com:
// /orderflow/snapshot → {current_price, overall_bias, entry, sl, tp, confidence, ...}
// /api/council_history → [{...signal...}, ...]
// /api/market-context → {context: "OHLCV DATA..."}

export async function fetchSnapshot() {
  try {
    const r = await fetch(`${HUB}/orderflow/snapshot`, { cache: "no-store" });
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
}

export async function fetchCouncilHistory() {
  try {
    const r = await fetch(`${HUB}/api/council_history`, { cache: "no-store" });
    if (!r.ok) return [];
    return r.json();
  } catch { return []; }
}

export async function fetchMarketContext() {
  try {
    const r = await fetch(`${HUB}/api/market-context`, { cache: "no-store" });
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
}

export function getBiasClass(bias: string) {
  const b = bias?.toUpperCase();
  if (b?.includes("BUY")) return "badge-buy";
  if (b?.includes("SELL")) return "badge-sell";
  return "badge-wait";
}

export function formatPrice(p: number | string | undefined) {
  if (!p) return "—";
  return Number(p).toLocaleString("en-US", { minimumFractionDigits: 1 });
}
