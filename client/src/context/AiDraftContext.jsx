import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api/client.js';

/**
 * Holds the triage result while the reporter moves from the AI panel into the
 * report form.
 *
 * The form reads the draft once on mount and then owns its own state, so an
 * edit in the form never mutates the stored result and a stale draft cannot
 * reappear on a later visit.
 */
const AiDraftContext = createContext(null);

const EMPTY = { triage: null, nearby: [], nearbyError: null, disclaimer: '' };

export function AiDraftProvider({ children }) {
  const [draft, setDraft] = useState(EMPTY);
  const [aiAvailable, setAiAvailable] = useState(false);

  // Asked once on load so the navbar can hide the AI entry points entirely
  // when no key is configured, rather than letting someone start a flow that
  // cannot finish.
  useEffect(() => {
    let active = true;

    api.ai
      .status()
      .then(({ data }) => {
        if (active) setAiAvailable(Boolean(data.configured));
      })
      .catch(() => {
        if (active) setAiAvailable(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const startOver = useCallback(() => setDraft(EMPTY), []);

  return (
    <AiDraftContext.Provider value={{ draft, setDraft, aiAvailable, startOver }}>
      {children}
    </AiDraftContext.Provider>
  );
}

export function useAiDraft() {
  const context = useContext(AiDraftContext);

  // A consumer rendered outside the provider is a wiring mistake, so it is
  // reported loudly instead of silently behaving as if AI was unavailable.
  if (!context) {
    throw new Error('useAiDraft must be used inside an AiDraftProvider');
  }

  return context;
}
