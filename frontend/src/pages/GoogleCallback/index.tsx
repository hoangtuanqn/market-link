import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import AuthApi from '@/api-requests/auth.requests';
import { Banner } from '@/components/ui/banner';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { GOOGLE_OAUTH_STATE_KEY } from '@/constants/oauth';
import Helper from '@/utils/helper';
import LocalStorage from '@/utils/localstorage';
import Notification from '@/utils/notification';

/**
 * Bước 2 đăng nhập Google: Google chuyển về đây kèm `code` và `state`. Kiểm tra `state` khớp với lúc bấm nút (chống
 * CSRF), rồi gửi `code` cho backend đổi lấy phiên đăng nhập. `code` chỉ dùng được một lần.
 */
const GoogleCallbackPage = () => {
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
      fail(
        googleError === 'access_denied'
          ? 'You cancelled Google sign-in.'
          : 'Google could not sign you in. Please try again.',
      );
      return;
    }
    if (!code || !state || !expectedState || state !== expectedState) {
      fail('This sign-in attempt is not valid. Start again from the sign-in page.');
      return;
    }

    AuthApi.loginWithSocial('google', code)
      .then((response) => {
        const { accessToken, user } = response.data;
        LocalStorage.setItem('login', 'true');
        LocalStorage.setItem('access_token', accessToken);
        LocalStorage.setItem('user', JSON.stringify(user));
        Notification.success({ text: response.message || 'Signed in.' });
        // replace: bỏ ?code=&state= khỏi lịch sử trình duyệt. Lần đầu (chưa có mật khẩu) → mời đặt mật khẩu
        navigate(user.hasPassword === false ? '/auth/set-password' : '/', { replace: true });
      })
      .catch((err) => fail(Helper.getErrorMessage(err, 'Google sign-in failed. Please try again.')));
  }, [searchParams, navigate]);

  return (
    <Card className="mx-auto my-4 flex w-full max-w-115 flex-col gap-4 p-4 md:my-8 md:p-8">
      {/* Không gửi URL chứa code cho trang khác qua header Referer */}
      <meta name="referrer" content="no-referrer" />
      {error ? (
        <>
          <h1 className="font-hand text-h1">Google sign-in did not finish</h1>
          <Banner variant="danger" title={error}>
            You are not signed in. Nothing has changed on your account.
          </Banner>
          <ButtonLink to="/login" className="w-full">
            Back to sign in
          </ButtonLink>
          <Link to="/register/customer" className="text-small text-brand underline">
            Create an account with email instead
          </Link>
        </>
      ) : (
        <div aria-busy="true" className="flex flex-col gap-2">
          <h1 className="font-hand text-h1">Signing you in with Google…</h1>
          <p className="text-small text-ink-muted">This takes a second.</p>
        </div>
      )}
    </Card>
  );
};

export default GoogleCallbackPage;
