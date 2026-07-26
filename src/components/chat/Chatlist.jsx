import { useEffect, useState } from "react";
import { Search, Phone, Compass, MessageCircle, User } from "lucide-react";
import api from "../lib/api";
import socket from "../lib/socket";

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString([], { month: "short", day: "numeric" });
}

function ChatListItem({ conversation, currentUserId, onlineUserIds, onClick }) {
  const otherUser = conversation.participants.find((p) => p._id !== currentUserId);
  const isOnline = onlineUserIds?.has(otherUser._id);
  const last = conversation.lastMessage;
  const isUnread = last && !last.readAt && last.sender !== currentUserId;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition rounded-2xl"
    >
      <div className="relative shrink-0">
        <img
          src={otherUser.avatar || "/default-avatar.png"}
          alt={otherUser.name}
          className="w-12 h-12 rounded-full object-cover"
        />
        {isOnline && (
          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0B0B14]" />
        )}
      </div>

      <div className="flex-1 text-left min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-white font-medium text-sm truncate">{otherUser.name}</p>
          <span className="text-[11px] text-gray-500 shrink-0 ml-2">
            {timeAgo(last?.createdAt)}
          </span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p
            className={`text-xs truncate ${
              isUnread ? "text-gray-200 font-medium" : "text-gray-500"
            }`}
          >
            {last
              ? last.type === "text"
                ? last.text
                : last.type === "image"
                ? "📷 Photo"
                : last.type === "video"
                ? "🎥 Video"
                : "📄 Document"
              : "Say hello 👋"}
          </p>
          {isUnread && (
            <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0 ml-2" />
          )}
        </div>
      </div>
    </button>
  );
}

function ChatList({ currentUser, onlineUserIds, onSelectConversation, onNewChat }) {
  const [conversations, setConversations] = useState([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all"); // all | unread | groups
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/api/chat/conversations")
      .then((res) => setConversations(res.data.data))
      .catch((err) => console.error("Failed to load conversations:", err))
      .finally(() => setLoading(false));
  }, []);

  // Keep the list's lastMessage preview live without a full refetch
  useEffect(() => {
    function handleNewMessage(message) {
      setConversations((prev) => {
        const updated = prev.map((c) =>
          c._id === message.conversationId ? { ...c, lastMessage: message } : c
        );
        // bump the conversation with new activity to the top
        return updated.sort((a, b) => {
          const aTime = a.lastMessage?.createdAt || a.updatedAt;
          const bTime = b.lastMessage?.createdAt || b.updatedAt;
          return new Date(bTime) - new Date(aTime);
        });
      });
    }

    socket.on("newMessage", handleNewMessage);
    return () => socket.off("newMessage", handleNewMessage);
  }, []);

  const filtered = conversations.filter((c) => {
    const otherUser = c.participants.find((p) => p._id !== currentUser._id);
    const matchesSearch = otherUser.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesTab =
      tab === "all" ||
      (tab === "unread" &&
        c.lastMessage &&
        !c.lastMessage.readAt &&
        c.lastMessage.sender !== currentUser._id);
    return matchesSearch && matchesTab;
  });

  return (
    <div className="flex flex-col h-full bg-[#0B0B14]">
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <h1 className="text-white text-2xl font-bold">Chats</h1>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 bg-white/5 rounded-full px-4 py-2.5">
          <Search size={16} className="text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 px-4 pb-3">
        {[
          { key: "all", label: "All" },
          { key: "unread", label: "Unread" },
          { key: "groups", label: "Groups" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${
              tab === t.key
                ? "bg-violet-600 text-white"
                : "bg-white/5 text-gray-400"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2">
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            Loading chats…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm gap-2">
            <p>No conversations yet</p>
            <button
              onClick={onNewChat}
              className="text-violet-400 text-sm font-medium"
            >
              Start a new chat
            </button>
          </div>
        ) : (
          filtered.map((conversation) => (
            <ChatListItem
              key={conversation._id}
              conversation={conversation}
              currentUserId={currentUser._id}
              onlineUserIds={onlineUserIds}
              onClick={() => onSelectConversation(conversation)}
            />
          ))
        )}
      </div>

      {/* Floating new chat button */}
      <button
        onClick={onNewChat}
        className="absolute bottom-24 right-5 w-14 h-14 rounded-full bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-600/30"
        aria-label="New chat"
      >
        <MessageCircle size={22} className="text-white" />
      </button>
    </div>
  );
}

export default ChatList;