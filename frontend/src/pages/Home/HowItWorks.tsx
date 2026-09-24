import { Card } from '@/components/ui/card';

const STEPS = [
  {
    title: 'Reserve before the cutoff',
    text: "Add products from one or more stalls, pick a pickup time in each stall's window, and place the order. Stock is held for you the moment you order.",
  },
  {
    title: 'The Farmer confirms',
    text: "Each stall accepts or declines its own order. You get a notification either way, and you can edit or cancel until the stall's cutoff.",
  },
  {
    title: 'Pick up and pay at the stall',
    text: 'When the order is marked ready, go to the stall in your time slot, collect it and pay the Farmer directly. There is no online payment.',
  },
];

const HowItWorks = () => {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-h2">How pre-ordering works</h2>
      <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((step, i) => (
          <Card as="li" key={step.title} className="flex flex-col gap-2 p-4">
            <span aria-hidden="true" className="font-hand text-brand text-[40px] leading-none">
              {i + 1}
            </span>
            <h3 className="text-h3">{step.title}</h3>
            <p className="text-ink-muted text-[15px]">{step.text}</p>
          </Card>
        ))}
      </ol>
    </section>
  );
};

export default HowItWorks;
