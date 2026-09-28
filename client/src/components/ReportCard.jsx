import { useState } from 'react';
import {
  MapPin,
  Phone,
  Camera,
  User,
  Cross,
  Navigation,
} from 'lucide-react';
import { Button, Card, StatusBadge, Textarea } from './ui.jsx';
import AiTriageSummary from './AiTriageSummary.jsx';
import { CATEGORY_META, animalLabel, formatDateTime, openMap, STATUS_META } from './constants.js';

/** Small placeholder shown when a report has no photo. */
function ImagePlaceholder({ label }) {
  return (
    <div className="flex h-48 w-full items-center justify-center bg-slate-100 text-slate-400">
      <Camera className="h-8 w-8" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export default function ReportCard({ report, actions }) {
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);

  const category = CATEGORY_META[report.category] ?? CATEGORY_META.stray;
  const status = STATUS_META[report.status] ?? STATUS_META.pending;
  const hasLocation = Array.isArray(report.location?.coordinates);

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="relative">
        {report.imageUrl ? (
          <img
            src={report.imageUrl}
            alt={report.title}
            loading="lazy"
            className="h-48 w-full object-cover"
          />
        ) : (
          <ImagePlaceholder label={`No photo for ${report.title}`} />
        )}

        <div className="absolute left-3 top-3 flex gap-2">
          <span className="rounded-full bg-slate-900/75 px-2.5 py-1 text-xs font-semibold text-white">
            {category.label}
          </span>
        </div>

        <div className="absolute right-3 top-3">
          <StatusBadge status={report.status} />
        </div>
      </div>

        <div className="flex flex-1 flex-col gap-3 p-5">
          {report.aiTriage && <AiTriageSummary triage={report.aiTriage} />}

          <div>
            <h3 className="font-semibold leading-snug text-slate-900">{report.title}</h3>
            <p className="mt-1.5 line-clamp-3 text-sm text-slate-600">{report.description}</p>
          </div>

        <dl className="space-y-1.5 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <dt className="sr-only">Reported by</dt>
            <dd className="truncate">{report.reporterName}</dd>
          </div>

          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <dt className="sr-only">Contact</dt>
            <dd>
              <a
                href={`tel:${String(report.contact).replace(/\s/g, '')}`}
                className="hover:text-emerald-700 hover:underline"
              >
                {report.contact}
              </a>
            </dd>
          </div>

          {report.address && (
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              <dt className="sr-only">Location</dt>
              <dd className="min-w-0 flex-1">
                {hasLocation ? (
                  <button
                    type="button"
                    onClick={() => openMap(report.location.coordinates, report.address)}
                    className="text-left hover:text-emerald-700 hover:underline"
                  >
                    {report.address}
                  </button>
                ) : (
                  report.address
                )}
              </dd>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Cross className="h-3.5 w-3.5" aria-hidden="true" />
              {animalLabel(report.animalType)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
              {formatDateTime(report.dateReported)}
            </span>
          </div>
        </dl>

        {report.rescueNotes && (
          <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Rescue notes
            </p>
            <p className="mt-1 text-sm text-slate-700">{report.rescueNotes}</p>
          </div>
        )}

        {report.assignedNGO ? (
          <div className="rounded-lg bg-emerald-50 p-3 ring-1 ring-emerald-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Handled by
            </p>
            <p className="mt-0.5 text-sm font-semibold text-emerald-900">
              {report.assignedNGO.name}
            </p>
            {report.assignedNGO.phone && (
              <a
                href={`tel:${String(report.assignedNGO.phone).replace(/\s/g, '')}`}
                className="text-sm text-emerald-700 hover:underline"
              >
                {report.assignedNGO.phone}
              </a>
            )}
          </div>
        ) : (
          <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <span className={`h-2 w-2 rounded-full ${status.dot}`} aria-hidden="true" />
              Awaiting an NGO to take this case
            </span>
          </div>
        )}

        {actions && (
          <div className="mt-auto space-y-3 border-t border-slate-100 pt-4">
            {showNotes && (
              <Textarea
                id="rescue-notes"
                label="Rescue notes"
                rows={3}
                placeholder="Add a note about the rescue for your records..."
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            )}

            <div className="flex flex-wrap gap-2">
              {actions({ notes, setNotes, showNotes, setShowNotes })}
              {showNotes && (
                <Button variant="ghost" size="sm" onClick={() => setShowNotes(false)}>
                  Cancel note
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
