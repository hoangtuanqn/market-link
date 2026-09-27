import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { AssistantCtx, type AssistantRecord, type AssistantState } from './assistantContext';

/**
 * Holds the assistant panel's open/closed state, the composer text and the row the current screen is showing.
 *
 * The composer text lives here rather than in the chat so a screen can open the panel with a question already typed
 * (the "ask about this" buttons). It lands in the box rather than being sent: the person reads it and presses send.
 */
export const AssistantProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [record, setRecord] = useState<AssistantRecord | null>(null);

  const openWith = useCallback((prefill?: string) => {
    if (prefill) setDraft(prefill);
    setOpen(true);
  }, []);

  const value = useMemo<AssistantState>(
    () => ({
      open,
      record,
      draft,
      setDraft,
      openWith,
      close: () => setOpen(false),
      toggle: () => setOpen((v) => !v),
      setRecord,
    }),
    [open, record, draft, openWith],
  );

  return <AssistantCtx.Provider value={value}>{children}</AssistantCtx.Provider>;
};
