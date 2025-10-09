# Testing Real-Time Features - Debug Guide

## Step 1: Start Backend with Logs
```bash
cd backend
npm run dev
```

**Expected Output:**
```
🔄 Attempting MongoDB connection...
🚀 Server running on port 5001
📡 Socket.io ready for connections
✅ MongoDB connected!
```

## Step 2: Open Two Browser Windows

### Browser 1 (User 1):
1. Open `http://localhost:3001`
2. Login/Register as User 1
3. Open DevTools (F12) → Console tab
4. Create a room

**Expected Console Output:**
```
🔌 CLIENT socket connected: abc123xyz
🔧 DEBUG: socket available as window.debugSocket
🚪 Joining room: room-abc123
⬅️ CLIENT recv event: load-canvas {...}
⬅️ CLIENT recv event: presence {...}
```

### Browser 2 (User 2):
1. Open `http://localhost:3001` (new window/incognito)
2. Login as different user
3. Open DevTools (F12) → Console tab
4. Join same room using Room ID from Browser 1

**Expected Console Output:**
```
🔌 CLIENT socket connected: def456uvw
⬅️ CLIENT recv event: load-canvas {...}
⬅️ CLIENT recv event: presence {...}
```

## Step 3: Test Cursor Movement

### In Browser 1:
Move mouse over canvas

**Browser 1 Console (should show):**
```
📤 Emitting cursor: 234.5 456.7
```

**Browser 2 Console (should show):**
```
⬅️ CLIENT recv event: remote-cursor {socketId: "abc123xyz", x: 234.5, y: 456.7, user: {...}}
🖱️ Remote cursor: abc123xyz 234.5 456.7 User1Name
👥 Remote users updated: {abc123xyz: {name: "User1Name", x: 234.5, y: 456.7, isDrawing: false}}
```

**Backend Console (should show):**
```
⇢ recv event from abc123xyz: cursor-move {"roomId":"room-abc123","x":234.5,"y":456.7}
-> cursor-move from abc123xyz roomId: room-abc123 coord: 234.5 456.7
-> broadcasting remote-cursor to room room-abc123
```

## Step 4: Manual Console Testing

If UI not working, test directly in browser console:

### Browser 1 Console:
```javascript
// Check connection
window.debugSocket.connected  // Should be: true

// Test join room
window.debugSocket.emit('join-room', { roomId: 'testroom' });

// Test cursor movement
window.debugSocket.emit('cursor-move', { roomId: 'testroom', x: 100, y: 200 });
```

### Browser 2 Console:
```javascript
// Join same room
window.debugSocket.emit('join-room', { roomId: 'testroom' });

// You should see in console:
// ⬅️ CLIENT recv event: user-joined {...}
// ⬅️ CLIENT recv event: remote-cursor {x: 100, y: 200}
```

## Common Issues & Fixes

### Issue 1: No connection logs
**Problem:** `🔌 CLIENT socket connected` not appearing
**Fix:** 
- Check backend is running on port 5001
- Check URL in SocketContext.jsx matches backend port

### Issue 2: Events not received
**Problem:** Browser 2 doesn't receive `remote-cursor`
**Fix:**
- Verify both users joined SAME roomId (case-sensitive!)
- Check backend logs show "broadcasting remote-cursor"
- Ensure `socket.to(roomId).emit()` is used (not `socket.emit()`)

### Issue 3: Cursors not rendering
**Problem:** Events received but cursors not visible on canvas
**Fix:**
- Check `remoteUsers` state in React DevTools
- Verify Konva Group/Circle components are rendering
- Check z-index and canvas dimensions

## Quick Verification Commands

### Backend Health Check:
```bash
curl http://localhost:5001/socket.io/
# Should return: {"code":0,"message":"Transport unknown"}
```

### Check Active Connections:
```bash
lsof -i :5001
# Should show node process listening
```

### Frontend Port Check:
```bash
lsof -i :3001
# Should show node process (React dev server)
```

## Success Criteria

✅ Backend shows: `🟢 socket connected` for each user
✅ Backend shows: `⇢ recv event` for cursor-move
✅ Backend shows: `-> broadcasting remote-cursor`
✅ Browser 2 shows: `⬅️ CLIENT recv event: remote-cursor`
✅ Browser 2 shows: `🖱️ Remote cursor` with coordinates
✅ Browser 2 shows: `👥 Remote users updated`
✅ Canvas shows: Colored dot with username following mouse

## Next Steps

If all logs appear correctly but UI still not working:
1. Check React state updates in React DevTools
2. Verify Konva Stage/Layer rendering
3. Check CSS z-index conflicts
4. Verify canvas dimensions and coordinate system
