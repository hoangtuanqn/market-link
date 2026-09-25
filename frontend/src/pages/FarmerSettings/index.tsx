import { useState } from 'react';
import SettingsRow from '@/components/SettingsRow';
import ThemePicker, { type ThemeChoice } from '@/components/ThemePicker';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { SelectField } from '@/components/ui/input';
import Notification from '@/utils/notification';

const NOTES = [
  { label: 'A new order arrives', checked: true },
  { label: 'A customer edits or cancels an order', checked: true },
  { label: 'A cutoff is an hour away', checked: true },
  { label: 'A new review of your stall', checked: false },
  { label: 'Announcements from MarketLink', checked: true },
];

/**
 * A settings screen is not in the SRS, and the Selling defaults below overlap FR-060, FR-061 and FR-067, which put
 * cutoff and slot settings on the stall profile. Ask LEAD/FE1 which screen owns them before this ships for real.
 */
const FarmerSettingsPage = () => {
  const [theme, setTheme] = useState<ThemeChoice>('light');
  const [language, setLanguage] = useState('English');
  const [currency, setCurrency] = useState('₫ Vietnamese đồng');
  const [units, setUnits] = useState('Metric · kg, g, litre');
  const [dateFormat, setDateFormat] = useState('31/12/2026');
  const [clock, setClock] = useState('24-hour · 19:00');
  const [notes, setNotes] = useState(NOTES);
  const [cutoff, setCutoff] = useState('12 hours');
  const [slotLength, setSlotLength] = useState('30 minutes');
  const [maxOrders, setMaxOrders] = useState('5');

  const toggleNote = (label: string) => {
    setNotes((prev) => prev.map((n) => (n.label === label ? { ...n, checked: !n.checked } : n)));
  };

  return (
    <div className="mx-auto flex w-full max-w-180 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">Settings</h1>
        <p className="text-body">
          How the panel looks, what it tells you, and the defaults it uses when you set up a new week.
        </p>
      </div>

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="text-h3">Appearance</h2>
        <ul className="m-0 flex flex-col p-0">
          <SettingsRow
            title="Theme"
            note="Dark is a proposal, not part of the design system yet. Every colour was re-derived and measured, not flipped."
          >
            <ThemePicker value={theme} onChange={setTheme} />
          </SettingsRow>
          <SettingsRow
            title="Language"
            note="The interface is written in English. A Vietnamese translation is a separate piece of work."
          >
            <SelectField
              id="s-lang"
              label="Language"
              hideLabel
              options={['English', 'Tiếng Việt (not translated yet)']}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            />
          </SettingsRow>
        </ul>
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="text-h3">Money, dates and units</h2>
        <ul className="m-0 flex flex-col p-0">
          <SettingsRow
            title="Show prices in"
            note="You always hand over Vietnamese đồng at the stall. Another currency here is a conversion for reading only."
          >
            <SelectField
              id="s-cur"
              label="Currency"
              hideLabel
              options={['₫ Vietnamese đồng', '$ US dollar', '€ Euro', '¥ Japanese yen']}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            />
          </SettingsRow>
          <SettingsRow
            title="Weights and volumes"
            note="Only converts units that measure something. A stall that sells by the bunch, the bulb or the tray keeps its own word either way."
          >
            <SelectField
              id="s-unit"
              label="Units"
              hideLabel
              options={['Metric · kg, g, litre', 'Imperial · lb, oz, pint']}
              value={units}
              onChange={(e) => setUnits(e.target.value)}
            />
          </SettingsRow>
          <SettingsRow title="Date">
            <SelectField
              id="s-date"
              label="Date format"
              hideLabel
              options={['31/12/2026', '12/31/2026', '2026-12-31']}
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value)}
            />
          </SettingsRow>
          <SettingsRow title="Clock">
            <SelectField
              id="s-time"
              label="Clock"
              hideLabel
              options={['24-hour · 19:00', '12-hour · 7:00 pm']}
              value={clock}
              onChange={(e) => setClock(e.target.value)}
            />
          </SettingsRow>
        </ul>
      </Card>

      <Card className="flex flex-col gap-3 p-6">
        <h2 className="text-h3">Notifications</h2>
        <p className="text-small text-ink-muted">In-app only for now. Email is a later addition.</p>
        <div className="flex flex-col gap-2">
          {notes.map((n) => (
            <Checkbox key={n.label} id={`note-${n.label}`} checked={n.checked} onChange={() => toggleNote(n.label)}>
              {n.label}
            </Checkbox>
          ))}
        </div>
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="text-h3">Selling defaults</h2>
        <ul className="m-0 flex flex-col p-0">
          <SettingsRow title="Order cutoff" note="How many hours before a pickup slot the order locks.">
            <SelectField
              id="s-cut"
              label="Cutoff hours"
              hideLabel
              options={['6 hours', '12 hours', '18 hours', '24 hours']}
              value={cutoff}
              onChange={(e) => setCutoff(e.target.value)}
            />
          </SettingsRow>
          <SettingsRow title="Slot length" note="Used when you generate pickup slots for a new week.">
            <SelectField
              id="s-slot"
              label="Slot length"
              hideLabel
              options={['15 minutes', '30 minutes', '60 minutes']}
              value={slotLength}
              onChange={(e) => setSlotLength(e.target.value)}
            />
          </SettingsRow>
          <SettingsRow title="Orders per slot">
            <SelectField
              id="s-max"
              label="Orders per slot"
              hideLabel
              options={['3', '5', '8', '10']}
              value={maxOrders}
              onChange={(e) => setMaxOrders(e.target.value)}
            />
          </SettingsRow>
        </ul>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => Notification.success({ title: 'Saved', text: 'Settings saved.' })}>Save settings</Button>
        <span className="text-small text-ink-muted">The theme applies as soon as you pick it.</span>
      </div>
    </div>
  );
};

export default FarmerSettingsPage;
