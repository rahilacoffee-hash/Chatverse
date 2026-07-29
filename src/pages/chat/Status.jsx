import { Camera, ImagePlus, Plus, Send, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import BottomNav from "../../components/navigations/BottomNav";
import axiosInstance from "../../services/axiosInstance";
import { createStatus, deleteStatus, getMyStatuses, getStatuses, markStatusViewed, replyToStatus } from "../../services/statusService";

const hoursLeft = (expiresAt) => {
  const hours = Math.max(0, Math.ceil((new Date(expiresAt) - Date.now()) / 3600000));
  return `${hours}h left`;
};

export default function Status() {
  const location = useLocation();
  const [statuses, setStatuses] = useState([]);
  const [myStatuses, setMyStatuses] = useState([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [text, setText] = useState("");
  const [mediaFiles, setMediaFiles] = useState([]);
  const [posting, setPosting] = useState(false);
  const [activeStatus, setActiveStatus] = useState(null);
  const [activeQueue, setActiveQueue] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeOwn, setActiveOwn] = useState(false);
  const [progress, setProgress] = useState(0);
  const [reply, setReply] = useState("");
  const [replying, setReplying] = useState(false);

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
    const openRequestedStatus = async () => {
      try {
        const [feed, mine] = await Promise.all([getStatuses(), getMyStatuses()]);
        const feedStatuses = feed.data.data || [];
        setStatuses(feedStatuses);
        setMyStatuses(mine.data.data || []);
        const authorId = location.state?.statusAuthorId;
        const matchingStatuses = authorId ? feedStatuses.filter((status) => String(status.author?._id || status.author) === String(authorId)) : [];
        if (matchingStatuses.length) {
          const queue = [...matchingStatuses].reverse();
          setActiveQueue(queue);
          setActiveIndex(0);
          setActiveOwn(false);
          setActiveStatus(queue[0]);
          void markViewed(queue[0], false);
        }
      } catch {
        toast.error("Could not load statuses");
      }
    };
    const loadTimer = window.setTimeout(openRequestedStatus, 0);
    return () => window.clearTimeout(loadTimer);
  }, [location.state?.statusAuthorId]);

  const publish = async (event) => {
    event.preventDefault();
    if (!text.trim() && !mediaFiles.length) return;
    try {
      setPosting(true);
      const uploads = [];
      for (const file of mediaFiles) {
        const form = new FormData();
        form.append("file", file);
        const upload = await axiosInstance.post("/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
        uploads.push({ mediaUrl: upload.data.url, type: file.type.startsWith("video/") ? "video" : "image" });
      }

      if (!uploads.length) {
        await createStatus({ text, mediaUrl: "", type: "text" });
      } else {
        await Promise.all(
          uploads.map(({ mediaUrl, type }, index) =>
            createStatus({
              text: index === 0 ? text : "",
              mediaUrl,
              type,
            }),
          ),
        );
      }
      setText("");
      setMediaFiles([]);
      setComposerOpen(false);
      await loadStatuses();
      toast.success(`${uploads.length || 1} status update${uploads.length === 1 ? "" : "s"} shared for 24 hours`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not post status");
    } finally {
      setPosting(false);
    }
  };

  const markViewed = async (status, own) => {
    if (!own) {
      try { await markStatusViewed(status._id); } catch { /* status may have expired */ }
    }
  };

  const openStatus = async (status, own = false) => {
    const source = own ? myStatuses : statuses.filter((item) => String(item.author?._id) === String(status.author?._id));
    const queue = [...source].reverse();
    const index = Math.max(0, queue.findIndex((item) => item._id === status._id));
    setActiveQueue(queue);
    setActiveIndex(index);
    setActiveOwn(own);
    setActiveStatus(status);
    setReply("");
    await markViewed(status, own);
  };

  const moveStatus = async (direction) => {
    const nextIndex = activeIndex + direction;
    if (nextIndex < 0) return;
    if (nextIndex >= activeQueue.length) {
      setActiveStatus(null);
      return;
    }
    const next = activeQueue[nextIndex];
    setActiveIndex(nextIndex);
    setActiveStatus(next);
    setReply("");
    await markViewed(next, activeOwn);
  };

  useEffect(() => {
    if (!activeStatus) return undefined;
    setProgress(0);
    const frame = window.requestAnimationFrame(() => setProgress(100));
    const timer = window.setTimeout(() => { void moveStatus(1); }, 5000);
    return () => { window.cancelAnimationFrame(frame); window.clearTimeout(timer); };
  }, [activeStatus?._id]);

  const sendReply = async (event) => {
    event.preventDefault();
    if (!reply.trim() || !activeStatus) return;
    try {
      setReplying(true);
      await replyToStatus(activeStatus._id, reply);
      setReply("");
      toast.success("Reply sent");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not send reply");
    } finally {
      setReplying(false);
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
      <div className="min-w-0 flex-1"><p className="font-medium">{own ? "My status" : status.author?.name}</p><p className="truncate text-sm text-zinc-500">{status.text || (status.type === "video" ? "Video" : "Photo")} · {hoursLeft(status.expiresAt)}</p></div>
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
      {composerOpen && <div className="fixed inset-0 z-[60] flex items-end bg-black/70 p-4 sm:items-center sm:justify-center"><form onSubmit={publish} className="w-full max-w-md rounded-2xl bg-zinc-900 p-5"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">Create status</h2><button type="button" onClick={() => { setComposerOpen(false); setMediaFiles([]); }}><X /></button></div><textarea value={text} onChange={(e) => setText(e.target.value)} maxLength="700" rows="5" placeholder="Type a status..." className="mt-4 w-full resize-none rounded-xl bg-zinc-800 p-3 outline-none focus:ring-2 focus:ring-purple-600" /><label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-zinc-300"><ImagePlus size={18} /> {mediaFiles.length ? `${mediaFiles.length} file${mediaFiles.length === 1 ? "" : "s"} selected` : "Add photos or videos"}<input type="file" accept="image/*,video/*" multiple className="hidden" onChange={(event) => { const files = Array.from(event.target.files || []); const invalid = files.find((file) => !file.type.startsWith("image/") && !file.type.startsWith("video/")); const tooLarge = files.find((file) => file.size > 10 * 1024 * 1024); if (invalid) return toast.error("Only images and videos are supported"); if (tooLarge) return toast.error("Status media must be 10 MB or smaller"); setMediaFiles(files); }} /></label>{mediaFiles.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{mediaFiles.map((file, index) => <div key={`${file.name}-${index}`} className="rounded-lg bg-zinc-800 px-3 py-2 text-xs text-zinc-300">{file.name}</div>)}</div>}<p className="mt-3 text-xs text-zinc-500">Each photo or video is shared as its own status update. Your text is added to the first item.</p><button disabled={posting} className="mt-5 w-full rounded-xl bg-purple-600 py-3 font-semibold disabled:opacity-50">{posting ? "Posting…" : `Share ${mediaFiles.length > 1 ? `${mediaFiles.length} statuses` : "status"}`}</button></form></div>}
      {activeStatus && <div className="fixed inset-0 z-[70] bg-black text-white">
        <div className="absolute inset-x-0 top-0 z-10 flex gap-1 p-3">
          {activeQueue.map((status, index) => <span key={status._id} className="h-1 flex-1 overflow-hidden rounded bg-white/30"><span className="block h-full bg-white transition-[width] duration-[5000ms] linear" style={{ width: `${index < activeIndex ? 100 : index === activeIndex ? progress : 0}%` }} /></span>)}
        </div>
        <button onClick={() => setActiveStatus(null)} className="absolute right-4 top-5 z-20 rounded-full p-2" aria-label="Close status"><X /></button>
        <button onClick={() => { void moveStatus(-1); }} className="absolute inset-y-0 left-0 z-10 w-1/3" aria-label="Previous status" />
        <button onClick={() => { void moveStatus(1); }} className="absolute inset-y-0 right-0 z-10 w-1/3" aria-label="Next status" />
        <div className="relative z-[1] flex min-h-full flex-col justify-center px-5 pb-24 pt-16">
          <div className="mb-4 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 font-bold">{activeStatus.author?.name?.charAt(0)?.toUpperCase()}</div><div><b>{activeOwn ? "My status" : activeStatus.author?.name}</b><p className="text-sm text-zinc-400">{hoursLeft(activeStatus.expiresAt)}</p></div></div>
          {activeStatus.mediaUrl && (activeStatus.type === "video" ? <video src={activeStatus.mediaUrl} controls autoPlay playsInline className="max-h-[68vh] w-full rounded-2xl bg-black object-contain" /> : <img src={activeStatus.mediaUrl} alt="Status" className="max-h-[68vh] w-full rounded-2xl object-contain" />)}
          {activeStatus.text && <p className="mt-5 whitespace-pre-wrap text-center text-xl">{activeStatus.text}</p>}
        </div>
        <div className="absolute inset-x-5 bottom-6 z-20">{activeOwn ? <button onClick={() => removeStatus(activeStatus._id)} className="mx-auto flex items-center gap-2 text-red-400"><Trash2 size={17} /> Delete status</button> : <form onSubmit={sendReply} className="flex gap-2"><input value={reply} onChange={(event) => setReply(event.target.value)} maxLength="2000" placeholder="Reply to status…" className="min-w-0 flex-1 rounded-xl bg-zinc-800 px-4 py-3 outline-none focus:ring-2 focus:ring-purple-600" /><button disabled={replying || !reply.trim()} className="rounded-xl bg-purple-600 px-4 disabled:opacity-50" aria-label="Send reply"><Send size={19} /></button></form>}</div>
      </div>}
      <BottomNav />
    </div>
  );
}
