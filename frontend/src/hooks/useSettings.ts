import { useSyncExternalStore } from 'react';
import SettingsStore from '@/lib/settings';

/** Settings hiện tại, tự cập nhật khi đổi (trang Settings, footer, tab khác, bản từ server). */
const useSettings = () => useSyncExternalStore(SettingsStore.subscribe, SettingsStore.get, SettingsStore.get);

export default useSettings;
