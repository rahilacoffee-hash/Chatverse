import { useEffect, useState } from "react";
import { Search, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useChatStore from "../../store/useChatStore";
import BottomNav from "../../components/navigations/BottomNav";
import { getStatuses } from "../../services/statusService";

export default function Chats() {
  const navigate = useNavigate();
  const [statusAuthorIds, setStatusAuthorIds] = useState(() => new Set());

  const {
    conversations,
    fetchConversations,
    selectChat,
  } = useChatStore();

  useEffect(() => {
    fetchConversations();
  }, []);

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
     {conversations.filter(Boolean).map((chat) => {
  const currentUserId =
    localStorage.getItem("userId");

  const user =
    chat.participants?.find(
      (p) => p?._id !== currentUserId
    );
  const title = chat.isGroup ? chat.groupName || "Group chat" : user?.name;
  const subtitle = chat.isGroup
    ? `${chat.participants?.length || 0} participants`
    : chat?.lastMessage?.text || "Start chatting";
  const hasStatus = !chat.isGroup && statusAuthorIds.has(String(user?._id));

  return (
    <div
      key={chat._id}
      onClick={() => {
        selectChat(chat);
        navigate("/chat");
      }}
      className="px-5 py-4 flex items-center gap-3 border-b border-zinc-900 cursor-pointer hover:bg-zinc-900/50 transition"
    >
      {/* The avatar opens contact info; the rest of the row opens the chat. */}
      <button onClick={(event) => { if (!chat.isGroup && user?._id) { event.stopPropagation(); navigate(`/profile/${user._id}`); } }} className={`h-14 w-14 shrink-0 rounded-full p-0.5 ${hasStatus ? "bg-gradient-to-br from-purple-400 via-fuchsia-500 to-purple-700" : "bg-transparent"}`} aria-label={hasStatus ? `${user?.name} has a status` : `View ${user?.name || "chat"}`}>
        {user?.avatar ? <img src={user.avatar} alt={`${user.name}'s profile`} className="h-full w-full rounded-full border-2 border-[#09090B] object-cover" /> : <span className="flex h-full w-full items-center justify-center rounded-full bg-purple-600 text-lg font-bold">{chat.isGroup ? "G" : user?.name?.charAt(0)?.toUpperCase()}</span>}
      </button>

      {/* Chat Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold">
          {title}
        </h3>

        <p className="text-sm text-zinc-500 truncate">
          {subtitle}
        </p>
      </div>

      {/* Unread Badge */}
      {chat.unreadCount > 0 && (
        <div
          className="
            min-w-6
            h-6
            px-2
            rounded-full
            bg-purple-600
            text-white
            text-xs
            font-semibold
            flex
            items-center
            justify-center
          "
        >
          {chat.unreadCount > 99
            ? "99+"
            : chat.unreadCount}
        </div>
      )}
    </div>
  );
})}
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
