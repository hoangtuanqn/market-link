import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ChartIcon, LogoMark, ShieldIcon, StoreIcon } from '@/components/icons';
import Logo from '@/components/Logo';
import Helper from '@/utils/helper';

/**
 * A small kraft-paper tag on a string — the literal "Hang tag" brand idea (design system brand book), used purely as
 * decoration in the brand panel below the capability list.
 */
function HangTag({ className, tone, small }: { className?: string; tone: 'accent' | 'cream'; small?: boolean }) {
  return (
    <div
      className={Helper.cn(
        'shadow-tag relative rounded-sm',
        small ? 'h-[28px] w-[38px]' : 'h-[34px] w-[46px]',
        tone === 'accent' ? 'bg-accent' : 'bg-on-board',
        className,
      )}
    >
      <span className="bg-twine absolute top-[-14px] left-3.5 h-3.5 w-px" />
      <span className="bg-board absolute top-[-4px] left-2.5 size-2 rounded-full shadow-[inset_0_0_0_1.5px_var(--twine)]" />
    </div>
  );
}

/**
 * The shared brand panel of every admin sign-in screen (login, 2FA code entry, 2FA setup) — copy lives under the
 * AdminLogin namespace regardless of which page renders it, since it always says the same thing about the admin area.
 */
function BrandPanel() {
  const { t } = useTranslation('AdminLogin');
  return (
    <section className="bg-board text-on-board flex flex-col items-center overflow-hidden px-6 py-8 md:w-3/5 md:shrink-0 md:px-12 md:py-10">
      <div className="flex w-full max-w-130 flex-1 flex-col gap-8">
        <Logo to="/" variant="light" />

        <div className="flex max-w-100 flex-col gap-4">
          <p className="font-hand text-[44px] leading-[50px]">{t('brand.headline')}</p>
          <p className="text-body hidden max-w-85 md:block">{t('brand.intro')}</p>
          <hr className="border-twine hidden w-16 border-t-2 border-dashed opacity-55 md:block" />
          <ul className="hidden flex-col gap-3 md:flex">
            <li className="text-board-muted text-small flex items-start gap-2">
              <StoreIcon className="text-accent mt-0.5 flex-none" />
              <span>{t('brand.bullet1')}</span>
            </li>
            <li className="text-board-muted text-small flex items-start gap-2">
              <ShieldIcon className="text-accent mt-0.5 flex-none" />
              <span>{t('brand.bullet2')}</span>
            </li>
            <li className="text-board-muted text-small flex items-start gap-2">
              <ChartIcon className="text-accent mt-0.5 flex-none" />
              <span>{t('brand.bullet3')}</span>
            </li>
          </ul>
        </div>

        <div className="relative hidden min-h-[140px] flex-1 md:block">
          <HangTag tone="accent" className="absolute top-[6%] left-[8%] -rotate-[7deg]" />
          <HangTag tone="cream" small className="absolute top-[34%] left-[26%] rotate-[5deg]" />
          <div className="absolute right-0 bottom-0 opacity-90">
            <LogoMark size={190} variant="light" />
          </div>
        </div>

        <p className="text-board-muted text-caption hidden md:block">{t('brand.foot')}</p>
      </div>
    </section>
  );
}

/**
 * The centered icon + eyebrow + heading (+ optional subheading/links) at the top of the right-hand card, the same shape
 * on every admin sign-in screen.
 */
export function AdminAuthCardHeader({
  icon,
  eyebrow,
  heading,
  children,
}: {
  icon: ReactNode;
  eyebrow: string;
  heading: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <span className="bg-brand-tint text-brand-strong mb-2 flex size-11 items-center justify-center rounded-full">
        {icon}
      </span>
      <p className="text-overline text-brand-strong font-bold uppercase">{eyebrow}</p>
      <h1 className="text-h2 text-ink font-bold">{heading}</h1>
      {children && <div className="text-small text-ink-muted">{children}</div>}
    </div>
  );
}

/**
 * FR-004 / FR-008 — the 60/40 split frame shared by every admin sign-in screen (password, 2FA code entry, 2FA setup): a
 * brand panel (left, board green) and a raised card (right, the actual form). Separate from the Customer/Farmer layout
 * and from AdminLayout (no session assumed — Setup2FA has one, but sits outside AdminLayout regardless).
 */
const AdminAuthSplitShell = ({ children, cardClassName }: { children: ReactNode; cardClassName?: string }) => (
  <div className="flex min-h-screen flex-col md:flex-row">
    <BrandPanel />

    <section className="bg-surface-quiet flex flex-1 items-center justify-center px-4 py-6 md:px-6 md:pt-4 md:pb-16 lg:px-8">
      <div
        className={Helper.cn(
          'border-line-strong bg-surface-raised shadow-tag relative w-full overflow-hidden rounded-lg border-[1.5px]',
          cardClassName ?? 'max-w-110',
        )}
      >
        <div aria-hidden="true" className="bg-brand absolute inset-x-0 top-0 h-1" />
        <div className="flex flex-col gap-6 p-6 md:p-8">{children}</div>
      </div>
    </section>
  </div>
);

export default AdminAuthSplitShell;
