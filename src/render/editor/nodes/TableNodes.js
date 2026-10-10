import { mergeAttributes } from '@tiptap/core';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { TableMap } from '@tiptap/pm/tables';
import { reactNodeView } from './reactNodeView.js';
import TableView from '../components/TableView.jsx';
import { TABLE_BOX_CLASS, TABLE_SCROLL_CLASS } from './blockStyles.js';

// Tables are GFM pipe tables: every cell holds exactly one line of inline content (line
// breaks are written as <br>), the first row is always the header, and each column has one
// alignment, taken from its header cell.

const ALIGNMENTS = ['left', 'center', 'right'];
const ALIGNMENT_SEPARATORS = { left: ':---', center: ':---:', right: '---:' };

const cellText = (helpers, cell) => helpers.renderChildren(cell.content || [])
  .replace(/ {2}\n/g, '<br>')
  .replace(/\n/g, ' ')
  .replace(/\|/g, '\\|');

// A cell's single paragraph shouldn't add the editor's paragraph spacing. Header cells are
// left-aligned like the rest of their column unless an alignment is set (browsers center <th>).
const cellOptions = (parent, className = '') => ({ ...parent, HTMLAttributes: { class: `[&>p]:!mb-0 ${className}`.trim() } });

const cellAttributes = {
  align: {
    default: null,
    parseHTML: (element) => (ALIGNMENTS.includes(element.style.textAlign) ? element.style.textAlign : null),
    renderHTML: (attributes) => (attributes.align ? { style: `text-align: ${attributes.align}` } : {}),
  },
};

const isInCell = (state) => {
  const { $from } = state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const name = $from.node(depth).type.name;
    if (name === 'tableCell' || name === 'tableHeader') return true;
  }
  return false;
};

// Rows added by prosemirror-tables (toolbar, Tab in the last cell) start unaligned; give every
// body cell its column's header alignment.
const alignmentSyncPlugin = () => new Plugin({
  key: new PluginKey('tableAlignmentSync'),
  appendTransaction: (transactions, _oldState, state) => {
    if (!transactions.some((tr) => tr.docChanged)) return null;
    let tr = null;
    state.doc.descendants((node, pos) => {
      if (node.type.name !== 'table') return !node.isTextblock;
      const map = TableMap.get(node);
      for (let col = 0; col < map.width; col += 1) {
        const align = node.nodeAt(map.positionAt(0, col, node))?.attrs.align ?? null;
        for (let row = 1; row < map.height; row += 1) {
          const cellPos = map.positionAt(row, col, node);
          const cell = node.nodeAt(cellPos);
          if (cell && cell.attrs.align !== align) {
            tr = tr || state.tr;
            tr.setNodeMarkup(pos + 1 + cellPos, null, { ...cell.attrs, align });
          }
        }
      }
      return false;
    });
    return tr?.setMeta('addToHistory', false) ?? null;
  },
});

const TableExt = Table.extend({
  addNodeView() {
    return reactNodeView(TableView, { contentDOMElementTag: 'tbody' });
  },

  addProseMirrorPlugins() {
    return [...(this.parent?.() || []), alignmentSyncPlugin()];
  },

  // Enter starts a new line inside the cell, since a cell holds a single paragraph.
  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      Enter: ({ editor }) => (isInCell(editor.state) ? editor.commands.setHardBreak() : false),
    };
  },

  // Static rendering (read-only views, clipboard): wide tables scroll instead of squashing.
  renderHTML({ HTMLAttributes }) {
    return ['div', { class: `${TABLE_BOX_CLASS} ${TABLE_SCROLL_CLASS}` }, ['table', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), ['tbody', 0]]];
  },

  markdownTokenName: 'table',

  parseMarkdown(token, helpers) {
    // marked's GFM table cells are already tokenized inline by the active lexer.
    const cellJson = (type) => (cell, col) => ({
      type,
      attrs: { align: ALIGNMENTS.includes(token.align?.[col]) ? token.align[col] : null },
      content: [{ type: 'paragraph', content: helpers.parseInline(cell?.tokens || []) }],
    });
    const rowJson = (cells, type) => ({ type: 'tableRow', content: cells.map(cellJson(type)) });
    return {
      type: 'table',
      content: [
        rowJson(token.header || [], 'tableHeader'),
        ...(token.rows || []).map((row) => rowJson(row, 'tableCell')),
      ],
    };
  },

  renderMarkdown(node, helpers) {
    const rows = node.content || [];
    if (rows.length === 0) return '';
    const lines = rows.map((row) => `| ${(row.content || []).map((cell) => cellText(helpers, cell)).join(' | ')} |`);
    const separator = (rows[0].content || []).map((cell) => ALIGNMENT_SEPARATORS[cell.attrs?.align] || '---');
    return [lines[0], `| ${separator.join(' | ')} |`, ...lines.slice(1)].join('\n');
  },
});

const TableRowExt = TableRow;

const TableHeaderExt = TableHeader.extend({
  content: 'paragraph',

  addOptions() {
    return cellOptions(this.parent?.(), 'text-left');
  },

  addAttributes() {
    return { ...this.parent?.(), ...cellAttributes };
  },
});

const TableCellExt = TableCell.extend({
  content: 'paragraph',

  addOptions() {
    return cellOptions(this.parent?.());
  },

  addAttributes() {
    return { ...this.parent?.(), ...cellAttributes };
  },
});

export { TableExt, TableRowExt, TableHeaderExt, TableCellExt };
