import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { CategoryType } from '@/api-requests/catalog.requests';

const DEFAULT_CATEGORIES = [
  { key: 'vegetables', emoji: '🥬', count: 12, slug: 'vegetables' },
  { key: 'fruits', emoji: '🍊', count: 8, slug: 'fruits' },
  { key: 'dairy', emoji: '🥚', count: 5, slug: 'dairy' },
  { key: 'grains', emoji: '🌾', count: 4, slug: 'grains' },
  { key: 'meat', emoji: '🥩', count: 6, slug: 'meat' },
  { key: 'seafood', emoji: '🐟', count: 4, slug: 'seafood' },
  { key: 'mushrooms', emoji: '🍄', count: 3, slug: 'mushrooms' },
  { key: 'baked', emoji: '🥖', count: 5, slug: 'baked' },
] as const;

type CategoryBrowseProps = {
  categories?: CategoryType[];
};

const CategoryBrowse = ({ categories = [] }: CategoryBrowseProps) => {
  const { t } = useTranslation('Home');

  return (
    <section className="flex flex-col gap-6">
      <div className="border-line flex flex-wrap items-end justify-between gap-4 border-b border-dashed pb-4">
        <div>
          <span className="text-brand text-[12px] font-bold tracking-widest uppercase">{t('categories.eyebrow')}</span>
          <h2 className="text-h2 mt-1">{t('categories.title')}</h2>
          <p className="text-ink-muted text-small mt-0.5">{t('categories.desc')}</p>
        </div>
        <Link to="/products" className="text-brand font-semibold hover:underline">
          {t('categories.all')}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
        {DEFAULT_CATEGORIES.map((cat, idx) => {
          // If server categories are provided, match by slug or index
          const serverCat = categories[idx];
          const name = serverCat ? serverCat.name : t(`categories.items.${cat.key}`);
          const count = serverCat && serverCat.count > 0 ? serverCat.count : cat.count;

          return (
            <Link
              key={cat.key}
              to={`/products?category=${serverCat?.id ?? cat.slug}`}
              className="border-line-strong bg-surface-raised hover:border-brand hover:bg-highlight group flex flex-col items-center rounded-xl border p-4 text-center shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
            >
              <div
                aria-hidden="true"
                className="bg-surface-sunken mb-2.5 flex size-13 items-center justify-center rounded-full text-2xl transition-transform duration-200 group-hover:scale-110"
              >
                {cat.emoji}
              </div>
              <span className="text-ink text-[14px] leading-tight font-bold">{name}</span>
              <span className="text-ink-muted mt-1 text-[12px]">{t('categories.itemsCount', { count })}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default CategoryBrowse;
