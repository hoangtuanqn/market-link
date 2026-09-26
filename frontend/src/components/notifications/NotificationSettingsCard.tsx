import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import NotificationApi from '@/api-requests/notification.requests';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DataState } from '@/components/ui/data-state';
import { Field } from '@/components/ui/input';
import { permission, requestPermission, type BrowserPermission } from '@/lib/notifications/browser';
import type { NotificationPreferences } from '@/types/notification.types';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

type Load = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: NotificationPreferences };

const SAVE_DELAY_MS = 400;

/**
 * FR-042 — Settings → Thông báo cho cả ba vai: từng nhóm × hai kênh, âm thanh, giờ yên tĩnh, gửi thử. Lưu ngay (sau 400
 * ms) qua /notifications/preferences, không chờ nút Save chung vì server dùng các lựa chọn này khi gửi.
 */
const NotificationSettingsCard = () => {
  const { t } = useTranslation();
  const [state, setState] = useState<Load>({ status: 'loading' });
  const [browser, setBrowser] = useState<BrowserPermission>(permission());
  const [testing, setTesting] = useState(false);
  const saved = useRef<NotificationPreferences | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const fetchPreferences = () =>
    NotificationApi.getPreferences()
      .then((res) => {
        saved.current = res.data;
        setState({ status: 'ready', data: res.data });
      })
      .catch(() => setState({ status: 'error' }));

  const retry = () => {
    setState({ status: 'loading' });
    void fetchPreferences();
  };

  useEffect(() => {
    void fetchPreferences();
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const change = (patch: Partial<NotificationPreferences>) => {
    if (state.status !== 'ready') return;
    const next = { ...state.data, ...patch };
    setState({ status: 'ready', data: next });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      NotificationApi.savePreferences(next)
        .then((res) => {
          saved.current = res.data;
        })
        .catch((error) => {
          Notification.error({ text: Helper.getErrorMessage(error, t('notify.settings.saveError')) });
          if (saved.current) setState({ status: 'ready', data: saved.current });
        });
    }, SAVE_DELAY_MS);
  };

  const setChannel = (category: string, channel: 'inApp' | 'browser', value: boolean) => {
    if (state.status !== 'ready') return;
    change({
      categories: state.data.categories.map((c) => (c.category === category ? { ...c, [channel]: value } : c)),
    });
  };

  const enableBrowser = async () => setBrowser(await requestPermission());

  const sendTest = async () => {
    setTesting(true);
    try {
      await NotificationApi.sendTest();
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, t('notify.settings.testError')) });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card as="section" aria-labelledby="set-notify" className="flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-1">
        <h2 id="set-notify" className="text-h3">
          {t('notify.settings.title')}
        </h2>
        <p className="text-small text-ink-muted">{t('notify.settings.intro')}</p>
      </div>

      <div className="border-line flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="min-w-0">
          <b className="block text-[15px]">{t('notify.settings.browser')}</b>
          <p className="text-ink-muted mt-0.5 text-[13px]">{t(`notify.settings.permission.${browser}`)}</p>
        </div>
        {browser === 'default' && (
          <Button variant="secondary" size="sm" onClick={() => void enableBrowser()}>
            {t('notify.prompt.enable')}
          </Button>
        )}
      </div>

      {state.status === 'loading' && <p className="text-small text-ink-muted">{t('notify.settings.loading')}</p>}

      {state.status === 'error' && (
        <DataState
          variant="error"
          title={t('notify.settings.loadErrorTitle')}
          text={t('notify.settings.loadErrorText')}
          action={
            <Button variant="secondary" size="sm" onClick={retry}>
              {t('notify.settings.retry')}
            </Button>
          }
        />
      )}

      {state.status === 'ready' && (
        <>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="text-ink-muted text-[13px]">
                <th scope="col" className="pb-2 font-medium">
                  {t('notify.settings.group')}
                </th>
                <th scope="col" className="w-24 pb-2 text-center font-medium">
                  {t('notify.settings.inApp')}
                </th>
                <th scope="col" className="w-24 pb-2 text-center font-medium">
                  {t('notify.settings.inBrowser')}
                </th>
              </tr>
            </thead>
            <tbody>
              {state.data.categories.map((c) => (
                <tr key={c.category} className="border-line border-t">
                  <th scope="row" className="py-2 pr-3 font-normal">
                    <b className="block text-[15px]">{t(`notify.settings.groups.${c.category}.title`)}</b>
                    <span className="text-ink-muted block text-[13px]">
                      {t(`notify.settings.groups.${c.category}.note`)}
                    </span>
                  </th>
                  <td className="text-center">
                    <Checkbox
                      id={`notify-${c.category}-inapp`}
                      checked={c.inApp}
                      onChange={(e) => setChannel(c.category, 'inApp', e.target.checked)}
                    >
                      <span className="sr-only">
                        {t(`notify.settings.groups.${c.category}.title`)} · {t('notify.settings.inApp')}
                      </span>
                    </Checkbox>
                  </td>
                  <td className="text-center">
                    <Checkbox
                      id={`notify-${c.category}-browser`}
                      checked={c.browser}
                      onChange={(e) => setChannel(c.category, 'browser', e.target.checked)}
                    >
                      <span className="sr-only">
                        {t(`notify.settings.groups.${c.category}.title`)} · {t('notify.settings.inBrowser')}
                      </span>
                    </Checkbox>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-line flex flex-col gap-3 border-t pt-4">
            <Checkbox
              id="notify-sound"
              checked={state.data.sound}
              onChange={(e) => change({ sound: e.target.checked })}
            >
              {t('notify.settings.sound')}
            </Checkbox>
            <Checkbox
              id="notify-quiet"
              checked={state.data.quietOn}
              onChange={(e) => change({ quietOn: e.target.checked })}
            >
              {t('notify.settings.quiet')}
            </Checkbox>
            <p className="text-ink-muted -mt-2 pl-7 text-[13px]">{t('notify.settings.quietNote')}</p>
            <div className="grid grid-cols-2 gap-3 pl-7 sm:max-w-80">
              <Field
                id="notify-quiet-from"
                type="time"
                label={t('notify.settings.from')}
                value={state.data.quietFrom}
                disabled={!state.data.quietOn}
                onChange={(e) => e.target.value && change({ quietFrom: e.target.value })}
              />
              <Field
                id="notify-quiet-to"
                type="time"
                label={t('notify.settings.to')}
                value={state.data.quietTo}
                disabled={!state.data.quietOn}
                onChange={(e) => e.target.value && change({ quietTo: e.target.value })}
              />
            </div>
          </div>

          <div className="border-line flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <p className="text-small text-ink-muted">{t('notify.settings.testNote')}</p>
            <Button variant="secondary" size="sm" disabled={testing} onClick={() => void sendTest()}>
              {testing ? t('notify.settings.testing') : t('notify.settings.test')}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
};

export default NotificationSettingsCard;
