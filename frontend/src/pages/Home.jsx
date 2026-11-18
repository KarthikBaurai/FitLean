import { Link } from 'react-router-dom';
import { PHOTOS } from '../photos';

const CARDS = [
  { to: '/trainers', label: 'Coaching', title: 'Train with a coach', text: 'Browse trainer profiles and find a coach for your goals.', photo: PHOTOS.coaching, large: true },
  { to: '/book', label: 'Booking', title: 'Book a session', text: "30, 60 or 90 minutes, in your trainer's free hours.", photo: PHOTOS.booking },
  { to: '/contact', label: 'Enquiry', title: 'Free consultation', text: 'Tell us your goals and we will get in touch.', photo: PHOTOS.consultation },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative flex h-[80vh] min-h-[500px] w-full items-center justify-center overflow-hidden md:min-h-[600px]">
        <div className="absolute inset-0 z-0">
          <img
            src={PHOTOS.hero.src}
            alt=""
            fetchPriority="high"
            className="placeholder-art absolute inset-0 h-full w-full object-cover"
          />
          <div className="from-primary/90 via-primary/50 absolute inset-0 bg-gradient-to-r to-transparent" />
        </div>
        <div className="max-w-container-max px-margin-mobile md:px-margin-desktop relative z-10 mx-auto flex w-full flex-col items-start gap-6 md:gap-8">
          <h1 className="font-display-xl text-headline-lg-mobile md:text-display-xl text-on-primary max-w-2xl">
            Performance Redefined.
          </h1>
          <p className="font-body-lg text-body-lg text-surface-container-high max-w-xl">
            The scientific approach to peak human potential.
          </p>
          <Link
            to="/book"
            className="bg-secondary-fixed text-primary font-label-caps text-label-caps hover:bg-surface-container mt-2 inline-block rounded px-8 py-4 text-center transition-colors active:scale-95"
          >
            Book your session
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full py-24 md:py-32">
        <div className="mb-16">
          <h2 className="font-headline-lg-mobile text-headline-lg-mobile md:text-headline-lg text-primary mb-4">
            How FitLean works
          </h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
            Find a coach, book real availability and manage your sessions online.
          </p>
        </div>
        <div className="gap-gutter grid grid-cols-1 md:grid-cols-2">
          {CARDS.map((c) => (
            <Link
              key={c.to}
              to={c.to}
              className={`group border-outline-variant placeholder-art relative flex min-h-64 flex-col justify-end overflow-hidden rounded-lg border p-6 md:p-8 ${c.large ? 'md:col-span-2 md:min-h-96' : ''}`}
            >
              <img
                src={c.photo.src}
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <span className="from-primary/90 via-primary/40 absolute inset-0 bg-gradient-to-t to-transparent" />
              <span className="relative">
                <span className="font-label-caps text-label-caps text-secondary-fixed mb-2 block tracking-widest uppercase">{c.label}</span>
                <span className="font-headline-md text-headline-md text-on-primary block">{c.title}</span>
                <span className="font-body-md text-body-md text-on-primary/90 mt-2 block">{c.text}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
