export type BlockedKind = 'account' | 'stall';

export interface BlockedNoticeValue {
  kind: BlockedKind;
  message: string;
}

const KEY = 'blocked-notice-message';

/**
 * FR-072/FR-071: `watchForAccountDeactivated` and `watchForStallSuspended` (axiosInstance.ts) each redirect right after
 * the server locks the visitor out, which tears down the React tree — anything shown at that moment never paints. The
 * reason is stashed here across the reload and picked up by `AccountDeactivatedDialog` / `StallSuspendedDialog` on the
 * next mount, which is why both kinds share one key: only one lockout can be "the one that just happened" at a time.
 *
 * `peek` is separate from `clear` on purpose: reading must stay pure so it can run inside a `useState` initializer
 * (React may invoke that twice in development), while the removal happens once, in an effect.
 */
const BlockedNotice = {
  stash(kind: BlockedKind, message: string) {
    sessionStorage.setItem(KEY, JSON.stringify({ kind, message }));
  },
  /** The stashed notice, or null when this is an ordinary visit. Does not remove it. */
  peek(): BlockedNoticeValue | null {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as BlockedNoticeValue;
    } catch {
      return null;
    }
  },
  clear() {
    sessionStorage.removeItem(KEY);
  },
};

export default BlockedNotice;
