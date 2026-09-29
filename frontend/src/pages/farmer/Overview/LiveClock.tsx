import { useEffect, useState } from 'react';
import { nowLabel } from '@/lib/format';

const LiveClock = () => {
  const [label, setLabel] = useState(() => nowLabel(new Date()));

  useEffect(() => {
    const id = setInterval(() => setLabel(nowLabel(new Date())), 15000);
    return () => clearInterval(id);
  }, []);

  return <time dateTime={new Date().toISOString()}>{label}</time>;
};

export default LiveClock;
