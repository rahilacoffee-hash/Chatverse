import {
  Send,
} from "lucide-react";
import { useState } from "react";

export default function MessageInput({
  onSend,
}) {
  const [text, setText] =
    useState("");

  const handleSend = () => {
    if (!text.trim()) return;

    onSend({ text });

    setText("");
  };

  return (
   <div className="p-4 border-t border-zinc-900 flex gap-2 items-center">
  
  <input
    value={text}
    onChange={(e) => setText(e.target.value)}
    placeholder="Type a message..."
    className="flex-1 h-12 bg-zinc-900 rounded-xl px-4 outline-none"
    onKeyDown={(e) => e.key === "Enter" && handleSend()}
  />

  <button
    onClick={handleSend}
    className="h-12 w-12 rounded-xl bg-purple-600 flex items-center justify-center"
  >
    <Send size={18} />
  </button>
</div>
  );
}
