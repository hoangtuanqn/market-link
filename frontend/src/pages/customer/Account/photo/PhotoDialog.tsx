import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AuthApi from '@/api-requests/auth.requests';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import type { UserType } from '@/types/user.types';
import Helper from '@/utils/helper';
import CameraStep from './CameraStep';
import CropStep, { FRAME, type CropState } from './CropStep';
import { cropToJpeg } from './crop';
import { captureFrame, loadImage, PhotoError, releaseImage } from './loadImage';

export type PhotoSource = { kind: 'camera' } | { kind: 'image'; image: HTMLImageElement };

type PhotoDialogProps = {
  source: PhotoSource | null;
  onClose: () => void;
  /** Camera không dùng được: mở hộp chọn file thay thế. */
  onPickFile: () => void;
  onSaved: (user: UserType, message: string) => void;
};

const START: CropState = { zoom: 1, offset: { x: 0, y: 0 } };

/**
 * Một dialog cho cả hai bước (Dialog của design system dùng id cố định nên chỉ được có một cái trên trang): camera →
 * cắt ảnh → lưu, hoặc ảnh chọn từ máy → cắt ảnh → lưu.
 */
const PhotoDialog = ({ source, onClose, onPickFile, onSaved }: PhotoDialogProps) => {
  const { t } = useTranslation('CustomerAccount');
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [fromCamera, setFromCamera] = useState(false);
  const [crop, setCrop] = useState<CropState>(START);
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Mỗi lần mở dialog bắt đầu lại từ nguồn mới
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- đồng bộ state với nguồn ảnh vừa được chọn */
    setImage(source?.kind === 'image' ? source.image : null);
    setFromCamera(source?.kind === 'camera');
    setCrop(START);
    setError('');
    setBusy(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [source]);

  const onVideo = useCallback((v: HTMLVideoElement | null) => setVideo(v), []);

  const take = async () => {
    if (!video) return;
    setError('');
    try {
      setImage(await loadImage(await captureFrame(video)));
      setCrop(START);
    } catch (e) {
      setError(e instanceof PhotoError ? t(`photoErrors.${e.code}`, { mb: 15 }) : t('dialog.takeFailed'));
    }
  };

  // Ảnh chụp từ camera do dialog tạo nên dialog trả bộ nhớ; ảnh chọn từ máy thì AvatarCard lo
  const retake = () => {
    releaseImage(image);
    setImage(null);
    setError('');
  };

  const close = () => {
    if (fromCamera) releaseImage(image);
    onClose();
  };

  const save = async () => {
    if (!image) return;
    setBusy(true);
    setError('');
    try {
      const blob = await cropToJpeg(image, image.naturalWidth, image.naturalHeight, FRAME, crop.zoom, crop.offset);
      const response = await AuthApi.uploadAvatar(blob);
      if (fromCamera) releaseImage(image);
      onSaved(response.data, response.message || t('dialog.saved'));
    } catch (e) {
      const fields = Helper.getFieldErrors(e);
      setError(fields.file ?? Helper.getErrorMessage(e, t('dialog.saveFailed')));
      setBusy(false);
    }
  };

  const cameraStep = fromCamera && !image;
  const cameraFailed = cameraStep && !video;

  return (
    <Dialog
      open={source !== null}
      title={cameraStep ? t('dialog.takeTitle') : t('dialog.frameTitle')}
      onClose={close}
      actions={
        <>
          <Button variant="secondary" onClick={close} disabled={busy}>
            {t('dialog.cancel')}
          </Button>
          {cameraStep ? (
            <>
              {cameraFailed && (
                <Button variant="secondary" onClick={onPickFile}>
                  {t('dialog.uploadInstead')}
                </Button>
              )}
              <Button onClick={take} disabled={!video}>
                {t('dialog.take')}
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={fromCamera ? retake : onPickFile} disabled={busy}>
                {fromCamera ? t('dialog.retake') : t('dialog.chooseAnother')}
              </Button>
              <Button onClick={save} disabled={busy || !image}>
                {busy ? t('dialog.saving') : t('dialog.save')}
              </Button>
            </>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {cameraStep ? (
          <CameraStep onReady={onVideo} />
        ) : (
          image && (
            <>
              <p>{t('dialog.frameHelp')}</p>
              <CropStep image={image} value={crop} onChange={setCrop} />
            </>
          )
        )}
        {error && (
          <Banner variant="danger" title={error}>
            {t('dialog.unchanged')}
          </Banner>
        )}
      </div>
    </Dialog>
  );
};

export default PhotoDialog;
