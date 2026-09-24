import { useEffect, useState } from "react";
import { MessageCircle, Search, Plus } from "lucide-react";
import {
  FiArchive,
  FiBellOff,
  FiBookmark,
  FiChevronDown,
  FiChevronRight,
  FiMoreHorizontal,
  FiRotateCcw,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import useChatStore from "../../store/useChatStore";
import BottomNav from "../../components/navigations/BottomNav";
import { getStatuses } from "../../services/statusService";
import { toast } from "react-toastify";

export default function Chats() {
  const navigate = useNavigate();
  const [statusAuthorIds, setStatusAuthorIds] = useState(() => new Set());
  const [search, setSearch] = useState("");
  const [pinnedOpen, setPinnedOpen] = useState(true);
  const [menuId, setMenuId] = useState(null);
  const [hiddenIds, setHiddenIds] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchMode, setSearchMode] = useState("chats");

  const {
    conversations,
    conversationsLoadedAt,
    fetchConversations,
    selectChat,
    onlineUsers,
  } = useChatStore();
  const loadingChats =
    conversationsLoadedAt === 0 && conversations.length === 0;

  useEffect(() => {
    fetchConversations();
  }, []);

  const visibleConversations = conversations.filter((chat) => {
    if (!chat || hiddenIds.includes(chat._id)) return false;
    const user = chat.participants?.find(
      (participant) => participant?._id !== localStorage.getItem("userId"),
    );
    const haystack =
      `${chat.groupName || ""} ${user?.name || ""} ${chat.lastMessage?.text || ""}`.toLowerCase();
    const matchesSearch = haystack.includes(search.toLowerCase());
    const matchesFilter =
      activeFilter === "all" ||
      (activeFilter === "unread" && Number(chat.unreadCount || 0) > 0) ||
      (activeFilter === "groups" && chat.isGroup);
    return matchesSearch && matchesFilter;
  });
  const pinned = visibleConversations.filter((chat) => chat.pinned);
  const unpinned = visibleConversations.filter((chat) => !chat.pinned);

  const runChatAction = (chat, action) => {
    setMenuId(null);
    if (action === "archive") {
      setHiddenIds((ids) => [...ids, chat._id]);
      toast(
        ({ closeToast }) => (
          <div className="flex items-center gap-3">
            <span>Chat archived</span>
            <button
              onClick={() => {
                setHiddenIds((ids) => ids.filter((id) => id !== chat._id));
                closeToast();
              }}
              className="flex items-center gap-1 text-fuchsia-300"
            >
              <FiRotateCcw /> Undo
            </button>
          </div>
        ),
        { autoClose: 5000 },
      );
    } else {
      toast.success(action === "mute" ? "Notifications muted" : "Chat pinned");
    }
  };

  const renderChat = (chat) => {
    const currentUserId = localStorage.getItem("userId");
    const user = chat.participants?.find((p) => p?._id !== currentUserId);
    const title = chat.isGroup ? chat.groupName || "Group chat" : user?.name;
    const lastSenderId =
      typeof chat.lastMessage?.sender === "object"
        ? chat.lastMessage.sender?._id
        : chat.lastMessage?.sender;
    const lastSender = chat.participants?.find(
      (participant) => String(participant?._id) === String(lastSenderId),
    );
    const preview =
      chat.lastMessage?.type === "image"
        ? "Photo"
        : chat.lastMessage?.type === "audio"
          ? "Voice message"
          : chat.lastMessage?.text || "Start chatting";
    const subtitle =
      chat.isGroup && lastSender ? `${lastSender.name}: ${preview}` : preview;
    const hasStatus = !chat.isGroup && statusAuthorIds.has(String(user?._id));
    const isOnline = !chat.isGroup && onlineUsers.includes(user?._id);
    const unreadCount = Number(chat.unreadCount || 0);
    const mentionUnread =
      unreadCount > 0 && chat.lastMessage?.text?.includes("@");

    return (
      <div
        key={chat._id}
        className="group relative border-b border-white/[.06]"
      >
        <div
          onClick={() => {
            selectChat(chat);
            navigate("/chat");
          }}
          className="flex cursor-pointer items-center gap-3 px-5 py-4 transition hover:bg-white/[.035]"
        >
          <button
            onClick={(event) => {
              if (!chat.isGroup && user?._id) {
                event.stopPropagation();
                navigate(
                  hasStatus ? "/status" : `/profile/${user._id}`,
                  hasStatus
                    ? { state: { statusAuthorId: user._id } }
                    : undefined,
                );
              }
            }}
            className={`relative h-12 w-12 shrink-0 rounded-full p-0.5 ${hasStatus ? "bg-gradient-to-br from-amber-300 via-fuchsia-500 to-purple-700" : "bg-transparent"}`}
            aria-label={
              hasStatus
                ? `View ${user?.name}'s status`
                : `View ${user?.name || "chat"}`
            }
          >
            {chat.isGroup && chat.groupAvatar ? (
              <img
                src={chat.groupAvatar}
                alt={`${title} group icon`}
                className="h-full w-full rounded-full border-2 border-[#09090B] object-cover"
              />
            ) : user?.avatar && !chat.isGroup ? (
              <img
                src={user.avatar}
                alt={`${user.name}'s profile`}
                className="h-full w-full rounded-full border-2 border-[#09090B] object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center rounded-full bg-purple-600 text-lg font-bold">
                {chat.isGroup ? "G" : user?.name?.charAt(0)?.toUpperCase()}
              </span>
            )}
            {isOnline && (
              <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[var(--cv-base)] bg-[#14F1D9] shadow-[0_0_0_3px_rgba(20,241,217,.12)]" />
            )}
          </button>
          <div className="min-w-0 flex-1 py-0.5">
            <div className="flex items-center justify-between gap-2">
              <h3
                className={`truncate text-[15px] font-semibold ${unreadCount ? "text-white" : "text-[var(--cv-text)]"}`}
              >
                {title}
              </h3>
              <span
                className={`shrink-0 text-[11px] ${unreadCount ? "text-[#14F1D9]" : "text-zinc-500"}`}
              >
                {chat.lastMessage?.createdAt
                  ? new Date(chat.lastMessage.createdAt).toLocaleDateString(
                      [],
                      { month: "short", day: "numeric" },
                    )
                  : ""}
              </span>
            </div>
            <p
              className={`truncate text-sm ${unreadCount ? "text-zinc-200" : "text-zinc-500"}`}
            >
              {subtitle}
            </p>
          </div>
          {unreadCount > 0 && (
            <span
              className={`grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-[11px] font-bold ${mentionUnread ? "bg-amber-400 text-black" : "bg-fuchsia-500 text-white"}`}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
          <button
            onClick={(event) => {
              event.stopPropagation();
              setMenuId(menuId === chat._id ? null : chat._id);
            }}
            className="grid h-8 w-8 place-items-center rounded-full text-zinc-500 opacity-0 transition hover:bg-white/10 hover:text-white group-hover:opacity-100"
            aria-label="Chat actions"
          >
            <FiMoreHorizontal />
          </button>
        </div>
        {menuId === chat._id && (
          <div className="absolute right-5 top-14 z-20 w-40 rounded-xl border border-white/10 bg-[#1b1822] p-1 shadow-xl">
            <button
              onClick={() => runChatAction(chat, "archive")}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-white/10"
            >
              <FiArchive /> Archive
            </button>
            <button
              onClick={() => runChatAction(chat, "mute")}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-white/10"
            >
              <FiBellOff /> Mute
            </button>
            <button
              onClick={() => runChatAction(chat, "pin")}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-white/10"
            >
              <FiBookmark /> Pin chat
            </button>
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    let active = true;
    const loadStatusAuthors = async () => {
      try {
        const response = await getStatuses();
        if (!active) return;
        setStatusAuthorIds(
          new Set(
            (response.data.data || [])
              .map((status) => String(status.author?._id || status.author))
              .filter(Boolean),
          ),
        );
      } catch {
        // Chatting should remain available when the status feed is unavailable.
      }
    };
    void loadStatusAuthors();
    const refreshId = window.setInterval(loadStatusAuthors, 60_000);
    return () => {
      active = false;
      window.clearInterval(refreshId);
    };
  }, []);

  return (
    <div className="cv-shell min-h-[100svh] pb-24">
      <header className="sticky top-0 z-30 border-b border-white/[.06] bg-[color-mix(in_srgb,var(--cv-base)_86%,transparent)] px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/profile")}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#6366F1] to-[#14F1D9] text-xs font-bold text-white"
            aria-label="Open profile"
          >
            CV
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-[.18em] text-[var(--cv-muted)]">
              Your space
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">Chats</h1>
          </div>
          <button
            onClick={() => navigate("/new-chat")}
            className="grid h-10 w-10 place-items-center rounded-full bg-white/[.06] text-white transition hover:bg-white/10"
            aria-label="New chat"
          >
            <Plus size={19} />
          </button>
        </div>

        <div className="cv-focus relative mt-5 flex items-center rounded-[10px] border border-white/10 bg-white/[.045]">
          <Search size={17} className="ml-4 text-[var(--cv-muted)]" />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search chats..."
            className="w-full bg-transparent px-3 py-3 text-sm outline-none placeholder:text-[var(--cv-muted)]"
          />
        </div>
        {search && (
          <div className="mt-2 flex gap-1 rounded-lg bg-white/[.035] p-1">
            <button
              onClick={() => setSearchMode("chats")}
              className={`flex-1 rounded-md py-1.5 text-[11px] font-semibold ${searchMode === "chats" ? "bg-white/10 text-white" : "text-[var(--cv-muted)]"}`}
            >
              Chats
            </button>
            <button
              onClick={() => setSearchMode("messages")}
              className={`flex-1 rounded-md py-1.5 text-[11px] font-semibold ${searchMode === "messages" ? "bg-white/10 text-white" : "text-[var(--cv-muted)]"}`}
            >
              Messages
            </button>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          {[
            ["all", "All"],
            ["unread", "Unread"],
            ["groups", "Groups"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${activeFilter === key ? "cv-gradient text-white" : "bg-white/[.05] text-[var(--cv-muted)] hover:bg-white/[.09]"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div>
        {loadingChats && (
          <div className="space-y-1 px-5 pt-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="flex animate-pulse items-center gap-3 py-4"
              >
                <span className="h-12 w-12 rounded-full bg-white/[.08]" />
                <span className="flex-1">
                  <span className="block h-3 w-2/5 rounded bg-white/[.08]" />
                  <span className="mt-2 block h-3 w-3/5 rounded bg-white/[.05]" />
                </span>
              </div>
            ))}
          </div>
        )}
        {pinned.length > 0 && (
          <section>
            <button
              onClick={() => setPinnedOpen((open) => !open)}
              className="flex w-full items-center gap-2 px-5 pb-2 pt-4 text-left text-[11px] font-semibold uppercase tracking-[.16em] text-zinc-500"
            >
              {pinnedOpen ? <FiChevronDown /> : <FiChevronRight />} Pinned{" "}
              <span className="text-zinc-700">{pinned.length}</span>
            </button>
            {pinnedOpen && (
              <div className="flex gap-3 overflow-x-auto px-5 pb-4 [scrollbar-width:none]">
                {pinned.map((chat) => {
                  const user = chat.participants?.find(
                    (participant) =>
                      participant?._id !== localStorage.getItem("userId"),
                  );
                  const title = chat.isGroup
                    ? chat.groupName || "Group"
                    : user?.name || "Chat";
                  return (
                    <button
                      key={chat._id}
                      onClick={() => {
                        selectChat(chat);
                        navigate("/chat");
                      }}
                      className="flex w-16 shrink-0 flex-col items-center gap-2"
                    >
                      <span className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-sm font-bold text-white">
                        {user?.avatar ? (
                          <img
                            src={user.avatar}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          title.slice(0, 2).toUpperCase()
                        )}
                      </span>
                      <span className="max-w-16 truncate text-[11px] text-[var(--cv-muted)]">
                        {title}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}
        {unpinned.map(renderChat)}
        {!loadingChats && !visibleConversations.length && (
          <div className="px-6 py-20 text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-[22px] bg-gradient-to-br from-[#6366F1]/20 to-[#14F1D9]/10 text-[#14F1D9]">
              <MessageCircle size={27} />
            </span>
            <h2 className="mt-5 text-lg font-semibold">
              {search ? "No conversations found" : "Your inbox is quiet"}
            </h2>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-[var(--cv-muted)]">
              {search
                ? "Try another name or message."
                : "Start a conversation and your people will show up here."}
            </p>
            {!search && (
              <button
                onClick={() => navigate("/new-chat")}
                className="cv-gradient mt-5 rounded-[10px] px-5 py-2.5 text-sm font-semibold text-white"
              >
                Start a conversation
              </button>
            )}
          </div>
        )}
      </div>

      <button
        onClick={() => navigate("/new-chat")}
        className="fixed bottom-24 right-5 h-14 w-14 rounded-full bg-purple-600 flex items-center justify-center shadow-xl"
      >
        <Plus />
      </button>

      <BottomNav />
    </div>
  );
}
