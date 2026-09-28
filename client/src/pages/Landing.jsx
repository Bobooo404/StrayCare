import { Link } from 'react-router-dom';
import {
  PawPrint,
  Heart,
  Search,
  MapPin,
  ShieldCheck,
  Building2,
  ArrowRight,
  Sparkles,
  HeartHandshake,
  Clock,
} from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import { Card } from '../components/ui.jsx';
import { CATEGORY_META, REPORT_CATEGORIES } from '../components/constants.js';
import { useAuth } from '../context/AuthContext.jsx';
import HeroSlideshow from '../components/HeroSlideshow.jsx';
import { api } from '../api/client.js';
import { useEffect, useState } from 'react';

const STEPS = [
  {
    icon: MapPin,
    title: 'Spot an animal in trouble',
    body: 'A stray, a missing pet or an injured animal on the roadside. Note the spot and describe what you saw.',
  },
  {
    icon: Search,
    title: 'Submit a report',
    body: 'Add a photo and your location if you can. The report is matched to nearby animal welfare organisations.',
  },
  {
    icon: HeartHandshake,
    title: 'An NGO takes the case',
    body: 'A registered organisation claims the report, attends to the animal and updates its status for you.',
  },
  {
    icon: Heart,
    title: 'Track it, or adopt',
    body: 'Follow the rescue progress from your dashboard, or find a pet that needs a home on the adoption board.',
  },
];

