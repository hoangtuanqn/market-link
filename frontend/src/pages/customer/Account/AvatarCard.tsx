import { useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import Avatar from '@/components/Avatar';
import { Button } from '@/components/ui/button';
import useMyAchievements from '@/hooks/useMyAchievements';
import useSession from '@/hooks/useSession';
import type { UserType } from '@/types/user.types';
import Notification from '@/utils/notification';
import Session from '@/utils/session';
import { loadImage, PhotoError, releaseImage } from './photo/loadImage';
import PhotoDialog, { type PhotoSource } from './photo/PhotoDialog';

/**
 * The avatar, the top part of the profile frame on the Account page: upload an image or take one with the camera. There
 * is no remove button (the LEAD dropped it) — to change it, upload another image. Not in the SRS — a proposal
 * (docs/superpowers/specs/2026-09-25-avatar-user-menu-design.md), confirmed by the LEAD.
 */
const AvatarCard = () => {
  const { t } = useTranslation('CustomerAccount');
  const { user } = useSession();
  const { state: achievements } = useMyAchievements();
  // Everyone who signs in has at least a Bronze ring, even when the figures have not finished loading or failed to load
  const tier = achievements.status === 'ready' ? achievements.data.tier : 'bronze';
  const inputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<PhotoSource | null>(null);

  const closeDialog = () => {
    if (source?.kind === 'image') releaseImage(source.image);
    setSource(null);
  };

  const pickFile = () => inputRef.current?.click();

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Allow picking exactly the file just picked again
    e.target.value = '';
    if (!file) return;
    try {
      const image = await loadImage(file);
      if (source?.kind === 'image') releaseImage(source.image);
      setSource({ kind: 'image', image });
    } catch (error) {
      Notification.error({
        title: t('photo.notUsed'),
        text: t(`photoErrors.${error instanceof PhotoError ? error.code : 'unreadable'}`, { mb: 15 }),
      });
    }
  };

  const onSaved = (updated: UserType, message: string) => {
    Session.updateUser({ avatarUrl: updated.avatarUrl });
    closeDialog();
    Notification.success({ text: message });
  };

  if (!user) return null;

  return (
    <section aria-labelledby="photo-title" className="flex flex-wrap items-center gap-5">
      <Avatar name={user.fullName} email={user.email} url={user.avatarUrl} size={88} tier={tier} />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div>
          <h2 id="photo-title" className="text-h3">
            {t('photo.title')}
          </h2>
          <p className="text-small text-ink-muted">{t('photo.intro')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={pickFile}>
            {t('photo.upload')}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setSource({ kind: 'camera' })}>
            {t('photo.take')}
          </Button>
        </div>
        <input ref={inputRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
      </div>

      <PhotoDialog source={source} onClose={closeDialog} onPickFile={pickFile} onSaved={onSaved} />
    </section>
  );
};

export default AvatarCard;
