import { ButtonLink } from '@/components/ui/button';
import { dayList } from '@/lib/format';
import type { MarketType } from '@/types/market.types';

/** Chalkboard listing the markets open this weekend. */
const OpenMarketsBoard = ({ markets }: { markets: MarketType[] }) => {
  return (
    <aside aria-labelledby="open-h" className="bg-board text-on-board flex flex-col gap-3 rounded-md p-6">
      <p className="text-overline text-board-muted uppercase">Open this weekend</p>
      <h2 id="open-h" className="font-hand text-[28px] leading-[1.1]">
        Where the stalls are
      </h2>

      <ul className="flex flex-col gap-2">
        {markets.map((m) => (
          <li
            key={m.id}
            className="border-board-muted flex justify-between gap-3 border-b border-dashed pb-2 text-[15px] last:border-b-0 last:pb-0"
          >
            <span>
              <b className="font-hand text-hand">{m.name}</b>
              <br />
              <span className="text-board-muted">{dayList(m.days)}</span>
            </span>
            <span className="tabular-nums">
              {m.open}–{m.close}
            </span>
          </li>
        ))}
      </ul>

      <ButtonLink to="/map" variant="accent" className="whitespace-normal">
        See all {markets.length} markets on the map
      </ButtonLink>
    </aside>
  );
};

export default OpenMarketsBoard;
