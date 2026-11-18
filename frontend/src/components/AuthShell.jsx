import { Link } from 'react-router-dom';
import { PHOTOS } from '../photos';

// Card layout for the sign-in and sign-up pages.
export default function AuthShell({ title, description, children, footer }) {
  return (
    <div className="bg-background flex min-h-screen">
      {/* Photo panel: large screens only, so phones go straight to the form. */}
      <div className="bg-primary relative hidden w-1/2 overflow-hidden lg:block">
        <img src={PHOTOS.auth.src} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
        <div className="from-primary absolute inset-0 bg-gradient-to-t via-transparent to-transparent" />
        <div className="absolute right-12 bottom-12 left-12">
          <p className="font-label-caps text-label-caps text-secondary-fixed tracking-widest uppercase">FitLean</p>
          <p className="font-headline-lg text-headline-lg text-on-primary mt-3">Performance Redefined.</p>
        </div>
      </div>
      <div className="flex w-full items-center justify-center px-4 py-10 sm:px-6 lg:w-1/2">
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
    </div>
  );
}
