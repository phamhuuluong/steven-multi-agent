"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const nav = [
  { href: "/", icon: "📊", label: "Dashboard", pattern: "Live Data" },
  { href: "/charts", icon: "📉", label: "Charts", pattern: "TradingView + Bookmap" },
  { href: "/scanner", icon: "🔍", label: "Scanner", pattern: "Đa khung · Tương quan" },
  { href: "/btc", icon: "₿", label: "BTC", pattern: "Binance L2 · SMC" },
  { href: "/council", icon: "🏛️", label: "AI Council", pattern: "Multi-Agent" },
  { href: "/chat", icon: "💬", label: "Chat", pattern: "Routing + RAG" },
  { href: "/news", icon: "📰", label: "Tin Tức", pattern: "24h · Lịch KT" },
  { href: "/calculator", icon: "🛡️", label: "Risk", pattern: "Guardrails" },
  { href: "/signals", icon: "📈", label: "Signals", pattern: "Evaluation" },
];

export default function Sidebar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* ===== DESKTOP SIDEBAR ===== */}
      <aside className="hidden md:flex fixed top-0 left-0 w-60 h-screen flex-col"
        style={{ background: "var(--bg-card)", borderRight: "1px solid var(--border)", zIndex: 40 }}>
        {/* Logo */}
        <div className="p-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #f5a623, #ff6b9d)" }}>⚡</div>
            <div>
              <div className="font-bold text-sm">Steven</div>
              <div className="text-xs" style={{ color: "var(--gold)" }}>Multi-Agent</div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full pulse-live flex-shrink-0" style={{ background: "var(--green)" }}></div>
            <span className="text-xs truncate" style={{ color: "var(--text-dim)" }}>hub.lomofx.com</span>
          </div>
        </div>

        <nav className="flex-1 px-2 py-1 space-y-0.5 overflow-y-auto">
          {nav.map((item) => {
            const active = path === item.href;
            return (
              <Link key={item.href} href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200"
                style={active ? {
                  background: "rgba(245,166,35,0.1)",
                  borderLeft: "3px solid var(--gold)"
                } : { borderLeft: "3px solid transparent" }}>
                <span className="text-lg flex-shrink-0">{item.icon}</span>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate"
                    style={{ color: active ? "var(--gold)" : "var(--text-primary)" }}>
                    {item.label}
                  </div>
                  <div className="text-xs truncate" style={{ color: "var(--text-dim)", fontSize: "10px" }}>
                    {item.pattern}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-3">
          <a href="https://t.me/StevenAgent_bot" target="_blank"
            className="flex items-center gap-2 px-3 py-2 rounded-xl btn-ghost text-xs w-full justify-center">
            📱 @StevenAgent_bot
          </a>
        </div>
      </aside>

      {/* ===== MOBILE TOP BAR ===== */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3"
        style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
            style={{ background: "linear-gradient(135deg, #f5a623, #ff6b9d)" }}>⚡</div>
          <div>
            <span className="font-bold text-sm gradient-text">Steven AI</span>
          </div>
          <div className="w-1.5 h-1.5 rounded-full pulse-live ml-1" style={{ background: "var(--green)" }}></div>
        </div>

        {/* Current page name */}
        <div className="text-sm font-medium" style={{ color: "var(--gold)" }}>
          {nav.find(n => n.href === path)?.label || "Dashboard"}
        </div>

        {/* Hamburger */}
        <button onClick={() => setOpen(!open)}
          className="w-9 h-9 flex items-center justify-center rounded-xl btn-ghost border-0 cursor-pointer text-xl">
          {open ? "✕" : "☰"}
        </button>
      </div>

      {/* ===== MOBILE DRAWER ===== */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setOpen(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.6)" }} />
          <div className="absolute top-0 right-0 h-full w-72 flex flex-col"
            style={{ background: "var(--bg-card)", borderLeft: "1px solid var(--border)" }}
            onClick={e => e.stopPropagation()}>
            <div className="p-5 pt-16">
              <div className="text-xs font-semibold mb-3" style={{ color: "var(--text-dim)" }}>NAVIGATION</div>
              <nav className="space-y-1">
                {nav.map((item) => {
                  const active = path === item.href;
                  return (
                    <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                      style={{ background: active ? "rgba(245,166,35,0.1)" : "transparent",
                               color: active ? "var(--gold)" : "var(--text-primary)" }}>
                      <span className="text-2xl">{item.icon}</span>
                      <div>
                        <div className="font-medium">{item.label}</div>
                        <div className="text-xs" style={{ color: "var(--text-dim)" }}>{item.pattern}</div>
                      </div>
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="mt-auto p-5">
              <a href="https://t.me/StevenAgent_bot" target="_blank"
                className="btn-ghost flex items-center gap-2 px-4 py-3 rounded-xl text-sm justify-center"
                onClick={() => setOpen(false)}>
                📱 Telegram @StevenAgent_bot
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ===== MOBILE BOTTOM TAB BAR ===== */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-1 py-1"
        style={{ background: "var(--bg-card)", borderTop: "1px solid var(--border)" }}>
        {nav.slice(0, 5).map((item) => {
          const active = path === item.href;
          return (
            <Link key={item.href} href={item.href}
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all flex-1"
              style={{ color: active ? "var(--gold)" : "var(--text-dim)" }}>
              <span className="text-xl leading-none">{item.icon}</span>
              <span className="text-xs font-medium" style={{ fontSize: "9px" }}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
