import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LINKS = [
  { to: '/about', label: 'About' },
  { to: '/trainers', label: 'Trainers' },
  { to: '/memberships', label: 'Memberships' },
  { to: '/locations', label: 'Locations' },
  { to: '/contact', label: 'Contact' },
];

const linkClass =
  'text-on-surface-variant hover:text-on-secondary hover:bg-secondary font-label-caps text-label-caps rounded px-2 py-1 transition-colors';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const close = () => setOpen(false);

  return (
    <nav className="bg-surface border-outline-variant sticky top-0 z-50 w-full border-b">
      <div className="py-base max-w-container-max px-margin-mobile md:px-margin-desktop mx-auto flex w-full items-center justify-between">
        <Link to="/" className="font-headline-md text-headline-md text-primary font-bold tracking-tighter whitespace-nowrap" onClick={close}>
          FitLean Fitness
        </Link>

        {/* Desktop links */}
        <ul className="hidden items-center gap-4 xl:gap-6 lg:flex">
          {LINKS.map((l) => (
            <li key={l.to}>
              <NavLink to={l.to} className={({ isActive }) => `${linkClass} ${isActive ? 'text-primary font-bold' : ''}`}>
                {l.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-4 lg:flex">
          {user ? (
            <>
              <Link
                to={user.role === 'admin' ? '/admin' : '/account'}
                className="font-label-caps text-label-caps text-primary hover:text-secondary inline-flex min-h-[44px] items-center px-2 tracking-widest whitespace-nowrap uppercase"
              >
                {user.role === 'admin' ? 'Admin' : 'My sessions'}
              </Link>
              <button onClick={logout} className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary cursor-pointer whitespace-nowrap uppercase">
                Log out
              </button>
            </>
          ) : (
            <Link
              to="/sign-in"
              className="font-label-caps text-label-caps text-primary hover:text-secondary inline-flex min-h-[44px] items-center px-2 tracking-widest whitespace-nowrap uppercase"
            >
              Sign in
            </Link>
          )}
          <Link
            to="/book"
            className="bg-primary text-on-primary font-label-caps text-label-caps hover:bg-secondary-fixed hover:text-primary inline-block rounded px-5 py-3 whitespace-nowrap transition-colors"
          >
            Book a session
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setOpen(!open)}
          className="text-primary hover:bg-surface-variant flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded lg:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          <span className="material-symbols-outlined text-2xl">{open ? 'close' : 'menu'}</span>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-outline-variant bg-surface border-t px-5 pb-6 lg:hidden">
          <ul className="flex flex-col gap-1 py-4">
            {LINKS.map((l) => (
              <li key={l.to}>
                <NavLink
                  to={l.to}
                  onClick={close}
                  className={({ isActive }) =>
                    `font-label-caps text-label-caps block rounded-lg px-4 py-3 tracking-widest uppercase ${
                      isActive ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-variant'
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-3">
            {user ? (
              <>
                <Link to={user.role === 'admin' ? '/admin' : '/account'} onClick={close}
                  className="border-outline-variant text-primary font-label-caps text-label-caps block rounded border py-4 text-center uppercase">
                  {user.role === 'admin' ? 'Admin' : 'My sessions'}
                </Link>
                <button onClick={() => { logout(); close(); }}
                  className="font-label-caps text-label-caps text-on-surface-variant cursor-pointer py-2 uppercase">
                  Log out
                </button>
              </>
            ) : (
              <Link to="/sign-in" onClick={close}
                className="border-outline-variant text-primary font-label-caps text-label-caps block rounded border py-4 text-center uppercase">
                Sign in
              </Link>
            )}
            <Link to="/book" onClick={close}
              className="bg-primary text-on-primary font-label-caps text-label-caps block rounded py-4 text-center uppercase">
              Book a session
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
