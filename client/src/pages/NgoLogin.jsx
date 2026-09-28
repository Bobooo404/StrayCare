import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Building2, LogIn, Home } from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import { Alert, Button, Card, Input } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function NgoLogin() {
  const { loginNgo } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const redirectTo = location.state?.from ?? '/ngo/dashboard';

  function update(field) {
    return (event) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
      setError('');
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const ngo = await loginNgo(form);
      toast.success(`Signed in as ${ngo.name}`);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="grid w-full gap-10 lg:grid-cols-2 lg:items-center">
          <div className="hidden lg:block">
            <span className="mb-6 grid h-14 w-14 place-items-center rounded-xl bg-emerald-700 text-white">
              <Building2 className="h-7 w-7" aria-hidden="true" />
            </span>
            <h1 className="text-3xl font-bold leading-tight text-slate-900">
              NGO Rescue Dashboard
            </h1>
            <p className="mt-3 max-w-md text-slate-600">
              Review incoming stray, lost and injured reports, claim the cases nearest to you
              and keep the reporter updated as the rescue progresses.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                One combined feed across stray, lost and injured reports
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                Atomic case claiming, so two NGOs never take the same animal
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                Pending, in progress and completed counts at a glance
              </li>
            </ul>
          </div>

          <Card className="w-full p-8">
            <div className="mb-6 text-center">
              <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-700 lg:hidden">
                <Building2 className="h-6 w-6" aria-hidden="true" />
              </span>
              <h1 className="text-2xl font-bold text-slate-900">Organisation sign in</h1>
              <p className="mt-1 text-sm text-slate-500">
                Access is limited to registered animal welfare organisations.
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
                label="Organisation email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={update('email')}
                placeholder="contact@organisation.org"
              />

              <Input
                id="password"
                label="Password"
                type="password"
                autoComplete="current-password"
                required
                value={form.password}
                onChange={update('password')}
                placeholder="Your password"
              />

              <Button type="submit" size="lg" loading={loading} className="w-full">
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Sign in to dashboard
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              Are you a pet owner or rescuer?{' '}
              <Link to="/login" className="font-semibold text-emerald-700 hover:underline">
                User sign in
              </Link>
            </p>

            <div className="mt-6 border-t border-slate-100 pt-6 text-center">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
              >
                <Home className="h-4 w-4" aria-hidden="true" />
                Back to the public site
              </Link>
            </div>

            {import.meta.env.DEV && (
              <div className="mt-6 rounded-lg bg-slate-50 p-4 text-xs text-slate-600 ring-1 ring-slate-200">
                <p className="font-semibold uppercase tracking-wide text-slate-500">
                  Seeded demo logins
                </p>
                <p className="mt-1.5">contact@gaawt.org / ngo12345</p>
                <p>help@coastalpaws.org / ngo12345</p>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
