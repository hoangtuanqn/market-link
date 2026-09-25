import type { ReactNode } from 'react';
import Helper from '@/utils/helper';

type SettingsRowProps = {
  title: string;
  note?: string;
  wide?: boolean;
  children?: ReactNode;
};

/**
 * One row of a settings section: a label, an optional note, and its control. Laid out after `.pt-set` in
 * docs/prototype/prototype.css — that is prototype scaffolding, not the design system, so the look is rebuilt here in
 * Tailwind rather than borrowed.
 */
const SettingsRow = ({ title, note, wide, children }: SettingsRowProps) => (
  <li
    className={Helper.cn(
      'border-line grid grid-cols-1 items-center gap-4 border-t py-4 first:border-t-0 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_260px]',
      wide && 'md:grid-cols-1',
    )}
  >
    <div>
      <b className="block text-[15px]">{title}</b>
      {note && <p className="text-ink-muted mt-0.5 text-[13px]">{note}</p>}
    </div>
    {children}
  </li>
);

export default SettingsRow;
