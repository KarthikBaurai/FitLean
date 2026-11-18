import { Link } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { Loading, ErrorMessage, Empty } from '../components/PageStates';

export default function Locations() {
  const { data: branches, loading, error, reload } = useFetch('/branches');

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 md:py-20">
      <header className="mb-10 max-w-2xl">
        <p className="font-label-caps text-label-caps text-on-surface-variant tracking-widest uppercase">Locations</p>
        <h1 className="font-headline-lg-mobile md:text-headline-lg text-headline-lg-mobile text-primary font-black tracking-tight">Find your FitLean</h1>
        <p className="text-body-md text-on-surface-variant mt-3">Choose a branch to see its address, opening hours and trainers.</p>
      </header>

      {loading && <Loading label="Loading branches…" />}
      {error && <ErrorMessage error={error} onRetry={reload} />}
      {branches && branches.length === 0 && <Empty>Locations coming soon.</Empty>}
      {branches && branches.length > 0 && (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((b) => (
            <li key={b.id}>
              <Link
                to={`/locations/${b.slug}`}
                className="border-outline-variant bg-surface-container-lowest hover:border-primary flex h-full flex-col rounded-xl border p-6 transition-colors"
              >
                <h2 className="font-headline-md text-headline-md text-primary font-bold">{b.name}</h2>
                <p className="text-on-surface-variant mt-2 text-sm">{b.address}, {b.city}</p>
                <p className="text-outline mt-3 text-xs">
                  Open {b.opens_at.slice(0, 5)} – {b.closes_at.slice(0, 5)} · {b.trainer_count} trainer{b.trainer_count === 1 ? '' : 's'}
                </p>
                <span className="font-label-caps text-label-caps text-primary mt-auto pt-5 tracking-widest uppercase">View branch →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
