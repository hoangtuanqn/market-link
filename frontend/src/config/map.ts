import type { TFunction } from 'i18next';

const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_LINK = '<a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export const TILE_URL = import.meta.env.VITE_MAP_TILE_URL || OSM_TILE_URL;

const CUSTOM_ATTRIBUTION: string = import.meta.env.VITE_MAP_ATTRIBUTION || '';

export const tileAttribution = (t: TFunction) => CUSTOM_ATTRIBUTION || t('map.attribution', { link: OSM_LINK });

export const MAP_CREDIT: string | null = CUSTOM_ATTRIBUTION ? CUSTOM_ATTRIBUTION.replace(/<[^>]*>/g, '') : null;

export const MAX_ZOOM = 19;

export const CITY: [number, number] = [10.79, 106.72];
