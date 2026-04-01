//+------------------------------------------------------------------+
//|                                              StevenTracker.mq5    |
//|                                              Steven AI / ATTRAOS  |
//+------------------------------------------------------------------+
#property copyright "Steven AI / ATTRAOS"
#property version   "2.00"
#property description "AI-Driven Execution & Trade Management"

#include <Trade\Trade.mqh>
#include <Trade\PositionInfo.mqh>
#include <Trade\SymbolInfo.mqh>

input string HubURL_Base  = "https://hub.lomofx.com/api/mt5";
string HubURL_Poll;
string HubURL_Open;
string HubURL_Close;

input double LotSize = 0.02;
input ulong  MagicNumber = 777888;

//--- Partial Close & Break Even Settings
input string  _sep1                   = "──── Tỉa lệnh & Break Even ────";
input double  PartialClose_TriggerPct = 30.0;  // Tỉa khi đạt X% đường đến TP
input double  PartialClose_VolumePct  = 50.0;  // Tỉa bao nhiêu % khối lượng
input bool    Use_BE                  = true;   // Tự kéo BE sau khi tỉa?
input double  BE_Buffer_Dollar        = 0.20;   // Buffer kéo BE sau khi tỉa ($)

//--- Trailing Stop (cho phần còn lại sau khi tỉa)
input string  _sep2                   = "──── Trailing Stop ────";
input bool    Use_Trailing            = false;  // Bật trailing cho 50% còn lại?
input int     Trailing_Start_Pips     = 50;     // Bắt đầu trailing từ X pip lãi
input int     Trailing_Step_Pips      = 10;     // Bước dịch SL mỗi lần
input int     Trailing_Dist_Pips      = 20;     // Khoảng cách SL đến giá

//--- Globals
CTrade         trade;
CPositionInfo  posInfo;
CSymbolInfo    symInfo;

// Array to track signals already executed
string ExecutedSignals[];

// Struct to track local trade state
struct TradeState {
   ulong  ticket;
   string signal_id;
   string symbol;
   double tp1;
   double tp2;
   bool   tp1_hit;
   bool   be_moved;
   double last_trailing_sl;
};
TradeState activeTrades[];

//+------------------------------------------------------------------+
int OnInit() {
   trade.SetExpertMagicNumber(MagicNumber);
   EventSetTimer(3); // Fast polling 3s
   
   HubURL_Poll       = HubURL_Base + "/council_signal_all";
   HubURL_Open       = HubURL_Base + "/trade_open";
   HubURL_Close      = HubURL_Base + "/trade_close";
   string HubURL_FC  = HubURL_Base + "/force_close";  // Agent 20
   
   Print("[StevenTracker] Started. Hub: ", HubURL_Poll);
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason) {
   EventKillTimer();
}

//+------------------------------------------------------------------+
void OnTimer() {
   PollNextSignal();
   PollForceClose();    // Agent 20: kiem tra lenh dong khan cap
   ManageActiveTrades();
   CheckClosedTrades();
   CheckNewManualTrades();
}

//+------------------------------------------------------------------+
// 1. POLLING API
//+------------------------------------------------------------------+
void PollNextSignal() {
   char postData[], resultData[];
   string resultHeaders;
   int res = WebRequest("GET", HubURL_Poll, "", 5000, postData, resultData, resultHeaders);
   
   if(res == 200) {
      string response = CharArrayToString(resultData);
      
      // New endpoint returns full JSON signal or {"status": "NO_SIGNAL"}
      if(StringFind(response, "NO_SIGNAL") >= 0) return;
      if(StringFind(response, "PENDING_EXECUTION") < 0) return;
      
      // Extract fields from JSON: id, decision, entry, sl, tp1, tp2
      string sig_id   = JsonGetStr(response, "id");
      string sig_sym  = JsonGetStr(response, "symbol");
      string decision = JsonGetStr(response, "decision");
      double entryP   = JsonGetDbl(response, "entry");
      double slP      = JsonGetDbl(response, "sl");
      double tp1P     = JsonGetDbl(response, "tp1");
      double tp2P     = JsonGetDbl(response, "tp2");
      
      if(sig_id != "" && decision != "" && decision != "WAIT" && !HasExecuted(sig_id)) {
         string tradeSym = FindTradableSymbol(StringSubstr(sig_sym, 0, 6));
         if(tradeSym != "") {
            ExecuteSignal(decision, entryP, slP, tp1P, tp2P, sig_id, tradeSym);
         } else {
            Print("[StevenTracker] Symbol mapping failed in MarketWatch for: ", sig_sym);
         }
      }
   }
}

