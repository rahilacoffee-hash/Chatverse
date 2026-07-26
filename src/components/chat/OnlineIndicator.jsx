export default function OnlineIndicator({
  isOnline,
  lastSeen,
}) {
  if (isOnline) {
    return (
      <span className="text-green-500 text-xs">
        Online
      </span>
    );
  }

  return (
    <span className="text-zinc-500 text-xs">
      Last seen {lastSeen}
    </span>
  );
}