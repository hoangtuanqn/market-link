import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ChatVideo from './ChatVideo';
import ConversationApi from '@/api-requests/conversation.requests';

vi.mock('@/api-requests/conversation.requests', () => ({ default: { streamUrl: vi.fn() } }));

const ORIGIN = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';
const LATER = '2999-01-01T00:00:00Z';
const PAST = '2000-01-01T00:00:00Z';
const link = (t: string, expiresAt = LATER) =>
  ({
    success: true,
    message: 'OK',
    data: { url: `/api/v1/attachments/55/stream?u=7&s=u&e=1&t=${t}`, expiresAt },
  }) as never;

const renderVideo = () => render(<ChatVideo attachmentId={55} label="Video from Cô Tư" />);
const videoElement = () => screen.getByLabelText('Video from Cô Tư') as HTMLVideoElement;

describe('ChatVideo', () => {
  beforeEach(() => {
    vi.mocked(ConversationApi.streamUrl).mockReset();
  });

  it('asks for a link only when played, then plays it from the API origin', async () => {
    vi.mocked(ConversationApi.streamUrl).mockResolvedValue(link('a'));
    renderVideo();
    expect(ConversationApi.streamUrl).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Play video' }));

    await waitFor(() =>
      expect(videoElement()).toHaveAttribute('src', `${ORIGIN}/api/v1/attachments/55/stream?u=7&s=u&e=1&t=a`),
    );
    expect(ConversationApi.streamUrl).toHaveBeenCalledWith(55);
    expect(videoElement()).toHaveAttribute('controls');
  });

  it('offers a download when this browser cannot play the file', async () => {
    vi.mocked(ConversationApi.streamUrl).mockResolvedValue(link('a'));
    renderVideo();
    await userEvent.click(screen.getByRole('button', { name: 'Play video' }));
    await waitFor(() => videoElement());

    fireEvent.error(videoElement());

    expect(await screen.findByText('This video cannot be played in this browser.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Download the video' })).toHaveAttribute(
      'href',
      `${ORIGIN}/api/v1/attachments/55/stream?u=7&s=u&e=1&t=a&download=1`,
    );
  });

  it('renews a link that ran out while watching, but only once', async () => {
    vi.mocked(ConversationApi.streamUrl)
      .mockResolvedValueOnce(link('old', PAST))
      .mockResolvedValueOnce(link('new', PAST));
    renderVideo();
    await userEvent.click(screen.getByRole('button', { name: 'Play video' }));
    await waitFor(() => videoElement());

    fireEvent.error(videoElement());
    await waitFor(() => expect(videoElement().getAttribute('src')).toContain('t=new'));
    fireEvent.error(videoElement());

    expect(await screen.findByText('This video cannot be played in this browser.')).toBeInTheDocument();
    expect(ConversationApi.streamUrl).toHaveBeenCalledTimes(2);
  });

  it('says so when the video cannot be opened at all', async () => {
    vi.mocked(ConversationApi.streamUrl).mockRejectedValue(new Error('404'));
    renderVideo();

    await userEvent.click(screen.getByRole('button', { name: 'Play video' }));

    expect(await screen.findByText('This video is not available.')).toBeInTheDocument();
  });
});
