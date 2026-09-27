import { useTranslation } from 'react-i18next';

const EngineeringTeam = () => {
  const { t } = useTranslation('About');

  const team = [
    {
      name: 'Hoàng Tuấn',
      title: t('team.lead.role', 'System Architect & Tech Lead'),
      roleBadge: 'LEAD · Architecture',
      coverClass: 'cover-lead',
      status: 'Core System',
      milestone: t(
        'team.lead.note',
        'The schema, the API contract and the twelve decisions the rest of the team builds against.',
      ),
      tech: ['Java 25', 'Spring Boot', 'React 19', 'Docker'],
      quote: '“Software exists to elevate and celebrate honest human labor, not commoditize it.”',
      favCrop: '🥗 Củ Chi Baby Bok Choy',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=320&h=320&fit=crop&crop=faces&q=85',
    },
    {
      name: 'Mai Linh',
      title: t('team.be1.role', 'Backend & Order Lifecycle'),
      roleBadge: 'BE1 · Core Orders',
      coverClass: 'cover-be1',
      status: 'Real-time Engine',
      milestone: t('team.be1.note', 'Sign-in, roles and the order lifecycle, from placed through to completed.'),
      tech: ['Spring Security', 'JWT Auth', 'Flyway', 'Redis'],
      quote: '“Ensuring two shoppers can never accidentally book the exact same last crate.”',
      favCrop: '🍓 Đà Lạt Natural Strawberries',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=320&h=320&fit=crop&crop=faces&q=85',
    },
    {
      name: 'Bảo Long',
      title: t('team.be2.role', 'Data Architect & Analytics'),
      roleBadge: 'BE2 · Data & Inventory',
      coverClass: 'cover-be2',
      status: 'Inventory Sync',
      milestone: t('team.be2.note', 'Products, markets, weekly stock, reports and the seed data for the demo.'),
      tech: ['MySQL 8', 'JPA Hibernate', 'Redis Cache', 'Analytics'],
      quote: '“Accurate counts let growers check their phones at 4 AM and know exactly what to cut.”',
      favCrop: '🥑 Lâm Đồng 034 Avocados',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=320&h=320&fit=crop&crop=faces&q=85',
    },
    {
      name: 'Hà My',
      title: t('team.fe1.role', 'Lead UI/UX & Design System'),
      roleBadge: 'FE1 · Design System',
      coverClass: 'cover-fe1',
      status: 'UI/UX Tokens',
      milestone: t('team.fe1.note', 'The design system, the public pages, the map and the Customer dashboard.'),
      tech: ['Figma', 'Tailwind 4', 'TypeScript', 'Leaflet Maps'],
      quote: '“Tactile design that captures the warmth and honesty of walking a morning village market.”',
      favCrop: '🍅 Organic Heirloom Tomatoes',
      avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=320&h=320&fit=crop&crop=faces&q=85',
    },
    {
      name: 'Minh Đức',
      title: t('team.fe2.role', 'Frontend & Farmer Dashboard'),
      roleBadge: 'FE2 · Farmer Portal',
      coverClass: 'cover-fe2',
      status: 'Field Forms',
      milestone: t('team.fe2.note', 'The Farmer and Admin dashboards, and every form in the product.'),
      tech: ['React 19', 'Responsive UX', 'Mobile Web', 'Vite'],
      quote: '“Workflows that work effortlessly under direct morning sunlight on a crowded table.”',
      favCrop: '🌽 Đồng Nai Sweet Milk Corn',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=320&h=320&fit=crop&crop=faces&q=85',
    },
    {
      name: 'Khánh Vy',
      title: t('team.qa.role', 'QA & Grower Partnerships'),
      roleBadge: 'QA · Community Lead',
      coverClass: 'cover-qa',
      status: 'Field Verification',
      milestone: t(
        'team.qa.note',
        'The requirements list, the test data and the documents that go with the submission.',
      ),
      tech: ['JUnit 5', 'E2E Tests', 'SRS Compliance', 'Field Audit'],
      quote: '“Connecting with growers in person every week to anchor our codebase in real soil.”',
      favCrop: '🥬 Đà Lạt Highland Watercress',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=320&h=320&fit=crop&crop=faces&q=85',
    },
  ];

  return (
    <section className="about-section" id="team">
      {/* Section Header */}
      <div className="about-section-header">
        <div className="about-section-title-wrap">
          <span className="about-eyebrow">🚀 TECHWIZ 7 · {t('team.title', 'THE BUILDERS BEHIND MARKETLINK')}</span>
          <h2 className="about-section-title">{t('team.title', 'The Architecture & Engineering Team')}</h2>
          <p className="about-section-desc">
            {t('team.subtitle', 'Six people, split by what they own in the repository')}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="about-dev-status-dot" style={{ display: 'inline-block' }} />
          <span className="ml-muted" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--brand-strong)' }}>
            Team eGreen Basket · 100% In-house
          </span>
        </div>
      </div>

      {/* Grid of 6 Developer Cards */}
      <div className="about-team-grid">
        {team.map((dev, idx) => (
          <div key={idx} className="about-dev-card">
            {/* Cover Header */}
            <div className={`about-dev-cover ${dev.coverClass}`}>
              <span className="about-dev-role-badge">{dev.roleBadge}</span>
              <div className="about-dev-status">
                <span className="about-dev-status-dot" /> {dev.status}
              </div>
            </div>

            {/* Profile Overview Row */}
            <div className="about-dev-profile-wrap">
              <img className="about-dev-avatar" src={dev.avatar} alt={dev.name} />
              <div className="about-dev-socials">
                <a
                  className="about-dev-social-btn"
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub Profile"
                  title="GitHub"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                </a>
                <a
                  className="about-dev-social-btn"
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn Profile"
                  title="LinkedIn"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Card Body */}
            <div className="about-dev-body">
              <div className="about-dev-name-wrap">
                <h3 className="about-dev-name">{dev.name}</h3>
                <span className="about-dev-title">{dev.title}</span>
              </div>
              <div className="about-dev-impact">
                ⭐️ <b>Key Milestone:</b> {dev.milestone}
              </div>
              <div className="about-dev-tech-chips">
                {dev.tech.map((chip, cIdx) => (
                  <span key={cIdx} className="about-dev-tech-chip">
                    {chip}
                  </span>
                ))}
              </div>
              <p className="about-dev-motto">{dev.quote}</p>
              <div className="about-dev-fav">
                <span>Favorite Crop:</span> <b>{dev.favCrop}</b>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default EngineeringTeam;
