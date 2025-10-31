import React, { useContext, useEffect, useRef, useState } from 'react';
import { VideoContext } from '../contexts/VideoContext';
import './VideoPlayer.css';

const Video = ({ peer, peerID }) => {
  const ref = useRef();
  const [stream, setStream] = useState();

  useEffect(() => {
    console.log('📹 Setting up video for peer:', peerID);
    
    const handleStream = (remoteStream) => {
      console.log('📹 Received remote stream from:', peerID, remoteStream);
      setStream(remoteStream);
      if (ref.current) {
        ref.current.srcObject = remoteStream;
      }
    };

    const handleConnect = () => {
      console.log('📹 Peer connected:', peerID);
    };

    const handleError = (err) => {
      console.error('📹 Peer error for', peerID, ':', err);
    };

    peer.on('stream', handleStream);
    peer.on('connect', handleConnect);
    peer.on('error', handleError);

    return () => {
      peer.off('stream', handleStream);
      peer.off('connect', handleConnect);
      peer.off('error', handleError);
    };
  }, [peer, peerID]);

  useEffect(() => {
    if (ref.current && stream) {
      console.log('📹 Setting stream to video element for:', peerID);
      ref.current.srcObject = stream;
    }
  }, [stream, peerID]);

  return (
    <video 
      playsInline 
      autoPlay 
      ref={ref} 
      style={{ width: '100%', height: 'auto' }}
      onLoadedMetadata={() => console.log('📹 Video metadata loaded for:', peerID)}
      onError={(e) => console.error('📹 Video element error for', peerID, ':', e)}
    />
  );
};

const VideoPlayer = () => {
  const { myVideo, stream, peers, toggleVideo, toggleAudio } = useContext(VideoContext);

  // Ensure local video shows the stream
  useEffect(() => {
    if (myVideo.current && stream) {
      console.log('📹 Setting local video stream');
      myVideo.current.srcObject = stream;
    }
  }, [stream, myVideo]);

  console.log('📹 VideoPlayer render - peers count:', peers.length, 'stream:', !!stream);

  return (
    <div className="video-grid-container">
      {/* My Video - only show if we have a stream */}
      {stream && (
        <div className="video-player">
          <video muted ref={myVideo} autoPlay playsInline />
          <div className="video-label">You</div>
        </div>
      )}
      
      {/* Remote Videos - only show if we have actual peer connections */}
      {peers.length > 0 && peers.map(({ peerID, peer }) => (
        <div key={peerID} className="video-player">
          <Video peer={peer} peerID={peerID} />
          <div className="video-label">User {peerID.substring(0, 8)}</div>
        </div>
      ))}
      
      {/* Show message if no other users */}
      {peers.length === 0 && stream && (
        <div className="no-peers-message">
          Waiting for other users to join the video call...
        </div>
      )}
      
      <div className="media-controls">
        <button onClick={toggleVideo} className="btn-media">Toggle Video</button>
        <button onClick={toggleAudio} className="btn-media">Toggle Audio</button>
      </div>
    </div>
  );
};


export default VideoPlayer;
