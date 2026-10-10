import { Node, mergeAttributes } from '@tiptap/core';
import { reactNodeView } from './reactNodeView.js';
import ColumnsView, { ColumnView } from '../components/ColumnsView.jsx';
import { backspaceEmptyFirstColumn, columnStyle } from './columnsCommands.js';
import { COLUMN_STATIC_INNER_STYLE, COLUMNS_STATIC_STYLE } from './blockStyles.js';
import { containerDirectiveTokenizer, parseContainerChildren, renderContainerDirective } from '../markdown/directives.js';

export const ColumnsNode = Node.create({
  name: 'columns',
  group: 'block',
  content: 'column{2,4}',
  defining: true,

  addNodeView() {
    return reactNodeView(ColumnsView);
  },

  parseHTML() {
    return [{ tag: 'div[data-type="columns"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'columns', style: COLUMNS_STATIC_STYLE }), 0];
  },

  markdownTokenName: 'columns',
  markdownTokenizer: containerDirectiveTokenizer('columns'),

  parseMarkdown(token, helpers) {
    const columns = helpers.parseChildren(token.tokens || []).filter((node) => node.type === 'column').slice(0, 4);
    while (columns.length < 2) {
      columns.push({ type: 'column', attrs: { width: null }, content: [{ type: 'paragraph' }] });
    }
    return { type: 'columns', content: columns };
  },

  renderMarkdown(node, helpers) {
    return renderContainerDirective('columns', node.content, helpers);
  },
});

export const ColumnNode = Node.create({
  name: 'column',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-width') || null,
        renderHTML: (attributes) =>
          attributes.width ? { 'data-width': attributes.width } : {},
      },
    };
  },

  // The flex sizing goes on the node view's outer element, which is the actual flex item.
  addNodeView() {
    return reactNodeView(ColumnView, {
      attrs: ({ node }) => ({ style: columnStyle(node.attrs.width) }),
    });
  },

  addKeyboardShortcuts() {
    return { Backspace: ({ editor }) => backspaceEmptyFirstColumn(editor) };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="column"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'column',
        style: columnStyle(node.attrs.width),
      }),
      ['div', { style: COLUMN_STATIC_INNER_STYLE }, 0],
    ];
  },

  markdownTokenName: 'col',
  markdownTokenizer: containerDirectiveTokenizer('col'),

  parseMarkdown(token, helpers) {
    const { width } = token.attrs;
    return {
      type: 'column',
      attrs: { width: typeof width === 'string' ? width : null },
      content: parseContainerChildren(token, helpers),
    };
  },

  renderMarkdown(node, helpers) {
    return renderContainerDirective('col', node.content, helpers, { attrs: { width: node.attrs?.width } });
  },
});
