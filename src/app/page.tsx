"use client";
import { useEffect, useState, useCallback, useRef } from "react";

const HUB = process.env.NEXT_PUBLIC_HUB_URL || "https://hub.lomofx.com";
const BOOKMAP_URL = `${HUB}/bookmap/latest.png`;

// CYBERPUNK THEME COLORS
const C_CYAN = "text-[#00f0ff]";
const C_CYAN_BG = "bg-[#00f0ff]/10";
const C_CYAN_BORDER = "border-[#00f0ff]/50";
const C_CYAN_GLOW = "shadow-[0_0_15px_rgba(0,240,255,0.3)]";

const C_PINK = "text-[#ff0055]";
const C_PINK_BG = "bg-[#ff0055]/10";
const C_PINK_BORDER = "border-[#ff0055]/60";
const C_PINK_GLOW = "shadow-[0_0_15px_rgba(255,0,85,0.4)]";

function getBiasCyber(bias: string) {
  const b = bias?.toUpperCase() || "";
  if (b.includes("BUY")) return { color: C_CYAN, border: C_CYAN_BORDER, bg: C_CYAN_BG, glow: C_CYAN_GLOW, txt: "BULLISH" };
  if (b.includes("SELL")) return { color: C_PINK, border: C_PINK_BORDER, bg: C_PINK_BG, glow: C_PINK_GLOW, txt: "BEARISH" };
  if (b.includes("RETEST")) return { color: "text-[#ffcf00]", border: "border-[#ffcf00]/50", bg: "bg-[#ffcf00]/10", glow: "shadow-[0_0_15px_rgba(255,207,0,0.3)]", txt: "ACCUMULATING" };
  return { color: "text-gray-400", border: "border-gray-600", bg: "bg-gray-800/50", glow: "", txt: "NEUTRAL" };
}

function GridBox({ title, children, className = "", glow = false, cyan = true }: any) {
  const borderC = cyan ? "border-[#00f0ff]/30" : "border-[#ff0055]/30";
  const shadow = glow ? (cyan ? C_CYAN_GLOW : C_PINK_GLOW) : "";
  return (
    <div className={`relative bg-[#020617]/80 backdrop-blur-md border ${borderC} p-4 flex flex-col ${shadow} ${className}`}>
      {/* Corner accents */}
      <div className={`absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 ${cyan ? 'border-[#00f0ff]' : 'border-[#ff0055]'}`}></div>
      <div className={`absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 ${cyan ? 'border-[#00f0ff]' : 'border-[#ff0055]'}`}></div>
      <div className={`absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 ${cyan ? 'border-[#00f0ff]' : 'border-[#ff0055]'}`}></div>
      <div className={`absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 ${cyan ? 'border-[#00f0ff]' : 'border-[#ff0055]'}`}></div>
      
      {title && (
        <div className={`text-[10px] font-bold tracking-[0.2em] mb-3 uppercase ${cyan ? C_CYAN : C_PINK}`}>
          {title}
        </div>
      )}
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  )
}

