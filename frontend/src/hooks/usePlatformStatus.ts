import { useSyncExternalStore } from 'react';
import PlatformStatus from '@/lib/platformStatus';

/** Whether the site is under maintenance right now, updating itself the instant it changes. */
const usePlatformStatus = () => useSyncExternalStore(PlatformStatus.subscribe, PlatformStatus.get, PlatformStatus.get);

export default usePlatformStatus;
