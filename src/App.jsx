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
    const token =
      localStorage.getItem(
        "accessToken"
      );

    if (!token) return undefined;

    connectSocket();

    socket.on("connect", () => {
      console.log(
        "Socket Connected:",
        socket.id
      );
    });

    socket.on(
      "onlineUsers",
      (users) => {
        useChatStore
          .getState()
          .setOnlineUsers(users);
      }
    );

    socket.on(
      "userOnline",
      (userId) => {
        useChatStore
          .getState()
          .setUserOnline(userId);
      }
    );

    socket.on(
      "userOffline",
      ({ userId }) => {
        useChatStore
          .getState()
          .setUserOffline(userId);
      }
    );

    socket.on(
      "userTyping",
      ({ userId }) => {
        useChatStore
          .getState()
          .setTyping(
            userId,
            true
          );
      }
    );

    socket.on(
      "userStoppedTyping",
      ({ userId }) => {
        useChatStore
          .getState()
          .setTyping(
            userId,
            false
          );
      }
    );

    socket.on(
      "newMessage",
      (message) => {
        useChatStore
          .getState()
          .addIncomingMessage(
            message
          );

        if (
          document.hidden &&
          Notification.permission ===
            "granted"
        ) {
          new Notification(
            "New Message",
            {
              body: message.text,
            }
          );
        }
      }
    );

    socket.on(
      "messageStatusUpdate",
      (data) => {
        useChatStore
          .getState()
          .updateMessageStatus(
            data
          );
      }
    );

    if (
      Notification.permission !==
      "granted"
    ) {
      Notification.requestPermission();
    }

    return () => {
      socket.off("onlineUsers");
      socket.off("userOnline");
      socket.off("userOffline");
      socket.off("userTyping");
      socket.off("userStoppedTyping");
      socket.off("newMessage");
      socket.off(
        "messageStatusUpdate"
      );
    };
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
