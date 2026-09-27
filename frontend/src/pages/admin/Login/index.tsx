import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router';
import { ChartIcon, LockIcon, LogoMark, ShieldIcon, StoreIcon } from '@/components/icons';
import Logo from '@/components/Logo';
import { USER_ROLE } from '@/constants/enums';
import { ADMIN_HOME_PATH } from '@/constants/nav';
import useSession from '@/hooks/useSession';
import Helper from '@/utils/helper';
import FormAdminLogin from './FormAdminLogin';

/**
 * A small kraft-paper tag on a string — the literal "Hang tag" brand idea (see the design system brand book), used
 * purely as decoration in the brand panel below the capability list.
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
 * FR-004 — the admin sign-in screen: a branded panel (left) making clear this is a separate admin area, and a focused
 * sign-in card (right). No navigation header/footer — this is not part of the Customer/Farmer layout. There is no
 * "Forgot password" yet: whether an admin resets their own password has not been decided (TODO in the prototype
 * admin/login.html).
 */
const AdminLoginPage = () => {
  const { t } = useTranslation('AdminLogin');
  const { user } = useSession();
  // Already signed in with an admin account → go straight into the admin area
  if (user?.role === USER_ROLE.ADMIN) return <Navigate to={ADMIN_HOME_PATH} replace />;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
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

      <section className="bg-surface-quiet flex flex-1 items-center justify-center px-4 py-6 md:px-6 md:pt-4 md:pb-16 lg:px-8">
        <div className="border-line-strong bg-surface-raised shadow-tag relative w-full max-w-110 overflow-hidden rounded-lg border-[1.5px]">
          <div aria-hidden="true" className="bg-brand absolute inset-x-0 top-0 h-1" />

          <div className="flex flex-col gap-6 p-6 md:p-8">
            <div className="flex flex-col items-center gap-1.5 text-center">
              <span className="bg-brand-tint text-brand-strong mb-2 flex size-11 items-center justify-center rounded-full">
                <LockIcon size={20} />
              </span>
              <p className="text-overline text-brand-strong font-bold uppercase">{t('form.eyebrow')}</p>
              <h1 className="text-h2 text-ink font-bold">{t('form.heading')}</h1>
              <p className="text-small text-ink-muted">{t('form.subheading')}</p>
            </div>

            <FormAdminLogin />
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminLoginPage;
