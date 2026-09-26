import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ChatPhoto from './ChatPhoto';
import ConversationApi from '@/api-requests/conversation.requests';

vi.mock('@/api-requests/conversation.requests', () => ({
  default: { photoBlob: vi.fn() },
}));

const attachment = { attachmentId: 55, url: '/api/v1/attachments/55', width: 800, height: 600 };

describe('ChatPhoto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  it('shows the photo once the blob has loaded', async () => {
    vi.mocked(ConversationApi.photoBlob).mockResolvedValue('blob:fake-1');

    render(<ChatPhoto attachment={attachment} alt="Photo from Cô Tư" />);

    await waitFor(() => expect(screen.getByRole('img')).toHaveAttribute('src', 'blob:fake-1'));
    expect(screen.getByRole('img')).toHaveAttribute('alt', 'Photo from Cô Tư');
  });

  /** Review Focus #4: ảnh của tin đã bị ẩn trả 403, mạng rớt trả lỗi. */
  it('shows a fallback when the photo cannot be loaded', async () => {
    vi.mocked(ConversationApi.photoBlob).mockRejectedValue(new Error('403'));

    render(<ChatPhoto attachment={attachment} alt="Photo" />);

    expect(await screen.findByText('This photo is not available.')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  /** Blob URL không tự thu hồi; không revoke là rò bộ nhớ mỗi lần cuộn qua một bức ảnh. */
  it('revokes the blob url on unmount', async () => {
    vi.mocked(ConversationApi.photoBlob).mockResolvedValue('blob:fake-2');
    const { unmount } = render(<ChatPhoto attachment={attachment} alt="Photo" />);
    await waitFor(() => expect(screen.getByRole('img')).toBeInTheDocument());

    unmount();

    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake-2');
  });

  /** Component rời màn trước khi blob về: vẫn phải thu hồi, không được set state. */
  it('revokes a blob that arrives after the component is gone', async () => {
    let resolve: (url: string) => void = () => {};
    vi.mocked(ConversationApi.photoBlob).mockReturnValue(
      new Promise<string>((r) => {
        resolve = r;
      }),
    );
    const { unmount } = render(<ChatPhoto attachment={attachment} alt="Photo" />);

    unmount();
    resolve('blob:late');

    await waitFor(() => expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:late'));
  });

  /** Chừa đúng chỗ trước khi ảnh về: không để khung chat giật khi ảnh tải xong. */
  it('reserves the right space from the size the server gave', () => {
    vi.mocked(ConversationApi.photoBlob).mockReturnValue(new Promise(() => {}));

    const { container } = render(<ChatPhoto attachment={attachment} alt="Photo" />);

    expect(container.querySelector('[style*="aspect-ratio"]')).not.toBeNull();
  });

  it('falls back to a sane ratio when the server sent no size', () => {
    vi.mocked(ConversationApi.photoBlob).mockReturnValue(new Promise(() => {}));

    const { container } = render(<ChatPhoto attachment={{ ...attachment, width: null, height: null }} alt="Photo" />);

    expect(container.querySelector('[style*="aspect-ratio"]')).not.toBeNull();
  });
});
