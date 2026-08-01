import { AnimatePresence, motion } from "framer-motion";
import { Bell, Bookmark, CheckCircle2, Heart, ImagePlus, MessageCircle, MoreHorizontal, Plus, Repeat2, Search, Send, Share2, Video, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import BottomNav from "../../components/navigations/BottomNav";
import { createPost, getExploreData } from "../../services/chatService";
import { getStatuses } from "../../services/statusService";
import axiosInstance from "../../services/axiosInstance";
import { toast } from "react-toastify";

const categories = ["For you", "Trending", "Friends", "Gaming", "Tech", "Music", "AI", "Fashion", "Sports"];
const comments = [
  ["Lara Mensah", "The energy in this is unreal ✨", "12m", "2.4K"],
  ["Tunde A.", "Proud of you, Maya. Keep going!", "9m", "856"],
  ["julescreates", "Need the full build log please 😭", "4m", "148"],
];
const compact = (n) => n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 1 : 1)}K` : n;
const timeAgo = (date) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
};
const toFeedPost = (post) => ({
  id: post._id,
  user: post.user?.name || post.author?.name || "ChatVerse member",
  handle: post.user?.username ? `@${post.user.username}` : post.user?.name || post.author?.name ? `@${(post.user?.name || post.author?.name).toLowerCase().replace(/\s+/g, "")}` : "@chatverse",
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
});

export default function Explore() {
  const [activeCategory, setActiveCategory] = useState("For you");
  const [posts, setPosts] = useState([]);
  const [stories, setStories] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [activePost, setActivePost] = useState(null);
  const [liked, setLiked] = useState([]);
  const [saved, setSaved] = useState([]);
  const [muted, setMuted] = useState(true);
  const [heart, setHeart] = useState(false);
  const [sheet, setSheet] = useState(null);
  const [comment, setComment] = useState("");
  const [following, setFollowing] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState("");
  const [posting, setPosting] = useState(false);
  const loader = useRef(null);

  useEffect(() => {
    let mounted = true;
    getExploreData()
      .then((data) => mounted && setPosts((data.posts || []).map(toFeedPost)))
      .catch(() => mounted && setPosts([]))
      .finally(() => mounted && setLoadingPosts(false));
    getStatuses().then((response) => mounted && setStories(response.data.data || [])).catch(() => mounted && setStories([]));
    return () => { mounted = false; };
  }, []);

  const toggleLike = (id) => setLiked((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);
  const doubleLike = (post) => { if (!liked.includes(post.id)) toggleLike(post.id); setHeart(true); window.setTimeout(() => setHeart(false), 750); };
  const share = async () => { if (navigator.share) { try { await navigator.share({ title: "ChatVerse", text: "Check this out on ChatVerse" }); } catch { /* cancelled */ } } else setSheet("share"); };
  const publishPost = async () => {
    if (!mediaFile) return;
    try { setPosting(true); const form = new FormData(); form.append("file", mediaFile); const upload = await axiosInstance.post("/upload", form, { headers: { "Content-Type": "multipart/form-data" } }); const mediaType = mediaFile.type.startsWith("video/") ? "video" : "image"; const post = await createPost({ caption, mediaType, media: [{ url: upload.data.url, type: mediaType }] }); setPosts((items) => [toFeedPost(post), ...items]); if (mediaPreview) URL.revokeObjectURL(mediaPreview); setCaption(""); setMediaFile(null); setMediaPreview(""); setComposerOpen(false); toast.success("Post published"); } catch (error) { toast.error(error.response?.data?.message || "Could not publish post"); } finally { setPosting(false); }
  };
  const selectMedia = (event) => { const file = event.target.files?.[0]; if (!file) return; if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) return toast.error("Choose an image or video file"); if (file.size > 100 * 1024 * 1024) return toast.error("Files must be 100 MB or smaller"); if (mediaPreview) URL.revokeObjectURL(mediaPreview); setMediaFile(file); setMediaPreview(URL.createObjectURL(file)); };

  return <main className="min-h-screen bg-[#09090b] pb-20 text-white selection:bg-fuchsia-500/50">
    <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_80%_-10%,rgba(124,58,237,.23),transparent_34%),radial-gradient(circle_at_10%_40%,rgba(217,70,239,.1),transparent_25%)]" />
    <div className="relative mx-auto max-w-[680px]">
      <header className="sticky top-0 z-30 border-b border-white/[.06] bg-[#09090b]/80 px-4 pb-3 pt-4 backdrop-blur-xl">
        <div className="flex items-center justify-between"><div className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-lg font-black shadow-lg shadow-fuchsia-900/40">C</span><span className="font-['Space_Grotesk'] text-lg font-bold tracking-tight">ChatVerse</span></div><div className="flex items-center gap-1"><TopButton label="Search"><Search size={19}/></TopButton><TopButton label="Notifications"><Bell size={19}/></TopButton><button onClick={() => setComposerOpen(true)} className="ml-1 grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 shadow-lg shadow-fuchsia-900/30"><Plus size={20}/></button><span className="ml-2 grid h-9 w-9 place-items-center rounded-xl bg-white/10 font-bold text-fuchsia-300">Y</span></div></div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">{categories.map((item) => <button onClick={() => setActiveCategory(item)} key={item} className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${activeCategory === item ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-fuchsia-950/50" : "bg-white/[.055] text-zinc-400 hover:bg-white/10 hover:text-white"}`}>{item}</button>)}</div>
      </header>

      <section className="px-4 pt-5"><div className="mb-4 flex items-center gap-2"><span className="text-base">🔥</span><b className="font-['Space_Grotesk']">Trending Today</b><span className="h-px flex-1 bg-white/[.08]"/></div><div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">{["#OpenAI", "#React19", "#Nigeria", "#PremierLeague", "#Photography"].map((tag, i) => <button className="shrink-0 rounded-xl border border-white/10 bg-white/[.045] px-3 py-2 text-sm text-zinc-300 transition hover:border-fuchsia-500/50 hover:text-white" key={tag}><span className="text-fuchsia-400">{i + 1} </span>{tag}</button>)}</div></section>
      {stories.length > 0 && <section className="px-4 pt-6"><div className="mb-3 flex items-center justify-between"><b className="font-['Space_Grotesk']">Stories</b><span className="text-xs text-zinc-500">Updates expire in 24h</span></div><div className="flex gap-4 overflow-x-auto [scrollbar-width:none]">{stories.map((story) => <button key={story._id} className="group shrink-0" onClick={() => setActivePost({ story: true, user: story.author?.name || "ChatVerse member", image: story.mediaUrl, text: story.text })}><div className="rounded-full bg-gradient-to-tr from-fuchsia-500 via-violet-500 to-orange-400 p-[2px]">{story.author?.avatar ? <img className="h-[58px] w-[58px] rounded-full border-2 border-[#09090b] object-cover" src={story.author.avatar}/> : <span className="grid h-[58px] w-[58px] rounded-full border-2 border-[#09090b] bg-zinc-800 text-lg font-bold">{story.author?.name?.[0] || "C"}</span>}</div><span className="mt-1.5 block max-w-[62px] truncate text-xs text-zinc-400">{story.author?.name || "Member"}</span></button>)}</div></section>}
      <div className="mt-6 space-y-5 px-4">{loadingPosts ? <FeedSkeleton /> : posts.length ? posts.map((post) => <Post key={post.id} post={post} liked={liked.includes(post.id)} saved={saved.includes(post.id)} muted={muted} onLike={() => toggleLike(post.id)} onSave={() => setSaved((ids) => ids.includes(post.id) ? ids.filter((item) => item !== post.id) : [...ids, post.id])} onDouble={() => doubleLike(post)} onComment={() => { setActivePost(post); setSheet("comments"); }} onRepost={() => { setActivePost(post); setSheet("repost"); }} onShare={share} onMute={() => setMuted(!muted)} following={following} onFollow={() => setFollowing(!following)} heart={heart} />) : <div className="rounded-[26px] border border-dashed border-white/15 bg-white/[.03] px-6 py-14 text-center"><span className="text-3xl">✦</span><h2 className="mt-4 font-['Space_Grotesk'] text-lg font-bold">The feed is waiting for its first post</h2><p className="mt-2 text-sm text-zinc-500">Share something from ChatVerse to see it here.</p></div>}</div>
      <div ref={loader} className="h-8" />
    </div>
    <BottomNav />
    <AnimatePresence>{activePost?.story && <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[60] grid place-items-center bg-black/90 p-4"><div className="relative h-[78vh] w-full max-w-md overflow-hidden rounded-[28px] bg-gradient-to-br from-violet-900 to-fuchsia-900">{activePost.image ? <img src={activePost.image} className="h-full w-full object-cover"/> : <p className="grid h-full place-items-center p-8 text-center font-['Space_Grotesk'] text-2xl font-bold">{activePost.text}</p>}<div className="absolute inset-x-4 top-4 h-1 overflow-hidden rounded-full bg-white/30"><motion.i initial={{width:0}} animate={{width:"100%"}} transition={{duration:5}} className="block h-full bg-white"/></div><button onClick={() => setActivePost(null)} className="absolute right-4 top-8 rounded-full bg-black/30 p-2"><X size={20}/></button><b className="absolute bottom-5 left-5">{activePost.user}'s story</b></div></motion.div>}</AnimatePresence>
    <AnimatePresence>{sheet && <Sheet type={sheet} post={activePost} comment={comment} setComment={setComment} close={() => setSheet(null)} />}</AnimatePresence>
    <AnimatePresence>{composerOpen && <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[70] flex items-end bg-black/70 p-4 sm:items-center sm:justify-center"><motion.form initial={{y:40}} animate={{y:0}} exit={{y:40}} onSubmit={(event) => { event.preventDefault(); publishPost(); }} className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#17151c] p-5 shadow-2xl"><div className="flex items-center justify-between"><h2 className="font-['Space_Grotesk'] text-lg font-bold">Create post</h2><button type="button" onClick={() => setComposerOpen(false)}><X className="text-zinc-400"/></button></div><textarea value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Write a caption…" className="mt-5 w-full rounded-2xl bg-white/[.06] p-3 text-sm outline-none placeholder:text-zinc-500" rows="4"/><label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-fuchsia-400/50 bg-fuchsia-500/10 p-4 text-sm font-medium text-fuchsia-200">{mediaFile?.type.startsWith("video/") ? <Video size={19}/> : <ImagePlus size={19}/>} {mediaFile ? mediaFile.name : "Choose an image or video"}<input required type="file" accept="image/*,video/*" className="hidden" onChange={selectMedia}/></label>{mediaPreview && <div className="mt-3 h-44 overflow-hidden rounded-2xl bg-black">{mediaFile?.type.startsWith("video/") ? <video src={mediaPreview} className="h-full w-full object-cover" controls/> : <img src={mediaPreview} className="h-full w-full object-cover"/>}</div>}<p className="mt-2 text-xs text-zinc-500">Images and videos up to 100 MB.</p><button disabled={posting || !mediaFile} className="mt-4 w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 text-sm font-bold disabled:opacity-50">{posting ? "Uploading…" : "Publish post"}</button></motion.form></motion.div>}</AnimatePresence>
  </main>;
}

