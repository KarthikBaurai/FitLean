import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDate, formatTime } from '../api';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../hooks/useFetch';
import { Loading, ErrorMessage, Empty } from '../components/PageStates';
import StatusBadge from '../components/StatusBadge';

export default function MyAppointments() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useFetch(`/appointments?page=${page}`);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 md:py-16">
      <p className="font-label-caps text-label-caps text-on-surface-variant tracking-widest uppercase">My account</p>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-headline-lg-mobile md:text-headline-lg text-headline-lg-mobile text-primary font-black">
          Hi, {user.fullName.split(' ')[0]}
        </h1>
        <Link to="/book" className="bg-primary text-on-primary font-label-caps text-label-caps hover:bg-secondary-fixed hover:text-primary rounded px-6 py-3 transition-colors">
          Book a session
        </Link>
      </div>

      <h2 className="font-headline-md text-headline-md text-primary mb-4">My sessions</h2>
      {loading && <Loading />}
      {error && <ErrorMessage error={error} onRetry={reload} />}
      {data && data.total === 0 && (
        <Empty>
          You have no sessions yet. <Link to="/book" className="text-primary underline">Book your first one</Link>.
        </Empty>
      )}
      {data && data.total > 0 && (
        <>
          <ul className="border-outline-variant divide-outline-variant bg-surface-container-lowest divide-y rounded-xl border">
            {data.appointments.map((a) => (
              <li key={a.id}>
                <Link to={`/account/appointments/${a.id}`} className="hover:bg-surface-container-low flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-primary font-bold">{formatDate(a.starts_at)} · {formatTime(a.starts_at)}</p>
                    <p className="text-on-surface-variant text-sm">{a.duration_minutes} min with {a.trainer_name} · {a.branch_name}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </Link>
              </li>
            ))}
          </ul>
          {pages > 1 && (
            <div className="mt-4 flex items-center gap-4">
              <button disabled={page === 1} onClick={() => setPage(page - 1)} className="cursor-pointer underline disabled:opacity-40">Previous</button>
              <span className="text-sm">Page {page} of {pages}</span>
              <button disabled={page === pages} onClick={() => setPage(page + 1)} className="cursor-pointer underline disabled:opacity-40">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
