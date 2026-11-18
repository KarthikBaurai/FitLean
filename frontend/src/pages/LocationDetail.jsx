import { Link, useParams } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { Loading, ErrorMessage, Empty } from '../components/PageStates';
import TrainerPhoto from '../components/TrainerPhoto';
import NotFound from './NotFound';

export default function LocationDetail() {
  const { slug } = useParams();
  const { data: b, loading, error, reload } = useFetch(`/branches/${slug}`);

  if (error?.status === 404) return <NotFound />;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 md:py-20">
      <Link to="/locations" className="text-primary mb-6 inline-block text-sm underline">← All locations</Link>
      {loading && <Loading />}
      {error && <ErrorMessage error={error} onRetry={reload} />}
      {b && (
        <>
          <h1 className="font-headline-lg-mobile md:text-headline-lg text-headline-lg-mobile text-primary font-black">{b.name}</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-3 max-w-2xl">{b.description}</p>

          <dl className="border-outline-variant mt-8 grid gap-6 border-y py-6 sm:grid-cols-3">
            <div>
              <dt className="font-label-caps text-label-caps text-outline">Address</dt>
              <dd className="mt-1">{b.address}, {b.city}</dd>
            </div>
            <div>
              <dt className="font-label-caps text-label-caps text-outline">Opening hours</dt>
              <dd className="mt-1">Daily {b.opens_at.slice(0, 5)} – {b.closes_at.slice(0, 5)}</dd>
            </div>
            <div>
              <dt className="font-label-caps text-label-caps text-outline">Phone</dt>
              <dd className="mt-1">{b.phone || '—'}</dd>
            </div>
          </dl>

          <h2 className="font-headline-md text-headline-md text-primary mt-12 mb-6">Trainers at this branch</h2>
          {b.trainers.length === 0 ? (
            <Empty>No trainers at this branch yet.</Empty>
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {b.trainers.map((t) => (
                <li key={t.id}>
                  <Link to={`/trainers/${t.slug}`} className="border-outline-variant bg-surface-container-lowest hover:border-primary flex items-center gap-4 rounded-xl border p-4">
                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded [&_span]:!text-xl">
                      <TrainerPhoto name={t.name} imageUrl={t.image_url} />
                    </div>
                    <div>
                      <p className="text-primary font-bold">{t.name}</p>
                      <p className="text-on-surface-variant text-sm">{t.title}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
