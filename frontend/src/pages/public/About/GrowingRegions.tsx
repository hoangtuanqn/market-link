import { useTranslation } from 'react-i18next';

const REGION_IMGS = [
  'https://images.unsplash.com/photo-1595855759920-86582396756a?w=600&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=600&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&q=80&auto=format&fit=crop',
];

const GrowingRegions = () => {
  const { t } = useTranslation('About');

  const regions = [
    {
      name: t('regions.r1Name', 'Củ Chi Organic Soil'),
      soil: t('regions.r1Soil', 'Alluvial Silt · 35 km away'),
      desc: t(
        'regions.r1Desc',
        'Rich river alluvium ideal for leafy bok choy, clean herbs, and natural hydroponic water spinach.',
      ),
      crop: t('regions.r1Specialty', '🥬 Specialty: Crisp leafy greens & heirloom herbs'),
      img: REGION_IMGS[0],
    },
    {
      name: t('regions.r2Name', 'Đà Lạt Mist Highland'),
      soil: t('regions.r2Soil', 'Red Basalt Soil · 300 km away'),
      desc: t(
        'regions.r2Desc',
        'Cool mountain temperate climate producing crisp sweet bell peppers, strawberries, and tender artichokes.',
      ),
      crop: t('regions.r2Specialty', '🍓 Specialty: Highland berries & sweet peppers'),
      img: REGION_IMGS[1],
    },
    {
      name: t('regions.r3Name', 'Mekong Delta Fruit Orchards'),
      soil: t('regions.r3Soil', 'Nutrient Riverbed · 75 km away'),
      desc: t(
        'regions.r3Desc',
        'Sun-drenched orchards growing natural sweet mangoes, pomelos, and heirloom seedless papayas.',
      ),
      crop: t('regions.r3Specialty', '🍊 Specialty: Sun-ripened pomelo & dragon fruit'),
      img: REGION_IMGS[2],
    },
    {
      name: t('regions.r4Name', 'Long An Eco Farmland'),
      soil: t('regions.r4Soil', 'Clay Loam · 45 km away'),
      desc: t(
        'regions.r4Desc',
        'Fertile transition plains producing fragrant cantaloupes, sweet corn, and organic climbing gourds.',
      ),
      crop: t('regions.r4Specialty', '🍈 Specialty: Honey melons & crisp gourds'),
      img: REGION_IMGS[3],
    },
  ];

  return (
    <section className="about-section">
      <div className="about-section-header">
        <div className="about-section-title-wrap">
          <span className="about-eyebrow">📍 {t('regions.eyebrow', 'LOCAL ECOSYSTEM')}</span>
          <h2 className="about-section-title">{t('regions.title', 'Four Preserved Growing Hubs')}</h2>
          <p className="about-section-desc">
            {t(
              'regions.desc',
              'Carefully selected microclimates surrounding Saigon producing clean, seasonal nourishment.',
            )}
          </p>
        </div>
      </div>

      <div className="about-regions-grid">
        {regions.map((r, idx) => (
          <div key={idx} className="about-region-card">
            <div className="about-region-img-wrap">
              <img className="about-region-img" src={r.img} alt={r.name} />
              <span className="about-region-distance-pill">{r.soil.split('·')[1]?.trim() || r.soil}</span>
            </div>
            <div className="about-region-body">
              <h3 className="about-region-name">{r.name}</h3>
              <span className="about-region-soil">{r.soil}</span>
              <p className="about-region-desc">{r.desc}</p>
              <div className="about-region-specialty">
                <span>{r.crop.slice(0, 2)}</span> {r.crop.slice(2)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default GrowingRegions;
