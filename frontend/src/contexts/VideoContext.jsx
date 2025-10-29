import React, { createContext, useState, useRef, useEffect, useContext } from 'react';
import Peer from 'simple-peer';
import { SocketContext } from './SocketContext';

const VideoContext = createContext();

const VideoProvider = ({ children }) => {
  const { socket } = useContext(SocketContext);

  const [stream, setStream] = useState(null);
  const [me, setMe] = useState('');
  const [call, setCall] = useState({});
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [name, setName] = useState('');

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  useEffect(() => {
    if (!socket) return;

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        setStream(currentStream);
        if (myVideo.current) {
          myVideo.current.srcObject = currentStream;
        }
      });

    setMe(socket.id);
    setName(localStorage.getItem('username') || 'Anonymous');

    socket.on('calluser', ({ from, name: callerName, signal }) => {
      setCall({ isReceivingCall: true, from, name: callerName, signal });
    });

    return () => {
        socket.off('calluser');
    }
  }, [socket, myVideo.current]);

  const answerCall = () => {
    setCallAccepted(true);

    const peer = new Peer({ initiator: false, trickle: false, stream });

    peer.on('signal', (data) => {
      socket.emit('answercall', { signal: data, to: call.from });
    });

    peer.on('stream', (currentStream) => {
      if (userVideo.current) {
        userVideo.current.srcObject = currentStream;
      }
    });

    peer.signal(call.signal);

    connectionRef.current = peer;
  };

  const callUser = (id) => {
    const peer = new Peer({ initiator: true, trickle: false, stream });

    peer.on('signal', (data) => {
      socket.emit('calluser', { userToCall: id, signalData: data, from: me, name });
    });

    peer.on('stream', (currentStream) => {
        if (userVideo.current) {
            userVideo.current.srcObject = currentStream;
        }
    });

    socket.on('callaccepted', (signal) => {
      setCallAccepted(true);
      peer.signal(signal);
    });

    connectionRef.current = peer;
  };

  const leaveCall = () => {
    setCallEnded(true);
    if (connectionRef.current) {
        connectionRef.current.destroy();
    }
    window.location.reload(); // A simple way to reset state
  };

  return (
    <VideoContext.Provider value={{
      call,
      callAccepted,
      myVideo,
      userVideo,
      stream,
      name,
      setName,
      callEnded,
      me,
      callUser,
      leaveCall,
      answerCall,
    }}>
      {children}
    </VideoContext.Provider>
  );
};

export { VideoProvider, VideoContext };
