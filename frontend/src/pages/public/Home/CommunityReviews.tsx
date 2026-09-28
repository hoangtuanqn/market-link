import { useTranslation } from 'react-i18next';
import Rating from '@/components/Rating';
import { Card } from '@/components/ui/card';

type ReviewItem = {
  author: string;
  role: string;
  text: string;
  date: string;
  rating: number;
};

const SAMPLE_REVIEWS: ReviewItem[] = [
  {
    author: 'Khang Nguyen',
    role: 'Thảo Điền Resident',
    text: "Cô Tư's water spinach is wonderfully crisp and sweet, completely different from conventional supermarket greens. Ordered on Thursday, rode my bike over on Saturday morning to pick up a dew-fresh basket.",
    date: '2 weeks ago',
    rating: 5,
  },
  {
    author: 'Yen Le',
    role: 'District 7 Regular',
    text: 'The green-skin pomelo from Út Hiền Orchard was juicy and bursting with flavor. Love that there is no forced prepayment — you inspect the fruit in person, then pay directly with QR.',
    date: '1 month ago',
    rating: 5,
  },
  {
    author: 'Trong Tran',
    role: 'Bình Thạnh Shopper',
    text: "Gió Nam's sourdough bread is baked at dawn with amazing crust and chew. This pre-order model is fantastic: you support local growers directly and get the freshest food possible.",
    date: '3 weeks ago',
    rating: 5,
  },
];

const CommunityReviews = () => {
  const { t } = useTranslation('Home');

  return (
    <section className="flex flex-col gap-6">
      <div className="border-line flex flex-wrap items-end justify-between gap-4 border-b border-dashed pb-4">
        <div>
          <span className="text-brand text-[12px] font-bold tracking-widest uppercase">{t('reviews.eyebrow')}</span>
          <h2 className="text-h2 mt-1">{t('reviews.title')}</h2>
          <p className="text-ink-muted text-small mt-0.5">{t('reviews.desc')}</p>
        </div>
        <span className="bg-status-ready-bg text-status-ready-ink inline-flex items-center rounded-full px-3 py-1 text-[13px] font-bold">
          {t('reviews.score')}
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {SAMPLE_REVIEWS.map((r, i) => (
          <Card key={i} as="article" className="flex flex-col gap-3 rounded-xl p-6 shadow-xs">
            <div className="flex items-start justify-between gap-2">
              <div>
                <b className="text-ink text-[16px]">{r.author}</b>
                <div className="text-ink-muted text-[13px]">{r.role}</div>
              </div>
              <span className="bg-status-ready-bg text-status-ready-ink inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-bold">
                ✓ {t('reviews.verified')}
              </span>
            </div>

            <div>
              <Rating value={r.rating} />
            </div>

            <p className="text-ink text-[15px] leading-relaxed italic">“{r.text}”</p>

            <div className="text-ink-muted mt-auto pt-2 text-[12px]">{r.date}</div>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default CommunityReviews;
