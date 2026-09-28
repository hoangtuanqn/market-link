import type { ReactNode, SVGProps } from 'react';

export type IconProps = SVGProps<SVGSVGElement> & { size?: number };

/** 16px glyph, 1.75 stroke, currentColor (design system icon style). */
function Glyph({ size = 16, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5L14 14" />
    </Glyph>
  );
}

export function CartIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M1.5 2h2l1.6 8h7.4l1.5-5.5H4.3" />
      <circle cx="6.5" cy="13" r="1" />
      <circle cx="11.5" cy="13" r="1" />
    </Glyph>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M4 11V7a4 4 0 018 0v4l1.2 1.5H2.8z" />
      <path d="M6.5 14h3" />
    </Glyph>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5v3.2l2 1.3" />
    </Glyph>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1.5v1.5M8 13v1.5M1.5 8h1.5M13 8h1.5M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1" />
    </Glyph>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M14 8.5A6 6 0 1 1 7.5 2 4.7 4.7 0 0 0 14 8.5z" />
    </Glyph>
  );
}

export function HandWaveIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d="M19.5 7a4 4 0 0 0-1.5-3" />
      <path d="M22 8.5a7 7 0 0 0-2.5-5.5" />
      <path d="M16 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2" />
      <path d="M12 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v2" />
      <path d="M8 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8" />
      <path d="M16 8a2 2 0 1 1 4 0v5a7 7 0 0 1-7 7H11c-2.5 0-4-.8-5.3-2.1l-3.2-3.2a1.8 1.8 0 0 1 2.5-2.5L7 14" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M3 8.5l3.2 3L13 4.5" />
    </Glyph>
  );
}

export function DoubleCheckIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M1.5 8.5l3 3L10 5" />
      <path d="M7.5 11.3l.3.2L14.5 5" />
    </Glyph>
  );
}

export function ReceiptIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M3 5.5h10l-.8 8H3.8z" />
      <path d="M5.8 5.5V4.3a2.2 2.2 0 014.4 0v1.2" />
    </Glyph>
  );
}

export function CircleSlashIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <circle cx="8" cy="8" r="6" />
      <path d="M3.8 12.2l8.4-8.4" />
    </Glyph>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <rect x="3" y="7" width="10" height="7" rx="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 015 0v2" />
    </Glyph>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" />
      <circle cx="8" cy="8" r="2" />
    </Glyph>
  );
}

export function EyeOffIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M6.2 4A6.5 6.5 0 018 3.5C12 3.5 14.5 8 14.5 8a11 11 0 01-1.7 2.2" />
      <path d="M10.6 11.8A6.3 6.3 0 018 12.5C4 12.5 1.5 8 1.5 8a11.3 11.3 0 012.8-3.3" />
      <path d="M6.6 6.6a2 2 0 002.8 2.8" />
      <path d="M2 2l12 12" />
    </Glyph>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M2 4h12M2 8h12M2 12h12" />
    </Glyph>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </Glyph>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 7.2v4" />
      <path d="M8 4.8v.2" />
    </Glyph>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M8 1.8l6.5 11.4h-13z" />
      <path d="M8 6.2v3.3" />
      <path d="M8 11.4v.1" />
    </Glyph>
  );
}

export function MegaphoneIcon(props: IconProps) {
  return (
    <Glyph size={18} {...props}>
      <path d="M2 6.5v3h2.5l5 3v-9l-5 3z" />
      <path d="M12 5.5a3.5 3.5 0 010 5" />
    </Glyph>
  );
}

export function HeartIcon({ filled = false, size = 18 }: { filled?: boolean; size?: number }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      aria-hidden="true"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinejoin="round"
    >
      <path d="M8 13.5S2 10 2 5.9A3 3 0 018 4.6a3 3 0 016 1.3C14 10 8 13.5 8 13.5z" />
    </svg>
  );
}

export function RestockIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M13.5 8a5.5 5.5 0 11-1.6-3.9" />
      <path d="M13.5 2.5v2.8h-2.8" />
    </Glyph>
  );
}

export function StoreIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M2.6 6.4h10.8v7.1H2.6z" />
      <path d="M1.6 3.4h12.8l.6 3H1z" />
      <path d="M6.4 13.5V9.7h3.2v3.8" />
    </Glyph>
  );
}

export function StarIcon({ filled = false, size = 16 }: { filled?: boolean; size?: number }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      aria-hidden="true"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinejoin="round"
    >
      <path d="M8 1.8l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.6l-3.8 2 .7-4.3-3.1-3 4.3-.6z" />
    </svg>
  );
}

export function DashboardIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <rect x="2" y="2" width="5.2" height="5.2" rx="1" />
      <rect x="8.8" y="2" width="5.2" height="5.2" rx="1" />
      <rect x="2" y="8.8" width="5.2" height="5.2" rx="1" />
      <rect x="8.8" y="8.8" width="5.2" height="5.2" rx="1" />
    </Glyph>
  );
}

export function BoxIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M8 1.8l5.5 3v6.4L8 14.2l-5.5-3V4.8z" />
      <path d="M2.5 4.8L8 7.8l5.5-3M8 7.8v6.4" />
    </Glyph>
  );
}

