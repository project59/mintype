import {
    MANIFEST_FORMAT,
    MANIFEST_PATH,
    TRASH_FOLDER,
    WHITEBOARD_EXTENSION,
    baseOf,
    dirOf,
    joinPath,
} from '../exporting/archiveFormat.js';
import { convertMarkdownReferences, parseWhiteboardFile, resolveZipFile, resolveZipPath } from './importUtils.js';

// Reads a ZIP of Markdown files into workspaces of pages, ready to import. It understands
// Mintype's own exports (see archiveFormat.js), Obsidian vaults and Notion's Markdown exports,
// which all keep a page's sub-pages in a folder named like the page:
// - each folder holding a `.mintype/workspace.json` manifest is a workspace, which restores
//   titles, order, emoji, flags, quick notes and trash;
// - otherwise the whole archive is one workspace (a single top-level folder names it);
// - `Page.md` beside a `Page/` folder (or Obsidian's `Page/Page.md` folder note) is that folder's
//   page; a folder without one becomes an empty page holding its files;
// - dot-folders such as `.obsidian` are skipped, except `.trash`, whose pages arrive trashed.

const NOTION_ID = /\s+[a-f0-9]{32}$/;
const FRONT_MATTER = /^---\r?\n[\s\S]*?\r?\n---[ \t]*(\r?\n|$)/;
const PAGE_WIDTHS = new Set(['normal', 'wide']);

const stripNotionId = (name) => name.replace(NOTION_ID, '').trim();
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const byOrderThenName = (a, b) => a.order - b.order || a.name.localeCompare(b.name, undefined, { numeric: true });

const isWhiteboardPath = (path) => path.toLowerCase().endsWith(WHITEBOARD_EXTENSION);
const isPageFile = (relPath) => {
    const segments = relPath.split('/');
    if (segments.some((segment, index) => segment.startsWith('.') && !(index === 0 && segment === TRASH_FOLDER && segments.length > 1))) return false;
    const lower = relPath.toLowerCase();
    return isWhiteboardPath(lower) || (lower.endsWith('.md') && !lower.endsWith('.excalidraw.md'));
};

// The page settings a manifest entry restores, ignoring values of the wrong type.
const metaFromManifest = (entry) => {
    if (!entry) return {};
    const meta = {};
    if (typeof entry.emoji === 'string' && entry.emoji) meta.emoji = entry.emoji;
    if (typeof entry.favorite === 'boolean') meta.isFavorite = entry.favorite;
    if (typeof entry.sensitive === 'boolean') meta.sensitive = entry.sensitive;
    if (PAGE_WIDTHS.has(entry.width)) meta.documentWidth = entry.width;
    if (Number.isFinite(entry.created)) meta.created = entry.created;
    if (Number.isFinite(entry.modified)) meta.lastModified = entry.modified;
    return meta;
};

const readManifest = async (files, path) => {
    try {
        const manifest = JSON.parse(await files.get(path).async('text'));
        return manifest?.format === MANIFEST_FORMAT && Array.isArray(manifest.pages) ? manifest : null;
    } catch {
        return null;
    }
};

function planWorkspace(root, relPaths, manifest, fallbackName) {
    const manifestIndex = new Map((manifest?.pages || []).map((entry, index) => [entry?.path, { entry, index }]));

    const files = relPaths.map((rel) => {
        const whiteboard = isWhiteboardPath(rel);
        const base = baseOf(rel).slice(0, -(whiteboard ? WHITEBOARD_EXTENSION.length : '.md'.length));
        const { entry, index } = manifestIndex.get(rel) || {};
        return {
            key: joinPath(root, rel),
            path: joinPath(root, rel),
            dir: dirOf(rel),
            base,
            type: whiteboard ? 'whiteboard' : 'document',
            name: (typeof entry?.title === 'string' && entry.title) || stripNotionId(base) || 'Untitled',
            notionTitle: NOTION_ID.test(base),
            trashed: entry ? !!entry.trashed : rel.startsWith(`${TRASH_FOLDER}/`),
            quickNote: !!entry?.quickNote && !entry.trashed,
            order: index ?? Infinity,
            meta: metaFromManifest(entry),
        };
    });
    const inTree = files.filter((file) => !file.trashed && !file.quickNote);

    // Pages that own a folder: by the folder path beside them, with and without Notion's ID.
    const beside = new Map();
    for (const file of inTree) {
        for (const key of [joinPath(file.dir, file.base), joinPath(file.dir, stripNotionId(file.base))]) {
            if (!beside.has(key)) beside.set(key, file);
        }
    }
    const folderNotes = new Map();
    for (const file of inTree) {
        if (file.type === 'document' && file.dir && baseOf(file.dir) === file.base && !beside.has(file.dir)) {
            folderNotes.set(file.dir, file);
        }
    }

    const folders = new Map();
    const folderPage = (dir) => {
        if (!dir) return null;
        const owner = beside.get(dir) || beside.get(joinPath(dirOf(dir), stripNotionId(baseOf(dir)))) || folderNotes.get(dir);
        if (owner) return owner.key;
        if (!folders.has(dir)) {
            const folder = {
                key: `${joinPath(root, dir)}/`,
                path: null,
                type: 'document',
                name: stripNotionId(baseOf(dir)) || 'Untitled',
                trashed: false,
                quickNote: false,
                order: Infinity,
                meta: {},
            };
            folders.set(dir, folder);
            folder.parentKey = folderPage(dirOf(dir));
        }
        return folders.get(dir).key;
    };
    for (const file of inTree) {
        file.parentKey = folderNotes.get(file.dir) === file ? folderPage(dirOf(file.dir)) : folderPage(file.dir);
    }

    // Parents come before their children and siblings in order, so each page is appended to the
    // end of its parent as it is imported.
    const children = new Map();
    for (const page of [...inTree, ...folders.values()]) {
        children.set(page.parentKey, [...(children.get(page.parentKey) || []), page]);
    }
    const pages = [];
    const visit = (parentKey) => {
        for (const page of (children.get(parentKey) || []).sort(byOrderThenName)) {
            pages.push(page);
            visit(page.key);
        }
    };
    visit(null);
    pages.push(...files.filter((file) => file.quickNote).sort(byOrderThenName));
    for (const file of files.filter((file) => file.trashed).sort(byOrderThenName)) pages.push({ ...file, parentKey: null });

    const workspace = manifest?.workspace || {};
    return {
        root,
        name: (typeof workspace.name === 'string' && workspace.name) || fallbackName,
        emoji: typeof workspace.emoji === 'string' ? workspace.emoji : null,
        background: typeof workspace.background === 'string' ? workspace.background : null,
        fromMintype: !!manifest,
        pages,
    };
}

