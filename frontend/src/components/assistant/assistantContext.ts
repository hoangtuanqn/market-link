import { createContext, useContext, useEffect } from 'react';

/**
 * FR-090, FR-093, FR-094 — the contract between a screen and the assistant panel.
 *
 * A record is a type and a short reference, never a name or a description. What the server puts in the prompt has to be
 * values the app produced, not text a Farmer typed into a product name (FR-093 note 4).
 */
export type AssistantRecordType = 'order' | 'review' | 'farmer' | 'product' | 'market';

export type AssistantRecord = { type: AssistantRecordType; ref: string };

export type AssistantState = {
  open: boolean;
  record: AssistantRecord | null;
  /** The composer text. It lives here so a screen can ask a question on the person's behalf. */
  draft: string;
  setDraft: (text: string) => void;
  openWith: (prefill?: string) => void;
  close: () => void;
  toggle: () => void;
  setRecord: (record: AssistantRecord | null) => void;
};

export const AssistantCtx = createContext<AssistantState | null>(null);

/** Null outside a provider, so a screen shared between panels can check before offering the button. */
export const useAssistant = () => useContext(AssistantCtx);

/**
 * Tell the assistant which row this screen is showing, for as long as it is mounted. Screens outside a provider get a
 * no-op rather than an error.
 */
export const useAssistantRecord = (record: AssistantRecord | null) => {
  const assistant = useAssistant();
  const setRecord = assistant?.setRecord;
  const type = record?.type;
  const ref = record?.ref;
  useEffect(() => {
    if (!setRecord) return;
    setRecord(type && ref ? { type, ref } : null);
    return () => setRecord(null);
  }, [setRecord, type, ref]);
};
