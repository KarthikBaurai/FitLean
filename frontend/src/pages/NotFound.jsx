import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="px-margin-mobile mx-auto flex max-w-xl flex-col items-center py-32 text-center">
      <span className="font-display-xl text-display-xl text-primary">404</span>
      <h1 className="font-headline-md text-headline-md text-primary mt-4">Page not found</h1>
      <p className="text-on-surface-variant mt-2">The page you are looking for does not exist or has moved.</p>
      <Link to="/" className="bg-primary text-on-primary font-label-caps text-label-caps mt-8 rounded px-8 py-4">
        Back to home
      </Link>
    </div>
  );
}