bool HasExecuted(string sig_id) {
   for(int i=0; i<ArraySize(ExecutedSignals); i++) {
      if(ExecutedSignals[i] == sig_id) return true;
   }
   return false;
}

string FindTradableSymbol(string baseSym) {
   int total = SymbolsTotal(false); // only in Market Watch
   for(int i = 0; i < total; i++) {
      string symName = SymbolName(i, false);
      if(StringFind(symName, baseSym) == 0) { // e.g. "XAUUSD" matches "XAUUSDc" at index 0
         if(SymbolInfoInteger(symName, SYMBOL_TRADE_MODE) == SYMBOL_TRADE_MODE_FULL) {
            return symName;
         }
      }
   }
   return "";
}

// JSON helper functions
string JsonGetStr(string json, string key) {
   string search = "\"" + key + "\":\"";
   int idx = StringFind(json, search);
   if(idx < 0) return "";
   int start = idx + StringLen(search);
   int end   = StringFind(json, "\"", start);
   if(end < 0) return "";
   return StringSubstr(json, start, end - start);
}

double JsonGetDbl(string json, string key) {
   string search = "\"" + key + "\":";
   int idx = StringFind(json, search);
   if(idx < 0) return 0.0;
   int start = idx + StringLen(search);
   // Read until comma, } or space
   string numStr = "";
   for(int i = start; i < start + 15 && i < StringLen(json); i++) {
      string c = StringSubstr(json, i, 1);
      if(c == "," || c == "}" || c == " " || c == "\n") break;
      numStr += c;
   }
   return StringToDouble(numStr);
}

void ExecuteSignal(string decision, double entryP, double slP, double tp1P, double tp2P, string sig_id, string tradeSym) {
   
   if(HasExecuted(sig_id)) return;
   
   symInfo.Name(tradeSym);
   symInfo.RefreshRates();
   
   double currentPrice = (decision == "BUY") ? symInfo.Ask() : symInfo.Bid();
   
   // Market Execution is forced immediately (User request: không cho chờ)
   // Remove the +- 2.0 MathAbs restriction and blindly fire at the current Ask/Bid!
   int size = ArraySize(ExecutedSignals);
   ArrayResize(ExecutedSignals, size + 1);
   ExecutedSignals[size] = sig_id;
   
   bool sent = false;
   if(decision == "BUY")       sent = trade.Buy(LotSize, tradeSym, symInfo.Ask(), slP, tp2P, "AI: " + sig_id);
   else if(decision == "SELL") sent = trade.Sell(LotSize, tradeSym, symInfo.Bid(), slP, tp2P, "AI: " + sig_id);
   
   if(sent) {
      ulong ticket = trade.ResultOrder();
      if(ticket == 0) ticket = trade.ResultDeal(); // fallback
      
      // Save local tracking
      int ts = ArraySize(activeTrades);
      ArrayResize(activeTrades, ts + 1);
      activeTrades[ts].ticket    = ticket;
      activeTrades[ts].signal_id = sig_id;
      activeTrades[ts].symbol    = tradeSym;
      activeTrades[ts].tp1       = tp1P;
      activeTrades[ts].tp2       = tp2P;
      activeTrades[ts].tp1_hit   = false;
      activeTrades[ts].be_moved  = false;
      activeTrades[ts].last_trailing_sl = slP;
      
      Print("[StevenTracker] Executed AI Signal: ", decision, " | ID: ", sig_id, " | Ticket: ", ticket, " | Sym: ", tradeSym);
      PostTradeOpen(ticket, tradeSym, decision, symInfo.Ask(), slP, tp1P, tp2P, sig_id);
   } else {
      Print("[StevenTracker] OrderSend Failed: ", trade.ResultRetcodeDescription());
   }
}

