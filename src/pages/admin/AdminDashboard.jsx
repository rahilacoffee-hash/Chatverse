import { BarChart3, CheckCircle2, Eye, FileText, LayoutDashboard, LogOut, Search, ShieldCheck, Trash2, UserCheck, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { getAdminOverview, getAdminPosts, getAdminUsers, removeAdminPost, setUserStatus, setUserVerification } from "../../services/adminService";
import { getUserDetails } from "../../services/authService";

const number = (value) => new Intl.NumberFormat().format(value || 0);
const date = (value) => value ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)) : "—";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [tab, setTab] = useState("Overview");
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [preview, setPreview] = useState(null);

  const allowed = admin?.role === "ADMIN" || admin?.role === "admin" || admin?.isAdmin === true;

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) { navigate("/login", { replace: true }); return; }
    getUserDetails(token).then((response) => setAdmin(response.data.data)).catch(() => toast.error("Could not verify your admin access"));
  }, [navigate]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [overviewData, usersData, postsData] = await Promise.all([getAdminOverview(), getAdminUsers({ q: query, limit: 50 }), getAdminPosts({ q: query, limit: 50 })]);
      setOverview(overviewData || {});
      setUsers(usersData?.users || usersData || []);
      setPosts(postsData?.posts || postsData || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load the admin dashboard");
    } finally { setLoading(false); }
  };

  // Loading begins only once authorization has resolved; the request deliberately
  // should not be reissued for every render of the dashboard.
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { if (allowed) loadDashboard(); }, [allowed]);

  const filteredUsers = useMemo(() => users.filter((user) => `${user.name || ""} ${user.username || ""} ${user.email || ""}`.toLowerCase().includes(query.toLowerCase())), [users, query]);
  const filteredPosts = useMemo(() => posts.filter((post) => `${post.caption || post.text || ""} ${post.user?.name || post.author?.name || ""}`.toLowerCase().includes(query.toLowerCase())), [posts, query]);
  const metrics = [
    ["Total users", overview?.users?.total ?? overview?.totalUsers, Users, "text-violet-300"],
    ["New users", overview?.users?.new ?? overview?.newUsers, UserCheck, "text-emerald-300"],
    ["Published posts", overview?.posts?.total ?? overview?.totalPosts, FileText, "text-sky-300"],
    ["Verified creators", overview?.users?.verified ?? overview?.verifiedUsers, CheckCircle2, "text-fuchsia-300"],
  ];

  const changeVerification = async (user) => {
    const userId = user._id || user.id;
    const verified = !(user.isVerified || user.verified);
    setBusyId(userId);
    try { await setUserVerification(userId, verified); setUsers((items) => items.map((item) => (item._id || item.id) === userId ? { ...item, isVerified: verified, verified } : item)); toast.success(verified ? "User verified" : "Verification removed"); }
    catch (error) { toast.error(error.response?.data?.message || "Could not update verification"); }
    finally { setBusyId(null); }
  };
  const changeStatus = async (user) => {
    const userId = user._id || user.id; const status = user.status === "suspended" ? "active" : "suspended";
    setBusyId(userId);
    try { await setUserStatus(userId, status); setUsers((items) => items.map((item) => (item._id || item.id) === userId ? { ...item, status } : item)); toast.success(status === "suspended" ? "User suspended" : "User restored"); }
    catch (error) { toast.error(error.response?.data?.message || "Could not update user status"); }
    finally { setBusyId(null); }
  };
  const deletePost = async (post) => {
    if (!window.confirm("Remove this post? This action cannot be undone.")) return;
    const postId = post._id || post.id; setBusyId(postId);
    try { await removeAdminPost(postId); setPosts((items) => items.filter((item) => (item._id || item.id) !== postId)); toast.success("Post removed"); }
    catch (error) { toast.error(error.response?.data?.message || "Could not remove post"); }
    finally { setBusyId(null); }
  };

  if (!admin) return <main className="grid min-h-screen place-items-center bg-[#09090b] text-zinc-400">Checking access…</main>;
  if (!allowed) return <main className="grid min-h-screen place-items-center bg-[#09090b] p-5 text-white"><section className="max-w-md rounded-3xl border border-white/10 bg-[#15131a] p-8 text-center"><ShieldCheck className="mx-auto text-fuchsia-400" size={42}/><h1 className="mt-4 text-2xl font-bold">Admin access required</h1><p className="mt-2 text-sm text-zinc-400">This area is restricted to ChatVerse administrators.</p><button onClick={() => navigate("/chats")} className="mt-6 rounded-xl bg-violet-600 px-5 py-2.5 font-semibold">Return to ChatVerse</button></section></main>;

  const nav = [["Overview", LayoutDashboard], ["Users", Users], ["Content", FileText], ["Verification", ShieldCheck]];
  return <main className="min-h-screen bg-[#09090b] text-white"><div className="mx-auto flex min-h-screen max-w-[1440px]"><aside className="hidden w-64 shrink-0 border-r border-white/10 bg-[#100e15] p-5 md:block"><div className="flex items-center gap-3 font-bold"><span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500">C</span><span>ChatVerse<br/><small className="text-xs font-medium text-fuchsia-300">Admin Console</small></span></div><nav className="mt-10 space-y-1">{nav.map(([label, Icon]) => <button key={label} onClick={() => setTab(label)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${tab === label ? "bg-violet-600 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"}`}><Icon size={18}/>{label}</button>)}</nav><button onClick={() => navigate("/chats")} className="mt-10 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-zinc-400 hover:bg-white/5 hover:text-white"><LogOut size={18}/>Exit admin</button></aside><section className="min-w-0 flex-1 p-4 sm:p-7"><header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm text-fuchsia-300">Administration</p><h1 className="text-2xl font-bold sm:text-3xl">{tab}</h1></div><div className="flex items-center gap-3"><div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 sm:flex"><Search size={17} className="text-zinc-500"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users or content" className="w-44 bg-transparent py-2.5 text-sm outline-none placeholder:text-zinc-600"/></div><span className="grid h-10 w-10 place-items-center rounded-full bg-fuchsia-600 font-bold">{admin.name?.[0] || "A"}</span></div></header><div className="mt-5 flex gap-2 overflow-x-auto md:hidden">{nav.map(([label, Icon]) => <button key={label} onClick={() => setTab(label)} className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm ${tab === label ? "bg-violet-600" : "bg-white/5 text-zinc-400"}`}><Icon size={15}/>{label}</button>)}</div>{loading ? <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1,2,3,4].map((item) => <div key={item} className="h-32 animate-pulse rounded-2xl bg-white/5"/>)}</div> : <DashboardBody tab={tab} metrics={metrics} users={filteredUsers} posts={filteredPosts} busyId={busyId} onVerify={changeVerification} onStatus={changeStatus} onDelete={deletePost} onPreview={setPreview}/>}</section></div>{preview && <PostPreview post={preview} close={() => setPreview(null)}/>}</main>;
}

function DashboardBody({ tab, metrics, users, posts, busyId, onVerify, onStatus, onDelete, onPreview }) {
  const userList = tab === "Verification" ? users.filter((user) => !(user.isVerified || user.verified)) : users;
  if (tab === "Overview") return <><div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label, value, Icon, color]) => <article key={label} className="rounded-2xl border border-white/10 bg-[#15131a] p-5"><Icon className={color} size={21}/><p className="mt-5 text-2xl font-bold">{number(value)}</p><p className="mt-1 text-sm text-zinc-400">{label}</p></article>)}</div><div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_.8fr]"><section className="rounded-2xl border border-white/10 bg-[#15131a] p-5"><div className="flex items-center justify-between"><h2 className="font-semibold">Growth overview</h2><BarChart3 className="text-fuchsia-300" size={20}/></div><div className="mt-8 flex h-40 items-end gap-2">{[38,62,48,72,59,86,68,94,75,83,96,89].map((height, index) => <span key={index} style={{height:`${height}%`}} className="flex-1 rounded-t bg-gradient-to-t from-violet-700 to-fuchsia-400/90"/>)}</div><div className="mt-3 flex justify-between text-xs text-zinc-500"><span>12 days ago</span><span>Today</span></div></section><section className="rounded-2xl border border-white/10 bg-[#15131a] p-5"><h2 className="font-semibold">Verification queue</h2><p className="mt-2 text-sm text-zinc-400">{users.filter((user) => !(user.isVerified || user.verified)).length} accounts awaiting review.</p><div className="mt-6 space-y-3">{users.slice(0, 3).map((user) => <UserRow compact key={user._id || user.id} user={user} onVerify={onVerify} busy={busyId === (user._id || user.id)}/>)}</div></section></div></>;
  if (tab === "Content") return <section className="mt-8 rounded-2xl border border-white/10 bg-[#15131a]"><div className="border-b border-white/10 p-5"><h2 className="font-semibold">Content moderation</h2><p className="mt-1 text-sm text-zinc-400">Review and remove published content.</p></div><div className="divide-y divide-white/10">{posts.length ? posts.map((post) => <div key={post._id || post.id} className="flex items-center gap-4 p-4"><div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/10">{post.media?.[0]?.url ? <img src={post.media[0].url} alt="" className="h-full w-full object-cover"/> : <FileText size={19}/>}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{post.caption || post.text || "Untitled post"}</p><p className="mt-1 text-xs text-zinc-500">{post.user?.name || post.author?.name || "Unknown author"} · {date(post.createdAt)}</p></div><button onClick={() => onPreview(post)} className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white" aria-label="Preview post"><Eye size={18}/></button><button disabled={busyId === (post._id || post.id)} onClick={() => onDelete(post)} className="rounded-lg p-2 text-red-300 hover:bg-red-500/10 disabled:opacity-50" aria-label="Remove post"><Trash2 size={18}/></button></div>) : <Empty text="No posts found."/>}</div></section>;
  return <section className="mt-8 rounded-2xl border border-white/10 bg-[#15131a]"><div className="border-b border-white/10 p-5"><h2 className="font-semibold">{tab === "Verification" ? "Verification requests" : "User management"}</h2><p className="mt-1 text-sm text-zinc-400">{tab === "Verification" ? "Only grant badges after reviewing the account." : "Manage account status and verification."}</p></div><div className="divide-y divide-white/10">{userList.length ? userList.map((user) => <UserRow key={user._id || user.id} user={user} onVerify={onVerify} onStatus={onStatus} busy={busyId === (user._id || user.id)}/>) : <Empty text={tab === "Verification" ? "No accounts are waiting for verification." : "No users found."}/>}</div></section>;
}

function UserRow({ user, onVerify, onStatus, busy, compact }) { const verified = user.isVerified || user.verified; return <div className={`flex items-center gap-3 ${compact ? "" : "p-4"}`}><span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-violet-600 font-bold">{user.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover"/> : user.name?.[0] || "U"}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{user.name || "Unnamed user"} {verified && <CheckCircle2 className="inline fill-violet-500 text-white" size={14}/>}</p><p className="truncate text-xs text-zinc-500">{user.username ? `@${user.username}` : user.email || "No email"}</p></div><button disabled={busy} onClick={() => onVerify(user)} className={`rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50 ${verified ? "bg-white/10 text-zinc-300" : "bg-violet-600 text-white"}`}>{verified ? "Unverify" : "Verify"}</button>{!compact && <button disabled={busy} onClick={() => onStatus(user)} className="rounded-lg px-3 py-2 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50">{user.status === "suspended" ? "Restore" : "Suspend"}</button>}</div>; }
function Empty({ text }) { return <p className="p-10 text-center text-sm text-zinc-500">{text}</p>; }
function PostPreview({ post, close }) { const media = post.media?.[0]; return <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4" onClick={close}><article onClick={(event) => event.stopPropagation()} className="w-full max-w-lg overflow-hidden rounded-2xl bg-[#18151e]"><header className="flex items-center justify-between p-4"><b>Post preview</b><button onClick={close} className="rounded-lg p-2 hover:bg-white/10"><X size={18}/></button></header>{media?.url && (media.type === "video" ? <video src={media.url} controls className="max-h-[60vh] w-full bg-black"/> : <img src={media.url} alt="Post media" className="max-h-[60vh] w-full object-contain"/>)}<p className="p-4 text-sm text-zinc-200">{post.caption || post.text || "No caption"}</p></article></div>; }
