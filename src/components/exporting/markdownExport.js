import { getMarkdownManager } from '../../render/editor/markdownManager.js';
import { MARKDOWN_SHAPE_TYPE } from '../../utils/constants.js';

export const WHITEBOARD_EXTENSION = '.whiteboard.json';

const NEEDS_PORTABLE_REWRITE = /@page\[|:::columns|\]\(\/page\//;
const INTERNAL_LINK = /^\/page\/([^/?#]+)/;
const DATA_IMAGE = /!\[([^\]]*)\]\((data:image\/([\w.+-]+);base64,[^)\s]+)\)/g;
const IMAGE_EXTENSIONS = { jpeg: 'jpg', 'svg+xml': 'svg' };

export const safeFileName = (name) => (name || '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\\/:*?"<>|#^[\]\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'Untitled';

// Encodes a zip path as a Markdown link destination.
export const linkTo = (path) => encodeURI(path).replace(/\(/g, '%28').replace(/\)/g, '%29');

const linkNode = (pageId, pageLinks) => {
    const link = pageLinks.get(pageId);
    return link && { type: 'text', text: link.title, marks: [{ type: 'link', attrs: { href: link.href } }] };
};

const toPortableNodes = (node, pageLinks) => {
    if (node.type === 'columns') {
        return (node.content || []).flatMap((column) => (
            (column.content || []).flatMap((child) => toPortableNodes(child, pageLinks))
        ));
    }
    if (node.type === 'pageMention') return [linkNode(node.attrs?.pageId, pageLinks) || node];
    if (node.type === 'text' && node.marks?.some((mark) => mark.type === 'link')) {
        const marks = node.marks.map((mark) => {
            const pageId = mark.type === 'link' && INTERNAL_LINK.exec(mark.attrs?.href || '')?.[1];
            const link = pageId && pageLinks.get(pageId);
            return link ? { ...mark, attrs: { ...mark.attrs, href: link.href } } : mark;
        });
        return [{ ...node, marks }];
    }
    if (!node.content) return [node];
    return [{ ...node, content: node.content.flatMap((child) => toPortableNodes(child, pageLinks)) }];
};

// Rewrites what other Markdown tools cannot show: columns become sequential blocks, and page
// mentions and /page/ links become links to the exported files (`pageLinks` maps page IDs to
// `{ title, href }`; pages outside the export keep their Mintype syntax).
export function toPortableMarkdown(markdown, pageLinks) {
    if (!NEEDS_PORTABLE_REWRITE.test(markdown)) return markdown;
    try {
        const manager = getMarkdownManager();
        const [doc] = toPortableNodes(manager.parse(markdown), pageLinks);
        return manager.serialize(doc);
    } catch (error) {
        console.error('Failed to rewrite Markdown for export:', error);
        return markdown;
    }
}

// Moves inline images into files under images/. `images` maps data URLs to their paths and is
// shared across the export, so an image used on several pages is stored once.
export function extractImages(markdown, images, baseName) {
    return markdown.replace(DATA_IMAGE, (whole, alt, dataUrl, subtype) => {
        let path = images.get(dataUrl);
        if (!path) {
            path = `images/${baseName}-${images.size + 1}.${IMAGE_EXTENSIONS[subtype] || subtype}`;
            images.set(dataUrl, path);
        }
        return `![${alt}](${linkTo(path)})`;
    });
}

// Whiteboards have no Markdown form, so they are exported as their stored content. Page
// references in Markdown shapes become file links, as in documents, so imports can reconnect them.
export function toPortableWhiteboard(content, pageLinks) {
    const store = content.tldraw?.snapshot?.document?.store;
    if (!store) return content;
    const portableStore = Object.fromEntries(Object.entries(store).map(([id, record]) => [
        id,
        record.typeName === 'shape' && record.type === MARKDOWN_SHAPE_TYPE
            ? { ...record, props: { ...record.props, markdown: toPortableMarkdown(record.props.markdown || '', pageLinks) } }
            : record,
    ]));
    const { snapshot } = content.tldraw;
    return {
        ...content,
        tldraw: { ...content.tldraw, snapshot: { ...snapshot, document: { ...snapshot.document, store: portableStore } } },
    };
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
