import { createContext, useContext, useEffect } from 'react';

export type AssistantRecordType = 'order' | 'review' | 'farmer' | 'product' | 'market';

export type AssistantRecord = { type: AssistantRecordType; ref: string };

export type AssistantCartLine = { productId: number; quantity: number };

export type AssistantState = {
  open: boolean;
  record: AssistantRecord | null;
  cart: AssistantCartLine[];
  draft: string;
  setDraft: (text: string) => void;
  openWith: (prefill?: string) => void;
  close: () => void;
  toggle: () => void;
  setRecord: (record: AssistantRecord | null) => void;
  setCart: (cart: AssistantCartLine[]) => void;
};

export const AssistantCtx = createContext<AssistantState | null>(null);

export const useAssistant = () => useContext(AssistantCtx);

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

export const useAssistantCart = (cart: AssistantCartLine[]) => {
  const assistant = useAssistant();
  const setCart = assistant?.setCart;
  const key = cart.map((l) => `${l.productId}:${l.quantity}`).join(',');
  useEffect(() => {
    if (!setCart) return;
    setCart(
      key
        ? key.split(',').map((part) => {
            const [productId, quantity] = part.split(':');
            return { productId: Number(productId), quantity: Number(quantity) };
          })
        : [],
    );
    return () => setCart([]);
  }, [setCart, key]);
};
