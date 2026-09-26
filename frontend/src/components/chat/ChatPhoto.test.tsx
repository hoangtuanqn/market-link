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

  /** Review Focus #4: a hidden message's image returns 403, a network drop returns an error. */
  it('shows a fallback when the photo cannot be loaded', async () => {
    vi.mocked(ConversationApi.photoBlob).mockRejectedValue(new Error('403'));

    render(<ChatPhoto attachment={attachment} alt="Photo" />);

    expect(await screen.findByText('This photo is not available.')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  /** A blob URL is not revoked by itself; not revoking one leaks memory every time an image scrolls by. */
  it('revokes the blob url on unmount', async () => {
    vi.mocked(ConversationApi.photoBlob).mockResolvedValue('blob:fake-2');
    const { unmount } = render(<ChatPhoto attachment={attachment} alt="Photo" />);
    await waitFor(() => expect(screen.getByRole('img')).toBeInTheDocument());

    unmount();

    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake-2');
  });

  /** The component leaves the screen before the blob arrives: it must still revoke, and must not set state. */
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

  /** Reserve the right space before the image arrives: do not let the chat frame jump once the image finishes loading. */
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
