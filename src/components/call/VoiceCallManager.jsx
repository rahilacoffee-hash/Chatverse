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
    peer.onicecandidate = ({ candidate }) => {
      if (candidate) socket.emit("iceCandidate", { targetUserId, candidate: candidate.toJSON() });
    };
    peer.ontrack = ({ streams, track }) => {
      remoteStreamRef.current = streams[0] || new MediaStream([track]);
      attachStreams();
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected") updateCall((current) => current && { ...current, phase: "connected" });
      if (["failed", "closed"].includes(peer.connectionState)) closeCall(false);
    };
    return peer;
  }, [attachStreams, closeCall, updateCall]);

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
  const status = isIncoming ? `Incoming ${isVideo ? "video" : "voice"} call` : call.phase === "connected" ? `${isVideo ? "Video" : "Voice"} call` : call.phase === "calling" ? "Calling…" : "Connecting…";

  return (
    <>
      <audio ref={remoteAudioRef} autoPlay playsInline />
      {createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" style={{ background: "#09090b" }}>
          <section className="w-full max-w-sm rounded-3xl border border-zinc-700 p-6 text-center text-white shadow-2xl" style={{ background: "#18181b" }} role="dialog" aria-modal="true" aria-label={status}>
            {isVideo && !isIncoming && <div className="relative mb-5 aspect-video overflow-hidden rounded-2xl bg-black"><video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" /><video ref={localVideoRef} autoPlay muted playsInline className="absolute bottom-3 right-3 h-20 w-28 rounded-lg border border-white/40 object-cover" /></div>}
            <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full text-3xl font-bold ${isIncoming ? "animate-pulse bg-green-500" : "bg-purple-600"}`}>{name.charAt(0).toUpperCase()}</div>
            <h2 className="mt-5 text-xl font-semibold">{name}</h2>
            <p className="mt-1 text-sm text-zinc-400">{status}</p>
            {mediaError && <p className="mt-3 text-sm text-amber-300">{mediaError}</p>}
            {isIncoming ? <div className="mt-8 flex justify-center gap-10"><button onClick={declineCall} className="flex flex-col items-center gap-2 text-sm"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600"><PhoneOff /></span>Decline</button><button onClick={acceptCall} className="flex flex-col items-center gap-2 text-sm"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-600"><PhoneIncoming /></span>Answer</button></div> : <div className="mt-8 flex justify-center gap-6"><button onClick={() => { const next = !muted; localStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next; }); setMuted(next); }} className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-700" aria-label={muted ? "Unmute" : "Mute"}>{muted ? <MicOff /> : <Mic />}</button>{isVideo && <button onClick={() => { const track = localStreamRef.current?.getVideoTracks()[0]; if (!track) return; track.enabled = cameraOff; setCameraOff(!cameraOff); }} className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-700" aria-label={cameraOff ? "Turn camera on" : "Turn camera off"}>{cameraOff ? <VideoOff /> : <Video />}</button>}<button onClick={() => closeCall(true)} className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600" aria-label="End call"><PhoneOff /></button></div>}
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
