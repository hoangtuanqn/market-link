import { beforeEach, describe, expect, it, vi } from 'vitest';
import ConversationApi from './conversation.requests';
import { privateApi } from '@/utils/axiosInstance';

vi.mock('@/utils/axiosInstance', () => ({
  privateApi: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

const ok = (data: unknown) => ({ data: { success: true, message: 'OK', data, timestamp: '' } });

describe('ConversationApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('asks for a page of threads', async () => {
    vi.mocked(privateApi.get).mockResolvedValue(ok({ items: [], page: 1, pageSize: 20, total: 0 }));

    await ConversationApi.list({ page: 1, size: 20 });

    expect(privateApi.get).toHaveBeenCalledWith('/conversations', { params: { page: 1, size: 20 } });
  });

  it('walks history backwards with a keyset cursor, not a page number', async () => {
    vi.mocked(privateApi.get).mockResolvedValue(ok([]));

    await ConversationApi.messages(42, { before: 101, size: 30 });

    expect(privateApi.get).toHaveBeenCalledWith('/conversations/42/messages', {
      params: { before: 101, size: 30 },
    });
  });

  it('leaves the cursor out on the first page', async () => {
    vi.mocked(privateApi.get).mockResolvedValue(ok([]));

    await ConversationApi.messages(42, { size: 30 });

    expect(privateApi.get).toHaveBeenCalledWith('/conversations/42/messages', {
      params: { size: 30 },
    });
  });

  it('sends a photo message by attachment id, with no body', async () => {
    vi.mocked(privateApi.post).mockResolvedValue(ok({}));

    await ConversationApi.send(42, { kind: 'image', attachmentId: 55 });

    expect(privateApi.post).toHaveBeenCalledWith('/conversations/42/messages', {
      kind: 'image',
      attachmentId: 55,
    });
  });

  it('opens a thread with the stall id', async () => {
    vi.mocked(privateApi.post).mockResolvedValue(ok({}));

    await ConversationApi.open(30);

    expect(privateApi.post).toHaveBeenCalledWith('/conversations', { farmerId: 30 });
  });

  it('uploads a photo or a video as multipart under the field name the backend reads', async () => {
    vi.mocked(privateApi.post).mockResolvedValue(ok({ attachmentId: 55, mime: 'video/mp4' }));
    const file = new File(['x'], 'clip.mp4', { type: 'video/mp4' });

    await ConversationApi.uploadMedia(file);

    const [path, body] = vi.mocked(privateApi.post).mock.calls[0];
    expect(path).toBe('/attachments');
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get('file')).toBe(file);
  });

  it('uploads without the default timeout, reports progress in percent and can be cancelled', async () => {
    vi.mocked(privateApi.post).mockResolvedValue(ok({ attachmentId: 55, mime: 'image/jpeg' }));
    const onProgress = vi.fn();
    const signal = new AbortController().signal;

    await ConversationApi.uploadMedia(new File(['x'], 'a.jpg'), { onProgress, signal });

    const config = vi.mocked(privateApi.post).mock.calls[0][2]!;
    expect(config.timeout).toBe(0);
    expect(config.headers).toEqual({ 'Content-Type': undefined });
    expect(config.signal).toBe(signal);
    config.onUploadProgress!({ loaded: 21, total: 50 } as never);
    expect(onProgress).toHaveBeenCalledWith(42);
  });

  it('asks for a short-lived link to play a video', async () => {
    vi.mocked(privateApi.get).mockResolvedValue(ok({ url: '/api/v1/attachments/55/stream?t=x', expiresAt: '' }));

    const response = await ConversationApi.streamUrl(55);

    expect(privateApi.get).toHaveBeenCalledWith('/attachments/55/stream-url');
    expect(response.data.url).toBe('/api/v1/attachments/55/stream?t=x');
  });

  it('fetches a photo as a blob and hands back an object url', async () => {
    const blob = new Blob(['bytes']);
    vi.mocked(privateApi.get).mockResolvedValue({ data: blob });
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:fake');

    const url = await ConversationApi.photoBlob(55);

    expect(privateApi.get).toHaveBeenCalledWith('/attachments/55', { responseType: 'blob', timeout: 0 });
    expect(globalThis.URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(url).toBe('blob:fake');
  });

  it('reports a message with a reason and an optional note', async () => {
    vi.mocked(privateApi.post).mockResolvedValue(ok({}));
    await ConversationApi.report(55, { reason: 'scam', note: 'asks for a deposit' });
    expect(privateApi.post).toHaveBeenCalledWith('/messages/55/report', { reason: 'scam', note: 'asks for a deposit' });
  });
});
