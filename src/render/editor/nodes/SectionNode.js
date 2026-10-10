import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { reactNodeView } from './reactNodeView.js';
import SectionView from '../components/SectionView.jsx';
import { containerDirectiveTokenizer, parseContainerChildren, renderContainerDirective } from '../markdown/directives.js';
import { getSectionColor } from '../sectionColors.js';
import {
  SECTION_BOX_CLASS, SECTION_STATIC_GUIDE_CLASS, SECTION_STATIC_TOGGLE_CLASS, SECTION_TITLE_CLASS,
} from './blockStyles.js';

// Inline content the title can hold; it must fit on the `:::section[...]` directive line.
const TITLE_CONTENT_TYPES = ['text', 'pageMention'];

// The first child of a section: its title, edited as regular text.
export const SectionTitleNode = Node.create({
  name: 'sectionTitle',
  content: `(${TITLE_CONTENT_TYPES.join(' | ')})*`,
  defining: true,

  parseHTML() {
    return [{ tag: 'details[data-type="section"] > summary' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'summary',
      mergeAttributes(HTMLAttributes, { class: SECTION_TITLE_CLASS }),
      0,
    ];
  },

  addKeyboardShortcuts() {
    const inTitle = (state) => state.selection.$from.parent.type.name === this.name;

    return {
      // Moves into the body when open (reusing an empty first block), otherwise continues
      // after the section.
      Enter: ({ editor }) => {
        const { state } = editor;
        if (!inTitle(state)) return false;
        const { $from } = state.selection;
        const section = $from.node(-1);
        const sectionPos = $from.before(-1);
        const bodyStart = sectionPos + 1 + section.firstChild.nodeSize;
        const firstBlock = section.childCount > 1 ? section.child(1) : null;
        const tr = state.tr;
        if (section.attrs.open && firstBlock?.type.name === 'paragraph' && firstBlock.content.size === 0) {
          tr.setSelection(TextSelection.create(tr.doc, bodyStart + 1));
        } else {
          const insertPos = section.attrs.open ? bodyStart : sectionPos + section.nodeSize;
          tr.insert(insertPos, state.schema.nodes.paragraph.create());
          tr.setSelection(TextSelection.create(tr.doc, insertPos + 1));
        }
        editor.view.dispatch(tr.scrollIntoView());
        return true;
      },
      // At the start of the title, unwraps the section into a paragraph plus its body.
      Backspace: ({ editor }) => {
        const { state } = editor;
        const { $from, empty } = state.selection;
        if (!inTitle(state) || !empty || $from.parentOffset !== 0) return false;
        const section = $from.node(-1);
        const sectionPos = $from.before(-1);
        const body = [];
        section.forEach((child, _offset, index) => {
          if (index > 0) body.push(child);
        });
        const emptyBody = body.length === 1 && body[0].type.name === 'paragraph' && body[0].content.size === 0;
        const blocks = [state.schema.nodes.paragraph.create(null, section.firstChild.content), ...(emptyBody ? [] : body)];
        const tr = state.tr.replaceWith(sectionPos, sectionPos + section.nodeSize, blocks);
        editor.view.dispatch(tr.setSelection(TextSelection.create(tr.doc, sectionPos + 1)).scrollIntoView());
        return true;
      },
    };
  },
});

export const SectionNode = Node.create({
  name: 'section',
  group: 'block',
  content: 'sectionTitle block+',
  draggable: true,
  defining: true,

  addAttributes() {
    return {
      open: {
        default: false,
        parseHTML: (element) => element.hasAttribute('open'),
        renderHTML: (attributes) => (attributes.open ? { open: '' } : {}),
      },
      color: {
        default: 'default',
        parseHTML: (element) => getSectionColor(element.getAttribute('data-section-color')).value,
        renderHTML: (attributes) => ({ 'data-section-color': getSectionColor(attributes.color).value }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'details[data-type="section"]' }];
  },

  // Static rendering (read-only views, clipboard), laid out like SectionView (see
  // blockStyles.js), with the title as the browser's own toggle.
  renderHTML({ node, HTMLAttributes }) {
    return [
      'details',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'section',
        class: `${SECTION_BOX_CLASS} ${SECTION_STATIC_TOGGLE_CLASS} ${SECTION_STATIC_GUIDE_CLASS} [&>summary]:cursor-pointer`,
        style: `background-color: ${getSectionColor(node.attrs.color).background};`,
      }),
      0,
    ];
  },

  addNodeView() {
    return reactNodeView(SectionView);
  },

  // Backspace at the start of the first body block goes back to the end of the title,
  // removing that block when it is an empty paragraph that isn't the only one.
  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => {
        const { $from, empty } = editor.state.selection;
        if (!empty || $from.parentOffset !== 0 || $from.depth < 2) return false;
        const section = $from.node(-1);
        if (section.type.name !== this.name || $from.index(-1) !== 1) return false;
        const sectionPos = $from.before(-1);
        const titleEnd = sectionPos + section.firstChild.nodeSize;
        const tr = editor.state.tr;
        if ($from.parent.type.name === 'paragraph' && $from.parent.content.size === 0 && section.childCount > 2) {
          tr.delete($from.before(), $from.after());
        }
        editor.view.dispatch(tr.setSelection(TextSelection.create(tr.doc, titleEnd)).scrollIntoView());
        return true;
      },
    };
  },

  // Moving the cursor into a closed section's hidden body opens it.
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('sectionAutoOpen'),
        appendTransaction: (transactions, _oldState, state) => {
          if (!transactions.some((tr) => tr.selectionSet || tr.docChanged)) return null;
          const { $from } = state.selection;
          for (let depth = $from.depth; depth > 0; depth -= 1) {
            const node = $from.node(depth);
            if (node.type.name === this.name && !node.attrs.open && $from.index(depth) > 0) {
              return state.tr
                .setNodeMarkup($from.before(depth), null, { ...node.attrs, open: true })
                .setMeta('addToHistory', false);
            }
          }
          return null;
        },
      }),
    ];
  },

  markdownTokenName: 'section',
  markdownTokenizer: containerDirectiveTokenizer('section', { markdownLabel: true }),

  parseMarkdown(token, helpers) {
    const title = helpers.parseInline(token.labelTokens || []).filter((node) => TITLE_CONTENT_TYPES.includes(node.type));
    return {
      type: 'section',
      attrs: { color: getSectionColor(token.attrs.color).value, open: token.attrs.open === true },
      content: [{ type: 'sectionTitle', content: title }, ...parseContainerChildren(token, helpers)],
    };
  },

  renderMarkdown(node, helpers) {
    const [title, ...body] = node.content || [];
    const color = getSectionColor(node.attrs?.color).value;
    return renderContainerDirective('section', body, helpers, {
      markdownLabel: helpers.renderChildren(title?.content || []),
      attrs: { color: color === 'default' ? null : color, open: node.attrs?.open === true },
    });
  },
});
