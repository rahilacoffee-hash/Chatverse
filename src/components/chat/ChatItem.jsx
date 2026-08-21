export default function ChatItem({
  chat,
  onClick,
}) {
  const user =
    chat.participants?.[0];
  const title = chat.isGroup ? chat.groupName || "Group chat" : user?.name;
  const avatar = chat.isGroup ? chat.groupAvatar : user?.avatar;

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-4 border-b border-zinc-900 cursor-pointer"
    >
      <div className="relative">
        {avatar ? <img src={avatar} alt="" className="w-14 h-14 rounded-full object-cover" /> : <span className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-600 font-bold text-white">{chat.isGroup ? "G" : title?.[0]?.toUpperCase() || "U"}</span>}

        {user?.isOnline && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#09090B]" />
        )}
      </div>

      <div className="flex-1">
        <h3 className="font-semibold text-white">
          {title}
        </h3>

        <p className="text-sm text-zinc-500 truncate">
          {chat?.lastMessage?.text ||
            "Start chatting"}
        </p>
      </div>

      <div className="text-xs text-zinc-500">
        2m
      </div>
    </div>
  );
}