function TopButton({ children, label }) { return <button aria-label={label} className="grid h-9 w-9 place-items-center rounded-xl text-zinc-300 transition hover:bg-white/10 hover:text-white">{children}</button>; }
function FeedSkeleton() { return <div className="overflow-hidden rounded-[26px] border border-white/[.07] bg-white/[.035] p-4"><div className="flex items-center gap-3"><span className="h-10 w-10 animate-pulse rounded-full bg-white/10"/><span className="h-8 w-36 animate-pulse rounded-lg bg-white/10"/></div><div className="mt-4 aspect-[4/5] animate-pulse rounded-2xl bg-white/[.07]"/></div>; }
function Post({ post, liked, saved, muted, onLike, onSave, onDouble, onComment, onRepost, onShare, onMute, following, onFollow, heart }) { return <motion.article layout initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="overflow-hidden rounded-[26px] border border-white/[.09] bg-[#131217] shadow-2xl shadow-black/30"><div className="flex items-center gap-3 px-4 pb-3 pt-4">{post.avatar ? <img src={post.avatar} className="h-10 w-10 rounded-full object-cover"/> : <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold">{post.user[0]}</span>}<div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><b className="truncate text-sm">{post.user}</b><CheckCircle2 size={15} className="fill-violet-500 text-white"/></div><span className="text-xs text-zinc-500">{post.handle} · {post.time}</span></div><button onClick={onFollow} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${following ? "bg-white/8 text-zinc-300" : "bg-violet-500/15 text-fuchsia-300"}`}>{following ? "Following" : "Follow"}</button><MoreHorizontal size={20} className="text-zinc-500"/></div><div onDoubleClick={onDouble} className="relative aspect-[4/5] cursor-pointer overflow-hidden bg-zinc-900">{post.image ? post.mediaType === "video" ? <video src={post.image} className="h-full w-full object-cover" controls={!muted} muted={muted} loop playsInline/> : <img src={post.image} className="h-full w-full object-cover"/> : <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_25%_20%,rgba(217,70,239,.38),transparent_26%),linear-gradient(135deg,#18181b,#23113b)] p-8 text-center"><span className="text-5xl">{post.type === "Video" ? "▶" : "✦"}</span><p className="mt-5 max-w-sm font-['Space_Grotesk'] text-xl font-bold">{post.caption}</p></div>}<div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10"/><AnimatePresence>{heart && <motion.div initial={{opacity:0,scale:.3}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:1.5}} className="absolute inset-0 grid place-items-center"><Heart className="fill-white text-white drop-shadow-2xl" size={105}/></motion.div>}</AnimatePresence><button onClick={onMute} className="absolute right-3 top-3 rounded-full bg-black/35 p-2 backdrop-blur"><>{muted ? <VolumeX size={17}/> : <Volume2 size={17}/>}</></button><div className="absolute bottom-0 left-0 right-0 p-4 pr-16"><p className="text-sm leading-5">{post.caption}</p>{post.tags && <p className="mt-2 text-sm font-medium text-fuchsia-200">{post.tags}</p>}<div className="mt-2 flex items-center gap-2 text-xs text-zinc-300"><span>{post.type}</span></div></div><div className="absolute bottom-4 right-3 flex flex-col gap-3"><Action icon={<Heart fill={liked ? "currentColor" : "none"}/>} label={compact(post.likes + (liked ? 1 : 0))} active={liked} onClick={onLike}/><Action icon={<MessageCircle/>} label={compact(post.comments)} onClick={onComment}/><Action icon={<Repeat2/>} label={compact(post.reposts)} onClick={onRepost}/><Action icon={<Share2/>} label="Share" onClick={onShare}/><Action icon={<Bookmark fill={saved ? "currentColor" : "none"}/>} label={saved ? "Saved" : "Save"} active={saved} onClick={onSave}/></div></div></motion.article>; }
function Action({ icon, label, active, onClick }) { return <motion.button whileTap={{scale:.78}} onClick={onClick} className={`flex flex-col items-center gap-1 text-[11px] font-medium ${active ? "text-fuchsia-400" : "text-white"}`}>{icon}<span>{label}</span></motion.button>; }
function Sheet({ type, post, close, comment, setComment }) { const [reposted, setReposted] = useState(false); return <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 flex items-end bg-black/65" onClick={close}><motion.section initial={{y:"100%"}} animate={{y:0}} exit={{y:"100%"}} transition={{type:"spring",damping:28,stiffness:280}} onClick={(e) => e.stopPropagation()} className="w-full rounded-t-[30px] border-t border-white/10 bg-[#16151b] px-5 pb-5 pt-3"><div className="mx-auto h-1.5 w-10 rounded-full bg-white/20"/><div className="mt-4 flex items-center justify-between"><h2 className="font-['Space_Grotesk'] text-lg font-bold">{type === "comments" ? `Comments · ${compact(post?.comments || 0)}` : type === "share" ? "Share to" : "Repost"}</h2><button onClick={close}><X className="text-zinc-400"/></button></div>{type === "comments" && <><div className="mt-4 max-h-[45vh] space-y-5 overflow-y-auto">{comments.map(([name, text, time, likes]) => <div className="flex gap-3" key={name}><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xs font-bold">{name[0]}</span><div className="flex-1"><b className="text-sm">{name}</b><p className="mt-0.5 text-sm text-zinc-300">{text}</p><div className="mt-2 flex gap-4 text-xs text-zinc-500"><span>{time}</span><span>Reply</span><span>♡ {likes}</span></div></div></div>)}</div><div className="mt-4 flex gap-2 border-t border-white/10 pt-4"><button className="text-xl">😊</button><input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment… @mention" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-500"/><button className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 p-2"><Send size={16}/></button></div></>}{type === "repost" && <div className="mt-5 space-y-2"><button onClick={() => setReposted(!reposted)} className="flex w-full items-center gap-3 rounded-2xl bg-white/[.06] p-4 text-left"><Repeat2 className="text-fuchsia-400"/><span>{reposted ? "Undo repost" : "Repost"}</span></button><button className="flex w-full items-center gap-3 rounded-2xl bg-white/[.06] p-4 text-left"><MessageCircle className="text-fuchsia-400"/><span>Quote post</span></button></div>}{type === "share" && <div className="mt-5 grid grid-cols-4 gap-4">{["Friends", "Copy link", "WhatsApp", "Telegram", "Facebook", "X", "Instagram", "Download"].map((item, i) => <button key={item} className="flex flex-col items-center gap-2 text-xs text-zinc-300"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-white/12 to-white/[.04] text-lg">{["✦","↗","◉","➤","f","𝕏","◎","↓"][i]}</span>{item}</button>)}</div>}</motion.section></motion.div>; }
