import { MessageCircle, Search } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../lib/api";
import socket from "../../lib/socket";

function timeAgo(dateString) {
  if (!dateString) return "";
  let diff = Date.now() - new Date(dateString).getTime();
  let minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  let hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  let days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateString).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function ChatListItem({
  conversation,
  currentUserId,
  onlineUserIds,
  onSelect,
}) {
  let otherUser =
    conversation.participants.find(
      (participant) => participant._id !== currentUserId,
    ) || conversation.participants[0];
  let isOnline = onlineUserIds?.has(otherUser._id);
  let last = conversation.lastMessage;
  let isUnread = last && !last.readAt && last.sender !== currentUserId;
  return (
    <button
      onClick={() => onSelect(conversation)}
      className="flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left transition hover:bg-white/[.045]"
    >
      <span className="relative grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#14F1D9] to-[#6366F1] text-sm font-bold text-[#071318]">
        {otherUser.avatar ? (
          <img
            src={otherUser.avatar}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          (otherUser.name || "U").slice(0, 1).toUpperCase()
        )}
        {isOnline && (
          <i className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[var(--cv-base)] bg-[#14F1D9]" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-30">
          <b className="truncate text-sm text-[var(--cv-text)]">
            {otherUser.name}
          </b>
          <small className="shrink-0 text-[10px] text-[var(--cv-muted)]">
            {timeAgo(last?.createdAt)}
          </small>
        </span>
        <span className="mt-1 flex items-center justify-between gap-2">
          <small
            className={`truncate text-xs ${isUnread ? "text-[var(--cv-text)]" : "text-[var(--cv-muted)]"}`}
          >
            {last
              ? last.type === "text"
                ? last.text
                : last.type === "image"
                  ? "Photo"
                  : last.type === "video"
                    ? "Video"
                    : "Voice"
              : "Say hello 👋"}
          </small>
          {isUnread && <i className="h-2 w-2 rounded-full bg-[#14F1D9]" />}
        </span>
      </span>
    </button>
  );
}

function ChatList({
  currentUser,
  onlineUserIds,
  onSelectConversation,
  onNewChat,
}) {
  let [conversations, setConversations] = useState([]);
  let [search, setSearch] = useState("");
  let [tab, setTab] = useState("all");
  let [loading, setLoading] = useState(true);
  useEffect(() => {
    api
      .get("/api/chat/conversations")
      .then((response) => setConversations(response.data.data || []))
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    let handleNewMessage = (message) =>
      setConversations((items) => {
        let updated = items.map((conversation) =>
          conversation._id === message.conversationId
            ? { ...conversation, lastMessage: message }
            : conversation,
        );
        return updated.sort(
          (a, b) =>
            new Date(b.lastMessage?.createdAt || b.updatedAt) -
            new Date(a.lastMessage?.createdAt || a.updatedAt),
        );
      });
    socket.on("newMessage", handleNewMessage);
    return () => socket.off("newMessage", handleNewMessage);
  }, []);
  let filtered = conversations.filter((conversation) => {
    let otherUser =
      conversation.participants.find(
        (participant) => participant._id !== currentUser._id,
      ) || conversation.participants[0];
    let matchesSearch = otherUser.name
      .toLowerCase()
      .includes(search.toLowerCase());
    let matchesTab =
      tab === "all" ||
      (tab === "unread" &&
        conversation.lastMessage &&
        !conversation.lastMessage.readAt &&
        conversation.lastMessage.sender !== currentUser._id);
    return matchesSearch && matchesTab;
  });
  return (
    <aside className="flex h-full w-full flex-col bg-[var(--cv-base)]">
      <header className="border-b border-white/[.07] px-4 py-5">
        <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#14F1D9]">
          Your space
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Chats</h1>
        <div className="cv-focus mt-4 flex items-center gap-2 rounded-[10px] border border-white/10 bg-white/[.045] px-3">
          <Search size={16} className="text-[var(--cv-muted)]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search"
            className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-[var(--cv-muted)]"
          />
        </div>
      </header>
      <div className="flex gap-2 px-4 py-3">
        <button
          onClick={() => setTab("all")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${tab === "all" ? "bg-[#14F1D9] text-[#071318]" : "bg-white/[.04] text-[var(--cv-muted)]"}`}
        >
          All
        </button>
        <button
          onClick={() => setTab("unread")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${tab === "unread" ? "bg-[#14F1D9] text-[#071318]" : "bg-white/[.04] text-[var(--cv-muted)]"}`}
        >
          Unread
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-20">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-[var(--cv-muted)]">
            Loading chats…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center text-sm text-[var(--cv-muted)]">
            <p>No conversations yet</p>
            <button onClick={onNewChat} className="text-[#14F1D9]">
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
              onSelect={onSelectConversation}
            />
          ))
        )}
      </div>
      <button
        onClick={onNewChat}
        className="absolute bottom-24 right-5 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-[#14F1D9] to-[#6366F1] text-[#071318] shadow-[0_18px_38px_rgba(20,241,217,.35)]"
        aria-label="New chat"
      >
        <MessageCircle size={22} />
      </button>
    </aside>
  );
}

export default ChatList;
