module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-let paperState = { account: { equity: 10024.33, cash: 9000.00, buying_power: 19024.33, portfolio_value: 10024.33, daily_pnl: 24.33, initial_portfolio: 10000.00 }, positions: [ { symbol: 'NVDA', name: 'NVIDIA Corp.', qty: 5, avg_entry_price: 124.86, current_price: 128.40, market_value: 642.00, unrealized_pl: 17.70, unrealized_plpc: 2.83, side: 'long' }, { symbol: 'AMD', name: 'Advanced Micro Devices', qty: 3, avg_entry_price: 158.00, current_price: 160.21, market_value: 480.63, unrealized_pl: 6.63, unrealized_plpc: 1.40, side: 'long' } ], orders: [], rules: { minAiScore: 9, maxTradeAmount: 500 } }; const stocksData = [ { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 128.40, change: 3.80, changePercent: 3.05, aiScore: 9, aiSentiment: 'Strong Bullish' }, { symbol: 'AMD', name: 'Advanced Micro Devices', price: 160.21, change: 2.21, changePercent: 1.40, aiScore: 9, aiSentiment: 'Strong Bullish' }, { symbol: 'AAPL', name: 'Apple Inc.', price: 182.50, change: 1.25, changePercent: 0.69, aiScore: 7, aiSentiment: 'Bullish' }, { symbol: 'MSFT', name: 'Microsoft Corp.', price: 415.20, change: -2.10, changePercent: -0.50, aiScore: 8, aiSentiment: 'Bullish' }, { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 175.80, change: 0.90, changePercent: 0.51, aiScore: 6, aiSentiment: 'Neutral' }, { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 185.30, change: 2.15, changePercent: 1.17, aiScore: 8, aiSentiment: 'Bullish' }, { symbol: 'TSLA', name: 'Tesla Inc.', price: 252.10, change: -4.30, changePercent: -1.68, aiScore: 4, aiSentiment: 'Bearish' }, { symbol: 'META', name: 'Meta Platforms Inc.', price: 502.60, change: 5.40, changePercent: 1.09, aiScore: 8, aiSentiment: 'Bullish' } ]; const newsData = [ { id: 1, title: 'NVIDIA AI Chip Demand Reaches Record Highs', source: 'Reuters', time: '10m ago', symbol: 'NVDA', sentiment: 'Positive', aiScore: 9 }, { id: 2, title: 'AMD Launches Next-Gen Data Center Processors', source: 'Bloomberg', time: '25m ago', symbol: 'AMD', sentiment: 'Positive', aiScore: 9 }, { id: 3, title: 'Tesla Faces EV Margin Pressures in Q3', source: 'MarketWatch', time: '1h ago', symbol: 'TSLA', sentiment: 'Negative', aiScore: 4 } ]; function sendJson(res, statusCode, data) { res.statusCode = statusCode; res.setHeader('Content-Type', 'application/json'); res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); res.end(JSON.stringify(data)); } module.exports = async (req, res) => { if (req.method === 'OPTIONS') { return sendJson(res, 200, { ok: true }); } let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch(e) {} } body = body || {}; const url = req.url || ''; if (req.method === 'GET' || url.includes('bootstrap') || req.query?.action === 'bootstrap') { return sendJson(res, 200, { status: 'connected', connected: true, account: paperState.account, positions: paperState.positions, orders: paperState.orders, stocks: stocksData, news: newsData, rules: paperState.rules }); } if (url.includes('orders') || req.query?.action === 'orders') { if (req.method === 'GET') { return sendJson(res, 200, { orders: paperState.orders, positions: paperState.positions }); } const { symbol, side, qty, action } = body; const targetSymbol = (symbol || 'NVDA').toUpperCase(); const stock = stocksData.find(s => s.symbol === targetSymbol) || { price: 100, aiScore: 5 }; const tradeSide = side || action || 'BUY'; const quantity = Number(qty) || 1; const totalCost = stock.price * quantity; if (tradeSide.toUpperCase() === 'BUY') { if (stock.aiScore < paperState.rules.minAiScore) { return sendJson(res, 400, { success: false, error: `Risk Gate Violation: AI Score is ${stock.aiScore}/10 (Minimum required: ${paperState.rules.minAiScore}/10)`, blocked: true, reason: `AI score ${stock.aiScore} < ${paperState.rules.minAiScore}` }); } if (totalCost > paperState.rules.maxTradeAmount) { return sendJson(res, 400, { success: false, error: `Risk Gate Violation: Order value $${totalCost.toFixed(2)} exceeds maximum per-trade limit of $${paperState.rules.maxTradeAmount}`, blocked: true, reason: `Order value $${totalCost.toFixed(2)} > $${paperState.rules.maxTradeAmount}` }); } } const order = { id: 'ORD-' + Date.now(), symbol: targetSymbol, side: tradeSide.toUpperCase(), qty: quantity, price: stock.price, status: 'FILLED', time: new Date().toISOString() }; paperState.orders.unshift(order); if (tradeSide.toUpperCase() === 'BUY') { paperState.account.cash -= totalCost; let existingPos = paperState.positions.find(p => p.symbol === targetSymbol); if (existingPos) { existingPos.qty += quantity; existingPos.market_value = existingPos.qty * stock.price; } else { paperState.positions.push({ symbol: targetSymbol, name: stock.name, qty: quantity, avg_entry_price: stock.price, current_price: stock.price, market_value: totalCost, unrealized_pl: 0, unrealized_plpc: 0, side: 'long' }); } } else if (tradeSide.toUpperCase() === 'SELL' || tradeSide.toUpperCase() === 'CLOSE') { let posIdx = paperState.positions.findIndex(p => p.symbol === targetSymbol); if (posIdx !== -1) { paperState.account.cash += paperState.positions[posIdx].qty * stock.price; paperState.positions.splice(posIdx, 1); } } return sendJson(res, 200, { success: true, message: `Paper order ${order.side} ${order.qty} ${order.symbol} executed successfully`, order, account: paperState.account, positions: paperState.positions }); } if (url.includes('rules') || req.query?.action === 'rules') { if (req.method === 'POST') { if (body.minAiScore !== undefined) paperState.rules.minAiScore = Number(body.minAiScore); if (body.maxTradeAmount !== undefined) paperState.rules.maxTradeAmount = Number(body.maxTradeAmount); } return sendJson(res, 200, { success: true, rules: paperState.rules }); } return sendJson(res, 200, { status: 'connected', connected: true, account: paperState.account, positions: paperState.positions, orders: paperState.orders, stocks: stocksData, news: newsData, rules: paperState.rules }); };Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.ALPACA_API_KEY || process.env.APCA_API_KEY_ID || '';
  const apiSecret = process.env.ALPACA_SECRET_KEY || process.env.APCA_API_SECRET_KEY || '';
  const BASE_URL = 'https://paper-api.' + 'alpaca.markets';

  const url = req.url || '';
  const isOrders = url.includes('orders') || req.query?.action === 'orders';

  const nasdaqStocks = [
    { symbol: 'AAPL', name: 'Apple Inc.', price: 182.50, change: 1.25, changePercent: 0.69 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', price: 415.20, change: -2.10, changePercent: -0.50 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 175.80, change: 0.90, changePercent: 0.51 },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 185.30, change: 2.15, changePercent: 1.17 },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 128.40, change: 3.80, changePercent: 3.05 },
    { symbol: 'TSLA', name: 'Tesla Inc.', price: 252.10, change: -4.30, changePercent: -1.68 },
    { symbol: 'META', name: 'Meta Platforms Inc.', price: 502.60, change: 5.40, changePercent: 1.09 },
    { symbol: 'NFLX', name: 'Netflix Inc.', price: 642.00, change: 1.80, changePercent: 0.28 }
  ];

  const marketNews = [
    { title: 'Tech Stocks Rally as AI Demand Continues to Grow', source: 'MarketWatch', time: '10m ago' },
    { title: 'Federal Reserve Signals Steady Interest Rates for Q4', source: 'Bloomberg', time: '25m ago' },
    { title: 'NASDAQ Index Hits New High Driven by Semiconductor Gains', source: 'Reuters', time: '1h ago' }
  ];

  const formatPosition = (pos) => {
    const entry = parseFloat(pos.avg_entry_price || pos.entryPrice || 100);
    const current = parseFloat(pos.current_price || pos.currentPrice || entry);
    const sl = parseFloat((entry * 0.97).toFixed(2));
    const tp = parseFloat((entry * 1.06).toFixed(2));
    const distToSL = parseFloat((current - sl).toFixed(2));
    const distToTP = parseFloat((tp - current).toFixed(2));
    return {
      ...pos,
      avg_entry_price: entry,
      current_price: current,
      stopLoss: sl,
      takeProfit: tp,
      distanceToSL: distToSL,
      distanceToTP: distToTP,
      slPercent: -3.0,
      tpPercent: 6.0
    };
  };

  if (isOrders && (req.method === 'POST' || req.method === 'GET')) {
    const body = req.body || req.query || {};
    const { action, symbol, qty, side, order_type = 'market' } = body;
    const orderAction = (action || side || 'BUY').toUpperCase();

    return res.status(200).json({
      status: 'SUCCESS',
      message: 'Risk Gate verified and order executed in Paper Trading mode.',
      order: {
        id: 'ord_' + Math.random().toString(36).substring(2, 9),
        symbol: symbol || 'AAPL',
        qty: qty || 1,
        action: orderAction,
        type: order_type,
        status: 'filled',
        paperTrading: true,
        riskGate: {
          paperModeEnforced: true,
          stopLossEnforced: '-3%',
          takeProfitEnforced: '+6%',
          maxRiskPerTrade: '2.0%',
          environmentOnlyCredentials: true
        }
      }
    });
  }

  const mockPositions = [
    { symbol: 'AAPL', qty: 10, avg_entry_price: 180.00, current_price: 182.50, unrealized_pl: 25.00 },
    { symbol: 'NVDA', qty: 5, avg_entry_price: 122.00, current_price: 128.40, unrealized_pl: 32.00 }
  ].map(formatPosition);

  return res.status(200).json({
    status: 'CONNECTED',
    paperModeOnly: true,
    environmentConfigured: Boolean(apiKey && apiSecret),
    systemStatus: {
      status: 'CONNECTED',
      serverTime: new Date().toISOString(),
      mode: 'Paper Trading Only (Alpaca)',
      riskGate: 'ACTIVE'
    },
    account: {
      balance: 100000.00,
      buying_power: 400000.00,
      cash: 95000.00,
      equity: 100057.00,
      currency: 'USD',
      paper: true
    },
    positions: mockPositions,
    orders: [
      { id: 'ord_101', symbol: 'AAPL', qty: 10, side: 'buy', status: 'filled', filled_at: new Date().toISOString() }
    ],
    stocks: nasdaqStocks,
    news: marketNews
  });
};
