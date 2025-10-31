console.log('Starting test server...');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: [
    'http://localhost:3001',
    'http://localhost:3002', 
    'http://localhost:3000',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Test backend is running', timestamp: new Date().toISOString() });
});

const server = http.createServer(app);
const io = new Server(server, { 
  cors: { 
    origin: [
      "http://localhost:3001", 
      "http://localhost:3002", 
      "http://localhost:3000",
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// In-memory stores
const rooms = {}; // For general room presence
const videoRooms = {}; // For video call users

// Socket.io authentication middleware (simplified for testing)
io.use(async (socket, next) => {
  // For testing, create a mock user
  socket.user = {
    id: socket.id,
    name: `User_${socket.id.substring(0, 6)}`
  };
  next();
});

console.log('Setting up socket handlers...');

// Socket handlers
io.on('connection', socket => {
  const connectedUser = socket.user ? socket.user.name : socket.id;
  console.log('socket connected:', socket.id, 'auth-user:', socket.user ? socket.user.name : 'NO_USER');

  socket.on('join-room', async ({ roomId }) => {
    const user = socket.user;
    socket.join(roomId);
    
    const userName = user ? user.name : 'Anonymous';
    const userId = user ? user.id : socket.id;
    
    console.log(`${userName} joined room ${roomId}`);

    // Initialize room presence if needed
    if (!rooms[roomId]) rooms[roomId] = {};
    
    // Check if this user is already in the room (by userId, not socketId)
    // Remove any existing entries for this user to prevent duplicates
    if (user) {
      for (const socketId in rooms[roomId]) {
        if (rooms[roomId][socketId].id === userId) {
          console.log(`Removing duplicate user entry for ${userName} (old socket: ${socketId})`);
          delete rooms[roomId][socketId];
        }
      }
    }
    
    // Add user to presence map
    rooms[roomId][socket.id] = { 
      id: userId, 
      name: userName,
      socketId: socket.id,
      x: 0, 
      y: 0 
    };

    // Send empty canvas data for testing
    socket.emit('load-canvas', { strokes: [], shapes: [], snapshot: null });

    // Broadcast the updated presence list to all clients in the room
    const usersInRoom = Object.values(rooms[roomId]);
    io.to(roomId).emit('presence', { users: usersInRoom });
    console.log(`Broadcasted updated presence to room ${roomId}:`, usersInRoom.length, 'users');
  });

  socket.on('draw-stroke', async ({ roomId, stroke }) => {
    console.log(`Draw stroke in room ${roomId} from ${socket.id}`);
    socket.broadcast.to(roomId).emit('remote-stroke', stroke);
  });

  socket.on('draw-shape', async ({ roomId, shape }) => {
    console.log(`Draw shape in room ${roomId} from ${socket.id}:`, shape.tool);
    socket.broadcast.to(roomId).emit('remote-shape', shape);
  });

  socket.on('cursor-move', ({ roomId, x, y }) => {
    if (rooms[roomId] && rooms[roomId][socket.id]) {
      rooms[roomId][socket.id].x = x;
      rooms[roomId][socket.id].y = y;
    }
    const broadcastData = { 
      socketId: socket.id, 
      x, 
      y,
      user: rooms[roomId]?.[socket.id]
    };
    socket.to(roomId).emit('remote-cursor', broadcastData);
  });

  socket.on('send-chat-message', ({ roomId, text, timestamp }) => {
    const user = socket.user ? socket.user.name : 'Anonymous';
    console.log(`Received chat message for room ${roomId}: ${user}: ${text}`);
    io.to(roomId).emit('chat-message', { user, text, timestamp });
  });

  // Group Video Call Signaling
  socket.on('join-video-room', (roomId) => {
    console.log('📹 User', socket.id, 'joining video room:', roomId);
    
    // Remove any existing entry for this socket to prevent duplicates
    if (videoRooms[roomId]) {
      videoRooms[roomId] = videoRooms[roomId].filter(id => id !== socket.id);
      
      const allUsers = videoRooms[roomId]
        .map(id => {
          // Find user info from rooms data
          const userInfo = rooms[roomId] && rooms[roomId][id];
          return {
            socketId: id,
            name: userInfo ? userInfo.name : 'Anonymous'
          };
        });
      console.log('📹 Existing users in room:', allUsers);
      socket.emit('all-users', allUsers);
      videoRooms[roomId].push(socket.id);
    } else {
      console.log('📹 Creating new video room:', roomId);
      videoRooms[roomId] = [socket.id];
      socket.emit('all-users', []);
    }
    console.log('📹 Video room', roomId, 'now has users:', videoRooms[roomId]);
  });

  socket.on('sending-signal', (payload) => {
    console.log('📹 Relaying signal from', payload.callerID, 'to', payload.userToSignal);
    // Find user name from rooms data
    const callerInfo = Object.values(rooms).find(room => room[payload.callerID]);
    const callerName = callerInfo ? callerInfo[payload.callerID]?.name : null;
    
    io.to(payload.userToSignal).emit('user-joined', { 
      signal: payload.signal, 
      callerID: payload.callerID,
      userName: callerName 
    });
  });

  socket.on('returning-signal', (payload) => {
    console.log('📹 Returning signal from', socket.id, 'to', payload.callerID);
    io.to(payload.callerID).emit('receiving-returned-signal', { signal: payload.signal, id: socket.id });
  });

  socket.on('disconnecting', () => {
    console.log(`Socket ${socket.id} disconnecting from rooms:`, Array.from(socket.rooms));
    for (const roomId of socket.rooms) {
      if (roomId !== socket.id && rooms[roomId]) {
        const leavingUser = rooms[roomId][socket.id];
        delete rooms[roomId][socket.id];
        
        // Also clean up video room
        if (videoRooms[roomId]) {
          videoRooms[roomId] = videoRooms[roomId].filter(id => id !== socket.id);
          if (videoRooms[roomId].length === 0) {
            delete videoRooms[roomId];
          }
        }
        
        const remainingUsers = Object.values(rooms[roomId]);
        io.to(roomId).emit('presence', { users: remainingUsers });
        console.log(`${leavingUser?.name || 'Unknown user'} left room ${roomId}, ${remainingUsers.length} users remaining`);
        
        if (remainingUsers.length === 0) {
          delete rooms[roomId];
        }
      }
    }
  });

  socket.on('disconnect', () => {
    // Handle video room disconnect
    let videoRoomID = null;
    for (const roomID in videoRooms) {
        if (videoRooms[roomID].includes(socket.id)) {
            videoRoomID = roomID;
            videoRooms[roomID] = videoRooms[roomID].filter(id => id !== socket.id);
            break;
        }
    }
    if (videoRoomID) {
        io.to(videoRoomID).emit('user-left', socket.id);
    }
    console.log('user disconnected', socket.id);
  });
});

const PORT = 5001;
server.listen(PORT, () => {
  console.log(`✅ Test server running on port ${PORT}`);
  console.log(`✅ Socket.io ready for connections`);
  console.log('✅ Server is fully started!');
});
