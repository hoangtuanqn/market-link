import { useEffect, useState } from 'react';

export type GreetingPeriod = 'morning' | 'afternoon' | 'evening';

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
