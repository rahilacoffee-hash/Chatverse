import { motion } from "framer-motion";
import {
  Bell,
  Compass,
  MessageCircle,
  Phone,
  Plus,
  Settings,
  UserRound,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import BottomNav from "../components/navigations/BottomNav";

function AppShell({ children }) {
  let navigate = useNavigate();
  let location = useLocation();
  let navItems = [
    { path: "/chats", label: "Chats", icon: MessageCircle },
    { path: "/explore", label: "Explore", icon: Compass },
    { path: "/notifications", label: "Alerts", icon: Bell },
    { path: "/calls", label: "Calls", icon: Phone },
  ];
  let isChatRoute = location.pathname === "/chat";
  return (
    <div className="cv-shell relative min-h-[100svh] lg:flex">
      <aside className="hidden w-[4.75rem] shrink-0 flex-col items-center border-r border-white/[.07] bg-[color-mix(in_srgb,var(--cv-surface)_72%,transparent)] py-5 lg:flex">
        <button
          onClick={() => navigate("/chats")}
          className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-[#14F1D9] to-[#6366F1] text-xs font-bold text-[#071318]"
          aria-label="ChatVerse home"
        >
          CV
        </button>
        <nav className="mt-12 flex flex-1 flex-col gap-3">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `group relative grid h-11 w-11 place-items-center rounded-2xl transition ${isActive ? "text-[#14F1D9]" : "text-[var(--cv-muted)] hover:bg-white/[.06] hover:text-white"}`
              }
              title={item.label}
            >
              {({ isActive }) => (
                <>
                  <item.icon size={19} />
                  {isActive && (
                    <motion.i
                      layoutId="desktop-shell-active"
                      className="absolute -right-[1.5rem] h-6 w-1 rounded-l-full bg-[#14F1D9]"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={() => navigate("/new-chat")}
          className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-white/[.06] text-[#14F1D9] hover:bg-white/10"
          aria-label="New chat"
        >
          <Plus size={19} />
        </button>
        <button
          onClick={() => navigate("/profile")}
          className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[.05] text-[var(--cv-muted)] hover:text-white"
          aria-label="Profile"
        >
          <UserRound size={18} />
        </button>
        <button
          onClick={() => navigate("/settings")}
          className="mt-3 grid h-9 w-9 place-items-center text-[var(--cv-muted)] hover:text-white"
          aria-label="Settings"
        >
          <Settings size={17} />
        </button>
      </aside>
      <main
        className={`min-w-0 flex-1 ${isChatRoute ? "lg:min-h-[100svh]" : ""}`}
      >
        {children}
      </main>
      {location.pathname === "/chat" && <BottomNav />}
    </div>
  );
}

export default AppShell;