void CheckNewManualTrades() {
   for(int i = 0; i < PositionsTotal(); i++) {
      ulong ticket = PositionGetTicket(i);
      if(ticket > 0) {
         bool isTracked = false;
         for(int j = 0; j < ArraySize(activeTrades); j++) {
            if(activeTrades[j].ticket == ticket) { isTracked = true; break; }
         }
         if(!isTracked) {
            string sym = PositionGetString(POSITION_SYMBOL);
            long type = PositionGetInteger(POSITION_TYPE);
            double entry = PositionGetDouble(POSITION_PRICE_OPEN);
            double sl = PositionGetDouble(POSITION_SL);
            double tp = PositionGetDouble(POSITION_TP);
            string d = (type == POSITION_TYPE_BUY) ? "BUY" : "SELL";
            
            int ts = ArraySize(activeTrades);
            ArrayResize(activeTrades, ts + 1);
            activeTrades[ts].ticket = ticket;
            activeTrades[ts].signal_id = "MANUAL-" + IntegerToString(ticket);
            activeTrades[ts].symbol = sym;
            activeTrades[ts].tp1 = tp;
            activeTrades[ts].tp2 = tp;
            activeTrades[ts].tp1_hit = false;
            activeTrades[ts].be_moved = false;
            activeTrades[ts].last_trailing_sl = sl;
            
            Print("[StevenTracker] Found Manual Trade: #", ticket, " -> Syncing to Hub");
            PostTradeOpen(ticket, StringSubstr(sym, 0, 6), d, entry, sl, tp, tp, activeTrades[ts].signal_id);
         }
      }
   }
}

//+------------------------------------------------------------------+
// 2. TRADE MANAGEMENT (TP1, BE, TRAILING)
//+------------------------------------------------------------------+
void ManageActiveTrades() {
   for(int i = 0; i < ArraySize(activeTrades); i++) {
      ulong ticket = activeTrades[i].ticket;
      if(!posInfo.SelectByTicket(ticket)) continue;

      symInfo.Name(posInfo.Symbol());
      symInfo.RefreshRates();

      double openPrice  = posInfo.PriceOpen();
      double currentSL  = posInfo.StopLoss();
      double currentTP  = posInfo.TakeProfit();
      double currentBid = symInfo.Bid();
      double currentAsk = symInfo.Ask();
      double currentVol = posInfo.Volume();
      int    type       = posInfo.PositionType();
      double point      = symInfo.Point();

      double tp2 = activeTrades[i].tp2;  // Full TP (set on order)
      if(tp2 <= 0) continue;             // No TP → nothing to manage

      // ── Tính % tiến độ đến TP ──
      double tpDist    = 0;
      double progress  = 0;
      if(type == POSITION_TYPE_BUY) {
         tpDist   = tp2 - openPrice;
         progress = (tpDist > 0) ? (currentBid - openPrice) / tpDist : 0;
      } else {
         tpDist   = openPrice - tp2;
         progress = (tpDist > 0) ? (openPrice - currentAsk) / tpDist : 0;
      }

      // ── BƯỚC 1: Đạt X% TP → Tỉa + Kéo BE tự động ──
      double triggerPct = PartialClose_TriggerPct / 100.0;
      if(!activeTrades[i].tp1_hit && progress >= triggerPct) {
         activeTrades[i].tp1_hit = true;

         // Tỉa theo PartialClose_VolumePct
         double closeFrac  = PartialClose_VolumePct / 100.0;
         double closeVol   = NormalizeDouble(currentVol * closeFrac, 2);
         double closePrice = (type == POSITION_TYPE_BUY) ? currentBid : currentAsk;
         if(closeVol >= SymbolInfoDouble(posInfo.Symbol(), SYMBOL_VOLUME_MIN)) {
            trade.PositionClosePartial(ticket, closeVol);
            Print("[StevenTracker] [", PartialClose_TriggerPct, "%TP] Tia ", PartialClose_VolumePct, "% vol tai ", closePrice);
            string baseSym6 = StringSubstr(posInfo.Symbol(), 0, 6);
            PostPartialClose(ticket, baseSym6, activeTrades[i].signal_id, closeVol, closePrice, (int)PartialClose_TriggerPct);
         }

         // Kéo BE về (entry + BE_Buffer_Dollar) nếu Use_BE = true
         if(Use_BE) {
            double bePrice  = (type == POSITION_TYPE_BUY) ? openPrice + BE_Buffer_Dollar : openPrice - BE_Buffer_Dollar;
            bool   needMove = (type == POSITION_TYPE_BUY)
                              ? (currentSL < bePrice)
                              : (currentSL > bePrice || currentSL == 0);
            if(needMove) {
               trade.PositionModify(ticket, bePrice, currentTP);
               activeTrades[i].be_moved = true;
               activeTrades[i].last_trailing_sl = bePrice;
               Print("[StevenTracker] [BE] SL keo ve ", bePrice);
            }
         }
      }

      // ── BƯỚC 2: Trailing cho 50% còn lại (nếu bật) ──
      if(Use_Trailing && activeTrades[i].tp1_hit) {
         double point     = symInfo.Point();
         double dist      = Trailing_Dist_Pips * 10.0 * point;
         double step      = Trailing_Step_Pips * 10.0 * point;
         double startDist = Trailing_Start_Pips * 10.0 * point;
         double pnl = (type == POSITION_TYPE_BUY)
                      ? (currentBid - openPrice)
                      : (openPrice - currentAsk);
         if(pnl >= startDist) {
            double newSL = (type == POSITION_TYPE_BUY)
                           ? currentBid - dist
                           : currentAsk + dist;
            bool shouldMove = (type == POSITION_TYPE_BUY)
                              ? (newSL > activeTrades[i].last_trailing_sl + step)
                              : (newSL < activeTrades[i].last_trailing_sl - step || activeTrades[i].last_trailing_sl == 0);
            if(shouldMove) {
               trade.PositionModify(ticket, newSL, currentTP);
               activeTrades[i].last_trailing_sl = newSL;
               Print("[StevenTracker] [Trail] SL -> ", newSL);
            }
         }
      }
   }
}


