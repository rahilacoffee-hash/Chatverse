import { useEffect } from "react";
import useChatStore from "../../store/useChatStore";

export default function MessageList() {
  const {
    selectedChat,
    fetchMessages,
    messages,
  } = useChatStore();

  const currentUserId = localStorage.getItem("userId");

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat._id);
    }
  }, [selectedChat]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((msg) => {
        const isMe =
          msg.sender?._id === currentUserId ||
          msg.sender === currentUserId;

        return (
          <div
            key={msg._id}
            className={`flex ${
              isMe ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`
                max-w-[75%]
                px-4
                py-3
                rounded-2xl
                shadow-sm
                ${
                  isMe
                    ? "bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white rounded-br-md"
                    : "bg-zinc-800 text-white rounded-bl-md"
                }
              `}
            >
              <p className="break-words">{msg.text}</p>

              <div
                className={`
                  text-[11px]
                  mt-1
                  flex
                  justify-end
                  items-center
                  gap-1
                  ${
                    isMe
                      ? "text-purple-100"
                      : "text-zinc-400"
                  }
                `}
              >
                {new Date(
                  msg.createdAt
                ).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}

                {isMe && (
                  <span className="text-xs">
                    ✓✓
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}