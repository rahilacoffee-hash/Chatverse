import { Bell, Bot, CalendarDays, ChevronRight, Compass, Hash, Plus, Search, Sparkles, Users } from "lucide-react";
import { useEffect, useState } from "react";
import BottomNav from "../../components/navigations/BottomNav";

const categories = ["Trending", "Communities", "AI", "Gaming", "Technology", "Music", "Sports", "Business", "Education", "Design"];
const chats = [
  ["Design After Dark", "2.4k active", "The future of product design", "DA"],
  ["React Builders", "1.8k active", "Ship better interfaces together", "⚛"],
  ["The Startup Circle", "986 active", "Ideas, founders & funding", "SC"],
];
const assistants = [["✦", "ChatVerse AI", "Your always-on creative partner"], ["</>", "Coding Assistant", "Debug, build and learn faster"], ["✎", "Study Assistant", "Turn lessons into breakthroughs"], ["↗", "Business Advisor", "Strategy for your next move"], ["✈", "Travel Planner", "Thoughtful trips, beautifully planned"]];
const people = [["M", "Maya Thompson", "12 mutual friends"], ["J", "Jordan Lee", "8 mutual friends"], ["A", "Amara Okafor", "6 mutual friends"]];

const Avatar = ({ value, className = "" }) => <span className={`flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 font-semibold text-white shadow-lg shadow-fuchsia-950/40 ${className}`}>{value}</span>;

