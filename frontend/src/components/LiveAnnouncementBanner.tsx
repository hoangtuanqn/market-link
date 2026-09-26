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
 * FR-077 — the banner strip on the header, reads the announcement currently in effect for the person viewing. Closing
 * it is remembered by id: a new announcement will show again. Signing in / out / changing role reads it again, because
 * the banner is filtered by role.
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
        /* no banner is fine too */
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
      /* private window: only hidden for this time */
    }
    setLive(null);
  };

  return <AnnouncementBanner announcement={{ title: live.title, text: live.content }} onDismiss={dismiss} />;
};

export default LiveAnnouncementBanner;
