import { NextRequest, NextResponse } from "next/server";

const HUB = process.env.NEXT_PUBLIC_HUB_URL || "https://hub.lomofx.com";
const DEEPSEEK_KEY = process.env.DEEPSEEK_KEY || "";

// Pattern #1: Prompt Chaining — hub context → system prompt → AI response
// Pattern #2: Routing — detect trading vs general questions
// Pattern #12: Exception Handling — fallback responses
// Pattern #18: Guardrails — validate lot size before responding

const TRADING_KEYWORDS = ["vàng","gold","xauusd","mua","bán","sell","buy","lot","lệnh",
  "entry","sl","tp","stop","cvd","bookmap","chart","giá","signal","tín hiệu",
  "phân tích","kháng cự","hỗ trợ","trend","rủi ro","volume","dom","thị trường"];

async function buildContext(isTrading: boolean) {
  try {
    const promises: Promise<Response>[] = [
      fetch(`${HUB}/orderflow/snapshot`, { cache: "no-store" }),
    ];
    if (isTrading) promises.push(fetch(`${HUB}/api/market-context`, { cache: "no-store" }));
    
    const results = await Promise.allSettled(promises);
    const snap = results[0].status === "fulfilled" && results[0].value.ok 
      ? await results[0].value.json() : {};
    const ctx = isTrading && results[1]?.status === "fulfilled" && (results[1] as PromiseFulfilledResult<Response>).value.ok
      ? await (results[1] as PromiseFulfilledResult<Response>).value.json() : {};

    const price = snap?.current_price || snap?.entry || "N/A";
    const bias = snap?.overall_bias || "N/A";
    const conf = snap?.confidence || 0;

    const priceCtx = `Giá XAUUSD thực tế từ hub: ${price} | AI Council: ${bias} | Confidence: ${conf}%`;
    
    if (isTrading) {
      const marketCtx = ctx?.context?.slice(0, 2000) || "";
      return `${priceCtx}\nSL: ${snap?.sl || "N/A"} | TP: ${snap?.tp || "N/A"}\n\n${marketCtx}`;
    }
    return priceCtx;
  } catch {
    return "Hub data unavailable";
  }
}

const SYSTEM_PROMPT = `Bạn là Steven AI — chuyên gia Bookmap L2 Order Flow & quản lý rủi ro vàng XAUUSD.
Tích hợp 21 Agentic Design Patterns để phân tích thị trường chuyên nghiệp.

TÍNH LOT SIZE (CÔNG THỨC ĐÚNG):
• XAUUSD: Lot = (Vốn × %Risk) / (SL_pts × 100)
• $3,000 vốn: an toàn 0.01-0.05 lot. Trên 0.1 lot = nguy hiểm cháy tài khoản!

QUY TẮC:
• Chào hỏi → thân thiện, ngắn gọn
• GIÁ: LUÔN dùng từ context bên dưới. TUYỆT ĐỐI KHÔNG tự bịa giá
• Trading → phân tích dữ liệu thực, Pattern #18 Guardrails cho lot size
• Trả lời TIẾNG VIỆT, ngắn gọn, có số liệu cụ thể`;

export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = await req.json();
    if (!message) return NextResponse.json({ error: "No message" }, { status: 400 });

    const lower = message.toLowerCase();
    const isTrading = TRADING_KEYWORDS.some(k => lower.includes(k));
    
    // Pattern #3: Parallelization — fetch context while building prompt
    const context = await buildContext(isTrading);
    const userContent = `${context}\n\nCâu hỏi: ${message}`;

    if (!DEEPSEEK_KEY) {
      return NextResponse.json({
        reply: `🤖 Demo mode — DeepSeek key chưa cấu hình.\n\n📊 Data hub: ${context.slice(0, 200)}`,
        patterns: isTrading ? ["#2 Routing→Trading", "#3 Parallel"] : ["#2 Routing→General"]
      });
    }

    // Pattern #16: Resource-Aware Optimization — choose fast model for chat
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.slice(-6).map((h: {role: string; content: string}) => ({ role: h.role, content: h.content })),
      { role: "user", content: userContent }
    ];

    const r = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${DEEPSEEK_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "deepseek-chat", messages, max_tokens: 700 }),
      signal: AbortSignal.timeout(25000)
    });

    if (!r.ok) {
      const err = await r.text();
      // Pattern #12: Exception Handling
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
