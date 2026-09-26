import { useSyncExternalStore } from 'react';
import SettingsStore from '@/lib/settings';

/** The current settings, updating itself on change (Settings page, footer, another tab, the copy from the server). */
const useSettings = () => useSyncExternalStore(SettingsStore.subscribe, SettingsStore.get, SettingsStore.get);

export default useSettings;