export function TagIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M8.3 1.9H14v5.7L7.6 14 2 8.4z" />
      <circle cx="11" cy="5" r="1" />
    </Glyph>
  );
}

export function ChartIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M2 13.4h12" />
      <path d="M4.3 11.2V7.3M7.5 11.2V3.6M10.7 11.2V8.6M13.3 11.2V5.6" />
    </Glyph>
  );
}

export function ChatIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M2 3.6h12v7.5H8.2l-3.7 2.6v-2.6H2z" />
    </Glyph>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <circle cx="6" cy="5.4" r="2.5" />
      <path d="M1.8 13.6c0-2.3 1.9-4.1 4.2-4.1s4.2 1.8 4.2 4.1" />
      <path d="M11 3.3a2.5 2.5 0 010 4.6" />
      <path d="M12.1 9.9c1.3.6 2.1 1.9 2.1 3.7" />
    </Glyph>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M8 1.8l5 1.8v4.1c0 3-2.1 5.2-5 6.5-2.9-1.3-5-3.5-5-6.5V3.6z" />
      <path d="M5.9 7.9l1.6 1.6 3-3.1" />
    </Glyph>
  );
}

export function SlidersIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M2 4.6h12M2 11.4h12" />
      <circle cx="6" cy="4.6" r="1.8" />
      <circle cx="10.4" cy="11.4" r="1.8" />
    </Glyph>
  );
}

export function LogOutIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M6.3 2.6H3.4a1.2 1.2 0 00-1.2 1.2v8.4a1.2 1.2 0 001.2 1.2h2.9" />
      <path d="M10.6 11l3-3-3-3" />
      <path d="M13.6 8H6.4" />
    </Glyph>
  );
}

export function FoldIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <rect x="2" y="2.6" width="12" height="10.8" rx="1.6" />
      <path d="M6.4 2.6v10.8" />
    </Glyph>
  );
}

export function SwapIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M3 5.6h9.4l-2.3-2.3" />
      <path d="M13 10.4H3.6l2.3 2.3" />
    </Glyph>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M10 3L5 8l5 5" />
    </Glyph>
  );
}

export function TrendUpIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M2.4 11.6L6.4 7.2l2.9 2.9 4.3-4.9" />
      <path d="M10.6 5.2h3.4v3.3" />
    </Glyph>
  );
}

export function TrendDownIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M2.4 4.4L6.4 8.8l2.9-2.9 4.3 4.9" />
      <path d="M10.6 10.8h3.4V7.5" />
    </Glyph>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M6 3l5 5-5 5" />
    </Glyph>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M6 3.5v9M10 3.5v9" />
    </Glyph>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M5.5 3.4l6.2 4.6-6.2 4.6z" />
    </Glyph>
  );
}

/**
 * MarketLink mark: a market stall under an arch — striped awning, produce on the counter. The logo is brand artwork, so
 * its colours are fixed hex rather than theme tokens: it must look the same in light and dark mode. Pick the skin that
 * matches what is behind it — `light` on `board` and other dark surfaces, `ink` on paper.
 */
const LOGO_SKINS = {
  ink: { arch: '#2f4a2a', stripe: '#a8402b', gap: '#f1e5cb', art: '#f1e5cb', ground: '#e8b33c' },
  light: { arch: '#f1e5cb', stripe: '#a8402b', gap: '#f1e5cb', art: '#2f4a2a', ground: '#a8402b' },
} as const;

const AWNING_STRIPES: [number, number][] = [
  [16, 28.8],
  [28.8, 41.6],
  [41.6, 54.4],
  [54.4, 67.2],
  [67.2, 80],
];

export function LogoMark({ size = 30, variant = 'ink' }: { size?: number; variant?: keyof typeof LOGO_SKINS }) {
  const skin = LOGO_SKINS[variant];
  return (
    <svg viewBox="0 0 96 96" width={size} height={size} aria-hidden="true" className="block flex-none">
      <path d="M0 48a48 48 0 0 1 96 0v40a8 8 0 0 1-8 8H8a8 8 0 0 1-8-8Z" fill={skin.arch} />
      {AWNING_STRIPES.map(([from, to], i) => (
        <path key={from} d={`M${from} 22H${to}v18a6.4 6.4 0 0 1-12.8 0Z`} fill={i % 2 === 0 ? skin.stripe : skin.gap} />
      ))}
      <path d="M28 68C23 63 21 56 23 50c6 4 9 10 8 18Z" fill={skin.art} />
      <path d="M36 68c-4-5-4-13 1-18 5 5 5 13 2 18Z" fill={skin.art} />
      <circle cx="52" cy="59" r="9" fill="#e8b33c" />
      <path d="M64 68c0-6 4-10 7-10s7 4 7 10Z" fill={skin.art} />
      <rect x="17" y="68" width="62" height="9" rx="4.5" fill={skin.art} />
      <rect x="23" y="77" width="6" height="8" rx="3" fill={skin.art} />
      <rect x="67" y="77" width="6" height="8" rx="3" fill={skin.art} />
      <rect x="16" y="87" width="64" height="5" rx="2.5" fill={skin.ground} />
    </svg>
  );
}

/** Official Google brand multi-color icon for OAuth buttons. */
export function GoogleIcon({ size = 18, className, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={className}
      {...rest}
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}
