import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { DataState } from '@/components/ui/data-state';

/** The placeholder for a screen still running on sample data, in the production build (see `SHOW_WIP`). */
const ComingSoon = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <DataState
      fill
      title={t('comingSoon.title')}
      text={t('comingSoon.text')}
      action={
        <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>
          {t('actions.back')}
        </Button>
      }
    />
  );
};

export default ComingSoon;
