export default function EmptyChat() {
  return (
    <div
      className="
      hidden
      md:flex
      flex-1
      items-center
      justify-center
      bg-[#0b141a]
      "
    >
      <div className="text-center">
        <h2 className="text-3xl font-bold">
          ChatVerse
        </h2>

        <p className="text-zinc-500 mt-3">
          Select a chat to start messaging
        </p>
      </div>
    </div>
  );
}