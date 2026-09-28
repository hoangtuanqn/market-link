import { useTranslation } from 'react-i18next';

const OriginStory = () => {
  const { t } = useTranslation('About');

  return (
    <section className="about-section" id="origin">
      {/* Section Header */}
      <div className="about-section-header">
        <div className="about-section-title-wrap">
          <span className="about-eyebrow">🌱 {t('story.eyebrow', 'HOW IT BEGAN')}</span>
          <h2 className="about-section-title">{t('why.title', 'The Dilemma Behind Early Market Mornings')}</h2>
          <p className="about-section-desc">
            {t(
              'story.desc',
              'Traditional morning markets run on word of mouth. That works until you travel across the city only to find an empty table.',
            )}
          </p>
        </div>
      </div>

      {/* Grid: 3 Dilemma Cards on Left + Visual Quote Card on Right */}
      <div className="about-origin-grid">
        <div className="about-origin-cards">
          {/* Card 1 */}
          <div className="about-dilemma-card">
            <span className="about-dilemma-tag tag-farmer">{t('story.farmerTitle', "The Farmer's Burden")}</span>
            <h3 className="about-dilemma-h3">
              {t('story.farmerH3', 'Harvest too much and crops spoil; harvest too little and regulars leave')}
            </h3>
            <p className="about-dilemma-p">
              {t(
                'why.farmers',
                'Waking at 03:00 AM without knowing what will sell. Unsold produce wilts in tropical heat or gets squeezed below cost by wholesale middlemen.',
              )}
            </p>
          </div>

          {/* Card 2 */}
          <div className="about-dilemma-card">
            <span className="about-dilemma-tag tag-customer">
              {t('story.customerTitle', "The City Family's Search")}
            </span>
            <h3 className="about-dilemma-h3">
              {t('story.customerH3', 'Searching for clean food for children, but arriving late means missing out')}
            </h3>
            <p className="about-dilemma-p">
              {t(
                'why.shoppers',
                'Authentic chemical-free produce vanishes before 07:00 AM. Arriving late leaves only wilted leftovers or untraceable commercial greens.',
              )}
            </p>
          </div>

          {/* Card 3 */}
          <div
            className="about-dilemma-card"
            style={{ borderLeft: '4px solid var(--brand)', borderColor: 'var(--card-border)' }}
          >
            <span className="about-dilemma-tag tag-solution">
              {t('story.solutionTitle', 'The MarketLink Solution')}
            </span>
            <h3 className="about-dilemma-h3">
              {t('story.solutionH3', 'Reserve Thursday · Dawn Harvest Friday · Pick Up Saturday')}
            </h3>
            <p className="about-dilemma-p">
              {t(
                'story.solutionDesc',
                'Farmers cut strictly what has been pre-ordered. Families secure prime dew-kissed produce with zero wasted labor or unsold crops.',
              )}
            </p>
          </div>
        </div>

        {/* Visual Card with Overlaid Quote */}
        <div className="about-origin-visual-card">
          <img
            className="about-origin-visual-img"
            src="https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=800&q=80&auto=format&fit=crop"
            alt="Hands holding fresh harvested vegetables with soil"
          />
          <div className="about-origin-quote-box">
            <p className="about-origin-quote-text">
              {t(
                'story.quote',
                '“When a grower knows their harvest has a guaranteed home, they can nurture the soil with complete peace of mind, free from chemical pesticides.”',
              )}
            </p>
            <div className="about-origin-author">
              <span>🌿</span>
              <span>
                <b>{t('story.quoteAuthor', 'Uncle Năm Tuấn · Củ Chi Eco-farm Owner (3-year partner)')}</b>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OriginStory;
