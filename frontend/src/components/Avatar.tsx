import { useState, type CSSProperties } from 'react';
import { avatarSrc, initials } from '@/lib/avatar';
import type { Tier } from '@/types/achievement.types';
import Helper from '@/utils/helper';

type AvatarProps = {
  name?: string;
  email?: string;
  url?: string;
  /** Đường kính (px). */
  size?: number;
  /** 'accent' trên nền board (header, drawer), nơi brand gần như trùng màu nền. */
  tone?: 'brand' | 'accent';
  /** Hạng thành tích: bọc ảnh trong viền theo hạng (src/styles/tiers.css). Không truyền thì không có viền. */
  tier?: Tier;
  className?: string;
};

/** Hạng cao hơn thì viền dày hơn (px cộng thêm vào độ dày theo cỡ ảnh). */
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
 * Ảnh đại diện tròn; chưa có ảnh (hoặc ảnh lỗi) thì hiện chữ cái đầu trên nền brand. Chỉ để trang trí: tên đi kèm. Có
 * `tier` thì bọc thêm viền hạng; Vàng và Kim cương có dấu ở góc khi ảnh từ 40px trở lên.
 */
const Avatar = ({ name, email, url, size = 32, tone = 'brand', tier, className }: AvatarProps) => {
  const src = avatarSrc(url);
  // Nhớ URL bị lỗi thay vì một cờ boolean: đổi sang ảnh mới thì tự thử tải lại
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
  // Viền dày theo cỡ ảnh (32px → 3px, 88px → 5px) và dày thêm theo hạng, để ảnh nhỏ trên header vẫn thấy rõ viền
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
