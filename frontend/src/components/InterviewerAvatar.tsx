import { useId } from 'react';

export function InterviewerAvatar({
  speaking = false,
  listening = false,
}: {
  speaking?: boolean;
  listening?: boolean;
}) {
  const id = useId().replace(/:/g, '');
  return (
    <div
      className={
        'interviewer-avatar ' + (speaking ? 'is-speaking' : listening ? 'is-listening' : '')
      }
      aria-hidden="true"
    >
      <div className="avatar-halo" />
      <div className="avatar-halo second" />
      <svg viewBox="0 0 320 340" role="presentation">
        <defs>
          <linearGradient id={id + 'shirt'} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#62758d" />
            <stop offset="1" stopColor="#29364b" />
          </linearGradient>
          <linearGradient id={id + 'skin'} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#f1bd98" />
            <stop offset="1" stopColor="#d88e6d" />
          </linearGradient>
        </defs>
        <ellipse cx="160" cy="322" rx="117" ry="16" fill="#181227" opacity=".2" />
        <path d="M58 328v-38c0-52 43-76 102-76s102 24 102 76v38Z" fill={'url(#' + id + 'shirt)'} />
        <path d="m130 218 30 32 30-32 14 9-18 57-26-34-26 34-18-57Z" fill="#edf1f7" />
        <path d="M139 195h42v29c-7 20-35 20-42 0Z" fill="#d99272" />
        <path d="M96 153c-11-51-5-111 48-118 41-20 88 14 86 58l-8 79-126 9Z" fill="#302133" />
        <ellipse cx="98" cy="143" rx="13" ry="22" fill="#dc9978" />
        <ellipse cx="221" cy="143" rx="13" ry="22" fill="#dc9978" />
        <path
          d="M105 92c16-22 85-32 109 0v64c0 43-26 66-54 66s-55-27-55-66Z"
          fill={'url(#' + id + 'skin)'}
        />
        <path
          d="M97 122c-9-47 8-81 49-86 48-9 82 26 77 81-12-15-21-39-24-49-19 26-57 43-97 40Z"
          fill="#302133"
        />
        <path
          d="M122 127q12-8 24-1M177 126q12-8 24 1"
          fill="none"
          stroke="#4b2d31"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <g className="avatar-eyes">
          <ellipse cx="136" cy="143" rx="5" ry="6" fill="#33252d" />
          <ellipse cx="188" cy="143" rx="5" ry="6" fill="#33252d" />
          <circle cx="138" cy="141" r="1.5" fill="white" />
          <circle cx="190" cy="141" r="1.5" fill="white" />
        </g>
        <path
          d="m161 144-5 20q5 4 11 0"
          stroke="#bd765d"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        <ellipse cx="124" cy="167" rx="11" ry="5" fill="#cf7f70" opacity=".28" />
        <ellipse cx="198" cy="167" rx="11" ry="5" fill="#cf7f70" opacity=".28" />
        <g className="avatar-mouth">
          <path d="M143 183q18 15 36 0q-18 5-36 0" fill="#713d47" />
          <path d="M148 185h26q-13 6-26 0" fill="#fff5ec" />
        </g>
        <path
          d="M87 111c-2-56 30-88 74-88s77 35 75 87"
          fill="none"
          stroke="#c1cedd"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <rect x="81" y="119" width="14" height="39" rx="7" fill="#94a7c0" />
        <rect x="225" y="119" width="14" height="39" rx="7" fill="#94a7c0" />
        <path d="M231 153v18q0 17-28 17" fill="none" stroke="#94a7c0" strokeWidth="4" />
        <rect x="191" y="183" width="19" height="9" rx="4.5" fill="#34445d" />
        <path d="M99 285v43M221 285v43" stroke="#8499b6" strokeWidth="3" opacity=".5" />
      </svg>
      <div className="avatar-sound-bars">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} style={{ animationDelay: `${i * 110}ms` }} />
        ))}
      </div>
    </div>
  );
}
