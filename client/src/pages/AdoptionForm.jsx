import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Save, ImagePlus, X, Info, PawPrint } from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import { Alert, Button, Card, Input, PageLoader, Select, Textarea } from '../components/ui.jsx';
import { PET_TYPES } from '../components/constants.js';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const EMPTY = {
  petName: '',
  petType: 'dog',
  breed: '',
  age: '',
  gender: 'male',
  vaccinated: false,
  description: '',
  contact: '',
  city: '',
  status: 'available',
};

export default function AdoptionForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const { account } = useAuth();

  const [form, setForm] = useState({ ...EMPTY, contact: account?.phone ?? '' });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [existingImage, setExistingImage] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  useEffect(() => {
    if (!isEdit) return;

    let active = true;

    (async () => {
      try {
        // There is no public single-listing endpoint, so the edit form reads
        // the signed-in user's own listings to find the record.
        const { data } = await api.adoptions.mine();
        const pet = data.pets.find((item) => item._id === id);

        if (!active) return;

        if (!pet) {
          setError('That listing no longer exists.');
          return;
        }

        setForm({
          petName: pet.petName,
          petType: pet.petType,
          breed: pet.breed ?? '',
          age: String(pet.age),
          gender: pet.gender,
          vaccinated: Boolean(pet.vaccinated),
          description: pet.description,
          contact: pet.contact,
          city: pet.city ?? '',
          status: pet.status,
        });
        setExistingImage(pet.imageUrl ?? '');
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [id, isEdit]);

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
    setSaving(true);

    const body = new FormData();
    body.append('petName', form.petName);
    body.append('petType', form.petType);
    if (form.breed.trim()) body.append('breed', form.breed.trim());
    body.append('age', String(form.age));
    body.append('gender', form.gender);
    // FormData only carries strings, so this must be an explicit "true"/"false".
    body.append('vaccinated', form.vaccinated ? 'true' : 'false');
    body.append('description', form.description);
    body.append('contact', form.contact);
    if (form.city.trim()) body.append('city', form.city.trim());
    body.append('status', form.status);
    if (file) body.append('image', file);

    try {
      const result = isEdit
        ? await api.adoptions.update(id, body)
        : await api.adoptions.create(body);

      toast.success(result.message);
      navigate('/adopt/mine');
    } catch (err) {
      setError(err.message);
      setFieldErrors(err.errors ?? {});
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <PageLoader label="Loading listing" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-3xl px-4 py-10 sm:py-12">
        <div className="mb-8">
          <Link to="/adopt/mine" className="text-sm font-medium text-emerald-700 hover:underline">
            Back to my listings
          </Link>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">
            {isEdit ? 'Edit adoption listing' : 'List a pet for adoption'}
          </h1>
          <p className="mt-2 text-slate-600">
            {isEdit
              ? 'Update the details below. Changing the status to adopted keeps the record visible as already rehomed.'
              : 'Give adopters enough detail to decide whether your pet is right for them.'}
          </p>
        </div>

        {error && (
          <div className="mb-6">
            <Alert>{error}</Alert>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <Card className="p-6">
            <h2 className="mb-5 text-lg font-semibold text-slate-900">About your pet</h2>

            <div className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Input
                  id="petName"
                  label="Pet name"
                  required
                  maxLength={60}
                  value={form.petName}
                  onChange={update('petName')}
                  error={fieldErrors.petname ?? fieldErrors.petName}
                  placeholder="Luna"
                />

                <Input
                  id="age"
                  label="Age (years)"
                  type="number"
                  min="0"
                  max="40"
                  step="1"
                  required
                  value={form.age}
                  onChange={update('age')}
                  error={fieldErrors.age}
                  placeholder="2"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Select
                  id="petType"
                  label="Pet type"
                  required
                  value={form.petType}
                  onChange={update('petType')}
                  options={PET_TYPES}
                  error={fieldErrors.pettype ?? fieldErrors.petType}
                />

                <Input
                  id="breed"
                  label="Breed"
                  maxLength={60}
                  value={form.breed}
                  onChange={update('breed')}
                  error={fieldErrors.breed}
                  placeholder="Indian Spitz"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Select
                  id="gender"
                  label="Gender"
                  required
                  value={form.gender}
                  onChange={update('gender')}
                  options={[
                    { value: 'male', label: 'Male' },
                    { value: 'female', label: 'Female' },
                    { value: 'other', label: 'Other' },
                  ]}
                  error={fieldErrors.gender}
                />

                <Input
                  id="city"
                  label="City"
                  maxLength={100}
                  value={form.city}
                  onChange={update('city')}
                  error={fieldErrors.city}
                  placeholder="Panaji"
                />
              </div>

              <Textarea
                id="description"
                label="Tell adopters about your pet"
                required
                rows={5}
                maxLength={2000}
                value={form.description}
                onChange={update('description')}
                error={fieldErrors.description}
                hint={`${form.description.length}/2000 - temperament, health and home needs`}
                placeholder="Luna is a gentle, house trained two year old who is good with children. She is looking for a calm indoor home."
              />

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-4 transition hover:border-emerald-400">
                <input
                  type="checkbox"
                  checked={form.vaccinated}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, vaccinated: event.target.checked }))
                  }
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                />
                <span>
                  <span className="block text-sm font-medium text-slate-800">
                    Vaccinations are up to date
                  </span>
                  <span className="block text-xs text-slate-500">
                    Adopters are far more likely to reply to a listing that mentions this.
                  </span>
                </span>
              </label>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-1 text-lg font-semibold text-slate-900">Photo</h2>
            <p className="mb-5 text-sm text-slate-500">
              A clear photo gets roughly twice as many enquiries.
            </p>

            {preview ? (
              <div className="space-y-3">
                <img
                  src={preview}
                  alt="Selected pet preview"
                  className="h-64 w-full rounded-xl object-cover"
                />
                <Button variant="secondary" size="sm" onClick={clearFile}>
                  <X className="h-4 w-4" aria-hidden="true" />
                  Remove new photo
                </Button>
              </div>
            ) : existingImage ? (
              <div className="space-y-3">
                <img
                  src={existingImage}
                  alt="Current listing photo"
                  className="h-64 w-full rounded-xl object-cover object-[center_25%]"
                />
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-50">
                  <ImagePlus className="h-4 w-4" aria-hidden="true" />
                  Replace photo
                  <input type="file" accept="image/*" onChange={handleFile} className="sr-only" />
                </label>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center transition hover:border-emerald-500 hover:bg-emerald-50">
                <ImagePlus className="mb-3 h-8 w-8 text-slate-400" aria-hidden="true" />
                <span className="text-sm font-semibold text-slate-700">Choose a photo</span>
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
            <h2 className="mb-1 text-lg font-semibold text-slate-900">Contact and status</h2>
            <p className="mb-5 text-sm text-slate-500">
              Your contact number is shown publicly on this listing.
            </p>

            <div className="space-y-5">
              <Input
                id="contact"
                label="Contact number"
                type="tel"
                required
                value={form.contact}
                onChange={update('contact')}
                error={fieldErrors.contact}
                placeholder="+91 98220 11223"
              />

              {isEdit && (
                <Select
                  id="status"
                  label="Listing status"
                  value={form.status}
                  onChange={update('status')}
                  options={[
                    { value: 'available', label: 'Available for adoption' },
                    { value: 'adopted', label: 'Already adopted' },
                  ]}
                  error={fieldErrors.status}
                />
              )}
            </div>
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2 text-xs text-slate-500">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              Mark the listing as adopted once the pet has a new home.
            </p>

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => navigate('/adopt/mine')}>
                Cancel
              </Button>
              <Button type="submit" size="lg" loading={saving}>
                <Save className="h-4 w-4" aria-hidden="true" />
                {isEdit ? 'Save changes' : 'Publish listing'}
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
