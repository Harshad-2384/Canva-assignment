import React, { useContext, useEffect, useRef, useState } from 'react';
import { VideoContext } from '../contexts/VideoContext';
import './VideoPlayer.css';

const Video = ({ peer }) => {
  const ref = useRef();
  const [stream, setStream] = useState();

  useEffect(() => {
    peer.on('stream', (remoteStream) => {
      setStream(remoteStream);
    });
  }, [peer]);

  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  return <video playsInline autoPlay ref={ref} />;
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
      {/* My Video */}
      {stream && (
        <div className="video-player">
          <video muted ref={myVideo} autoPlay playsInline />
          <div className="video-label">You</div>
        </div>
      )}
      
      {/* Remote Videos */}
      {peers.map(({ peerID, peer }) => (
        <div key={peerID} className="video-player">
          <Video peer={peer} />
          <div className="video-label">{peerID.substring(0, 8)}</div>
        </div>
      ))}
      
      <div className="media-controls">
        <button onClick={toggleVideo} className="btn-media">Toggle Video</button>
        <button onClick={toggleAudio} className="btn-media">Toggle Audio</button>
      </div>
    </div>
  );
};


export default VideoPlayer;
