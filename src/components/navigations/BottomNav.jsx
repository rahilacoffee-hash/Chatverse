import {
  MessageCircle,
  CircleDashed,
  Compass,
  Phone,
  User,
} from "lucide-react";
import { NavLink } from "react-router-dom";

export default function BottomNav() {
  const navItems = [
    {
      icon: MessageCircle,
      path: "/chats",
      label: "Chats",
    },
    {
      icon: CircleDashed,
      path: "/status",
      label: "Status",
    },
    {
      icon: Compass,
      path: "/explore",
      label: "Explore",
    },
    {
      icon: Phone,
      path: "/calls",
      label: "Calls",
    },
    {
      icon: User,
      path: "/profile",
      label: "Profile",
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-[#0F0F14] border-t border-zinc-800 flex items-center justify-around z-50">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-xs ${
              isActive
                ? "text-purple-500"
                : "text-zinc-500"
            }`
          }
        >
          <item.icon size={22} />
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}
