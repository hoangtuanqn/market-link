import { useTranslation } from 'react-i18next';

const PILLARS = [
  { key: 'fresh', icon: '🌿' },
  { key: 'direct', icon: '🚜' },
  { key: 'guarantee', icon: '⏰' },
  { key: 'pay', icon: '🤝' },
] as const;

/** 4 core value propositions of MarketLink: Farm fresh, Direct from growers, Pre-order guarantee, Pay at stall. */
const ValuePillars = () => {
  const { t } = useTranslation('Home');

  return (
    <section
      aria-label="Our core promises"
      className="border-line-strong bg-surface-raised grid grid-cols-1 gap-6 rounded-xl border p-6 shadow-xs sm:grid-cols-2 md:p-7 lg:grid-cols-4"
    >
      {PILLARS.map((p) => (
        <div key={p.key} className="flex items-start gap-3.5">
          <div
            aria-hidden="true"
            className="border-line bg-brand/10 flex size-11 shrink-0 items-center justify-center rounded-lg border text-xl"
          >
            {p.icon}
          </div>
          <div>
            <h3 className="text-ink text-[16px] font-bold">{t(`pillars.${p.key}.title`)}</h3>
            <p className="text-ink-muted mt-1 text-[13px] leading-relaxed">{t(`pillars.${p.key}.desc`)}</p>
          </div>
        </div>
      ))}
    </section>
  );
};

export default ValuePillars;
