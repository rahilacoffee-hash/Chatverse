import { Check, ImagePlus, Pencil, Settings, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import BottomNav from "../../components/navigations/BottomNav";
import { getUserDetails, updateUser } from "../../services/authService";
import axiosInstance from "../../services/axiosInstance";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", bio: "", mobile: "", avatar: "" });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");

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

  return (
    <div className="bg-[#09090B] min-h-screen text-white pb-24">
      <div className="p-6">
        <div className="flex justify-end">
          <button onClick={() => navigate("/settings")} aria-label="Open settings"><Settings className="text-zinc-400" /></button>
        </div>

        <div className="flex flex-col items-center mt-4">
          {user?.avatar ? (
            <img src={user.avatar} alt="Your profile" className="w-28 h-28 rounded-full object-cover border-2 border-purple-500" />
          ) : (
            <div className="w-28 h-28 rounded-full bg-purple-600 flex items-center justify-center text-4xl font-bold">
              {initials}
            </div>
          )}

          <h2 className="mt-4 text-2xl font-bold">
            {displayName}
          </h2>

          <p className="text-zinc-500">
            {user?.bio || user?.email || "Add a short bio"}
          </p>

          <button onClick={() => setEditing((value) => !value)} className="mt-4 flex items-center gap-2 bg-purple-600 px-5 py-2 rounded-full">
            <Pencil size={16} />
            {editing ? "Cancel" : "Edit Profile"}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-8">
          <div className="bg-zinc-900 rounded-xl p-4 text-center">
            <h3 className="font-bold">{user?.followers?.length || 0}</h3>
            <p className="text-xs text-zinc-500">
              Followers
            </p>
          </div>

          <div className="bg-zinc-900 rounded-xl p-4 text-center">
            <h3 className="font-bold">{user?.following?.length || 0}</h3>
            <p className="text-xs text-zinc-500">
              Following
            </p>
          </div>
        </div>

        {editing && (
          <form onSubmit={saveProfile} className="mt-8 space-y-4 rounded-2xl bg-zinc-900 p-5">
            <h3 className="flex items-center gap-2 font-semibold"><UserRound size={18} /> Edit profile</h3>
            <label className="block text-sm text-zinc-300">Name
              <input name="name" required value={form.name} onChange={handleChange} className="mt-1 w-full rounded-xl bg-zinc-800 px-3 py-2.5 text-white outline-none focus:ring-2 focus:ring-purple-600" />
            </label>
            <label className="block text-sm text-zinc-300">Bio
              <textarea name="bio" value={form.bio} onChange={handleChange} rows="3" maxLength="160" className="mt-1 w-full resize-none rounded-xl bg-zinc-800 px-3 py-2.5 text-white outline-none focus:ring-2 focus:ring-purple-600" />
            </label>
            <label className="block text-sm text-zinc-300">Phone number
              <input name="mobile" value={form.mobile} onChange={handleChange} className="mt-1 w-full rounded-xl bg-zinc-800 px-3 py-2.5 text-white outline-none focus:ring-2 focus:ring-purple-600" />
            </label>
            <div className="text-sm text-zinc-300">
              <p>Profile photo</p>
              <label className="mt-2 flex cursor-pointer items-center gap-3 rounded-xl bg-zinc-800 p-3 transition hover:bg-zinc-700">
                {avatarPreview || form.avatar ? <img src={avatarPreview || form.avatar} alt="Selected profile" className="h-12 w-12 rounded-full object-cover" /> : <span className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-600"><UserRound size={21} /></span>}
                <span className="flex items-center gap-2 font-medium"><ImagePlus size={18} /> Choose photo</span>
                <input type="file" accept="image/*" className="hidden" onChange={selectAvatar} />
              </label>
              <p className="mt-2 text-xs text-zinc-500">Choose an image up to 10 MB. It uploads when you save.</p>
            </div>
            <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 font-semibold disabled:opacity-50">
              <Check size={18} /> {saving ? "Saving…" : "Save changes"}
            </button>
          </form>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
