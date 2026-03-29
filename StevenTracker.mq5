// StevenTracker.mq5 — MT5 EA: gửi trade results về hub.lomofx.com
// Cài vào MT5: Experts → StevenTracker.mq5
// Không tự động vào lệnh — chỉ theo dõi và báo cáo

#property copyright "Steven AI / ATTRAOS"
#property version   "1.00"
#property description "Gửi kết quả trading về Steven AI Hub để theo dõi accuracy"

input string HubURL = "https://hub.lomofx.com/api/mt5/trade";  // Hub API URL
input bool   SendOnOpen  = true;   // Gửi khi mở lệnh
input bool   SendOnClose = true;   // Gửi khi đóng lệnh

//--- State tracking
ulong lastTicket = 0;

//============================
int OnInit() {
   EventSetTimer(10); // check every 10 seconds
   Print("[StevenTracker] Đã kết nối. Hub: ", HubURL);
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason) {
   EventKillTimer();
}

//============================
void OnTimer() {
   int total = PositionsTotal();
   
   // Check for new positions
   for(int i = 0; i < total; i++) {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;
      
      if(PositionSelectByTicket(ticket) && ticket != lastTicket) {
         lastTicket = ticket;
         if(SendOnOpen) SendTrade(ticket, "open");
      }
   }
}

void OnTradeTransaction(const MqlTradeTransaction &trans,
                        const MqlTradeRequest &request,
                        const MqlTradeResult &result) {
   // Detect trade close
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD && SendOnClose) {
      ulong ticket   = trans.deal;
      string symbol  = trans.symbol;
      double profit  = HistoryDealGetDouble(ticket, DEAL_PROFIT);
      double lot     = HistoryDealGetDouble(ticket, DEAL_VOLUME);
      double price   = HistoryDealGetDouble(ticket, DEAL_PRICE);
      int    dealType = (int)HistoryDealGetInteger(ticket, DEAL_TYPE);
      string typeStr = (dealType == 0 ? "BUY_CLOSE" : "SELL_CLOSE");
      
      if(HistoryDealGetInteger(ticket, DEAL_ENTRY) == DEAL_ENTRY_OUT) {
         SendTradeData(
            (int)ticket, symbol, typeStr,
            price, 0, 0, lot, profit, "close"
         );
      }
   }
}

//============================
void SendTrade(ulong ticket, string status) {
   if(!PositionSelectByTicket(ticket)) return;
   
   string symbol  = PositionGetString(POSITION_SYMBOL);
   double entry   = PositionGetDouble(POSITION_PRICE_OPEN);
   double sl      = PositionGetDouble(POSITION_SL);
   double tp      = PositionGetDouble(POSITION_TP);
   double lot     = PositionGetDouble(POSITION_VOLUME);
   int    ptype   = (int)PositionGetInteger(POSITION_TYPE);
   string typeStr = (ptype == POSITION_TYPE_BUY ? "BUY" : "SELL");
   
   SendTradeData((int)ticket, symbol, typeStr, entry, sl, tp, lot, 0.0, status);
}

void SendTradeData(int ticket, string symbol, string tradeType,
                   double entry, double sl, double tp,
                   double lot, double profit, string status) {
   // Build JSON body
   string json = StringFormat(
      "{\"ticket\":%d,\"symbol\":\"%s\",\"type\":\"%s\","
      "\"entry\":%.5f,\"sl\":%.5f,\"tp\":%.5f,"
      "\"lot\":%.2f,\"profit\":%.2f,\"status\":\"%s\"}",
      ticket, symbol, tradeType, entry, sl, tp, lot, profit, status
   );
   
   // POST to hub
   char   postData[];
   char   resultData[];
   string resultHeaders;
   StringToCharArray(json, postData, 0, StringLen(json));
   
   string headers = "Content-Type: application/json\r\n";
   int    res = WebRequest("POST", HubURL, headers, 5000, postData, resultData, resultHeaders);
   
   if(res == 200) {
      string response = CharArrayToString(resultData);
      Print("[StevenTracker] Đã gửi: ", tradeType, " ", symbol, " | Hub: ", response);
   } else {
      Print("[StevenTracker] Lỗi gửi (HTTP ", res, "). Thêm URL vào MT5 Tools > Options > Expert Advisors > Allow WebRequest");
      Print("[StevenTracker] URL cần thêm: ", HubURL);
   }
}
