import { motion, useReducedMotion } from "framer-motion";
import { ImagePlus, Plus, Send, Trash2, X } from "lucide-react";
import { FiChevronRight, FiEye } from "react-icons/fi";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import axiosInstance from "../../services/axiosInstance";
import {
  createStatus,
  deleteStatus,
  getMyStatuses,
  getStatuses,
  markStatusViewed,
  replyToStatus,
} from "../../services/statusService";

function hoursLeft(expiresAt) {
  let hours = Math.max(
    0,
    Math.ceil((new Date(expiresAt) - Date.now()) / 3600000),
  );
  return `${hours}h left`;
}

function avatarLabel(status) {
  return status.author?.name?.charAt(0)?.toUpperCase() || "C";
}

function StatusAvatar({ status, own, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group flex w-[4.4rem] shrink-0 flex-col items-center gap-2 text-center"
    >
      <span
        className={`relative grid h-[4.2rem] w-[4.2rem] place-items-center rounded-full p-[3px] ${own ? "bg-gradient-to-br from-[#14F1D9] to-[#6366F1]" : "bg-gradient-to-br from-[#14F1D9] via-[#6366F1] to-[#8B5CF6]"}`}
      >
        <span className="grid h-full w-full place-items-center overflow-hidden rounded-full border-[3px] border-[var(--cv-base)] bg-[var(--cv-elevated)] text-lg font-bold text-white">
          {status.author?.avatar ? (
            <img
              src={status.author.avatar}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            avatarLabel(status)
          )}
        </span>
        <i className="absolute bottom-0 right-0 grid h-5 w-5 place-items-center rounded-full border-2 border-[var(--cv-base)] bg-[#14F1D9] text-[#071318]">
          <FiEye size={10} />
        </i>
      </span>
      <span className="max-w-full truncate text-[11px] text-[var(--cv-muted)]">
        {own ? "My status" : status.author?.name || "Contact"}
      </span>
    </button>
  );
}

