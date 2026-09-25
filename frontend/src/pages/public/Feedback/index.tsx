import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, SelectField } from '@/components/ui/input';
import useSession from '@/hooks/useSession';
import Notification from '@/utils/notification';

type FeedbackType = 'bug' | 'suggestion' | 'query';

const TYPE_OPTIONS: { value: FeedbackType; label: string }[] = [
  { value: 'bug', label: 'Bug report: something is not working' },
  { value: 'suggestion', label: 'Suggestion: something could be better' },
  { value: 'query', label: 'Question: I need an answer' },
];
const TYPE_NOUN: Record<FeedbackType, string> = { bug: 'bug report', suggestion: 'suggestion', query: 'question' };

/** FR-081 — bugs, suggestions and questions for the platform team, routed by type. */
const FeedbackPage = () => {
  const { user } = useSession();
  const [type, setType] = useState<FeedbackType>('bug');
  const [page, setPage] = useState('Cart');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');

  const send = () => {
    if (!message.trim()) return;
    Notification.success({ title: 'Sent', text: `Thanks. Your ${TYPE_NOUN[type]} is with the team.` });
    setMessage('');
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card
        as="form"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="mx-auto flex w-full max-w-160 flex-col gap-4 p-8"
      >
        <div className="flex flex-col gap-2">
          <h1 className="text-h1">Send feedback</h1>
          <p className="text-small text-ink-muted">
            Bug reports, suggestions and questions all go to the team. Pick the type so it reaches the right person.
          </p>
        </div>

        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-2 p-0 text-[14px] font-bold">What is it?</legend>
          {TYPE_OPTIONS.map((o) => (
            <label key={o.value} className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-[15px]">
              <input
                type="radio"
                name="type"
                value={o.value}
                checked={type === o.value}
                onChange={() => setType(o.value)}
                className="accent-brand size-5"
              />
              {o.label}
            </label>
          ))}
        </fieldset>

        <SelectField
          id="page"
          label="Which page?"
          value={page}
          onChange={(e) => setPage(e.target.value)}
          options={['Cart', 'Product page', 'Market map', 'My orders', 'Farmer dashboard', 'Other']}
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="msg" className="text-small font-bold">
            Message<span className="text-danger ml-0.5">*</span>
          </label>
          <textarea
            id="msg"
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What did you expect, and what happened instead?"
            className="border-line-strong bg-surface-raised text-body min-h-24 rounded-sm border-[1.5px] p-3"
          />
          <span className="text-ink-muted text-[13px]">For a bug, add your phone or browser model.</span>
        </div>

        <Field
          id="email"
          label="Email for a reply"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          hint="Optional. Filled in when you are signed in."
        />

        <div>
          <Button type="submit">Send feedback</Button>
        </div>
      </Card>

      <aside className="flex flex-col gap-4">
        <Card className="flex flex-col gap-2 p-6">
          <h2 className="text-h3">Not about the platform?</h2>
          <p className="text-[15px]">
            A late pickup, a missing item or a question about produce is for the stall. Their phone number is on the
            order ticket, and you can also leave a review after the order is completed.
          </p>
          <Link to="/orders" className="text-brand underline">
            Go to my orders
          </Link>
        </Card>
        <Card className="flex flex-col gap-2 p-6">
          <h2 className="text-h3">After you send</h2>
          <p className="text-[15px]">
            Bug reports are read every market day. Answers to questions come by email when you leave one.
          </p>
        </Card>
      </aside>
    </div>
  );
};

export default FeedbackPage;
