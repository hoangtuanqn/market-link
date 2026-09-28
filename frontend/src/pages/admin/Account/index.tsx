import { useEffect, useState, type SubmitEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import AuthApi from '@/api-requests/auth.requests';
import MfaApi from '@/api-requests/mfa.requests';
import { CheckIcon, InfoIcon, ShieldIcon } from '@/components/icons';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/input';
import { ADMIN_LOGIN_PATH, ADMIN_SECURITY_PATH } from '@/constants/nav';
import useSession from '@/hooks/useSession';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';
import Session from '@/utils/session';

/** Same password rules as register / reset (backend RegisterRules). */
const PASSWORD_MIN = 6;
const PASSWORD_MAX = 72;

type ProfileErrors = Partial<Record<'fullName' | 'phone', string>>;
type PasswordErrors = Partial<Record<'currentPassword' | 'newPassword' | 'confirmPassword', string>>;

/**
 * FR-004 — the admin's own account: name, phone and email, and the password that protects all of it. Two-step
 * verification lives on its own screen; this one links across to it rather than repeating the setup flow.
 */
const AdminAccountPage = () => {
  const { t } = useTranslation('AdminAccount');
  const navigate = useNavigate();
  const { user } = useSession();

  const [profile, setProfile] = useState({
    fullName: user?.fullName ?? '',
    phone: user?.phone ?? '',
    email: user?.email ?? '',
  });
  const [profileErrors, setProfileErrors] = useState<ProfileErrors>({});
  const [savingProfile, setSavingProfile] = useState(false);

  const [password, setPassword] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});
  const [changingPassword, setChangingPassword] = useState(false);

  const [mfaOn, setMfaOn] = useState<boolean | null>(null);

  useEffect(() => {
    MfaApi.status()
      .then((response) => setMfaOn(response.data.enabled))
      .catch(() => setMfaOn(null));
  }, []);

  const saveProfile = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errors: ProfileErrors = {};
    if (!profile.fullName.trim()) errors.fullName = t('details.errors.nameRequired');
    if (!profile.phone.trim()) errors.phone = t('details.errors.phoneRequired');
    setProfileErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSavingProfile(true);
    try {
      // The admin's address is not shown anywhere: send the parts on file, or none to keep the address as it is.
      const response = await AuthApi.updateMe({
        fullName: profile.fullName.trim(),
        phone: profile.phone.trim(),
        addressParts: user?.addressParts,
      });
      Session.updateUser(response.data);
      Notification.success({ text: response.message || t('details.saved') });
    } catch (error) {
      setProfileErrors(Helper.getFieldErrors(error));
      Notification.error({ text: Helper.getErrorMessage(error, t('details.failed')) });
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errors: PasswordErrors = {};
    if (!password.currentPassword) errors.currentPassword = t('password.errors.currentRequired');
    if (!password.newPassword) errors.newPassword = t('password.errors.newRequired');
    else if (password.newPassword.length < PASSWORD_MIN || password.newPassword.length > PASSWORD_MAX)
      errors.newPassword = t('password.errors.length', { min: PASSWORD_MIN, max: PASSWORD_MAX });
    else if (password.newPassword === password.currentPassword) errors.newPassword = t('password.errors.same');
    if (!password.confirmPassword) errors.confirmPassword = t('password.errors.confirmRequired');
    else if (password.confirmPassword !== password.newPassword) errors.confirmPassword = t('password.errors.mismatch');
    setPasswordErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setChangingPassword(true);
    try {
      const response = await AuthApi.changePassword(password);
      // The backend signs every device out, this one included, so the session goes and we land on the admin login.
      Session.clear();
      Notification.success({ text: response.message || t('password.changed') });
      navigate(ADMIN_LOGIN_PATH, { replace: true });
    } catch (error) {
      setPasswordErrors(Helper.getFieldErrors(error));
      Notification.error({ text: Helper.getErrorMessage(error, t('password.failed')) });
      setChangingPassword(false);
    }
  };

  const initials =
    (user?.fullName ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join('') || 'AD';

  return (
    <div className="mx-auto flex w-full max-w-(--size-container) flex-col gap-6">
      {/* Personal profile info */}
      <div className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="bg-brand text-on-brand grid size-16 flex-none place-items-center rounded-full text-[24px] font-bold shadow-xs"
        >
          {initials}
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-h2 text-ink truncate font-bold">{user?.fullName}</h1>
          <p className="text-small text-ink-muted truncate">{user?.email}</p>
        </div>
      </div>

      {/* 2-column grid: Section "Your details" and Section "Password" equal height and horizontally aligned */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
        {/* Section Your details */}
        <Card as="form" className="flex h-full flex-col gap-4 p-6" noValidate onSubmit={saveProfile}>
          <h2 className="text-h3">{t('details.title')}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              id="admin-name"
              label={t('details.name')}
              required
              value={profile.fullName}
              onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
              error={profileErrors.fullName}
              disabled={savingProfile}
            />
            <Field
              id="admin-phone"
              label={t('details.phone')}
              required
              hint={t('details.phoneHint')}
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              error={profileErrors.phone}
              disabled={savingProfile}
            />
            <Field
              id="admin-email"
              label={t('details.email')}
              type="email"
              className="sm:col-span-2"
              hint={t('details.emailHint')}
              value={profile.email}
              readOnly
            />
          </div>
          <div className="mt-auto pt-2">
            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? t('details.saving') : t('details.submit')}
            </Button>
          </div>
        </Card>

        {/* Section Password */}
        <Card as="form" className="flex h-full flex-col gap-4 p-6" noValidate onSubmit={changePassword}>
          <div className="flex flex-col gap-1">
            <h2 className="text-h3">{t('password.title')}</h2>
            <p className="text-small text-ink-muted">{t('password.intro')}</p>
          </div>

          {/* Tells a password manager which account this password belongs to */}
          <input type="email" name="username" autoComplete="username" value={profile.email} readOnly hidden />

          <div className="grid grid-cols-1 gap-4">
            <Field
              id="admin-current-password"
              label={t('password.current')}
              type="password"
              required
              autoComplete="current-password"
              value={password.currentPassword}
              onChange={(e) => setPassword({ ...password, currentPassword: e.target.value })}
              error={passwordErrors.currentPassword}
              disabled={changingPassword}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                id="admin-new-password"
                label={t('password.new')}
                type="password"
                required
                autoComplete="new-password"
                hint={t('password.hint', { min: PASSWORD_MIN, max: PASSWORD_MAX })}
                value={password.newPassword}
                onChange={(e) => setPassword({ ...password, newPassword: e.target.value })}
                error={passwordErrors.newPassword}
                disabled={changingPassword}
              />
              <Field
                id="admin-confirm-password"
                label={t('password.repeat')}
                type="password"
                required
                autoComplete="new-password"
                value={password.confirmPassword}
                onChange={(e) => setPassword({ ...password, confirmPassword: e.target.value })}
                error={passwordErrors.confirmPassword}
                disabled={changingPassword}
              />
            </div>
          </div>
          <div className="mt-auto pt-2">
            <Button type="submit" variant="secondary" disabled={changingPassword}>
              {changingPassword ? t('password.submitting') : t('password.submit')}
            </Button>
          </div>
        </Card>
      </div>

      {/* Two-step verification: Full width bottom spanning left to right */}
      <Card className="flex flex-col gap-4 p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-4">
            <div className="bg-surface-sunken text-brand border-line grid size-11 flex-none place-items-center rounded-lg border">
              <ShieldIcon size={22} />
            </div>
            <div className="flex max-w-2xl flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-h3 text-ink font-bold">{t('mfa.title')}</h2>
                {mfaOn !== null && (
                  <span
                    className={Helper.cn(
                      'inline-flex items-center gap-1 rounded-full py-0.75 pr-2.5 pl-2 text-[13px] leading-4.5 font-bold',
                      mfaOn ? 'bg-status-ready-bg text-status-ready-ink' : 'bg-status-placed-bg text-status-placed-ink',
                    )}
                  >
                    {mfaOn ? <CheckIcon size={14} /> : <InfoIcon size={14} />}
                    {t(mfaOn ? 'mfa.on' : 'mfa.off')}
                  </span>
                )}
              </div>
              <p className="text-small text-ink-muted">{t('mfa.intro')}</p>
            </div>
          </div>
          <div className="shrink-0 sm:self-center">
            <ButtonLink to={ADMIN_SECURITY_PATH} variant={mfaOn ? 'secondary' : 'primary'}>
              {t(mfaOn ? 'mfa.manage' : 'mfa.turnOn')}
            </ButtonLink>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdminAccountPage;
