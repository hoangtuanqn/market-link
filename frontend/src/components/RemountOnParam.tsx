import { Fragment, type ReactNode } from 'react';
import { useParams } from 'react-router';

const RemountOnParam = ({ param, children }: { param: string; children: ReactNode }) => {
  const params = useParams();
  return <Fragment key={params[param]}>{children}</Fragment>;
};

export default RemountOnParam;
