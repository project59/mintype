// Extracts the visible text of pages for search, so queries match what the reader sees
// rather than Markdown, directive or tldraw syntax.

import { getMarkdownManager } from '../render/editor/markdownManager.js';
import { MARKDOWN_SHAPE_TYPE } from '../utils/constants.js';

// Walks TipTap JSON (document Markdown and tldraw rich text share this shape), putting each
// textblock on its own line.
const collectText = (node, resolvePageTitle, lines, line) => {
    if (!node) return line;
    switch (node.type) {
        case 'text':
            return line + (node.text || '');
        case 'hardBreak':
            lines.push(line);
            return '';
        case 'pageMention':
            return `${line} ${resolvePageTitle(node.attrs?.pageId) || ''} `;
        case 'image':
            return `${line} ${node.attrs?.alt || ''} `;
        default:
            break;
    }

    let current = line;
    for (const child of node.content || []) {
        current = collectText(child, resolvePageTitle, lines, current);
    }
    if (node.content?.some((child) => child.type === 'text' || child.type === 'hardBreak')) {
        lines.push(current);
        return '';
    }
    return current;
};

const docToText = (doc, resolvePageTitle) => {
    const lines = [];
    const rest = collectText(doc, resolvePageTitle, lines, '');
    lines.push(rest);
    return lines
        .map((text) => text.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .join('\n');
};

export const markdownToSearchText = (markdown, resolvePageTitle = () => null) => {
    if (!markdown?.trim()) return '';
    try {
        return docToText(getMarkdownManager().parse(markdown), resolvePageTitle);
    } catch (error) {
        console.error('Failed to extract search text from Markdown', error);
        return '';
    }
};

// Reads text from a tldraw store snapshot: rich-text labels on notes, text, geo and arrow
// shapes, frame names, and Mintype Markdown shapes.
export const tldrawToSearchText = (snapshot, resolvePageTitle = () => null) => {
    const records = snapshot?.document?.store || snapshot?.store;
    if (!records) return '';

    return Object.values(records)
        .filter((record) => record?.typeName === 'shape')
        .sort((a, b) => (a.y ?? 0) - (b.y ?? 0) || (a.x ?? 0) - (b.x ?? 0))
        .map(({ type, props = {} }) => {
            if (type === MARKDOWN_SHAPE_TYPE) return markdownToSearchText(props.markdown, resolvePageTitle);
            const parts = [];
            if (typeof props.name === 'string') parts.push(props.name);
            if (typeof props.text === 'string') parts.push(props.text);
            if (props.richText) parts.push(docToText(props.richText, resolvePageTitle));
            return parts.join('\n');
        })
        .map((text) => text.trim())
        .filter(Boolean)
        .join('\n');
};
