import { nanoid } from 'nanoid';
import { getMarkdownManager } from '../../render/editor/markdownManager.js';
import { createImportedMeta } from '../importing/importUtils.js';
import { getPageTitle, loadPageMeta } from '../../render/shared/pageMeta.js';
import { MARKDOWN_SHAPE_TYPE, TLDRAW_WHITEBOARD_FORMAT_VERSION } from '../../utils/constants.js';

// A shared page is `{ v, meta: { type, name, emoji }, content }`, where `content` has the shape
// Mintype stores for a page (see newPageContentSchema), so a recipient can copy it into their own
// workspace unchanged.
const PAYLOAD_VERSION = 1;

const PAGE_REFERENCE = /@page\[|\]\(\/page\//;
const INTERNAL_LINK = /^\/page\//;

const collectPageIds = (node, ids) => {
    if (node.type === 'pageMention' && node.attrs?.pageId) ids.add(node.attrs.pageId);
    (node.content || []).forEach((child) => collectPageIds(child, ids));
    return ids;
};

// Recipients have none of the sharer's pages, so references to them become plain titles.
const withoutPageReferences = (node, titles) => {
    const title = titles.get(node.attrs?.pageId) || 'Linked page';
    if (node.type === 'pageMention') return [{ type: 'text', text: title }];
    if (node.type === 'text' && node.marks?.some((mark) => mark.type === 'link')) {
        const marks = node.marks.filter((mark) => !(mark.type === 'link' && INTERNAL_LINK.test(mark.attrs?.href || '')));
        return [{ ...node, marks }];
    }
    if (!node.content) return [node];
    return [{ ...node, content: node.content.flatMap((child) => withoutPageReferences(child, titles)) }];
};

async function toShareableMarkdown(markdown) {
    if (!PAGE_REFERENCE.test(markdown)) return markdown;
    const manager = getMarkdownManager();
    const doc = manager.parse(markdown);
    const titles = new Map(await Promise.all(
        [...collectPageIds(doc, new Set())].map(async (id) => {
            const meta = await loadPageMeta(id);
            return [id, meta ? getPageTitle(meta) : 'Linked page'];
        }),
    ));
    const [shareable] = withoutPageReferences(doc, titles);
    return manager.serialize(shareable);
}

async function toShareableSnapshot(snapshot) {
    const store = snapshot?.document?.store;
    if (!store) return snapshot;
    const records = await Promise.all(Object.entries(store).map(async ([id, record]) => [
        id,
        record.typeName === 'shape' && record.type === MARKDOWN_SHAPE_TYPE
            ? { ...record, props: { ...record.props, markdown: await toShareableMarkdown(record.props.markdown || '') } }
            : record,
    ]));
    return { ...snapshot, document: { ...snapshot.document, store: Object.fromEntries(records) } };
}

// `content` is the page's stored content; for documents pass the open editor's Markdown, which
// may be newer than the saved copy.
export async function buildSharePayload(page, content) {
    const meta = { type: page.type, name: page.name || 'Untitled Page', emoji: page.emoji || null };
    if (page.type === 'document') {
        return { v: PAYLOAD_VERSION, meta, content: { type: 'document', markdown: await toShareableMarkdown(content.markdown || '') } };
    }
    if (page.type === 'whiteboard') {
        return {
            v: PAYLOAD_VERSION,
            meta,
            content: {
                type: 'whiteboard',
                tldraw: { formatVersion: TLDRAW_WHITEBOARD_FORMAT_VERSION, snapshot: await toShareableSnapshot(content.tldraw.snapshot) },
            },
        };
    }
    throw new Error(`Pages of type ${page.type} cannot be shared.`);
}

// Returns the payload when it is a page this version of Mintype can show, otherwise null.
export function validSharePayload(payload) {
    if (payload?.v !== PAYLOAD_VERSION || typeof payload.meta !== 'object' || !payload.meta) return null;
    const { content } = payload;
    if (content?.type !== payload.meta.type) return null;
    if (content.type === 'document' && typeof content.markdown === 'string') return payload;
    if (content.type === 'whiteboard'
        && content.tldraw?.formatVersion === TLDRAW_WHITEBOARD_FORMAT_VERSION
        && content.tldraw.snapshot?.document?.store) return payload;
    return null;
}

const MAX_NAME_LENGTH = 200;

// The metadata and content for saving a valid shared page as a new top-level page of a workspace.
// Only known fields are copied, so nothing else in the payload reaches the recipient's storage.
export function sharedPageToImport(payload, rootId) {
    const { meta, content } = payload;
    const name = typeof meta.name === 'string' && meta.name.trim() ? meta.name.trim().slice(0, MAX_NAME_LENGTH) : 'Untitled Page';
    const emoji = typeof meta.emoji === 'string' && meta.emoji.length <= 16 ? meta.emoji : null;
    return {
        meta: { ...createImportedMeta({ id: nanoid(), name, parentId: rootId, rootId, type: content.type }), emoji },
        content: content.type === 'document'
            ? { type: 'document', markdown: content.markdown }
            : { type: 'whiteboard', tldraw: { formatVersion: content.tldraw.formatVersion, snapshot: content.tldraw.snapshot } },
    };
}
