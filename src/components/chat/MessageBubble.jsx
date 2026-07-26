export default function MessageBubble({
  text,
  isMe,
  senderName,
  time,
}) {
  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
   <div
  className={`
    max-w-[75%]
    px-4
    py-3
    rounded-2xl
    ${
      isMe
        ? "bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white rounded-br-md"
        : "bg-zinc-800 text-white rounded-bl-md"
    }
  `}
>
  <p>{msg.text}</p>

  <div className="flex items-center justify-end gap-1 mt-1">
    <span className="text-[10px] opacity-70">
      {new Date(msg.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}
    </span>

   {isMe && (
  <span
    className={`text-[10px] ${
      msg.readAt
        ? "text-blue-400"
        : "text-white"
    }`}
  >
    {msg.readAt
      ? "✓✓"
      : msg.deliveredAt
      ? "✓"
      : ""}
  </span>
)}

{msg.reactions?.length > 0 && (
  <div className="flex gap-1 mt-1 text-sm">
    {msg.reactions.map((r, i) => (
      <span key={i}>{r.type}</span>
    ))}
  </div>
)}
  </div>
</div>
    </div>
  );
}