import { AnimatePresence, motion } from "framer-motion";
import { Bell, Bookmark, CheckCircle2, Heart, ImagePlus, MessageCircle, Pause, Play, Plus, Repeat2, Search, Send, Share2, Video, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import BottomNav from "../../components/navigations/BottomNav";
import { addPostComment, createPost, getExploreData, getPostComments, likePost, sharePost, unlikePost } from "../../services/chatService";
import axiosInstance from "../../services/axiosInstance";
import { toast } from "react-toastify";
import { followUser, getMyConnections, unfollowUser } from "../../services/authService";
import socket from "../../lib/socket";

const compact = (n) => n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 1 : 1)}K` : n;
const timeAgo = (date) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
};
const toFeedPost = (post) => {
  const authorName = post.user?.name || post.author?.name || "ChatVerse member";
  return ({
  id: post._id,
  authorId: post.user?._id || post.author?._id,
  user: authorName,
  handle: post.user?.username ? `@${post.user.username}` : `@${authorName.toLowerCase().replace(/\s+/g, "")}`,
  time: timeAgo(post.createdAt),
  avatar: post.user?.avatar || post.author?.avatar || "",
  image: post.media?.[0]?.url || post.mediaUrl || "",
  mediaType: post.media?.[0]?.type || (post.type === "Video" ? "video" : "image"),
  type: post.mediaType || post.type || "Post",
  likes: post.likesCount || post.likes?.length || 0,
  comments: post.commentsCount || 0,
  reposts: post.sharesCount || post.repostsCount || 0,
  caption: post.caption || post.text || "",
  tags: ((post.caption || post.text || "").match(/#[\w-]+/g) || []).join(" "),
  likedByMe: Boolean(post.likedByMe),
  isOwner: Boolean(post.isOwner),
  verified: Boolean(post.user?.isVerified || post.user?.verified || post.author?.isVerified || post.author?.verified),
  });
};

export default function Explore() {
  const [activeCategory, setActiveCategory] = useState("For you");
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [activePost, setActivePost] = useState(null);
  const [liked, setLiked] = useState([]);
  const [saved, setSaved] = useState([]);
  const [mutedVideoIds, setMutedVideoIds] = useState([]);
  const [heartId, setHeartId] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [comment, setComment] = useState("");
  const [following, setFollowing] = useState([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState("");
  const [posting, setPosting] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const patchPost = (id, changes) => setPosts((items) => items.map((post) => post.id === id ? { ...post, ...changes } : post));

  useEffect(() => {
    let mounted = true;
    getExploreData("", activeCategory === "Following" ? "following" : "for-you")
      .then((data) => { if (mounted) { const feed = (data.posts || []).map(toFeedPost); setPosts(feed); setLiked(feed.filter((post) => post.likedByMe).map((post) => post.id)); } })
      .catch(() => mounted && setPosts([]))
      .finally(() => mounted && setLoadingPosts(false));
    return () => { mounted = false; };
  }, [activeCategory]);

  useEffect(() => {
    let mounted = true;
    getMyConnections(localStorage.getItem("accessToken")).then((response) => mounted && setFollowing((response.data.data.following || []).map((person) => person._id))).catch(() => {});
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const updateLikes = ({ postId, likesCount }) => patchPost(postId, { likes: likesCount });
    const updateShares = ({ postId, sharesCount }) => patchPost(postId, { reposts: sharesCount });
    const receivePost = (rawPost) => {
      const post = toFeedPost(rawPost);
      const belongsInFeed = activeCategory === "For you" || following.includes(post.authorId);
      if (belongsInFeed) setPosts((items) => items.some((item) => item.id === post.id) ? items : [post, ...items]);
    };
    socket.on("newPost", receivePost);
    socket.on("postLiked", updateLikes);
    socket.on("postShared", updateShares);
    const removePost = ({ postId }) => setPosts((items) => items.filter((post) => post.id !== postId));
    socket.on("postDeleted", removePost);
    return () => { socket.off("newPost", receivePost); socket.off("postLiked", updateLikes); socket.off("postShared", updateShares); socket.off("postDeleted", removePost); };
  }, [activeCategory, following]);

  const toggleLike = async (post) => { const isLiked = liked.includes(post.id); try { const updated = isLiked ? await unlikePost(post.id) : await likePost(post.id); setLiked((ids) => isLiked ? ids.filter((id) => id !== post.id) : [...ids, post.id]); patchPost(post.id, { likes: updated.likesCount }); } catch (error) { toast.error(error.response?.data?.message || "Could not update like"); } };
  const doubleLike = (post) => { if (!liked.includes(post.id)) toggleLike(post); setHeartId(post.id); window.setTimeout(() => setHeartId(null), 750); };
  const share = async (post) => { try { const data = await sharePost(post.id); patchPost(post.id, { reposts: data.post.sharesCount }); if (navigator.share) await navigator.share({ title: "ChatVerse", text: "Check this out on ChatVerse", url: data.shareLink }); else { setActivePost(post); setSheet("share"); } } catch (error) { if (error.name !== "AbortError") toast.error("Could not share post"); } };
  const runSearch = async (value) => { setSearch(value); try { const data = await getExploreData(value, activeCategory === "Following" ? "following" : "for-you"); const feed = (data.posts || []).map(toFeedPost); setPosts(feed); setLiked(feed.filter((post) => post.likedByMe).map((post) => post.id)); } catch { toast.error("Could not search posts"); } };
  const submitComment = async () => { if (!comment.trim() || !activePost) return; try { await addPostComment(activePost.id, comment); patchPost(activePost.id, { comments: activePost.comments + 1 }); setActivePost((post) => ({ ...post, comments: post.comments + 1 })); setComment(""); toast.success("Comment posted"); } catch { toast.error("Could not post comment"); } };
  const toggleFollow = async (post) => { if (!post.authorId) return; const isFollowing = following.includes(post.authorId); try { if (isFollowing) await unfollowUser(post.authorId); else await followUser(post.authorId); setFollowing((ids) => isFollowing ? ids.filter((id) => id !== post.authorId) : [...ids, post.authorId]); if (isFollowing && activeCategory === "Following") setPosts((items) => items.filter((item) => item.authorId !== post.authorId)); } catch (error) { toast.error(error.response?.data?.message || "Could not update follow"); } };
  const publishPost = async () => {
    if (!mediaFile) return;
    try { setPosting(true); const form = new FormData(); form.append("file", mediaFile); const upload = await axiosInstance.post("/upload", form, { headers: { "Content-Type": "multipart/form-data" } }); const mediaType = mediaFile.type.startsWith("video/") ? "video" : "image"; const post = await createPost({ caption, mediaType, media: [{ url: upload.data.url, type: mediaType }] }); setPosts((items) => [toFeedPost(post), ...items]); if (mediaPreview) URL.revokeObjectURL(mediaPreview); setCaption(""); setMediaFile(null); setMediaPreview(""); setComposerOpen(false); toast.success("Post published"); } catch (error) { toast.error(error.response?.data?.message || "Could not publish post"); } finally { setPosting(false); }
  };
  const selectMedia = (event) => { const file = event.target.files?.[0]; if (!file) return; if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) return toast.error("Choose an image or video file"); if (file.size > 100 * 1024 * 1024) return toast.error("Files must be 100 MB or smaller"); if (mediaPreview) URL.revokeObjectURL(mediaPreview); setMediaFile(file); setMediaPreview(URL.createObjectURL(file)); };

  return <main className="cv-shell h-[100dvh] overflow-hidden selection:bg-[#8B5CF6]/40">
    <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_120%_60%_at_50%_-10%,rgba(99,102,241,.22),transparent_55%)]" />
    <div className="relative mx-auto h-full max-w-[560px] overflow-hidden sm:border-x sm:border-white/[.06]">
      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between bg-gradient-to-b from-black/70 via-black/30 to-transparent px-3 pb-28 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-4 sm:pb-14 sm:pt-4">
        <div className="pointer-events-auto flex items-center gap-2.5">
       
          <span className="hidden font-['Space_Grotesk'] text-[1.05rem] font-semibold tracking-[-0.01em] min-[430px]:inline">Discover <span className="text-[#14F1D9]">what's next</span></span>
        </div>
        <div className="pointer-events-auto flex items-center gap-1">
          <button onClick={() => setSearchOpen(true)} aria-label="Search" className="grid h-9 w-9 place-items-center rounded-full text-zinc-100 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8B5CF6]"><Search size={18} strokeWidth={2} /></button>
          <TopButton label="Notifications"><Bell size={18} strokeWidth={2} /></TopButton>
          <button onClick={() => setComposerOpen(true)} aria-label="Create post" className="ml-1 grid h-9 w-9 place-items-center rounded-full bg-[#8B5CF6] text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B5CF6]"><Plus size={19} strokeWidth={2.25} /></button>
        </div>
        <nav className="pointer-events-auto absolute left-1/2 top-[4.1rem] flex -translate-x-1/2 items-center gap-2 sm:top-[3.4rem] sm:gap-3">
          {["Trending", "Communities", "Creators", "New"].map((item) => (
            <button onClick={() => setActiveCategory(item === "Following" ? item : "For you")} key={item} className={`relative whitespace-nowrap rounded-full px-3 py-1.5 font-['Space_Grotesk'] text-xs font-medium transition ${item === "Trending" && activeCategory === "For you" ? "bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white" : "bg-white/[.06] text-white/50"}`}>
              {item}
            </button>
          ))}
        </nav>
      </header>

      <div className="h-[calc(100dvh-4rem)] snap-y snap-mandatory overflow-y-auto [scrollbar-width:none]">
        {loadingPosts ? <FeedSkeleton /> : posts.length ? posts.map((post) => (
          <Post
            key={post.id}
            post={post}
            liked={liked.includes(post.id)}
            saved={saved.includes(post.id)}
            muted={mutedVideoIds.includes(post.id)}
            onLike={() => toggleLike(post)}
            onSave={() => setSaved((ids) => ids.includes(post.id) ? ids.filter((item) => item !== post.id) : [...ids, post.id])}
            onDouble={() => doubleLike(post)}
            onComment={() => { setActivePost(post); setSheet("comments"); }}
            onRepost={() => share(post)}
            onShare={() => share(post)}
            onMute={() => setMutedVideoIds((ids) => ids.includes(post.id) ? ids.filter((id) => id !== post.id) : [...ids, post.id])}
            following={following.includes(post.authorId)}
            onFollow={() => toggleFollow(post)}
            heart={heartId === post.id}
          />
        )) : (
          <div className="grid h-full place-items-center px-6 text-center">
            <div>
              <span className="block text-[2rem] leading-none text-[#8B5CF6]">·</span>
              <h2 className="mt-3 font-['Space_Grotesk'] text-lg font-semibold">Nothing here yet</h2>
              <p className="mt-1.5 text-sm text-white/45">Follow a few creators or check back later.</p>
            </div>
          </div>
        )}
      </div>
    </div>
    <BottomNav />

    <AnimatePresence>
      {activePost?.story && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] grid place-items-center bg-black/92 p-4">
          <div className="relative h-[78vh] w-full max-w-md overflow-hidden rounded-[20px] bg-[#151318]">
            {activePost.image ? <img src={activePost.image} className="h-full w-full object-cover" /> : <p className="grid h-full place-items-center p-8 text-center font-['Space_Grotesk'] text-2xl font-semibold">{activePost.text}</p>}
            <div className="absolute inset-x-4 top-4 h-[3px] overflow-hidden rounded-full bg-white/20">
              <motion.i initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 5 }} className="block h-full bg-[#8B5CF6]" />
            </div>
            <button onClick={() => setActivePost(null)} className="absolute right-4 top-8 rounded-full bg-black/40 p-2"><X size={18} /></button>
            <b className="absolute bottom-5 left-5 font-['Space_Grotesk'] font-medium">{activePost.user}'s story</b>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    <AnimatePresence>
      {searchOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-[#0A0A0C] px-3 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:p-4">
          <div className="mx-auto max-w-[560px]">
            <div className="flex items-center gap-2 sm:gap-3">
              <button onClick={() => setSearchOpen(false)} aria-label="Close search" className="shrink-0 rounded-full p-2 hover:bg-white/10"><X size={18} /></button>
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-white/[.07] px-3.5 sm:px-4">
                <Search size={17} className="shrink-0 text-white/40" />
                <input autoFocus value={search} onChange={(event) => runSearch(event.target.value)} placeholder="Search posts, creators, hashtags" className="min-w-0 w-full bg-transparent py-3 text-sm outline-none placeholder:text-white/35" />
              </div>
            </div>
            <p className="mt-6 text-sm text-white/40">Results update as you type.</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    <AnimatePresence>{sheet && <Sheet type={sheet} post={activePost} comment={comment} setComment={setComment} onComment={submitComment} close={() => setSheet(null)} />}</AnimatePresence>

    <AnimatePresence>
      {composerOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-end bg-black/75 p-4 sm:items-center sm:justify-center">
          <motion.form initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }} onSubmit={(event) => { event.preventDefault(); publishPost(); }} className="w-full max-w-md rounded-[22px] border border-white/[.08] bg-[#151318] p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-['Space_Grotesk'] text-lg font-semibold">New post</h2>
              <button type="button" onClick={() => setComposerOpen(false)} className="rounded-full p-1 hover:bg-white/10"><X size={18} className="text-white/50" /></button>
            </div>
            <textarea value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Write a caption…" className="mt-5 w-full rounded-xl bg-white/[.05] p-3 text-sm outline-none placeholder:text-white/35 focus:bg-white/[.07]" rows="4" />
            <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#8B5CF6]/45 bg-[#8B5CF6]/[.08] p-4 text-sm font-medium text-[#C4B5FD]">
              {mediaFile?.type.startsWith("video/") ? <Video size={18} /> : <ImagePlus size={18} />}
              {mediaFile ? mediaFile.name : "Choose an image or video"}
              <input required type="file" accept="image/*,video/*" className="hidden" onChange={selectMedia} />
            </label>
            {mediaPreview && (
              <div className="mt-3 h-44 overflow-hidden rounded-xl bg-black">
                {mediaFile?.type.startsWith("video/") ? <video src={mediaPreview} className="h-full w-full object-cover" controls /> : <img src={mediaPreview} className="h-full w-full object-cover" />}
              </div>
            )}
            <p className="mt-2 text-xs text-white/35">Images and videos up to 100 MB.</p>
            <button disabled={posting || !mediaFile} className="mt-4 w-full rounded-full bg-[#8B5CF6] py-3 text-sm font-semibold text-white transition disabled:opacity-40">{posting ? "Uploading…" : "Publish post"}</button>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  </main>;
}

function TopButton({ children, label }) {
  return <button aria-label={label} className="grid h-9 w-9 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8B5CF6]">{children}</button>;
}

function FeedSkeleton() {
  return (
    <div className="h-full animate-pulse bg-[#111014]">
      <div className="mx-4 pt-24">
        <span className="block h-10 w-10 rounded-full bg-white/[.07]" />
        <span className="mt-3 block h-4 w-36 rounded bg-white/[.07]" />
        <span className="mt-2 block h-4 w-52 rounded bg-white/[.05]" />
      </div>
    </div>
  );
}

function ExploreVideo({ src, muted }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [manuallyPaused, setManuallyPaused] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.65) {
        if (!manuallyPaused) video.play().catch(() => {});
      } else {
        video.pause();
      }
    }, { threshold: [0, 0.65] });

    observer.observe(video);
    return () => { observer.disconnect(); video.pause(); };
  }, [src, manuallyPaused]);

  useEffect(() => {
    const pauseWhenHidden = () => { if (document.hidden) videoRef.current?.pause(); };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => document.removeEventListener("visibilitychange", pauseWhenHidden);
  }, []);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      setManuallyPaused(false);
      video.play().catch(() => {});
    } else {
      setManuallyPaused(true);
      video.pause();
    }
  };

  return (
    <div onClick={togglePlayback} className="relative h-full w-full">
      <video ref={videoRef} src={src} className="h-full w-full object-cover" muted={muted} loop playsInline preload="metadata" onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} />
      <button type="button" onClick={(event) => { event.stopPropagation(); togglePlayback(); }} aria-label={isPlaying ? "Pause video" : "Play video"} className="absolute right-3 top-[7.25rem] z-20 grid h-9 w-9 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/65 sm:right-4 sm:top-20">
        {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
      </button>
    </div>
  );
}

function Post({ post, liked, saved, muted, onLike, onSave, onDouble, onComment, onRepost, onShare, onMute, following, onFollow, heart }) {
  return (
    <motion.article initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative h-full snap-start overflow-hidden bg-[#111014]">
      <div onDoubleClick={onDouble} className="absolute inset-0 cursor-pointer">
        {post.image ? (
          post.mediaType === "video" ? <ExploreVideo src={post.image} muted={muted} /> : <img src={post.image} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center bg-[#151318] p-6 text-center sm:p-12">
            <span className="text-4xl text-[#8B5CF6]">{post.type === "Video" ? "▶" : "·"}</span>
            <p className="mt-5 max-w-sm font-['Space_Grotesk'] text-xl font-semibold leading-snug">{post.caption}</p>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent via-45% to-black/92" />
      </div>

      <AnimatePresence>
        {heart && (
          <motion.div initial={{ opacity: 0, scale: .3 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.5 }} className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
            <Heart className="fill-[#8B5CF6] text-[#8B5CF6] drop-shadow-[0_4px_20px_rgba(139,92,246,.5)]" size={100} />
          </motion.div>
        )}
      </AnimatePresence>

      <button onClick={onMute} aria-label={muted ? "Unmute video" : "Mute video"} className="absolute right-3 top-[10rem] z-10 rounded-full bg-black/40 p-2 backdrop-blur sm:right-4 sm:top-[12.75rem]">
        {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>

      <div className="absolute bottom-4 left-3 right-[4.25rem] z-10 sm:bottom-5 sm:left-4 sm:right-20">
        <div className="mb-2.5 flex items-center gap-2 sm:mb-3">
          {post.avatar ? (
            <img src={post.avatar} className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-white/25 sm:h-10 sm:w-10" />
          ) : (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#8B5CF6] text-sm font-semibold text-white sm:h-10 sm:w-10">{post.user[0]}</span>
          )}
          <b className="min-w-0 flex-1 truncate font-['Space_Grotesk'] text-sm font-medium">{post.handle}</b>
          {post.verified && <CheckCircle2 aria-label="Verified account" size={14} className="shrink-0 fill-[#8B5CF6] text-white" />}
          <button onClick={onFollow} className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${following ? "bg-white/10 text-white/70" : "bg-[#8B5CF6] text-white"}`}>{following ? "Following" : "Follow"}</button>
        </div>
        <p className="line-clamp-2 text-[0.9rem] leading-5 text-white/90 sm:line-clamp-3">{post.caption}</p>
        {post.tags && <p className="mt-1.5 line-clamp-1 text-sm font-medium text-[#C4B5FD] sm:mt-2">{post.tags}</p>}
        <p className="mt-1.5 text-xs text-white/45 sm:mt-2">{post.user} · {post.time}</p>
      </div>

      <div className="absolute bottom-4 right-2 z-10 flex flex-col items-center gap-4 sm:bottom-5 sm:right-3">
        <Action icon={<Heart fill={liked ? "currentColor" : "none"} />} label={compact(post.likes)} active={liked} onClick={onLike} />
        <Action icon={<MessageCircle />} label={compact(post.comments)} onClick={onComment} />
        <Action icon={<Repeat2 />} label={compact(post.reposts)} onClick={onRepost} />
        <Action icon={<Share2 />} label="Share" onClick={onShare} />
        <Action icon={<Bookmark fill={saved ? "currentColor" : "none"} />} label={saved ? "Saved" : "Save"} active={saved} onClick={onSave} />
      </div>
    </motion.article>
  );
}

