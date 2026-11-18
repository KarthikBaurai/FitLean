// Site photography. Files live in frontend/public/images (see CREDITS.md there).
// Each entry pairs the image path with its alt text so they stay together.
const img = (file, alt) => ({ src: `/images/${file}`, alt });

export const PHOTOS = {
  hero: img('hero-gym.jpg', 'Industrial-style gym floor with strength racks and free weights'),
  coaching: img('coaching.jpg', 'A coach correcting a client’s push-up form'),
  booking: img('booking.jpg', 'Close-up of a lifter gripping a loaded barbell'),
  consultation: img('consultation.jpg', 'A trainer reviewing progress with a client on a tablet'),
  about: img('about-facility.jpg', 'Strength training equipment on the gym floor'),
  memberships: img('memberships.jpg', 'Gym interior with weight machines under ceiling lights'),
  contact: img('contact-consultation.jpg', 'A coach encouraging a client on a rowing machine'),
  auth: img('auth-barbell.jpg', 'Black and white photo of a loaded barbell on the gym floor'),
};

// Branch photos, keyed by branch slug. Unknown branches fall back to a generic photo.
const BRANCH_PHOTOS = {
  dwarka: img('locations/dwarka.jpg', 'Spacious strength floor at FitLean Dwarka'),
  saket: img('locations/saket.jpg', 'Cardio and conditioning area at FitLean Saket'),
  gurugram: img('locations/gurugram.jpg', 'Open-plan training floor at FitLean Gurugram'),
};

export function branchPhoto(slug) {
  return BRANCH_PHOTOS[slug] || PHOTOS.memberships;
}
