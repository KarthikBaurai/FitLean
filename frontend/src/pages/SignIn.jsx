import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthShell from '../components/AuthShell';
import TextField from '../components/TextField';
import { Alert } from '../components/PageStates';

export default function SignIn() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next');

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const user = await login(form.email, form.password);
      // Only follow internal links ("/..."), never another website.
      const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null;
      navigate(safeNext || (user.role === 'admin' ? '/admin' : '/account'));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Sign in"
      description="Book and manage your training sessions."
      footer={<>New to FitLean? <Link to={`/sign-up${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="text-primary font-semibold underline">Create an account</Link></>}
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        {error && <Alert>{error}</Alert>}
        <TextField label="Email address" name="email" type="email" value={form.email} onChange={change} required autoComplete="email" />
        <TextField label="Password" name="password" type="password" value={form.password} onChange={change} required autoComplete="current-password" />
        <button type="submit" disabled={busy}
          className="bg-primary text-on-primary font-label-caps text-label-caps hover:bg-secondary-fixed hover:text-primary min-h-[48px] w-full cursor-pointer rounded transition-colors disabled:opacity-50">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  );
}