export default function Landing() {
  const { isAuthenticated, isNgo } = useAuth();
  const [memberCounts, setMemberCounts] = useState(null);

  useEffect(() => {
    let active = true;
    // Counts are decorative, so a failure just leaves them hidden rather than
    // showing a wrong number or an error.
    api
      .stats()
      .then(({ data }) => {
        if (active) setMemberCounts(data);
      })
      .catch(() => {
        if (active) setMemberCounts(null);
      });
    return () => {
      active = false;
    };
  }, []);

  const primaryCta = isNgo
    ? { to: '/ngo/dashboard', label: 'Open dashboard' }
    : isAuthenticated
      ? { to: '/dashboard', label: 'Go to my dashboard' }
      : { to: '/register', label: 'Create a free account' };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main>
        <section className="relative isolate overflow-hidden bg-emerald-900 text-white">
          <HeroSlideshow />

          <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-800 px-3.5 py-1.5 text-xs font-semibold ring-1 ring-emerald-700">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Report. Rescue. Reunite.
              </span>

              <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Every animal in trouble deserves a response.
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-emerald-50">
                StrayCare connects everyday people with registered animal welfare organisations.
                Report a stray, a lost pet or an injured animal, and track what happens next.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  to={primaryCta.to}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3.5 text-base font-semibold text-emerald-900 transition-colors hover:bg-emerald-50"
                >
                  {primaryCta.label}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>

                <Link
                  to="/adoptions"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-6 py-3.5 text-base font-semibold text-white ring-1 ring-emerald-600 transition-colors hover:bg-emerald-600"
                >
                  <PawPrint className="h-4 w-4" aria-hidden="true" />
                  Browse adoptable pets
                </Link>
              </div>

              {memberCounts && (
                <dl className="mt-12 flex flex-wrap gap-x-10 gap-y-4">
                  <div>
                    <dt className="text-sm text-emerald-100">People on StrayCare</dt>
                    <dd className="text-3xl font-bold tabular-nums">
                      {memberCounts.users.toLocaleString('en-IN')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-emerald-100">
                      Registered welfare organisations
                    </dt>
                    <dd className="text-3xl font-bold tabular-nums">
                      {memberCounts.ngos.toLocaleString('en-IN')}
                    </dd>
                  </div>
                </dl>
              )}
            </div>
          </div>
        </section>

        <section aria-label="What you can report" className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                Three kinds of reports, one system
              </h2>
              <p className="mt-3 text-lg text-slate-600">
                Each report type is tracked separately so NGOs can prioritise the ones that are
                most urgent.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {REPORT_CATEGORIES.map((category) => {
                const meta = CATEGORY_META[category];
                return (
                  <div
                    key={category}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <span className="mb-4 grid h-11 w-11 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                      <PawPrint className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="text-lg font-semibold text-slate-900">{meta.label}</h3>
                    <p className="mt-2 text-slate-600">{meta.description}</p>
                    {isAuthenticated ? (
                      <Link
                        to={`/report/${category}`}
                        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:underline"
                      >
                        File this report
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    ) : (
                      <Link
                        to="/register"
                        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:underline"
                      >
                        Sign up to report
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section aria-label="How it works" className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">How it works</h2>
              <p className="mt-3 text-lg text-slate-600">
                From the moment you notice an animal to the moment it is safe.
              </p>
            </div>

            <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, index) => (
                <li key={step.title} className="relative">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-emerald-700 text-white">
                    <step.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="mt-4 block text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    Step {index + 1}
                  </span>
                  <h3 className="mt-1.5 font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-label="For organisations" className="bg-slate-50">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <Card className="overflow-hidden">
              <div className="grid gap-8 p-8 sm:p-10 lg:grid-cols-2 lg:items-center">
                <div>
                  <span className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-emerald-700 text-white">
                    <Building2 className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                    For animal welfare organisations
                  </h2>
                  <p className="mt-3 text-slate-600">
                    One feed across stray, lost and injured reports, filtered by type, status and
                    location. Claim a case and it is locked to your team, so two NGOs never
                    respond to the same animal.
                  </p>

                  <ul className="mt-6 space-y-3 text-sm text-slate-600">
                    <li className="flex items-start gap-2.5">
                      <ShieldCheck
                        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
                        aria-hidden="true"
                      />
                      Case claiming is atomic, so a case cannot be taken twice
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Clock
                        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
                        aria-hidden="true"
                      />
                      Pending, in progress and completed counts update as you work
                    </li>
                    <li className="flex items-start gap-2.5">
                      <PawPrint
                        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
                        aria-hidden="true"
                      />
                      Reporter contact details are available once you take the case
                    </li>
                  </ul>

                  <Link
                    to="/ngo/login"
                    className="mt-8 inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
                  >
                    <Building2 className="h-4 w-4" aria-hidden="true" />
                    Sign in to the NGO portal
                  </Link>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
                  <p className="text-sm font-semibold text-slate-700">Live case board</p>

                  <div className="mt-4 space-y-3">
                    {[
                      { title: 'Cow hit by a vehicle on NH66', status: 'completed', tone: 'emerald' },
                      { title: 'Missing Indie dog Coco', status: 'ongoing', tone: 'sky' },
                      { title: 'Stray kitten family', status: 'pending', tone: 'amber' },
                    ].map((item) => (
                      <div
                        key={item.title}
                        className="flex items-center justify-between gap-3 rounded-lg bg-white p-3.5 ring-1 ring-slate-200"
                      >
                        <span className="truncate text-sm font-medium text-slate-800">
                          {item.title}
                        </span>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            item.tone === 'emerald'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.tone === 'sky'
                                ? 'bg-sky-100 text-sky-800'
                                : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {!isAuthenticated && (
          <section className="bg-white">
            <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
              <div className="rounded-2xl bg-emerald-700 px-8 py-12 text-center text-white">
                <h2 className="text-3xl font-bold tracking-tight">
                  See an animal that needs help?
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-emerald-50">
                  Creating an account takes under a minute and lets you follow the rescue
                  through to the end.
                </p>
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                  <Link
                    to="/register"
                    className="rounded-lg bg-white px-6 py-3.5 text-base font-semibold text-emerald-900 transition-colors hover:bg-emerald-50"
                  >
                    Create a free account
                  </Link>
                  <Link
                    to="/login"
                    className="rounded-lg bg-emerald-800 px-6 py-3.5 text-base font-semibold text-white ring-1 ring-emerald-600 transition-colors hover:bg-emerald-600"
                  >
                    I already have an account
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-700">
                <PawPrint className="h-5 w-5 text-white" aria-hidden="true" />
              </span>
              <span className="text-lg font-bold text-slate-800">StrayCare</span>
            </div>

            <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-600">
              <Link to="/" className="hover:text-slate-900">
                Home
              </Link>
              <Link to="/adoptions" className="hover:text-slate-900">
                Adopt
              </Link>
              <Link to="/register" className="hover:text-slate-900">
                Create account
              </Link>
              <Link to="/ngo/login" className="hover:text-slate-900">
                NGO portal
              </Link>
            </nav>
          </div>

          <p className="mt-8 text-center text-xs text-slate-500">
            In a real emergency, contact your local animal welfare service directly. StrayCare
            is a coordination tool and does not replace emergency care.
          </p>
        </div>
      </footer>
    </div>
  );
}
