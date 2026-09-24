import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/input';

/** FR-002 — Farmer registration; the stall is reviewed by an admin before it goes live (D-09). */
const RegisterFarmerPage = () => {
  const navigate = useNavigate();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    navigate('/farmer/pending');
  };

  return (
    <div className="mx-auto flex w-full max-w-160 flex-col">
      <Card as="form" onSubmit={onSubmit} className="mt-6 flex flex-col gap-4 p-8">
        <div className="flex flex-col gap-2">
          <h1 className="font-hand text-h1">Register your stall</h1>
          <p className="text-small text-ink-muted">
            After you register, an admin reviews the stall. You can sign in right away and set up your profile, but
            products go live only after approval.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            id="stall"
            label="Stall or business name"
            required
            placeholder="e.g. Cô Tư Garden"
            hint="Customers see this name on the map and on orders."
            className="md:col-span-2"
          />
          <Field id="person" label="Contact person" required autoComplete="name" placeholder="Nguyễn Thị Tư" />
          <Field id="phone" label="Phone number" required inputMode="tel" autoComplete="tel" />
          <Field id="email" label="Email" type="email" required autoComplete="email" />
          <Field id="address" label="Farm or business address" required autoComplete="street-address" />
          <Field id="pw" label="Password" type="password" required minLength={8} autoComplete="new-password" />
          <Field id="pw2" label="Repeat password" type="password" required autoComplete="new-password" />
        </div>

        <Banner title="MarketLink does not check licences or organic certification.">
          Approval confirms the stall exists and the contact details work. Say what you grow and how at the stall
          itself.
        </Banner>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button type="submit">Register stall</Button>
          <Link to="/login" className="text-small text-brand underline">
            I already have an account
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default RegisterFarmerPage;
