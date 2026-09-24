import { motion, useReducedMotion } from "framer-motion";
import { FiPhone, FiPhoneOff } from "react-icons/fi";
import useChatStore from "../../store/useChatStore";

export default function IncomingCallModal({ onAccept, onReject }) {
  const { incomingCall } = useChatStore();
  const reduced = useReducedMotion();

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05060b]/85 p-5 backdrop-blur-md">
      <motion.div
        initial={reduced ? false : { opacity: 0, scale: 0.92, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="cv-elevated w-full max-w-sm rounded-[24px] p-7 text-center"
      >
        <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#14F1D9]/15 text-[#14F1D9] shadow-[0_0_0_10px_rgba(20,241,217,.06)]">
          <FiPhone size={30} />
        </span>
        <p className="mt-6 text-[10px] font-semibold uppercase tracking-[.22em] text-[#14F1D9]">
          Live connection
        </p>
        <h2 className="mt-2 text-2xl font-bold">Incoming call</h2>

        <p className="mt-2 text-[var(--cv-muted)]">
          {incomingCall.callerName || "Someone"}
        </p>

        <div className="mt-7 flex gap-3">
          <button
            onClick={onReject}
            className="flex flex-1 items-center justify-center gap-2 rounded-[10px] border border-[#F5455C]/30 bg-[#F5455C]/10 py-3 font-semibold text-[#F5455C]"
          >
            <FiPhoneOff /> Decline
          </button>

          <button
            onClick={onAccept}
            className="cv-accent-gradient flex flex-1 items-center justify-center gap-2 rounded-[10px] py-3 font-semibold text-[#071318]"
          >
            <FiPhone /> Accept
          </button>
        </div>
      </motion.div>
    </div>
  );
}
