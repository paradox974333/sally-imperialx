const axios = require('axios');
const crypto = require('crypto');

class WalletManager {
    constructor(dbManager) {
        this.dbManager = dbManager;
        this.baseURL = 'https://api.bybit.com'; // Use testnet: https://api-testnet.bybit.com for testing
    }

    // Generate signature for Bybit API authentication
    generateSignature(params, secret, timestamp) {
        const queryString = timestamp + params.apiKey + '5000' + params.queryString;
        return crypto.createHmac('sha256', secret).update(queryString).digest('hex');
    }

    // Get user credentials from Redis
    async getUserCredentials(username) {
        try {
            const userData = await this.dbManager.redis.hgetall(`user:${username}`);
            if (!userData.apiKey || !userData.secret) {
                throw new Error('User API credentials not found');
            }
            return {
                apiKey: userData.apiKey,
                secret: userData.secret,
                uid: userData.uid
            };
        } catch (error) {
            throw new Error(`Failed to retrieve user credentials: ${error.message}`);
        }
    }

    // Fetch wallet balance from Bybit API
    async getWalletBalance(username, coins = '') {
        try {
            const credentials = await this.getUserCredentials(username);
            const timestamp = Date.now().toString();
            
            // Build query parameters
            const params = {
                accountType: 'UNIFIED'
            };
            
            if (coins) {
                params.coin = coins;
            }

            const queryString = new URLSearchParams(params).toString();
            
            // Prepare signature parameters
            const signatureParams = {
                apiKey: credentials.apiKey,
                queryString: queryString
            };

            const signature = this.generateSignature(signatureParams, credentials.secret, timestamp);

            // Make API request
            const response = await axios.get(`${this.baseURL}/v5/account/wallet-balance?${queryString}`, {
                headers: {
                    'X-BAPI-API-KEY': credentials.apiKey,
                    'X-BAPI-SIGN': signature,
                    'X-BAPI-SIGN-TYPE': '2',
                    'X-BAPI-TIMESTAMP': timestamp,
                    'X-BAPI-RECV-WINDOW': '5000'
                },
                timeout: 10000
            });

            if (response.data.retCode !== 0) {
                throw new Error(`Bybit API Error: ${response.data.retMsg}`);
            }

            return this.formatWalletData(response.data.result);
            
        } catch (error) {
            console.error('Wallet balance fetch error:', error.message);
            throw new Error(`Failed to fetch wallet balance: ${error.message}`);
        }
    }

    // Format wallet data for frontend consumption
    formatWalletData(apiResult) {
        if (!apiResult.list || apiResult.list.length === 0) {
            return {
                totalEquity: '0',
                totalAvailableBalance: '0',
                totalWalletBalance: '0',
                coins: []
            };
        }

        const walletInfo = apiResult.list[0];
        
        // Extract essential wallet overview
        const overview = {
            totalEquity: walletInfo.totalEquity || '0',
            totalAvailableBalance: walletInfo.totalAvailableBalance || '0',
            totalWalletBalance: walletInfo.totalWalletBalance || '0',
            totalMarginBalance: walletInfo.totalMarginBalance || '0',
            accountType: walletInfo.accountType || 'UNIFIED'
        };

        // Extract and format individual coin balances
        const coins = (walletInfo.coin || []).map(coinData => ({
            coin: coinData.coin,
            walletBalance: coinData.walletBalance || '0',
            usdValue: coinData.usdValue || '0',
            equity: coinData.equity || '0',
            free: coinData.free || coinData.equity || '0', // Available balance
            locked: coinData.locked || '0',
            unrealisedPnl: coinData.unrealisedPnl || '0',
            borrowAmount: coinData.borrowAmount || '0'
        })).filter(coin => 
            // Only show coins with non-zero balances or USD value
            parseFloat(coin.walletBalance) > 0 || 
            parseFloat(coin.usdValue) > 0 ||
            parseFloat(coin.equity) > 0
        );

        return {
            ...overview,
            coins: coins,
            lastUpdated: new Date().toISOString()
        };
    }

    // Create Express route handlers
    createRoutes(app, authenticateToken) {
        // GET /api/wallet - Fetch complete wallet information
        app.get('/api/wallet', authenticateToken, async (req, res) => {
            const { username, uid } = req.user;
            const { coins } = req.query; // Optional: specific coins to query
            
            try {
                console.log(`Fetching wallet data for user: ${username}`);
                
                const walletData = await this.getWalletBalance(username, coins);
                
                // Log successful wallet fetch
                await this.dbManager.logActivity({
                    type: 'wallet_fetch',
                    userId: uid,
                    username,
                    coinsRequested: coins || 'all',
                    level: 'info'
                });

                res.json({
                    success: true,
                    data: walletData,
                    timestamp: new Date().toISOString()
                });
                
            } catch (error) {
                console.error(`Wallet fetch error for ${username}:`, error.message);
                
                // Log wallet fetch error
                await this.dbManager.logActivity({
                    type: 'wallet_fetch_error',
                    userId: uid,
                    username,
                    error: error.message,
                    level: 'error'
                });

                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch wallet information',
                    details: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
        });

        // GET /api/wallet/summary - Get simplified wallet summary
        app.get('/api/wallet/summary', authenticateToken, async (req, res) => {
            const { username, uid } = req.user;
            
            try {
                const walletData = await this.getWalletBalance(username);
                
                // Return simplified summary
                const summary = {
                    totalEquity: walletData.totalEquity,
                    totalAvailableBalance: walletData.totalAvailableBalance,
                    totalAssets: walletData.coins.length,
                    topAssets: walletData.coins
                        .sort((a, b) => parseFloat(b.usdValue) - parseFloat(a.usdValue))
                        .slice(0, 5)
                        .map(coin => ({
                            coin: coin.coin,
                            usdValue: coin.usdValue,
                            balance: coin.walletBalance
                        }))
                };

                res.json({
                    success: true,
                    data: summary,
                    timestamp: new Date().toISOString()
                });
                
            } catch (error) {
                console.error(`Wallet summary error for ${username}:`, error.message);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch wallet summary'
                });
            }
        });
    }
}

module.exports = WalletManager;
