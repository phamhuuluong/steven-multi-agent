import { NextRequest, NextResponse } from "next/server";

const HUB = process.env.NEXT_PUBLIC_HUB_URL || "https://hub.lomofx.com";
const DEEPSEEK_KEY = process.env.DEEPSEEK_KEY || "";

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

TÍNH LOT SIZE (CÔNG THỨC ĐÚNG):
• XAUUSD: Lot = (Vốn × %Risk) / (SL_pts × 100)
• $3,000 vốn: an toàn 0.01-0.05 lot. Trên 0.1 lot = nguy hiểm cháy tài khoản!

⚠️ QUY TẮC TỐI QUAN TRỌNG — PHÂN BIỆT ENTRY vs RETEST:

KHI HỘI ĐỒNG AI ĐƯA RA TÍN HIỆU, PHẢI NÓI RÕ:
• Nếu bias = "SELL" + có entry/SL/TP → Đây là LỆNH SELL. Nói rõ: "✅ Hội đồng AI đang có lệnh SELL tại [giá], SL=[x], TP=[y]"
• Nếu chỉ nói "retest tại [vùng]" → Đây CHƯA PHẢI entry. Nói rõ: "⚠️ Đây là VÙNG RETEST, CHƯA CÓ LỆNh. Chỉ vào lệnh khi có confirmation signal."

CÁC MẪU BẮT BUỘC:
✅ ĐÚNG: "Hội đồng AI bias SELL. Hiện đang RETEST kháng cự 4498 — ĐÂY CHƯA PHẢI ENTRY. Đợi nến xác nhận seller phản ứng (nến đỏ đóng cửa dưới 4498) mới vào SELL."
✅ ĐÚNG: "Hội đồng AI có tín hiệu SELL tại 4495, SL 4512, TP 4448 — đây là ENTRY POINT thực sự."
❌ SAI: Chỉ nói "chờ retest 4498" mà không giải thích đó có phải entry không.
❌ SAI: Nói "retest" mà không nêu xu hướng chính + không cảnh báo chưa vào lệnh.

QUY TẮC CỨNG:
• RETEST ≠ ENTRY. Retest là sự kiện giá, entry cần confirmation.
• Bias SELL + retest kháng cự = theo dõi, chờ xác nhận → SELL (KHÔNG vào BUY).
• Bias BUY + retest hỗ trợ = theo dõi, chờ xác nhận → BUY (KHÔNG vào SELL).
• LUÔN nêu xu hướng chính TRƯỚC khi nói về retest.

QUY TẮC CỨNG VỀ NGÔN NGỮ (CRITICAL LANGUAGE REQUIREMENT):
• You MUST reply in the exact same language as the user's question.
• If the user asks in English, reply in English.
• If Chinese, reply in Chinese.
• If Vietnamese, reply in Vietnamese.
• This is an absolute requirement. Do not use Vietnamese if the user speaks another language.
• Chào hỏi → thân thiện, ngắn gọn
• GIÁ: LUÔN dùng từ context bên dưới. TUYỆT ĐỐI KHÔNG tự bịa giá
• Trading → phân tích dữ liệu thực, Pattern #18 Guardrails cho lot size
• Ngắn gọn, có số liệu cụ thể`;

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

    if (!DEEPSEEK_KEY) {
      return NextResponse.json({
        reply: `🤖 Demo mode — DeepSeek key chưa cấu hình.\n\n📊 Data hub: ${context.slice(0, 200)}`,
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
      headers: { "Authorization": `Bearer ${userKey || DEEPSEEK_KEY}`, "Content-Type": "application/json" },
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
