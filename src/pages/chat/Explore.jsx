import { AnimatePresence, motion } from "framer-motion";
import {
  Bookmark,
  Check,
  CheckCircle2,
  Heart,
  ImagePlus,
  MessageCircle,
  Play,
  Plus,
  RefreshCw,
  Search,
  Send,
  Share2,
  Video,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import BottomNav from "../../components/navigations/BottomNav";
import {
  addPostComment,
  createPost,
  getExploreData,
  getPostComments,
  likePost,
  sharePost,
  unlikePost,
} from "../../services/chatService";
import axiosInstance from "../../services/axiosInstance";
import { toast } from "react-toastify";
import {
  followUser,
  getMyConnections,
  unfollowUser,
} from "../../services/authService";
import socket from "../../lib/socket";

/* ---------- helpers ---------- */

const compact = (n = 0) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
};

const timeAgo = (date) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (Number.isNaN(seconds) || seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
};

const toFeedPost = (post) => {
  const author = post.user || post.author || {};
  const name = author.name || "ChatVerse member";
  const mediaUrl = post.media?.[0]?.url || post.mediaUrl || "";
  return {
    id: post._id,
    authorId: author._id,
    user: name,
    handle: author.username ? `@${author.username}` : `@${name.toLowerCase().replace(/\s+/g, "")}`,
    time: timeAgo(post.createdAt),
    avatar: author.avatar || "",
    image: mediaUrl,
    mediaType: post.media?.[0]?.type || (post.type === "Video" || post.mediaType === "video" ? "video" : "image"),
    likes: post.likesCount ?? post.likes?.length ?? 0,
    comments: post.commentsCount || 0,
    shares: post.sharesCount || post.repostsCount || 0,
    caption: post.caption || post.text || "",
    likedByMe: Boolean(post.likedByMe),
    isOwner: Boolean(post.isOwner),
    verified: Boolean(author.isVerified || author.verified),
  };
};

/** Single tap + double tap on one surface (works on touch, unlike onDoubleClick). */
function useTap(onSingle, onDouble) {
  const last = useRef(0);
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);
  return () => {
    const now = Date.now();
    if (now - last.current < 280) {
      clearTimeout(timer.current);
      last.current = 0;
      onDouble();
    } else {
      last.current = now;
      timer.current = setTimeout(() => {
        last.current = 0;
        onSingle?.();
      }, 280);
    }
  };
}

function useEscape(handler) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && handler();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handler]);
}

/* ---------- page ---------- */

