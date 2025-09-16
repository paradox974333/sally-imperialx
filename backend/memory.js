// memory.js - Complete Memory Management System
const { ObjectId } = require('mongodb');

class MemoryManager {
  constructor(dbManager) {
    this.db = dbManager.db;
    this.redis = dbManager.redis;
  }

  // Profile memory (small, cached in Redis)
  async getUserProfile(uid) {
    const key = `profile:${uid}`;
    try {
      const cached = await this.redis.get(key);
      if (cached) return JSON.parse(cached);
    } catch (e) {
      console.warn('Redis profile cache miss:', e.message);
    }
    
    const doc = await this.db.collection('userProfiles').findOne({ uid: String(uid) }) || {
      uid: String(uid),
      name: '',
      preferences: {},
      experienceLevel: 'beginner',
      createdAt: new Date()
    };
    
    try {
      await this.redis.setex(key, 3600, JSON.stringify(doc));
    } catch (e) {
      console.warn('Redis profile cache set failed:', e.message);
    }
    
    return doc;
  }

  async upsertUserProfile(uid, patch) {
    const doc = { uid: String(uid), ...patch, updatedAt: new Date() };
    await this.db.collection('userProfiles').updateOne(
      { uid: String(uid) },
      { $set: doc },
      { upsert: true }
    );
    
    try {
      await this.redis.del(`profile:${uid}`);
    } catch (e) {
      console.warn('Redis profile cache clear failed:', e.message);
    }
    
    return doc;
  }

  // Short-term context (recent messages)
  async getRecentMessages(chatId, limit = 12) {
    const msgs = await this.db.collection('chatMessages')
      .find({ chatId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
    
    return msgs.reverse().map(m => ({ 
      role: m.type === 'ai' ? 'assistant' : 'user', 
      content: m.content,
      timestamp: m.timestamp
    }));
  }

  async getLastUserMessage(chatId) {
    const msgs = await this.db.collection('chatMessages')
      .find({ chatId, type: 'user' })
      .sort({ timestamp: -1 })
      .limit(2)
      .toArray();
    
    // Return the second-to-last user message (excluding current one)
    return msgs[1]?.content || null;
  }

  // Long-term memory (rolling summary + key facts)
  async getChatMemory(chatId) {
    const memory = await this.db.collection('chatMemories').findOne({ chatId });
    return memory || { 
      chatId, 
      summary: '', 
      facts: [], 
      tags: [],
      createdAt: new Date()
    };
  }

  async upsertChatMemory(chatId, { summary, facts, tags }) {
    await this.db.collection('chatMemories').updateOne(
      { chatId },
      {
        $set: {
          summary: summary || '',
          tags: Array.from(new Set(tags || [])),
          updatedAt: new Date()
        },
        $addToSet: { facts: { $each: (facts || []).slice(-20) } },
        $setOnInsert: { chatId, createdAt: new Date() }
      },
      { upsert: true }
    );
  }

  // Helper to extract conversation context for LLM
  formatRecentContext(messages) {
    if (!messages || messages.length === 0) return '';
    return messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
  }

  // Helper to derive tags from user query
  deriveTags(userQuery) {
    const query = (userQuery || '').toLowerCase();
    const tags = [];
    
    // Crypto symbols
    const symbols = ['btc', 'bitcoin', 'eth', 'ethereum', 'sol', 'solana', 'ada', 'cardano'];
    symbols.forEach(symbol => {
      if (query.includes(symbol)) tags.push(symbol.toUpperCase());
    });
    
    // Analysis types
    if (query.includes('price')) tags.push('price');
    if (query.includes('technical') || query.includes('analysis')) tags.push('technical-analysis');
    if (query.includes('news')) tags.push('news');
    if (query.includes('prediction')) tags.push('prediction');
    
    return tags;
  }
}

module.exports = { MemoryManager };
