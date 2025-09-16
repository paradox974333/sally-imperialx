# Sally AI Trading System

A comprehensive AI-powered cryptocurrency analysis and trading platform with intelligent conversational interface, advanced technical analysis, and automated Bybit integration.

## 🚀 Overview

Sally AI Trading System is a sophisticated Node.js application that combines artificial intelligence with cryptocurrency trading capabilities. The system provides real-time market analysis, automated Bybit sub-account management, conversational AI with persistent memory, and multi-exchange data redundancy for reliable trading insights.

## ✨ Key Features

### 🧠 AI-Powered Analysis
- **Intelligent Query Processing**: Dynamic data planning based on user queries
- **Multi-Source Analysis**: Combines Bybit API, live price feeds, and web search
- **Technical Indicators**: SMA, EMA, RSI, MACD, VWAP, Bollinger Bands, HMA
- **Memory-Aware Conversations**: Persistent chat context and user preferences
- **Confidence Scoring**: Reliability assessment for analysis results

### 🏦 Bybit Integration
- **Automatic Sub-Account Creation**: Individual trading accounts per user
- **Unified Trading Account (UTA)**: Full wallet and margin management
- **Multi-Chain Deposits**: Support for all Bybit-supported blockchain networks
- **Real-Time Balance Tracking**: Live portfolio monitoring
- **API Key Management**: Secure, user-specific API credentials

### 💬 Conversational Interface
- **Persistent Memory**: Long-term conversation summaries and user facts
- **Context Awareness**: References previous conversations and preferences
- **Auto-Generated Chat Titles**: Smart conversation categorization
- **Experience Adaptation**: Adjusts complexity based on user level

### 🔄 Data Redundancy
- **Multi-Exchange Fallback**: Binance, Coinbase, CoinGecko backup data
- **Live Price Aggregation**: Real-time price feeds from multiple sources
- **Web Search Integration**: Latest market news and sentiment analysis
- **Reliability Scoring**: Confidence metrics for data quality

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Express API   │    │   Bybit API     │
│   (React/Vue)   │◄──►│     Server      │◄──►│     V5          │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐    ┌─────────────────┐
                    │  Sally AI Brain │    │  External APIs  │
                    │   (LLM + Web)   │◄──►│ (Tavily, etc.)  │
                    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐    ┌─────────────────┐
                    │     Redis       │    │    MongoDB      │
                    │ (Cache/Sessions)│    │  (Chat/Memory)  │
                    └─────────────────┘    └─────────────────┘
```

## 📁 Project Structure

```
sally-ai-trading/
├── server.js                 # Main Express server and API routes
├── registration.js           # Bybit sub-account creation
├── sally-brain.js            # Core AI analysis engine
├── analysis.js               # Technical analysis with memory
├── database.js               # Redis & MongoDB management
├── wallet.js                 # Bybit wallet operations
├── deposite.js               # Multi-chain deposit management
├── memory.js                 # Conversation memory system
├── fallback.js               # Multi-exchange data redundancy
├── live-price.js             # Real-time price aggregation
├── package.json              # Dependencies and scripts
├── .env.example              # Environment variables template
└── README.md                 # This file
```

## 🛠️ Installation & Setup

### Prerequisites

- **Node.js** 16+ with npm
- **Redis Server** 6+ (for caching and sessions)
- **MongoDB** 4+ (for chat and memory storage)
- **Bybit Master API Keys** (for sub-account management)
- **OpenRouter API Key** (for LLM integration)
- **Tavily API Key** (for web search capabilities)

### Step 1: Clone and Install Dependencies

```bash
git clone https://github.com/your-repo/sally-ai-trading.git
cd sally-ai-trading
npm install
```

### Step 2: Database Setup

**Start Redis:**
```bash
# Using Redis directly
redis-server

# Using Docker
docker run -d -p 6379:6379 --name redis redis:alpine
```

**Start MongoDB:**
```bash
# Using MongoDB directly
mongod --dbpath /path/to/your/data

# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### Step 3: Environment Configuration

Create `.env` file from template:
```bash
cp .env.example .env
```

