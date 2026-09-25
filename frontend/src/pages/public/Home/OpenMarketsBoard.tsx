import { useTranslation } from 'react-i18next';
import { ButtonLink } from '@/components/ui/button';
import { dayList, formatClock } from '@/lib/format';
import type { MarketType } from '@/types/market.types';

/** Chalkboard listing the markets open this weekend. */
const OpenMarketsBoard = ({ markets }: { markets: MarketType[] }) => {
  const { t } = useTranslation('Home');
  return (
    <aside aria-labelledby="open-h" className="bg-board text-on-board flex flex-col gap-3 rounded-md p-6">
      <p className="text-overline text-board-muted uppercase">{t('board.overline')}</p>
      <h2 id="open-h" className="font-hand text-[28px] leading-[1.1]">
        {t('board.title')}
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
              {formatClock(m.open)}–{formatClock(m.close)}
            </span>
          </li>
        ))}
      </ul>

      <ButtonLink to="/map" variant="accent" className="whitespace-normal">
        {t('board.seeAll', { count: markets.length })}
      </ButtonLink>
    </aside>
  );
};

export default OpenMarketsBoard;
