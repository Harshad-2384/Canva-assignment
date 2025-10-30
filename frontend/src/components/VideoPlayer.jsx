import React, { useContext, useEffect, useRef } from 'react';
import { VideoContext } from '../contexts/VideoContext';
import './VideoPlayer.css';

const Video = ({ peer }) => {
  const ref = useRef();

  useEffect(() => {
    peer.on('stream', (stream) => {
      ref.current.srcObject = stream;
    });
  }, [peer]);

  return <video playsInline autoPlay ref={ref} />;
};

const VideoPlayer = () => {
  const { myVideo, stream, peers, toggleVideo, toggleAudio } = useContext(VideoContext);

  return (
    <div className="video-grid-container">
      <div className="video-player">
        <video muted ref={myVideo} autoPlay playsInline />
      </div>
      {peers.map(({ peerID, peer }) => (
        <div key={peerID} className="video-player">
          <Video peer={peer} />
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
