import { Link } from 'react-router-dom';

// Card layout for the sign-in and sign-up pages.
export default function AuthShell({ title, description, children, footer }) {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <div className="bg-surface-container-lowest border-outline-variant w-full max-w-md rounded-xl border p-6 shadow-2xl sm:p-10">
        <div className="mb-8 text-center">
          <span className="font-label-caps text-label-caps text-primary bg-surface-container-high border-outline-variant rounded-sm border px-3 py-1 tracking-widest uppercase">
            FitLean Members
          </span>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary mt-4 font-black tracking-tight">{title}</h1>
          {description && <p className="font-body-md text-body-md text-on-surface-variant mt-2">{description}</p>}
        </div>
        {children}
        {footer && <div className="text-on-surface-variant mt-8 text-center">{footer}</div>}
        <div className="mt-6 text-center">
          <Link to="/" className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary inline-block py-2">
            ← Back to website
          </Link>
        </div>
      </div>
    </div>
  );
}
