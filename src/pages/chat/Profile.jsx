import { ArrowLeft, Bell, Check, Grid3X3, ImagePlus, LogIn, Pencil, Play, Settings, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import BottomNav from "../../components/navigations/BottomNav";
import { getMyConnections, getUserDetails, updateUser } from "../../services/authService";
import axiosInstance from "../../services/axiosInstance";
import useSettingsStore from "../../store/useSettingsStore";
import { getMyPosts } from "../../services/chatService";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", bio: "", mobile: "", avatar: "" });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [activePost, setActivePost] = useState(null);
  const [connections, setConnections] = useState({ followers: [], following: [] });
  const [connectionsOpen, setConnectionsOpen] = useState(null);
  const theme = useSettingsStore((state) => state.theme);
  const isLight = theme === "light";
  const pageClass = isLight ? "bg-[#f8f5fb] text-[#1b1023]" : "bg-[#09090b] text-white";
  const panelClass = isLight ? "bg-white" : "bg-[#15111b]";
  const mutedClass = isLight ? "text-[#725d7f]" : "text-zinc-400";
  const isAuthenticated = Boolean(localStorage.getItem("accessToken"));

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    getUserDetails(token)
      .then((response) => {
        const profile = response.data.data;
        setUser(profile);
        setForm({
          name: profile.name || "",
          bio: profile.bio || "",
          mobile: profile.mobile || "",
          avatar: profile.avatar || "",
        });
      })
      .catch(() => toast.error("Could not load your profile"));
    getMyPosts().then((data) => setPosts(data.posts || [])).catch(() => setPosts([])).finally(() => setPostsLoading(false));
    getMyConnections(token).then((response) => setConnections(response.data.data)).catch(() => setConnections({ followers: [], following: [] }));
  }, []);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const selectAvatar = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      let avatar = form.avatar;
      if (avatarFile) {
        const uploadForm = new FormData();
        uploadForm.append("file", avatarFile);
        const upload = await axiosInstance.post("/upload", uploadForm, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        avatar = upload.data.url;
      }
      const response = await updateUser({ ...form, avatar }, localStorage.getItem("accessToken"));
      const profile = response.data.data;
      setUser(profile);
      setForm((current) => ({ ...current, avatar: profile.avatar || "" }));
      setAvatarFile(null);
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      setAvatarPreview("");
      localStorage.setItem("user", JSON.stringify(profile));
      setEditing(false);
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update profile");
    } finally {
      setSaving(false);
    }
  };

  const displayName = user?.name || "Your profile";
  const initials = displayName.charAt(0).toUpperCase();

  if (!isAuthenticated) {
    return (
      <main className={`flex min-h-screen items-center justify-center p-6 ${pageClass}`}>
        <section className={`w-full max-w-sm rounded-2xl p-7 text-center shadow-xl ${panelClass}`}>
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-600 text-white"><UserRound size={30} /></span>
          <h1 className="mt-5 text-2xl font-semibold">Your profile</h1>
          <p className={`mt-2 text-sm ${mutedClass}`}>Sign in to view and manage your profile.</p>
          <button onClick={() => navigate("/login")} className="mt-6 inline-flex items-center gap-2 rounded-full bg-purple-600 px-5 py-2.5 font-medium text-white"><LogIn size={18} /> Log in</button>
        </section>
      </main>
    );
  }

  return (
    <div className={`min-h-screen pb-24 ${pageClass}`}>
      <header className={`sticky top-0 z-10 flex h-16 items-center justify-between px-4 shadow-sm ${panelClass}`}>
        <div className="flex items-center gap-4"><button onClick={() => navigate(-1)} aria-label="Go back" className="rounded-full p-2 hover:bg-white/10"><ArrowLeft size={22} /></button><h1 className="text-xl font-semibold">Profile</h1></div>
        <div className="flex items-center gap-1"><button onClick={() => navigate("/notifications")} aria-label="Open notifications" className="relative rounded-full p-2 hover:bg-white/10"><Bell className="text-[#e9edef]" size={21} />{user?.unreadNotifications > 0 && <span className="absolute right-1 top-1 min-w-4 rounded-full bg-fuchsia-500 px-1 text-center text-[10px] font-bold text-white">{user.unreadNotifications > 9 ? "9+" : user.unreadNotifications}</span>}</button><button onClick={() => navigate("/settings")} aria-label="Open settings" className="rounded-full p-2 hover:bg-white/10"><Settings className="text-[#e9edef]" size={21} /></button></div>
      </header>

      <div className="mx-auto max-w-xl">
        <section className={`flex flex-col items-center px-6 py-7 ${panelClass}`}>
          {user?.avatar ? (
            <img src={user.avatar} alt="Your profile" className="h-32 w-32 rounded-full object-cover" />
          ) : (
            <div className="flex h-32 w-32 items-center justify-center rounded-full bg-[#6a7175] text-5xl font-semibold">
              {initials}
            </div>
          )}

          <h2 className="mt-4 text-2xl font-semibold">{displayName}</h2>
          <p className={`mt-1 text-sm ${mutedClass}`}>{user?.mobile || user?.email || "No phone number added"}</p>
          <button onClick={() => setEditing((value) => !value)} className="mt-5 flex items-center gap-2 rounded-full bg-purple-600 px-5 py-2.5 font-medium text-white">
            <Pencil size={16} />
            {editing ? "Cancel" : "Edit Profile"}
          </button>
        </section>

        <section className={`mt-2 grid grid-cols-3 divide-x ${isLight ? "divide-purple-100" : "divide-zinc-800"} ${panelClass}`}>
          <div className="p-4 text-center"><h3 className="font-bold">{user?.postCount || 0}</h3><p className={`text-xs ${mutedClass}`}>Posts</p></div>
          <button onClick={() => setConnectionsOpen("followers")} className="p-4 text-center transition hover:bg-black/5">
            <h3 className="font-bold">{connections.followers.length}</h3>
            <p className={`text-xs ${mutedClass}`}>Followers</p>
          </button>
          <button onClick={() => setConnectionsOpen("following")} className="p-4 text-center transition hover:bg-black/5">
            <h3 className="font-bold">{connections.following.length}</h3>
            <p className={`text-xs ${mutedClass}`}>Following</p>
          </button>
        </section>

        <section className={`mt-2 px-5 py-4 ${panelClass}`}><p className="text-sm text-purple-500">About</p><p className="mt-2">{user?.bio || "Hey there! I am using ChatVerse."}</p></section>

        <section className={`mt-2 ${panelClass}`}>
          <div className={`flex items-center justify-center gap-2 border-b py-3 ${isLight ? "border-purple-100" : "border-zinc-800"}`}><Grid3X3 size={18} /><span className="text-sm font-semibold">Posts</span></div>
          {postsLoading ? <div className="grid grid-cols-3 gap-0.5 p-0.5">{[1,2,3,4,5,6].map((item) => <div key={item} className="aspect-square animate-pulse bg-zinc-700/40" />)}</div> : posts.length ? <div className="grid grid-cols-3 gap-0.5 bg-black/20">{posts.map((post) => { const media = post.media?.[0]; return <button key={post._id} onClick={() => setActivePost(post)} className="relative aspect-square overflow-hidden bg-zinc-800"><>{media?.type === "video" ? <video src={media.url} className="h-full w-full object-cover" muted playsInline /> : <img src={media?.url} alt={post.caption || "Post"} className="h-full w-full object-cover" />}</><>{media?.type === "video" && <span className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white"><Play size={14} fill="currentColor" /></span>}</></button>; })}</div> : <div className={`px-6 py-12 text-center text-sm ${mutedClass}`}><ImagePlus className="mx-auto mb-3" size={28} />Your uploaded posts will appear here.</div>}
        </section>

        {editing && (
          <form onSubmit={saveProfile} className={`mt-2 space-y-4 p-5 ${panelClass}`}>
            <h3 className="flex items-center gap-2 font-semibold"><UserRound size={18} /> Edit profile</h3>
            <label className={`block text-sm ${mutedClass}`}>Name
              <input name="name" required value={form.name} onChange={handleChange} className={`mt-1 w-full border-b bg-transparent px-0 py-2.5 outline-none focus:border-purple-500 ${isLight ? "border-purple-200 text-[#1b1023]" : "border-zinc-600 text-white"}`} />
            </label>
            <label className={`block text-sm ${mutedClass}`}>About
              <textarea name="bio" value={form.bio} onChange={handleChange} rows="3" maxLength="160" className={`mt-1 w-full resize-none border-b bg-transparent px-0 py-2.5 outline-none focus:border-purple-500 ${isLight ? "border-purple-200 text-[#1b1023]" : "border-zinc-600 text-white"}`} />
            </label>
            <label className={`block text-sm ${mutedClass}`}>Phone number
              <input name="mobile" value={form.mobile} onChange={handleChange} className={`mt-1 w-full border-b bg-transparent px-0 py-2.5 outline-none focus:border-purple-500 ${isLight ? "border-purple-200 text-[#1b1023]" : "border-zinc-600 text-white"}`} />
            </label>
            <div className={`text-sm ${mutedClass}`}>
              <p>Profile photo</p>
              <label className={`mt-2 flex cursor-pointer items-center gap-3 rounded-xl p-3 transition ${isLight ? "bg-purple-100 hover:bg-purple-200" : "bg-zinc-800 hover:bg-zinc-700"}`}>
                {avatarPreview || form.avatar ? <img src={avatarPreview || form.avatar} alt="Selected profile" className="h-12 w-12 rounded-full object-cover" /> : <span className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 text-white"><UserRound size={21} /></span>}
                <span className="flex items-center gap-2 font-medium"><ImagePlus size={18} /> Choose photo</span>
                <input type="file" accept="image/*" className="hidden" onChange={selectAvatar} />
              </label>
              <p className={`mt-2 text-xs ${mutedClass}`}>Choose an image up to 10 MB. It uploads when you save.</p>
            </div>
            <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 font-semibold text-white disabled:opacity-50">
              <Check size={18} /> {saving ? "Saving…" : "Save changes"}
            </button>
          </form>
        )}
      </div>
      {activePost && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"><article className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-[#15111b] text-white"><button onClick={() => setActivePost(null)} className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-2"><X size={18}/></button>{activePost.media?.[0]?.type === "video" ? <video src={activePost.media[0].url} className="max-h-[70vh] w-full bg-black object-contain" controls autoPlay playsInline /> : <img src={activePost.media?.[0]?.url} alt={activePost.caption || "Post"} className="max-h-[70vh] w-full object-contain" />}<div className="p-4"><p className="text-sm">{activePost.caption}</p><p className="mt-2 text-xs text-zinc-400">{activePost.likesCount || 0} likes · {activePost.commentsCount || 0} comments</p></div></article></div>}
      {connectionsOpen && <div className="fixed inset-0 z-50 flex items-end bg-black/65 sm:items-center sm:justify-center" onClick={() => setConnectionsOpen(null)}><section onClick={(event) => event.stopPropagation()} className={`w-full max-w-md rounded-t-3xl p-5 sm:rounded-3xl ${panelClass}`}><div className="flex items-center justify-between"><h2 className="text-lg font-bold">{connectionsOpen === "followers" ? "Followers" : "Following"}</h2><button onClick={() => setConnectionsOpen(null)}><X size={20}/></button></div><div className="mt-4 max-h-[60vh] space-y-3 overflow-y-auto">{connections[connectionsOpen].length ? connections[connectionsOpen].map((person) => <div key={person._id} className={`flex items-center gap-3 rounded-xl p-2 ${isLight ? "bg-purple-50" : "bg-white/5"}`}>{person.avatar ? <img src={person.avatar} alt="" className="h-11 w-11 rounded-full object-cover"/> : <span className="grid h-11 w-11 place-items-center rounded-full bg-purple-600 font-bold text-white">{person.name?.[0]?.toUpperCase()}</span>}<div className="min-w-0"><p className="truncate text-sm font-semibold">{person.name}</p><p className={`truncate text-xs ${mutedClass}`}>{person.username ? `@${person.username}` : person.bio || "ChatVerse member"}</p></div></div>) : <p className={`py-10 text-center text-sm ${mutedClass}`}>No {connectionsOpen} yet.</p>}</div></section></div>}
      <BottomNav />
    </div>
  );
}
