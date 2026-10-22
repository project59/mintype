// The layout shared by the Markdown exporter and importer. A workspace is a folder: each page is
// a `.md` file (whiteboards `.whiteboard.json`), and a page's sub-pages sit in a folder of the
// same name beside it, as in Notion's exports and Obsidian's folder notes. Quick notes go in
// `Quick notes/`, trashed pages in `.trash/` (Obsidian's own trash folder), images in
// `attachments/`, and what files cannot express (titles, order, emoji, flags) in the manifest.

export const MANIFEST_PATH = '.mintype/workspace.json';
export const MANIFEST_FORMAT = 'mintype-markdown';
export const MANIFEST_VERSION = 1;
export const WHITEBOARD_EXTENSION = '.whiteboard.json';
export const QUICK_NOTES_FOLDER = 'Quick notes';
export const TRASH_FOLDER = '.trash';
export const ATTACHMENTS_FOLDER = 'attachments';

export const safeFileName = (name) => (name || '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\\/:*?"<>|#^[\]\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    // A leading dot would hide the file in Obsidian and in the importer.
    .replace(/^\.+\s*/, '')
    .slice(0, 120)
    .trim() || 'Untitled';

// Page titles as written in a wikilink's display text, which cannot hold `|`, `[` or `]`.
export const wikilinkAlias = (title) => (title || '').replace(/[|[\]]/g, ' ').replace(/\s+/g, ' ').trim();

export const dirOf = (path) => path.split('/').slice(0, -1).join('/');
export const baseOf = (path) => path.split('/').pop();
export const joinPath = (...parts) => parts.filter(Boolean).join('/');

// Encodes a zip path as a Markdown link destination.
export const linkTo = (path) => encodeURI(path).replace(/\(/g, '%28').replace(/\)/g, '%29');

// The path from directory `fromDir` to `toPath`, both relative to the archive root.
export const relativePath = (fromDir, toPath) => {
    const from = fromDir ? fromDir.split('/') : [];
    const to = toPath.split('/');
    let common = 0;
    while (common < from.length && common < to.length - 1 && from[common] === to[common]) common++;
    return [...from.slice(common).map(() => '..'), ...to.slice(common)].join('/');
};

const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const CODE_SPAN = /(`+)[\s\S]*?[^`]\1(?!`)/g;

// Applies `transform(text, offset)` to the parts of `markdown` outside fenced code blocks and
// inline code, so page links and images written as code are left alone. `offset` is where the
// part starts in `markdown`.
export function mapOutsideCode(markdown, transform) {
    let result = '';
    let prose = '';
    let proseStart = 0;
    let offset = 0;
    let fence = null;

    const flushProse = () => {
        let last = 0;
        for (const match of prose.matchAll(CODE_SPAN)) {
            result += transform(prose.slice(last, match.index), proseStart + last) + match[0];
            last = match.index + match[0].length;
        }
        result += transform(prose.slice(last), proseStart + last);
        prose = '';
    };

    for (const line of markdown.split(/(?<=\n)/)) {
        const marker = FENCE.exec(line)?.[1];
        if (fence) {
            result += line;
            if (marker && marker[0] === fence[0] && marker.length >= fence.length && !line.trim().slice(marker.length)) fence = null;
        } else if (marker) {
            flushProse();
            result += line;
            fence = marker;
        } else {
            if (!prose) proseStart = offset;
            prose += line;
        }
        offset += line.length;
    }
    flushProse();
    return result;
}

// True when position `index` of `markdown` is on a GFM table row, where `|` must be escaped.
export const isTableRow = (markdown, index) => /^\s*\|/.test(markdown.slice(markdown.lastIndexOf('\n', index - 1) + 1, index + 1));
