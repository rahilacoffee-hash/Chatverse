import { useEffect, useState } from "react";
import { MessageCircle, Plus, Search } from "lucide-react";
import {
  FiArchive,
  FiBellOff,
  FiBookmark,
  FiChevronRight,
  FiMoreHorizontal,
  FiRotateCcw,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import BottomNav from "../../components/navigations/BottomNav";
import ChatScreen from "./ChatScreen";
import { getStatuses } from "../../services/statusService";
import useChatStore from "../../store/useChatStore";

function chatTitle(chat, user) {
  return chat.isGroup
    ? chat.groupName || "Group chat"
    : user?.name || "Unknown contact";
}

function chatPreview(chat) {
  let message = chat.lastMessage;
  if (!message) return "Start a conversation";
  if (message.type === "image") return "Photo";
  if (message.type === "audio") return "Voice message";
  return message.text || "Shared a message";
}

function formatChatTime(value) {
  if (!value) return "";
  let date = new Date(value);
  let today = new Date();
  if (date.toDateString() === today.toDateString())
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function ChatRow({
  chat,
  currentUserId,
  onlineUsers,
  statusAuthorIds,
  onOpen,
  onAction,
}) {
  let user = chat.participants?.find(
    (participant) => String(participant?._id) !== String(currentUserId),
  );
  let title = chatTitle(chat, user);
  let preview = chatPreview(chat);
  let sender =
    chat.lastMessage?.sender?.name ||
    chat.participants?.find(
      (participant) =>
        String(participant?._id) === String(chat.lastMessage?.sender),
    )?.name;
  let unread = Number(chat.unreadCount || 0);
  let isOnline = !chat.isGroup && onlineUsers.includes(user?._id);
  let hasStatus = !chat.isGroup && statusAuthorIds.has(String(user?._id));
  return (
    <article className="group relative border-b border-white/[.055]">
      <button
        onClick={() => onOpen(chat)}
        className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-white/[.045] active:bg-white/[.07]"
      >
        <span
          className={`relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full p-0.5 ${hasStatus ? "bg-gradient-to-br from-[#14F1D9] via-[#6366F1] to-[#8B5CF6]" : "bg-white/10"}`}
        >
          {user?.avatar && !chat.isGroup ? (
            <img
              src={user.avatar}
              alt=""
              className="h-full w-full rounded-full object-cover"
            />
          ) : chat.groupAvatar ? (
            <img
              src={chat.groupAvatar}
              alt=""
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <span className="grid h-full w-full place-items-center rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-sm font-bold text-white">
              {title.slice(0, 2).toUpperCase()}
            </span>
          )}
          {isOnline && (
            <i className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[var(--cv-base)] bg-[#14F1D9] shadow-[0_0_0_3px_rgba(20,241,217,.12)]" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block min-w-0">
            <strong
              className={`truncate text-[15px] ${unread ? "text-white" : "text-[var(--cv-text)]"}`}
            >
              {title}
            </strong>
          </span>
          <span className="mt-1 block truncate text-[13px]">
            <span
              className={`truncate text-[13px] ${unread ? "font-medium text-white/80" : "text-[var(--cv-muted)]"}`}
            >
              {chat.isGroup && sender ? `${sender}: ` : ""}
              {preview}
            </span>
          </span>
        </span>
        <span className="flex w-12 shrink-0 flex-col items-end gap-1 self-stretch pt-0.5">
          <time
            className={`text-[11px] leading-4 ${unread ? "font-medium text-[#14F1D9]" : "text-[var(--cv-muted)]"}`}
          >
            {formatChatTime(chat.lastMessage?.createdAt || chat.updatedAt)}
          </time>
          {unread > 0 && (
            <b
              className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] text-white ${chat.lastMessage?.text?.includes("@") ? "bg-[#F5A623] text-black" : "bg-[#14F1D9] text-[#071318]"}`}
            >
              {unread > 99 ? "99+" : unread}
            </b>
          )}
        </span>
        <button
          onClick={(event) => {
            event.stopPropagation();
            onAction(chat);
          }}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[var(--cv-muted)] opacity-0 transition hover:bg-white/10 hover:text-white group-hover:opacity-100"
          aria-label="Chat actions"
        >
          <FiMoreHorizontal />
        </button>
      </button>
    </article>
  );
}

function readStoredIds(key, fallback = []) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value)
      ? new Set(value.map(String))
      : new Set(fallback.map(String));
  } catch {
    return new Set(fallback.map(String));
  }
}

function writeStoredIds(key, values) {
  try {
    localStorage.setItem(key, JSON.stringify([...values]));
  } catch {
    // Ignore storage failures and keep the in-memory state working.
  }
}

function Chats() {
  let navigate = useNavigate();
  let [search, setSearch] = useState("");
  let [filter, setFilter] = useState("all");
  let [showArchived, setShowArchived] = useState(false);
  let [archivedChatIds, setArchivedChatIds] = useState(() =>
    readStoredIds("chatverse:archivedChats"),
  );
  let [pinnedChatIds, setPinnedChatIds] = useState(() =>
    readStoredIds("chatverse:pinnedChats"),
  );
  let [mutedChatIds, setMutedChatIds] = useState(() =>
    readStoredIds("chatverse:mutedChats"),
  );
  let [statusAuthorIds, setStatusAuthorIds] = useState(() => new Set());
  let {
    conversations,
    conversationsLoadedAt,
    fetchConversations,
    selectChat,
    selectedChat,
    onlineUsers,
  } = useChatStore();
  let currentUserId = localStorage.getItem("userId");
  let loading = conversationsLoadedAt === 0 && conversations.length === 0;

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);
  useEffect(() => {
    let active = true;
    getStatuses()
      .then((response) => {
        if (active)
          setStatusAuthorIds(
            new Set(
              (response.data.data || [])
                .map((status) => String(status.author?._id || status.author))
                .filter(Boolean),
            ),
          );
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  let isChatPinned = (chat) =>
    Boolean(chat?.pinned) || pinnedChatIds.has(String(chat?._id));
  let isChatMuted = (chat) => mutedChatIds.has(String(chat?._id));
  let isChatArchived = (chat) => archivedChatIds.has(String(chat?._id));

  let visible = conversations.filter((chat) => {
    if (!chat || isChatArchived(chat) !== showArchived) return false;
    let user = chat.participants?.find(
      (participant) => String(participant?._id) !== String(currentUserId),
    );
    let haystack =
      `${chatTitle(chat, user)} ${chatPreview(chat)} ${chat.lastMessage?.text || ""}`.toLowerCase();
    let matchesFilter =
      filter === "all" ||
      (filter === "unread" && Number(chat.unreadCount || 0) > 0) ||
      (filter === "groups" && chat.isGroup);
    return matchesFilter && haystack.includes(search.toLowerCase());
  });
  let pinned = visible.filter((chat) => isChatPinned(chat));
  let openChat = (chat) => {
    selectChat(chat);
    if (window.matchMedia("(max-width: 767px)").matches) navigate("/chat");
  };
  let archiveChat = (chat) => {
    setArchivedChatIds((current) => {
      const next = new Set(current);
      next.add(String(chat._id));
      writeStoredIds("chatverse:archivedChats", next);
      return next;
    });
    setShowArchived(false);
    toast(
      ({ closeToast }) => (
        <div className="flex items-center gap-3">
          <span>Chat archived</span>
          <button
            onClick={() => {
              setArchivedChatIds((current) => {
                const next = new Set(current);
                next.delete(String(chat._id));
                writeStoredIds("chatverse:archivedChats", next);
                return next;
              });
              closeToast();
            }}
            className="flex items-center gap-1 text-[#14F1D9]"
          >
            <FiRotateCcw /> Undo
          </button>
        </div>
      ),
      { autoClose: 5000 },
    );
  };
  let togglePinChat = (chat) => {
    const id = String(chat._id);
    setPinnedChatIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      writeStoredIds("chatverse:pinnedChats", next);
      return next;
    });
  };

  let toggleMuteChat = (chat) => {
    const id = String(chat._id);
    setMutedChatIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      writeStoredIds("chatverse:mutedChats", next);
      return next;
    });
  };

  let menuChat = (chat) => {
    const alreadyPinned = isChatPinned(chat);
    const alreadyMuted = isChatMuted(chat);
    return toast(
      ({ closeToast }) => (
        <div className="grid gap-2">
          <strong>{chatTitle(chat, chat.participants?.[0])}</strong>
          <button
            onClick={() => {
              closeToast();
              if (isChatArchived(chat)) {
                setArchivedChatIds((current) => {
                  const next = new Set(current);
                  next.delete(String(chat._id));
                  writeStoredIds("chatverse:archivedChats", next);
                  return next;
                });
              } else {
                archiveChat(chat);
              }
            }}
            className="flex items-center gap-2 text-left"
          >
            <FiArchive /> {isChatArchived(chat) ? "Unarchive" : "Archive"}
          </button>
          <button
            onClick={() => {
              closeToast();
              toggleMuteChat(chat);
            }}
            className="flex items-center gap-2 text-left"
          >
            <FiBellOff />{" "}
            {alreadyMuted ? "Unmute notifications" : "Mute notifications"}
          </button>
          <button
            onClick={() => {
              closeToast();
              togglePinChat(chat);
            }}
            className="flex items-center gap-2 text-left"
          >
            <FiBookmark /> {alreadyPinned ? "Unpin chat" : "Pin chat"}
          </button>
        </div>
      ),
      { autoClose: false, closeButton: false },
    );
  };

  return (
    <main className="cv-shell min-h-[100svh] pb-24 md:h-[100svh] md:overflow-hidden md:pb-0">
      <div className="flex h-full w-full md:border-x md:border-white/[.07]">
        <section className="block min-w-0 w-full shrink-0 border-r border-white/[.07] md:w-[420px] md:max-w-[420px] md:border-r md:border-white/[.07]">
          <header className="sticky top-0 z-30 border-b border-white/[.06] bg-[color-mix(in_srgb,var(--cv-base)_88%,transparent)] px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xl md:static">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/profile")}
                className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[#6366F1] to-[#14F1D9] text-xs font-bold text-white"
              >
                CV
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[var(--cv-muted)]">
                  Your space
                </p>
                <h1 className="text-2xl font-semibold">Chats</h1>
              </div>
              <button
                onClick={() => navigate("/new-chat")}
                className="grid h-10 w-10 place-items-center rounded-full bg-white/[.07] text-white hover:bg-white/10"
                aria-label="New chat"
              >
                <Plus size={19} />
              </button>
            </div>
            <div className="cv-focus mt-5 flex items-center rounded-[10px] border border-white/10 bg-white/[.045]">
              <Search size={17} className="ml-4 text-[var(--cv-muted)]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search people or messages"
                className="w-full bg-transparent px-3 py-3 text-sm outline-none placeholder:text-[var(--cv-muted)]"
              />
            </div>
            <div className="mt-4 flex gap-2">
              {[
                ["all", "All"],
                ["unread", "Unread"],
                ["groups", "Groups"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold ${filter === key ? "cv-gradient text-white" : "bg-white/[.05] text-[var(--cv-muted)]"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </header>
          <div className="md:h-[calc(100%-165px)] md:overflow-y-auto">
            {loading && (
              <div className="space-y-1 px-5 pt-3">
                {[1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className="flex animate-pulse items-center gap-3 py-4"
                  >
                    <span className="h-12 w-12 rounded-full bg-white/[.08]" />
                    <span className="flex-1">
                      <i className="block h-3 w-2/5 rounded bg-white/[.08]" />
                      <i className="mt-2 block h-3 w-3/5 rounded bg-white/[.05]" />
                    </span>
                  </div>
                ))}
              </div>
            )}
            {pinned.length > 0 && (
              <section className="border-b border-white/[.055] py-4">
                <p className="px-5 pb-3 text-[10px] font-semibold uppercase tracking-[.2em] text-[var(--cv-muted)]">
                  Pinned
                </p>
                <div className="flex gap-3 overflow-x-auto px-5 [scrollbar-width:none]">
                  {pinned.map((chat) => (
                    <button
                      key={chat._id}
                      onClick={() => openChat(chat)}
                      className="w-16 shrink-0 text-center"
                    >
                      <span className="mx-auto grid h-12 w-12 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-xs font-bold text-white">
                        {chat.groupAvatar ? (
                          <img
                            src={chat.groupAvatar}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          chatTitle(chat, chat.participants?.[0])
                            .slice(0, 2)
                            .toUpperCase()
                        )}
                      </span>
                      <span className="mt-1 block truncate text-[10px] text-[var(--cv-muted)]">
                        {chatTitle(chat, chat.participants?.[0])}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}
            {!showArchived && archivedChatIds.size > 0 && (
              <button
                onClick={() => setShowArchived(true)}
                className="flex w-full items-center gap-3 border-b border-white/[.055] px-5 py-4 text-left text-sm font-semibold transition hover:bg-white/[.045]"
              >
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#14F1D9]/10 text-[#14F1D9]">
                  <FiArchive size={17} />
                </span>
                <span className="flex-1">Archived</span>
                <span className="text-xs font-medium text-[var(--cv-muted)]">
                  {archivedChatIds.size}
                </span>
                <FiChevronRight className="text-[var(--cv-muted)]" />
              </button>
            )}
            {showArchived && (
              <div className="flex items-center justify-between border-b border-white/[.055] px-5 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <FiArchive className="text-[#14F1D9]" /> Archived chats
                </div>
                <button
                  onClick={() => setShowArchived(false)}
                  className="text-xs font-semibold text-[#14F1D9]"
                >
                  Done
                </button>
              </div>
            )}
            {visible
              .filter((chat) => !chat.pinned)
              .map((chat) => (
                <ChatRow
                  key={chat._id}
                  chat={chat}
                  currentUserId={currentUserId}
                  onlineUsers={onlineUsers}
                  statusAuthorIds={statusAuthorIds}
                  onOpen={openChat}
                  onAction={menuChat}
                />
              ))}
            {!loading && !visible.length && (
              <div className="px-6 py-20 text-center">
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-[22px] bg-gradient-to-br from-[#6366F1]/20 to-[#14F1D9]/10 text-[#14F1D9]">
                  <MessageCircle size={28} />
                </span>
                <h2 className="mt-5 text-lg font-semibold">
                  {search ? "No conversations found" : "Your inbox is quiet"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--cv-muted)]">
                  Start a conversation and your people will show up here.
                </p>
                <button
                  onClick={() => navigate("/new-chat")}
                  className="cv-gradient mt-5 rounded-[10px] px-5 py-2.5 text-sm font-semibold text-white"
                >
                  Start a conversation
                </button>
              </div>
            )}
          </div>
        </section>
        <section className="hidden min-w-0 flex-1 md:block">
          {selectedChat ? (
            <ChatScreen />
          ) : (
            <div className="cv-dot-grid grid h-full place-items-center p-8 text-center">
              <div>
                <span className="mx-auto grid h-20 w-20 place-items-center rounded-[28px] bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-2xl font-bold text-white">
                  CV
                </span>
                <h2 className="mt-6 text-2xl font-semibold">
                  Your conversations, in focus.
                </h2>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[var(--cv-muted)]">
                  Choose a chat from the left to pick up where you left off.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
      <BottomNav />
    </main>
  );
}

export default Chats;
