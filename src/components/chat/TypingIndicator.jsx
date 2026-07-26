export default function TypingIndicator({
  userName = "Someone",
}) {
  return (
    <div className="flex justify-start px-4 py-2">
      <div className="bg-zinc-800 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <span
              className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce"
              style={{ animationDelay: "0ms" }}
            />

            <span
              className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce"
              style={{ animationDelay: "150ms" }}
            />

            <span
              className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>

          <span className="text-sm text-zinc-400">
            {userName} is typing...
          </span>
        </div>
      </div>
    </div>
  );
}