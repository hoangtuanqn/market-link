import { useTranslation } from 'react-i18next';

interface TeamMember {
  name: string;
  title: string;
  roleBadge: string;
  coverClass: string;
  status: string;
  milestone: string;
  tech: string[];
  quote: string;
  favCrop: string;
  avatar: string;
  githubUrl: string;
  websiteUrl?: string;
}

const EngineeringTeam = () => {
  const { t } = useTranslation('About');

  const team: TeamMember[] = [
    {
      name: 'Phạm Hoàng Tuấn',
      title: t('team.lead.role', 'System Architect & Tech Lead'),
      roleBadge: 'LEAD · Architecture',
      coverClass: 'cover-lead',
      status: 'Core System',
      milestone: t(
        'team.lead.note',
        'The schema, the API contract and the twelve decisions the rest of the team builds against.',
      ),
      tech: ['Java 25', 'Spring Boot', 'React 19', 'Docker', 'MySQL 8'],
      quote: '“Software exists to elevate and celebrate honest human labor, not commoditize it.”',
      favCrop: '🥗 Củ Chi Baby Bok Choy',
      avatar: '/images/team/pham-hoang-tuan.png',
      githubUrl: 'https://github.com/hoangtuanqn',
      websiteUrl: 'https://htuanqn.id.vn/',
    },
    {
      name: 'Trần Phúc Khang',
      title: t('team.devops.role', 'DevOps & Infrastructure Engineer'),
      roleBadge: 'DEVOPS · Infrastructure',
      coverClass: 'cover-devops',
      status: 'CI/CD & Cloud Ops',
      milestone: t(
        'team.devops.note',
        'CI/CD branch guards, Docker compose environments, Vercel SPA hosting, and deployment pipeline.',
      ),
      tech: ['Docker Compose', 'GitHub Actions', 'Vercel', 'Linux', 'Spring Boot'],
      quote: '“Reliable pipelines and isolated environments make rapid innovation safe and effortless.”',
      favCrop: '🌽 Đồng Nai Sweet Milk Corn',
      avatar: '/images/team/tran-phuc-khang.png',
      githubUrl: 'https://github.com/MITOM06',
    },
    {
      name: 'Mai Trung Hậu',
      title: t('team.be.role', 'Backend Engineer & Core Modules'),
      roleBadge: 'BE · Core Platform',
      coverClass: 'cover-be',
      status: 'Core Services & APIs',
      milestone: t(
        'team.be.note',
        'Farmer stalls, pickup schedules, inventory lifecycle, and soft-delete data management.',
      ),
      tech: ['Java 25', 'Spring Boot', 'MySQL 8', 'JPA/Hibernate', 'Flyway'],
      quote: '“Accurate counts and strict invariants ensure two shoppers never clash on the same produce.”',
      favCrop: '🥑 Lâm Đồng 034 Avocados',
      avatar: '/images/team/mai-trung-hau.jpg',
      githubUrl: 'https://github.com/maaitlunghau',
    },
    {
      name: 'Lâm Hoàng An',
      title: t('team.fe.role', 'Frontend Engineer & UI/UX'),
      roleBadge: 'FE · Public & Portals',
      coverClass: 'cover-fe',
      status: 'Design System & Portals',
      milestone: t(
        'team.fe.note',
        'The Hang tag design system, public discovery pages, feedback portals, and customer dashboard.',
      ),
      tech: ['React 19', 'TypeScript', 'Tailwind 4', 'Leaflet Maps', 'Vite'],
      quote: '“Tactile design that captures the warmth and honesty of walking a morning village market.”',
      favCrop: '🍅 Organic Heirloom Tomatoes',
      avatar: '/images/team/lam-hoang-an.png',
      githubUrl: 'https://github.com/A8NDEV',
      websiteUrl: 'https://www.facebook.com/hoang.an.ytb',
    },
    {
      name: 'Nguyễn Hoàng Dũng',
      title: t('team.qa.role', 'QA Engineer & Technical Documentation'),
      roleBadge: 'QA · Compliance & Audit',
      coverClass: 'cover-qa',
      status: 'Field Audit & Verification',
      milestone: t(
        'team.qa.note',
        'The requirements list, E2E test scenarios, SRS compliance verification, and project deliverables.',
      ),
      tech: ['JUnit 5', 'Vitest', 'SRS Compliance', 'Field Audit', 'E2E Testing'],
      quote: '“Thorough testing and clear documentation anchor our digital marketplace in real-world trust.”',
      favCrop: '🥬 Đà Lạt Highland Watercress',
      avatar: '/images/team/nguyen-hoang-dung.jpg',
      githubUrl: 'https://github.com/hoangtuanqn/market-link',
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
            {t('team.subtitle', 'Five people, split by what they own in the repository')}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="about-dev-status-dot" style={{ display: 'inline-block' }} />
          <span className="ml-muted" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--brand-strong)' }}>
            Team eGreen Basket · 100% In-house
          </span>
        </div>
      </div>

      {/* Grid of 5 Developer Cards */}
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
              <img className="about-dev-avatar" src={dev.avatar} alt={dev.name} loading="lazy" />
              <div className="about-dev-socials">
                <a
                  className="about-dev-social-btn"
                  href={dev.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${dev.name} GitHub`}
                  title={dev.githubUrl.includes('market-link') ? 'MarketLink Repository' : `${dev.name} GitHub`}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                </a>
                {dev.websiteUrl ? (
                  <a
                    className="about-dev-social-btn"
                    href={dev.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${dev.name} Link`}
                    title="Website / Social"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                  </a>
                ) : (
                  <a
                    className="about-dev-social-btn"
                    href="https://github.com/hoangtuanqn/market-link"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="MarketLink Team"
                    title="MarketLink Team"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </a>
                )}
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
