// analysis.js - Enhanced with Memory Integration
const { RestClientV5 } = require('bybit-api');
const { SallyBrain } = require('./sally-brain');
const { MemoryManager } = require('./memory');
const { universalDataFallback } = require('./fallback');
const { LivePriceFetcher } = require('./live-price');

/**
 * Enhanced Technical Indicators with VWAP, MACD, Bollinger Bands, and HMA (Hull Moving Average)
 */
class TechnicalIndicators {
  static SMA(values, period) {
    if (!values || values.length < period) return null;
    return values.slice(-period).reduce((a, b) => a + b, 0) / period;
  }

  static EMA(values, period) {
    if (!values || values.length < period) return null;
    const k = 2 / (period + 1);
    let ema = values[0];
    for (let i = 1; i < values.length; i++) {
      ema = values[i] * k + ema * (1 - k);
    }
    return ema;
  }

  static RSI(closes, period = 14) {
    if (!closes || closes.length < period + 1) return null;
    let gains = 0, losses = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  static MACD(closes, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    if (!closes || closes.length < slowPeriod + signalPeriod) return null;
    const emaFast = this.EMA(closes, fastPeriod);
    const emaSlow = this.EMA(closes, slowPeriod);
    if (emaFast === null || emaSlow === null) return null;
    const macdLine = emaFast - emaSlow;
    
    const macdValues = closes.map((_, i) => {
      if (i < slowPeriod - 1) return 0;
      const fastEma = this.EMA(closes.slice(0, i + 1), fastPeriod);
      const slowEma = this.EMA(closes.slice(0, i + 1), slowPeriod);
      return fastEma - slowEma;
    }).slice(slowPeriod - 1);
    
    const signalLine = this.EMA(macdValues, signalPeriod);
    return {
      macdLine,
      signalLine,
      histogram: macdLine - signalLine,
      crossover: macdLine > signalLine ? 'bullish' : 'bearish'
    };
  }

  static VWAP(ohlcv) {
    let cumVolume = 0, cumPriceVolume = 0;
    const vwapArray = [];
    for (const candle of ohlcv) {
      const [, , high, low, close, volume] = candle;
      const typicalPrice = (parseFloat(high) + parseFloat(low) + parseFloat(close)) / 3;
      cumVolume += parseFloat(volume);
      cumPriceVolume += typicalPrice * parseFloat(volume);
      vwapArray.push(cumPriceVolume / cumVolume);
    }
    return vwapArray;
  }

  static BollingerBands(closes, period = 20, multiplier = 2) {
    if (!closes || closes.length < period) return null;
    const sma = this.SMA(closes, period);
    const stddev = Math.sqrt(closes.slice(-period).reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / period);
    return {
      upper: sma + multiplier * stddev,
      middle: sma,
      lower: sma - multiplier * stddev,
      squeeze: stddev < sma * 0.1
    };
  }

  static HMA(values, period) {
    if (!values || values.length < period) return null;
    const halfPeriod = Math.floor(period / 2);
    const sqrtPeriod = Math.floor(Math.sqrt(period));
    const rawHMA = values.map((_, i) => 2 * this.WMA(values.slice(0, i + 1), halfPeriod) - this.WMA(values.slice(0, i + 1), period));
    return this.WMA(rawHMA.slice(-sqrtPeriod), sqrtPeriod);
  }

  static WMA(values, period) {
    if (!values || values.length < period) return null;
    const weights = Array.from({ length: period }, (_, i) => i + 1);
    const weightSum = weights.reduce((a, b) => a + b, 0);
    const sliced = values.slice(-period);
    return sliced.reduce((sum, val, i) => sum + val * weights[i], 0) / weightSum;
  }
}

class AnalysisEngine {
  constructor(dbManager = null) {
    this.sallyBrain = null;
    this.bybitClient = null;
    this.livePriceFetcher = new LivePriceFetcher();
    this.memory = null;
    this.dbManager = dbManager;
  }

  async initialize() {
    console.log('🚀 Initializing Dynamic Analysis Engine with Memory...');
    this.sallyBrain = new SallyBrain();
    this.bybitClient = new RestClientV5({
      testnet: process.env.NODE_ENV !== 'production',
    });
    
    // Initialize memory manager
    if (this.dbManager) {
      this.memory = new MemoryManager(this.dbManager);
    }
    
    await this.sallyBrain.initialize();
    console.log('✅ Dynamic Analysis Engine ready with memory capabilities.');
  }

  // Helper to detect "what did I ask" queries
  isLastQuestionQuery(query) {
    const s = (query || '').trim().toLowerCase();
    return s === 'what did i ask just now' || 
           s === 'what did i ask just now?' || 
           s === 'what did i ask' || 
           s === 'what was my last question' || 
           s === 'last question?' ||
           s === 'what was my previous question' ||
           s === 'my last question';
  }

