import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import LanguageSwitcher from './LanguageSwitcher';
import Logo from './Logo';

/** Keys under `footer.` in common.json; the text is looked up when rendering. */
const COLUMNS = [
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
      { label: 'registerFarmer', to: '/register/farmer' },
      { label: 'handlingPreOrders', to: '/farmer/orders' },
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
] as const;

const Footer = () => {
  const { t } = useTranslation();
  return (
    <footer className="bg-board text-on-board">
      <div className="mx-auto grid max-w-300 grid-cols-2 gap-8 px-4 pt-8 pb-4 md:grid-cols-[1.4fr_repeat(3,1fr)] md:px-6 md:pt-12 md:pb-6">
        <div className="col-span-full md:col-span-1">
          <Logo />
          <p className="text-small text-board-muted mt-3 max-w-75">{t('footer.tagline')}</p>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h2 className="text-overline text-board-muted mb-3 uppercase">{t(`footer.${col.title}`)}</h2>
            <ul className="flex flex-col gap-2">
              {col.links.map((link) => (
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
