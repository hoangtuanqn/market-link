import { Link } from 'react-router';
import { Card } from '@/components/ui/card';
import FormLogin from './FormLogin';

/** FR-003 — đăng nhập chung cho Customer, Farmer và Admin. */
const LoginPage = () => {
  return (
    <Card className="mx-auto my-4 box-border flex w-full max-w-115 flex-col gap-4 p-4 md:my-8 md:p-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-hand text-h1">Sign in</h1>
        <p className="text-small text-ink-muted">Customers, Farmers and Admins sign in here.</p>
      </div>

      <FormLogin />

      <p className="text-small text-ink-muted">
        New here?{' '}
        <Link to="/register" className="text-brand underline">
          Create a customer account
        </Link>{' '}
        or{' '}
        <Link to="/register-farmer" className="text-brand underline">
          register your stall
        </Link>
        .
      </p>
    </Card>
  );
};

export default LoginPage;
