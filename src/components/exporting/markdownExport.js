import { sortByOrder } from '../../lib/pageOrder.js';
import { MARKDOWN_SHAPE_TYPE } from '../../utils/constants.js';
import {
    ATTACHMENTS_FOLDER,
    MANIFEST_FORMAT,
    MANIFEST_PATH,
    MANIFEST_VERSION,
    QUICK_NOTES_FOLDER,
    TRASH_FOLDER,
    WHITEBOARD_EXTENSION,
    dirOf,
    isTableRow,
    joinPath,
    linkTo,
    mapOutsideCode,
    relativePath,
    safeFileName,
    wikilinkAlias,
} from './archiveFormat.js';

const EXPORTED_TYPES = new Set(['document', 'whiteboard']);
const MENTION = /@page\[([A-Za-z0-9_-]+)\]/g;
const INTERNAL_LINK = /\]\(\/page\/([A-Za-z0-9_-]+)(\s+"[^"]*")?\)/g;
const DATA_IMAGE = /!\[([^\]]*)\]\((data:image\/([\w.+-]+);base64,([^)\s]+))\)/g;
const DATA_URL = /^data:image\/([\w.+-]+);base64,(.+)$/;
const IMAGE_EXTENSIONS = { jpeg: 'jpg', 'svg+xml': 'svg' };

// Gives `base` a number suffix until it is unused in `used` (compared case-insensitively, since
// Windows and macOS file systems are).
const claim = (used, base) => {
    let name = base;
    for (let n = 2; used.has(name.toLowerCase()); n++) name = `${base} ${n}`;
    used.add(name.toLowerCase());
    return name;
};

// FNV-1a, so an image keeps the same file name across exports.
const hash = (text) => {
    let value = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        value ^= text.charCodeAt(i);
        value = Math.imul(value, 0x01000193);
    }
    return (value >>> 0).toString(16).padStart(8, '0');
};

// Decides every page's path. Tree pages are placed depth-first in sidebar order, each page's
// sub-pages in a folder named like its file; the order of `entries` is the manifest's order.
function layoutWorkspace(workspace, folder, includeTrash) {
    const metas = workspace.pages
        .map((page) => page.meta)
        .filter((meta) => EXPORTED_TYPES.has(meta.type) && (includeTrash || !meta.deleted));
    const contentById = new Map(workspace.pages.map((page) => [page.meta.id, page.content]));
    const isTree = (meta) => meta && !meta.deleted && meta.parentId !== 'quickNote';
    const byId = new Map(metas.map((meta) => [meta.id, meta]));

    const children = new Map();
    for (const meta of metas.filter(isTree)) {
        const parentId = isTree(byId.get(meta.parentId)) ? meta.parentId : null;
        children.set(parentId, [...(children.get(parentId) || []), meta]);
    }

    const entries = [];
    const place = (meta, dir, used, location) => {
        const base = claim(used, safeFileName(meta.name));
        const extension = meta.type === 'whiteboard' ? WHITEBOARD_EXTENSION : '.md';
        entries.push({ meta, content: contentById.get(meta.id), path: joinPath(folder, dir, base + extension), location, folder });
        return joinPath(dir, base);
    };
    const placeTree = (parentId, dir, used) => {
        for (const meta of sortByOrder(children.get(parentId) || [])) {
            const pageDir = place(meta, dir, used, 'tree');
            if (children.has(meta.id)) placeTree(meta.id, pageDir, new Set());
        }
    };

    placeTree(null, '', new Set([QUICK_NOTES_FOLDER, ATTACHMENTS_FOLDER].map((name) => name.toLowerCase())));
    const quickNotes = new Set();
    for (const meta of sortByOrder(metas.filter((meta) => !meta.deleted && meta.parentId === 'quickNote'))) {
        place(meta, QUICK_NOTES_FOLDER, quickNotes, 'quickNote');
    }
    const trash = new Set();
    for (const meta of sortByOrder(metas.filter((meta) => meta.deleted))) place(meta, TRASH_FOLDER, trash, 'trash');

    return { workspace, folder, entries };
}

// Whiteboards are written as their stored content, with each Markdown shape's text passed
// through `rewrite`.
function portableWhiteboard(content, rewrite) {
    const store = content.tldraw?.snapshot?.document?.store;
    if (!store) return content;
    const portableStore = Object.fromEntries(Object.entries(store).map(([id, record]) => [
        id,
        record.typeName === 'shape' && record.type === MARKDOWN_SHAPE_TYPE
            ? { ...record, props: { ...record.props, markdown: rewrite(record.props.markdown || '') } }
            : record,
    ]));
    const { snapshot } = content.tldraw;
    return {
        ...content,
        tldraw: { ...content.tldraw, snapshot: { ...snapshot, document: { ...snapshot.document, store: portableStore } } },
    };
}

