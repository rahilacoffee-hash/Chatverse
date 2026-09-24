import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";

function LogoMark() {
  return (
    <svg
      viewBox="0 0 96 96"
      className="h-24 w-24"
      role="img"
      aria-label="ChatVerse"
    >
      <motion.path
        d="M22 34c0-9 8-16 18-16h17c10 0 18 7 18 16v14c0 9-8 16-18 16H40l-13 10 3-12c-5-3-8-8-8-14V34Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.1, ease: "easeInOut" }}
      />
      <motion.path
        d="M38 42h20M38 52h12"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.7, duration: 0.45 }}
      />
    </svg>
  );
}

function DotWave({ reduced }) {
  return (
    <div className="flex items-center gap-1.5" aria-label="Loading">
      <span
        className={`h-1.5 w-1.5 rounded-full bg-[#14F1D9] ${reduced ? "" : "animate-[cv-pulse_1.1s_ease-in-out_infinite]"}`}
      />
      <span
        className={`h-1.5 w-1.5 rounded-full bg-[#14F1D9] [animation-delay:150ms] ${reduced ? "" : "animate-[cv-pulse_1.1s_ease-in-out_infinite]"}`}
      />
      <span
        className={`h-1.5 w-1.5 rounded-full bg-[#14F1D9] [animation-delay:300ms] ${reduced ? "" : "animate-[cv-pulse_1.1s_ease-in-out_infinite]"}`}
      />
    </div>
  );
}

function SplashScreen({ onGetStarted, onLogin }) {
  const reduced = useReducedMotion();
  return (
    <main className="relative flex min-h-[100svh] w-full flex-col overflow-hidden bg-[#0B0D14] text-[#F4F4F8]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(99,102,241,.46),transparent_34%),radial-gradient(circle_at_80%_90%,rgba(20,241,217,.12),transparent_28%),linear-gradient(145deg,#6366F1_0%,#271b57_38%,#0B0D14_76%)] opacity-80" />
      <div className="cv-dot-grid pointer-events-none absolute inset-0 opacity-30" />
      <motion.section
        className="relative flex flex-1 flex-col items-center justify-center px-6 text-center"
        initial={reduced ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65 }}
      >
        <div className="text-[#14F1D9]">
          <LogoMark />
        </div>
        <h1 className="mt-4 text-[clamp(2.7rem,12vw,5.5rem)] font-semibold tracking-[-.07em]">
          Chat<span className="text-[#A78BFA]">Verse</span>
        </h1>
        <p className="mt-4 max-w-xs text-sm leading-6 text-white/60">
          Conversation, discovery, and the people who make both worthwhile.
        </p>
        <div className="mt-8 flex items-center gap-3 text-xs uppercase tracking-[.2em] text-white/45">
          <DotWave reduced={reduced} />
          <span>Ready when you are</span>
        </div>
      </motion.section>
      <motion.section
        className="relative grid gap-3 px-6 pb-[max(2rem,env(safe-area-inset-bottom))] sm:mx-auto sm:w-full sm:max-w-md"
        initial={reduced ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.55 }}
      >
        <Link
          to="/register"
          onClick={onGetStarted}
          className="cv-gradient rounded-[10px] py-3.5 text-center text-sm font-semibold text-white shadow-[0_12px_35px_rgba(99,102,241,.28)] transition hover:brightness-110"
        >
          Start a conversation
        </Link>
        <Link
          to="/login"
          onClick={onLogin}
          className="rounded-[10px] border border-white/15 bg-white/[.04] py-3.5 text-center text-sm font-semibold text-white/80 transition hover:bg-white/[.09]"
        >
          I already have an account
        </Link>
      </motion.section>
    </main>
  );
}

export default SplashScreen;
