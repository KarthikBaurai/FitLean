import { useState } from 'react';
import { formatDate } from '../../api';
import { useFetch } from '../../hooks/useFetch';
import { Loading, ErrorMessage, Empty } from '../../components/PageStates';
import { AdminHeader, inputClass } from './AdminLayout';

export default function Members() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useFetch(`/users?page=${page}&search=${encodeURIComponent(query)}`);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  function submit(e) {
    e.preventDefault();
    setPage(1);
    setQuery(search);
  }

  return (
    <>
      <AdminHeader title="Members" description={data ? `${data.total.toLocaleString('en-IN')} accounts` : ''} />
      <form onSubmit={submit} className="mb-6 flex flex-wrap gap-3">
        <input aria-label="Search by name or email" placeholder="Search by name or email" value={search}
          onChange={(e) => setSearch(e.target.value)} className={`${inputClass} w-72`} />
        <button className="border-outline-variant min-h-[44px] cursor-pointer rounded border px-4">Search</button>
      </form>

      {loading && <Loading />}
      {error && <ErrorMessage error={error} onRetry={reload} />}
      {data && data.total === 0 && <Empty>No accounts match “{query}”.</Empty>}
      {data && data.total > 0 && (
        <>
          <div className="border-outline-variant overflow-x-auto rounded-xl border">
            <table className="bg-surface-container-lowest w-full min-w-[640px] text-left text-sm">
              <thead className="bg-surface-container-low">
                <tr><th className="p-3">Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Bookings</th><th>Upcoming</th></tr>
              </thead>
              <tbody>
                {data.users.map((u) => (
                  <tr key={u.id} className="border-outline-variant border-t">
                    <td className="p-3 font-semibold">{u.full_name}</td>
                    <td>{u.email}</td>
                    <td className="capitalize">{u.role}</td>
                    <td>{formatDate(u.created_at)}</td>
                    <td>{u.total_bookings}</td>
                    <td>{u.upcoming_bookings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="cursor-pointer underline disabled:opacity-40">Previous</button>
            <span className="text-sm">Page {page} of {pages}</span>
            <button disabled={page >= pages} onClick={() => setPage(page + 1)} className="cursor-pointer underline disabled:opacity-40">Next</button>
          </div>
        </>
      )}
    </>
  );
}
