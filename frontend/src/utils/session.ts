import type { UserType } from '@/types/user.types';

/**
 * The browser-side sign-in session: access token + user.
 *
 * - "Remember me" → localStorage (survives closing the browser).
 * - Not chosen → sessionStorage (lost when the browser closes), matching the backend's session-type refresh_token cookie.
 *   Every change emits an event so the header (useSession) updates right away.
 */
const TOKEN_KEY = 'access_token';
const USER_KEY = 'user';
const LOGIN_KEY = 'login';
const CHANGE_EVENT = 'session-change';

const stores = (): Storage[] => [localStorage, sessionStorage];

/** Where the current session is kept; null if this tab has no session. */
const sessionStore = (): Storage | null => stores().find((s) => s.getItem(TOKEN_KEY)) ?? null;

/** Where the session is read / written (localStorage by default). */
const activeStore = (): Storage => sessionStore() ?? localStorage;

const emit = () => window.dispatchEvent(new Event(CHANGE_EVENT));

class Session {
  static save({ accessToken, user }: { accessToken: string; user: UserType }, remember = true) {
    Session.clearStorage();
    const store = remember ? localStorage : sessionStorage;
    store.setItem(LOGIN_KEY, 'true');
    store.setItem(TOKEN_KEY, accessToken);
    store.setItem(USER_KEY, JSON.stringify(user));
    emit();
  }

  static getAccessToken(): string | null {
    return activeStore().getItem(TOKEN_KEY);
  }

  /**
   * A new session after refresh: written to the place the session is already in. A tab with no session (e.g. a new tab
   * opened when signing in without "Remember me" — sessionStorage is per tab, the refresh cookie is still there) stores
   * it like a non-remembered session, and does not write to localStorage so the session does not live on after the
   * browser closes.
   */
  static refreshed(result: { accessToken: string; user: UserType }) {
    const store = sessionStore();
    if (!store) {
      Session.save(result, false);
      return;
    }
    store.setItem(TOKEN_KEY, result.accessToken);
    store.setItem(USER_KEY, JSON.stringify(result.user));
    emit();
  }

  static getUser(): UserType | null {
    return parseUser(activeStore().getItem(USER_KEY));
  }

  static updateUser(patch: Partial<UserType>) {
    const store = activeStore();
    const user = parseUser(store.getItem(USER_KEY));
    if (!user) return;
    store.setItem(USER_KEY, JSON.stringify({ ...user, ...patch }));
    emit();
  }

  static clear() {
    Session.clearStorage();
    emit();
  }

  /** Listen to changes in this tab (CHANGE_EVENT) and in other tabs (storage). */
  static subscribe(callback: () => void) {
    window.addEventListener(CHANGE_EVENT, callback);
    window.addEventListener('storage', callback);
    return () => {
      window.removeEventListener(CHANGE_EVENT, callback);
      window.removeEventListener('storage', callback);
    };
  }

  /** The raw user string — used as a stable snapshot for useSyncExternalStore. */
  static getRawUser(): string | null {
    return activeStore().getItem(USER_KEY);
  }

  private static clearStorage() {
    for (const store of stores()) {
      store.removeItem(LOGIN_KEY);
      store.removeItem(TOKEN_KEY);
      store.removeItem(USER_KEY);
    }
  }
}

function parseUser(raw: string | null): UserType | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserType;
  } catch {
    return null;
  }
}

export { parseUser };
export default Session;
