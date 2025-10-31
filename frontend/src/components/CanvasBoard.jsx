import React, { useContext, useState, useEffect, useRef, useImperativeHandle } from 'react';
import { Stage, Layer, Line, Circle, Text, Group, Rect, Arrow, RegularPolygon, Star } from 'react-konva';
import { SocketContext } from '../contexts/SocketContext';
import { VideoContext } from '../contexts/VideoContext';
import VideoPlayer from './VideoPlayer';
import Chat from './Chat';

const CanvasBoard = React.forwardRef(({ tool, color, width, fillColor, fontSize, roomId, showVideo, showChat }, ref) => {
    const { socket } = useContext(SocketContext);
  const { callUser, me } = useContext(VideoContext);
  const [strokes, setStrokes] = useState([]);
  const [shapes, setShapes] = useState([]);
  const [currentShape, setCurrentShape] = useState(null);
  const [startPos, setStartPos] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });
  const isDrawing = useRef(false);
  const stageRef = useRef(null);
  const [showCopied, setShowCopied] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState({}); // { socketId: { name, x, y, isDrawing } }
  useEffect(() => {
    console.log('CanvasBoard useEffect - socket:', !!socket, 'roomId:', roomId, 'socket.connected:', socket?.connected);
    
    if (!socket || !roomId) {
      console.log('Missing socket or roomId, not joining room');
      return;
    }

    const joinRoom = () => {
      console.log('Attempting to join room:', roomId);
      console.log('Socket state - connected:', socket.connected, 'id:', socket.id);
      socket.emit('join-room', { roomId });
      console.log('join-room event emitted');
    };

    // Force connection and join room
    if (!socket.connected) {
      console.log('Socket not connected, forcing connection...');
      socket.connect();
    }
    
    // Set up connect listener
    socket.on('connect', () => {
      console.log('Socket connected! ID:', socket.id);
      joinRoom();
    });
    
    // Try to join immediately if already connected
    if (socket.connected) {
      console.log('Socket already connected, joining room immediately');
      joinRoom();
    }

    // Listen for initial canvas state
    socket.on('load-canvas', ({ strokes: initialStrokes, shapes: initialShapes }) => {
      if (initialStrokes) {
        setStrokes(initialStrokes);
      }
      if (initialShapes) {
        setShapes(initialShapes);
      }
    });

    // Listen for initial presence list
    socket.on('presence', ({ users }) => {
      console.log('Received presence:', users);
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
      console.log('Remote cursor:', socketId, x, y, user?.name);
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
      console.log('Received remote stroke');
      // Only add remote strokes if we're not currently drawing
      if (!isDrawing.current) {
        setStrokes(prevStrokes => [...prevStrokes, stroke]);
      } else {
        // If we're drawing, queue the stroke to be added later
        setTimeout(() => {
          setStrokes(prevStrokes => [...prevStrokes, stroke]);
        }, 100);
      }
    });

    // Listen for shapes from other users
    socket.on('remote-shape', (shape) => {
      console.log('Received remote shape');
      setShapes(prevShapes => [...prevShapes, shape]);
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
      socket.off('remote-shape');
    };
  }, [socket, roomId]);

  const handleMouseDown = (e) => {
    const pos = e.target.getStage().getPointerPosition();
    
    if (tool === 'text') {
      // Handle text tool
      setTextPosition({ x: pos.x, y: pos.y });
      setShowTextInput(true);
      return;
    }
    
    isDrawing.current = true;
    setStartPos(pos);
    
    if (['brush', 'eraser'].includes(tool)) {
      // Handle brush and eraser (existing functionality)
      const newStroke = {
        tool,
        color: tool === 'eraser' ? '#ffffff' : color,
        width,
        points: [pos.x, pos.y],
      };
      setStrokes([...strokes, newStroke]);
    } else {
      // Handle shapes
      const newShape = {
        id: Date.now() + Math.random(),
        tool,
        color,
        fillColor: fillColor !== 'transparent' ? fillColor : null,
        strokeWidth: width,
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        endX: pos.x,
        endY: pos.y,
      };
      setCurrentShape(newShape);
    }
    
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
        console.log('Emitting cursor:', point.x, point.y);
      }
    }

    if (!isDrawing.current) return;

    if (['brush', 'eraser'].includes(tool)) {
      // Handle brush and eraser movement
      setStrokes(prevStrokes => {
        const newStrokes = [...prevStrokes];
        const lastStroke = newStrokes[newStrokes.length - 1];
        if (lastStroke) {
          lastStroke.points = lastStroke.points.concat([point.x, point.y]);
        }
        return newStrokes;
      });
    } else if (currentShape && startPos) {
      // Handle shape drawing
      const updatedShape = { ...currentShape };
      updatedShape.endX = point.x;
      updatedShape.endY = point.y;
      updatedShape.width = Math.abs(point.x - startPos.x);
      updatedShape.height = Math.abs(point.y - startPos.y);
      updatedShape.x = Math.min(startPos.x, point.x);
      updatedShape.y = Math.min(startPos.y, point.y);
      
      setCurrentShape(updatedShape);
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    
    if (['brush', 'eraser'].includes(tool)) {
      // Handle stroke completion
      setStrokes(prevStrokes => {
        const lastStroke = prevStrokes[prevStrokes.length - 1];
        if (lastStroke && lastStroke.points.length > 2) {
          socket.emit('draw-stroke', { roomId, stroke: lastStroke });
        }
        return prevStrokes;
      });
    } else if (currentShape) {
      // Handle shape completion
      if (currentShape.width > 5 || currentShape.height > 5) {
        setShapes(prevShapes => [...prevShapes, currentShape]);
        socket.emit('draw-shape', { roomId, shape: currentShape });
      }
      setCurrentShape(null);
    }
    
    setStartPos(null);
    // Emit stop-draw event
    socket.emit('stop-draw', { roomId });
  };

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      const textShape = {
        id: Date.now() + Math.random(),
        tool: 'text',
        text: textInput,
        x: textPosition.x,
        y: textPosition.y,
        fontSize: fontSize || 16,
        color,
        strokeWidth: width,
      };
      setShapes(prevShapes => [...prevShapes, textShape]);
      socket.emit('draw-shape', { roomId, shape: textShape });
    }
    setTextInput('');
    setShowTextInput(false);
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

  // Function to render shapes
  const renderShape = (shape, index) => {
    const key = shape.id || index;
    
    switch (shape.tool) {
      case 'rectangle':
        return (
          <Rect
            key={key}
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            stroke={shape.color}
            strokeWidth={shape.strokeWidth || 2}
            fill={shape.fillColor || 'transparent'}
          />
        );
      case 'circle':
        return (
          <Circle
            key={key}
            x={shape.x + shape.width / 2}
            y={shape.y + shape.height / 2}
            radius={Math.min(shape.width, shape.height) / 2}
            stroke={shape.color}
            strokeWidth={shape.strokeWidth || 2}
            fill={shape.fillColor || 'transparent'}
          />
        );
      case 'line':
        return (
          <Line
            key={key}
            points={[shape.x, shape.y, shape.endX, shape.endY]}
            stroke={shape.color}
            strokeWidth={shape.strokeWidth || 2}
            lineCap="round"
          />
        );
      case 'arrow':
        return (
          <Arrow
            key={key}
            points={[shape.x, shape.y, shape.endX, shape.endY]}
            stroke={shape.color}
            strokeWidth={shape.strokeWidth || 2}
            fill={shape.color}
            pointerLength={10}
            pointerWidth={8}
          />
        );
      case 'triangle':
        const centerX = shape.x + shape.width / 2;
        const topY = shape.y;
        const bottomY = shape.y + shape.height;
        return (
          <RegularPolygon
            key={key}
            x={centerX}
            y={shape.y + shape.height / 2}
            sides={3}
            radius={Math.min(shape.width, shape.height) / 2}
            stroke={shape.color}
            strokeWidth={shape.strokeWidth || 2}
            fill={shape.fillColor || 'transparent'}
          />
        );
      case 'star':
        return (
          <Star
            key={key}
            x={shape.x + shape.width / 2}
            y={shape.y + shape.height / 2}
            numPoints={5}
            innerRadius={Math.min(shape.width, shape.height) / 4}
            outerRadius={Math.min(shape.width, shape.height) / 2}
            stroke={shape.color}
            strokeWidth={shape.strokeWidth || 2}
            fill={shape.fillColor || 'transparent'}
          />
        );
      case 'text':
        return (
          <Text
            key={key}
            x={shape.x}
            y={shape.y}
            text={shape.text}
            fontSize={shape.fontSize || 16}
            fill={shape.color}
            fontFamily="Arial"
          />
        );
      default:
        return null;
    }
  };

  // Debug: Log remote users whenever they change
  useEffect(() => {
    console.log('Remote users updated:', remoteUsers);
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
          {showCopied ? 'Copied!' : 'Copy ID'}
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
          Copy Link
        </button>
        <div style={{
          padding: '8px 16px',
          background: '#f0f0f0',
          borderRadius: '20px',
          fontWeight: '600',
          fontSize: '14px',
          color: '#333',
        }}>
          {activeUsersCount} online
        </div>
      </div>

            {/* Video Player */}
      {showVideo && <VideoPlayer />}

      {/* Active Users List & Call Buttons */}
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
                <button onClick={() => callUser(socketId)} className="btn btn-call">
                  Call
                </button>
              {user.isDrawing && <span style={{ fontSize: '11px', color: '#ec4899' }}>drawing</span>}
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
        {/* Render strokes (brush and eraser) */}
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
        
        {/* Render completed shapes */}
        {shapes.map((shape, i) => renderShape(shape, i))}
        
        {/* Render current shape being drawn */}
        {currentShape && renderShape(currentShape, 'current')}
        
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
      
      {/* Text Input Modal */}
      {showTextInput && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 2000,
          background: 'white',
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          border: '2px solid #06b6d4'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>Add Text</h3>
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Enter your text..."
            style={{
              width: '300px',
              padding: '10px',
              border: '1px solid #ccc',
              borderRadius: '5px',
              fontSize: '16px',
              marginBottom: '15px'
            }}
            autoFocus
            onKeyPress={(e) => e.key === 'Enter' && handleTextSubmit()}
          />
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowTextInput(false)}
              style={{
                padding: '8px 16px',
                background: '#ccc',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleTextSubmit}
              style={{
                padding: '8px 16px',
                background: '#06b6d4',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Add Text
            </button>
          </div>
        </div>
      )}

      {/* Chat Component */}
      {showChat && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1000
        }}>
          <Chat roomId={roomId} />
        </div>
      )}
    </div>
  );
});

export default React.memo(CanvasBoard);
