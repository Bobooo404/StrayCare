import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  Loader2,
  Stethoscope,
  X,
  Phone,
  MapPin,
  Sparkles,
  TriangleAlert,
  Check,
} from 'lucide-react';
import { Alert, Button, Badge } from './ui.jsx';
import { api } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const URGENCY_META = {
  low: { label: 'Low', tone: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  moderate: { label: 'Moderate', tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  high: { label: 'High', tone: 'bg-orange-50 text-orange-800 ring-orange-200' },
  critical: {
    label: 'Critical',
    tone: 'bg-red-50 text-red-800 ring-red-200',
  },
};

const CATEGORY_LABEL = {
  stray: 'Stray animal',
  lost: 'Lost pet',
  injured: 'Injured animal',
};

/**
 * AI triage panel.
 *
 * The AI never submits anything. It reads the photo and description, returns a
 * summary, and the reporter edits and confirms it. Only then does the form send
 * an ordinary report, so an NGO claims a normal case through the normal flow.
 */
export default function AiTriagePanel({ onUseDraft, onDismiss }) {
  const navigate = useNavigate();
  const toast = useToast();

  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [coords, setCoords] = useState({ latitude: '', longitude: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleFile(event) {
    const selected = event.target.files?.[0];
    if (!selected) return;

    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setError('Use a JPG, PNG or WebP image');
      return;
    }
    if (selected.size > MAX_IMAGE_BYTES) {
      setError('Image must be 5 MB or smaller');
      return;
    }

    setError('');
    setFile(selected);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(selected));
  }

  /**
   * Asked for location only once the AI is about to be used, so the browser
   * permission prompt appears in response to a real user action.
   */
  function locate() {
    if (!navigator.geolocation) {
      setError('Your browser cannot share a location, so nearby clinics are unavailable.');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        });
        setError('');
        setLoading(false);
        toast.success('Location captured');
      },
      () => {
        setError('Location permission was declined. You can still use the AI summary.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleAnalyse(event) {
    event.preventDefault();
    setError('');

    if (!file && !description.trim()) {
      setError('Add a photo or describe the animal first.');
      return;
    }

    setLoading(true);
    const body = new FormData();
    if (file) body.append('image', file);
    if (description.trim()) body.append('description', description.trim());
    if (coords.latitude && coords.longitude) {
      body.append('latitude', coords.latitude);
      body.append('longitude', coords.longitude);
    }

    try {
      const response = await api.ai.triage(body);
      setResult(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const urgency = URGENCY_META[result?.triage.urgency] ?? URGENCY_META.moderate;
  const nearby = result?.nearby ?? [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="AI animal triage">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onDismiss}
        aria-label="Close AI triage"
      />

      <div className="relative flex h-full w-full max-w-lg flex-col overflow-hidden bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-emerald-900 px-5 py-4 text-white">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-800">
              <Stethoscope className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-bold">AI Animal Triage</h2>
              <p className="mt-0.5 text-sm text-emerald-100">
                Describe the animal and get help deciding what to do
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-emerald-800 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {!result && (
            <form onSubmit={handleAnalyse} className="space-y-4">
              <div>
                <label
                  htmlFor="triage-photo"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Photo of the animal
                </label>
                {preview ? (
                  <div className="space-y-3">
                    <img
                      src={preview}
                      alt="Selected animal"
                      className="h-48 w-full rounded-xl object-cover object-[center_25%]"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        URL.revokeObjectURL(preview);
                        setFile(null);
                        setPreview('');
                      }}
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                      Remove photo
                    </Button>
                  </div>
                ) : (
                  <label
                    htmlFor="triage-photo"
                    className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center transition-colors hover:border-emerald-500 hover:bg-emerald-50/40"
                  >
                    <Sparkles className="h-6 w-6 text-emerald-600" aria-hidden="true" />
                    <span className="text-sm font-semibold text-slate-700">
                      Add a clear photo
                    </span>
                    <span className="text-xs text-slate-500">
                      A photo focused on the animal gives a far better result
                    </span>
                    <input
                      id="triage-photo"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFile}
                      className="sr-only"
                    />
                  </label>
                )}
              </div>

              <div>
                <label
                  htmlFor="triage-description"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  What is happening?
                </label>
                <textarea
                  id="triage-description"
                  rows={4}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="For example: lying under a scooter on the road, bleeding from the front leg, does not move when approached"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                />
              </div>

              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-700">
                  Share your location to find nearby clinics
                </p>
                {coords.latitude ? (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-emerald-700">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    Location captured, searching near you
                  </p>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="mt-2"
                    onClick={locate}
                    disabled={loading}
                  >
                    Use my location
                  </Button>
                )}
              </div>

              {error && (
                <div className="space-y-2">
                  <Alert>{error}</Alert>
                  {/*
                    The free tier of the Gemini API fails roughly half of all
                    calls, so a retry that keeps the photo and description
                    already entered is the difference between a dead end and
                    a two second recovery.
                  */}
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    onClick={handleAnalyse}
                    disabled={loading}
                  >
                    Try again
                  </Button>
                </div>
              )}

              <Button type="submit" className="w-full" loading={loading}>
                {!loading && <Bot className="h-4 w-4" aria-hidden="true" />}
                Analyse with AI
              </Button>

              <p className="text-xs leading-relaxed text-slate-500">
                This gives a first impression only. It is not a veterinary
                diagnosis, and nothing is sent to an NGO until you review and
                submit the report yourself.
              </p>
            </form>
          )}

          {result && (
            <div className="space-y-5">
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={urgency.tone}>
                    {urgency.label} urgency
                  </Badge>
                  {result.triage.looksStray && (
                    <Badge className="bg-slate-100 text-slate-700 ring-slate-200">
                      Looks like a stray
                    </Badge>
                  )}
                  <span className="text-xs text-slate-500">
                    {result.triage.confidence} confidence
                  </span>
                </div>

                {result.triage.likelySituation && (
                  <h3 className="mt-3 text-base font-bold text-slate-900">
                    {result.triage.likelySituation}
                  </h3>
                )}

                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  {result.triage.summary}
                </p>
              </div>

              {result.triage.firstAid.length > 0 && (
                <div className="rounded-xl bg-emerald-50 p-4">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-900">
                    <Stethoscope className="h-4 w-4" aria-hidden="true" />
                    What you can do now
                  </h3>
                  <ul className="mt-2 space-y-1.5">
                    {result.triage.firstAid.map((step) => (
                      <li key={step} className="flex gap-2 text-sm text-emerald-900">
                        <Check
                          className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                          aria-hidden="true"
                        />
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Nearby clinics within 20 km
                </h3>
                  {result.nearbyError && (
                <Alert tone="info" className="mt-2">
                  {result.nearbyError}
                </Alert>
              )}
                {!result.nearbyError && nearby.length === 0 && (
                  <p className="mt-2 text-sm text-slate-600">
                    No clinics are mapped in this area yet. Try searching the
                    name of your nearest veterinary hospital, or ask a local
                    shopkeeper, as many are known by name only.
                  </p>
                )}
                {nearby.length > 0 && (
                  <>
                    <p className="mt-1 text-xs text-slate-500">
                      OpenStreetMap coverage in India is thin, and vet clinics
                      are often tagged as general clinics. Call ahead to check
                      they treat animals.
                    </p>
                    <ul className="mt-3 space-y-2">
                      {nearby.map((place) => (
                        <li
                          key={place.id}
                          className="rounded-lg border border-slate-200 p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {place.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {place.distanceKm} km away
                                {place.kind === 'shelter' ? ' · shelter' : ''}
                              </p>
                            </div>
                            {place.phoneUrl ? (
                              <a
                                href={place.phoneUrl}
                                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-700 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-800"
                              >
                                <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                                Call
                              </a>
                            ) : (
                              <span className="shrink-0 text-xs text-slate-400">
                                No number listed
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              {result.triage.urgency === 'critical' && (
                <div className="flex gap-2.5 rounded-xl bg-red-50 p-3.5 text-sm text-red-900 ring-1 ring-red-200">
                  <TriangleAlert
                    className="mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <p>
                    This looks urgent. Contact a vet or an animal welfare
                    organisation now rather than waiting on this form.
                  </p>
                </div>
              )}

              <p className="text-xs leading-relaxed text-slate-500">
                {result.disclaimer}
              </p>
            </div>
          )}
        </div>

        {result && (
          <footer className="space-y-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
            <p className="text-xs text-slate-600">
              The AI suggests a{' '}
              <strong>{CATEGORY_LABEL[result.triage.suggestedCategory]}</strong>{' '}
              report. You can change everything before it goes to an NGO.
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setResult(null);
                  setDescription('');
                }}
              >
                Start over
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  onUseDraft(result);
                  onDismiss();
                  navigate(`/report/${result.triage.suggestedCategory}`);
                }}
              >
                Continue to report
              </Button>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