function Status() {
  let location = useLocation();
  let reduced = useReducedMotion();
  let [statuses, setStatuses] = useState([]);
  let [myStatuses, setMyStatuses] = useState([]);
  let [loading, setLoading] = useState(true);
  let [composerOpen, setComposerOpen] = useState(false);
  let [text, setText] = useState("");
  let [mediaFiles, setMediaFiles] = useState([]);
  let [posting, setPosting] = useState(false);
  let [activeStatus, setActiveStatus] = useState(null);
  let [activeQueue, setActiveQueue] = useState([]);
  let [activeIndex, setActiveIndex] = useState(0);
  let [activeOwn, setActiveOwn] = useState(false);
  let [progress, setProgress] = useState(0);
  let [reply, setReply] = useState("");
  let [replying, setReplying] = useState(false);

  async function loadStatuses() {
    try {
      let [feed, mine] = await Promise.all([getStatuses(), getMyStatuses()]);
      setStatuses(feed.data.data || []);
      setMyStatuses(mine.data.data || []);
    } catch {
      toast.error("Could not load statuses");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let timer = window.setTimeout(() => void loadStatuses(), 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    let requestedAuthor = location.state?.statusAuthorId;
    if (!requestedAuthor || !statuses.length) return;
    let matching = statuses.filter(
      (status) =>
        String(status.author?._id || status.author) === String(requestedAuthor),
    );
    if (matching.length) openStatus(matching[0], false);
  }, [location.state?.statusAuthorId, statuses.length]);
  useEffect(() => {
    if (!activeStatus) return undefined;
    let reset = window.setTimeout(() => setProgress(0), 0);
    let frame = requestAnimationFrame(() => setProgress(100));
    let timer = window.setTimeout(() => moveStatus(1), 5000);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      window.clearTimeout(reset);
    };
  }, [activeStatus?._id]);

  async function markViewed(status, own) {
    if (!own) {
      try {
        await markStatusViewed(status._id);
      } catch {
        /* expired */
      }
    }
  }
  async function openStatus(status, own = false) {
    let source = own
      ? myStatuses
      : statuses.filter(
          (item) => String(item.author?._id) === String(status.author?._id),
        );
    let queue = [...source].reverse();
    let index = Math.max(
      0,
      queue.findIndex((item) => item._id === status._id),
    );
    setActiveQueue(queue);
    setActiveIndex(index);
    setActiveOwn(own);
    setActiveStatus(status);
    setReply("");
    await markViewed(status, own);
  }
  async function moveStatus(direction) {
    let nextIndex = activeIndex + direction;
    if (nextIndex < 0) return;
    if (nextIndex >= activeQueue.length) {
      setActiveStatus(null);
      return;
    }
    let next = activeQueue[nextIndex];
    setActiveIndex(nextIndex);
    setActiveStatus(next);
    await markViewed(next, activeOwn);
  }

  async function publish(event) {
    event.preventDefault();
    if (!text.trim() && !mediaFiles.length) return;
    try {
      setPosting(true);
      let uploads = [];
      for (let file of mediaFiles) {
        let form = new FormData();
        form.append("file", file);
        let upload = await axiosInstance.post("/upload", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        uploads.push({
          mediaUrl: upload.data.url,
          type: file.type.startsWith("video/") ? "video" : "image",
        });
      }
      if (!uploads.length)
        await createStatus({ text, mediaUrl: "", type: "text" });
      else
        await Promise.all(
          uploads.map((upload, index) =>
            createStatus({ text: index === 0 ? text : "", ...upload }),
          ),
        );
      setText("");
      setMediaFiles([]);
      setComposerOpen(false);
      await loadStatuses();
      toast.success("Status shared for 24 hours");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not post status");
    } finally {
      setPosting(false);
    }
  }

  async function sendReply(event) {
    event.preventDefault();
    if (!reply.trim() || !activeStatus) return;
    try {
      setReplying(true);
      await replyToStatus(activeStatus._id, reply);
      setReply("");
      toast.success("Reply sent");
    } catch {
      toast.error("Could not send reply");
    } finally {
      setReplying(false);
    }
  }
  async function removeStatus() {
    try {
      await deleteStatus(activeStatus._id);
      setActiveStatus(null);
      await loadStatuses();
    } catch {
      toast.error("Could not delete status");
    }
  }
  function selectFiles(event) {
    let files = Array.from(event.target.files || []);
    if (
      files.some(
        (file) =>
          !file.type.startsWith("image/") && !file.type.startsWith("video/"),
      )
    )
      return toast.error("Only images and videos are supported");
    if (files.some((file) => file.size > 10 * 1024 * 1024))
      return toast.error("Status media must be 10 MB or smaller");
    setMediaFiles(files);
  }

  return (
    <main className="cv-page cv-safe-bottom pb-24">
      <header className="sticky top-0 z-30 border-b border-white/[.07] bg-[color-mix(in_srgb,var(--cv-base)_88%,transparent)] px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#14F1D9]">
              Live updates
            </p>
            <h1 className="text-2xl font-semibold">Status</h1>
          </div>
          <button
            onClick={() => setComposerOpen(true)}
            className="cv-accent-gradient grid h-10 w-10 place-items-center rounded-full text-[#071318] shadow-[0_8px_28px_rgba(20,241,217,.2)]"
            aria-label="Add status"
          >
            <Plus />
          </button>
        </div>
      </header>
      <section className="border-b border-white/[.06] px-5 py-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">My status</h2>
          {myStatuses.length > 0 && (
            <button
              onClick={() => openStatus(myStatuses[0], true)}
              className="flex items-center gap-1 text-xs text-[#14F1D9]"
            >
              View updates <FiChevronRight />
            </button>
          )}
        </div>
        {myStatuses.length ? (
          <div className="mt-4 flex gap-4 overflow-x-auto [scrollbar-width:none]">
            {myStatuses.map((status) => (
              <StatusAvatar
                key={status._id}
                status={status}
                own
                onClick={() => openStatus(status, true)}
              />
            ))}
          </div>
        ) : (
          <button
            onClick={() => setComposerOpen(true)}
            className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-dashed border-[#14F1D9]/30 bg-[#14F1D9]/[.05] p-3 text-left"
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[#14F1D9] text-[#071318]">
              <Plus />
            </span>
            <span>
              <b className="block text-sm">Share an update</b>
              <small className="mt-1 block text-xs text-[var(--cv-muted)]">
                Photos, videos, or a thought that expires in 24 hours.
              </small>
            </span>
          </button>
        )}
      </section>
      <section className="px-5 py-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent updates</h2>
          <span className="text-xs text-[var(--cv-muted)]">
            {statuses.length} active
          </span>
        </div>
        {loading ? (
          <div className="mt-4 grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((item) => (
              <span
                key={item}
                className="h-16 animate-pulse rounded-full bg-white/[.08]"
              />
            ))}
          </div>
        ) : statuses.length ? (
          <div className="mt-4 flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none]">
            {statuses.map((status) => (
              <StatusAvatar
                key={status._id}
                status={status}
                onClick={() => openStatus(status)}
              />
            ))}
          </div>
        ) : (
          <div className="cv-elevated mt-4 rounded-[24px] p-6 text-center">
            <p className="text-sm font-semibold">No updates yet</p>
            <p className="mt-2 text-xs leading-5 text-[var(--cv-muted)]">
              Your contacts’ fresh updates will appear here.
            </p>
          </div>
        )}
      </section>
      {composerOpen && (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/75 p-4 backdrop-blur-sm sm:items-center sm:justify-center">
          <motion.form
            initial={reduced ? false : { y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            onSubmit={publish}
            className="cv-elevated w-full max-w-md rounded-[24px] p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[.2em] text-[#14F1D9]">
                  New update
                </p>
                <h2 className="mt-1 text-lg font-semibold">Share a moment</h2>
              </div>
              <button
                type="button"
                onClick={() => setComposerOpen(false)}
                aria-label="Close"
              >
                <X />
              </button>
            </div>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength="700"
              rows="5"
              placeholder="Write something for today..."
              className="cv-focus mt-5 w-full resize-none rounded-[10px] border border-white/10 bg-black/10 p-3 text-sm outline-none placeholder:text-[var(--cv-muted)]"
            />
            <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-[10px] border border-dashed border-[#14F1D9]/30 bg-[#14F1D9]/[.05] p-3 text-sm text-[#14F1D9]">
              <ImagePlus size={18} />
              {mediaFiles.length
                ? `${mediaFiles.length} media selected`
                : "Add photos or videos"}
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={selectFiles}
              />
            </label>
            <button
              disabled={posting}
              className="cv-accent-gradient mt-5 w-full rounded-[10px] py-3 text-sm font-semibold text-[#071318] disabled:opacity-50"
            >
              {posting ? "Sharing..." : "Share status"}
            </button>
          </motion.form>
        </div>
      )}
      {activeStatus && (
        <div className="fixed inset-0 z-[70] bg-[#07080d] text-white">
          <div className="absolute inset-x-3 top-3 z-20 flex gap-1">
            {activeQueue.map((status, index) => (
              <span
                key={status._id}
                className="h-1 flex-1 overflow-hidden rounded bg-white/25"
              >
                <i
                  className="block h-full bg-[#14F1D9] transition-[width] duration-[5000ms] linear"
                  style={{
                    width: `${index < activeIndex ? 100 : index === activeIndex ? progress : 0}%`,
                  }}
                />
              </span>
            ))}
          </div>
          <button
            onClick={() => setActiveStatus(null)}
            className="absolute right-4 top-6 z-20 rounded-full bg-white/10 p-2"
            aria-label="Close"
          >
            <X />
          </button>
          <button
            onClick={() => moveStatus(-1)}
            className="absolute inset-y-0 left-0 z-10 w-1/3"
            aria-label="Previous"
          />
          <button
            onClick={() => moveStatus(1)}
            className="absolute inset-y-0 right-0 z-10 w-1/3"
            aria-label="Next"
          />
          <div className="relative z-[1] flex min-h-full flex-col justify-center px-5 pb-28 pt-16">
            <div className="mb-4 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#14F1D9] to-[#6366F1] font-bold">
                {activeStatus.author?.avatar ? (
                  <img
                    src={activeStatus.author.avatar}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  avatarLabel(activeStatus)
                )}
              </span>
              <div>
                <b>{activeOwn ? "My status" : activeStatus.author?.name}</b>
                <p className="text-xs text-white/55">
                  {hoursLeft(activeStatus.expiresAt)}
                </p>
              </div>
            </div>
            {activeStatus.mediaUrl &&
              (activeStatus.type === "video" ? (
                <video
                  src={activeStatus.mediaUrl}
                  controls
                  autoPlay
                  playsInline
                  className="max-h-[68vh] w-full rounded-[18px] object-contain"
                />
              ) : (
                <img
                  src={activeStatus.mediaUrl}
                  alt="Status"
                  className="max-h-[68vh] w-full rounded-[18px] object-contain"
                />
              ))}
            {activeStatus.text && (
              <p className="mt-5 whitespace-pre-wrap text-center text-lg leading-7">
                {activeStatus.text}
              </p>
            )}
          </div>
          <div className="absolute inset-x-5 bottom-6 z-20">
            {activeOwn ? (
              <button
                onClick={removeStatus}
                className="mx-auto flex items-center gap-2 text-[#F5455C]"
              >
                <Trash2 size={17} /> Delete status
              </button>
            ) : (
              <form onSubmit={sendReply} className="flex gap-2">
                <input
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  placeholder="Reply to status..."
                  className="min-w-0 flex-1 rounded-[10px] border border-white/10 bg-white/10 px-4 py-3 text-sm outline-none focus:border-[#14F1D9]"
                />
                <button
                  disabled={replying || !reply.trim()}
                  className="cv-accent-gradient rounded-[10px] px-4 text-[#071318] disabled:opacity-50"
                  aria-label="Send reply"
                >
                  <Send size={19} />
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default Status;
