import { fireEvent, render, screen } from '@testing-library/react';
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
  /** Review Focus #9: hook tự lọc bớt frame, Composer chỉ việc báo mỗi lần chữ đổi. */
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
    expect(onSend).toHaveBeenCalledWith('five bunches\nplease');
  });

  /** Bộ gõ tiếng Việt / Nhật / Trung dùng Enter để chốt chữ đang ghép: lúc đó không được gửi. */
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
});
