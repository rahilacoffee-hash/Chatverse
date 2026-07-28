import { useCallback, useEffect, useState } from "react";

import AppRoutes from "./routes/AppRoutes";

import { ToastContainer } from "react-toastify";

import Loader from "./components/Loader";

import socket, {
  connectSocket,
} from "./lib/socket";

import useChatStore from "./store/useChatStore";
import useSettingsStore from "./store/useSettingsStore";
import VoiceCallManager from "./components/call/VoiceCallManager";

function App() {
  const theme = useSettingsStore((state) => state.theme);
  const [ready, setReady] =
    useState(() => !localStorage.getItem("accessToken"));

  const syncChats = useCallback(
    () => useChatStore.getState().fetchConversations(),
    []
  );

  const handleAuthError = useCallback(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setReady(true);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    if (!token) return undefined;

    // Event handlers live in lib/socket so there is exactly one handler per
    // browser session. This effect only starts the shared connection.
    connectSocket();

    if (Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, []);

  return (
    <>
      <VoiceCallManager />
      {!ready ? (
        <Loader
          socket={socket}
          onReady={() =>
            setReady(true)
          }
          onAuthError={handleAuthError}
          syncChats={syncChats}
        />
      ) : (
        <>
          <ToastContainer />
          <AppRoutes />
        </>
      )}
    </>
  );
}

export default App;
