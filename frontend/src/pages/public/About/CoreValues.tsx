import { useTranslation } from 'react-i18next';

const CoreValues = () => {
  const { t } = useTranslation('About');

  const values = [
    {
      icon: '⚖️',
      title: t('values.v1Title', 'Direct Fair Trade'),
      desc: t(
        'values.v1Desc',
        'No exploitative middlemen. Every dong goes straight to the family farm growing your harvest.',
      ),
    },
    {
      icon: '🌱',
      title: t('values.v2Title', 'Radical Freshness'),
      desc: t(
        'values.v2Desc',
        'Harvested at dawn, picked up before noon. Produce that never sees cold industrial storage.',
      ),
    },
    {
      icon: '🤝',
      title: t('values.v3Title', 'Absolute Transparency'),
      desc: t(
        'values.v3Desc',
        'Clear origin plots, honest harvest times, and direct handshakes with your family grower.',
      ),
    },
    {
      icon: '♻️',
      title: t('values.v4Title', 'Zero Farm Waste'),
      desc: t(
        'values.v4Desc',
        'Farmers harvest only what has been pre-reserved on MarketLink, eliminating market discard.',
      ),
    },
  ];

  return (
    <section className="about-section">
      <div className="about-section-header">
        <div className="about-section-title-wrap">
          <span className="about-eyebrow">🌿 {t('values.eyebrow', 'WHAT GUIDES US')}</span>
          <h2 className="about-section-title">{t('values.title', 'Principles That Root Our Work')}</h2>
          <p className="about-section-desc">
            {t('values.desc', 'Four non-negotiable promises that keep MarketLink faithful to the soil and community.')}
          </p>
        </div>
      </div>

      <div className="about-values-grid">
        {values.map((val, idx) => (
          <div key={idx} className="about-value-card">
            <div className="about-value-icon">{val.icon}</div>
            <h3 className="about-value-h3">{val.title}</h3>
            <p className="about-value-p">{val.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default CoreValues;
