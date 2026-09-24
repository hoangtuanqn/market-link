import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import useLogout from '@/hooks/useLogout';
import ChangePasswordForm from './ChangePasswordForm';
import ProfileForm from './ProfileForm';

/** Profile editing and change password are proposals, not SRS requirements (feature catalog). */
const CustomerAccountPage = () => {
  const logout = useLogout();
  return (
    <div className="mx-auto flex w-full max-w-180 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">Account</h1>
        <p className="text-body">Your details are shared with a stall only on the orders you place there.</p>
      </div>

      <ProfileForm />

      <ChangePasswordForm />

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