export default function Explore() {
  const [active, setActive] = useState("Trending");
  const [following, setFollowing] = useState([]);
  const [visible, setVisible] = useState(3);
  const [loading, setLoading] = useState(true);
  useEffect(() => { const id = setTimeout(() => setLoading(false), 500); return () => clearTimeout(id); }, []);
  useEffect(() => {
    const loadMore = () => { if (window.innerHeight + window.scrollY > document.body.offsetHeight - 450) setVisible((n) => Math.min(n + 2, chats.length)); };
    window.addEventListener("scroll", loadMore, { passive: true }); return () => window.removeEventListener("scroll", loadMore);
  }, []);
  const toggleFollow = (name) => setFollowing((items) => items.includes(name) ? items.filter((item) => item !== name) : [...items, name]);

  return <main className="min-h-screen overflow-x-hidden bg-[#09090b] pb-28 font-sans text-white selection:bg-fuchsia-500/40">
    <div className="pointer-events-none fixed inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,_rgba(124,58,237,.24),transparent_65%)]" />
    <div className="relative mx-auto max-w-2xl px-4 pt-6 sm:px-6">
      <header className="mb-6 flex items-center justify-between"><div><p className="text-xs font-medium uppercase tracking-[.2em] text-fuchsia-300">Discover</p><h1 className="mt-1 font-['Space_Grotesk'] text-3xl font-bold tracking-tight">Explore ChatVerse</h1></div><button className="glass flex h-11 w-11 items-center justify-center rounded-2xl text-zinc-300 transition hover:scale-105 hover:text-white"><Bell size={19} /></button></header>
      <label className="glass group flex items-center gap-3 rounded-[20px] px-4 py-4 shadow-2xl shadow-black/20"><Search size={20} className="text-fuchsia-300 transition group-focus-within:scale-110" /><input className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-500" placeholder="Search people, groups, AI..." /></label>

      <div className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">{categories.map((category) => <button key={category} onClick={() => setActive(category)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition active:scale-95 ${active === category ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-lg shadow-fuchsia-900/35" : "glass text-zinc-400 hover:text-white"}`}>{category}</button>)}</div>

      {loading ? <div className="mt-6 h-64 animate-pulse rounded-[24px] bg-zinc-800/60" /> : <section className="relative mt-6 overflow-hidden rounded-[24px] border border-white/10 bg-zinc-900/75 p-5 shadow-2xl shadow-black/30 backdrop-blur-xl"><div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(217,70,239,.45),transparent_33%),linear-gradient(135deg,rgba(124,58,237,.45),transparent_65%)]" /><div className="relative"><span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-fuchsia-100"><Sparkles size={13} /> Featured community</span><div className="mt-10 flex items-end justify-between"><div className="min-w-0"><Avatar value="◈" className="mb-3 h-12 w-12 text-xl" /><h2 className="font-['Space_Grotesk'] text-2xl font-bold">Future Makers</h2><p className="mt-1 text-sm text-violet-100">24.8k members · Building what’s next</p></div><button className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-violet-700 transition hover:scale-105 active:scale-95">Join</button></div><p className="mt-4 max-w-md text-sm leading-6 text-violet-100/90">A curated home for builders, designers and curious minds shaping tomorrow.</p></div></section>}

      <Section title="Trending chats" action="See all">{chats.slice(0, visible).map(([name, activeUsers, topic, avatar]) => <article key={name} className="glass card-rise mb-3 flex items-center gap-3 rounded-[20px] p-3"><Avatar value={avatar} className="h-12 w-12" /><div className="min-w-0 flex-1"><h3 className="truncate font-semibold">{name}</h3><p className="mt-0.5 text-xs text-emerald-300">● {activeUsers}</p><p className="truncate text-xs text-zinc-500">{topic}</p></div><button className="rounded-xl bg-violet-500/15 px-3 py-2 text-xs font-semibold text-fuchsia-300 transition hover:bg-fuchsia-500 hover:text-white">Join</button></article>)}</Section>
      <Section title="Popular AI assistants" action="View all"><div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">{assistants.map(([icon, name, description]) => <article key={name} className="glass card-rise w-44 shrink-0 rounded-[20px] p-4"><Avatar value={icon} className="h-11 w-11 text-sm" /><h3 className="mt-4 font-semibold">{name}</h3><p className="mt-1 h-10 text-xs leading-5 text-zinc-400">{description}</p><button className="mt-4 w-full rounded-xl bg-white/8 py-2 text-xs font-semibold text-fuchsia-300 transition hover:bg-fuchsia-500 hover:text-white">Chat</button></article>)}</div></Section>
      <Section title="Suggested for you" action="Refresh">{people.map(([avatar, name, mutual]) => <article key={name} className="glass card-rise mb-3 flex items-center gap-3 rounded-[20px] p-3"><Avatar value={avatar} className="h-12 w-12" /><div className="flex-1"><h3 className="font-semibold">{name}</h3><p className="text-xs text-zinc-500">{mutual}</p></div><button onClick={() => toggleFollow(name)} className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${following.includes(name) ? "bg-white/10 text-zinc-300" : "bg-gradient-to-r from-violet-600 to-fuchsia-600"}`}>{following.includes(name) ? "Following" : "Follow"}</button></article>)}</Section>
      <Section title="Trending now"><div className="grid grid-cols-2 gap-3">{["AI", "React", "JavaScript", "Football", "Crypto", "Music", "Startup", "Design"].map((tag, index) => <button key={tag} className="glass card-rise rounded-2xl p-4 text-left"><Hash className="mb-3 text-fuchsia-400" size={18} /><b>#{tag}</b><span className="mt-1 block text-xs text-zinc-500">{(12.4 - index * .8).toFixed(1)}k conversations</span></button>)}</div></Section>
      <Section title="Upcoming events" action="Calendar"><div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">{[["Creator Camp", "AUG 18 · 6:00 PM", "1.2k interested"], ["AI Design Jam", "AUG 24 · 2:00 PM", "846 interested"]].map(([name, date, interested], index) => <article key={name} className="glass card-rise w-64 shrink-0 overflow-hidden rounded-[20px]"><div className={`h-24 bg-gradient-to-br ${index ? "from-fuchsia-600 to-orange-400" : "from-indigo-600 to-fuchsia-500"}`}><CalendarDays className="m-4 text-white/70" /></div><div className="p-4"><h3 className="font-semibold">{name}</h3><p className="mt-1 text-xs text-fuchsia-300">{date}</p><p className="mt-1 text-xs text-zinc-500">{interested}</p><button className="mt-4 w-full rounded-xl bg-white/10 py-2 text-xs font-semibold hover:bg-white/20">RSVP</button></div></article>)}</div></Section>
      <Section title="Recommended channels"><div className="grid gap-3 sm:grid-cols-2">{[["◉", "Tech Pulse", "84k subscribers"], ["♫", "Midnight Radio", "56k subscribers"], ["▣", "Design Daily", "39k subscribers"]].map(([logo, name, subscribers]) => <article key={name} className="glass card-rise flex items-center gap-3 rounded-[20px] p-3"><Avatar value={logo} className="h-11 w-11" /><div className="min-w-0 flex-1"><b className="block truncate text-sm">{name}</b><small className="text-zinc-500">{subscribers}</small></div><ChevronRight size={17} className="text-zinc-500" /></article>)}</div></Section>
    </div>
    <button className="fixed bottom-20 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-xl shadow-fuchsia-900/50 transition hover:scale-110 active:scale-95" aria-label="Create"><Plus size={25} /></button>
    <BottomNav />
  </main>;
}

function Section({ title, action, children }) { return <section className="mt-9"><div className="mb-3 flex items-center justify-between"><h2 className="font-['Space_Grotesk'] text-lg font-bold">{title}</h2>{action && <button className="text-xs font-medium text-fuchsia-300">{action}</button>}</div>{children}</section>; }
