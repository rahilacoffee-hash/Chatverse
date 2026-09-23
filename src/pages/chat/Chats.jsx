import { useEffect, useState } from "react";
import { Search, Plus } from "lucide-react";
import { FiArchive, FiBellOff, FiBookmark, FiChevronDown, FiChevronRight, FiMoreHorizontal, FiRotateCcw } from "react-icons/fi";
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

  const {
    conversations,
    fetchConversations,
    selectChat,
  } = useChatStore();

  useEffect(() => {
    fetchConversations();
  }, []);

  const visibleConversations = conversations.filter((chat) => {
    if (!chat || hiddenIds.includes(chat._id)) return false;
    const user = chat.participants?.find((participant) => participant?._id !== localStorage.getItem("userId"));
    const haystack = `${chat.groupName || ""} ${user?.name || ""} ${chat.lastMessage?.text || ""}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });
  const pinned = visibleConversations.filter((chat) => chat.pinned);
  const unpinned = visibleConversations.filter((chat) => !chat.pinned);

  const runChatAction = (chat, action) => {
    setMenuId(null);
    if (action === "archive") {
      setHiddenIds((ids) => [...ids, chat._id]);
      toast(({ closeToast }) => <div className="flex items-center gap-3"><span>Chat archived</span><button onClick={() => { setHiddenIds((ids) => ids.filter((id) => id !== chat._id)); closeToast(); }} className="flex items-center gap-1 text-fuchsia-300"><FiRotateCcw /> Undo</button></div>, { autoClose: 5000 });
    } else {
      toast.success(action === "mute" ? "Notifications muted" : "Chat pinned");
    }
  };

  const renderChat = (chat) => {
    const currentUserId = localStorage.getItem("userId");
    const user = chat.participants?.find((p) => p?._id !== currentUserId);
    const title = chat.isGroup ? chat.groupName || "Group chat" : user?.name;
    const subtitle = chat.isGroup ? `${chat.participants?.length || 0} participants` : chat?.lastMessage?.text || "Start chatting";
    const hasStatus = !chat.isGroup && statusAuthorIds.has(String(user?._id));
    const unreadCount = Number(chat.unreadCount || 0);
    const mentionUnread = unreadCount > 0 && chat.lastMessage?.text?.includes("@");

    return (
      <div key={chat._id} className="group relative border-b border-white/[.06]">
        <div onClick={() => { selectChat(chat); navigate("/chat"); }} className="flex cursor-pointer items-center gap-3 px-5 py-4 transition hover:bg-white/[.035]">
          <button onClick={(event) => { if (!chat.isGroup && user?._id) { event.stopPropagation(); navigate(hasStatus ? "/status" : `/profile/${user._id}`, hasStatus ? { state: { statusAuthorId: user._id } } : undefined); } }} className={`h-14 w-14 shrink-0 rounded-full p-0.5 ${hasStatus ? "bg-gradient-to-br from-amber-300 via-fuchsia-500 to-purple-700" : "bg-transparent"}`} aria-label={hasStatus ? `View ${user?.name}'s status` : `View ${user?.name || "chat"}`}>
            {chat.isGroup && chat.groupAvatar ? <img src={chat.groupAvatar} alt={`${title} group icon`} className="h-full w-full rounded-full border-2 border-[#09090B] object-cover" /> : user?.avatar && !chat.isGroup ? <img src={user.avatar} alt={`${user.name}'s profile`} className="h-full w-full rounded-full border-2 border-[#09090B] object-cover" /> : <span className="flex h-full w-full items-center justify-center rounded-full bg-purple-600 text-lg font-bold">{chat.isGroup ? "G" : user?.name?.charAt(0)?.toUpperCase()}</span>}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2"><h3 className="truncate font-semibold">{title}</h3><span className="shrink-0 text-[11px] text-zinc-500">{chat.lastMessage?.createdAt ? new Date(chat.lastMessage.createdAt).toLocaleDateString([], { month: "short", day: "numeric" }) : ""}</span></div>
            <p className={`truncate text-sm ${unreadCount ? "text-zinc-200" : "text-zinc-500"}`}>{subtitle}</p>
          </div>
          {unreadCount > 0 && <span className={`grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-[11px] font-bold ${mentionUnread ? "bg-amber-400 text-black" : "bg-fuchsia-500 text-white"}`}>{unreadCount > 99 ? "99+" : unreadCount}</span>}
          <button onClick={(event) => { event.stopPropagation(); setMenuId(menuId === chat._id ? null : chat._id); }} className="grid h-8 w-8 place-items-center rounded-full text-zinc-500 opacity-0 transition hover:bg-white/10 hover:text-white group-hover:opacity-100" aria-label="Chat actions"><FiMoreHorizontal /></button>
        </div>
        {menuId === chat._id && <div className="absolute right-5 top-14 z-20 w-40 rounded-xl border border-white/10 bg-[#1b1822] p-1 shadow-xl"><button onClick={() => runChatAction(chat, "archive")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-white/10"><FiArchive /> Archive</button><button onClick={() => runChatAction(chat, "mute")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-white/10"><FiBellOff /> Mute</button><button onClick={() => runChatAction(chat, "pin")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-white/10"><FiBookmark /> Pin chat</button></div>}
      </div>
    );
  };

  useEffect(() => {
    let active = true;
    const loadStatusAuthors = async () => {
      try {
        const response = await getStatuses();
        if (!active) return;
        setStatusAuthorIds(new Set((response.data.data || []).map((status) => String(status.author?._id || status.author)).filter(Boolean)));
      } catch {
        // Chatting should remain available when the status feed is unavailable.
      }
    };
    void loadStatusAuthors();
    const refreshId = window.setInterval(loadStatusAuthors, 60_000);
    return () => { active = false; window.clearInterval(refreshId); };
  }, []);

  return (
    <div className="bg-[#09090B] min-h-screen text-white pb-24">
      <div className="p-5">
        <h1 className="text-3xl font-bold">Chats</h1>

        <div className="mt-4 relative">
          <Search
            size={18}
            className="absolute left-4 top-4 text-zinc-500"
          />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search chats..."
            className="w-full bg-zinc-900 pl-12 py-3 rounded-xl outline-none"
          />
        </div>

        <div className="flex gap-3 mt-4">
          <button className="px-4 py-2 rounded-full bg-purple-600 text-sm">
            All
          </button>

          <button className="px-4 py-2 rounded-full bg-zinc-900 text-sm">
            Unread
          </button>

          <button className="px-4 py-2 rounded-full bg-zinc-900 text-sm">
            Groups
          </button>
        </div>
      </div>

      <div>
        {pinned.length > 0 && <section><button onClick={() => setPinnedOpen((open) => !open)} className="flex w-full items-center gap-2 px-5 pb-2 pt-4 text-left text-[11px] font-semibold uppercase tracking-[.16em] text-zinc-500">{pinnedOpen ? <FiChevronDown /> : <FiChevronRight />} Pinned <span className="text-zinc-700">{pinned.length}</span></button>{pinnedOpen && pinned.map(renderChat)}</section>}
        {unpinned.map(renderChat)}
        {!visibleConversations.length && <p className="px-5 py-16 text-center text-sm text-zinc-500">No matches in chats or message previews.</p>}
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
