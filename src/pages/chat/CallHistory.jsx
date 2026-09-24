import { Phone, PhoneIncoming, PhoneMissed, Video } from "lucide-react";
import BottomNav from "../../components/navigations/BottomNav";
import useChatStore from "../../store/useChatStore";
import {
  startVideoCall,
  startVoiceCall,
} from "../../services/voiceCallService";

export default function CallHistory() {
  const callHistory = useChatStore((state) => state.callHistory);
  const conversations = useChatStore((state) => state.conversations);

  const callAgain = (entry) => {
    const conversation = conversations.find((item) =>
      item.participants?.some(
        (person) => String(person._id) === String(entry.userId),
      ),
    );
    const contact = conversation?.participants?.find(
      (person) => String(person._id) === String(entry.userId),
    ) || { _id: entry.userId, name: entry.name };
    if (entry.type === "video") startVideoCall(contact);
    else startVoiceCall(contact);
  };

  return (
    <div className="cv-page min-h-[100svh] pb-24">
      <div className="border-b border-white/10 px-5 pb-5 pt-[max(1rem,env(safe-area-inset-top))]">
        <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#14F1D9]">
          Connected moments
        </p>
        <h1 className="mt-1 text-3xl font-bold">Calls</h1>
        <p className="mt-1 text-sm text-[var(--cv-muted)]">
          Your recent voice and video calls
        </p>
      </div>
      <main className="p-3">
        {!callHistory.length ? (
          <div className="py-20 text-center text-[var(--cv-muted)]">
            <Phone size={32} className="mx-auto mb-3 text-[#14F1D9]" />
            No calls yet
          </div>
        ) : (
          callHistory.map((entry) => {
            const missed = entry.outcome === "missed";
            const Icon = missed
              ? PhoneMissed
              : entry.direction === "incoming"
                ? PhoneIncoming
                : Phone;
            return (
              <div
                key={entry.id}
                className="flex items-center gap-3 border-b border-white/[.06] px-3 py-4 hover:bg-white/[.04]"
              >
                <span
                  className={`grid h-11 w-11 place-items-center rounded-2xl ${missed ? "bg-red-500/15 text-red-400" : "bg-[#14F1D9]/15 text-[#14F1D9]"}`}
                >
                  <Icon size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {entry.name || "Unknown"}
                  </p>
                  <p
                    className={`text-xs ${missed ? "text-red-400" : "text-zinc-500"}`}
                  >
                    {missed
                      ? "Missed"
                      : entry.direction === "incoming"
                        ? "Incoming"
                        : "Outgoing"}{" "}
                    ·{" "}
                    {new Date(entry.createdAt).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <button
                  onClick={() => callAgain(entry)}
                  className="rounded-full p-3 text-purple-300 hover:bg-purple-500/15"
                  aria-label={`Call ${entry.name}`}
                >
                  <>
                    {entry.type === "video" ? (
                      <Video size={19} />
                    ) : (
                      <Phone size={19} />
                    )}
                  </>
                </button>
              </div>
            );
          })
        )}
      </main>
      <BottomNav />
    </div>
  );
}
