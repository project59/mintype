import { useEffect, useSyncExternalStore } from 'react';
import dbService from '../../lib/dbService.js';

// Shared page metadata cache for page mentions. `undefined` means not loaded yet,
// `null` means the page is missing or trashed.
const cache = new Map();
const pending = new Map();
const listeners = new Set();
let channel = null;

const emit = () => listeners.forEach((listener) => listener());

const fetchMeta = (pageId) => {
  const request = dbService.getMeta(pageId)
    .then((meta) => (meta && !meta.deleted && meta.parentId !== null ? meta : null))
    .catch(() => null)
    .then((meta) => {
      if (pending.get(pageId) !== request) return meta;
      pending.delete(pageId);
      cache.set(pageId, meta);
      emit();
      return meta;
    });
  pending.set(pageId, request);
  return request;
};

const ensureChannel = () => {
  if (channel || typeof BroadcastChannel === 'undefined') return;
  channel = new BroadcastChannel('db-updates');
  channel.addEventListener('message', () => {
    // Keep stale values visible while refetching so mentions don't flicker.
    [...cache.keys()].forEach(fetchMeta);
  });
};

export const loadPageMeta = (pageId) => {
  if (!pageId) return Promise.resolve(null);
  ensureChannel();
  if (cache.has(pageId)) return Promise.resolve(cache.get(pageId));
  return pending.get(pageId) || fetchMeta(pageId);
};

export const subscribePageMeta = (listener) => {
  ensureChannel();
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getCachedPageMeta = (pageId) => cache.get(pageId);

export const usePageMeta = (pageId) => {
  const meta = useSyncExternalStore(subscribePageMeta, () => cache.get(pageId));
  useEffect(() => {
    loadPageMeta(pageId);
  }, [pageId]);
  return meta;
};

export const getPageTitle = (meta) => meta?.name || 'Untitled Page';

export const getPagePath = (meta) => (meta?.rootId ? `/workspace/${meta.rootId}/${meta.id}` : null);

export const searchPages = async (query, limit = 8) => {
  const needle = query.trim().toLowerCase();
  const entries = await dbService.getAllEntries();
  return entries
    .filter((entry) => entry.parentId !== null && !entry.deleted)
    .filter((entry) => !needle || getPageTitle(entry).toLowerCase().includes(needle))
    .sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0))
    .slice(0, limit);
};
