import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import FarmerApi from '@/api-requests/farmer.requests';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataState } from '@/components/ui/data-state';
import useSession from '@/hooks/useSession';
import { clearDraft, readDraft, saveDraft } from '@/lib/farmerDraft';
import { formatDate } from '@/lib/format';
import { FARMER_DECISION_KINDS, NotificationStore } from '@/lib/notifications/store';
import type { FarmerApplicationInput } from '@/types/farmer.types';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';
import ApplicationStatus from './ApplicationStatus';
import CommitmentsStep from './CommitmentsStep';
import { SHOTS, type FormErrors, type PhotoSlot, type Status, type VideoSlot } from './constants';
import EvidenceStep from './EvidenceStep';
import { grabPoster } from './grabPoster';
import StallDetailsStep from './StallDetailsStep';
import { fileError, focusFirstError, validate } from './validation';

/** FR-002 (second route, applying from an existing Customer account — needs its own FR, see the caption below). */
const CustomerBecomeFarmerPage = () => {
  const { t } = useTranslation('CustomerBecomeFarmer');
  const { user } = useSession();
  const [status, setStatus] = useState<Status>({ kind: 'loading' });

  const [stallName, setStallName] = useState('');
  const [contactPerson, setContactPerson] = useState(user?.fullName ?? '');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  const [photos, setPhotos] = useState<PhotoSlot[]>(SHOTS.map((key) => ({ key, url: null, uploading: false })));
  const [video, setVideo] = useState<VideoSlot>({ url: null, uploading: false, poster: null });
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [photoSlotIndex, setPhotoSlotIndex] = useState(0);

  const [tick1, setTick1] = useState(false);
  const [tick2, setTick2] = useState(false);
  const [tick3, setTick3] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  /** The date of the draft that is open, to tell the user they are continuing unfinished work. */
  const [draftSavedAt, setDraftSavedAt] = useState<string>();
  const navigate = useNavigate();

  // only setState in a promise callback (the initial state is already loading)
  const fetchStatus = useCallback(() => {
    FarmerApi.myApplication()
      .then((response) => {
        if (response.data) return setStatus({ kind: 'applied', data: response.data });
        // No application submitted yet: reopen exactly what they typed last time after clicking "Save and finish later".
        const draft = readDraft(user?.id);
        if (draft) {
          setStallName(draft.stallName);
          setContactPerson(draft.contactPerson);
          setDescription(draft.description);
          setPhotos(SHOTS.map((key, i) => ({ key, url: draft.photoUrls[i] ?? null, uploading: false })));
          setVideo({ url: draft.videoUrl, uploading: false, poster: null });
          setDraftSavedAt(draft.savedAt);
        }
        setStatus({ kind: 'form' });
      })
      .catch(() => setStatus({ kind: 'error' }));
  }, [user?.id]);

  useEffect(fetchStatus, [fetchStatus]);

  // An admin decided while the page was open: read again so it no longer shows "pending" with the old withdraw button
  useEffect(
    () =>
      NotificationStore.onFrame((frame) => {
        if (FARMER_DECISION_KINDS.includes(frame.kind)) fetchStatus();
      }),
    [fetchStatus],
  );

  const load = () => {
    setStatus({ kind: 'loading' });
    fetchStatus();
  };

  /**
   * Re-applying after a rejection: reopen the form with last time's content so the applicant fixes exactly what the
   * Admin criticised, instead of typing everything again from scratch. The three commitment boxes must be ticked again
   * — they are commitments for the new application.
   */
  const applyAgain = () => {
    if (status.kind !== 'applied') return;
    const previous = status.data;
    setStallName(previous.stallName);
    setContactPerson(previous.contactPerson);
    setDescription(previous.description ?? '');
    setPhotos(SHOTS.map((key, i) => ({ key, url: previous.photoUrls?.[i] ?? null, uploading: false })));
    setVideo({ url: previous.videoUrl ?? null, uploading: false, poster: null });
    setTick1(false);
    setTick2(false);
    setTick3(false);
    setErrors({});
    setStatus({ kind: 'form' });
    window.scrollTo(0, 0);
  };

  /**
   * "Save and finish later": keep what was typed (the images are already on the server so only paths are saved) and
   * send the user back to the account page, where the continue button is.
   */
  const saveAndLeave = () => {
    saveDraft(user?.id, {
      stallName,
      contactPerson,
      description,
      photoUrls: photos.map((p) => p.url).filter((url): url is string => url !== null),
      videoUrl: video.url,
    });
    Notification.success({ title: t('toast.savedTitle'), text: t('toast.saved') });
    navigate('/account');
  };

  const withdrawApplication = async () => {
    setIsWithdrawing(true);
    try {
      await FarmerApi.withdraw();
      setConfirmWithdraw(false);
      Notification.success({ title: t('toast.withdrawnTitle'), text: t('toast.withdrawn') });
      // After withdrawing it is as if never applied: back to a blank form, not the status screen.
      setStatus({ kind: 'form' });
      window.scrollTo(0, 0);
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, t('errors.withdraw')) });
      // Usually the application was just decided (no longer "pending"): show the new status exactly
      setConfirmWithdraw(false);
      fetchStatus();
    } finally {
      setIsWithdrawing(false);
    }
  };

  /** Discard the draft: clear it both on the machine and on screen, the form goes blank like the first time. */
  const discardDraft = () => {
    clearDraft(user?.id);
    setDraftSavedAt(undefined);
    setStallName('');
    setContactPerson(user?.fullName ?? '');
    setDescription('');
    setPhotos(SHOTS.map((key) => ({ key, url: null, uploading: false })));
    setVideo({ url: null, uploading: false, poster: null });
    setErrors({});
  };

  /** After fixing, the red line disappears at once, without waiting for Submit to be pressed again. */
  const clearError = (key: keyof FormErrors) =>
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const pickPhoto = (index: number) => {
    setPhotoSlotIndex(index);
    photoInputRef.current?.click();
  };

  const onTick = (index: number, checked: boolean) => {
    [setTick1, setTick2, setTick3][index](checked);
    clearError('terms');
  };

  const onPhotoChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const rejected = fileError(file, 'photo', t);
    if (rejected) {
      setErrors((prev) => ({ ...prev, photos: rejected }));
      Notification.error({ text: rejected });
      return;
    }
    const index = photoSlotIndex;
    setPhotos((prev) => prev.map((p, i) => (i === index ? { ...p, uploading: true } : p)));
    try {
      const response = await FarmerApi.uploadFile(file, 'photo');
      setPhotos((prev) => prev.map((p, i) => (i === index ? { ...p, url: response.data.url, uploading: false } : p)));
      clearError('photos');
    } catch (error) {
      setPhotos((prev) => prev.map((p, i) => (i === index ? { ...p, uploading: false } : p)));
      Notification.error({ text: Helper.getErrorMessage(error, t('errors.photo')) });
    }
  };

  const onVideoChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const rejected = fileError(file, 'video', t);
    if (rejected) {
      setErrors((prev) => ({ ...prev, photos: rejected }));
      Notification.error({ text: rejected });
      return;
    }
    setVideo({ url: null, uploading: true, poster: null });
    try {
      // Build the thumbnail in parallel with the upload, so the user does not wait an extra beat.
      const [response, poster] = await Promise.all([FarmerApi.uploadFile(file, 'video'), grabPoster(file)]);
      setVideo({ url: response.data.url, uploading: false, poster });
    } catch (error) {
      setVideo({ url: null, uploading: false, poster: null });
      Notification.error({ text: Helper.getErrorMessage(error, t('errors.video')) });
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const nextErrors = validate(
      { stallName, contactPerson, description, photos, video, ticks: [tick1, tick2, tick3] },
      t,
    );
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      focusFirstError(nextErrors);
      Notification.error({ title: t('toast.fixTitle'), text: t('toast.fix') });
      return;
    }

    const photoUrls = photos.map((p) => p.url).filter((url): url is string => url !== null);
    const input: FarmerApplicationInput = {
      stallName: stallName.trim(),
      contactPerson: contactPerson.trim(),
      description: description.trim() || undefined,
      photoUrls,
      videoUrl: video.url ?? undefined,
    };

    setIsSubmitting(true);
    try {
      const response = await FarmerApi.apply(input);
      clearDraft(user?.id);
      setDraftSavedAt(undefined);
      setStatus({ kind: 'applied', data: response.data });
      window.scrollTo(0, 0);
      Notification.success({ title: t('toast.sentTitle'), text: t('toast.sent') });
    } catch (error) {
      // Server per-field errors: photoUrls/videoUrl merge into the image block's red line.
      const fromServer = Helper.getFieldErrors(error);
      setErrors({
        stallName: fromServer.stallName,
        contactPerson: fromServer.contactPerson,
        description: fromServer.description,
        photos: fromServer.photoUrls ?? fromServer.videoUrl ?? fromServer.file,
      });
      Notification.error({
        text: Helper.getErrorMessage(error, t('errors.send')),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status.kind === 'loading') {
    return (
      <Card aria-busy="true" className="mx-auto flex w-full max-w-180 flex-col gap-3 p-6">
        <span className="sr-only">{t('loading')}</span>
        <div className="bg-surface-sunken h-6 w-72 max-w-full rounded-sm" />
        <div className="bg-surface-sunken h-4 w-full rounded-sm" />
        <div className="bg-surface-sunken h-32 w-full rounded-sm" />
      </Card>
    );
  }

  if (status.kind === 'error') {
    return (
      <div className="mx-auto w-full max-w-180">
        <DataState
          variant="error"
          title={t('loadError.title')}
          text={t('loadError.text')}
          action={
            <Button variant="secondary" size="sm" onClick={load}>
              {t('loadError.retry')}
            </Button>
          }
        />
      </div>
    );
  }

  if (status.kind === 'applied') {
    return (
      <ApplicationStatus
        data={status.data}
        confirmWithdraw={confirmWithdraw}
        isWithdrawing={isWithdrawing}
        onApplyAgain={applyAgain}
        onAskWithdraw={() => setConfirmWithdraw(true)}
        onCancelWithdraw={() => setConfirmWithdraw(false)}
        onWithdraw={withdrawApplication}
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-180 flex-col gap-8">
      <p className="text-small text-ink-muted">
        <Link to="/account" className="text-brand underline">
          {t('breadcrumbAccount')}
        </Link>{' '}
        · {t('breadcrumb')}
      </p>

      <div className="flex flex-col gap-2">
        {user && (
          <p className="font-hand text-hand text-ink-muted">
            {user.createdAt
              ? t('since', { name: user.fullName, date: formatDate(new Date(user.createdAt)) })
              : user.fullName}
          </p>
        )}
        <h1 className="text-h1">{t('title')}</h1>
        <p className="text-body-lg">{t('intro')}</p>
      </div>

      {/* Reopened from a draft: say clearly this is unfinished work, and offer a way to discard the draft and start over. */}
      {draftSavedAt && (
        <Banner title={t('draft.title')}>
          {t('draft.text', { date: formatDate(new Date(draftSavedAt)) })}{' '}
          <button type="button" onClick={discardDraft} className="text-brand cursor-pointer bg-transparent underline">
            {t('draft.discard')}
          </button>
        </Banner>
      )}

      <Card className="flex flex-col gap-3 p-6">
        <h2 className="text-h3">{t('next.title')}</h2>
        <ol className="text-body m-0 flex list-decimal flex-col gap-1.5 pl-5">
          <li>{t('next.read')}</li>
          <li>{t('next.panel')}</li>
          <li>{t('next.setup')}</li>
        </ol>
      </Card>

      {/* noValidate: turn off the browser's default bubble (text that cannot be translated and hides the form's own
          error line). `required` is still kept for screen readers and the asterisk on the label. */}
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-8">
        <ol className="m-0 flex flex-col gap-8 p-0">
          <StallDetailsStep
            user={user}
            stallName={stallName}
            contactPerson={contactPerson}
            description={description}
            errors={errors}
            isSubmitting={isSubmitting}
            onStallNameChange={(value) => {
              setStallName(value);
              clearError('stallName');
            }}
            onContactPersonChange={(value) => {
              setContactPerson(value);
              clearError('contactPerson');
            }}
            onDescriptionChange={(value) => {
              setDescription(value);
              clearError('description');
            }}
          />
          <EvidenceStep
            photos={photos}
            video={video}
            photoError={errors.photos}
            isSubmitting={isSubmitting}
            photoInputRef={photoInputRef}
            videoInputRef={videoInputRef}
            onPhotoChosen={onPhotoChosen}
            onVideoChosen={onVideoChosen}
            onPickPhoto={pickPhoto}
            onRemovePhoto={(i) => setPhotos((prev) => prev.map((x, xi) => (xi === i ? { ...x, url: null } : x)))}
            onRemoveVideo={() => setVideo({ url: null, uploading: false, poster: null })}
          />
          <CommitmentsStep
            ticks={[tick1, tick2, tick3]}
            termsError={errors.terms}
            isSubmitting={isSubmitting}
            onTick={onTick}
            onSaveAndLeave={saveAndLeave}
          />
        </ol>
      </form>
    </div>
  );
};

export default CustomerBecomeFarmerPage;
