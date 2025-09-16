require('dotenv').config();

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const { registerUser } = require('./registration');
const { AnalysisEngine } = require('./analysis');
const CompleteDatabaseManager = require('./database');
const WalletManager = require('./wallet');
const DepositManager = require('./deposite');

const app = express();
const PORT = process.env.PORT || 3000;

const dbManager = new CompleteDatabaseManager();
const walletManager = new WalletManager(dbManager);
const analysisEngine = new AnalysisEngine(dbManager); // Pass dbManager for memory
const depositManager = new DepositManager(dbManager);

// ==================== SECURITY & PERFORMANCE MIDDLEWARE ====================

app.use(helmet());
app.use(compression());

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://sally.imperialx.io'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  optionsSuccessStatus: 200
}));

app.options('*', cors());
app.use(express.json({ limit: '500kb' }));
app.use(express.urlencoded({ extended: true, limit: '500kb' }));

// ==================== RATE LIMITING ====================

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { success: false, error: 'Too many analysis requests, please slow down.' },
  keyGenerator: (req) => req.user?.uid || req.ip,
});

app.use('/api', globalLimiter);

// ==================== ENVIRONMENT VALIDATION ====================

const requiredEnvVars = ['JWT_SECRET', 'BYBIT_MASTER_KEY', 'BYBIT_MASTER_SECRET', 'REDIS_URL'];
const optionalEnvVars = { 'OLLAMA_BASE_URL': 'http://localhost:11434', 'OLLAMA_MODEL': 'llama3.1:8b' };

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
});

Object.entries(optionalEnvVars).forEach(([envVar, defaultValue]) => {
  if (!process.env[envVar]) {
    console.warn(`⚠️ ${envVar} not set, using default: ${defaultValue}`);
    process.env[envVar] = defaultValue;
  }
});

// ==================== AUTHENTICATION MIDDLEWARE ====================

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// ==================== USER REGISTRATION ====================

app.post('/api/register', async (req, res) => {
  const { username, password, email } = req.body;
  if (!password || password.length < 8) {
    return res.status(400).json({ success: false, error: 'Password must be at least 8 characters long' });
  }

  if (!username || !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return res.status(400).json({ success: false, error: 'Username must be 3-20 characters and can only contain letters, numbers, and underscores.' });
  }

  try {
    const existingUser = await dbManager.redis.exists(`user:${username}`);
    if (existingUser) {
      return res.status(409).json({ success: false, error: 'Username already exists' });
    }

    console.log(`Creating Bybit sub-account for: ${username}`);
    const bybitUserData = await registerUser(username, password);
    const hashedPassword = await bcrypt.hash(password, 12);
    const userData = {
      uid: bybitUserData.uid,
      username: bybitUserData.username,
      email: email || '',
      passwordHash: hashedPassword,
      apiKey: bybitUserData.apiKey,
      secret: bybitUserData.secret,
      createdAt: new Date().toISOString(),
    };

    await dbManager.redis.hset(`user:${username}`, userData);
    await dbManager.logActivity({ type: 'user_registration', userId: userData.uid, username });

    res.status(201).json({
      success: true,
      message: 'Registration successful!',
      userData: { uid: userData.uid, username: userData.username }
    });
  } catch (error) {
    console.error('Registration failed:', error.message);
    await dbManager.logActivity({ type: 'registration_error', username, error: error.message, level: 'error' });
    res.status(500).json({ success: false, error: 'Registration failed due to an internal error.' });
  }
});

// ==================== USER LOGIN ====================

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username and password are required' });
  }

  try {
    const userData = await dbManager.redis.hgetall(`user:${username}`);
    if (Object.keys(userData).length === 0 || !userData.passwordHash) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, userData.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = jwt.sign({
      username: userData.username,
      uid: userData.uid,
    }, process.env.JWT_SECRET, { expiresIn: '24h' });

    await dbManager.redis.hset(`user:${username}`, 'lastLogin', new Date().toISOString());
    await dbManager.logActivity({ type: 'user_login', userId: userData.uid, username });

    res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: { uid: userData.uid, username: userData.username }
    });
  } catch (error) {
    console.error('Login error:', error.message);
    await dbManager.logActivity({ type: 'login_error', username, error: error.message, level: 'error' });
    res.status(500).json({ success: false, error: 'An internal error occurred during login.' });
  }
});

// ==================== CHAT THREAD MANAGEMENT ====================

