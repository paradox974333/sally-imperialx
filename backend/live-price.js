const axios = require('axios');

class LivePriceFetcher {
    constructor() {
        this.priceAPIs = [
            {
                name: 'coinbase',
                getUrl: (symbol) => `https://api.coinbase.com/v2/exchange-rates?currency=${this.extractBaseCurrency(symbol)}`,
                parsePrice: (data, symbol) => {
                    const rates = data.data?.rates;
                    return rates?.USD ? parseFloat(rates.USD) : null;
                }
            },
            {
                name: 'coingecko',
                getUrl: (symbol) => {
                    const coinId = this.getCoinGeckoId(symbol);
                    return `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`;
                },
                parsePrice: (data, symbol) => {
                    const coinId = this.getCoinGeckoId(symbol);
                    return data[coinId]?.usd || null;
                }
            },
            {
                name: 'binance',
                getUrl: (symbol) => `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
                parsePrice: (data) => parseFloat(data.price)
            }
        ];
        
        this.symbolMap = {
            'BTC': { coingecko: 'bitcoin', binance: 'BTCUSDT' },
            'BITCOIN': { coingecko: 'bitcoin', binance: 'BTCUSDT' },
            'ETH': { coingecko: 'ethereum', binance: 'ETHUSDT' },
            'ETHEREUM': { coingecko: 'ethereum', binance: 'ETHUSDT' },
            'SOL': { coingecko: 'solana', binance: 'SOLUSDT' },
            'SOLANA': { coingecko: 'solana', binance: 'SOLUSDT' }
        };
    }

    async fetchLivePrice(query) {
        const symbol = this.extractSymbolFromQuery(query);
        if (!symbol) return null;

        console.log(`🔴 LIVE PRICE REQUEST: Fetching real-time price for ${symbol}`);

        for (const api of this.priceAPIs) {
            try {
                const url = api.getUrl(symbol);
                const response = await axios.get(url, { timeout: 5000 });
                const price = api.parsePrice(response.data, symbol);
                
                if (price && price > 0) {
                    console.log(`✅ LIVE PRICE: Got ${symbol} = $${price} from ${api.name.toUpperCase()}`);
                    return {
                        symbol: symbol,
                        price: price,
                        source: api.name,
                        timestamp: new Date().toISOString(),
                        isLive: true
                    };
                }
            } catch (error) {
                console.warn(`⚠️ ${api.name} API failed for ${symbol}: ${error.message}`);
                continue;
            }
        }

        console.error(`❌ LIVE PRICE FAILED: No price data available for ${symbol}`);
        return null;
    }

    extractSymbolFromQuery(query) {
        const upperQuery = query.toUpperCase();
        
        // Direct symbol matches
        for (const [key, mapping] of Object.entries(this.symbolMap)) {
            if (upperQuery.includes(key)) {
                return key;
            }
        }
        
        // Common variations
        if (upperQuery.includes('BTC') || upperQuery.includes('BITCOIN')) return 'BTC';
        if (upperQuery.includes('ETH') || upperQuery.includes('ETHEREUM')) return 'ETH';
        if (upperQuery.includes('SOL') || upperQuery.includes('SOLANA')) return 'SOL';
        
        return null;
    }

    extractBaseCurrency(symbol) {
        return symbol.replace('USDT', '').replace('USD', '');
    }

    getCoinGeckoId(symbol) {
        const mapping = this.symbolMap[symbol];
        return mapping?.coingecko || symbol.toLowerCase();
    }
}

module.exports = { LivePriceFetcher };
