import { useEffect } from 'react';
import AccountDeactivatedNotice from '@/utils/accountDeactivatedNotice';
import Notification from '@/utils/notification';

/**
 * FR-072: `watchForAccountDeactivated` (axiosInstance.ts) stashes the ban reason across the full page reload it
 * triggers, because a toast shown right before `window.location.assign` never gets to paint. This surfaces it once,
 * right after the new page has actually mounted.
 */
const AccountDeactivatedToastSync = () => {
  useEffect(() => {
    const message = AccountDeactivatedNotice.consume();
    if (message) Notification.error({ text: message });
  }, []);

  return null;
};

export default AccountDeactivatedToastSync;
