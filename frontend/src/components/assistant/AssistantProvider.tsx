import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { AssistantCtx, type AssistantCartLine, type AssistantRecord, type AssistantState } from './assistantContext';

export const AssistantProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [record, setRecord] = useState<AssistantRecord | null>(null);
  const [cart, setCart] = useState<AssistantCartLine[]>([]);

  const openWith = useCallback((prefill?: string) => {
    if (prefill) setDraft(prefill);
    setOpen(true);
  }, []);

  const value = useMemo<AssistantState>(
    () => ({
      open,
      record,
      cart,
      draft,
      setDraft,
      openWith,
      close: () => setOpen(false),
      toggle: () => setOpen((v) => !v),
      setRecord,
      setCart,
    }),
    [open, record, cart, draft, openWith],
  );

  return <AssistantCtx.Provider value={value}>{children}</AssistantCtx.Provider>;
};
