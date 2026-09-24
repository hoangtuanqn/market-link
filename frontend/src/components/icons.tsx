import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

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

/** MarketLink mark: a hang tag on dashed twine. */
export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" className="block flex-none">
      <path
        d="M9 8.5h14.5a2 2 0 012 2V26a2.5 2.5 0 01-2.5 2.5H9A2.5 2.5 0 016.5 26V11.5zM18.4 13.2a2.4 2.4 0 10-4.8 0 2.4 2.4 0 104.8 0z"
        fill="currentColor"
        fillRule="evenodd"
      />
      <path
        d="M16 13.2C15.2 8.5 12.6 4.6 8 2.6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeDasharray="2.2 2"
      />
    </svg>
  );
}