//+------------------------------------------------------------------+
// 3. CLOSED TRADES REPORTING
//+------------------------------------------------------------------+
void CheckClosedTrades() {
   // Iterate backwards to allow safe removal
   for(int i = ArraySize(activeTrades) - 1; i >= 0; i--) {
      ulong ticket = activeTrades[i].ticket;
      
      // If position no longer exists, it is closed
      if(!posInfo.SelectByTicket(ticket)) {
         
         // Fetch history to get PnL
         HistorySelectByPosition(ticket);
         int deals = HistoryDealsTotal();
         
         double totalProfitUSD = 0.0;
         double totalVolumeIn  = 0.0;
         for(int d=0; d<deals; d++) {
            ulong dealTicket = HistoryDealGetTicket(d);
            totalProfitUSD += HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
            if(HistoryDealGetInteger(dealTicket, DEAL_ENTRY) == DEAL_ENTRY_IN)
               totalVolumeIn = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
         }
         
         // Calculate profit in pips (using contract spec)
         string tradeSym = activeTrades[i].symbol;
         double tick_value  = SymbolInfoDouble(tradeSym, SYMBOL_TRADE_TICK_VALUE);
         double tick_size   = SymbolInfoDouble(tradeSym, SYMBOL_TRADE_TICK_SIZE);
         double lot_used    = (totalVolumeIn > 0) ? totalVolumeIn : LotSize;
         double profit_pips = 0;
         if(tick_value > 0 && tick_size > 0 && lot_used > 0)
            profit_pips = totalProfitUSD / (tick_value / tick_size * lot_used);
         
         string sig_id = activeTrades[i].signal_id;
         string close_reason = (totalProfitUSD > 0) ? "tp" : "sl";
         string baseSym = StringSubstr(tradeSym, 0, 6);
         PostTradeClose(ticket, baseSym, profit_pips, totalProfitUSD, close_reason, sig_id);
         
         ArrayRemove(activeTrades, i, 1);
      }
   }
}

