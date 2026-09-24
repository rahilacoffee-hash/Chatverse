export default function TypingIndicator({ userName = "Someone" }) {
  return (
    <div className="flex justify-start px-4 py-2">
      <div className="rounded-[18px] border border-[#14F1D9]/15 bg-[var(--cv-elevated)] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <span
              className="h-2 w-2 rounded-full bg-[#14F1D9] animate-bounce"
              style={{ animationDelay: "0ms" }}
            />

            <span
              className="h-2 w-2 rounded-full bg-[#14F1D9] animate-bounce"
              style={{ animationDelay: "150ms" }}
            />

            <span
              className="h-2 w-2 rounded-full bg-[#14F1D9] animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>

          <span className="text-sm text-[var(--cv-muted)]">
            {userName} is typing...
          </span>
        </div>
      </div>
    </div>
  );
}
