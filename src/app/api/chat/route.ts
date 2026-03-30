import { NextRequest, NextResponse } from "next/server";

const HUB = process.env.NEXT_PUBLIC_HUB_URL || "https://hub.lomofx.com";
// DEEPSEEK_KEY from env OR fetched from Hub admin config at runtime
const ENV_KEY = process.env.DEEPSEEK_KEY || "";

/** Fetch API key from Hub admin /api/config (so Hub admin panel key works) */
async function getDeepSeekKey(userKey?: string): Promise<string> {
  if (userKey) return userKey;
  if (ENV_KEY)  return ENV_KEY;
  try {
    const r = await fetch(`${HUB}/api/config`, { cache: "no-store", signal: AbortSignal.timeout(4000) });
    if (r.ok) {
      const cfg = await r.json();
      // Hub stores keys as cfg.keys.deepseek or cfg.keys.gemini etc.
      const k = cfg?.keys?.deepseek || cfg?.deepseek_key || cfg?.key || "";
      if (k && k.startsWith("sk-")) return k;
    }
  } catch {}
  return "";
}

/** GET — quick test endpoint for connection status */
export async function GET(req: NextRequest) {
  const userKey = req.headers.get("X-Api-Key") || "";
  const key = await getDeepSeekKey(userKey);
  if (!key) {
    return NextResponse.json({ ok: false, status: "no_key", message: "Chưa cấu hình API key. Vào Hub Admin → Cài đặt để thêm DeepSeek key." });
  }
  try {
    const r = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "deepseek-chat", messages: [{ role: "user", content: "ping — reply exactly: pong" }], max_tokens: 10 }),
      signal: AbortSignal.timeout(8000)
    });
    if (r.ok) {
      const d = await r.json();
      return NextResponse.json({ ok: true, status: "connected", message: `✅ Kết nối OK — DeepSeek phản hồi: "${d?.choices?.[0]?.message?.content || "ok"}"` });
    }
    return NextResponse.json({ ok: false, status: `api_error_${r.status}`, message: `⚠️ DeepSeek API lỗi ${r.status} — Key có thể sai hoặc hết quota.` });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, status: "timeout", message: `⚠️ Timeout: ${e instanceof Error ? e.message : "unknown"}` });
  }
}

const TRADING_KEYWORDS = ["vàng","gold","xauusd","mua","bán","sell","buy","lot","lệnh",
  "entry","sl","tp","stop","cvd","bookmap","chart","giá","signal","tín hiệu",
  "phân tích","kháng cự","hỗ trợ","trend","rủi ro","volume","dom","thị trường","retest",
  "btc","bitcoin","crypto","binance","wyckoff","fvg","ob","sweep","pip","m15","m5","h1"];

const BTC_KEYWORDS = ["btc","bitcoin","crypto","binance","btcusd"];

async function buildContext(isTrading: boolean, isBtc: boolean = false) {
  try {
    const fetches: Promise<Response>[] = [
      fetch(`${HUB}/orderflow/snapshot`, { cache: "no-store" }),
    ];
    if (isTrading) fetches.push(fetch(`${HUB}/api/market-context`, { cache: "no-store" }));
    if (isBtc)     fetches.push(fetch(`${HUB}/btc/analysis`, { cache: "no-store" }));

    const results = await Promise.allSettled(fetches);
    const snap = results[0].status === "fulfilled" && results[0].value.ok
      ? await results[0].value.json() : {};
    const ctx  = isTrading && results[1]?.status === "fulfilled" && (results[1] as PromiseFulfilledResult<Response>).value.ok
      ? await (results[1] as PromiseFulfilledResult<Response>).value.json() : {};
    const isBtcIdx = isTrading ? 2 : 1;
    const btc  = isBtc && results[isBtcIdx]?.status === "fulfilled" && (results[isBtcIdx] as PromiseFulfilledResult<Response>).value.ok
      ? await (results[isBtcIdx] as PromiseFulfilledResult<Response>).value.json() : null;

    const price = snap?.current_price || snap?.entry || "N/A";
    const bias  = snap?.overall_bias || "N/A";
    const conf  = snap?.confidence || 0;

    // VN time injection — so AI always knows correct day/time
    const vnNow = new Date().toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      weekday: "long", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit"
    });

    let context = `[THỜI GIAN VIỆT NAM: ${vnNow} (GMT+7)]\nXAUUSD: ${price} | Bias: ${bias} | Conf: ${conf}% | SL: ${snap?.sl||"N/A"} | TP: ${snap?.tp||"N/A"}`;
    if (isTrading && ctx?.context) context += `\n${ctx.context.slice(0, 1200)}`;

    if (isBtc && btc && !btc.error) {
      const vp = btc.vp?.["1h"] || {};
      const swps = ([...(btc.sweeps_m15||[]), ...(btc.sweeps_1h||[])]).slice(0,2).map((s:{type:string;level:number}) => `${s.type}@${s.level}`).join(", ");
      context += `

=== BTC/USDT Binance L2 ===
Price: $${btc.price?.toLocaleString()} | 24H: ${btc.change_24h}%
Bias: ${btc.bias} | Wyckoff: ${btc.wyckoff_phase}
M15: ${btc.m15_signal||"N/A"} (${btc.m15_momentum_pct||0}%)
POC=${vp.poc} VAH=${vp.vah} VAL=${vp.val}
CVD: ${btc.cvd} ${btc.cvd_divergence ? "DIV:"+btc.cvd_divergence_type : ""} | L/S: ${btc.long_ratio}%/${btc.short_ratio}%
Sweeps: ${swps||"none"} | OI 24H: ${btc.oi_change_24h_pct}%
Note: SL/TP min 50-200 pips. BTCUSDT=BTCUSD Exness.`;
    }

    return context;
  } catch {
    return "Hub data unavailable";
  }
}

