import { PageTitle } from '../components/Common';
import { CreatorCard } from '../components/CreatorCard';

export function AboutCreator() {
  return <div className="about-creator-page">
    <PageTitle eyebrow="BEHIND THE WORKSPACE" title="About Creator" description="Meet the person building SkillNex." />
    <CreatorCard />
  </div>;
}
