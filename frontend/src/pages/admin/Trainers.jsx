import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { useFetch } from '../../hooks/useFetch';
import { Loading, ErrorMessage, Empty, Alert } from '../../components/PageStates';
import { AdminHeader, buttonClass } from './AdminLayout';

export default function Trainers() {
  const { data: trainers, loading, error, reload } = useFetch('/trainers?includeInactive=true');
  const [message, setMessage] = useState(null);

  async function deactivate(t) {
    if (!window.confirm(`Deactivate ${t.name}? They will disappear from the website.`)) return;
    try {
      await api(`/trainers/${t.id}`, { method: 'DELETE' });
      setMessage({ tone: 'success', text: `${t.name} was deactivated.` });
      reload();
    } catch (err) {
      setMessage({ tone: 'error', text: err.message });
    }
  }

  return (
    <>
      <AdminHeader title="Trainers" description="Add, edit or deactivate trainers.">
        <Link to="/admin/trainers/new" className={buttonClass}>Add trainer</Link>
      </AdminHeader>
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      {loading && <Loading />}
      {error && <ErrorMessage error={error} onRetry={reload} />}
      {trainers && trainers.length === 0 && <Empty>No trainers yet.</Empty>}
      {trainers && trainers.length > 0 && (
        <div className="border-outline-variant overflow-x-auto rounded-xl border">
          <table className="bg-surface-container-lowest w-full min-w-[640px] text-left text-sm">
            <thead className="bg-surface-container-low">
              <tr><th className="p-3">Name</th><th>Branch</th><th>Specialisations</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {trainers.map((t) => (
                <tr key={t.id} className="border-outline-variant border-t">
                  <td className="p-3"><p className="font-semibold">{t.name}</p><p className="text-outline">{t.title}</p></td>
                  <td>{t.branch_name}</td>
                  <td>{t.specializations.map((s) => s.name).join(', ') || '—'}</td>
                  <td>{t.is_active ? 'Active' : <span className="text-outline">Inactive</span>}</td>
                  <td className="space-x-3 pr-3 text-right whitespace-nowrap">
                    <Link to={`/admin/trainers/${t.id}/edit`} className="text-primary underline">Edit</Link>
                    {t.is_active && <button onClick={() => deactivate(t)} className="text-error cursor-pointer underline">Deactivate</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
