import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Pencil,
  Trash2,
  Camera,
  MapPin,
  Phone,
  PawPrint,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import { Badge, Button, Card, EmptyState, PageLoader } from '../components/ui.jsx';
import { PET_TYPES, formatDate } from '../components/constants.js';
import api from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';

export default function MyAdoptions() {
  const toast = useToast();

  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // `busy` identifies the row and action currently in flight, e.g. "abc:adopt",
  // so the right button shows a spinner and other rows stay interactive.
  const [busy, setBusy] = useState('');
  const [confirmingId, setConfirmingId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.adoptions.mine();
      setPets(data.pets);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function markAdopted(pet) {
    setBusy(`${pet._id}:adopt`);
    try {
      // Only the status field is sent; the API treats absent fields as unchanged.
      const body = new FormData();
      body.append('status', 'adopted');
      await api.adoptions.update(pet._id, body);
      toast.success(`${pet.petName} is marked as adopted`);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy('');
    }
  }

  async function handleDelete(pet) {
    setBusy(`${pet._id}:delete`);
    try {
      const result = await api.adoptions.remove(pet._id);
      toast.success(result.message);
      setPets((current) => current.filter((item) => item._id !== pet._id));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy('');
      setConfirmingId('');
    }
  }

  return (
    <div className="page-background min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">My adoption listings</h1>
            <p className="mt-1.5 text-slate-600">
              Update a listing while it is live, and mark it adopted once your pet is rehomed.
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="ghost" onClick={load} aria-label="Refresh listings">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Refresh
            </Button>
            <Link
              to="/adopt/new"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              New listing
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <PageLoader label="Loading your listings" />
        ) : pets.length === 0 ? (
          <EmptyState
            icon={PawPrint}
            title="No listings yet"
            description="List a pet that needs a home and adopters can contact you directly."
            action={
              <Link
                to="/adopt/new"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                List a pet
              </Link>
            }
          />
        ) : (
          <div className="space-y-4">
            {pets.map((pet) => (
              <Card key={pet._id} className="overflow-hidden">
                <div className="flex flex-col gap-5 p-5 sm:flex-row">
                  <div className="h-36 w-full shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:w-44">
                    {pet.imageUrl ? (
                      <img
                        src={pet.imageUrl}
                        alt={pet.petName}
                        loading="lazy"
                        // Same top-anchored crop as the adoption grid, so the
                        // head stays visible on tall portrait photos.
                        className="h-full w-full object-cover object-[center_25%]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-300">
                        <Camera className="h-7 w-7" aria-hidden="true" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-slate-900">{pet.petName}</h2>
                      {pet.status === 'adopted' ? (
                        <Badge className="bg-slate-200 text-slate-700 ring-slate-300">
                          Adopted
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-50 text-emerald-800 ring-emerald-200">
                          Live
                        </Badge>
                      )}
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      {PET_TYPES.find((type) => type.value === pet.petType)?.label ?? pet.petType}
                      {pet.breed ? ` - ${pet.breed}` : ''} - {pet.age} yr
                    </p>

                    <p className="mt-2 line-clamp-2 text-sm text-slate-600">{pet.description}</p>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                        {pet.contact}
                      </span>
                      {pet.city && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                          {pet.city}
                        </span>
                      )}
                      <span>Posted {formatDate(pet.datePosted)}</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-row gap-2 sm:w-40 sm:flex-col">
                    <Link
                      to={`/adopt/${pet._id}/edit`}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-50"
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      Edit
                    </Link>

                    {pet.status !== 'adopted' && (
                      <Button
                        size="sm"
                        className="flex-1"
                        loading={busy === `${pet._id}:adopt`}
                        onClick={() => markAdopted(pet)}
                      >
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        Mark adopted
                      </Button>
                    )}

                    {confirmingId === pet._id ? (
                      <div className="flex flex-1 gap-1.5">
                        <Button
                          size="sm"
                          variant="danger"
                          className="flex-1"
                          loading={busy === `${pet._id}:delete`}
                          onClick={() => handleDelete(pet)}
                        >
                          Confirm
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmingId('')}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="flex-1"
                        onClick={() => setConfirmingId(pet._id)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
