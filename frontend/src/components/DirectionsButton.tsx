import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/input';
import useGeolocation from '@/hooks/useGeolocation';
import useSession from '@/hooks/useSession';
import { directionsUrl, rememberChoice, rememberedChoice, type StartChoice, type StartPoint } from '@/lib/directions';
import type { LatLng } from '@/lib/geo';
import Helper from '@/utils/helper';

type DirectionsButtonProps = {
  /** Where you are going. */
  to: LatLng;
  /** What is at that point, named in the dialog so it is clear what you are routing to. */
  name: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
  className?: string;
};

type Kind = StartChoice['kind'];

/**
 * FR-013 — directions to a pickup point. Asks where you are setting off from, then opens OpenStreetMap in a new tab
 * (D-12). Three starting points, because no single one works for everybody: the browser's location needs permission and
 * https, a saved address needs an account, and a typed address always works.
 *
 * The choice is remembered, so the second market you look at costs one click.
 */
const DirectionsButton = ({ to, name, variant = 'ghost', size = 'sm', className }: DirectionsButtonProps) => {
  const { t } = useTranslation();
  const { state, request } = useGeolocation();
  const { user } = useSession();
  const savedAddress = user?.address?.trim() ?? '';

  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>('none');
  const [typed, setTyped] = useState('');
  /** True when the visitor confirmed "my location" before the browser had answered. */
  const [waiting, setWaiting] = useState(false);

  const blocked = state.status === 'denied' || state.status === 'unavailable';
  const locationNote =
    state.status === 'denied'
      ? t('geo.denied')
      : state.status === 'unavailable'
        ? t(`geo.${state.reason}`)
        : state.status === 'ready'
          ? t('directions.currentShared')
          : t('directions.currentAsk');

  const openDialog = () => {
    const remembered = rememberedChoice();
    setKind(remembered.kind);
    if (remembered.kind === 'address') setTyped(remembered.text);
    else if (typed === '') setTyped(savedAddress);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setWaiting(false);
  };

  const go = (from: StartPoint) => {
    window.open(directionsUrl(to, from), '_blank', 'noopener,noreferrer');
    close();
  };

  const confirm = async () => {
    if (kind === 'current') {
      rememberChoice({ kind: 'current' });
      if (state.status === 'ready') {
        go({ kind: 'current', at: state.at });
        return;
      }
      // Permission must be asked for from a click, which is exactly where we are.
      setWaiting(true);
      const settled = await request();
      setWaiting(false);
      // Refused or unavailable: the dialog stays open with the reason now showing beside the option.
      if (settled.status === 'ready') go({ kind: 'current', at: settled.at });
      return;
    }
    if (kind === 'address') {
      const text = typed.trim();
      if (text === '') return;
      rememberChoice({ kind: 'address', text });
      go({ kind: 'address', text });
      return;
    }
    rememberChoice({ kind: 'none' });
    go({ kind: 'none' });
  };

  // A plain function, not a component: a component defined during render remounts its inputs on every
  // keystroke, which would drop focus in the address field below.
  const startOption = (value: Kind, label: string, note: string, disabled?: boolean) => (
    <label
      className={Helper.cn(
        'border-line-strong flex cursor-pointer items-start gap-3 rounded-sm border-[1.5px] p-3',
        disabled && 'cursor-not-allowed opacity-60',
        kind === value ? 'bg-brand-tint' : 'bg-surface-raised',
      )}
    >
      <input
        type="radio"
        name="directions-start"
        className="mt-1"
        checked={kind === value}
        disabled={disabled}
        onChange={() => setKind(value)}
      />
      <span className="flex flex-col gap-1">
        <span className="text-body font-bold">{label}</span>
        <span className="text-small text-ink-muted">{note}</span>
      </span>
    </label>
  );

  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={openDialog}>
        {t('actions.directions')}
      </Button>

      <Dialog
        open={open}
        title={t('directions.title', { name })}
        onClose={close}
        actions={
          <>
            <Button variant="secondary" onClick={close}>
              {t('actions.cancel')}
            </Button>
            <Button onClick={() => void confirm()} disabled={waiting || (kind === 'address' && typed.trim() === '')}>
              {waiting ? t('geo.finding') : t('directions.open')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-body m-0">{t('directions.question')}</p>

          {startOption('current', t('directions.current'), locationNote, blocked)}

          {startOption('address', t('directions.address'), t('directions.addressNote'))}
          {kind === 'address' && (
            <div className="flex flex-col gap-2">
              <Field
                id="directions-from"
                label={t('directions.addressLabel')}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={t('directions.addressPlaceholder')}
                hint={t('directions.addressHint')}
              />
              {savedAddress !== '' && savedAddress !== typed.trim() && (
                <Button variant="ghost" size="sm" className="self-start" onClick={() => setTyped(savedAddress)}>
                  {t('directions.useSaved')}
                </Button>
              )}
            </div>
          )}

          {startOption('none', t('directions.none'), t('directions.noneNote'))}

          <p className="text-caption text-ink-muted m-0">{t('directions.privacy')}</p>
        </div>
      </Dialog>
    </>
  );
};

export default DirectionsButton;
