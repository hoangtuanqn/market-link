import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlayIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import Helper from '@/utils/helper';

type VideoThumbProps = {
  /** Đường dẫn do server trả về, ví dụ `/uploads/farmer-applications/abc.mp4`. */
  url: string;
  /**
   * Khung hình dựng sẵn từ file trên máy. Chỉ có lúc người dùng vừa chọn video; đọc lại từ server thì không dựng được
   * bằng canvas (khác origin) nên để trống và thẻ video tự lấy khung đầu.
   */
  poster?: string | null;
  /** Kích thước ô: mặc định vuông để xếp cùng hàng với ảnh, `size` cho một ô to hơn trong form. */
  className?: string;
  big?: boolean;
};

const apiBase = () => import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

/** Ảnh đại diện của một video kèm hộp thoại xem lại, dùng chung cho người nộp đơn và Admin duyệt. */
export function VideoThumb({ url, poster, className, big = false }: VideoThumbProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const src = `${apiBase()}${url}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('video.play')}
        className={Helper.cn(
          'group border-line-strong bg-surface-sunken relative cursor-pointer overflow-hidden border-[1.5px] p-0',
          big ? 'aspect-4/3 w-40 rounded-md' : 'size-20 rounded-sm',
          className,
        )}
      >
        {poster ? (
          <img src={poster} alt="" className="size-full object-cover" />
        ) : (
          // #t=0.5 để trình duyệt tua tới nửa giây rồi vẽ khung đó — khung 0 giây hay bị đen.
          <video src={`${src}#t=0.5`} preload="metadata" muted playsInline className="size-full object-cover" />
        )}
        <span
          aria-hidden="true"
          className={Helper.cn(
            'bg-ink/55 text-on-brand absolute inset-0 m-auto grid place-items-center rounded-full transition group-hover:scale-110',
            big ? 'size-11' : 'size-8',
          )}
        >
          <PlayIcon size={big ? 20 : 14} />
        </span>
      </button>

      <Dialog
        open={open}
        title={t('video.preview')}
        onClose={() => setOpen(false)}
        actions={
          <Button variant="secondary" type="button" onClick={() => setOpen(false)}>
            {t('video.close')}
          </Button>
        }
      >
        {/* Chỉ dựng thẻ video khi hộp thoại mở: đóng lại là gỡ khỏi DOM, tiếng không chạy tiếp phía sau. */}
        {open && (
          <video
            src={src}
            poster={poster ?? undefined}
            controls
            autoPlay
            playsInline
            className="max-h-[70vh] w-[min(78vw,640px)] rounded-sm bg-black"
          />
        )}
      </Dialog>
    </>
  );
}

export default VideoThumb;
