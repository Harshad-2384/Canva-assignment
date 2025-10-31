import React from 'react';

const Toolbar = ({ tool, setTool, color, setColor, width, setWidth, saveSnapshot, toggleVideo, toggleChat, isVideoVisible, isChatVisible, fillColor, setFillColor, fontSize, setFontSize }) => {
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
          <option value="brush">🖌️ Brush</option>
          <option value="eraser">🧽 Eraser</option>
          <option value="rectangle">⬜ Rectangle</option>
          <option value="circle">⭕ Circle</option>
          <option value="line">📏 Line</option>
          <option value="arrow">➡️ Arrow</option>
          <option value="text">📝 Text</option>
          <option value="triangle">🔺 Triangle</option>
          <option value="star">⭐ Star</option>
        </select>
      </div>
      <div style={labelStyle}>
        Color
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={inputStyle} />
      </div>
      <div style={labelStyle}>
        {tool === 'text' ? 'Font Size' : 'Width'}
        <input
          type="range"
          min={tool === 'text' ? "12" : "1"}
          max={tool === 'text' ? "72" : "50"}
          value={tool === 'text' ? (fontSize || 16) : width}
          onChange={(e) => tool === 'text' ? setFontSize?.(e.target.value) : setWidth(e.target.value)}
          style={inputStyle}
        />
        <span>{tool === 'text' ? (fontSize || 16) : width}</span>
      </div>
      
      {/* Fill Color for Shapes */}
      {['rectangle', 'circle', 'triangle', 'star'].includes(tool) && (
        <div style={labelStyle}>
          Fill Color
          <input 
            type="color" 
            value={fillColor && fillColor !== 'transparent' ? fillColor : '#000000'} 
            onChange={(e) => setFillColor?.(e.target.value)} 
            style={inputStyle} 
          />
          <label style={{fontSize: '10px', marginTop: '2px'}}>
            <input 
              type="checkbox" 
              checked={fillColor !== 'transparent' && fillColor !== ''} 
              onChange={(e) => setFillColor?.(e.target.checked ? color : 'transparent')}
            /> Fill
          </label>
        </div>
      )}
      
      <button onClick={saveSnapshot} className="toolbar-button">Save Snapshot</button>
      <button onClick={toggleVideo} className={`toolbar-button ${isVideoVisible ? 'active' : ''}`}>Video Call</button>
      <button onClick={toggleChat} className={`toolbar-button ${isChatVisible ? 'active' : ''}`}>Chat</button>
    </div>
  );
};

export default Toolbar;
