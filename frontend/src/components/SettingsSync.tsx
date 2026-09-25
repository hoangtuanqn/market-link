import { useEffect, type ReactNode } from 'react';
import SettingsApi from '@/api-requests/settings.requests';
import useSession from '@/hooks/useSession';
import useSettings from '@/hooks/useSettings';
import SettingsStore, { normalize } from '@/lib/settings';

/**
 * - Đăng nhập (hoặc mở lại trang khi còn phiên) → lấy settings của tài khoản, bản server thắng bản trên máy.
 * - Ngôn ngữ, tiền tệ, đơn vị, ngày giờ đổi → dựng lại trang đang mở, vì format.ts đọc settings lúc render. Theme không
 *   cần: nó chỉ là data-theme trên <html>.
 */
const SettingsSync = ({ children }: { children: ReactNode }) => {
  const { user } = useSession();
  const s = useSettings();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    SettingsApi.get()
      .then((res) => {
        if (!cancelled && res.data) SettingsStore.set(normalize(res.data));
      })
      .catch(() => {
        // chưa có mạng / backend cũ chưa có API → dùng bản trên máy
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const key = [s.language, s.currency, s.units, s.dateFormat, s.clock, s.preferredMarket].join('|');
  return (
    <div key={key} className="contents">
      {children}
    </div>
  );
};

export default SettingsSync;
