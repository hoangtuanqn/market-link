import { useEffect } from 'react';
import { useLocation } from 'react-router';

/** Restores scroll position to top on route change for BrowserRouter */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}
