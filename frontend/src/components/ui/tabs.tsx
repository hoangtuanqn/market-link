import Helper from '@/utils/helper';

type TabItem = { id: string; label: string; count?: number };

type TabsProps = {
  label: string;
  tabs: TabItem[];
  value: string;
  onChange: (id: string) => void;
};

/** Underline tab strip (design system `.ml-tabs`). */
const Tabs = ({ label, tabs, value, onChange }: TabsProps) => (
  <div role="tablist" aria-label={label} className="border-line-strong flex gap-1 overflow-x-auto border-b-[1.5px]">
    {tabs.map((t) => {
      const selected = t.id === value;
      return (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={selected}
          tabIndex={selected ? 0 : -1}
          onClick={() => onChange(t.id)}
          className={Helper.cn(
            'relative inline-flex min-h-11 items-center gap-2 px-4 text-[15px] font-bold whitespace-nowrap after:absolute after:inset-x-3 after:-bottom-[1.5px] after:h-[3px] after:rounded-t-[3px]',
            selected ? 'text-ink after:bg-brand' : 'text-ink-muted hover:text-ink after:bg-transparent',
          )}
        >
          {t.label}
          {t.count != null && (
            <span
              className={Helper.cn(
                'grid h-5.5 min-w-5.5 place-items-center rounded-full px-1.5 text-[12px] tabular-nums',
                selected ? 'bg-accent text-on-accent' : 'bg-surface-sunken text-ink',
              )}
            >
              {t.count}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

export default Tabs;
