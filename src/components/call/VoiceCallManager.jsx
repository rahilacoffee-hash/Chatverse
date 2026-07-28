import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Mic, MicOff, PhoneIncoming, PhoneOff, Video, VideoOff } from "lucide-react";
import socket from "../../lib/socket";
import { registerVoiceCallStarter } from "../../services/voiceCallService";
import { getIceConfiguration } from "../../services/callService";
import { startIncomingCallAlert, stopIncomingCallAlert } from "../../services/incomingCallAlert";
import useChatStore from "../../store/useChatStore";

const fallbackIceServers = [
  { urls: ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"] },
];

const myName = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}").name || "Someone";
  } catch {
    return "Someone";
  }
};

export default function VoiceCallManager() {
  const incomingCall = useChatStore((state) => state.incomingCall);
  const clearIncomingCall = useChatStore((state) => state.endCall);
  const [call, setCall] = useState(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [iceState, setIceState] = useState("starting");
  const callRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const remoteAudioRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);

  const updateCall = useCallback((next) => {
    const value = typeof next === "function" ? next(callRef.current) : next;
    callRef.current = value;
    setCall(value);
  }, []);

  const attachStreams = useCallback(() => {
    if (remoteAudioRef.current && remoteStreamRef.current) {
      remoteAudioRef.current.srcObject = remoteStreamRef.current;
      remoteAudioRef.current.play().catch(() => {});
    }
    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
      remoteVideoRef.current.play().catch(() => {});
    }
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
      localVideoRef.current.play().catch(() => {});
    }
  }, []);

  useEffect(() => {
    attachStreams();
  }, [attachStreams, call?.type, call?.phase]);

  const stopMedia = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    [remoteAudioRef, remoteVideoRef, localVideoRef].forEach((ref) => {
      if (ref.current) ref.current.srcObject = null;
    });
  }, []);

  const closeCall = useCallback((notify = false) => {
    const userId = callRef.current?.userId;
    peerRef.current?.close();
    peerRef.current = null;
    pendingCandidatesRef.current = [];
    stopIncomingCallAlert();
    stopMedia();
    setMuted(false);
    setCameraOff(false);
    setMediaError("");
    setIceState("starting");
    updateCall(null);
    clearIncomingCall();
    if (notify && userId && socket.connected) socket.emit("endCall", { targetUserId: userId });
  }, [clearIncomingCall, stopMedia, updateCall]);

  const getLocalStream = useCallback(async (type) => {
    const constraints = {
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: type === "video" ? { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } : false,
    };
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      return stream;
    } catch (error) {
      if (type !== "video") throw error;
      // A voice-capable fallback is better than a dead video-call screen when
      // a mobile browser cannot open the front camera.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: constraints.audio, video: false });
      localStreamRef.current = stream;
      setMediaError("Camera unavailable — continuing with audio.");
      return stream;
    }
  }, []);

  const createPeer = useCallback(async (targetUserId) => {
    let configuration = { iceServers: fallbackIceServers };
    try {
      configuration = await getIceConfiguration();
    } catch (error) {
      console.warn("Could not load ICE configuration; using STUN fallback.", error);
    }

    const peer = new RTCPeerConnection({ iceServers: configuration?.iceServers?.length ? configuration.iceServers : fallbackIceServers });
    peerRef.current = peer;
    peer.oniceconnectionstatechange = () => setIceState(peer.iceConnectionState);
    peer.onicecandidate = ({ candidate }) => {
      if (candidate) socket.emit("iceCandidate", { targetUserId, candidate: candidate.toJSON() });
    };
    peer.ontrack = ({ streams, track }) => {
      remoteStreamRef.current = streams[0] || new MediaStream([track]);
      attachStreams();
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected") {
        setIceState("connected");
        updateCall((current) => current && { ...current, phase: "connected" });
      }
      if (peer.connectionState === "failed") {
        setIceState("failed");
        setMediaError("Could not connect to the other phone. Check TURN relay URLs, credentials, and firewall ports.");
        updateCall((current) => current && { ...current, phase: "failed" });
      }
    };
    return peer;
  }, [attachStreams, updateCall]);

  const addPendingCandidates = useCallback(async (peer) => {
    const candidates = pendingCandidatesRef.current.splice(0);
    await Promise.all(candidates.map((candidate) => peer.addIceCandidate(candidate).catch(() => {})));
  }, []);

  const startCall = useCallback(async (user, type = "voice") => {
    if (!user?._id || callRef.current || !socket.connected) return false;
    setMediaError("");
    updateCall({ userId: user._id, name: user.name || "Contact", type, phase: "calling" });
    try {
      const stream = await getLocalStream(type);
      attachStreams();
      const peer = await createPeer(user._id);
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      setIceState("checking");
      socket.emit("callUser", { receiverId: user._id, callerName: myName(), callType: type, offer }, (result) => {
        if (!result?.success) {
          setMediaError(result?.message || "This person is unavailable.");
          window.setTimeout(() => closeCall(false), 1800);
        }
      });
      return true;
    } catch (error) {
      console.error("Could not start call", error);
      setMediaError("Microphone or camera permission is required to call.");
      window.setTimeout(() => closeCall(false), 1800);
      return false;
    }
  }, [attachStreams, closeCall, createPeer, getLocalStream, updateCall]);

  const acceptCall = useCallback(async () => {
    const current = callRef.current;
    if (!current?.offer) return;
    stopIncomingCallAlert();
    setMediaError("");
    try {
      const stream = await getLocalStream(current.type);
      const peer = await createPeer(current.userId);
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      await peer.setRemoteDescription(current.offer);
      await addPendingCandidates(peer);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      setIceState("checking");
      socket.emit("answerCall", { callerId: current.userId, answer });
      updateCall((active) => active && { ...active, phase: "connecting" });
      attachStreams();
    } catch (error) {
      console.error("Could not answer call", error);
      setMediaError("Microphone or camera permission is required to answer.");
      window.setTimeout(() => closeCall(true), 1800);
    }
  }, [addPendingCandidates, attachStreams, closeCall, createPeer, getLocalStream, updateCall]);

  const declineCall = useCallback(() => {
    const callerId = callRef.current?.userId;
    if (callerId) socket.emit("rejectCall", { callerId });
    closeCall(false);
  }, [closeCall]);

  useEffect(() => {
    registerVoiceCallStarter(startCall);
    return () => registerVoiceCallStarter(null);
  }, [startCall]);

  useEffect(() => {
    if (!incomingCall?.callerId || callRef.current) return;
    const nextCall = {
      userId: incomingCall.callerId,
      name: incomingCall.callerName || "Someone",
      type: incomingCall.callType === "video" ? "video" : "voice",
      offer: incomingCall.offer,
      phase: "incoming",
    };
    updateCall(nextCall);
    startIncomingCallAlert(nextCall.name, nextCall.type);
  }, [incomingCall, updateCall]);

  useEffect(() => {
    const answerHandler = async ({ answer }) => {
      const peer = peerRef.current;
      if (!peer || !answer) return;
      await peer.setRemoteDescription(answer);
      await addPendingCandidates(peer);
      updateCall((current) => current && { ...current, phase: "connecting" });
    };
    const candidateHandler = async (candidate) => {
      const peer = peerRef.current;
      if (!candidate) return;
      if (!peer || !peer.remoteDescription) {
        pendingCandidatesRef.current.push(candidate);
        return;
      }
      await peer.addIceCandidate(candidate).catch(() => {});
    };
    const endedHandler = () => closeCall(false);
    socket.on("callAnswered", answerHandler);
    socket.on("iceCandidate", candidateHandler);
    socket.on("callEnded", endedHandler);
    socket.on("callRejected", endedHandler);
    return () => {
      socket.off("callAnswered", answerHandler);
      socket.off("iceCandidate", candidateHandler);
      socket.off("callEnded", endedHandler);
      socket.off("callRejected", endedHandler);
    };
  }, [addPendingCandidates, closeCall, updateCall]);

  useEffect(() => () => closeCall(false), [closeCall]);

  if (!call) return <audio ref={remoteAudioRef} autoPlay playsInline />;

  const isIncoming = call.phase === "incoming";
  const isVideo = call.type === "video";
  const name = call.name || "Someone";
  const status = isIncoming ? `Incoming ${isVideo ? "video" : "voice"} call` : call.phase === "connected" ? `${isVideo ? "Video" : "Voice"} call` : call.phase === "failed" ? "Call could not connect" : call.phase === "calling" ? "Calling…" : "Connecting…";
  const controlStyle = {
    width: 58,
    height: 58,
    border: 0,
    borderRadius: "50%",
    color: "#fff",
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
  };

  return (
    <>
      <audio ref={remoteAudioRef} autoPlay playsInline />
      {createPortal(
        <div role="dialog" aria-modal="true" aria-label={status} style={{ position: "fixed", inset: 0, zIndex: 2147483647, minHeight: "100dvh", overflow: "hidden", background: "linear-gradient(160deg, #120b23 0%, #09090b 48%, #020617 100%)", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
          {isVideo && !isIncoming && <video ref={remoteVideoRef} autoPlay playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", background: "#000" }} />}
          {isVideo && !isIncoming && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,.5), transparent 32%, transparent 62%, rgba(0,0,0,.65))" }} />}
          <div style={{ position: "relative", zIndex: 1, minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", padding: "max(28px, env(safe-area-inset-top)) 24px max(28px, env(safe-area-inset-bottom))" }}>
            <p style={{ margin: 0, fontSize: 14, color: "#d4d4d8", letterSpacing: ".02em" }}>{status}</p>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%" }}>
              {(!isVideo || isIncoming) && <div style={{ width: 112, height: 112, borderRadius: "50%", display: "grid", placeItems: "center", background: isIncoming ? "#16a34a" : "#7c3aed", fontSize: 44, fontWeight: 700, boxShadow: "0 0 0 14px rgba(255,255,255,.08)" }}>{name.charAt(0).toUpperCase()}</div>}
              <h2 style={{ margin: "28px 0 6px", fontSize: 26, lineHeight: 1.2 }}>{name}</h2>
              <p style={{ margin: 0, color: "#d4d4d8", fontSize: 15 }}>{isIncoming ? "Tap an option below" : `Network: ${iceState}`}</p>
              {mediaError && <p style={{ margin: "18px 0 0", maxWidth: 300, color: "#fde68a", fontSize: 14, textAlign: "center" }}>{mediaError}</p>}
            </div>
            {isVideo && !isIncoming && <video ref={localVideoRef} autoPlay muted playsInline style={{ position: "absolute", right: 20, bottom: 142, width: 112, height: 150, borderRadius: 16, objectFit: "cover", background: "#27272a", border: "2px solid rgba(255,255,255,.7)", boxShadow: "0 8px 28px rgba(0,0,0,.35)" }} />}
            {isIncoming ? <div style={{ display: "flex", width: "100%", maxWidth: 280, justifyContent: "space-between", gap: 28 }}><button onClick={declineCall} style={{ ...controlStyle, width: 110, height: "auto", background: "transparent", display: "flex", flexDirection: "column", gap: 10, fontSize: 14 }}><span style={{ ...controlStyle, background: "#dc2626" }}><PhoneOff /></span>Decline</button><button onClick={acceptCall} style={{ ...controlStyle, width: 110, height: "auto", background: "transparent", display: "flex", flexDirection: "column", gap: 10, fontSize: 14 }}><span style={{ ...controlStyle, background: "#16a34a" }}><PhoneIncoming /></span>Answer</button></div> : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18 }}><button onClick={() => { const next = !muted; localStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next; }); setMuted(next); }} style={{ ...controlStyle, background: muted ? "#e4e4e7" : "rgba(255,255,255,.2)", color: muted ? "#18181b" : "#fff" }} aria-label={muted ? "Unmute" : "Mute"}>{muted ? <MicOff /> : <Mic />}</button>{isVideo && <button onClick={() => { const track = localStreamRef.current?.getVideoTracks()[0]; if (!track) return; track.enabled = cameraOff; setCameraOff(!cameraOff); }} style={{ ...controlStyle, background: "rgba(255,255,255,.2)" }} aria-label={cameraOff ? "Turn camera on" : "Turn camera off"}>{cameraOff ? <VideoOff /> : <Video />}</button>}<button onClick={() => closeCall(true)} style={{ ...controlStyle, background: "#dc2626", width: 68, height: 68 }} aria-label="End call"><PhoneOff /></button></div>}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
