import { useEffect, useRef } from "react";
import { ArrowLeft, Phone, Video } from "lucide-react";
import { useChat } from "../../hooks/useChat";
import useChatStore from "../../store/useChatStore";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import MessageInput from "./MessageInput";

function ChatWindow() {
  const { selectedChat } = useChatStore();
  const currentUserId = localStorage.getItem("userId");
  const currentUser = { _id: currentUserId };
  const participants = Array.isArray(selectedChat?.participants)
    ? selectedChat.participants
    : [];

  if (!selectedChat || !currentUserId || participants.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        Select a conversation to start chatting.
      </div>
    );
  }

  const otherUser = participants.find((p) => p._id !== currentUser._id) ||
    participants[0] || { _id: "", name: "Unknown" };

  const {
    messages,
    loading,
    otherUserTyping,
    sendMessage,
    markAsRead,
    sendTyping,
  } = useChat(selectedChat._id, currentUser._id, otherUser._id);

  const scrollRef = useRef(null);
  const isOnline = false;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, otherUserTyping]);

  // Mark unread messages from the other person as read once they're visible.
  // Simple version: mark all unread on mount/update. For a more precise
  // "only when actually scrolled into view" behavior, swap this for an
  // IntersectionObserver per message bubble.
  useEffect(() => {
    messages
      .filter((m) => m.sender === otherUser._id && !m.readAt)
      .forEach((m) => markAsRead(m._id));
  }, [messages, otherUser._id, markAsRead]);

  return (
    <div className="flex flex-col h-full bg-[#0B0B14]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <button className="md:hidden text-gray-400" aria-hidden="true">
          <ArrowLeft size={20} />
        </button>

        <div className="relative">
          <img
            src={otherUser.avatar || "/default-avatar.png"}
            alt={otherUser.name}
            className="w-10 h-10 rounded-full object-cover"
          />
          {isOnline && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0B0B14]" />
          )}
        </div>

        <div>
          <p className="text-white font-semibold text-sm">{otherUser.name}</p>
          <p className="text-xs text-gray-500">
            {isOnline
              ? "Online"
              : otherUser.lastSeen
                ? `Last seen ${new Date(otherUser.lastSeen).toLocaleString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    month: "short",
                    day: "numeric",
                  })}`
                : "Offline"}
          </p>
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <button
            className="text-gray-400 hover:text-white transition p-2"
            aria-label="Voice call"
          >
            <Phone size={18} />
          </button>
          <button
            className="text-gray-400 hover:text-white transition p-2"
            aria-label="Video call"
          >
            <Video size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-3">
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            Loading messages…
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            Say hi to {otherUser.name} 👋
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message._id}
              message={message}
              isOwnMessage={message.sender === currentUser._id}
            />
          ))
        )}

        {otherUserTyping && <TypingIndicator name={otherUser.name} />}

        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <MessageInput onSend={sendMessage} onTyping={sendTyping} />
    </div>
  );
}

export default ChatWindow;
