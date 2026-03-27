"use client";
import { useEffect, useRef, useState, useCallback } from "react";

// Fully independent of hub — uses TradingView widgets + RSS feeds
// Pattern #3: Parallelization (fetch multiple RSS feeds simultaneously)
// Pattern #12: Exception Handling (fallback news sources)

const RSS_FEEDS = [
  { url: "https://www.forexlive.com/feed/news", name: "ForexLive", icon: "📰" },
  { url: "https://www.kitco.com/rss/KitcoNewsRSS.xml", name: "Kitco", icon: "🥇" },
  { url: "https://feeds.reuters.com/reuters/businessNews", name: "Reuters", icon: "📊" },
];

// Use allorigins.win as CORS proxy for RSS
const CORS = "https://api.allorigins.win/get?url=";

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  icon: string;
  desc?: string;
}

function parseRSS(xml: string, source: string, icon: string): NewsItem[] {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "text/xml");
    const items = Array.from(doc.querySelectorAll("item")).slice(0, 8);
    return items.map(item => ({
      title: item.querySelector("title")?.textContent?.trim() || "",
      link: item.querySelector("link")?.textContent?.trim() || "#",
      pubDate: item.querySelector("pubDate")?.textContent?.trim() || "",
      desc: item.querySelector("description")?.textContent?.replace(/<[^>]*>/g, "").slice(0, 120) || "",
      source,
      icon,
    })).filter(n => n.title);
  } catch { return []; }
}

function timeAgo(dateStr: string) {
  try {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 60000;
    if (diff < 60) return `${Math.round(diff)}p trước`;
    if (diff < 1440) return `${Math.round(diff/60)}h trước`;
    return `${Math.round(diff/1440)}d trước`;
  } catch { return ""; }
}

function EconomicCalendarWidget() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-events.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      colorTheme: "dark",
      isTransparent: true,
      width: "100%",
      height: "600",
      locale: "vi_VN",
      importanceFilter: "0,1",
      countryFilter: "us,eu,gb,jp,cn,au,ca"
    });
    ref.current.appendChild(script);
  }, []);
  return (
    <div ref={ref} className="tradingview-widget-container" style={{ height: "600px" }} />
  );
}

function NewsTickerWidget() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-timeline.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      feedMode: "all_symbols",
      isTransparent: true,
      displayMode: "regular",
      width: "100%",
      height: "400",
      colorTheme: "dark",
      locale: "en"
    });
    ref.current.appendChild(script);
  }, []);
  return (
    <div ref={ref} className="tradingview-widget-container" style={{ height: "400px" }} />
  );
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState("");
  const [activeTab, setActiveTab] = useState<"news" | "calendar">("news");

  const fetchNews = useCallback(async () => {
    setLoading(true);
    try {
      // Pattern #3: Parallelization — fetch all RSS feeds simultaneously
      const results = await Promise.allSettled(
        RSS_FEEDS.map(async (feed) => {
          const r = await fetch(`${CORS}${encodeURIComponent(feed.url)}`);
          const d = await r.json();
          return parseRSS(d.contents, feed.name, feed.icon);
        })
      );
      const allNews = results
        .filter(r => r.status === "fulfilled")
        .flatMap(r => (r as PromiseFulfilledResult<NewsItem[]>).value)
        .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
      setNews(allNews.slice(0, 30));
    } catch {}
    setLoading(false);
    setLastFetch(new Date().toLocaleTimeString("vi-VN"));
  }, []);

  useEffect(() => {
    fetchNews();
    // Auto-refresh every 5 minutes
    const id = setInterval(fetchNews, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchNews]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Tin Tức & Lịch</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-dim)" }}>
            24h live news · Lịch kinh tế TradingView · Độc lập hub
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-2 h-2 rounded-full pulse-live" style={{ background: "var(--green)" }}></div>
          <span className="text-xs mono" style={{ color: "var(--text-dim)" }}>{lastFetch}</span>
          <button onClick={fetchNews} disabled={loading}
            className="btn-ghost px-3 py-1.5 text-xs border-0 cursor-pointer disabled:opacity-50">
            ↻
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: "news", label: "📰 Tin Tức 24h" },
          { key: "calendar", label: "📅 Lịch Kinh Tế" },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as "news" | "calendar")}
            className={`px-4 py-2 text-sm rounded-xl font-medium transition-all cursor-pointer border-0 ${activeTab === tab.key ? "btn-gold" : "btn-ghost"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* News Tab */}
      {activeTab === "news" && (
        <div className="space-y-3">
          {/* TradingView News (always visible at top) */}
          <div className="glass p-4">
            <div className="text-xs font-semibold mb-2" style={{ color: "var(--gold)" }}>
              📡 TradingView Live Feed
            </div>
            <NewsTickerWidget />
          </div>

          {/* RSS News */}
          <div className="glass p-4">
            <div className="text-xs font-semibold mb-3" style={{ color: "var(--gold)" }}>
              📰 RSS — ForexLive · Kitco · Reuters (cập nhật 5 phút/lần)
            </div>
            {loading ? (
              <div className="text-center py-8" style={{ color: "var(--text-dim)" }}>⏳ Đang tải tin tức...</div>
            ) : news.length === 0 ? (
              <div className="text-center py-6" style={{ color: "var(--text-dim)" }}>
                Không tải được RSS (CORS). Dùng TradingView feed bên trên.
              </div>
            ) : (
              <div className="space-y-2">
                {news.map((item, i) => (
                  <a key={i} href={item.link} target="_blank" rel="noreferrer"
                    className="block p-3 rounded-xl transition-all fade-in"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(245,166,35,0.3)")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}>
                    <div className="flex items-start gap-2">
                      <span className="text-lg flex-shrink-0 mt-0.5">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium leading-snug" style={{ color: "var(--text-primary)" }}>
                          {item.title}
                        </div>
                        {item.desc && (
                          <div className="text-xs mt-1 line-clamp-2" style={{ color: "var(--text-dim)" }}>
                            {item.desc}
                          </div>
                        )}
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-xs font-semibold" style={{ color: "var(--gold)" }}>
                            {item.source}
                          </span>
                          <span className="text-xs" style={{ color: "var(--text-dim)" }}>
                            {timeAgo(item.pubDate)}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs flex-shrink-0" style={{ color: "var(--blue)" }}>↗</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Calendar Tab */}
      {activeTab === "calendar" && (
        <div className="glass p-4">
          <div className="text-xs font-semibold mb-3" style={{ color: "var(--gold)" }}>
            📅 LỊCH KINH TẾ — TradingView (US, EU, GB, JP, CN, AU, CA)
          </div>
          <EconomicCalendarWidget />
        </div>
      )}
    </div>
  );
}