function Action({ icon, label, active, onClick }) {
  return (
    <motion.button whileTap={{ scale: .78 }} onClick={onClick} className={`flex flex-col items-center gap-1 text-[11px] font-medium ${active ? "text-[#8B5CF6]" : "text-white"}`}>
      <span className="grid h-9 w-9 place-items-center rounded-full bg-black/25 backdrop-blur-sm [&>svg]:h-[19px] [&>svg]:w-[19px]">{icon}</span>
      <span>{label}</span>
    </motion.button>
  );
}

function Sheet({ type, post, close, comment, setComment, onComment }) {
  const [items, setItems] = useState([]);
  useEffect(() => { if (type === "comments" && post?.id) getPostComments(post.id).then((data) => setItems(data.comments || [])).catch(() => setItems([])); }, [type, post?.id, post?.comments]);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end bg-black/70" onClick={close}>
      <motion.section initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 280 }} onClick={(e) => e.stopPropagation()} className="w-full rounded-t-[24px] border-t border-white/[.08] bg-[#151318] px-5 pb-5 pt-3">
        <div className="mx-auto h-1 w-9 rounded-full bg-white/15" />
        <div className="mt-4 flex items-center justify-between">
          <h2 className="font-['Space_Grotesk'] text-[1.05rem] font-semibold">{type === "comments" ? `Comments · ${compact(post?.comments || 0)}` : "Share"}</h2>
          <button onClick={close} className="rounded-full p-1 hover:bg-white/10"><X size={18} className="text-white/50" /></button>
        </div>
        {type === "comments" && (
          <>
            <div className="mt-4 max-h-[42vh] space-y-4 overflow-y-auto">
              {items.length ? items.map((item) => (
                <div className="flex gap-3" key={item._id}>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#8B5CF6]/20 text-sm font-semibold text-[#C4B5FD]">{item.user?.name?.[0] || "C"}</span>
                  <div>
                    <b className="font-['Space_Grotesk'] text-sm font-medium">{item.user?.name || "Member"}</b>
                    <p className="text-sm text-white/70">{item.text}</p>
                  </div>
                </div>
              )) : <p className="py-5 text-center text-sm text-white/35">No comments yet.</p>}
            </div>
            <div className="mt-4 flex gap-2 border-t border-white/[.08] pt-4">
              <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/35" />
              <button onClick={onComment} disabled={!comment.trim()} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#8B5CF6] text-white disabled:opacity-40"><Send size={15} /></button>
            </div>
          </>
        )}
      </motion.section>
    </motion.div>
  );
}