import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Mic, MicOff, PhoneIncoming, PhoneOff, Video, VideoOff, Volume2 } from "lucide-react";
import socket from "../../lib/socket";
import { registerVoiceCallStarter } from "../../services/voiceCallService";
import { getIceConfiguration } from "../../services/callService";
import { startIncomingCallAlert, stopIncomingCallAlert } from "../../services/incomingCallAlert";
import useChatStore from "../../store/useChatStore";

const getCallerName = () => {
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
  const [videoPaused, setVideoPaused] = useState(false);
  const [cameraUnavailable, setCameraUnavailable] = useState(false);
  const peerRef = useRef(null);
  const streamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const candidateQueueRef = useRef([]);
  const callRef = useRef(null);

  useEffect(() => {
    callRef.current = call;
  }, [call]);

  useEffect(() => {
    if (call?.callType !== "video") return;
    if (localVideoRef.current && streamRef.current) {
      localVideoRef.current.srcObject = streamRef.current;
    }
    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [call?.callType, call?.status]);

  const stopMedia = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    remoteStreamRef.current = null;
  }, []);

  const finishCall = useCallback(
    (notify = false) => {
      const targetUserId = callRef.current?.userId;
      peerRef.current?.close();
      peerRef.current = null;
      candidateQueueRef.current = [];
      stopIncomingCallAlert();
      stopMedia();
      setMuted(false);
      setVideoPaused(false);
      setCameraUnavailable(false);
      setCall(null);
      clearIncomingCall();
      if (notify && targetUserId) socket.emit("endCall", { targetUserId });
    },
    [clearIncomingCall, stopMedia]
  );

  const makePeer = useCallback(async (targetUserId) => {
    const configuration = await getIceConfiguration();
    const peer = new RTCPeerConnection({
      iceServers: configuration.iceServers,
      iceCandidatePoolSize: 10,
    });
    peerRef.current = peer;

    peer.onicecandidate = ({ candidate }) => {
      // Send a plain RTCIceCandidateInit object. Firefox's RTCIceCandidate
      // instance is not consistently serialized by Socket.IO across browsers.
      if (candidate) {
        socket.emit("iceCandidate", {
          targetUserId,
          candidate: candidate.toJSON(),
        });
      }
    };

    peer.ontrack = ({ streams }) => {
      if (!streams[0]) return;
      remoteStreamRef.current = streams[0];
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = streams[0];
        remoteAudioRef.current.play().catch(() => {});
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = streams[0];
        remoteVideoRef.current.play().catch(() => {});
      }
    };

    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected") {
        setCall((current) => (current ? { ...current, status: "connected" } : current));
      }
      if (["failed", "closed"].includes(peer.connectionState)) finishCall(false);
    };

    return peer;
  }, [finishCall]);

  const addQueuedCandidates = useCallback(async (peer) => {
    const queued = candidateQueueRef.current.splice(0);
    await Promise.all(
      queued.map((candidate) =>
        peer.addIceCandidate(candidate).catch((error) => {
          console.warn("Unable to add queued ICE candidate:", error);
        }),
      ),
    );
  }, []);

  const getMedia = useCallback(async (callType) => {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === "video",
      });
      setCameraUnavailable(false);
    } catch (error) {
      // Firefox throws "Starting videoinput failed" when another tab/app has
      // the camera or its selected camera is unavailable. Keep the call usable
      // with audio instead of ending it outright.
      if (callType !== "video") throw error;
      console.warn("Camera unavailable; continuing the video call with audio only.", error);
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setCameraUnavailable(true);
    }
    streamRef.current = stream;
    return stream;
  }, []);

  const beginCall = useCallback(async (user, callType = "voice") => {
    if (!user?._id || callRef.current || !socket.connected) return false;
    try {
      setCall({ userId: user._id, name: user.name || "Contact", callType, status: "calling" });
      const stream = await getMedia(callType);
      if (callType === "video") {
        requestAnimationFrame(() => {
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        });
      }
      const peer = await makePeer(user._id);
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socket.emit(
        "callUser",
        { receiverId: user._id, offer, callerName: getCallerName(), callType },
        (result) => {
          if (!result?.success) finishCall(false);
        }
      );
      return true;
    } catch (error) {
      console.error("Unable to start voice call:", error);
      finishCall(false);
      return false;
    }
  }, [finishCall, getMedia, makePeer]);

  const acceptCall = useCallback(async () => {
    const incoming = callRef.current;
    if (!incoming?.offer) return;
    try {
      stopIncomingCallAlert();
      const stream = await getMedia(incoming.callType);
      const peer = await makePeer(incoming.userId);
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      await peer.setRemoteDescription(incoming.offer);
      await addQueuedCandidates(peer);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit("answerCall", { callerId: incoming.userId, answer });
      setCall((current) => ({ ...current, status: "connecting" }));
      if (incoming.callType === "video") {
        requestAnimationFrame(() => {
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        });
      }
    } catch (error) {
      console.error("Unable to answer voice call:", error);
      finishCall(true);
    }
  }, [addQueuedCandidates, finishCall, getMedia, makePeer]);

  const rejectCall = useCallback(() => {
    const callerId = callRef.current?.userId;
    if (callerId) socket.emit("rejectCall", { callerId });
    finishCall(false);
  }, [finishCall]);

  const toggleMute = () => {
    const nextMuted = !muted;
    streamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setMuted(nextMuted);
  };

  const toggleVideo = () => {
    const videoTrack = streamRef.current?.getVideoTracks()[0];
    if (!videoTrack) return;
    const nextPaused = !videoPaused;
    // Keeping the sender track in place avoids a renegotiation and works in
    // Firefox, Chrome, and Safari. `enabled = false` pauses outgoing frames.
    videoTrack.enabled = !nextPaused;
    setVideoPaused(nextPaused);
  };

  useEffect(() => {
    registerVoiceCallStarter(beginCall);
    return () => {
      registerVoiceCallStarter(null);
      finishCall(false);
    };
  }, [beginCall, finishCall]);

  // The app-level socket listener stores incoming calls. Reading from that
  // shared state means an incoming call isn't lost while the mobile loader is
  // still on screen or while this component is remounting.
  useEffect(() => {
    if (!incomingCall || callRef.current) return;
    const { callerId, callerName, callType = "voice", offer } = incomingCall;
    startIncomingCallAlert(callerName || "Someone", callType);
    setCall({ userId: callerId, name: callerName || "Someone", callType, offer, status: "incoming" });
  }, [incomingCall]);

  useEffect(() => {
    const onAnswered = async ({ answer }) => {
      const peer = peerRef.current;
      if (!peer || !answer) return;
      await peer.setRemoteDescription(answer);
      await addQueuedCandidates(peer);
      setCall((current) => (current ? { ...current, status: "connecting" } : current));
    };
    const onCandidate = async (candidate) => {
      const peer = peerRef.current;
      if (!candidate) return;
      // An incoming caller can send ICE candidates while the recipient is
      // still deciding whether to answer. Keep them for Firefox, which often
      // gathers candidates before the accept button is pressed.
      if (!peer) {
        candidateQueueRef.current.push(candidate);
        return;
      }
      if (peer.remoteDescription) {
        try {
          await peer.addIceCandidate(candidate);
        } catch (error) {
          console.warn("Unable to add ICE candidate:", error);
        }
      } else candidateQueueRef.current.push(candidate);
    };
    const onEnded = () => finishCall(false);

    socket.on("callAnswered", onAnswered);
    socket.on("iceCandidate", onCandidate);
    socket.on("callEnded", onEnded);
    socket.on("callRejected", onEnded);
    return () => {
      socket.off("callAnswered", onAnswered);
      socket.off("iceCandidate", onCandidate);
      socket.off("callEnded", onEnded);
      socket.off("callRejected", onEnded);
    };
  }, [addQueuedCandidates, finishCall]);

  useEffect(() => {
    const endCallOnPageExit = () => {
      const targetUserId = callRef.current?.userId;
      if (targetUserId && socket.connected) {
        socket.emit("endCall", { targetUserId });
      }
    };

    window.addEventListener("pagehide", endCallOnPageExit);
    return () => window.removeEventListener("pagehide", endCallOnPageExit);
  }, []);

  if (!call) return <audio ref={remoteAudioRef} autoPlay />;

  const isIncoming = call.status === "incoming";
  const isVideo = call.callType === "video";
  const callerName = call.name || "Someone";
  const label = isIncoming ? `Incoming ${isVideo ? "video" : "voice"} call` : call.status === "connected" ? `${isVideo ? "Video" : "Voice"} call` : call.status === "calling" ? "Calling…" : "Connecting…";

  return (
    <>
      <audio ref={remoteAudioRef} autoPlay />
      {createPortal(
      <div
        className="fixed inset-0 z-[1000] flex min-h-[100dvh] w-screen items-center justify-center p-4 sm:p-5"
        style={{ backgroundColor: "#09090b" }}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-label={label}
          className="relative block w-full max-w-sm overflow-hidden rounded-3xl border border-zinc-700 p-6 text-center text-white shadow-2xl sm:p-8"
          style={{ backgroundColor: "#18181b" }}
        >
          {isIncoming && <div className="absolute inset-x-0 top-0 h-1 bg-green-500" />}
          {isVideo && !isIncoming && (
            <div className="relative mb-5 aspect-video overflow-hidden rounded-2xl bg-zinc-900">
              <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
              <video ref={localVideoRef} autoPlay muted playsInline className="absolute bottom-3 right-3 h-20 w-28 rounded-lg border border-white/30 object-cover" />
            </div>
          )}
          <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full text-3xl font-bold ${isIncoming ? "animate-pulse bg-green-500 shadow-[0_0_0_14px_rgba(34,197,94,0.12)]" : "bg-purple-600"}`}>
            {callerName.charAt(0).toUpperCase()}
          </div>
          <h2 className="mt-5 text-xl font-semibold">{callerName}</h2>
          <p className="mt-1 text-sm text-zinc-400">{label}</p>
          {isVideo && cameraUnavailable && (
            <p className="mt-2 text-xs text-amber-300">
              Your camera is unavailable; the call is continuing with audio.
            </p>
          )}
          {isIncoming ? (
            <div className="mt-8 flex justify-center gap-8">
              <button onClick={rejectCall} className="flex flex-col items-center gap-2 text-xs text-zinc-300" aria-label="Decline call"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600"><PhoneOff /></span>Decline</button>
              <button onClick={acceptCall} className="flex flex-col items-center gap-2 text-xs text-zinc-300" aria-label="Answer call"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-600"><PhoneIncoming /></span>Answer</button>
            </div>
          ) : (
            <div className="mt-8 flex justify-center gap-7">
              <button onClick={toggleMute} className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-700" aria-label={muted ? "Unmute" : "Mute"}>{muted ? <MicOff /> : <Mic />}</button>
              {isVideo && (
                <button onClick={toggleVideo} className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-700" aria-label={videoPaused ? "Resume video" : "Pause video"}>
                  {videoPaused ? <VideoOff /> : <Video />}
                </button>
              )}
              <button onClick={() => finishCall(true)} className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600" aria-label="End call"><PhoneOff /></button>
              {!isVideo && <span className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-700 text-zinc-300"><Volume2 /></span>}
            </div>
          )}
        </section>
      </div>,
      document.body,
      )}
    </>
  );
}
