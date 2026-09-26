import { useEffect, useState } from 'react';
import AnnouncementApi from '@/api-requests/announcement.requests';
import AnnouncementBanner from '@/components/AnnouncementBanner';
import useSession from '@/hooks/useSession';
import type { Announcement } from '@/types/notification.types';

const DISMISSED_KEY = 'ml-announcement-dismissed';

const dismissedId = () => {
  try {
    return Number(localStorage.getItem(DISMISSED_KEY)) || null;
  } catch {
    return null;
  }
};

/**
 * FR-077 — dải xanh trên header, đọc thông báo đang hiệu lực cho người đang xem. Đóng thì nhớ theo id: thông báo mới sẽ
 * hiện lại. Đăng nhập / đăng xuất / đổi role thì đọc lại, vì banner lọc theo role.
 */
const LiveAnnouncementBanner = () => {
  const [live, setLive] = useState<Announcement | null>(null);
  const { user } = useSession();
  const viewer = user ? `${user.id}:${user.role}` : null;

  useEffect(() => {
    let cancelled = false;
    AnnouncementApi.live()
      .then((res) => !cancelled && setLive(res.data && res.data.id !== dismissedId() ? res.data : null))
      .catch(() => {
        /* không có banner cũng không sao */
      });
    return () => {
      cancelled = true;
    };
  }, [viewer]);

  if (!live) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, String(live.id));
    } catch {
      /* private window: chỉ ẩn trong lần này */
    }
    setLive(null);
  };

  return <AnnouncementBanner announcement={{ title: live.title, text: live.content }} onDismiss={dismiss} />;
};

export default LiveAnnouncementBanner;
