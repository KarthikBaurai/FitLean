import { Link } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { Loading, ErrorMessage } from '../../components/PageStates';
import { AdminHeader } from './AdminLayout';

const card = 'bg-surface-container-lowest border-outline-variant rounded-xl border p-5';

export default function Dashboard() {
  const { data, loading, error, reload } = useFetch('/stats');

  return (
    <>
      <AdminHeader title="Dashboard" description="Bookings, trainers and enquiries at a glance." />
      {loading && <Loading />}
      {error && <ErrorMessage error={error} onRetry={reload} />}
      {data && (
        <>
          <ul className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            {[
              ['Upcoming sessions', data.totals.upcoming, '/admin/appointments?status=confirmed'],
              ['All appointments', data.totals.appointments, '/admin/appointments'],
              ['Members', data.totals.members, '/admin/members'],
              ['Active trainers', data.totals.trainers, '/admin/trainers'],
              ['New enquiries', data.totals.new_enquiries, '/admin/enquiries'],
            ].map(([label, value, to]) => (
              <li key={label}>
                <Link to={to} className={`${card} hover:border-primary block`}>
                  <span className="text-on-surface-variant block text-sm">{label}</span>
                  <span className="font-headline-md text-headline-md text-primary mt-2 block">{Number(value).toLocaleString('en-IN')}</span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            <section className={card}>
              <h2 className="font-headline-md text-headline-md text-primary mb-4">Busiest trainers (last 30 days)</h2>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-outline-variant border-b"><th className="py-2">Trainer</th><th>Sessions</th><th>Hours</th></tr>
                </thead>
                <tbody>
                  {data.byTrainer.map((t) => (
                    <tr key={t.id} className="border-outline-variant border-b">
                      <td className="py-2">{t.name}</td>
                      <td>{t.sessions}</td>
                      <td>{(t.minutes / 60).toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className={card}>
              <h2 className="font-headline-md text-headline-md text-primary mb-4">Appointments by status</h2>
              <ul className="flex flex-col gap-3">
                {data.byStatus.map((s) => {
                  const pct = data.totals.appointments ? (s.count / data.totals.appointments) * 100 : 0;
                  return (
                    <li key={s.status}>
                      <div className="flex justify-between text-sm"><span className="capitalize">{s.status}</span><span>{s.count.toLocaleString('en-IN')}</span></div>
                      <div className="bg-surface-container-high mt-1 h-2 rounded"><div className="bg-primary h-2 rounded" style={{ width: `${pct}%` }} /></div>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        </>
      )}
    </>
  );
}
