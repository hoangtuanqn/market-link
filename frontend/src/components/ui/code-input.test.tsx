import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CodeInput } from './code-input';

afterEach(cleanup);

const Harness = ({ onComplete }: { onComplete?: (code: string) => void }) => {
  const [value, setValue] = useState('');
  return <CodeInput id="code" label="Six-digit code" value={value} onChange={setValue} onComplete={onComplete} />;
};

describe('CodeInput', () => {
  it('keeps digits only', async () => {
    render(<Harness />);
    const input = screen.getByLabelText('Six-digit code');
    await userEvent.type(input, '4a8-2');
    expect(input).toHaveValue('482');
  });

  it('takes a pasted code with a space or a dash', async () => {
    const onComplete = vi.fn();
    render(<Harness onComplete={onComplete} />);
    const input = screen.getByLabelText('Six-digit code');
    await userEvent.click(input);
    await userEvent.paste('123 456');
    expect(input).toHaveValue('123456');
    expect(onComplete).toHaveBeenCalledWith('123456');
  });

  it('calls onComplete once, on the last digit', async () => {
    const onComplete = vi.fn();
    render(<Harness onComplete={onComplete} />);
    const input = screen.getByLabelText('Six-digit code');
    await userEvent.type(input, '1234567');
    expect(input).toHaveValue('123456');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('backspace removes the last digit', async () => {
    render(<Harness />);
    const input = screen.getByLabelText('Six-digit code');
    await userEvent.type(input, '123{Backspace}');
    expect(input).toHaveValue('12');
  });

  it('asks the browser for a one-time code and the number keypad', () => {
    render(<Harness />);
    const input = screen.getByLabelText('Six-digit code');
    expect(input).toHaveAttribute('autocomplete', 'one-time-code');
    expect(input).toHaveAttribute('inputmode', 'numeric');
  });
});
