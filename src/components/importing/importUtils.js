import JSZip from 'jszip';
import { MARKDOWN_SHAPE_TYPE, newPageSchema } from '../../utils/constants.js';
import { compressImage, readAsDataUrl } from '../../render/editor/compressImage.js';
import { baseOf, isTableRow, mapOutsideCode, wikilinkAlias } from '../exporting/archiveFormat.js';

const IMAGE_TYPES = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',
    avif: 'image/avif',
};

// `![alt](src)` / `[text](href)`, with an optional title and `<...>` destinations, and Obsidian's
// `[[target#heading|alias]]` / `![[embed|300]]` wikilinks (`\|` inside tables).
const MARKDOWN_IMAGE = /!\[([^\]]*)\]\(\s*(<[^>]*>|[^\s)]+)(?:\s+"[^"]*")?\s*\)/g;
const MARKDOWN_LINK = /(?<!!)\[([^\]]*)\]\(\s*(<[^>]*>|[^\s)]+)(?:\s+"[^"]*")?\s*\)/g;
const WIKILINK = /(!?)\[\[([^\]\n]+?)\]\]/g;
const EXTERNAL_URL = /^([a-z][a-z0-9+.-]*:|\/\/|#)/i;

export const createImportedMeta = ({ id, name, parentId, rootId, type = 'document' }) => ({
    ...newPageSchema(type, null, name),
    id,
    parentId,
    rootId,
});

export const emptyImportResult = () => ({ total: 0, success: 0, failed: 0, failures: [] });

export const isZipFile = (file) => /\.zip$/i.test(file?.name || '');

// Zip archives made on macOS carry resource-fork copies that are not real files.
export const isZipMetadataPath = (path) => path.startsWith('__MACOSX/') || baseOf(path).startsWith('._');

export const isImagePath = (path) => Object.hasOwn(IMAGE_TYPES, path.split('.').pop().toLowerCase());

const safeDecode = (text) => {
    try {
        return decodeURIComponent(text);
    } catch {
        return text;
    }
};

// Resolves a (possibly URL-encoded) relative reference against a directory inside the zip.
export const resolveZipPath = (baseDir, href) => {
    const parts = [];
    for (const part of `${baseDir}/${safeDecode(href)}`.split('/')) {
        if (!part || part === '.') continue;
        if (part === '..') parts.pop();
        else parts.push(part);
    }
    return parts.join('/');
};

// Reads the files of an uploaded ZIP. Notion splits large exports into several ZIPs inside the
// downloaded one; their files are read as if they were in one archive.
export async function loadZipFiles(file) {
    const files = new Map();
    const add = async (zip) => {
        for (const [path, entry] of Object.entries(zip.files)) {
            if (entry.dir || isZipMetadataPath(path)) continue;
            if (/\.zip$/i.test(path) && !path.includes('/')) await add(await JSZip.loadAsync(await entry.async('arraybuffer')));
            else files.set(path, entry);
        }
    };
    await add(await JSZip.loadAsync(file));

    const byName = new Map();
    for (const path of files.keys()) {
        const name = baseOf(path).toLowerCase();
        byName.set(name, [...(byName.get(name) || []), path]);
    }
    return {
        paths: [...files.keys()],
        get: (path) => files.get(path) || null,
        // Obsidian links a file by its name alone; the shortest path wins, as there.
        findByName: (name) => [...(byName.get(name.toLowerCase()) || [])].sort((a, b) => a.length - b.length)[0] || null,
    };
}

// Finds the file a link points to: relative to the linking file, then to `root` (Obsidian's
// vault-absolute links), then by file name.
export const resolveZipFile = (files, baseDir, ref, root = '') => {
    const relative = resolveZipPath(baseDir, ref);
    if (files.get(relative)) return relative;
    const fromRoot = resolveZipPath(root, ref);
    if (files.get(fromRoot)) return fromRoot;
    return files.findByName(baseOf(safeDecode(ref)));
};

// Reads an image file as the data URL that page Markdown stores. `compress` downscales and
// re-encodes it as pasted images are; images from a Mintype export already were.
export async function loadZipImage(files, path, { compress = true } = {}) {
    const type = path && IMAGE_TYPES[path.split('.').pop().toLowerCase()];
    const file = type && files.get(path);
    if (!file) return null;
    if (!compress) return `data:${type};base64,${await file.async('base64')}`;
    const blob = new Blob([await file.async('arraybuffer')], { type });
    return readAsDataUrl(await compressImage(blob));
}

const unwrapDestination = (destination) => destination.replace(/^<|>$/g, '');

const splitWikilink = (inner) => {
    const [target, ...alias] = inner.split(/\\?\|/);
    return { target: target.split('#')[0].trim(), alias: alias.join('|').trim() };
};

// Obsidian sizes embedded images with `|300` or `|300x200`.
const embedSize = (alias) => /^(\d+)(x\d+)?$/.exec(alias)?.[1] || '';

// Converts links and images in imported Markdown to Mintype's form, leaving code untouched:
// images are embedded as data URLs, links to imported pages become /page/ links, and wikilinks
// become page mentions (or /page/ links when their text differs from the page's title).
// `resolvePage(ref, { wikilink })` returns `{ id, title }` for a page, and `loadImage(ref)` a data
// URL; both return null for references outside the import, which are left as they are.
export async function convertMarkdownReferences(markdown, { resolvePage, loadImage }) {
    const imageRefs = new Set();
    mapOutsideCode(markdown, (text) => {
        for (const [, , destination] of text.matchAll(MARKDOWN_IMAGE)) imageRefs.add(unwrapDestination(destination));
        for (const [, bang, inner] of text.matchAll(WIKILINK)) {
            const { target } = splitWikilink(inner);
            if (bang && isImagePath(target)) imageRefs.add(target);
        }
        return text;
    });

    const images = new Map();
    for (const ref of imageRefs) {
        if (EXTERNAL_URL.test(ref)) continue;
        try {
            const dataUrl = await loadImage(ref);
            if (dataUrl) images.set(ref, dataUrl);
        } catch (error) {
            console.error(`Failed to import image ${ref}:`, error);
        }
    }

    // Wikilinks first, while offsets still match `markdown` for the table-row check.
    return mapOutsideCode(markdown, (text, start) => text
        .replace(WIKILINK, (whole, bang, inner, index) => {
            const { target, alias } = splitWikilink(inner);
            if (!target) return whole;
            if (bang && images.has(target)) {
                const width = embedSize(alias);
                const alt = width ? '' : alias.replace(/[|\]]/g, ' ');
                const pipe = isTableRow(markdown, start + index) ? '\\|' : '|';
                return `![${alt}${width ? pipe + width : ''}](${images.get(target)})`;
            }
            const page = resolvePage(target, { wikilink: true });
            if (!page) return whole;
            return alias && alias !== wikilinkAlias(page.title)
                ? `[${alias.replace(/[[\]]/g, '')}](/page/${page.id})`
                : `@page[${page.id}]`;
        })
        .replace(MARKDOWN_IMAGE, (whole, alt, destination) => {
            const dataUrl = images.get(unwrapDestination(destination));
            return dataUrl ? `![${alt}](${dataUrl})` : whole;
        })
        .replace(MARKDOWN_LINK, (whole, label, destination) => {
            const href = unwrapDestination(destination);
            if (EXTERNAL_URL.test(href) || href.startsWith('/page/')) return whole;
            const page = resolvePage(href.split('#')[0], { wikilink: false });
            return page ? `[${label}](/page/${page.id})` : whole;
        }));
}

// Reads a whiteboard exported as JSON, passing each Markdown shape's text through
// `convertMarkdown` so its page links can be reconnected.
export async function parseWhiteboardFile(text, convertMarkdown) {
    const content = JSON.parse(text);
    if (content?.type !== 'whiteboard' || !Object.hasOwn(content, 'tldraw')) {
        throw new Error('Not a Mintype whiteboard file');
    }
    for (const record of Object.values(content.tldraw?.snapshot?.document?.store || {})) {
        if (record?.typeName === 'shape' && record.type === MARKDOWN_SHAPE_TYPE) {
            record.props.markdown = await convertMarkdown(record.props.markdown || '');
        }
    }
    return content;
}
