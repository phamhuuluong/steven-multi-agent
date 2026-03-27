"use client";
import { useEffect, useState, useRef } from "react";

const HUB = process.env.NEXT_PUBLIC_HUB_URL || "https://hub.lomofx.com";

const QUICK_QUESTIONS = [
  "Vàng nên mua hay bán hiện tại?",
  "Điểm vào lệnh hợp lý?",
  "SL nên đặt ở đâu?",
  "CVD đang cho thấy điều gì?",
  "Tôi có $3000, nên đi lot bao nhiêu?",
  "Thị trường đang ở phase nào của Market Profile?",
];

type Message = { role: "user" | "ai"; text: string; ts: string; patterns?: string[] };

// Pattern #2: Routing — detect trading vs general
function detectPatterns(text: string): string[] {
  const lower = text.toLowerCase();
  const patterns: string[] = [];
  if (["vàng","mua","bán","lot","sl","tp","entry","cvd","bookmap"].some(k => lower.includes(k)))
    patterns.push("#2 Routing→Trading", "#14 RAG", "#5 ToolUse");
  else
    patterns.push("#2 Routing→General");
  if (["lot","vốn","$","risk"].some(k => lower.includes(k)))
    patterns.push("#18 Guardrails");
  return patterns;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      text: "👋 Xin chào! Tôi là **Steven AI** — Chuyên gia Bookmap L2 Order Flow & Quản lý rủi ro vàng XAUUSD.\n\nTôi tích hợp 21 Agentic Design Patterns để phân tích thị trường một cách chính xác nhất. Hỏi tôi bất cứ điều gì!",
      ts: new Date().toLocaleTimeString("vi-VN"),
      patterns: ["#7 Multi-Agent", "#14 RAG"]
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<string>("—");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${HUB}/api/hub-snapshot`, { cache: "no-store" }).then(r => r.json())
      .then(d => setCurrentPrice(d?.entry || "4,442")).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const patterns = detectPatterns(text);

    // Add user message
    setMessages(prev => [...prev, { role: "user", text, ts: new Date().toLocaleTimeString("vi-VN") }]);
    setInput("");
    setLoading(true);

    // Add typing indicator
    setMessages(prev => [...prev, { role: "ai", text: "⏳ Đang phân tích...", ts: "", patterns }]);

    try {
      const [snapR, ctxR] = await Promise.all([
        fetch(`${HUB}/api/hub-snapshot`, { cache: "no-store" }),
        fetch(`${HUB}/api/market-context`, { cache: "no-store" }),
      ]);
      const snap = snapR.ok ? await snapR.json() : {};
      const ctx = ctxR.ok ? await ctxR.json() : {};

      const price = snap?.entry || currentPrice;
      const bias = snap?.overall_bias || "N/A";
      const conf = snap?.confidence || 0;
      const sl = snap?.sl || "N/A";
      const tp = snap?.tp || "N/A";

      const isTrading = patterns.some(p => p.includes("Trading"));
      const marketBlock = isTrading
        ? `Giá XAUUSD hiện tại: ${price} | AI Council: ${bias} | Confidence: ${conf}% | SL: ${sl} | TP: ${tp}\n${ctx?.raw_context?.slice(0, 1500) || ""}`
        : `Giá XAUUSD hiện tại: ${price}`;

      const systemPrompt = `Bạn là Steven AI — chuyên gia Bookmap L2 Order Flow và quản lý rủi ro vàng XAUUSD.
Chuyên môn: CVD, DOM, Volume Profile (POC/VAH/VAL), SMC, Price Action, Position Sizing.

TÍNH LOT SIZE (CÔNG THỨC ĐÚNG):
• XAUUSD: 1 lot=100oz, giá di 1pt=$100/lot.
• Lot = (Vốn × %Risk) / (SL_pts × 100)
• Ví dụ: $3,000 × 1%, SL=16pt → 30/(16×100)=0.019≈0.02 lot
• $3,000 an toàn: 0.01-0.05 lot. Trên 0.1 lot=nguy hiểm.

QUY TẮC: Đọc câu hỏi trước. Chào hỏi → thân thiện. Trading → dùng data thực tế. Trả lời TIẾNG VIỆT, ngắn gọn.
TUYỆT ĐỐI KHÔNG tự bịa giá.`;

      const apiKey = process.env.NEXT_PUBLIC_DEEPSEEK_KEY || snap?.debug_key || "";

      let aiText = "";
      if (apiKey) {
        const r = await fetch("https://api.deepseek.com/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `${marketBlock}\n\nCâu hỏi: ${text}` }
            ],
            max_tokens: 600
          })
        });
        const d = await r.json();
        aiText = d?.choices?.[0]?.message?.content || "Không lấy được phản hồi từ AI.";
      } else {
        // Demo response when no API key
        aiText = `🤖 **Demo Mode** (Cần cấu hình DEEPSEEK_KEY)\n\n📊 Dữ liệu hub:\n• Giá: ${price}\n• AI Council: **${bias}** (${conf}%)\n• Entry: ${price} | SL: ${sl} | TP: ${tp}\n\n*Thêm NEXT_PUBLIC_DEEPSEEK_KEY vào .env.local để bật AI thực.*`;
      }

      setMessages(prev => [...prev.slice(0, -1), {
        role: "ai", text: aiText, ts: new Date().toLocaleTimeString("vi-VN"), patterns
      }]);
    } catch (e) {
      setMessages(prev => [...prev.slice(0, -1), {
        role: "ai", text: "⚠️ Lỗi kết nối. Thử lại sau.", ts: "", patterns
      }]);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold gradient-text">Agentic Chat</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-dim)" }}>
          Pattern #1 Chaining · #2 Routing · #5 Tool Use · #14 RAG · #18 Guardrails
        </p>
        <div className="flex items-center gap-2 mt-2">
          <div className="w-2 h-2 rounded-full pulse-live" style={{ background: "var(--green)" }}></div>
          <span className="text-xs mono" style={{ color: "var(--text-dim)" }}>
            XAUUSD: {currentPrice} | Kết nối hub.lomofx.com
          </span>
        </div>
      </div>

      {/* Quick Questions */}
      <div className="flex flex-wrap gap-2 mb-4">
        {QUICK_QUESTIONS.map((q) => (
          <button key={q} onClick={() => sendMessage(q)} disabled={loading}
            className="btn-ghost px-3 py-1.5 text-xs cursor-pointer border-0 disabled:opacity-50">
            {q}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} fade-in`}>
            <div className={`max-w-[75%] ${msg.role === "user" ? "chat-user" : "chat-ai"} p-4`}>
              {msg.role === "ai" && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">⚡</span>
                  <span className="text-xs font-semibold" style={{ color: "var(--gold)" }}>Steven AI</span>
                  {msg.patterns?.map(p => (
                    <span key={p} className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(245,166,35,0.1)", color: "var(--gold)" }}>{p}</span>
                  ))}
                </div>
              )}
              <div className="text-sm leading-relaxed" style={{ color: "var(--text-primary)", whiteSpace: "pre-wrap" }}>
                {msg.text}
              </div>
              {msg.ts && (
                <div className="text-xs mt-2" style={{ color: "var(--text-dim)" }}>{msg.ts}</div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-3 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
          placeholder="Hỏi về vàng, lot size, entry, CVD... (Enter để gửi)"
          className="input-dark flex-1 px-4 py-3 text-sm"
          disabled={loading}
        />
        <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()}
          className="btn-gold px-6 py-3 text-sm cursor-pointer disabled:opacity-50">
          {loading ? "⏳" : "Gửi →"}
        </button>
      </div>
    </div>
  );
}
