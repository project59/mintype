import { Node, mergeAttributes } from '@tiptap/core';
import { reactNodeView } from './reactNodeView.js';
import CalloutView from '../components/CalloutView.jsx';
import {
  CALLOUT_BOX_CLASS, CALLOUT_CONTENT_CLASS, CALLOUT_EMOJI_SLOT_CLASS, CALLOUT_ROW_CLASS, calloutEmoji, getCalloutType,
} from './calloutTypes.js';
import { containerDirectiveTokenizer, parseContainerChildren, renderContainerDirective } from '../markdown/directives.js';

const CALLOUT_TYPE_VALUES = ['info', 'warning', 'error', 'success', 'default'];

export const CalloutNode = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      type: {
        default: 'info',
        parseHTML: (element) => element.getAttribute('data-callout-type') || 'info',
        renderHTML: (attributes) => ({ 'data-callout-type': attributes.type }),
      },
      emoji: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-callout-emoji') || null,
        renderHTML: (attributes) => ({ 'data-callout-emoji': attributes.emoji }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-callout-type]', contentElement: '.callout-content' }];
  },

  // Laid out like CalloutView, whose emoji is a button opening the type picker.
  renderHTML({ node, HTMLAttributes }) {
    const { type } = node.attrs;
    const calloutType = getCalloutType(type);
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-callout-type': type,
        class: `callout callout-${calloutType.value} ${CALLOUT_BOX_CLASS}`,
      }),
      [
        'div',
        { class: CALLOUT_ROW_CLASS, style: 'display: flex; align-items: flex-start; gap: 0.5rem;' },
        ['span', { 'aria-hidden': 'true', class: CALLOUT_EMOJI_SLOT_CLASS }, calloutEmoji(node.attrs)],
        ['div', { class: CALLOUT_CONTENT_CLASS, style: 'min-width: 0; flex: 1;' }, 0],
      ],
    ];
  },

  addNodeView() {
    return reactNodeView(CalloutView);
  },

  addKeyboardShortcuts() {
    return {
      Backspace: () => {
        if (this.editor.state.selection.empty && this.editor.isActive(this.name)) {
          const { $from } = this.editor.state.selection;
          if ($from.parent.type.name === this.name && $from.parent.content.size === 0) {
            this.editor.chain().lift().run();
            return true;
          }
        }
        return false;
      },
    };
  },

  markdownTokenName: 'callout',
  markdownTokenizer: containerDirectiveTokenizer('callout'),

  parseMarkdown(token, helpers) {
    const { type, emoji } = token.attrs;
    return {
      type: 'callout',
      attrs: { type: CALLOUT_TYPE_VALUES.includes(type) ? type : 'info', emoji: typeof emoji === 'string' ? emoji : null },
      content: parseContainerChildren(token, helpers),
    };
  },

  renderMarkdown(node, helpers) {
    const { type, emoji } = node.attrs;
    return renderContainerDirective('callout', node.content, helpers, { attrs: { type, emoji } });
  },
});