  /**
   * Enhanced handler with full memory integration
   */
  async handleUserQuery(userQuery, options = {}) {
    const { chatId, userId } = options;
    
    try {
      // Special handling for "what did I ask just now"
      if (this.isLastQuestionQuery(userQuery) && chatId && this.memory) {
        const lastQuestion = await this.memory.getLastUserMessage(chatId);
        const response = lastQuestion 
          ? `Your previous question was: "${lastQuestion}"`
          : 'No previous question found in this chat.';
        return { isAnalysis: false, response };
      }

      // Load memory context if available
      let recent = [];
      let longTerm = { summary: '', facts: [], tags: [] };
      let userProfile = { experienceLevel: 'beginner', preferences: {} };

      if (this.memory && chatId) {
        recent = await this.memory.getRecentMessages(chatId, 12);
        longTerm = await this.memory.getChatMemory(chatId);
        
        if (userId) {
          userProfile = await this.memory.getUserProfile(userId);
        }
      }

      // Create enhanced query object with memory context
      const enhancedQuery = {
        userQuery,
        recentContext: recent,
        longTermSummary: longTerm.summary,
        longTermFacts: longTerm.facts,
        userProfile
      };

      // 1. Ask LLM for a dynamic data plan with memory context
      const plan = await this.sallyBrain.createDynamicDataPlan(enhancedQuery);
      
      if (plan.isCasual) {
        console.log('💬 Handling as casual conversation with memory context.');
        return { isAnalysis: false, response: plan.response };
      }

      console.log('📊 Dynamic analysis required. LLM-generated plan:', plan.requiredData);
      const requiredData = plan.requiredData || {};
      const aggregatedData = { sources: [] };

      // 2. Fetch data based on LLM's plan (unchanged logic)
      if (requiredData.bybit) {
        for (const [dataType, params] of Object.entries(requiredData.bybit)) {
          try {
            const result = await this.fetchBybitData(dataType, params);
            aggregatedData[dataType] = result;
            aggregatedData.sources.push({
              type: 'bybit',
              resource: dataType,
              status: 'success'
            });
          } catch (error) {
            console.error(`Bybit ${dataType} fetch failed:`, error.message);
            aggregatedData.sources.push({
              type: 'bybit',
              resource: dataType,
              status: 'failed',
              error: error.message
            });
            if (dataType.includes('tickers') || dataType === 'tickers') {
              await this.tryFallbackData(params.symbol, aggregatedData);
            }
          }
        }
      }

      if (requiredData.livePrice) {
        try {
          const livePrice = await this.livePriceFetcher.fetchLivePrice(userQuery);
          if (livePrice) {
            aggregatedData.livePrice = livePrice;
            aggregatedData.sources.push({
              type: 'live_price',
              resource: 'live_price_api',
              status: 'success'
            });
          }
        } catch (error) {
          console.warn('Live price fetch failed:', error.message);
          aggregatedData.sources.push({
            type: 'live_price',
            resource: 'live_price_api',
            status: 'failed',
            error: error.message
          });
        }
      }

      if (requiredData.webSearch && Array.isArray(requiredData.webSearch)) {
        aggregatedData.webContent = [];
        for (const query of requiredData.webSearch) {
          try {
            const content = await this.sallyBrain.searchAndSummarizeWeb(query);
            aggregatedData.webContent.push({ query, content });
            aggregatedData.sources.push({
              type: 'web',
              resource: query,
              status: 'success'
            });
          } catch (error) {
            console.error(`Web search failed for "${query}":`, error.message);
            aggregatedData.sources.push({
              type: 'web',
              resource: query,
              status: 'failed',
              error: error.message
            });
          }
        }
      }

      if (requiredData.technicalIndicators && aggregatedData.kline) {
        try {
          aggregatedData.enhancedIndicators = this.calculateRequestedIndicators(
            aggregatedData.kline,
            requiredData.technicalIndicators
          );
          aggregatedData.sources.push({
            type: 'calculation',
            resource: 'technicalIndicators',
            status: 'success'
          });
        } catch (error) {
          console.error('Technical indicators calculation failed:', error.message);
          aggregatedData.sources.push({
            type: 'calculation',
            resource: 'technicalIndicators',
            status: 'failed',
            error: error.message
          });
        }
      }

      // 3. Generate confidence score
      aggregatedData.confidenceScore = this.calculateConfidenceScore(aggregatedData);

      // 4. Generate final response with memory context
      console.log('🧠 Sending aggregated data with memory to LLM for final analysis.');
      const finalResponse = await this.sallyBrain.generateFinalAnalysis(enhancedQuery, aggregatedData);

      // 5. Update long-term memory
      if (this.memory && chatId) {
        try {
          const newSummary = await this.sallyBrain.summarizeConversationForMemory(recent, finalResponse);
          const newFacts = await this.sallyBrain.extractFacts(recent, finalResponse);
          const tags = this.memory.deriveTags(userQuery);
          
          await this.memory.upsertChatMemory(chatId, {
            summary: newSummary,
            facts: newFacts,
            tags
          });
        } catch (e) {
          console.warn('Memory update failed:', e.message);
        }
      }

      return {
        isAnalysis: true,
        response: finalResponse,
        dataSources: aggregatedData.sources,
        hasLivePrice: !!aggregatedData.livePrice,
        confidenceScore: aggregatedData.confidenceScore
      };

    } catch (error) {
      console.error('❌ Dynamic Analysis Engine Error:', error.message);
      throw new Error(`Dynamic Analysis failed: ${error.message}`);
    }
  }

