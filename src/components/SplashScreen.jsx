import { motion } from "framer-motion";
import { Link } from "react-router-dom";

function SplashScreen({ onGetStarted, onLogin }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#050507] flex flex-col">
      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full opacity-30 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(74,222,128,0.25) 0%, rgba(132,0,255,0.15) 45%, transparent 75%)",
          }}
        />
        {/* Faint grid */}
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.06]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="white"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Status bar spacer */}
      <div className="h-12" />

      {/* Center content */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <h1 className="text-6xl font-extrabold tracking-tight text-white">
            Chat<span className="text-violet-500">Verse</span>
          </h1>
          <p className="mt-4 text-sm text-gray-400 leading-relaxed max-w-[260px] mx-auto">
            Talk in real time. Discover what's next.
            All in one place.
          </p>
        </motion.div>
      </div>

      {/* Bottom actions */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
        className="relative px-6 pb-12 space-y-3"
      >
        < Link to="/register">
        <button
          onClick={onGetStarted}
          className="w-full mb-5 py-4 rounded-full bg-white text-[#050507] font-semibold text-base tracking-wide active:scale-[0.98] transition-transform"
        >
          Get started
        </button>
        </Link>

         < Link to="/login">
        <button
          onClick={onLogin}
          className="w-full py-4 rounded-full border border-white/15 text-white font-medium text-base active:scale-[0.98] transition-transform"
        >
          I already have an account
        </button>
        </Link>
      </motion.div>
    </div>
  );
}

export default SplashScreen;