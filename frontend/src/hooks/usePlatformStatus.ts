import { useSyncExternalStore } from 'react';
import PlatformStatus from '@/lib/platformStatus';

const usePlatformStatus = () => useSyncExternalStore(PlatformStatus.subscribe, PlatformStatus.get, PlatformStatus.get);

export default usePlatformStatus;
