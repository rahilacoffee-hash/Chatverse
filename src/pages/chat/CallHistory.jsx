import { Phone, PhoneIncoming, PhoneMissed, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../../components/navigations/BottomNav";
import useChatStore from "../../store/useChatStore";
import { startVideoCall, startVoiceCall } from "../../services/voiceCallService";

export default function CallHistory() {
  const navigate = useNavigate();
  const callHistory = useChatStore((state) => state.callHistory);
  const conversations = useChatStore((state) => state.conversations);

  const callAgain = (entry) => {
    const conversation = conversations.find((item) => item.participants?.some((person) => String(person._id) === String(entry.userId)));
    const contact = conversation?.participants?.find((person) => String(person._id) === String(entry.userId)) || { _id: entry.userId, name: entry.name };
    if (entry.type === "video") startVideoCall(contact);
    else startVoiceCall(contact);
  };

  return <div className="min-h-screen bg-[#09090B] pb-24 text-white">
    <div className="border-b border-white/10 px-5 py-5"><h1 className="text-3xl font-bold">Calls</h1><p className="mt-1 text-sm text-zinc-500">Your recent voice and video calls</p></div>
    <main className="p-3">
      {!callHistory.length ? <div className="py-20 text-center text-zinc-500"><Phone size={32} className="mx-auto mb-3" />No calls yet</div> : callHistory.map((entry) => {
        const missed = entry.outcome === "missed";
        const Icon = missed ? PhoneMissed : entry.direction === "incoming" ? PhoneIncoming : Phone;
        return <div key={entry.id} className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-zinc-900">
          <span className={`grid h-11 w-11 place-items-center rounded-full ${missed ? "bg-red-500/15 text-red-400" : "bg-purple-500/15 text-purple-300"}`}><Icon size={20} /></span>
          <div className="min-w-0 flex-1"><p className="truncate font-medium">{entry.name || "Unknown"}</p><p className={`text-xs ${missed ? "text-red-400" : "text-zinc-500"}`}>{missed ? "Missed" : entry.direction === "incoming" ? "Incoming" : "Outgoing"} · {new Date(entry.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p></div>
          <button onClick={() => callAgain(entry)} className="rounded-full p-3 text-purple-300 hover:bg-purple-500/15" aria-label={`Call ${entry.name}`}><>{entry.type === "video" ? <Video size={19} /> : <Phone size={19} />}</></button>
        </div>;
      })}
    </main>
    <BottomNav />
  </div>;
}
