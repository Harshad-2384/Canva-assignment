import React, { useState, useRef } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate, useParams } from 'react-router-dom';
import Toolbar from './components/Toolbar';
import CanvasBoard from './components/CanvasBoard';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import RoomsPage from './pages/RoomsPage';
import './App.css';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

import { VideoProvider } from './contexts/VideoContext';

const CanvasPage = () => {
  const { roomId } = useParams();
  const [tool, setTool] = useState('brush');
  const [color, setColor] = useState('#000000');
  const [width, setWidth] = useState(5);
  const canvasBoardRef = useRef();
  
  console.log('CanvasPage roomId:', roomId);
  
  // If no roomId from URL params, redirect to rooms page
  if (!roomId) {
    return <Navigate to="/rooms" />;
  }

  const handleSaveSnapshot = () => {
    if (canvasBoardRef.current) {
      canvasBoardRef.current.handleSaveSnapshot();
    }
  };

  return (
    <VideoProvider roomId={roomId}>
      <div>
        <Toolbar
          tool={tool}
          setTool={setTool}
          color={color}
          setColor={setColor}
          width={width}
          setWidth={setWidth}
          saveSnapshot={handleSaveSnapshot}
        />
        <CanvasBoard
          ref={canvasBoardRef}
          tool={tool}
          color={color}
          width={width}
          roomId={roomId}
        />
      </div>
    </VideoProvider>
  );
};

const Navbar = () => {
  const token = localStorage.getItem('token');
  const userName = localStorage.getItem('userName');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    window.location.href = '/';
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          Canvas
        </Link>
        <div className="nav-links">
          {token ? (
            <>
              <Link to="/canvas" className="nav-link">Canvas</Link>
              <Link to="/rooms" className="nav-link">Rooms</Link>
              <span className="nav-user">{userName}</span>
              <button onClick={handleLogout} className="nav-button">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/register" className="nav-button">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={
            <>
              <Navbar />
              <HomePage />
            </>
          } />
          <Route path="/rooms" element={
            <PrivateRoute>
              <Navbar />
              <RoomsPage />
            </PrivateRoute>
          } />
          <Route path="/canvas/:roomId" element={
            <PrivateRoute>
              <CanvasPage />
            </PrivateRoute>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

