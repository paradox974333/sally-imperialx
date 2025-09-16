const axios = require('axios');

// Fixed WebSearcher class
class WebSearcher {
  constructor() {
    this.session = axios.create({
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 12000
    });
  }

  async fetchTavilyContext(query, opts = {}) {
    try {
      const key = process.env.TAVILY_API_KEY;
      if (!key) {
        console.warn('❌ TAVILY_API_KEY not set - web search unavailable');
        return null;
      }

      const {
        search_depth = 'advanced',
        include_answer = true,
        include_raw_content = false,
        max_results = 5,
        topic = 'general'
      } = opts;

      const requestBody = {
        api_key: key,
        query,
        search_depth,
        include_answer,
        include_raw_content,
        max_results,
        topic: /news|market|performance|sentiment/i.test(query) ? 'news' : topic
      };

      const { data } = await this.session.post(
        'https://api.tavily.com/search',
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          }
        }
      );

      if (!data) return null;

      const parts = [];
      if (include_answer && data.answer) {
        parts.push(`Answer: ${data.answer.trim()}`);
      }

      if (Array.isArray(data.results) && data.results.length > 0) {
        const top = data.results.slice(0, max_results);
        for (const r of top) {
          const line = [
            r.title ? `Title: ${r.title}` : null,
            r.url ? `URL: ${r.url}` : null,
            r.snippet ? `Snippet: ${r.snippet}` : r.content ? `Content: ${r.content}` : null
          ].filter(Boolean).join('\n');
          if (line) parts.push(line);
        }
      }

      const context = parts.join('\n\n').trim();
      return context.length ? context.substring(0, 12000) : null;

    } catch (e) {
      const status = e?.response?.status;
      const detail = e?.response?.data ? JSON.stringify(e.response.data).slice(0, 200) : e.message;
      console.warn(`Tavily error${status ? ` (${status})` : ''}: ${detail}`);
      return null;
    }
  }
}

class SallyBrain {
  constructor() {
    this.webSearcher = new WebSearcher();
    this.llmConfig = {
      baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || 'llama3.1:8b',
      timeout: 45000
    };
  }

  async initialize() {
    console.log('🧠 Sally (Dynamic Analysis AI) is awakening...');
    await this.testLLMConnection();
    console.log('✅ Sally is ready with dynamic capabilities.');
  }

