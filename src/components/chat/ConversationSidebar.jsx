import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import useChatStore from "../../store/useChatStore";
import ConversationItem from "./ConversationItem";

function ConversationSidebar() {
  let { conversations, fetchConversations } = useChatStore();
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
          Conversations
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Inbox</h1>
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
        {visible.map((conversation) => (
          <ConversationItem
            key={conversation._id}
            conversation={conversation}
          />
        ))}
      </div>
    </aside>
  );
}

export default ConversationSidebar;
