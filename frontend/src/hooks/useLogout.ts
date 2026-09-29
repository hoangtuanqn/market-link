import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import AuthApi from '@/api-requests/auth.requests';
import { Cart } from '@/lib/cart';
import { dropPushSubscription } from '@/lib/notifications/browser';
import Notification from '@/utils/notification';
import Session from '@/utils/session';

const useLogout = (redirectTo = '/login') => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return async () => {
    let message = t('toast.signedOut');
    await dropPushSubscription();
    try {
      const response = await AuthApi.logout();
      message = response.message || message;
    } catch {
      // ignored: the server-side session already expired or cannot be reached — still sign out in the browser
    }
    Session.clear();
    Cart.clear();
    Notification.success({ text: message });
    navigate(redirectTo, { replace: true });
  };
};

export default useLogout;