  async testLLMConnection() {
    try {
      await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'openai/gpt-oss-20b:free',
          messages: [{ role: 'user', content: 'Test' }]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
          },
          timeout: 15000
        }
      );
      console.log('✅ OpenRouter API connected successfully.');
    } catch (error) {
      throw new Error(`OpenRouter API connection failed: ${error.message}. Check your API key.`);
    }
  }

  /**
   * Enhanced dynamic data planning with memory context
   */
  async createDynamicDataPlan(queryObj) {
    // Handle both string and object inputs for backward compatibility
    const userQuery = typeof queryObj === 'string' ? queryObj : queryObj.userQuery;
    const recentContext = queryObj.recentContext || [];
    const longTermSummary = queryObj.longTermSummary || '';
    const userProfile = queryObj.userProfile || { experienceLevel: 'beginner' };

    const lowerQuery = userQuery.toLowerCase();
    
    // Only classify as casual if it's purely conversational
    const casualKeywords = ['hi', 'hello', 'thanks', 'thank you', 'hey', 'good morning', 'good evening'];
    const isCasualOnly = casualKeywords.some(word => lowerQuery.trim() === word || lowerQuery.trim() === word + '!');

    if (isCasualOnly && recentContext.length === 0) {
      return {
        isCasual: true,
        response: "Hello! I'm Sally, your dynamic crypto analysis AI. I can handle ANY crypto question by intelligently deciding what data sources and analysis methods to use. What would you like to know?"
      };
    }

    // Enhanced planning prompt with memory context
    const planningPrompt = `You are Sally in 2025, an expert cryptocurrency analysis AI with comprehensive knowledge across all areas of crypto, blockchain, DeFi, trading, and digital assets.

ANALYSIS REQUEST: "${userQuery}"

RECENT CONTEXT (most recent last):
${recentContext.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}

LONG-TERM SUMMARY: ${longTermSummary.slice(0, 1000)}

USER PROFILE: Experience Level: ${userProfile.experienceLevel || 'beginner'}

IMPORTANT: You must return EXACTLY one of these two JSON response formats - never mix them:

FORMAT 1 - CASUAL/EDUCATIONAL QUERIES (greetings, help requests, general questions, beginner advice):
{
  "isCasual": true,
  "response": "Your comprehensive, helpful response here"
}

FORMAT 2 - DATA-DRIVEN ANALYSIS QUERIES (specific analysis, prices, technical data, news):
{
  "isCasual": false,
  "requiredData": {
    "bybit": {
      "kline": { "symbol": "BTCUSDT", "interval": "D", "limit": 90 },
      "tickers": { "symbol": "BTCUSDT" }
    },
    "livePrice": true,
    "webSearch": ["specific search query 1", "specific search query 2"],
    "technicalIndicators": ["SMA20", "RSI14", "MACD"]
  }
}

AVAILABLE DATA SOURCES & CAPABILITIES:
- BYBIT API: kline (price charts), tickers (current prices), fundingRateHistory, longShortRatio
- LIVE PRICE APIs: Real-time prices from multiple exchanges
- WEB SEARCH: Latest news, market sentiment, educational content, regulatory updates
- TECHNICAL INDICATORS: SMA, EMA, RSI, MACD, VWAP, Bollinger Bands, HMA, TRIX
- CRYPTO SYMBOLS: BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT, ADAUSDT, DOTUSDT, XRPUSDT, DOGEUSDT, MATICUSDT, AVAXUSDT, LINKUSDT, UNIUSDT, SHIBUSDT, ATOMUSDT, LTCUSDT, TONUSDT, OPUSDT, APTUSDT, ARBUSDT, FTMUSDT, NEARUSDT, ALGOUSDT, INJUSDT, STXUSDT, etc.
- TIMEFRAMES: "1" (1min), "5", "15", "60" (1hr), "240" (4hr), "D" (daily), "W" (weekly)

DECISION LOGIC:
CHOOSE FORMAT 1 (isCasual: true) FOR:
- Greetings: "hi", "hello", "hey"
- General help: "help me", "I'm a beginner", "what should I know"
- Educational questions: "explain blockchain", "what is DeFi", "how does staking work"
- General advice: "where to invest", "investment strategies", "portfolio advice"
- Conversational queries: "thanks", "tell me about crypto"

CHOOSE FORMAT 2 (isCasual: false) FOR:
- Price requests: "Bitcoin price", "ETH current value", "price prediction"
- Technical analysis: "analyze BTC", "technical indicators", "chart analysis"
- Market data: "volume analysis", "market cap", "trading signals"
- News queries: "latest crypto news", "Bitcoin news", "regulatory updates"
- Specific coin analysis: "Solana analysis", "Ethereum outlook"

MEMORY AWARENESS:
- Use recent context to understand follow-up questions and references
- Build on previous conversations and maintain consistency
- Adjust complexity based on user's experience level
- Reference past topics when relevant

NOW ANALYZE THE QUERY "${userQuery}" WITH CONTEXT AND RETURN THE APPROPRIATE JSON FORMAT:`;

    try {
      const planResult = await this.queryLocalLLM(planningPrompt, false);
      console.log('🎯 LLM generated dynamic data plan with memory context:', planResult);
      return planResult;
    } catch (error) {
      console.warn('⚠️ LLM planning failed, using fallback logic');
      return this.createFallbackPlan(userQuery);
    }
  }

  /**
   * Fallback planning method if LLM-based planning fails
   */
  createFallbackPlan(userQuery) {
    const lowerQuery = userQuery.toLowerCase();
    let detectedSymbol = 'BTCUSDT';
    
    const symbolMap = {
      'btc': 'BTCUSDT', 'bitcoin': 'BTCUSDT',
      'eth': 'ETHUSDT', 'ethereum': 'ETHUSDT',
      'sol': 'SOLUSDT', 'solana': 'SOLUSDT'
    };

    for (const [key, symbol] of Object.entries(symbolMap)) {
      if (lowerQuery.includes(key)) {
        detectedSymbol = symbol;
        break;
      }
    }

    const requiredData = {
      bybit: {},
      webSearch: [],
      technicalIndicators: []
    };

    if (lowerQuery.includes('price') || lowerQuery.includes('cost')) {
      requiredData.bybit.tickers = { symbol: detectedSymbol };
      requiredData.livePrice = true;
      requiredData.webSearch.push(`${detectedSymbol} current price`);
    } else if (lowerQuery.includes('analysis') || lowerQuery.includes('technical')) {
      requiredData.bybit.kline = { symbol: detectedSymbol, interval: "D", limit: 50 };
      requiredData.bybit.tickers = { symbol: detectedSymbol };
      requiredData.technicalIndicators = ["SMA20", "RSI14", "MACD"];
      requiredData.webSearch.push(`${detectedSymbol} technical analysis`);
    } else {
      requiredData.webSearch.push(`${userQuery} cryptocurrency`);
      requiredData.bybit.tickers = { symbol: detectedSymbol };
    }

    return {
      isCasual: false,
      requiredData
    };
  }

  /**
   * Enhanced final analysis with memory context
   */
  async generateFinalAnalysis(queryObj, aggregatedData) {
    const userQuery = typeof queryObj === 'string' ? queryObj : queryObj.userQuery;
    const recentContext = queryObj.recentContext || [];
    const longTermSummary = queryObj.longTermSummary || '';
    const userProfile = queryObj.userProfile || { experienceLevel: 'beginner' };

    const prompt = `You are Sally, an expert cryptocurrency analyst AI with comprehensive knowledge across all areas of crypto, blockchain, and digital assets.

USER QUERY: "${userQuery}"

RECENT CONTEXT (most recent last):
${recentContext.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}

LONG-TERM SUMMARY: ${longTermSummary.slice(0, 1000)}

USER PROFILE: Experience Level: ${userProfile.experienceLevel || 'beginner'}

AVAILABLE DATA:
${JSON.stringify(aggregatedData, null, 2)}

INSTRUCTIONS:
Analyze the user's query and provide a comprehensive, accurate response using ALL available data and memory context.

For PRICE queries: Include current prices, trends, and market context
For ANALYSIS queries: Provide detailed technical analysis with specific levels
For EDUCATIONAL queries: Give clear explanations with examples and practical insights
For NEWS queries: Summarize developments and market implications

Guidelines:
- Use all available data to support your response
- Reference previous conversation context when relevant
- Adjust complexity based on user's experience level (${userProfile.experienceLevel || 'beginner'})
- Be specific with numbers and levels when available
- Provide actionable insights
- Explain concepts clearly for ${userProfile.experienceLevel || 'beginner'} level
- Include relevant disclaimers for financial content
- Structure your response clearly with proper formatting
- Build on previous conversations naturally

Generate a comprehensive response that directly addresses the user's question:`;

    return this.queryLocalLLM(prompt, true);
  }

  /**
   * Memory helper: Summarize conversation for long-term storage
   */
  async summarizeConversationForMemory(recentMessages, finalText) {
    if (!recentMessages || recentMessages.length === 0) return '';

    const prompt = `Summarize this conversation into 3-5 sentences focusing on the user's goals, constraints, and key decisions.

Conversation:
${recentMessages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}

Latest Assistant Response:
${finalText}

Return only the summary (no preamble):`;

    try {
      return (await this.queryLocalLLM(prompt, true)).trim();
    } catch (error) {
      console.warn('Failed to generate conversation summary:', error.message);
      return '';
    }
  }

  /**
   * Memory helper: Extract key facts for future reference
   */
  async extractFacts(recentMessages, finalText) {
    if (!recentMessages || recentMessages.length === 0) return [];

    const prompt = `Extract 5-10 key facts or preferences explicitly stated by the user that will be useful for future conversations. Focus on:
- Investment preferences
- Risk tolerance
- Crypto interests
- Experience level
- Specific goals

Conversation:
${recentMessages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}

Latest Assistant Response:
${finalText}

Return as a JSON array of strings (short, declarative facts):`;

    try {
      const raw = await this.queryLocalLLM(prompt, true);
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return [];
    } catch (error) {
      console.warn('Failed to extract facts:', error.message);
      return [];
    }
  }

  async searchAndSummarizeWeb(searchQuery) {
    const context = await this.webSearcher.fetchTavilyContext(searchQuery, {
      search_depth: 'basic',
      include_answer: true,
      max_results: 5,
      topic: /news|market|performance|sentiment/i.test(searchQuery) ? 'news' : 'general'
    });

    return context && context.trim().length > 0
      ? context.trim()
      : 'No web results found.';
  }

  async queryLocalLLM(prompt, raw = false) {
    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'meta-llama/llama-3.3-8b-instruct:free',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
          },
          timeout: this.llmConfig.timeout
        }
      );

      const responseText = response.data?.choices?.[0]?.message?.content;
      if (!responseText) {
        throw new Error('No response text from OpenRouter API');
      }

      if (raw) return responseText.trim();

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON object found in API response.');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('OpenRouter API query failed:', error.message);
      throw new Error(`Failed to get valid response from OpenRouter API: ${error.message}`);
    }
  }
}

module.exports = { SallyBrain };
