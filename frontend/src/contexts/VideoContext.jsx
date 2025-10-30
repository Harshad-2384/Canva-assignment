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
        setStream(currentStream);
        if (myVideo.current) {
          myVideo.current.srcObject = currentStream;
        }

        socket.emit('join-video-room', roomId);

        socket.on('all-users', (users) => {
          const peers = users.map(userID => {
            const peer = createPeer(userID, socket.id, currentStream);
            return { peerID: userID, peer };
          });
          peersRef.current = peers;
          setPeers(peers);
        });

        socket.on('user-joined', (payload) => {
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
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
    });

    peer.on('signal', (signal) => {
      socket.emit('sending-signal', { userToSignal, callerID, signal });
    });

    return peer;
  }

  function addPeer(incomingSignal, callerID, stream) {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
    });

    peer.on('signal', (signal) => {
      socket.emit('returning-signal', { signal, callerID });
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
