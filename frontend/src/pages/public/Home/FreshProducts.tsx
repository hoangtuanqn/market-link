import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import MarketCardSkeleton from '@/components/MarketCardSkeleton';
import ProductCard from '@/components/ProductCard';
import type { ProductType } from '@/types/product.types';

type FreshProductsProps = {
  products: ProductType[];
  /** True while the request is out (FR-084). */
  loading?: boolean;
};

const FreshProducts = ({ products, loading = false }: FreshProductsProps) => {
  const { t } = useTranslation('Home');
  return (
    <section className="flex flex-col gap-6">
      <div className="border-line flex flex-wrap items-end justify-between gap-4 border-b border-dashed pb-4">
        <div>
          <span className="text-brand text-[12px] font-bold tracking-widest uppercase">{t('fresh.eyebrow')}</span>
          <h2 className="text-h2 mt-1">{t('fresh.title')}</h2>
          <p className="text-ink-muted text-small mt-0.5">{t('fresh.cutoff')}</p>
        </div>
        <Link to="/products" className="text-brand font-semibold hover:underline">
          {t('fresh.filterLink')}
        </Link>
      </div>

      <div className="grid items-start gap-x-5 gap-y-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <MarketCardSkeleton count={3} />
        ) : products.length > 0 ? (
          products.map((p) => <ProductCard key={p.id} product={p} />)
        ) : (
          <p className="text-ink-muted col-span-full py-8 text-center">{t('fresh.empty')}</p>
        )}
      </div>
    </section>
  );
};

export default FreshProducts;
