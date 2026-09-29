export type BlockedKind = 'account' | 'stall';

export interface BlockedNoticeValue {
  kind: BlockedKind;
  message: string;
}

const KEY = 'blocked-notice-message';

const BlockedNotice = {
  stash(kind: BlockedKind, message: string) {
    sessionStorage.setItem(KEY, JSON.stringify({ kind, message }));
  },
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
