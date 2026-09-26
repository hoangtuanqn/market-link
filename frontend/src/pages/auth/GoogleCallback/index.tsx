import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router';
import AuthApi from '@/api-requests/auth.requests';
import { Banner } from '@/components/ui/banner';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { GOOGLE_OAUTH_STATE_KEY } from '@/constants/oauth';
import { ADMIN_VERIFY_PATH } from '@/constants/nav';
import Helper from '@/utils/helper';
import { splitLoginResult } from '@/utils/mfa';
import Notification from '@/utils/notification';
import Session from '@/utils/session';

/**
 * Bước 2 đăng nhập Google: Google chuyển về đây kèm `code` và `state`. Kiểm tra `state` khớp với lúc bấm nút (chống
 * CSRF), rồi gửi `code` cho backend đổi lấy phiên đăng nhập. `code` chỉ dùng được một lần.
 */
const GoogleCallbackPage = () => {
  const { t } = useTranslation('GoogleCallback');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string>();
  // StrictMode chạy effect 2 lần ở dev: chặn gửi cùng một code 2 lần
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const googleError = searchParams.get('error');
    const expectedState = sessionStorage.getItem(GOOGLE_OAUTH_STATE_KEY);
    sessionStorage.removeItem(GOOGLE_OAUTH_STATE_KEY);

    const fail = (message: string) => {
      setError(message);
      Notification.error({ text: message });
    };

    if (googleError) {
      fail(googleError === 'access_denied' ? t('errors.cancelled') : t('errors.google'));
      return;
    }
    if (!code || !state || !expectedState || state !== expectedState) {
      fail(t('errors.invalidState'));
      return;
    }

    AuthApi.loginWithSocial('google', code)
      .then((response) => {
        const { pending, session } = splitLoginResult(response.data, true);
        if (pending) {
          // FR-008: đăng nhập Google không bỏ qua được bước 2 của admin
          navigate(ADMIN_VERIFY_PATH, { replace: true, state: pending });
          return;
        }
        const { user } = session;
        Session.save(session);
        Notification.success({ text: response.message || t('toast.signedIn') });
        // replace: bỏ ?code=&state= khỏi lịch sử trình duyệt. Thiếu sđt/địa chỉ → bổ sung hồ sơ; chưa có mật khẩu → đặt
        // mật khẩu
        navigate(Helper.nextStepAfterSocialLogin(user), { replace: true });
      })
      .catch((err) => fail(Helper.getErrorMessage(err, t('errors.failed'))));
    // t đổi khi đổi ngôn ngữ: started chặn chạy lại
  }, [searchParams, navigate, t]);

  return (
    <Card className="mx-auto my-4 flex w-full max-w-115 flex-col gap-4 p-4 md:my-8 md:p-8">
      {/* Không gửi URL chứa code cho trang khác qua header Referer */}
      <meta name="referrer" content="no-referrer" />
      {error ? (
        <>
          <h1 className="font-hand text-h1">{t('failed.title')}</h1>
          <Banner variant="danger" title={error}>
            {t('failed.text')}
          </Banner>
          <ButtonLink to="/login" className="w-full">
            {t('failed.backToSignIn')}
          </ButtonLink>
          <Link to="/register/customer" className="text-small text-brand underline">
            {t('failed.registerWithEmail')}
          </Link>
        </>
      ) : (
        <div aria-busy="true" className="flex flex-col gap-2">
          <h1 className="font-hand text-h1">{t('loading.title')}</h1>
          <p className="text-small text-ink-muted">{t('loading.text')}</p>
        </div>
      )}
    </Card>
  );
};

export default GoogleCallbackPage;
