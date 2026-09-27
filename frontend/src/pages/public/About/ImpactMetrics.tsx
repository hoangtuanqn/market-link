import { useTranslation } from 'react-i18next';

const ImpactMetrics = () => {
  const { t } = useTranslation('About');

  const metrics = [
    {
      num: '100%',
      label: t('metrics.middlemen', 'Direct Cash to Growers'),
      sub: t('metrics.middlemenSub', 'Zero intermediary margins, money goes straight to family growers.'),
    },
    {
      num: '42+',
      label: t('metrics.farms', 'Family Farms Partnered'),
      sub: t('metrics.farmsSub', 'Across Củ Chi, Đà Lạt, Miền Tây.'),
    },
    {
      num: '100%',
      label: t('metrics.harvests', 'Weekend Morning Harvests'),
      sub: t('metrics.harvestsSub', 'Cut to order at dawn.'),
    },
    {
      num: '< 25 km',
      label: t('metrics.miles', 'Food Miles Saved'),
      sub: t('metrics.milesSub', 'Under 25 km average transit distance.'),
    },
  ];

  return (
    <section className="about-stats-grid">
      {metrics.map((item, idx) => (
        <div key={idx} className="about-stat-card">
          <span className="about-stat-number">{item.num}</span>
          <span className="about-stat-label">{item.label}</span>
          <div className="about-stat-sub">{item.sub}</div>
        </div>
      ))}
    </section>
  );
};

export default ImpactMetrics;
