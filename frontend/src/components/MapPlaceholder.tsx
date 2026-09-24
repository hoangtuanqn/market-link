import Helper from '@/utils/helper';

/**
 * Stand-in for the real Leaflet + OpenStreetMap embed (FR-012/D-12). The real map component lands with the `map`
 * screen, then gets wired into every screen that references it.
 */
const MapPlaceholder = ({ label, className }: { label: string; className?: string }) => (
  <div
    role="img"
    aria-label={label}
    className={Helper.cn(
      'border-line-strong bg-surface-sunken text-ink-muted text-small flex min-h-60 items-center justify-center rounded-md border-[1.5px] p-4 text-center',
      className,
    )}
  >
    Map — {label}
  </div>
);

export default MapPlaceholder;
