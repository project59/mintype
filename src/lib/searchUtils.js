// searchUtils.js

import dbService from "./dbService";
import { markdownToSearchText, tldrawToSearchText } from "./searchText";

export function createSnippet(content, query, length = 150) {
    const text = content?.replace(/\s+/g, ' ') || '';
    if (!query) return text.substring(0, length);

    const queryIndex = text.toLowerCase().indexOf(query.toLowerCase());
    if (queryIndex === -1) return text.substring(0, length);

    const start = Math.max(0, queryIndex - 50);
    const end = Math.min(text.length, queryIndex + query.length + 100);
    const snippet = text.substring(start, end);

    return (start > 0 ? '...' : '') + snippet + (end < text.length ? '...' : '');
}

export function rankResults(results) {
    return results.sort((a, b) => {
        if (a.isFavorite !== b.isFavorite) return b.isFavorite - a.isFavorite;

        if (a.type === 'page_title' && b.type !== 'page_title') return -1;
        if (b.type === 'page_title' && a.type !== 'page_title') return 1;

        return (b.lastModified || 0) - (a.lastModified || 0);
    });
}

// Search needs readable text, so the index holds decrypted titles and page text. It lives only in
// memory, from when the search window opens until it closes or the app locks, and never on disk.
let searchIndex = [];
let indexGeneration = 0;

export function performSearch(query, workspaceId = null, maxResults = 50) {
    if (!query || query.length < 2) return [];

    const queryLower = query.toLowerCase();
    const results = searchIndex
        .filter((record) => (!workspaceId || record.rootId === workspaceId) && record.content.toLowerCase().includes(queryLower))
        .map((record) => ({
            pageId: record.pageId,
            pageTitle: record.pageTitle,
            snippet: createSnippet(record.content, query),
            type: record.type,
            isFavorite: record.isFavorite,
            rootId: record.rootId,
            lastModified: record.lastModified
        }));

    return rankResults(results).slice(0, maxResults);
}

function buildPageRecords(page, pageContent, resolvePageTitle) {
    const base = {
        pageId: page.id,
        rootId: page.rootId,
        lastModified: page.lastModified,
        pageTitle: page.name,
        isFavorite: page.isFavorite || false,
    };
    const records = [{ ...base, id: `${page.id}_title`, type: 'page_title', content: page.name || '' }];

    let content = '';
    if (pageContent?.type === 'whiteboard') {
        content = tldrawToSearchText(pageContent.tldraw?.snapshot, resolvePageTitle);
    } else if (typeof pageContent?.markdown === 'string') {
        content = markdownToSearchText(pageContent.markdown, resolvePageTitle);
    }

    if (content) {
        const type = pageContent.type === 'whiteboard' ? 'whiteboard' : 'document';
        records.push({ ...base, id: `${page.id}_content`, type, content });
    }

    return records;
}

export async function initializeSearchIndex(masterKey) {
    const generation = ++indexGeneration;
    try {
        const [entries, contents] = await Promise.all([
            dbService.getAllEntries(),
            dbService.getAllContent(masterKey),
        ]);

        const titles = new Map(entries.filter((entry) => !entry.deleted).map((entry) => [entry.id, entry.name]));
        const resolvePageTitle = (pageId) => titles.get(pageId) || null;
        const contentById = new Map(contents.map((content) => [content.id, content]));

        const records = entries
            .filter((page) => page.type !== 'workspace' && !page.sensitive && !page.deleted)
            .flatMap((page) => buildPageRecords(page, contentById.get(page.id), resolvePageTitle));

        // Search may have been closed, or the app locked, while pages were decrypting.
        if (generation === indexGeneration) searchIndex = records;
    } catch (error) {
        console.error('Error initializing search index:', error);
    }
}

export function clearSearchIndex() {
    indexGeneration++;
    searchIndex = [];
}
