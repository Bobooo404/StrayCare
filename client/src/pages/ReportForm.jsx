import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { PawPrint, Send, ImagePlus, X, Info } from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import LocationCapture from '../components/LocationCapture.jsx';
import { Alert, Button, Card, Input, Select, Textarea } from '../components/ui.jsx';
import { ANIMAL_TYPES, CATEGORY_META, REPORT_CATEGORIES } from '../components/constants.js';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAiDraft } from '../context/AiDraftContext.jsx';
import { Bot, TriangleAlert } from 'lucide-react';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const EMPTY = {
  title: '',
  description: '',
  animalType: 'dog',
  contact: '',
  address: '',
  latitude: '',
  longitude: '',
};

/** "Vehicle collision" becomes "Vehicle collision reported through StrayCare". */
function buildTitle(triage) {
  const situation = triage.likelySituation?.trim();
  const base = situation || 'Animal needs help';
  return `${base} reported through StrayCare`.slice(0, 120);
}

/**
 * Turns the AI output into report prose.
 *
 * The reporter edits this before submitting, so the AI wording is a starting
 * point rather than the final report. The description carries the triage
 * summary verbatim because that is the part an NGO actually needs to read.
 */
function buildDescription(triage) {
  const parts = [triage.summary];

  if (triage.firstAid?.length) {
    parts.push(`First aid advised: ${triage.firstAid.join(' ')}`);
  }

  parts.push('Submitted with AI triage assistance.');

  return parts.filter(Boolean).join('\n\n').slice(0, 2000);
}

