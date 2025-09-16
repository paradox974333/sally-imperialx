const Redis = require('ioredis');
const { MongoClient } = require('mongodb');
const winston = require('winston');
require('dotenv').config();

// Logger Setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console(), new winston.transports.File({ filename: 'database.log' })]
});

class CompleteDatabaseManager {
  constructor() {
    this.redis = null;
    this.mongodb = null;
    this.db = null;
  }

  // Initialize both databases
  async initializeAll() {
    try {
      await this.initializeRedis();
      await this.initializeMongoDB();
      logger.info('✅ All required databases initialized successfully');
    } catch (error) {
      logger.error(`❌ Database initialization failed: ${error.message}`);
      throw error;
    }
  }

  // Redis for user authentication (unchanged)
  async initializeRedis() {
    if (this.redis) return this.redis;
    this.redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    this.redis.on('connect', () => logger.info('✅ Redis connected'));
    this.redis.on('error', (err) => logger.error('❌ Redis error:', err));
    await this.redis.connect();
    return this.redis;
  }

  // MongoDB for chat data
  async initializeMongoDB() {
    if (this.mongodb) return this.mongodb;
    const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017';
    const dbName = process.env.MONGODB_DB_NAME || 'sally_chat';
    this.mongodb = new MongoClient(mongoUrl);
    await this.mongodb.connect();
    this.db = this.mongodb.db(dbName);
    
    // Create indexes for performance
    await this.db.collection('chatThreads').createIndex({ userId: 1, updatedAt: -1 });
    await this.db.collection('chatMessages').createIndex({ chatId: 1, timestamp: 1 });
    await this.db.collection('userProfiles').createIndex({ uid: 1 }, { unique: true });
    await this.db.collection('chatMemories').createIndex({ chatId: 1 }, { unique: true });
    
    logger.info('✅ MongoDB connected');
    return this.mongodb;
  }

  /**
   * Logs activity to the console and log file.
   * @param {object} logData - The data to log.
   */
  async logActivity(logData) {
    const logEntry = {
      ...logData,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    };
    logger.info('Activity Logged', logEntry);
  }

  // Health check for connected services
  async healthCheck() {
    const health = {
      redis: false,
      mongodb: false,
      timestamp: new Date().toISOString()
    };
    try {
      await this.redis.ping();
      health.redis = true;
    } catch (error) {
      logger.warn('Redis health check failed');
    }

    try {
      await this.db.admin().ping();
      health.mongodb = true;
    } catch (error) {
      logger.warn('MongoDB health check failed');
    }

    return health;
  }

  // ---------- CHAT THREADS AND MESSAGES (MongoDB) ----------

  async createChatThread(userId, title = 'New Chat') {
    const chatData = {
      _id: `chat:${userId}:${Date.now()}`,
      userId: String(userId),
      title,
      createdAt: new Date(),
      updatedAt: new Date(),
      messageCount: 0
    };
    const result = await this.db.collection('chatThreads').insertOne(chatData);
    return {
      id: chatData._id,
      userId: chatData.userId,
      title: chatData.title,
      createdAt: chatData.createdAt.toISOString(),
      updatedAt: chatData.updatedAt.toISOString(),
      messageCount: String(chatData.messageCount)
    };
  }

  async getChatThreads(userId) {
    const chats = await this.db.collection('chatThreads')
      .find({ userId: String(userId) })
      .sort({ updatedAt: -1 })
      .toArray();
    return chats.map(chat => ({
      id: chat._id,
      userId: chat.userId,
      title: chat.title,
      createdAt: chat.createdAt.toISOString(),
      updatedAt: chat.updatedAt.toISOString(),
      messageCount: String(chat.messageCount)
    }));
  }

  async saveChatMessage(chatId, message) {
    const messageData = {
      _id: `${chatId}:msg:${Date.now()}`,
      chatId,
      type: message.type,
      content: message.content,
      timestamp: new Date(),
      metadata: message.metadata || {}
    };
    
    // Insert message
    await this.db.collection('chatMessages').insertOne(messageData);
    
    // Update chat thread
    const updateResult = await this.db.collection('chatThreads').findOneAndUpdate(
      { _id: chatId },
      {
        $set: { updatedAt: new Date() },
        $inc: { messageCount: 1 }
      },
      { returnDocument: 'after' }
    );
    
    return {
      id: messageData._id,
      chatId: messageData.chatId,
      type: messageData.type,
      content: messageData.content,
      timestamp: messageData.timestamp.toISOString(),
      metadata: messageData.metadata
    };
  }

  async getChatMessages(chatId) {
    const messages = await this.db.collection('chatMessages')
      .find({ chatId })
      .sort({ timestamp: 1 })
      .toArray();
    return messages.map(msg => ({
      id: msg._id,
      chatId: msg.chatId,
      type: msg.type,
      content: msg.content,
      timestamp: msg.timestamp.toISOString(),
      metadata: msg.metadata
    }));
  }

  async updateChatTitle(chatId, title) {
    await this.db.collection('chatThreads').updateOne(
      { _id: chatId },
      {
        $set: {
          title,
          updatedAt: new Date()
        }
      }
    );
  }

  async deleteChatThread(userId, chatId) {
    // Ensure chat belongs to user
    const chat = await this.db.collection('chatThreads').findOne({
      _id: chatId,
      userId: String(userId)
    });
    if (!chat) {
      throw new Error('Chat not found or not owned by user');
    }

    // Delete messages first
    await this.db.collection('chatMessages').deleteMany({ chatId });
    // Delete chat memory
    await this.db.collection('chatMemories').deleteOne({ chatId });
    // Delete chat thread
    await this.db.collection('chatThreads').deleteOne({ _id: chatId });
  }

  // ---------- NEW MEMORY HELPER METHODS ----------

  async getLastMessages(chatId, limit = 12) {
    const messages = await this.db.collection('chatMessages')
      .find({ chatId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
    return messages.reverse();
  }

  async getLastUserMessage(chatId) {
    const msgs = await this.db.collection('chatMessages')
      .find({ chatId, type: 'user' })
      .sort({ timestamp: -1 })
      .limit(2)
      .toArray();
    return msgs[1]?.content || null;
  }

  async getChatMessageCount(chatId) {
    return await this.db.collection('chatMessages').countDocuments({ chatId });
  }
}

module.exports = CompleteDatabaseManager;
