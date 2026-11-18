// A labelled, controlled input with an error message underneath.
//   <TextField label="Email" name="email" value={form.email} onChange={change} error={fields.email} />
export default function TextField({ label, name, type = 'text', value, onChange, error, required, ...rest }) {
  const id = `field-${name}`;
  const Tag = type === 'textarea' ? 'textarea' : 'input';
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-on-surface text-sm font-semibold">
        {label} {required && <span className="text-error">*</span>}
      </label>
      <Tag
        id={id}
        name={name}
        type={type === 'textarea' ? undefined : type}
        value={value}
        onChange={onChange}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`bg-surface-container-lowest text-on-surface min-h-[44px] w-full rounded-lg border px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary ${
          error ? 'border-error' : 'border-outline-variant'
        }`}
        {...rest}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-error text-xs font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
