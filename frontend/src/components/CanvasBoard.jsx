import React, { useContext, useState, useEffect, useRef, useImperativeHandle } from 'react';
import { Stage, Layer, Line, Circle, Text, Group, Rect, Ellipse } from 'react-konva';
import { SocketContext } from '../contexts/SocketContext';
import { VideoContext } from '../contexts/VideoContext';
import VideoPlayer from './VideoPlayer';
import Chat from './Chat';

const CanvasBoard = React.forwardRef(({ tool, color, width, roomId, isChatVisible, isVideoVisible }, ref) => {
    const { socket } = useContext(SocketContext);
  const { callUser, me } = useContext(VideoContext);
  const [strokes, setStrokes] = useState([]);
  const isDrawing = useRef(false);
  const stageRef = useRef(null);
  const [showCopied, setShowCopied] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState({}); // { socketId: { name, x, y, isDrawing } }
    useEffect(() => {
    if (!socket || !roomId) return;

    const joinRoom = () => socket.emit('join-room', { roomId });

    if (socket.connected) {
      joinRoom();
    } else {
      socket.on('connect', joinRoom);
    }

    socket.on('load-canvas', ({ strokes: initialStrokes }) => setStrokes(initialStrokes || []));

    socket.on('presence', ({ users }) => {
      const usersMap = {};
      users.forEach(user => {
        if (user.socketId !== socket.id) {
          usersMap[user.socketId] = { name: user.name, x: user.x || 0, y: user.y || 0, isDrawing: false };
        }
      });
      setRemoteUsers(usersMap);
    });

    socket.on('remote-stroke', (stroke) => setStrokes(prev => [...prev, stroke]));

    socket.on('shape-moved', ({ index, x, y }) => {
      setStrokes(prev => {
        const newStrokes = [...prev];
        newStrokes[index] = { ...newStrokes[index], x, y };
        return newStrokes;
      });
    });

    return () => {
      socket.off('connect', joinRoom);
      socket.off('load-canvas');
      socket.off('presence');
      socket.off('remote-stroke');
      socket.off('shape-moved');
    };
  }, [socket, roomId]);

    const handleMouseDown = (e) => {
    isDrawing.current = true;
    const pos = e.target.getStage().getPointerPosition();
    let newElement;

    if (tool === 'brush' || tool === 'eraser') {
      newElement = {
        tool,
        color: tool === 'eraser' ? '#ffffff' : color,
        width,
        points: [pos.x, pos.y],
      };
    } else {
      newElement = {
        tool,
        color,
        width,
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
      };
    }

    setStrokes([...strokes, newElement]);
    socket.emit('start-draw', { roomId });
  };

    const handleMouseMove = (e) => {
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();

    if (socket && point) {
      socket.emit('cursor-move', { roomId, x: point.x, y: point.y });
    }

    if (!isDrawing.current) return;

    setStrokes(prevStrokes => {
      const newStrokes = [...prevStrokes];
      const lastElement = newStrokes[newStrokes.length - 1];

      if (lastElement.tool === 'brush' || lastElement.tool === 'eraser') {
        lastElement.points = lastElement.points.concat([point.x, point.y]);
      } else {
        lastElement.width = point.x - lastElement.x;
        lastElement.height = point.y - lastElement.y;
      }
      return newStrokes;
    });
  };

    const handleMouseUp = () => {
    if (tool === 'select') {
      isDrawing.current = false;
      return;
    }

    if (!isDrawing.current) return;
    isDrawing.current = false;

    const lastStroke = strokes[strokes.length - 1];
    if (lastStroke) {
      socket.emit('draw-stroke', { roomId, stroke: lastStroke });
    }
    socket.emit('stop-draw', { roomId });
  };

  const handleDragEnd = (e, index) => {
    const { x, y } = e.target.position();
    socket.emit('move-shape', { roomId, index, x, y });
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
      {isVideoVisible && <VideoPlayer />}
      <VideoPlayer />

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
        {strokes.map((stroke, i) => {
          if (stroke.tool === 'brush' || stroke.tool === 'eraser') {
            return (
              <Line
                key={i}
                points={stroke.points}
                stroke={stroke.color}
                strokeWidth={stroke.width}
                tension={0.5}
                lineCap="round"
                globalCompositeOperation={stroke.tool === 'eraser' ? 'destination-out' : 'source-over'}
              />
            );
          } else if (stroke.tool === 'rectangle') {
            return (
                            <Rect
                key={i}
                x={stroke.x}
                y={stroke.y}
                width={stroke.width}
                height={stroke.height}
                stroke={stroke.color}
                strokeWidth={stroke.width}
                draggable={tool === 'select'}
                onDragEnd={(e) => handleDragEnd(e, i)}
              />
            );
          } else if (stroke.tool === 'circle') {
            return (
                            <Ellipse
                key={i}
                x={stroke.x + stroke.width / 2}
                y={stroke.y + stroke.height / 2}
                radiusX={Math.abs(stroke.width / 2)}
                radiusY={Math.abs(stroke.height / 2)}
                stroke={stroke.color}
                strokeWidth={stroke.width}
                draggable={tool === 'select'}
                onDragEnd={(e) => handleDragEnd(e, i)}
              />
            );
          }
          return null;
        })}
        
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
      
            {/* Chat Component */}
            {isChatVisible && (
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
