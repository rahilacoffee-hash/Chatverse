export default function AuthLayout({
  title,
  subtitle,
  children,
}) {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white">
            ChatVerse
          </h1>

          <p className="text-zinc-400 mt-2">
            WhatsApp meets TikTok
          </p>
        </div>

        {/* Card */}

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
          <h2 className="text-3xl font-bold text-white">
            {title}
          </h2>

          <p className="text-zinc-400 mt-2 mb-6">
            {subtitle}
          </p>

          {children}
        </div>
      </div>
    </div>
  );
}