import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AuthApi from '@/api-requests/auth.requests';
import { Button } from '@/components/ui/button';
import { GOOGLE_OAUTH_STATE_KEY } from '@/constants/oauth';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

/**
 * Step 1 of Google sign-in: generate a random `state`, keep it in sessionStorage, get the sign-in URL from the backend
 * and send the page to Google. Google returns to /auth/google/callback (see pages/GoogleCallback).
 */
const GoogleLoginButton = () => {
  const { t } = useTranslation('Login');
  const [isRedirecting, setIsRedirecting] = useState(false);

  const onClick = async () => {
    setIsRedirecting(true);
    try {
      const state = crypto.randomUUID();
      sessionStorage.setItem(GOOGLE_OAUTH_STATE_KEY, state);
      const response = await AuthApi.googleAuthorizeUrl(state);
      window.location.assign(response.data.url);
    } catch (error) {
      sessionStorage.removeItem(GOOGLE_OAUTH_STATE_KEY);
      Notification.error({ text: Helper.getErrorMessage(error, t('google.failed')) });
      setIsRedirecting(false);
    }
  };

  return (
    <Button variant="secondary" className="w-full" onClick={onClick} disabled={isRedirecting}>
      {isRedirecting ? t('google.opening') : t('google.continue')}
    </Button>
  );
};

export default GoogleLoginButton;
