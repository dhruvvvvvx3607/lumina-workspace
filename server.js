const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cors = require('cors');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'lumina-stealth-private-key-2026-x99';
const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 2e7 // 20 MB max payload
});

// Configure upload directory
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `img-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|svg/;
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    if (allowed.test(ext) || allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPG, PNG, GIF, WEBP) are allowed'));
    }
  }
});

// Middlewares
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Authentication Helper
function generateToken(user) {
  // Long-lived persistent token: 365 days so user stays logged in until manual logout/panic
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '365d' }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Express Auth Middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Session expired or invalid' });
  }

  const user = db.findUserById(decoded.id);
  if (!user) {
    return res.status(401).json({ error: 'User does not exist' });
  }

  if (user.status === 'discarded') {
    return res.status(403).json({ error: 'Account has been decommissioned by administrator.' });
  }

  req.user = user;
  db.updateUserLastActive(user.id);
  next();
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Administrative privileges required' });
  }
  next();
}

// ==========================================
// REST API ROUTES
// ==========================================

// 1. Auth: Sign up
app.post('/api/auth/register', (req, res) => {
  try {
    const { email, username, password, displayName } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Email, unique username, and password are required' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const newUser = db.createUser({ email, username, password, displayName });
    const token = generateToken(newUser);

    // Alert admin about new registration
    io.to('admin:room').emit('admin:notification', {
      type: 'USER_REGISTERED',
      text: `New user registered: @${newUser.username} (${newUser.email})`,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      message: 'Workspace initialized',
      token,
      user: newUser
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Registration failed' });
  }
});

// 2. Auth: Sign in
app.post('/api/auth/login', (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email or username, and password are required' });
    }

    const clean = identifier.trim().toLowerCase();
    let user = db.findUserByEmail(clean) || db.findUserByUsername(clean);

    if (!user) {
      return res.status(401).json({ error: 'Invalid workspace credentials' });
    }

    if (user.status === 'discarded') {
      return res.status(403).json({ error: 'Account access has been terminated by administrator.' });
    }

    const match = db.verifyPassword(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid workspace credentials' });
    }

    db.updateUserLastActive(user.id);
    const token = generateToken(user);
    const safeUser = db.sanitizeUser(user);

    // Notify admin
    io.to('admin:room').emit('admin:notification', {
      type: 'USER_LOGIN',
      text: `User signed in: @${safeUser.username}`,
      timestamp: new Date().toISOString()
    });

    res.json({
      message: 'Welcome back',
      token,
      user: safeUser
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal login error' });
  }
});

// 3. Auth: Current user verification
app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ user: db.sanitizeUser(req.user) });
});

// 4. Search Users by unique username
app.get('/api/users/search', authMiddleware, (req, res) => {
  const query = req.query.q || '';
  const results = db.searchUsers(query, req.user.id);
  res.json({ users: results });
});

// 5. User lookup by exact username
app.get('/api/users/:username', authMiddleware, (req, res) => {
  const target = db.findUserByUsername(req.params.username);
  if (!target || target.status === 'discarded') {
    return res.status(404).json({ error: 'User not found or unavailable' });
  }
  res.json({ user: db.sanitizeUser(target) });
});

// 6. Conversations list (Recent chat contacts)
app.get('/api/conversations', authMiddleware, (req, res) => {
  const convos = db.getRecentConversations(req.user.id);
  res.json({ conversations: convos });
});

// 7. Get messages between logged in user and a specific partner
app.get('/api/conversations/:partnerUsername/messages', authMiddleware, (req, res) => {
  const partner = db.findUserByUsername(req.params.partnerUsername);
  if (!partner) {
    return res.status(404).json({ error: 'Chat partner not found' });
  }

  // Mark as read
  db.markConversationAsRead(req.user.id, partner.id);

  // Return strictly isolated communication between these two participants
  const messages = db.getConversation(req.user.id, partner.id);
  res.json({
    partner: db.sanitizeUser(partner),
    messages
  });
});

// 8. Upload image attachment for chat
app.post('/api/upload', authMiddleware, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({
    url: fileUrl,
    filename: req.file.filename,
    size: req.file.size
  });
});

// 9. Panic Fast Exit trigger
app.post('/api/panic', (req, res) => {
  // Can be called to record fast-exit event
  res.json({ status: 'exited' });
});

// ==========================================
// ADMIN EXCLUSIVE ROUTES
// ==========================================

// Get all users for admin table
app.get('/api/admin/users', authMiddleware, adminOnly, (req, res) => {
  const users = db.getAllUsersForAdmin();
  res.json({ users });
});

// Discard user
app.post('/api/admin/users/:userId/discard', authMiddleware, adminOnly, (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const discarded = db.discardUser(targetUserId, req.user.id);

    // Boot user immediately via socket
    io.to(`user:${targetUserId}`).emit('account:discarded', {
      message: 'Your account access has been revoked by the system administrator.'
    });

    // Notify admin room
    io.to('admin:room').emit('admin:notification', {
      type: 'USER_DISCARDED',
      text: `Admin discarded user @${discarded.username}`,
      timestamp: new Date().toISOString()
    });

    res.json({ message: `User @${discarded.username} successfully discarded`, user: discarded });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Restore user
app.post('/api/admin/users/:userId/restore', authMiddleware, adminOnly, (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const restored = db.restoreUser(targetUserId, req.user.id);
    res.json({ message: `User @${restored.username} restored`, user: restored });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Admin live feeds & logs
app.get('/api/admin/feed', authMiddleware, adminOnly, (req, res) => {
  const recentMessages = db.getRecentSystemMessagesForAdmin(50);
  const adminLogs = db.getAdminLogs(50);
  res.json({ recentMessages, adminLogs });
});

// Admin system stats
app.get('/api/admin/stats', authMiddleware, adminOnly, (req, res) => {
  const allUsers = db.getAllUsersForAdmin();
  const activeCount = allUsers.filter(u => u.status === 'active').length;
  const discardedCount = allUsers.filter(u => u.status === 'discarded').length;
  const totalMessages = db.data.messages.length;

  res.json({
    totalUsers: allUsers.length,
    activeUsers: activeCount,
    discardedUsers: discardedCount,
    totalMessages,
    uptime: process.uptime()
  });
});

// Fallback route for SPA
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==========================================
// SOCKET.IO REAL-TIME CHAT ENGINE
// ==========================================

const connectedSockets = new Map(); // userId -> socketId

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('Authentication token required'));
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    return next(new Error('Invalid or expired token'));
  }
  const user = db.findUserById(decoded.id);
  if (!user || user.status === 'discarded') {
    return next(new Error('Account inactive or revoked'));
  }
  socket.user = user;
  next();
});

io.on('connection', (socket) => {
  const user = socket.user;
  const userId = user.id;

  connectedSockets.set(userId, socket.id);
  socket.join(`user:${userId}`);

  // If user is admin, join admin surveillance room
  if (user.role === 'admin') {
    socket.join('admin:room');
    socket.emit('admin:status', { message: 'Connected to Admin Supervisory Stream' });
  }

  // Broadcast online presence to contacts
  io.emit('user:presence', { userId, username: user.username, status: 'online' });

  // 1. Send Message (Text / Image / Sticker)
  socket.on('chat:send', (data, callback) => {
    try {
      const { recipientUsername, content, type = 'text', mediaUrl = null } = data;

      if (!recipientUsername) {
        if (callback) callback({ error: 'Recipient is required' });
        return;
      }

      const recipient = db.findUserByUsername(recipientUsername);
      if (!recipient) {
        if (callback) callback({ error: 'Recipient does not exist' });
        return;
      }

      if (recipient.status === 'discarded') {
        if (callback) callback({ error: 'This user account is no longer active' });
        return;
      }

      // Check current user status
      const currentUser = db.findUserById(userId);
      if (currentUser.status === 'discarded') {
        socket.emit('account:discarded', { message: 'Your account has been discarded.' });
        socket.disconnect();
        return;
      }

      // Save message in DB
      const message = db.addMessage({
        senderId: userId,
        senderUsername: currentUser.username,
        recipientId: recipient.id,
        recipientUsername: recipient.username,
        type,
        content: content || '',
        mediaUrl
      });

      // Deliver message to sender's private room
      io.to(`user:${userId}`).emit('chat:message', message);

      // Deliver message to recipient's private room
      io.to(`user:${recipient.id}`).emit('chat:message', message);

      // EXCLUSIVE ADMIN NOTIFICATION:
      // None of the standard users receive external text notifications;
      // ONLY the admin gets the notification alert and audio/visual feed!
      io.to('admin:room').emit('admin:notification', {
        type: 'TEXT_MESSAGE_SENT',
        text: `@${currentUser.username} ➔ @${recipient.username}: ${type === 'text' ? (content.length > 40 ? content.slice(0, 40) + '...' : content) : (type === 'image' ? '📷 [Photo]' : '🎨 [Sticker]')}`,
        sender: currentUser.username,
        recipient: recipient.username,
        messageType: type,
        timestamp: message.timestamp,
        messageId: message.id
      });

      if (callback) callback({ success: true, message });
    } catch (err) {
      if (callback) callback({ error: err.message });
    }
  });

  // 2. Heart / Reaction
  socket.on('chat:react', ({ messageId, reaction }) => {
    const updated = db.reactToMessage(messageId, userId, reaction);
    if (updated) {
      io.to(`user:${updated.senderId}`).emit('chat:reaction_updated', updated);
      io.to(`user:${updated.recipientId}`).emit('chat:reaction_updated', updated);
    }
  });

  // 3. Typing Indicators
  socket.on('chat:typing', ({ recipientUsername, isTyping }) => {
    const recipient = db.findUserByUsername(recipientUsername);
    if (recipient) {
      io.to(`user:${recipient.id}`).emit('chat:user_typing', {
        username: user.username,
        isTyping
      });
    }
  });

  // 4. Mark Read
  socket.on('chat:read', ({ partnerUsername }) => {
    const partner = db.findUserByUsername(partnerUsername);
    if (partner) {
      db.markConversationAsRead(userId, partner.id);
      io.to(`user:${partner.id}`).emit('chat:marked_read', { byUsername: user.username });
    }
  });

  socket.on('disconnect', () => {
    connectedSockets.delete(userId);
    io.emit('user:presence', { userId, username: user.username, status: 'offline' });
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Prism / Lumina Web App running on http://localhost:${PORT}`);
  console.log(`🔒 Disguised Login: "Lumina Workspace"`);
  console.log(`👑 Admin Credentials: admin / AdminSecure2026!`);
  console.log(`=======================================================`);
});
