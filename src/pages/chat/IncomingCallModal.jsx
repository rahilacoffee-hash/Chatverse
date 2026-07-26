import useChatStore from "../../store/useChatStore";

export default function IncomingCallModal({
  onAccept,
  onReject,
}) {
  const { incomingCall } =
    useChatStore();

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-zinc-900 p-6 rounded-2xl text-center w-80">
        <h2 className="text-xl font-bold">
          Incoming Call
        </h2>

        <p className="mt-2 text-zinc-400">
          {incomingCall.callerName ||
            "Someone"}
        </p>

        <div className="flex gap-4 mt-6">
          <button
            onClick={onReject}
            className="flex-1 bg-red-600 py-3 rounded-xl"
          >
            Decline
          </button>

          <button
            onClick={onAccept}
            className="flex-1 bg-green-600 py-3 rounded-xl"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}