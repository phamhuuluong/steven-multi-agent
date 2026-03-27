"use client";
import { useEffect, useState, useRef } from "react";

const HUB = process.env.NEXT_PUBLIC_HUB_URL || "https://hub.lomofx.com";

const QUICK_QUESTIONS = [
  "Vàng nên mua hay bán hiện tại?",
  "Điểm vào lệnh hợp lý?",
  "SL nên đặt ở đâu?",
  "CVD đang cho thấy điều gì?",
  "Tôi có $3000, nên đi lot bao nhiêu?",
  "Thị trường đang ở phase nào?",
];

type Message = { role: "user" | "ai"; text: string; ts: string; patterns?: string[] };
type HistoryItem = { role: string; content: string };

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      text: "👋 Xin chào! Tôi là **Steven AI** — Chuyên gia Bookmap L2 Order Flow & Quản lý rủi ro vàng XAUUSD.\n\nTôi tích hợp **21 Agentic Design Patterns** để phân tích thị trường chính xác nhất. Hỏi tôi bất cứ điều gì!",
      ts: new Date().toLocaleTimeString("vi-VN"),
      patterns: ["#7 Multi-Agent", "#14 RAG", "#2 Routing"]
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<string>("—");
  const [chatHistory, setChatHistory] = useState<HistoryItem[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${HUB}/orderflow/snapshot`, { cache: "no-store" })
      .then(r => r.json())
      .then(d => setCurrentPrice(d?.current_price || d?.entry || "4,442"))
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    setMessages(prev => [...prev, { role: "user", text, ts: new Date().toLocaleTimeString("vi-VN") }]);
    setInput("");
    setLoading(true);
    setMessages(prev => [...prev, { role: "ai", text: "⏳ Đang phân tích...", ts: "", patterns: [] }]);

    try {
      // Call server-side API route (keeps DeepSeek key secure on server)
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: chatHistory.slice(-8) })
      });

      const data = await r.json();
      const reply = data.reply || "Không có phản hồi.";
      const patterns: string[] = data.patterns || [];

      // Pattern #8: Memory — maintain chat history
      setChatHistory(prev => [
        ...prev,
        { role: "user", content: text },
        { role: "assistant", content: reply }
      ].slice(-20));

      setMessages(prev => [...prev.slice(0, -1), {
        role: "ai", text: reply, ts: new Date().toLocaleTimeString("vi-VN"), patterns
      }]);
    } catch {
      setMessages(prev => [...prev.slice(0, -1), {
        role: "ai", text: "⚠️ Lỗi kết nối server. Thử lại sau.", ts: ""
      }]);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="mb-4 flex-shrink-0">
        <h1 className="text-2xl font-bold gradient-text">Agentic Chat</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-dim)" }}>
          Pattern #1 Chaining · #2 Routing · #3 Parallel · #8 Memory · #12 Exception · #14 RAG · #18 Guardrails
        </p>
        <div className="flex items-center gap-2 mt-2">
          <div className="w-2 h-2 rounded-full pulse-live" style={{ background: "var(--green)" }}></div>
          <span className="text-xs mono" style={{ color: "var(--text-dim)" }}>
            XAUUSD: {currentPrice} | Steven AI Online
          </span>
        </div>
      </div>

      {/* Quick Questions */}
      <div className="flex flex-wrap gap-2 mb-4 flex-shrink-0">
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
            <div className={`max-w-[80%] ${msg.role === "user" ? "chat-user" : "chat-ai"} p-4`}>
              {msg.role === "ai" && (
                <div className="flex items-center flex-wrap gap-1.5 mb-2">
                  <span className="text-sm">⚡</span>
                  <span className="text-xs font-semibold" style={{ color: "var(--gold)" }}>Steven AI</span>
                  {msg.patterns?.map(p => (
                    <span key={p} className="text-xs px-1.5 py-0.5 rounded-full"
                      style={{ background: "rgba(245,166,35,0.1)", color: "var(--gold)", fontSize: "10px" }}>
                      {p}
                    </span>
                  ))}
                </div>
              )}
              <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-primary)" }}>
                {msg.text}
              </div>
              {msg.ts && <div className="text-xs mt-2" style={{ color: "var(--text-dim)" }}>{msg.ts}</div>}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-3 pt-4 flex-shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
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
