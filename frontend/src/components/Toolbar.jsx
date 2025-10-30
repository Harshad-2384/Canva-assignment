import React from 'react';

const Toolbar = ({ tool, setTool, color, setColor, width, setWidth, saveSnapshot, toggleVideo, toggleChat, isVideoVisible, isChatVisible }) => {
  const toolbarStyle = {
    padding: '10px',
    display: 'flex',
    gap: '15px',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderBottom: '1px solid #ccc',
  };

  const labelStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    fontSize: '12px',
  };

  const inputStyle = {
    marginTop: '5px',
  };

  return (
    <div style={toolbarStyle}>
      <div style={labelStyle}>
        Tool
        <select value={tool} onChange={(e) => setTool(e.target.value)} style={inputStyle}>
          <option value="brush">Brush</option>
          <option value="eraser">Eraser</option>
        </select>
      </div>
      <div style={labelStyle}>
        Color
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={inputStyle} />
      </div>
      <div style={labelStyle}>
        Width
        <input
          type="range"
          min="1"
          max="50"
          onChange={(e) => setWidth(e.target.value)}
          style={inputStyle}
        />
        <span>{width}</span>
      </div>
      <button onClick={saveSnapshot} className="toolbar-button">Save Snapshot</button>
      <button onClick={toggleVideo} className={`toolbar-button ${isVideoVisible ? 'active' : ''}`}>Video Call</button>
      <button onClick={toggleChat} className={`toolbar-button ${isChatVisible ? 'active' : ''}`}>Chat</button>
    </div>
  );
};

export default Toolbar;
