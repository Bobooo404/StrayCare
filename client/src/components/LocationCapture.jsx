import { useState } from 'react';
import { MapPin, Loader2, CheckCircle2, AlertTriangle, Crosshair } from 'lucide-react';
import { Button } from './ui.jsx';

/**
 * Captures the reporter's coordinates using the browser Geolocation API.
 *
 * Geolocation always prompts the user, so it is never requested automatically -
 * the case may have been seen somewhere other than where the person stands, and
 * a silent request would be a privacy problem.
 */
export default function LocationCapture({ latitude, longitude, onChange }) {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  function capture() {
    if (!('geolocation' in navigator)) {
      setStatus('unsupported');
      setError('This browser does not support location services.');
      return;
    }

    setStatus('loading');
    setError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange({
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
        });
        setStatus('done');
      },
      (geoError) => {
        setStatus('error');
        setError(
          {
            1: 'Location permission was denied. You can still submit the report with an address.',
            2: 'Your location is unavailable right now. Please try again.',
            3: 'The location request timed out. Please try again.',
          }[geoError.code] ?? 'Could not detect your location. Please try again.'
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  function clear() {
    onChange({ latitude: '', longitude: '' });
    setStatus('idle');
    setError('');
  }

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
          <MapPin className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-emerald-900">Location information</h3>
          <p className="text-xs text-emerald-700">
            Helps the nearest NGO find the animal faster.
          </p>
        </div>
      </div>

      {status === 'done' ? (
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-lg border border-emerald-300 bg-emerald-100 p-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
            <p className="text-sm font-medium text-emerald-900">
              Location captured: {latitude}, {longitude}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={capture}>
              <Crosshair className="h-4 w-4" aria-hidden="true" />
              Update location
            </Button>
            <Button variant="ghost" size="sm" onClick={clear}>
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <Button
            variant="primary"
            className="w-full"
            onClick={capture}
            loading={status === 'loading'}
          >
            {status === 'loading' ? (
              'Detecting location...'
            ) : (
              <>
                <Crosshair className="h-4 w-4" aria-hidden="true" />
                Detect my current location
              </>
            )}
          </Button>

          {status === 'loading' && (
            <p className="flex items-center justify-center gap-2 text-xs text-emerald-700">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Waiting for your browser permission
            </p>
          )}

          {error && (
            <p className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-100 p-3 text-xs text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}

          <p className="text-xs text-emerald-700">
            If you are not standing where the animal is, describe the spot in the address
            field instead.
          </p>
        </div>
      )}
    </div>
  );
}
