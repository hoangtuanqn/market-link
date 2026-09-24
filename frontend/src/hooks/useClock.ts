import { useEffect, useState } from 'react';

/** Current time, refreshed every `intervalMs` (default 15s). */
const useClock = (intervalMs = 15000) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
};

export default useClock;
