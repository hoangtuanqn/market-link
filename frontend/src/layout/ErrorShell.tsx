import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import Logo from '@/components/Logo';
import { Card } from '@/components/ui/card';

type ErrorShellProps = {
  children: ReactNode;
};

/**
 * Minimal, distraction-free frame for error screens (404 Not Found, 403 Forbidden). Excludes the main navigation header
 * and mega footer while preserving brand identity and providing helpful quick actions.
 */
const ErrorShell = ({ children }: ErrorShellProps) => {
  const { t } = useTranslation();

  return (
    <div className="bg-surface-quiet text-ink flex min-h-screen flex-col justify-between">
      <header className="w-full">
        <div className="mx-auto flex h-16 w-full max-w-(--size-container) items-center justify-between px-4 md:px-6">
          <Logo to="/" variant="ink" />
          <nav>
            <Link
              to="/"
              className="text-small text-ink-muted hover:text-ink font-sans underline-offset-4 hover:underline"
            >
              {t('logo.home')}
            </Link>
          </nav>
        </div>
        <div aria-hidden="true" className="border-line h-0 border-t border-dashed" />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8 md:py-12">
        <Card className="w-full max-w-130 p-6 text-center md:p-10">{children}</Card>
      </main>

      <footer className="w-full">
        <div aria-hidden="true" className="border-line h-0 border-t border-dashed" />
        <div className="text-ink-muted mx-auto flex w-full max-w-(--size-container) flex-col items-center justify-between gap-3 px-4 py-4 text-[13px] sm:flex-row md:px-6">
          <p>© 2026 MarketLink · TechWiz 7</p>
          <LanguageSwitcher variant="light" />
        </div>
      </footer>
    </div>
  );
};

export default ErrorShell;
