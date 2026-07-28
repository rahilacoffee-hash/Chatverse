import { ArrowLeft, Send, X, Mic, Square, Trash2, Phone, Video, Reply, Pencil, Forward, MoreVertical, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import fixWebmDuration from "fix-webm-duration";

import useChatStore from "../../store/useChatStore";
import socket from "../../lib/socket";
import api from "../../lib/api";
import TypingIndicator from "../../components/chat/TypingIndicator";
import VoiceMessagePlayer from "../../components/chat/Voicemessageplayer";
import { startVideoCall, startVoiceCall } from "../../services/voiceCallService";
import useSettingsStore from "../../store/useSettingsStore";

export default function ChatScreen() {
  const reactions = ["❤️", "😂", "👍", "😮", "😢"];

  const navigate = useNavigate();

  const {
    selectedChat,
    conversations,
    messages,
    fetchMessages,
    fetchConversations,
    sendNewMessage,
    typingUsers,
    onlineUsers,
    addReaction,
  } = useChatStore();

  const [text, setText] = useState("");
  const [activePickerId, setActivePickerId] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [forwardMessage, setForwardMessage] = useState(null);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  // --- Voice recording state ---
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedUrl, setRecordedUrl] = useState(null);

  const mediaRecorderRef = useRef(null);
  const recordChunksRef = useRef([]);
  const recordTimerRef = useRef(null);
  const recordSecondsRef = useRef(0); // avoids stale closure inside recorder.onstop

  const messageListRef = useRef(null);
  const typingTimeout = useRef(null);

  const currentUserId = localStorage.getItem("userId");
  const { readReceipts, chatBackground, chatBackgroundImage } = useSettingsStore();

  const backgroundStyles = {
    default: "#09090B",
    midnight: "#111827",
    forest: "#0c1f1a",
    lavender: "linear-gradient(135deg, #24103b, #09090B)",
  };

  const otherUser = selectedChat?.participants?.find(
    (p) => p._id !== currentUserId
  );
  const isGroup = Boolean(selectedChat?.isGroup);
  const groupParticipants = selectedChat?.participants || [];

  const isOnline = onlineUsers.includes(otherUser?._id);
  const isTyping = typingUsers.includes(otherUser?._id);

  useEffect(() => {
    if (!selectedChat?._id) return;
    fetchMessages(selectedChat._id);
  }, [selectedChat?._id]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const scrollToLatestMessage = (behavior = "smooth") => {
    requestAnimationFrame(() => {
      const messageList = messageListRef.current;
      if (!messageList) return;

      messageList.scrollTo({
        top: messageList.scrollHeight,
        behavior,
      });
    });
  };

  useLayoutEffect(() => {
    // Run after the message DOM has been committed. This covers initial
    // history, messages sent locally, and messages received over Socket.IO.
    scrollToLatestMessage(messages.length ? "smooth" : "auto");
  }, [messages]);

  useEffect(() => {
    if (!readReceipts || !messages.length || !otherUser) return;

    messages.forEach((msg) => {
      const senderId =
        typeof msg.sender === "object" ? msg.sender._id : msg.sender;

      if (senderId !== currentUserId && !msg.readAt) {
        socket.emit("markAsRead", {
          messageId: msg._id,
          senderId,
        });
      }
    });
  }, [messages, otherUser, readReceipts]);

  const handleTyping = (value) => {
    setText(value);

    if (!otherUser || !selectedChat?._id) return;

    socket.emit("typing", {
      conversationId: selectedChat._id,
      receiverId: otherUser._id,
    });

    clearTimeout(typingTimeout.current);

    typingTimeout.current = setTimeout(() => {
      socket.emit("stopTyping", {
        conversationId: selectedChat._id,
        receiverId: otherUser._id,
      });
    }, 800);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImage(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
  };

  // ======================
  // VOICE RECORDING
  // ======================
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      recordChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const rawBlob = new Blob(recordChunksRef.current, { type: mimeType });

        // Firefox's MediaRecorder writes WebM files without a duration
        // header (Chrome's encoder includes it). This rarely breaks local
        // playback, but Cloudinary's server-side transcoder can produce a
        // silent/broken file from a duration-less WebM. fixWebmDuration
        // patches the header client-side before we ever upload it.
        if (mimeType === "audio/webm") {
          const durationMs = recordSecondsRef.current * 1000 || 1000;
          fixWebmDuration(rawBlob, durationMs, (fixedBlob) => {
            setRecordedBlob(fixedBlob);
            setRecordedUrl(URL.createObjectURL(fixedBlob));
          });
        } else {
          setRecordedBlob(rawBlob);
          setRecordedUrl(URL.createObjectURL(rawBlob));
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      recordSecondsRef.current = 0;

      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((s) => {
          const next = s + 1;
          recordSecondsRef.current = next;
          return next;
        });
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied or unavailable:", err.message);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    clearInterval(recordTimerRef.current);
  };

  const cancelRecording = () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setRecordSeconds(0);
  };

  function formatRecordTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  const handleSend = async () => {
    if (editingMessage) {
      const updatedText = text.trim();
      if (!updatedText) return;
      socket.emit("editMessage", { messageId: editingMessage._id, text: updatedText }, (response) => {
        if (response?.success) {
          setEditingMessage(null);
          setText("");
        }
      });
      return;
    }
    if (!text.trim() && !image && !recordedBlob) return;
    if (!selectedChat || !otherUser) return;

    let mediaUrl = "";
    let type = "text";

    try {
      if (recordedBlob) {
        setUploading(true);
        type = "audio";

        const formData = new FormData();
        formData.append("file", recordedBlob, "voice-note.webm");

        const res = await api.post("/api/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        mediaUrl = res.data.url;
      } else if (image) {
        setUploading(true);
        type = "image";

        const formData = new FormData();
        formData.append("file", image);

        const res = await api.post("/api/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        mediaUrl = res.data.url;
      }

      sendNewMessage(selectedChat._id, otherUser._id, text, mediaUrl, type, replyTo?._id);

      socket.emit("stopTyping", {
        conversationId: selectedChat._id,
        receiverId: otherUser._id,
      });

      setText("");
      clearImage();
      cancelRecording();
      setReplyTo(null);
    } catch (err) {
      console.error(
        "Failed to send message:",
        err.response?.data?.message || err.message
      );
    } finally {
      setUploading(false);
    }
  };

  const handlePickReaction = (messageId, emoji) => {
    useChatStore.setState((state) => ({
      messages: state.messages.map((msg) => {
        if (msg._id !== messageId) return msg;

        const existingReaction = (msg.reactions || []).find(
          (r) => (r.userId?._id || r.userId) === currentUserId
        );
        const removeReaction = existingReaction?.type === emoji;
        const otherReactions = (msg.reactions || []).filter(
          (r) => (r.userId?._id || r.userId) !== currentUserId
        );

        return {
          ...msg,
          reactions: removeReaction
            ? otherReactions
            : [...otherReactions, { userId: currentUserId, type: emoji }],
        };
      }),
    }));

    const currentMessage = useChatStore.getState().messages.find((msg) => msg._id === messageId);
    const wasSelected = currentMessage?.reactions?.some(
      (r) => (r.userId?._id || r.userId) === currentUserId && r.type === emoji,
    );
    addReaction(messageId, wasSelected ? emoji : null, otherUser._id);
    setActivePickerId(null);
  };

  const beginReply = (message) => {
    setReplyTo(message);
    setEditingMessage(null);
    setText("");
    setActiveMenuId(null);
  };

  const beginEdit = (message) => {
    setEditingMessage(message);
    setReplyTo(null);
    setText(message.text || "");
    setActiveMenuId(null);
  };

  const deleteMessage = (message, scope) => {
    socket.emit("deleteMessage", { messageId: message._id, scope }, () => {});
    setActiveMenuId(null);
  };

  const forwardToConversation = (conversation) => {
    const recipient = conversation.participants?.find((participant) => participant._id !== currentUserId);
    if (!recipient || !forwardMessage) return;
    sendNewMessage(conversation._id, recipient._id, forwardMessage.text || "", forwardMessage.mediaUrl || "", forwardMessage.type || "text");
    setForwardMessage(null);
  };

  const formatTime = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const hasComposerContent = text.trim() || image || recordedBlob;

  return (
    <div
      className="h-[100dvh] min-h-0 w-full overflow-hidden text-white flex flex-col"
      style={chatBackground === "custom" && chatBackgroundImage
        ? {
            backgroundColor: "#09090B",
            backgroundImage: `linear-gradient(rgba(9, 9, 11, 0.72), rgba(9, 9, 11, 0.72)), url(${chatBackgroundImage})`,
            backgroundPosition: "center",
            backgroundSize: "cover",
          }
        : { background: backgroundStyles[chatBackground] || backgroundStyles.default }}
      onClick={() => { setActivePickerId(null); setActiveMenuId(null); }}
    >
      {/* HEADER */}
      <header className="z-20 flex h-16 shrink-0 items-center border-b border-white/10 bg-zinc-950/85 px-3 backdrop-blur sm:px-5">
        <button onClick={() => navigate(-1)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-white/10" aria-label="Back">
          <ArrowLeft size={21} />
        </button>

        {!isGroup && otherUser?.avatar ? (
          <button onClick={() => navigate(`/profile/${otherUser._id}`)} aria-label={`View ${otherUser.name}'s profile`} className="ml-2.5 shrink-0">
          <img
            src={otherUser.avatar}
            alt={`${otherUser.name}'s profile`}
            className="h-10 w-10 rounded-full object-cover"
          />
          </button>
        ) : (
          <button onClick={() => !isGroup && otherUser?._id && navigate(`/profile/${otherUser._id}`)} className="ml-2.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-600 font-semibold">
            {isGroup ? "G" : otherUser?.name?.charAt(0)?.toUpperCase()}
          </button>
        )}

        <div className="ml-2.5 min-w-0 flex-1">
          <h2 className="truncate font-semibold">{isGroup ? selectedChat?.groupName || "Group chat" : otherUser?.name}</h2>

          {isGroup ? (
            <p className="truncate text-xs text-zinc-500">{groupParticipants.length} participants</p>
          ) : isOnline ? (
            <p className="text-xs text-green-500">Online</p>
          ) : (
            <p className="text-xs text-zinc-500">
              Last seen {formatTime(otherUser?.lastSeen)}
            </p>
          )}
        </div>

        <button
          onClick={() => startVoiceCall(otherUser)}
          disabled={isGroup || !otherUser || !isOnline}
          className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Start voice call"
          title={isGroup ? "Group calling is being prepared" : isOnline ? "Start voice call" : "User is offline"}
        >
          <Phone size={20} />
        </button>
        <button
          onClick={() => startVideoCall(otherUser)}
          disabled={isGroup || !otherUser || !isOnline}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Start video call"
          title={isGroup ? "Group calling is being prepared" : isOnline ? "Start video call" : "User is offline"}
        >
          <Video size={20} />
        </button>
      </header>

      {/* MESSAGES */}
      <main ref={messageListRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 pb-5 space-y-4 sm:px-5">
        {messages.map((msg) => {
          const senderId =
            typeof msg.sender === "object" ? msg.sender._id : msg.sender;

          const isMe = senderId === currentUserId;
          const isPickerOpen = activePickerId === msg._id;

          return (
            <div
              key={msg._id}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div className="relative max-w-[calc(100%-3.25rem)] overflow-visible sm:max-w-[72%]">
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePickerId(isPickerOpen ? null : msg._id);
                  }}
                  className={`cursor-pointer rounded-2xl px-3.5 py-2.5 pr-9 shadow-sm ${
                    isMe
                      ? "rounded-br-md bg-gradient-to-r from-purple-600 to-fuchsia-500"
                      : "rounded-bl-md border border-white/5 bg-zinc-800/95"
                  }`}
                >
                  {msg.isDeleted ? (
                    <p className="text-sm italic opacity-70">This message was deleted</p>
                  ) : (
                    <>
                  {msg.replyTo && (
                    <div className="mb-2 border-l-2 border-white/60 bg-black/15 px-2 py-1 text-xs opacity-90">
                      <p className="font-semibold">{msg.replyTo.sender?.name || "Reply"}</p>
                      <p className="truncate opacity-80">{msg.replyTo.text || (msg.replyTo.mediaUrl ? "Media" : "Message")}</p>
                    </div>
                  )}
                  {isGroup && !isMe && <p className="mb-1 text-xs font-semibold text-purple-300">{msg.sender?.name || "Member"}</p>}
                  {msg.type === "image" && msg.mediaUrl && (
                    <img
                      src={msg.mediaUrl}
                      alt="shared"
                      className="mb-1 max-h-72 w-full rounded-lg object-cover"
                      onLoad={() => scrollToLatestMessage("smooth")}
                    />
                  )}

                  {msg.type === "audio" && msg.mediaUrl && (
                    <VoiceMessagePlayer
                      url={msg.mediaUrl}
                      messageId={msg._id}
                      isOwnMessage={isMe}
                    />
                  )}

                  {msg.text && (
                    <p className="whitespace-pre-wrap break-words text-sm">{msg.text}</p>
                  )}

                  {msg.editedAt && <span className="text-[10px] opacity-65">edited</span>}

                  <div className="mt-1 flex items-center justify-end gap-1">
                    <span className="text-[10px] opacity-70">
                      {formatTime(msg.createdAt)}
                    </span>

                    {isMe && (
                      <span
                        className={`text-[10px] ${
                          msg.readAt
                            ? "text-blue-400"
                            : msg.deliveredAt
                              ? "text-gray-300"
                              : "text-white"
                        }`}
                      >
                        {msg.readAt ? "✓✓" : msg.deliveredAt ? "✓" : ""}
                      </span>
                    )}
                  </div>
                    </>
                  )}
                </div>

                {!msg.isDeleted && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === msg._id ? null : msg._id); }}
                    className="absolute right-1 top-1 z-10 flex h-7 w-7 items-center justify-center rounded-full text-white/75 transition hover:bg-black/20 hover:text-white"
                    aria-label="Message actions"
                  ><MoreVertical size={16} /></button>
                )}

                {msg.reactions?.length > 0 &&
                  (() => {
                    const counts = {};
                    msg.reactions.forEach((r) => {
                      counts[r.type] = (counts[r.type] || 0) + 1;
                    });

                    const myReaction = msg.reactions.find(
                      (r) => (r.userId?._id || r.userId) === currentUserId
                    );

                    return (
                      <div
                        className={`absolute -bottom-3 flex gap-1 ${
                          isMe ? "right-2" : "left-2"
                        }`}
                      >
                        {Object.entries(counts).map(([emoji, count]) => (
                          <button
                            key={emoji}
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePickReaction(msg._id, emoji);
                            }}
                            className={`flex items-center gap-1 bg-zinc-900 border rounded-full px-1.5 py-0.5 text-xs shadow ${
                              myReaction?.type === emoji
                                ? "border-fuchsia-500"
                                : "border-zinc-700"
                            }`}
                          >
                            <span>{emoji}</span>
                            {count > 1 && (
                              <span className="text-[10px] text-gray-300">
                                {count}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    );
                  })()}

                {isPickerOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className={`absolute -top-12 ${
                      isMe ? "right-0" : "left-0"
                    } flex gap-1 bg-zinc-900 border border-zinc-700 rounded-full px-2 py-1.5 shadow-lg z-10`}
                  >
                    {reactions.map((r) => (
                      <button
                        key={r}
                        onClick={() => handlePickReaction(msg._id, r)}
                        className="text-lg hover:scale-125 transition"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                )}

                {activeMenuId === msg._id && (
                  <div onClick={(e) => e.stopPropagation()} className={`absolute top-9 z-20 w-48 rounded-xl border border-zinc-700 bg-zinc-900 p-1 shadow-xl ${isMe ? "right-0" : "left-0"}`}>
                    <button onClick={() => beginReply(msg)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-zinc-800"><Reply size={15} /> Reply</button>
                    <button onClick={() => { setForwardMessage(msg); setActiveMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-zinc-800"><Forward size={15} /> Forward</button>
                    {isMe && msg.type === "text" && <button onClick={() => beginEdit(msg)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-zinc-800"><Pencil size={15} /> Edit</button>}
                    <button onClick={() => deleteMessage(msg, "me")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-zinc-800"><Trash2 size={15} /> Delete for me</button>
                    {isMe && <button onClick={() => deleteMessage(msg, "everyone")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-300 hover:bg-zinc-800"><Trash2 size={15} /> Delete for everyone</button>}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isTyping && <TypingIndicator userName={otherUser?.name} />}

      </main>

      {/* IMAGE PREVIEW */}
      {imagePreview && (
        <div className="shrink-0 px-3 pb-2 sm:px-5 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="preview"
              className="h-20 w-20 object-cover rounded-lg"
            />
            <button
              onClick={clearImage}
              className="absolute -top-2 -right-2 bg-zinc-900 border border-zinc-700 rounded-full p-1"
              aria-label="Remove image"
            >
              <X size={12} />
            </button>
          </div>
          {uploading && (
            <span className="text-xs text-gray-500">Uploading…</span>
          )}
        </div>
      )}

      {/* VOICE NOTE PREVIEW */}
      {recordedUrl && !isRecording && (
        <div className="shrink-0 px-3 pb-2 sm:px-5 flex items-center gap-2">
          <button
            onClick={cancelRecording}
            className="text-red-400 p-2"
            aria-label="Discard recording"
          >
            <Trash2 size={18} />
          </button>
          <div className="flex-1 bg-zinc-900 rounded-xl px-3">
            <VoiceMessagePlayer
              url={recordedUrl}
              messageId="preview"
              isOwnMessage={false}
            />
          </div>
          {uploading && (
            <span className="text-xs text-gray-500 shrink-0">Sending…</span>
          )}
        </div>
      )}

      {/* INPUT */}
      {(replyTo || editingMessage) && (
        <div className="mx-2 flex shrink-0 items-center gap-2 rounded-t-2xl border-l-4 border-purple-500 bg-zinc-800 px-3 py-2 text-sm sm:mx-4">
          <div className="min-w-0 flex-1"><p className="font-medium">{editingMessage ? "Editing message" : `Replying to ${replyTo?.sender?.name || "message"}`}</p><p className="truncate text-xs text-zinc-400">{(editingMessage || replyTo)?.text || "Media"}</p></div>
          <button onClick={() => { setReplyTo(null); setEditingMessage(null); setText(""); }} aria-label="Cancel"><X size={18} /></button>
        </div>
      )}
    <div
        className="mx-2 mb-[max(0.5rem,env(safe-area-inset-bottom))] flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-zinc-900/95 px-2 py-1.5 shadow-lg backdrop-blur sm:mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {isRecording ? (
          <div className="flex h-11 flex-1 items-center gap-3 rounded-xl px-3">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm text-gray-300 tabular-nums">
              {formatRecordTime(recordSeconds)}
            </span>
            <span className="text-xs text-gray-500 flex-1">Recording…</span>
            <button
              onClick={stopRecording}
              className="w-9 h-9 rounded-full bg-red-500 flex items-center justify-center"
              aria-label="Stop recording"
            >
              <Square size={14} className="text-white" fill="white" />
            </button>
          </div>
        ) : (
          <>
            <input
              type="file"
              accept="image/*"
              id="img"
              hidden
              onChange={handleImageChange}
            />

            <label
              htmlFor="img"
              className="text-white cursor-pointer flex items-center px-1"
            >
              📎
            </label>

            <input
              value={text}
              onChange={(e) => handleTyping(e.target.value)}
              placeholder="Type a message..."
              className="h-11 min-w-0 flex-1 rounded-xl bg-transparent px-2 text-sm outline-none placeholder:text-zinc-500"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
              disabled={!!recordedBlob}
            />

            {hasComposerContent ? (
              <button
                onClick={handleSend}
                disabled={uploading}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-500 disabled:opacity-50"
                aria-label={editingMessage ? "Save edit" : "Send"}
              >
                {editingMessage ? <Check size={18} /> : <Send size={18} />}
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-800"
                aria-label="Record voice note"
              >
                <Mic size={18} className="text-gray-300" />
              </button>
            )}
          </>
        )}
      </div>

      {forwardMessage && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60 p-4 sm:items-center sm:justify-center" onClick={() => setForwardMessage(null)}>
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">Forward message</h3><button onClick={() => setForwardMessage(null)}><X size={18} /></button></div>
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {conversations.map((conversation) => {
                const recipient = conversation.participants?.find((participant) => participant._id !== currentUserId);
                return <button key={conversation._id} onClick={() => forwardToConversation(conversation)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-zinc-800"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-600">{recipient?.name?.charAt(0)?.toUpperCase()}</span><span>{recipient?.name || "Conversation"}</span></button>;
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
