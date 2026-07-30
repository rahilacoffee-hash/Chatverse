import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Minimize2, Phone, PhoneIncoming, PhoneOff, RotateCcw, Video, VideoOff } from "lucide-react";
import socket from "../../lib/socket";
import { registerGroupCallJoiner, registerVoiceCallStarter } from "../../services/voiceCallService";
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
  const setActiveCall = useChatStore((state) => state.setActiveCall);
  const addMissedCall = useChatStore((state) => state.addMissedCall);
  const addCallHistory = useChatStore((state) => state.addCallHistory);
  const [call, setCall] = useState(null);
  const [minimized, setMinimized] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [iceState, setIceState] = useState("starting");
  const [groupStreams, setGroupStreams] = useState([]);
  const callRef = useRef(null);
  const peerRef = useRef(null);
  const groupPeersRef = useRef(new Map());
  const groupPendingCandidatesRef = useRef(new Map());
  const groupAudioRef = useRef(new Map());
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const remoteAudioRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const cameraFacingRef = useRef("user");

  const updateCall = useCallback((next) => {
    const value = typeof next === "function" ? next(callRef.current) : next;
    callRef.current = value;
    setCall(value);
    setActiveCall(value);
  }, [setActiveCall]);

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
  }, [attachStreams, call?.type, call?.phase, minimized]);

  const stopMedia = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    [remoteAudioRef, remoteVideoRef, localVideoRef].forEach((ref) => {
      if (ref.current) ref.current.srcObject = null;
    });
  }, []);

  const closeCall = useCallback((notify = false) => {
    const activeCall = callRef.current;
    const userId = activeCall?.userId;
    peerRef.current?.close();
    peerRef.current = null;
    groupPeersRef.current.forEach((peer) => peer.close());
    groupPeersRef.current.clear();
    groupPendingCandidatesRef.current.clear();
    groupAudioRef.current.forEach((audio) => { audio.pause(); audio.srcObject = null; });
    groupAudioRef.current.clear();
    setGroupStreams([]);
    pendingCandidatesRef.current = [];
    stopIncomingCallAlert();
    stopMedia();
    setMuted(false);
    setCameraOff(false);
    setMediaError("");
    setIceState("starting");
    setMinimized(false);
    if (activeCall?.userId) {
      addCallHistory({
        userId: activeCall.userId,
        name: activeCall.name,
        type: activeCall.type,
        group: activeCall.group,
        direction: activeCall.phase === "incoming" ? "incoming" : "outgoing",
        outcome: activeCall.phase === "incoming" ? "missed" : activeCall.phase === "connected" ? "completed" : "ended",
        startedAt: activeCall.startedAt || Date.now(),
        endedAt: Date.now(),
      });
    }
    updateCall(null);
    clearIncomingCall();
    if (notify && socket.connected) {
      if (activeCall?.group && activeCall.sessionId) socket.emit("leaveGroupCall", { sessionId: activeCall.sessionId });
      else if (userId) socket.emit("endCall", { targetUserId: userId });
    }
  }, [addCallHistory, clearIncomingCall, stopMedia, updateCall]);

  const getLocalStream = useCallback(async (type) => {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      throw new Error("Calls require HTTPS and microphone access in this browser.");
    }
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

  const switchCamera = useCallback(async () => {
    if (!localStreamRef.current?.getVideoTracks().length) return;
    const nextFacing = cameraFacingRef.current === "user" ? "environment" : "user";
    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: nextFacing } }, audio: false });
      const nextTrack = cameraStream.getVideoTracks()[0];
      const previousTrack = localStreamRef.current.getVideoTracks()[0];
      localStreamRef.current.removeTrack(previousTrack);
      localStreamRef.current.addTrack(nextTrack);
      previousTrack.stop();
      const replaceVideoTrack = (peer) => peer?.getSenders().find((sender) => sender.track?.kind === "video")?.replaceTrack(nextTrack);
      await Promise.all([replaceVideoTrack(peerRef.current), ...[...groupPeersRef.current.values()].map(replaceVideoTrack)].filter(Boolean));
      cameraFacingRef.current = nextFacing;
      attachStreams();
    } catch (error) {
      setMediaError(error.message || "Could not switch cameras.");
    }
  }, [attachStreams]);

  const createPeer = useCallback(async (targetUserId) => {
    let configuration = { iceServers: fallbackIceServers };
    let turnConfigured = false;
    try {
      configuration = await getIceConfiguration();
      turnConfigured = Boolean(configuration?.turnConfigured);
    } catch (error) {
      console.warn("Could not load ICE configuration; using STUN fallback.", error);
    }

    const peer = new RTCPeerConnection({ iceServers: configuration?.iceServers?.length ? configuration.iceServers : fallbackIceServers });
    peerRef.current = peer;
    peer.oniceconnectionstatechange = () => setIceState(peer.iceConnectionState);
    peer.onicecandidateerror = (event) => {
      // This is especially useful on Chrome for Android, where carrier NAT
      // failures otherwise surface only as a generic disconnected call.
      console.warn("ICE candidate error", event.errorCode, event.errorText);
      if (event.errorCode === 400) {
        setMediaError("TURN rejected the allocation. Check the TURN username, credential, and provider plan.");
      } else if (event.errorCode === 701) {
        setMediaError("Cannot reach a TURN/STUN server from this network. Check the relay URL and mobile data/Wi-Fi.");
      } else {
        setMediaError(`Network relay error (${event.errorCode || "unknown"}). ${event.errorText || "Try another network."}`);
      }
    };
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
        setMediaError(
          turnConfigured
            ? "Could not connect to the other phone. Check the TURN relay credentials and firewall ports."
            : "Could not connect across these networks. Configure a TURN relay on the server for Chrome mobile calls.",
        );
        updateCall((current) => current && { ...current, phase: "failed" });
      }
    };
    return peer;
  }, [attachStreams, updateCall]);

  const addPendingCandidates = useCallback(async (peer) => {
    const candidates = pendingCandidatesRef.current.splice(0);
    await Promise.all(candidates.map((candidate) => peer.addIceCandidate(candidate).catch(() => {})));
  }, []);

  const createGroupPeer = useCallback(async (targetUserId, sessionId) => {
    const existing = groupPeersRef.current.get(targetUserId);
    if (existing) return existing;
    let configuration = { iceServers: fallbackIceServers };
    try { configuration = await getIceConfiguration(); } catch { /* STUN fallback */ }
    const peer = new RTCPeerConnection({ iceServers: configuration?.iceServers?.length ? configuration.iceServers : fallbackIceServers });
    groupPeersRef.current.set(targetUserId, peer);
    peer.oniceconnectionstatechange = () => setIceState(peer.iceConnectionState);
    peer.onicecandidate = ({ candidate }) => {
      if (candidate) socket.emit("groupCallSignal", { sessionId, targetUserId, signal: { type: "candidate", candidate: candidate.toJSON() } });
    };
    peer.ontrack = ({ streams, track }) => {
      const stream = streams[0] || new MediaStream([track]);
      setGroupStreams((current) => [...current.filter((item) => item.userId !== targetUserId), { userId: targetUserId, stream }]);
      if (callRef.current?.type !== "video") {
        const audio = new Audio();
        audio.autoplay = true;
        audio.srcObject = stream;
        audio.play().catch(() => {});
        groupAudioRef.current.set(targetUserId, audio);
      }
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = stream;
        attachStreams();
      }
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected") updateCall((current) => current && { ...current, phase: "connected" });
      if (peer.connectionState === "failed") updateCall((current) => current && { ...current, phase: "failed" });
    };
    return peer;
  }, [attachStreams, updateCall]);

  const offerGroupPeer = useCallback(async (targetUserId, sessionId) => {
    const peer = await createGroupPeer(targetUserId, sessionId);
    if (peer.signalingState !== "stable") return;
    localStreamRef.current?.getTracks().forEach((track) => peer.addTrack(track, localStreamRef.current));
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socket.emit("groupCallSignal", { sessionId, targetUserId, signal: { type: "offer", description: peer.localDescription } });
  }, [createGroupPeer]);

  const joinExistingGroupCall = useCallback(async (groupCall) => {
    if (!groupCall?.sessionId || callRef.current?.phase === "connected" || !socket.connected) return false;
    const callType = groupCall.callType === "video" || groupCall.type === "video" ? "video" : "voice";
    updateCall({ group: true, sessionId: groupCall.sessionId, userId: groupCall.conversationId || groupCall.userId, name: groupCall.groupName || groupCall.name || "Group call", type: callType, phase: "connecting" });
    try {
      await getLocalStream(callType);
      attachStreams();
      return await new Promise((resolve) => {
        socket.emit("joinGroupCall", { sessionId: groupCall.sessionId }, (result) => {
          if (!result?.success) {
            setMediaError(result?.message || "This group call is no longer available.");
            closeCall(false);
            resolve(false);
            return;
          }
          setIceState("checking");
          result.participants?.forEach((participantId) => void offerGroupPeer(participantId, groupCall.sessionId).catch(() => {}));
          resolve(true);
        });
      });
    } catch (error) {
      setMediaError(error.message || "Microphone or camera permission is required to join.");
      closeCall(false);
      return false;
    }
  }, [attachStreams, closeCall, getLocalStream, offerGroupPeer, updateCall]);

  const startCall = useCallback(async (user, type = "voice") => {
    if (!user?._id || callRef.current || !socket.connected) return false;
    const isGroup = type.startsWith("group-");
    const callType = type.replace("group-", "");
    setMediaError("");
    updateCall({ userId: user._id, name: isGroup ? user.groupName || "Group call" : user.name || "Contact", type: callType, group: isGroup, phase: "calling", startedAt: Date.now() });
    try {
      const stream = await getLocalStream(callType);
      attachStreams();
      if (isGroup) {
        socket.emit("startGroupCall", { conversationId: user._id, callType }, (result) => {
          if (!result?.success) { setMediaError(result?.message || "Could not start group call."); return closeCall(false); }
          updateCall((current) => current && { ...current, sessionId: result.sessionId, memberCount: result.members?.length || 1 });
          setIceState("checking");
          result.members?.forEach((participant) => {
            const participantId = participant.id || participant;
            if (String(participantId) !== String(localStorage.getItem("userId"))) void offerGroupPeer(participantId, result.sessionId).catch(() => {});
          });
        });
        return true;
      }
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
      setMediaError(error.message || "Microphone or camera permission is required to call.");
      window.setTimeout(() => closeCall(false), 1800);
      return false;
    }
  }, [attachStreams, closeCall, createPeer, getLocalStream, offerGroupPeer, updateCall]);

  const acceptCall = useCallback(async () => {
    const current = callRef.current;
    if (!current) return;
    if (current.group) {
      stopIncomingCallAlert();
      await joinExistingGroupCall(current);
      return;
    }
    if (!current.offer) return;
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
      setMediaError(error.message || "Microphone or camera permission is required to answer.");
      window.setTimeout(() => closeCall(true), 1800);
    }
  }, [addPendingCandidates, attachStreams, closeCall, createPeer, getLocalStream, joinExistingGroupCall, updateCall]);

  const declineCall = useCallback(() => {
    const declinedCall = callRef.current;
    const callerId = declinedCall?.userId;
    if (callerId) socket.emit("rejectCall", { callerId });
    if (declinedCall) addMissedCall({ userId: callerId, name: declinedCall.name, type: declinedCall.type });
    closeCall(false);
  }, [addMissedCall, closeCall]);

  useEffect(() => {
    registerVoiceCallStarter(startCall);
    return () => registerVoiceCallStarter(null);
  }, [startCall]);

  useEffect(() => {
    registerGroupCallJoiner(joinExistingGroupCall);
    return () => registerGroupCallJoiner(null);
  }, [joinExistingGroupCall]);

  useEffect(() => {
    if (!incomingCall?.callerId || callRef.current) return;
    const nextCall = {
      userId: incomingCall.callerId,
      name: incomingCall.callerName || "Someone",
      type: incomingCall.callType === "video" ? "video" : "voice",
      offer: incomingCall.offer,
      phase: "incoming",
      startedAt: Date.now(),
    };
    updateCall(nextCall);
    startIncomingCallAlert(nextCall.name, nextCall.type);
  }, [incomingCall, updateCall]);

  useEffect(() => {
    const incomingHandler = ({ sessionId, callerId, callerName, callType, groupName }) => {
      if (callRef.current) return;
      const nextCall = { group: true, sessionId, userId: callerId, name: groupName || "Group call", callerName, type: callType === "video" ? "video" : "voice", phase: "incoming", startedAt: Date.now() };
      updateCall(nextCall);
      startIncomingCallAlert(nextCall.name, nextCall.type);
    };
    const signalHandler = async ({ sessionId, fromUserId, signal }) => {
      const active = callRef.current;
      if (!active?.group || active.sessionId !== sessionId) return;
      const peer = await createGroupPeer(fromUserId, sessionId);
      if (signal?.type === "offer") {
        localStreamRef.current?.getTracks().forEach((track) => peer.addTrack(track, localStreamRef.current));
        await peer.setRemoteDescription(signal.description);
        const queuedCandidates = groupPendingCandidatesRef.current.get(fromUserId) || [];
        groupPendingCandidatesRef.current.delete(fromUserId);
        await Promise.all(queuedCandidates.map((candidate) => peer.addIceCandidate(candidate).catch(() => {})));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        socket.emit("groupCallSignal", { sessionId, targetUserId: fromUserId, signal: { type: "answer", description: peer.localDescription } });
      } else if (signal?.type === "answer") {
        await peer.setRemoteDescription(signal.description);
        const queuedCandidates = groupPendingCandidatesRef.current.get(fromUserId) || [];
        groupPendingCandidatesRef.current.delete(fromUserId);
        await Promise.all(queuedCandidates.map((candidate) => peer.addIceCandidate(candidate).catch(() => {})));
      } else if (signal?.type === "candidate") {
        if (!peer.remoteDescription) {
          const queuedCandidates = groupPendingCandidatesRef.current.get(fromUserId) || [];
          groupPendingCandidatesRef.current.set(fromUserId, [...queuedCandidates, signal.candidate]);
        } else {
          await peer.addIceCandidate(signal.candidate).catch(() => {});
        }
      }
    };
    const endedHandler = ({ sessionId }) => {
      if (callRef.current?.group && callRef.current.sessionId === sessionId) closeCall(false);
    };
    socket.on("incomingGroupCall", incomingHandler);
    socket.on("groupCallSignal", signalHandler);
    socket.on("groupCallEnded", endedHandler);
    return () => {
      socket.off("incomingGroupCall", incomingHandler);
      socket.off("groupCallSignal", signalHandler);
      socket.off("groupCallEnded", endedHandler);
    };
  }, [closeCall, createGroupPeer, updateCall]);

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

  if (minimized) return <><audio ref={remoteAudioRef} autoPlay playsInline />{isVideo && <video ref={localVideoRef} autoPlay muted playsInline aria-hidden="true" style={{ position: "fixed", width: 1, height: 1, right: -2, bottom: -2, opacity: 0, pointerEvents: "none" }} />}<button onClick={() => setMinimized(false)} className="fixed bottom-24 right-4 z-50 flex items-center gap-3 rounded-2xl border border-purple-400/30 bg-zinc-950 px-4 py-3 text-left text-white shadow-2xl shadow-black/50 transition hover:bg-zinc-900 sm:bottom-6"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-600/90">{isVideo ? <Video size={18} /> : <Phone size={18} />}</span><span><b className="block text-sm">{name}</b><small className="block text-purple-200">{status} · Tap to return</small></span><span onClick={(event) => { event.stopPropagation(); closeCall(true); }} className="ml-1 rounded-full p-2 text-purple-200 hover:bg-purple-500/20 hover:text-white" aria-label="End call"><PhoneOff size={18} /></span></button></>;

  return (
    <>
      <audio ref={remoteAudioRef} autoPlay playsInline />
      <div role="dialog" aria-modal="true" aria-label={status} style={{ position: "fixed", inset: 0, zIndex: 2147483647, minHeight: "100dvh", overflow: "hidden", background: "linear-gradient(160deg, #120b23 0%, #09090b 48%, #020617 100%)", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
          {!isIncoming && <button onClick={() => setMinimized(true)} aria-label="Minimize call" style={{ position: "absolute", top: 18, right: 18, zIndex: 3, border: 0, borderRadius: 999, padding: 10, background: "rgba(0,0,0,.35)", color: "#fff" }}><Minimize2 size={20} /></button>}
          {isVideo && !isIncoming && !call.group && <video ref={remoteVideoRef} autoPlay playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", background: "#000" }} />}
          {isVideo && !isIncoming && !call.group && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,.5), transparent 32%, transparent 62%, rgba(0,0,0,.65))" }} />}
          {isVideo && !isIncoming && call.group && <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: groupStreams.length < 1 ? "1fr" : "repeat(2, 1fr)", gridAutoRows: "1fr", gap: 3, padding: 3, background: "#09090b" }}>
            <div style={{ position: "relative", minHeight: 0, overflow: "hidden", borderRadius: 12, background: "#27272a" }}>
              <video ref={localVideoRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
              <span style={{ position: "absolute", left: 10, bottom: 10, borderRadius: 999, padding: "4px 9px", background: "rgba(0,0,0,.58)", fontSize: 12 }}>You</span>
            </div>
            {groupStreams.map(({ userId, stream }) => <div key={userId} style={{ position: "relative", minHeight: 0, overflow: "hidden", borderRadius: 12, background: "#27272a" }}>
              <video autoPlay playsInline ref={(element) => { if (element && element.srcObject !== stream) { element.srcObject = stream; element.play().catch(() => {}); } }} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <span style={{ position: "absolute", left: 10, bottom: 10, borderRadius: 999, padding: "4px 9px", background: "rgba(0,0,0,.58)", fontSize: 12 }}>Participant</span>
            </div>)}
          </div>}
          <div style={{ position: "relative", zIndex: 1, minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", padding: "max(28px, env(safe-area-inset-top)) 24px max(28px, env(safe-area-inset-bottom))" }}>
            <p style={{ margin: 0, fontSize: 14, color: "#d4d4d8", letterSpacing: ".02em" }}>{status}</p>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%" }}>
              {(!isVideo || isIncoming) && <div style={{ width: 112, height: 112, borderRadius: "50%", display: "grid", placeItems: "center", background: isIncoming ? "#16a34a" : "#7c3aed", fontSize: 44, fontWeight: 700, boxShadow: "0 0 0 14px rgba(255,255,255,.08)" }}>{name.charAt(0).toUpperCase()}</div>}
              <h2 style={{ margin: "28px 0 6px", fontSize: 26, lineHeight: 1.2 }}>{name}</h2>
              <p style={{ margin: 0, color: "#d4d4d8", fontSize: 15 }}>{isIncoming ? "Tap an option below" : `Network: ${iceState}`}</p>
              {mediaError && <p style={{ margin: "18px 0 0", maxWidth: 300, color: "#fde68a", fontSize: 14, textAlign: "center" }}>{mediaError}</p>}
            </div>
            {isVideo && !isIncoming && !call.group && <video ref={localVideoRef} autoPlay muted playsInline style={{ position: "absolute", right: 20, bottom: 142, width: 112, height: 150, borderRadius: 16, objectFit: "cover", background: "#27272a", border: "2px solid rgba(255,255,255,.7)", boxShadow: "0 8px 28px rgba(0,0,0,.35)" }} />}
            {isIncoming ? <div style={{ display: "flex", width: "100%", maxWidth: 280, justifyContent: "space-between", gap: 28 }}><button onClick={declineCall} style={{ ...controlStyle, width: 110, height: "auto", background: "transparent", display: "flex", flexDirection: "column", gap: 10, fontSize: 14 }}><span style={{ ...controlStyle, background: "#dc2626" }}><PhoneOff /></span>Decline</button><button onClick={acceptCall} style={{ ...controlStyle, width: 110, height: "auto", background: "transparent", display: "flex", flexDirection: "column", gap: 10, fontSize: 14 }}><span style={{ ...controlStyle, background: "#16a34a" }}><PhoneIncoming /></span>Answer</button></div> : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18 }}><button onClick={() => { const next = !muted; localStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next; }); setMuted(next); }} style={{ ...controlStyle, background: muted ? "#e4e4e7" : "rgba(255,255,255,.2)", color: muted ? "#18181b" : "#fff" }} aria-label={muted ? "Unmute" : "Mute"}>{muted ? <MicOff /> : <Mic />}</button>{isVideo && <><button onClick={() => { const track = localStreamRef.current?.getVideoTracks()[0]; if (!track) return; track.enabled = cameraOff; setCameraOff(!cameraOff); }} style={{ ...controlStyle, background: "rgba(255,255,255,.2)" }} aria-label={cameraOff ? "Turn camera on" : "Turn camera off"}>{cameraOff ? <VideoOff /> : <Video />}</button><button onClick={() => void switchCamera()} style={{ ...controlStyle, background: "rgba(255,255,255,.2)" }} aria-label="Switch camera"><RotateCcw /></button></>}<button onClick={() => closeCall(true)} style={{ ...controlStyle, background: "#dc2626", width: 68, height: 68 }} aria-label="End call"><PhoneOff /></button></div>}
          </div>
      </div>
    </>
  );
}
