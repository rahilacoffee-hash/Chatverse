export default function ChatItem({ chat, onClick }) {
  const user = chat.participants?.[0];
  const title = chat.isGroup ? chat.groupName || "Group chat" : user?.name;
  const avatar = chat.isGroup ? chat.groupAvatar : user?.avatar;

  return (
    <div
      onClick={onClick}
      className="group flex items-center gap-3 border-b border-white/[.06] px-4 py-3.5 text-left transition hover:bg-white/[.045]"
    >
      <div className="relative">
        {avatar ? (
          <img
            src={avatar}
            alt=""
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#14F1D9] to-[#6366F1] font-bold text-[#071318]">
            {chat.isGroup ? "G" : title?.[0]?.toUpperCase() || "U"}
          </span>
        )}

        {user?.isOnline && (
          <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[var(--cv-base)] bg-[#14F1D9] shadow-[0_0_0_3px_rgba(20,241,217,.12)]" />
        )}
      </div>

      <div className="flex-1">
        <h3 className="font-semibold text-[var(--cv-text)]">{title}</h3>

        <p className="truncate text-sm text-[var(--cv-muted)]">
          {chat?.lastMessage?.text || "Start chatting"}
        </p>
      </div>

      <div className="text-[11px] text-[var(--cv-muted)]">
        {chat.lastMessage?.createdAt
          ? new Date(chat.lastMessage.createdAt).toLocaleDateString([], {
              month: "short",
              day: "numeric",
            })
          : ""}
      </div>
    </div>
  );
}
