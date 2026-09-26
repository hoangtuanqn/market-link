import { useEffect, useState } from 'react';

const PERIOD_SECONDS = 30;

const secondsLeft = () => PERIOD_SECONDS - (Math.floor(Date.now() / 1000) % PERIOD_SECONDS);

/** FR-008: the seconds left of the current 30-second TOTP step — exactly the number the authenticator app is counting. */
const useTotpCountdown = () => {
  const [left, setLeft] = useState(secondsLeft);
  useEffect(() => {
    const id = window.setInterval(() => setLeft(secondsLeft()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return left;
};

export default useTotpCountdown;
