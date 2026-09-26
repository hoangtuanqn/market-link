import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { Popover } from './popover';

const setup = () =>
  render(
    <MemoryRouter>
      <button>before</button>
      <Popover label="Messages" to="/messages" trigger={<span>icon</span>}>
        <p>panel body</p>
      </Popover>
    </MemoryRouter>,
  );

describe('Popover', () => {
  it('opens on click and keyboard, closes on Escape and outside click', async () => {
    setup();
    const button = screen.getByRole('button', { name: 'Messages' });
    expect(button).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(button);
    expect(screen.getByText('panel body')).toBeVisible();
    expect(button).toHaveAttribute('aria-expanded', 'true');

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByText('panel body')).not.toBeInTheDocument();
    expect(button).toHaveFocus();

    button.focus();
    await userEvent.keyboard('{Enter}');
    expect(screen.getByText('panel body')).toBeVisible();

    fireEvent.pointerDown(screen.getByRole('button', { name: 'before' }));
    expect(screen.queryByText('panel body')).not.toBeInTheDocument();
  });

  it('opens on hover for a mouse', async () => {
    setup();
    await userEvent.hover(screen.getByRole('button', { name: 'Messages' }));
    expect(screen.getByText('panel body')).toBeVisible();
  });

  it('always offers the full page', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Messages' }));
    expect(screen.getByRole('link', { name: /see all/i })).toHaveAttribute('href', '/messages');
  });

  /** Rê chuột tới là mở; bấm vào biểu tượng lúc đó không được làm nó biến mất. */
  it('stays open when a mouse user clicks after hovering', async () => {
    setup();
    const button = screen.getByRole('button', { name: 'Messages' });

    await userEvent.hover(button);
    await userEvent.click(button);

    expect(screen.getByText('panel body')).toBeVisible();
  });
});
