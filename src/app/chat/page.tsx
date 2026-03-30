"use client";
import { useEffect, useState, useRef } from "react";

const LS_API_KEY = "steven_deepseek_key";

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
  const [apiKey, setApiKey] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [testStatus, setTestStatus] = useState<{ok:boolean;msg:string}|null>(null);
  const [testing, setTesting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${HUB}/orderflow/snapshot`, { cache: "no-store" })
      .then(r => r.json())
      .then(d => setCurrentPrice(d?.current_price || d?.entry || "4,442"))
      .catch(() => {});
    // Load saved API key
    const saved = localStorage.getItem(LS_API_KEY) || "";
    setApiKey(saved);
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
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const savedKey = localStorage.getItem(LS_API_KEY);
      if (savedKey) headers["X-Api-Key"] = savedKey;
      const r = await fetch("/api/chat", {
        method: "POST",
        headers,
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

  const testConnection = async () => {
    setTesting(true); setTestStatus(null);
    const headers: Record<string,string> = {};
    const savedKey = localStorage.getItem(LS_API_KEY);
    if (savedKey) headers["X-Api-Key"] = savedKey;
    try {
      const r = await fetch("/api/chat", { headers });
      const d = await r.json();
      setTestStatus({ ok: d.ok, msg: d.message || (d.ok ? "✅ OK" : "⚠️ Lỗi") });
    } catch (e: unknown) {
      setTestStatus({ ok: false, msg: "⚠️ Không kết nối được server: " + (e instanceof Error ? e.message : "unknown") });
    }
    setTesting(false);
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-130px)] md:h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="mb-4 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold gradient-text">Agentic Chat</h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-dim)" }}>
              #1 Chaining · #2 Routing · #7 Multi-Agent · #8 Memory · #14 RAG · #18 Guardrails
            </p>
          </div>
          <button onClick={() => setShowSettings(s => !s)}
            className="btn-ghost px-3 py-1.5 text-xs border-0 cursor-pointer flex-shrink-0" title="API Key Settings">
            ⚙️ {apiKey ? "Key ✓" : "API Key"}
          </button>
        </div>
        {showSettings && (
          <div className="mt-2 p-3 rounded-xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs flex-shrink-0" style={{ color: "var(--text-dim)" }}>DeepSeek Key (tuỳ chọn):</span>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-... (để trống = dùng Hub admin key)"
                className="input-dark flex-1 px-3 py-1.5 text-xs"
              />
              <button onClick={() => { localStorage.setItem(LS_API_KEY, apiKey); setShowSettings(false); }}
                className="btn-gold px-3 py-1.5 text-xs cursor-pointer">Lưu</button>
              <button onClick={() => { localStorage.removeItem(LS_API_KEY); setApiKey(""); setShowSettings(false); }}
                className="btn-ghost px-3 py-1.5 text-xs border-0 cursor-pointer">Xóa</button>
              <button onClick={testConnection} disabled={testing}
                style={{
                  padding: "6px 12px", fontSize: "11px", fontWeight: 700,
                  borderRadius: "8px", border: "1px solid rgba(0,212,170,0.4)",
                  background: "rgba(0,212,170,0.1)", color: "#00d4aa",
                  cursor: testing ? "wait" : "pointer", opacity: testing ? 0.6 : 1
                }}>
                {testing ? "⏳ Testing..." : "🔌 Test kết nối"}
              </button>
            </div>
            {testStatus && (
              <div style={{
                marginTop: "8px", padding: "8px 12px", borderRadius: "8px", fontSize: "12px",
                background: testStatus.ok ? "rgba(0,212,170,0.08)" : "rgba(255,77,106,0.08)",
                color: testStatus.ok ? "#00d4aa" : "#ff4d6a",
                border: `1px solid ${testStatus.ok ? "rgba(0,212,170,0.3)" : "rgba(255,77,106,0.3)"}`
              }}>
                {testStatus.msg}
              </div>
            )}
          </div>
        )}
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
