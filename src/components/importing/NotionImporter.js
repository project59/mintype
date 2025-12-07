import { nanoid } from 'nanoid';
import { parseHtmlToBlocks } from './blockextractors/htmlParser';
import dbService from '../../lib/dbService';
import toast from 'react-hot-toast';

export async function analyzeZipStructure(zipFile, useCustomBlocks = false, rootId = null) {
    const JSZip = await import('jszip');
    let zip = await JSZip.default.loadAsync(zipFile);

    // Check if there's a nested zip file at the root level
    for (const [path, file] of Object.entries(zip.files)) {
        if (!file.dir && path.endsWith('.zip') && !path.includes('/')) {
            toast.error('There is a ZIP file inside the ZIP folder! Please extract it and try again.');
            return;
        }
    }

    const pages = [];
    const folders = new Map();

    // First pass: identify folders and their associated Notion IDs
    for (const [path, file] of Object.entries(zip.files)) {
        if (!file.dir && path.includes('/')) {
            const pathParts = path.split('/');
            pathParts.pop(); // Remove the filename
            let currentPath = '';
            
            for (const part of pathParts) {
                currentPath += part + '/';
                
                if (!folders.has(currentPath)) {
                    // Find the HTML file that matches this folder name
                    const folderHtmlFile = Object.keys(zip.files).find(filePath => {
                        const fileName = filePath.split('/').pop();
                        return fileName && fileName.startsWith(part + ' ') && fileName.endsWith('.html');
                    });
                    
                    if (folderHtmlFile) {
                        const folderId = extractNotionId(folderHtmlFile);
                        if (folderId) {
                            folders.set(currentPath, folderId);
                        }
                    }
                }
            }
        }
    }

    // Second pass: process all HTML files
    for (const [filename, file] of Object.entries(zip.files)) {
        if (filename.endsWith('.html') && !file.dir) {
            const content = await file.async('text');
            const pageData = await processHtmlFile(filename, content, zipFile, useCustomBlocks, rootId, folders);
            pages.push(pageData);
        }
    }

    // Build hierarchy (just structure, no embedding)
    const hierarchy = buildPageHierarchy(pages, rootId);

    return {
        pages,
        rootPages: hierarchy.rootPages,
        pageMap: hierarchy.pageMap,  // Add this
        totalPages: pages.length,
        zipFile,
        folders: Array.from(folders.entries())
    };
}

async function processHtmlFile(filename, content, zipFile, useCustomBlocks, rootId, folders) {
    const notionId = extractNotionId(filename);
    const id = notionId || nanoid();
    const name = extractPageName(filename);
    const parentId = determineParentId(filename, folders, rootId);
    const bodyHtml = extractBodyHtml(content);

    // Parse the HTML content into blocks
    const blocks = await parseHtmlToBlocks(bodyHtml, zipFile, useCustomBlocks, filename, rootId);

    // Create metadata (what goes in the meta store)
    const metadata = {
        id,
        name,
        type: 'document',
        parentId,
        rootId,
        emoji: null,
        created: Date.now(),
        lastModified: Date.now(),
        lastMetaModified: Date.now(),
        isFavorite: false,
        order: 1000000, // needs incrementing
        deleted: false,
        sensitive: false,
        remoteFileId: null,
        wikiId: null,
    };

    // Create content (what goes in the content store)
    const pageContent = {
        // should ID be here?
        type: 'document',
        elements: [{
            id: nanoid(),
            type: 'dynamic',
            x: 5000,
            y: 5000,
            width: 600,
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
            gridType: "none",
            gridSize: 20,
            gridColor: { r: 0, g: 0, b: 0 },
        },
    };

    return {
        id,
        metadata,
        content: pageContent,
        // Keep these for hierarchy building
        parentId,
        name
    };
}

export function buildPageHierarchy(pages, rootId) {
    const pageMap = new Map();
    const rootPages = [];

    // Create a map of all pages by ID
    pages.forEach(page => {
        pageMap.set(page.id, {
            id: page.id,
            name: page.name,
            parentId: page.parentId,
            children: [] // Array of child IDs
        });
    });

    // Build parent-child relationships
    pages.forEach(page => {
        if (page.parentId === rootId || !page.parentId) {
            rootPages.push(page.id);
        } else {
            const parent = pageMap.get(page.parentId);
            if (parent) {
                parent.children.push(page.id);
            } else {
                console.warn(`Parent page not found for ${page.name}, treating as root page`);
                rootPages.push(page.id);
            }
        }
    });

    // Sort function that works with IDs
    const sortPageIds = (pageIds) => {
        pageIds.sort((a, b) => {
            const pageA = pageMap.get(a);
            const pageB = pageMap.get(b);
            return pageA.name.localeCompare(pageB.name);
        });
        pageIds.forEach(pageId => {
            const page = pageMap.get(pageId);
            if (page.children && page.children.length > 0) {
                sortPageIds(page.children);
            }
        });
    };

    sortPageIds(rootPages);
    
    return { 
        rootPages,
        pageMap // Return the map so we can access hierarchy info
    };
}

export async function importSelectedPages(fileStructure, selectedPageIds, masterKey) {
    const results = {
        successCount: 0,
        errors: [],
        pageIds: []
    };

    const selectedPages = fileStructure.pages.filter(page =>
        selectedPageIds.includes(page.id)
    );

    for (const page of selectedPages) {
        try {
            await savePageToIndexedDB(page, masterKey);
            results.pageIds.push(page.id);
            results.successCount++;
        } catch (error) {
            results.errors.push(`Failed to import "${page.metadata.name}": ${error.message}`);
        }
    }

    return results;
}

async function savePageToIndexedDB(page, masterKey) {
    // Save metadata
    await dbService.addMetaEntry({
        id: page.id,
        newContent: page.metadata,
        masterKey: masterKey,
        addToQueue: true
    });

    // Save content
    await dbService.addContentEntry({
        id: page.id,
        newContent: page.content,
        masterKey: masterKey,
        addToQueue: true
    });
}

// Helper functions
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

export function extractPageName(filename) {
    let name = filename.replace(/.*\//, '').replace(/\.html$/, '');
    name = name.replace(/\s+[a-f0-9]{32}$/, '');
    return name.trim() || 'Untitled';
}