import { Link } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { Loading, ErrorMessage, Empty } from '../components/PageStates';

export default function Memberships() {
  const { data, loading, error, reload } = useFetch('/plans');

  return (
    <>
      <section className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto grid w-full items-center gap-12 py-16 md:grid-cols-2 md:py-32">
        <div className="flex flex-col gap-6">
          <span className="font-label-caps text-label-caps text-on-surface-variant tracking-widest uppercase">Membership plans</span>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:text-display-xl text-primary">
            Invest in Your <br className="hidden sm:block" />
            <span className="text-secondary-fixed-dim">Best Self.</span>
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-lg">
            Select a tier that matches your commitment. High-performance facilities, expert guidance and
            data-driven results await.
          </p>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row">
            <a href="#pricing" className="font-label-caps text-label-caps bg-primary text-on-primary hover:bg-secondary-fixed hover:text-primary inline-block rounded px-8 py-4 text-center transition-colors">
              View plans
            </a>
            <a href="#comparison" className="font-label-caps text-label-caps border-primary text-primary hover:bg-surface-container inline-block rounded border px-8 py-4 text-center transition-colors">
              Compare features
            </a>
          </div>
        </div>
        <div className="border-outline-variant relative h-[300px] overflow-hidden rounded-lg border sm:h-[400px] md:h-[600px]">
          <div role="img" aria-label="FitLean gym interior (photo coming soon)" className="placeholder-art h-full w-full" />
        </div>
      </section>

      <section id="pricing" className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full scroll-mt-24 py-16 md:py-24">
        {loading && <Loading label="Loading plans…" />}
        {error && <ErrorMessage error={error} onRetry={reload} />}
        {data && data.plans.length === 0 && <Empty>No membership plans are available right now.</Empty>}
        {data && data.plans.length > 0 && (
          <div className="grid gap-8 md:grid-cols-3">
            {data.plans.map((plan) => {
              const popular = plan.is_popular;
              return (
                <div
                  key={plan.id}
                  className={
                    popular
                      ? 'border-primary bg-primary text-on-primary relative flex flex-col rounded-lg border p-6 shadow-2xl sm:p-8 md:-translate-y-4'
                      : 'border-outline-variant bg-surface-container-lowest flex flex-col rounded-lg border p-6 sm:p-8'
                  }
                >
                  {popular && (
                    <div className="bg-secondary-fixed text-primary font-label-caps text-label-caps absolute top-0 right-0 rounded-tr-lg rounded-bl-lg px-4 py-1">
                      Most popular
                    </div>
                  )}
                  <div className="mb-8">
                    <h3 className={`font-headline-md text-headline-md mb-2 ${popular ? 'text-on-primary' : 'text-primary'}`}>{plan.name}</h3>
                    <p className={`font-body-md text-body-md sm:h-12 ${popular ? 'text-outline-variant' : 'text-on-surface-variant'}`}>{plan.description}</p>
                    <div className="mt-6 flex items-baseline gap-1">
                      <span className={`font-headline-lg-mobile text-headline-lg-mobile ${popular ? 'text-secondary-fixed' : 'text-primary'}`}>
                        ₹{plan.price.toLocaleString('en-IN')}
                      </span>
                      <span className={popular ? 'text-outline-variant' : 'text-on-surface-variant'}>
                        /{plan.billing_period === 'yearly' ? 'yr' : 'mo'}
                      </span>
                    </div>
                  </div>
                  <ul className="mb-8 flex flex-grow flex-col gap-4">
                    {plan.features.map((f) => (
                      <li key={f.id} className="font-body-md text-body-md flex items-center gap-3">
                        <span className={`material-symbols-outlined shrink-0 ${popular ? 'text-secondary-fixed' : 'text-secondary-fixed-dim'}`}>check_circle</span>
                        <span>{f.title}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={`/contact?plan=${plan.slug}`}
                    className={`font-label-caps text-label-caps block w-full rounded px-6 py-4 text-center transition-colors ${
                      popular ? 'bg-secondary-fixed text-primary hover:bg-white' : 'border-primary text-primary hover:bg-primary hover:text-on-primary border'
                    }`}
                  >
                    Enquire about {plan.name}
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {data && data.plans.length > 0 && (
        <section id="comparison" className="px-margin-mobile md:px-margin-desktop max-w-container-max border-outline-variant mx-auto w-full scroll-mt-24 border-t py-16 md:py-24">
          <h2 className="font-headline-lg-mobile text-headline-lg-mobile md:text-headline-lg text-primary mb-12">Compare features</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] border-collapse text-left">
              <thead>
                <tr className="border-primary border-b-2">
                  <th className="font-label-caps text-label-caps text-on-surface-variant w-1/3 px-4 py-6">Feature</th>
                  {data.plans.map((p) => (
                    <th key={p.id} className="font-headline-md text-headline-md text-primary px-4 py-6">{p.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.features.map((feature) => (
                  <tr key={feature.id} className="border-outline-variant border-b">
                    <td className="text-on-surface px-4 py-4">{feature.title}</td>
                    {data.plans.map((p) => (
                      <td key={p.id} className="px-4 py-4">
                        {p.features.some((f) => f.id === feature.id) ? (
                          <span className="material-symbols-outlined text-primary" aria-label="Included">check</span>
                        ) : (
                          <span className="material-symbols-outlined text-outline" aria-label="Not included">remove</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
