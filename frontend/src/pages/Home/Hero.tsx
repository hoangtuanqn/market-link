import { ButtonLink } from '@/components/ui/button';
import useClock from '@/hooks/useClock';
import { formatTime, weekday } from '@/lib/format';
import type { MarketType } from '@/types/market.types';
import OpenMarketsBoard from './OpenMarketsBoard';
import SearchBar from './SearchBar';

const pad = (n: number) => String(n).padStart(2, '0');

const Hero = ({ markets }: { markets: MarketType[] }) => {
  const now = useClock();

  return (
    <section className="grid items-end gap-8 pt-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div className="flex flex-col gap-4">
        <p className="font-hand text-hand text-ink-muted">
          <time dateTime={now.toISOString()}>
            {weekday(now)} {pad(now.getDate())}/{pad(now.getMonth() + 1)} · {formatTime(now)}
          </time>{' '}
          · market weekend Fri 25 – Sun 27/09
        </p>
        <h1 className="font-hand md:text-display text-[44px] leading-12 md:leading-15.5 lg:text-[64px] lg:leading-17">
          Pre-order from the farmers market
        </h1>
        <p className="text-body-lg max-w-155">
          Reserve this week's produce from stalls at 4 markets around Ho Chi Minh City. Pick up at the stall and pay the
          Farmer directly.
        </p>

        <SearchBar />

        <div className="flex flex-wrap items-center gap-2">
          <ButtonLink to="/markets">Browse markets</ButtonLink>
          <ButtonLink to="/register/farmer" variant="secondary">
            Sell at MarketLink
          </ButtonLink>
        </div>
      </div>

      <OpenMarketsBoard markets={markets} />
    </section>
  );
};

export default Hero;
