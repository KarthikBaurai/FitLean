import { useState } from 'react';
import { api, formatDate } from '../../api';
import { useFetch } from '../../hooks/useFetch';
import { Loading, ErrorMessage, Empty, Alert } from '../../components/PageStates';
import StatusBadge from '../../components/StatusBadge';
import { AdminHeader, inputClass } from './AdminLayout';

export default function Enquiries() {
  const [status, setStatus] = useState('');
  const { data: enquiries, loading, error, reload } = useFetch(`/enquiries${status ? `?status=${status}` : ''}`);
  const [message, setMessage] = useState(null);

  async function update(e, newStatus) {
    try {
      await api(`/enquiries/${e.id}`, { method: 'PATCH', body: { status: newStatus } });
      reload();
    } catch (err) {
      setMessage(err.message);
    }
  }

  return (
    <>
      <AdminHeader title="Enquiries" description="Messages sent from the contact form." />
      {message && <Alert>{message}</Alert>}
      <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputClass} mb-6`}>
        <option value="">All</option>
        <option value="new">New</option>
        <option value="contacted">Contacted</option>
        <option value="closed">Closed</option>
      </select>

      {loading && <Loading />}
      {error && <ErrorMessage error={error} onRetry={reload} />}
      {enquiries && enquiries.length === 0 && <Empty>No enquiries here.</Empty>}
      {enquiries && enquiries.length > 0 && (
        <ul className="flex flex-col gap-4">
          {enquiries.map((e) => (
            <li key={e.id} className="bg-surface-container-lowest border-outline-variant rounded-xl border p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{e.full_name} <span className="text-outline font-normal">· {e.email}{e.phone ? ` · ${e.phone}` : ''}</span></p>
                  <p className="text-outline text-sm">{e.goal} · {formatDate(e.created_at)}</p>
                </div>
                <StatusBadge status={e.status} />
              </div>
              <p className="mt-3 whitespace-pre-line">{e.message}</p>
              <div className="mt-4 flex gap-4 text-sm">
                {['new', 'contacted', 'closed'].filter((s) => s !== e.status).map((s) => (
                  <button key={s} onClick={() => update(e, s)} className="text-primary cursor-pointer underline">Mark {s}</button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
