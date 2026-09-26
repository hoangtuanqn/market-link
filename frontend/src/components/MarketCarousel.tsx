import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons';
import Helper from '@/utils/helper';

type MarketCarouselProps = {
  images: string[];
  marketName: string;
  className?: string;
};

const MarketCarousel = ({ images, marketName, className }: MarketCarouselProps) => {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const total = images.length;

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? total - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === total - 1 ? 0 : prev + 1));
  };

  const goToIndex = (idx: number) => {
    setCurrentIndex(idx);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      goToPrev();
    } else if (e.key === 'ArrowRight') {
      goToNext();
    }
  };

  // Touch swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (diff > minSwipeDistance) {
      goToNext();
    } else if (diff < -minSwipeDistance) {
      goToPrev();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (!images || images.length === 0) {
    return null;
  }

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={t('market.galleryLabel', { name: marketName, defaultValue: `Photos of ${marketName}` })}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={Helper.cn(
        'group border-line-strong bg-surface-sunken shadow-tag focus-visible:ring-brand relative w-full overflow-hidden rounded-md border-[1.5px] focus:outline-none focus-visible:ring-2',
        className,
      )}
    >
      {/* Main image container */}
      <div className="relative h-64 w-full sm:h-80 md:h-[420px]">
        {images.map((src, idx) => (
          <div
            key={src + idx}
            role="group"
            aria-roledescription="slide"
            aria-label={`${idx + 1} of ${total}`}
            className={Helper.cn(
              'absolute inset-0 size-full transition-opacity duration-500 ease-in-out',
              idx === currentIndex ? 'z-10 opacity-100' : 'pointer-events-none z-0 opacity-0',
            )}
          >
            <img
              src={src}
              alt={`${marketName} - photo ${idx + 1}`}
              className="size-full object-cover"
              loading={idx === 0 ? 'eager' : 'lazy'}
            />
            {/* Subtle bottom gradient to ensure dots & badges contrast clearly */}
            <div className="from-ink/60 via-ink/20 pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t to-transparent" />
          </div>
        ))}
      </div>

      {/* Prev & Next navigation buttons */}
      {total > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goToPrev();
            }}
            aria-label={t('common.prev', { defaultValue: 'Previous photo' })}
            className="border-line-strong bg-surface-raised/90 text-ink hover:bg-surface-raised absolute top-1/2 left-3 z-20 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-[1.5px] shadow-md backdrop-blur-sm transition-transform hover:scale-105 active:scale-95"
          >
            <ChevronLeftIcon size={18} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
            aria-label={t('common.next', { defaultValue: 'Next photo' })}
            className="border-line-strong bg-surface-raised/90 text-ink hover:bg-surface-raised absolute top-1/2 right-3 z-20 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-[1.5px] shadow-md backdrop-blur-sm transition-transform hover:scale-105 active:scale-95"
          >
            <ChevronRightIcon size={18} />
          </button>
        </>
      )}

      {/* Counter Badge */}
      <div className="border-line-strong bg-surface-raised/90 text-ink text-small absolute top-3 right-3 z-20 rounded-full border px-3 py-1 font-bold shadow-sm backdrop-blur-sm">
        {currentIndex + 1} / {total}
      </div>

      {/* Dot Indicators */}
      {total > 1 && (
        <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
          {images.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => goToIndex(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={Helper.cn(
                'h-2.5 rounded-full transition-all duration-300',
                idx === currentIndex ? 'bg-brand w-7 shadow-sm' : 'bg-surface-raised/75 hover:bg-surface-raised w-2.5',
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MarketCarousel;
