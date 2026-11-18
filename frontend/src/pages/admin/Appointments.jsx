import { Link, useSearchParams } from 'react-router-dom';
import { formatDate, formatTime } from '../../api';
import { useFetch } from '../../hooks/useFetch';
import { Loading, ErrorMessage, Empty } from '../../components/PageStates';
import StatusBadge from '../../components/StatusBadge';
import { AdminHeader, inputClass } from './AdminLayout';

// All appointments, filtered and paginated on the server
// (GET /api/appointments?status=&trainerId=&date=&page=).
export default function Appointments() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const trainerId = params.get('trainerId') || '';
  const date = params.get('date') || '';
  const page = Number(params.get('page') || 1);

  const query = new URLSearchParams({ page });
  if (status) query.set('status', status);
  if (trainerId) query.set('trainerId', trainerId);
  if (date) query.set('date', date);

  const { data, loading, error, reload } = useFetch(`/appointments?${query}`);
  const { data: trainers } = useFetch('/trainers?includeInactive=true');
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  // Changing a filter goes back to page 1.
  function setFilter(name, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    next.delete('page');
    setParams(next);
  }

  function goTo(p) {
    const next = new URLSearchParams(params);
    next.set('page', p);
    setParams(next);
  }

  return (
    <>
      <AdminHeader title="Appointments" description={data ? `${data.total.toLocaleString('en-IN')} matching appointments` : ''} />

      <div className="mb-6 flex flex-wrap gap-3">
        <select aria-label="Status" value={status} onChange={(e) => setFilter('status', e.target.value)} className={inputClass}>
          <option value="">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select aria-label="Trainer" value={trainerId} onChange={(e) => setFilter('trainerId', e.target.value)} className={inputClass}>
          <option value="">All trainers</option>
          {trainers?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <input aria-label="Date" type="date" value={date} onChange={(e) => setFilter('date', e.target.value)} className={inputClass} />
        {(status || trainerId || date) && (
          <button onClick={() => setParams({})} className="cursor-pointer px-2 underline">Clear filters</button>
        )}
      </div>

      {loading && <Loading />}
      {error && <ErrorMessage error={error} onRetry={reload} />}
      {data && data.total === 0 && <Empty>No appointments match these filters.</Empty>}
      {data && data.total > 0 && (
        <>
          <div className="border-outline-variant overflow-x-auto rounded-xl border">
            <table className="bg-surface-container-lowest w-full min-w-[700px] text-left text-sm">
              <thead className="bg-surface-container-low">
                <tr>
                  <th className="p-3">#</th><th>When</th><th>Trainer</th><th>Member</th><th>Length</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.appointments.map((a) => (
                  <tr key={a.id} className="border-outline-variant hover:bg-surface-container-low border-t">
                    <td className="p-3"><Link to={`/admin/appointments/${a.id}`} className="text-primary underline">{a.id}</Link></td>
                    <td>{formatDate(a.starts_at)} {formatTime(a.starts_at)}</td>
                    <td>{a.trainer_name}</td>
                    <td>{a.member_name}</td>
                    <td>{a.duration_minutes} min</td>
                    <td><StatusBadge status={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <button disabled={page <= 1} onClick={() => goTo(page - 1)} className="cursor-pointer underline disabled:opacity-40">Previous</button>
            <span className="text-sm">Page {page} of {pages}</span>
            <button disabled={page >= pages} onClick={() => goTo(page + 1)} className="cursor-pointer underline disabled:opacity-40">Next</button>
          </div>
        </>
      )}
    </>
  );
}
