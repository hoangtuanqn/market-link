import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { emptyReason, type ReasonValue } from '@/lib/reasons';
import ReasonPicker from './ReasonPicker';

const Harness = ({ error }: { error?: string }) => {
  const [value, setValue] = useState<ReasonValue>(emptyReason);
  return (
    <>
      <ReasonPicker
        id="reject"
        kind="reject"
        label="Reason the Farmer will see"
        required
        value={value}
        onChange={setValue}
        error={error}
      />
      <output data-testid="value">{JSON.stringify(value)}</output>
    </>
  );
};

const valueOf = () => JSON.parse(screen.getByTestId('value').textContent ?? '{}') as ReasonValue;

describe('ReasonPicker (FR-071, FR-072)', () => {
  it('toggles a reason on and off', async () => {
    render(<Harness />);
    const chip = screen.getByRole('button', { name: 'The photos are unclear or not of your farm' });

    await userEvent.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(valueOf().codes).toEqual(['unclearPhotos']);

    await userEvent.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    expect(valueOf().codes).toEqual([]);
  });

  it('shows the sentence the recipient will read, reasons first and the note after', async () => {
    render(<Harness />);

    await userEvent.click(screen.getByRole('button', { name: 'We could not reach you on your phone number' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Anything to add' }), 'Call 0900 000 003.');

    expect(
      screen.getByText(/They will read: “We could not reach you on your phone number\. Call 0900 000 003\.”/),
    ).toBeInTheDocument();
    expect(valueOf().note).toBe('Call 0900 000 003.');
  });

  it('lists the reasons of its kind only', () => {
    render(<Harness />);

    expect(screen.getAllByRole('button')).toHaveLength(5);
    expect(screen.queryByRole('button', { name: 'Fake reviews' })).not.toBeInTheDocument();
  });

  it('shows the error in place of the preview', () => {
    render(<Harness error="Pick a reason or write one." />);

    expect(screen.getByRole('alert')).toHaveTextContent('Pick a reason or write one.');
  });
});
