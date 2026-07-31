import { ArrowLeft, Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../../services/userService";

export default function Notifications() {
  const navigate = useNavigate();
  const [count, setCount] = useState(null);
  useEffect(() => { getCurrentUser().then((user) => setCount(user.unreadNotifications || 0)).catch(() => setCount(0)); }, []);
  return <main className="min-h-screen bg-[#09090b] p-4 text-white"><header className="flex h-12 items-center gap-3"><button onClick={() => navigate(-1)} aria-label="Back" className="rounded-full p-2 hover:bg-white/10"><ArrowLeft size={21} /></button><h1 className="text-xl font-semibold">Notifications</h1></header><section className="mt-5 rounded-2xl border border-white/10 bg-zinc-900/80 p-5 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-fuchsia-500/15 text-fuchsia-300"><Bell /></span><h2 className="mt-4 font-semibold">{count === null ? "Loading notifications…" : count ? `${count} unread chat notification${count === 1 ? "" : "s"}` : "You’re all caught up"}</h2><p className="mt-2 text-sm text-zinc-400">Unread messages from your chats appear here.</p></section></main>;
}