Configure your environment variables:
```env
# Server Configuration
PORT=3000
NODE_ENV=development
JWT_SECRET=your-super-secure-jwt-secret-key

# Database URLs
REDIS_URL=redis://localhost:6379
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB_NAME=sally_chat

# Bybit API (Master Account)
BYBIT_MASTER_KEY=your_bybit_master_api_key
BYBIT_MASTER_SECRET=your_bybit_master_secret

# AI Services
OPENROUTER_API_KEY=your_openrouter_api_key
TAVILY_API_KEY=your_tavily_api_key
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b

# CORS Origins (comma-separated)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Step 4: Start the Application

```bash
# Development mode
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000` (or your configured PORT).

## 🔧 Configuration Details

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | Secret key for JWT token signing | `your-super-secure-secret` |
| `BYBIT_MASTER_KEY` | Bybit master account API key | `XXXXXXXXXXXXXXXX` |
| `BYBIT_MASTER_SECRET` | Bybit master account secret | `XXXXXXXXXXXXXXXX` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `MONGODB_URL` | MongoDB connection string | `mongodb://localhost:27017` |
| `OPENROUTER_API_KEY` | OpenRouter API key for LLM | `sk-or-v1-xxxxxx` |

### Optional Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `TAVILY_API_KEY` | - | Web search API key |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Local LLM endpoint |
| `OLLAMA_MODEL` | `llama3.1:8b` | LLM model name |
| `MONGODB_DB_NAME` | `sally_chat` | MongoDB database name |
| `ALLOWED_ORIGINS` | `localhost:3000,localhost:5173` | CORS origins |

## 📚 API Documentation

### Authentication Endpoints

#### POST `/api/register`
Creates a new user account with automatic Bybit sub-account setup.

**Request:**
```json
{
  "username": "johndoe",
  "password": "securepassword123",
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful!",
  "userData": {
    "uid": "12345678",
    "username": "johndoe"
  }
}
```

#### POST `/api/login`
Authenticates user and returns JWT token.

**Request:**
```json
{
  "username": "johndoe",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful!",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "uid": "12345678",
    "username": "johndoe"
  }
}
```

### Chat Management

#### GET `/api/chats`
Retrieves user's chat threads.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "chat:12345678:1696896000000",
      "title": "Bitcoin Analysis Discussion",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T12:00:00.000Z",
      "messageCount": "8"
    }
  ]
}
```

#### POST `/api/chat`
Main AI analysis endpoint with memory integration.

**Request:**
```json
{
  "message": "What's the current Bitcoin price and technical analysis?",
  "chatId": "chat:12345678:1696896000000"
}
```

**Response:**
```json
{
  "success": true,
  "isAnalysis": true,
  "response": "Bitcoin (BTC) is currently trading at $43,250...",
  "dataSources": [
    {
      "type": "bybit",
      "resource": "tickers",
      "status": "success"
    }
  ],
  "confidenceScore": 95,
  "processingTime": 2340,
  "chatId": "chat:12345678:1696896000000"
}
```

### Wallet Management

#### GET `/api/wallet`
Fetches complete wallet information from Bybit UTA.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalEquity": "10000.00",
    "totalAvailableBalance": "9500.00",
    "totalWalletBalance": "10000.00",
    "coins": [
      {
        "coin": "BTC",
        "walletBalance": "0.23456789",
        "usdValue": "9500.00",
        "free": "0.23456789",
        "locked": "0.00000000"
      }
    ]
  }
}
```

#### GET `/api/wallet/summary`
Returns simplified wallet summary.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalEquity": "10000.00",
    "totalAvailableBalance": "9500.00",
    "totalAssets": 3,
    "topAssets": [
      {
        "coin": "BTC",
        "usdValue": "9500.00",
        "balance": "0.23456789"
      }
    ]
  }
}
```

### Deposit Management

#### GET `/api/deposit/coin-info`
Lists available coins and supported blockchain networks.

**Query Parameters:**
- `coin` (optional): Filter by specific coin

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "coin": "USDT",
      "name": "Tether USD",
      "chains": [
        {
          "chain": "TRX",
          "chainDeposit": "1",
          "depositMin": "1",
          "confirmation": 19
        }
      ]
    }
  ]
}
```

#### GET `/api/deposit/address`
Generates deposit address for user's sub-account.

**Query Parameters:**
- `coin`: Required coin symbol (e.g., "USDT")
- `chain`: Required blockchain network (e.g., "TRX")

**Response:**
```json
{
  "success": true,
  "data": {
    "coin": "USDT",
    "chain": "TRX",
    "address": "TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXx",
    "tag": "",
    "chainType": "TRX"
  }
}
```

## 🔒 Security Features

### Authentication & Authorization
- **JWT Tokens**: Secure session management with configurable expiration
- **Password Hashing**: bcrypt with salt rounds for secure password storage
- **API Key Isolation**: Individual Bybit API keys per user sub-account
- **Permission Scoping**: Granular API permissions (Wallet, Spot, Contract, Options)

### Rate Limiting
- **Global Rate Limiting**: 200 requests per 15 minutes per IP address
- **Chat Rate Limiting**: 20 analysis requests per minute per authenticated user
- **User-Specific Limits**: Rate limiting based on JWT user identification

