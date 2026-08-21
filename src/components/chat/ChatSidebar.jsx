import { useEffect } from "react";
import useChatStore from "../../store/useChatStore";

export default function ChatSidebar() {
  const {
    conversations,
    fetchConversations,
    setSelectedChat,
  } = useChatStore();

  useEffect(() => {
    fetchConversations();
  }, []);

  return (
    <div className="w-full md:w-[380px] bg-[#09090f] border-r border-zinc-800 h-full">

      <div className="p-5">
        <h1 className="text-white text-2xl font-bold">
          Chats
        </h1>
      </div>

      <div className="px-4">
        <input
          placeholder="Search chats..."
          className="w-full bg-zinc-800 p-3 rounded-xl text-white outline-none"
        />
      </div>

      <div className="mt-4 pb-20">
        {conversations.filter(Boolean).map((chat) => {
          const otherUser =
            chat.participants?.find(
              (user) =>
                user?._id !== localStorage.getItem("userId")
            ) || chat.participants?.[0];
          const title = chat.isGroup ? chat.groupName || "Group chat" : otherUser?.name;
          const avatar = chat.isGroup ? chat.groupAvatar : otherUser?.avatar;

          return (
            <button
              key={chat._id}
              onClick={() => setSelectedChat(chat)}
              className="w-full p-4 hover:bg-zinc-800 border-b border-zinc-900 text-left"
            >
              <div className="flex gap-3">

                {avatar ? <img src={avatar} alt="" className="w-12 h-12 rounded-full object-cover" /> : <span className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 font-bold text-white">{chat.isGroup ? "G" : title?.[0]?.toUpperCase() || "U"}</span>}

                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium truncate">
                    {title}
                  </h3>

                  <p className="text-zinc-400 text-sm truncate">
                    {chat?.lastMessage?.text ||
                      "Start conversation"}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
