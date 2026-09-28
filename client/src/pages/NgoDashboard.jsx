import { useCallback, useEffect, useState } from 'react';
import {
  Search,
  RefreshCw,
  Hand,
  CheckCircle2,
  Loader2,
  Inbox,
  ChevronLeft,
  ChevronRight,
  Filter,
  MapPin,
  Phone,
  Save,
  X,
} from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import StatCard from '../components/StatCard.jsx';
import { Alert, Badge, Button, Card, PageLoader, Select, Textarea } from '../components/ui.jsx';
import {
  CATEGORY_META,
  REPORT_CATEGORIES,
  REPORT_STATUSES,
  STATUS_META,
  animalLabel,
  formatDateTime,
  openMap,
} from '../components/constants.js';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const PAGE_SIZE = 9;

const ASSIGNED_OPTIONS = [
  { value: '', label: 'All cases' },
  { value: 'none', label: 'Unclaimed only' },
  { value: 'me', label: 'Assigned to me' },
];

/** Card for the NGO feed: shows the reporter's contact and case actions. */
function NgoReportCard({ report, onClaim, onStatus, busy }) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [notes, setNotes] = useState(report.rescueNotes ?? '');
  const [nextStatus, setNextStatus] = useState(report.status);

  const isMine = Boolean(report.assignedNGO);
  const status = STATUS_META[report.status] ?? STATUS_META.pending;
  const hasCoords = Array.isArray(report.location?.coordinates);

  return (
    <Card className="flex flex-col p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <Badge className="bg-slate-100 text-slate-700 ring-slate-200">
              {CATEGORY_META[report.category]?.label ?? report.category}
            </Badge>
            <Badge className={status.chip}>{status.label}</Badge>
          </div>
          <h3 className="font-semibold leading-snug text-slate-900">{report.title}</h3>
        </div>
      </div>

      <p className="line-clamp-3 text-sm text-slate-600">{report.description}</p>

      <dl className="mt-4 space-y-1.5 text-sm">
        <div className="flex items-center gap-2 text-slate-600">
          <span className="font-medium text-slate-500">Reporter:</span>
          <span className="truncate">{report.reporterName}</span>
        </div>

        <div className="flex items-center gap-2 text-slate-600">
          <Phone className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <a
            href={`tel:${String(report.contact).replace(/\s/g, '')}`}
            className="font-medium text-emerald-700 hover:underline"
          >
            {report.contact}
          </a>
        </div>

        {report.address && (
          <div className="flex items-start gap-2 text-slate-600">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              {hasCoords ? (
                <button
                  type="button"
                  onClick={() => openMap(report.location.coordinates, report.address)}
                  className="text-left text-emerald-700 hover:underline"
                >
                  {report.address}
                </button>
              ) : (
                report.address
              )}
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-slate-500">
          <span>{animalLabel(report.animalType)}</span>
          <span>{formatDateTime(report.dateReported)}</span>
        </div>
      </dl>

      {report.rescueNotes && (
        <div className="mt-3 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Rescue notes
          </p>
          <p className="mt-1 text-sm text-slate-700">{report.rescueNotes}</p>
        </div>
      )}

      {report.assignedNGO && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900 ring-1 ring-emerald-200">
          Assigned to <strong>{report.assignedNGO.name}</strong>
        </p>
      )}

      <div className="mt-auto space-y-3 border-t border-slate-100 pt-4">
        {!isMine ? (
          <Button
            size="sm"
            className="w-full"
            loading={busy === `claim:${report._id}`}
            onClick={() => onClaim(report, notes)}
          >
            <Hand className="h-4 w-4" aria-hidden="true" />
            {notes ? 'Claim with note' : 'Claim this case'}
          </Button>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Select
                id={`status-${report._id}`}
                aria-label="New status"
                value={nextStatus}
                onChange={(event) => setNextStatus(event.target.value)}
                options={REPORT_STATUSES.map((item) => ({
                  value: item,
                  label: STATUS_META[item].label,
                }))}
                className="flex-1"
              />
              <Button
                size="sm"
                loading={busy === `status:${report._id}`}
                onClick={() => onStatus(report, nextStatus, notes)}
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                Update
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => setNoteOpen((open) => !open)}
            >
              {noteOpen ? (
                <>
                  <X className="h-4 w-4" aria-hidden="true" />
                  Hide notes
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" aria-hidden="true" />
                  {report.rescueNotes ? 'Edit rescue notes' : 'Add rescue notes'}
                </>
              )}
            </Button>

            {noteOpen && (
              <Textarea
                id={`notes-${report._id}`}
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="What did your team find and do?"
              />
            )}
          </>
        )}
      </div>
    </Card>
  );
}

