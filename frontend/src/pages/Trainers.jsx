import { Link } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { Loading, ErrorMessage, Empty } from '../components/PageStates';
import TrainerPhoto from '../components/TrainerPhoto';

export default function Trainers() {
  const { data: trainers, loading, error, reload } = useFetch('/trainers');

  return (
    <div className="flex flex-col">
      <section className="px-margin-mobile md:px-margin-desktop flex w-full flex-col items-center pt-20 pb-12 text-center md:pt-[120px] md:pb-[80px]">
        <div className="flex max-w-[800px] flex-col items-center gap-6">
          <h1 className="font-headline-lg-mobile md:font-display-xl text-headline-lg-mobile md:text-display-xl text-primary">
            Meet our trainers
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-[600px]">
            Choose a coach whose specialities match your goals, then book a session from their profile.
          </p>
        </div>
      </section>

      <section className="px-margin-mobile md:px-margin-desktop max-w-container-max border-outline-variant mx-auto w-full border-t py-12 md:py-[80px]">
        {loading && <Loading label="Loading trainers…" />}
        {error && <ErrorMessage error={error} onRetry={reload} />}
        {trainers && trainers.length === 0 && <Empty>No trainers are listed yet.</Empty>}
        {trainers && trainers.length > 0 && (
          <>
            <h2 className="font-headline-md text-headline-md text-primary mb-8">Trainers ({trainers.length})</h2>
            <ul className="gap-gutter grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {trainers.map((t) => (
                <li key={t.id} className="border-outline-variant bg-surface-container-lowest flex flex-col overflow-hidden rounded border">
                  <div className="bg-surface-variant relative h-[280px] w-full overflow-hidden sm:h-[350px]">
                    <TrainerPhoto name={t.name} imageUrl={t.image_url} />
                    <div className="bg-surface-container-lowest/90 border-outline-variant absolute top-4 left-4 rounded-sm border px-2 py-1">
                      <span className="font-label-caps text-label-caps text-primary">
                        {t.specializations[0]?.name || t.branch_name}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-grow flex-col justify-between gap-4 p-6">
                    <div>
                      <h3 className="font-headline-md text-headline-md text-primary mb-1">{t.name}</h3>
                      <p className="font-body-md text-body-md text-on-surface-variant">{t.title}</p>
                      <p className="text-outline mt-1 text-sm">{t.branch_name}</p>
                    </div>
                    <Link
                      to={`/trainers/${t.slug}`}
                      className="font-label-caps text-label-caps text-primary hover:text-secondary inline-flex min-h-11 items-center gap-2"
                    >
                      View profile
                      <span aria-hidden="true" className="material-symbols-outlined text-sm">arrow_forward</span>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
