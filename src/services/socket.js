import { io } from "socket.io-client";
import { API_ORIGIN } from "../config/api";
import useChatStore from "../store/useChatStore";
import axiosInstance from "./axiosInstance"; // adjust path to your actual axios instance

const SOCKET_URL = API_ORIGIN;

let socket = null;
let isRefreshing = false;

export const connectSocket = () => {
  const token = localStorage.getItem("accessToken");

  if (!token) return null;

  // Prevent duplicate connections
  if (socket?.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    // Function form: re-reads localStorage on EVERY connect/reconnect attempt,
    // instead of freezing the token at the moment connectSocket() first ran.
    auth: (cb) => {
      const freshToken = localStorage.getItem("accessToken");
      cb({ token: freshToken });
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

  socket.on("connect_error", async (err) => {
    console.error("Socket Error:", err.message);

    if (err.message === "Invalid or expired token" || err.message === "No auth token provided") {
      if (isRefreshing) return;
      isRefreshing = true;

      try {
        // TODO: point this at your real refresh endpoint.
        // It should read the refresh token from an httpOnly cookie
        // and return a fresh access token.
        const { data } = await axiosInstance.post("/auth/refresh-token");

        if (data?.accessToken) {
          localStorage.setItem("accessToken", data.accessToken);
          socket.connect(); // retry — auth() callback above picks up the new token
        } else {
          throw new Error("No access token returned from refresh");
        }
      } catch (refreshError) {
        console.error("Token refresh failed, logging out:", refreshError.message);
        disconnectSocket();
        localStorage.removeItem("accessToken");
        window.location.href = "/login";
      } finally {
        isRefreshing = false;
      }
    }
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

    if (document.hidden && Notification.permission === "granted") {
      new Notification(message?.sender?.name || "New Message", {
        body: message.text || "Sent you a message",
      });
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