import { useState } from 'react';
import { avatarSrc, initials } from '@/lib/avatar';
import Helper from '@/utils/helper';

type AvatarProps = {
  name?: string;
  email?: string;
  url?: string;
  /** Đường kính (px). */
  size?: number;
  /** 'accent' trên nền board (header, drawer), nơi brand gần như trùng màu nền. */
  tone?: 'brand' | 'accent';
  className?: string;
};

/** Ảnh đại diện tròn; chưa có ảnh (hoặc ảnh lỗi) thì hiện chữ cái đầu trên nền brand. Chỉ để trang trí: tên đi kèm. */
const Avatar = ({ name, email, url, size = 32, tone = 'brand', className }: AvatarProps) => {
  const src = avatarSrc(url);
  // Nhớ URL bị lỗi thay vì một cờ boolean: đổi sang ảnh mới thì tự thử tải lại
  const [brokenSrc, setBrokenSrc] = useState<string>();
  const showImage = src && src !== brokenSrc;

  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      className={Helper.cn(
        tone === 'accent' ? 'bg-accent text-on-accent' : 'bg-brand text-on-brand',
        'inline-grid shrink-0 place-items-center overflow-hidden rounded-full leading-none font-bold select-none',
        className,
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
};

export default Avatar;
