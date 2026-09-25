import { Link } from 'react-router';
import { USER_ROLE } from '@/constants/enums';
import useSession from '@/hooks/useSession';
import Logo from './Logo';

type Column = { title: string; links: { label: string; to: string }[] };

/** Only a Farmer has pre-orders to handle; everyone else is offered the way to become one. */
const sellColumn = (isFarmer: boolean): Column => ({
  title: 'Sell',
  links: [
    isFarmer
      ? { label: 'Handling pre-orders', to: '/farmer/orders' }
      : { label: 'Register as a Farmer', to: '/register/farmer' },
    { label: 'Stall guidelines', to: '/about' },
  ],
});

const SHOP: Column = {
  title: 'Shop',
  links: [
    { label: 'Markets near you', to: '/markets' },
    { label: 'In season', to: '/products' },
    { label: 'Market map', to: '/map' },
    { label: 'Favorite stalls', to: '/favorites' },
  ],
};

const ABOUT: Column = {
  title: 'MarketLink',
  links: [
    { label: 'About us', to: '/about' },
    { label: 'Contact us', to: '/contact' },
    { label: 'Feedback & bug reports', to: '/feedback' },
  ],
};

const Footer = () => {
  const { user } = useSession();
  const columns = [SHOP, sellColumn(user?.role === USER_ROLE.FARMER), ABOUT];

  return (
    <footer className="bg-board text-on-board">
      <div className="mx-auto grid max-w-(--size-container) grid-cols-2 gap-8 px-4 pt-8 pb-4 md:grid-cols-[1.4fr_repeat(3,1fr)] md:px-6 md:pt-12 md:pb-6">
        <div className="col-span-full md:col-span-1">
          <Logo />
          <p className="text-small text-board-muted mt-3 max-w-75">
            Pre-order from your local farmers market, pick up at the stall. Pay the Farmer directly at pickup.
          </p>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <h2 className="text-overline text-board-muted mb-3 uppercase">{col.title}</h2>
            <ul className="flex flex-col gap-2">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-on-board text-[15px] no-underline hover:underline hover:underline-offset-3"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="border-board-muted text-board-muted col-span-full flex flex-wrap justify-between gap-3 border-t pt-4 text-[13px]">
          <span>© 2026 MarketLink · TechWiz 7</span>
          <span>Map data © OpenStreetMap contributors</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
