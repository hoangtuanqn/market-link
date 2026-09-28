import { useTranslation } from 'react-i18next';
import { ButtonAnchor } from '@/components/ui/button';
import { directionsUrl } from '@/lib/directions';
import type { LatLng } from '@/lib/geo';

type DirectionsButtonProps = {
  /** Where you are going. */
  to: LatLng;
  /** What is at that point, so a screen reader hears where the link routes to. */
  name: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
  className?: string;
};

/**
 * FR-013 — directions to a pickup point: Google Maps in a new tab (D-12). Google starts from the device's own location,
 * so there is nothing to ask first.
 */
const DirectionsButton = ({ to, name, variant = 'ghost', size = 'sm', className }: DirectionsButtonProps) => {
  const { t } = useTranslation();

  return (
    <ButtonAnchor
      href={directionsUrl(to)}
      aria-label={t('directions.title', { name })}
      variant={variant}
      size={size}
      className={className}
    >
      {t('actions.directions')}
    </ButtonAnchor>
  );
};

export default DirectionsButton;
