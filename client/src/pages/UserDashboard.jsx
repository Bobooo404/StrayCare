import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  FileText,
  Clock,
  Loader2,
  HeartHandshake,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Home,
} from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import ReportCard from '../components/ReportCard.jsx';
import StatCard from '../components/StatCard.jsx';
import { Button, Card, EmptyState, PageLoader, Select } from '../components/ui.jsx';
import { CATEGORY_META, REPORT_CATEGORIES } from '../components/constants.js';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const PAGE_SIZE = 9;

export default function UserDashboard() {
  const { account } = useAuth();

  const [reports, setReports] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.reports.mine({ category, page, limit: PAGE_SIZE });
      setReports(result.data.reports);
      setMeta(result.meta);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [category, page]);

  useEffect(() => {
    load();
  }, [load]);

  function handleCategoryChange(event) {
    setCategory(event.target.value);
    setPage(1);
  }

  // Counts are derived from what is on screen, which is enough for a
  // personal summary without adding another request.
  const counts = {
    total: meta.total,
    pending: reports.filter((report) => report.status === 'pending').length,
    ongoing: reports.filter((report) => report.status === 'ongoing').length,
    completed: reports.filter((report) => report.status === 'completed').length,
  };

  // Taken from the signed-in account, so any user who registers sees their own
  // name. Falls back to a neutral greeting if the name is ever missing.
  const displayName = account?.fullname?.trim() || 'User';
  const firstName = displayName.split(/\s+/)[0];

  return (
    <div className="page-background min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Hello, {firstName}</h1>
            <p className="mt-1.5 text-slate-600">
              Track every report you have submitted and see how each rescue is progressing.
            </p>
          </div>

          <Button onClick={load} className="sm:hidden" variant="secondary">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
        </div>

        <section aria-label="Report summary" className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total reports" value={counts.total} icon={FileText} />
          <StatCard label="Awaiting an NGO" value={counts.pending} icon={Clock} tone="amber" />
          <StatCard label="Rescue in progress" value={counts.ongoing} icon={Loader2} tone="sky" />
          <StatCard label="Resolved" value={counts.completed} icon={HeartHandshake} tone="emerald" />
        </section>

        <section aria-label="Create a report" className="mb-10">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900">What did you come across?</h2>
            <p className="mt-1 text-sm text-slate-500">
              Pick the option that fits best. A nearby NGO is notified as soon as you submit.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {REPORT_CATEGORIES.map((item) => {
                const meta = CATEGORY_META[item];
                return (
                  <Link
                    key={item}
                    to={`/report/${item}`}
                    className="group flex flex-col rounded-xl border border-slate-200 p-5 transition hover:border-emerald-500 hover:shadow-md"
                  >
                    <span className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-100">
                      <Plus className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="font-semibold text-slate-900">{meta.label}</span>
                    <span className="mt-1.5 text-sm text-slate-500">{meta.description}</span>
                  </Link>
                );
              })}
            </div>
          </Card>
        </section>

        <section aria-label="My reports">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold text-slate-900">My reports</h2>

            <div className="flex items-center gap-3">
              <Select
                id="category-filter"
                aria-label="Filter by report type"
                value={category}
                onChange={handleCategoryChange}
                placeholder="All report types"
                options={REPORT_CATEGORIES.map((item) => ({
                  value: item,
                  label: CATEGORY_META[item].label,
                }))}
                className="w-56"
              />

              <Button
                variant="ghost"
                size="sm"
                onClick={load}
                className="hidden sm:inline-flex"
                aria-label="Refresh reports"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Refresh
              </Button>
            </div>
          </div>

          {error && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
              {error}{' '}
              <button type="button" onClick={load} className="underline">
                Try again
              </button>
            </div>
          )}

          {loading ? (
            <PageLoader label="Loading your reports" />
          ) : reports.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={category ? 'No reports in this category' : 'No reports yet'}
              description={
                category
                  ? 'Try another filter, or submit a new report of this type.'
                  : 'When you report a stray, lost or injured animal it will appear here so you can follow the rescue.'
              }
              action={
                <Button onClick={() => setCategory('')}>
                  {category ? 'Show all reports' : 'Create your first report'}
                </Button>
              }
            />
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {reports.map((report) => (
                  <ReportCard key={`${report.category}-${report._id}`} report={report} />
                ))}
              </div>

              {meta.totalPages > 1 && (
                <nav
                  className="mt-8 flex items-center justify-between border-t border-slate-200 pt-5"
                  aria-label="Report pages"
                >
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={meta.page <= 1}
                    onClick={() => setPage((current) => current - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    Previous
                  </Button>

                  <span className="text-sm text-slate-600">
                    Page {meta.page} of {meta.totalPages}
                  </span>

                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={meta.page >= meta.totalPages}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </nav>
              )}
            </>
          )}
        </section>
      </main>

      <footer className="mt-10 border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 text-sm text-slate-500 sm:flex-row sm:justify-between">
          <p>StrayCare - animal rescue, coordinated.</p>
          <Link to="/" className="inline-flex items-center gap-1.5 hover:text-slate-800">
            <Home className="h-4 w-4" aria-hidden="true" />
            Public site
          </Link>
        </div>
      </footer>
    </div>
  );
}
