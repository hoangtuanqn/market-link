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
