import { io } from "socket.io-client";
import { API_ORIGIN } from "../config/api";
import useChatStore from "../store/useChatStore";

const SOCKET_URL = API_ORIGIN;

let socket = null;

export const connectSocket = () => {
  const token = localStorage.getItem("accessToken");

  if (!token) return null;

  // Prevent duplicate connections
  if (socket?.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: {
      token,
    },
    transports: ["websocket"],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  // Remove old listeners
  socket.removeAllListeners();

  socket.on("connect", () => {
    console.log("🟢 Socket Connected:", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("🔴 Socket Disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.error("Socket Error:", err.message);
  });

  // ==========================
  // ONLINE USERS
  // ==========================

  socket.on("onlineUsers", (users) => {
    useChatStore.getState().setOnlineUsers(users);
  });

  socket.on("userOnline", (userId) => {
    useChatStore.getState().setUserOnline(userId);
  });

  socket.on("userOffline", ({ userId, lastSeen }) => {
    const store = useChatStore.getState();

    store.setUserOffline(userId);

    if (store.updateUserLastSeen) {
      store.updateUserLastSeen(userId, lastSeen);
    }
  });

  // ==========================
  // NEW MESSAGE
  // ==========================

  socket.on("newMessage", (message) => {
    const store = useChatStore.getState();

    store.addIncomingMessage(message);

    if (
      document.hidden &&
      Notification.permission === "granted"
    ) {
      new Notification(
        message?.sender?.name || "New Message",
        {
          body: message.text || "Sent you a message",
        }
      );
    }
  });

  // ==========================
  // MESSAGE STATUS
  // ==========================

  socket.on("messageStatusUpdate", (data) => {
    useChatStore.getState().updateMessageStatus(data);
  });

  // ==========================
  // TYPING
  // ==========================

  socket.on("userTyping", ({ userId }) => {
    useChatStore.getState().setTyping(userId, true);
  });

  socket.on("userStoppedTyping", ({ userId }) => {
    useChatStore.getState().setTyping(userId, false);
  });

  // ==========================
  // CALLS
  // ==========================

  socket.on("incomingCall", (data) => {
    useChatStore.getState().setIncomingCall(data);
  });

  socket.on("callAnswered", ({ answer }) => {
    useChatStore.getState().setCallAnswer(answer);
  });

  socket.on("iceCandidate", (candidate) => {
    useChatStore.getState().addIceCandidate(candidate);
  });

  socket.on("callEnded", () => {
    useChatStore.getState().endCall();
  });

  // ==========================
  // REFRESH CHAT LIST
  // ==========================

  socket.on("conversationUpdated", () => {
    const store = useChatStore.getState();

    if (store.fetchConversations) {
      store.fetchConversations();
    }
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (!socket) return;

  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
};

export default socket;
