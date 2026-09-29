import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import LegalPage, { type LegalSection } from '@/components/LegalPage';
import { LEGAL_UPDATED } from '@/constants/legal';
import { formatDate } from '@/lib/format';

const PrivacyPage = () => {
  const { t } = useTranslation('Privacy');
  return (
    <LegalPage
      title={t('title')}
      lead={t('lead')}
      meta={t('meta', { date: formatDate(LEGAL_UPDATED) })}
      onThisPage={t('onThisPage')}
      seeAlso={
        <Trans t={t} i18nKey="seeAlso" components={{ a: <Link to="/terms" className="text-brand underline" /> }} />
      }
      sections={t('sections', { returnObjects: true }) as LegalSection[]}
      cta={{
        title: t('cta.title'),
        text: t('cta.text'),
        links: [
          [t('cta.terms'), '/terms'],
          [t('cta.contact'), '/contact'],
        ],
      }}
    />
  );
};

export default PrivacyPage;
