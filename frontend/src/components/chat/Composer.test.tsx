import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Composer from './Composer';

const setup = () => {
  const onTyping = vi.fn();
  const onSend = vi.fn().mockResolvedValue(undefined);
  render(<Composer onSend={onSend} onSendPhoto={vi.fn()} onTyping={onTyping} disabled={false} />);
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
    render(<Composer onSend={onSend} onSendPhoto={vi.fn()} onTyping={onTyping} disabled={false} />);
    const box = screen.getByLabelText('Write a message');

    await userEvent.type(box, 'one{Enter}');

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(box).toBeEnabled();
    expect(box).toHaveFocus();
  });

  it('does not send the same text twice while the first send is on its way', async () => {
    const onSend = vi.fn(() => new Promise<void>(() => {}));
    render(<Composer onSend={onSend} onSendPhoto={vi.fn()} disabled={false} />);

    await userEvent.type(screen.getByLabelText('Write a message'), 'one{Enter}{Enter}');

    expect(onSend).toHaveBeenCalledTimes(1);
  });

  /** Typing continues while an earlier message is in flight: when it arrives, the new text must not be wiped. */
  it('does not wipe what I typed while the previous message was on its way', async () => {
    let arrive!: () => void;
    const onSend = vi.fn(() => new Promise<void>((r) => (arrive = r)));
    render(<Composer onSend={onSend} onSendPhoto={vi.fn()} disabled={false} />);
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
    render(<Composer onSend={onSend} onSendPhoto={vi.fn()} disabled={false} />);

    await userEvent.type(screen.getByLabelText('Write a message'), 'hi{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent('This stall is not taking messages right now');
  });
});
