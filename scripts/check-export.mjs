// Round-trip check for the Markdown workspace export: sample workspaces are exported to a ZIP,
// read back by the importer, and must come out with the same pages, hierarchy, order, settings
// and content. It also imports a small Obsidian vault and Notion export. Run with
// `npm run check:export` after changing markdownExport.js, markdownImport.js or importUtils.js.
import JSZip from 'jszip';
import { createServer } from 'vite';

const server = await createServer({
  configFile: false,
  appType: 'custom',
  logLevel: 'error',
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, hmr: false, watch: null },
});

let failures = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual, null, 2);
  const e = JSON.stringify(expected, null, 2);
  if (a !== e) {
    failures++;
    console.error(`✗ ${label}\n  expected: ${e}\n  actual:   ${a}`);
  }
};

try {
  const { buildMarkdownExport } = await server.ssrLoadModule('/src/components/exporting/markdownExport.js');
  const { mapOutsideCode } = await server.ssrLoadModule('/src/components/exporting/archiveFormat.js');
  const { createPageResolver, planMarkdownImport, readPageContent } = await server.ssrLoadModule('/src/components/importing/markdownImport.js');
  const { loadZipFiles, loadZipImage } = await server.ssrLoadModule('/src/components/importing/importUtils.js');

  // A 1×1 PNG.
  const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const image = `data:image/png;base64,${PNG}`;

  const page = (id, name, parentId, order, extra = {}) => ({
    id, name, parentId, order, type: 'document', emoji: null, isFavorite: false, sensitive: false,
    documentWidth: 'normal', created: 1000, lastModified: 2000, deleted: false, ...extra,
  });
  const doc = (meta, markdown) => ({ meta, content: { type: 'document', markdown } });
  const whiteboard = (meta, markdown) => ({
    meta: { ...meta, type: 'whiteboard' },
    content: {
      type: 'whiteboard',
      tldraw: {
        formatVersion: 1,
        snapshot: { document: { schema: {}, store: { 'shape:md': { typeName: 'shape', type: 'mintypeMarkdown', id: 'shape:md', props: { markdown } } } } },
      },
    },
  });

  const roadmap = [
    '# Roadmap',
    '',
    ':::columns',
    ':::col{width=2}',
    'Left with @page[p3] and [a link](/page/p1).',
    ':::',
    '',
    ':::col',
    ':::callout{type=warning}',
    'Careful',
    ':::',
    ':::',
    ':::',
    '',
    `![photo|240|center](${image})`,
    '',
    '| Page | Note |',
    '| --- | --- |',
    '| @page[p1] | first |',
    '',
    'Inline `@page[p3]` code and an external [site](https://example.com).',
    '',
    '```md',
    '@page[p3] and [[Projects]] and ![x](missing.png)',
    '```',
  ].join('\n');

  const workspaces = [
    {
      meta: { id: 'wsA', name: 'Work: Notes', type: 'workspace', emoji: '💼' },
      content: { background: image },
      pages: [
        doc(page('p1', 'Projects', 'wsA', 'a0', { emoji: '📁', isFavorite: true }), 'Parent'),
        doc(page('p2', 'Roadmap / 2026', 'p1', 'a0', { documentWidth: 'wide' }), roadmap),
        whiteboard(page('p3', 'Sketch', 'p1', 'a1'), 'See @page[p2] and [[Not a page]]'),
        doc(page('p4', 'Projects', 'p1', 'a2'), 'Same name as its parent'),
        doc(page('p5', 'attachments', 'wsA', 'a1'), 'Reserved name'),
        doc(page('p6', 'Projects', 'wsA', 'a2', { sensitive: true }), 'Same name as a sibling'),
        doc(page('q1', 'Groceries', 'quickNote', 'a0'), `- [ ] milk ![](${image})`),
        doc(page('t1', 'Old', 'wsA', null, { deleted: true }), 'Trashed, links to @page[p2]'),
      ],
    },
    {
      meta: { id: 'wsB', name: 'Personal', type: 'workspace' },
      content: { background: 'https://example.com/bg.jpg' },
      pages: [doc(page('b1', 'Diary', 'wsB', 'a0'), 'Across workspaces: @page[p2], [link](/page/p1)')],
    },
  ];

  // The pages of each workspace in import order (tree depth-first, quick notes, trash), so both
  // sides can name every page by its position.
  const originalOrder = (workspace) => {
    const pages = workspace.pages.map((item) => item.meta);
    const tree = [];
    const visit = (parentId) => {
      for (const meta of pages.filter((p) => !p.deleted && p.parentId === parentId).sort((a, b) => a.order.localeCompare(b.order))) {
        tree.push(meta);
        visit(meta.id);
      }
    };
    visit(workspace.meta.id);
    return [...tree, ...pages.filter((p) => !p.deleted && p.parentId === 'quickNote'), ...pages.filter((p) => p.deleted)];
  };

  const labelIds = (text, labels) => mapOutsideCode(text, (part) => part
    .replace(/@page\[([\w-]+)\]/g, (whole, id) => (labels.has(id) ? `@page[${labels.get(id)}]` : whole))
    .replace(/\(\/page\/([\w-]+)\)/g, (whole, id) => (labels.has(id) ? `(/page/${labels.get(id)})` : whole)));
  const contentText = (content) => (content.type === 'whiteboard'
    ? content.tldraw.snapshot.document.store['shape:md'].props.markdown
    : content.markdown);
  const summarize = (meta, content, labels, location) => ({
    name: meta.name,
    type: meta.type,
    parent: meta.parentLabel,
    location,
    emoji: meta.emoji ?? null,
    favorite: !!meta.isFavorite,
    sensitive: !!meta.sensitive,
    width: meta.documentWidth || 'normal',
    content: labelIds(contentText(content), labels),
  });

  const expectedLabels = new Map();
  const expected = workspaces.map((workspace, w) => {
    const ordered = originalOrder(workspace);
    ordered.forEach((meta, index) => expectedLabels.set(meta.id, `${w}:${index}`));
    return ordered;
  }).map((ordered, w) => ordered.map((meta) => {
    const content = workspaces[w].pages.find((item) => item.meta.id === meta.id).content;
    const location = meta.deleted ? 'trash' : meta.parentId === 'quickNote' ? 'quickNote' : 'tree';
    const parentLabel = location === 'tree' ? expectedLabels.get(meta.parentId) ?? null : null;
    return summarize({ ...meta, parentLabel }, content, expectedLabels, location);
  }));

  const zip = new JSZip();
  check('exported page count', buildMarkdownExport(zip, workspaces, { includeTrash: true }), 9);
  const archive = await zip.generateAsync({ type: 'uint8array' });

  const importArchive = async (data, name) => {
    const files = await loadZipFiles(data);
    const plan = await planMarkdownImport(files, name);
    const resolvePage = createPageResolver(plan);
    const ids = new Map(plan.workspaces.flatMap((workspace, w) => workspace.pages.map((p, index) => [p.key, `${w}:${index}`])));
    const result = [];
    for (const workspace of plan.workspaces) {
      const pages = [];
      for (const planned of workspace.pages) {
        const content = await readPageContent(planned, workspace, {
          files,
          resolvePage,
          idForPage: (linked) => ids.get(linked.key),
          readImage: (path) => loadZipImage(files, path, { compress: false }),
        });
        pages.push({ planned, content });
      }
      result.push({ workspace, pages, ids });
    }
    return { files, result };
  };

  const { files, result } = await importArchive(archive, 'export.zip');
  const identity = new Map([...result[0].ids.values()].concat([...(result[1]?.ids.values() || [])]).map((id) => [id, id]));
  const actual = result.map(({ pages, ids }) => pages.map(({ planned, content }) => {
    const location = planned.trashed ? 'trash' : planned.quickNote ? 'quickNote' : 'tree';
    const meta = { name: planned.name, type: planned.type, parentLabel: planned.parentKey ? ids.get(planned.parentKey) : null, ...planned.meta };
    return summarize(meta, content, identity, location);
  }));

  check('workspaces', result.map(({ workspace }) => ({ name: workspace.name, emoji: workspace.emoji, fromMintype: workspace.fromMintype })), [
    { name: 'Work: Notes', emoji: '💼', fromMintype: true },
    { name: 'Personal', emoji: null, fromMintype: true },
  ]);
  check('background file', result[0].workspace.background.startsWith('attachments/'), true);
  check('background URL', result[1].workspace.background, 'https://example.com/bg.jpg');
  expected.forEach((pages, w) => pages.forEach((page, index) => check(`workspace ${w} page ${index} (${page.name})`, actual[w]?.[index], page)));
  check('page counts', actual.map((pages) => pages.length), expected.map((pages) => pages.length));

  // The files themselves, as other apps see them.
  const paths = files.paths.filter((path) => !path.includes('/attachments/')).sort();
  check('layout', paths, [
    'Personal/.mintype/workspace.json',
    'Personal/Diary.md',
    'Work Notes/.mintype/workspace.json',
    'Work Notes/.trash/Old.md',
    'Work Notes/Projects 2.md',
    'Work Notes/Projects.md',
    'Work Notes/Projects/Projects.md',
    'Work Notes/Projects/Roadmap 2026.md',
    'Work Notes/Projects/Sketch.whiteboard.json',
    'Work Notes/Quick notes/Groceries.md',
    'Work Notes/attachments 2.md',
  ]);
  const roadmapFile = await files.get('Work Notes/Projects/Roadmap 2026.md').async('text');
  check('portable roadmap', roadmapFile.split('\n').filter((line) => /@page|\[\[|\]\(/.test(line)), [
    'Left with [[Projects/Sketch.whiteboard.json|Sketch]] and [a link](../Projects.md).',
    '![photo|240|center](../attachments/image-' + roadmapFile.match(/image-([0-9a-f]{8})/)[1] + '.png)',
    '| [[Projects\\|Projects]] | first |',
    'Inline `@page[p3]` code and an external [site](https://example.com).',
    '@page[p3] and [[Projects]] and ![x](missing.png)',
  ]);
  check('cross-workspace link', await files.get('Personal/Diary.md').async('text'),
    'Across workspaces: [[../Work Notes/Projects/Roadmap 2026|Roadmap / 2026]], [link](../Work%20Notes/Projects.md)');

  // An Obsidian vault: wikilinks, embeds, a folder without a note, a folder note, and its trash.
  const vault = new JSZip();
  vault.file('Vault/.obsidian/app.json', '{}');
  vault.file('Vault/Home.md', '---\ntags: [a]\n---\nSee [[Ideas]], [[Sub/Deep|the deep one]], [[Deep#Part|Deep]] ![[pic.png|200]] [md](Sub/Deep.md) [[Missing]]');
  vault.file('Vault/Ideas.md', 'ideas');
  vault.file('Vault/Sub/Deep.md', 'deep');
  vault.file('Vault/Folder/Folder.md', 'folder note');
  vault.file('Vault/Folder/Child.md', 'child');
  vault.file('Vault/assets/pic.png', PNG, { base64: true });
  vault.file('Vault/.trash/Gone.md', 'gone');
  vault.file('Vault/board.canvas', '{}');
  const obsidian = (await importArchive(await vault.generateAsync({ type: 'uint8array' }), 'vault.zip')).result;
  check('obsidian workspace', obsidian.map(({ workspace }) => workspace.name), ['Vault']);
  check('obsidian pages', obsidian[0].pages.map(({ planned }) => [planned.name, planned.parentKey && obsidian[0].ids.get(planned.parentKey), !!planned.trashed]), [
    ['Folder', null, false],
    ['Child', '0:0', false],
    ['Home', null, false],
    ['Ideas', null, false],
    ['Sub', null, false],
    ['Deep', '0:4', false],
    ['Gone', null, true],
  ]);
  check('obsidian links', obsidian[0].pages[2].content.markdown,
    `See @page[0:3], [the deep one](/page/0:5), @page[0:5] ![|200](${image}) [md](/page/0:5) [[Missing]]`);

  // A Notion "Markdown & CSV" export: ID suffixes, the title heading, and sub-page folders.
  const id = 'a'.repeat(32);
  const childId = 'b'.repeat(32);
  const notionZip = new JSZip();
  notionZip.file(`Page ${id}.md`, `# Page\n\nText [Child](Page%20${id}/Child%20${childId}.md)\n\n![](Page%20${id}/img.png)`);
  notionZip.file(`Page ${id}/Child ${childId}.md`, '# Child\n\nchild text');
  notionZip.file(`Page ${id}/img.png`, PNG, { base64: true });
  const outer = new JSZip();
  outer.file('Export-Part-1.zip', await notionZip.generateAsync({ type: 'uint8array' }));
  const notion = (await importArchive(await outer.generateAsync({ type: 'uint8array' }), 'Export-123.zip')).result;
  check('notion workspace', notion.map(({ workspace }) => workspace.name), ['Export-123']);
  check('notion pages', notion[0].pages.map(({ planned, content }) => [planned.name, planned.parentKey && notion[0].ids.get(planned.parentKey), content.markdown]), [
    ['Page', null, `Text [Child](/page/0:1)\n\n![](${image})`],
    ['Child', '0:0', 'child text'],
  ]);
} catch (error) {
  failures++;
  console.error(error);
} finally {
  await server.close();
}

if (failures > 0) {
  console.error(`\n${failures} export check(s) failed.`);
  process.exit(1);
}
console.log('Export round trip: all checks passed.');
