export default function AuthInput({
  label,
  type = "text",
  name,
  value,
  onChange,
  placeholder,
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm text-zinc-300 block">
        {label}
      </label>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="
          w-full
          px-4
          py-3
          rounded-xl
          bg-zinc-800
          border
          border-zinc-700
          text-white
          outline-none
          focus:border-violet-500
          transition
        "
      />
    </div>
  );
}