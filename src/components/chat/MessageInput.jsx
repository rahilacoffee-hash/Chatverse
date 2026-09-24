import { Send } from "lucide-react";
import { FiPaperclip, FiSmile } from "react-icons/fi";
import { useState } from "react";

function MessageInput({ onSend, onTyping }) {
  let [text, setText] = useState("");
  function updateText(event) {
    setText(event.target.value);
    onTyping?.(event.target.value);
  }
  function handleSend() {
    if (!text.trim()) return;
    onSend({ text });
    setText("");
  }
  return (
    <div className="cv-safe-bottom flex items-end gap-2 border-t border-white/[.07] bg-[color-mix(in_srgb,var(--cv-surface)_90%,transparent)] p-3 backdrop-blur sm:p-4">
      <button
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[var(--cv-muted)] hover:bg-white/10 hover:text-[#14F1D9]"
        aria-label="Attach file"
      >
        <FiPaperclip />
      </button>
      <div className="flex min-w-0 flex-1 items-end rounded-[18px] border border-white/10 bg-white/[.045] px-3">
        <textarea
          value={text}
          onChange={updateText}
          placeholder="Write a message..."
          rows={1}
          className="max-h-32 min-h-10 min-w-0 flex-1 resize-none bg-transparent px-1 py-2.5 text-sm outline-none placeholder:text-[var(--cv-muted)]"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
          }}
        />
        <button
          className="grid h-10 w-8 place-items-center text-[var(--cv-muted)] hover:text-[#14F1D9]"
          aria-label="Emoji"
        >
          <FiSmile />
        </button>
      </div>
      <button
        onClick={handleSend}
        className="cv-accent-gradient grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#071318] shadow-[0_8px_22px_rgba(20,241,217,.18)]"
        aria-label="Send"
      >
        <Send size={18} />
      </button>
    </div>
  );
}

export default MessageInput;
