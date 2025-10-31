import React, { createContext, useState, useRef, useEffect, useContext } from 'react';
import Peer from 'simple-peer';
import { SocketContext } from './SocketContext';

const VideoContext = createContext();

const VideoProvider = ({ children, roomId }) => {
  const { socket } = useContext(SocketContext);

  const [stream, setStream] = useState(null);
  const [peers, setPeers] = useState([]);
  const myVideo = useRef();
  const peersRef = useRef([]);

  useEffect(() => {
    if (!socket) return;

    const setupStream = async () => {
      try {
        const currentStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        console.log('📹 Got media stream:', currentStream);
        setStream(currentStream);
        if (myVideo.current) {
          console.log('📹 Setting stream to myVideo element');
          myVideo.current.srcObject = currentStream;
        } else {
          console.log('📹 myVideo.current is null, will set later');
        }

        socket.emit('join-video-room', roomId);

        socket.on('all-users', (users) => {
          console.log('📹 Received all-users:', users);
          const peers = users.map(userID => {
            console.log('📹 Creating peer for user:', userID);
            const peer = createPeer(userID, socket.id, currentStream);
            return { peerID: userID, peer };
          });
          console.log('📹 Created peers:', peers.length);
          peersRef.current = peers;
          setPeers(peers);
        });

        socket.on('user-joined', (payload) => {
          console.log('📹 User joined:', payload.callerID);
          const peer = addPeer(payload.signal, payload.callerID, currentStream);
          const newPeer = { peerID: payload.callerID, peer };
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
          const peerObj = peersRef.current.find(p => p.peerID === id);
          if (peerObj) {
            peerObj.peer.destroy();
          }
          const newPeers = peersRef.current.filter(p => p.peerID !== id);
          peersRef.current = newPeers;
          setPeers(newPeers);
        });

      } catch (error) {
        console.error('Error accessing media devices.', error);
      }
    };

    setupStream();

    return () => {
      socket.off('all-users');
      socket.off('user-joined');
      socket.off('receiving-returned-signal');
      socket.off('user-left');
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [socket, roomId]);

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
