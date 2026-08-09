import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  PiChatCircleDotsFill, PiChartLineUpBold, PiCheckCircleFill, PiEyeBold, PiImageSquareBold,
  PiMagnifyingGlassBold, PiSealCheckFill, PiSignOutBold, PiTrashBold, PiUsersThreeBold, PiXBold,
} from "react-icons/pi";
import { getAdminOverview, getAdminPosts, getAdminUsers, removeAdminPost, setUserStatus, setUserVerification } from "../../services/adminService";
import { getUserDetails } from "../../services/authService";

function number(value) {
  return new Intl.NumberFormat().format(value || 0);
}

function shortDate(value) {
  return value ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value)) : "—";
}

function clockTime(value) {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(value ? new Date(value) : new Date());
}

function presenceColor(user) {
  if (user.status === "suspended") return "var(--cv-danger)";
  if (user.isVerified || user.verified) return "var(--cv-online)";
  return "var(--cv-pending)";
}

function ConsoleStyles() {
  return <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
    .cv-console {
      --cv-ink: #0E0B16; --cv-panel: #171220; --cv-panel-alt: #1E1830; --cv-line: #2A2338;
      --cv-signal: #7A66FF; --cv-signal-dim: #493B94; --cv-pulse: #FF8562; --cv-online: #38DE9B;
      --cv-pending: #F5B944; --cv-danger: #FF6B6B; --cv-text: #F3F1FA; --cv-muted: #948DA6;
      font-family: 'Inter', system-ui, sans-serif; background: var(--cv-ink); color: var(--cv-text);
    }
    .cv-console .cv-display { font-family: 'Space Grotesk', sans-serif; }
    .cv-console .cv-mono { font-family: 'IBM Plex Mono', monospace; }
    .cv-bubble { position: relative; border-radius: 4px 16px 16px 16px; }
    .cv-bubble::before {
      content: ""; position: absolute; left: -6px; top: 0; width: 12px; height: 12px;
      background: inherit; border-radius: 3px; transform: rotate(45deg);
    }
    @keyframes cv-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes cv-blink { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
    .cv-rise { animation: cv-rise .35s ease both; }
    .cv-live { animation: cv-blink 2.2s ease-in-out infinite; }
    @media (prefers-reduced-motion: reduce) { .cv-rise, .cv-live { animation: none; } }
    .cv-scroll::-webkit-scrollbar { width: 6px; }
    .cv-scroll::-webkit-scrollbar-thumb { background: var(--cv-line); border-radius: 4px; }
  `}</style>;
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
  let [activity, setActivity] = useState([]);

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

  function logActivity(kind, text) {
    setActivity((items) => [{ id: `${Date.now()}-${Math.random()}`, kind, text, at: new Date() }, ...items].slice(0, 8));
  }

  let filteredUsers = useMemo(() => users.filter((user) => `${user.name || ""} ${user.username || ""} ${user.email || ""}`.toLowerCase().includes(query.toLowerCase())), [users, query]);
  let filteredPosts = useMemo(() => posts.filter((post) => `${post.caption || post.text || ""} ${post.user?.name || post.author?.name || ""}`.toLowerCase().includes(query.toLowerCase())), [posts, query]);
  let metrics = [
    ["Total users", overview?.users?.total ?? overview?.totalUsers, PiUsersThreeBold],
    ["New this week", overview?.users?.new ?? overview?.newUsers, PiChartLineUpBold],
    ["Published posts", overview?.posts?.total ?? overview?.totalPosts, PiImageSquareBold],
    ["Verified creators", overview?.users?.verified ?? overview?.verifiedUsers, PiSealCheckFill],
  ];

  async function changeVerification(user) {
    let userId = user._id || user.id;
    let verified = !(user.isVerified || user.verified);
    setBusyId(userId);
    try {
      await setUserVerification(userId, verified);
      setUsers((items) => items.map((item) => (item._id || item.id) === userId ? { ...item, isVerified: verified, verified } : item));
      toast.success(verified ? "User verified" : "Verification removed");
      logActivity(verified ? "verify" : "unverify", `${verified ? "Verified" : "Unverified"} @${user.username || user.name || "user"}`);
    }
    catch (error) { toast.error(error.response?.data?.message || "Could not update verification"); }
    finally { setBusyId(null); }
  }

  async function changeStatus(user) {
    let userId = user._id || user.id;
    let status = user.status === "suspended" ? "active" : "suspended";
    setBusyId(userId);
    try {
      await setUserStatus(userId, status);
      setUsers((items) => items.map((item) => (item._id || item.id) === userId ? { ...item, status } : item));
      toast.success(status === "suspended" ? "User suspended" : "User restored");
      logActivity(status === "suspended" ? "suspend" : "restore", `${status === "suspended" ? "Suspended" : "Restored"} @${user.username || user.name || "user"}`);
    }
    catch (error) { toast.error(error.response?.data?.message || "Could not update user status"); }
    finally { setBusyId(null); }
  }

  async function deletePost(post) {
    if (!window.confirm("Remove this post? This action cannot be undone.")) return;
    let postId = post._id || post.id;
    setBusyId(postId);
    try {
      await removeAdminPost(postId);
      setPosts((items) => items.filter((item) => (item._id || item.id) !== postId));
      toast.success("Post removed");
      logActivity("remove", `Removed a post by ${post.user?.name || post.author?.name || "unknown author"}`);
    }
    catch (error) { toast.error(error.response?.data?.message || "Could not remove post"); }
    finally { setBusyId(null); }
  }

  if (!admin) return <main className="cv-console grid min-h-screen place-items-center"><ConsoleStyles/><p className="cv-mono text-sm" style={{ color: "var(--cv-muted)" }}>checking access…</p></main>;

  if (!allowed) return <main className="cv-console grid min-h-screen place-items-center p-5"><ConsoleStyles/>
    <section className="cv-bubble max-w-md p-8 text-center" style={{ background: "var(--cv-panel)", border: "1px solid var(--cv-line)" }}>
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl" style={{ background: "var(--cv-signal-dim)" }}><PiSealCheckFill size={26} color="var(--cv-signal)"/></span>
      <h1 className="cv-display mt-5 text-xl font-semibold">Admin access required</h1>
      <p className="mt-2 text-sm" style={{ color: "var(--cv-muted)" }}>This channel is restricted to ChatVerse administrators.</p>
      <button onClick={() => navigate("/chats")} className="mt-6 rounded-full px-5 py-2.5 text-sm font-semibold" style={{ background: "var(--cv-signal)", color: "#0E0B16" }}>Return to ChatVerse</button>
    </section>
  </main>;

  let nav = [["Overview", PiChatCircleDotsFill], ["Users", PiUsersThreeBold], ["Content", PiImageSquareBold], ["Verification", PiSealCheckFill]];

  return <main className="cv-console min-h-screen"><ConsoleStyles/>
    <div className="mx-auto flex min-h-screen max-w-[1440px]">

      <aside className="hidden w-48 shrink-0 flex-col p-4 md:flex" style={{ borderRight: "1px solid var(--cv-line)" }}>
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: "var(--cv-signal)" }}><PiChatCircleDotsFill color="#0E0B16" size={18}/></span>
          <div>
            <p className="cv-display text-sm font-semibold leading-none">ChatVerse</p>
            <p className="cv-mono mt-1 text-[11px]" style={{ color: "var(--cv-muted)" }}>admin console <span className="cv-live" style={{ color: "var(--cv-online)" }}>●</span></p>
          </div>
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {nav.map(([label, Icon]) => <button
            key={label}
            onClick={() => setTab(label)}
            className="flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-sm transition"
            style={tab === label
              ? { background: "var(--cv-panel-alt)", color: "var(--cv-text)", boxShadow: "inset 2px 0 0 var(--cv-signal)" }
              : { color: "var(--cv-muted)" }}
          >
            <Icon size={17}/>
            <span className="cv-mono text-[11px]" style={{ color: "var(--cv-muted)" }}>{label === "Overview" ? "#" : label === "Users" || label === "Verification" ? "@" : "▤"}</span>
            {label}
          </button>)}
        </nav>

        <button onClick={() => navigate("/chats")} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm" style={{ color: "var(--cv-muted)" }}>
          <PiSignOutBold size={17}/>Exit admin
        </button>
      </aside>

      <section className="min-w-0 flex-1 p-4 sm:p-7">
        <header className="flex flex-wrap items-center justify-between gap-4 pb-5" style={{ borderBottom: "1px solid var(--cv-line)" }}>
          <div>
            <p className="cv-mono text-xs" style={{ color: "var(--cv-signal)" }}>{tab === "Overview" ? "#overview" : tab === "Content" ? "▤content" : "@" + tab.toLowerCase()}</p>
            <h1 className="cv-display mt-1 text-2xl font-semibold">{tab === "Overview" ? "Command channel" : tab}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full px-4 py-2 sm:flex" style={{ background: "var(--cv-panel)", border: "1px solid var(--cv-line)" }}>
              <PiMagnifyingGlassBold size={15} color="var(--cv-muted)"/>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this workspace" className="w-44 bg-transparent text-sm outline-none" style={{ color: "var(--cv-text)" }}/>
            </div>
            <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold" style={{ background: "var(--cv-signal-dim)", color: "var(--cv-text)" }}>
              {admin.name?.[0] || "A"}
              <span className="cv-live absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full" style={{ background: "var(--cv-online)", border: "2px solid var(--cv-ink)" }}/>
            </span>
          </div>
        </header>

        <div className="mt-4 flex gap-2 overflow-x-auto md:hidden">
          {nav.map(([label, Icon]) => <button key={label} onClick={() => setTab(label)} className="flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm" style={tab === label ? { background: "var(--cv-signal)", color: "#0E0B16" } : { background: "var(--cv-panel)", color: "var(--cv-muted)" }}><Icon size={14}/>{label}</button>)}
        </div>

        {loading
          ? <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl" style={{ background: "var(--cv-panel)" }}/>)}</div>
          : <DashboardBody tab={tab} metrics={metrics} users={filteredUsers} posts={filteredPosts} activity={activity} busyId={busyId} onVerify={changeVerification} onStatus={changeStatus} onDelete={deletePost} onPreview={setPreview}/>}
      </section>
    </div>
    {preview && <PostPreview post={preview} close={() => setPreview(null)}/>}
  </main>;
}

function DashboardBody({ tab, metrics, users, posts, activity, busyId, onVerify, onStatus, onDelete, onPreview }) {
  if (tab === "Overview") return <>
    <div className="cv-rise mt-7 flex flex-wrap gap-x-8 gap-y-4 rounded-2xl px-6 py-5" style={{ background: "var(--cv-panel)", border: "1px solid var(--cv-line)" }}>
      {metrics.map(([label, value, Icon], index) => <div key={label} className="flex items-center gap-3" style={{ paddingLeft: index ? "24px" : 0, borderLeft: index ? "1px solid var(--cv-line)" : "none" }}>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: "var(--cv-signal-dim)" }}><Icon size={16} color="var(--cv-signal)"/></span>
        <div><p className="cv-mono text-xl font-semibold leading-none">{number(value)}</p><p className="mt-1.5 text-xs" style={{ color: "var(--cv-muted)" }}>{label}</p></div>
      </div>)}
    </div>

    <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
      <section className="cv-rise rounded-2xl p-5" style={{ background: "var(--cv-panel)", border: "1px solid var(--cv-line)" }}>
        <div className="flex items-center justify-between"><h2 className="cv-display text-sm font-semibold">Growth, last 12 days</h2><PiChartLineUpBold color="var(--cv-signal)" size={18}/></div>
        <div className="mt-8 flex h-36 items-end gap-2">{[38, 62, 48, 72, 59, 86, 68, 94, 75, 83, 96, 89].map((height, index, arr) => <span key={index} style={{ height: `${height}%`, background: index === arr.length - 1 ? "var(--cv-signal)" : "var(--cv-panel-alt)" }} className="flex-1 rounded-t"/>)}</div>
        <div className="cv-mono mt-3 flex justify-between text-[10px]" style={{ color: "var(--cv-muted)" }}><span>12d ago</span><span>today</span></div>
      </section>

      <section className="cv-rise flex flex-col rounded-2xl p-5" style={{ background: "var(--cv-panel)", border: "1px solid var(--cv-line)" }}>
        <div className="flex items-center justify-between"><h2 className="cv-display text-sm font-semibold">Console log</h2><span className="cv-mono text-[10px]" style={{ color: "var(--cv-muted)" }}>this session</span></div>
        <div className="cv-scroll mt-4 flex-1 space-y-3 overflow-y-auto pr-1" style={{ maxHeight: "260px" }}>
          {activity.length ? activity.map((event) => <ActivityBubble key={event.id} event={event}/>) : <p className="cv-bubble px-4 py-3 text-xs" style={{ background: "var(--cv-panel-alt)", color: "var(--cv-muted)" }}>No moderation actions yet — verify a user or remove a post to see it logged here.</p>}
        </div>
      </section>
    </div>
  </>;

  if (tab === "Content") return <section className="cv-rise mt-7 space-y-3">
    {posts.length ? posts.map((post) => <div key={post._id || post.id} className="flex items-center gap-4 rounded-2xl p-3" style={{ background: "var(--cv-panel)", border: "1px solid var(--cv-line)" }}>
      <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl" style={{ background: "var(--cv-panel-alt)" }}>{post.media?.[0]?.url ? <img src={post.media[0].url} alt="" className="h-full w-full object-cover"/> : <PiImageSquareBold size={20} color="var(--cv-muted)"/>}</div>
      <div className="cv-bubble min-w-0 flex-1 px-4 py-2.5" style={{ background: "var(--cv-panel-alt)" }}>
        <p className="truncate text-sm">{post.caption || post.text || "Untitled post"}</p>
        <p className="cv-mono mt-1 text-[10px]" style={{ color: "var(--cv-muted)" }}>{post.user?.name || post.author?.name || "Unknown author"} · {shortDate(post.createdAt)}</p>
      </div>
      <button onClick={() => onPreview(post)} aria-label="Preview post" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ color: "var(--cv-muted)" }}><PiEyeBold size={17}/></button>
      <button disabled={busyId === (post._id || post.id)} onClick={() => onDelete(post)} aria-label="Remove post" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg disabled:opacity-40" style={{ color: "var(--cv-danger)" }}><PiTrashBold size={17}/></button>
    </div>) : <Empty text="No posts found."/>}
  </section>;

  let list = tab === "Verification" ? users.filter((user) => !(user.isVerified || user.verified)) : users;
  return <section className="cv-rise mt-7 space-y-2">
    <p className="text-xs" style={{ color: "var(--cv-muted)" }}>{tab === "Verification" ? "Only grant a badge after reviewing the account." : "Manage account status and verification."}</p>
    {list.length ? list.map((user) => <UserRow key={user._id || user.id} user={user} onVerify={onVerify} onStatus={onStatus} busy={busyId === (user._id || user.id)}/>) : <Empty text={tab === "Verification" ? "No accounts are waiting for verification." : "No users found."}/>}
  </section>;
}

function ActivityBubble({ event }) {
  let dot = event.kind === "remove" ? "var(--cv-pulse)" : event.kind === "suspend" ? "var(--cv-danger)" : "var(--cv-online)";
  return <div className="cv-rise flex items-start gap-2.5">
    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: dot }}/>
    <div className="cv-bubble px-3.5 py-2.5" style={{ background: "var(--cv-panel-alt)" }}>
      <p className="text-xs leading-snug">{event.text}</p>
      <p className="cv-mono mt-1 text-[10px]" style={{ color: "var(--cv-muted)" }}>{clockTime(event.at)}</p>
    </div>
  </div>;
}

function UserRow({ user, onVerify, onStatus, busy }) {
  return <div className="flex items-center gap-3 rounded-2xl p-3" style={{ background: "var(--cv-panel)", border: "1px solid var(--cv-line)" }}>
    <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full text-sm font-bold" style={{ background: "var(--cv-signal-dim)" }}>
      {user.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover"/> : user.name?.[0] || "U"}
      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full" style={{ background: presenceColor(user), border: "2px solid var(--cv-panel)" }}/>
    </span>
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-medium">{user.name || "Unnamed user"} {(user.isVerified || user.verified) && <PiCheckCircleFill className="inline" color="var(--cv-signal)" size={13}/>}</p>
      <p className="cv-mono truncate text-[11px]" style={{ color: "var(--cv-muted)" }}>{user.username ? `@${user.username}` : user.email || "no email"}</p>
    </div>
    <button disabled={busy} onClick={() => onVerify(user)} className="cv-mono shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-semibold disabled:opacity-40" style={(user.isVerified || user.verified) ? { color: "var(--cv-muted)", border: "1px solid var(--cv-line)" } : { background: "var(--cv-signal)", color: "#0E0B16" }}>{(user.isVerified || user.verified) ? "unverify" : "verify"}</button>
    <button disabled={busy} onClick={() => onStatus(user)} className="cv-mono shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-semibold disabled:opacity-40" style={{ color: "var(--cv-danger)" }}>{user.status === "suspended" ? "restore" : "suspend"}</button>
  </div>;
}

function Empty({ text }) {
  return <div className="cv-bubble mx-auto max-w-xs px-5 py-4 text-center text-xs" style={{ background: "var(--cv-panel-alt)", color: "var(--cv-muted)" }}>{text}</div>;
}

function PostPreview({ post, close }) {
  let media = post.media?.[0];
  return <div className="cv-console fixed inset-0 z-50 grid place-items-center p-4" style={{ background: "rgba(6,4,10,0.8)" }} onClick={close}>
    <ConsoleStyles/>
    <article onClick={(event) => event.stopPropagation()} className="cv-rise w-full max-w-lg overflow-hidden rounded-2xl" style={{ background: "var(--cv-panel)", border: "1px solid var(--cv-line)" }}>
      <header className="flex items-center justify-between p-4" style={{ borderBottom: "1px solid var(--cv-line)" }}>
        <span className="cv-display text-sm font-semibold">Post preview</span>
        <button onClick={close} className="grid h-8 w-8 place-items-center rounded-lg" style={{ color: "var(--cv-muted)" }}><PiXBold size={16}/></button>
      </header>
      {media?.url && (media.type === "video" ? <video src={media.url} controls className="max-h-[60vh] w-full bg-black"/> : <img src={media.url} alt="Post media" className="max-h-[60vh] w-full object-contain"/>)}
      <p className="cv-bubble m-4 px-4 py-3 text-sm" style={{ background: "var(--cv-panel-alt)" }}>{post.caption || post.text || "No caption"}</p>
    </article>
  </div>;
}