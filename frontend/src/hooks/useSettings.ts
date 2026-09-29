import { useSyncExternalStore } from 'react';
import SettingsStore from '@/lib/settings';

const useSettings = () => useSyncExternalStore(SettingsStore.subscribe, SettingsStore.get, SettingsStore.get);

export default useSettings;
