// A trainer's photo, or a neutral initials placeholder when there is none.
function initials(name) {
  return name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w) && !/^(dr|mr|ms|mrs)\.?$/i.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export default function TrainerPhoto({ name, imageUrl }) {
  if (imageUrl) {
    // object-[50%_20%]: keep faces in frame when a portrait is cropped to a wide card.
    return <img className="h-full w-full object-cover object-[50%_20%]" src={imageUrl} alt={name} loading="lazy" />;
  }
  return (
    <div
      role="img"
      aria-label={`${name} (photo coming soon)`}
      className="placeholder-art text-on-surface-variant flex h-full w-full items-center justify-center"
    >
      <span aria-hidden="true" className="font-headline-lg text-headline-lg tracking-widest">
        {initials(name) || '—'}
      </span>
    </div>
  );
}