// Plans the import of a ZIP read with `loadZipFiles`; `archiveName` names a workspace that has
// no other name.
export async function planMarkdownImport(files, archiveName) {
    const manifestRoots = files.paths
        .filter((path) => path === MANIFEST_PATH || path.endsWith(`/${MANIFEST_PATH}`))
        .map((path) => path.slice(0, -MANIFEST_PATH.length).replace(/\/$/, ''));

    let roots = manifestRoots;
    if (roots.length === 0) {
        const topFolders = new Set(files.paths.map((path) => (path.includes('/') ? path.split('/')[0] : '')));
        roots = [topFolders.size === 1 ? [...topFolders][0] : ''];
    }

    // Each file belongs to the deepest workspace folder holding it.
    const ownerOf = (path) => roots
        .filter((root) => !root || path.startsWith(`${root}/`))
        .sort((a, b) => b.length - a.length)[0];

    const workspaces = [];
    for (const root of roots) {
        const relPaths = files.paths
            .filter((path) => ownerOf(path) === root)
            .map((path) => (root ? path.slice(root.length + 1) : path))
            .filter(isPageFile);
        const manifest = manifestRoots.includes(root) ? await readManifest(files, joinPath(root, MANIFEST_PATH)) : null;
        const fallbackName = (root ? baseOf(root) : archiveName.replace(/\.zip$/i, '')) || 'Imported notes';
        workspaces.push(planWorkspace(root, relPaths, manifest, fallbackName));
    }

    const pageCount = workspaces.reduce((sum, workspace) => sum + workspace.pages.length, 0);
    if (pageCount === 0) throw new Error('No Markdown or whiteboard files were found in this ZIP.');
    return { workspaces, pageCount };
}

// Finds the page a link points to, across every workspace of the plan. Wikilinks are tried from
// the workspace root first, Markdown links from the linking file; Obsidian also links by name.
export function createPageResolver(plan) {
    const byPath = new Map();
    const byName = new Map();
    for (const workspace of plan.workspaces) {
        for (const page of workspace.pages) {
            if (!page.path) continue;
            byPath.set(page.path, page);
            const name = baseOf(page.path).toLowerCase();
            const stem = name.slice(0, -(page.type === 'whiteboard' ? WHITEBOARD_EXTENSION.length : '.md'.length));
            for (const key of new Set([name, stem])) {
                const nameKey = `${workspace.root}\n${key}`;
                byName.set(nameKey, [...(byName.get(nameKey) || []), page]);
            }
        }
    }

    return (ref, { baseDir, root, wikilink }) => {
        if (!ref.trim()) return null;
        const relative = resolveZipPath(baseDir, ref);
        const fromRoot = resolveZipPath(root, ref);
        const candidates = /^\.\.?\//.test(ref) ? [relative] : wikilink ? [fromRoot, relative] : [relative, fromRoot];
        for (const candidate of candidates) {
            for (const extension of ['', '.md', WHITEBOARD_EXTENSION]) {
                const page = byPath.get(candidate + extension);
                if (page) return page;
            }
        }
        const matches = byName.get(`${root}\n${baseOf(relative).toLowerCase()}`) || [];
        return [...matches].sort((a, b) => a.path.length - b.path.length)[0] || null;
    };
}

// Reads a planned page's content. `idForPage(page)` gives the ID a linked page is imported
// under, and `readImage(path)` an image file's data URL.
export async function readPageContent(page, workspace, { files, resolvePage, idForPage, readImage }) {
    if (!page.path) return { type: 'document', markdown: '' };

    const baseDir = dirOf(page.path);
    const convert = (markdown) => convertMarkdownReferences(markdown, {
        resolvePage: (ref, { wikilink }) => {
            const target = resolvePage(ref, { baseDir, root: workspace.root, wikilink });
            const id = target && idForPage(target);
            return id ? { id, title: target.name } : null;
        },
        loadImage: async (ref) => {
            const path = resolveZipFile(files, baseDir, ref, workspace.root);
            return path ? readImage(path) : null;
        },
    });

    const text = await files.get(page.path).async('text');
    if (page.type === 'whiteboard') return parseWhiteboardFile(text, convert);

    let markdown = text.replace(FRONT_MATTER, '');
    // Notion starts each page with its title as a heading.
    if (page.notionTitle) markdown = markdown.replace(new RegExp(`^\\s*# ${escapeRegExp(page.name)}[ \\t]*(\\r?\\n|$)\\s*`), '');
    return { type: 'document', markdown: await convert(markdown) };
}
