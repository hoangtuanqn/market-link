/**
 * A screen still running on sample data (`src/data/*`) shows only in dev. `npm run dev` always turns it on; the `vite
 * build` for production turns it off, unless built with `VITE_SHOW_WIP=true` (e.g. an internal preview build). Vite
 * substitutes this value at build time, so the disabled branch and the sample data only it uses are dropped from the
 * bundle.
 */
export const SHOW_WIP: boolean = import.meta.env.DEV || import.meta.env.VITE_SHOW_WIP === 'true';
