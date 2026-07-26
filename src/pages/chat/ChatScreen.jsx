import { ArrowLeft, Send, X, Mic, Square, Trash2, Phone, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
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

  const messagesEndRef = useRef(null);
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

  const isOnline = onlineUsers.includes(otherUser?._id);
  const isTyping = typingUsers.includes(otherUser?._id);

  useEffect(() => {
    socket.on("messageReactionUpdated", (updatedMessage) => {
      useChatStore.setState((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === updatedMessage._id ? updatedMessage : msg
        ),
      }));
    });

    return () => {
      socket.off("messageReactionUpdated");
    };
  }, []);

  useEffect(() => {
    if (!selectedChat?._id) return;
    fetchMessages(selectedChat._id);
  }, [selectedChat?._id]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

      sendNewMessage(selectedChat._id, otherUser._id, text, mediaUrl, type);

      socket.emit("stopTyping", {
        conversationId: selectedChat._id,
        receiverId: otherUser._id,
      });

      setText("");
      clearImage();
      cancelRecording();
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

        const otherReactions = (msg.reactions || []).filter(
          (r) => (r.userId?._id || r.userId) !== currentUserId
        );

        return {
          ...msg,
          reactions: [...otherReactions, { userId: currentUserId, type: emoji }],
        };
      }),
    }));

    addReaction(messageId, emoji, otherUser._id);
    setActivePickerId(null);
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
      className="h-screen text-white flex flex-col"
      style={chatBackground === "custom" && chatBackgroundImage
        ? {
            backgroundColor: "#09090B",
            backgroundImage: `linear-gradient(rgba(9, 9, 11, 0.72), rgba(9, 9, 11, 0.72)), url(${chatBackgroundImage})`,
            backgroundPosition: "center",
            backgroundSize: "cover",
          }
        : { background: backgroundStyles[chatBackground] || backgroundStyles.default }}
      onClick={() => setActivePickerId(null)}
    >
      {/* HEADER */}
      <div className="h-16 border-b border-zinc-900 flex items-center px-4">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft />
        </button>

        {otherUser?.avatar ? (
          <img
            src={otherUser.avatar}
            alt={`${otherUser.name}'s profile`}
            className="ml-3 h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="ml-3 flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 font-semibold">
            {otherUser?.name?.charAt(0)?.toUpperCase()}
          </div>
        )}

        <div className="ml-3">
          <h2 className="font-semibold">{otherUser?.name}</h2>

          {isOnline ? (
            <p className="text-xs text-green-500">Online</p>
          ) : (
            <p className="text-xs text-zinc-500">
              Last seen {formatTime(otherUser?.lastSeen)}
            </p>
          )}
        </div>

        <button
          onClick={() => startVoiceCall(otherUser)}
          disabled={!otherUser || !isOnline}
          className="ml-auto rounded-full p-3 text-zinc-200 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Start voice call"
          title={isOnline ? "Start voice call" : "User is offline"}
        >
          <Phone size={20} />
        </button>
        <button
          onClick={() => startVideoCall(otherUser)}
          disabled={!otherUser || !isOnline}
          className="rounded-full p-3 text-zinc-200 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Start video call"
          title={isOnline ? "Start video call" : "User is offline"}
        >
          <Video size={20} />
        </button>
      </div>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto px-4 py-5 pb-13 space-y-3">
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
              <div className="relative max-w-[75%]">
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePickerId(isPickerOpen ? null : msg._id);
                  }}
                  className={`px-4 py-3 rounded-2xl cursor-pointer ${
                    isMe
                      ? "bg-gradient-to-r from-purple-600 to-fuchsia-500"
                      : "bg-zinc-800"
                  }`}
                >
                  {msg.type === "image" && msg.mediaUrl && (
                    <img
                      src={msg.mediaUrl}
                      alt="shared"
                      className="rounded-lg max-w-full mb-1"
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
                    <p className="text-sm break-words">{msg.text}</p>
                  )}

                  <div className="flex items-center justify-end gap-1 mt-1">
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
                </div>

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
              </div>
            </div>
          );
        })}

        {isTyping && <TypingIndicator userName={otherUser?.name} />}

        <div ref={messagesEndRef} />
      </div>

      {/* IMAGE PREVIEW */}
      {imagePreview && (
        <div className="px-4 pb-2 flex items-center gap-2">
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
        <div className="px-4 pb-2 flex items-center gap-2">
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
    <div
        className="py-2 px-4  bg-zinc-900 flex gap-2 items-center rounded-full mx-4 mb-4"
        onClick={(e) => e.stopPropagation()}
      >
        {isRecording ? (
          <div className="flex items-center gap-3 flex-1 bg-zinc-900 rounded-xl px-4 h-12">
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
              className="flex-1 h-12 bg-zinc-900 rounded-xl px-4 outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
              disabled={!!recordedBlob}
            />

            {hasComposerContent ? (
              <button
                onClick={handleSend}
                disabled={uploading}
                className="h-12 w-12 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-500 flex items-center justify-center disabled:opacity-50 shrink-0"
                aria-label="Send"
              >
                <Send size={18} />
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="h-12 w-12 rounded-xl bg-zinc-900 flex items-center justify-center shrink-0"
                aria-label="Record voice note"
              >
                <Mic size={18} className="text-gray-300" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
