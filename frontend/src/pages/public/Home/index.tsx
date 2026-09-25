import { freshProducts, markets } from '@/data/home';
import FreshProducts from './FreshProducts';
import Hero from './Hero';
import HowItWorks from './HowItWorks';
import NearbyMarkets from './NearbyMarkets';

/** FR-010 FR-023 FR-077 FR-085 — data is still the prototype demo set (src/data/home.ts). */
const HomePage = () => {
  return (
    <div className="flex flex-col gap-8">
      <Hero markets={markets} />
      <NearbyMarkets markets={markets.slice(0, 4)} />
      <FreshProducts products={freshProducts} />
      <HowItWorks />
    </div>
  );
};

export default HomePage;
