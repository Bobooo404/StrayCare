import { Bot, TriangleAlert } from 'lucide-react';
import { URGENCY_META } from './constants.js';

/**
 * The AI triage summary attached to a report.
 *
 * Shown to whoever reads the case so a rescue volunteer can understand the
 * animal's condition before visiting. Collapsed by default because it is
 * supporting information, not a substitute for the reporter's own description.
 */
export default function AiTriageSummary({ triage }) {
  if (!triage) return null;

  const { summary, likelySituation, firstAid = [], urgency, confidence } = triage;
  const meta = URGENCY_META[urgency] ?? URGENCY_META.moderate;

  return (
    <section
      className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4"
      aria-label="AI triage summary"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white">
          <Bot className="h-3.5 w-3.5" aria-hidden="true" />
          AI triage
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${meta.chip}`}
        >
          {urgency === 'critical' && (
            <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {meta.fullLabel}
        </span>
        {confidence && (
          <span className="text-xs text-emerald-800/70">{confidence} confidence</span>
        )}
      </div>

      {likelySituation && (
        <h4 className="mt-3 text-sm font-bold text-emerald-900">{likelySituation}</h4>
      )}

      <p className="mt-1.5 text-sm leading-relaxed text-emerald-900/90">{summary}</p>

      {firstAid.length > 0 && (
        <ul className="mt-3 space-y-1">
          {firstAid.map((step) => (
            <li key={step} className="text-sm text-emerald-900/80">
              &middot; {step}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-xs leading-relaxed text-emerald-800/70">
        Automated first impression, not a veterinary diagnosis. Confirm in person
        before acting on it.
      </p>
    </section>
  );
}
