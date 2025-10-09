console.log('🔵 1. Loading environment variables...');
require('dotenv').config();

console.log('🔵 2. Importing dependencies...');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const CanvasSession = require('./models/CanvasSession');
const authRoutes = require('./routes/auth');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

console.log('🔵 3. Initializing Express app...');
const app = express();

console.log('🔵 4. Applying middleware...');
app.use(cors({
  origin: [
    'http://localhost:3001',
    'http://localhost:3002', 
    'http://localhost:3000',
    'https://canva-frontend-huf5.onrender.com', // Add your frontend URL here
    /\.onrender\.com$/ // Allow all onrender.com subdomains
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend is running', timestamp: new Date().toISOString() });
});

// Auth routes
app.use('/api/auth', authRoutes);

const server = http.createServer(app);
const io = new Server(server, { 
  cors: { 
    origin: [
      "http://localhost:3001", 
      "http://localhost:3002", 
      "http://localhost:3000",
      "https://canva-frontend-huf5.onrender.com",
      /\.onrender\.com$/
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// In-memory store for room presence
const rooms = {};

// Socket.io authentication middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (user) {
        socket.user = user;
      }
    } catch (error) {
    }
  }
  next();
});

// MongoDB connection
const connectDB = async () => {
  console.log('🔵 5. Attempting MongoDB connection...');
  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI is not defined in .env file');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout
    });
    console.log('✅ MongoDB connected successfully.');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1); // Exit if MongoDB connection fails
  }
};

connectDB();

// Socket handlers
io.on('connection', socket => {
  const connectedUser = socket.user ? socket.user.name : socket.id;
  console.log('🟢 socket connected:', socket.id, 'auth-user:', socket.user ? socket.user.name : 'NO_USER');

  // DEBUG: log every incoming event
  socket.onAny((event, payload) => {
    console.log(`⇢ recv event from ${socket.id}:`, event, JSON.stringify(payload).substring(0, 100));
  });

  socket.on('join-room', async ({ roomId }) => {
    const user = socket.user; // User from auth middleware
    socket.join(roomId);
    
    const userName = user ? user.name : 'Anonymous';
    const userId = user ? user.id : socket.id;
    
    console.log(`✅ ${userName} joined room ${roomId}`);

    // Initialize room presence if needed
    if (!rooms[roomId]) rooms[roomId] = {};
    
    // Add user to presence map
    rooms[roomId][socket.id] = { 
      id: userId, 
      name: userName,
      socketId: socket.id,
      x: 0, 
      y: 0 
    };

    // Load canvas session
    let session = await CanvasSession.findOne({ roomId });
    if (!session) {
      session = await CanvasSession.create({ roomId, owner: userId, strokes: [] });
    }

    // Send canvas data to joining user
    socket.emit('load-canvas', { strokes: session.strokes, snapshot: session.snapshot });

    // Broadcast the updated presence list to all clients in the room
    const usersInRoom = Object.values(rooms[roomId]);
    io.to(roomId).emit('presence', { users: usersInRoom });
    console.log(`Broadcasted updated presence to room ${roomId}:`, usersInRoom.length, 'users');
  });

  socket.on('draw-stroke', async ({ roomId, stroke }) => {
    console.log(`📝 Draw stroke in room ${roomId} from ${socket.id}`);
    // Broadcast to others in the room (except the sender)
    socket.broadcast.to(roomId).emit('remote-stroke', stroke);
    console.log(`✅ Broadcasted stroke to room ${roomId}`);
    // persist stroke (append)
    await CanvasSession.updateOne({ roomId }, { $push: { strokes: stroke }, $set: { updatedAt: new Date() }});
  });

  socket.on('cursor-move', ({ roomId, x, y }) => {
    console.log('-> cursor-move from', socket.id, 'roomId:', roomId, 'coord:', x, y);
    // Update user position in presence
    if (rooms[roomId] && rooms[roomId][socket.id]) {
      rooms[roomId][socket.id].x = x;
      rooms[roomId][socket.id].y = y;
    }
    // Broadcast cursor position to others
    const broadcastData = { 
      socketId: socket.id, 
      x, 
      y,
      user: rooms[roomId]?.[socket.id]
    };
    console.log('-> broadcasting remote-cursor to room', roomId, ':', broadcastData);
    socket.to(roomId).emit('remote-cursor', broadcastData);
  });

  socket.on('start-draw', ({ roomId }) => {
    socket.to(roomId).emit('user-started-drawing', { 
      socketId: socket.id,
      user: rooms[roomId]?.[socket.id]
    });
  });

  socket.on('stop-draw', ({ roomId }) => {
    socket.to(roomId).emit('user-stopped-drawing', { 
      socketId: socket.id 
    });
  });

  socket.on('save-snapshot', async ({ roomId, snapshotBase64 }) => {
    await CanvasSession.updateOne({ roomId }, { $set: { snapshot: snapshotBase64 }});
  });

  socket.on('disconnecting', () => {
    // notify rooms and clean up presence
    for (const roomId of socket.rooms) {
      if (roomId !== socket.id && rooms[roomId]) {
        const leavingUser = rooms[roomId][socket.id];
        delete rooms[roomId][socket.id];
        // Broadcast the updated presence list to all remaining clients
        const remainingUsers = Object.values(rooms[roomId]);
        io.to(roomId).emit('presence', { users: remainingUsers });
        console.log(`👋 ${leavingUser?.name} left room ${roomId}`);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('user disconnected', socket.id);
  });
});

console.log('🔵 6. Starting HTTP server...');
const PORT = process.env.PORT || 5001;

// Add error handler for server
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use.`);
  } else {
    console.error('❌ Server error:', error);
  }
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io ready for connections`);
  console.log('✅ Server is fully started!');
});