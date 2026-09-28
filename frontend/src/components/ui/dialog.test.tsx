import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Dialog } from './dialog';

beforeEach(() => {
  // jsdom has no modal dialogs
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false;
  });
});

describe('Dialog', () => {
  /** Three dialogs on one page (Farmer Products: delete, adjust and deal): each is named by its own title. */
  it('is named by its own title when another dialog is on the page', () => {
    render(
      <>
        <Dialog open={false} title="Delete Trứng vịt?" tone="danger" onClose={vi.fn()} actions={null}>
          <p>Gone for good.</p>
        </Dialog>
        <Dialog open title="Near-expiry deal · Trứng vịt" onClose={vi.fn()} actions={null}>
          <p>Pick a day.</p>
        </Dialog>
      </>,
    );

    expect(screen.getByRole('dialog', { name: 'Near-expiry deal · Trứng vịt' })).toBeInTheDocument();
  });
});
