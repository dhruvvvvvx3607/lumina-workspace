const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
let MongoClient;
try {
  MongoClient = require('mongodb').MongoClient;
} catch (e) {
  MongoClient = null;
}

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Initial default schema
const defaultData = {
  users: [],
  messages: [],
  adminLogs: [],
  systemSettings: {
    appName: "Lumina Workspace",
    created: new Date().toISOString()
  }
};

class Database {
  constructor() {
    this.ensureDataDirectory();
    this.data = this.loadData();
    this.seedAdmin();

    this.mongoClient = null;
    this.mongoDb = null;
    this.isMongoConnected = false;
    this.pendingWrites = [];

    // Initialize MongoDB Atlas connection if URI is provided
    this.initMongo();
  }

  ensureDataDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  loadData() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('Error loading DB file, initializing fresh:', err);
    }
    this.saveData(defaultData);
    return JSON.parse(JSON.stringify(defaultData));
  }

  saveData(dataToSave = this.data) {
    try {
      const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempFile, JSON.stringify(dataToSave, null, 2), 'utf8');
      fs.renameSync(tempFile, DB_FILE);
    } catch (err) {
      console.error('Error saving DB:', err);
    }
  }

  seedAdmin() {
    const adminExists = this.data.users.find(u => u.username === 'admin' || u.role === 'admin');
    if (!adminExists) {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync('AdminSecure2026!', salt);
      const adminUser = {
        id: 'usr_admin_001',
        email: 'admin@stealth.io',
        username: 'admin',
        displayName: 'Master Supervisor',
        passwordHash: hash,
        role: 'admin',
        status: 'active',
        avatarColor: '#f43f5e',
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString()
      };
      this.data.users.push(adminUser);
      this.saveData();
      console.log('👑 Master Admin account initialized: admin / AdminSecure2026!');
    }
  }

  // ==========================================
  // CLOUD DATABASE INTEGRATION (MongoDB Atlas)
  // ==========================================
  async initMongo() {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL || process.env.DATABASE_URL;
    if (!mongoUri || !MongoClient) {
      console.log('ℹ️  No MONGODB_URI set. Operating on local JSON storage.');
      return;
    }

    try {
      console.log('🔄 Connecting to Cloud Database (MongoDB Atlas)...');
      this.mongoClient = new MongoClient(mongoUri, {
        serverSelectionTimeoutMS: 8000
      });
      await this.mongoClient.connect();
      this.mongoDb = this.mongoClient.db();
      this.isMongoConnected = true;
      console.log('✅ Connected to MongoDB Atlas! Cloud persistence is ACTIVE.');

      // Setup Indexes
      await this.mongoDb.collection('users').createIndex({ id: 1 }, { unique: true }).catch(() => {});
      await this.mongoDb.collection('users').createIndex({ username: 1 }, { unique: true }).catch(() => {});
      await this.mongoDb.collection('users').createIndex({ email: 1 }, { unique: true }).catch(() => {});
      await this.mongoDb.collection('messages').createIndex({ id: 1 }, { unique: true }).catch(() => {});
      await this.mongoDb.collection('messages').createIndex({ timestamp: -1 }).catch(() => {});

      // Synchronize Cloud DB with Local Memory
      await this.syncWithMongo();

      // Flush any queued writes
      this.flushPendingWrites();

      // Periodic light sync every 15 seconds to pull any external changes
      setInterval(() => this.lightSyncMongo(), 15000);

    } catch (err) {
      console.error('⚠️  MongoDB Atlas connection error:', err.message);
      this.isMongoConnected = false;
    }
  }

  async syncWithMongo() {
    if (!this.isMongoConnected) return;

    try {
      const remoteUsers = await this.mongoDb.collection('users').find({}).toArray();
      const remoteMessages = await this.mongoDb.collection('messages').find({}).toArray();
      const remoteLogs = await this.mongoDb.collection('adminLogs').find({}).sort({ timestamp: -1 }).limit(300).toArray();

      if (remoteUsers.length === 0) {
        // First-time sync: Upload local data to MongoDB
        console.log('📤 Migrating local database to MongoDB Atlas...');
        if (this.data.users.length > 0) {
          await this.mongoDb.collection('users').insertMany(this.data.users);
        }
        if (this.data.messages.length > 0) {
          await this.mongoDb.collection('messages').insertMany(this.data.messages);
        }
        if (this.data.adminLogs.length > 0) {
          await this.mongoDb.collection('adminLogs').insertMany(this.data.adminLogs);
        }
        console.log('✅ Initial migration to MongoDB Atlas complete!');
      } else {
        // Cloud has existing data: Load it into memory
        console.log(`📥 Loaded ${remoteUsers.length} users and ${remoteMessages.length} messages from MongoDB Atlas.`);
        this.data.users = remoteUsers.map(({ _id, ...u }) => u);
        this.data.messages = remoteMessages.map(({ _id, ...m }) => m);
        if (remoteLogs.length > 0) {
          this.data.adminLogs = remoteLogs.map(({ _id, ...l }) => l);
        }
        this.saveData(); // update local backup
      }
    } catch (err) {
      console.error('Error synchronizing with MongoDB:', err.message);
    }
  }

  async lightSyncMongo() {
    if (!this.isMongoConnected) return;
    try {
      const count = await this.mongoDb.collection('messages').countDocuments();
      if (count > this.data.messages.length) {
        const remoteMessages = await this.mongoDb.collection('messages').find({}).toArray();
        this.data.messages = remoteMessages.map(({ _id, ...m }) => m);
      }
      const uCount = await this.mongoDb.collection('users').countDocuments();
      if (uCount > this.data.users.length) {
        const remoteUsers = await this.mongoDb.collection('users').find({}).toArray();
        this.data.users = remoteUsers.map(({ _id, ...u }) => u);
      }
    } catch (e) {
      // ignore background sync errors
    }
  }

  queueMongoWrite(action) {
    if (this.isMongoConnected && this.mongoDb) {
      action(this.mongoDb).catch(err => {
        console.error('MongoDB async write error:', err.message);
      });
    } else {
      this.pendingWrites.push(action);
    }
  }

  flushPendingWrites() {
    if (!this.isMongoConnected || !this.mongoDb) return;
    while (this.pendingWrites.length > 0) {
      const action = this.pendingWrites.shift();
      action(this.mongoDb).catch(err => console.error('Flush write error:', err.message));
    }
  }

  // --- User Operations ---
  createUser({ email, username, password, displayName }) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_.]/g, '');

    if (this.data.users.some(u => u.email.toLowerCase() === cleanEmail)) {
      throw new Error('Email is already registered');
    }
    if (this.data.users.some(u => u.username.toLowerCase() === cleanUsername)) {
      throw new Error('Username is already taken. Please choose another.');
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const colors = ['#6366f1', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#06b6d4', '#e11d48'];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];

    const newUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      email: cleanEmail,
      username: cleanUsername,
      displayName: displayName && displayName.trim() ? displayName.trim() : cleanUsername,
      passwordHash,
      role: 'user',
      status: 'active',
      avatarColor,
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    };

    this.data.users.push(newUser);
    this.saveData();

    // Async Cloud DB persist
    this.queueMongoWrite(db => db.collection('users').insertOne({ ...newUser }));

    return this.sanitizeUser(newUser);
  }

  findUserByEmail(email) {
    if (!email) return null;
    return this.data.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase()) || null;
  }

  findUserByUsername(username) {
    if (!username) return null;
    const clean = username.trim().toLowerCase();
    return this.data.users.find(u => u.username.toLowerCase() === clean) || null;
  }

  findUserById(id) {
    return this.data.users.find(u => u.id === id) || null;
  }

  verifyPassword(candidatePassword, hash) {
    return bcrypt.compareSync(candidatePassword, hash);
  }

  updateUserLastActive(userId) {
    const user = this.findUserById(userId);
    if (user) {
      user.lastActive = new Date().toISOString();
      this.saveData();
      this.queueMongoWrite(db => db.collection('users').updateOne(
        { id: userId },
        { $set: { lastActive: user.lastActive } }
      ));
    }
  }

  searchUsers(query, excludeUserId) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return this.data.users
      .filter(u => u.id !== excludeUserId && u.status === 'active' && 
        (u.username.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q)))
      .map(u => this.sanitizeUser(u));
  }

  getAllUsersForAdmin() {
    return this.data.users.map(u => ({
      id: u.id,
      email: u.email,
      username: u.username,
      displayName: u.displayName,
      role: u.role,
      status: u.status,
      avatarColor: u.avatarColor,
      createdAt: u.createdAt,
      lastActive: u.lastActive,
      totalSent: this.data.messages.filter(m => m.senderId === u.id).length,
      totalReceived: this.data.messages.filter(m => m.recipientId === u.id).length
    }));
  }

  // Admin controls: Discard user
  discardUser(userId, adminId) {
    const user = this.findUserById(userId);
    if (!user) throw new Error('User not found');
    if (user.role === 'admin') throw new Error('Cannot discard an administrator');

    user.status = 'discarded';
    user.discardedAt = new Date().toISOString();
    user.discardedBy = adminId;

    this.logAdminAction(adminId, 'DISCARD_USER', {
      targetUserId: userId,
      targetUsername: user.username,
      targetEmail: user.email
    });

    this.saveData();
    this.queueMongoWrite(db => db.collection('users').updateOne(
      { id: userId },
      { $set: { status: 'discarded', discardedAt: user.discardedAt, discardedBy: adminId } }
    ));

    return user;
  }

  restoreUser(userId, adminId) {
    const user = this.findUserById(userId);
    if (!user) throw new Error('User not found');

    user.status = 'active';
    user.restoredAt = new Date().toISOString();
    user.restoredBy = adminId;

    this.logAdminAction(adminId, 'RESTORE_USER', {
      targetUserId: userId,
      targetUsername: user.username
    });

    this.saveData();
    this.queueMongoWrite(db => db.collection('users').updateOne(
      { id: userId },
      { $set: { status: 'active', restoredAt: user.restoredAt, restoredBy: adminId } }
    ));

    return user;
  }

  logAdminAction(adminId, action, details) {
    const log = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      adminId,
      action,
      details,
      timestamp: new Date().toISOString()
    };
    this.data.adminLogs.unshift(log);
    if (this.data.adminLogs.length > 500) this.data.adminLogs.pop();
    this.saveData();

    this.queueMongoWrite(db => db.collection('adminLogs').insertOne({ ...log }));
    return log;
  }

  getAdminLogs(limit = 100) {
    return this.data.adminLogs.slice(0, limit);
  }

  // --- Direct Message Operations ---
  addMessage({ senderId, senderUsername, recipientId, recipientUsername, type = 'text', content, mediaUrl = null }) {
    const sender = this.findUserById(senderId);
    const recipient = this.findUserById(recipientId);

    if (!sender || sender.status === 'discarded') {
      throw new Error('Sender is not active or has been discarded.');
    }
    if (!recipient || recipient.status === 'discarded') {
      throw new Error('Recipient account is no longer active.');
    }

    const message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`,
      senderId,
      senderUsername,
      recipientId,
      recipientUsername,
      type, // 'text', 'image', 'sticker'
      content,
      mediaUrl,
      reaction: null,
      read: false,
      timestamp: new Date().toISOString()
    };

    this.data.messages.push(message);
    this.saveData();

    // Async Cloud DB persist
    this.queueMongoWrite(db => db.collection('messages').insertOne({ ...message }));

    return message;
  }

  reactToMessage(messageId, userId, reaction) {
    const msg = this.data.messages.find(m => m.id === messageId);
    if (!msg) return null;
    if (msg.senderId !== userId && msg.recipientId !== userId) return null;
    
    msg.reaction = msg.reaction === reaction ? null : reaction;
    this.saveData();

    this.queueMongoWrite(db => db.collection('messages').updateOne(
      { id: messageId },
      { $set: { reaction: msg.reaction } }
    ));

    return msg;
  }

  getConversation(userId, partnerId) {
    return this.data.messages
      .filter(m => 
        (m.senderId === userId && m.recipientId === partnerId) ||
        (m.senderId === partnerId && m.recipientId === userId)
      )
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  getRecentConversations(userId) {
    const userMessages = this.data.messages.filter(
      m => m.senderId === userId || m.recipientId === userId
    );

    const partnerMap = new Map();

    for (let i = userMessages.length - 1; i >= 0; i--) {
      const m = userMessages[i];
      const partnerId = m.senderId === userId ? m.recipientId : m.senderId;

      if (!partnerMap.has(partnerId)) {
        const partnerUser = this.findUserById(partnerId);
        if (partnerUser && partnerUser.status === 'active') {
          partnerMap.set(partnerId, {
            partnerId,
            partnerUsername: partnerUser.username,
            partnerDisplayName: partnerUser.displayName,
            partnerAvatarColor: partnerUser.avatarColor,
            lastMessage: m.type === 'image' ? '📷 Photo' : (m.type === 'sticker' ? '🎨 Sticker' : m.content),
            lastTimestamp: m.timestamp,
            lastSenderId: m.senderId,
            unread: m.recipientId === userId && !m.read
          });
        }
      }
    }

    return Array.from(partnerMap.values());
  }

  markConversationAsRead(userId, partnerId) {
    let updated = false;
    for (const m of this.data.messages) {
      if (m.recipientId === userId && m.senderId === partnerId && !m.read) {
        m.read = true;
        updated = true;
      }
    }
    if (updated) {
      this.saveData();
      this.queueMongoWrite(db => db.collection('messages').updateMany(
        { recipientId: userId, senderId: partnerId, read: false },
        { $set: { read: true } }
      ));
    }
  }

  getRecentSystemMessagesForAdmin(limit = 60) {
    return this.data.messages
      .slice(-limit)
      .reverse();
  }

  // Backup & Restore helpers
  exportFullBackup() {
    return {
      exportedAt: new Date().toISOString(),
      isCloudConnected: this.isMongoConnected,
      users: this.data.users,
      messages: this.data.messages,
      adminLogs: this.data.adminLogs
    };
  }

  async importFullBackup(backupData) {
    if (!backupData || !Array.isArray(backupData.users) || !Array.isArray(backupData.messages)) {
      throw new Error('Invalid backup file structure');
    }

    this.data.users = backupData.users;
    this.data.messages = backupData.messages;
    if (Array.isArray(backupData.adminLogs)) {
      this.data.adminLogs = backupData.adminLogs;
    }
    this.seedAdmin();
    this.saveData();

    if (this.isMongoConnected && this.mongoDb) {
      await this.mongoDb.collection('users').deleteMany({});
      await this.mongoDb.collection('messages').deleteMany({});
      await this.mongoDb.collection('adminLogs').deleteMany({});
      if (this.data.users.length > 0) await this.mongoDb.collection('users').insertMany(this.data.users);
      if (this.data.messages.length > 0) await this.mongoDb.collection('messages').insertMany(this.data.messages);
      if (this.data.adminLogs.length > 0) await this.mongoDb.collection('adminLogs').insertMany(this.data.adminLogs);
    }

    return {
      usersCount: this.data.users.length,
      messagesCount: this.data.messages.length
    };
  }

  sanitizeUser(user) {
    if (!user) return null;
    const { passwordHash, ...safe } = user;
    return safe;
  }
}

module.exports = new Database();
