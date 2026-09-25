import { Navigate, Outlet, useLocation } from 'react-router';
import useSession from '@/hooks/useSession';

/** Đường dẫn cần quay lại sau khi đăng nhập (router state, không lấy từ URL nên không bị lợi dụng redirect ra ngoài). */
export type LoginRedirectState = { from?: string };

/**
 * Khu Customer (dashboard, giỏ, đơn…) cần đăng nhập: chưa có phiên thì về /login, đăng nhập xong quay lại đúng trang.
 * Chỉ là UX — quyền thật do backend kiểm tra (FR-005).
 */
const RequireAuth = () => {
  const { isLoggedIn } = useSession();
  const { pathname, search } = useLocation();

  if (!isLoggedIn) {
    const state: LoginRedirectState = { from: pathname + search };
    return <Navigate to="/login" replace state={state} />;
  }
  return <Outlet />;
};

export default RequireAuth;
