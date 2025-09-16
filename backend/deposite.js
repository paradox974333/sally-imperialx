// deposite.js
require('dotenv').config();
const { RestClientV5 } = require('bybit-api');

class DepositManager {
  constructor(dbManager) {
    this.db = dbManager;

    const key = process.env.BYBIT_MASTER_KEY;
    const secret = process.env.BYBIT_MASTER_SECRET;
    if (!key || !secret) {
      throw new Error('Missing BYBIT_MASTER_KEY/BYBIT_MASTER_SECRET in environment.');
    }

    this.client = new RestClientV5({
      key,
      secret,
      testnet: process.env.NODE_ENV !== 'production',
      // options: { 'User-Agent': 'AITradingBot/1.0' } // optional
    });
  }

  // Cache helper
  async cacheGet(key) {
    try {
      return await this.db.redis.get(key);
    } catch {
      return null;
    }
  }
  async cacheSet(key, value, seconds = 600) {
    try {
      await this.db.redis.set(key, value, 'EX', seconds);
    } catch {
      // ignore cache write errors
    }
  }

  // 1) Get coin info (optionally filter by a coin, uppercase only)
  async getCoinInfo(coin) {
    const normalized = coin ? String(coin).toUpperCase() : undefined;
    const cacheKey = normalized ? `coin-info:${normalized}` : 'coin-info:ALL';
    const cached = await this.cacheGet(cacheKey);
    if (cached) return JSON.parse(cached);

    const resp = await this.client.getCoinInfo(normalized);
    if (resp.retCode !== 0) {
      throw new Error(`Bybit getCoinInfo failed: ${resp.retMsg}`);
    }
    const rows = resp?.result?.rows || [];
    await this.cacheSet(cacheKey, JSON.stringify(rows), 600);
    return rows;
  }

  // 2) Transform coin info into UI-friendly deposit options
  //    Returns: [{ coin, name, chains: [{ chain, chainType, chainDeposit, chainWithdraw, withdrawFee, depositMin, withdrawMin, minAccuracy, confirmation, safeConfirmNumber }] }]
  async listDepositOptions(coin) {
    const rows = await this.getCoinInfo(coin);
    return rows.map(r => ({
      coin: r.coin,
      name: r.name,
      remainAmount: r.remainAmount,
      chains: (r.chains || []).map(c => ({
        chain: c.chain,
        chainType: c.chainType,
        chainDeposit: c.chainDeposit,
        chainWithdraw: c.chainWithdraw,
        withdrawFee: c.withdrawFee,
        withdrawPercentageFee: c.withdrawPercentageFee,
        depositMin: c.depositMin,
        withdrawMin: c.withdrawMin,
        minAccuracy: c.minAccuracy,
        confirmation: c.confirmation,
        safeConfirmNumber: c.safeConfirmNumber,
        contractAddress: c.contractAddress
      }))
    }));
  }

  // 3) Get sub deposit address
  //    Important: the API expects chainType param whose value must be the "chain" from coin-info (e.g., TRX/ETH/MANTLE). 
  async getSubDepositAddress({ coin, chainOrChainType, subMemberId }) {
    if (!coin) throw new Error('coin is required');
    if (!chainOrChainType) throw new Error('chain (chainType param) is required');
    if (!subMemberId) throw new Error('subMemberId is required');

    const coinUpper = String(coin).toUpperCase();
    const chainValue = String(chainOrChainType).toUpperCase();

    // Optional safety: verify the chain exists for the coin from coin-info
    const options = await this.listDepositOptions(coinUpper);
    const match = options.find(o => o.coin === coinUpper);
    if (!match) throw new Error(`Unknown coin: ${coinUpper}`);
    const chainExists = (match.chains || []).some(c => String(c.chain).toUpperCase() === chainValue);
    if (!chainExists) {
      throw new Error(`Chain ${chainValue} not available for ${coinUpper}`);
    }

    const resp = await this.client.getSubDepositAddress(coinUpper, chainValue, String(subMemberId));
    if (resp.retCode !== 0) {
      throw new Error(`Bybit getSubDepositAddress failed: ${resp.retMsg}`);
    }
    return resp.result;
  }

  // 4) Express routes
  createRoutes(app, authenticateToken) {
    // GET /api/deposit/coin-info?coin=USDT (optional coin)
    app.get('/api/deposit/coin-info', authenticateToken, async (req, res) => {
      try {
        const coin = req.query.coin ? String(req.query.coin).toUpperCase() : undefined;
        const data = await this.listDepositOptions(coin);
        res.json({ success: true, data, timestamp: new Date().toISOString() });
      } catch (e) {
        res.status(500).json({ success: false, error: e.message });
      }
    });

    // GET /api/deposit/address?coin=USDT&chain=TRX&subMemberId=123456
    // If subMemberId is omitted, default to the caller's JWT uid
    app.get('/api/deposit/address', authenticateToken, async (req, res) => {
      try {
        const coin = req.query.coin ? String(req.query.coin).toUpperCase() : '';
        const chainParam = (req.query.chain || req.query.chainType || '').toString().toUpperCase();
        const subMemberId = req.query.subMemberId ? String(req.query.subMemberId) : String(req.user?.uid || '');

        const result = await this.getSubDepositAddress({
          coin,
          chainOrChainType: chainParam, // value must be the "chain" from coin-info
          subMemberId
        });

        res.json({ success: true, data: result, timestamp: new Date().toISOString() });
      } catch (e) {
        res.status(400).json({ success: false, error: e.message });
      }
    });
  }
}

module.exports = DepositManager;
