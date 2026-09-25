import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { LogoMark } from './icons';

const Logo = ({ to, size = 30 }: { to?: string; size?: number }) => {
  const { t } = useTranslation();
  const content = (
    <>
      <LogoMark size={size} />
      <span className="font-hand text-2xl leading-none md:text-[28px]">MarketLink</span>
    </>
  );
  const className = 'inline-flex items-center gap-2.5 text-inherit no-underline';

  return to ? (
    <Link to={to} className={className} aria-label={t('logo.home')}>
      {content}
    </Link>
  ) : (
    <span className={className}>{content}</span>
  );
};

export default Logo;
