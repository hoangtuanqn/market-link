import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import FarmerApi from '@/api-requests/farmer.requests';
import { Banner } from '@/components/ui/banner';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DataState } from '@/components/ui/data-state';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/input';
import { FormStep } from '@/components/ui/form-step';
import { ApplicationHistory } from '@/components/ApplicationHistory';
import { VideoThumb } from '@/components/VideoThumb';
import { ORDER_STATUS_META } from '@/constants/orderStatus';
import useSession from '@/hooks/useSession';
import { clearDraft, readDraft, saveDraft } from '@/lib/farmerDraft';
import { formatDate } from '@/lib/format';
import { FARMER_DECISION_KINDS, NotificationStore } from '@/lib/notifications/store';
import type { FarmerApplicationInput, FarmerProfileType } from '@/types/farmer.types';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

type Status = { kind: 'loading' } | { kind: 'error' } | { kind: 'form' } | { kind: 'applied'; data: FarmerProfileType };

type FormErrors = {
  stallName?: string;
  contactPerson?: string;
  description?: string;
  photos?: string;
  terms?: string;
};

/** Bằng đúng @Size của FarmerApplicationRequest — client báo trước, server vẫn là nơi chốt. */
const MAX = { stallName: 120, contactPerson: 100, description: 2000 };

/** Bằng PHOTO_MAX_BYTES / VIDEO_MAX_BYTES của FarmerUploadService. */
const PHOTO_MAX_MB = 8;
const VIDEO_MAX_MB = 40;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

/** Thứ tự trên màn hình: lỗi đầu tiên theo thứ tự này là chỗ được cuộn tới và focus. */
const ERROR_ORDER: (keyof FormErrors)[] = ['stallName', 'contactPerson', 'description', 'photos', 'terms'];

/** Phần tử nhận focus cho mỗi lỗi; khối ảnh không có input nên focus chính nút thêm ảnh đầu tiên. */
const ERROR_ANCHOR: Record<keyof FormErrors, string> = {
  stallName: 'stall',
  contactPerson: 'person',
  description: 'about',
  photos: 'photos',
  terms: 't1',
};

/** Keys are order statuses only for the icon and colour; the text is `timeline.<key>`. */
const TIMELINE = ['placed', 'accepted', 'ready'] as const;

/** Ba ô ảnh; ô đầu bắt buộc. Nhãn hiển thị đã bỏ, chỉ còn số thứ tự cho trình đọc màn hình. */
const SHOTS = ['wide', 'growing', 'other'] as const;
type PhotoSlot = { key: (typeof SHOTS)[number]; url: string | null; uploading: boolean };

type VideoSlot = { url: string | null; uploading: boolean; poster: string | null };

/**
 * Cắt một khung hình từ chính file trên máy để làm ảnh đại diện — không phải tải video về lần nữa, và không phụ thuộc
 * vào việc server có hỗ trợ range request hay không. Hỏng thì trả null, lúc đó thẻ <video> tự lấy khung đầu tiên.
 */
const grabPoster = (file: File): Promise<string | null> =>
  new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const probe = document.createElement('video');
    const finish = (poster: string | null) => {
      URL.revokeObjectURL(objectUrl);
      resolve(poster);
    };

    probe.preload = 'metadata';
    probe.muted = true;
    probe.playsInline = true;
    probe.src = objectUrl;
    // Khung 0 giây thường đen; lấy quanh giây đầu tiên, hoặc giữa video nếu quá ngắn.
    probe.onloadeddata = () => {
      probe.currentTime = Math.min(1, (probe.duration || 2) / 2);
    };
    probe.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = probe.videoWidth;
      canvas.height = probe.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx || !canvas.width) return finish(null);
      ctx.drawImage(probe, 0, 0, canvas.width, canvas.height);
      try {
        finish(canvas.toDataURL('image/jpeg', 0.7));
      } catch {
        finish(null);
      }
    };
    probe.onerror = () => finish(null);
  });

