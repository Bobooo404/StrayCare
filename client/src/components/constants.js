export const REPORT_CATEGORIES = ['stray', 'lost', 'injured'];

export const ANIMAL_TYPES = [
  { value: 'dog', label: 'Dog' },
  { value: 'cat', label: 'Cat' },
  { value: 'bird', label: 'Bird' },
  { value: 'cow', label: 'Cow' },
  { value: 'goat', label: 'Goat' },
  { value: 'monkey', label: 'Monkey' },
  { value: 'rabbit', label: 'Rabbit' },
  { value: 'pig', label: 'Pig' },
  { value: 'horse', label: 'Horse' },
  { value: 'donkey', label: 'Donkey' },
  { value: 'squirrel', label: 'Squirrel' },
  { value: 'other', label: 'Other' },
];

export const PET_TYPES = [
  { value: 'dog', label: 'Dog' },
  { value: 'cat', label: 'Cat' },
  { value: 'bird', label: 'Bird' },
  { value: 'rabbit', label: 'Rabbit' },
  { value: 'other', label: 'Other' },
];

export const REPORT_STATUSES = ['pending', 'ongoing', 'completed'];

export const CATEGORY_META = {
  stray: {
    label: 'Stray',
    title: 'Report a Stray',
    description: 'Found an animal living on the streets with no owner.',
    accent: 'sky',
  },
  lost: {
    label: 'Lost Pet',
    title: 'Report a Lost Pet',
    description: 'Your owned pet has gone missing and needs help finding its way home.',
    accent: 'emerald',
  },
  injured: {
    label: 'Injured',
    title: 'Report an Injured Animal',
    description: 'An animal is hurt or in distress and needs urgent medical attention.',
    accent: 'red',
  },
};

export const STATUS_META = {
  pending: {
    label: 'Pending',
    chip: 'bg-amber-100 text-amber-800 ring-amber-200',
    dot: 'bg-amber-500',
  },
  ongoing: {
    label: 'In Progress',
    chip: 'bg-sky-100 text-sky-800 ring-sky-200',
    dot: 'bg-sky-500',
  },
  completed: {
    label: 'Completed',
    chip: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    dot: 'bg-emerald-500',
  },
};

/** Tailwind classes are written out in full so the JIT scanner can see them. */
export const ACCENT_STYLES = {
  sky: {
    panel: 'bg-sky-50 border-sky-200',
    icon: 'bg-sky-100 text-sky-700',
    heading: 'text-sky-900',
    button: 'bg-sky-600 hover:bg-sky-700 focus-visible:outline-sky-600',
  },
  emerald: {
    panel: 'bg-emerald-50 border-emerald-200',
    icon: 'bg-emerald-100 text-emerald-700',
    heading: 'text-emerald-900',
    button: 'bg-emerald-600 hover:bg-emerald-700 focus-visible:outline-emerald-600',
  },
  red: {
    panel: 'bg-red-50 border-red-200',
    icon: 'bg-red-100 text-red-700',
    heading: 'text-red-900',
    button: 'bg-red-600 hover:bg-red-700 focus-visible:outline-red-600',
  },
  emeraldDark: {
    panel: 'bg-emerald-900 border-emerald-800',
    icon: 'bg-emerald-800 text-emerald-100',
    heading: 'text-white',
    button: 'bg-emerald-600 hover:bg-emerald-500 focus-visible:outline-emerald-400',
  },
};

/**
 * Urgency presentation, shared by the AI triage panel and the summary stored on
 * a report so the two can never drift apart.
 *
 * Classes are written out in full because Tailwind only sees literal strings.
 */
export const URGENCY_META = {
  low: {
    fullLabel: 'Low urgency',
    chip: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    band: 'border-emerald-200 bg-emerald-50',
    heading: 'text-emerald-900',
    icon: 'text-emerald-600',
  },
  moderate: {
    fullLabel: 'Moderate urgency',
    chip: 'bg-amber-100 text-amber-800 ring-amber-200',
    band: 'border-amber-200 bg-amber-50',
    heading: 'text-amber-900',
    icon: 'text-amber-600',
  },
  high: {
    fullLabel: 'High urgency',
    chip: 'bg-orange-100 text-orange-900 ring-orange-200',
    band: 'border-orange-200 bg-orange-50',
    heading: 'text-orange-900',
    icon: 'text-orange-600',
  },
  critical: {
    fullLabel: 'Critical urgency',
    chip: 'bg-red-100 text-red-900 ring-red-200',
    band: 'border-red-200 bg-red-50',
    heading: 'text-red-900',
    icon: 'text-red-600',
  },
};

export const animalLabel = (value) =>
  ANIMAL_TYPES.find((type) => type.value === value)?.label ?? 'Other';

export const formatDate = (value) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateTime = (value) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/** Builds a WhatsApp deep link with the country code stripped from the number. */
export const whatsappLink = (phone, message) =>
  `https://wa.me/${String(phone).replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;

export const openMap = (coordinates, address) => {
  if (!coordinates || coordinates.length !== 2) return;
  const [lng, lat] = coordinates;
  const label = address ? `&q=${encodeURIComponent(address)}` : '';
  window.open(
    `https://www.google.com/maps/search/?api=1&query=${lat},${lng}${label}`,
    '_blank',
    'noopener,noreferrer'
  );
};
