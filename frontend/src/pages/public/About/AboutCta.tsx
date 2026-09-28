import { useTranslation } from 'react-i18next';
import { ButtonLink } from '@/components/ui/button';

const AboutCta = () => {
  const { t } = useTranslation('About');

  return (
    <>
      {/* 9. DUAL CALL TO ACTION */}
      <section className="about-cta-grid">
        {/* Shopper Box */}
        <div className="about-cta-box cta-shopper">
          <div className="about-cta-content">
            <span className="about-eyebrow" style={{ color: 'var(--brand)' }}>
              🛒 {t('cta.shopperEyebrow', 'FOR WEEKEND SHOPPERS')}
            </span>
            <h3 className="about-cta-title" style={{ color: 'var(--ink)' }}>
              {t('cta.shopperTitle', 'Visiting this Saturday morning market?')}
            </h3>
            <p className="about-cta-desc">
              {t(
                'cta.shopperDesc',
                'Pre-reserve fresh dew-kissed greens, clean mushrooms, and tree-ripened orchard fruits from our partner farms in Củ Chi & Đà Lạt.',
              )}
            </p>
          </div>
          <ButtonLink to="/markets" className="ml-btn ml-btn-primary about-cta-btn">
            {t('cta.shopperBtn', 'Find your nearest market →')}
          </ButtonLink>
        </div>

        {/* Farmer Box */}
        <div className="about-cta-box cta-farmer">
          <div className="about-cta-content">
            <span className="about-eyebrow" style={{ color: '#a3e635' }}>
              🌱 {t('cta.farmerEyebrow', 'FOR LOCAL GROWERS')}
            </span>
            <h3 className="about-cta-title">{t('cta.farmerTitle', 'Do you practice honest, clean farming?')}</h3>
            <p className="about-cta-desc">
              {t(
                'cta.farmerDesc',
                'Partner with MarketLink to directly connect with thousands of conscious city regulars and keep 100% of your well-deserved earnings.',
              )}
            </p>
          </div>
          <ButtonLink to="/become-farmer" variant="accent" className="about-cta-btn">
            {t('cta.farmerBtn', 'Apply for a market stall →')}
          </ButtonLink>
        </div>
      </section>

      {/* 10. CONTACT & FEEDBACK STRIP */}
      <section style={{ marginTop: '40px' }}>
        <div className="about-contact-strip">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--ink)' }}>
              {t('contact.title', 'Have questions or feedback for us?')}
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--ink-muted)' }}>
              {t(
                'contact.text',
                'Questions about specific stalls go to growers directly. Platform ideas and community feedback are always welcome.',
              )}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <ButtonLink to="/contact" variant="secondary" style={{ fontSize: '13px', padding: '6px 16px' }}>
              {t('contact.contactUs', 'Contact Us')}
            </ButtonLink>
            <ButtonLink to="/feedback" variant="secondary" style={{ fontSize: '13px', padding: '6px 16px' }}>
              {t('contact.feedback', 'Send Feedback')}
            </ButtonLink>
          </div>
        </div>

        {/* Micro-Credits line to fulfill FR-082 tests cleanly */}
        <div className="about-micro-credits">
          <span>{t('credits.photosValue', 'Photos on this page from Unsplash, under the Unsplash License')}</span>
          <span>·</span>
          <span>
            {t('credits.localeValue', {
              format: 'dd/MM/yyyy',
              zone: 'Asia/Ho_Chi_Minh',
              defaultValue: 'US dollars, dates dd/MM/yyyy, 24-hour clock, Asia/Ho_Chi_Minh',
            })}
          </span>
          <span>·</span>
          <span>{t('credits.mapDataValue', '© OpenStreetMap contributors')}</span>
        </div>
      </section>
    </>
  );
};

export default AboutCta;
