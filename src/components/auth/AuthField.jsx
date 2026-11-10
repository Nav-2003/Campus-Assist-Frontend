export default function AuthField({
  id,
  label,
  type = 'text',
  autoComplete,
  placeholder,
  value,
  onChange,
  required = true,
  trailing,
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-2 block text-sm font-bold text-ink">{label}</span>
      <div className="auth-field relative flex items-center rounded-xl border border-line bg-white transition-[border-color,box-shadow] duration-200">
        <input
          id={id}
          name={id}
          type={type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          className="w-full bg-transparent px-4 py-3 text-[0.95rem] font-medium text-ink outline-none placeholder:text-stone/50"
        />
        {trailing ? (
          <div className="absolute right-2 flex items-center">{trailing}</div>
        ) : null}
      </div>
    </label>
  )
}
