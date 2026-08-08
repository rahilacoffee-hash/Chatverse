import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Avatar, Button, Chip, CircularProgress, Dialog, DialogContent, DialogTitle, IconButton, InputAdornment, Skeleton, TextField } from "@mui/material";
import { MdBarChart, MdCheckCircle, MdClose, MdDashboard, MdDeleteOutline, MdDescription, MdGroup, MdLogout, MdPersonAddAlt1, MdSearch, MdVerifiedUser, MdVisibility } from "react-icons/md";
import { getAdminOverview, getAdminPosts, getAdminUsers, removeAdminPost, setUserStatus, setUserVerification } from "../../services/adminService";
import { getUserDetails } from "../../services/authService";

function number(value) {
  return new Intl.NumberFormat().format(value || 0);
}

function date(value) {
  return value ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)) : "—";
}

export default function AdminDashboard() {
  let navigate = useNavigate();
  let [admin, setAdmin] = useState(null);
  let [tab, setTab] = useState("Overview");
  let [overview, setOverview] = useState(null);
  let [users, setUsers] = useState([]);
  let [posts, setPosts] = useState([]);
  let [query, setQuery] = useState("");
  let [loading, setLoading] = useState(true);
  let [busyId, setBusyId] = useState(null);
  let [preview, setPreview] = useState(null);

  let allowed = admin?.role === "ADMIN" || admin?.role === "admin" || admin?.isAdmin === true;

  useEffect(() => {
    let token = localStorage.getItem("accessToken");
    if (!token) { navigate("/login", { replace: true }); return; }
    getUserDetails(token).then((response) => setAdmin(response.data.data)).catch(() => toast.error("Could not verify your admin access"));
  }, [navigate]);

  async function loadDashboard() {
    setLoading(true);
    try {
      let [overviewData, usersData, postsData] = await Promise.all([getAdminOverview(), getAdminUsers({ q: query, limit: 50 }), getAdminPosts({ q: query, limit: 50 })]);
      setOverview(overviewData || {});
      setUsers(usersData?.users || usersData || []);
      setPosts(postsData?.posts || postsData || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load the admin dashboard");
    } finally { setLoading(false); }
  }

  // Loading begins only once authorization has resolved; the request deliberately
  // should not be reissued for every render of the dashboard.
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { if (allowed) loadDashboard(); }, [allowed]);

  let filteredUsers = useMemo(() => users.filter((user) => `${user.name || ""} ${user.username || ""} ${user.email || ""}`.toLowerCase().includes(query.toLowerCase())), [users, query]);
  let filteredPosts = useMemo(() => posts.filter((post) => `${post.caption || post.text || ""} ${post.user?.name || post.author?.name || ""}`.toLowerCase().includes(query.toLowerCase())), [posts, query]);
  let metrics = [
    ["Total users", overview?.users?.total ?? overview?.totalUsers, MdGroup, "text-violet-300"],
    ["New users", overview?.users?.new ?? overview?.newUsers, MdPersonAddAlt1, "text-emerald-300"],
    ["Published posts", overview?.posts?.total ?? overview?.totalPosts, MdDescription, "text-sky-300"],
    ["Verified creators", overview?.users?.verified ?? overview?.verifiedUsers, MdCheckCircle, "text-fuchsia-300"],
  ];

  async function changeVerification(user) {
    let userId = user._id || user.id;
    let verified = !(user.isVerified || user.verified);
    setBusyId(userId);
    try { await setUserVerification(userId, verified); setUsers((items) => items.map((item) => (item._id || item.id) === userId ? { ...item, isVerified: verified, verified } : item)); toast.success(verified ? "User verified" : "Verification removed"); }
    catch (error) { toast.error(error.response?.data?.message || "Could not update verification"); }
    finally { setBusyId(null); }
  }

  async function changeStatus(user) {
    let userId = user._id || user.id;
    let status = user.status === "suspended" ? "active" : "suspended";
    setBusyId(userId);
    try { await setUserStatus(userId, status); setUsers((items) => items.map((item) => (item._id || item.id) === userId ? { ...item, status } : item)); toast.success(status === "suspended" ? "User suspended" : "User restored"); }
    catch (error) { toast.error(error.response?.data?.message || "Could not update user status"); }
    finally { setBusyId(null); }
  }

  async function deletePost(post) {
    if (!window.confirm("Remove this post? This action cannot be undone.")) return;
    let postId = post._id || post.id;
    setBusyId(postId);
    try { await removeAdminPost(postId); setPosts((items) => items.filter((item) => (item._id || item.id) !== postId)); toast.success("Post removed"); }
    catch (error) { toast.error(error.response?.data?.message || "Could not remove post"); }
    finally { setBusyId(null); }
  }

  if (!admin) return <main className="grid min-h-screen place-items-center bg-[#09090b] text-zinc-400"><CircularProgress size={20} sx={{ color: "#a78bfa", marginRight: "10px" }}/>Checking access…</main>;
  if (!allowed) return <main className="grid min-h-screen place-items-center bg-[#09090b] p-5 text-white"><section className="max-w-md rounded-3xl border border-white/10 bg-[#15131a] p-8 text-center"><MdVerifiedUser className="mx-auto text-fuchsia-400" size={42}/><h1 className="mt-4 text-2xl font-bold">Admin access required</h1><p className="mt-2 text-sm text-zinc-400">This area is restricted to ChatVerse administrators.</p><Button onClick={() => navigate("/chats")} variant="contained" sx={{ marginTop: "24px", backgroundColor: "#7c3aed", textTransform: "none", fontWeight: 600, "&:hover": { backgroundColor: "#6d28d9" } }}>Return to ChatVerse</Button></section></main>;

  let nav = [["Overview", MdDashboard], ["Users", MdGroup], ["Content", MdDescription], ["Verification", MdVerifiedUser]];
  return <main className="min-h-screen bg-[#09090b] text-white">
    <div className="mx-auto flex min-h-screen max-w-[1440px]">
      <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-[#100e15] p-5 md:block">
        <div className="flex items-center gap-3 font-bold"><span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500">C</span><span>ChatVerse<br/><small className="text-xs font-medium text-fuchsia-300">Admin Console</small></span></div>
        <nav className="mt-10 space-y-1">{nav.map(([label, Icon]) => <button key={label} onClick={() => setTab(label)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${tab === label ? "bg-violet-600 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"}`}><Icon size={18}/>{label}</button>)}</nav>
        <Button onClick={() => navigate("/chats")} startIcon={<MdLogout size={18}/>} sx={{ marginTop: "40px", width: "100%", justifyContent: "flex-start", textTransform: "none", color: "#a1a1aa", "&:hover": { backgroundColor: "rgba(255,255,255,0.05)", color: "#fff" } }}>Exit admin</Button>
      </aside>
      <section className="min-w-0 flex-1 p-4 sm:p-7">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-sm text-fuchsia-300">Administration</p><h1 className="text-2xl font-bold sm:text-3xl">{tab}</h1></div>
          <div className="flex items-center gap-3">
            <TextField
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search users or content"
              size="small"
              className="hidden sm:block"
              InputProps={{ startAdornment: <InputAdornment position="start"><MdSearch color="#71717a"/></InputAdornment> }}
              sx={{ width: "220px", "& .MuiOutlinedInput-root": { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "12px", color: "#fff" }, "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.1)" } }}
            />
            <Avatar sx={{ bgcolor: "#c026d3", fontWeight: 700 }}>{admin.name?.[0] || "A"}</Avatar>
          </div>
        </header>
        <div className="mt-5 flex gap-2 overflow-x-auto md:hidden">{nav.map(([label, Icon]) => <button key={label} onClick={() => setTab(label)} className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm ${tab === label ? "bg-violet-600" : "bg-white/5 text-zinc-400"}`}><Icon size={15}/>{label}</button>)}</div>
        {loading
          ? <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <Skeleton key={item} variant="rounded" height={128} sx={{ bgcolor: "rgba(255,255,255,0.05)", borderRadius: "16px" }}/>)}</div>
          : <DashboardBody tab={tab} metrics={metrics} users={filteredUsers} posts={filteredPosts} busyId={busyId} onVerify={changeVerification} onStatus={changeStatus} onDelete={deletePost} onPreview={setPreview}/>}
      </section>
    </div>
    {preview && <PostPreview post={preview} close={() => setPreview(null)}/>}
  </main>;
}