function writeWorkspace(zip, { workspace, folder, entries }, entryById) {
    const imageNames = new Set();
    const images = new Map();
    const addImage = (dataUrl) => {
        if (!images.has(dataUrl)) {
            const [, subtype, data] = DATA_URL.exec(dataUrl);
            const name = claim(imageNames, `image-${hash(dataUrl)}`);
            const path = joinPath(folder, ATTACHMENTS_FOLDER, `${name}.${IMAGE_EXTENSIONS[subtype] || subtype}`);
            zip.file(path, data, { base64: true });
            images.set(dataUrl, path);
        }
        return images.get(dataUrl);
    };

    // Same-workspace wikilinks are written from the workspace root, as Obsidian does; others
    // relative to the file. `.md` is left out, as in Obsidian.
    const wikilinkTarget = (target, fromDir) => {
        const path = target.folder === folder ? target.path.slice(folder.length + 1) : relativePath(fromDir, target.path);
        return path.replace(/\.md$/, '');
    };

    // Page mentions become wikilinks and /page/ links relative links to the exported files.
    // References to pages outside the export keep their Mintype syntax.
    const portableMarkdown = (markdown, fromDir) => mapOutsideCode(markdown, (text, start) => text
        .replace(MENTION, (whole, id, index) => {
            const target = entryById.get(id);
            if (!target) return whole;
            const alias = wikilinkAlias(target.meta.name);
            const pipe = isTableRow(markdown, start + index) ? '\\|' : '|';
            return `[[${wikilinkTarget(target, fromDir)}${alias ? pipe + alias : ''}]]`;
        })
        .replace(INTERNAL_LINK, (whole, id, title = '') => {
            const target = entryById.get(id);
            return target ? `](${linkTo(relativePath(fromDir, target.path))}${title})` : whole;
        }));

    const extractImages = (markdown, fromDir) => markdown.replace(DATA_IMAGE, (whole, alt, dataUrl) => (
        `![${alt}](${linkTo(relativePath(fromDir, addImage(dataUrl)))})`
    ));

    for (const entry of entries) {
        const fromDir = dirOf(entry.path);
        if (entry.meta.type === 'whiteboard') {
            const content = portableWhiteboard(entry.content, (markdown) => portableMarkdown(markdown, fromDir));
            zip.file(entry.path, JSON.stringify(content));
        } else {
            zip.file(entry.path, extractImages(portableMarkdown(entry.content.markdown || '', fromDir), fromDir));
        }
    }

    const background = workspace.content?.background || null;
    const manifest = {
        format: MANIFEST_FORMAT,
        version: MANIFEST_VERSION,
        exported: new Date().toISOString(),
        workspace: {
            name: workspace.meta.name || 'Untitled',
            emoji: workspace.meta.emoji ?? null,
            background: background && DATA_URL.test(background) ? addImage(background).slice(folder.length + 1) : background,
        },
        pages: entries.map(({ meta, path, location }) => ({
            path: path.slice(folder.length + 1),
            title: meta.name || 'Untitled',
            emoji: meta.emoji ?? null,
            favorite: !!meta.isFavorite,
            sensitive: !!meta.sensitive,
            width: meta.documentWidth || 'normal',
            created: meta.created ?? null,
            modified: meta.lastModified ?? null,
            ...(location === 'quickNote' && { quickNote: true }),
            ...(location === 'trash' && { trashed: true }),
        })),
    };
    zip.file(joinPath(folder, MANIFEST_PATH), JSON.stringify(manifest, null, 2));
}

// Writes each workspace into its own folder of `zip`. A workspace is `{ meta, content, pages }`,
// with `pages` its entries' `{ meta, content }` (without the workspace entry). Returns the
// number of pages written.
export function buildMarkdownExport(zip, workspaces, { includeTrash = false } = {}) {
    const folders = new Set();
    const layouts = workspaces.map((workspace) => (
        layoutWorkspace(workspace, claim(folders, safeFileName(workspace.meta.name)), includeTrash)
    ));
    // Covers every workspace, so links between exported workspaces resolve too.
    const entryById = new Map(layouts.flatMap((layout) => layout.entries.map((entry) => [entry.meta.id, entry])));
    for (const layout of layouts) writeWorkspace(zip, layout, entryById);
    return entryById.size;
}

export function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
