import { getAssetUrlsByImport } from '@tldraw/assets/imports.vite';

// tldraw loads its fonts, icons and translations from cdn.tldraw.com by default, which the CSP
// blocks and which is unavailable offline; bundling them serves them from our own origin.
export const TLDRAW_ASSET_URLS = getAssetUrlsByImport();