function DashboardBody({ tab, metrics, users, posts, busyId, onVerify, onStatus, onDelete, onPreview }) {
  if (tab === "Overview") return <>
    <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label, value, Icon, color]) => <article key={label} className="rounded-2xl border border-white/10 bg-[#15131a] p-5"><Icon className={color} size={21}/><p className="mt-5 text-2xl font-bold">{number(value)}</p><p className="mt-1 text-sm text-zinc-400">{label}</p></article>)}</div>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
      <section className="rounded-2xl border border-white/10 bg-[#15131a] p-5">
        <div className="flex items-center justify-between"><h2 className="font-semibold">Growth overview</h2><MdBarChart className="text-fuchsia-300" size={20}/></div>
        <div className="mt-8 flex h-40 items-end gap-2">{[38, 62, 48, 72, 59, 86, 68, 94, 75, 83, 96, 89].map((height, index) => <span key={index} style={{ height: `${height}%` }} className="flex-1 rounded-t bg-gradient-to-t from-violet-700 to-fuchsia-400/90"/>)}</div>
        <div className="mt-3 flex justify-between text-xs text-zinc-500"><span>12 days ago</span><span>Today</span></div>
      </section>
      <section className="rounded-2xl border border-white/10 bg-[#15131a] p-5">
        <h2 className="font-semibold">Verification queue</h2>
        <p className="mt-2 text-sm text-zinc-400">{users.filter((user) => !(user.isVerified || user.verified)).length} accounts awaiting review.</p>
        <div className="mt-6 space-y-3">{users.slice(0, 3).map((user) => <UserRow compact key={user._id || user.id} user={user} onVerify={onVerify} busy={busyId === (user._id || user.id)}/>)}</div>
      </section>
    </div>
  </>;

  if (tab === "Content") return <section className="mt-8 rounded-2xl border border-white/10 bg-[#15131a]">
    <div className="border-b border-white/10 p-5"><h2 className="font-semibold">Content moderation</h2><p className="mt-1 text-sm text-zinc-400">Review and remove published content.</p></div>
    <div className="divide-y divide-white/10">{posts.length ? posts.map((post) => <div key={post._id || post.id} className="flex items-center gap-4 p-4">
      <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/10">{post.media?.[0]?.url ? <img src={post.media[0].url} alt="" className="h-full w-full object-cover"/> : <MdDescription size={19}/>}</div>
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{post.caption || post.text || "Untitled post"}</p><p className="mt-1 text-xs text-zinc-500">{post.user?.name || post.author?.name || "Unknown author"} · {date(post.createdAt)}</p></div>
      <IconButton onClick={() => onPreview(post)} sx={{ color: "#a1a1aa", "&:hover": { color: "#fff", backgroundColor: "rgba(255,255,255,0.1)" } }} aria-label="Preview post"><MdVisibility size={18}/></IconButton>
      <IconButton disabled={busyId === (post._id || post.id)} onClick={() => onDelete(post)} sx={{ color: "#fca5a5", "&:hover": { backgroundColor: "rgba(239,68,68,0.1)" } }} aria-label="Remove post"><MdDeleteOutline size={18}/></IconButton>
    </div>) : <Empty text="No posts found."/>}</div>
  </section>;

  return <section className="mt-8 rounded-2xl border border-white/10 bg-[#15131a]">
    <div className="border-b border-white/10 p-5"><h2 className="font-semibold">{tab === "Verification" ? "Verification requests" : "User management"}</h2><p className="mt-1 text-sm text-zinc-400">{tab === "Verification" ? "Only grant badges after reviewing the account." : "Manage account status and verification."}</p></div>
    <div className="divide-y divide-white/10">{(tab === "Verification" ? users.filter((user) => !(user.isVerified || user.verified)) : users).length
      ? (tab === "Verification" ? users.filter((user) => !(user.isVerified || user.verified)) : users).map((user) => <UserRow key={user._id || user.id} user={user} onVerify={onVerify} onStatus={onStatus} busy={busyId === (user._id || user.id)}/>)
      : <Empty text={tab === "Verification" ? "No accounts are waiting for verification." : "No users found."}/>}</div>
  </section>;
}

