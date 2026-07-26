import useChatStore from "../../store/useChatStore";

export default function ChatHeader() {
  const { selectedChat } =
    useChatStore();

  const user =
    selectedChat.participants[0];

  return (
    <div
      className="
      h-16
      bg-[#202c33]
      border-b
      border-zinc-800
      px-5
      flex
      items-center
      "
    >
      <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
        {user.name.charAt(0)}
      </div>

      <div className="ml-3">
        <h3>{user.name}</h3>

        <p className="text-green-500 text-xs">
          Online
        </p>
      </div>
    </div>
  );
}