### Input Validation
- **Username Validation**: 3-20 characters, alphanumeric + underscore only
- **Password Requirements**: Minimum 8 characters with complexity validation
- **API Input Sanitization**: Comprehensive request validation and sanitization
- **SQL Injection Protection**: Parameterized queries and input escaping

### Infrastructure Security
- **Helmet.js Integration**: Security headers and OWASP protection
- **CORS Configuration**: Configurable cross-origin request handling
- **Environment Isolation**: Sensitive credentials in environment variables
- **Error Handling**: Secure error responses without information disclosure

## 🚨 System Components Deep Dive

### Sally AI Brain (`sally-brain.js`)
The core intelligence engine that processes user queries and generates trading insights.

**Key Features:**
- **Dynamic Data Planning**: AI determines required data sources based on query context
- **Multi-Modal Analysis**: Combines price data, technical indicators, and web sentiment
- **Memory Integration**: Maintains conversation context and user preferences
- **Fallback Logic**: Graceful degradation when primary data sources fail

**Supported Queries:**
- Price inquiries: "What's Bitcoin's current price?"
- Technical analysis: "Analyze ETH with RSI and MACD indicators"
- Market sentiment: "Latest news on Solana ecosystem"
- Educational: "Explain DeFi yield farming strategies"

### Analysis Engine (`analysis.js`)
Advanced technical analysis system with comprehensive indicator support.

**Technical Indicators:**
- **Moving Averages**: SMA, EMA, HMA with customizable periods
- **Momentum Indicators**: RSI, MACD with signal line crossovers
- **Volume Analysis**: VWAP for institutional trading insights
- **Volatility Measures**: Bollinger Bands with squeeze detection
- **Trend Analysis**: Multi-timeframe trend identification

**Memory Integration:**
- Remembers user's preferred indicators and timeframes
- Adapts analysis complexity to user experience level
- Maintains conversation context across multiple queries

### Database Management (`database.js`)
Unified Redis and MongoDB management for optimal performance.

**Redis Usage:**
- User session management and authentication tokens
- Real-time data caching for improved response times
- Temporary storage for analysis results and API responses

**MongoDB Collections:**
- `chatThreads`: Chat session metadata and organization
- `chatMessages`: Complete conversation history with timestamps
- `userProfiles`: User preferences, experience level, trading settings
- `chatMemories`: Long-term conversation summaries and key facts

### Memory System (`memory.js`)
Sophisticated conversation memory for personalized interactions.

**Memory Types:**
- **Short-term**: Last 12 messages for immediate context
- **Long-term**: Conversation summaries and extracted user facts
- **User Profiles**: Trading preferences, risk tolerance, experience level

**Smart Features:**
- Automatic fact extraction from conversations
- Tag-based conversation categorization
- Redis caching for performance optimization
- Context-aware response generation

## 📊 Usage Examples

### Basic Price Query
```javascript
// Request to /api/chat
{
  "message": "What's the current BTC price?",
  "chatId": "chat:user123:1696896000000"
}

// Sally's Response
{
  "isAnalysis": true,
  "response": "Bitcoin (BTC) is currently trading at $43,250.50, up 2.3% in the last 24 hours. The price action shows strong momentum above the 20-day moving average at $42,100, with RSI at 65 indicating healthy bullish conditions without being overbought.",
  "confidenceScore": 95,
  "dataSources": [
    {"type": "bybit", "resource": "tickers", "status": "success"},
    {"type": "live_price", "resource": "coinbase", "status": "success"}
  ]
}
```

### Technical Analysis Request
```javascript
// Request with technical indicators
{
  "message": "Analyze ETH with MACD and Bollinger Bands on daily timeframe",
  "chatId": "chat:user123:1696896000000"
}

// Sally's Response with detailed technical analysis
{
  "isAnalysis": true,
  "response": "Ethereum (ETH) Technical Analysis:\n\n**Current Price:** $2,650.30 (+1.8% 24h)\n\n**MACD Analysis:**\n- MACD Line: 45.2\n- Signal Line: 38.7\n- Histogram: +6.5 (bullish crossover confirmed)\n\n**Bollinger Bands:**\n- Upper Band: $2,720\n- Middle Band (SMA20): $2,590\n- Lower Band: $2,460\n- Current position: Near upper band, indicating strong momentum\n\n**Interpretation:** ETH shows strong bullish momentum with MACD crossover and price testing upper Bollinger Band. Consider taking profits near $2,720 resistance or wait for breakout confirmation.",
  "confidenceScore": 88
}
```

