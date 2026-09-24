import { useState } from 'react';
import Helper from '@/utils/helper';
import { HeartIcon } from './icons';

type FavoriteButtonProps = {
  initial?: boolean;
  /** Accessible labels for the off / on state, e.g. "Save Thảo Điền Weekend Market" */
  labelOff: string;
  labelOn: string;
  className?: string;
};

const FavoriteButton = ({ initial = false, labelOff, labelOn, className }: FavoriteButtonProps) => {
  const [on, setOn] = useState(initial);

  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? labelOn : labelOff}
      onClick={() => setOn((v) => !v)}
      className={Helper.cn(
        'bg-surface-raised text-ink aria-pressed:text-danger grid size-10 cursor-pointer place-items-center rounded-full',
        className,
      )}
    >
      <HeartIcon filled={on} />
    </button>
  );
};

export default FavoriteButton;
