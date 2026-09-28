import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    className = '',
    type = 'button',
    ...props
  },
  ref
) {
  const variants = {
    primary:
      'bg-emerald-700 text-white hover:bg-emerald-800 disabled:bg-emerald-700/50',
    secondary:
      'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 disabled:opacity-50',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/50',
    ghost: 'text-slate-600 hover:bg-slate-100 disabled:opacity-50',
    whatsapp: 'bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50',
    // Green outlined controls, for the Sign out action. Kept as real variants
    // rather than className overrides so they never fight the base utilities.
    green:
      'bg-transparent text-emerald-700 ring-1 ring-emerald-600 hover:bg-emerald-50 disabled:opacity-50',
    greenDark:
      'bg-emerald-800/40 text-emerald-200 ring-1 ring-emerald-500 hover:bg-emerald-800 disabled:opacity-50',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3.5 text-base',
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
});

const fieldBase =
  'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 disabled:bg-slate-100';

export const Input = forwardRef(function Input(
  { label, error, hint, id, className = '', ...props },
  ref
) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${fieldBase} ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/30' : ''}`}
        {...props}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
      {!error && hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
});

export const Textarea = forwardRef(function Textarea(
  { label, error, hint, id, className = '', rows = 4, ...props },
  ref
) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${fieldBase} resize-y ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/30' : ''}`}
        {...props}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
      {!error && hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
});

export const Select = forwardRef(function Select(
  { label, error, hint, id, options = [], placeholder, className = '', ...props },
  ref
) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={id}
        aria-invalid={error ? 'true' : undefined}
        className={`${fieldBase} ${error ? 'border-red-400' : ''}`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
      {!error && hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
});

export function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function Badge({ children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${className}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  const meta = {
    pending: { label: 'Pending', chip: 'bg-amber-100 text-amber-800 ring-amber-200' },
    ongoing: { label: 'In Progress', chip: 'bg-sky-100 text-sky-800 ring-sky-200' },
    completed: { label: 'Completed', chip: 'bg-emerald-100 text-emerald-800 ring-emerald-200' },
  }[status] ?? { label: status, chip: 'bg-slate-100 text-slate-700 ring-slate-200' };

  return <Badge className={meta.chip}>{meta.label}</Badge>;
}

export function Spinner({ className = 'h-5 w-5' }) {
  return <Loader2 className={`animate-spin text-emerald-700 ${className}`} aria-hidden="true" />;
}

export function PageLoader({ label = 'Loading' }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
      <Spinner className="h-8 w-8" />
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
      {Icon && <Icon className="mb-3 h-12 w-12 text-slate-300" aria-hidden="true" />}
      <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Alert({ tone = 'error', className = '', children }) {
  const tones = {
    error: 'border-red-200 bg-red-50 text-red-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    info: 'border-sky-200 bg-sky-50 text-sky-800',
  };

  return (
    <div
      role="alert"
      className={`rounded-lg border px-4 py-3 text-sm font-medium ${tones[tone]} ${className}`}
    >
      {children}
    </div>
  );
}
