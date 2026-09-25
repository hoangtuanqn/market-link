import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon } from '@/components/icons';
import { ButtonLink } from '@/components/ui/button';
import Helper from '@/utils/helper';

export type CarouselSlide = {
  topic: string;
  title: string;
  text: string;
  photo: string;
  alt: string;
  note?: string;
  cta?: [string, string];
};

const AUTO_MS = 5000;

/**
 * Auto-advancing slideshow (design system `.pt-car`). Holds while a pointer or focus is inside it (WCAG 2.2.2),
 * respects prefers-reduced-motion, and supports arrow keys, dots and a pause toggle.
 */
const Carousel = ({ slides, label }: { slides: CarouselSlide[]; label: string }) => {
  const [at, setAt] = useState(0);
  const [wanted, setWanted] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const heldRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => setWanted(!e.matches);
    reduce.addEventListener('change', onChange);
    return () => reduce.removeEventListener('change', onChange);
  }, []);

  const stop = useCallback(() => {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const run = useCallback(() => {
    stop();
    if (wanted && !heldRef.current) {
      timerRef.current = window.setInterval(() => setAt((v) => (v + 1) % slides.length), AUTO_MS);
    }
  }, [wanted, slides.length, stop]);

  useEffect(() => {
    run();
    return stop;
  }, [run, stop]);

  useEffect(() => {
    const onVisibility = () => (document.hidden ? stop() : run());
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [run, stop]);

  const go = (n: number) => setAt(((n % slides.length) + slides.length) % slides.length);
  const onHold = (held: boolean) => {
    heldRef.current = held;
    run();
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      go(at - 1);
      run();
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      go(at + 1);
      run();
      e.preventDefault();
    }
  };

  const current = slides[at];

  return (
    <section
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={() => onHold(true)}
      onMouseLeave={() => onHold(false)}
      onFocus={() => onHold(true)}
      onBlur={() => onHold(false)}
      onKeyDown={onKeyDown}
      className="border-line-strong bg-surface-sunken shadow-tag relative w-full overflow-hidden rounded-md border-[1.5px]"
    >
      <div className="relative min-h-[clamp(400px,33vw,500px)]">
        {slides.map((s, i) => (
          <article
            key={s.topic}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${slides.length}: ${s.topic}`}
            inert={i !== at}
            className={Helper.cn(
              'absolute inset-0 flex items-center transition-opacity duration-300',
              i === at ? 'visible opacity-100' : 'invisible opacity-0',
            )}
          >
            <img
              src={s.photo}
              alt={s.alt}
              loading={i === 0 ? 'eager' : 'lazy'}
              decoding="async"
              className="absolute inset-0 size-full object-cover"
            />
            {s.note && (
              <span className="bg-accent text-on-accent absolute top-4 right-4 rounded-sm px-2.5 py-0.5 text-[12px] font-bold md:top-6 md:right-6">
                {s.note}
              </span>
            )}
            <div className="relative box-border w-full p-4 pb-17 md:pt-8 md:pr-19 md:pb-18 md:pl-8">
              <div className="bg-surface-raised shadow-card flex w-full max-w-115 flex-col items-start gap-3 rounded-md p-4 md:p-5">
                <p className="text-overline text-ink-muted m-0">{s.topic}</p>
                <h3 className="m-0 text-[20px] leading-[28px] font-bold md:text-[24px] md:leading-[32px]">{s.title}</h3>
                <p className="m-0 text-[16px] leading-[24px]">{s.text}</p>
                {s.cta && (
                  <ButtonLink to={s.cta[1]} variant="secondary" size="sm" className="mt-1">
                    {s.cta[0]}
                  </ButtonLink>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      <button
        type="button"
        onClick={() => {
          go(at - 1);
          run();
        }}
        aria-label="Previous slide"
        className="border-line-strong bg-surface-raised text-ink hover:bg-surface-quiet hover:border-ink absolute bottom-4 left-4 z-2 grid size-9 place-items-center rounded-full border-[1.5px] md:top-1/2 md:bottom-auto md:left-5 md:size-11 md:-translate-y-1/2"
      >
        <ChevronLeftIcon />
      </button>
      <button
        type="button"
        onClick={() => {
          go(at + 1);
          run();
        }}
        aria-label="Next slide"
        className="border-line-strong bg-surface-raised text-ink hover:bg-surface-quiet hover:border-ink absolute right-4 bottom-4 z-2 grid size-9 place-items-center rounded-full border-[1.5px] md:top-1/2 md:right-5 md:bottom-auto md:size-11 md:-translate-y-1/2"
      >
        <ChevronRightIcon />
      </button>

      <div className="absolute inset-x-0 bottom-4 z-2 flex justify-center">
        <div className="border-line-strong bg-surface-raised flex items-center gap-0.5 rounded-full border-[1.5px] px-2">
          {slides.map((s, i) => (
            <button
              key={s.topic}
              type="button"
              aria-current={i === at}
              aria-label={`Show slide ${i + 1}: ${s.topic}`}
              onClick={() => {
                go(i);
                run();
              }}
              className="grid h-9 w-7 place-items-center"
            >
              <i
                className={Helper.cn(
                  'block h-2.5 rounded-full transition-all',
                  i === at ? 'bg-brand w-5.5' : 'bg-line-strong w-2.5',
                )}
              />
            </button>
          ))}
          <button
            type="button"
            onClick={() => setWanted((v) => !v)}
            aria-label={wanted ? 'Pause the slideshow' : 'Play the slideshow'}
            className="border-line ml-0.5 grid h-9 w-9 place-items-center border-l"
          >
            {wanted ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
          </button>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {current.topic}
      </p>
    </section>
  );
};

export default Carousel;
