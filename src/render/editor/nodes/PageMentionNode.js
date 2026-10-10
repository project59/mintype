import { InputRule, Node, mergeAttributes } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import { ReactNodeViewRenderer } from '@tiptap/react';
import Suggestion from '@tiptap/suggestion';
import PageMentionView from '../components/PageMentionView.jsx';
import renderPageMentionItem from '../components/PageMentionItem.jsx';
import { searchPages } from '../../shared/pageMeta.js';
import { renderSuggestionList } from '../suggestionMenu.js';
import { LINKED_PAGE_LABEL, PAGE_MENTION_CLASS, PAGE_MENTION_UNRESOLVED_CLASS } from './blockStyles.js';

const PAGE_ID = '[A-Za-z0-9_-]+';

const pageMentionTokenizer = {
  name: 'pageMention',
  level: 'inline',
  start: (src) => src.indexOf('@page['),
  tokenize: (src) => {
    const match = new RegExp(`^@page\\[(${PAGE_ID})\\]`).exec(src);
    if (!match) return undefined;
    return { type: 'pageMention', raw: match[0], pageId: match[1] };
  },
};

export const PageMentionNode = Node.create({
  name: 'pageMention',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      pageId: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-page-id') || '',
        renderHTML: (attributes) => ({ 'data-page-id': attributes.pageId }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="pageMention"]' }, { tag: 'span[data-page-id]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'pageMention',
        class: `${PAGE_MENTION_CLASS} ${PAGE_MENTION_UNRESOLVED_CLASS}`,
      }),
      LINKED_PAGE_LABEL,
    ];
  },

  renderText() {
    return LINKED_PAGE_LABEL;
  },

  addNodeView() {
    return ReactNodeViewRenderer(PageMentionView);
  },

  addInputRules() {
    return [
      new InputRule({
        find: new RegExp(`@page\\[(${PAGE_ID})\\]$`),
        handler: ({ state, range, match }) => {
          state.tr.replaceWith(range.from, range.to, this.type.create({ pageId: match[1] }));
        },
      }),
    ];
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        pluginKey: new PluginKey('pageMentionSuggestion'),
        char: '@',
        allow: ({ state, range }) => {
          if (state.doc.resolve(range.from).parent.type.spec.code) return false;
          // Typing `[` means a raw @page[id], which the input rule converts.
          return !state.doc.textBetween(range.from, range.to).includes('[');
        },
        items: ({ query }) => searchPages(query),
        command: ({ editor, range, props }) => {
          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              { type: this.name, attrs: { pageId: props.id } },
              { type: 'text', text: ' ' },
            ])
            .run();
        },
        render: renderSuggestionList({
          label: 'Link to page',
          emptyText: 'No matching pages',
          renderItem: renderPageMentionItem,
        }),
      }),
    ];
  },

  markdownTokenName: 'pageMention',
  markdownTokenizer: pageMentionTokenizer,

  parseMarkdown(token) {
    return { type: 'pageMention', attrs: { pageId: token.pageId } };
  },

  renderMarkdown(node) {
    return `@page[${node.attrs?.pageId || ''}]`;
  },
});
