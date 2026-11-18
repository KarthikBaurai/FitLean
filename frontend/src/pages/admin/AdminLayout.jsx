import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/appointments', label: 'Appointments' },
  { to: '/admin/trainers', label: 'Trainers' },
  { to: '/admin/members', label: 'Members' },
  { to: '/admin/enquiries', label: 'Enquiries' },
];

const item = ({ isActive }) =>
  `font-label-caps text-label-caps rounded px-3 py-2.5 tracking-widest whitespace-nowrap uppercase transition-colors ${
    isActive ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-primary'
  }`;

export default function AdminLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="bg-background min-h-screen md:flex">
      {/* Sidebar (desktop) */}
      <nav aria-label="Admin" className="border-surface-container-high bg-surface hidden w-60 flex-shrink-0 flex-col gap-1 border-r px-3 py-8 md:flex">
        <Link to="/admin" className="font-headline-md text-headline-md text-primary mb-8 px-3 font-extrabold tracking-tighter">
          FitLean Admin
        </Link>
        {NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.end} className={item}>{n.label}</NavLink>)}
        <div className="mt-auto flex flex-col gap-2 px-3">
          <span className="text-outline text-xs">{user.email}</span>
          <Link to="/" className="font-label-caps text-label-caps text-outline hover:text-primary uppercase">← Website</Link>
          <button onClick={logout} className="font-label-caps text-label-caps text-outline hover:text-primary cursor-pointer text-left uppercase">Log out</button>
        </div>
      </nav>

      <div className="min-w-0 flex-1">
        {/* Top bar (mobile) */}
        <nav aria-label="Admin (mobile)" className="border-surface-container-high bg-surface flex gap-1 overflow-x-auto border-b px-2 py-2 md:hidden">
          {NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.end} className={item}>{n.label}</NavLink>)}
          <Link to="/" className={item({ isActive: false })}>Website</Link>
        </nav>
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 md:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function AdminHeader({ title, description, children }) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary font-black tracking-tight">{title}</h1>
        {description && <p className="text-on-surface-variant mt-1">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-3">{children}</div>}
    </header>
  );
}

export const buttonClass =
  'bg-primary text-on-primary font-label-caps text-label-caps hover:bg-secondary hover:text-on-secondary inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded px-5 tracking-widest uppercase transition-colors disabled:opacity-50';

export const inputClass = 'bg-surface-container-lowest border-outline-variant min-h-[44px] rounded-lg border px-3';
