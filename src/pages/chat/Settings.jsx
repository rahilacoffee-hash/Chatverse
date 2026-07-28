import { ArrowLeft, Check, ChevronRight, Eye, ImagePlus, MessageSquareText, Moon, Palette, ShieldCheck, Sun, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axiosInstance from "../../services/axiosInstance";
import useSettingsStore from "../../store/useSettingsStore";

const backgrounds = [
  { id: "default", name: "Default", preview: "#09090B" },
  { id: "midnight", name: "Midnight", preview: "#111827" },
  { id: "forest", name: "Forest", preview: "#0c1f1a" },
  { id: "lavender", name: "Lavender", preview: "linear-gradient(135deg, #24103b, #09090B)" },
];

export default function Settings() {
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const { readReceipts, chatBackground, chatBackgroundImage, theme, setReadReceipts, setChatBackground, setChatBackgroundImage, setTheme } = useSettingsStore();
  const isLight = theme === "light";
  const pageClass = isLight ? "bg-[#f8f5fb] text-[#1b1023]" : "bg-[#09090b] text-white";
  const panelClass = isLight ? "bg-white" : "bg-[#15111b]";
  const mutedClass = isLight ? "text-[#725d7f]" : "text-zinc-400";

  const uploadBackground = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file");
      return;
    }
    try {
      setUploading(true);
      const form = new FormData();
      form.append("file", file);
      const response = await axiosInstance.post("/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setChatBackgroundImage(response.data.url);
      toast.success("Chat background updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not upload background");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div className={`min-h-screen pb-8 ${pageClass}`}>
      <header className={`sticky top-0 z-10 flex h-16 items-center gap-4 px-4 shadow-sm ${isLight ? "bg-white" : "bg-[#111015]"}`}>
        <button onClick={() => navigate(-1)} aria-label="Go back" className="rounded-full p-2 hover:bg-white/10"><ArrowLeft size={22} /></button>
        <h1 className="text-xl font-semibold">Settings</h1>
      </header>

      <main className="mx-auto max-w-xl">
        <section className={`mt-2 px-5 py-4 ${panelClass}`}>
          <div className="flex items-center gap-4"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-purple-600 text-white"><ShieldCheck size={22} /></span><div><p className="font-medium">Privacy</p><p className={`mt-0.5 text-sm ${mutedClass}`}>Control how your messages are handled</p></div></div>
        </section>
        <section className={`mt-2 px-5 py-4 ${panelClass}`}>
          <div className="flex items-start gap-3">
            <span className="mt-1 text-purple-400"><Eye size={20} /></span>
            <div className="flex-1"><p className="font-medium">Read receipts</p><p className={`mt-1 text-sm ${mutedClass}`}>Let others know when you have read their messages.</p></div>
            <button onClick={() => setReadReceipts(!readReceipts)} role="switch" aria-checked={readReceipts} className={`relative h-7 w-12 rounded-full transition ${readReceipts ? "bg-purple-600" : "bg-zinc-600"}`}>
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${readReceipts ? "left-6" : "left-1"}`} />
            </button>
          </div>
        </section>

        <h2 className="px-5 pb-2 pt-6 text-sm font-medium text-purple-500">Appearance</h2>
        <section className={`px-5 py-4 ${panelClass}`}>
          <div className="flex items-center gap-3"><span className="text-purple-400">{isLight ? <Sun size={20} /> : <Moon size={20} />}</span><div className="flex-1"><p className="font-medium">Theme</p><p className={`text-sm ${mutedClass}`}>Choose how ChatVerse looks.</p></div></div>
          <div className={`mt-4 grid grid-cols-2 rounded-xl p-1 ${isLight ? "bg-purple-100" : "bg-black"}`}>
            <button onClick={() => setTheme("light")} className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium ${isLight ? "bg-white text-purple-700 shadow" : mutedClass}`}><Sun size={16} /> Day</button>
            <button onClick={() => setTheme("dark")} className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium ${!isLight ? "bg-purple-600 text-white shadow" : mutedClass}`}><Moon size={16} /> Night</button>
          </div>
        </section>
        <h2 className="px-5 pb-2 pt-6 text-sm font-medium text-purple-500">Chats</h2>
        <section className={`px-5 py-4 ${panelClass}`}>
          <div className="flex items-center gap-3"><span className="text-purple-400"><Palette size={20} /></span><div><p className="font-medium">Chat wallpaper</p><p className={`text-sm ${mutedClass}`}>Choose a background for your chats.</p></div><ChevronRight className={`ml-auto ${mutedClass}`} /></div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {backgrounds.map((background) => (
              <button key={background.id} onClick={() => setChatBackground(background.id)} className={`relative overflow-hidden rounded-xl border-2 p-1 text-left ${chatBackground === background.id ? "border-purple-500" : "border-transparent"}`}>
                <span className="block h-20 rounded-lg" style={{ background: background.preview }} />
                <span className="mt-2 block text-xs">{background.name}</span>
                {chatBackground === background.id && <span className="absolute right-2 top-2 rounded-full bg-purple-600 p-1 text-white"><Check size={12} /></span>}
              </button>
            ))}
            <label className={`relative cursor-pointer overflow-hidden rounded-xl border-2 p-1 text-left ${chatBackground === "custom" ? "border-purple-500" : "border-transparent"}`}>
              <span className={`flex h-20 items-center justify-center rounded-lg ${isLight ? "bg-purple-100" : "bg-zinc-800"}`} style={chatBackgroundImage ? { backgroundImage: `url(${chatBackgroundImage})`, backgroundPosition: "center", backgroundSize: "cover" } : undefined}>
                {!chatBackgroundImage && <ImagePlus size={22} className={mutedClass} />}
              </span>
              <span className="mt-2 block text-xs">{uploading ? "Uploading…" : "Photo"}</span>
              <input type="file" accept="image/*" disabled={uploading} className="hidden" onChange={uploadBackground} />
              {chatBackground === "custom" && <span className="absolute right-2 top-2 rounded-full bg-purple-600 p-1 text-white"><Check size={12} /></span>}
            </label>
          </div>
          {chatBackgroundImage && <button onClick={() => setChatBackgroundImage("")} className="mt-4 flex items-center gap-2 text-sm text-red-400"><Trash2 size={16} /> Remove custom photo</button>}
        </section>

        <section className={`mt-2 flex items-center gap-3 px-5 py-4 text-sm ${panelClass} ${mutedClass}`}><MessageSquareText size={20} className="shrink-0 text-purple-400" />These choices are saved on this device and apply immediately.</section>
      </main>
    </div>
  );
}
