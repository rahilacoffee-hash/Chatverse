import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";

function Loader() {
  return (
    <main className="min-h-screen bg-[#111b21] flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-[#25d366]"
        >
          <MessageCircle size={30} fill="currentColor" className="text-[#111b21]" />
        </motion.div>

        <p className="text-sm text-[#8696a0]">Loading ChatVerse…</p>
      </div>
    </main>
  );
}

export default Loader;