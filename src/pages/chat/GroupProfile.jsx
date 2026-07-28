import { ArrowLeft, Camera, Users } from "lucide-react";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useChatStore from "../../store/useChatStore";
import useSettingsStore from "../../store/useSettingsStore";

export default function GroupProfile() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { conversations, fetchConversations } = useChatStore();
  const theme = useSettingsStore((state) => state.theme);
  const isLight = theme === "light";
  const group = conversations.find((conversation) => conversation._id === groupId && conversation.isGroup);
  const pageClass = isLight ? "bg-[#f8f5fb] text-[#1b1023]" : "bg-[#09090b] text-white";
  const panelClass = isLight ? "bg-white" : "bg-[#15111b]";

  useEffect(() => {
    if (!group) fetchConversations();
  }, [fetchConversations, group]);

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
      <section className={`mt-2 ${panelClass}`}>
        <h3 className="px-5 py-4 text-sm font-medium text-purple-500">Participants</h3>
        {group.participants?.map((member) => (
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
