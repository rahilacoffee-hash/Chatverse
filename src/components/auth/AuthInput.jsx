export default function AuthInput({
  label,
  type = "text",
  name,
  value,
  onChange,
  placeholder,
}) {
  return (
    <label className="cv-focus group relative block rounded-[10px] border border-white/10 bg-white/[.035] px-4 pt-5 transition">
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder=" "
        className="w-full bg-transparent pb-2 text-[15px] text-[var(--cv-text)] outline-none placeholder:text-transparent"
      />
      <span className="pointer-events-none absolute left-4 top-2 text-[11px] font-semibold uppercase tracking-[.12em] text-[var(--cv-muted)] transition group-focus-within:text-[#14F1D9]">{label}</span>
      {placeholder && <span className="pointer-events-none absolute bottom-2.5 left-4 text-xs text-[var(--cv-muted)]/60 opacity-0 transition group-focus-within:opacity-100">{placeholder}</span>}
    </label>
  );
}