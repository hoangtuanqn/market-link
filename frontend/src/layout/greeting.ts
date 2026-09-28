import { useEffect, useState } from 'react';

export type GreetingPeriod = 'morning' | 'afternoon' | 'evening';

/**
 * Calculates current greeting period ('morning' | 'afternoon' | 'evening') based on user's local device/country time:
 *
 * - 05:00 - 11:59: morning
 * - 12:00 - 17:59: afternoon
 * - 18:00 - 04:59: evening
 */
export function getGreetingPeriod(date: Date = new Date()): GreetingPeriod {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) {
    return 'morning';
  }
  if (hour >= 12 && hour < 18) {
    return 'afternoon';
  }
  return 'evening';
}

export function useGreetingPeriod(): GreetingPeriod {
  const [period, setPeriod] = useState<GreetingPeriod>(() => getGreetingPeriod());

  useEffect(() => {
    const update = () => setPeriod(getGreetingPeriod());
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, []);

  return period;
}
