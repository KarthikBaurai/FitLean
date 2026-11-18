import { Link } from 'react-router-dom';

export default function About() {
  return (
    <>
      <section className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto grid grid-cols-1 items-center gap-16 py-20 md:grid-cols-2 md:py-32">
        <div>
          <h1 className="font-display-xl text-headline-lg-mobile md:text-display-xl text-primary mb-6">
            Engineered for Performance.
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant mb-10 max-w-lg">
            A training environment where scientific precision meets raw physical energy, with coaching built
            around your goals.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/book"
              className="bg-primary text-on-primary font-label-caps text-label-caps hover:bg-secondary-fixed hover:text-primary rounded px-6 py-4 tracking-widest uppercase transition-colors"
            >
              Book a session
            </Link>
            <Link
              to="/locations"
              className="border-primary text-primary font-label-caps text-label-caps hover:bg-surface-container inline-flex items-center gap-2 rounded border px-6 py-4 tracking-widest uppercase transition-colors"
            >
              Our locations
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">map</span>
            </Link>
          </div>
        </div>
        <div className="border-outline-variant relative h-[400px] overflow-hidden rounded-lg border md:h-[600px]">
          <div role="img" aria-label="FitLean facility (photo coming soon)" className="placeholder-art absolute inset-0 h-full w-full" />
        </div>
      </section>

      <section className="bg-surface-bright border-outline-variant border-y py-20">
        <div className="max-w-container-max px-margin-mobile md:px-margin-desktop mx-auto grid gap-10 md:grid-cols-3">
          {[
            ['fitness_center', 'Expert coaches', 'Certified trainers in strength, mobility, conditioning and nutrition.'],
            ['event_available', 'Real availability', "Book straight into your trainer's free hours: 30, 60 or 90 minutes."],
            ['history', 'Your history, kept', 'Every booking, change and cancellation is recorded in your session history.'],
          ].map(([icon, title, text]) => (
            <div key={title} className="flex flex-col gap-3">
              <span className="material-symbols-outlined text-primary text-4xl">{icon}</span>
              <h2 className="font-headline-md text-headline-md text-primary">{title}</h2>
              <p className="font-body-md text-body-md text-on-surface-variant">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto py-20 text-center">
        <h2 className="font-headline-lg-mobile text-headline-lg-mobile md:text-headline-lg mb-6">Experience FitLean</h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant mx-auto mb-8 max-w-2xl">
          Tell us your goals and a performance specialist will get in touch.
        </p>
        <Link
          to="/contact"
          className="bg-primary text-on-primary font-label-caps text-label-caps hover:bg-secondary-fixed hover:text-primary inline-block rounded px-8 py-4 transition-colors"
        >
          Send an enquiry
        </Link>
      </section>
    </>
  );
}
