export default function ChatItem({
  chat,
  onClick,
}) {
  const user =
    chat.participants?.[0];

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-4 border-b border-zinc-900 cursor-pointer"
    >
      <div className="relative">
        <img
          src={
            user?.avatar ||
            "https://i.pravatar.cc/150"
          }
          alt=""
          className="w-14 h-14 rounded-full object-cover"
        />

        {user?.isOnline && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#09090B]" />
        )}
      </div>

      <div className="flex-1">
        <h3 className="font-semibold text-white">
          {user?.name}
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