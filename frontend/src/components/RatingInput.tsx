import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StarIcon } from '@/components/icons';
import Helper from '@/utils/helper';

/** Keys under `rating.words.` in common.json, index = number of stars. */
const RATE_WORDS = ['none', 'poor', 'fair', 'good', 'veryGood', 'excellent'] as const;

type RatingInputProps = {
  legend: string;
  name: string;
  value: number;
  onChange: (value: number) => void;
};

/** Five-star rating input with a word readout (design system `.ml-rate`). */
const RatingInput = ({ legend, name, value, onChange }: RatingInputProps) => {
  const { t } = useTranslation();
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  const word = (n: number) => t(`rating.words.${RATE_WORDS[n]}`);

  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="text-small mb-2 p-0 font-bold">{legend}</legend>
      <div className="flex items-center gap-3">
        <div className="inline-flex gap-0.5" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label
              key={n}
              title={word(n)}
              onMouseEnter={() => setHover(n)}
              className={Helper.cn(
                'grid size-10 cursor-pointer place-items-center',
                shown >= n ? 'text-brand' : 'text-line-strong',
              )}
            >
              <input
                type="radio"
                name={name}
                value={n}
                checked={value === n}
                onChange={() => onChange(n)}
                className="sr-only"
              />
              <StarIcon size={28} filled={shown >= n} />
              <span className="sr-only">{t('rating.stars', { count: n, word: word(n) })}</span>
            </label>
          ))}
        </div>
        <span className="font-hand text-[21px]">{word(shown)}</span>
      </div>
    </fieldset>
  );
};

export default RatingInput;
