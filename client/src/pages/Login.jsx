import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogIn, Lock, User as UserIcon } from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import { Alert, Button, Card, Input } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const redirectTo = location.state?.from ?? '/dashboard';

  function update(field) {
    return (event) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
      setFieldErrors((current) => ({ ...current, [field]: undefined }));
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setFieldErrors({});
    setLoading(true);

    try {
      const user = await login(form);
      toast.success(`Welcome back, ${user.fullname}`);
      navigate(redirectTo, { replace: true });
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
              <LogIn className="h-6 w-6" aria-hidden="true" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900">Sign in</h1>
            <p className="mt-1 text-sm text-slate-500">
              Welcome back. Sign in to track your reports.
            </p>
          </div>

          {error && (
            <div className="mb-5">
              <Alert>{error}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
              id="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              value={form.password}
              onChange={update('password')}
              error={fieldErrors.password}
              placeholder="Your password"
            />

            <Button type="submit" size="lg" loading={loading} className="w-full">
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Sign in
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            New to StrayCare?{' '}
            <Link to="/register" className="font-semibold text-emerald-700 hover:underline">
              Create an account
            </Link>
          </p>

          <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-6 text-sm">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500">
              <UserIcon className="h-4 w-4" aria-hidden="true" />
            </span>
            <p className="text-slate-600">
              Are you an animal welfare organisation?{' '}
              <Link to="/ngo/login" className="font-semibold text-emerald-700 hover:underline">
                Use the NGO portal
              </Link>
            </p>
          </div>

          {import.meta.env.DEV && (
            <div className="mt-6 rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Seeded demo logins
              </p>
              <ul className="space-y-1.5 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <UserIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>User: straycare@example.com / user12345</span>
                </li>
                <li className="flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>NGO: contact@gaawt.org / ngo12345</span>
                </li>
              </ul>
              <p className="mt-2 text-xs text-slate-500">
                Run <code className="rounded bg-slate-200 px-1">npm run seed</code> in the
                server folder to create these accounts.
              </p>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
