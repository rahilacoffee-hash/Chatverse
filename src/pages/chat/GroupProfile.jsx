import { ArrowLeft, Camera, Phone, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useChatStore from "../../store/useChatStore";
import useSettingsStore from "../../store/useSettingsStore";
import socket from "../../lib/socket";
import { joinGroupCall } from "../../services/voiceCallService";

export default function GroupProfile() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { conversations, fetchConversations } = useChatStore();
  const [joinableCall, setJoinableCall] = useState(null);
  const theme = useSettingsStore((state) => state.theme);
  const isLight = theme === "light";
  const group = conversations.find((conversation) => conversation._id === groupId && conversation.isGroup);
  const pageClass = isLight ? "bg-[#f8f5fb] text-[#1b1023]" : "bg-[#09090b] text-white";
  const panelClass = isLight ? "bg-white" : "bg-[#15111b]";

  useEffect(() => {
    if (!group) fetchConversations();
  }, [fetchConversations, group]);

  useEffect(() => {
    if (!groupId) return undefined;
    const checkForCall = () => socket.emit("getActiveGroupCall", { conversationId: groupId }, (result) => setJoinableCall(result?.call || null));
    checkForCall();
    socket.on("connect", checkForCall);
    return () => socket.off("connect", checkForCall);
  }, [groupId]);

  if (!group) return <main className={`min-h-screen p-6 ${pageClass}`}>Loading group info…</main>;

  return (
    <main className={`min-h-screen pb-8 ${pageClass}`}>
      <header className={`flex h-16 items-center gap-4 px-4 ${panelClass}`}>
        <button onClick={() => navigate(-1)} className="rounded-full p-2 hover:bg-black/10" aria-label="Go back"><ArrowLeft size={22} /></button>
        <h1 className="text-xl font-semibold">Group info</h1>
      </header>
      <section className={`mt-2 flex flex-col items-center px-6 py-7 ${panelClass}`}>
        <span className="flex h-32 w-32 items-center justify-center rounded-full bg-purple-600 text-white"><Users size={52} /></span>
        <h2 className="mt-4 text-2xl font-semibold">{group.groupName || "Group chat"}</h2>
        <p className="mt-1 text-sm text-zinc-400">{group.participants?.length || 0} participants</p>
      </section>
      {joinableCall && <section className={`mt-2 px-5 py-4 ${panelClass}`}><button onClick={() => void joinGroupCall(joinableCall)} className="flex w-full items-center gap-3 rounded-xl bg-purple-600 px-4 py-3 text-left text-white"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15"><Phone size={18} /></span><span className="flex-1"><b className="block text-sm">{joinableCall.callType} call in progress</b><small className="text-purple-100">Join the group call</small></span><span className="text-sm font-semibold">Join</span></button></section>}
      <section className={`mt-2 ${panelClass}`}>
        <h3 className="px-5 py-4 text-sm font-medium text-purple-500">Participants</h3>
        {group.participants?.filter(Boolean).map((member) => (
          <button key={member._id} onClick={() => navigate(`/profile/${member._id}`)} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-purple-500/10">
            {member.avatar ? <img src={member.avatar} alt="" className="h-12 w-12 rounded-full object-cover" /> : <span className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 font-semibold text-white">{member.name?.charAt(0)?.toUpperCase()}</span>}
            <span className="min-w-0 flex-1"><b className="block truncate">{member.name}</b><small className="text-zinc-400">Tap to view profile</small></span>
          </button>
        ))}
      </section>
      <section className={`mt-2 flex items-center gap-3 px-5 py-4 text-sm text-zinc-400 ${panelClass}`}><Camera size={19} className="text-purple-400" />Group photo and member management are coming next.</section>
    </main>
  );
}
