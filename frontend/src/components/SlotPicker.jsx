import { useFetch } from '../hooks/useFetch';
import { formatDate, formatTime } from '../api';
import { Loading, ErrorMessage } from './PageStates';

const DURATIONS = [30, 60, 90];

// Local date as "2026-11-20", `offset` days from today.
export function localDate(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const chip = 'font-label-caps text-label-caps inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded border px-4 tracking-widest uppercase';
const on = 'bg-primary text-on-primary border-primary';
const off = 'border-outline-variant text-primary hover:border-primary';

// Duration buttons, the next 14 days, and the free start times for the
// chosen day (from GET /api/trainers/:id/slots). Used by booking and
// rescheduling. `refreshKey` changes force the times to reload.
export default function SlotPicker({ trainerId, duration, setDuration, date, setDate, selected, setSelected, refreshKey = 0 }) {
  const { data: slots, loading, error, reload } = useFetch(
    `/trainers/${trainerId}/slots?date=${date}&duration=${duration}&r=${refreshKey}`
  );
  const days = Array.from({ length: 14 }, (_, i) => localDate(i));

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h3 className="mb-2 font-semibold">Session length</h3>
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map((d) => (
            <button type="button" key={d} onClick={() => { setDuration(d); setSelected(null); }} className={`${chip} ${d === duration ? on : off}`}>
              {d} min
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">Date</h3>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {days.map((d) => (
            <button type="button" key={d} onClick={() => { setDate(d); setSelected(null); }} className={`${chip} flex-shrink-0 ${d === date ? on : off}`}>
              {formatDate(`${d} 00:00:00`).replace(/, \d{4}$/, '')}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">Free start times</h3>
        {loading && <Loading label="Loading free times…" />}
        {error && <ErrorMessage error={error} onRetry={reload} />}
        {slots && slots.length === 0 && (
          <p className="text-on-surface-variant">No {duration}-minute times are free on this day. Try another day or a shorter session.</p>
        )}
        {slots && slots.length > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {slots.map((s) => (
              <button
                type="button"
                key={s.startsAt}
                onClick={() => setSelected(s.startsAt)}
                aria-pressed={selected === s.startsAt}
                className={`min-h-[48px] cursor-pointer rounded-lg border font-semibold ${selected === s.startsAt ? on : off}`}
              >
                {formatTime(s.startsAt)}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
