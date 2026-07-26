// src/lib/socket.js

import { io } from "socket.io-client";
import useChatStore from "../store/useChatStore";

let socket = null;

export const connectSocket = () => {
  const token = localStorage.getItem("accessToken");

  if (!token) return;

  socket = io("http://localhost:5001", {
    auth: {
      token,
    },
    withCredentials: true,
  });

  socket.on("connect", () => {
    console.log("🟢 Socket Connected");
  });

  socket.on("disconnect", () => {
    console.log("🔴 Socket Disconnected");
  });

  // NEW MESSAGE
  socket.on("newMessage", (message) => {
    useChatStore.getState().addIncomingMessage(message);

    // Browser notification
    if (document.hidden && Notification.permission === "granted") {
      new Notification("New Message", {
        body: message.text,
      });
    }
  });

  // DELIVERY / READ STATUS
  socket.on("messageStatusUpdate", (data) => {
    console.log("STATUS UPDATE:", data);

    useChatStore.getState().updateMessageStatus(data);
  });

  // ONLINE
  socket.on("userOnline", (userId) => {
    useChatStore.getState().setUserOnline(userId);
  });

  // OFFLINE
  socket.on("userOffline", ({ userId }) => {
    useChatStore.getState().setUserOffline(userId);
  });

  // TYPING
  socket.on("userTyping", ({ userId }) => {
    useChatStore.getState().setTyping(userId, true);
  });

  socket.on("userStoppedTyping", ({ userId }) => {
    useChatStore.getState().setTyping(userId, false);
  });

  return socket;
};

export default socket;
