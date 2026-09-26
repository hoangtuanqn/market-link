import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { ChevronRightIcon } from '@/components/icons';

/**
 * Khung "Password & security" trên trang Account: cả khung là một nút, bấm vào mở trang đổi mật khẩu riêng
 * (/account/password). Link tương đối theo đường dẫn, nên đặt khung này ở trang khác thì nó mở `<trang đó>/password`.
 */
const PasswordCard = () => {
  const { t } = useTranslation('CustomerAccount');
  return (
    <Link
      to="password"
      relative="path"
      aria-labelledby="set-security"
      aria-describedby="set-security-row"
      className="border-line-strong bg-surface-raised shadow-tag text-ink hover:border-ink focus-visible:outline-focus flex items-center gap-4 rounded-md border-[1.5px] p-6 no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <h2 id="set-security" className="text-h3">
          {t('password.section')}
        </h2>
        <span id="set-security-row">
          <b className="block text-[15px]">{t('password.row')}</b>
          <span className="text-ink-muted mt-0.5 block text-[13px]">{t('password.rowNote')}</span>
        </span>
      </div>
      <ChevronRightIcon aria-hidden="true" className="text-ink-muted flex-none" />
    </Link>
  );
};

export default PasswordCard;
