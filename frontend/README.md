# Frontend

React 19 + Vite + TypeScript + Tailwind CSS v4.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Start editing `src/App.tsx` — the page hot-reloads as you edit.

## Scripts

| Command           | Description                                |
| ----------------- | ------------------------------------------ |
| `npm run dev`     | Start the Vite dev server on port 3000     |
| `npm run build`   | Type-check (`tsc -b`) and build to `dist/` |
| `npm run preview` | Serve the production build locally         |
| `npm run lint`    | Run ESLint                                 |

## Structure

```
frontend/
├── index.html        # HTML entry
├── public/           # Static assets served as-is (brand/ = logo marks)
├── src/
│   ├── main.tsx      # React entry point
│   ├── App.tsx       # Root component
│   ├── index.css     # Tailwind + design system imports
│   ├── styles/       # marketlink-theme.css (tokens) · marketlink-components.css (ml-* classes)
│   └── lib/format.ts # vnd(), units(), formatDate() …
└── vite.config.ts    # Vite config (`@/` alias → `src/`)
```

Environment variables exposed to the client must be prefixed with `VITE_` and are read via `import.meta.env.VITE_*`.

## Design system

All UI follows the MarketLink "Hang tag" design system in [`../docs/design-system/`](../docs/design-system/README.md).
Open `../docs/design-system/reference/gallery.html` in a browser to see every component and the reference screens.
Colors are token utilities only (`bg-surface`, `text-ink`, `bg-brand`…); the default Tailwind palette is disabled.
