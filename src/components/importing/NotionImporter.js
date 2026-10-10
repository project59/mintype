import JSZip from 'jszip';
import { nanoid } from 'nanoid';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import dbService from '../../lib/dbService';
import { createImportedMeta, dirOf, embedZipImages, emptyImportResult, isZipMetadataPath, rewritePageLinks } from './importUtils';

const NOTION_ID_SUFFIX = /\s+[a-f0-9]{32}$/;

const initTurndown = () => {
    const turndownService = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
        fence: '```',
        emDelimiter: '_',
        strongDelimiter: '**',
        linkStyle: 'inlined',
    });
    turndownService.use(gfm);
    return turndownService;
};

const stem = (path) => path.split('/').pop().replace(/\.html$/i, '');

export function extractPageName(path) {
    return stem(path).replace(NOTION_ID_SUFFIX, '').trim() || 'Untitled';
}

export function extractBodyHtml(htmlContent) {
    const bodyMatch = htmlContent.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    return bodyMatch ? bodyMatch[1].trim() : htmlContent.trim();
}

// With "Create folders for subpages", a page's subpages sit in a folder next to its HTML file,
// named like the file with or without Notion's ID suffix. Returns the page owning the nearest
// such folder above `path`.
const findParentPage = (path, pagesByFolderKey) => {
    const folders = dirOf(path).split('/').filter(Boolean);
    for (let depth = folders.length; depth > 0; depth--) {
        const folder = folders[depth - 1];
        const parentDir = folders.slice(0, depth - 1).join('/');
        const parent = pagesByFolderKey.get(`${parentDir}/${folder}`)
            || pagesByFolderKey.get(`${parentDir}/${folder.replace(NOTION_ID_SUFFIX, '')}`);
        if (parent) return parent;
    }
    return null;
};

export function buildPageHierarchy(pages) {
    const pageMap = new Map(pages.map((page) => [page.id, { ...page, children: [] }]));
    const rootPages = [];
    for (const page of pages) {
        const parent = page.parentId && pageMap.get(page.parentId);
        if (parent) parent.children.push(page.id);
        else rootPages.push(page.id);
    }

    const byName = (a, b) => pageMap.get(a).name.localeCompare(pageMap.get(b).name);
    rootPages.sort(byName);
    pageMap.forEach((page) => page.children.sort(byName));
    return { rootPages, pageMap };
}

// Reads the export's page tree for the preview; page content is converted only on import.
export async function analyzeZipStructure(zipFile) {
    const zip = await JSZip.loadAsync(zipFile);
    const paths = Object.keys(zip.files).filter((path) => !zip.files[path].dir && !isZipMetadataPath(path));

    if (paths.some((path) => /\.zip$/i.test(path) && !path.includes('/'))) {
        throw new Error('This ZIP contains another ZIP file. Please extract it and upload the inner ZIP instead.');
    }

    const pages = paths
        .filter((path) => /\.html$/i.test(path))
        .map((path) => ({ id: nanoid(), path, name: extractPageName(path) }));
    if (pages.length === 0) {
        throw new Error("No Notion pages found. Make sure the export format is 'HTML'.");
    }

    const pagesByFolderKey = new Map();
    for (const page of pages) {
        const parentDir = dirOf(page.path);
        pagesByFolderKey.set(`${parentDir}/${stem(page.path)}`, page);
        const shortKey = `${parentDir}/${stem(page.path).replace(NOTION_ID_SUFFIX, '')}`;
        if (!pagesByFolderKey.has(shortKey)) pagesByFolderKey.set(shortKey, page);
    }
    for (const page of pages) {
        page.parentId = findParentPage(page.path, pagesByFolderKey)?.id ?? null;
    }

    const { rootPages, pageMap } = buildPageHierarchy(pages);
    return { zip, pages, rootPages, pageMap, totalPages: pages.length };
}

// Creates a workspace for the import and adds the selected pages to it. Links between imported
// pages are pointed at the new pages; a page whose parent was not selected goes to the top.
export async function importSelectedPages(fileStructure, selectedPageIds, masterKey) {
    const selected = new Set(selectedPageIds);
    const pages = fileStructure.pages
        .filter((page) => selected.has(page.id))
        .sort((a, b) => a.name.localeCompare(b.name));
    const pageIdByPath = new Map(pages.map((page) => [page.path, page.id]));
    const results = { ...emptyImportResult(), total: pages.length };

    const expectedNotesGeneration = dbService.getNotesGeneration();
    const workspaceId = await dbService.addRootEntry({
        newContent: { name: 'New Notion Import' },
        password: masterKey,
    });

    const turndownService = initTurndown();
    for (const [index, page] of pages.entries()) {
        try {
            const zipFile = fileStructure.zip.file(page.path);
            const baseDir = dirOf(page.path);
            let markdown = turndownService.turndown(extractBodyHtml(await zipFile.async('text')));
            markdown = await embedZipImages(markdown, fileStructure.zip, baseDir);
            markdown = rewritePageLinks(markdown, baseDir, (target) => pageIdByPath.get(target));

            const meta = createImportedMeta({
                id: page.id,
                name: page.name,
                parentId: selected.has(page.parentId) ? page.parentId : workspaceId,
                rootId: workspaceId,
            });
            const didImport = await dbService.importPage({
                meta,
                content: { type: 'document', markdown },
                masterKey,
                expectedNotesGeneration,
            });
            if (!didImport) throw new Error('Notes were reset during the import.');
            results.success++;
        } catch (error) {
            console.error(`Failed to import ${page.path}:`, error);
            results.failures.push({ name: page.name, error: error.message });
        }
    }

    results.failed = results.failures.length;
    dbService.notifyUpdate();
    return results;
}