export default function DashboardPage() {
  const [snap, setSnap] = useState<any>(null);
  const [btcPrice, setBtcPrice] = useState("...");
  const [btcChange, setBtcChange] = useState(0);
  const terminalRef = useRef<HTMLDivElement>(null);
  const tvRef = useRef<HTMLDivElement>(null);
  const [bookmapTs, setBookmapTs] = useState(Date.now());
  const [bookmapLoaded, setBookmapLoaded] = useState(false);

  const fetchBtc = async () => {
    try {
      const r = await fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT");
      const d = await r.json();
      setBtcPrice(Number(d.lastPrice).toLocaleString('en-US', { maximumFractionDigits: 0 }));
      setBtcChange(Number(d.priceChangePercent));
    } catch {}
  };

  const fetchData = useCallback(async () => {
    try {
      const r = await fetch(`${HUB}/orderflow/snapshot`, { cache: "no-store" });
      if (r.ok) setSnap(await r.json());
      await fetchBtc();
    } catch {}
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 10000);
    return () => clearInterval(id);
  }, [fetchData]);

  useEffect(() => {
    const id = setInterval(() => setBookmapTs(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  // TradingView Hook
  useEffect(() => {
    if (!tvRef.current) return;
    tvRef.current.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.setAttribute("async", "true");
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: "BINANCE:BTCUSDT",
      interval: "15",
      timezone: "Asia/Ho_Chi_Minh",
      theme: "dark",
      style: "1",
      locale: "vi_VN",
      backgroundColor: "rgba(2, 6, 23, 0.4)", // Cyberpunk dark
      gridColor: "rgba(0, 240, 255, 0.05)",
      hide_top_toolbar: true,
      hide_legend: true,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: "https://www.tradingview.com"
    });
    tvRef.current.appendChild(script);
  }, []);

  // Terminal Logs parsing
  const debateText = snap?.debate || "";
  useEffect(() => {
    if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }, [debateText]);

  const rawBias = snap?.overall_bias || "WAIT";
  const conf = snap?.confidence || 0;
  const entry = snap?.entry || "---";
  const sl = snap?.sl || "---";
  const tp = snap?.tp1 || snap?.tp || "---";
  const buyPct = snap?.delta?.buy_pct || 50;
  const sellPct = snap?.delta?.sell_pct || 50;
  const theme = getBiasCyber(rawBias);
  const isBuy = rawBias.toUpperCase().includes("BUY");

  return (
    <div className="min-h-screen bg-[#02040a] text-gray-300 font-sans relative overflow-hidden" 
         style={{ backgroundImage: `linear-gradient(rgba(0,240,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.03) 1px, transparent 1px)`, backgroundSize: '40px 40px' }}>
      
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between border-b border-[#00f0ff]/30 bg-[#020617]/90 px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-black tracking-tighter" style={{ color: "#00f0ff", textShadow: "0 0 10px rgba(0,240,255,0.5)" }}>A</div>
          <div className="text-lg font-bold tracking-widest text-white">ATTRAOS <span className="text-[#00f0ff] font-normal mx-2">|</span> AI QUANT FUND <span className="text-[#00f0ff] font-normal mx-2">|</span> DASHBOARD</div>
        </div>
        <div className="flex gap-4">
           {/* Fake nav items */}
           {['PORTFOLIO', 'STRATEGIES', 'LIVE TRADES', 'PERFORMANCE', 'ANALYTICS'].map((n, i) => (
             <div key={n} className={`text-[10px] tracking-[0.1em] font-bold px-3 py-1 cursor-pointer transition-colors ${i===0 ? 'border-b-2 border-[#00f0ff] text-[#00f0ff]' : 'text-gray-500 hover:text-white'}`}>
                {n}
             </div>
           ))}
        </div>
      </div>

      <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6 h-[calc(100vh-60px)]">
        
        {/* LEFT COL: Live Positions & Signal Status */}
        <div className="flex flex-col gap-4 lg:col-span-1">
          <GridBox title="LIVE POSITIONS" cyan={true}>
            <div className="flex flex-col gap-3 font-mono text-[11px] mt-2">
              <div className="flex justify-between items-center border-b border-[#00f0ff]/10 pb-2">
                <span className="text-white">XAU/USD</span> <span className="text-[#00f0ff] font-bold">{snap?.current_price || "..."}</span>
              </div>
              <div className="flex justify-between items-center border-b border-[#00f0ff]/10 pb-2">
                <span className="text-white">BTC/USDT</span> <span className={btcChange >= 0 ? C_CYAN : C_PINK}>{btcPrice}</span>
              </div>
              <div className="flex justify-between items-center border-b border-[#00f0ff]/10 pb-2">
                <span className="text-white">SPX500</span> <span className={C_CYAN}>5,182.2</span>
              </div>
              <div className="flex justify-between items-center border-b border-[#00f0ff]/10 pb-2">
                <span className="text-white">DXY</span> <span className={C_PINK}>104.20</span>
              </div>
            </div>
          </GridBox>
          <GridBox title="SIGNAL STATUS" cyan={true} glow={true} className="flex-1">
            <div className="text-xl font-black tracking-widest text-[#00f0ff] mb-1">AI-OPTIMIZED</div>
            <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-3">Model Confidence: {conf}%</div>
            
            <div className="h-1.5 w-full bg-[#00f0ff]/10 rounded overflow-hidden mb-2">
               <div className="h-full bg-[#00f0ff] shadow-[0_0_10px_#00f0ff]" style={{ width: `${conf}%` }}></div>
            </div>
            
            <div className="mt-8">
              <div className="text-[10px] text-[#00f0ff] mb-1 uppercase tracking-widest flex justify-between">
                 <span>Order Flow / L2 Book</span>
                 <span>Δ {typeof snap?.delta?.cvd === 'number' ? snap.delta.cvd.toLocaleString() : snap?.delta?.cvd}</span>
              </div>
              <div className="flex h-3 w-full bg-gray-900 border border-[#00f0ff]/30">
                 <div className="h-full bg-[#00f0ff]" style={{ width: `${buyPct}%` }}></div>
                 <div className="h-full bg-[#ff0055]" style={{ width: `${sellPct}%` }}></div>
              </div>
              <div className="flex justify-between text-[9px] font-mono mt-1">
                 <span className={C_CYAN}>{buyPct.toFixed(1)}% BUY</span>
                 <span className={C_PINK}>{sellPct.toFixed(1)}% SELL</span>
              </div>
            </div>
          </GridBox>
        </div>

        {/* MIDDLE COL: Big Numbers & Chart Integrations */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          {/* Top row of middle col */}
          <div className="grid grid-cols-3 gap-4">
            <GridBox title="CURRENT PRICE" cyan={true} className="items-center justify-center text-center py-4">
              <div className="text-2xl lg:text-3xl font-mono font-bold text-[#00f0ff] drop-shadow-[0_0_10px_rgba(0,240,255,0.5)]">
                {snap?.current_price || "..."}
              </div>
              <div className="text-[9px] text-[#00f0ff] mt-1 tracking-[0.2em] uppercase">XAU/USD LIVE</div>
            </GridBox>
            <GridBox title="AI SENTIMENT" cyan={isBuy} className="items-center justify-center text-center py-4 bg-[#00f0ff]/5">
              <div className={`text-2xl lg:text-3xl font-black tracking-tight ${theme.color} ${theme.glow}`}>
                {theme.txt}
              </div>
              <div className={`text-[9px] ${theme.color} mt-1 uppercase tracking-[0.2em]`}>DIR: {rawBias}</div>
            </GridBox>
            <GridBox title="RISK EXPOSURE" cyan={false} className="items-center justify-center text-center py-4 bg-[#ff0055]/5">
              <div className="text-2xl lg:text-3xl font-black tracking-tight text-[#ff0055] drop-shadow-[0_0_10px_rgba(255,0,85,0.5)]">
                MEDIUM
              </div>
              <div className="text-[9px] text-[#ff0055] mt-1 tracking-[0.2em] uppercase">CAPITAL (41%)</div>
            </GridBox>
          </div>

          {/* Slim HUD Coordinate Row */}
          <GridBox className="py-2 px-4 shadow-none flex-row justify-between items-center" cyan={true}>
             <div className="flex gap-4">
                <span className="text-[#00f0ff] font-bold text-[10px] tracking-widest uppercase">SPATIAL TARGETS</span>
             </div>
             <div className="flex gap-8 font-mono text-[11px] font-bold uppercase">
                <div className="text-[#00f0ff] border-b border-[#00f0ff]/30 pb-0.5">EN: {entry}</div>
                <div className="text-[#ff0055] border-b border-[#ff0055]/30 pb-0.5">SL: {sl}</div>
                <div className="text-[#00f0ff] border-b border-[#00f0ff]/30 pb-0.5">TP: {tp}</div>
             </div>
          </GridBox>

          {/* Main Chart / Bookmap Dual View */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
            <GridBox title="BTC/USDT LIVE M15" cyan={true} glow={true} className="h-full p-2">
              <div ref={tvRef} className="tradingview-widget-container flex-1 w-full h-full rounded border border-[#00f0ff]/10">
                <div className="tradingview-widget-container__widget h-full w-full"></div>
              </div>
            </GridBox>
            <GridBox title="ORDER FLOW HEATMAP" cyan={true} glow={true} className="h-full p-2 bg-black/50">
              <div className="flex-1 relative w-full h-full flex items-center justify-center rounded border border-[#00f0ff]/10 overflow-hidden bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0wIDM5LjVoNDBWNDBINHoiIGZpbGw9InJnYmEoMCwgMjQwLCAyNTUsIDAuMDUpIi8+PHBhdGggZD0iTTM5LjUgMFY0MGguNVYweiIgZmlsbD0icmdiYSgwLCAyNDAsIDI1NSwgMC4wNSkiLz48L3N2Zz4=')]">
                {!bookmapLoaded && <div className="absolute text-[10px] font-mono text-[#00f0ff] animate-pulse">DOWNLOADING L2 HEATMAP...</div>}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${BOOKMAP_URL}?t=${bookmapTs}`}
                  alt="Bookmap Order Flow Heatmap"
                  className={`absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-80 filter brightness-125 contrast-125 transition-opacity duration-1000 ${bookmapLoaded ? 'opacity-100' : 'opacity-0'}`}
                  onLoad={() => setBookmapLoaded(true)}
                  onError={() => setBookmapLoaded(true)}
                />
                {/* Cyberpunk Overlay crosshairs */}
                <div className="absolute top-1/2 left-0 right-0 border-t border-[#ff0055]/30 pointer-events-none"></div>
                <div className="absolute left-1/2 top-0 bottom-0 border-l border-[#ff0055]/30 pointer-events-none"></div>
              </div>
            </GridBox>
          </div>
        </div>

        {/* RIGHT COL: AI REASONING LOGS */}
        <div className="flex flex-col gap-4 lg:col-span-1">
          <GridBox title="AI REASONING LOGS" cyan={true} className="flex-1">
            <div 
              ref={terminalRef}
              className="flex-1 overflow-y-auto custom-scrollbar font-mono text-[9px] md:text-[10px] text-[#00f0ff]/80 leading-relaxed pr-2 space-y-3 pb-8"
              style={{ textShadow: "0 0 5px rgba(0,240,255,0.2)" }}
            >
              <div className="sticky top-0 pb-2 border-b border-[#00f0ff]/20 bg-[#020617]/90 backdrop-blur-sm z-10 text-[10px]">
                [AI_CORE::ANALYZING_MARKET_STATE]<br/>
                [LOG_TIMESTAMP: {snap?.last_council_run || "NO DATA"}]
              </div>
              
              {debateText ? debateText.split('\n').map((line: string, i: number) => {
                if (!line.trim()) return null;
                const isFinal = line.includes("CONCLUSION");
                let colorClass = "text-[#00f0ff]/90"; 
                if (line.includes("V1")) colorClass = "text-[#00f0ff] opacity-80"; 
                if (line.includes("V2")) colorClass = "text-[#b000ff] font-bold";  // Magenta/Purple for V2
                if (line.includes("V3")) colorClass = "text-[#ffcf00]"; 
                if (line.includes("BUY") || line.includes("tăng")) colorClass = "text-[#00f0ff] font-bold";
                if (line.includes("SELL") || line.includes("giảm")) colorClass = "text-[#ff0055] font-bold";
                
                return (
                  <div key={i} className={`mb-2 ${isFinal ? 'border-l-2 border-[#00f0ff] pl-3 mt-4 text-white bg-[#00f0ff]/10 py-2' : ''}`}>
                    <span className={colorClass}>
                      <span className="opacity-50 mr-2 text-[#00f0ff]">&gt;</span>{line}
                    </span>
                  </div>
                )
              }) : (
                <div className="animate-pulse mt-4">[ AWAITING_NEURAL_STREAM... ]</div>
              )}
              
              <div className="flex items-center gap-2 text-[#00f0ff] font-bold mt-4">
                 <div className="w-2 h-4 bg-[#00f0ff] animate-pulse"></div> END OF LOG
              </div>
            </div>
          </GridBox>
          
          <GridBox title="PORTFOLIO PERFORMANCE" cyan={true}>
             <div className="h-20 w-full flex items-end justify-between gap-1 mt-2">
                {[4, 3, 5, 4, 6, 5, 8, 7, 10, 9, 12, 10, 15, 14, 18, 16, 20].map((h, i) => (
                  <div key={i} className="w-full bg-gradient-to-t from-[#00f0ff]/10 to-[#00f0ff]/60 hover:to-[#00f0ff] cursor-crosshair transition-all" style={{ height: `${h * 5}%` }}></div>
                ))}
             </div>
             <div className="text-[9px] font-mono text-[#00f0ff]/50 text-right mt-3 uppercase tracking-widest">Equity curve, last 30 days</div>
          </GridBox>
        </div>

      </div>
    </div>
  );
}
