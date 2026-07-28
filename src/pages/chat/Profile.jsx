import { ArrowLeft, Check, ImagePlus, LogIn, Pencil, Settings, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import BottomNav from "../../components/navigations/BottomNav";
import { getUserDetails, updateUser } from "../../services/authService";
import axiosInstance from "../../services/axiosInstance";
import useSettingsStore from "../../store/useSettingsStore";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", bio: "", mobile: "", avatar: "" });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
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
        <button onClick={() => navigate("/settings")} aria-label="Open settings" className="rounded-full p-2 hover:bg-white/10"><Settings className="text-[#e9edef]" size={21} /></button>
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

        <section className={`mt-2 grid grid-cols-2 divide-x ${isLight ? "divide-purple-100" : "divide-zinc-800"} ${panelClass}`}>
          <div className="p-4 text-center">
            <h3 className="font-bold">{user?.followers?.length || 0}</h3>
            <p className={`text-xs ${mutedClass}`}>Followers</p>
          </div>
          <div className="p-4 text-center">
            <h3 className="font-bold">{user?.following?.length || 0}</h3>
            <p className={`text-xs ${mutedClass}`}>Following</p>
          </div>
        </section>

        <section className={`mt-2 px-5 py-4 ${panelClass}`}><p className="text-sm text-purple-500">About</p><p className="mt-2">{user?.bio || "Hey there! I am using ChatVerse."}</p></section>

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
      <BottomNav />
    </div>
  );
}
