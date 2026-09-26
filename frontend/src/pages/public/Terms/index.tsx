import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import LegalPage, { type LegalSection } from '@/components/LegalPage';
import { LEGAL_UPDATED } from '@/constants/legal';
import { formatDate } from '@/lib/format';

/** Terms of service: what reserving, changing and paying at the stall mean for each side. Linked from registration. */
const TermsPage = () => {
  const { t } = useTranslation('Terms');
  return (
    <LegalPage
      title={t('title')}
      lead={t('lead')}
      meta={t('meta', { date: formatDate(LEGAL_UPDATED) })}
      onThisPage={t('onThisPage')}
      seeAlso={
        <Trans t={t} i18nKey="seeAlso" components={{ link: <Link to="/privacy" className="text-brand underline" /> }} />
      }
      sections={t('sections', { returnObjects: true }) as LegalSection[]}
      cta={{
        title: t('cta.title'),
        text: t('cta.text'),
        links: [
          [t('cta.privacy'), '/privacy'],
          [t('cta.contact'), '/contact'],
        ],
      }}
    />
  );
};

export default TermsPage;
