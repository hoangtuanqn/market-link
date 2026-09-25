import Helper from '@/utils/helper';

const THEMES = [
  { id: 'light', label: 'Light', a: '#dcc59d', b: '#2f4a2a' },
  { id: 'dark', label: 'Dark', a: '#181410', b: '#8dbb7b' },
  { id: 'system', label: 'Match device', a: '#dcc59d', b: '#181410' },
] as const;

export type ThemeChoice = (typeof THEMES)[number]['id'];

/**
 * Three-way theme swatch picker, laid out after `.pt-themes` in docs/prototype/prototype.css, which is
 * prototype scaffolding rather than the design system. Selection is stored locally only: the app has no dark
 * stylesheet yet, so picking "Dark" does not change how the page looks.
 */
const ThemePicker = ({ value, onChange }: { value: ThemeChoice; onChange: (v: ThemeChoice) => void }) => (
  <div className="flex gap-2" role="group" aria-label="Theme">
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
        <span className="text-ink px-0 pt-0 pb-1.5 text-center text-[12px] font-bold">{t.label}</span>
      </button>
    ))}
  </div>
);

export default ThemePicker;
