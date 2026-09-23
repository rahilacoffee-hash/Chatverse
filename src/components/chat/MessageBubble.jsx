export default function MessageBubble({
  message,
  text,
  isMe,
  isOwnMessage,
  senderName,
  time,
}) {
  const currentMessage = message || { text, createdAt: time, reactions: [] };
  const own = isOwnMessage ?? isMe;
  const messageTime = currentMessage.createdAt
    ? new Date(currentMessage.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : time || "";

  return (
    <div className={`flex px-4 py-1 ${own ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[min(78%,28rem)] rounded-2xl px-4 py-2.5 ${own ? "rounded-br-md bg-gradient-to-br from-fuchsia-600 to-purple-600 text-white" : "rounded-bl-md bg-zinc-800 text-white"}`}
      >
        {!own && senderName && (
          <p className="mb-1 text-xs font-semibold text-fuchsia-300">
            {senderName}
          </p>
        )}
        <p className="whitespace-pre-wrap break-words text-sm">
          {currentMessage.text}
        </p>
        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-65">
          <span>{messageTime}</span>
          {own && currentMessage.readAt && (
            <span className="text-sky-300">✓✓</span>
          )}
        </div>
        {currentMessage.reactions?.length > 0 && (
          <div className="-mb-5 mt-1 flex w-fit gap-1 rounded-full border border-white/10 bg-zinc-950 px-1.5 py-0.5 text-xs shadow">
            {currentMessage.reactions.map((reaction, index) => (
              <span key={`${reaction.type}-${index}`}>{reaction.type}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
