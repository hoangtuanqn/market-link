import './About.css';
import AboutCta from './AboutCta';
import CoreValues from './CoreValues';
import EngineeringTeam from './EngineeringTeam';
import GrowingRegions from './GrowingRegions';
import HarvestJourney from './HarvestJourney';
import Hero from './Hero';
import ImpactMetrics from './ImpactMetrics';
import OperatingLimits from './OperatingLimits';
import OriginStory from './OriginStory';

/**
 * FR-082 — What MarketLink is, how it operates, and who built it. Exact 1:1 implementation matching the approved design
 * proposal: Editorial magazine hero, interactive farm-to-table carousel, local growing regions, and elite developer
 * showcase.
 */
const AboutPage = () => {
  return (
    <div className="about-page-container">
      <Hero />
      <ImpactMetrics />
      <OriginStory />
      <HarvestJourney />
      <CoreValues />
      <OperatingLimits />
      <GrowingRegions />
      <EngineeringTeam />
      <AboutCta />
    </div>
  );
};

export default AboutPage;
