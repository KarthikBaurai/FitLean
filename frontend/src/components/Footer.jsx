import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-surface-dim border-outline-variant w-full border-t py-12 md:py-16">
      <div className="max-w-container-max px-margin-mobile md:px-margin-desktop mx-auto grid grid-cols-1 gap-8 md:grid-cols-4 md:gap-12">
        <div className="col-span-1 flex flex-col gap-4 md:col-span-2">
          <span className="font-headline-md text-headline-md text-primary font-black">FitLean Fitness</span>
          <p className="font-body-md text-body-md text-on-surface-variant">
            © {new Date().getFullYear()} FitLean Fitness. Engineered for Performance.
          </p>
          <p className="text-on-surface-variant text-xs">
            Student project for Full Stack Development. All branches, trainers and members are fictional demo data.
          </p>
        </div>
        <div className="col-span-1 flex flex-wrap items-center gap-6 md:col-span-2 md:justify-end">
          {[
            ['/trainers', 'Trainers'],
            ['/memberships', 'Memberships'],
            ['/locations', 'Locations'],
            ['/contact', 'Contact'],
          ].map(([to, label]) => (
            <Link key={to} to={to} className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary py-1">
              {label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
