// Round-trip check for the editor's Markdown: every document below is serialized to
// Markdown, parsed back, and must come out identical. Run with `npm run check:markdown`
// after changing any node's Markdown tokenizer, parseMarkdown or renderMarkdown.
import { Window } from 'happy-dom';
import { createServer } from 'vite';

const server = await createServer({
  configFile: false,
  appType: 'custom',
  logLevel: 'error',
  esbuild: { jsx: 'automatic' },
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, hmr: false, watch: null },
});

let failures = 0;

try {
  const { getSchema } = await server.ssrLoadModule('@tiptap/core');
  const { MarkdownManager } = await server.ssrLoadModule('@tiptap/markdown');
  const { buildExtensions } = await server.ssrLoadModule('/src/render/editor/extensions.js');

  // Inline HTML marks (<u>, <sup>, styled spans) are parsed with window.DOMParser. It is
  // installed only after the modules load so libraries like Prism still see a non-browser.
  globalThis.window = new Window();

  const extensions = buildExtensions();
  const schema = getSchema(extensions);
  const markdown = new MarkdownManager({ extensions });

  const text = (value, marks) => ({ type: 'text', text: value, ...(marks ? { marks } : {}) });
  const p = (...content) => ({ type: 'paragraph', content: content.map((item) => (typeof item === 'string' ? text(item) : item)) });
  const callout = (...content) => ({ type: 'callout', attrs: { type: 'info', emoji: null }, content });
  const sectionWith = (attrs, title, ...content) => ({
    type: 'section',
    attrs: { color: 'default', open: false, ...attrs },
    content: [{ type: 'sectionTitle', content: (Array.isArray(title) ? title : [title]).filter(Boolean).map((item) => (typeof item === 'string' ? text(item) : item)) }, ...content],
  });
  const section = (title, ...content) => sectionWith({}, title, ...content);
  const columns = (...cols) => ({ type: 'columns', content: cols.map((content) => ({ type: 'column', attrs: { width: null }, content })) });
  const code = (value, language = 'js') => ({ type: 'codeBlock', attrs: { language }, content: [text(value)] });
  const task = (checked, content, ...nested) => ({ type: 'taskItem', attrs: { checked }, content: [{ type: 'paragraph', content: [text(content)] }, ...nested] });
  const tasks = (...items) => ({ type: 'taskList', content: items });
  const youtube = { type: 'youtube', attrs: { videoId: 'dQw4w9WgXcQ' } };
  const maps = { type: 'maps', attrs: { url: 'https://www.google.com/maps/embed?pb=!1m18&q="cafe"' } };
  const mention = { type: 'pageMention', attrs: { pageId: 'abc_123' } };
  const bullets = (...items) => ({ type: 'bulletList', content: items.map((content) => ({ type: 'listItem', content })) });
  // Cells are strings or arrays of inline nodes; `aligns` sets each column's alignment.
  const alignedTable = (aligns, ...rows) => ({
    type: 'table',
    content: rows.map((row, index) => ({
      type: 'tableRow',
      content: row.map((cell, col) => ({
        type: index === 0 ? 'tableHeader' : 'tableCell',
        attrs: { align: aligns[col] ?? null },
        content: [Array.isArray(cell) ? p(...cell) : cell ? p(cell) : { type: 'paragraph' }],
      })),
    })),
  });
  const table = (...rows) => alignedTable([], ...rows);

  const documents = {
    'callout in columns': [columns([callout(p('a'))], [p('b')])],
    'callout in section': [section('S', callout(p('a')), p('after'))],
    'section in callout': [callout(section('S', p('in')), p('after'))],
    'four columns with widths': [{ type: 'columns', content: [['2', null, null, '3'].map((width, i) => ({ type: 'column', attrs: { width }, content: [p(`c${i}`)] }))].flat() }],
    'columns in section': [section('S', columns([p('a')], [p('b')]))],
    'columns in callout': [callout(columns([p('a')], [p('b')]), p('after'))],
    'callout in callout': [callout(callout(p('inner')), p('outer after'))],
    'section in section': [section('A', section('B', p('in')), p('after'))],
    'section in column': [columns([section('S', p('in'))], [p('b')])],
    'youtube and maps in columns': [columns([youtube], [maps])],
    'tasks': [tasks(task(false, 'open'), task(true, 'done [x]'))],
    'nested tasks': [tasks(task(false, 'parent', tasks(task(true, 'child'), task(false, 'child 2'))), task(true, 'next'))],
    'tasks in callout': [callout(tasks(task(false, 'T'), task(true, 'Done')), p('after'))],
    'tasks in column and section': [columns([tasks(task(false, 'a'))], [section('S', tasks(task(true, 'b')))])],
    'code in callout': [callout(code('x = 1'), p('after'))],
    'code containing ::: in callout': [callout(code(':::\n::youtube{id=x}\n:::callout'), p('after'))],
    'code containing a fence in callout': [callout(code('```\n:::\n```', 'md'), p('after'))],
    'list in callout': [callout(bullets([p('one')], [p('two')]), p('after'))],
    'callout in list item': [bullets([p('item'), callout(p('nested'), p('second'))]), p('after')],
    'table in callout': [callout(table(['h1', 'h|2'], ['a', 'b']), p('after'))],
    'table with column alignment': [alignedTable([null, 'center', 'right'], ['Item', 'Qty', 'Price'], ['Tea', '2', '$4'], ['Cake', '1', '$6'])],
    'table cells with line breaks, marks, mention and empty cells': [table(
      ['Name', 'Notes'],
      [[text('bold', [{ type: 'bold' }]), ' and ', mention], ['line one', { type: 'hardBreak' }, 'line two']],
      ['', 'pipe | inside'],
    )],
    'marks and mention in callout': [callout(p(text('bold', [{ type: 'bold' }]), ' see ', mention, ' ok'))],
    'underline, superscript and subscript': [p(text('under', [{ type: 'underline' }]), ' x', text('2', [{ type: 'superscript' }]), ' H', text('2', [{ type: 'subscript' }]), 'O')],
    'text color and highlight colors': [p(
      text('red', [{ type: 'textStyle', attrs: { color: 'rgb(255, 0, 0)', fontFamily: null, fontSize: null } }]),
      ' and ',
      text('marked', [{ type: 'highlight', attrs: { color: '#fde68a' } }]),
    )],
    'section title with brackets': [section('Notes [draft] \\ v2', p('x'))],
    'section title with marks, link, code and mention': [section([
      text('Bold', [{ type: 'bold' }]),
      ' see ',
      text('docs [v2]', [{ type: 'link', attrs: { href: 'https://example.com/a_(b)', target: '_blank', rel: 'noopener noreferrer nofollow', class: null, title: null } }]),
      ' and ',
      text('a]b', [{ type: 'code' }]),
      ' ',
      mention,
    ], p('body'))],
    'empty section title': [section(null, p('body'))],
    'open sections in every color': ['default', 'gray', 'green', 'red', 'blue', 'pink'].map((color) => sectionWith({ color, open: true }, color, p('x'))),
    'styled callout': [{ type: 'callout', attrs: { type: 'warning', emoji: '🔥' }, content: [p('hot')] }],
    'colored section and sized column': [
      sectionWith({ color: 'blue' }, 'Blue', p('x')),
      { type: 'columns', content: [{ type: 'column', attrs: { width: '2' }, content: [p('wide')] }, { type: 'column', attrs: { width: null }, content: [p('narrow')] }] },
    ],
    'deep: section > callout > columns > callout': [section('S', callout(columns([callout(p('deep'))], [p('b')])))],
    'paragraph directly before and after blocks': [p('before'), youtube, p('between'), callout(p('c')), p('after')],
  };

  const normalize = (node) => JSON.stringify(node);

  for (const [name, content] of Object.entries(documents)) {
    try {
      const doc = schema.nodeFromJSON({ type: 'doc', content });
      const md = markdown.serialize(doc.toJSON());
      const parsed = schema.nodeFromJSON(markdown.parse(md));
      const reserialized = markdown.serialize(parsed.toJSON());
      if (normalize(parsed.toJSON()) !== normalize(doc.toJSON()) || reserialized !== md) {
        failures += 1;
        console.log(`FAIL  ${name}\n--- markdown ---\n${md}\n--- reparsed ---\n${reserialized}\n`);
      } else {
        console.log(`ok    ${name}`);
      }
    } catch (error) {
      failures += 1;
      console.log(`FAIL  ${name}: ${error.message}`);
    }
  }

  // Hand-written Markdown that must parse to the given top-level node types.
  const sources = {
    'directive right after a paragraph line': ['text\n::youtube{id=abc}', ['paragraph', 'youtube']],
    'unclosed container runs to the end': [':::callout\nbody\n\nmore', ['callout']],
    'unknown directive stays text': ['::nope[x]', ['paragraph']],
    'directive name prefix is not a match': ['::youtubes{id=abc}', ['paragraph']],
  };
  for (const [name, [source, expected]] of Object.entries(sources)) {
    const types = schema.nodeFromJSON(markdown.parse(source)).toJSON().content.map((node) => node.type);
    if (JSON.stringify(types) !== JSON.stringify(expected)) {
      failures += 1;
      console.log(`FAIL  ${name}: got ${JSON.stringify(types)}, expected ${JSON.stringify(expected)}`);
    } else {
      console.log(`ok    ${name}`);
    }
  }
} finally {
  await server.close();
}

console.log(failures ? `\n${failures} failing` : '\nall passed');
process.exit(failures ? 1 : 0);
