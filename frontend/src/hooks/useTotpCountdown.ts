import { useEffect, useState } from 'react';

const PERIOD_SECONDS = 30;

const secondsLeft = () => PERIOD_SECONDS - (Math.floor(Date.now() / 1000) % PERIOD_SECONDS);

/** FR-008: số giây còn lại của bước 30 giây TOTP hiện tại — đúng con số app authenticator đang đếm. */
const useTotpCountdown = () => {
  const [left, setLeft] = useState(secondsLeft);
  useEffect(() => {
    const id = window.setInterval(() => setLeft(secondsLeft()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return left;
};

export default useTotpCountdown;
