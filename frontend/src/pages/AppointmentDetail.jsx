import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, formatDate, formatTime } from '../api';
import { useFetch } from '../hooks/useFetch';
import { Loading, ErrorMessage, Alert } from '../components/PageStates';
import StatusBadge from '../components/StatusBadge';
import SlotPicker from '../components/SlotPicker';

// One appointment: details, history (append-only), cancel and reschedule.
// Used by members (/account/appointments/:id) and admins (/admin/appointments/:id).
export default function AppointmentDetail({ admin = false }) {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { data: a, loading, error, reload } = useFetch(`/appointments/${id}`);

  const [message, setMessage] = useState(params.get('booked') ? { tone: 'success', text: 'Booked! See you there.' } : null);
  const [rescheduling, setRescheduling] = useState(false);
  const [duration, setDuration] = useState(60);
  const [date, setDate] = useState('');
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);

  const base = admin ? '/admin/appointments' : '/account/appointments';

  if (loading) return <Wrapper admin={admin}><Loading /></Wrapper>;
  if (error) return <Wrapper admin={admin}><ErrorMessage error={error} onRetry={reload} /></Wrapper>;

  const upcoming = a.status === 'confirmed' && new Date(a.starts_at.replace(' ', 'T')) > new Date();

  async function run(request, successText, after) {
    setBusy(true);
    setMessage(null);
    try {
      const result = await request();
      setMessage({ tone: 'success', text: successText });
      if (after) after(result);
      else reload();
    } catch (err) {
      setMessage({ tone: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  }

  const cancel = () => {
    if (!window.confirm('Cancel this session?')) return;
    run(() => api(`/appointments/${a.id}`, { method: 'DELETE' }), 'Session cancelled.');
  };

  const complete = () => run(() => api(`/appointments/${a.id}/complete`, { method: 'PATCH' }), 'Marked as completed.');

  const reschedule = () =>
    run(
      () => api(`/appointments/${a.id}`, { method: 'PATCH', body: { startsAt: selected, duration } }),
      'Rescheduled.',
      (newAppointment) => {
        setRescheduling(false);
        navigate(`${base}/${newAppointment.id}`); // the new booking has a new id
      }
    );

  function startReschedule() {
    setDuration(a.duration_minutes);
    setDate(a.starts_at.slice(0, 10));
    setSelected(null);
    setRescheduling(true);
  }

  return (
    <Wrapper admin={admin}>
      <Link to={admin ? '/admin/appointments' : '/account'} className="text-primary mb-6 inline-block text-sm underline">
        ← Back to {admin ? 'appointments' : 'my sessions'}
      </Link>
      {message && <Alert tone={message.tone}>{message.text}</Alert>}

      <div className="bg-surface-container-lowest border-outline-variant rounded-xl border p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-outline text-sm">Appointment #{a.id}</p>
            <h1 className="font-headline-md text-headline-md text-primary mt-1">
              {formatDate(a.starts_at)} · {formatTime(a.starts_at)} – {formatTime(a.ends_at)}
            </h1>
            <p className="text-on-surface-variant mt-1">
              {a.duration_minutes} min with {a.trainer_name} at {a.branch_name}
              {admin && <> · member: {a.member_name} ({a.member_email})</>}
            </p>
            {a.notes && <p className="mt-3 text-sm"><strong>Notes:</strong> {a.notes}</p>}
            {a.rescheduled_from && (
              <p className="text-outline mt-2 text-sm">
                Rescheduled from <Link className="underline" to={`${base}/${a.rescheduled_from}`}>#{a.rescheduled_from}</Link>
              </p>
            )}
          </div>
          <StatusBadge status={a.status} />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {upcoming && !rescheduling && (
            <>
              <button onClick={startReschedule} disabled={busy}
                className="border-outline-variant text-primary font-label-caps text-label-caps hover:bg-surface-container-high min-h-[44px] cursor-pointer rounded border px-5">
                Reschedule
              </button>
              <button onClick={cancel} disabled={busy}
                className="bg-error text-on-error font-label-caps text-label-caps min-h-[44px] cursor-pointer rounded px-5 disabled:opacity-50">
                Cancel session
              </button>
            </>
          )}
          {admin && a.status === 'confirmed' && !upcoming && (
            <button onClick={complete} disabled={busy}
              className="bg-primary text-on-primary font-label-caps text-label-caps min-h-[44px] cursor-pointer rounded px-5">
              Mark completed
            </button>
          )}
        </div>
      </div>

      {rescheduling && (
        <div className="bg-surface-container-lowest border-outline-variant mt-6 rounded-xl border p-6">
          <h2 className="font-headline-md text-headline-md text-primary mb-4">Choose a new time</h2>
          <SlotPicker trainerId={a.trainer_id} duration={duration} setDuration={setDuration}
            date={date} setDate={setDate} selected={selected} setSelected={setSelected} />
          <div className="mt-6 flex gap-3">
            <button onClick={reschedule} disabled={!selected || busy}
              className="bg-primary text-on-primary font-label-caps text-label-caps min-h-[44px] cursor-pointer rounded px-5 disabled:opacity-40">
              {busy ? 'Saving…' : 'Confirm new time'}
            </button>
            <button onClick={() => setRescheduling(false)} className="cursor-pointer px-3 underline">Keep current time</button>
          </div>
        </div>
      )}

      <h2 className="font-headline-md text-headline-md text-primary mt-10 mb-4">History</h2>
      <p className="text-on-surface-variant mb-4 text-sm">Every change is a new row; the database refuses edits to past rows.</p>
      <ol className="border-outline-variant ml-2 border-l-2">
        {a.history.map((h) => (
          <li key={h.id} className="relative pb-5 pl-6">
            <span className="bg-primary absolute top-1.5 -left-[7px] h-3 w-3 rounded-full" />
            <p className="font-semibold">{h.old_status ? `${h.old_status} → ${h.new_status}` : h.new_status}</p>
            <p className="text-on-surface-variant text-sm">
              {h.note} · {formatDate(h.changed_at)} {formatTime(h.changed_at)}{h.changed_by_name ? ` · by ${h.changed_by_name}` : ''}
            </p>
          </li>
        ))}
      </ol>
    </Wrapper>
  );
}

function Wrapper({ admin, children }) {
  return admin ? <div>{children}</div> : <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 md:py-16">{children}</div>;
}
