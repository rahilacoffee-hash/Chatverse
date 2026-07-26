import { useEffect } from "react";
import useChatStore from "../../store/useChatStore";
import ConversationItem from "./ConversationItem";

export default function ConversationSidebar() {
  const {
    conversations,
    fetchConversations
  } = useChatStore();

  useEffect(() => {
    fetchConversations();
  }, []);

  return (
    <div
      className="
      w-full
      md:w-[380px]
      bg-[#111b21]
      border-r
      border-zinc-800
      flex
      flex-col
      "
    >
      <div className="p-5">
        <h1 className="text-3xl font-bold">
          Chats
        </h1>
      </div>

      <div className="px-4 pb-4">
        <input
          placeholder="Search chats..."
          className="
          w-full
          bg-[#202c33]
          rounded-xl
          px-4
          py-3
          outline-none
          "
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.map((chat) => (
          <ConversationItem
            key={chat._id}
            conversation={chat}
          />
        ))}
      </div>
    </div>
  );
}