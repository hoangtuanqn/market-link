import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { clampOffset, coverScale, MAX_ZOOM, MIN_ZOOM, type Offset } from './crop';

/** The side of the crop frame on screen (px); the dialog is 460px wide so it fits even a 375px screen. */
export const FRAME = 280;
const KEY_STEP = 10;
const ZOOM_STEP = 0.1;

export type CropState = { zoom: number; offset: Offset };

type CropStepProps = {
  image: HTMLImageElement;
  value: CropState;
  onChange: (next: CropState) => void;
};

/**
 * A round frame over the image: drag (mouse / touch) to move, the slider or the wheel to zoom, arrow keys and +/- on
 * the keyboard.
 */
const CropStep = ({ image, value, onChange }: CropStepProps) => {
  const { t } = useTranslation('CustomerAccount');
  const w = image.naturalWidth;
  const h = image.naturalHeight;
  const drag = useRef<{ id: number; x: number; y: number; start: Offset } | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const set = (zoom: number, offset: Offset) => {
    const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
    onChange({ zoom: z, offset: clampOffset(offset, w, h, FRAME, z) });
  };

  // Wheel: React attaches onWheel as passive so it cannot stop page scrolling, the listener must be attached by hand
  const latest = useRef({ value, set });
  useEffect(() => {
    latest.current = { value, set };
  });
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { value: v, set: s } = latest.current;
      s(v.zoom - Math.sign(e.deltaY) * ZOOM_STEP, v.offset);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, start: value.offset };
    setDragging(true);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    set(value.zoom, { x: d.start.x + e.clientX - d.x, y: d.start.y + e.clientY - d.y });
  };
  const endDrag = () => {
    drag.current = null;
    setDragging(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const { x, y } = value.offset;
    const moves: Record<string, Offset> = {
      ArrowLeft: { x: x - KEY_STEP, y },
      ArrowRight: { x: x + KEY_STEP, y },
      ArrowUp: { x, y: y - KEY_STEP },
      ArrowDown: { x, y: y + KEY_STEP },
    };
    if (moves[e.key]) {
      e.preventDefault();
      set(value.zoom, moves[e.key]);
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      set(value.zoom + ZOOM_STEP, value.offset);
    } else if (e.key === '-') {
      e.preventDefault();
      set(value.zoom - ZOOM_STEP, value.offset);
    }
  };

  const scale = coverScale(w, h, FRAME) * value.zoom;

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        ref={frameRef}
        role="group"
        tabIndex={0}
        aria-label={t('crop.frame')}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        style={{ width: FRAME, height: FRAME }}
        className={`bg-surface-sunken focus-visible:outline-brand relative touch-none overflow-hidden rounded-md outline-offset-2 select-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        <img
          src={image.src}
          alt=""
          draggable={false}
          style={{
            width: w * scale,
            height: h * scale,
            transform: `translate(calc(-50% + ${value.offset.x}px), calc(-50% + ${value.offset.y}px))`,
          }}
          className="pointer-events-none absolute top-1/2 left-1/2 max-w-none"
        />
        {/* The part outside the circle is darkened: that is the part cut off when the image is shown as a circle */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_200px_rgba(20,14,8,0.55)] ring-2 ring-white/80"
        />
      </div>

      <label className="flex w-full max-w-70 items-center gap-3">
        <span className="text-small font-bold">{t('crop.zoom')}</span>
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.01}
          value={value.zoom}
          onChange={(e) => set(Number(e.target.value), value.offset)}
          className="accent-brand flex-1"
        />
      </label>
    </div>
  );
};

export default CropStep;
