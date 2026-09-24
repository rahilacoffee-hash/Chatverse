import { motion } from "framer-motion";
import {
  MessageCircle,
  CircleDashed,
  Compass,
  Phone,
  User,
} from "lucide-react";
import { NavLink } from "react-router-dom";

function BottomNav() {
  const navItems = [
    { icon: MessageCircle, path: "/chats", label: "Chats" },
    { icon: CircleDashed, path: "/status", label: "Status" },
    { icon: Compass, path: "/explore", label: "Explore" },
    { icon: Phone, path: "/calls", label: "Calls" },
    { icon: User, path: "/profile", label: "Profile" },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex h-[calc(4rem+env(safe-area-inset-bottom))] items-start justify-around border-t border-white/10 bg-[color-mix(in_srgb,var(--cv-surface)_88%,transparent)] px-2 pt-2 backdrop-blur-xl lg:hidden">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `relative flex min-w-14 flex-col items-center gap-1 rounded-2xl px-3 py-1.5 text-[10px] transition ${isActive ? "text-white" : "text-[var(--cv-muted)]"}`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.span
                  layoutId="bottom-nav-pill"
                  className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-b from-[#6366F1] to-[#8B5CF6] shadow-[0_8px_24px_rgba(99,102,241,.25)]"
                  transition={{ type: "spring", stiffness: 380, damping: 28 }}
                />
              )}
              <item.icon size={19} />
              {item.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export default BottomNav;