export default function ReportForm() {
  const { category } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { account } = useAuth();
  const { draft, startOver } = useAiDraft();

  const meta = CATEGORY_META[category];

  const [form, setForm] = useState({ ...EMPTY, contact: account?.phone ?? '' });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Set when the reporter arrives from the AI panel. Held as state rather than
  // read straight from context so the form owns its own copy: editing a field
  // here must not rewrite the stored triage result, and the draft is cleared
  // once it has been applied.
  const [aiTriage, setAiTriage] = useState(null);

  // Object URLs are not garbage collected, so release the previous one
  // whenever the preview changes or the form unmounts. This hook must stay
  // above the early return below, because hooks cannot be conditional.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  /**
   * Applies a triage draft from the AI panel.
   *
   * Only the title, description and animal type are pre-filled. The category is
   * not switched: the reporter arrived on a specific report type, and quietly
   * moving them to a different one would be more surprising than helpful.
   */
  useEffect(() => {
    if (!draft?.triage) return;

    setAiTriage(draft.triage);
    startOver();

    setForm((current) => ({
      ...current,
      title: current.title || buildTitle(draft.triage),
      description: current.description || buildDescription(draft.triage),
      animalType: draft.triage.animalType || current.animalType,
    }));
    // `draft` is a single object identity, and `startOver` is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  // An unknown category in the URL should not render a broken form.
  if (!REPORT_CATEGORIES.includes(category) || !meta) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <main className="mx-auto max-w-2xl px-4 py-16 text-center">
          <Alert>That report type does not exist.</Alert>
          <Link to="/dashboard" className="mt-6 inline-block font-semibold text-emerald-700">
            Back to dashboard
          </Link>
        </main>
      </div>
    );
  }

  function update(field) {
    return (event) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
      setFieldErrors((current) => ({ ...current, [field]: undefined }));
    };
  }

  function handleFile(event) {
    const selected = event.target.files?.[0];
    if (!selected) return;

    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setFieldErrors((current) => ({ ...current, image: 'Use a JPG, PNG or WebP image' }));
      return;
    }
    if (selected.size > MAX_IMAGE_BYTES) {
      setFieldErrors((current) => ({ ...current, image: 'Image must be 5 MB or smaller' }));
      return;
    }

    setFieldErrors((current) => ({ ...current, image: undefined }));
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  function clearFile() {
    setFile(null);
    setPreview('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setFieldErrors({});
    setLoading(true);

    const body = new FormData();
    body.append('title', form.title);
    body.append('description', form.description);
    body.append('animalType', form.animalType);
    if (form.contact) body.append('contact', form.contact);
    if (form.address.trim()) body.append('address', form.address.trim());
    if (form.latitude !== '' && form.longitude !== '') {
      body.append('latitude', String(form.latitude));
      body.append('longitude', String(form.longitude));
    }

    /**
     * The triage block is sent field by field with bracket notation, because
     * multipart turns a nested object into string keys. The server re-validates
     * every one of these and falls back to a safe default for anything
     * unrecognised, so the reporter cannot smuggle in an arbitrary value.
     */
    if (aiTriage) {
      body.append('aiTriage[summary]', aiTriage.summary);
      if (aiTriage.likelySituation) {
        body.append('aiTriage[likelySituation]', aiTriage.likelySituation);
      }
      body.append('aiTriage[urgency]', aiTriage.urgency);
      aiTriage.firstAid.forEach((step) => body.append('aiTriage[firstAid][]', step));
      body.append('aiTriage[looksStray]', aiTriage.looksStray ? 'true' : 'false');
      body.append('aiTriage[confidence]', aiTriage.confidence);
      body.append('aiTriage[suggestedCategory]', category);
      body.append('aiTriage[animalType]', form.animalType);
      if (aiTriage.model) body.append('aiTriage[model]', aiTriage.model);
    }

    if (file) body.append('image', file);

    try {
      const result = await api.reports.create(category, body);
      toast.success(result.message);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
      setFieldErrors(err.errors ?? {});
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-3xl px-4 py-10 sm:py-12">
        <div className="mb-8">
          <Link to="/dashboard" className="text-sm font-medium text-emerald-700 hover:underline">
            Back to dashboard
          </Link>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">{meta.title}</h1>
          <p className="mt-2 text-slate-600">{meta.description}</p>
        </div>

        {aiTriage && (
          <Card className="mb-6 border-emerald-200 bg-emerald-50/60 p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-700 text-white">
                <Bot className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-bold text-emerald-900">
                    AI triage attached to this report
                  </h2>
                  {aiTriage.urgency === 'critical' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                      <TriangleAlert className="h-3 w-3" aria-hidden="true" />
                      Rated critical
                    </span>
                  )}
                </div>

                {aiTriage.likelySituation && (
                  <p className="mt-2 text-sm font-semibold text-emerald-900">
                    {aiTriage.likelySituation}
                  </p>
                )}

                <p className="mt-1.5 text-sm leading-relaxed text-emerald-900/90">
                  {aiTriage.summary}
                </p>

                {aiTriage.firstAid.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {aiTriage.firstAid.map((step) => (
                      <li key={step} className="text-sm text-emerald-900/80">
                        &middot; {step}
                      </li>
                    ))}
                  </ul>
                )}

                <p className="mt-3 text-xs leading-relaxed text-emerald-800/80">
                  An NGO will see this summary on the case. Edit the title and
                  description below if anything is wrong, and note that it is an
                  automated first impression rather than a veterinary
                  diagnosis.
                </p>

                <button
                  type="button"
                  onClick={() => setAiTriage(null)}
                  className="mt-3 text-xs font-semibold text-emerald-800 underline hover:text-emerald-900"
                >
                  Remove the AI summary from this report
                </button>
              </div>
            </div>
          </Card>
        )}

        {error && (
          <div className="mb-6">
            <Alert>{error}</Alert>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <Card className="p-6">
            <h2 className="mb-5 text-lg font-semibold text-slate-900">About the animal</h2>

            <div className="space-y-5">
              <Select
                id="animalType"
                label="Animal type"
                required
                value={form.animalType}
                onChange={update('animalType')}
                options={ANIMAL_TYPES}
                error={fieldErrors.animaltype ?? fieldErrors.animalType}
              />

              <Input
                id="title"
                label="Short title"
                required
                maxLength={120}
                value={form.title}
                onChange={update('title')}
                error={fieldErrors.title}
                hint={`${form.title.length}/120 - something a rescuer can scan quickly`}
                placeholder="Injured dog near Panjim bus stand"
              />

              <Textarea
                id="description"
                label="What did you see?"
                required
                rows={5}
                maxLength={2000}
                value={form.description}
                onChange={update('description')}
                error={fieldErrors.description}
                hint={`${form.description.length}/2000 - include condition, behaviour and any immediate danger`}
                placeholder="A brown mixed breed dog is limping badly near the east bus stand. It looks hurt and is scared of traffic."
              />
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-1 text-lg font-semibold text-slate-900">Photo</h2>
            <p className="mb-5 text-sm text-slate-500">
              Optional, but a photo helps an NGO identify the animal before arriving.
            </p>

            {preview ? (
              <div className="space-y-3">
                <img
                  src={preview}
                  alt="Selected report preview"
                  className="h-64 w-full rounded-xl object-cover"
                />
                <Button variant="secondary" size="sm" onClick={clearFile}>
                  <X className="h-4 w-4" aria-hidden="true" />
                  Remove photo
                </Button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center transition hover:border-emerald-500 hover:bg-emerald-50">
                <ImagePlus className="mb-3 h-8 w-8 text-slate-400" aria-hidden="true" />
                <span className="text-sm font-semibold text-slate-700">
                  Choose a photo of the animal
                </span>
                <span className="mt-1 text-xs text-slate-500">
                  JPG, PNG or WebP, up to 5 MB
                </span>
                <input type="file" accept="image/*" onChange={handleFile} className="sr-only" />
              </label>
            )}

            {fieldErrors.image && (
              <p className="mt-2 text-xs font-medium text-red-600">{fieldErrors.image}</p>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="mb-1 text-lg font-semibold text-slate-900">Where is the animal?</h2>
            <p className="mb-5 text-sm text-slate-500">
              Describe the spot so a rescuer can find it even without coordinates.
            </p>

            <div className="space-y-5">
              <Input
                id="address"
                label="Address or landmark"
                maxLength={300}
                value={form.address}
                onChange={update('address')}
                error={fieldErrors.address}
                placeholder="Panjim Bus Stand, east side, near the tea stall"
              />

              <LocationCapture
                latitude={form.latitude}
                longitude={form.longitude}
                onChange={({ latitude, longitude }) =>
                  setForm((current) => ({ ...current, latitude, longitude }))
                }
              />
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-1 text-lg font-semibold text-slate-900">How can you be reached?</h2>
            <p className="mb-5 text-sm text-slate-500">
              The NGO handling this case will call or message this number.
            </p>

            <Input
              id="contact"
              label="Contact number"
              type="tel"
              required
              value={form.contact}
              onChange={update('contact')}
              error={fieldErrors.contact}
              hint={
                account?.phone
                  ? 'Pre-filled from your account. Change it if the animal is not near you.'
                  : 'Digits, spaces, + and - only.'
              }
            />
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2 text-xs text-slate-500">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              Your name, contact number and location are visible to NGOs handling this case.
            </p>

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => navigate('/dashboard')}>
                Cancel
              </Button>
              <Button type="submit" size="lg" loading={loading}>
                <Send className="h-4 w-4" aria-hidden="true" />
                Submit report
              </Button>
            </div>
          </div>
        </form>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6">
        <p className="flex items-center justify-center gap-2 text-sm text-slate-500">
          <PawPrint className="h-4 w-4" aria-hidden="true" />
          StrayCare
        </p>
      </footer>
    </div>
  );
}
