import { useRef, useState } from "react";
import useChatStore from "../../store/useChatStore";

export default function VoiceTest({
  selectedChat,
  otherUser,
}) {
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const [audioUrl, setAudioUrl] = useState("");

  const { sendNewMessage } = useChatStore();

  const startRecording = async () => {
    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

      const recorder = new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, {
          type: "audio/webm",
        });

        console.log("Blob:", blob);

        const formData = new FormData();

        formData.append(
          "file",
          blob,
          `voice-${Date.now()}.webm`
        );

        try {
          const res = await fetch(
            "http://localhost:5001/api/upload",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${localStorage.getItem(
                  "accessToken"
                )}`,
              },
              body: formData,
            }
          );

          const data = await res.json();

          console.log("UPLOAD RESULT", data);

          if (data.success) {
            setAudioUrl(data.url);

            // SEND AUDIO MESSAGE
            sendNewMessage(
              selectedChat._id,
              otherUser._id,
              "",
              data.url,
              "audio"
            );
          }
        } catch (err) {
          console.error(err);
        }

        // Stop microphone
        stream.getTracks().forEach((track) =>
          track.stop()
        );
      };

      recorder.start();
    } catch (err) {
      console.error(err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  return (
    <div>
      <button onMouseDown={startRecording}>
        Start Recording
      </button>

      <button onMouseUp={stopRecording}>
        Stop Recording
      </button>

      {audioUrl && (
        <audio controls src={audioUrl} />
      )}
    </div>
  );
}