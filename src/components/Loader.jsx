import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Real-time ChatVerse loader.
 *
 * Tracks actual browser/connection signals instead of a fake timer:
 *  - navigator.onLine + online/offline events
 *  - document readyState / window "load"
 *  - a passed-in Socket.io client's connect/disconnect/connect_error events
 *
 * Props:
 *  - socket: a Socket.io client instance (already created, not yet required to be connected)
 *  - onReady: callback fired once when page is loaded AND socket is connected
 *  - onAuthError: callback fired once if the socket fails specifically due to
 *    a bad/expired token (not a generic network failure) — use this to clear
 *    the stale token and redirect to login instead of showing a dead-end error
 */
function Loader({ socket, onReady, onAuthError }) {
  const [online, setOnline] = useState(navigator.onLine);
  const [pageLoaded, setPageLoaded] = useState(
    document.readyState === "complete"
  );
  // If no socket is passed (e.g. guest, no auth token yet), there's
  // nothing to wait on for this step — treat it as already satisfied.
  const [socketStatus, setSocketStatus] = useState(
    socket ? "connecting" : "connected"
  ); // connecting | connected | error | auth_error
  const firedReady = useRef(false);
  const firedAuthError = useRef(false);

  // --- Track real network state ---
  useEffect(() => {
    function handleOnline() {
      setOnline(true);
    }
    function handleOffline() {
      setOnline(false);
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // --- Track real page load state ---
  useEffect(() => {
    if (document.readyState === "complete") {
      setPageLoaded(true);
      return;
    }
    function handleLoad() {
      setPageLoaded(true);
    }
    window.addEventListener("load", handleLoad);
    return () => window.removeEventListener("load", handleLoad);
  }, []);

  // --- Track real socket connection state ---
  useEffect(() => {
    if (!socket) return;

    if (socket.connected) {
      setSocketStatus("connected");
    }

    function handleConnect() {
      setSocketStatus("connected");
    }
    function handleDisconnect() {
      setSocketStatus("connecting");
    }
    function handleError(err) {
      console.error("Socket connect_error:", err.message);

      // Distinguish "your token is bad/expired" from "the network/server
      // is actually unreachable". Our backend's auth middleware sends these
      // exact messages — adjust here if you change the wording server-side.
      const isAuthIssue =
        err.message === "Invalid or expired token" ||
        err.message === "No auth token provided";

      setSocketStatus(isAuthIssue ? "auth_error" : "error");
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleError);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleError);
    };
  }, [socket]);

  // --- Derive real progress + status text from the above signals ---
  const steps = [
    { label: "Checking connection", done: online },
    { label: "Loading app", done: pageLoaded },
    {
      label: !socket
        ? "Ready"
        : socketStatus === "auth_error"
        ? "Session expired"
        : socketStatus === "error"
        ? "Connection failed"
        : "Connecting to ChatVerse",
      done: socketStatus === "connected",
    },
  ];
  const completedCount = steps.filter((s) => s.done).length;
  const progress = Math.round((completedCount / steps.length) * 100);
  const isAuthError = socketStatus === "auth_error";
  const hasNetworkError = !online || socketStatus === "error";
  const hasError = hasNetworkError || isAuthError;
  const isReady = online && pageLoaded && socketStatus === "connected";

  // --- Fire onReady exactly once when everything actually resolves ---
  useEffect(() => {
    if (isReady && !firedReady.current) {
      firedReady.current = true;
      onReady?.();
    }
  }, [isReady, onReady]);

  // --- Fire onAuthError exactly once so the parent can clear the token
  //     and redirect, instead of leaving the user stuck on this screen ---
  useEffect(() => {
    if (isAuthError && !firedAuthError.current) {
      firedAuthError.current = true;
      onAuthError?.();
    }
  }, [isAuthError, onAuthError]);

  const activeLabel =
    steps.find((s) => !s.done)?.label ?? "All set";

  return (
    <div className="relative min-h-screen w-full bg-[#050507] flex flex-col items-center justify-center overflow-hidden px-8">
      {/* Eyebrow label */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="absolute top-16 flex flex-col items-center gap-2"
      >
        <span className="text-[11px] font-semibold tracking-[0.2em] text-gray-500 uppercase">
          {isAuthError ? "Session expired" : hasError ? "Connection issue" : "Connecting"}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-lg">ChatVerse</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
              hasError
                ? "bg-red-500/15 text-red-400"
                : isReady
                ? "bg-[#4ade80]/15 text-[#4ade80]"
                : "bg-[rgba(132,0,255,0.15)] text-[rgba(186,120,255,1)]"
            }`}
          >
            {isAuthError ? "EXPIRED" : hasError ? "OFFLINE" : isReady ? "LIVE" : "SYNCING"}
          </span>
        </div>
      </motion.div>

      {/* Rings + core mark */}
      <div className="relative w-64 h-64 flex items-center justify-center">
        {!hasError &&
          [0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border"
              style={{
                borderColor:
                  i % 2 === 0
                    ? "rgba(74,222,128,0.35)"
                    : "rgba(132,0,255,0.35)",
              }}
              initial={{ width: 80, height: 80, opacity: 0.8 }}
              animate={{
                width: [80, 260],
                height: [80, 260],
                opacity: [0.8, 0],
              }}
              transition={{
                duration: 2.4,
                repeat: isReady ? 0 : Infinity,
                ease: "easeOut",
                delay: i * 0.8,
              }}
            />
          ))}

        <motion.div
          animate={
            hasError
              ? { scale: 1 }
              : { scale: isReady ? 1.1 : [1, 1.06, 1] }
          }
          transition={{
            duration: 1.8,
            repeat: isReady || hasError ? 0 : Infinity,
            ease: "easeInOut",
          }}
          className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-colors duration-500 ${
            hasError
              ? "bg-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]"
              : "bg-gradient-to-br from-[#4ade80] to-[rgba(132,0,255,0.9)] shadow-[0_0_40px_rgba(74,222,128,0.25)]"
          }`}
        >
          <span
            className={`font-extrabold text-xl ${
              hasError ? "text-red-400" : "text-[#050507]"
            }`}
          >
            {hasError ? "!" : "CV"}
          </span>
        </motion.div>
      </div>

      {/* Real progress bar */}
      <div className="absolute bottom-32 w-full max-w-[220px] px-2">
        <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${
              hasError ? "bg-red-500" : "bg-[#4ade80]"
            }`}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Live status text — actually reflects real state */}
      <motion.div className="absolute bottom-20 text-center px-4">
        <AnimatePresence mode="wait">
          <motion.p
            key={activeLabel}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className={`text-xs ${
              hasError ? "text-red-400" : "text-gray-500"
            }`}
          >
            {isAuthError
              ? "Your session expired. Redirecting to login…"
              : hasError
              ? "Check your internet connection and try again."
              : `${activeLabel}…`}
          </motion.p>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default Loader;