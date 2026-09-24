export default function OnlineIndicator({ isOnline, lastSeen }) {
  if (isOnline) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-[#14F1D9]">
        <i className="h-1.5 w-1.5 rounded-full bg-[#14F1D9] shadow-[0_0_0_3px_rgba(20,241,217,.12)]" />{" "}
        Online
      </span>
    );
  }

  return (
    <span className="text-xs text-[var(--cv-muted)]">Last seen {lastSeen}</span>
  );
}
