function EmptyChat() {
  return (
    <div className="hidden flex-1 items-center justify-center cv-dot-grid md:flex">
      <div className="px-6 text-center">
        <span className="mx-auto grid h-20 w-20 place-items-center rounded-[28px] bg-gradient-to-br from-[#14F1D9] to-[#6366F1] text-2xl font-bold text-[#071318]">
          CV
        </span>
        <h2 className="mt-6 text-2xl font-bold">
          Your conversations, in focus
        </h2>
        <p className="mt-3 text-[var(--cv-muted)]">
          Select a chat to start messaging.
        </p>
      </div>
    </div>
  );
}

export default EmptyChat;
