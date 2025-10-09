import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';

const HomePage = () => {
  const token = localStorage.getItem('token');

  return (
    <div className="home-page">
      <div className="hero-section">
        <h1 className="hero-title">🎨 Real-Time Collaborative Canvas</h1>
        <p className="hero-subtitle">
          Draw together with your team in real-time. Create, collaborate, and bring your ideas to life.
        </p>
        
        <div className="cta-buttons">
          {token ? (
            <>
              <Link to="/canvas" className="btn btn-primary">
                Start Drawing
              </Link>
              <Link to="/rooms" className="btn btn-secondary">
                Browse Rooms
              </Link>
            </>
          ) : (
            <>
              <Link to="/register" className="btn btn-primary">
                Get Started
              </Link>
              <Link to="/login" className="btn btn-secondary">
                Sign In
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="features-section">
        <h2>Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Real-Time Sync</h3>
            <p>See changes instantly as your team draws together</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎨</div>
            <h3>Drawing Tools</h3>
            <p>Brush, eraser, colors, and customizable widths</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💾</div>
            <h3>Auto-Save</h3>
            <p>Your work is automatically saved to the cloud</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">👥</div>
            <h3>Multi-User</h3>
            <p>Collaborate with unlimited team members</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
