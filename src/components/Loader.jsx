import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, LockKeyhole, MessageCircle, RefreshCw, WifiOff } from "lucide-react";

function Loader({ socket, onReady, onAuthError, syncChats }) {
  const [online, setOnline] = useState(navigator.onLine);
  const [socketStatus, setSocketStatus] = useState(socket?.connected ? "connected" : "connecting");
  const [syncStatus, setSyncStatus] = useState(socket ? "waiting" : "complete");
  const [error, setError] = useState(null);
  const readyFired = useRef(false);
  const authErrorFired = useRef(false);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      setError(null);
      if (socket && !socket.connected) socket.connect();
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return undefined;

    const handleConnect = () => {
      setSocketStatus("connected");
      setError(null);
    };
    const handleDisconnect = () => setSocketStatus("connecting");
    const handleConnectError = (connectionError) => {
      const message = connectionError?.message || "Unable to reach ChatVerse";
      const isAuthError = ["Invalid or expired token", "No auth token provided"].includes(message);

      // The socket client is refreshing an expired access token. Do not log
      // the user out while that recoverable request is in flight.
      if (isAuthError && socket.authRefreshInProgress) {
        setSocketStatus("connecting");
        setError(null);
        return;
      }

      setSocketStatus(isAuthError ? "auth_error" : "error");
      setError(message);
    };

    const handleAuthRefreshFailed = () => {
      setSocketStatus("auth_error");
      setError("Your session has expired");
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    window.addEventListener("chatverse:auth-refresh-failed", handleAuthRefreshFailed);
    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      window.removeEventListener("chatverse:auth-refresh-failed", handleAuthRefreshFailed);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket || socketStatus !== "connected" || syncStatus !== "waiting") return;

    let cancelled = false;
    let timeoutId;
    setSyncStatus("syncing");
    // Conversation history is helpful but must never prevent a connected user
    // from entering the app. A proxy can leave an XHR pending indefinitely.
    const syncTimeout = new Promise((resolve) => {
      timeoutId = window.setTimeout(resolve, 7000);
    });

    Promise.race([Promise.resolve(syncChats?.()), syncTimeout])
      .then(() => {
        if (!cancelled) setSyncStatus("complete");
      })
      .catch(() => {
        if (!cancelled) setSyncStatus("complete");
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  // Do not depend on `syncStatus`: changing it to "syncing" would otherwise
  // run this effect's cleanup immediately and cancel the active sync.
  }, [socket, socketStatus, syncChats]);

  const isAuthError = socketStatus === "auth_error";
  const isReady = online && socketStatus === "connected" && syncStatus === "complete";

  useEffect(() => {
    if (isReady && !readyFired.current) {
      readyFired.current = true;
      onReady?.();
    }
  }, [isReady, onReady]);

  useEffect(() => {
    if (isAuthError && !authErrorFired.current) {
      authErrorFired.current = true;
      onAuthError?.();
    }
  }, [isAuthError, onAuthError]);

  const retry = useCallback(() => {
    if (!navigator.onLine) return;
    setError(null);
    setSocketStatus("connecting");
    if (socket) {
      socket.connect();
    } else {
      setSyncStatus("complete");
    }
  }, [socket]);

  const steps = [
    { label: "Securing connection", done: online },
    { label: "Connecting to ChatVerse", done: socketStatus === "connected" },
    { label: "Syncing your chats", done: syncStatus === "complete" },
  ];
  const completedSteps = steps.filter((step) => step.done).length;
  const progress = Math.round((completedSteps / steps.length) * 100);
  const activeStep = steps.find((step) => !step.done)?.label || "Ready";
  const hasConnectionError = !online || socketStatus === "error";

  return (
    <main className="min-h-screen bg-[#111b21] px-6 text-[#e9edef] flex items-center justify-center">
      <section className="w-full max-w-sm text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#25d366] shadow-[0_8px_34px_rgba(37,211,102,0.25)]"
        >
          {hasConnectionError || isAuthError ? <WifiOff size={32} /> : <MessageCircle size={38} fill="currentColor" className="text-[#111b21]" />}
        </motion.div>

        <h1 className="mt-7 text-2xl font-semibold tracking-tight">ChatVerse</h1>
        <p className="mt-2 text-sm text-[#8696a0]">
          {isAuthError ? "Your session has expired" : hasConnectionError ? "Waiting for a secure connection" : "Connecting securely"}
        </p>

        <div className="mt-10 overflow-hidden rounded-full bg-[#202c33]">
          <motion.div
            className="h-1.5 rounded-full bg-[#25d366]"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          />
        </div>

        <div className="mt-6 space-y-4 text-left">
          {steps.map((step) => (
            <div key={step.label} className="flex items-center gap-3 text-sm">
              <span className={`flex h-5 w-5 items-center justify-center rounded-full ${step.done ? "bg-[#25d366] text-[#111b21]" : "border border-[#54656f] text-[#8696a0]"}`}>
                {step.done ? <Check size={14} strokeWidth={3} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
              </span>
              <span className={step.done ? "text-[#e9edef]" : "text-[#8696a0]"}>{step.label}</span>
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeStep}-${error || "ok"}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-9 min-h-10 text-sm text-[#8696a0]"
          >
            {isAuthError ? "Please sign in again to continue." : hasConnectionError ? error || "Check your internet connection, then retry." : `${activeStep}…`}
          </motion.div>
        </AnimatePresence>

        {(hasConnectionError || isAuthError) && !isAuthError && (
          <button type="button" onClick={retry} className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#202c33] px-5 py-2.5 text-sm font-medium text-[#e9edef] transition hover:bg-[#2a3942]">
            <RefreshCw size={16} /> Retry
          </button>
        )}

        <p className="mt-12 inline-flex items-center gap-2 text-xs text-[#667781]"><LockKeyhole size={13} /> End-to-end connection protected</p>
      </section>
    </main>
  );
}

export default Loader;