### Wallet Balance Check
```javascript
// GET /api/wallet/summary
{
  "success": true,
  "data": {
    "totalEquity": "15,250.75",
    "totalAvailableBalance": "14,800.25",
    "totalAssets": 5,
    "topAssets": [
      {
        "coin": "BTC",
        "usdValue": "12,500.00",
        "balance": "0.28947368"
      },
      {
        "coin": "ETH",
        "usdValue": "2,200.50",
        "balance": "0.83018868"
      }
    ]
  }
}
```

## 🔧 Development Guidelines

### Code Style and Standards
- **ES6+ Syntax**: Use modern JavaScript features (async/await, destructuring)
- **Error Handling**: Always implement try-catch blocks for async operations
- **Logging**: Use winston logger for structured logging with appropriate levels
- **JSDoc Comments**: Document all functions with parameter types and descriptions

### Testing Strategy
```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Generate coverage report
npm run test:coverage
```

### Environment Management
```bash
# Development environment
NODE_ENV=development npm run dev

# Testing environment
NODE_ENV=test npm test

# Production environment
NODE_ENV=production npm start
```

### Database Migration and Maintenance
```javascript
// MongoDB index creation for performance
db.chatThreads.createIndex({ userId: 1, updatedAt: -1 })
db.chatMessages.createIndex({ chatId: 1, timestamp: 1 })
db.userProfiles.createIndex({ uid: 1 }, { unique: true })
db.chatMemories.createIndex({ chatId: 1 }, { unique: true })

// Redis memory optimization
redis-cli CONFIG SET maxmemory 2gb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

## ⚠️ Troubleshooting

### Common Issues and Solutions

#### Database Connection Problems
```bash
# Check Redis connectivity
redis-cli ping
# Expected: PONG

# Check MongoDB connectivity
mongo --eval "db.adminCommand('ismaster')"
# Expected: Connection successful

# Restart services
sudo systemctl restart redis
sudo systemctl restart mongod
```

#### API Integration Issues
```bash
# Test Bybit API connectivity
curl -X GET "https://api.bybit.com/v5/market/time"

# Verify API key permissions in Bybit console
# Ensure master API keys have sub-account management permissions
```

#### Memory and Performance Issues
```bash
# Monitor Redis memory usage
redis-cli INFO memory

# Check MongoDB performance
mongostat --host localhost:27017

# Review application logs
tail -f logs/application.log | grep ERROR
```

#### Rate Limiting Problems
```bash
# Check current rate limit status
curl -I http://localhost:3000/api/chats
# Look for X-RateLimit-* headers

# Clear rate limit cache if needed
redis-cli DEL "rl:*"
```

### Environment-Specific Debugging

#### Development Mode
```bash
DEBUG=* NODE_ENV=development npm start
# Enables verbose logging for all modules
```

#### Production Monitoring
```bash
# PM2 process monitoring
pm2 start server.js --name sally-ai
pm2 monit
pm2 logs sally-ai

# Health check endpoint
curl http://localhost:3000/api/health
```

## 🚀 Deployment

### Production Checklist
- [ ] Environment variables configured and secured
- [ ] Database connections optimized and secured
- [ ] SSL/TLS certificates installed and configured
- [ ] Rate limiting and security middleware enabled
- [ ] Logging and monitoring systems setup
- [ ] Backup strategies implemented for databases
- [ ] Health check endpoints configured
- [ ] Process manager (PM2) configured for auto-restart

### Docker Deployment
```dockerfile
# Dockerfile example
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables for Production
```env
NODE_ENV=production
PORT=3000
JWT_SECRET=production-grade-secret-key
BYBIT_MASTER_KEY=production-api-key
BYBIT_MASTER_SECRET=production-api-secret
REDIS_URL=redis://redis-server:6379
MONGODB_URL=mongodb://mongo-server:27017/sally_production
OPENROUTER_API_KEY=production-openrouter-key
TAVILY_API_KEY=production-tavily-key
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Ensure all tests pass: `npm test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Contribution Guidelines
- Follow the existing code style and conventions
- Add comprehensive tests for new features
- Update documentation for API changes
- Ensure security compliance for all modifications
- Test thoroughly in development environment

### Issue Reporting
When reporting issues, please include:
- Node.js and npm versions
- Operating system and version
- Complete error messages and stack traces
- Steps to reproduce the issue
- Expected vs actual behavior

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This software is for educational and research purposes. Cryptocurrency trading involves substantial risk of loss. Users are responsible for their own trading decisions and risk management. The developers are not responsible for any financial losses incurred through the use of this software.

## 🙏 Acknowledgments

- [Bybit](https://www.bybit.com) for comprehensive API documentation
- [OpenRouter](https://openrouter.ai) for LLM API services
- [Tavily](https://tavily.com) for web search capabilities
- The open-source community for the excellent libraries and tools

***

**🌟 Star this project if you find it helpful!**

