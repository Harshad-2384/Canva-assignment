import React, { useContext } from 'react';
import { VideoContext } from '../contexts/VideoContext';
import './VideoPlayer.css';

const VideoPlayer = () => {
  const {
    name,
    callAccepted,
    myVideo,
    userVideo,
    callEnded,
    stream,
    call,
    answerCall,
    leaveCall,
  } = useContext(VideoContext);

  return (
    <div className="video-container">
      {/* My Video */}
      {stream && (
        <div className="video-player my-video">
          <video playsInline muted ref={myVideo} autoPlay />
          <div className="video-name">{name || 'Me'}</div>
        </div>
      )}

      {/* User's Video */}
      {callAccepted && !callEnded && (
        <div className="video-player user-video">
          <video playsInline ref={userVideo} autoPlay />
          <div className="video-name">{call.name || 'Guest'}</div>
        </div>
      )}

      {/* Call Notification */}
      {call.isReceivingCall && !callAccepted && (
        <div className="call-notification">
          <h1>{call.name} is calling:</h1>
          <button onClick={answerCall} className="btn btn-answer">
            Answer
          </button>
        </div>
      )}

      {/* Call Controls */}
      <div className="call-controls">
        {callAccepted && !callEnded ? (
          <button onClick={leaveCall} className="btn btn-hangup">
            Hang Up
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default VideoPlayer;
