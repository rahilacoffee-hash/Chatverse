import { AnimatePresence, motion } from "framer-motion";
import { Bell, Bookmark, CheckCircle2, Heart, ImagePlus, MessageCircle, Pause, Play, Plus, Repeat2, Search, Send, Share2, Video, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import BottomNav from "../../components/navigations/BottomNav";
import { addPostComment, createPost, getExploreData, getPostComments, likePost, sharePost, unlikePost } from "../../services/chatService";
import axiosInstance from "../../services/axiosInstance";
import { toast } from "react-toastify";
import { followUser, getMyConnections, unfollowUser } from "../../services/authService";
import socket from "../../lib/socket";

const categories = ["For you", "Following"];
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
    return () => { socket.off("newPost", receivePost); socket.off("postLiked", updateLikes); socket.off("postShared", updateShares); };
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

  return <main className="h-[100dvh] overflow-hidden bg-[#09090b] text-white selection:bg-fuchsia-500/50">
    <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_80%_-10%,rgba(124,58,237,.23),transparent_34%),radial-gradient(circle_at_10%_40%,rgba(217,70,239,.1),transparent_25%)]" />
    <div className="relative mx-auto h-full max-w-[560px] overflow-hidden sm:border-x sm:border-white/10">
      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between bg-gradient-to-b from-black/65 via-black/25 to-transparent px-3 pb-28 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-4 sm:pb-14 sm:pt-4">
        <div className="pointer-events-auto flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-lg font-black shadow-lg shadow-fuchsia-900/40">C</span><span className="hidden font-['Space_Grotesk'] text-lg font-bold tracking-tight min-[430px]:inline">ChatVerse</span></div>
        <div className="pointer-events-auto flex items-center gap-1"><button onClick={() => setSearchOpen(true)} aria-label="Search" className="grid h-9 w-9 place-items-center rounded-xl bg-black/20 text-zinc-100 backdrop-blur transition hover:bg-white/10"><Search size={19}/></button><TopButton label="Notifications"><Bell size={19}/></TopButton><button onClick={() => setComposerOpen(true)} aria-label="Create post" className="ml-1 grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 shadow-lg shadow-fuchsia-900/30"><Plus size={20}/></button></div>
        <nav className="pointer-events-auto absolute left-1/2 top-[4rem] flex -translate-x-1/2 items-center gap-4 sm:top-4 sm:gap-5">{categories.map((item) => <button onClick={() => setActiveCategory(item)} key={item} className={`relative whitespace-nowrap pb-2 text-sm font-bold transition ${activeCategory === item ? "text-white" : "text-zinc-300/70"}`}>{item}{activeCategory === item && <motion.i layoutId="explore-tab" className="absolute bottom-0 left-1/2 h-[3px] w-5 -translate-x-1/2 rounded-full bg-fuchsia-400"/>}</button>)}</nav>
      </header>
      <div className="h-[calc(100dvh-4rem)] snap-y snap-mandatory overflow-y-auto [scrollbar-width:none]">{loadingPosts ? <FeedSkeleton /> : posts.length ? posts.map((post) => <Post key={post.id} post={post} liked={liked.includes(post.id)} saved={saved.includes(post.id)} muted={mutedVideoIds.includes(post.id)} onLike={() => toggleLike(post)} onSave={() => setSaved((ids) => ids.includes(post.id) ? ids.filter((item) => item !== post.id) : [...ids, post.id])} onDouble={() => doubleLike(post)} onComment={() => { setActivePost(post); setSheet("comments"); }} onRepost={() => share(post)} onShare={() => share(post)} onMute={() => setMutedVideoIds((ids) => ids.includes(post.id) ? ids.filter((id) => id !== post.id) : [...ids, post.id])} following={following.includes(post.authorId)} onFollow={() => toggleFollow(post)} heart={heartId === post.id} />) : <div className="grid h-full place-items-center px-6 text-center"><div><span className="text-3xl">✦</span><h2 className="mt-4 font-['Space_Grotesk'] text-lg font-bold">No posts found</h2></div></div>}</div>
    </div>
    <BottomNav />
    <AnimatePresence>{activePost?.story && <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[60] grid place-items-center bg-black/90 p-4"><div className="relative h-[78vh] w-full max-w-md overflow-hidden rounded-[28px] bg-gradient-to-br from-violet-900 to-fuchsia-900">{activePost.image ? <img src={activePost.image} className="h-full w-full object-cover"/> : <p className="grid h-full place-items-center p-8 text-center font-['Space_Grotesk'] text-2xl font-bold">{activePost.text}</p>}<div className="absolute inset-x-4 top-4 h-1 overflow-hidden rounded-full bg-white/30"><motion.i initial={{width:0}} animate={{width:"100%"}} transition={{duration:5}} className="block h-full bg-white"/></div><button onClick={() => setActivePost(null)} className="absolute right-4 top-8 rounded-full bg-black/30 p-2"><X size={20}/></button><b className="absolute bottom-5 left-5">{activePost.user}'s story</b></div></motion.div>}</AnimatePresence>
    <AnimatePresence>{searchOpen && <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[70] bg-[#09090b] px-3 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:p-4"><div className="mx-auto max-w-[560px]"><div className="flex items-center gap-2 sm:gap-3"><button onClick={() => setSearchOpen(false)} aria-label="Close search" className="shrink-0 p-1"><X/></button><div className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-white/10 px-3 sm:px-4"><Search size={18} className="shrink-0"/><input autoFocus value={search} onChange={(event) => runSearch(event.target.value)} placeholder="Search posts, creators, hashtags" className="min-w-0 w-full bg-transparent py-3 text-sm outline-none"/></div></div><p className="mt-6 text-sm text-zinc-400">Search results update as you type, like TikTok.</p></div></motion.div>}</AnimatePresence>
    <AnimatePresence>{sheet && <Sheet type={sheet} post={activePost} comment={comment} setComment={setComment} onComment={submitComment} close={() => setSheet(null)} />}</AnimatePresence>
    <AnimatePresence>{composerOpen && <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[70] flex items-end bg-black/70 p-4 sm:items-center sm:justify-center"><motion.form initial={{y:40}} animate={{y:0}} exit={{y:40}} onSubmit={(event) => { event.preventDefault(); publishPost(); }} className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#17151c] p-5 shadow-2xl"><div className="flex items-center justify-between"><h2 className="font-['Space_Grotesk'] text-lg font-bold">Create post</h2><button type="button" onClick={() => setComposerOpen(false)}><X className="text-zinc-400"/></button></div><textarea value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Write a caption…" className="mt-5 w-full rounded-2xl bg-white/[.06] p-3 text-sm outline-none placeholder:text-zinc-500" rows="4"/><label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-fuchsia-400/50 bg-fuchsia-500/10 p-4 text-sm font-medium text-fuchsia-200">{mediaFile?.type.startsWith("video/") ? <Video size={19}/> : <ImagePlus size={19}/>} {mediaFile ? mediaFile.name : "Choose an image or video"}<input required type="file" accept="image/*,video/*" className="hidden" onChange={selectMedia}/></label>{mediaPreview && <div className="mt-3 h-44 overflow-hidden rounded-2xl bg-black">{mediaFile?.type.startsWith("video/") ? <video src={mediaPreview} className="h-full w-full object-cover" controls/> : <img src={mediaPreview} className="h-full w-full object-cover"/>}</div>}<p className="mt-2 text-xs text-zinc-500">Images and videos up to 100 MB.</p><button disabled={posting || !mediaFile} className="mt-4 w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 text-sm font-bold disabled:opacity-50">{posting ? "Uploading…" : "Publish post"}</button></motion.form></motion.div>}</AnimatePresence>
  </main>;
}

function TopButton({ children, label }) { return <button aria-label={label} className="grid h-9 w-9 place-items-center rounded-xl text-zinc-300 transition hover:bg-white/10 hover:text-white">{children}</button>; }
function FeedSkeleton() { return <div className="h-full animate-pulse bg-[radial-gradient(circle_at_30%_25%,rgba(168,85,247,.36),transparent_25%),linear-gradient(150deg,#15121d,#09090b)]"><div className="mx-4 pt-24"><span className="block h-10 w-10 rounded-full bg-white/10"/><span className="mt-3 block h-4 w-36 rounded bg-white/10"/></div></div>; }
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

  return <div onClick={togglePlayback} className="relative h-full w-full"><video ref={videoRef} src={src} className="h-full w-full object-cover" muted={muted} loop playsInline preload="metadata" onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} /><button type="button" onClick={(event) => { event.stopPropagation(); togglePlayback(); }} aria-label={isPlaying ? "Pause video" : "Play video"} className="absolute right-3 top-[7.25rem] z-20 grid h-9 w-9 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60 sm:right-4 sm:top-20">{isPlaying ? <Pause size={17} fill="currentColor"/> : <Play size={17} fill="currentColor"/>}</button></div>;
}

