import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { CategoryType } from '@/api-requests/catalog.requests';

/**
 * Decorative icon per real category slug (db/seed.sql — "the eight agreed categories", PR #137). A category added later
 * without a matching slug falls back to FALLBACK_EMOJI instead of being mismatched to whichever slot it happens to land
 * in.
 */
const EMOJI_BY_SLUG: Record<string, string> = {
  vegetables: '🥬',
  fruits: '🍊',
  eggs_and_dairy: '🥚',
  grains_beans_and_nuts: '🌾',
  meat_and_poultry: '🥩',
  seafood: '🐟',
  mushrooms: '🍄',
  baked_goods: '🥖',
};
const FALLBACK_EMOJI = '🛒';
const SKELETON_COUNT = 8;

type CategoryBrowseProps = {
  categories?: CategoryType[];
  loading?: boolean;
};

const CategoryBrowse = ({ categories = [], loading = false }: CategoryBrowseProps) => {
  const { t } = useTranslation('Home');

  return (
    <section className="flex flex-col gap-6">
      <div className="border-line flex flex-wrap items-end justify-between gap-4 border-b border-dashed pb-4">
        <div>
          <span className="text-brand text-[12px] font-bold tracking-widest uppercase">{t('categories.eyebrow')}</span>
          <h2 className="text-h2 mt-1">{t('categories.title')}</h2>
          <p className="text-ink-muted text-small mt-0.5">{t('categories.desc')}</p>
        </div>
        <Link to="/products" className="text-brand inline-flex min-h-11 items-center font-semibold hover:underline">
          {t('categories.all')}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
        {loading
          ? Array.from({ length: SKELETON_COUNT }).map((_, idx) => (
              <div
                key={idx}
                aria-hidden="true"
                className="border-line-strong bg-surface-raised flex animate-pulse flex-col items-center rounded-xl border p-4"
              >
                <div className="bg-surface-sunken mb-2.5 size-13 rounded-full" />
                <div className="bg-surface-sunken h-3.5 w-16 rounded-full" />
                <div className="bg-surface-sunken mt-1.5 h-3 w-10 rounded-full" />
              </div>
            ))
          : categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/products?category=${cat.id}`}
                className="border-line-strong bg-surface-raised hover:border-brand hover:bg-highlight group flex flex-col items-center rounded-xl border p-4 text-center shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
              >
                <div
                  aria-hidden="true"
                  className="bg-surface-sunken mb-2.5 flex size-13 items-center justify-center rounded-full text-2xl transition-transform duration-200 group-hover:scale-110"
                >
                  {EMOJI_BY_SLUG[cat.slug] ?? FALLBACK_EMOJI}
                </div>
                <span className="text-ink text-[14px] leading-tight font-bold">{cat.name}</span>
                <span className="text-ink-muted mt-1 text-[12px]">
                  {t('categories.itemsCount', { count: cat.count })}
                </span>
              </Link>
            ))}
      </div>
    </section>
  );
};

export default CategoryBrowse;
