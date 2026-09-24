import { useRef, useState } from "react";
import { FiMic, FiSquare, FiPlay } from "react-icons/fi";
import useChatStore from "../../store/useChatStore";
import api from "../../lib/api";

function VoiceTest({ selectedChat, otherUser }) {
  let mediaRecorderRef = useRef(null);
  let chunksRef = useRef([]);
  let [audioUrl, setAudioUrl] = useState("");
  let [recording, setRecording] = useState(false);
  let { sendNewMessage } = useChatStore();

  async function startRecording() {
    try {
      let stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        let blob = new Blob(chunksRef.current, { type: "audio/webm" });
        let form = new FormData();
        form.append("file", blob, `voice-${Date.now()}.webm`);
        try {
          let response = await api.post("/api/upload", form, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          if (response.data.success && selectedChat && otherUser) {
            setAudioUrl(response.data.url);
            sendNewMessage(
              selectedChat._id,
              otherUser._id,
              "",
              response.data.url,
              "audio",
            );
          }
        } catch {
          /* the message surface reports upload failures */
        }
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      setRecording(true);
    } catch {
      /* browser permission UI handles the denial */
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }
  return (
    <main className="cv-page flex min-h-[100svh] items-center justify-center p-5">
      <section className="cv-elevated w-full max-w-md rounded-[24px] p-7 text-center">
        <span className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-[#14F1D9]/15 text-[#14F1D9]">
          <FiMic size={31} />
        </span>
        <p className="mt-6 text-[10px] font-semibold uppercase tracking-[.22em] text-[#14F1D9]">
          Voice lab
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Send a voice note</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--cv-muted)]">
          Record a quick note and send it straight into the active conversation.
        </p>
        <button
          onClick={recording ? stopRecording : startRecording}
          className={`${recording ? "bg-[#F5455C] text-white" : "cv-accent-gradient text-[#071318]"} mx-auto mt-7 flex items-center gap-2 rounded-[10px] px-5 py-3 font-semibold`}
        >
          {recording ? (
            <>
              <FiSquare /> Stop recording
            </>
          ) : (
            <>
              <FiMic /> Start recording
            </>
          )}
        </button>
        {audioUrl && (
          <div className="mt-6 flex items-center gap-3 rounded-[10px] border border-white/10 bg-white/[.04] p-3">
            <FiPlay className="text-[#14F1D9]" />
            <audio controls src={audioUrl} className="min-w-0 flex-1" />
          </div>
        )}
      </section>
    </main>
  );
}

export default VoiceTest;
