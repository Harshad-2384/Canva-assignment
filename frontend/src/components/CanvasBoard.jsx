import React, { useContext, useState, useEffect, useRef, useImperativeHandle } from 'react';
import { Stage, Layer, Line, Circle, Text, Group } from 'react-konva';
import { SocketContext } from '../contexts/SocketContext';

const CanvasBoard = React.forwardRef(({ tool, color, width, roomId }, ref) => {
  const socket = useContext(SocketContext);
  const [strokes, setStrokes] = useState([]);
  const isDrawing = useRef(false);
  const stageRef = useRef(null);
  const [showCopied, setShowCopied] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState({}); // { socketId: { name, x, y, isDrawing } }
  useEffect(() => {
    console.log('🔍 CanvasBoard useEffect - socket:', !!socket, 'roomId:', roomId, 'socket.connected:', socket?.connected);
    
    if (!socket || !roomId) {
      console.log('❌ Missing socket or roomId, not joining room');
      return;
    }

    const joinRoom = () => {
      console.log('✅ Attempting to join room:', roomId);
      console.log('📤 Socket state - connected:', socket.connected, 'id:', socket.id);
      socket.emit('join-room', { roomId });
      console.log('📤 join-room event emitted');
    };

    // Force connection and join room
    if (!socket.connected) {
      console.log('🔄 Socket not connected, forcing connection...');
      socket.connect();
    }
    
    // Set up connect listener
    socket.on('connect', () => {
      console.log('🎉 Socket connected! ID:', socket.id);
      joinRoom();
    });
    
    // Try to join immediately if already connected
    if (socket.connected) {
      console.log('🔄 Socket already connected, joining room immediately');
      joinRoom();
    }

    // Listen for initial canvas state
    socket.on('load-canvas', ({ strokes: initialStrokes }) => {
      if (initialStrokes) {
        setStrokes(initialStrokes);
      }
    });

    // Listen for initial presence list
    socket.on('presence', ({ users }) => {
      console.log('📋 Received presence:', users);
      const usersMap = {};
      users.forEach(user => {
        if (user.socketId !== socket.id) {
          usersMap[user.socketId] = { 
            name: user.name, 
            x: user.x || 0, 
            y: user.y || 0,
            isDrawing: false
          };
        }
      });
      setRemoteUsers(usersMap);
    });


    // Remote cursor movement
    socket.on('remote-cursor', ({ socketId, x, y, user }) => {
      console.log('🖱️ Remote cursor:', socketId, x, y, user?.name);
      setRemoteUsers(prev => ({
        ...prev,
        [socketId]: { 
          ...prev[socketId],
          name: user?.name || prev[socketId]?.name || 'User',
          x, 
          y
        }
      }));
    });

    // Remote user started drawing
    socket.on('user-started-drawing', ({ socketId }) => {
      setRemoteUsers(prev => ({
        ...prev,
        [socketId]: { ...prev[socketId], isDrawing: true }
      }));
    });

    // Remote user stopped drawing
    socket.on('user-stopped-drawing', ({ socketId }) => {
      setRemoteUsers(prev => ({
        ...prev,
        [socketId]: { ...prev[socketId], isDrawing: false }
      }));
    });

    // Listen for strokes from other users
    socket.on('remote-stroke', (stroke) => {
      console.log('🎨 Received remote stroke');
      setStrokes(prevStrokes => [...prevStrokes, stroke]);
    });

    // Cleanup listeners on unmount
    return () => {
      socket.off('connect');
      socket.off('load-canvas');
      socket.off('presence');
      socket.off('remote-cursor');
      socket.off('user-started-drawing');
      socket.off('user-stopped-drawing');
      socket.off('remote-stroke');
    };
  }, [socket, roomId]);

  const handleMouseDown = (e) => {
    isDrawing.current = true;
    const pos = e.target.getStage().getPointerPosition();
    const newStroke = {
      // The backend will associate this with the authenticated user
      tool,
      color: tool === 'eraser' ? '#ffffff' : color,
      width,
      points: [pos.x, pos.y],
    };
    setStrokes([...strokes, newStroke]);
    
    // Emit start-draw event
    socket.emit('start-draw', { roomId });
  };

  const handleMouseMove = (e) => {
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    
    // Emit cursor position (throttled by socket.io naturally)
    if (socket && point) {
      socket.emit('cursor-move', { roomId, x: point.x, y: point.y });
      // Debug log every 100th movement
      if (Math.random() < 0.01) {
        console.log('📤 Emitting cursor:', point.x, point.y);
      }
    }

    if (!isDrawing.current) return;

    let lastStroke = strokes[strokes.length - 1];
    lastStroke.points = lastStroke.points.concat([point.x, point.y]);

    // Replace last stroke with the updated one
    strokes.splice(strokes.length - 1, 1, lastStroke);
    setStrokes(strokes.concat());
  };

  const handleMouseUp = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const lastStroke = strokes[strokes.length - 1];
    if (lastStroke && lastStroke.points.length > 2) {
      socket.emit('draw-stroke', { roomId, stroke: lastStroke });
    }
    
    // Emit stop-draw event
    socket.emit('stop-draw', { roomId });
  };

  const handleSaveSnapshot = () => {
    if (!stageRef.current) return;
    const snapshotBase64 = stageRef.current.toDataURL();
    socket.emit('save-snapshot', { roomId, snapshotBase64 });
    alert('Snapshot saved!');
  };

  // Expose save function to parent via a prop if needed, or handle inside as done for the toolbar.
  useImperativeHandle(ref, () => ({
    handleSaveSnapshot,
  }));

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  const shareableLink = `${window.location.origin}/canvas/${roomId}`;

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareableLink);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  const activeUsersCount = Object.keys(remoteUsers).length + 1; // +1 for current user

  // Debug: Log remote users whenever they change
  useEffect(() => {
    console.log('👥 Remote users updated:', remoteUsers);
  }, [remoteUsers]);

  return (
    <div style={{ position: 'relative' }}>
      {/* Room Info Bar */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        background: 'white',
        padding: '15px 25px',
        borderRadius: '30px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
        display: 'flex',
        gap: '15px',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <span style={{ fontSize: '12px', color: '#666', fontWeight: '600' }}>Room ID:</span>
          <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#06b6d4' }}>{roomId}</span>
        </div>
        <button
          onClick={copyRoomId}
          style={{
            padding: '8px 16px',
            background: '#06b6d4',
            color: 'white',
            border: 'none',
            borderRadius: '20px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
          }}
        >
          {showCopied ? '✓ Copied!' : '📋 Copy ID'}
        </button>
        <button
          onClick={copyShareLink}
          style={{
            padding: '8px 16px',
            background: '#ec4899',
            color: 'white',
            border: 'none',
            borderRadius: '20px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
          }}
        >
          🔗 Copy Link
        </button>
        <div style={{
          padding: '8px 16px',
          background: '#f0f0f0',
          borderRadius: '20px',
          fontWeight: '600',
          fontSize: '14px',
          color: '#333',
        }}>
          👥 {activeUsersCount} online
        </div>
      </div>

      {/* Active Users List */}
      <div style={{
        position: 'absolute',
        top: '80px',
        right: '20px',
        zIndex: 1000,
        background: 'white',
        padding: '15px',
        borderRadius: '15px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
        minWidth: '200px',
      }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666' }}>Active Users</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></div>
            <span style={{ fontSize: '13px', fontWeight: '600' }}>You</span>
          </div>
          {Object.entries(remoteUsers).map(([socketId, user]) => (
            <div key={socketId} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                background: user.isDrawing ? '#ec4899' : '#06b6d4' 
              }}></div>
              <span style={{ fontSize: '13px' }}>{user.name}</span>
              {user.isDrawing && <span style={{ fontSize: '11px', color: '#ec4899' }}>✏️ drawing</span>}
            </div>
          ))}
        </div>
      </div>

      <Stage
      width={window.innerWidth}
      height={window.innerHeight - 100} // Adjust height to accommodate toolbar
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp} // Stop drawing if mouse leaves canvas
      ref={stageRef}
      style={{ backgroundColor: '#ffffff' }}
    >
      <Layer>
        {strokes.map((stroke, i) => (
          <Line
            key={i}
            points={stroke.points}
            stroke={stroke.color}
            strokeWidth={stroke.width}
            tension={0.5}
            lineCap="round"
            globalCompositeOperation={
              stroke.tool === 'eraser' ? 'destination-out' : 'source-over'
            }
          />
        ))}
        
        {/* Remote users' cursors */}
        {Object.entries(remoteUsers).map(([socketId, user]) => (
          <Group key={socketId} x={user.x} y={user.y}>
            <Circle 
              radius={user.isDrawing ? 8 : 6} 
              fill={user.isDrawing ? '#ec4899' : '#06b6d4'}
              stroke="white"
              strokeWidth={2}
            />
            <Text 
              text={user.name} 
              y={15} 
              x={-20}
              fontSize={12} 
              fontStyle="bold"
              fill="#333"
              padding={4}
              background="white"
            />
          </Group>
        ))}
      </Layer>
    </Stage>
    </div>
  );
});

export default React.memo(CanvasBoard);
