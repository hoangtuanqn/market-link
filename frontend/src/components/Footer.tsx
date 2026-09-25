import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { USER_ROLE } from '@/constants/enums';
import useSession from '@/hooks/useSession';
import type common from '@/locales/en/common.json';
import LanguageSwitcher from './LanguageSwitcher';
import Logo from './Logo';

type FooterKey = keyof (typeof common)['footer'];
type FooterLink = { label: FooterKey; to: string; show?: 'farmer' | 'notFarmer' };

/**
 * Keys under `footer.` in common.json; the text is looked up when rendering. Only a Farmer has pre-orders to handle;
 * everyone else is offered the way to become one.
 */
const COLUMNS: { title: FooterKey; links: FooterLink[] }[] = [
  {
    title: 'shop',
    links: [
      { label: 'marketsNearYou', to: '/markets' },
      { label: 'inSeason', to: '/products' },
      { label: 'marketMap', to: '/map' },
      { label: 'favoriteStalls', to: '/favorites' },
    ],
  },
  {
    title: 'sell',
    links: [
      { label: 'registerFarmer', to: '/register/farmer', show: 'notFarmer' },
      { label: 'handlingPreOrders', to: '/farmer/orders', show: 'farmer' },
      { label: 'stallGuidelines', to: '/about' },
    ],
  },
  {
    title: 'marketLink',
    links: [
      { label: 'aboutUs', to: '/about' },
      { label: 'contactUs', to: '/contact' },
      { label: 'feedback', to: '/feedback' },
    ],
  },
];

const Footer = () => {
  const { t } = useTranslation();
  const { user } = useSession();
  const isFarmer = user?.role === USER_ROLE.FARMER;
  const visible = (link: FooterLink) => !link.show || (link.show === 'farmer' ? isFarmer : !isFarmer);
  return (
    <footer className="bg-board text-on-board">
      <div className="mx-auto grid max-w-(--size-container) grid-cols-2 gap-8 px-4 pt-8 pb-4 md:grid-cols-[1.4fr_repeat(3,1fr)] md:px-6 md:pt-12 md:pb-6">
        <div className="col-span-full md:col-span-1">
          <Logo />
          <p className="text-small text-board-muted mt-3 max-w-75">{t('footer.tagline')}</p>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h2 className="text-overline text-board-muted mb-3 uppercase">{t(`footer.${col.title}`)}</h2>
            <ul className="flex flex-col gap-2">
              {col.links.filter(visible).map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-on-board text-[15px] no-underline hover:underline hover:underline-offset-3"
                  >
                    {t(`footer.${link.label}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="border-board-muted text-board-muted col-span-full flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-[13px]">
          <span>© 2026 MarketLink · TechWiz 7</span>
          <LanguageSwitcher />
          <span>{t('footer.mapData')}</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
