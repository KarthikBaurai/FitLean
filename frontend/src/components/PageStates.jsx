// The loading / error / empty states shown while data is fetched.

export function Loading({ label = 'Loading…' }) {
  return (
    <div role="status" className="text-on-surface-variant flex items-center gap-3 py-12">
      <span className="border-outline-variant border-t-primary h-5 w-5 animate-spin rounded-full border-2" />
      <span className="font-body-md">{label}</span>
    </div>
  );
}

export function ErrorMessage({ error, onRetry }) {
  return (
    <div role="alert" className="bg-error-container text-on-error-container my-6 rounded-lg p-4 text-sm font-medium">
      <p>{error?.message || 'Something went wrong.'}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 cursor-pointer font-bold underline">
          Try again
        </button>
      )}
    </div>
  );
}

export function Empty({ children }) {
  return (
    <div className="border-outline-variant bg-surface-container-lowest text-on-surface-variant rounded-xl border border-dashed p-10 text-center">
      {children}
    </div>
  );
}

// Form-level message banner (error / success).
export function Alert({ tone = 'error', children }) {
  const styles = {
    error: 'bg-error-container text-on-error-container',
    success: 'bg-secondary-fixed text-on-secondary-fixed',
    info: 'bg-surface-container-high text-on-surface',
  };
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`mb-6 rounded-lg p-4 text-sm font-medium ${styles[tone]}`}>
      {children}
    </div>
  );
}
