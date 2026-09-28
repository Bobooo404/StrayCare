import { NavLink, Link, useNavigate } from 'react-router-dom';
import { PawPrint, LogOut, Menu, X, Building2, Home, Stethoscope } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAiDraft } from '../context/AiDraftContext.jsx';
import { Button } from './ui.jsx';
import AiTriagePanel from './AiTriagePanel.jsx';

/**
 * Nav links have to be colour-aware.
 *
 * The NGO portal uses a dark `emerald-900` header, so the light-mode slate
 * colours were rendering near-invisible dark grey text on dark green.
 */
function getLinkClass(isDark) {
  return ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive
        ? isDark
          ? 'bg-emerald-800 text-white'
          : 'bg-emerald-50 text-emerald-800'
        : isDark
          ? 'text-emerald-100 hover:bg-emerald-800 hover:text-white'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;
}

export default function Navbar({ variant = 'light' }) {
  const { isAuthenticated, isNgo, account, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const { setDraft, aiAvailable } = useAiDraft();

  const isDark = variant === 'dark';
  const linkClass = getLinkClass(isDark);

  // Triage helps someone decide whether and how to report, so it belongs to
  // signed in people only. An NGO has no use for it, and a signed out visitor
  // cannot submit the report it produces.
  const showAi = isAuthenticated && !isNgo && aiAvailable;

  async function handleLogout() {
    await logout();
    toast.success('You have been signed out');
    setOpen(false);
    navigate('/');
  }

  const links = isNgo
    ? [{ to: '/ngo/dashboard', label: 'Dashboard' }]
    : isAuthenticated
      ? [
          { to: '/dashboard', label: 'Dashboard' },
          { to: '/adoptions', label: 'Adopt' },
          { to: '/adopt/mine', label: 'My listings' },
        ]
      : [
          { to: '/login', label: 'Sign in' },
          { to: '/register', label: 'Create account' },
        ];

  // An NGO is already inside the portal, so the "NGO portal" call to action is
  // only offered to signed out visitors.
  const showPortalCta = !isAuthenticated;

  return (
    <header
      className={`sticky top-0 z-40 border-b ${
        isDark
          ? 'border-emerald-800 bg-emerald-900 text-white'
          : 'border-slate-200 bg-white/90 text-slate-800 backdrop-blur'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <span
            className={`grid h-9 w-9 place-items-center rounded-lg ${
              isDark ? 'bg-emerald-800' : 'bg-emerald-700'
            }`}
          >
            <PawPrint className="h-5 w-5 text-white" aria-hidden="true" />
          </span>
          <span className="text-lg font-bold tracking-tight">StrayCare</span>
          {isNgo && (
            <span
              className={`ml-1 hidden rounded-full px-2.5 py-0.5 text-xs font-semibold sm:inline ${
                isDark ? 'bg-emerald-800 text-emerald-100' : 'bg-emerald-50 text-emerald-800'
              }`}
            >
              NGO Portal
            </span>
          )}
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} className={linkClass}>
              {link.label}
            </NavLink>
          ))}

          {isNgo && (
            <NavLink to="/" className={linkClass} end>
              <Home className="mr-1.5 inline h-4 w-4" aria-hidden="true" />
              Home
            </NavLink>
          )}

          {showAi && (
            <button
              type="button"
              onClick={() => setAiOpen(true)}
              className={`ml-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                isDark
                  ? 'bg-emerald-700 text-white hover:bg-emerald-600'
                  : 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <Stethoscope className="h-4 w-4" aria-hidden="true" />
              AI Triage
            </button>
          )}

          {showPortalCta && (
            <NavLink
              to="/ngo/login"
              className="ml-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
            >
              <Building2 className="h-4 w-4" aria-hidden="true" />
              NGO Portal
            </NavLink>
          )}

          {isAuthenticated && (
            <div
              className={`ml-3 flex items-center gap-3 border-l pl-3 ${
                isDark ? 'border-emerald-700' : 'border-slate-200'
              }`}
            >
              <span
                className={`hidden max-w-[12rem] truncate text-sm lg:inline ${
                  isDark ? 'text-emerald-50' : 'text-slate-600'
                }`}
                title={account?.fullname || account?.name}
              >
                {account?.fullname || account?.name}
              </span>
              <Button
                variant={isDark ? 'greenDark' : 'green'}
                size="sm"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </Button>
            </div>
          )}
        </nav>

        <button
          type="button"
          className={`rounded-lg p-2 md:hidden ${isDark ? 'hover:bg-emerald-800' : 'hover:bg-slate-100'}`}
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label="Toggle navigation menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div
          className={`border-t px-4 py-3 md:hidden ${
            isDark ? 'border-emerald-800 bg-emerald-900' : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={linkClass}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </NavLink>
            ))}

            {isNgo && (
              <NavLink to="/" className={linkClass} end onClick={() => setOpen(false)}>
                <Home className="mr-1.5 inline h-4 w-4" aria-hidden="true" />
                Home
              </NavLink>
            )}

            {showAi && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setAiOpen(true);
                }}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold ${
                  isDark
                    ? 'text-emerald-200 hover:bg-emerald-800'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <Stethoscope className="h-4 w-4" aria-hidden="true" />
                AI Triage
              </button>
            )}

            {showPortalCta && (
              <NavLink
                to="/ngo/login"
                className={linkClass}
                onClick={() => setOpen(false)}
              >
                <Building2 className="mr-1.5 inline h-4 w-4" aria-hidden="true" />
                NGO Portal
              </NavLink>
            )}

            {isAuthenticated && (
              <>
                <p
                  className={`mt-2 border-t px-3 pt-3 text-xs ${
                    isDark ? 'border-emerald-800 text-emerald-200' : 'border-slate-100 text-slate-500'
                  }`}
                >
                  Signed in as {account?.fullname || account?.name}
                </p>
                <button
                  type="button"
                  onClick={handleLogout}
                  className={`mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold ${
                    isDark
                      ? 'text-emerald-300 hover:bg-emerald-800'
                      : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {aiOpen && (
        <AiTriagePanel onUseDraft={setDraft} onDismiss={() => setAiOpen(false)} />
      )}
    </header>
  );
}
