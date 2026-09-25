import { ButtonLink } from '@/components/ui/button';

/** Đường dẫn không khớp route nào (kể cả link tới trang chưa làm) — thay cho màn hình trắng. */
const NotFoundPage = () => {
  return (
    <div className="mx-auto flex max-w-160 flex-col items-center gap-3 py-16 text-center">
      <p className="text-overline text-ink-muted uppercase">Page not found</p>
      <h1 className="text-h2">We could not find that page</h1>
      <p className="text-ink-muted">The link may be old, or this part of MarketLink is not open yet.</p>
      <ButtonLink to="/">Back to the home page</ButtonLink>
    </div>
  );
};

export default NotFoundPage;
