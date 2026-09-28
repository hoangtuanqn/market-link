const KEY = 'account-deactivated-message';

/**
 * FR-072: `watchForAccountDeactivated` reloads the page to Home right after signing a banned user out, which tears down
 * the React tree — anything shown at that moment never paints. The reason is stashed here across the reload and picked
 * up by `AccountDeactivatedDialog` on the next mount.
 *
 * `peek` is separate from `clear` on purpose: reading must stay pure so it can run inside a `useState` initializer
 * (React may invoke that twice in development), while the removal happens once, in an effect.
 */
const AccountDeactivatedNotice = {
  stash(message: string) {
    sessionStorage.setItem(KEY, message);
  },
  /** The stashed reason, or null when this is an ordinary visit. Does not remove it. */
  peek(): string | null {
    return sessionStorage.getItem(KEY);
  },
  clear() {
    sessionStorage.removeItem(KEY);
  },
};

export default AccountDeactivatedNotice;