export default function Explore() {
  const [category, setCategory] = useState("For you");
  const [query, setQuery] = useState("");
  const [posts, setPosts] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [reloadKey, setReloadKey] = useState(0);
  const [following, setFollowing] = useState([]);
  const [saved, setSaved] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("cv-saved") || "[]");
    } catch {
      return [];
    }
  });
  const [soundOn, setSoundOn] = useState(false);
  const [commentsFor, setCommentsFor] = useState(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const patchPost = useCallback(
    (id, changes) =>
      setPosts((items) =>
        items.map((p) => (p.id === id ? { ...p, ...(typeof changes === "function" ? changes(p) : changes) } : p)),
      ),
    [],
  );

  useEffect(() => {
    try {
      localStorage.setItem("cv-saved", JSON.stringify(saved));
    } catch {
      /* storage unavailable */
    }
  }, [saved]);

  // Feed: reloads on tab, search text, or retry. Debounced search, stale responses ignored.
  useEffect(() => {
    let live = true;
    setStatus("loading");
    const timer = setTimeout(
      () => {
        getExploreData(query, category === "Following" ? "following" : "for-you")
          .then((data) => {
            if (!live) return;
            setPosts((data.posts || []).map(toFeedPost));
            setStatus("ready");
          })
          .catch(() => live && setStatus("error"));
      },
      query ? 300 : 0,
    );
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [category, query, reloadKey]);

  useEffect(() => {
    let live = true;
    getMyConnections(localStorage.getItem("accessToken"))
      .then((res) => live && setFollowing((res.data.data.following || []).map((p) => p._id)))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  // Realtime
  useEffect(() => {
    const onLiked = ({ postId, likesCount }) => patchPost(postId, { likes: likesCount });
    const onShared = ({ postId, sharesCount }) => patchPost(postId, { shares: sharesCount });
    const onDeleted = ({ postId }) => setPosts((items) => items.filter((p) => p.id !== postId));
    const onNew = (raw) => {
      if (query) return;
      const post = toFeedPost(raw);
      if (category === "Following" && !following.includes(post.authorId)) return;
      setPosts((items) => (items.some((p) => p.id === post.id) ? items : [post, ...items]));
    };
    socket.on("newPost", onNew);
    socket.on("postLiked", onLiked);
    socket.on("postShared", onShared);
    socket.on("postDeleted", onDeleted);
    return () => {
      socket.off("newPost", onNew);
      socket.off("postLiked", onLiked);
      socket.off("postShared", onShared);
      socket.off("postDeleted", onDeleted);
    };
  }, [category, following, query, patchPost]);

  const toggleLike = async (post) => {
    const was = post.likedByMe;
    patchPost(post.id, { likedByMe: !was, likes: Math.max(0, post.likes + (was ? -1 : 1)) });
    try {
      const updated = was ? await unlikePost(post.id) : await likePost(post.id);
      patchPost(post.id, { likes: updated.likesCount });
    } catch (error) {
      patchPost(post.id, { likedByMe: was, likes: post.likes });
      toast.error(error.response?.data?.message || "Couldn't update your like. Try again.");
    }
  };

  const share = async (post) => {
    try {
      const data = await sharePost(post.id);
      patchPost(post.id, { shares: data.post.sharesCount });
      if (navigator.share) {
        await navigator.share({ title: "ChatVerse", text: post.caption.slice(0, 120), url: data.shareLink });
      } else {
        await navigator.clipboard.writeText(data.shareLink);
        toast.success("Link copied");
      }
    } catch (error) {
      if (error?.name !== "AbortError") toast.error("Couldn't share this post. Try again.");
    }
  };

  const toggleFollow = async (post) => {
    if (!post.authorId) return;
    const isFollowing = following.includes(post.authorId);
    try {
      if (isFollowing) await unfollowUser(post.authorId);
      else await followUser(post.authorId);
      setFollowing((ids) => (isFollowing ? ids.filter((id) => id !== post.authorId) : [...ids, post.authorId]));
      if (isFollowing && category === "Following")
        setPosts((items) => items.filter((p) => p.authorId !== post.authorId));
    } catch (error) {
      toast.error(error.response?.data?.message || "Couldn't update follow. Try again.");
    }
  };

  const toggleSave = (id) =>
    setSaved((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  return (
    <main className="cv-shell h-[100dvh] overflow-hidden selection:bg-[#8B5CF6]/40">
      <div className="relative mx-auto h-full max-w-[560px] overflow-hidden bg-[#08080B] sm:border-x sm:border-white/[.06]">
        {/* Header: TikTok-style transparent top bar */}
        <header className="pointer-events-none absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-black/55 to-transparent px-2 pb-8 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <div className="relative flex h-11 items-center justify-between">
            <button
              onClick={() => setComposerOpen(true)}
              aria-label="Create post"
              className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full text-white drop-shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#14F1D9]"
            >
              <Plus size={26} strokeWidth={2} />
            </button>

            <div className="pointer-events-auto absolute left-1/2 flex -translate-x-1/2 items-center gap-4" role="tablist">
              {["Following", "For you"].map((item, i) => (
                <div key={item} className="flex items-center gap-4">
                  {i === 1 && <span className="h-3 w-px bg-white/30" aria-hidden />}
                  <button
                    role="tab"
                    aria-selected={category === item}
                    onClick={() => setCategory(item)}
                    className={`relative py-2 font-['Space_Grotesk'] text-[15px] font-bold drop-shadow transition ${category === item ? "text-white" : "text-white/60 hover:text-white/85"}`}
                  >
                    {item}
                    {category === item && (
                      <motion.span layoutId="explore-tab" className="absolute inset-x-0 -bottom-0.5 mx-auto h-[3px] w-7 rounded-full bg-[#14F1D9]" />
                    )}
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search posts"
              className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full text-white drop-shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#14F1D9]"
            >
              <Search size={24} strokeWidth={2.25} />
            </button>
          </div>

          {query && (
            <div className="pointer-events-auto mt-1 flex justify-center">
              <button
                onClick={() => setQuery("")}
                className="flex items-center gap-1.5 rounded-full bg-black/50 py-1 pl-3 pr-2 text-xs text-white backdrop-blur"
              >
                Results for “{query}”
                <X size={13} aria-label="Clear search" />
              </button>
            </div>
          )}
        </header>

        {/* Feed */}
        <div className="h-full snap-y snap-mandatory overflow-y-auto overscroll-contain [scrollbar-width:none]">
          {status === "loading" && <FeedSkeleton />}
          {status === "error" && (
            <FeedMessage
              title="Couldn't load posts"
              body="Check your connection and try again."
              action={
                <button
                  onClick={() => setReloadKey((k) => k + 1)}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15"
                >
                  <RefreshCw size={15} /> Try again
                </button>
              }
            />
          )}
          {status === "ready" && posts.length === 0 && (
            <FeedMessage
              title={query ? "No matches" : category === "Following" ? "Your Following feed is empty" : "Nothing here yet"}
              body={
                query
                  ? "Try a different word or hashtag."
                  : category === "Following"
                    ? "Follow creators in For you to see their posts here."
                    : "Be the first to post something."
              }
            />
          )}
          {status === "ready" &&
            posts.map((post) => (
              <Post
                key={post.id}
                post={post}
                saved={saved.includes(post.id)}
                soundOn={soundOn}
                following={following.includes(post.authorId)}
                onLike={() => toggleLike(post)}
                onSave={() => toggleSave(post.id)}
                onComment={() => setCommentsFor(post)}
                onShare={() => share(post)}
                onSound={() => setSoundOn((v) => !v)}
                onFollow={() => toggleFollow(post)}
              />
            ))}
        </div>
      </div>
      <BottomNav />

      <AnimatePresence>
        {searchOpen && (
          <SearchOverlay
            initial={query}
            onChange={setQuery}
            onClose={() => setSearchOpen(false)}
          />
        )}
        {commentsFor && (
          <CommentsSheet
            post={posts.find((p) => p.id === commentsFor.id) || commentsFor}
            onClose={() => setCommentsFor(null)}
            onAdded={() => patchPost(commentsFor.id, (p) => ({ comments: p.comments + 1 }))}
          />
        )}
        {composerOpen && (
          <Composer
            onClose={() => setComposerOpen(false)}
            onPublished={(post) => {
              setPosts((items) => (items.some((p) => p.id === post.id) ? items : [post, ...items]));
              setComposerOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

/* ---------- feed pieces ---------- */

function FeedSkeleton() {
  return (
    <div className="h-full animate-pulse bg-[#0E0D12] motion-reduce:animate-none" aria-busy="true" aria-label="Loading posts">
      <div className="absolute bottom-28 left-4 right-24">
        <span className="block h-10 w-10 rounded-full bg-white/[.07]" />
        <span className="mt-3 block h-4 w-36 rounded bg-white/[.07]" />
        <span className="mt-2 block h-4 w-56 rounded bg-white/[.05]" />
      </div>
    </div>
  );
}

function FeedMessage({ title, body, action }) {
  return (
    <div className="grid h-full place-items-center px-8 text-center">
      <div>
        <h2 className="font-['Space_Grotesk'] text-lg font-semibold">{title}</h2>
        <p className="mt-1.5 text-sm text-white/55">{body}</p>
        {action}
      </div>
    </div>
  );
}

function Caption({ text }) {
  return text.split(/(#[\w-]+)/g).map((part, i) =>
    part.startsWith("#") ? (
      <span key={i} className="font-medium text-[#C4B5FD]">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

function ExploreVideo({ src, soundOn, onDouble }) {
  const videoRef = useRef(null);
  const pausedByUser = useRef(false);
  const [showPaused, setShowPaused] = useState(false);
  const barRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = !soundOn;
  }, [soundOn]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.65) {
          if (!pausedByUser.current) video.play().catch(() => {});
        } else {
          video.pause();
          video.currentTime = 0;
          pausedByUser.current = false;
          setShowPaused(false);
        }
      },
      { threshold: [0, 0.65] },
    );
    observer.observe(video);
    const onHide = () => document.hidden && video.pause();
    document.addEventListener("visibilitychange", onHide);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onHide);
      video.pause();
    };
  }, [src]);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      pausedByUser.current = false;
      setShowPaused(false);
      video.play().catch(() => {});
    } else {
      pausedByUser.current = true;
      setShowPaused(true);
      video.pause();
    }
  };
  const onTap = useTap(toggle, onDouble);

  return (
    <div onClick={onTap} className="relative h-full w-full cursor-pointer">
      <video
        ref={videoRef}
        src={src}
        className="h-full w-full object-cover"
        muted
        loop
        playsInline
        preload="metadata"
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          if (barRef.current && v.duration) barRef.current.style.width = `${(v.currentTime / v.duration) * 100}%`;
        }}
      />
      {showPaused && (
        <span className="pointer-events-none absolute inset-0 grid place-items-center">
          <Play size={72} fill="currentColor" className="text-white/70 drop-shadow-lg" />
        </span>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] h-[2px] bg-white/20 sm:bottom-0">
        <div ref={barRef} className="h-full w-0 bg-[#14F1D9]" />
      </div>
    </div>
  );
}

function Post({ post, saved, soundOn, following, onLike, onSave, onComment, onShare, onSound, onFollow }) {
  const [burst, setBurst] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isVideo = post.mediaType === "video" && post.image;

  const doubleLike = () => {
    if (!post.likedByMe) onLike();
    setBurst(true);
    window.setTimeout(() => setBurst(false), 700);
  };
  const onTap = useTap(null, doubleLike);
  const canFollow = !post.isOwner && post.authorId;

  return (
    <article className="relative h-full snap-start snap-always overflow-hidden bg-black">
      <div className="absolute inset-0">
        {isVideo ? (
          <ExploreVideo src={post.image} soundOn={soundOn} onDouble={doubleLike} />
        ) : post.image ? (
          <img
            src={post.image}
            alt={post.caption || `Post by ${post.user}`}
            loading="lazy"
            draggable={false}
            onClick={onTap}
            className="h-full w-full cursor-pointer object-cover"
          />
        ) : (
          <div onClick={onTap} className="grid h-full cursor-pointer place-items-center bg-gradient-to-br from-[#2A1B5C] via-[#14101F] to-[#0A2A2C] p-8 text-center">
            <p className="max-w-sm font-['Space_Grotesk'] text-[1.75rem] font-bold leading-snug">
              <Caption text={post.caption} />
            </p>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.35),transparent_18%,transparent_55%,rgba(0,0,0,.75)_100%)]" />
      </div>

      <AnimatePresence>
        {burst && (
          <motion.div
            initial={{ opacity: 0, scale: 0.4, rotate: -12 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 1.5 }}
            className="pointer-events-none absolute inset-0 z-10 grid place-items-center"
          >
            <Heart size={110} className="fill-[#8B5CF6] text-[#8B5CF6] drop-shadow-[0_4px_24px_rgba(139,92,246,.6)]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom-left: creator + caption */}
      <div className="absolute bottom-[calc(5rem+env(safe-area-inset-bottom))] left-3 right-20 z-10 drop-shadow sm:bottom-6">
        <div className="flex items-center gap-1.5">
          <b className="truncate font-['Space_Grotesk'] text-[17px] font-bold">{post.handle}</b>
          {post.verified && (
            <CheckCircle2 aria-label="Verified account" size={15} className="shrink-0 fill-[#14F1D9] text-black" />
          )}
          <span className="shrink-0 text-sm text-white/65">· {post.time}</span>
        </div>
        {post.caption && post.image && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="mt-1.5 block w-full text-left"
          >
            <span className={`block text-[15px] leading-[1.35] text-white ${expanded ? "max-h-[35vh] overflow-y-auto" : "line-clamp-2"}`}>
              <Caption text={post.caption} />
            </span>
          </button>
        )}
      </div>

      {/* Right rail */}
      <div className="absolute bottom-[calc(5rem+env(safe-area-inset-bottom))] right-2 z-10 flex w-14 flex-col items-center gap-[18px] sm:bottom-6">
        <div className="relative mb-1.5">
          {post.avatar ? (
            <img src={post.avatar} alt={post.user} className="h-12 w-12 rounded-full border-2 border-white object-cover" />
          ) : (
            <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-white bg-[#8B5CF6] font-['Space_Grotesk'] text-lg font-bold">
              {post.user[0]?.toUpperCase()}
            </span>
          )}
          {canFollow && (
            <button
              onClick={onFollow}
              aria-label={following ? `Unfollow ${post.user}` : `Follow ${post.user}`}
              className={`absolute -bottom-2.5 left-1/2 grid h-[22px] w-[22px] -translate-x-1/2 place-items-center rounded-full text-white transition ${following ? "bg-[#14F1D9] text-black" : "bg-[#8B5CF6]"}`}
            >
              {following ? <Check size={14} strokeWidth={3} /> : <Plus size={15} strokeWidth={3} />}
            </button>
          )}
        </div>

        <Action label={`${post.likedByMe ? "Unlike" : "Like"}, ${post.likes} likes`} count={compact(post.likes)} active={post.likedByMe} activeClass="text-[#8B5CF6]" onClick={onLike}>
          <Heart fill="currentColor" />
        </Action>
        <Action label={`Comments, ${post.comments}`} count={compact(post.comments)} onClick={onComment}>
          <MessageCircle fill="currentColor" />
        </Action>
        <Action label={saved ? "Remove from saved" : "Save"} count={saved ? "Saved" : "Save"} active={saved} activeClass="text-[#14F1D9]" onClick={onSave}>
          <Bookmark fill="currentColor" />
        </Action>
        <Action label={`Share, ${post.shares} shares`} count={compact(post.shares)} onClick={onShare}>
          <Share2 fill="currentColor" />
        </Action>
        {isVideo && (
          <Action label={soundOn ? "Mute videos" : "Unmute videos"} onClick={onSound}>
            {soundOn ? <Volume2 /> : <VolumeX />}
          </Action>
        )}
      </div>
    </article>
  );
}

function Action({ children, count, label, active, activeClass = "", onClick }) {
  return (
    <motion.button
      whileTap={{ scale: 0.8 }}
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className="flex flex-col items-center gap-0.5 text-xs font-semibold drop-shadow-[0_1px_3px_rgba(0,0,0,.6)] focus-visible:outline-none"
    >
      <span className={`grid h-11 w-11 place-items-center transition-colors [&>svg]:h-[34px] [&>svg]:w-[34px] [&>svg]:stroke-[1.5] ${active ? activeClass : "text-white"}`}>
        {children}
      </span>
      {count !== undefined && <span>{count}</span>}
    </motion.button>
  );
}

/* ---------- overlays ---------- */

function SearchOverlay({ initial, onChange, onClose }) {
  const [value, setValue] = useState(initial);
  useEscape(onClose);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] bg-[#0A0A0C]/95 px-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur"
    >
      <form
        className="mx-auto flex max-w-[560px] items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          onChange(value.trim());
          onClose();
        }}
      >
        <button type="button" onClick={onClose} aria-label="Close search" className="shrink-0 rounded-full p-2 hover:bg-white/10">
          <X size={18} />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-white/[.07] px-4 focus-within:ring-2 focus-within:ring-[#8B5CF6]">
          <Search size={17} className="shrink-0 text-white/40" />
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Search posts, creators, hashtags"
            className="w-full min-w-0 bg-transparent py-3 text-sm outline-none placeholder:text-white/40"
          />
        </div>
      </form>
      <p className="mx-auto mt-5 max-w-[560px] text-sm text-white/45">Press Enter to see results in your feed.</p>
    </motion.div>
  );
}

function Sheet({ title, onClose, children, tall }) {
  useEscape(onClose);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 sm:items-center"
      onClick={onClose}
    >
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ y: 48 }}
        animate={{ y: 0 }}
        exit={{ y: 48 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className={`flex w-full max-w-[560px] flex-col rounded-t-2xl bg-[#15131A] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:max-w-md sm:rounded-2xl ${tall ? "h-[68vh]" : ""}`}
      >
        <div className="relative flex h-8 items-center justify-center">
          <h2 className="font-['Space_Grotesk'] text-sm font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="absolute right-0 rounded-full p-1.5 hover:bg-white/10">
            <X size={18} className="text-white/70" />
          </button>
        </div>
        {children}
      </motion.section>
    </motion.div>
  );
}

function CommentsSheet({ post, onClose, onAdded }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getPostComments(post.id);
      setItems(data.comments || []);
    } catch {
      toast.error("Couldn't load comments.");
    } finally {
      setLoading(false);
    }
  }, [post.id]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    try {
      await addPostComment(post.id, value);
      setText("");
      onAdded();
      await load();
    } catch {
      toast.error("Couldn't post your comment. Try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet title={`${compact(post.comments)} comments`} onClose={onClose} tall>
      <div className="mt-3 min-h-0 flex-1 space-y-4 overflow-y-auto">
        {loading ? (
          <p className="py-6 text-center text-sm text-white/40">Loading comments…</p>
        ) : items.length ? (
          items.map((item) => (
            <div className="flex gap-3" key={item._id}>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#8B5CF6]/20 text-sm font-semibold text-[#C4B5FD]">
                {item.user?.name?.[0]?.toUpperCase() || "C"}
              </span>
              <div className="min-w-0">
                <b className="font-['Space_Grotesk'] text-sm font-medium">{item.user?.name || "Member"}</b>
                <p className="break-words text-sm text-white/75">{item.text}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="py-6 text-center text-sm text-white/45">No comments yet. Start the conversation.</p>
        )}
      </div>
      <form onSubmit={submit} className="mt-3 flex items-center gap-2 border-t border-white/[.08] pt-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          placeholder="Add a comment"
          className="min-w-0 flex-1 rounded-full bg-white/[.06] px-4 py-2.5 text-sm outline-none placeholder:text-white/40 focus:ring-2 focus:ring-[#8B5CF6]"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          aria-label="Send comment"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#8B5CF6] text-white disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </form>
    </Sheet>
  );
}

function Composer({ onClose, onPublished }) {
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [posting, setPosting] = useState(false);
  const isVideo = file?.type.startsWith("video/");

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const pick = (e) => {
    const next = e.target.files?.[0];
    if (!next) return;
    if (!next.type.startsWith("image/") && !next.type.startsWith("video/")) return toast.error("Choose an image or video.");
    if (next.size > 100 * 1024 * 1024) return toast.error("Files must be 100 MB or smaller.");
    setFile(next);
    setPreview(URL.createObjectURL(next));
  };

  const publish = async (e) => {
    e.preventDefault();
    if (!file || posting) return;
    setPosting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const upload = await axiosInstance.post("/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
      const mediaType = isVideo ? "video" : "image";
      const post = await createPost({ caption, mediaType, media: [{ url: upload.data.url, type: mediaType }] });
      toast.success("Post published");
      onPublished(toFeedPost({ ...post, isOwner: true }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Couldn't publish your post. Try again.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <Sheet title="New post" onClose={onClose}>
      <form onSubmit={publish}>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Write a caption. Add #hashtags to be found."
          rows={3}
          maxLength={2200}
          className="mt-4 w-full resize-none rounded-xl bg-white/[.05] p-3 text-sm outline-none placeholder:text-white/40 focus:ring-2 focus:ring-[#8B5CF6]"
        />
        {preview ? (
          <div className="relative mt-3 h-48 overflow-hidden rounded-xl bg-black">
            {isVideo ? (
              <video src={preview} className="h-full w-full object-cover" controls playsInline />
            ) : (
              <img src={preview} alt="Selected upload preview" className="h-full w-full object-cover" />
            )}
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setPreview("");
              }}
              aria-label="Remove media"
              className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5"
            >
              <X size={15} />
            </button>
          </div>
        ) : (
          <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#8B5CF6]/50 bg-[#8B5CF6]/[.08] p-5 text-sm font-medium text-[#C4B5FD] focus-within:ring-2 focus-within:ring-[#8B5CF6]">
            <ImagePlus size={18} />
            <Video size={18} />
            Choose an image or video
            <input type="file" accept="image/*,video/*" className="sr-only" onChange={pick} />
          </label>
        )}
        <p className="mt-2 text-xs text-white/45">Images and videos up to 100 MB.</p>
        <button
          disabled={posting || !file}
          className="mt-4 w-full rounded-full bg-[#8B5CF6] py-3 text-sm font-semibold text-white transition hover:bg-[#7C4DEB] disabled:opacity-40"
        >
          {posting ? "Publishing…" : "Publish"}
        </button>
      </form>
    </Sheet>
  );
}