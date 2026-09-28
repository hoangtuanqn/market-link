const KEY = 'account-deactivated-message';

/**
 * FR-072: `watchForAccountDeactivated` fires a toast right before `window.location.assign('/')` — a full page reload
 * that tears down the React tree (and the toast with it) before it can paint. Stash the message across the reload
 * instead; `AccountDeactivatedToastSync` shows it once the new page has mounted.
 */
const AccountDeactivatedNotice = {
  stash(message: string) {
    sessionStorage.setItem(KEY, message);
  },
  consume(): string | null {
    const message = sessionStorage.getItem(KEY);
    if (message) sessionStorage.removeItem(KEY);
    return message;
  },
};

export default AccountDeactivatedNotice;
