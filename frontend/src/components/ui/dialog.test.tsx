import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Dialog } from './dialog';

beforeEach(() => {
  // jsdom has no native <dialog> support: stub the two methods the component calls.
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false;
  });
});

/**
 * M-2: the id used for aria-labelledby was a hardcoded "dialog-title", so two <Dialog>s mounted at once (e.g. the
 * cancel-order dialog and the spoilage-report dialog on the same page) both pointed at the first one's <h2>, and the
 * second announced the wrong name to screen readers. useId() gives every instance its own id.
 */
describe('Dialog', () => {
  it('announces each open dialog by its own title, not another dialog on the page', () => {
    render(
      <>
        <Dialog open title="Cancel this order?" onClose={() => {}} actions={<button>Cancel</button>}>
          <p>cancel body</p>
        </Dialog>
        <Dialog open title="Report spoiled produce" onClose={() => {}} actions={<button>Send</button>}>
          <p>report body</p>
        </Dialog>
      </>,
    );

    expect(screen.getByRole('dialog', { name: 'Cancel this order?' })).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Report spoiled produce' })).toBeInTheDocument();
  });

  it('gives each dialog a distinct aria-labelledby target', () => {
    render(
      <>
        <Dialog open title="First" onClose={() => {}} actions={null}>
          <p>a</p>
        </Dialog>
        <Dialog open title="Second" onClose={() => {}} actions={null}>
          <p>b</p>
        </Dialog>
      </>,
    );

    const [first, second] = screen.getAllByRole('dialog');
    const firstLabelledBy = first.getAttribute('aria-labelledby');
    const secondLabelledBy = second.getAttribute('aria-labelledby');
    expect(firstLabelledBy).toBeTruthy();
    expect(secondLabelledBy).toBeTruthy();
    expect(firstLabelledBy).not.toBe(secondLabelledBy);
  });
});
