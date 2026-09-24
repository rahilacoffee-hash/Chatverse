import useChatStore from "../../store/useChatStore";

export default function ChatHeader() {
  const { selectedChat } = useChatStore();
  const user = selectedChat?.participants?.[0];
  if (!selectedChat || !user) return null;

  return (
    <div className="flex h-16 items-center border-b border-white/[.07] bg-[color-mix(in_srgb,var(--cv-surface)_88%,transparent)] px-4 backdrop-blur-xl">
      <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#14F1D9] to-[#6366F1] font-semibold text-[#071318]">
        {user.name.charAt(0)}
      </div>

      <div className="ml-3">
        <h3>{user.name}</h3>

        <p className="text-xs text-[#14F1D9]">
          {user.isOnline ? "Online" : "Last seen privately"}
        </p>
      </div>
    </div>
  );
}