export default function NgoDashboard() {
  const { account } = useAuth();
  const toast = useToast();

  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState(null);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({ category: '', status: '', assigned: '' });
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [feed, counters] = await Promise.all([
        api.ngo.reports({ ...filters, q: query, page, limit: PAGE_SIZE }),
        api.ngo.stats(),
      ]);
      setReports(feed.data.reports);
      setMeta(feed.meta);
      setStats(counters.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, query, page]);

  useEffect(() => {
    load();
  }, [load]);

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
    setPage(1);
  }

  function setFilter(field) {
    return (event) => updateFilter(field, event.target.value);
  }

  async function handleClaim(report, notes) {
    setBusy(`claim:${report._id}`);
    try {
      const result = await api.ngo.claim(report.category, report._id, notes);
      toast.success(result.message);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy('');
    }
  }

  async function handleStatus(report, status, notes) {
    setBusy(`status:${report._id}`);
    try {
      const result = await api.ngo.setStatus(report.category, report._id, {
        status,
        notes,
      });
      toast.success(result.message);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar variant="dark" />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{account?.name}</h1>
            <p className="mt-1.5 text-slate-600">
              {account?.serviceArea ? `Service area: ${account.serviceArea}` : 'Rescue dashboard'}
            </p>
          </div>

          <Button variant="secondary" onClick={load}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
        </div>

        {stats && (
          <section aria-label="Case summary" className="mb-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="All cases" value={stats.totals.total} icon={Inbox} />
              <StatCard
                label="Awaiting rescue"
                value={stats.totals.pending}
                icon={Loader2}
                tone="amber"
              />
              <StatCard
                label="In progress"
                value={stats.totals.ongoing}
                icon={Hand}
                tone="sky"
              />
              <StatCard
                label="Completed"
                value={stats.totals.completed}
                icon={CheckCircle2}
                tone="emerald"
              />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {REPORT_CATEGORIES.map((category) => {
                const bucket = stats.byCategory[category];
                return (
                  <div
                    key={category}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <p className="text-sm font-semibold text-slate-700">
                      {CATEGORY_META[category].label}
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">{bucket.total}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {bucket.pending} pending - {bucket.ongoing} ongoing - {bucket.completed}{' '}
                      done
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section aria-label="Filters" className="mb-6">
          <Card className="p-5">
            <div className="grid gap-4 lg:grid-cols-4">
              <form
                className="lg:col-span-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  setPage(1);
                  setQuery(search.trim());
                }}
              >
                <label
                  htmlFor="search"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Search reports
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <input
                      id="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Title, description or address"
                      className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                    />
                  </div>
                  <Button type="submit">Search</Button>
                </div>
              </form>

              <Select
                id="filter-category"
                label="Report type"
                value={filters.category}
                onChange={setFilter('category')}
                placeholder="All types"
                options={REPORT_CATEGORIES.map((item) => ({
                  value: item,
                  label: CATEGORY_META[item].label,
                }))}
              />

              <Select
                id="filter-status"
                label="Status"
                value={filters.status}
                onChange={setFilter('status')}
                placeholder="All statuses"
                options={REPORT_STATUSES.map((item) => ({
                  value: item,
                  label: STATUS_META[item].label,
                }))}
              />

              <Select
                id="filter-assigned"
                label="Assignment"
                value={filters.assigned}
                onChange={setFilter('assigned')}
                options={ASSIGNED_OPTIONS}
              />

              {filters.assigned !== 'me' && (
                <div className="flex items-end">
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => updateFilter('assigned', 'me')}
                  >
                    <Filter className="h-4 w-4" aria-hidden="true" />
                    Show my cases
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </section>

        {error && (
          <div className="mb-5">
            <Alert>{error}</Alert>
          </div>
        )}

        {loading ? (
          <PageLoader label="Loading cases" />
        ) : reports.length === 0 ? (
          <Card className="p-12 text-center">
            <Inbox className="mx-auto mb-3 h-12 w-12 text-slate-300" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-slate-800">No cases match these filters</h2>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
              Try widening the status or assignment filter.
            </p>
            <Button
              variant="secondary"
              className="mt-5"
              onClick={() => {
                setFilters({ category: '', status: '', assigned: '' });
                setQuery('');
                setSearch('');
                setPage(1);
              }}
            >
              Clear filters
            </Button>
          </Card>
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {reports.map((report) => (
                <NgoReportCard
                  key={`${report.category}-${report._id}`}
                  report={report}
                  onClaim={handleClaim}
                  onStatus={handleStatus}
                  busy={busy}
                />
              ))}
            </div>

            {meta.totalPages > 1 && (
              <nav
                className="mt-8 flex items-center justify-between border-t border-slate-200 pt-5"
                aria-label="Case pages"
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
                  Page {meta.page} of {meta.totalPages} - {meta.total} cases
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
      </main>
    </div>
  );
}
