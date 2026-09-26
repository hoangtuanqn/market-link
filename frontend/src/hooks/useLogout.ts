import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import AuthApi from '@/api-requests/auth.requests';
import { dropPushSubscription } from '@/lib/notifications/browser';
import Notification from '@/utils/notification';
import Session from '@/utils/session';

/**
 * Sign out on this device: the backend revokes the access + refresh tokens and clears the cookie, the FE clears the
 * session. A network error or an already-expired token still clears the session in the browser. `redirectTo`: the
 * sign-in page to come back to (admin uses /admin/login).
 */
const useLogout = (redirectTo = '/login') => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return async () => {
    let message = t('toast.signedOut');
    // before revoking the token: DELETE subscription needs a session that is still valid
    await dropPushSubscription();
    try {
      const response = await AuthApi.logout();
      message = response.message || message;
    } catch {
      // ignored: the server-side session already expired or cannot be reached — still sign out in the browser
    }
    Session.clear();
    Notification.success({ text: message });
    navigate(redirectTo, { replace: true });
  };
};

export default useLogout;
