import { useEffect } from 'react';
import PlatformApi from '@/api-requests/platform.requests';
import PlatformStatus from '@/lib/platformStatus';

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
