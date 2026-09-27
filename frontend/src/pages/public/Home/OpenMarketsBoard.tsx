import { useTranslation } from 'react-i18next';
import { ButtonLink } from '@/components/ui/button';
import { dayList, formatClock } from '@/lib/format';
import type { MarketType } from '@/types/market.types';

/** Chalkboard listing the markets open this weekend. */
const OpenMarketsBoard = ({ markets }: { markets: MarketType[] }) => {
  const { t } = useTranslation('Home');
  return (
    <aside
      aria-labelledby="open-h"
      className="bg-board text-on-board relative flex flex-col gap-4 rounded-xl border-[3px] border-[#1f331c] p-6 shadow-lg md:p-7"
    >
      <div className="flex items-center justify-between border-b border-dashed border-[rgba(188,202,169,0.35)] pb-3">
        <span className="text-overline text-board-muted tracking-wider uppercase">{t('board.overline')}</span>
        <span className="border-status-ready-ink/40 bg-status-ready-ink/20 text-on-board inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold">
          {t('board.takingOrders')}
        </span>
      </div>

      <h2 id="open-h" className="font-hand text-on-board text-[26px] leading-[1.1]">
        {t('board.hours')}
      </h2>

      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {markets.slice(0, 4).map((m) => (
          <li
            key={m.id}
            className="flex justify-between gap-3 border-b border-dashed border-[rgba(188,202,169,0.3)] pb-2.5 text-[15px] last:border-b-0 last:pb-0"
          >
            <div>
              <b className="font-hand text-on-board text-[18px]">{m.name}</b>
              <div className="text-board-muted mt-0.5 text-[13px]">{dayList(m.days)}</div>
            </div>
            <span className="text-highlight pt-0.5 text-[14px] font-semibold tabular-nums">
              {formatClock(m.open)}–{formatClock(m.close)}
            </span>
          </li>
        ))}
      </ul>

      <ButtonLink to="/map" variant="accent" className="mt-1 w-full justify-center font-bold whitespace-normal">
        {t('board.seeAll_other', { count: markets.length })}
      </ButtonLink>
    </aside>
  );
};

export default OpenMarketsBoard;
