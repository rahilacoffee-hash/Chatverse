import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import useChatStore from "../../store/useChatStore";

function ChatSidebar() {
  let { conversations, fetchConversations, selectChat } = useChatStore();
  let [search, setSearch] = useState("");
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);
  let visible = conversations.filter((chat) =>
    `${chat.groupName || ""} ${chat.participants?.map((user) => user.name).join(" ") || ""} ${chat.lastMessage?.text || ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <aside className="flex h-full w-full flex-col border-r border-white/[.07] bg-[var(--cv-surface)] md:w-[380px]">
      <header className="border-b border-white/[.07] p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#14F1D9]">
          Your space
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Chats</h1>
        <div className="cv-focus mt-4 flex items-center rounded-[10px] border border-white/10 bg-white/[.045] px-3">
          <Search size={16} className="text-[var(--cv-muted)]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search chats"
            className="w-full bg-transparent px-2 py-2.5 text-sm outline-none placeholder:text-[var(--cv-muted)]"
          />
        </div>
      </header>
      <div className="flex-1 overflow-y-auto">
        {visible.map((chat) => (
          <button
            key={chat._id}
            onClick={() => selectChat(chat)}
            className="flex w-full items-center gap-3 border-b border-white/[.06] px-4 py-3 text-left hover:bg-white/[.045]"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#14F1D9] to-[#6366F1] font-semibold text-[#071318]">
              {chat.groupAvatar ? (
                <img
                  src={chat.groupAvatar}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                (chat.groupName || "C").slice(0, 2).toUpperCase()
              )}
            </span>
            <span className="min-w-0 flex-1">
              <b className="block truncate text-sm">
                {chat.groupName ||
                  chat.participants?.[0]?.name ||
                  "Conversation"}
              </b>
              <small className="mt-1 block truncate text-xs text-[var(--cv-muted)]">
                {chat.lastMessage?.text || "Start conversation"}
              </small>
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}

export default ChatSidebar;
