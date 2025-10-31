import React, { createContext, useState, useRef, useEffect, useContext } from 'react';
import Peer from 'simple-peer';
import { SocketContext } from './SocketContext';

const VideoContext = createContext();

const VideoProvider = ({ children, roomId }) => {
  const { socket } = useContext(SocketContext);

  const [stream, setStream] = useState(null);
  const [peers, setPeers] = useState([]);
  const [isVideoSetup, setIsVideoSetup] = useState(false);
  const myVideo = useRef();
  const peersRef = useRef([]);

  useEffect(() => {
    if (!socket) return;

    const setupStream = async () => {
      if (isVideoSetup) {
        console.log('📹 Video already setup, skipping...');
        return;
      }
      
      try {
        console.log('📹 Setting up video stream...');
        const currentStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        console.log('📹 Got media stream:', currentStream);
        setStream(currentStream);
        setIsVideoSetup(true);
        
        if (myVideo.current) {
          console.log('📹 Setting stream to myVideo element');
          myVideo.current.srcObject = currentStream;
        } else {
          console.log('📹 myVideo.current is null, will set later');
        }

        socket.emit('join-video-room', roomId);

        socket.on('all-users', (users) => {
          console.log('📹 Received all-users:', users);
          // Clear existing peers to prevent duplicates
          peersRef.current.forEach(({ peer }) => {
            if (peer && typeof peer.destroy === 'function') {
              peer.destroy();
            }
          });
          peersRef.current = [];
          setPeers([]);
          
          const newPeers = users.map(userInfo => {
            const userID = typeof userInfo === 'string' ? userInfo : userInfo.socketId;
            const userName = typeof userInfo === 'object' ? userInfo.name : `User ${userID.substring(0, 8)}`;
            console.log('📹 Creating peer for user:', userID, 'name:', userName);
            const peer = createPeer(userID, socket.id, currentStream);
            return { peerID: userID, peer, userName };
          });
          console.log('📹 Created peers:', newPeers.length);
          peersRef.current = newPeers;
          setPeers(newPeers);
        });

        socket.on('user-joined', (payload) => {
          console.log('📹 User joined:', payload.callerID, 'userName:', payload.userName);
          // Check if peer already exists to prevent duplicates
          const existingPeer = peersRef.current.find(p => p.peerID === payload.callerID);
          if (existingPeer) {
            console.log('📹 Peer already exists for:', payload.callerID, 'skipping...');
            return;
          }
          
          const peer = addPeer(payload.signal, payload.callerID, currentStream);
          const userName = payload.userName || `User ${payload.callerID.substring(0, 8)}`;
          const newPeer = { peerID: payload.callerID, peer, userName };
          peersRef.current.push(newPeer);
          setPeers(users => [...users, newPeer]);
        });

        socket.on('receiving-returned-signal', (payload) => {
          const item = peersRef.current.find(p => p.peerID === payload.id);
          if (item) {
            item.peer.signal(payload.signal);
          }
        });

        socket.on('user-left', (id) => {
          console.log('📹 User left:', id);
          const peerObj = peersRef.current.find(p => p.peerID === id);
          if (peerObj) {
            console.log('📹 Destroying peer connection for:', id);
            peerObj.peer.destroy();
          }
          const newPeers = peersRef.current.filter(p => p.peerID !== id);
          peersRef.current = newPeers;
          setPeers(newPeers);
          console.log('📹 Remaining peers after user left:', newPeers.length);
        });

      } catch (error) {
        console.error('Error accessing media devices.', error);
      }
    };

    setupStream();

    return () => {
      console.log('📹 Cleaning up VideoContext...');
      socket.off('all-users');
      socket.off('user-joined');
      socket.off('receiving-returned-signal');
      socket.off('user-left');
      
      // Clean up all peer connections
      peersRef.current.forEach(({ peer }) => {
        if (peer && typeof peer.destroy === 'function') {
          peer.destroy();
        }
      });
      peersRef.current = [];
      setPeers([]);
      
      // Stop media tracks
      if (stream) {
        stream.getTracks().forEach(track => {
          track.stop();
          console.log('📹 Stopped track:', track.kind);
        });
        setStream(null);
      }
      setIsVideoSetup(false);
    };
  }, [socket, roomId, isVideoSetup]);

  function createPeer(userToSignal, callerID, stream) {
    console.log('📹 Creating peer connection to:', userToSignal, 'with stream:', !!stream);
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    peer.on('signal', (signal) => {
      console.log('📹 Sending signal to:', userToSignal);
      socket.emit('sending-signal', { userToSignal, callerID, signal });
    });

    peer.on('stream', (remoteStream) => {
      console.log('📹 Received stream from:', userToSignal, 'Stream tracks:', remoteStream.getTracks().length);
    });

    peer.on('connect', () => {
      console.log('📹 Peer connected:', userToSignal);
    });

    peer.on('error', (err) => {
      console.error('📹 Peer error:', err);
    });

    return peer;
  }

  function addPeer(incomingSignal, callerID, stream) {
    console.log('📹 Adding peer for caller:', callerID, 'with stream:', !!stream);
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    peer.on('signal', (signal) => {
      console.log('📹 Returning signal to:', callerID);
      socket.emit('returning-signal', { signal, callerID });
    });

    peer.on('stream', (remoteStream) => {
      console.log('📹 Received stream from caller:', callerID, 'Stream tracks:', remoteStream.getTracks().length);
    });

    peer.on('connect', () => {
      console.log('📹 Peer connected with caller:', callerID);
    });

    peer.on('error', (err) => {
      console.error('📹 Peer error with caller:', err);
    });

    peer.signal(incomingSignal);
    return peer;
  }

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
    }
  };

  const toggleAudio = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
    }
  };

  return (
    <VideoContext.Provider value={{
      myVideo,
      stream,
      peers,
      toggleVideo,
      toggleAudio,
    }}>
      {children}
    </VideoContext.Provider>
  );
};


export { VideoProvider, VideoContext };
