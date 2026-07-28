import { ArrowLeft, MessageCircle, Phone, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getPublicUser } from "../../services/userService";

export default function ContactProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    getPublicUser(userId).then(setUser).catch(() => setUser(false));
  }, [userId]);

  if (user === null) return <div className="min-h-screen bg-[#111b21] p-6 text-[#8696a0]">Loading profile…</div>;
  if (!user) return <div className="min-h-screen bg-[#111b21] p-6 text-white">Profile unavailable.</div>;

  return <div className="min-h-screen bg-[#111b21] pb-8 text-[#e9edef]"><header className="flex items-center gap-5 bg-[#202c33] px-4 py-4"><button onClick={() => navigate(-1)}><ArrowLeft /></button><h1 className="text-lg font-semibold">Contact info</h1></header><main className="mx-auto max-w-xl"><section className="flex flex-col items-center bg-[#202c33] px-6 py-8"><div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-[#6a7175] text-5xl font-semibold">{user.avatar ? <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" /> : user.name?.charAt(0)?.toUpperCase()}</div><h2 className="mt-4 text-2xl font-semibold">{user.name}</h2><p className="mt-1 text-sm text-[#8696a0]">{user.isOnline ? "online" : "offline"}</p></section><section className="mt-2 bg-[#202c33] px-5 py-4"><p className="text-xs text-[#00a884]">About</p><p className="mt-2">{user.bio || "Hey there! I am using ChatVerse."}</p></section><section className="mt-2 flex bg-[#202c33]"><button className="flex flex-1 flex-col items-center gap-2 py-5 text-[#00a884]"><MessageCircle size={21} /><span className="text-xs">Message</span></button><button className="flex flex-1 flex-col items-center gap-2 py-5 text-[#00a884]"><Phone size={21} /><span className="text-xs">Call</span></button><button className="flex flex-1 flex-col items-center gap-2 py-5 text-[#00a884]"><UserRound size={21} /><span className="text-xs">Contact</span></button></section></main></div>;
}
