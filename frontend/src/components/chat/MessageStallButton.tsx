import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';
import { USER_ROLE } from '@/constants/enums';
import useSession from '@/hooks/useSession';
import type { LoginRedirectState } from '@/layout/RequireAuth';
import ConversationApi from '@/api-requests/conversation.requests';
import { Button } from '@/components/ui/button';
import { isAxiosError } from 'axios';

/** FR-114, spec §9.5. Chỉ Customer mở được thread (Farmer vẫn giữ quyền Customer — FR-005); server kiểm lại. */
export default function MessageStallButton({ farmerId, productId }: { farmerId: number; productId?: number }) {
  const { t } = useTranslation('common');
  const { user } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const open = async () => {
    if (!user) {
      // Login đọc đích quay về ở state.from, giống RequireAuth và FavoriteButton
      const state: LoginRedirectState = { from: location.pathname + location.search };
      navigate('/login', { state });
      return;
    }
    setBusy(true);
    setProblem(null);
    try {
      const response = await ConversationApi.open(farmerId);
      const thread = response.data;
      const to = user.role === USER_ROLE.FARMER ? '/farmer/messages' : '/messages';
      const query = new URLSearchParams({ c: String(thread.id), ...(productId ? { product: String(productId) } : {}) });
      navigate(`${to}?${query}`, { state: { thread } });
    } catch (error) {
      const status = isAxiosError(error) ? error.response?.status : undefined;
      setProblem(t(status === 400 ? 'chat.ownStall' : status === 403 ? 'chat.stallClosed' : 'chat.openFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <Button variant="secondary" disabled={busy} onClick={() => void open()}>
        {t('chat.messageStall')}
      </Button>
      {problem ? (
        <p role="alert" className="text-small text-ink-muted">
          {problem}
        </p>
      ) : null}
    </div>
  );
}
