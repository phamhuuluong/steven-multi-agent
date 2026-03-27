"use client";
import { useEffect, useRef, useState } from "react";

const HUB = process.env.NEXT_PUBLIC_HUB_URL || "https://hub.lomofx.com";
const BOOKMAP_URL = `${HUB}/bookmap/latest.png`;

export default function ChartsPage() {
  const tvRef = useRef<HTMLDivElement>(null);
  const [bookmapTs, setBookmapTs] = useState(Date.now());
  const [bookmapLoaded, setBookmapLoaded] = useState(false);

  // Inject TradingView widget script once
  useEffect(() => {
    if (!tvRef.current) return;
    tvRef.current.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.setAttribute("async", "true");
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: "FOREXCOM:XAUUSD",
      interval: "5",
      timezone: "Asia/Ho_Chi_Minh",
      theme: "dark",
      style: "1",
      locale: "vi_VN",
      backgroundColor: "#070b14",
      gridColor: "rgba(255,255,255,0.04)",
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: "https://www.tradingview.com"
    });
    tvRef.current.appendChild(script);
  }, []);

  // Auto-refresh bookmap every 60 seconds
  useEffect(() => {
    const id = setInterval(() => setBookmapTs(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Charts</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-dim)" }}>
            TradingView XAUUSD · Bookmap L2 Order Flow từ hub
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full pulse-live" style={{ background: "var(--green)" }}></div>
          <span className="text-xs" style={{ color: "var(--text-dim)" }}>Live</span>
        </div>
      </div>

      {/* TradingView Chart */}
      <div className="glass overflow-hidden" style={{ height: "520px" }}>
        <div className="px-4 py-2 flex items-center gap-2" style={{ borderBottom: "1px solid var(--border)" }}>
          <span className="text-sm font-semibold" style={{ color: "var(--gold)" }}>📈 XAUUSD</span>
          <span className="text-xs px-2 py-0.5 rounded-full badge-buy">M5</span>
          <span className="text-xs" style={{ color: "var(--text-dim)" }}>TradingView (free embed)</span>
        </div>
        <div
          ref={tvRef}
          className="tradingview-widget-container"
          style={{ height: "calc(100% - 38px)", width: "100%" }}
        >
          <div className="tradingview-widget-container__widget" style={{ height: "100%", width: "100%" }}></div>
        </div>
      </div>

      {/* Bookmap */}
      <div className="glass overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: "var(--gold)" }}>🗺️ Bookmap L2</span>
            <span className="text-xs" style={{ color: "var(--text-dim)" }}>
              Pattern #10 MCP · từ hub.lomofx.com · auto-refresh 60s
            </span>
          </div>
          <button
            onClick={() => { setBookmapTs(Date.now()); setBookmapLoaded(false); }}
            className="btn-ghost px-3 py-1 text-xs border-0 cursor-pointer">
            ↻ Refresh
          </button>
        </div>
        <div className="p-4">
          {!bookmapLoaded && (
            <div className="flex items-center justify-center py-8" style={{ color: "var(--text-dim)" }}>
              ⏳ Đang tải Bookmap...
            </div>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${BOOKMAP_URL}?t=${bookmapTs}`}
            alt="Bookmap L2 Order Flow"
            className={`w-full rounded-xl transition-opacity duration-500 ${bookmapLoaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setBookmapLoaded(true)}
            onError={() => setBookmapLoaded(true)}
            style={{ maxHeight: "600px", objectFit: "contain" }}
          />
          {bookmapLoaded && (
            <div className="text-xs text-center mt-2" style={{ color: "var(--text-dim)" }}>
              Cập nhật lần cuối: {new Date().toLocaleTimeString("vi-VN")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
