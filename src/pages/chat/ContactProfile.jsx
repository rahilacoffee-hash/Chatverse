import { ArrowLeft, MessageCircle, Phone, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { createConversation } from "../../services/chatService";
import { getPublicUser } from "../../services/userService";
import { startVoiceCall } from "../../services/voiceCallService";
import useChatStore from "../../store/useChatStore";

export default function ContactProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [openingChat, setOpeningChat] = useState(false);
  const selectChat = useChatStore((state) => state.selectChat);

  useEffect(() => {
    getPublicUser(userId).then(setUser).catch(() => setUser(false));
  }, [userId]);

  const openChat = async () => {
    try {
      setOpeningChat(true);
      const conversation = await createConversation(user._id);
      selectChat(conversation);
      navigate("/chat");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not open this chat");
    } finally {
      setOpeningChat(false);
    }
  };

  const callUser = async () => {
    const started = await startVoiceCall(user);
    if (!started) toast.error("This person is unavailable for a call right now.");
  };

  const contactUser = async () => {
    if (!user.mobile) return toast.info("This contact has not shared a phone number.");
    try {
      await navigator.clipboard.writeText(user.mobile);
      toast.success("Phone number copied");
    } catch {
      window.location.href = `tel:${user.mobile}`;
    }
  };

  if (user === null) return <div className="min-h-screen bg-[#09090b] p-6 text-zinc-400">Loading profile…</div>;
  if (!user) return <div className="min-h-screen bg-[#09090b] p-6 text-white">Profile unavailable.</div>;

  return <div className="min-h-screen bg-[#09090b] pb-8 text-white"><header className="flex items-center gap-5 bg-[#111015] px-4 py-4"><button onClick={() => navigate(-1)} className="rounded-full p-2 hover:bg-white/10"><ArrowLeft /></button><h1 className="text-lg font-semibold">Contact info</h1></header><main className="mx-auto max-w-xl"><section className="flex flex-col items-center bg-[#15111b] px-6 py-8"><div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-purple-600 text-5xl font-semibold">{user.avatar ? <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" /> : user.name?.charAt(0)?.toUpperCase()}</div><h2 className="mt-4 text-2xl font-semibold">{user.name}</h2><p className="mt-1 text-sm text-zinc-400">{user.isOnline ? "online" : "offline"}</p></section><section className="mt-2 bg-[#15111b] px-5 py-4"><p className="text-xs text-purple-400">About</p><p className="mt-2">{user.bio || "Hey there! I am using ChatVerse."}</p></section><section className="mt-2 flex bg-[#15111b]"><button onClick={openChat} disabled={openingChat} className="flex flex-1 flex-col items-center gap-2 py-5 text-purple-400 disabled:opacity-50"><MessageCircle size={21} /><span className="text-xs">{openingChat ? "Opening…" : "Message"}</span></button><button onClick={callUser} className="flex flex-1 flex-col items-center gap-2 py-5 text-purple-400"><Phone size={21} /><span className="text-xs">Call</span></button><button onClick={contactUser} className="flex flex-1 flex-col items-center gap-2 py-5 text-purple-400"><UserRound size={21} /><span className="text-xs">Contact</span></button></section></main></div>;
}
