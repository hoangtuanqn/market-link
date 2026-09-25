import { useTranslation } from 'react-i18next';
import type { Tier } from '@/types/achievement.types';
import Helper from '@/utils/helper';

/** "Hạng Bạc" cạnh tên người mua. Chỉ lộ hạng, không bao giờ lộ số đơn hay số tiền (src/styles/tiers.css). */
const TierBadge = ({ tier, className }: { tier: Tier; className?: string }) => {
  const { t } = useTranslation();
  return (
    <span data-tier={tier} className={Helper.cn('ml-tier-badge', className)}>
      {t('tier.badge', { tier: t(`tier.${tier}`) })}
    </span>
  );
};

export default TierBadge;
