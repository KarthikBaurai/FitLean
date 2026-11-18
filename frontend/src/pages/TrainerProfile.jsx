import { Link, useParams } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { Loading, ErrorMessage } from '../components/PageStates';
import TrainerPhoto from '../components/TrainerPhoto';
import NotFound from './NotFound';

const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function TrainerProfile() {
  const { slug } = useParams();
  const { data: t, loading, error, reload } = useFetch(`/trainers/${slug}`);

  if (loading) return <div className="max-w-container-max px-margin-mobile mx-auto"><Loading /></div>;
  if (error?.status === 404) return <NotFound />;
  if (error) return <div className="max-w-container-max px-margin-mobile mx-auto"><ErrorMessage error={error} onRetry={reload} /></div>;

  return (
    <div className="max-w-container-max px-margin-mobile md:px-margin-desktop gap-gutter mx-auto grid w-full grid-cols-1 py-10 md:py-20 lg:grid-cols-12">
      <div className="flex flex-col gap-10 lg:col-span-8">
        <section className="flex flex-col items-start gap-8 md:flex-row">
          <div className="bg-surface-variant border-outline-variant relative aspect-[3/4] w-full overflow-hidden border md:w-1/3">
            <div className="absolute inset-0">
              <TrainerPhoto name={t.name} imageUrl={t.image_url} />
            </div>
          </div>
          <div className="flex w-full flex-col gap-4 md:w-2/3">
            <div>
              <span className="font-label-caps text-label-caps text-outline tracking-widest uppercase">{t.title}</span>
              <h1 className="font-headline-lg-mobile md:text-headline-lg text-headline-lg-mobile text-primary mt-2">{t.name}</h1>
            </div>
            <p className="font-body-lg text-body-lg text-on-surface-variant mt-2 max-w-2xl">{t.bio || 'Profile details coming soon.'}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {t.specializations.map((s) => (
                <span key={s.id} className="bg-surface-container text-primary font-label-caps text-label-caps rounded-sm px-3 py-1">
                  {s.name}
                </span>
              ))}
            </div>
            <div className="border-outline-variant mt-6 grid grid-cols-2 gap-4 border-t pt-6">
              <div>
                <span className="font-label-caps text-label-caps text-outline block">Experience</span>
                <span className="font-headline-md text-headline-md text-primary">{t.experience_years}+ years</span>
              </div>
              <div>
                <span className="font-label-caps text-label-caps text-outline block">Branch</span>
                <Link to={`/locations/${t.branch_slug}`} className="font-headline-md text-headline-md text-primary hover:underline">
                  {t.branch_name}
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-headline-md text-headline-md text-primary mb-4">Working hours</h2>
          <ul className="border-outline-variant divide-outline-variant divide-y rounded border">
            {t.hours.map((h) => (
              <li key={h.weekday} className="flex justify-between px-4 py-3">
                <span>{DAYS[h.weekday]}</span>
                <span className="text-on-surface-variant">{h.start_time.slice(0, 5)} – {h.end_time.slice(0, 5)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside className="mt-10 lg:col-span-4 lg:mt-0">
        <div className="bg-surface-container-lowest border-outline-variant sticky top-32 flex flex-col gap-6 border p-8">
          <div className="border-outline-variant border-b pb-4">
            <h2 className="font-headline-md text-headline-md text-primary">Book {t.name}</h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">30, 60 or 90-minute 1-on-1 sessions.</p>
          </div>
          <Link
            to={`/book?trainer=${t.id}`}
            className="bg-primary text-on-primary font-label-caps text-label-caps hover:bg-secondary hover:text-on-secondary block w-full rounded py-4 text-center transition-all"
          >
            See free times
          </Link>
        </div>
      </aside>
    </div>
  );
}
