import Carousel, { type CarouselSlide } from '@/components/Carousel';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const UNSPLASH = 'https://images.unsplash.com/';
const SHOT = '?w=1800&q=72&auto=format&fit=crop';

const SLIDES: CarouselSlide[] = [
  {
    topic: 'Our mission',
    title: 'End the trip that comes home empty',
    text: "Stalls announce the week on a chalkboard, so the best of the morning is gone before most people arrive. MarketLink puts every stall's week in one place and holds what you reserve until you collect it.",
    photo: `${UNSPLASH}photo-1533900298318-6b8da08a523e${SHOT}`,
    alt: 'Stalls at a covered market with produce stacked in wooden crates',
    note: 'Thảo Điền · 06:40',
    cta: ["See this weekend's markets", '/markets'],
  },
  {
    topic: 'How it works',
    title: 'Reserve on Thursday, collect on Saturday',
    text: 'Browse what four markets around Ho Chi Minh City will have this weekend and reserve from as many stalls as you like. Each stall gets its own order, its own pickup time, and is paid at the stall.',
    photo: `${UNSPLASH}photo-1464226184884-fa280b87c399${SHOT}`,
    alt: 'Baskets of carrots, beans and chillies laid out on a market table',
    note: 'Thủ Đức · Sat 06:00',
    cta: ["Browse this week's products", '/products'],
  },
  {
    topic: 'The technology',
    title: 'Counts that are true the moment you order',
    text: "A reservation comes out of the stall's count straight away, so two people cannot book the same last two bunches. Pickup slots keep the queue short, and the map pins each stall inside its market.",
    photo: `${UNSPLASH}photo-1416879595882-3373a0480b5b${SHOT}`,
    alt: 'Seeds and dry soil with a metal scoop',
    note: '12 bunches left',
    cta: ['See the market map', '/map'],
  },
  {
    topic: 'What you get',
    title: 'The stall knows what to bring',
    text: 'Farmers read the weekend orders before they harvest, so less comes back unsold. You get the pomelo you planned on, at a time you chose, paid to the person who grew it.',
    photo: `${UNSPLASH}photo-1574943320219-553eb213f72d${SHOT}`,
    alt: 'A farmer working a flooded rice field with a small tractor',
    note: 'Củ Chi · Fri harvest',
    cta: ['Sell at MarketLink', '/register/farmer'],
  },
];

const TEAM = [
  ['LEAD', 'The schema, the API contract and the twelve decisions the rest of the team builds against'],
  ['BE1', 'Sign-in, roles and the order lifecycle, from placed through to completed'],
  ['BE2', 'Products, markets, weekly stock, reports and the seed data for the demo'],
  ['FE1', 'The design system, the public pages, the map and the Customer dashboard'],
  ['FE2', 'The Farmer and Admin dashboards, and every form in the product'],
  ['QA / DOC', 'The requirements list, the test data and the documents that go with the submission'],
] as const;

/** FR-082 — what MarketLink is, what it deliberately does not do, and who built it. */
const AboutPage = () => {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="font-hand text-hand text-ink-muted">TechWiz 7 · eGreen Basket</p>
        <h1 className="text-h1">About MarketLink</h1>
        <p className="text-body-lg max-w-160">
          MarketLink connects Farmers at farmers markets around Ho Chi Minh City with the people who shop there. Stalls
          publish what they will bring this week, you reserve from it, and you collect at the stall.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Carousel slides={SLIDES} label="What MarketLink is for" />
        <p className="text-caption text-ink-muted">The four photos above are placeholders.</p>
      </div>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h2 className="text-h2">Why it exists</h2>
          <p className="text-body max-w-155">
            A market morning runs on word of mouth. Stalls chalk up what they brought, regulars ask what is coming next
            week, and everyone else finds out by walking the rows. That works until you need something in particular, or
            until the trip across town ends at an empty table.
          </p>
          <p className="text-body max-w-155">
            Farmers have the same problem from the other side. There is no easy way to tell regulars what the week will
            hold, to take an order before market day, or to know how much to cut on Friday evening. MarketLink writes
            both halves down: the stall publishes the week, you reserve from it, and the stall reads the orders before
            it picks.
          </p>
        </div>
        <Card className="flex flex-col gap-3 p-6">
          <h2 className="text-h3">What MarketLink does not do</h2>
          <ul className="m-0 flex flex-col gap-2.5 p-0 text-[15px]">
            <li className="list-none">
              <b>No online payment.</b> You pay the Farmer at the stall when you collect. There is no card form anywhere
              in the product.
            </li>
            <li className="list-none">
              <b>No delivery.</b> Every order is collected at the market, inside the window the stall sets.
            </li>
            <li className="list-none">
              <b>No certification.</b> MarketLink does not check licences or organic claims. Ask the Farmer at the
              stall.
            </li>
            <li className="list-none">
              <b>No separate family profiles.</b> An account can be shared at home. The system does not tell people
              apart inside one account.
            </li>
          </ul>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-h2">The team</h2>
          <span className="text-small text-ink-muted">Six people, split by what they own in the repository</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TEAM.map(([role, note]) => (
            <Card key={role} className="flex flex-col gap-1 p-4">
              <p className="text-overline text-ink-muted m-0">{role}</p>
              <b className="text-[16px]">Name to add</b>
              <span className="text-[14px]">{note}</span>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-3 p-6">
          <h2 className="text-h3">How it is built</h2>
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
            <dt className="text-ink-muted">Frontend</dt>
            <dd className="m-0">React 19, Vite, TypeScript, Tailwind 4</dd>
            <dt className="text-ink-muted">Backend</dt>
            <dd className="m-0">Spring Boot, Java 25, MySQL 8, Redis, Flyway</dd>
            <dt className="text-ink-muted">Maps</dt>
            <dd className="m-0">Leaflet with OpenStreetMap tiles, no Google Maps key to expire mid-demo</dd>
            <dt className="text-ink-muted">Design</dt>
            <dd className="m-0">The Hang tag design system: one set of tokens, one set of components, one voice</dd>
          </dl>
        </Card>
        <Card className="flex flex-col gap-3 p-6">
          <h2 className="text-h3">Credits and data</h2>
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
            <dt className="text-ink-muted">Map data</dt>
            <dd className="m-0">© OpenStreetMap contributors</dd>
            <dt className="text-ink-muted">Photos</dt>
            <dd className="m-0">Placeholders for now, credited here once the team&apos;s own photos are in</dd>
            <dt className="text-ink-muted">Currency and time</dt>
            <dd className="m-0">Vietnamese đồng, dates dd/MM/yyyy, 24-hour clock, Asia/Ho_Chi_Minh</dd>
          </dl>
        </Card>
      </section>

      <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-h3">Something to tell us?</h2>
          <p className="text-small text-ink-muted">
            Questions about an order go to the stall directly. Anything about the platform comes to the team.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink to="/contact" variant="secondary">
            Contact us
          </ButtonLink>
          <ButtonLink to="/feedback" variant="secondary">
            Send feedback
          </ButtonLink>
        </div>
      </Card>
    </div>
  );
};

export default AboutPage;
