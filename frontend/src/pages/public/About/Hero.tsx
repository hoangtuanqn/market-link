import { useTranslation } from 'react-i18next';
import { ButtonLink } from '@/components/ui/button';

const Hero = () => {
  const { t } = useTranslation('About');

  return (
    <section className="about-hero-editorial">
      {/* Display Title */}
      <h1 className="about-hero-display-title">
        {t('hero.titleLine1', 'Where Vietnamese Farmers Entrust Living Soil,')}
        <br />
        <span className="about-hero-display-highlight">
          {t('hero.titleLine2', 'Where City Families Rediscover True Harvest.')}
        </span>
      </h1>

      {/* Lead Narrative */}
      <p className="about-hero-lead-text">
        {t(
          'intro',
          'No industrial cold warehouses. No exploitative middlemen. MarketLink was created to bridge fresh dawn-harvested family plots in Củ Chi and Đà Lạt directly with conscious Saigon tables every weekend.',
        )}
      </p>

      {/* Action Buttons */}
      <div className="about-hero-cta-row">
        <ButtonLink to="/markets" className="about-hero-btn">
          {t('hero.exploreMarkets', 'Explore Weekend Markets →')}
        </ButtonLink>
        <a
          href="#journey"
          className="ml-btn ml-btn-secondary"
          style={{ minHeight: '48px', padding: '0 24px', fontSize: '15px', fontWeight: 600 }}
        >
          {t('hero.seeJourney', 'See The 4-Step Harvest Journey')}
        </a>
      </div>

      {/* Asymmetric 3-Frame Editorial Montage */}
      <div className="about-hero-montage">
        {/* Frame Left */}
        <div className="about-montage-frame about-montage-left">
          <img
            className="about-montage-img"
            src="https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?w=600&q=80&auto=format&fit=crop"
            alt="Morning dew vegetable field in Củ Chi"
          />
          <div className="about-montage-pill">
            <span>🌅</span> {t('hero.badgeDawn', '05:00 AM · Harvested at dawn')}
          </div>
        </div>

        {/* Frame Center (Elevated) */}
        <div className="about-montage-frame about-montage-center">
          <img
            className="about-montage-img"
            src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1000&q=80&auto=format&fit=crop"
            alt="Crates of freshly picked vegetables"
          />
          <div className="about-montage-pill" style={{ background: 'rgba(31, 51, 27, 0.95)', fontSize: '13px' }}>
            <span>🌱</span> {t('hero.badgeReserved', '100% Pre-reserved · Zero farm waste')}
          </div>
        </div>

        {/* Frame Right */}
        <div className="about-montage-frame about-montage-right">
          <img
            className="about-montage-img"
            src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80&auto=format&fit=crop"
            alt="Weekend market stall interaction in Saigon"
          />
          <div className="about-montage-pill">
            <span>🧺</span> {t('hero.badgePickup', '07:30 AM · Picked up at stall')}
          </div>
        </div>
      </div>

      {/* Highlight Badges Ticker */}
      <div className="about-hero-ticker">
        <span className="about-ticker-pill">{t('hero.ticker1', '✨ Dawn-harvested produce')}</span>
        <span className="about-ticker-pill">{t('hero.ticker2', '🤝 100% Direct stall payment')}</span>
        <span className="about-ticker-pill">{t('hero.ticker3', '🌱 Verified local family farms')}</span>
        <span className="about-ticker-pill">{t('hero.ticker4', '📍 4 Saigon pickup hubs')}</span>
      </div>
    </section>
  );
};

export default Hero;
