import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthShell from '../components/AuthShell';
import TextField from '../components/TextField';
import { Alert } from '../components/PageStates';

export default function SignUp() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next');

  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [fields, setFields] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setFields({});
    try {
      await register(form);
      const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null;
      navigate(safeNext || '/account');
    } catch (err) {
      setFields(err.fields || {});
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      description="Free to join. Book sessions with any FitLean trainer."
      footer={<>Already a member? <Link to="/sign-in" className="text-primary font-semibold underline">Sign in</Link></>}
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        {error && <Alert>{error}</Alert>}
        <TextField label="Full name" name="fullName" value={form.fullName} onChange={change} error={fields.fullName} required autoComplete="name" />
        <TextField label="Email address" name="email" type="email" value={form.email} onChange={change} error={fields.email} required autoComplete="email" />
        <TextField label="Phone (optional)" name="phone" type="tel" value={form.phone} onChange={change} error={fields.phone} autoComplete="tel" />
        <TextField label="Password" name="password" type="password" value={form.password} onChange={change} error={fields.password} required autoComplete="new-password" />
        <p className="text-on-surface-variant -mt-3 text-xs">At least 8 characters, with a letter and a number.</p>
        <button type="submit" disabled={busy}
          className="bg-primary text-on-primary font-label-caps text-label-caps hover:bg-secondary-fixed hover:text-primary min-h-[48px] w-full cursor-pointer rounded transition-colors disabled:opacity-50">
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  );
}
