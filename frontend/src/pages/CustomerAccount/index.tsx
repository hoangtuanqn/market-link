import { useState, type FormEvent } from 'react';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/input';
import useLogout from '@/hooks/useLogout';
import Notification from '@/utils/notification';

/** Profile editing and change password are proposals, not SRS requirements (feature catalog). */
const CustomerAccountPage = () => {
  const logout = useLogout();
  const [name, setName] = useState('Nguyễn Minh Khang');
  const [phone, setPhone] = useState('0903 118 218');
  const [email, setEmail] = useState('khang@example.com');
  const [address, setAddress] = useState('25 Xuân Thủy, Thảo Điền, Thủ Đức');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const onSaveDetails = (e: FormEvent) => {
    e.preventDefault();
    Notification.success({ title: 'Saved', text: 'Your details are saved.' });
  };

  const onChangePassword = (e: FormEvent) => {
    e.preventDefault();
    setCurrentPassword('');
    setNewPassword('');
    Notification.success({ title: 'Password changed', text: 'Password changed.' });
  };

  return (
    <div className="mx-auto flex w-full max-w-180 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">Account</h1>
        <p className="text-body">Your details are shared with a stall only on the orders you place there.</p>
      </div>

      <Card as="form" onSubmit={onSaveDetails} className="flex flex-col gap-4 p-6">
        <h2 className="text-h3">Your details</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field id="name" label="Full name" required value={name} onChange={(e) => setName(e.target.value)} />
          <Field id="phone" label="Phone number" required value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Field
            id="email"
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Field
            id="addr"
            label="Address"
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            hint="Used for distances and directions."
          />
        </div>
        <div className="pt-2">
          <Button type="submit">Save changes</Button>
        </div>
      </Card>

      <Card as="form" onSubmit={onChangePassword} className="flex flex-col gap-4 p-6">
        <h2 className="text-h3">Change password</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            id="cur"
            label="Current password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <Field
            id="new"
            label="New password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            hint="At least 8 characters."
          />
        </div>
        <div className="pt-2">
          <Button type="submit" variant="secondary">
            Change password
          </Button>
        </div>
      </Card>

      <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div className="flex max-w-130 flex-col gap-2">
          <h2 className="text-h3">Sell at MarketLink</h2>
          <p className="text-[15px]">
            If you grow food, this account can become a stall. You keep your orders, favorites and cart, and a panel
            appears for stock and pickup times once an admin approves you.
          </p>
        </div>
        <ButtonLink to="/become-farmer">Apply to sell</ButtonLink>
      </Card>

      <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h2 className="text-h3">Sign out</h2>
          <p className="text-small text-ink-muted">Signs you out on this device only.</p>
        </div>
        <Button variant="secondary" onClick={logout}>
          Sign out
        </Button>
      </Card>
    </div>
  );
};

export default CustomerAccountPage;