const SYSTEM_PROMPT = `Bạn là Steven AI — chuyên gia Bookmap L2 Order Flow & quản lý rủi ro vàng XAUUSD.
Tích hợp 21 Agentic Design Patterns để phân tích thị trường chuyên nghiệp.

QUY TẮC CỐT LÕI MỚI (PHẢI TUÂN THỦ 100%):
• CỰC KỲ NGẮN GỌN & ĐÚNG TRỌNG TÂM. Trả lời ngay vào câu hỏi của user chưa đầy 3 câu.
• KHÔNG lặp lại các dữ liệu (Data) mà user đã biết hoặc hệ thống cung cấp trong context (như CVD, độ lệch, Bookmap) trừ khi CẦN THIẾT cho luận điểm phân tích.
• Đưa ra QUYẾT ĐỊNH RÕ RÀNG (Buy/Sell/Wait) kèm điểm Entry, SL, TP ngay lập tức. Format: "BUY tại [x], SL [y], TP [z]".
• Không giải thích dông dài các thuật ngữ cơ bản.

TÍNH LOT SIZE (CÔNG THỨC ĐÚNG):
• XAUUSD: Lot = (Vốn × %Risk) / (SL_pts × 100)
• $3,000 vốn: an toàn 0.01-0.05 lot. Trên 0.1 lot = nguy hiểm cháy!

⚠️ PHÂN BIỆT ENTRY vs RETEST:
• Bias "SELL" + có entry/SL/TP → LỆNH SELL. Nói ngắn: "✅ Có lệnh SELL tại [giá], SL=[x], TP=[y]"
• Chỉ "retest tại [vùng]" → Nói: "⚠️ VÙNG RETEST, CHƯA VÀO LỆNH. Đợi nến đỏ phá xuống mới SELL."

NGÔN NGỮ ĐỒNG NHẤT VỚI USER:
• Bắt buộc trả lời bằng chính ngôn ngữ user đã hỏi (Tiếng Việt/English/Chinese...).`;

export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = await req.json();
    if (!message) return NextResponse.json({ error: "No message" }, { status: 400 });
    const userKey = req.headers.get("X-Api-Key") || "";


    const lower = message.toLowerCase();
    const isTrading = TRADING_KEYWORDS.some(k => lower.includes(k));
    const isBtc = BTC_KEYWORDS.some(k => lower.includes(k));

    const context = await buildContext(isTrading, isBtc);
    const userContent = `${context}\n\nCâu hỏi: ${message}`;

    const key = await getDeepSeekKey(userKey);
    if (!key) {
      return NextResponse.json({
        reply: `🤖 Demo mode — DeepSeek key chưa cấu hình.\n\nVào Hub Admin → Cài đặt → thêm DeepSeek API key để bật đầy đủ.\n\n📊 Data hub: ${context.slice(0, 200)}`,
        patterns: isTrading ? ["#2 Routing→Trading", "#3 Parallel"] : ["#2 Routing→General"]
      });
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.slice(-6).map((h: {role: string; content: string}) => ({ role: h.role, content: h.content })),
      { role: "user", content: userContent }
    ];

    const r = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "deepseek-chat", messages, max_tokens: 700 }),
      signal: AbortSignal.timeout(25000)
    });

    if (!r.ok) {
      return NextResponse.json({
        reply: `⚠️ DeepSeek API lỗi (${r.status}). Thử lại sau.\n\n📊 Data hub hiện tại: ${context.slice(0, 300)}`,
        patterns: ["#12 ExceptionHandling"]
      });
    }

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content || "Không có phản hồi";
    const patterns = isTrading
      ? ["#1 Chaining", "#2 Routing→Trading", "#3 Parallel", "#14 RAG", "#18 Guardrails"]
      : ["#2 Routing→General", "#12 ExceptionHandling"];

    return NextResponse.json({ reply, patterns });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({
      reply: `⚠️ Lỗi: ${message}`,
      patterns: ["#12 ExceptionHandling"]
    });
  }
}
