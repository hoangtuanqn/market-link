import { Fragment, type ReactNode } from 'react';
import { useParams } from 'react-router';

/**
 * React Router giữ nguyên component khi chỉ param đổi (/products/1 → /products/2), nên state cũ (số lượng, tab, trang
 * review…) còn nguyên. Đổi key theo param để trang được mount lại từ đầu.
 */
const RemountOnParam = ({ param, children }: { param: string; children: ReactNode }) => {
  const params = useParams();
  return <Fragment key={params[param]}>{children}</Fragment>;
};

export default RemountOnParam;
