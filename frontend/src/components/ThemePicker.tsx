import { useTranslation } from 'react-i18next';
import Helper from '@/utils/helper';

// Swatches preview the two themes' surface and brand ink, so they stay fixed whatever theme is on
const THEMES = [
  { id: 'light', a: '#dcc59d', b: '#2f4a2a' },
  { id: 'dark', a: '#181410', b: '#8dbb7b' },
  { id: 'system', a: '#dcc59d', b: '#181410' },
] as const;

export type ThemeChoice = (typeof THEMES)[number]['id'];

/** Three-way theme swatch picker (design system `.pt-themes`); the choice applies at once (src/lib/settings.ts). */
const ThemePicker = ({ value, onChange }: { value: ThemeChoice; onChange: (v: ThemeChoice) => void }) => {
  const { t: tr } = useTranslation();
  return (
    <div className="flex gap-2" role="group" aria-label={tr('settings.theme')}>
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          aria-pressed={value === t.id}
          onClick={() => onChange(t.id)}
          className={Helper.cn(
            'flex flex-1 cursor-pointer flex-col overflow-hidden rounded-sm border-[1.5px] bg-transparent p-0',
            value === t.id ? 'border-brand shadow-[inset_0_0_0_2px_var(--brand)]' : 'border-line-strong',
          )}
        >
          <span className="grid h-10 grid-cols-2" aria-hidden="true">
            <i className="block" style={{ background: t.a }} />
            <i className="block" style={{ background: t.b }} />
          </span>
          <span className="text-ink px-0 pt-0 pb-1.5 text-center text-[12px] font-bold">
            {tr(`settings.themes.${t.id}`)}
          </span>
        </button>
      ))}
    </div>
  );
};

export default ThemePicker;
