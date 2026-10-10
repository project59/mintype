import { newPageSchema } from '../../utils/constants.js';
import { compressImage, readAsDataUrl } from '../../render/editor/compressImage.js';
import { MARKDOWN_SHAPE_TYPE } from '../../utils/constants.js';

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

// `![alt](src)` / `[text](href)`, with an optional title and `<...>` destinations.
const MARKDOWN_IMAGE = /!\[([^\]]*)\]\(\s*(<[^>]*>|[^\s)]+)(?:\s+"[^"]*")?\s*\)/g;
const MARKDOWN_LINK = /(?<!!)\[([^\]]*)\]\(\s*(<[^>]*>|[^\s)]+)(?:\s+"[^"]*")?\s*\)/g;
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
export const isZipMetadataPath = (path) => path.startsWith('__MACOSX/') || path.split('/').pop().startsWith('._');

export const dirOf = (path) => path.split('/').slice(0, -1).join('/');

// Resolves a (possibly URL-encoded) relative reference against a directory inside the zip.
export const resolveZipPath = (baseDir, href) => {
    let decoded = href;
    try {
        decoded = decodeURIComponent(href);
    } catch {
        // Not URL-encoded.
    }
    const parts = [];
    for (const part of `${baseDir}/${decoded}`.split('/')) {
        if (!part || part === '.') continue;
        if (part === '..') parts.pop();
        else parts.push(part);
    }
    return parts.join('/');
};

const unwrapDestination = (destination) => destination.replace(/^<|>$/g, '');

// Falls back to a unique file of the same name, for exports whose image paths are not relative.
const findZipFile = (zip, path) => {
    const exact = zip.file(path);
    if (exact) return exact;
    const name = path.split('/').pop();
    const matches = zip.file(new RegExp(`(^|/)${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
    return matches.length === 1 ? matches[0] : null;
};

const readZipImage = async (zip, path) => {
    const type = IMAGE_TYPES[path.split('.').pop().toLowerCase()];
    const file = type && findZipFile(zip, path);
    if (!file) return null;
    const blob = new Blob([await file.async('arraybuffer')], { type });
    return readAsDataUrl(await compressImage(blob));
};

// Inlines images stored in the zip as data URLs, the form page Markdown keeps images in.
export async function embedZipImages(markdown, zip, baseDir) {
    const replacements = new Map();
    for (const [whole, alt, destination] of markdown.matchAll(MARKDOWN_IMAGE)) {
        const src = unwrapDestination(destination);
        if (replacements.has(whole) || EXTERNAL_URL.test(src)) continue;
        try {
            const dataUrl = await readZipImage(zip, resolveZipPath(baseDir, src));
            if (dataUrl) replacements.set(whole, `![${alt}](${dataUrl})`);
        } catch (error) {
            console.error(`Failed to import image ${src}:`, error);
        }
    }
    return markdown.replace(MARKDOWN_IMAGE, (whole) => replacements.get(whole) ?? whole);
}

// Points links to other imported files at their new pages. `pageIdForPath` maps a zip path to
// the imported page ID, or returns undefined to leave the link unchanged.
export function rewritePageLinks(markdown, baseDir, pageIdForPath) {
    return markdown.replace(MARKDOWN_LINK, (whole, text, destination) => {
        const href = unwrapDestination(destination);
        if (EXTERNAL_URL.test(href)) return whole;
        const pageId = pageIdForPath(resolveZipPath(baseDir, href.split('#')[0]));
        return pageId ? `[${text}](/page/${pageId})` : whole;
    });
}

// Reads a whiteboard exported as JSON, passing each Markdown shape's text through
// `rewriteMarkdown` so its page links can be reconnected.
export function parseWhiteboardFile(text, rewriteMarkdown) {
    const content = JSON.parse(text);
    if (content?.type !== 'whiteboard' || !Object.hasOwn(content, 'tldraw')) {
        throw new Error('Not a Mintype whiteboard file');
    }
    for (const record of Object.values(content.tldraw?.snapshot?.document?.store || {})) {
        if (record?.typeName === 'shape' && record.type === MARKDOWN_SHAPE_TYPE) {
            record.props.markdown = rewriteMarkdown(record.props.markdown || '');
        }
    }
    return content;
}
