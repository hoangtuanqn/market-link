import { Fragment, type ReactNode } from 'react';
import { useParams } from 'react-router';

/**
 * React Router keeps the component when only the param changes (/products/1 → /products/2), so the old state (quantity,
 * tab, review page…) stays. Change the key by the param so the page is mounted again from scratch.
 */
const RemountOnParam = ({ param, children }: { param: string; children: ReactNode }) => {
  const params = useParams();
  return <Fragment key={params[param]}>{children}</Fragment>;
};

export default RemountOnParam;