  // Existing methods unchanged
  async fetchBybitData(dataType, params) {
    let result;
    if (dataType.startsWith('kline')) {
      result = await this.bybitClient.getKline({ category: 'linear', ...params });
    } else {
      switch (dataType) {
        case 'tickers':
          result = await this.bybitClient.getTickers({ category: 'linear', ...params });
          break;
        case 'fundingRateHistory':
          result = await this.bybitClient.getFundingRateHistory({ category: 'linear', ...params });
          break;
        case 'longShortRatio':
          result = await this.bybitClient.getLongShortRatio({ category: 'linear', ...params });
          break;
        default:
          throw new Error(`Unsupported Bybit dataType: ${dataType}`);
      }
    }
    if (result.retCode !== 0) {
      throw new Error(`Bybit API Error for ${dataType}: ${result.retMsg}`);
    }
    return result.result.list || result.result;
  }

  calculateRequestedIndicators(klineData, indicatorNames) {
    console.log('🔬 Calculating requested indicators:', indicatorNames);
    const klines = [...klineData].reverse();
    const closes = klines.map(k => parseFloat(k[4]) || 0);
    const results = {};

    for (const indicator of indicatorNames) {
      try {
        const upperIndicator = indicator.toUpperCase();
        if (upperIndicator.startsWith('SMA')) {
          const period = parseInt(upperIndicator.replace('SMA', ''), 10) || 20;
          results[`sma${period}`] = TechnicalIndicators.SMA(closes, period);
        } else if (upperIndicator.startsWith('EMA')) {
          const period = parseInt(upperIndicator.replace('EMA', ''), 10) || 12;
          results[`ema${period}`] = TechnicalIndicators.EMA(closes, period);
        } else if (upperIndicator.startsWith('RSI')) {
          const period = parseInt(upperIndicator.replace('RSI', ''), 10) || 14;
          results[`rsi${period}`] = TechnicalIndicators.RSI(closes, period);
        } else if (upperIndicator === 'MACD') {
          results.macd = TechnicalIndicators.MACD(closes);
        } else if (upperIndicator === 'VWAP') {
          results.vwap = TechnicalIndicators.VWAP(klines);
        } else if (upperIndicator === 'BOLLINGERBANDS' || upperIndicator === 'BOLLINGER BANDS') {
          results.bollingerBands = TechnicalIndicators.BollingerBands(closes);
        } else if (upperIndicator.startsWith('HMA')) {
          const period = parseInt(upperIndicator.replace('HMA', ''), 10) || 9;
          results[`hma${period}`] = TechnicalIndicators.HMA(closes, period);
        } else {
          console.warn(`Unknown indicator requested: ${indicator}`);
        }
      } catch (error) {
        console.error(`Failed to calculate ${indicator}:`, error.message);
      }
    }
    return results;
  }

  async tryFallbackData(symbol, aggregatedData) {
    try {
      const fallbackData = await universalDataFallback.getBackupData(symbol);
      if (fallbackData) {
        aggregatedData.fallbackTickers = fallbackData;
        aggregatedData.sources.push({
          type: 'fallback',
          resource: `${fallbackData.dataSource.backupProvider}_ticker`,
          status: 'success'
        });
        console.log(`✅ Fallback data retrieved from ${fallbackData.dataSource.backupProvider}`);
      }
    } catch (error) {
      console.warn('Fallback data retrieval failed:', error.message);
      aggregatedData.sources.push({
        type: 'fallback',
        resource: 'universal_fallback',
        status: 'failed',
        error: error.message
      });
    }
  }

  calculateConfidenceScore(aggregatedData) {
    let confidence = 50;
    const successfulSources = aggregatedData.sources.filter(s => s.status === 'success').length;
    const totalSources = aggregatedData.sources.length;
    if (totalSources > 0) {
      confidence += (successfulSources / totalSources) * 30;
    }
    if (aggregatedData.livePrice) confidence += 10;
    if (aggregatedData.enhancedIndicators) confidence += 10;
    if (aggregatedData.webContent && aggregatedData.webContent.length > 0) confidence += 5;
    return Math.min(Math.max(Math.round(confidence), 0), 100);
  }
}

module.exports = { AnalysisEngine };
