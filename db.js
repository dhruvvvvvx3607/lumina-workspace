const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

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
        status: 'active', // 'active' or 'discarded'
        avatarColor: '#f43f5e',
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString()
      };
      this.data.users.push(adminUser);
      this.saveData();
      console.log('✅ Master Admin account initialized: admin / AdminSecure2026!');
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
    return message;
  }

  reactToMessage(messageId, userId, reaction) {
    const msg = this.data.messages.find(m => m.id === messageId);
    if (!msg) return null;
    // Only participants can react
    if (msg.senderId !== userId && msg.recipientId !== userId) return null;
    
    // Toggle reaction if clicked again
    msg.reaction = msg.reaction === reaction ? null : reaction;
    this.saveData();
    return msg;
  }

  getConversation(userId, partnerId) {
    // 100% Secured Direct Communication Isolation:
    // Only messages between userId and partnerId are fetched!
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
      const partnerUsername = m.senderId === userId ? m.recipientUsername : m.senderUsername;

      if (!partnerMap.has(partnerId)) {
        const partnerUser = this.findUserById(partnerId);
        // Only show if partner exists and is not discarded
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
    if (updated) this.saveData();
  }

  // Admin audit message oversight
  getRecentSystemMessagesForAdmin(limit = 60) {
    return this.data.messages
      .slice(-limit)
      .reverse();
  }

  sanitizeUser(user) {
    if (!user) return null;
    const { passwordHash, ...safe } = user;
    return safe;
  }
}

module.exports = new Database();
