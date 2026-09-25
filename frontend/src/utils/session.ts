import type { UserType } from '@/types/user.types';

/**
 * Phiên đăng nhập phía trình duyệt: access token + user.
 *
 * - "Remember me" → localStorage (còn sau khi đóng trình duyệt).
 * - Không chọn → sessionStorage (mất khi đóng trình duyệt), khớp với cookie refresh_token dạng phiên của backend. Mọi
 *   thay đổi phát sự kiện để header (useSession) cập nhật ngay.
 */
const TOKEN_KEY = 'access_token';
const USER_KEY = 'user';
const LOGIN_KEY = 'login';
const CHANGE_EVENT = 'session-change';

const stores = (): Storage[] => [localStorage, sessionStorage];

/** Nơi đang giữ phiên hiện tại; null nếu tab này chưa có phiên. */
const sessionStore = (): Storage | null => stores().find((s) => s.getItem(TOKEN_KEY)) ?? null;

/** Nơi đọc / ghi phiên (mặc định localStorage). */
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
   * Phiên mới sau khi refresh: ghi vào đúng nơi phiên đang ở. Tab chưa có phiên (vd. mở tab mới khi đăng nhập không
   * "Remember me" — sessionStorage riêng từng tab, cookie refresh vẫn còn) thì lưu như phiên không nhớ, không ghi vào
   * localStorage để phiên không sống tiếp sau khi đóng trình duyệt.
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

  /** Nghe thay đổi trong tab này (CHANGE_EVENT) và ở tab khác (storage). */
  static subscribe(callback: () => void) {
    window.addEventListener(CHANGE_EVENT, callback);
    window.addEventListener('storage', callback);
    return () => {
      window.removeEventListener(CHANGE_EVENT, callback);
      window.removeEventListener('storage', callback);
    };
  }

  /** Chuỗi user thô — dùng làm snapshot ổn định cho useSyncExternalStore. */
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
