import type { RegisterInput, SignupStartedType } from '@/types/auth.types';

/** FR-009: what the verify screen needs after the form, kept for this tab only (sessionStorage). */
export type PendingSignup = { email: string; codeExpiresAt: number; resendAt: number };

/** The form without the passwords, so "Change email" comes back to a filled form. */
export type SignupDraft = Pick<RegisterInput, 'fullName' | 'phone' | 'email' | 'addressParts'>;

const PENDING_KEY = 'ml.signup.pending';
const DRAFT_KEY = 'ml.signup.draft';

const read = <T>(key: string): T | null => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const write = (key: string, value: unknown) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked: the screen still works until the tab reloads
  }
};

const remove = (key: string) => {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // nothing to clean up
  }
};

const SignupStore = {
  fromStarted(started: SignupStartedType, now = Date.now()): PendingSignup {
    return {
      email: started.email,
      codeExpiresAt: now + started.codeExpiresInSeconds * 1000,
      resendAt: now + started.resendAvailableInSeconds * 1000,
    };
  },
  savePending(started: SignupStartedType): PendingSignup {
    const pending = SignupStore.fromStarted(started);
    write(PENDING_KEY, pending);
    return pending;
  },
  setPending: (pending: PendingSignup) => write(PENDING_KEY, pending),
  getPending: () => read<PendingSignup>(PENDING_KEY),
  clearPending: () => remove(PENDING_KEY),
  saveDraft: (draft: SignupDraft) => write(DRAFT_KEY, draft),
  getDraft: () => read<SignupDraft>(DRAFT_KEY),
  clear() {
    remove(PENDING_KEY);
    remove(DRAFT_KEY);
  },
};

export default SignupStore;