const apiBase = () => import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

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
  /** Ngày của bản nháp đang mở, để nói cho người dùng biết họ đang tiếp tục việc dở dang. */
  const [draftSavedAt, setDraftSavedAt] = useState<string>();
  const navigate = useNavigate();

  // chỉ setState trong callback của promise (trạng thái ban đầu đã là loading)
  const fetchStatus = useCallback(() => {
    FarmerApi.myApplication()
      .then((response) => {
        if (response.data) return setStatus({ kind: 'applied', data: response.data });
        // Chưa nộp đơn nào: mở lại đúng những gì họ đã gõ lần trước rồi bấm "để sau làm tiếp".
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

  // Admin quyết định trong lúc trang đang mở: đọc lại để không còn hiện "đang chờ" với nút rút đơn cũ
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
   * Nộp lại sau khi bị từ chối: mở lại form với nội dung lần trước để người nộp sửa đúng chỗ Admin chê, không phải gõ
   * lại từ đầu. Ba ô cam kết thì phải tick lại — đó là cam kết cho đơn mới.
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
   * "Lưu, để sau làm tiếp": giữ nguyên những gì đã gõ (ảnh đã nằm trên server nên chỉ lưu đường dẫn) rồi trả người dùng
   * về trang tài khoản, nơi có nút tiếp tục.
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
      // Rút xong là chưa từng nộp: quay về form trắng, không phải màn trạng thái.
      setStatus({ kind: 'form' });
      window.scrollTo(0, 0);
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, t('errors.withdraw')) });
      // Thường là đơn vừa được quyết định (không còn "đang chờ"): hiện đúng trạng thái mới
      setConfirmWithdraw(false);
      fetchStatus();
    } finally {
      setIsWithdrawing(false);
    }
  };

  /** Bỏ nháp: xoá cả trên máy lẫn trên màn hình, form về trắng như lần đầu. */
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

  /** Sửa xong thì dòng đỏ biến mất ngay, không phải đợi bấm Gửi lần nữa. */
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

  /** Chặn tại chỗ những gì server sẽ chặn, để người dùng không phải tải xong 40MB mới biết sai. */
  const fileError = (file: File, kind: 'photo' | 'video') => {
    const isPhoto = kind === 'photo';
    const types = isPhoto ? PHOTO_TYPES : VIDEO_TYPES;
    const maxMb = isPhoto ? PHOTO_MAX_MB : VIDEO_MAX_MB;
    if (!types.includes(file.type)) return t(isPhoto ? 'errors.photoType' : 'errors.videoType');
    if (file.size > maxMb * 1024 * 1024) {
      return t(isPhoto ? 'errors.photoTooLarge' : 'errors.videoTooLarge', { max: maxMb });
    }
    return null;
  };

  const onPhotoChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const rejected = fileError(file, 'photo');
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
    const rejected = fileError(file, 'video');
    if (rejected) {
      setErrors((prev) => ({ ...prev, photos: rejected }));
      Notification.error({ text: rejected });
      return;
    }
    setVideo({ url: null, uploading: true, poster: null });
    try {
      // Dựng ảnh đại diện song song với lúc tải lên, không bắt người dùng chờ thêm một nhịp.
      const [response, poster] = await Promise.all([FarmerApi.uploadFile(file, 'video'), grabPoster(file)]);
      setVideo({ url: response.data.url, uploading: false, poster });
    } catch (error) {
      setVideo({ url: null, uploading: false, poster: null });
      Notification.error({ text: Helper.getErrorMessage(error, t('errors.video')) });
    }
  };

  const validate = (): FormErrors => {
    const next: FormErrors = {};
    const stall = stallName.trim();
    const person = contactPerson.trim();
    const about = description.trim();

    if (!stall) next.stallName = t('errors.stallName');
    else if (stall.length > MAX.stallName) next.stallName = t('errors.stallNameLong', { max: MAX.stallName });

    if (!person) next.contactPerson = t('errors.contactPerson');
    else if (person.length > MAX.contactPerson) {
      next.contactPerson = t('errors.contactPersonLong', { max: MAX.contactPerson });
    }

    if (about.length > MAX.description) next.description = t('errors.descriptionLong', { max: MAX.description });

    // Gửi khi ảnh chưa tải xong thì đơn đi thiếu ảnh mà không ai biết — chặn hẳn.
    if (photos.some((p) => p.uploading) || video.uploading) next.photos = t('errors.uploadInProgress');
    else if (!photos.some((p) => p.url)) next.photos = t('errors.photoRequired');

    if (!tick1 || !tick2 || !tick3) next.terms = t('errors.terms');

    return next;
  };

  /** Lỗi ở đầu form mà nút Gửi ở cuối: không cuộn tới thì người dùng tưởng bấm không ăn. */
  const focusFirstError = (found: FormErrors) => {
    const key = ERROR_ORDER.find((k) => found[k]);
    if (!key) return;
    const node = document.getElementById(ERROR_ANCHOR[key]);
    if (!node) return;
    node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Khối ảnh là một <div>, không tự nhận focus được: lấy nút thêm ảnh đầu tiên bên trong.
    const target = node.matches('input, textarea, button') ? node : node.querySelector<HTMLElement>('button, input');
    target?.focus({ preventScroll: true });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const nextErrors = validate();
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
      // Lỗi theo field của server: photoUrls/videoUrl gộp về dòng đỏ của khối ảnh.
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
    const data = status.data;
    const copy =
      data.approvalStatus === 'pending'
        ? { title: t('sent.title'), text: t('sent.intro') }
        : { title: t(`approval.${data.approvalStatus}.title`), text: t(`approval.${data.approvalStatus}.text`) };
    const photoCount = data.photoUrls?.length ?? 0;
    const evidence = photoCount
      ? t(data.videoUrl ? 'sent.photosAndVideo' : 'sent.photos', { count: photoCount })
      : t(data.videoUrl ? 'sent.noPhotosVideo' : 'sent.noPhotos');
    return (
      <div className="mx-auto flex w-full max-w-180 flex-col gap-6">
        <p className="text-small text-ink-muted">
          <Link to="/account" className="text-brand underline">
            {t('breadcrumbAccount')}
          </Link>{' '}
          · {t('breadcrumb')}
        </p>

        <div className="flex flex-col gap-2">
          <h1 className="text-h1">{copy.title}</h1>
          <p className="text-body-lg">{copy.text}</p>
        </div>

        {data.approvalStatus === 'suspended' && (
          <Banner variant="warning" title={t('suspendedBanner.title')}>
            {/* Lý do đình chỉ do Admin viết; chưa có thì vẫn nói rõ chuyện gì đang xảy ra. */}
            {data.suspendReason ?? t('suspendedBanner.text')}
          </Banner>
        )}

        {/* Bị từ chối mà không biết vì sao thì nộp lại cũng sai y như cũ. */}
        {data.approvalStatus === 'rejected' && (
          <Banner variant="danger" title={t('rejectedBanner.title')}>
            {data.rejectReason ?? t('rejectedBanner.noReason')}
          </Banner>
        )}

        <Card className="flex flex-col gap-4 p-6">
          <h2 className="text-h3">{t('sent.summary')}</h2>
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
            <dt className="text-ink-muted">{t('sent.stall')}</dt>
            <dd className="m-0">{data.stallName}</dd>
            <dt className="text-ink-muted">{t('step1.person')}</dt>
            <dd className="m-0">{data.contactPerson}</dd>
            {data.description && (
              <>
                <dt className="text-ink-muted">{t('sent.about')}</dt>
                <dd className="m-0">{data.description}</dd>
              </>
            )}
            {(!!data.photoUrls?.length || data.videoUrl) && (
              <>
                <dt className="text-ink-muted">{t('sent.evidence')}</dt>
                <dd className="m-0">{evidence}</dd>
              </>
            )}
            <dt className="text-ink-muted">{t('sent.status')}</dt>
            <dd className="m-0">{t(`statusValue.${data.approvalStatus}`)}</dd>
            <dt className="text-ink-muted">{t('sent.sentOn')}</dt>
            <dd className="m-0">{formatDate(new Date(data.createdAt))}</dd>
          </dl>
          {(!!data.photoUrls?.length || data.videoUrl) && (
            <div className="flex flex-wrap items-center gap-2">
              {data.photoUrls?.map((url) => (
                <img
                  key={url}
                  src={`${apiBase()}${url}`}
                  alt={t('sent.photoAlt')}
                  className="border-line-strong size-20 rounded-sm border-[1.5px] object-cover"
                />
              ))}
              {data.videoUrl && <VideoThumb url={data.videoUrl} />}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {/* Chỉ đơn bị từ chối mới nộp lại được — server cũng chặn đúng như vậy. */}
            {data.approvalStatus === 'rejected' && <Button onClick={applyAgain}>{t('sent.applyAgain')}</Button>}
            {/* Đang chờ duyệt thì còn đổi ý được; đã có kết quả rồi thì không còn gì để rút. */}
            {data.approvalStatus === 'pending' && (
              <Button variant="danger" disabled={isWithdrawing} onClick={() => setConfirmWithdraw(true)}>
                {t('sent.withdraw')}
              </Button>
            )}
            <ButtonLink to="/markets" variant="secondary">
              {t('sent.keepShopping')}
            </ButtonLink>
          </div>
        </Card>

        {data.history.length > 1 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-h2">{t('sent.historyTitle')}</h2>
            <p className="text-body">{t('sent.historyText')}</p>
            <ApplicationHistory entries={data.history} statusLabel={(s) => t(`statusValue.${s}`)} />
          </section>
        )}

        <Dialog
          open={confirmWithdraw}
          tone="danger"
          title={t('withdrawDialog.title')}
          onClose={() => setConfirmWithdraw(false)}
          actions={
            <>
              <Button variant="secondary" disabled={isWithdrawing} onClick={() => setConfirmWithdraw(false)}>
                {t('withdrawDialog.keep')}
              </Button>
              <Button variant="dangerFill" disabled={isWithdrawing} onClick={withdrawApplication}>
                {t('withdrawDialog.confirm')}
              </Button>
            </>
          }
        >
          <p>{t('withdrawDialog.text')}</p>
        </Dialog>

        {data.approvalStatus === 'pending' && (
          <div className="flex flex-col gap-3">
            <h2 className="text-h2">{t('sent.progress')}</h2>
            <ol className="m-0 flex flex-col p-0">
              {TIMELINE.map((key, i) => (
                <li key={key} className="relative grid grid-cols-[28px_1fr] items-start gap-3 py-2">
                  {i > 0 && (
                    <span
                      aria-hidden="true"
                      className="border-line-strong absolute -top-2 left-3.25 h-4 border-l-2 border-dotted"
                    />
                  )}
                  <span
                    className={`grid size-7 flex-none place-items-center rounded-full ${ORDER_STATUS_META[key].className} ${i > 0 ? 'opacity-45' : ''}`}
                  >
                    {(() => {
                      const Icon = ORDER_STATUS_META[key].icon;
                      return <Icon size={14} />;
                    })()}
                  </span>
                  <div>
                    <b className="text-[15px]">{t(`timeline.${key}.title`)}</b>
                    <time className="text-ink-muted block text-[13px]">
                      {t(`timeline.${key}.note`)} · {t(`timeline.${key}.by`)}
                    </time>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
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

      {/* Mở lại từ nháp: nói rõ đây là việc dở dang, và cho đường bỏ nháp làm lại từ đầu. */}
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

      {/* noValidate: tắt bong bóng mặc định của trình duyệt (chữ không dịch được, che mất dòng lỗi của
          chính form). `required` vẫn giữ cho trình đọc màn hình và dấu sao trên nhãn. */}
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-8">
        <ol className="m-0 flex flex-col gap-8 p-0">
          <FormStep n={1} title={t('step1.title')}>
            <Card className="flex flex-col gap-4 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field
                  id="stall"
                  label={t('step1.stallName')}
                  required
                  placeholder={t('step1.stallNamePlaceholder')}
                  value={stallName}
                  onChange={(e) => {
                    setStallName(e.target.value);
                    clearError('stallName');
                  }}
                  hint={t('step1.stallNameHint')}
                  error={errors.stallName}
                  disabled={isSubmitting}
                  className="md:col-span-2"
                />
                <Field
                  id="person"
                  label={t('step1.person')}
                  required
                  value={contactPerson}
                  onChange={(e) => {
                    setContactPerson(e.target.value);
                    clearError('contactPerson');
                  }}
                  error={errors.contactPerson}
                  disabled={isSubmitting}
                />
                <Field
                  id="email"
                  label={t('step1.email')}
                  value={user?.email ?? ''}
                  readOnly
                  hint={t('step1.emailHint')}
                />
                <Field
                  id="phone"
                  label={t('step1.phone')}
                  value={user?.phone ?? ''}
                  readOnly
                  hint={t('step1.fromAccount')}
                />
                <Field
                  id="address"
                  label={t('step1.address')}
                  value={user?.address ?? ''}
                  readOnly
                  hint={t('step1.fromAccount')}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="about" className="text-small font-bold">
                  {t('step1.about')}
                </label>
                <textarea
                  id="about"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    clearError('description');
                  }}
                  placeholder={t('step1.aboutPlaceholder')}
                  aria-invalid={!!errors.description}
                  aria-describedby="about-note"
                  disabled={isSubmitting}
                  className={`bg-surface-raised text-body min-h-24 rounded-sm border-[1.5px] p-3 ${
                    errors.description ? 'border-danger' : 'border-line-strong'
                  }`}
                />
                <span
                  id="about-note"
                  role={errors.description ? 'alert' : undefined}
                  className={`text-[13px] ${errors.description ? 'text-danger' : 'text-ink-muted'}`}
                >
                  {errors.description ??
                    t('step1.aboutCount', { used: description.trim().length, max: MAX.description })}
                </span>
              </div>
            </Card>
          </FormStep>

          <FormStep n={2} title={t('step2.title')}>
            <Card className="flex flex-col gap-4 p-6">
              <p className="text-body">{t('step2.intro')}</p>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={onPhotoChosen}
              />
              <div id="photos" className="flex flex-col gap-2">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {photos.map((p, i) => (
                    // Nhãn dưới mỗi ô đã bỏ; ảnh vẫn cần tên cho trình đọc màn hình nên đánh số.
                    <div key={p.key}>
                      {p.url ? (
                        <div className="relative">
                          <img
                            src={`${import.meta.env.VITE_API_URL ?? 'http://localhost:8080'}${p.url}`}
                            alt={t('step2.photoLabel', { n: i + 1 })}
                            className="aspect-4/3 w-full rounded-md object-cover"
                          />
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() =>
                              setPhotos((prev) => prev.map((x, xi) => (xi === i ? { ...x, url: null } : x)))
                            }
                            className="bg-surface-raised text-ink absolute top-1 right-1 grid size-6 cursor-pointer place-items-center rounded-full text-[13px] font-bold"
                            aria-label={t('step2.removePhoto', { label: t('step2.photoLabel', { n: i + 1 }) })}
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => pickPhoto(i)}
                          disabled={p.uploading || isSubmitting}
                          aria-label={t('step2.addPhotoLabel', { n: i + 1 })}
                          aria-invalid={i === 0 && !!errors.photos}
                          className={`text-ink aspect-4/3 w-full cursor-pointer rounded-md border-2 border-dashed bg-transparent text-[14px] font-bold disabled:opacity-50 ${
                            i === 0 && errors.photos ? 'border-danger' : 'border-line-strong'
                          }`}
                        >
                          {p.uploading ? t('step2.uploading') : t('step2.addPhoto')}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <span
                  role={errors.photos ? 'alert' : undefined}
                  className={`text-[13px] ${errors.photos ? 'text-danger' : 'text-ink-muted'}`}
                >
                  {errors.photos ?? t('step2.photoHint', { max: PHOTO_MAX_MB })}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="vid" className="text-small font-bold">
                  {t('step2.video')}
                </label>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  className="hidden"
                  onChange={onVideoChosen}
                />
                {video.url ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <VideoThumb url={video.url} poster={video.poster} big />
                    <div className="flex flex-col items-start gap-1.5">
                      <span className="text-small">{t('step2.videoAdded')}</span>
                      <Button
                        variant="secondary"
                        size="sm"
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => setVideo({ url: null, uploading: false, poster: null })}
                      >
                        {t('step2.removeVideo')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="secondary"
                    id="vid"
                    type="button"
                    disabled={video.uploading || isSubmitting}
                    onClick={() => videoInputRef.current?.click()}
                    className="w-fit"
                  >
                    {video.uploading ? t('step2.uploading') : t('step2.addVideo')}
                  </Button>
                )}
                <span className="text-ink-muted text-[13px]">
                  {t('step2.videoHint')} {t('step2.videoLimit', { max: VIDEO_MAX_MB })}
                </span>
              </div>
              <Banner title={t('step2.banner.title')}>{t('step2.banner.text')}</Banner>
            </Card>
          </FormStep>

          <FormStep n={3} title={t('step3.title')}>
            <Card className="flex flex-col gap-4 p-6">
              {errors.terms && (
                <p role="alert" className="text-danger m-0 text-[15px] font-bold">
                  {errors.terms}
                </p>
              )}
              <Checkbox
                id="t1"
                checked={tick1}
                disabled={isSubmitting}
                aria-invalid={!!errors.terms && !tick1}
                onChange={(e) => {
                  setTick1(e.target.checked);
                  clearError('terms');
                }}
              >
                {t('step3.true')}
                <small className="text-ink-muted mt-0.5 block text-[13px]">{t('step3.trueHint')}</small>
              </Checkbox>
              <Checkbox
                id="t2"
                checked={tick2}
                disabled={isSubmitting}
                aria-invalid={!!errors.terms && !tick2}
                onChange={(e) => {
                  setTick2(e.target.checked);
                  clearError('terms');
                }}
              >
                {t('step3.present')}
                <small className="text-ink-muted mt-0.5 block text-[13px]">{t('step3.presentHint')}</small>
              </Checkbox>
              <Checkbox
                id="t3"
                checked={tick3}
                disabled={isSubmitting}
                aria-invalid={!!errors.terms && !tick3}
                onChange={(e) => {
                  setTick3(e.target.checked);
                  clearError('terms');
                }}
              >
                {t('step3.pay')}
                <small className="text-ink-muted mt-0.5 block text-[13px]">{t('step3.payHint')}</small>
              </Checkbox>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? t('step3.sending') : t('step3.send')}
                </Button>
                <Button type="button" variant="secondary" disabled={isSubmitting} onClick={saveAndLeave}>
                  {t('step3.later')}
                </Button>
              </div>
            </Card>
          </FormStep>
        </ol>
      </form>
    </div>
  );
};

export default CustomerBecomeFarmerPage;