function UserRow({ user, onVerify, onStatus, busy, compact }) {
  return <div className={`flex items-center gap-3 ${compact ? "" : "p-4"}`}>
    <Avatar src={user.avatar} sx={{ bgcolor: "#7c3aed", fontWeight: 700 }}>{user.name?.[0] || "U"}</Avatar>
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-semibold">{user.name || "Unnamed user"} {(user.isVerified || user.verified) && <MdCheckCircle className="inline text-violet-400" size={14}/>}</p>
      <p className="truncate text-xs text-zinc-500">{user.username ? `@${user.username}` : user.email || "No email"}</p>
    </div>
    <Button disabled={busy} onClick={() => onVerify(user)} size="small" variant={(user.isVerified || user.verified) ? "outlined" : "contained"} sx={{ textTransform: "none", fontWeight: 600, ...((user.isVerified || user.verified) ? { color: "#d4d4d8", borderColor: "rgba(255,255,255,0.15)" } : { backgroundColor: "#7c3aed", "&:hover": { backgroundColor: "#6d28d9" } }) }}>{(user.isVerified || user.verified) ? "Unverify" : "Verify"}</Button>
    {!compact && <Button disabled={busy} onClick={() => onStatus(user)} size="small" sx={{ textTransform: "none", color: "#fca5a5", "&:hover": { backgroundColor: "rgba(239,68,68,0.1)" } }}>{user.status === "suspended" ? "Restore" : "Suspend"}</Button>}
  </div>;
}

function Empty({ text }) {
  return <p className="p-10 text-center text-sm text-zinc-500">{text}</p>;
}

function PostPreview({ post, close }) {
  let media = post.media?.[0];
  return <Dialog open onClose={close} maxWidth="sm" fullWidth PaperProps={{ sx: { backgroundColor: "#18151e", borderRadius: "16px", color: "#fff" } }}>
    <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      Post preview
      <IconButton onClick={close} sx={{ color: "#d4d4d8" }}><MdClose size={18}/></IconButton>
    </DialogTitle>
    <DialogContent sx={{ padding: 0 }}>
      {media?.url && (media.type === "video" ? <video src={media.url} controls className="max-h-[60vh] w-full bg-black"/> : <img src={media.url} alt="Post media" className="max-h-[60vh] w-full object-contain"/>)}
      <p className="p-4 text-sm text-zinc-200">{post.caption || post.text || "No caption"}</p>
    </DialogContent>
  </Dialog>;
}