function MessageBubble({
  message,
  text,
  isMe,
  isOwnMessage,
  senderName,
  time,
}) {
  let currentMessage = message || { text, createdAt: time, reactions: [] };
  let own = isOwnMessage ?? isMe;
  let messageTime = currentMessage.createdAt
    ? new Date(currentMessage.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : time || "";
  return (
    <div
      className={`flex px-3 py-1.5 sm:px-4 ${own ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[min(84%,32rem)] rounded-[18px] px-3.5 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,.12)] ${own ? "bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white" : "border border-white/[.08] bg-[var(--cv-elevated)] text-[var(--cv-text)]"}`}
      >
        {!own && senderName && (
          <p className="mb-1 text-xs font-semibold text-[#14F1D9]">
            {senderName}
          </p>
        )}
        <p className="whitespace-pre-wrap break-words text-sm">
          {currentMessage.text}
        </p>
        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-65">
          <span>{messageTime}</span>
          {own && currentMessage.readAt && (
            <span className="text-[#14F1D9]">✓✓</span>
          )}
        </div>
        {currentMessage.reactions?.length > 0 && (
          <div className="-mb-5 mt-1 flex w-fit gap-1 rounded-full border border-[#14F1D9]/20 bg-[var(--cv-base)] px-1.5 py-0.5 text-xs shadow">
            {currentMessage.reactions.map((reaction, index) => (
              <span key={`${reaction.type}-${index}`}>{reaction.type}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MessageBubble;
