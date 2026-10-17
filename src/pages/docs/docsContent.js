// The docs are the Markdown files in /docs, so they read the same here and on GitHub. A file's
// slug is its name without `.md`; README.md is the docs home at /docs.
const files = import.meta.glob('../../../docs/*.md', { query: '?raw', import: 'default', eager: true });

export const SOURCE_URL = 'https://github.com/project59/mintype/blob/main/';

// The first paragraph as plain text, shortened at a word boundary for a meta description.
function summarize(markdown, max = 160) {
    const paragraph = markdown.split(/\n\s*\n/).map((block) => block.trim()).find((block) => block && !block.startsWith('#')) || '';
    const text = paragraph.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`]/g, '').replace(/\s+/g, ' ');
    if (text.length <= max) return text;
    return `${text.slice(0, text.lastIndexOf(' ', max - 1))}…`;
}

const docs = new Map(Object.entries(files).map(([path, markdown]) => {
    const file = path.split('/').pop();
    const slug = file === 'README.md' ? '' : file.replace(/\.md$/, '');
    const title = markdown.match(/^# (.+)$/m)?.[1].trim() || slug;
    return [slug, { slug, file, title, description: summarize(markdown), markdown }];
}));

const SECTIONS = [
    { title: 'Using Mintype', slugs: ['getting-started', 'documents-and-whiteboards', 'sync-and-devices', 'sharing', 'import-export'] },
    { title: 'Privacy and security', slugs: ['security-overview', 'encryption', 'data-storage', 'limitations', 'verify'] },
];

export const docsNav = [
    { title: null, items: [{ slug: '', title: 'Overview' }] },
    ...SECTIONS.map((section) => ({
        title: section.title,
        items: section.slugs.filter((slug) => docs.has(slug)).map((slug) => ({ slug, title: docs.get(slug).title })),
    })),
];

const ordered = docsNav.flatMap((section) => section.items.map((item) => item.slug));

export const getDoc = (slug = '') => docs.get(slug) || null;

export const docPath = (slug) => (slug ? `/docs/${slug}` : '/docs');

export function adjacentDocs(slug) {
    const index = ordered.indexOf(slug);
    if (index === -1) return { previous: null, next: null };
    return { previous: getDoc(ordered[index - 1]), next: getDoc(ordered[index + 1]) };
}

// GitHub's heading anchors, so `file.md#heading` links work both on GitHub and here.
export function headingId(text, used) {
    const base = text.trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');
    let id = base;
    for (let n = 1; used.has(id); n++) id = `${base}-${n}`;
    used.add(id);
    return id;
}

// Resolves a link written for GitHub (relative to /docs) to where it should go in the app:
// another doc, a heading on this page, or a file in the repository.
export function resolveDocHref(href) {
    if (!href || /^[a-z][a-z\d+.-]*:/i.test(href) || href.startsWith('/')) return { href, external: /^https?:/i.test(href) };
    if (href.startsWith('#')) return { href, external: false };

    const [path, hash] = href.split('#');
    const segments = [];
    for (const part of `docs/${path}`.split('/')) {
        if (part === '..') segments.pop();
        else if (part && part !== '.') segments.push(part);
    }
    const resolved = segments.join('/');
    const doc = /^docs\/[^/]+\.md$/.test(resolved) ? docs.get(resolved === 'docs/README.md' ? '' : resolved.slice(5, -3)) : null;
    if (doc) return { href: `${docPath(doc.slug)}${hash ? `#${hash}` : ''}`, external: false, internal: true };
    return { href: `${SOURCE_URL}${resolved}${hash ? `#${hash}` : ''}`, external: true };
}
