export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="cv-shell relative flex min-h-[100svh] items-center justify-center overflow-y-auto px-3 py-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(99,102,241,.28),transparent_28%),radial-gradient(circle_at_90%_80%,rgba(20,241,217,.12),transparent_25%)]" />
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[20px] border border-white/10 bg-[var(--cv-surface)] shadow-[0_24px_100px_rgba(99,102,241,.14)] sm:rounded-[24px] lg:grid-cols-[1.05fr_.95fr]">
        <aside className="relative hidden min-h-[660px] overflow-hidden p-10 lg:block">
          <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(99,102,241,.9),rgba(139,92,246,.72)_42%,rgba(11,13,20,.98)_90%)]" />
          <div className="relative flex h-full flex-col justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 font-bold text-white">
                CV
              </span>
              <span className="font-semibold tracking-tight text-white">
                ChatVerse
              </span>
            </div>
            <div>
              <p className="max-w-sm text-4xl font-semibold leading-[1.05] tracking-tight text-white">
                A quieter place for louder ideas.
              </p>
              <p className="mt-5 max-w-sm text-sm leading-6 text-white/65">
                Real-time conversation, discovery, and communities in one alive
                workspace.
              </p>
            </div>
            <div className="flex gap-2 text-xs text-white/60">
              <span className="rounded-full border border-white/20 px-3 py-1.5">
                Realtime by design
              </span>
              <span className="rounded-full border border-white/20 px-3 py-1.5">
                Built for humans
              </span>
            </div>
          </div>
        </aside>
        <section className="relative w-full max-w-md justify-self-center p-5 sm:p-10">
          <div className="mb-8 lg:hidden">
            <p className="font-semibold tracking-tight">
              Chat<span className="text-[#8B5CF6]">Verse</span>
            </p>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 mb-7 text-sm leading-6 text-[var(--cv-muted)]">
            {subtitle}
          </p>
          {children}
        </section>
      </div>
    </div>
  );
}
