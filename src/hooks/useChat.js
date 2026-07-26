import { useEffect, useRef, useState, useCallback } from "react";
import socket from "../lib/socket";
import api from "../lib/api"; // your axios instance — adjust path if named differently

/**
 * useChat
 *
 * Handles everything for one open conversation:
 *  - loading message history
 *  - sending messages (optimistic UI, then reconciled with server ack)
 *  - receiving new messages in real time
 *  - delivery/read receipt updates
 *  - typing indicator (both sending your own + receiving theirs)
 *
 * @param {string} conversationId
 * @param {string} currentUserId
 * @param {string} otherUserId - the person you're chatting with
 */
export function useChat(conversationId, currentUserId, otherUserId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  // --- Load message history when the conversation changes ---
  useEffect(() => {
    if (!conversationId) return;

    let cancelled = false;
    setLoading(true);

    api
      .get(`/api/chat/messages/${conversationId}`)
      .then((res) => {
        if (!cancelled) setMessages(res.data.data);
      })
      .catch((err) => console.error("Failed to load messages:", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  // --- Listen for real-time events scoped to this conversation ---
  useEffect(() => {
    function handleNewMessage(message) {
      if (message.conversationId !== conversationId) return;
      setMessages((prev) => [...prev, message]);

      // We received it live, so it's delivered by definition.
      // Read happens separately when it actually enters the viewport
      // (call markAsRead from the message list's intersection observer).
    }

    function handleStatusUpdate({ messageId, deliveredAt, readAt }) {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId
            ? {
                ...m,
                deliveredAt: deliveredAt ?? m.deliveredAt,
                readAt: readAt ?? m.readAt,
              }
            : m
        )
      );
    }

    function handleTyping({ conversationId: cid, userId }) {
      if (cid === conversationId && userId === otherUserId) {
        setOtherUserTyping(true);
      }
    }

    function handleStopTyping({ conversationId: cid, userId }) {
      if (cid === conversationId && userId === otherUserId) {
        setOtherUserTyping(false);
      }
    }

    socket.on("newMessage", handleNewMessage);
    socket.on("messageStatusUpdate", handleStatusUpdate);
    socket.on("userTyping", handleTyping);
    socket.on("userStoppedTyping", handleStopTyping);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("messageStatusUpdate", handleStatusUpdate);
      socket.off("userTyping", handleTyping);
      socket.off("userStoppedTyping", handleStopTyping);
    };
  }, [conversationId, otherUserId]);

  // --- Send a message with optimistic UI ---
  const sendMessage = useCallback(
    ({ type = "text", text = "", mediaUrl = "", fileName = "", fileSize = 0 }) => {
      const tempId = `temp-${Date.now()}`;

      const optimisticMessage = {
        _id: tempId,
        conversationId,
        sender: currentUserId,
        receiver: otherUserId,
        type,
        text,
        mediaUrl,
        fileName,
        fileSize,
        createdAt: new Date().toISOString(),
        deliveredAt: null,
        readAt: null,
        _pending: true, // lets the UI show a clock/sending state if you want
      };

      setMessages((prev) => [...prev, optimisticMessage]);

      socket.emit(
        "sendMessage",
        { conversationId, receiverId: otherUserId, type, text, mediaUrl, fileName, fileSize },
        (response) => {
          if (response.success) {
            // Swap the optimistic message for the real one from the server
            setMessages((prev) =>
              prev.map((m) => (m._id === tempId ? response.message : m))
            );
          } else {
            // Mark it as failed so the UI can show a retry option
            setMessages((prev) =>
              prev.map((m) =>
                m._id === tempId ? { ...m, _failed: true, _pending: false } : m
              )
            );
          }
        }
      );
    },
    [conversationId, currentUserId, otherUserId]
  );

  // --- Mark a specific message as read (call this from an IntersectionObserver) ---
  const markAsRead = useCallback(
    (messageId) => {
      socket.emit("markAsRead", { messageId, senderId: otherUserId });
    },
    [otherUserId]
  );

  // --- Typing indicator senders, debounced ---
  const sendTyping = useCallback(() => {
    socket.emit("typing", { conversationId, receiverId: otherUserId });

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stopTyping", { conversationId, receiverId: otherUserId });
    }, 2000); // auto stop-typing after 2s of no keystrokes
  }, [conversationId, otherUserId]);

  return {
    messages,
    loading,
    otherUserTyping,
    sendMessage,
    markAsRead,
    sendTyping,
  };
}