void PollForceClose() {
   char postData[], resultData[];
   string resultHeaders;
   string url = HubURL_Base + "/force_close";
   int res = WebRequest("GET", url, "", 5000, postData, resultData, resultHeaders);
   if(res != 200) return;
   string response = CharArrayToString(resultData);
   if(StringFind(response, "NONE") >= 0) return;

   string fc_ticket = JsonGetStr(response, "ticket");
   string fc_reason = JsonGetStr(response, "reason");
   if(fc_ticket == "") return;

   // Tim lenh co ticket nay
   for(int i = 0; i < ArraySize(activeTrades); i++) {
      if(IntegerToString((long)activeTrades[i].ticket) == fc_ticket) {
         symInfo.Name(activeTrades[i].symbol);
         symInfo.RefreshRates();
         double closePrice = (posInfo.SelectByTicket(activeTrades[i].ticket)
                              && posInfo.PositionType() == POSITION_TYPE_BUY)
                             ? symInfo.Bid() : symInfo.Ask();

         bool closed = trade.PositionClose(activeTrades[i].ticket);
         Print("[StevenTracker] [AGENT 20] Dong lenh #", fc_ticket, " | Ly do: ", fc_reason, " | OK=", closed);

         // Xac nhan voi Hub
         string ackJson = StringFormat(
            "{\"ticket\":\"%s\",\"close_price\":%.5f,\"reason\":\"%s\"}",
            fc_ticket, closePrice, fc_reason
         );
         char ackData[], ackResult[];
         string ackHeaders;
         StringToCharArray(ackJson, ackData, 0, StringLen(ackJson));
         WebRequest("POST", HubURL_Base + "/force_close_ack", "Content-Type: application/json\r\n", 5000, ackData, ackResult, ackHeaders);
         break;
      }
   }
}

void PostPartialClose(ulong ticket, string symbol, string sig_id, double vol_closed, double close_price, int trigger_pct) {
   string json = StringFormat(
      "{\"ticket\":%d,\"symbol\":\"%s\",\"signal_id\":\"%s\",\"vol_closed\":%.2f,\"close_price\":%.5f,\"trigger_pct\":%d}",
      ticket, symbol, sig_id, vol_closed, close_price, trigger_pct
   );
   char postData[], resultData[];
   string resultHeaders;
   StringToCharArray(json, postData, 0, StringLen(json));
   WebRequest("POST", HubURL_Base + "/partial_close", "Content-Type: application/json\r\n", 5000, postData, resultData, resultHeaders);
}

void PostTradeOpen(ulong ticket, string symbol, string typeStr, double entry, double sl, double tp1, double tp2, string sig_id) {
   string baseSym = StringSubstr(symbol, 0, 6);
   string json = StringFormat(
      "{\"ticket\":%d,\"symbol\":\"%s\",\"type\":\"%s\",\"entry\":%.5f,\"sl\":%.5f,\"tp1\":%.5f,\"tp2\":%.5f,\"lot\":%.2f,\"signal_id\":\"%s\"}",
      ticket, baseSym, typeStr, entry, sl, tp1, tp2, LotSize, sig_id
   );
   
   char postData[], resultData[];
   string resultHeaders;
   StringToCharArray(json, postData, 0, StringLen(json));
   WebRequest("POST", HubURL_Open, "Content-Type: application/json\r\n", 5000, postData, resultData, resultHeaders);
}

void PostTradeClose(ulong ticket, string symbol, double profit_pips, double profit_usd, string close_reason, string sig_id) {
   string json = StringFormat(
      "{\"ticket\":%d,\"symbol\":\"%s\",\"profit_pips\":%.2f,\"profit_usd\":%.2f,\"close_reason\":\"%s\",\"signal_id\":\"%s\"}",
      ticket, symbol, profit_pips, profit_usd, close_reason, sig_id
   );
   
   char postData[], resultData[];
   string resultHeaders;
   StringToCharArray(json, postData, 0, StringLen(json));
   WebRequest("POST", HubURL_Close, "Content-Type: application/json\r\n", 5000, postData, resultData, resultHeaders);
}
