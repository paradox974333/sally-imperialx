

const axios = require('axios');
const EventEmitter = require('events');

class UniversalMultiDataProvider extends EventEmitter {
    constructor() {
        super();

        this.providers = {
            binance: { active: false, priority: 1 },
            coinbase: { active: false, priority: 2 },
            coingecko: { active: false, priority: 3 },
        };

        this.universalSymbolMap = {
            'BTCUSDT': { binance: 'BTCUSDT', coinbase: 'BTC-USD', coingecko: 'bitcoin' },
            'ETHUSDT': { binance: 'ETHUSDT', coinbase: 'ETH-USD', coingecko: 'ethereum' },
            'SOLUSDT': { binance: 'SOLUSDT', coinbase: 'SOL-USD', coingecko: 'solana' },
        };
    }

    async initialize() {
        console.log('🚀 Initializing Universal Multi-Data Provider...');
        const initPromises = [
            this.initializeBinance(),
            this.initializeCoinbase(),
            this.initializeCoinGecko(),
        ];
        await Promise.allSettled(initPromises);
        const activeProviders = Object.keys(this.providers).filter(p => this.providers[p].active);
        console.log(`✅ Universal fallback ready with ${activeProviders.length}/${Object.keys(this.providers).length} providers.`);
        return activeProviders.length > 0;
    }

    async initializeBinance() {
        try {
            await axios.get('https://api.binance.com/api/v3/ping', { timeout: 5000 });
            this.providers.binance.active = true;
            console.log('✅ Binance universal provider ready');
        } catch (error) {
            console.warn('⚠️ Binance provider failed to initialize.');
        }
    }

    async initializeCoinbase() {
        try {
            await axios.get('https://api.exchange.coinbase.com/products', { timeout: 5000 });
            this.providers.coinbase.active = true;
            console.log('✅ Coinbase universal provider ready');
        } catch (error) {
            console.warn('⚠️ Coinbase provider failed to initialize.');
        }
    }

    async initializeCoinGecko() {
        try {
            await axios.get('https://api.coingecko.com/api/v3/ping', { timeout: 5000 });
            this.providers.coingecko.active = true;
            console.log('✅ CoinGecko universal provider ready');
        } catch (error) {
            console.warn('⚠️ CoinGecko provider failed to initialize.');
        }
    }

    async getUniversalData(symbol) {
        const mapping = this.universalSymbolMap[symbol];
        if (!mapping) return null;

        for (const provider of Object.keys(this.providers).sort((a, b) => this.providers[a].priority - this.providers[b].priority)) {
            if (this.providers[provider].active && mapping[provider]) {
                let data = null;
                if (provider === 'binance') data = await this.fetchBinanceOnDemand(mapping.binance, symbol);
                if (provider === 'coinbase') data = await this.fetchCoinbaseOnDemand(mapping.coinbase, symbol);
                if (provider === 'coingecko') data = await this.fetchCoinGeckoOnDemand(mapping.coingecko, symbol);
                if (data) return data;
            }
        }
        return null;
    }

    async fetchBinanceOnDemand(binanceSymbol, universalSymbol) {
        try {
            const { data } = await axios.get(`https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`);
            return { provider: 'binance', price: parseFloat(data.lastPrice), volume24h: parseFloat(data.volume), change24h: parseFloat(data.priceChangePercent) / 100 };
        } catch (error) { return null; }
    }

    async fetchCoinbaseOnDemand(coinbaseSymbol, universalSymbol) {
        try {
            const { data } = await axios.get(`https://api.exchange.coinbase.com/products/${coinbaseSymbol}/ticker`);
            return { provider: 'coinbase', price: parseFloat(data.price), volume24h: parseFloat(data.volume) };
        } catch (error) { return null; }
    }

    async fetchCoinGeckoOnDemand(coinGeckoId, universalSymbol) {
        try {
            const { data } = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${coinGeckoId}&vs_currencies=usd&include_24hr_vol=true&include_24hr_change=true`);
            const coinData = data[coinGeckoId];
            return { provider: 'coingecko', price: coinData.usd, volume24h: coinData.usd_24h_vol, change24h: coinData.usd_24h_change / 100 };
        } catch (error) { return null; }
    }
}

class UniversalDataFallback {
    constructor() {
        this.multiProvider = new UniversalMultiDataProvider();
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return true;
        this.initialized = await this.multiProvider.initialize();
        return this.initialized;
    }

    async getBackupData(symbol) {
        if (!this.initialized) return null;
        const data = await this.multiProvider.getUniversalData(symbol);
        if (data) {
            console.log(`✅ FALLBACK SUCCESS: Got ${symbol} from ${data.provider.toUpperCase()}`);
            return this.convertToStandardFormat(symbol, data);
        }
        console.warn(`❌ FALLBACK FAILED: No backup data available for ${symbol}`);
        return null;
    }

    convertToStandardFormat(symbol, backupData) {
        return {
            symbol: symbol,
            ticker: {
                lastPrice: backupData.price,
                price24hPcnt: backupData.change24h || 0,
                volume24h: backupData.volume24h || 0,
                timestamp: Date.now(),
                isValid: true,
                dataQuality: 'BACKUP_PROVIDER'
            },
            dataSource: {
                backupProvider: backupData.provider,
            }
        };
    }
}

const universalDataFallback = new UniversalDataFallback();
universalDataFallback.initialize();

module.exports = { universalDataFallback };