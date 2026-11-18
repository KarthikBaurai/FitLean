import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api';
import { useFetch } from '../../hooks/useFetch';
import TextField from '../../components/TextField';
import { Loading, Alert } from '../../components/PageStates';
import { AdminHeader, buttonClass, inputClass } from './AdminLayout';

// Add (/admin/trainers/new) or edit (/admin/trainers/:id/edit) a trainer.
export default function TrainerForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: branches } = useFetch('/branches');
  const { data: specializations } = useFetch('/trainers/specializations');
  const { data: all } = useFetch(id ? '/trainers?includeInactive=true' : null);

  const [form, setForm] = useState({ name: '', title: '', bio: '', experienceYears: 0, branchId: '', specializationIds: [], isActive: true });
  const [fields, setFields] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // When editing, copy the trainer's current values into the form.
  useEffect(() => {
    const t = all?.find((x) => String(x.id) === id);
    if (t) {
      setForm({
        name: t.name, title: t.title, bio: t.bio || '', experienceYears: t.experience_years,
        branchId: t.branch_id, specializationIds: t.specializations.map((s) => s.id), isActive: t.is_active,
        slug: t.slug,
      });
    }
  }, [all, id]);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  function toggleSpecialization(sid) {
    const ids = form.specializationIds.includes(sid)
      ? form.specializationIds.filter((x) => x !== sid)
      : [...form.specializationIds, sid];
    setForm({ ...form, specializationIds: ids });
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setFields({});
    const body = { ...form, experienceYears: Number(form.experienceYears), branchId: Number(form.branchId) };
    try {
      await api(id ? `/trainers/${id}` : '/trainers', { method: id ? 'PUT' : 'POST', body });
      navigate('/admin/trainers');
    } catch (err) {
      setFields(err.fields || {});
      setError(err.message);
      setBusy(false);
    }
  }

  if (id && !all) return <Loading />;

  return (
    <>
      <AdminHeader title={id ? 'Edit trainer' : 'Add trainer'} />
      <form onSubmit={submit} noValidate className="bg-surface-container-lowest border-outline-variant flex max-w-2xl flex-col gap-5 rounded-xl border p-6">
        {error && <Alert>{error}</Alert>}
        <TextField label="Name" name="name" value={form.name} onChange={change} error={fields.name || fields.slug} required />
        <TextField label="Title" name="title" value={form.title} onChange={change} error={fields.title} required placeholder="e.g. Strength Coach · CSCS" />
        <TextField label="Bio" name="bio" type="textarea" rows={4} value={form.bio} onChange={change} error={fields.bio} />
        <TextField label="Years of experience" name="experienceYears" type="number" min={0} max={60} value={form.experienceYears} onChange={change} error={fields.experienceYears} required />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="field-branchId" className="text-sm font-semibold">Branch *</label>
          <select id="field-branchId" name="branchId" value={form.branchId} onChange={change} className={inputClass}>
            <option value="">Choose a branch</option>
            {branches?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          {fields.branchId && <p role="alert" className="text-error text-xs font-medium">{fields.branchId}</p>}
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Specialisations</legend>
          <div className="flex flex-wrap gap-3">
            {specializations?.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.specializationIds.includes(s.id)} onChange={() => toggleSpecialization(s.id)} />
                {s.name}
              </label>
            ))}
          </div>
        </fieldset>

        {id && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            Active (shown on the website and bookable)
          </label>
        )}
        {!id && <p className="text-on-surface-variant text-sm">New trainers work Monday to Saturday, 09:00 to 18:00.</p>}

        <div className="flex gap-3">
          <button type="submit" disabled={busy} className={buttonClass}>{busy ? 'Saving…' : 'Save trainer'}</button>
          <Link to="/admin/trainers" className="inline-flex items-center px-3 underline">Cancel</Link>
        </div>
      </form>
    </>
  );
}
