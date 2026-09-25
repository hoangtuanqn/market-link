import { useCallback, useEffect, useSyncExternalStore } from 'react';
import AchievementApi from '@/api-requests/achievement.requests';
import useSession from '@/hooks/useSession';
import type { AchievementType } from '@/types/achievement.types';

type State = { status: 'idle' | 'loading' } | { status: 'ready'; data: AchievementType } | { status: 'error' };

/**
 * Header (viền avatar) và trang Account cùng cần thành tích của mình: tải một lần cho mỗi user, dùng chung, `reload`
 * khi cần số mới. Đổi tài khoản thì tải lại.
 */
let state: State = { status: 'idle' };
let loadedFor: number | null = null;
const listeners = new Set<() => void>();

const setState = (next: State) => {
  state = next;
  listeners.forEach((l) => l());
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

const fetchFor = async (userId: number) => {
  loadedFor = userId;
  setState({ status: 'loading' });
  try {
    const response = await AchievementApi.get();
    if (loadedFor === userId) setState({ status: 'ready', data: response.data });
  } catch {
    if (loadedFor === userId) setState({ status: 'error' });
  }
};

const useMyAchievements = () => {
  const { user } = useSession();
  const snapshot = useSyncExternalStore(subscribe, () => state);
  const userId = user?.id ?? null;

  useEffect(() => {
    if (userId === null) {
      loadedFor = null;
      if (state.status !== 'idle') setState({ status: 'idle' });
    } else if (loadedFor !== userId) {
      fetchFor(userId);
    }
  }, [userId]);

  const reload = useCallback(() => {
    if (userId !== null) fetchFor(userId);
  }, [userId]);

  return { state: userId === null ? ({ status: 'idle' } as State) : snapshot, reload };
};

export default useMyAchievements;
