import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  Stethoscope,
  X,
  Phone,
  MapPin,
  Sparkles,
  TriangleAlert,
  ImageOff,
  Locate,
  CircleCheck,
  CircleAlert,
  Info,
} from 'lucide-react';
import { Alert, Button, Badge } from './ui.jsx';
import { URGENCY_META } from './constants.js';
import { api } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const CATEGORY_LABEL = {
  stray: 'Stray animal',
  lost: 'Lost pet',
  injured: 'Injured animal',
};

/**
 * The Gemini vision call plus the Overpass lookup regularly takes ten to twenty
 * seconds. A bare spinner for that long reads as a hang, so the wait is broken
 * into the steps actually being attempted.
 */
const ANALYSIS_STEPS = [
  'Reading the photo and description',
  'Judging how urgent this looks',
  'Listing safe first aid steps',
  'Looking up clinics near you',
];

/** Icon per urgency level, so severity is readable before the word is. */
const URGENCY_ICON = {
  low: CircleCheck,
  moderate: Info,
  high: CircleAlert,
  critical: TriangleAlert,
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

  const panelRef = useRef(null);
  const fileInputRef = useRef(null);

  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [coords, setCoords] = useState({ latitude: '', longitude: '' });
  const [result, setResult] = useState(null);
  // Analysis and geolocation are separate operations. Sharing one flag made the
  // submit button spin while only the location permission prompt was open,
  // which read as though the analysis had already started.
  const [analysing, setAnalysing] = useState(false);
  const [locating, setLocating] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');

  // Escape closes the panel, the body behind it stops scrolling, and focus is
  // moved into the dialog and handed back on close. Without this the slide over
  // is a keyboard trap that only the overlay button can leave.
  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = 'hidden';

    panelRef.current?.focus();

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onDismiss();
      }
    }

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [onDismiss]);

  // The preview is a blob URL owned by this component. It is revoked on
  // replace, on remove and now on unmount, so dismissing the panel with a photo
  // still attached does not pin the file in memory for the life of the page.
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  // Advances the progress line while the model is thinking, and stops dead when
  // it is not, so the label never races ahead of the real work.
  useEffect(() => {
    if (!analysing) return undefined;

    setStep(0);
    const timer = setInterval(() => {
      setStep((current) => Math.min(current + 1, ANALYSIS_STEPS.length - 1));
    }, 3500);

    return () => clearInterval(timer);
  }, [analysing]);

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

  function clearPhoto() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview('');
    // Lets the same file be chosen again: otherwise the input still holds the
    // old selection and re-picking it fires no change event.
    if (fileInputRef.current) fileInputRef.current.value = '';
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

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        });
        setError('');
        setLocating(false);
        toast.success('Location captured');
      },
      () => {
        setError('Location permission was declined. You can still use the AI summary.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function runAnalysis() {
    setError('');

    if (!file && !description.trim()) {
      setError('Add a photo or describe the animal first.');
      return;
    }

    setAnalysing(true);
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
      setAnalysing(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    runAnalysis();
  }

  const triage = result?.triage;
  const urgency = URGENCY_META[triage?.urgency] ?? URGENCY_META.moderate;
  const UrgencyIcon = URGENCY_ICON[triage?.urgency] ?? Info;
  const firstAid = triage?.firstAid ?? [];
  const nearby = result?.nearby ?? [];

  /*
   * Mounted into document.body on purpose.
   *
   * This panel is opened from the Navbar, whose header sets `backdrop-blur`.
   * `backdrop-filter` creates a containing block for `position: fixed`
   * descendants, so mounted inline the overlay's `inset-0` resolved against the
   * roughly 64px navbar strip instead of the viewport. The panel was squeezed
   * into that strip, which clipped the heading, and the dismiss overlay never
   * covered the page behind it. A portal lifts the panel out of that context.
   */
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="triage-panel-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onDismiss}
        aria-label="Close AI triage"
        tabIndex={-1}
      />

      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative flex h-full w-full max-w-lg flex-col overflow-hidden bg-white shadow-2xl outline-none"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-emerald-900 px-5 py-4 text-white">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-800">
              <Stethoscope className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 id="triage-panel-title" className="text-lg font-bold">
                AI Animal Triage
              </h2>
              <p className="mt-0.5 text-sm text-emerald-100">
                Describe the animal and get help deciding what to do
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded-lg p-1.5 text-white/80 transition-colors hover:bg-emerald-800 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {!result && (
            <form onSubmit={handleSubmit} className="space-y-4">
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
                      className="h-48 w-full rounded-xl border border-slate-200 object-cover object-[center_25%]"
                    />
                    <Button type="button" variant="secondary" size="sm" onClick={clearPhoto}>
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
                      ref={fileInputRef}
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

              <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-700">
                    Share your location to find nearby clinics
                  </p>
                  {coords.latitude ? (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-emerald-700">
                      <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      Location captured
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-slate-500">Optional</p>
                  )}
                </div>
                {coords.latitude ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setCoords({ latitude: '', longitude: '' })}
                  >
                    Clear
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="shrink-0"
                    onClick={locate}
                    loading={locating}
                  >
                    {!locating && <Locate className="h-4 w-4" aria-hidden="true" />}
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
                    onClick={runAnalysis}
                    disabled={analysing}
                  >
                    Try again
                  </Button>
                </div>
              )}

              {analysing && (
                <div
                  className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"
                  role="status"
                  aria-live="polite"
                >
                  <p className="flex items-center gap-2 text-sm font-bold text-emerald-900">
                    <Bot className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {ANALYSIS_STEPS[step]}
                  </p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-emerald-200">
                    <div
                      className="h-full rounded-full bg-emerald-600 transition-all duration-700"
                      style={{
                        width: `${((step + 1) / ANALYSIS_STEPS.length) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="mt-2.5 text-xs text-emerald-800/80">
                    This usually takes ten to twenty seconds. Nothing is sent to
                    an NGO, and you can close this panel without losing your photo
                    or description.
                  </p>
                </div>
              )}

              <Button type="submit" className="w-full" loading={analysing}>
                {!analysing && <Bot className="h-4 w-4" aria-hidden="true" />}
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
              {/*
                Urgency used to be one chip in a row of chips, competing with a
                stray label and a confidence note. Someone standing on a road
                with an injured animal should be able to read the severity
                before anything else on the card, so it gets its own band.
              */}
              <div className={`rounded-xl border p-4 ${urgency.band}`}>
                <div className="flex items-center gap-2">
                  <UrgencyIcon className={`h-5 w-5 shrink-0 ${urgency.icon}`} aria-hidden="true" />
                  <p className={`text-sm font-bold uppercase tracking-wide ${urgency.heading}`}>
                    {urgency.fullLabel}
                  </p>
                </div>
              </div>

              {/*
                Placed directly under the urgency band. It used to sit at the
                very bottom, after the clinic list, which is the one place on
                this screen where nobody would read it in time.
              */}
              {triage.urgency === 'critical' && (
                <div className="flex gap-2.5 rounded-xl bg-red-600 p-3.5 text-sm text-white">
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

              <div className="rounded-xl border border-slate-200 p-4">
                {preview && (
                  <img
                    src={preview}
                    alt="Photo that was analysed"
                    className="mb-4 h-40 w-full rounded-lg border border-slate-200 object-cover object-[center_25%]"
                  />
                )}

                <div className="flex flex-wrap items-center gap-2">
                  {triage.looksStray && (
                    <Badge className="bg-slate-100 text-slate-700 ring-slate-200">
                      Looks like a stray
                    </Badge>
                  )}
                  {/*
                    Confidence is the most important caveat on the whole panel,
                    so it is called out in words rather than left as a lowercase
                    fragment after a chip.
                  */}
                  {triage.confidence && (
                    <span className="text-xs text-slate-500">
                      AI is{' '}
                      <strong className="font-semibold text-slate-700">
                        {triage.confidence} confidence
                      </strong>{' '}
                      in this reading
                    </span>
                  )}
                </div>

                {triage.likelySituation && (
                  <h3 className="mt-3 text-base font-bold text-slate-900">
                    {triage.likelySituation}
                  </h3>
                )}

                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  {triage.summary}
                </p>

                {!preview && file && (
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                    <ImageOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    The photo preview was released to free memory and is no
                    longer shown here.
                  </p>
                )}
              </div>

              {firstAid.length > 0 && (
                <div className="rounded-xl bg-emerald-50 p-4">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-900">
                    <Stethoscope className="h-4 w-4" aria-hidden="true" />
                    What you can do now
                  </h3>
                  <ol className="mt-2.5 space-y-2">
                    {firstAid.map((step, index) => (
                      <li key={step} className="flex gap-2.5 text-sm text-emerald-900">
                        <span
                          className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-600 text-[11px] font-bold text-white"
                          aria-hidden="true"
                        >
                          {index + 1}
                        </span>
                        <span className="leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
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

              <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-500">
                {result.disclaimer}
              </p>
            </div>
          )}
        </div>

        {result && (
          <footer className="shrink-0 space-y-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
            <p className="text-xs text-slate-600">
              The AI suggests a{' '}
              <strong>{CATEGORY_LABEL[triage.suggestedCategory]}</strong>{' '}
              report. You can change everything before it goes to an NGO.
            </p>
            <div className="flex gap-2">
              {/*
                Keeps the photo and the description. The button used to be
                called "Start over" and cleared the text, so nudging one word in
                a long description meant typing it all again.
              */}
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setResult(null)}
              >
                Edit and retry
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  onUseDraft(result);
                  onDismiss();
                  navigate(`/report/${triage.suggestedCategory}`);
                }}
              >
                Continue to report
              </Button>
            </div>
          </footer>
        )}
      </div>
    </div>,
    document.body
  );
}
