import useChatStore from "../../store/useChatStore";

export default function ConversationItem({
  conversation
}) {
  const { setSelectedChat } =
    useChatStore();

  const user =
    conversation.participants?.[0];

  return (
    <div
      onClick={() =>
        setSelectedChat(conversation)
      }
      className="
      px-4
      py-3
      flex
      items-center
      hover:bg-[#202c33]
      cursor-pointer
      "
    >
      <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center">
        {user?.name?.charAt(0)}
      </div>

      <div className="ml-3 flex-1">
        <h3 className="font-semibold">
          {user?.name}
        </h3>

        <p className="text-zinc-400 text-sm truncate">
          {conversation?.lastMessage?.text}
        </p>
      </div>
    </div>
  );
}