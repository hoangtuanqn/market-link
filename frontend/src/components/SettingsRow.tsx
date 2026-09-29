import type { ReactNode } from 'react';
import Helper from '@/utils/helper';

type SettingsRowProps = {
  title: string;
  note?: string;
  wide?: boolean;
  children?: ReactNode;
};

const SettingsRow = ({ title, note, wide, children }: SettingsRowProps) => (
  <li
    className={Helper.cn(
      'border-line grid grid-cols-1 items-center gap-4 border-t py-4 first:border-t-0 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_280px]',
      wide && 'md:grid-cols-1',
    )}
  >
    <div className="max-w-2xl min-w-0">
      <b className="text-ink block text-[15px] font-semibold">{title}</b>
      {note && <p className="text-ink-muted mt-0.5 text-[13px] leading-relaxed">{note}</p>}
    </div>
    {children}
  </li>
);

export default SettingsRow;
