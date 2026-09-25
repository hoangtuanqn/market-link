import { useTranslation } from 'react-i18next';
import Avatar from '@/components/Avatar';
import TierBadge from '@/components/TierBadge';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import useMyAchievements from '@/hooks/useMyAchievements';
import useSession from '@/hooks/useSession';
import { formatDate, vnd } from '@/lib/format';
import { TIERS, type AchievementType, type Tier } from '@/types/achievement.types';
import Helper from '@/utils/helper';

/** Một thanh tiến độ tô màu hạng đang hướng tới; chữ nói rõ con số nên không chỉ dựa vào màu. */
const Progress = ({
  label,
  value,
  max,
  text,
  tier,
}: {
  label: string;
  value: number;
  max: number;
  text: string;
  tier: Tier;
}) => (
  <div className="flex flex-col gap-1">
    <div className="flex flex-wrap justify-between gap-2 text-[13px]">
      <span className="font-bold">{label}</span>
      <span className="text-ink-muted tabular-nums">{text}</span>
    </div>
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(value, max)}
      className="bg-surface-sunken h-2.5 overflow-hidden rounded-full"
    >
      <span data-tier={tier} className="ml-tier-fill" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
    </div>
  </div>
);

/**
 * Bảng hạng cá nhân: ảnh của chính mình trong viền hạng, tên hạng, danh hiệu, một câu gọi tên với số đơn và số tiền,
 * ngày tham gia. Nền, dải kim loại và hoa văn đổi theo hạng (src/styles/tiers.css, .ml-tier-panel).
 */
const TierHero = ({ data }: { data: AchievementType | null }) => {
  const { t } = useTranslation('CustomerAccount');
  const { t: tc } = useTranslation();
  const { user } = useSession();
  if (!user) return null;

  const tier = data?.tier ?? 'bronze';
  // Gọi đủ họ tên: tên người Việt có thể được gõ theo cả hai thứ tự, đoán tên gọi sẽ sai
  const firstName = user.fullName?.trim() || user.email;
  const line =
    data?.available && data.completed > 0
      ? t('achievements.hero.line', { name: firstName, count: data.completed, amount: vnd(data.totalSpent) })
      : t('achievements.hero.welcome', { name: firstName });

  return (
    <div data-tier={tier} className="ml-tier-panel flex flex-wrap items-center gap-4">
      <Avatar name={user.fullName} email={user.email} url={user.avatarUrl} size={72} tier={tier} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-overline uppercase opacity-80">{t('achievements.hero.overline')}</p>
        <p className="font-hand text-[34px] leading-[38px]">{tc('tier.badge', { tier: tc(`tier.${tier}`) })}</p>
        <p className="text-[15px] font-bold">{t(`achievements.titles.${tier}`)}</p>
        <p className="text-[14px]">{line}</p>
        {user.createdAt && (
          <p className="text-[13px] opacity-80">
            {t('achievements.hero.since', { date: formatDate(new Date(user.createdAt)) })}
          </p>
        )}
      </div>
    </div>
  );
};

