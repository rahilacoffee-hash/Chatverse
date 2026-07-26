import { Camera, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import BottomNav from "../../components/navigations/BottomNav";
import axiosInstance from "../../services/axiosInstance";
import { createStatus, deleteStatus, getMyStatuses, getStatuses, markStatusViewed } from "../../services/statusService";

const hoursLeft = (expiresAt) => {
  const hours = Math.max(0, Math.ceil((new Date(expiresAt) - Date.now()) / 3600000));
  return `${hours}h left`;
};

export default function Status() {
  const [statuses, setStatuses] = useState([]);
  const [myStatuses, setMyStatuses] = useState([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [posting, setPosting] = useState(false);
  const [activeStatus, setActiveStatus] = useState(null);

  const loadStatuses = async () => {
    try {
      const [feed, mine] = await Promise.all([getStatuses(), getMyStatuses()]);
      setStatuses(feed.data.data || []);
      setMyStatuses(mine.data.data || []);
    } catch {
      toast.error("Could not load statuses");
    }
  };

  useEffect(() => {
    const loadTimer = window.setTimeout(loadStatuses, 0);
    return () => window.clearTimeout(loadTimer);
  }, []);

  const publish = async (event) => {
    event.preventDefault();
    if (!text.trim() && !image) return;
    try {
      setPosting(true);
      let mediaUrl = "";
      if (image) {
        const form = new FormData();
        form.append("file", image);
        const upload = await axiosInstance.post("/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
        mediaUrl = upload.data.url;
      }
      await createStatus({ text, mediaUrl, type: mediaUrl ? "image" : "text" });
      setText("");
      setImage(null);
      setComposerOpen(false);
      await loadStatuses();
      toast.success("Status shared for 24 hours");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not post status");
    } finally {
      setPosting(false);
    }
  };

  const openStatus = async (status, own = false) => {
    setActiveStatus(status);
    if (!own) {
      try { await markStatusViewed(status._id); } catch { /* status may have expired */ }
    }
  };

  const removeStatus = async (id) => {
    try {
      await deleteStatus(id);
      setActiveStatus(null);
      await loadStatuses();
    } catch { toast.error("Could not delete status"); }
  };

  const StatusRow = ({ status, own = false }) => (
    <button onClick={() => openStatus(status, own)} className="flex w-full items-center gap-3 border-b border-zinc-900 px-5 py-4 text-left hover:bg-zinc-900/60">
      <div className={`flex h-14 w-14 items-center justify-center rounded-full p-0.5 ${own ? "bg-purple-600" : "bg-gradient-to-br from-purple-500 to-fuchsia-500"}`}>
        {status.author?.avatar ? <img src={status.author.avatar} alt="" className="h-full w-full rounded-full object-cover" /> : <span className="flex h-full w-full items-center justify-center rounded-full bg-zinc-800 text-lg font-bold">{status.author?.name?.charAt(0)?.toUpperCase()}</span>}
      </div>
      <div className="min-w-0 flex-1"><p className="font-medium">{own ? "My status" : status.author?.name}</p><p className="truncate text-sm text-zinc-500">{status.text || "Photo"} · {hoursLeft(status.expiresAt)}</p></div>
      {status.mediaUrl && <Camera size={18} className="text-zinc-500" />}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#09090B] pb-24 text-white">
      <header className="flex items-center justify-between px-5 py-5"><h1 className="text-3xl font-bold">Status</h1><button onClick={() => setComposerOpen(true)} className="rounded-full bg-purple-600 p-3" aria-label="Add status"><Plus /></button></header>
      <section><h2 className="px-5 pb-2 text-sm font-semibold text-zinc-400">MY STATUS</h2>
        {myStatuses.length ? myStatuses.map((status) => <StatusRow key={status._id} status={status} own />) : <button onClick={() => setComposerOpen(true)} className="flex w-full items-center gap-3 px-5 py-4 text-left"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800"><Plus /></span><span><b>My status</b><small className="mt-1 block text-zinc-500">Tap to add a status update</small></span></button>}
      </section>
      <section className="mt-5"><h2 className="px-5 pb-2 text-sm font-semibold text-zinc-400">RECENT UPDATES</h2>{statuses.length ? statuses.map((status) => <StatusRow key={status._id} status={status} />) : <p className="px-5 py-8 text-center text-sm text-zinc-500">No recent status updates.</p>}</section>
      {composerOpen && <div className="fixed inset-0 z-[60] flex items-end bg-black/70 p-4 sm:items-center sm:justify-center"><form onSubmit={publish} className="w-full max-w-md rounded-2xl bg-zinc-900 p-5"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">Create status</h2><button type="button" onClick={() => setComposerOpen(false)}><X /></button></div><textarea value={text} onChange={(e) => setText(e.target.value)} maxLength="700" rows="5" placeholder="Type a status..." className="mt-4 w-full resize-none rounded-xl bg-zinc-800 p-3 outline-none focus:ring-2 focus:ring-purple-600" /><label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-zinc-300"><ImagePlus size={18} /> {image ? image.name : "Add photo"}<input type="file" accept="image/*" className="hidden" onChange={(e) => setImage(e.target.files[0] || null)} /></label><button disabled={posting} className="mt-5 w-full rounded-xl bg-purple-600 py-3 font-semibold disabled:opacity-50">{posting ? "Posting…" : "Share status"}</button></form></div>}
      {activeStatus && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black p-5"><button onClick={() => setActiveStatus(null)} className="absolute right-5 top-5"><X /></button><div className="w-full max-w-lg"><div className="mb-4 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 font-bold">{activeStatus.author?.name?.charAt(0)?.toUpperCase()}</div><div><b>{activeStatus.author?.name}</b><p className="text-sm text-zinc-400">{hoursLeft(activeStatus.expiresAt)}</p></div></div>{activeStatus.mediaUrl && <img src={activeStatus.mediaUrl} alt="Status" className="max-h-[65vh] w-full rounded-2xl object-contain" />}{activeStatus.text && <p className="mt-5 whitespace-pre-wrap text-center text-xl">{activeStatus.text}</p>}{myStatuses.some((status) => status._id === activeStatus._id) && <button onClick={() => removeStatus(activeStatus._id)} className="mx-auto mt-6 flex items-center gap-2 text-red-400"><Trash2 size={17} /> Delete status</button>}</div></div>}
      <BottomNav />
    </div>
  );
}
