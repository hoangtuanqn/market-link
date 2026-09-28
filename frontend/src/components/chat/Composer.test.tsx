import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Composer from './Composer';
import { MAX_MEDIA_BYTES } from '@/lib/chat/media';

const heic2any = vi.hoisted(() => vi.fn());
vi.mock('heic2any', () => ({ default: heic2any }));

// The pin cards load their own data; here we only need to know they are placed in the composer
vi.mock('./OrderPin', () => ({ default: () => <span>order pin</span> }));
vi.mock('./ProductPin', () => ({ default: () => <span>product pin</span> }));

const setup = () => {
  const onTyping = vi.fn();
  const onSend = vi.fn().mockResolvedValue(undefined);
  render(<Composer onSend={onSend} onSendMedia={vi.fn()} onTyping={onTyping} disabled={false} />);
  return { onTyping, onSend, box: screen.getByLabelText('Write a message') };
};

describe('Composer', () => {
  /** Review Focus #9: the hook filters out extra frames itself, Composer only has to report every keystroke. */
  it('says I am typing while there is text, and stopped once it is cleared', async () => {
    const { onTyping, box } = setup();

    await userEvent.type(box, 'hi');
    await userEvent.clear(box);

    expect(onTyping).toHaveBeenCalledWith(true);
    expect(onTyping).toHaveBeenLastCalledWith(false);
  });

  it('says I stopped typing when I leave the box', async () => {
    const { onTyping, box } = setup();

    await userEvent.type(box, 'hi');
    await userEvent.tab();

    expect(onTyping).toHaveBeenLastCalledWith(false);
  });

  it('sends on Enter and keeps a new line on Shift+Enter', async () => {
    const { onSend, box } = setup();

    await userEvent.type(box, 'five bunches{Shift>}{Enter}{/Shift}please{Enter}');

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith('five bunches\nplease', {});
  });

  /**
   * A Vietnamese / Japanese / Chinese IME uses Enter to commit the word being composed: it must not send at that
   * moment.
   */
  it('does not send while an input method is still composing', () => {
    const { onSend, box } = setup();

    fireEvent.change(box, { target: { value: 'rau' } });
    fireEvent.keyDown(box, { key: 'Enter', isComposing: true });

    expect(onSend).not.toHaveBeenCalled();
  });

  it('keeps the draft and says so when sending fails', async () => {
    const { onSend, box } = setup();
    onSend.mockRejectedValue(new Error('network'));

    await userEvent.type(box, 'hello{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent('Your message was not sent');
    expect(box).toHaveValue('hello');
  });

  /**
   * Typing continues right after sending: the browser drops focus from a disabled element, so the composer box must not
   * lock while sending. jsdom does not simulate losing focus, so the test checks the real cause instead: the box stays
   * open while a message is in flight.
   */
  it('keeps the box open while a message is on its way, so the cursor stays', async () => {
    const onTyping = vi.fn();
    const onSend = vi.fn(() => new Promise<void>(() => {}));
    render(<Composer onSend={onSend} onSendMedia={vi.fn()} onTyping={onTyping} disabled={false} />);
    const box = screen.getByLabelText('Write a message');

    await userEvent.type(box, 'one{Enter}');

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(box).toBeEnabled();
    expect(box).toHaveFocus();
  });

  it('does not send the same text twice while the first send is on its way', async () => {
    const onSend = vi.fn(() => new Promise<void>(() => {}));
    render(<Composer onSend={onSend} onSendMedia={vi.fn()} disabled={false} />);

    await userEvent.type(screen.getByLabelText('Write a message'), 'one{Enter}{Enter}');

    expect(onSend).toHaveBeenCalledTimes(1);
  });

  /** Typing continues while an earlier message is in flight: when it arrives, the new text must not be wiped. */
  it('does not wipe what I typed while the previous message was on its way', async () => {
    let arrive!: () => void;
    const onSend = vi.fn(() => new Promise<void>((r) => (arrive = r)));
    render(<Composer onSend={onSend} onSendMedia={vi.fn()} disabled={false} />);
    const box = screen.getByLabelText('Write a message');

    await userEvent.type(box, 'one{Enter}');
    await userEvent.type(box, 'two');
    await act(async () => arrive());

    expect(box).toHaveValue('two');
  });

  it('says why a message could not be sent', async () => {
    const onSend = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('x'), { isAxiosError: true, response: { status: 409 } }));
    render(<Composer onSend={onSend} onSendMedia={vi.fn()} disabled={false} />);

    await userEvent.type(screen.getByLabelText('Write a message'), 'hi{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent('This stall is not taking messages right now');
  });

  /** FR-114: opening the chat from an order sends that order with the first message. */
  it('sends the pinned order with the message', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    const onUnpin = vi.fn();
    render(<Composer onSend={onSend} onSendMedia={vi.fn()} disabled={false} pinnedOrderId={21} onUnpin={onUnpin} />);

    await userEvent.type(screen.getByLabelText('Write a message'), 'is it ready?{Enter}');

    expect(onSend).toHaveBeenCalledWith('is it ready?', { orderId: 21 });
    expect(onUnpin).toHaveBeenCalled();
  });

  describe('photos and videos', () => {
    const pick = (container: HTMLElement, file: File) =>
      fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [file] } });
    const media = (onSendMedia: ComponentProps<typeof Composer>['onSendMedia']) =>
      render(<Composer onSend={vi.fn()} onSendMedia={onSendMedia} disabled={false} />);

    it('offers photos and videos, HEIC included', () => {
      const { container } = media(vi.fn());

      expect(screen.getByRole('button', { name: 'Add a photo or video' })).toBeEnabled();
      const accept = container.querySelector('input[type="file"]')!.getAttribute('accept')!;
      expect(accept).toContain('video/mp4');
      expect(accept).toContain('.heic');
    });

    it('refuses a file over 50 MB before uploading anything', async () => {
      const onSendMedia = vi.fn();
      const { container } = media(onSendMedia);
      const big = new File(['x'], 'long.mp4', { type: 'video/mp4' });
      Object.defineProperty(big, 'size', { value: MAX_MEDIA_BYTES + 1 });

      pick(container, big);

      expect(await screen.findByRole('alert')).toHaveTextContent('That file is over 50 MB');
      expect(onSendMedia).not.toHaveBeenCalled();
    });

    it('refuses a file that is neither a photo nor a video', async () => {
      const onSendMedia = vi.fn();
      const { container } = media(onSendMedia);

      pick(container, new File(['x'], 'notes.pdf', { type: 'application/pdf' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Choose a photo');
      expect(onSendMedia).not.toHaveBeenCalled();
    });

    it('converts a HEIC photo first and says so', async () => {
      let converted!: (blob: Blob) => void;
      heic2any.mockReturnValue(new Promise<Blob>((r) => (converted = r)));
      const onSendMedia = vi.fn().mockResolvedValue(undefined);
      const { container } = media(onSendMedia);

      pick(container, new File(['x'], 'IMG_0001.HEIC', { type: '' }));

      expect(await screen.findByText('Converting the photo…')).toBeInTheDocument();
      await act(async () => converted(new Blob(['jpeg'], { type: 'image/jpeg' })));
      expect(onSendMedia).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'IMG_0001.jpg', type: 'image/jpeg' }),
        expect.anything(),
      );
    });

    it('shows how much has been sent', async () => {
      const onSendMedia = vi.fn((_file: File, { onProgress }: { onProgress: (p: number) => void }) => {
        onProgress(42);
        return new Promise<void>(() => {});
      });
      const { container } = media(onSendMedia);

      pick(container, new File(['x'], 'clip.mp4', { type: 'video/mp4' }));

      const bar = await screen.findByRole('progressbar');
      expect(bar).toHaveAttribute('aria-valuenow', '42');
      expect(screen.getByText('Sending… 42%')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add a photo or video' })).toBeDisabled();
    });

    it('cancels the upload without calling it an error', async () => {
      let signal!: AbortSignal;
      const onSendMedia = vi.fn((_file: File, options: { signal: AbortSignal }) => {
        signal = options.signal;
        return new Promise<void>((_, reject) =>
          options.signal.addEventListener('abort', () => reject(new Error('canceled'))),
        );
      });
      const { container } = media(onSendMedia);
      pick(container, new File(['x'], 'clip.mp4', { type: 'video/mp4' }));

      await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));

      expect(signal.aborted).toBe(true);
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add a photo or video' })).toBeEnabled();
    });

    it('says why the server refused the file', async () => {
      const onSendMedia = vi
        .fn()
        .mockRejectedValue(Object.assign(new Error('x'), { isAxiosError: true, response: { status: 415 } }));
      const { container } = media(onSendMedia);

      pick(container, new File(['x'], 'clip.webm', { type: 'video/webm' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Choose a photo');
    });
  });
});
