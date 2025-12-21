// searchUtils.js

import dbService from "./dbService";

// Content extractors for different block types
export const extractors = {
    text: (data) => ({
        content: stripHtml(data.text),
        searchable: true
    }),

    code: (data) => ({
        content: data.code,
        searchable: true
    }),

    todo: (data) => ({
        content: [
            data.title,
            data.description,
            ...data.todos.map(t => `${t.title} ${t.description}`)
        ].filter(Boolean).join(' '),
        searchable: true
    }),

    image: (data) => ({
        content: data.sourceType === 'url' ? data.imageSource : '',
        searchable: data.sourceType === 'url'
    }),

    // we store nothing for freehand
    freehand: (data) => ({
        content: '',
        searchable: false
    }),

    whiteboard: (data) => ({
        content: data.elements.map(
            // only extract from the elements with type 'dynamic'
            element => element.type === 'dynamic' && element.content.map(c => extractors[c.type]?.(c.data)?.content).filter(Boolean).join(' ')
        ).filter(Boolean).join(' '),
        searchable: true
    }),

    collapsible: (data) => ({
        content: [
            data.collapseTitle,
            ...data.content.map(c => extractors[c.type]?.(c.data)?.content).filter(Boolean)
        ].filter(Boolean).join(' '),
        searchable: true
    }),
    callout: (data) => ({
        content: data.content,
        searchable: true
    }),
    columns: (data) => ({
        content: data.columns.map(
            column => column.content.map(c => extractors[c.type]?.(c.data)?.content).filter(Boolean).join(' ')
        ).filter(Boolean).join(' '),
        searchable: true
    })

    // we skip the table block for now
};

export function stripHtml(html) {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, ' ').trim();
}

export function createSnippet(content, query, length = 150) {
    if (!content || !query) return content?.substring(0, length) || '';

    const queryIndex = content.toLowerCase().indexOf(query.toLowerCase());
    if (queryIndex === -1) return content.substring(0, length);

    const start = Math.max(0, queryIndex - 50);
    const end = Math.min(content.length, queryIndex + query.length + 100);
    const snippet = content.substring(start, end);

    return start > 0 ? '...' + snippet : snippet;
}

export function rankResults(results, query) {
    return results.sort((a, b) => {
        // Prioritize favorites
        if (a.isFavorite !== b.isFavorite) return b.isFavorite - a.isFavorite;

        // Prioritize page titles
        if (a.type === 'page_title' && b.type !== 'page_title') return -1;
        if (b.type === 'page_title' && a.type !== 'page_title') return 1;

        // Exact matches first
        const aExact = a.snippet.toLowerCase().includes(query.toLowerCase());
        const bExact = b.snippet.toLowerCase().includes(query.toLowerCase());
        if (aExact !== bExact) return bExact - aExact;

        return 0;
    });
}

export function buildContext(allBlocks, currentBlock) {
    if (!allBlocks || !currentBlock) return '';

    const currentIndex = allBlocks.findIndex(b => b.id === currentBlock.id);
    const contextBlocks = allBlocks.slice(
        Math.max(0, currentIndex - 1),
        Math.min(allBlocks.length, currentIndex + 2)
    );

    return contextBlocks
        .map(block => extractors[block.type]?.(block.data)?.content)
        .filter(Boolean)
        .join(' ');
}

export async function performSearch(db, query, workspaceId = null, maxResults = 50) {
    if (!query || query.length < 2) return [];

    try {
        const tx = db.transaction(['searchIndex'], 'readonly');
        const store = tx.objectStore('searchIndex');

        let records;

        if (workspaceId) {
            const index = store.index('compound');
            const range = IDBKeyRange.bound([workspaceId, ''], [workspaceId, '\uffff']);
            records = await index.getAll(range);
        } else {
            records = await store.getAll();
        }

        const queryLower = query.toLowerCase();
        const results = [];

        for (const record of records) {
            if (record.content.toLowerCase().includes(queryLower)) {
                results.push({
                    pageId: record.pageId,
                    pageTitle: record.pageTitle,
                    elementId: record.elementId,
                    blockId: record.blockId,
                    snippet: createSnippet(record.content, query),
                    fullContent: record.content,
                    type: record.type,
                    isFavorite: record.isFavorite,
                    rootId: record.rootId,
                    lastModified: record.lastModified
                });

                if (results.length >= maxResults) break;
            }
        }

        return rankResults(results, query);
    } catch (error) {
        console.error('Search error:', error);
        return [];
    }
}