const Figures = ({ data }: { data: AchievementType }) => {
  const { t } = useTranslation('CustomerAccount');
  const figures: [string, string][] = [
    [t('achievements.completed'), String(data.completed)],
    [t('achievements.cancelled'), String(data.cancelled)],
    [t('achievements.declined'), String(data.declined)],
    [t('achievements.inProgress'), String(data.inProgress)],
    [t('achievements.spent'), vnd(data.totalSpent)],
    [t('achievements.rate'), data.completionRate === null ? t('achievements.rateNone') : `${data.completionRate}%`],
  ];
  return (
    <dl className="m-0 grid grid-cols-2 gap-3 md:grid-cols-3">
      {figures.map(([label, value]) => (
        <div key={label} className="bg-surface-quiet flex flex-col gap-0.5 rounded-sm p-3">
          <dt className="text-ink-muted text-[13px]">{label}</dt>
          <dd className="m-0 text-[20px] font-bold tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
};

const NextTier = ({ data }: { data: AchievementType }) => {
  const { t } = useTranslation('CustomerAccount');
  const { t: tc } = useTranslation();
  if (!data.next) return <p className="text-[15px] font-bold">{t('achievements.top')}</p>;

  const next = data.next;
  const ordersGoal = data.completed + next.ordersNeeded;
  const spendGoal = data.totalSpent + next.spendNeeded;
  return (
    <div className="flex flex-col gap-3">
      <p className="flex flex-wrap items-center gap-2 text-[15px] font-bold">
        {t('achievements.nextTitle', { tier: tc(`tier.${next.tier}`) })}
        <TierBadge tier={next.tier} />
      </p>
      <Progress
        label={t('achievements.completed')}
        value={data.completed}
        max={Math.max(ordersGoal, 1)}
        text={t('achievements.ofGoal', { value: data.completed, goal: ordersGoal })}
        tier={next.tier}
      />
      <Progress
        label={t('achievements.spent')}
        value={data.totalSpent}
        max={Math.max(spendGoal, 1)}
        text={t('achievements.ofGoal', { value: vnd(data.totalSpent), goal: vnd(spendGoal) })}
        tier={next.tier}
      />
      {next.completionRateNeeded !== null && (
        <p className="text-small text-ink-muted">{t('achievements.rateNeeded', { rate: next.completionRateNeeded })}</p>
      )}
    </div>
  );
};

/** Đặc quyền của hạng hiện tại, viết cho chính người đang xem. */
const Perks = ({ tier }: { tier: Tier }) => {
  const { t } = useTranslation('CustomerAccount');
  const perks = t(`achievements.yourPerks.${tier}`, { returnObjects: true }) as string[];
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[15px] font-bold">{t('achievements.yourPerksTitle')}</p>
      <ul className="m-0 flex flex-col gap-1.5 p-0">
        {perks.map((perk) => (
          <li key={perk} className="flex list-none items-start gap-2 text-[14px]">
            <span aria-hidden="true" data-tier={tier} className="ml-tier-dot mt-1" />
            {perk}
          </li>
        ))}
      </ul>
    </div>
  );
};

/** The four tiers side by side, each drawn with its own frame, the current one marked. */
const Ladder = ({ current }: { current: Tier }) => {
  const { t } = useTranslation('CustomerAccount');
  const { t: tc } = useTranslation();
  return (
    <ol className="m-0 grid grid-cols-2 gap-2 p-0 sm:grid-cols-4">
      {TIERS.map((tier) => (
        <li
          key={tier}
          aria-current={tier === current ? 'true' : undefined}
          className={Helper.cn(
            'border-line flex list-none flex-col items-center gap-2 rounded-sm border p-3 text-center',
            tier === current && 'border-brand bg-brand-tint border-2',
          )}
        >
          <Avatar name={tc(`tier.${tier}`)} size={40} tier={tier} />
          <b className="text-[14px]">{tc(`tier.${tier}`)}</b>
          <span className="text-ink-muted text-[12px] leading-4">{t(`achievements.perks.${tier}`)}</span>
          {tier === current && <span className="text-brand text-[12px] font-bold">{t('achievements.youAreHere')}</span>}
        </li>
      ))}
    </ol>
  );
};

/**
 * Thành tích cá nhân (không có trong SRS, LEAD yêu cầu): bảng hạng cá nhân, số đơn theo kết cục, tổng đã chi, tỉ lệ
 * hoàn tất, phần còn thiếu để lên hạng kế và đặc quyền. Chỉ chủ tài khoản thấy các con số; người khác chỉ thấy hạng.
 */
const AchievementsCard = () => {
  const { t } = useTranslation('CustomerAccount');
  const { state, reload } = useMyAchievements();
  const data = state.status === 'ready' ? state.data : null;
  const tier = data?.tier ?? 'bronze';

  return (
    <Card as="section" aria-labelledby="achievements-title" className="flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-1">
        <h2 id="achievements-title" className="text-h3">
          {t('achievements.title')}
        </h2>
        <p className="text-small text-ink-muted">{t('achievements.intro')}</p>
      </div>

      <TierHero data={data} />

      {(state.status === 'loading' || state.status === 'idle') && (
        <p className="text-small text-ink-muted" aria-busy="true">
          {t('achievements.loading')}
        </p>
      )}

      {state.status === 'error' && (
        <>
          <Banner variant="danger" title={t('achievements.loadFailed')}>
            {t('profile.nothingChanged')}
          </Banner>
          <Button variant="secondary" className="self-start" onClick={reload}>
            {t('profile.retry')}
          </Button>
        </>
      )}

      {data &&
        (data.available ? (
          <>
            <Figures data={data} />
            <NextTier data={data} />
          </>
        ) : (
          <Banner variant="info" title={t('achievements.unavailable.title')}>
            {t('achievements.unavailable.text')}
          </Banner>
        ))}

      <Perks tier={tier} />
      <Ladder current={tier} />
      <p className="text-caption text-ink-muted">{t('achievements.privacy')}</p>
    </Card>
  );
};

export default AchievementsCard;
