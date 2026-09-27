import { useTranslation } from 'react-i18next';

const OperatingLimits = () => {
  const { t } = useTranslation('About');

  const limits = [
    {
      title: 'limits.payment',
      defaultText:
        '<b>No online payment.</b> You pay the Farmer at the stall when you collect. There is no card form anywhere in the product.',
    },
    {
      title: 'limits.delivery',
      defaultText: '<b>No delivery.</b> Every order is collected at the market, inside the window the stall sets.',
    },
    {
      title: 'limits.certification',
      defaultText:
        '<b>No certification.</b> MarketLink does not check licences or organic claims. Ask the Farmer at the stall.',
    },
    {
      title: 'limits.profiles',
      defaultText:
        '<b>No separate family profiles.</b> An account can be shared at home. The system does not tell people apart inside one account.',
    },
  ];

  return (
    <section className="about-section">
      <div className="about-section-header">
        <div className="about-section-title-wrap">
          <span className="about-eyebrow">🎯 {t('limits.title', 'What MarketLink does not do')}</span>
          <h2 className="about-section-title">{t('limits.title', 'Deliberate Architectural Decisions')}</h2>
          <p className="about-section-desc">
            Knowing what we <b>do not do</b> is just as critical to protecting the true spirit of the morning market.
          </p>
        </div>
      </div>

      <div className="about-principles-grid">
        {limits.map((item, idx) => (
          <div key={idx} className="about-principle-card">
            <div className="about-principle-tag-box">✕</div>
            <div className="about-principle-body">
              <p
                className="about-principle-why"
                style={{ fontSize: '14px', lineHeight: '22px' }}
                dangerouslySetInnerHTML={{ __html: t(item.title, item.defaultText) }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default OperatingLimits;
