import {
  MessageCircle,
  Compass,
  Bell,
  Settings,
  User
} from "lucide-react";

export default function DesktopSidebar() {
  return (
    <div className="hidden lg:flex w-16 bg-[#202c33] border-r border-zinc-800 flex-col items-center py-4">

      <div className="w-10 h-10 rounded-full bg-purple-600 mb-8" />

      <MessageCircle className="text-zinc-300 mb-8 cursor-pointer" />

      <Compass className="text-zinc-500 mb-8 cursor-pointer" />

      <Bell className="text-zinc-500 mb-8 cursor-pointer" />

      <div className="mt-auto flex flex-col gap-8">
        <Settings className="text-zinc-500 cursor-pointer" />
        <User className="text-zinc-500 cursor-pointer" />
      </div>
    </div>
  );
}