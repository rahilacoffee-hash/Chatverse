import { ArrowLeft, Camera, Phone, Search, ShieldCheck, UserMinus, UserPlus, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import useChatStore from "../../store/useChatStore";
import useSettingsStore from "../../store/useSettingsStore";
import socket from "../../lib/socket";
import { joinGroupCall } from "../../services/voiceCallService";
import { addGroupMembers, promoteGroupAdmin, removeGroupMember, updateGroup } from "../../services/chatService";
import { searchUsers } from "../../services/userService";
import axiosInstance from "../../services/axiosInstance";

export default function GroupProfile() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { conversations, fetchConversations, updateConversation } = useChatStore();
  const [joinableCall, setJoinableCall] = useState(null);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const theme = useSettingsStore((state) => state.theme);
  const isLight = theme === "light";
  const group = conversations.find((conversation) => conversation._id === groupId && conversation.isGroup);
  const pageClass = isLight ? "bg-[#f8f5fb] text-[#1b1023]" : "bg-[#09090b] text-white";
  const panelClass = isLight ? "bg-white" : "bg-[#15111b]";
  const currentUserId = localStorage.getItem("userId");
  const isAdmin = group?.admins?.some((admin) => String(admin?._id || admin) === String(currentUserId));
  const creatorId = String(group?.createdBy?._id || group?.createdBy || group?.admins?.[0]?._id || group?.admins?.[0] || "");

  useEffect(() => {
    fetchConversations(true);
  }, [fetchConversations, groupId]);

  useEffect(() => {
    if (!groupId) return undefined;
    const checkForCall = () => socket.emit("getActiveGroupCall", { conversationId: groupId }, (result) => setJoinableCall(result?.call || null));
    checkForCall();
    socket.on("connect", checkForCall);
    return () => socket.off("connect", checkForCall);
  }, [groupId]);

  useEffect(() => {
    if (!adding || !query.trim()) { setResults([]); return undefined; }
    const timeout = setTimeout(() => searchUsers(query).then((users) => {
      const memberIds = new Set((group?.participants || []).map((member) => String(member._id)));
      setResults(users.filter((user) => !memberIds.has(String(user._id))));
    }).catch(() => setResults([])), 300);
    return () => clearTimeout(timeout);
  }, [adding, query, group?.participants]);

  const applyGroup = (updated) => { updateConversation(updated); };
  const addMember = async (member) => {
    try { setBusy(true); applyGroup(await addGroupMembers(groupId, [member._id])); setQuery(""); toast.success(`${member.name} added to the group`); }
    catch (error) { toast.error(error.response?.data?.message || "Could not add member"); }
    finally { setBusy(false); }
  };
  const removeMember = async (member) => {
    if (!window.confirm(`Remove ${member.name} from this group?`)) return;
    try { setBusy(true); applyGroup(await removeGroupMember(groupId, member._id)); toast.success(`${member.name} removed`); }
    catch (error) { toast.error(error.response?.data?.message || "Could not remove member"); }
    finally { setBusy(false); }
  };
  const makeAdmin = async (member) => {
    try { setBusy(true); applyGroup(await promoteGroupAdmin(groupId, member._id)); toast.success(`${member.name} is now an admin`); }
    catch (error) { toast.error(error.response?.data?.message || "Could not make admin"); }
    finally { setBusy(false); }
  };
  const uploadGroupPhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return toast.error("Please choose an image file");
    try {
      setBusy(true);
      const form = new FormData(); form.append("file", file);
      const upload = await axiosInstance.post("/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
      applyGroup(await updateGroup(groupId, { groupAvatar: upload.data.url }));
      toast.success("Group photo updated");
    } catch (error) { toast.error(error.response?.data?.message || "Could not update group photo"); }
    finally { setBusy(false); event.target.value = ""; }
  };

  if (!group) return <main className={`min-h-screen p-6 ${pageClass}`}>Loading group info…</main>;

  return (
    <main className={`min-h-screen pb-8 ${pageClass}`}>
      <header className={`flex h-16 items-center gap-4 px-4 ${panelClass}`}>
        <button onClick={() => navigate(-1)} className="rounded-full p-2 hover:bg-black/10" aria-label="Go back"><ArrowLeft size={22} /></button>
        <h1 className="text-xl font-semibold">Group info</h1>
      </header>
      <section className={`mt-2 flex flex-col items-center px-6 py-7 ${panelClass}`}>
        <div className="relative"><span className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-purple-600 text-white">{group.groupAvatar ? <img src={group.groupAvatar} alt="Group" className="h-full w-full object-cover" /> : <Users size={52} />}</span>{isAdmin && <label className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-purple-600 p-2 text-white shadow"><Camera size={18} /><input className="hidden" type="file" accept="image/*" onChange={uploadGroupPhoto} disabled={busy} /></label>}</div>
        <h2 className="mt-4 text-2xl font-semibold">{group.groupName || "Group chat"}</h2>
        <p className="mt-1 text-sm text-zinc-400">{group.participants?.length || 0} participants</p>
      </section>
      {joinableCall && <section className={`mt-2 px-5 py-4 ${panelClass}`}><button onClick={() => void joinGroupCall(joinableCall)} className="flex w-full items-center gap-3 rounded-xl bg-purple-600 px-4 py-3 text-left text-white"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15"><Phone size={18} /></span><span className="flex-1"><b className="block text-sm">{joinableCall.callType} call in progress</b><small className="text-purple-100">Join the group call</small></span><span className="text-sm font-semibold">Join</span></button></section>}
      {isAdmin && <section className={`mt-2 px-5 py-4 ${panelClass}`}><button onClick={() => setAdding(true)} className="flex w-full items-center gap-3 text-left text-purple-500"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 text-white"><UserPlus size={20} /></span><span className="font-medium">Add participants</span></button></section>}
      <section className={`mt-2 ${panelClass}`}>
        <h3 className="px-5 py-4 text-sm font-medium text-purple-500">Participants</h3>
        {group.participants?.filter(Boolean).map((member) => {
          const memberId = String(member._id); const memberIsAdmin = group.admins?.some((admin) => String(admin?._id || admin) === memberId); const isCreator = memberId === creatorId;
          return <div key={member._id} className="flex items-center gap-3 px-5 py-3 hover:bg-purple-500/10">
          <button onClick={() => navigate(`/profile/${member._id}`)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
            {member.avatar ? <img src={member.avatar} alt="" className="h-12 w-12 rounded-full object-cover" /> : <span className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 font-semibold text-white">{member.name?.charAt(0)?.toUpperCase()}</span>}
            <span className="min-w-0 flex-1"><b className="block truncate">{member.name}{memberId === String(currentUserId) ? " (You)" : ""}</b><small className="text-zinc-400">{isCreator ? "Group creator" : "Tap to view profile"}</small></span>
          </button>
          {memberIsAdmin && <span className="rounded-full bg-purple-500/15 px-2 py-1 text-xs font-medium text-purple-500">Admin</span>}
          {isAdmin && memberId !== String(currentUserId) && <details className="relative"><summary className="cursor-pointer list-none rounded-full p-2 text-zinc-400">•••</summary><div className={`absolute right-0 z-10 mt-1 w-40 rounded-xl p-1 shadow-xl ${panelClass}`}>{!memberIsAdmin && <button disabled={busy} onClick={() => makeAdmin(member)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-purple-500/10"><ShieldCheck size={16} />Make admin</button>}{!isCreator && <button disabled={busy} onClick={() => removeMember(member)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-red-500/10"><UserMinus size={16} />Remove</button>}</div></details>}
        </div>;
        })}
      </section>
      {adding && <div className="fixed inset-0 z-30 flex items-end bg-black/50 sm:items-center sm:justify-center"><section className={`w-full max-w-md rounded-t-2xl p-5 sm:rounded-2xl ${panelClass}`}><div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-semibold">Add participants</h3><button onClick={() => { setAdding(false); setQuery(""); }}><X /></button></div><div className="relative"><Search className="absolute left-3 top-3 text-zinc-400" size={18} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people" className={`w-full rounded-xl py-3 pl-10 pr-3 outline-none ${isLight ? "bg-purple-50" : "bg-zinc-800"}`} /></div><div className="mt-3 max-h-72 space-y-1 overflow-y-auto">{results.map((member) => <button key={member._id} disabled={busy} onClick={() => addMember(member)} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-purple-500/10">{member.avatar ? <img src={member.avatar} alt="" className="h-10 w-10 rounded-full object-cover" /> : <span className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 text-white">{member.name?.[0]}</span>}<span><b className="block">{member.name}</b><small className="text-zinc-400">{member.email}</small></span><UserPlus className="ml-auto text-purple-500" size={19} /></button>)}{query && !results.length && <p className="p-3 text-center text-sm text-zinc-400">No people found</p>}</div></section></div>}
    </main>
  );
}
