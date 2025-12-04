import { nanoid } from 'nanoid';
import dbService from '../../lib/dbService';
import { parseHtmlToBlocks } from './blockextractors/htmlParser';


export async function analyzeZipStructure(zipFile, useCustomBlocks = false, rootId = null) {
    const JSZip = await import('jszip');
    const zip = await JSZip.default.loadAsync(zipFile);

    const pages = [];
    const folders = new Map();

    // First pass: identify all folders and their IDs
    for (const [path, file] of Object.entries(zip.files)) {
        if (!file.dir && path.includes('/')) {
            const pathParts = path.split('/');
            pathParts.pop();

            let currentPath = '';
            for (const part of pathParts) {
                currentPath += part + '/';
                const folderId = extractNotionId(part);
                if (folderId && !folders.has(currentPath)) {
                    folders.set(currentPath, folderId);
                }
            }
        }
    }

    // Second pass: process all HTML files
    for (const [filename, file] of Object.entries(zip.files)) {
        if (filename.endsWith('.html') && !file.dir) {
            const content = await file.async('text');
            const pageData = await analyzeHtmlFile(filename, content, zipFile, useCustomBlocks, rootId);

            pageData.parentId = determineParentId(filename, folders, rootId);

            pages.push(pageData);
        }
    }

    // Build hierarchy
    const hierarchy = buildPageHierarchy(pages, rootId);

    return {
        pages,
        rootPages: hierarchy.rootPages,
        totalPages: pages.length,
        zipFile,
        folders: Array.from(folders.entries())
    };
}

export async function analyzeHtmlFile(filename, content, zipFile = null, useCustomBlocks = true, rootId) {
    const notionId = extractNotionId(filename);
    const id = notionId || generateId();
    const name = extractPageName(filename);
    const bodyHtml = extractBodyHtml(content);

    // Use the new HTML parser
    const blocks = await parseHtmlToBlocks(bodyHtml, zipFile, true, filename, rootId);

    return {
        id,
        name,
        parentId: null,
        rootId: rootId,
        type: 'document',
        elements: [{
            id: nanoid(),
            type: 'dynamic',
            x: 5000,
            y: 5000,
            width: 800,
            // height: 100,
            bgColor: "#ffffff",
            rotation: 0,
            zIndex: 0,
            content: blocks,
            locked: false
        }],
        comments: [],
        preferences: {
            panX: 120,
            panY: 120,
            zoom: 1,
            bgColor: { r: 255, g: 255, b: 255 },
            lockScrollY: false,
            lockScrollX: false,
            gridType: "none", // none, dots, lines
            gridSize: 20,
            gridColor: { r: 0, g: 0, b: 0 },
            isFavorite: false
        },
        lastModified: Date.now(),
        encrypted: false
    };
}

export function extractNotionId(pathOrFilename) {
    const matches = pathOrFilename.match(/([a-f0-9]{32})/g);
    return matches ? matches[matches.length - 1] : null;
}

export function determineParentId(filepath, folders, rootId) {
    const pathParts = filepath.split('/');
    pathParts.pop();

    if (pathParts.length === 0) {
        return rootId;
    }

    let currentPath = '';
    for (let i = pathParts.length - 1; i >= 0; i--) {
        if (i === pathParts.length - 1) {
            currentPath = pathParts[i] + '/';
        } else {
            currentPath = pathParts.slice(0, i + 1).join('/') + '/' + currentPath;
        }

        if (folders.has(currentPath)) {
            return folders.get(currentPath);
        }
    }

    return rootId;
}

export function extractBodyHtml(htmlContent) {
    const bodyMatch = htmlContent.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    return bodyMatch ? bodyMatch[1].trim() : htmlContent.trim();
}

export function buildPageHierarchy(pages, rootId) {
    const pageMap = new Map();
    const rootPages = [];

    pages.forEach(page => {
        pageMap.set(page.id, page);
    });

    pages.forEach(page => {
        if (page.parentId === rootId) {
            rootPages.push(page);
        } else {
            const parent = pageMap.get(page.parentId);
            if (parent) {
                if (!parent.children) {
                    parent.children = [];
                }
                parent.children.push(page);
            } else {
                console.warn(`Parent page not found for ${page.name}, treating as root page`);
                page.parentId = rootId;
                rootPages.push(page);
            }
        }
    });

    const sortPages = (pages) => {
        pages.sort((a, b) => a.name.localeCompare(b.name));
        pages.forEach(page => {
            if (page.children && page.children.length > 0) {
                sortPages(page.children);
            }
        });
    };

    sortPages(rootPages);
    return { rootPages };
}

export function extractPageName(filename) {
    let name = filename.replace(/.*\//, '').replace(/\.html$/, '');
    name = name.replace(/\s+[a-f0-9]{32}$/, '');
    return name.trim() || 'Untitled';
}

export function generateId() {
    return Math.random().toString(36).substr(2, 21);
}

export async function importSelectedPages(fileStructure, selectedPageIds) {
    const results = {
        successCount: 0,
        errors: [],
        pages: []
    };

    const selectedPages = fileStructure.pages.filter(page =>
        selectedPageIds.includes(page.id)
    );

    for (const page of selectedPages) {
        try {
            await saveToIndexedDB(page);
            results.pages.push(page);
            results.successCount++;
        } catch (error) {
            results.errors.push(`Failed to import "${page.name}": ${error.message}`);
        }
    }

    return results;
}

export async function saveToIndexedDB(page) {
    await dbService.addEntry({
        addToQueue: true,
        preloadedData: page
    });
}

export function getDefaultPreferences() {
    return {
        panX: 120,
        panY: 120,
        zoom: 1,
        bgColor: { r: 255, g: 255, b: 255, a: 0 },
        lockScrollY: false,
        lockScrollX: false,
        gridType: 'none',
        gridSize: 20,
        gridColor: { r: 0, g: 0, b: 0 },
        isFavorite: false
    };
}
