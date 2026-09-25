import { useTranslation } from 'react-i18next';
import { DataState } from '@/components/ui/data-state';
import useSession from '@/hooks/useSession';

/** FR-004 — trang đích sau khi admin đăng nhập. Dashboard số liệu (FR-070) chưa làm nên tạm hiện trạng thái trống. */
const AdminHomePage = () => {
  const { t } = useTranslation('AdminHome');
  const { user } = useSession();

  return (
    <>
      <div className="flex flex-col gap-2">
        <p className="text-overline text-ink-muted uppercase">{t('overline')}</p>
        <h1 className="font-hand text-h1">{t('hello', { name: user?.fullName || t('fallbackName') })}</h1>
      </div>
      <DataState title={t('empty.title')} text={t('empty.text')} />
    </>
  );
};

export default AdminHomePage;
