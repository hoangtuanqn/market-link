import { useNavigate } from 'react-router';
import AuthApi from '@/api-requests/auth.requests';
import Notification from '@/utils/notification';
import Session from '@/utils/session';

/**
 * Đăng xuất trên thiết bị này: backend thu hồi access + refresh token và xoá cookie, FE xoá phiên. Lỗi mạng hay token
 * đã hết hạn vẫn xoá phiên ở trình duyệt. `redirectTo`: trang đăng nhập để quay về (admin dùng /admin/login).
 */
const useLogout = (redirectTo = '/login') => {
  const navigate = useNavigate();

  return async () => {
    let message = 'Signed out.';
    try {
      const response = await AuthApi.logout();
      message = response.message || message;
    } catch {
      // bỏ qua: phiên phía server đã hết hạn hoặc không liên lạc được — vẫn đăng xuất ở trình duyệt
    }
    Session.clear();
    Notification.success({ text: message });
    navigate(redirectTo, { replace: true });
  };
};

export default useLogout;
