import { useTranslation } from 'react-i18next';
import type { DealDto } from '@/api-requests/deal.requests';
import { stockDay } from '@/components/stockDay';
import { Cart } from '@/lib/cart';
import Notification from '@/utils/notification';

const useAddDeal = () => {
  const { t } = useTranslation();

  return (deal: DealDto) => {
    const day = stockDay(deal.stockDate) ?? deal.stockDate;
    Cart.add({
      productId: deal.productId,
      name: deal.name,
      unit: deal.unit,
      price: deal.unitPrice,
      max: deal.quantityAvailable,
      farmerId: deal.farmerId,
      stallName: deal.stallName,
      pickupDate: deal.stockDate,
    });
    Notification.success({ title: t('deal.added.title'), text: t('deal.added.text', { name: deal.name, day }) });
  };
};

export default useAddDeal;
