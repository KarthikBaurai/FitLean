import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import TextField from '../components/TextField';
import { Alert } from '../components/PageStates';
import { PHOTOS } from '../photos';

const GOALS = ['Weight Loss', 'Muscle Gain', 'General Fitness', 'Strength', 'Rehabilitation', 'Other'];

export default function Contact() {
  const [params] = useSearchParams();
  const plan = params.get('plan');
  const empty = {
    fullName: '',
    email: '',
    phone: '',
    goal: 'General Fitness',
    message: plan ? `I would like to know more about the ${plan} plan.` : '',
  };

  // Controlled form: every input's value lives in this state object.
  const [form, setForm] = useState(empty);
  const [fields, setFields] = useState({});
  const [status, setStatus] = useState({ type: 'idle', message: '' });

  function change(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function submit(e) {
    e.preventDefault(); // stay on the page: no full reload
    setStatus({ type: 'sending', message: '' });
    setFields({});
    try {
      const res = await api('/enquiries', { method: 'POST', body: form });
      setStatus({ type: 'success', message: res.message });
      setForm(empty);
    } catch (err) {
      setFields(err.fields || {});
      setStatus({ type: 'error', message: err.message });
    }
  }

  return (
    <div className="max-w-container-max px-margin-mobile md:px-margin-desktop mx-auto grid gap-12 py-16 md:grid-cols-2 md:py-24">
      <div>
        <p className="font-label-caps text-label-caps text-on-surface-variant tracking-widest uppercase">Contact</p>
        <h1 className="font-headline-lg-mobile md:text-headline-lg text-headline-lg-mobile text-primary mt-2 font-black">
          Book a free consultation
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant mt-4 max-w-md">
          Tell us about your goals. A coach will call or email you to plan your first session.
        </p>
        <img
          src={PHOTOS.contact.src}
          alt={PHOTOS.contact.alt}
          loading="lazy"
          className="placeholder-art border-outline-variant mt-10 hidden h-80 w-full rounded-lg border object-cover md:block"
        />
      </div>

      <form onSubmit={submit} noValidate className="bg-surface-container-lowest border-outline-variant flex flex-col gap-5 rounded-xl border p-6 sm:p-8">
        {status.type === 'success' && <Alert tone="success">{status.message}</Alert>}
        {status.type === 'error' && <Alert>{status.message}</Alert>}

        <TextField label="Full name" name="fullName" value={form.fullName} onChange={change} error={fields.fullName} required maxLength={100} />
        <TextField label="Email" name="email" type="email" value={form.email} onChange={change} error={fields.email} required />
        <TextField label="Phone (optional)" name="phone" type="tel" value={form.phone} onChange={change} error={fields.phone} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="field-goal" className="text-on-surface text-sm font-semibold">Main goal *</label>
          <select id="field-goal" name="goal" value={form.goal} onChange={change}
            className="bg-surface-container-lowest border-outline-variant min-h-[44px] rounded-lg border px-4">
            {GOALS.map((g) => <option key={g}>{g}</option>)}
          </select>
          {fields.goal && <p role="alert" className="text-error text-xs font-medium">{fields.goal}</p>}
        </div>
        <TextField label="Message" name="message" type="textarea" rows={5} value={form.message} onChange={change} error={fields.message} required maxLength={2000} />

        <button type="submit" disabled={status.type === 'sending'}
          className="bg-primary text-on-primary font-label-caps text-label-caps hover:bg-secondary-fixed hover:text-primary min-h-[48px] cursor-pointer rounded px-6 transition-colors disabled:opacity-50">
          {status.type === 'sending' ? 'Sending…' : 'Send enquiry'}
        </button>
      </form>
    </div>
  );
}