app.get('/api/chats', authenticateToken, async (req, res) => {
  const { username, uid } = req.user;
  try {
    const chats = await dbManager.getChatThreads(uid);
    res.json({ success: true, data: chats, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error(`Get chats error for ${username}:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch chat threads' });
  }
});

app.post('/api/chats', authenticateToken, async (req, res) => {
  const { username, uid } = req.user;
  const { title } = req.body;
  try {
    const chat = await dbManager.createChatThread(uid, title || 'New Chat');
    await dbManager.logActivity({
      type: 'chat_thread_created',
      userId: uid,
      username,
      chatId: chat.id,
      level: 'info'
    });
    res.json({ success: true, data: chat, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error(`Create chat error for ${username}:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to create chat thread' });
  }
});

app.get('/api/chats/:chatId/messages', authenticateToken, async (req, res) => {
  const { username, uid } = req.user;
  const { chatId } = req.params;
  try {
    const messages = await dbManager.getChatMessages(chatId);
    res.json({ success: true, data: messages, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error(`Get messages error for ${username}:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch chat messages' });
  }
});

app.put('/api/chats/:chatId', authenticateToken, async (req, res) => {
  const { username, uid } = req.user;
  const { chatId } = req.params;
  const { title } = req.body;
  try {
    await dbManager.updateChatTitle(chatId, title);
    res.json({ success: true, message: 'Chat title updated successfully', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error(`Update chat title error for ${username}:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to update chat title' });
  }
});

app.delete('/api/chats/:chatId', authenticateToken, async (req, res) => {
  const { username, uid } = req.user;
  const { chatId } = req.params;
  try {
    await dbManager.deleteChatThread(uid, chatId);
    await dbManager.logActivity({
      type: 'chat_thread_deleted',
      userId: uid,
      username,
      chatId,
      level: 'info'
    });
    res.json({ success: true, message: 'Chat thread deleted successfully', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error(`Delete chat error for ${username}:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to delete chat thread' });
  }
});

// ==================== ENHANCED CHAT / ANALYSIS ENDPOINT ====================

app.post('/api/chat', authenticateToken, chatLimiter, async (req, res) => {
  const { message, chatId } = req.body;
  const { username, uid } = req.user;
  const startTime = Date.now();

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Message is required.' });
  }

  let currentChatId = chatId;
  try {
    if (!currentChatId) {
      const newChat = await dbManager.createChatThread(uid);
      currentChatId = newChat.id;
    }

    console.log(`Handling query from ${username} in chat ${currentChatId}: "${message}"`);

    // Save user message
    await dbManager.saveChatMessage(currentChatId, { type: 'user', content: message });

    // Get AI response with memory context
    const result = await analysisEngine.handleUserQuery(message, { 
      chatId: currentChatId, 
      userId: uid 
    });

    const processingTime = Date.now() - startTime;

    // Save AI message
    await dbManager.saveChatMessage(currentChatId, {
      type: 'ai',
      content: result.response,
      metadata: {
        dataSources: result.dataSources,
        processingTime,
        isAnalysis: result.isAnalysis
      }
    });

    // Auto-title chat if needed
    const messageCount = await dbManager.getChatMessageCount(currentChatId);
    if (messageCount >= 4) { // At least 2 user messages and 2 AI responses
      const thread = await dbManager.db.collection('chatThreads').findOne({ _id: currentChatId });
      if (thread && (/^New Chat$/i.test(thread.title) || !thread.title || thread.title.length < 4)) {
        try {
          const lastMsgs = await dbManager.getLastMessages(currentChatId, 20);
          const titlePrompt = `Generate a concise, 3-6 word title for this chat, reflecting the overall topic and intent. No quotes, no punctuation.

Messages:
${lastMsgs.map(m => `${m.type.toUpperCase()}: ${m.content}`).join('\n')}

Title:`;
          
          const title = (await analysisEngine.sallyBrain.queryLocalLLM(titlePrompt, true)).trim().slice(0, 60);
          if (title && title.length > 3) {
            await dbManager.updateChatTitle(currentChatId, title);
          }
        } catch (titleError) {
          console.warn('Auto-title generation failed:', titleError.message);
        }
      }
    }

    await dbManager.logActivity({
      type: 'chat_analysis',
      userId: uid,
      username,
      chatId: currentChatId,
      message,
      isAnalysis: result.isAnalysis,
      processingTime,
      level: 'info'
    });

    res.json({
      success: true,
      ...result,
      chatId: currentChatId,
      processingTime,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`Chat error for ${username}:`, error.message);
    const processingTime = Date.now() - startTime;
    
    await dbManager.logActivity({
      type: 'chat_error',
      userId: uid,
      username,
      chatId: currentChatId,
      error: error.message,
      level: 'error',
      processingTime
    });

    res.status(500).json({
      success: false,
      error: 'AI Analysis system encountered an error.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// ==================== CREATE ROUTES AFTER ALL MIDDLEWARE ====================

console.log('🔧 Setting up routes...');
walletManager.createRoutes(app, authenticateToken);
depositManager.createRoutes(app, authenticateToken);
console.log('✅ All routes configured');

// ==================== SERVER STARTUP ====================

async function startServer() {
  try {
    console.log('🚀 Starting AI Analysis System with Memory...');
    await dbManager.initializeAll();
    await analysisEngine.initialize();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🎉 AI Analysis System is live on http://0.0.0.0:${PORT}`);
      console.log(`🧠 LLM Model: ${process.env.OLLAMA_MODEL}`);
      console.log(`✨ CORS enabled for: ${JSON.stringify(process.env.ALLOWED_ORIGINS?.split(',') || ['localhost:3000', 'localhost:5173', 'localhost:4173'])}`);
      console.log(`✨ System Mode: Analysis & Suggestions with Memory`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
