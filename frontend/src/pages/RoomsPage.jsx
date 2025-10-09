import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './RoomsPage.css';

const RoomsPage = () => {
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();

  const handleCreateRoom = () => {
    const newRoomId = 'room-' + Math.random().toString(36).substr(2, 9);
    navigate(`/canvas/${newRoomId}`);
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (roomId.trim()) {
      navigate(`/canvas/${roomId}`);
    }
  };

  const popularRooms = [
    { id: 'design-team', name: 'Design Team', users: 5 },
    { id: 'brainstorm', name: 'Brainstorming', users: 3 },
    { id: 'project-alpha', name: 'Project Alpha', users: 8 },
  ];

  return (
    <div className="rooms-page">
      <div className="rooms-container">
        <h1>🚪 Canvas Rooms</h1>
        
        <div className="room-actions">
          <div className="action-card">
            <h2>Create New Room</h2>
            <p>Start a fresh canvas and invite your team</p>
            <button onClick={handleCreateRoom} className="btn btn-create">
              + Create Room
            </button>
          </div>

          <div className="action-card">
            <h2>Join Existing Room</h2>
            <p>Enter a room ID to join</p>
            <form onSubmit={handleJoinRoom}>
              <input
                type="text"
                placeholder="Enter Room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="room-input"
              />
              <button type="submit" className="btn btn-join">
                Join Room
              </button>
            </form>
          </div>
        </div>

        <div className="popular-rooms">
          <h2>Popular Rooms</h2>
          <div className="rooms-grid">
            {popularRooms.map((room) => (
              <div
                key={room.id}
                className="room-card"
                onClick={() => navigate(`/canvas/${room.id}`)}
              >
                <div className="room-icon">🎨</div>
                <h3>{room.name}</h3>
                <p className="room-users">👥 {room.users} active users</p>
                <button className="btn-small">Join</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomsPage;
