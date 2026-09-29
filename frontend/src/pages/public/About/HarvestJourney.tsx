import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const STEP_IMGS = [
  'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?w=800&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80&auto=format&fit=crop',
];

const HarvestJourney = () => {
  const { t } = useTranslation('About');
  const [currentStep, setCurrentStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const steps = [
    {
      stepNum: '01',
      tabTitle: t('journey.step1Tab', 'Thursday · Crop Listing'),
      timing: t('journey.step1Timing', '📅 Thursday Evening · Listing Opens'),
      title: t('journey.step1Title', 'Farmers Publish Their Weekend Harvest'),
      desc: t(
        'journey.step1Desc',
        'Growers walk their plots in Củ Chi and Long An to inspect peak ripeness. They post exact available quantities on their MarketLink stall for shoppers to reserve in advance.',
      ),
      tip: t(
        'journey.step1Tip',
        'No guesswork. You reserve what you need, and stalls know exactly how much to prepare.',
      ),
      img: STEP_IMGS[0],
    },
    {
      stepNum: '02',
      tabTitle: t('journey.step2Tab', 'Friday · Dawn Harvest'),
      timing: t('journey.step2Timing', '🌅 Friday 05:00 AM · Dawn Harvest to Order'),
      title: t('journey.step2Title', 'Cutting Strictly to Pre-Reserved Quantities'),
      desc: t(
        'journey.step2Desc',
        'At 05:00 AM, farmers harvest only the pre-reserved amounts. Greens are washed with clean water and packed gently into breathable wooden crates with zero crop waste.',
      ),
      tip: t(
        'journey.step2Tip',
        'Nothing is harvested speculatively. Less than 2% produce loss compared to 35% in wholesale supply chains.',
      ),
      img: STEP_IMGS[1],
    },
    {
      stepNum: '03',
      tabTitle: t('journey.step3Tab', 'Saturday · Market Hub'),
      timing: t('journey.step3Timing', '🚚 Saturday 06:00 AM · Community Market Gathering'),
      title: t('journey.step3Title', 'Fresh Baskets Arrive at Neighborhood Hubs'),
      desc: t(
        'journey.step3Desc',
        'Produce arrives directly at Thảo Điền, Phú Mỹ Hưng, and Bình Thạnh. Your pre-reserved basket is labeled with your name and kept cool in an allocated pickup stall.',
      ),
      tip: t(
        'journey.step3Tip',
        'No long transit through industrial depots. Food travels from farm soil to your neighborhood in under 18 hours.',
      ),
      img: STEP_IMGS[2],
    },
    {
      stepNum: '04',
      tabTitle: t('journey.step4Tab', '06:00 - 10:30 · Handshake'),
      timing: t('journey.step4Timing', '🤝 Saturday 06:00 - 10:30 AM · Stall Pickup'),
      title: t('journey.step4Title', 'Inspect In Person & Pay Cash Directly'),
      desc: t(
        'journey.step4Desc',
        'Smell the soil, inspect crisp freshness with your own hands, chat with the grower about their crops, and pay cash directly into the farmer’s hands at the stall.',
      ),
      tip: t(
        'journey.step4Tip',
        'Total peace of mind. You inspect quality before paying, and 100% of money stays with the hardworking grower.',
      ),
      img: STEP_IMGS[3],
    },
  ];

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [isPaused, steps.length]);

  const activeData = steps[currentStep];

  const handlePrev = () => {
    setCurrentStep((prev) => (prev - 1 + steps.length) % steps.length);
  };

  const handleNext = () => {
    setCurrentStep((prev) => (prev + 1) % steps.length);
  };

  return (
    <section className="about-section" id="journey">
      <div className="about-section-header">
        <div className="about-section-title-wrap">
          <span className="about-eyebrow">🔄 {t('journey.eyebrow', 'HOW IT WORKS')}</span>
          <h2 className="about-section-title">{t('journey.title', 'The 4-Step Harvest Journey')}</h2>
          <p className="about-section-desc">
            {t(
              'journey.desc',
              'An interactive look at our weekly cycle, directly linking rural family plots to urban dining tables.',
            )}
          </p>
        </div>
        <div className="journey-nav-arrows">
          <button type="button" className="journey-arrow-btn" onClick={handlePrev} aria-label="Previous step">
            ‹
          </button>
          <button type="button" className="journey-arrow-btn" onClick={handleNext} aria-label="Next step">
            ›
          </button>
        </div>
      </div>

      <div
        className="journey-carousel-container"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="journey-tabs-nav">
          {steps.map((step, idx) => (
            <button
              key={idx}
              type="button"
              className={`journey-tab-btn ${idx === currentStep ? 'active' : ''}`}
              onClick={() => setCurrentStep(idx)}
            >
              <span className="journey-tab-step">Step {step.stepNum}</span>
              <span className="journey-tab-title">{step.tabTitle}</span>
            </button>
          ))}
        </div>

        <div className="journey-slide-stage">
          <div className="journey-slide-img-wrap">
            <img className="journey-slide-img" src={activeData.img} alt={activeData.title} />
            <div className="journey-slide-badge">{activeData.stepNum}</div>
          </div>

          <div className="journey-slide-content">
            <span className="journey-slide-timing">{activeData.timing}</span>
            <h3 className="journey-slide-title">{activeData.title}</h3>
            <p className="journey-slide-desc">{activeData.desc}</p>
            <div className="journey-slide-tip">
              <span>💡</span>
              <div>
                <b>Why it matters:</b> {activeData.tip}
              </div>
            </div>
          </div>
        </div>

        <div className="journey-controls-row">
          <div className="journey-dots">
            {steps.map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={`journey-dot ${idx === currentStep ? 'active' : ''}`}
                onClick={() => setCurrentStep(idx)}
                aria-label={`Go to step ${idx + 1}`}
              />
            ))}
          </div>
          <span className="ml-muted" style={{ fontSize: '12px', fontWeight: 600 }}>
            Step {currentStep + 1} of {steps.length} · Auto-advances every 7s
          </span>
        </div>
      </div>
    </section>
  );
};

export default HarvestJourney;
