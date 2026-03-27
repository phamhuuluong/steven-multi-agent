"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/", icon: "📊", label: "Dashboard", pattern: "Live Data" },
  { href: "/charts", icon: "📉", label: "Charts", pattern: "TradingView + Bookmap" },
  { href: "/council", icon: "🏛️", label: "AI Council", pattern: "Multi-Agent" },
  { href: "/chat", icon: "💬", label: "Agentic Chat", pattern: "Routing + RAG" },
  { href: "/calculator", icon: "🛡️", label: "Risk Guard", pattern: "Guardrails" },
  { href: "/signals", icon: "📈", label: "Signal History", pattern: "Evaluation" },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="fixed top-0 left-0 w-64 h-screen flex flex-col"
      style={{ background: "var(--bg-card)", borderRight: "1px solid var(--border)" }}>
      {/* Logo */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
            style={{ background: "linear-gradient(135deg, #f5a623, #ff6b9d)" }}>⚡</div>
          <div>
            <div className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Steven</div>
            <div className="text-xs" style={{ color: "var(--gold)" }}>Multi-Agent</div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full pulse-live" style={{ background: "var(--green)" }}></div>
          <span className="text-xs" style={{ color: "var(--text-dim)" }}>Live • hub.lomofx.com</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {nav.map((item) => {
          const active = path === item.href;
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${active ? "active-nav" : ""}`}
              style={active ? {
                background: "rgba(245,166,35,0.1)",
                borderLeft: "3px solid var(--gold)"
              } : { borderLeft: "3px solid transparent" }}>
              <span className="text-xl">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate"
                  style={{ color: active ? "var(--gold)" : "var(--text-primary)" }}>
                  {item.label}
                </div>
                <div className="text-xs truncate" style={{ color: "var(--text-dim)" }}>
                  {item.pattern}
                </div>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* 21 Patterns badge */}
      <div className="p-4 mx-3 mb-4 rounded-xl" style={{ background: "rgba(245,166,35,0.06)", border: "1px solid rgba(245,166,35,0.15)" }}>
        <div className="text-xs font-semibold mb-1" style={{ color: "var(--gold)" }}>21 Agentic Patterns</div>
        <div className="text-xs" style={{ color: "var(--text-dim)" }}>Routing · Reflection · Multi-Agent · RAG · Guardrails · Memory · Planning…</div>
        <a href="https://github.com/AnkunHuang/Agentic_Design_Patterns" target="_blank"
          className="text-xs mt-2 inline-block" style={{ color: "var(--blue)" }}>
          📖 Reference ↗
        </a>
      </div>

      {/* Telegram */}
      <div className="p-4 pt-0">
        <a href="https://t.me/StevenAgent_bot" target="_blank"
          className="flex items-center gap-2 px-3 py-2 rounded-xl btn-ghost text-xs w-full justify-center">
          📱 @StevenAgent_bot
        </a>
      </div>
    </aside>
  );
}
