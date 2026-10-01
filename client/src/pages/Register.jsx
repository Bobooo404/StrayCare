import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, User as UserIcon, Mail, Lock, Phone } from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import { Alert, Button, Card, Input } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const EMPTY = { fullname: '', email: '', phone: '', password: '', confirm: '' };

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function update(field) {
    return (event) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
      setFieldErrors((current) => ({ ...current, [field]: undefined }));
    };
  }

  const passwordsMatch = form.confirm === '' || form.confirm === form.password;

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (form.password !== form.confirm) {
      setFieldErrors({ confirm: 'Passwords do not match' });
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      const user = await register({
        fullname: form.fullname,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      toast.success(`Welcome to StrayCare, ${user.fullname}`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
      setFieldErrors(err.errors ?? {});
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-background min-h-screen">
      <Navbar />

      <main className="mx-auto flex max-w-md flex-col px-4 py-12 sm:py-16">
        <Card className="p-8">
          <div className="mb-6 text-center">
            <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-700">
              <UserPlus className="h-6 w-6" aria-hidden="true" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
            <p className="mt-1 text-sm text-slate-500">
              Report animals in distress and follow the rescue progress.
            </p>
          </div>

          {error && (
            <div className="mb-5">
              <Alert>{error}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              id="fullname"
              label="Full name"
              autoComplete="name"
              required
              value={form.fullname}
              onChange={update('fullname')}
              error={fieldErrors.fullname}
              placeholder="Your full name"
            />

            <Input
              id="email"
              label="Email address"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={update('email')}
              error={fieldErrors.email}
              placeholder="you@example.com"
            />

            <Input
              id="phone"
              label="Phone number"
              type="tel"
              autoComplete="tel"
              required
              value={form.phone}
              onChange={update('phone')}
              error={fieldErrors.phone ?? fieldErrors.contact}
              hint="Use an NGO-callable number. Digits, spaces, + and - only."
              placeholder="+91 98220 11223"
            />

            <Input
              id="password"
              label="Password"
              type="password"
              autoComplete="new-password"
              required
              value={form.password}
              onChange={update('password')}
              error={fieldErrors.password}
              hint="At least 8 characters, including a letter and a number."
              placeholder="user12345"
            />

            <Input
              id="confirm"
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              required
              value={form.confirm}
              onChange={update('confirm')}
              error={!passwordsMatch ? 'Passwords do not match' : fieldErrors.confirm}
              placeholder="Repeat your password"
            />

            <Button type="submit" size="lg" loading={loading} className="w-full">
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Create account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-emerald-700 hover:underline">
              Sign in
            </Link>
          </p>

          <div className="mt-6 border-t border-slate-100 pt-6">
            <p className="flex items-start gap-2 text-xs text-slate-500">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              Your session is stored in a secure httpOnly cookie. StrayCare never stores your
              password in readable form.
            </p>
            <p className="mt-2 flex items-start gap-2 text-xs text-slate-500">
              <Phone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              Your phone number is shared with the NGO handling a case you report.
            </p>
            <p className="mt-2 flex items-start gap-2 text-xs text-slate-500">
              <UserIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                Organisation accounts use the{' '}
                <Link to="/ngo/login" className="font-semibold text-emerald-700 hover:underline">
                  NGO portal
                </Link>
                .
              </span>
            </p>
            <p className="mt-2 flex items-start gap-2 text-xs text-slate-500">
              <Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              Contact details are only used for rescue coordination.
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
}
