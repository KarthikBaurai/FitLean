import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { api, formatDate, formatTime } from '../api';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../hooks/useFetch';
import { Loading, ErrorMessage, Empty, Alert } from '../components/PageStates';
import SlotPicker, { localDate } from '../components/SlotPicker';

const card = 'border-outline-variant bg-surface-container-lowest rounded-xl border p-5';

// Booking in three steps, kept in the URL: /book -> ?branch=1 -> ?trainer=3
export default function Book() {
  const [params] = useSearchParams();
  const trainerId = params.get('trainer');
  const branchId = params.get('branch');

  let step = <ChooseBranch />;
  if (trainerId) step = <ChooseTime trainerId={trainerId} />;
  else if (branchId) step = <ChooseTrainer branchId={branchId} />;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 md:py-16">
      <p className="font-label-caps text-label-caps text-on-surface-variant tracking-widest uppercase">Book online</p>
      <h1 className="font-headline-lg-mobile md:text-headline-lg text-headline-lg-mobile text-primary mb-6 font-black tracking-tight">Book a session</h1>
      <ol className="mb-8 flex flex-wrap gap-2" aria-label="Booking steps">
        {['Branch', 'Trainer', 'Time'].map((label, i) => {
          const current = (trainerId ? 3 : branchId ? 2 : 1) === i + 1;
          return (
            <li key={label} aria-current={current ? 'step' : undefined}
              className={`rounded-full px-4 py-1 text-sm ${current ? 'bg-primary text-on-primary' : 'bg-surface-container-high'}`}>
              {i + 1}. {label}
            </li>
          );
        })}
      </ol>
      {step}
    </div>
  );
}

function ChooseBranch() {
  const { data: branches, loading, error, reload } = useFetch('/branches');
  if (loading) return <Loading />;
  if (error) return <ErrorMessage error={error} onRetry={reload} />;
  if (branches.length === 0) return <Empty>Online booking opens soon.</Empty>;
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {branches.map((b) => (
        <li key={b.id}>
          <Link to={`/book?branch=${b.id}`} className={`${card} hover:border-primary block h-full`}>
            <span className="text-primary block text-lg font-bold">{b.name}</span>
            <span className="text-on-surface-variant text-sm">{b.city} · {b.trainer_count} trainers</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ChooseTrainer({ branchId }) {
  const { data: trainers, loading, error, reload } = useFetch(`/trainers?branchId=${branchId}`);
  return (
    <>
      <Link to="/book" className="text-primary mb-4 inline-block text-sm underline">← Choose another branch</Link>
      {loading && <Loading />}
      {error && <ErrorMessage error={error} onRetry={reload} />}
      {trainers && trainers.length === 0 && <Empty>No trainers at this branch are taking bookings yet.</Empty>}
      {trainers && trainers.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trainers.map((t) => (
            <li key={t.id}>
              <Link to={`/book?trainer=${t.id}`} className={`${card} hover:border-primary block h-full`}>
                <span className="text-primary block text-lg font-bold">{t.name}</span>
                <span className="text-on-surface-variant text-sm">{t.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function ChooseTime({ trainerId }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: trainer, loading, error, reload } = useFetch(`/trainers/${trainerId}`);

  const [duration, setDuration] = useState(60);
  const [date, setDate] = useState(localDate(1));
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  if (loading) return <Loading />;
  if (error) return <ErrorMessage error={error} onRetry={reload} />;

  async function book() {
    setBusy(true);
    setMessage('');
    try {
      const appointment = await api('/appointments', {
        method: 'POST',
        body: { trainerId: trainer.id, startsAt: selected, duration, notes },
      });
      navigate(`/account/appointments/${appointment.id}?booked=1`);
    } catch (err) {
      // 409: someone else just took this time. Show why and reload the free times.
      setMessage(err.message);
      setSelected(null);
      setRefreshKey((k) => k + 1);
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="font-headline-md text-headline-md text-primary font-bold">{trainer.name}</h2>
          <p className="text-on-surface-variant text-sm">{trainer.title} · {trainer.branch_name}</p>
        </div>
        <Link to={`/book?branch=${trainer.branch_id}`} className="text-primary text-sm underline">Change trainer</Link>
      </div>

      {message && <Alert>{message}</Alert>}

      <div className={card}>
        <SlotPicker
          trainerId={trainer.id}
          duration={duration} setDuration={setDuration}
          date={date} setDate={setDate}
          selected={selected} setSelected={setSelected}
          refreshKey={refreshKey}
        />

        {selected && (
          <div className="border-outline-variant mt-6 border-t pt-6">
            {user ? (
              <>
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold">Notes for your trainer (optional)</span>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={500}
                    className="border-outline-variant w-full rounded-lg border px-4 py-2.5" />
                </label>
                <p className="text-on-surface-variant mt-4 text-sm">
                  {duration}-minute session with {trainer.name} on {formatDate(selected)} at {formatTime(selected)}.
                </p>
                <button onClick={book} disabled={busy}
                  className="bg-primary text-on-primary font-label-caps text-label-caps hover:bg-secondary-fixed hover:text-primary mt-4 min-h-[48px] cursor-pointer rounded px-8 transition-colors disabled:opacity-50">
                  {busy ? 'Booking…' : 'Confirm booking'}
                </button>
              </>
            ) : (
              <Link to={`/sign-in?next=${encodeURIComponent(location.pathname + location.search)}`}
                className="bg-primary text-on-primary font-label-caps text-label-caps inline-flex min-h-[48px] items-center rounded px-8">
                Sign in to book
              </Link>
            )}
          </div>
        )}
        <p className="text-outline mt-6 text-xs">Times shown are free right now; the server confirms availability when you book.</p>
      </div>
    </>
  );
}
