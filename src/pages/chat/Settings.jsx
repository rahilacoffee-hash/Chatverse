import { ArrowLeft, Check, ChevronRight, Eye, Image, ImagePlus, MessageSquareText, Trash2 } from "lucide-react";
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
  const { readReceipts, chatBackground, chatBackgroundImage, setReadReceipts, setChatBackground, setChatBackgroundImage } = useSettingsStore();

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
    <div className="min-h-screen bg-[#09090B] pb-8 text-white">
      <header className="flex items-center gap-4 border-b border-zinc-900 px-5 py-5">
        <button onClick={() => navigate(-1)} aria-label="Go back"><ArrowLeft /></button>
        <h1 className="text-xl font-bold">Settings</h1>
      </header>

      <main className="mx-auto max-w-xl p-5">
        <h2 className="mb-3 text-sm font-semibold text-zinc-400">PRIVACY</h2>
        <section className="rounded-2xl bg-zinc-900 p-4">
          <div className="flex items-start gap-3">
            <span className="mt-1 text-purple-400"><Eye size={20} /></span>
            <div className="flex-1"><p className="font-medium">Read receipts</p><p className="mt-1 text-sm text-zinc-500">Let others know when you have read their messages.</p></div>
            <button onClick={() => setReadReceipts(!readReceipts)} role="switch" aria-checked={readReceipts} className={`relative h-7 w-12 rounded-full transition ${readReceipts ? "bg-purple-600" : "bg-zinc-700"}`}>
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${readReceipts ? "left-6" : "left-1"}`} />
            </button>
          </div>
        </section>

        <h2 className="mb-3 mt-8 text-sm font-semibold text-zinc-400">CHATS</h2>
        <section className="rounded-2xl bg-zinc-900 p-4">
          <div className="flex items-center gap-3"><span className="text-purple-400"><Image size={20} /></span><div><p className="font-medium">Chat background</p><p className="text-sm text-zinc-500">Choose a background for your chats.</p></div><ChevronRight className="ml-auto text-zinc-500" /></div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {backgrounds.map((background) => (
              <button key={background.id} onClick={() => setChatBackground(background.id)} className={`relative overflow-hidden rounded-xl border-2 p-1 text-left ${chatBackground === background.id ? "border-purple-500" : "border-transparent"}`}>
                <span className="block h-20 rounded-lg" style={{ background: background.preview }} />
                <span className="mt-2 block text-xs">{background.name}</span>
                {chatBackground === background.id && <span className="absolute right-2 top-2 rounded-full bg-purple-600 p-1"><Check size={12} /></span>}
              </button>
            ))}
            <label className={`relative cursor-pointer overflow-hidden rounded-xl border-2 p-1 text-left ${chatBackground === "custom" ? "border-purple-500" : "border-transparent"}`}>
              <span className="flex h-20 items-center justify-center rounded-lg bg-zinc-800" style={chatBackgroundImage ? { backgroundImage: `url(${chatBackgroundImage})`, backgroundPosition: "center", backgroundSize: "cover" } : undefined}>
                {!chatBackgroundImage && <ImagePlus size={22} className="text-zinc-400" />}
              </span>
              <span className="mt-2 block text-xs">{uploading ? "Uploading…" : "Photo"}</span>
              <input type="file" accept="image/*" disabled={uploading} className="hidden" onChange={uploadBackground} />
              {chatBackground === "custom" && <span className="absolute right-2 top-2 rounded-full bg-purple-600 p-1"><Check size={12} /></span>}
            </label>
          </div>
          {chatBackgroundImage && <button onClick={() => setChatBackgroundImage("")} className="mt-4 flex items-center gap-2 text-sm text-red-400"><Trash2 size={16} /> Remove custom photo</button>}
        </section>

        <section className="mt-8 flex items-center gap-3 rounded-2xl border border-zinc-800 p-4 text-sm text-zinc-400"><MessageSquareText size={20} className="shrink-0 text-purple-400" />These choices are saved on this device and apply immediately.</section>
      </main>
    </div>
  );
}
