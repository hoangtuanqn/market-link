import { useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import AuthApi from '@/api-requests/auth.requests';
import Avatar from '@/components/Avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import useSession from '@/hooks/useSession';
import type { UserType } from '@/types/user.types';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';
import Session from '@/utils/session';
import { loadImage, PhotoError, releaseImage } from './photo/loadImage';
import PhotoDialog, { type PhotoSource } from './photo/PhotoDialog';

/**
 * Ảnh đại diện trên trang Account: tải ảnh lên, chụp bằng camera, hoặc gỡ ảnh. Không có trong SRS — đề xuất
 * (docs/superpowers/specs/2026-09-25-avatar-user-menu-design.md), LEAD xác nhận.
 */
const AvatarCard = () => {
  const { t } = useTranslation('CustomerAccount');
  const { user } = useSession();
  const inputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<PhotoSource | null>(null);
  const [removing, setRemoving] = useState(false);

  const closeDialog = () => {
    if (source?.kind === 'image') releaseImage(source.image);
    setSource(null);
  };

  const pickFile = () => inputRef.current?.click();

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Cho phép chọn lại đúng file vừa chọn
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

  const remove = async () => {
    setRemoving(true);
    try {
      const response = await AuthApi.removeAvatar();
      Session.updateUser({ avatarUrl: response.data.avatarUrl });
      Notification.success({ text: response.message || t('photo.removed') });
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, t('photo.removeFailed')) });
    } finally {
      setRemoving(false);
    }
  };

  if (!user) return null;

  return (
    <Card as="section" aria-labelledby="photo-title" className="flex flex-wrap items-center gap-5 p-6">
      <Avatar name={user.fullName} email={user.email} url={user.avatarUrl} size={88} />
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
          {user.avatarUrl && (
            <Button size="sm" variant="ghost" onClick={remove} disabled={removing}>
              {removing ? t('photo.removing') : t('photo.remove')}
            </Button>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
      </div>

      <PhotoDialog source={source} onClose={closeDialog} onPickFile={pickFile} onSaved={onSaved} />
    </Card>
  );
};

export default AvatarCard;