function Post({ post, liked, saved, muted, onLike, onSave, onDouble, onComment, onRepost, onShare, onMute, following, onFollow, heart }) { return <motion.article initial={{opacity:0}} animate={{opacity:1}} className="relative h-full snap-start overflow-hidden bg-zinc-900"><div onDoubleClick={onDouble} className="absolute inset-0 cursor-pointer">{post.image ? post.mediaType === "video" ? <ExploreVideo src={post.image} muted={muted} /> : <img src={post.image} className="h-full w-full object-cover"/> : <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_25%_20%,rgba(217,70,239,.38),transparent_26%),linear-gradient(135deg,#18181b,#23113b)] p-6 text-center sm:p-12"><span className="text-5xl">{post.type === "Video" ? "▶" : "✦"}</span><p className="mt-5 max-w-sm font-['Space_Grotesk'] text-xl font-bold">{post.caption}</p></div>}<div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent via-45% to-black/90"/></div><AnimatePresence>{heart && <motion.div initial={{opacity:0,scale:.3}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:1.5}} className="pointer-events-none absolute inset-0 z-10 grid place-items-center"><Heart className="fill-white text-white drop-shadow-2xl" size={105}/></motion.div>}</AnimatePresence><button onClick={onMute} aria-label={muted ? "Unmute video" : "Mute video"} className="absolute right-3 top-[10rem] z-10 rounded-full bg-black/35 p-2 backdrop-blur sm:right-4 sm:top-[12.75rem]"><>{muted ? <VolumeX size={17}/> : <Volume2 size={17}/>}</></button><div className="absolute bottom-4 left-3 right-[4.5rem] z-10 sm:bottom-5 sm:left-4 sm:right-20"><div className="mb-2 flex items-center gap-2 sm:mb-3">{post.avatar ? <img src={post.avatar} className="h-9 w-9 shrink-0 rounded-full border border-white/50 object-cover sm:h-10 sm:w-10"/> : <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold sm:h-10 sm:w-10">{post.user[0]}</span>}<b className="min-w-0 flex-1 truncate text-sm">{post.handle}</b>{post.verified && <CheckCircle2 aria-label="Verified account" size={15} className="shrink-0 fill-violet-500 text-white"/>}<button onClick={onFollow} className={`shrink-0 rounded-md border px-2 py-1 text-xs font-bold backdrop-blur sm:px-3 ${following ? "border-white/20 bg-black/20 text-zinc-200" : "border-fuchsia-300/70 bg-fuchsia-500/20 text-white"}`}>{following ? "Following" : "Follow"}</button></div><p className="line-clamp-2 text-sm leading-5 text-zinc-50 sm:line-clamp-3">{post.caption}</p>{post.tags && <p className="mt-1 line-clamp-1 text-sm font-medium text-fuchsia-200 sm:mt-2">{post.tags}</p>}<p className="mt-1 text-xs text-zinc-300 sm:mt-2">{post.user} · {post.time}</p></div><div className="absolute bottom-4 right-2 z-10 flex flex-col items-center gap-3 sm:bottom-5 sm:right-3 sm:gap-4"><Action icon={<Heart fill={liked ? "currentColor" : "none"}/>} label={compact(post.likes)} active={liked} onClick={onLike}/><Action icon={<MessageCircle/>} label={compact(post.comments)} onClick={onComment}/><Action icon={<Repeat2/>} label={compact(post.reposts)} onClick={onRepost}/><Action icon={<Share2/>} label="Share" onClick={onShare}/><Action icon={<Bookmark fill={saved ? "currentColor" : "none"}/>} label={saved ? "Saved" : "Save"} active={saved} onClick={onSave}/></div></motion.article>; }
function Action({ icon, label, active, onClick }) { return <motion.button whileTap={{scale:.78}} onClick={onClick} className={`flex flex-col items-center gap-1 text-[11px] font-medium ${active ? "text-fuchsia-400" : "text-white"}`}>{icon}<span>{label}</span></motion.button>; }
function Sheet({ type, post, close, comment, setComment, onComment }) { const [items, setItems] = useState([]); useEffect(() => { if (type === "comments" && post?.id) getPostComments(post.id).then((data) => setItems(data.comments || [])).catch(() => setItems([])); }, [type, post?.id, post?.comments]); return <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 flex items-end bg-black/65" onClick={close}><motion.section initial={{y:"100%"}} animate={{y:0}} exit={{y:"100%"}} transition={{type:"spring",damping:28,stiffness:280}} onClick={(e) => e.stopPropagation()} className="w-full rounded-t-[30px] border-t border-white/10 bg-[#16151b] px-5 pb-5 pt-3"><div className="mx-auto h-1.5 w-10 rounded-full bg-white/20"/><div className="mt-4 flex items-center justify-between"><h2 className="font-['Space_Grotesk'] text-lg font-bold">{type === "comments" ? `Comments · ${compact(post?.comments || 0)}` : "Share"}</h2><button onClick={close}><X className="text-zinc-400"/></button></div>{type === "comments" && <><div className="mt-4 max-h-[42vh] space-y-4 overflow-y-auto">{items.length ? items.map((item) => <div className="flex gap-3" key={item._id}><span className="grid h-9 w-9 place-items-center rounded-full bg-violet-600 text-sm font-bold">{item.user?.name?.[0] || "C"}</span><div><b className="text-sm">{item.user?.name || "Member"}</b><p className="text-sm text-zinc-300">{item.text}</p></div></div>) : <p className="py-5 text-center text-sm text-zinc-500">No comments yet.</p>}</div><div className="mt-4 flex gap-2 border-t border-white/10 pt-4"><input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-500"/><button onClick={onComment} className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 p-2"><Send size={16}/></button></div></>}</motion.section></motion.div>; }
