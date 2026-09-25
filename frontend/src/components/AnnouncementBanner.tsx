import { useState } from 'react';
import type { AnnouncementType } from '@/types/market.types';
import { CloseIcon, MegaphoneIcon } from './icons';

const AnnouncementBanner = ({ announcement }: { announcement: AnnouncementType }) => {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  return (
    <div role="status" className="bg-board text-on-board border-board-muted border-b-[1.5px]">
      {/* same container and left edge as the header */}
      <div className="mx-auto flex max-w-(--size-container) items-center gap-3 px-4 py-3 md:px-6">
        <MegaphoneIcon className="text-accent flex-none" />
        <div className="min-w-0 flex-1">
          <p className="font-hand text-[21px] leading-[1.1]">{announcement.title}</p>
          <p className="text-small text-board-muted mt-0.5">{announcement.text}</p>
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => setOpen(false)}
          className="-mr-2 grid size-9 flex-none cursor-pointer place-items-center rounded-sm bg-transparent text-inherit"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  );
};

export default AnnouncementBanner;
