import { useId, useState } from 'react';
import { ArrowUpRight, Code2, Linkedin } from 'lucide-react';
import { creator } from '../data/creator';
import '../creator.css';

export function CreatorCard() {
  const titleId = useId();
  const [imageFailed, setImageFailed] = useState(false);
  return <article className="creator-card" aria-labelledby={titleId}>
    <div className="creator-photo">
      {creator.imageUrl && !imageFailed
        ? <img src={creator.imageUrl} alt={creator.name} width="96" height="96" loading="lazy" onError={() => setImageFailed(true)} />
        : <span aria-hidden="true">{creator.initials}</span>}
    </div>
    <div className="creator-copy">
      <div className="creator-name"><h2 id={titleId}>{creator.name}</h2><span className="creator-role"><Code2 size={12} aria-hidden="true" />{creator.role}</span></div>
      <p>{creator.introduction}</p>
    </div>
    <a className="creator-social" href={creator.linkedInUrl} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${creator.name} on LinkedIn (opens in a new tab)`}>
      <Linkedin size={15} aria-hidden="true" /><span>LinkedIn</span><ArrowUpRight size={13} aria-hidden="true" />
    </a>
  </article>;
}
