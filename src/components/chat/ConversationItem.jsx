import useChatStore from "../../store/useChatStore";

function ConversationItem({ conversation }) {
  let selectChat = useChatStore((state) => state.selectChat);
  let user =
    conversation.participants?.find(
      (participant) =>
        String(participant._id) !== String(localStorage.getItem("userId")),
    ) || conversation.participants?.[0];
  let title = conversation.isGroup
    ? conversation.groupName || "Group chat"
    : user?.name || "Conversation";
  return (
    <button
      onClick={() => selectChat(conversation)}
      className="flex w-full items-center gap-3 border-b border-white/[.06] px-4 py-3 text-left transition hover:bg-white/[.045]"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#14F1D9] to-[#6366F1] font-semibold text-[#071318]">
        {conversation.groupAvatar ? (
          <img
            src={conversation.groupAvatar}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          title.slice(0, 2).toUpperCase()
        )}
      </span>
      <span className="min-w-0 flex-1">
        <b className="block truncate text-sm text-[var(--cv-text)]">{title}</b>
        <small className="mt-1 block truncate text-xs text-[var(--cv-muted)]">
          {conversation.lastMessage?.text || "Start a conversation"}
        </small>
      </span>
    </button>
  );
}

export default ConversationItem;