export async function clearPageIndex(db, pageId) {
    try {
        const tx = db.transaction(['searchIndex'], 'readwrite');
        const store = tx.objectStore('searchIndex');
        const index = store.index('pageId');

        const keys = await index.getAllKeys(IDBKeyRange.only(pageId));

        for (const key of keys) {
            await store.delete(key);
        }

        await tx.complete;
    } catch (error) {
        console.error('Error clearing page index:', error);
    }
}


export const SEARCH_CONFIG = {
    // Element types that should never be indexed
    nonIndexableElements: [
        'freehand',
    ],

    // Block types that should never be indexed
    nonIndexableBlocks: [
        'whiteboard',
    ],

    // Block types that require special handling
    specialHandling: {
        'image': (data) => data.sourceType === 'url', // Only index URL images, not base64
        // 'file': (data) => data.fileType === 'text' || data.fileType === 'markdown'
    }
};

export function isElementIndexable(element, config = SEARCH_CONFIG) {
    return !config.nonIndexableElements.includes(element.type);
}

export function isBlockIndexable(block, config = SEARCH_CONFIG) {
    if (config.nonIndexableBlocks.includes(block.type)) {
        return false;
    }

    // Check special handling rules
    const specialRule = config.specialHandling[block.type];
    if (specialRule) {
        return specialRule(block.data);
    }

    return true;
}

export async function indexPage(db, page, pageContent) {
    try {
        // Clear existing entries for this page first
        await clearPageIndex(db, page.id);

        const tx = db.transaction(['searchIndex'], 'readwrite');
        const store = tx.objectStore('searchIndex');

        const indexPromises = [];

        // Index page title
        indexPromises.push(
            store.add({
                id: `${page.id}_title`,
                pageId: page.id,
                rootId: page.rootId,
                elementId: null,
                blockId: null,
                type: 'page_title',
                content: page.name,
                context: page.name,
                lastModified: page.lastModified,
                pageTitle: page.name,
            })
        );

        // Index elements
        for (const element of pageContent.elements || []) {
            if (!isElementIndexable(element)) {
                console.log(`Skipping non-indexable element type: ${element.type}`);
                continue;
            }

            for (const block of element.content || []) {
                const extracted = extractors[block.type]?.(block.data);
                if (!extracted?.searchable || !extracted.content.trim()) continue;

                indexPromises.push(
                    store.add({
                        id: `${page.id}_${element.id}_${block.id}`,
                        pageId: page.id,
                        rootId: page.rootId,
                        elementId: element.id,
                        blockId: block.id,
                        type: block.type,
                        content: extracted.content,
                        context: buildContext(element.content, block),
                        lastModified: page.lastModified,
                        pageTitle: page.name,
                        isFavorite: page.isFavorite || false
                    })
                );
            }
        }

        await Promise.all(indexPromises);
        await tx.complete;
    } catch (error) {
        console.error('Error indexing page:', error);
        throw error;
    }
}

export async function initializeSearchIndex(db, masterKey) {
    console.log('Initializing search index...');
    const startTime = Date.now();

    try {
        // Clear existing index
        const tx = db.transaction(['searchIndex'], 'readwrite');
        await tx.objectStore('searchIndex').clear();

        let notesMeta = await dbService.getAllEntries();
        let notesContent = await dbService.getAllContent(masterKey);
        // remove all notes where type = workspace and sensitive = true
        notesMeta = notesMeta.filter(note => note.type !== 'workspace' && !note.sensitive);

        // Index all pages
        for (const page of notesMeta) {
            console.log(page.sensitive)
            // get the notes content based on current page id
            const pageContent = notesContent.find(note => note.id === page.id);
            await indexPage(db, page, pageContent);
        }

        const endTime = Date.now();
        console.log(`Search index initialized in ${endTime - startTime}ms for ${notesMeta.length} pages`);
    } catch (error) {
        console.error('Error initializing search index:', error);
    }
}

export async function clearSearchIndex(db) {
    try {
        const tx = db.transaction(['searchIndex'], 'readwrite');
        await tx.objectStore('searchIndex').clear();
        await tx.complete;
    } catch (error) {
        console.error('Error clearing search index:', error);
    }
}