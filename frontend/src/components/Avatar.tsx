import { useState, type CSSProperties } from 'react';
import { avatarSrc, initials } from '@/lib/avatar';
import type { Tier } from '@/types/achievement.types';
import Helper from '@/utils/helper';

type AvatarProps = {
  name?: string;
  email?: string;
  url?: string;
  /** Diameter (px). */
  size?: number;
  /** 'accent' on a board background (header, drawer), where brand almost matches the background colour. */
  tone?: 'brand' | 'accent';
  /** Achievement tier: wraps the image in a ring by tier (src/styles/tiers.css). Without it there is no ring. */
  tier?: Tier;
  className?: string;
};

/** A higher tier gets a thicker ring (px added on top of the thickness by image size). */
const TIER_EXTRA_WIDTH: Record<Tier, number> = { bronze: 0, silver: 1, gold: 1, diamond: 2 };

const StarMark = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path fill="currentColor" d="M8 1.5l1.9 4 4.3.5-3.2 2.9.9 4.3L8 11.1l-3.9 2.1.9-4.3L1.8 6l4.3-.5z" />
  </svg>
);

const GemMark = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path fill="currentColor" d="M4.2 2.5h7.6L15 6.4 8 14 1 6.4zM3.6 6.4l4.4 5 4.4-5z" />
  </svg>
);

/**
 * A round avatar; with no image (or a broken image) it shows the initial letter on a brand background. Decoration only:
 * the name goes with it. With a `tier` it also wraps a tier ring; Gold and Diamond get a mark at the corner when the
 * image is 40px or more.
 */
const Avatar = ({ name, email, url, size = 32, tone = 'brand', tier, className }: AvatarProps) => {
  const src = avatarSrc(url);
  // Remember the URL that failed instead of a boolean flag: switching to a new image tries loading again by itself
  const [brokenSrc, setBrokenSrc] = useState<string>();
  const showImage = src && src !== brokenSrc;

  const face = (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      className={Helper.cn(
        tone === 'accent' ? 'bg-accent text-on-accent' : 'bg-brand text-on-brand',
        'inline-grid shrink-0 place-items-center overflow-hidden rounded-full leading-none font-bold select-none',
        !tier && className,
      )}
    >
      {showImage ? (
        <img
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setBrokenSrc(src)}
          className="size-full object-cover"
        />
      ) : (
        initials(name, email)
      )}
    </span>
  );

  if (!tier) return face;
  const mark = size >= 40 && (tier === 'gold' ? <StarMark /> : tier === 'diamond' ? <GemMark /> : null);
  // The ring is thick by image size (32px → 3px, 88px → 5px) and thicker by tier, so a small image in the header still shows the ring clearly
  const ringWidth = Math.max(3, Math.round(size / 22)) + TIER_EXTRA_WIDTH[tier];
  return (
    <span
      aria-hidden="true"
      data-tier={tier}
      style={{ '--tier-ring-width': `${ringWidth}px` } as CSSProperties}
      className={Helper.cn('ml-tier-ring', className)}
    >
      {face}
      {mark && <span className="ml-tier-mark">{mark}</span>}
    </span>
  );
};

export default Avatar;
