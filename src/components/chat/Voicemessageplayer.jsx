import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";

// Deterministic pseudo-random waveform heights, seeded from the message id
// so the same message always renders the same "waveform" shape across
// re-renders (we don't have real decoded amplitude data without extra
// Web Audio API work — this gives a convincing WhatsApp-like look cheaply).
function generateBars(seed, count = 32) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 1000;
  }

  const bars = [];
  let value = hash;
  for (let i = 0; i < count; i++) {
    value = (value * 9301 + 49297) % 233280;
    const height = 20 + (value / 233280) * 80; // 20%–100% height range
    bars.push(height);
  }
  return bars;
}

function formatDuration(seconds) {
  if (!seconds || !isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function VoiceMessagePlayer({ url, messageId, isOwnMessage }) {
  const audioRef = useRef(null);
  const playerId = useRef(`${messageId || "voice"}:${url}`).current;
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const bars = useRef(generateBars(messageId || url)).current;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    function handleTimeUpdate() {
      setCurrentTime(audio.currentTime);
    }
    function handleLoadedMetadata() {
      setDuration(audio.duration);
    }
    function handleEnded() {
      setIsPlaying(false);
      setCurrentTime(0);
    }
    function handlePlay() {
      // Tell every other mounted voice-note player to pause. Keeping this at
      // the audio-event level also covers future controls or autoplay code.
      window.dispatchEvent(new CustomEvent("chatverse:voice-note-play", { detail: playerId }));
      setIsPlaying(true);
    }
    function handlePause() {
      setIsPlaying(false);
    }
    function pauseOtherPlayer(event) {
      if (event.detail !== playerId && !audio.paused) audio.pause();
    }

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    window.addEventListener("chatverse:voice-note-play", pauseOtherPlayer);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      window.removeEventListener("chatverse:voice-note-play", pauseOtherPlayer);
    };
  }, [playerId]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => setIsPlaying(false));
    }
  }

  function handleSeek(e) {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = clickX / rect.width;
    audio.currentTime = ratio * duration;
    setCurrentTime(audio.currentTime);
  }

  const progress = duration ? currentTime / duration : 0;
  const activeBars = Math.floor(progress * bars.length);

  return (
    <div className="flex items-center gap-2.5 min-w-[200px] py-1">
      <audio ref={audioRef} src={url} preload="metadata" />

      <button
        onClick={togglePlay}
        className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
          isOwnMessage ? "bg-white/20" : "bg-violet-600"
        }`}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <Pause size={16} className="text-white" fill="white" />
        ) : (
          <Play size={16} className="text-white ml-0.5" fill="white" />
        )}
      </button>

      <div
        onClick={handleSeek}
        className="flex-1 flex items-center gap-[2px] h-8 cursor-pointer"
      >
        {bars.map((height, i) => (
          <div
            key={i}
            className={`flex-1 rounded-full transition-colors ${
              i < activeBars
                ? "bg-white"
                : isOwnMessage
                ? "bg-white/30"
                : "bg-gray-500"
            }`}
            style={{ height: `${height}%` }}
          />
        ))}
      </div>

      <span
        className={`text-[10px] shrink-0 tabular-nums ${
          isOwnMessage ? "text-white/70" : "text-gray-400"
        }`}
      >
        {formatDuration(isPlaying || currentTime > 0 ? currentTime : duration)}
      </span>
    </div>
  );
}

export default VoiceMessagePlayer;
