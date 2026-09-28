import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  PawPrint,
  MapPin,
  Phone,
  MessageCircle,
  Camera,
  Syringe,
  ChevronLeft,
  ChevronRight,
  Home,
  UserPlus,
} from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import { Badge, Button, Card, EmptyState, PageLoader, Select } from '../components/ui.jsx';
import { PET_TYPES, formatDate } from '../components/constants.js';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const PAGE_SIZE = 9;

const GENDER_LABEL = { male: 'Male', female: 'Female', other: 'Other' };

function PetCard({ pet }) {
  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="relative">
          {pet.imageUrl ? (
            <img
              src={pet.imageUrl}
              alt={pet.petName}
              loading="lazy"
              // The demo photos are tall portraits. `object-cover` centres on
              // the middle of the frame, which crops the head off a standing
              // animal, so anchor the crop near the top.
              className="h-48 w-full object-cover object-[center_25%]"
            />
          ) : (
          <div className="flex h-48 w-full items-center justify-center bg-slate-100 text-slate-300">
            <Camera className="h-9 w-9" aria-hidden="true" />
          </div>
        )}

        <div className="absolute right-3 top-3">
          {pet.status === 'adopted' ? (
            <Badge className="bg-slate-900/80 text-white ring-slate-900/20">Adopted</Badge>
          ) : (
            <Badge className="bg-emerald-600 text-white ring-emerald-700">Available</Badge>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-lg font-semibold text-slate-900">{pet.petName}</h3>
          <span className="shrink-0 text-xs text-slate-500">
            {GENDER_LABEL[pet.gender] ?? pet.gender}
          </span>
        </div>

        <p className="mt-1 text-sm text-slate-500">
          {PET_TYPES.find((type) => type.value === pet.petType)?.label ?? pet.petType}
          {pet.breed ? ` - ${pet.breed}` : ''}
        </p>

        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
            {pet.age} yr
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium ${
              pet.vaccinated
                ? 'bg-emerald-50 text-emerald-800'
                : 'bg-amber-50 text-amber-800'
            }`}
          >
            <Syringe className="h-3 w-3" aria-hidden="true" />
            {pet.vaccinated ? 'Vaccinated' : 'Not vaccinated'}
          </span>
          {pet.city && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {pet.city}
            </span>
          )}
        </div>

        <p className="mt-3 line-clamp-3 flex-1 text-sm text-slate-600">{pet.description}</p>

        <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">
            Listed by {pet.ownersName || pet.postedBy?.fullname} on {formatDate(pet.datePosted)}
          </p>

          {pet.status === 'available' && (
            <div className="flex gap-2">
              <a
                href={`tel:${String(pet.contact).replace(/\s/g, '')}`}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-900"
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
                Call
              </a>
              <a
                href={`https://wa.me/${String(pet.contact).replace(/\D/g, '')}?text=${encodeURIComponent(
                  `Hi, I am interested in adopting ${pet.petName}. Is ${pet.petName} still available?`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                WhatsApp
              </a>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function AdoptionList() {
  const { isAuthenticated, isUser } = useAuth();
  const navigate = useNavigate();

  const [pets, setPets] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [petType, setPetType] = useState('');
  const [status, setStatus] = useState('available');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.adoptions.list({ petType, status, page, limit: PAGE_SIZE });
      setPets(result.data.pets);
      setMeta(result.meta);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [petType, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  function changeFilter(setter) {
    return (event) => {
      setter(event.target.value);
      setPage(1);
    };
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Adopt a pet</h1>
            <p className="mt-1.5 max-w-2xl text-slate-600">
              Every listing here was placed by a registered StrayCare user. Contact the lister
              directly to arrange a visit.
            </p>
          </div>

          {isUser && (
            <Button onClick={() => navigate('/adopt/new')}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              List a pet for adoption
            </Button>
          )}
        </div>

        <Card className="mb-8 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Select
              id="pet-type"
              label="Pet type"
              value={petType}
              onChange={changeFilter(setPetType)}
              placeholder="All types"
              options={PET_TYPES}
            />
            <Select
              id="status"
              label="Availability"
              value={status}
              onChange={changeFilter(setStatus)}
              options={[
                { value: 'available', label: 'Available now' },
                { value: 'adopted', label: 'Already adopted' },
              ]}
            />
            <div className="flex items-end">
              <p className="pb-2.5 text-sm text-slate-500">
                {meta.total} {meta.total === 1 ? 'listing' : 'listings'} found
              </p>
            </div>
          </div>
        </Card>

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <PageLoader label="Loading pets" />
        ) : pets.length === 0 ? (
          <EmptyState
            icon={PawPrint}
            title={status === 'adopted' ? 'No adopted pets listed' : 'No pets match your filters'}
            description={
              status === 'adopted'
                ? 'These pets have already found a home.'
                : 'Try a different pet type, or check back soon.'
            }
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setPetType('');
                  setStatus('available');
                  setPage(1);
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {pets.map((pet) => (
                <PetCard key={pet._id} pet={pet} />
              ))}
            </div>

            {meta.totalPages > 1 && (
              <nav
                className="mt-8 flex items-center justify-between border-t border-slate-200 pt-5"
                aria-label="Adoption listing pages"
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

        {!isAuthenticated && (
          <Card className="mt-10 p-6 text-center">
            <PawPrint className="mx-auto mb-3 h-8 w-8 text-slate-300" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-slate-900">Want to rehome a pet?</h2>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-600">
              Create a free account to list your pet for adoption and manage the listing until
              it finds a home.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <Link
                to="/register"
                className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
              >
                <UserPlus className="mr-1.5 inline h-4 w-4" aria-hidden="true" />
                Create an account
              </Link>
              <Link
                to="/login"
                className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 transition-colors hover:bg-slate-50"
              >
                Sign in
              </Link>
            </div>
          </Card>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-8">
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
