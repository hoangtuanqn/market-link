import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import ProductCard from '@/components/ProductCard';
import type { ProductType } from '@/types/product.types';

const FreshProducts = ({ products }: { products: ProductType[] }) => {
  const { t } = useTranslation('Home');
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-h2">{t('fresh.title')}</h2>
        <Link to="/products" className="text-brand underline">
          {t('fresh.all')}
        </Link>
      </div>
      <div className="grid items-start gap-x-4 gap-y-6 md:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
};

export default FreshProducts;
