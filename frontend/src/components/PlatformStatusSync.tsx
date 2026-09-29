import { useEffect } from 'react';
import PlatformApi from '@/api-requests/platform.requests';
import PlatformStatus from '@/lib/platformStatus';

/**
 * Reads whether the site is under maintenance once at boot, for every visitor (signed in or not). Once loaded, further
 * updates come from axiosInstance's 503 watcher, not from polling.
 */
const PlatformStatusSync = () => {
  useEffect(() => {
    PlatformApi.status()
      .then((res) => PlatformStatus.set(res.data.maintenanceMode))
      .catch(() => {
        // no network / an old backend without the endpoint — assume the site is open
      });
  }, []);

  return null;
};

export default PlatformStatusSync;
