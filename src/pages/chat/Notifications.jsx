import { ArrowLeft, Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../../services/userService";

export default function Notifications() {
  const navigate = useNavigate();
  const [count, setCount] = useState(null);
  useEffect(() => {
    getCurrentUser()
      .then((user) => setCount(user.unreadNotifications || 0))
      .catch(() => setCount(0));
  }, []);
  return (
    <main className="cv-page min-h-[100svh] p-4">
      <header className="mx-auto flex h-12 max-w-xl items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="rounded-full p-2 hover:bg-white/10"
        >
          <ArrowLeft size={21} />
        </button>
        <h1 className="text-xl font-semibold">Notifications</h1>
      </header>
      <section className="cv-elevated mx-auto mt-5 max-w-xl rounded-[24px] p-7 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#14F1D9]/15 text-[#14F1D9]">
          <Bell />
        </span>
        <h2 className="mt-4 font-semibold">
          {count === null
            ? "Loading notifications…"
            : count
              ? `${count} unread chat notification${count === 1 ? "" : "s"}`
              : "You’re all caught up"}
        </h2>
        <p className="mt-2 text-sm text-[var(--cv-muted)]">
          Unread messages from your chats appear here.
        </p>
      </section>
    </main>
  );
}
