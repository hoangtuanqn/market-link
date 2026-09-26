import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AuthApi from '@/api-requests/auth.requests';
import { Button } from '@/components/ui/button';
import { GOOGLE_OAUTH_STATE_KEY } from '@/constants/oauth';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

/**
 * Bước 1 đăng nhập Google: sinh `state` ngẫu nhiên, giữ trong sessionStorage, lấy URL đăng nhập từ backend rồi chuyển
 * trang sang Google. Google trả về /auth/google/callback (xem pages/GoogleCallback).
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
